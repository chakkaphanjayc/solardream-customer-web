import { getTranslations } from "next-intl/server";

import { Calendar, RefreshCw } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { sanitizeHtml } from "@/lib/htmlSanitizer";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const instant = false;

export default async function RefundPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RefundPolicy" });
  const content = t.raw("defaultContent") as string;

  return (
    <PageShell className="bg-[var(--sd-page)] px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--sd-blue-500)]/25 bg-[var(--sd-selected)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--sd-ink)]">
            <RefreshCw className="h-4 w-4 text-[var(--sd-blue-500)]" aria-hidden="true" />
            <span>{t("badge")}</span>
          </div>
          <h1 className="font-sans text-4xl font-black leading-tight tracking-tight text-[var(--sd-ink)] md:text-5xl">{t("title")}</h1>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>{t("lastUpdated", { date: t("defaultDate") })}</span>
          </div>
        </header>

        <Card asChild className="solar-route-card solar-route-card--strong bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] md:p-12">
          <section aria-label={t("title")}>
            <div className="prose prose-slate max-w-none font-sans leading-relaxed text-[var(--sd-text)] prose-headings:font-black prose-headings:text-[var(--sd-ink)] prose-a:text-[var(--sd-blue-600)] prose-a:underline hover:prose-a:text-[var(--sd-blue-500)]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
          </section>
        </Card>
      </div>
    </PageShell>
  );
}
