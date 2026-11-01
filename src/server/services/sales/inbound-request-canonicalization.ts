import "server-only";

import { createHash } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import type { db } from "@/db";
import {
  inboundRequests,
  salesContacts,
  salesCustomers,
  salesDeals,
  salesLegacyIdentityMappings,
  users,
} from "@/db/schema";
import {
  normalizeSalesEmail,
  normalizeSalesPhone,
  SALES_IDENTITY_MAPPING_VERSION,
  salesIdentityChecksum,
} from "@/lib/sales/customer-identity";
import { matchDuplicateCustomer, type CustomerMatchCandidate } from "./duplicate-matcher";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type InboundRequest = typeof inboundRequests.$inferSelect;
type SalesCustomer = typeof salesCustomers.$inferSelect;
type SalesContact = typeof salesContacts.$inferSelect;

const INBOUND_SOURCE_SYSTEM = "INBOUND_REQUEST";

export type InboundIdentityResolution =
  | "LEGACY_USER_MAPPING"
  | "LEGACY_USER_CONTACT"
  | "EXACT_PROVIDER"
  | "CONTACT_MATCH"
  | "NEW"
  | "AMBIGUOUS_NEW";

export type InboundCanonicalSalesRecord = {
  salesCustomerId: string;
  salesContactId: string;
  salesDealId: string;
  identityResolution: InboundIdentityResolution;
  dealCreated: boolean;
};

export class InboundSalesIdentityConflict extends Error {
  readonly code = "INBOUND_SALES_IDENTITY_CONFLICT";
}

