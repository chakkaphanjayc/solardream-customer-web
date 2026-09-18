import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  DocumentVerificationDropzone,
  type DocumentVerificationLabels,
} from "@/components/document-signing/DocumentVerificationDropzone";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Verify document | SolarDream",
  description: "Check the cryptographic integrity of a signed SolarDream PDF.",
};

export const instant = false;

type VerifyDocumentPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function VerifyDocumentPage({ params }: VerifyDocumentPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VerifyDocument" });
  const labels: DocumentVerificationLabels = {
    dropzone: t("dropzone"),
    dropzoneAria: t("dropzoneAria"),
    limits: t("limits"),
    verify: t("verify"),
    checking: t("checking"),
    checkAnother: t("checkAnother"),
    integrityIntact: t("integrityIntact"),
    integrityUnconfirmed: t("integrityUnconfirmed"),
    integrityPassedDescription: t("integrityPassedDescription"),
    integrityFailedDescription: t("integrityFailedDescription"),
    integrity: t("integrity"),
    certificateTrust: t("certificateTrust"),
    overall: t("overall"),
    passed: t("passed"),
    failed: t("failed"),
    untrusted: t("untrusted"),
    signatureCount: t("signatureCount", { count: "{count}" }),
    expired: t("expired"),
    tooLarge: locale === "th" ? "เลือกไฟล์ PDF ขนาดไม่เกิน 10 MB" : "Choose a PDF smaller than 10 MB.",
    invalid: locale === "th" ? "เลือกไฟล์ PDF เพียงหนึ่งไฟล์" : "Choose one PDF document.",
    unable: locale === "th" ? "ไม่สามารถตรวจสอบเอกสารนี้ได้" : "Unable to verify this document.",
  };

  return (
    <PageShell as="div" className="bg-[var(--sd-page)] px-4 py-16 text-[var(--sd-ink)] sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold tracking-[0.1em] text-[var(--sd-navy-900)]">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-[var(--sd-ink)] sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--sd-text)]">
          {t("description")}
        </p>
        <Card className="solar-ui-panel mt-8 rounded-[28px] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-2)] sm:p-8">
          <DocumentVerificationDropzone labels={labels} />
        </Card>
      </div>
    </PageShell>
  );
}
