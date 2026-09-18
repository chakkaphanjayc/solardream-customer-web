import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";

import { getCustomerProposalById } from "@/app/actions/proposals";
import { getQuotationDocumentTemplateCatalog } from "@/app/actions/quotationDocumentTemplates";
import { db } from "@/db";
import {
  consultationLeads,
  installationJobTickets,
  invoices,
  paymentSettings,
  paymentRequests,
  proposals,
  quotationDeliveryDocuments,
  quotationDocumentRequests,
} from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { PORTAL_SESSION_COOKIE, validatePortalToken, getSigningSecret } from "@/lib/portalTokens";
import { verifyHs256Jwt } from "@/lib/signedJwt";
import ProposalViewTracker from "@/components/analytics/ProposalViewTracker";
import ProposalDetailView from "@/components/proposals/detail/ProposalDetailView";
import type {
  ClientDocumentRequest,
  ClientDeliveryDocument,
  ClientInvoice,
  ClientPaymentInstructions,
  ClientPaymentRequest,
  ClientProposal,
  ClientDeliveryDocumentMetadata,
} from "@/types/proposals";


type ProposalPageRow = Omit<ClientProposal, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

interface ProposalReviewPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}


function mapProposalRow(row: ProposalPageRow): ClientProposal {
  return {
    id: row.id,
    userId: row.userId,
    systemSizeKwp: row.systemSizeKwp,
    panelCount: row.panelCount,
    totalPrice: row.totalPrice,
    monthlySavings: row.monthlySavings,
    paybackPeriod: row.paybackPeriod,
    pdfUrl: row.pdfUrl,
    revisedPdfUrl: row.revisedPdfUrl,
    revisionNumber: row.revisionNumber,
    status: row.status,
    dispatchStatus: row.dispatchStatus,
    configurationData: row.configurationData,
    fulfillmentType: row.fulfillmentType,
    erpnextQuotationId: row.erpnextQuotationId,
    selectedFinancing: row.selectedFinancing
      ? {
          providerName: row.selectedFinancing.providerName,
          financeType: row.selectedFinancing.financeType,
          interestRate: row.selectedFinancing.interestRate,
          maxTermMonths: row.selectedFinancing.maxTermMonths,
          marketingTag: row.selectedFinancing.marketingTag,
        }
      : null,
    user: row.user
      ? {
          name: row.user.name,
          fullName: row.user.fullName,
          email: row.user.email,
          phoneNumber: row.user.phoneNumber,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    requestType: row.requestType,
    serviceItems: row.serviceItems,
    preferredDate: row.preferredDate
      ? new Date(row.preferredDate).toISOString()
      : null,
  };
}

async function getDocumentRequests(
  quotationId: string,
): Promise<ClientDocumentRequest[]> {
  const rows = await db.query.quotationDocumentRequests.findMany({
    where: eq(quotationDocumentRequests.quotationId, quotationId),
    orderBy: (documentRequests, { asc, desc }) => [
      desc(documentRequests.isRequired),
      asc(documentRequests.createdAt),
    ],
  });

  return rows.map((row) => ({
    id: row.id,
    quotationId: row.quotationId,
    documentName: row.documentName,
    descriptionHint: row.descriptionHint,
    requestType: row.requestType as ClientDocumentRequest["requestType"],
    isRequired: row.isRequired,
    status: row.status,
    fileUrl: row.fileUrl,
    storageProvider: row.storageProvider,
    storageFileId: row.storageFileId,
    fallbackUrl: row.fallbackUrl,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function getDeliveryDocuments(
  quotationId: string,
): Promise<ClientDeliveryDocument[]> {
  try {
    const rows = await db.query.quotationDeliveryDocuments.findMany({
      where: and(
        eq(quotationDeliveryDocuments.quotationId, quotationId),
        ne(quotationDeliveryDocuments.status, "ARCHIVED"),
      ),
      orderBy: (deliveryDocuments, { asc }) => [
        asc(deliveryDocuments.createdAt),
      ],
    });

    return rows.map((row) => ({
      id: row.id,
      quotationId: row.quotationId,
      deliveryType: row.deliveryType,
      title: row.title,
      description: row.description,
      fileUrl: row.fileUrl,
      storageProvider: row.storageProvider,
      storageFileId: row.storageFileId,
      fallbackUrl: row.fallbackUrl,
      status: row.status,
      metadata: serializeDeliveryMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const cause =
      error && typeof error === "object" && "cause" in error
        ? error.cause
        : null;
    const causeCode =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "";
    if (code === "42P01" || causeCode === "42P01") {
      return [];
    }
    throw error;
  }
}

function serializeDeliveryMetadata(
  value: unknown,
): ClientDeliveryDocumentMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  const rawName =
    typeof metadata.originalFileName === "string"
      ? metadata.originalFileName
      : "";
  const originalFileName = rawName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 240);
  const allowedKinds = new Set([
    "pdf",
    "jpeg",
    "png",
    "webp",
    "heic",
    "docx",
    "xlsx",
    "pptx",
    "txt",
  ]);
  const kind =
    typeof metadata.kind === "string" && allowedKinds.has(metadata.kind)
      ? (metadata.kind as ClientDeliveryDocumentMetadata["kind"])
      : undefined;
  return {
    originalFileName: originalFileName || undefined,
    kind,
    extension:
      typeof metadata.extension === "string"
        ? metadata.extension
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase()
            .slice(0, 10)
        : undefined,
    byteSize:
      typeof metadata.byteSize === "number" &&
      Number.isFinite(metadata.byteSize)
        ? metadata.byteSize
        : undefined,
    contentType:
      typeof metadata.contentType === "string"
        ? metadata.contentType.slice(0, 160)
        : undefined,
    version:
      typeof metadata.version === "number" &&
      Number.isInteger(metadata.version) &&
      metadata.version > 0
        ? metadata.version
        : typeof metadata.version === "string" &&
            Number.isInteger(Number(metadata.version)) &&
            Number(metadata.version) > 0
          ? Number(metadata.version)
          : undefined,
  };
}

async function getPortalBillingData(proposalId: string): Promise<{
  paymentRequests: ClientPaymentRequest[];
  invoices: ClientInvoice[];
  paymentInstructions: ClientPaymentInstructions;
}> {
  const [paymentRequestRows, jobTicket, configuredPaymentSettings] = await Promise.all([
    db.query.paymentRequests.findMany({
      where: eq(paymentRequests.proposalId, proposalId),
      orderBy: (rows, { desc }) => [desc(rows.id)],
    }),
    db.query.installationJobTickets.findFirst({
      where: eq(installationJobTickets.quotationId, proposalId),
      columns: { id: true },
    }),
    db.query.paymentSettings.findFirst({
      where: eq(paymentSettings.id, "default"),
      columns: {
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
      },
    }),
  ]);

  const invoiceRows = jobTicket
    ? await db.query.invoices.findMany({
        where: eq(invoices.jobTicketId, jobTicket.id),
        orderBy: (rows, { desc }) => [desc(rows.createdAt)],
      })
    : [];

  return {
    paymentRequests: paymentRequestRows.map((row) => ({
      id: row.id,
      proposalId: row.proposalId,
      title: row.title,
      amountRequested: String(row.amountRequested),
      paymentType: row.paymentType === "FULL" ? "FULL" : "INSTALLMENT",
      paymentMethod: row.paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "QR",
      status: row.status,
      slipUrl: row.slipUrl,
      slipImageUrl: row.slipImageUrl,
      verifiedBy: row.verifiedBy,
      verifiedAt: row.verifiedAt?.toISOString() || null,
      verificationStatus: getPaymentMetadataText(
        row.easySlipData,
        "verificationStatus",
      ),
      storageProvider:
        row.storageProvider ||
        getPaymentMetadataText(row.easySlipData, "storageProvider"),
      storageFileId: row.storageFileId,
      fallbackUrl:
        row.fallbackUrl ||
        getPaymentMetadataText(row.easySlipData, "fallbackUrl"),
      verificationError: getPaymentMetadataText(
        row.easySlipData,
        "verificationError",
      ),
    })),
    invoices: invoiceRows.map((row) => ({
      id: row.id,
      erpnextInvoiceId: row.erpnextInvoiceId,
      status: row.status,
      amount: String(row.amount),
      pdfUrl: row.pdfUrl,
      slipUrl: row.slipUrl,
      createdAt: row.createdAt.toISOString(),
    })),
    paymentInstructions: {
      bankName: configuredPaymentSettings?.bankName || "",
      bankAccountName: configuredPaymentSettings?.bankAccountName || "",
      bankAccountNumber: configuredPaymentSettings?.bankAccountNumber || "",
    },
  };
}

function getPaymentMetadataText(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  const item = metadata[key];
  return typeof item === "string" && item.trim() ? item.trim() : null;
}

async function verifyGuestEmailSession(cookieValue: string): Promise<string | null> {
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

export default async function ProposalReviewPage({
  params,
}: ProposalReviewPageProps) {
  const { locale, id } = await params;
  const directProposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
    with: {
      user: {
        columns: {
          name: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          passwordHash: true,
        },
      },
      selectedFinancing: true,
    },
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (directProposal) {
    const isOwner = user?.id === directProposal.userId;
    const portalToken =
      (await cookies()).get(PORTAL_SESSION_COOKIE)?.value || "";
    const guestEmailToken =
      (await cookies()).get("sd_guest_email")?.value || "";

    let hasAccess = isOwner;
    let hasGuestSpecificToken = false;

    // Check specific portal token
    if (!hasAccess && portalToken) {
      const guestToken = await validatePortalToken({
        token: portalToken,
        proposalId: directProposal.id,
        requiredScope: "proposal:read",
      });
      if (guestToken) {
        hasAccess = true;
        hasGuestSpecificToken = true;
      }
    }

    // Check email-based guest token
    if (!hasAccess && guestEmailToken) {
      const guestEmail = await verifyGuestEmailSession(guestEmailToken);
      if (guestEmail) {
        const userEmail = directProposal.user?.email?.trim().toLowerCase();
        
        let leadEmail = "";
        if (directProposal.wizardLeadId) {
          const lead = await db.query.consultationLeads.findFirst({
            where: eq(consultationLeads.id, directProposal.wizardLeadId),
            columns: { email: true },
          });
          leadEmail = lead?.email?.trim().toLowerCase() || "";
        }

        if (userEmail === guestEmail || (leadEmail && leadEmail === guestEmail)) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) notFound();

    const isLinkedUserAccount = Boolean(directProposal.user?.passwordHash);
    const showAccountCta = !isOwner && !isLinkedUserAccount;

    const proposal = mapProposalRow(
      directProposal as unknown as ProposalPageRow,
    );
    const [documentRequests, deliveryDocuments, billingData, documentTemplateCatalog] =
      await Promise.all([
        getDocumentRequests(proposal.id),
        getDeliveryDocuments(proposal.id),
        getPortalBillingData(proposal.id),
        getQuotationDocumentTemplateCatalog(),
      ]);
    return (
      <>
        <ProposalViewTracker
          quotationId={proposal.erpnextQuotationId || proposal.id}
          grandTotal={proposal.totalPrice}
        />
        <ProposalDetailView
          proposal={proposal}
          showAccountCta={showAccountCta}
          initialDocumentRequests={documentRequests}
          initialDeliveryDocuments={deliveryDocuments}
          initialPaymentRequests={billingData.paymentRequests}
          paymentInstructions={billingData.paymentInstructions}
          warrantyTemplates={documentTemplateCatalog.warranties}
        />
      </>
    );
  }

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const result = await getCustomerProposalById(id);
  if (!result.success || !result.proposal) {
    notFound();
  }

  const row = result.proposal as unknown as ProposalPageRow;
  const proposal = mapProposalRow(row);
  const [documentRequests, deliveryDocuments, billingData, documentTemplateCatalog] = await Promise.all([
    getDocumentRequests(proposal.id),
    getDeliveryDocuments(proposal.id),
    getPortalBillingData(proposal.id),
    getQuotationDocumentTemplateCatalog(),
  ]);

  return (
    <>
      <ProposalViewTracker
        quotationId={proposal.erpnextQuotationId || proposal.id}
        grandTotal={proposal.totalPrice}
      />
      <ProposalDetailView
        proposal={proposal}
        showAccountCta={false}
        initialDocumentRequests={documentRequests}
        initialDeliveryDocuments={deliveryDocuments}
        initialPaymentRequests={billingData.paymentRequests}
        paymentInstructions={billingData.paymentInstructions}
        warrantyTemplates={documentTemplateCatalog.warranties}
      />
    </>
  );
}
