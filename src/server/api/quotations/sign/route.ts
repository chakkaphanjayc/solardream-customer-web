import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { activityLogs, proposalRevisions, proposals, quotationAcceptances, signatureAuditTrails, signatureEnvelopes } from "@/db/schema";
import { getQuotationDocumentNo } from "@/lib/erpnext";
import {
  stampQuotationPdf,
} from "@/lib/pdf-signer";
import { downloadDrivePdf, uploadSignedDrivePdf, type DrivePdfFile } from "@/lib/document-signing/drive";
import { getSigningSecret, PORTAL_SESSION_COOKIE, validatePortalToken } from "@/lib/portalTokens";
import { isQuotationAvailableForSignature } from "@/lib/quotationSigningEligibility";
import { verifyHs256Jwt } from "@/lib/signedJwt";
import { createClient } from "@/utils/supabase/server";
import { enqueueIntegrationEvent } from "@/lib/integrationOutbox";
import { enqueueLifecycleNotification } from "@/server/services/communications/lifecycle-notifications";
import { processOutboxBestEffort } from "@/lib/outboxProcessor";
import { SALES_NOTIFICATION_TOPICS } from "@/lib/salesNotificationConfig";
import { signQuotationWithDocumentService } from "@/lib/document-service/client";
import { verifiedPdfSha256 } from "@/lib/document-service/document-hash";
import { QUOTATION_ACCEPTED_COMMAND_TOPIC } from "@/server/services/sales/quotation-topics";
import { recordQuotationNegotiationEvent } from "@/server/services/sales/quotation-negotiation-service";
import {
  isProposalRevisionCurrentForAcceptance,
  quotationRevisionLockKey,
} from "@/server/services/sales/domain/quotation-revision-state";


const signQuotationSchema = z.object({
  quotation_id: z.string().trim().min(1).max(160),
  signature: z.string().trim().min(32).max(3_000_000),
  signer_name: z.string().trim().min(1).max(160).optional(),
});

type GoldenThreadState = {
  status: "PROJECT_CREATED" | "SALES_ORDER_SUBMITTED" | "SALES_ORDER_PENDING" | "SYNC_FAILED";
  quotationId: string;
  salesOrderId: string | null;
  projectId: string | null;
  updatedAt: string;
  error?: string;
};

class ProposalRevisionConflictError extends Error {}

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function verificationUrl(request: NextRequest, quotationId: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const origin = configuredOrigin || request.nextUrl.origin;
  return new URL(`/verify/${encodeURIComponent(quotationId)}`, origin).toString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function extractDriveFileId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{10,200}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const pathMatch = /\/file\/d\/([a-zA-Z0-9_-]{10,200})/.exec(url.pathname);
    if (pathMatch?.[1]) return pathMatch[1];
    const queryId = url.searchParams.get("id");
    return queryId && /^[a-zA-Z0-9_-]{10,200}$/.test(queryId) ? queryId : null;
  } catch {
    return null;
  }
}

async function getStoredQuotationPdf(input: {
  proposalId: string;
  pdfDocumentReference: string | null;
}): Promise<{ source: DrivePdfFile; sourceDocumentId: string | null }> {
  const sourceFileId = extractDriveFileId(input.pdfDocumentReference);
  if (!sourceFileId) {
    throw new Error("The current sent revision has no canonical Google Drive PDF reference.");
  }

  const finalQuotation = await db.query.quotationDeliveryDocuments.findFirst({
    where: (documents, operators) => operators.and(
      operators.eq(documents.quotationId, input.proposalId),
      operators.eq(documents.deliveryType, "FINAL_QUOTATION"),
      operators.eq(documents.status, "READY"),
    ),
    columns: {
      id: true,
      fileUrl: true,
      storageFileId: true,
      fallbackUrl: true,
    },
  });
  const deliveryFileIds = finalQuotation
    ? [finalQuotation.storageFileId, finalQuotation.fileUrl, finalQuotation.fallbackUrl]
        .map(extractDriveFileId)
    : [];
  const sourceDocumentId = deliveryFileIds.includes(sourceFileId)
    ? finalQuotation?.id || null
    : null;

  return {
    source: await downloadDrivePdf(sourceFileId),
    sourceDocumentId,
  };
}

