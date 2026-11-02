import Link from "next/link";
import { ChevronRight, Search, ShieldCheck } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import TrackRequestModal from "@/components/tracking/TrackRequestModal";
import { SoliaGuide } from "@/components/brand/solia-scenes";

interface ServicesHeroProps {
  locale: string;
}

const copy = {
  en: {
    eyebrow: "Solar care, made simple",
    title: "Choose the care your solar system needs.",
    intro:
      "Combine services in one visit, configure your system, and send the request to our team for a formal quotation and site visit.",
    trackPrompt: "Already requested a service?",
    trackAction: "Track your status here",
    soliaAlt: "Solia welcoming you to SolarDream services",
    soliaMessage: "Book certified solar care for your home or business in just 3 minutes.",
  },
  th: {
    eyebrow: "ดูแลโซลาร์ให้ง่ายขึ้น",
    title: "เลือกบริการที่ระบบโซลาร์ของคุณต้องการ",
    intro:
      "รวมหลายบริการในนัดเดียว ระบุข้อมูลระบบ และส่งคำขอให้ทีมงานจัดทำใบเสนอราคาและนัดหมายเข้าหน้างาน",
    trackPrompt: "เคยส่งคำขอบริการแล้ว?",
    trackAction: "ติดตามสถานะที่นี่",
    soliaAlt: "โซเลียยินดีต้อนรับสู่บริการดูแลระบบโซลาร์",
    soliaMessage: "จองบริการดูแลระบบโซลาร์มาตรฐานสำหรับบ้านหรือธุรกิจคุณได้ใน 3 นาที",
  },
} as const;

export default function ServicesHero({ locale }: ServicesHeroProps) {
  const lang = locale === "en" ? "en" : "th";
  const c = copy[lang];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-10 text-[var(--sd-ink)] sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--sd-card)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-[var(--sd-ink)]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)]/30 text-[var(--primary-foreground)]">
              <Search className="h-4 w-4" aria-hidden="true" />
            </span>
            {c.trackPrompt}
          </p>
          <TrackRequestModal
            surface="services"
            trigger={
              <Button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-[var(--sd-ink)] shadow-xs transition-all hover:bg-[var(--primary)]/80 active:scale-95"
              >
                <span>{c.trackAction}</span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              </Button>
            }
          />
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--accent-foreground)]">
              <ShieldCheck className="h-4 w-4 text-[var(--primary-foreground)]" aria-hidden="true" />
              <span>{c.eyebrow}</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-balance text-3xl font-extrabold tracking-tight text-[var(--sd-ink)] sm:text-4xl lg:text-5xl">
              {c.title}
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base font-normal leading-7 text-[var(--sd-text-secondary)] sm:text-lg">
              {c.intro}
            </p>
            <Link
              href="#booking-engine"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-bold text-[var(--sd-ink)] shadow-xs transition-colors hover:bg-[var(--primary)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-ink)] focus-visible:ring-offset-2"
            >
              <span>
                {lang === "th"
                  ? "เลือกบริการและขอใบเสนอราคา"
                  : "Choose a service and request a quote"}
              </span>
              <ChevronRight className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex justify-center lg:justify-end">
            <SoliaGuide
              pose="pointing"
              alt={c.soliaAlt}
              message={c.soliaMessage}
              className="h-48 w-full max-w-[19rem] drop-shadow-md sm:h-56"
              speechBubbleClassName="absolute bottom-2 left-0 max-w-[16rem] rounded-2xl border border-[var(--border)] bg-white/95 p-3.5 text-xs font-semibold leading-relaxed text-[var(--sd-ink)] shadow-md backdrop-blur-xs"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
