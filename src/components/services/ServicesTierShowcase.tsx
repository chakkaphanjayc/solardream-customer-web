import { Check, Clock, Sparkles, Tag } from "@/components/ui/icons";

type LocalizedText = { en: string; th: string };

export type ServiceTierOffering = {
  id: string;
  slug: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  externalPrice: number;
  solarDreamCustomerPrice: number;
  basePrice: string;
  ratePerKwp: string;
  minimumPrice: string;
  loyaltyDiscount: string;
  durationMinutes: number;
  currency: "THB";
};

interface ServicesTierShowcaseProps {
  locale: string;
  offerings: ServiceTierOffering[];
}

export default function ServicesTierShowcase({ locale, offerings }: ServicesTierShowcaseProps) {
  const isTh = locale === "th";

  const formatMoney = (val: number) =>
    new Intl.NumberFormat(isTh ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <section
      aria-labelledby="services-tiers-heading"
      className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--accent-foreground)]">
              <Tag className="h-3.5 w-3.5 text-[var(--primary-foreground)]" aria-hidden="true" />
              <span>{isTh ? "แพ็กเกจการบริการ" : "Transparent Care Packages"}</span>
            </div>
            <h2
              id="services-tiers-heading"
              className="mt-3 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl"
            >
              {isTh ? "อัตราค่าบริการมาตรฐาน & สิทธิพิเศษสำหรับสมาชิก" : "Service Packages & Member Privileges"}
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm font-medium text-[var(--sd-text-secondary)] leading-relaxed">
            {isTh
              ? "ลูกค้าที่ติดตั้งกับ SolarDream รับส่วนลดและสิทธิพิเศษอัตโนมัติ พร้อมการบริการโดยช่างผู้ชำนาญการ"
              : "SolarDream installation clients automatically enjoy preferential member rates and priority scheduling."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => {
            const savings = offering.externalPrice - offering.solarDreamCustomerPrice;
            const hasSavings = savings > 0;

            return (
              <div
                key={offering.slug}
                className="relative flex flex-col justify-between rounded-[28px] border border-[var(--border)] bg-[var(--sd-card)] p-6 shadow-xs transition-all duration-300 hover:shadow-lg sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-bold text-[var(--sd-text-secondary)]">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {offering.durationMinutes} {isTh ? "นาที" : "mins"}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {offering.code}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-black text-[var(--sd-ink)]">
                    {offering.name[isTh ? "th" : "en"]}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-xs sm:text-sm font-normal leading-relaxed text-[var(--sd-text-secondary)]">
                    {offering.description[isTh ? "th" : "en"]}
                  </p>

                  {/* Pricing and Loyalty Callout */}
                  <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-black text-[var(--sd-ink)]">
                        {formatMoney(offering.solarDreamCustomerPrice)}
                      </span>
                      {offering.externalPrice > offering.solarDreamCustomerPrice ? (
                        <span className="text-sm font-bold text-[var(--muted-foreground)] line-through">
                          {formatMoney(offering.externalPrice)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {hasSavings ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/30 px-2.5 py-0.5 text-[11px] font-black text-[var(--accent-foreground)]">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          {isTh
                            ? `ประหยัด ฿${savings.toLocaleString("th-TH")} สำหรับสมาชิก`
                            : `SolarDream Member Savings: Save ฿${savings.toLocaleString("en-US")}`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                          {isTh ? "ราคามาตรฐานสำหรับทุกระบบ" : "Standard rate for all systems"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)]">
                  <a
                    href="#booking-engine"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--sd-ink)] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[var(--primary-foreground)] active:scale-95"
                  >
                    <span>{isTh ? "เลือกและจองบริการนี้" : "Configure & Book"}</span>
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
