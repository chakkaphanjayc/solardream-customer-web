import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proposals, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { createProposalRevisionInTransaction } from "@/lib/proposal-revisions";
import {
  isUploadContentLengthExceeded,
  validateUploadFile,
  type UploadFileKind,
} from "@/lib/fileValidation";
import {
  convertToEmbedPreviewUrl,
  getOrCreateCustomerFolder,
  getOrCreateProposalFolder,
  uploadFileToDrive,
} from "@/lib/googleDrive";

export const maxDuration = 60;

const MAX_REVISION_FILE_SIZE = 20 * 1024 * 1024;
const MAX_REVISION_FILES_PER_REQUEST = 5;
const MAX_REVISION_REQUEST_BYTES =
  MAX_REVISION_FILE_SIZE * MAX_REVISION_FILES_PER_REQUEST + 1024 * 1024;
const ALLOWED_REVISION_FILE_KINDS: readonly UploadFileKind[] = ["pdf"];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: { role: true },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "STAFF")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (isUploadContentLengthExceeded(req.headers, MAX_REVISION_REQUEST_BYTES)) {
      return NextResponse.json(
        { success: false, error: "Revision upload request is too large." },
        { status: 413 },
      );
    }

    const formData = await req.formData();
    const proposalId = String(formData.get("proposal_id") || "");
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    if (!proposalId || files.length === 0) {
      return NextResponse.json({ success: false, error: "Missing proposal_id or files" }, { status: 400 });
    }

    if (files.length > MAX_REVISION_FILES_PER_REQUEST) {
      return NextResponse.json(
        { success: false, error: `Upload a maximum of ${MAX_REVISION_FILES_PER_REQUEST} revised PDFs per request.` },
        { status: 413 },
      );
    }

    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
    }

    const userObj = proposal.user || { name: null, email: null };
    const customerName = userObj.name || userObj.email?.split("@")[0] || "Customer";
    const customerFolderId = await getOrCreateCustomerFolder(customerName, proposal.userId);
    const proposalFolderId = await getOrCreateProposalFolder(customerFolderId, proposalId);
    const uploaded: Array<{ url: string; fileName: string; uploadedAt: string }> = [];
    let latestUpload: {
      url: string;
      driveUrl: string;
      fileName: string;
      uploadedAt: string;
      sha256: string;
    } | null = null;

    for (const file of files) {
      const validatedFile = await validateUploadFile({
        file,
        allowedKinds: ALLOWED_REVISION_FILE_KINDS,
        fallbackName: "revised-quotation",
        maxBytes: MAX_REVISION_FILE_SIZE,
      });
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `Revised_Quotation_${proposalId}_${Date.now()}.${validatedFile.extension}`;
      const driveUrl = await uploadFileToDrive(proposalFolderId, buffer, validatedFile.contentType, fileName);
      latestUpload = {
        url: convertToEmbedPreviewUrl(driveUrl),
        driveUrl,
        fileName,
        uploadedAt: new Date().toISOString(),
        sha256: validatedFile.sha256,
      };
      uploaded.push({
        url: latestUpload.url,
        fileName,
        uploadedAt: latestUpload.uploadedAt,
      });
    }

    const config = (proposal.configurationData as Record<string, unknown>) || {};
    const revisedQuoteVersions = Array.isArray(config.revisedQuoteVersions) ? config.revisedQuoteVersions : [];
    const latest = latestUpload;
    if (!latest) {
      return NextResponse.json(
        { success: false, error: "A revised quotation PDF could not be prepared." },
        { status: 400 },
      );
    }
    const sentAt = new Date();

    const sentRevision = await db.transaction(async (tx) => {
      const nextConfiguration = {
        ...config,
        revisedQuoteVersions: [...revisedQuoteVersions, ...uploaded],
        customerApproval: {
          ...(config.customerApproval && typeof config.customerApproval === "object"
            ? config.customerApproval as Record<string, unknown>
            : {}),
          status: "PENDING",
          replacedAt: sentAt.toISOString(),
        },
      };
      const revision = await createProposalRevisionInTransaction(tx, {
        proposalId: proposal.id,
        snapshots: {
          pricing: {
            totalPrice: proposal.totalPrice,
            monthlySavings: proposal.monthlySavings,
            paybackPeriod: proposal.paybackPeriod,
          },
          configuration: nextConfiguration,
          terms: config.terms && typeof config.terms === "object"
            ? config.terms as Record<string, unknown>
            : {},
          payment: {
            paymentStatus: proposal.paymentStatus,
            selectedFinancingId: proposal.selectedFinancingId,
          },
        },
        erpQuotationReference: proposal.erpnextQuotationId,
        sentDocument: {
          sha256: latest.sha256,
          pdfDocumentReference: latest.driveUrl,
          sentAt,
        },
        createdByUserId: authUser.id,
        creationSource: "STAFF_REVISION_PDF_UPLOAD",
        creationMetadata: { fileName: latest.fileName },
      });
      const revisionConfiguration = {
        ...nextConfiguration,
        customerApproval: {
          ...nextConfiguration.customerApproval,
          revisionVersion: revision.revisionNumber,
        },
      };
      await tx.update(proposals)
        .set({
          revisedPdfUrl: latest.url,
          pdfUrl: latest.driveUrl,
          signedDocumentDriveUrl: null,
          signatureUrl: null,
          signedAt: null,
          verifiedAt: null,
          verifiedByAdminId: null,
          configurationData: revisionConfiguration,
          updatedAt: sentAt,
        })
        .where(eq(proposals.id, proposalId));
      return revision;
    });

    return NextResponse.json({
      success: true,
      uploaded,
      revisionNumber: sentRevision.revisionNumber,
    });
  } catch (error: unknown) {
    console.error("[Revision Upload]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload revised quotation" },
      { status: 500 }
    );
  }
}
