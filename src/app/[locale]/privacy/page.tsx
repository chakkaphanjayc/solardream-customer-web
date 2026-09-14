import { getTranslations } from "next-intl/server";
import { ShieldCheck, Calendar } from "@/components/ui/icons";
import { sanitizeHtml } from "@/lib/htmlSanitizer";
import { getCachedComplianceSettings } from "@/lib/layout-data";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";


interface PageProps {
  params: Promise<{ locale: string }>;
}

export const instant = false;

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPolicy" });

  const config = await getCachedComplianceSettings();

  const content = config?.privacyPolicy || (t.raw("defaultContent") as string);
  
  const lastUpdated = config?.updatedAt ? new Date(config.updatedAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : (locale === "th" ? "ล่าสุด" : "Recent");

  return (
    <PageShell className="bg-background px-6 py-12 md:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
      {/* Header Info */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#1CBBBB]/20 bg-[#1CBBBB]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800">
          <ShieldCheck className="w-4 h-4 text-[#1CBBBB]" />
          <span>{t("pdpaGDPR")}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight font-sans">
          {t("title")}
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">
          <Calendar className="w-4 h-4" />
          <span>{locale === "th" ? "อัปเดตล่าสุด" : "Last updated"}: {lastUpdated}</span>
        </div>
      </div>

      {/* Main Content Card */}
      <Card asChild className="bg-brand-surface p-8 shadow-sm md:p-12">
        <section>
        <div 
          className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans prose-headings:font-black prose-headings:text-slate-900 prose-a:text-[#1CBBBB] prose-a:underline hover:prose-a:text-[#159999]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
        </section>
      </Card>
      </div>
    </PageShell>
  );
}
