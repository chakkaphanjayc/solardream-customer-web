import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { proposalRevisions, quotationAcceptances } from "@/db/schema";
import { getSystemSetting } from "@/app/actions/systemSettings";
import { downloadDrivePdf } from "@/lib/document-signing/drive";
import { resolvePortalAccess } from "@/lib/portalAccess";


const MAX_NATIVE_PDF_BYTES = 25 * 1024 * 1024;
const ERP_TIMEOUT_MS = 20_000;

type ErpnextFileConfig = {
  baseUrl: string;
  origin: string;
  headers: Record<string, string>;
};

function extractDriveFileId(value: string | null | undefined): string | null {
  if (!value) return null;
  const directId = /^[a-zA-Z0-9_-]{10,200}$/.test(value.trim()) ? value.trim() : null;
  if (directId) return directId;
  try {
    const url = new URL(value);
    const pathMatch = /\/file\/d\/([a-zA-Z0-9_-]{10,200})/.exec(url.pathname);
    if (pathMatch?.[1]) return pathMatch[1];
    const queryId = url.searchParams.get("id");
    return queryId && /^[a-zA-Z0-9_-]{10,200}$/.test(queryId) ? queryId : null;
  } catch {
    return null;
  }
}

function contentDispositionFileName(value: string): string {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "quotation.pdf";
}

async function getErpnextFileConfig(): Promise<ErpnextFileConfig | null> {
  const [siteUrl, savedApiKey, savedApiSecret] = await Promise.all([
    getSystemSetting("erpnext_site_endpoint"),
    getSystemSetting("erpnext_api_key"),
    getSystemSetting("erpnext_api_secret"),
  ]);
  const baseUrl = (siteUrl || process.env.ERPNEXT_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) return null;

  try {
    const origin = new URL(baseUrl).origin;
    const headers: Record<string, string> = {};
    const apiKey = savedApiKey || process.env.ERPNEXT_API_KEY || "";
    const apiSecret = savedApiSecret || process.env.ERPNEXT_API_SECRET || "";
    if (apiKey && apiSecret) headers.Authorization = `token ${apiKey}:${apiSecret}`;
    return { baseUrl, origin, headers };
  } catch {
    return null;
  }
}

function resolveTrustedErpnextFileUrl(value: string | null | undefined, config: ErpnextFileConfig) {
  if (!value) return null;
  try {
    const candidate = new URL(value, `${config.baseUrl}/`);
    return candidate.origin === config.origin ? candidate : null;
  } catch {
    return null;
  }
}

async function downloadErpnextPdf(url: URL, config: ErpnextFileConfig) {
  const response = await fetch(url, {
    headers: config.headers,
    cache: "no-store",
    signal: AbortSignal.timeout(ERP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`ERPNext signed quotation download failed with status ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_NATIVE_PDF_BYTES) {
    throw new Error("The ERPNext signed quotation is too large to preview.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length === 0
    || bytes.length > MAX_NATIVE_PDF_BYTES
    || bytes.subarray(0, 4).toString("ascii") !== "%PDF"
  ) {
    throw new Error("ERPNext did not return a valid signed quotation PDF.");
  }

  const encodedFileName = url.pathname.split("/").pop() || "quotation-signed.pdf";
  let fileName = encodedFileName;
  try {
    fileName = decodeURIComponent(encodedFileName);
  } catch {
    // Keep the encoded segment if the upstream filename is malformed.
  }
  return { bytes, fileName: contentDispositionFileName(fileName) };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await context.params;
  const access = await resolvePortalAccess({
    request,
    proposalId,
    capability: "proposal:read",
  });
  if (!access) {
    return NextResponse.json({ error: "Document access was not granted." }, { status: 403 });
  }

  const proposal = access.proposal;
  const currentRevision = await db.query.proposalRevisions.findFirst({
    where: eq(proposalRevisions.proposalId, proposal.id),
    orderBy: [desc(proposalRevisions.revisionNumber)],
    columns: {
      id: true,
      status: true,
      pdfDocumentReference: true,
      documentHash: true,
    },
  });
  const isPublishedRevision = currentRevision
    && ["SENT", "VIEWED", "ACCEPTED"].includes(currentRevision.status);
  if (!isPublishedRevision) {
    return NextResponse.json({ error: "The quotation PDF is not available." }, { status: 404 });
  }

  const isSignedStatus = ["SIGNED", "FULLY_SIGNED", "CLIENT_SIGNED_PENDING_REVIEW", "APPROVED", "APPROVED_BY_CUSTOMER", "CUSTOMER_APPROVED"].includes(proposal.status.toUpperCase());
  if (isSignedStatus && currentRevision.status !== "ACCEPTED") {
    return NextResponse.json({ error: "The signed quotation PDF is not available." }, { status: 404 });
  }
  const acceptance = isSignedStatus
    ? await db.query.quotationAcceptances.findFirst({
        where: eq(quotationAcceptances.proposalId, proposal.id),
        orderBy: (rows, { desc: descending }) => [descending(rows.acceptedAt)],
        columns: { revisionId: true, signedDocumentHash: true },
      })
    : null;
  if (isSignedStatus && acceptance?.revisionId !== currentRevision.id) {
    return NextResponse.json({ error: "The signed quotation PDF is not available." }, { status: 404 });
  }
  const expectedHash = isSignedStatus
    ? acceptance?.signedDocumentHash
    : currentRevision.documentHash;
  if (!expectedHash) {
    return NextResponse.json({ error: "The quotation PDF is not available." }, { status: 404 });
  }

  try {
    let pdf: { bytes: Buffer; fileName: string } | null = null;
    if (isSignedStatus) {
      const signedDriveFileId = extractDriveFileId(proposal.signedDocumentDriveUrl);
      if (signedDriveFileId) {
        pdf = await downloadDrivePdf(signedDriveFileId);
      } else {
        const erpnext = await getErpnextFileConfig();
        const signedErpnextUrl = erpnext
          ? resolveTrustedErpnextFileUrl(proposal.signedDocumentDriveUrl, erpnext)
          : null;
        if (erpnext && signedErpnextUrl) {
          pdf = await downloadErpnextPdf(signedErpnextUrl, erpnext);
        }
      }
    }

    if (!pdf) {
      if (isSignedStatus) {
        return NextResponse.json({ error: "The signed quotation PDF is not available." }, { status: 404 });
      }
      const fileId = extractDriveFileId(currentRevision.pdfDocumentReference);
      if (!fileId) {
        return NextResponse.json({ error: "The current quotation PDF is not available." }, { status: 404 });
      }
      pdf = await downloadDrivePdf(fileId);
    }

    const actualHash = createHash("sha256").update(pdf.bytes).digest("hex");
    if (actualHash !== expectedHash) {
      return NextResponse.json({ error: "The stored quotation PDF does not match its verified revision." }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.bytes.length),
        "Content-Disposition": `inline; filename="${contentDispositionFileName(pdf.fileName)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("[Native quotation PDF] Failed to stream the stored document.", error);
    return NextResponse.json({ error: "The quotation PDF could not be loaded." }, { status: 502 });
  }
}