async function getGuestEmailAccess(request: NextRequest) {
  const token = request.cookies.get("sd_guest_email")?.value;
  if (!token) return null;

  try {
    const payload = verifyHs256Jwt(token, await getSigningSecret());
    return payload?.typ === "guest_master_session" && typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = signQuotationSchema.parse(await request.json());
    const proposal = await db.query.proposals.findFirst({
      where: or(
        eq(proposals.id, input.quotation_id),
        eq(proposals.erpnextQuotationId, input.quotation_id),
      ),
      with: {
        user: {
          columns: { name: true, fullName: true, email: true, phoneNumber: true, lineUserId: true },
        },
      },
    });
    if (!proposal) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const portalSession = request.cookies.get(PORTAL_SESSION_COOKIE)?.value || "";
    const portalAccess = portalSession
      ? await validatePortalToken({ token: portalSession, proposalId: proposal.id, requiredScope: "proposal:read" })
      : null;
    const guestEmail = await getGuestEmailAccess(request);
    const proposalEmail = proposal.user?.email?.trim().toLowerCase() || null;
    const hasVerifiedGuestEmail = Boolean(guestEmail && proposalEmail && guestEmail === proposalEmail);
    if (user?.id !== proposal.userId && !portalAccess && !hasVerifiedGuestEmail) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isQuotationAvailableForSignature({
      status: proposal.status,
      dispatchStatus: proposal.dispatchStatus,
    })) {
      return NextResponse.json({ error: "This quotation is not available for signature." }, { status: 409 });
    }

    const quotationId = proposal.erpnextQuotationId?.trim();
    if (!quotationId) {
      return NextResponse.json({ error: "The ERPNext quotation must be created before signing." }, { status: 409 });
    }

    let signedAt = new Date();
    const signerIpAddress = clientIp(request);
    const signerUserAgent = request.headers.get("user-agent") || "unknown";
    const signerName = input.signer_name || proposal.user?.fullName || proposal.user?.name || "Customer";
    const quotationVerificationUrl = verificationUrl(request, quotationId);
    const currentRevision = await db.query.proposalRevisions.findFirst({
      where: eq(proposalRevisions.proposalId, proposal.id),
      orderBy: [desc(proposalRevisions.revisionNumber)],
    });
    if (!currentRevision || (currentRevision.status !== "SENT" && currentRevision.status !== "VIEWED")) {
      return NextResponse.json({ error: "The current proposal revision is not available for signature." }, { status: 409 });
    }
    if (!extractDriveFileId(currentRevision.pdfDocumentReference)) {
      return NextResponse.json(
        { error: "The current sent revision has no canonical PDF. Create and send a new revision before signing." },
        { status: 409 },
      );
    }
    const { source: originalPdf, sourceDocumentId } = await getStoredQuotationPdf({
      proposalId: proposal.id,
      pdfDocumentReference: currentRevision.pdfDocumentReference,
    });
    const sourceDocumentHash = createHash("sha256").update(originalPdf.bytes).digest("hex");
    if (!currentRevision.documentHash || currentRevision.documentHash !== sourceDocumentHash) {
      return NextResponse.json({ error: "The stored document does not match the revision that was sent. Create and send a new revision." }, { status: 409 });
    }
    const actorId = user?.id
      || (guestEmail ? `guest:${createHash("sha256").update(guestEmail).digest("hex").slice(0, 32)}` : `portal:${proposal.id}`);
    const verificationMethod = user?.id === proposal.userId
      ? "AUTHENTICATED_USER"
      : portalAccess
        ? "PORTAL_TOKEN"
        : "VERIFIED_EMAIL";
    const documentServiceResult = await signQuotationWithDocumentService({
      pdfBytes: originalPdf.bytes,
      quotationId,
      revisionId: currentRevision.id,
      revisionReference: currentRevision.erpQuotationReference,
      signatureDataUrl: input.signature,
      signerName,
      actorId,
      recipientEmail: proposalEmail,
      verificationMethod,
      consentTextVersion: process.env.PROPOSAL_SIGNATURE_CONSENT_VERSION?.trim() || "2026-08-28",
    });
    if (documentServiceResult?.signedAt) {
      const serviceSignedAt = new Date(documentServiceResult.signedAt);
      if (!Number.isNaN(serviceSignedAt.getTime())) signedAt = serviceSignedAt;
    }
    const signedDocument = documentServiceResult
      ? { pdfBytes: documentServiceResult.finalPdf, sha256Hash: documentServiceResult.finalHash }
      : await stampQuotationPdf({
        pdfBytes: originalPdf.bytes,
        signatureDataUrl: input.signature,
        signedAt,
        signerIpAddress,
        signerUserAgent,
        verificationUrl: quotationVerificationUrl,
        signerName,
        requireSignatureAnchor: true,
      });
    let verifiedSignedDocumentHash: string;
    try {
      verifiedSignedDocumentHash = verifiedPdfSha256(
        signedDocument.pdfBytes,
        signedDocument.sha256Hash,
      );
    } catch {
      return NextResponse.json(
        { error: "The signed PDF could not be verified." },
        { status: 502 },
      );
    }
    const signedDriveDocument = await uploadSignedDrivePdf({
      source: originalPdf,
      signedPdf: Buffer.from(signedDocument.pdfBytes),
    });
    const signedPdfUrl = signedDriveDocument.fileUrl;

    const configurationData = asRecord(proposal.configurationData);
    const pendingGoldenThread: GoldenThreadState = {
      status: "SALES_ORDER_PENDING",
      quotationId,
      salesOrderId: null,
      projectId: null,
      updatedAt: signedAt.toISOString(),
    };
    const signature = {
      signedAt: signedAt.toISOString(),
      signerName,
      signerIpAddress,
      signerUserAgent,
      erpnextQuotationId: quotationId,
      signedPdfUrl,
      signedDriveFileId: signedDriveDocument.fileId,
      signedSourceFileId: originalPdf.fileId,
      signedSourceDocumentId: sourceDocumentId,
      signedSourceFileName: originalPdf.fileName,
      signedPdfStorage: "GOOGLE_DRIVE",
      sha256Hash: verifiedSignedDocumentHash,
      documentServiceDocumentId: documentServiceResult?.document.id || null,
      documentServiceVersionId: documentServiceResult?.document.currentVersionId || null,
      documentServiceFinalObject: documentServiceResult?.document.currentVersion.finalObject || null,
      signingRuntime: documentServiceResult ? "solardream-document-service" : "legacy-customer-web",
      verificationUrl: quotationVerificationUrl,
      source: documentServiceResult ? "document_service_pades" : "stored_quotation_signature_field",
    };

    const [updatedProposal] = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(proposal.id)}))`,
      );
      const latestRevision = await tx.query.proposalRevisions.findFirst({
        where: eq(proposalRevisions.proposalId, proposal.id),
        orderBy: [desc(proposalRevisions.revisionNumber)],
      });
      if (!isProposalRevisionCurrentForAcceptance({
        expectedRevisionId: currentRevision.id,
        latestRevision: latestRevision ?? null,
        sourceDocumentHash,
      })) {
        throw new ProposalRevisionConflictError(
          "This quotation changed while it was being signed. Reload and review the latest version.",
        );
      }

      const [updated] = await tx.update(proposals)
        .set({
          status: "CLIENT_SIGNED_PENDING_REVIEW",
          dispatchStatus: "SIGNED",
          signatureUrl: input.signature,
          signedAt,
          signedDocumentDriveUrl: signedPdfUrl,
          configurationData: {
            ...configurationData,
            signature,
            goldenThread: pendingGoldenThread,
            commercialHandoff: {
              status: "PENDING",
              revisionId: currentRevision.id,
              revisionNumber: currentRevision.revisionNumber,
              quotationId,
              signedHash: verifiedSignedDocumentHash,
              queuedAt: signedAt.toISOString(),
            },
          },
          updatedAt: signedAt,
        })
        .where(and(eq(proposals.id, proposal.id), eq(proposals.status, proposal.status)))
        .returning();
      if (!updated) throw new Error("Quotation was updated before it could be signed. Please reload and try again.");

      await tx.insert(signatureAuditTrails).values({
        proposalId: proposal.id,
        signatureUrl: input.signature,
        signerIpAddress,
        signerUserAgent,
        documentHash: verifiedSignedDocumentHash,
      });
      const verifiedContactValue = proposalEmail || proposal.user?.phoneNumber?.trim();
      if (!verifiedContactValue) throw new Error("A verified signer contact is required.");
      const verifiedContact = user?.id === proposal.userId
        ? { type: "AUTHENTICATED_USER", userId: user.id, value: verifiedContactValue }
        : portalAccess
          ? { type: "PORTAL_TOKEN", value: verifiedContactValue }
          : { type: "VERIFIED_EMAIL", value: guestEmail || verifiedContactValue };
      const [signatureEnvelope] = await tx.insert(signatureEnvelopes).values({
        revisionId: currentRevision.id,
        status: "SIGNED",
        signerIdentity: { name: signerName, proposalUserId: proposal.userId },
        verifiedContact,
        signedAt,
        consentVersion: process.env.PROPOSAL_SIGNATURE_CONSENT_VERSION?.trim() || "2026-08-28",
        signatureStorageReference: signedDriveDocument.fileId,
        // Evidence binds to the exact document presented; the stamped output hash is retained separately.
        documentHash: sourceDocumentHash,
        auditMetadata: {
          verificationMethod: verifiedContact.type,
          ipAddressHash: createHash("sha256").update(signerIpAddress).digest("hex"),
          userAgentHash: createHash("sha256").update(signerUserAgent).digest("hex"),
          sourceDocumentId: sourceDocumentId || undefined,
          verificationUrl: quotationVerificationUrl,
          signedDocumentHash: verifiedSignedDocumentHash,
          documentServiceDocumentId: documentServiceResult?.document.id || undefined,
          documentServiceVersionId: documentServiceResult?.document.currentVersionId || undefined,
          signingRuntime: documentServiceResult ? "solardream-document-service" : "legacy-customer-web",
        },
      }).returning({ id: signatureEnvelopes.id });
      if (!signatureEnvelope) throw new Error("The signed evidence envelope could not be recorded.");
      const [acceptedRevision] = await tx.update(proposalRevisions).set({ status: "ACCEPTED", acceptedAt: signedAt })
        .where(and(eq(proposalRevisions.id, currentRevision.id), or(eq(proposalRevisions.status, "SENT"), eq(proposalRevisions.status, "VIEWED"))))
        .returning({ id: proposalRevisions.id });
      if (!acceptedRevision) throw new Error("Proposal revision was updated before it could be accepted. Please reload and try again.");
      await tx.insert(quotationAcceptances).values({
        proposalId: proposal.id,
        revisionId: currentRevision.id,
        signatureEnvelopeId: signatureEnvelope.id,
        revisionNumber: currentRevision.revisionNumber,
        erpnextQuotationId: quotationId,
        sourceDocumentHash,
        signedDocumentHash: verifiedSignedDocumentHash,
        signerName,
        signerUserId: user?.id || null,
        verificationMethod: verifiedContact.type,
        verificationUrl: quotationVerificationUrl,
        acceptedAt: signedAt,
        status: "ORDER_PENDING",
      });
      await recordQuotationNegotiationEvent(tx, {
        proposalId: proposal.id,
        revisionId: currentRevision.id,
        actorUserId: user?.id || null,
        eventType: "ACCEPTANCE_RECORDED",
        source: "CUSTOMER_SIGNATURE",
        visibility: "CUSTOMER",
        message: `${signerName} accepted quotation revision ${currentRevision.revisionNumber}.`,
        pricingSnapshot: { signedDocumentHash: verifiedSignedDocumentHash },
        termsSnapshot: { sourceDocumentHash },
        idempotencyKey: `quotation-acceptance:${proposal.id}:${currentRevision.id}`,
      });
      await tx.insert(activityLogs).values({
        entityId: proposal.id,
        entityType: "QUOTATION",
        action: "CUSTOMER_SIGNATURE_EMBEDDED",
        description: `${signerName} signed ${getQuotationDocumentNo(proposal.id)}. The stored quotation PDF was stamped in its customer signature field and uploaded to Google Drive as ${signedDriveDocument.fileName}.`,
        userId: proposal.userId,
      });
      await enqueueIntegrationEvent(tx, {
        topic: QUOTATION_ACCEPTED_COMMAND_TOPIC,
        aggregateType: "PROPOSAL",
        aggregateId: proposal.id,
        correlationId: currentRevision.id,
        payload: {
          proposalId: proposal.id,
          quotationId,
          revisionId: currentRevision.id,
          revisionNumber: currentRevision.revisionNumber,
          signedAt: signedAt.toISOString(),
          signedHash: verifiedSignedDocumentHash,
          sourceDocumentHash,
          signerIpAddress,
          signerUserAgent,
          verificationUrl: quotationVerificationUrl,
          signedPdfUrl,
          signedDriveFileId: signedDriveDocument.fileId,
        },
        dedupeKey: `commercial.quotation.accepted:${proposal.id}:${currentRevision.id}`,
      });
      return [updated];
    });

    await enqueueIntegrationEvent(db, {
      topic: SALES_NOTIFICATION_TOPICS.quotationAccepted,
      aggregateType: "PROPOSAL",
      aggregateId: proposal.id,
      payload: { source: "CUSTOMER_SIGNATURE" },
      dedupeKey: `sales.quotation.accepted:${proposal.id}`,
    });
    const notificationOperationId = await enqueueLifecycleNotification(db, {
      eventType: "QUOTATION_ACCEPTED",
      aggregateId: proposal.id,
      correlationId: proposal.id,
      payload: {
        customerName: signerName,
        phone: proposal.user?.phoneNumber || "",
        email: proposal.user?.email || null,
        lineUserId: proposal.user?.lineUserId || null,
        quotationId,
        proposalUrl: `/proposals/${proposal.magicTokenSlug}`,
        pdfUrl: signedPdfUrl,
      },
      dedupeKey: `communications.notification.requested:QUOTATION_ACCEPTED:${proposal.id}`,
    });
    await processOutboxBestEffort(proposal.id);

    revalidatePath("/proposals");
    revalidatePath(`/proposals/${proposal.magicTokenSlug}`);
    revalidatePath("/admin/crm");
    revalidatePath(`/admin/crm/${proposal.id}`);
    revalidatePath("/admin/projects");

    return NextResponse.json({
      success: true,
      proposal_id: updatedProposal.id,
      status: updatedProposal.status,
      signed_pdf_url: signedPdfUrl,
      signed_drive_file_id: signedDriveDocument.fileId,
      verification_url: quotationVerificationUrl,
      sha256_hash: verifiedSignedDocumentHash,
      golden_thread: pendingGoldenThread,
      notification_operation_id: notificationOperationId,
    });
  } catch (error: unknown) {
    if (error instanceof ProposalRevisionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[Quotation Sign] Failed to sign quotation.", error);
    const message = error instanceof Error ? error.message : "Unable to sign quotation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
