import type { Metadata } from "next";

import { DocumentVerificationDropzone } from "@/components/document-signing/DocumentVerificationDropzone";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Verify document | SolarDream",
  description: "Check the cryptographic integrity of a signed SolarDream PDF.",
};


export default function VerifyDocumentPage() {
  return (
    <PageShell className="bg-[#F0EEE9] px-4 py-16 text-[#1C1C1A] sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold tracking-[0.1em] text-[#4F7FA8]">DOCUMENT CHECK</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[#1C1C1A] sm:text-4xl">Verify a signed document</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#4E4B44]">
          Confirm whether a cryptographic PDF signature still protects the document’s contents.
        </p>
        <Card className="mt-8 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 sm:p-8 shadow-sm">
          <DocumentVerificationDropzone />
        </Card>
      </div>
    </PageShell>
  );
}
