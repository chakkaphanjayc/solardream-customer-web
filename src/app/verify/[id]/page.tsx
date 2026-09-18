import type { Metadata } from "next";

import VerificationClient from "@/components/verification/VerificationClient";
import { getErpnextQuotationSignatureAudit } from "@/lib/pdf-signer";


export const metadata: Metadata = {
  title: "Document Verification",
  robots: { index: false, follow: false },
};


export default async function VerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotationId = id.trim();
  const audit = quotationId ? await getErpnextQuotationSignatureAudit(quotationId).catch(() => null) : null;

  return <VerificationClient quotationId={quotationId} audit={audit} />;
}
