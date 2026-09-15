import "server-only";

import { createHash, createHmac } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

import { findAnchorCoordinates, type PdfAnchorCoordinates } from "@/lib/pdf-signer";

const documentResponseSchema = z.object({
  document: z.record(z.string(), z.unknown()),
  correlationId: z.string(),
});

const documentVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  versionNumber: z.number().int(),
  sourcePdfHash: z.string().nullable(),
  preparedPdfHash: z.string().nullable(),
  finalSignedPdfHash: z.string().nullable(),
  signedAt: z.string().nullable(),
  sourceObject: z.record(z.string(), z.unknown()).nullable(),
  preparedObject: z.record(z.string(), z.unknown()).nullable(),
  finalObject: z.record(z.string(), z.unknown()).nullable(),
  templateVersionId: z.string().nullable(),
  erpnextQuotationId: z.string().nullable(),
  erpnextRevisionReference: z.string().nullable(),
  createdAt: z.string(),
});

const documentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.string(),
  documentType: z.string(),
  currentVersionId: z.string(),
  correlationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentVersion: documentVersionSchema,
});

const verificationResponseSchema = z.object({
  verification: z.record(z.string(), z.unknown()),
  signatureCount: z.number().int().nonnegative(),
  correlationId: z.string(),
});

type DocumentServiceDocument = z.infer<typeof documentSchema>;

type DocumentServiceConfig = {
  baseUrl: string;
  organizationId: string;
  sharedSecret: string;
  issuer: string;
  audience: string;
};

type ServiceRequestOptions = {
  actorId: string;
  method?: "GET" | "POST";
  body?: string;
  idempotencyKey?: string;
};

type QuotationAnchorFields = {
  signature: PdfAnchorCoordinates;
  signerName: PdfAnchorCoordinates | null;
  signedDate: PdfAnchorCoordinates | null;
};

export type DocumentServiceSignatureResult = {
  document: DocumentServiceDocument;
  finalPdf: Uint8Array;
  finalHash: string;
  signedAt: string | null;
};

export type DocumentServiceVerificationResult = {
  verified: boolean;
  authenticity: boolean;
  integrity: boolean;
  expired: boolean;
  signatureCount: number;
  message: string | null;
};

class DocumentServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "DocumentServiceError";
    this.status = status;
    this.code = code;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function configured(): DocumentServiceConfig {
  const baseUrl = text(process.env.DOCUMENT_SERVICE_URL)?.replace(/\/$/, "");
  const organizationId = text(process.env.DOCUMENT_SERVICE_ORGANIZATION_ID);
  const sharedSecret = text(process.env.DOCUMENT_SERVICE_SHARED_SECRET);
  const issuer = text(process.env.DOCUMENT_SERVICE_AUTH_ISSUER) || "solardream-customer-web";
  const audience = text(process.env.DOCUMENT_SERVICE_AUTH_AUDIENCE) || "solardream-document-service";
  if (!baseUrl || !organizationId || !sharedSecret) {
    throw new Error("Document Service signing is enabled but its server-only configuration is incomplete.");
  }
  return { baseUrl, organizationId, sharedSecret, issuer, audience };
}

function publicServiceUrl(): string {
  const baseUrl = text(process.env.DOCUMENT_SERVICE_URL)?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Document Service verification is enabled but DOCUMENT_SERVICE_URL is not configured.");
  return baseUrl;
}

function isDocumentServiceEnabled(): boolean {
  return process.env.DOCUMENT_SERVICE_SIGNATURE_ENABLED?.trim().toLowerCase() === "true";
}

function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function serviceSignature(config: DocumentServiceConfig, options: ServiceRequestOptions, path: string, timestamp: string): string {
  const body = options.body || "";
  const bodyHash = sha256Hex(body);
  const canonical = [
    timestamp,
    options.method || "GET",
    path,
    bodyHash,
    options.actorId,
    "customer",
    config.organizationId,
    config.issuer,
    config.audience,
  ].join("\n");
  return createHmac("sha256", config.sharedSecret).update(canonical).digest("hex");
}

