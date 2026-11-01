"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { consultationLeads, leads, proposals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth-guard";
import { buildErpnextBomItems, extractConfigurationItems } from "@/lib/erpnextBom";
import { getQuotationDocumentNo, safeSyncProposalQuotationToERP } from "@/lib/erpnext";
import { getCatalogProductsByIds } from "@/lib/erpnextCatalog";
import { erpNextCommercialService } from "@/server/services/integrations/erpnext-commercial-service";
import { trackUmamiServerEvent } from "@/utils/analytics-server";

export type ErpnextQuotationEquipmentItem = {
  id: string;
  itemCode: string;
  itemName: string;
  description: string | null;
  quantity: number;
  uom: string | null;
  rate: number;
  amount: number;
};


function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function buildLeadFallbackSystemItem(input: {
  systemSizeKwp: number;
  panelCount: number;
  totalPrice: number;
}) {
  const itemCode = await erpNextCommercialService.getDefaultQuotationItemCode();
  const systemSizeLabel = input.systemSizeKwp > 0 ? `${input.systemSizeKwp} kWp` : "custom";
  return {
    item_code: itemCode,
    item_name: `SolarDream solar system ${systemSizeLabel}`,
    qty: 1,
    uom: "Nos",
    stock_uom: "Nos",
    conversion_factor: 1,
    rate: input.totalPrice,
    amount: input.totalPrice,
    description: `Website lead solar configuration: ${systemSizeLabel}, ${input.panelCount} panels.`,
  };
}

function getLeadDocumentNo(leadId: string) {
  return `QT-${leadId.slice(0, 8).toUpperCase()}`;
}

