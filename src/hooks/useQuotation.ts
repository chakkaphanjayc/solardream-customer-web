"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type QuotationDocumentRequestSnapshot = {
  id: string;
  quotationId: string;
  documentName: string;
  descriptionHint: string | null;
  requestType: string;
  isRequired: boolean;
  status: string;
  fileUrl: string | null;
  metadata: unknown;
  updatedAt: string;
};

export type QuotationSnapshot = {
  id: string;
  status: string;
  dispatchStatus: string;
  magicTokenSlug: string;
  erpnextQuotationId: string | null;
  canonicalRevision: {
    id: string;
    revisionNumber: number;
    status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "SUPERSEDED" | "VOID";
    documentHash: string | null;
    pdfDocumentReference: string | null;
    sentAt: string | null;
    viewedAt: string | null;
    acceptedAt: string | null;
    createdAt: string;
  } | null;
  documentRequests: QuotationDocumentRequestSnapshot[];
  updatedAt: string;
};

export type UpdateQuotationCommandInput = {
  id: string;
  command: "SEND_REVISION" | "MARK_REVISION_VIEWED" | "SUPERSEDE_REVISION" | "VOID_REVISION";
  revisionId: string;
  documentHash?: string;
  pdfDocumentReference?: string;
};

type UpdateQuotationStatusResponse = {
  success: boolean;
  quotation: QuotationSnapshot;
};

const quotationKey = (id: string) => ["quotation", id] as const;

async function fetchQuotation(id: string): Promise<QuotationSnapshot> {
  const response = await fetch(`/api/quotations/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json() as { quotation?: QuotationSnapshot; error?: string };

  if (!response.ok || !payload.quotation) {
    throw new Error(payload.error || "Unable to load quotation.");
  }

  return payload.quotation;
}

async function updateQuotationCommand(input: UpdateQuotationCommandInput): Promise<UpdateQuotationStatusResponse> {
  const response = await fetch(`/api/quotations/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      command: input.command,
      revisionId: input.revisionId,
      ...(input.documentHash ? { documentHash: input.documentHash } : {}),
      ...(input.pdfDocumentReference ? { pdfDocumentReference: input.pdfDocumentReference } : {}),
    }),
  });
  const payload = await response.json() as UpdateQuotationStatusResponse | { error?: string };

  if (!response.ok || !("quotation" in payload)) {
    const errorMessage = "error" in payload ? payload.error : undefined;
    throw new Error(errorMessage || "Unable to update quotation.");
  }

  return payload;
}

export function useQuotation(id: string | null | undefined) {
  return useQuery({
    queryKey: quotationKey(id || "missing"),
    queryFn: () => fetchQuotation(id || ""),
    enabled: Boolean(id),
  });
}

export function useUpdateQuotationCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQuotationCommand,
    onSuccess: (payload) => {
      queryClient.setQueryData(quotationKey(payload.quotation.id), payload.quotation);
      void queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}
