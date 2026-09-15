import ContactForm from "@/components/agency/ContactForm";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export const metadata = {
  title: "Contact | SolarDream",
  description: "Start a solar consultation with SolarDream.",
};

// The server-side message lookup is request-scoped; keep this form route
// blocking while its submission remains an uncached mutation path.

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");
  return (
    <PageShell as="div" className="bg-[#F0EEE9] px-5 pb-24 pt-32 text-[#1C1C1A] sm:px-8 sm:pb-32 sm:pt-40">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <section className="lg:sticky lg:top-28 lg:h-fit">
          <p className="text-sm font-medium text-[#4F7FA8]">{t("eyebrow")}</p>
          <h1 className="mt-6 max-w-2xl text-balance text-[clamp(2.75rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-[#1C1C1A]">
            {t("title")}
          </h1>
          <div className="mt-10 space-y-7">
            <div>
              <p className="text-sm font-medium text-[#4E4B44]">{t("emailLabel")}</p>
              <a
                href="mailto:hello@agency.co"
                className="mt-2 inline-flex text-2xl font-bold tracking-tight text-[#1C1C1A] transition-colors hover:text-[#3E6685] sm:text-3xl"
              >
                hello@agency.co
              </a>
            </div>
            <div className="grid gap-5 border-t border-[#8E8B83]/15 pt-7 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-[#4E4B44]">{t("availabilityLabel")}</p>
                <p className="mt-2 text-base font-bold text-[#1C1C1A]">{t("availabilityValue")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[#4E4B44]">{t("serviceAreaLabel")}</p>
                <p className="mt-2 text-base font-bold text-[#1C1C1A]">{t("serviceAreaValue")}</p>
              </div>
            </div>
          </div>
        </section>

        <Card asChild className="rounded-[32px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-10">
          <section>
          <div className="mb-10">
            <p className="text-sm font-medium text-[#4F7FA8]">{t("formEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1C1C1A]">{t("formTitle")}</h2>
          </div>
          <ContactForm />
          </section>
        </Card>
      </div>
    </PageShell>
  );
}