function buildLeadRemarks(lead: {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string | null;
  configurationSnapshot: unknown;
}) {
  const snapshot = getRecord(lead.configurationSnapshot);
  const preferredContactTime = getString(
    snapshot.preferredContactTime ?? snapshot.contactTime ?? snapshot.preferred_contact_time,
  );
  const postalCode = getString(snapshot.postalCode ?? snapshot.postcode ?? snapshot.zipCode);
  const monthlySavings = getNumber(snapshot.estimatedSavings ?? snapshot.monthlySavings, 0);

  return [
    "Generated from SolarDream website lead for staff review.",
    `Lead ID: ${lead.id}`,
    `Customer name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    lead.location ? `Location: ${lead.location}` : "",
    postalCode ? `Postal code: ${postalCode}` : "",
    preferredContactTime ? `Preferred contact time: ${preferredContactTime}` : "",
    monthlySavings > 0 ? `Predicted monthly savings: THB ${monthlySavings.toLocaleString("th-TH")}` : "",
    "Customer master data intentionally left for ERP staff assignment.",
  ].filter(Boolean).join("\n");
}

function getLeadBudget(snapshot: Record<string, unknown>) {
  return getNumber(
    snapshot.totalPrice ??
    snapshot.preliminaryBudget ??
    snapshot.estimatedBudget ??
    snapshot.systemPackagePrice,
    0,
  );
}

function getLeadKwSize(snapshot: Record<string, unknown>, fallback: string) {
  const numeric = getNumber(
    snapshot.systemSizeKwp ??
    snapshot.systemPackageSizeKwp ??
    snapshot.systemkWp ??
    snapshot.targetCapacity,
    0,
  );
  return numeric > 0 ? `${numeric}kW` : fallback;
}

function buildErpLeadNotes(input: {
  consultationLeadId: string;
  targetSystemSize: string;
  systemType: string;
  addOns: string[];
  postalCode: string | null;
  customerNotes: string | null;
  budget: number;
  dynamicCalculations: Record<string, unknown>;
}) {
  return [
    "Generated automatically from SolarDream Wizard.",
    `SolarDream ConsultationLead ID: ${input.consultationLeadId}`,
    `Target system size: ${input.targetSystemSize}`,
    `System type: ${input.systemType}`,
    input.addOns.length ? `Smart add-ons: ${input.addOns.join(", ")}` : "",
    input.postalCode ? `Postal code: ${input.postalCode}` : "",
    input.budget > 0 ? `Estimated budget: THB ${input.budget.toLocaleString("th-TH")}` : "",
    input.customerNotes ? `Customer notes: ${input.customerNotes}` : "",
    `Wizard payload: ${JSON.stringify(input.dynamicCalculations).slice(0, 2500)}`,
  ].filter(Boolean).join("\n");
}

export async function createErpnextLeadForConsultation(consultationLeadId: string) {
  try {
    const consultationLead = await db.query.consultationLeads.findFirst({
      where: eq(consultationLeads.id, consultationLeadId),
    });

    if (!consultationLead) {
      return { success: false, error: "Consultation lead not found." };
    }

    if (consultationLead.erpLeadId) {
      return { success: true, erpLeadId: consultationLead.erpLeadId, alreadyExists: true };
    }

    const dynamicCalculations = getRecord(consultationLead.dynamicCalculations);
    const rawPayload = getRecord(consultationLead.rawPayload);
    const systemProfile = getRecord(rawPayload.systemProfile);
    const budget = getLeadBudget({ ...dynamicCalculations, ...systemProfile });
    const kwSize = getLeadKwSize({ ...dynamicCalculations, ...systemProfile }, consultationLead.targetSystemSize);
    const payload = {
      data: {
        lead_name: consultationLead.customerName,
        first_name: consultationLead.customerName,
        email_id: consultationLead.email,
        mobile_no: consultationLead.phone,
        phone: consultationLead.phone,
        status: "Lead",
        source: "SolarDream Wizard",
        // Lead.notes is an ERPNext child table, not a plain text field.
        notes: [{
          note: buildErpLeadNotes({
            consultationLeadId: consultationLead.id,
            targetSystemSize: consultationLead.targetSystemSize,
            systemType: consultationLead.systemType,
            addOns: consultationLead.addOns,
            postalCode: consultationLead.postalCode,
            customerNotes: consultationLead.customerNotes,
            budget,
            dynamicCalculations,
          }),
        }],
      },
    };

    const leadResult = await erpNextCommercialService.createLeadIdempotently({
      data: payload.data,
      email: consultationLead.email,
      phone: consultationLead.phone,
    });
    const erpLeadId = leadResult.providerId;
    const httpStatus = leadResult.httpStatus;

    await db.update(consultationLeads)
      .set({
        erpLeadId,
        crmPayload: {
          ...getRecord(consultationLead.crmPayload),
          erpLeadId,
          erpnextLeadId: erpLeadId,
          erpLeadCreatedAt: new Date().toISOString(),
        },
        dynamicCalculations: {
          ...dynamicCalculations,
          erpSync: {
            ...getRecord(dynamicCalculations.erpSync),
            status: "ERP_LEAD_CREATED",
            erpLeadId,
            erpnextLeadId: erpLeadId,
            httpStatus,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(consultationLeads.id, consultationLead.id));

    if (consultationLead.legacyLeadId) {
      const legacyLead = await db.query.leads.findFirst({
        where: eq(leads.id, consultationLead.legacyLeadId),
        columns: { configurationSnapshot: true },
      });
      const legacySnapshot = getRecord(legacyLead?.configurationSnapshot);
      await db.update(leads)
        .set({
          configurationSnapshot: {
            ...legacySnapshot,
            erpSync: {
              ...getRecord(legacySnapshot.erpSync),
              status: "ERP_LEAD_CREATED",
              erpLeadId,
              erpnextLeadId: erpLeadId,
              updatedAt: new Date().toISOString(),
            },
          },
        })
        .where(eq(leads.id, consultationLead.legacyLeadId));
    }

    void trackUmamiServerEvent({
      eventName: "lead_generated",
      featureFlagKey: "track_wizard_engagement",
      title: "Solar wizard lead generated",
      url: "/wizard/summary",
      properties: {
        kw_size: kwSize,
        est_budget: budget,
        consultation_lead_id: consultationLead.id,
        erp_lead_id: erpLeadId,
      },
    });

    revalidatePath("/admin/crm");
    revalidatePath("/admin/leads");
    return { success: true, erpLeadId };
  } catch (error) {
    console.error("[ERPNext Lead Factory]:", error);
    return {
      success: false,
      error: "Failed to create ERPNext Lead.",
    };
  }
}

export async function verifyErpnextLead(erpLeadId: string): Promise<{
  success: boolean;
  exists?: boolean;
  error?: string;
}> {
  const normalizedLeadId = erpLeadId.trim();

  if (!normalizedLeadId) {
    return { success: false, error: "ERPNext Lead ID is required." };
  }

  try {
    const lead = await erpNextCommercialService.getLead(normalizedLeadId);
    return { success: true, exists: Boolean(lead) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ERPNext lead verification failed.",
    };
  }
}

async function ensureErpLeadForConsultation(consultationLeadId: string | null) {
  if (!consultationLeadId) return "";

  const consultationLead = await db.query.consultationLeads.findFirst({
    where: eq(consultationLeads.id, consultationLeadId),
    columns: { erpLeadId: true },
  });

  if (consultationLead?.erpLeadId) return consultationLead.erpLeadId;

  const result = await createErpnextLeadForConsultation(consultationLeadId);
  return result.success && result.erpLeadId ? result.erpLeadId : "";
}

export async function createErpnextQuotation(proposalId: string) {
  await requireStaff();
  return createErpnextQuotationCore(proposalId);
}

export async function ensureErpnextQuotationSync(proposalId: string) {
  await requireStaff();

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
    columns: {
      id: true,
      erpnextQuotationId: true,
      erpnextCustomerId: true,
      configurationData: true,
    },
  });
  if (!proposal) return { success: false, error: "Proposal not found." };

  if (!proposal.erpnextQuotationId) {
    return createErpnextQuotationCore(proposal.id);
  }

  const remoteQuotation = await verifyErpnextQuotation(proposal.erpnextQuotationId);
  if (!remoteQuotation.success) {
    return { success: false, error: remoteQuotation.error };
  }

  if (!remoteQuotation.exists) {
    const configurationData = getRecord(proposal.configurationData);
    const erpSync = getRecord(configurationData.erpSync);
    await db.update(proposals)
      .set({
        erpnextQuotationId: null,
        configurationData: {
          ...configurationData,
          erpSync: {
            ...erpSync,
            status: "ERP_QUOTATION_MISSING",
            missingQuotationId: proposal.erpnextQuotationId,
            updatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposal.id));

    return createErpnextQuotationCore(proposal.id);
  }

  const synced = await safeSyncProposalQuotationToERP(proposal.id);
  if (!synced?.remoteName) {
    return {
      success: false,
      error: "ERPNext quotation sync failed. Review the ERP sync state for details.",
    };
  }

  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${proposal.id}`);
  revalidatePath(`/th/admin/crm/${proposal.id}`);
  revalidatePath(`/en/admin/crm/${proposal.id}`);
  revalidatePath("/proposals");

  return {
    success: true,
    quotationId: synced.remoteName,
    customerId: proposal.erpnextCustomerId,
  };
}

