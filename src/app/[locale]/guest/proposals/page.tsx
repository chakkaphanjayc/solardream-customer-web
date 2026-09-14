import { cookies } from "next/headers";
import { eq, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { proposals, serviceOrders, users, consultationLeads } from "@/db/schema";
import { getSigningSecret } from "@/lib/portalTokens";
import { verifyHs256Jwt } from "@/lib/signedJwt";
import { serviceContactEmailDigest } from "@/lib/servicePortal";
import GuestProposalsClient from "./GuestProposalsClient";


interface DBProposal {
  id: string;
  status: string;
  systemSizeKwp: number;
  panelCount: number;
  totalPrice: number;
  erpnextQuotationId: string | null;
}

interface DBServiceOrder {
  id: string;
  trackingRef: string | null;
  status: string;
  offeringSnapshot: unknown;
  appointmentDate: Date | null;
}

async function verifyGuestEmailSession(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  try {
    const secret = await getSigningSecret();
    const payload = verifyHs256Jwt(cookieValue, secret);
    if (payload?.typ === "guest_master_session" && typeof payload.email === "string") {
      return payload.email.trim().toLowerCase();
    }
  } catch (err) {
    console.error("Failed to verify guest email session cookie", err);
  }
  return null;
}

export default async function GuestProposalsDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const guestCookie = cookieStore.get("sd_guest_email")?.value;
  const email = await verifyGuestEmailSession(guestCookie);

  // If no guest session is established yet, let the client exchange token or show auth prompt
  if (!email) {
    return <GuestProposalsClient locale={locale} email={null} proposals={[]} serviceOrders={[]} />;
  }

  // Fetch proposals associated with this email
  const dbUsers = await db.query.users.findMany({
    where: eq(users.email, email),
    columns: { id: true },
  });
  const userIds = dbUsers.map((u) => u.id);

  const dbLeads = await db.query.consultationLeads.findMany({
    where: eq(consultationLeads.email, email),
    columns: { id: true },
  });
  const leadIds = dbLeads.map((l) => l.id);

  const proposalConditions = [];
  if (userIds.length > 0) {
    proposalConditions.push(sql`${proposals.userId} IN ${userIds}`);
  }
  if (leadIds.length > 0) {
    proposalConditions.push(sql`${proposals.wizardLeadId} IN ${leadIds}`);
  }

  let matchedProposals: DBProposal[] = [];
  if (proposalConditions.length > 0) {
    matchedProposals = (await db.query.proposals.findMany({
      where: or(...proposalConditions),
      orderBy: (p, { desc }) => [desc(p.id)],
    })) as DBProposal[];
  }

  // Fetch service orders associated with this email digest
  const emailDigest = serviceContactEmailDigest(email);
  const matchedServiceOrders = (await db.query.serviceOrders.findMany({
    where: or(
      eq(serviceOrders.contactEmailDigest, emailDigest),
      userIds.length > 0 ? sql`${serviceOrders.customerUserId} IN ${userIds}` : sql`false`
    ),
    orderBy: (so, { desc }) => [desc(so.createdAt)],
  })) as DBServiceOrder[];

  return (
    <GuestProposalsClient
      locale={locale}
      email={email}
      proposals={matchedProposals.map((p) => ({
        id: p.id,
        reference: p.erpnextQuotationId || p.id,
        status: p.status,
        systemSizeKwp: p.systemSizeKwp,
        panelCount: p.panelCount,
        totalPrice: p.totalPrice,
      }))}
      serviceOrders={matchedServiceOrders.map((so) => ({
        id: so.id,
        reference: so.trackingRef || so.id,
        status: so.status,
        offeringName: typeof so.offeringSnapshot === "object" && so.offeringSnapshot !== null && "name" in so.offeringSnapshot
          ? String((so.offeringSnapshot as Record<string, unknown>).name)
          : "Service Order",
        appointmentDate: so.appointmentDate ? new Date(so.appointmentDate).toISOString() : null,
      }))}
    />
  );
}