function parseDocument(value: unknown): DocumentServiceDocument {
  const parsed = documentResponseSchema.parse(value);
  return documentSchema.parse(parsed.document);
}

async function requestJson(
  config: DocumentServiceConfig,
  path: string,
  options: ServiceRequestOptions,
): Promise<DocumentServiceDocument> {
  const method = options.method || "GET";
  const body = options.body || "";
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      "X-Document-Actor-Id": options.actorId,
      "X-Document-Actor-Type": "customer",
      "X-Document-Organization-Id": config.organizationId,
      "X-Document-Auth-Timestamp": timestamp,
      "X-Document-Auth-Signature": serviceSignature(config, { ...options, method, body }, path, timestamp),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    ...(body ? { body } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(35_000),
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const parsed = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    const error = parsed.error && typeof parsed.error === "object" && !Array.isArray(parsed.error)
      ? parsed.error as Record<string, unknown>
      : {};
    throw new DocumentServiceError(
      response.status,
      text(error.code) || "DOCUMENT_SERVICE_ERROR",
      text(error.message) || "The document service could not complete the request.",
    );
  }
  return parseDocument(payload);
}

async function requestPdf(
  config: DocumentServiceConfig,
  path: string,
  actorId: string,
): Promise<Uint8Array> {
  const method = "GET" as const;
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/pdf",
      "X-Document-Actor-Id": actorId,
      "X-Document-Actor-Type": "customer",
      "X-Document-Organization-Id": config.organizationId,
      "X-Document-Auth-Timestamp": timestamp,
      "X-Document-Auth-Signature": serviceSignature(config, { actorId, method }, path, timestamp),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) {
    throw new DocumentServiceError(response.status, "DOCUMENT_DOWNLOAD_FAILED", "The signed document could not be downloaded.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

function stripPngDataUrl(value: string): string {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value.trim());
  if (!match) throw new Error("Signature must be a PNG data URL.");
  return match[1];
}

function fieldRect(page: { getSize: () => { width: number; height: number } }, anchor: PdfAnchorCoordinates, width: number, height: number) {
  const size = page.getSize();
  return {
    x: Math.max(0, Math.min(anchor.x, size.width - width)),
    y: Math.max(0, Math.min(anchor.y - Math.min(10, height / 4), size.height - height)),
    width: Math.min(width, size.width),
    height: Math.min(height, size.height),
  };
}

async function quotationAnchorFields(pdfBytes: Uint8Array): Promise<QuotationAnchorFields> {
  const [signature, signerName, signedDate] = await Promise.all([
    findAnchorCoordinates(pdfBytes, "{{customer:signature}}"),
    findAnchorCoordinates(pdfBytes, "{{customer:name}}").catch(() => null),
    findAnchorCoordinates(pdfBytes, "{{customer:date}}").catch(() => null),
  ]);
  if (!signature) throw new Error("The stored quotation PDF does not contain the customer signature field.");
  return { signature, signerName, signedDate };
}

export async function signQuotationWithDocumentService(input: {
  pdfBytes: Uint8Array;
  quotationId: string;
  revisionId: string;
  revisionReference: string | null;
  signatureDataUrl: string;
  signerName: string;
  actorId: string;
}): Promise<DocumentServiceSignatureResult | null> {
  if (!isDocumentServiceEnabled()) return null;
  const config = configured();
  const anchors = await quotationAnchorFields(input.pdfBytes);
  const pdf = await PDFDocument.load(input.pdfBytes);
  const signaturePage = pdf.getPages()[anchors.signature.pageIndex];
  if (!signaturePage) throw new Error("The quotation signature field points to a missing PDF page.");
  const body = JSON.stringify({
    organizationId: config.organizationId,
    documentType: "quotation",
    erpnextQuotationId: input.quotationId,
    erpnextRevisionReference: input.revisionReference,
    sourcePdfBase64: Buffer.from(input.pdfBytes).toString("base64"),
  });
  const document = await requestJson(config, "/v1/documents", {
    actorId: input.actorId,
    method: "POST",
    body,
    idempotencyKey: `quotation-${input.quotationId}-${input.revisionId}`,
  });

  const fields = [
    {
      fieldId: "customer.signature",
      type: "signature" as const,
      page: anchors.signature.pageIndex + 1,
      rect: fieldRect(signaturePage, anchors.signature, 120, 50),
      signaturePngBase64: stripPngDataUrl(input.signatureDataUrl),
    },
    ...(anchors.signerName ? [{
      fieldId: "customer.name",
      type: "printed_name" as const,
      page: anchors.signerName.pageIndex + 1,
      rect: fieldRect(pdf.getPages()[anchors.signerName.pageIndex] || signaturePage, anchors.signerName, 180, 20),
      value: input.signerName,
    }] : []),
    ...(anchors.signedDate ? [{
      fieldId: "customer.date",
      type: "date" as const,
      page: anchors.signedDate.pageIndex + 1,
      rect: fieldRect(pdf.getPages()[anchors.signedDate.pageIndex] || signaturePage, anchors.signedDate, 120, 20),
      value: new Date().toISOString().slice(0, 10),
    }] : []),
  ];
  const prepared = await requestJson(config, `/v1/documents/${encodeURIComponent(document.id)}/prepare`, {
    actorId: input.actorId,
    method: "POST",
    body: JSON.stringify({ expectedVersionId: document.currentVersionId, fields }),
  });
  const profile = text(process.env.DOCUMENT_SERVICE_SIGNATURE_PROFILE) || "pades-b-basic";
  const signed = await requestJson(config, `/v1/documents/${encodeURIComponent(document.id)}/sign`, {
    actorId: input.actorId,
    method: "POST",
    body: JSON.stringify({
      expectedVersionId: prepared.currentVersionId,
      signatureFieldName: "company.signature",
      page: anchors.signature.pageIndex + 1,
      rect: fieldRect(signaturePage, anchors.signature, 150, 55),
      reason: "SolarDream quotation acceptance",
      signerName: "SolarDream Authorized Signatory",
      profile,
      timestampRequired: process.env.DOCUMENT_SERVICE_TIMESTAMP_REQUIRED?.trim().toLowerCase() === "true",
    }),
  });
  const finalPdf = await requestPdf(config, `/v1/documents/${encodeURIComponent(signed.id)}/download`, input.actorId);
  const finalHash = signed.currentVersion.finalSignedPdfHash || sha256Hex(finalPdf);
  return {
    document: signed,
    finalPdf,
    finalHash,
    signedAt: signed.currentVersion.signedAt,
  };
}

export async function verifyPdfWithDocumentService(pdfBytes: Uint8Array): Promise<DocumentServiceVerificationResult> {
  if (!isDocumentServiceEnabled()) throw new Error("Document Service verification is not enabled.");
  const response = await fetch(`${publicServiceUrl()}/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ pdfBase64: Buffer.from(pdfBytes).toString("base64") }),
    cache: "no-store",
    signal: AbortSignal.timeout(35_000),
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const errorRoot = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    const error = errorRoot.error && typeof errorRoot.error === "object" && !Array.isArray(errorRoot.error)
      ? errorRoot.error as Record<string, unknown>
      : {};
    throw new Error(text(error.message) || "The document service could not verify this PDF.");
  }
  const parsed = verificationResponseSchema.parse(payload);
  const report = parsed.verification;
  const status = text(report.status) || "indeterminate";
  const cryptographic = text(report.cryptographicSignatureValidity) === "valid";
  const changes = text(report.changesAfterSigning) === "valid";
  const trusted = text(report.certificateChainTrust) === "valid";
  const reasons = Array.isArray(report.reasons)
    ? report.reasons.filter((reason): reason is string => typeof reason === "string")
    : [];
  return {
    verified: status === "valid",
    authenticity: trusted,
    integrity: cryptographic && changes,
    expired: reasons.some((reason) => /expired|not yet valid/i.test(reason)),
    signatureCount: parsed.signatureCount,
    message: reasons.length > 0 ? reasons.join(" ") : status === "valid" ? null : `Verification result: ${status}.`,
  };
}