export async function getErpnextQuotationEquipment(
  quotationId: string | null | undefined,
): Promise<ErpnextQuotationEquipmentItem[]> {
  await requireStaff();

  const normalizedQuotationId = quotationId?.trim();
  if (!normalizedQuotationId) return [];

  try {
    const quotation = await erpNextCommercialService.getQuotation(normalizedQuotationId);
    const items = Array.isArray(quotation?.items) ? quotation.items : [];

    return items.map((item, index) => {
      const row = getRecord(item);
      const itemCode = getString(row.item_code);
      const itemName = getString(row.item_name) || itemCode || `Component ${index + 1}`;
      const quantity = getNumber(row.qty, 0);
      const rate = getNumber(row.rate, 0);

      return {
        id: getString(row.name) || `${normalizedQuotationId}-${itemCode || index}`,
        itemCode,
        itemName,
        description: getString(row.description) || null,
        quantity,
        uom: getString(row.uom) || getString(row.stock_uom) || null,
        rate,
        amount: getNumber(row.amount, quantity * rate),
      };
    });
  } catch (error) {
    console.error(`[ERPNext] Failed to load quotation equipment for ${normalizedQuotationId}:`, error);
    return [];
  }
}

async function verifyErpnextQuotation(erpQuotationId: string): Promise<{
  success: boolean;
  exists?: boolean;
  error?: string;
}> {
  const normalizedQuotationId = erpQuotationId.trim();
  if (!normalizedQuotationId) {
    return { success: false, error: "ERPNext quotation ID is required." };
  }

  try {
    const quotation = await erpNextCommercialService.getQuotation(normalizedQuotationId);
    return { success: true, exists: Boolean(quotation) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ERPNext quotation verification failed.",
    };
  }
}

