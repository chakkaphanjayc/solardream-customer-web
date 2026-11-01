import ContactForm from "@/components/agency/ContactForm";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { getCachedWebsiteSettings } from "@/lib/websiteSettings";
import { FaLine } from "react-icons/fa6";

export const metadata = {
  title: "Contact | SolarDream",
  description: "Start a solar consultation with SolarDream.",
};

// The server-side message lookup is request-scoped; keep this form route
// blocking while its submission remains an uncached mutation path.

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations("ContactPage");
  const websiteSettings = await getCachedWebsiteSettings();

  const companyEmail = websiteSettings.company.email || "support@solardream.energy";
  const companyPhone = websiteSettings.company.phone || "053-123-456";
  const lineSocial = websiteSettings.socialLinks.find(
    (s) => s.platform.toLowerCase() === "line" && s.isActive,
  );
  const lineHref = lineSocial?.url || "https://line.me/ti/p/@solardream";

  return (
    <PageShell as="div" className="bg-[var(--background)] px-5 pb-24 pt-32 text-[var(--sd-ink)] sm:px-8 sm:pb-32 sm:pt-40">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <section className="lg:sticky lg:top-28 lg:h-fit">
          <p className="text-sm font-bold text-[var(--accent-foreground)]">{t("eyebrow")}</p>
          <h1 className="mt-6 max-w-2xl text-balance text-[clamp(2.75rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-[var(--sd-ink)]">
            {t("title")}
          </h1>

          <div className="mt-10 space-y-5">
            {/* LINE OA Primary Direct Action */}
            <div className="rounded-3xl border border-[#06C755]/30 bg-[#06C755]/10 p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#05963f]">
                {t("chatLineOa")}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-medium text-[var(--sd-ink)]">
                  {t("lineOaSubtitle")}
                </p>
                <a
                  href={lineHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-[#06C755] px-6 py-3 text-sm font-bold text-[#111827] shadow-sm transition-all duration-200 hover:bg-[#05b34c] hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755] focus-visible:ring-offset-2"
                >
                  <FaLine className="size-5" aria-hidden="true" />
                  <span>{t("chatLineOa")}</span>
                </a>
              </div>
            </div>

            {/* Email & Phone Callout Boxes in --accent (#E6DCCD) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(60,86,122,0.14)] bg-[var(--accent)] p-5 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent-foreground)]">
                  {t("emailLabel")}
                </p>
                <a
                  href={`mailto:${companyEmail}`}
                  className="mt-2 block truncate text-lg font-extrabold tracking-tight text-[var(--sd-ink)] transition-colors hover:text-[var(--primary-foreground)] sm:text-xl"
                  title={companyEmail}
                >
                  {companyEmail}
                </a>
              </div>

              {companyPhone ? (
                <div className="rounded-2xl border border-[rgba(60,86,122,0.14)] bg-[var(--accent)] p-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent-foreground)]">
                    {t("phoneLabel")}
                  </p>
                  <a
                    href={`tel:${companyPhone}`}
                    className="mt-2 block truncate text-lg font-extrabold tracking-tight text-[var(--sd-ink)] transition-colors hover:text-[var(--primary-foreground)] sm:text-xl"
                    title={companyPhone}
                  >
                    {companyPhone}
                  </a>
                </div>
              ) : null}
            </div>

            {/* Availability & Service Area Info Boxes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(60,86,122,0.12)] bg-[var(--accent)]/50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent-foreground)]">
                  {t("availabilityLabel")}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--sd-ink)]">{t("availabilityValue")}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(60,86,122,0.12)] bg-[var(--accent)]/50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent-foreground)]">
                  {t("serviceAreaLabel")}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--sd-ink)]">{t("serviceAreaValue")}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-end gap-4">
            <SoliaGuide
              pose="pointing"
              alt={t("soliaAlt")}
              className="h-36 w-28 shrink-0 sm:h-40 sm:w-32"
              imageSizes="144px"
              message={t("soliaMessage")}
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[19rem] rounded-[var(--sd-radius-md)] border border-[rgba(60,86,122,0.14)] bg-white/95 p-3.5 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-md"
            />
          </div>
        </section>

        <Card asChild className="rounded-[32px] border border-[rgba(60,86,122,0.14)] bg-white p-6 shadow-md sm:p-10">
          <section>
            <div className="mb-10">
              <p className="text-sm font-bold text-[var(--accent-foreground)]">{t("formEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--sd-ink)]">{t("formTitle")}</h2>
            </div>
            <ContactForm />
          </section>
        </Card>
      </div>
    </PageShell>
  );
}