export class InboundRequestIdempotencyConflict extends Error {
  readonly code = "INBOUND_REQUEST_IDEMPOTENCY_CONFLICT";
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function inboundRequestFingerprint(input: {
  customerName: string;
  phone: string;
  email: string | null;
  requestType: string;
  source: string;
  payload: unknown;
  leadProfile: Record<string, unknown>;
}): string {
  return createHash("sha256")
    .update(stableSerialize({
      customerName: input.customerName,
      phone: normalizeSalesPhone(input.phone),
      email: normalizeSalesEmail(input.email),
      requestType: input.requestType,
      source: input.source,
      payload: input.payload,
      leadProfile: input.leadProfile,
    }))
    .digest("hex");
}

function textOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function contactName(request: InboundRequest): string {
  return textOrNull(request.customerName) ?? "Inbound customer";
}

async function findCustomerById(tx: Transaction, customerId: string): Promise<SalesCustomer | null> {
  return (await tx.query.salesCustomers.findFirst({ where: eq(salesCustomers.id, customerId) })) ?? null;
}

async function findCustomerCandidates(
  tx: Transaction,
  input: { erpnextCustomerId: string | null; normalizedEmail: string | null; normalizedPhone: string | null },
) {
  const predicates = [
    input.erpnextCustomerId ? eq(salesCustomers.erpnextCustomerId, input.erpnextCustomerId) : null,
    input.normalizedEmail ? eq(salesContacts.normalizedEmail, input.normalizedEmail) : null,
    input.normalizedPhone ? eq(salesContacts.normalizedPhone, input.normalizedPhone) : null,
  ].filter((predicate): predicate is NonNullable<typeof predicate> => Boolean(predicate));

  if (predicates.length === 0) return [];

  const rows = await tx
    .select({
      customerId: salesCustomers.id,
      erpnextCustomerId: salesCustomers.erpnextCustomerId,
      contactId: salesContacts.id,
      normalizedEmail: salesContacts.normalizedEmail,
      normalizedPhone: salesContacts.normalizedPhone,
    })
    .from(salesCustomers)
    .leftJoin(salesContacts, eq(salesContacts.customerId, salesCustomers.id))
    .where(or(...predicates));

  type Candidate = CustomerMatchCandidate & { contactIds: string[] };
  const byCustomer = new Map<string, Candidate>();
  for (const row of rows) {
    const current = byCustomer.get(row.customerId) ?? {
      id: row.customerId,
      erpnextCustomerId: row.erpnextCustomerId,
      normalizedEmail: row.normalizedEmail,
      normalizedPhone: row.normalizedPhone,
      contactIds: [],
    };
    current.erpnextCustomerId ??= row.erpnextCustomerId;
    current.normalizedEmail ??= row.normalizedEmail;
    current.normalizedPhone ??= row.normalizedPhone;
    if (row.contactId && !current.contactIds.includes(row.contactId)) current.contactIds.push(row.contactId);
    byCustomer.set(row.customerId, current);
  }

  return [...byCustomer.values()];
}

async function findPreferredContact(
  tx: Transaction,
  input: {
    customerId: string;
    preferredContactId?: string | null;
    userId?: string | null;
    normalizedEmail: string | null;
    normalizedPhone: string | null;
  },
): Promise<SalesContact | null> {
  const contacts = await tx.query.salesContacts.findMany({
    where: eq(salesContacts.customerId, input.customerId),
  });

  return (
    contacts.find((contact) => contact.id === input.preferredContactId) ??
    contacts.find((contact) => input.userId && contact.userId === input.userId) ??
    contacts.find((contact) => input.normalizedEmail && contact.normalizedEmail === input.normalizedEmail) ??
    contacts.find((contact) => input.normalizedPhone && contact.normalizedPhone === input.normalizedPhone) ??
    contacts.find((contact) => contact.isPrimary) ??
    contacts[0] ??
    null
  );
}

async function createCustomer(
  tx: Transaction,
  request: InboundRequest,
  localUserId: string | null,
  identityResolution: InboundIdentityResolution,
): Promise<SalesCustomer> {
  const legacyKey = `INBOUND_REQUEST:${request.id}`;
  const displayName = textOrNull(request.companyName) ?? contactName(request);
  const [inserted] = await tx
    .insert(salesCustomers)
    .values({
      customerType: request.companyName ? "BUSINESS" : "PERSON",
      displayName,
      legalName: textOrNull(request.companyName),
      legacyUserId: localUserId,
      legacyKey,
      sourceReferences: {
        sourceSystem: INBOUND_SOURCE_SYSTEM,
        inboundRequestId: request.id,
        identityResolution,
      },
    })
    .onConflictDoNothing()
    .returning();

  const customer = inserted ?? await tx.query.salesCustomers.findFirst({
    where: eq(salesCustomers.legacyKey, legacyKey),
  });
  if (!customer) throw new Error("Canonical sales customer could not be created.");
  return customer;
}

async function createContact(
  tx: Transaction,
  request: InboundRequest,
  customerId: string,
  localUserId: string | null,
  normalizedEmail: string | null,
  normalizedPhone: string | null,
): Promise<SalesContact> {
  const legacyKey = `INBOUND_REQUEST:${request.id}:CONTACT`;
  const [inserted] = await tx
    .insert(salesContacts)
    .values({
      customerId,
      userId: localUserId,
      legacyKey,
      displayName: contactName(request),
      preferredChannel: textOrNull(request.preferredContactMethod),
      email: textOrNull(request.email),
      normalizedEmail,
      phone: textOrNull(request.phone),
      normalizedPhone,
      isPrimary: true,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted;

  const existingByLegacyKey = await tx.query.salesContacts.findFirst({
    where: eq(salesContacts.legacyKey, legacyKey),
  });
  if (existingByLegacyKey) return existingByLegacyKey;

  const existingByUser = localUserId
    ? await tx.query.salesContacts.findFirst({ where: eq(salesContacts.userId, localUserId) })
    : null;
  if (existingByUser) return existingByUser;

  throw new Error("Canonical sales contact could not be created.");
}

async function ensureLegacyIdentityMapping(
  tx: Transaction,
  input: {
    userId: string;
    customer: SalesCustomer;
    contact: SalesContact;
    request: InboundRequest;
  },
) {
  const checksum = salesIdentityChecksum({
    userId: input.userId,
    erpnextCustomerId: input.customer.erpnextCustomerId,
    name: input.request.customerName,
    email: input.request.email,
    phone: input.request.phone,
  });
  const [inserted] = await tx
    .insert(salesLegacyIdentityMappings)
    .values({
      userId: input.userId,
      customerId: input.customer.id,
      contactId: input.contact.id,
      mappingRule: "INBOUND_REQUEST",
      mappingVersion: SALES_IDENTITY_MAPPING_VERSION,
      inputChecksum: checksum,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return;

  const existing = await tx.query.salesLegacyIdentityMappings.findFirst({
    where: eq(salesLegacyIdentityMappings.userId, input.userId),
  });
  if (!existing || existing.customerId !== input.customer.id || existing.contactId !== input.contact.id) {
    throw new InboundSalesIdentityConflict("The authenticated identity is already mapped to another sales customer.");
  }
}

async function ensureDeal(
  tx: Transaction,
  request: InboundRequest,
  customer: SalesCustomer,
  localUserId: string | null,
  contact: SalesContact,
  identityResolution: InboundIdentityResolution,
): Promise<{ deal: typeof salesDeals.$inferSelect; created: boolean }> {
  const existingBySource = await tx.query.salesDeals.findFirst({
    where: and(
      eq(salesDeals.sourceSystem, INBOUND_SOURCE_SYSTEM),
      eq(salesDeals.sourceId, request.id),
    ),
  });
  const existingByLink = request.salesDealId
    ? await tx.query.salesDeals.findFirst({ where: eq(salesDeals.id, request.salesDealId) })
    : null;
  const existing = existingBySource ?? existingByLink;

  if (existing) {
    if (existing.salesCustomerId && existing.salesCustomerId !== customer.id) {
      throw new InboundSalesIdentityConflict("The inbound request is already linked to another sales customer.");
    }

    const patch: Partial<typeof salesDeals.$inferInsert> = {};
    if (!existing.salesCustomerId) patch.salesCustomerId = customer.id;
    if (!existing.customerId && localUserId) patch.customerId = localUserId;
    if (!existing.webRequestId) patch.webRequestId = request.id;
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      const [updated] = await tx.update(salesDeals).set(patch).where(eq(salesDeals.id, existing.id)).returning();
      if (updated) return { deal: updated, created: false };
    }
    return { deal: existing, created: false };
  }

  const [inserted] = await tx
    .insert(salesDeals)
    .values({
      customerId: localUserId,
      salesCustomerId: customer.id,
      webRequestId: request.id,
      sourceSystem: INBOUND_SOURCE_SYSTEM,
      sourceId: request.id,
      sourceReferences: {
        sourceSystem: INBOUND_SOURCE_SYSTEM,
        inboundRequestId: request.id,
        salesCustomerId: customer.id,
        salesContactId: contact.id,
        identityResolution,
      },
      state: "OPEN",
      lifecycleState: "NEW",
      stage: "QUALIFICATION",
      title: `${contactName(request)} — ${request.requestType} request`,
      currency: "THB",
      version: 1,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return { deal: inserted, created: true };

  const raced = await tx.query.salesDeals.findFirst({
    where: and(
      eq(salesDeals.sourceSystem, INBOUND_SOURCE_SYSTEM),
      eq(salesDeals.sourceId, request.id),
    ),
  });
  if (!raced) throw new Error("Canonical sales deal could not be created.");
  if (raced.salesCustomerId && raced.salesCustomerId !== customer.id) {
    throw new InboundSalesIdentityConflict("The inbound request was concurrently linked to another sales customer.");
  }
  return { deal: raced, created: false };
}

export async function ensureInboundRequestSalesRecords(
  tx: Transaction,
  request: InboundRequest,
  userId?: string | null,
): Promise<InboundCanonicalSalesRecord> {
  const requestedUserId = textOrNull(userId);
  const localUser = requestedUserId
    ? await tx.query.users.findFirst({
        where: eq(users.id, requestedUserId),
        columns: { id: true, erpnextCustomerId: true },
      })
    : null;
  const localUserId = localUser?.id ?? null;
  const normalizedEmail = normalizeSalesEmail(request.email);
  const normalizedPhone = normalizeSalesPhone(request.phone);

  const explicitMapping = localUserId
    ? await tx.query.salesLegacyIdentityMappings.findFirst({
        where: eq(salesLegacyIdentityMappings.userId, localUserId),
      })
    : null;
  const explicitContact = localUserId
    ? await tx.query.salesContacts.findFirst({ where: eq(salesContacts.userId, localUserId) })
    : null;
  const explicitCustomer = localUserId
    ? await tx.query.salesCustomers.findFirst({ where: eq(salesCustomers.legacyUserId, localUserId) })
    : null;

  let customer: SalesCustomer | null = null;
  let preferredContactId: string | null = null;
  let identityResolution: InboundIdentityResolution;

  if (explicitMapping) {
    customer = await findCustomerById(tx, explicitMapping.customerId);
    preferredContactId = explicitMapping.contactId;
    identityResolution = "LEGACY_USER_MAPPING";
  } else if (explicitContact) {
    customer = await findCustomerById(tx, explicitContact.customerId);
    preferredContactId = explicitContact.id;
    identityResolution = "LEGACY_USER_CONTACT";
  } else if (explicitCustomer) {
    customer = explicitCustomer;
    identityResolution = "LEGACY_USER_CONTACT";
  } else {
    const candidates = await findCustomerCandidates(tx, {
      erpnextCustomerId: localUser?.erpnextCustomerId ?? null,
      normalizedEmail,
      normalizedPhone,
    });
    const match = matchDuplicateCustomer(
      { erpnextCustomerId: localUser?.erpnextCustomerId ?? null, normalizedEmail, normalizedPhone },
      candidates,
    );
    if (match.kind === "EXACT_PROVIDER" || match.kind === "CONTACT_MATCH") {
      customer = await findCustomerById(tx, match.customerId);
      const candidate = candidates.find(({ id }) => id === match.customerId);
      preferredContactId = candidate?.contactIds[0] ?? null;
      identityResolution = match.kind;
    } else {
      identityResolution = match.kind === "AMBIGUOUS" ? "AMBIGUOUS_NEW" : "NEW";
    }
  }

  if (!customer) customer = await createCustomer(tx, request, localUserId, identityResolution);

  const contact = await findPreferredContact(tx, {
    customerId: customer.id,
    preferredContactId,
    userId: localUserId,
    normalizedEmail,
    normalizedPhone,
  }) ?? await createContact(tx, request, customer.id, localUserId, normalizedEmail, normalizedPhone);

  if (localUserId) {
    await ensureLegacyIdentityMapping(tx, {
      userId: localUserId,
      customer,
      contact,
      request,
    });
  }

  const { deal, created } = await ensureDeal(tx, request, customer, localUserId, contact, identityResolution);
  return {
    salesCustomerId: customer.id,
    salesContactId: contact.id,
    salesDealId: deal.id,
    identityResolution,
    dealCreated: created,
  };
}

export const inboundRequestSourceSystem = INBOUND_SOURCE_SYSTEM;