export async function createErpnextQuotationFromLead(leadId: string) {
  await requireStaff();

  let payload: Record<string, unknown> | null = null;
  try {
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!lead) {
      return { success: false, error: "Lead not found." };
    }

    const snapshot = getRecord(lead.configurationSnapshot);
    const existingSync = getRecord(snapshot.erpSync);
    const existingQuotationId = getString(existingSync.erpnextQuotationId ?? existingSync.erpQuotationId);
    if (existingQuotationId) {
      return {
        success: true,
        quotationId: existingQuotationId,
        customerId: getString(existingSync.erpnextCustomerId ?? existingSync.erpCustomerId) || null,
        erpQuotationId: existingQuotationId,
        erpCustomerId: getString(existingSync.erpnextCustomerId ?? existingSync.erpCustomerId) || null,
      };
    }

    const rawItems = extractConfigurationItems(snapshot);
    const productIds = rawItems
      .map((item) => item.productId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const productsList = productIds.length ? await getCatalogProductsByIds(productIds) : [];
    const productsById = new Map(productsList.map((product) => [product.id, product]));
    const items = buildErpnextBomItems(snapshot, productsById);
    const totalPrice = getNumber(snapshot.totalPrice ?? snapshot.preliminaryBudget ?? snapshot.estimatedBudget, 0);
    const systemSizeKwp = getNumber(snapshot.systemkWp ?? snapshot.systemSizeKwp ?? snapshot.targetCapacity, 0);
    const panelCount = getNumber(snapshot.panelCount, 0);
    const erpnextItems = items.length > 0
      ? items
      : [await buildLeadFallbackSystemItem({ systemSizeKwp, panelCount, totalPrice })];
    let erpLeadId = getString(existingSync.erpLeadId ?? existingSync.erpnextLeadId);
    let leadHttpStatus = 200;
    if (!erpLeadId) {
      const createdLead = await erpNextCommercialService.createLeadIdempotently({
        data: {
          lead_name: lead.name,
          first_name: lead.name,
          email_id: lead.email || undefined,
          mobile_no: lead.phone || undefined,
          status: "Lead",
          source: "SolarDream CRM",
          notes: buildLeadRemarks(lead),
        },
        email: lead.email,
        phone: lead.phone,
      });
      erpLeadId = createdLead.providerId;
      leadHttpStatus = createdLead.httpStatus;

      await db.update(leads)
        .set({
          configurationSnapshot: {
            ...snapshot,
            erpSync: {
              ...existingSync,
              status: "ERP_LEAD_CREATED",
              erpLeadId,
              erpnextLeadId: erpLeadId,
              httpStatus: leadHttpStatus,
              updatedAt: new Date().toISOString(),
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));
    }
    const customerId = getString(existingSync.erpnextCustomerId ?? existingSync.erpCustomerId);
    const documentNo = getLeadDocumentNo(lead.id);
    const companyName = await erpNextCommercialService.getCompanyName();

    const quotationPayload = {
      data: {
        naming_series: "QTN-.YYYY.-",
        title: `${documentNo} ${lead.name}`.trim(),
        // ERPNext uses party_name as the standard Dynamic Link from a
        // quotation to its source CRM record. Quoting the Lead directly
        // allows the lead-to-quotation conversion to happen without waiting
        // for a separate Customer master-data binding.
        party_name: erpLeadId,
        quotation_to: "Lead",
        custom_linked_lead: erpLeadId,
        transaction_date: new Date().toISOString().slice(0, 10),
        valid_till: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        company: companyName,
        currency: "THB",
        selling_price_list: process.env.ERPNEXT_SELLING_PRICE_LIST || "Standard Selling",
        remarks: buildLeadRemarks(lead),
        items: erpnextItems,
      },
    };

    payload = quotationPayload;

    const result = await erpNextCommercialService.createQuotation(quotationPayload.data);
    const quotationName = result.providerId;

    try {
      await erpNextCommercialService.updateLead(erpLeadId, { status: "Quotation" });
    } catch (error) {
      console.warn(`[ERPNext Lead Quotation] quotation ${quotationName} created, but Lead ${erpLeadId} status was not updated:`, error);
    }

    const configurationSnapshot = {
      ...snapshot,
      erpSync: {
        ...existingSync,
        status: "LEAD_QUOTATION_CREATED",
        erpLeadId: erpLeadId || null,
        erpnextLeadId: erpLeadId || null,
        erpnextQuotationId: quotationName,
        erpnextCustomerId: customerId || null,
        erpCustomerId: customerId || null,
        erpQuotationId: quotationName,
        erpnextTitle: documentNo,
        documentNo,
        payloadTitle: documentNo,
        customerAssignmentMode: customerId ? "EXPLICIT_BINDING" : "LEAD_PARTY",
        httpStatus: result.httpStatus,
        validationLoopAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await db.update(leads)
      .set({
        status: "QUOTED",
        notes: [
          lead.notes,
          `ERPNext quotation ${quotationName} generated against ERPNext lead ${erpLeadId}.`,
        ].filter(Boolean).join("\n"),
        configurationSnapshot,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    revalidatePath("/admin/crm");
    revalidatePath(`/admin/crm/${leadId}`);
    return {
      success: true,
      quotationId: quotationName,
      customerId: customerId || null,
      erpLeadId,
      erpQuotationId: quotationName,
      erpCustomerId: customerId || null,
    };
  } catch (err: unknown) {
    console.error("[ERPNext Lead Quotation Factory]:", err);
    return {
      success: false,
      error: "Failed to create ERPNext quotation from lead.",
      debugPayload: {
        sentData: payload,
        erpResponse: "ERPNext quotation creation failed. Check server logs for provider response details.",
      },
    };
  }
}

export async function createErpnextQuotationForMember(proposalId: string) {
  return createErpnextQuotationCore(proposalId);
}

async function createErpnextQuotationCore(proposalId: string) {
  let payload: Record<string, unknown> | null = null;
  try {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
      with: {
        user: true,
      },
    });

    if (!proposal) {
      return { success: false, error: "Proposal not found." };
    }

    payload = {
      action: "getOrCreateErpnextCustomerForUser",
      proposalId,
      userId: proposal.userId,
    };

    const rawItems = extractConfigurationItems(proposal.configurationData);
    const productIds = rawItems
      .map((item) => item.productId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const productsList = productIds.length ? await getCatalogProductsByIds(productIds) : [];
    const productsById = new Map(productsList.map((product) => [product.id, product]));
    const items = buildErpnextBomItems(proposal.configurationData, productsById);
    const erpnextItems = items.length > 0
      ? items
      : [await buildLeadFallbackSystemItem({
          systemSizeKwp: proposal.systemSizeKwp || 0,
          panelCount: proposal.panelCount || 0,
          totalPrice: proposal.totalPrice || 0,
        })];
    const erpLeadId = await ensureErpLeadForConsultation(proposal.wizardLeadId);
    const customerId = proposal.erpnextCustomerId?.trim() || "";
    if (!customerId) {
      return {
        success: false,
        error: "Bind an ERPNext customer before generating the quotation.",
      };
    }
    const documentNo = getQuotationDocumentNo(proposal.id);
    const companyName = await erpNextCommercialService.getCompanyName();

    const config = ((proposal.configurationData as Record<string, unknown>) || {});
    const quotationPayload = {
      data: {
        naming_series: "QTN-.YYYY.-",
        title: documentNo,
        party_name: customerId,
        customer: customerId,
        quotation_to: "Customer",
        transaction_date: new Date().toISOString().slice(0, 10),
        valid_till: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        company: companyName,
        currency: "THB",
        selling_price_list: process.env.ERPNEXT_SELLING_PRICE_LIST || "Standard Selling",
        custom_solardream_proposal_id: proposal.id,
        custom_solardream_document_no: documentNo,
        custom_target_system_size: proposal.systemSizeKwp,
        custom_predicted_monthly_savings: typeof config.monthlySavings === "number" ? config.monthlySavings : undefined,
        custom_frontend_configuration_json: JSON.stringify(config),
        items: erpnextItems,
      },
    };

    payload = quotationPayload;

    const result = await erpNextCommercialService.createQuotation(quotationPayload.data);
    const quotationName = result.providerId;

    const configurationData = {
      ...((proposal.configurationData as Record<string, unknown>) || {}),
      erpSync: {
        status: "QUOTATION_CREATED",
        erpLeadId: erpLeadId || null,
        erpnextLeadId: erpLeadId || null,
        erpnextQuotationId: quotationName,
        erpnextCustomerId: customerId || null,
        erpCustomerId: customerId || null,
        erpQuotationId: quotationName,
        erpnextTitle: documentNo,
        documentNo,
        payloadTitle: documentNo,
        httpStatus: result.httpStatus,
        validationLoopAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await db.update(proposals)
      .set({
        erpnextCustomerId: customerId || null,
        erpnextQuotationId: quotationName,
        configurationData,
      })
      .where(eq(proposals.id, proposalId));

    revalidatePath("/admin/crm");
    revalidatePath(`/admin/crm/${proposalId}`);
    revalidatePath("/proposals");
    return {
      success: true,
      quotationId: quotationName,
      customerId: customerId || null,
      erpLeadId: erpLeadId || null,
      erpQuotationId: quotationName,
      erpCustomerId: customerId || null,
    };
  } catch (err: unknown) {
    console.error("[ERPNext Quotation Factory]:", err);
    return {
      success: false,
      error: "Failed to create ERPNext quotation.",
      debugPayload: {
        sentData: payload,
        erpResponse: "ERPNext quotation creation failed. Check server logs for provider response details.",
      },
    };
  }
}
