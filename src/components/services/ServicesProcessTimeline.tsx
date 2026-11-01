import {
  ClipboardCheck,
  FileCode,
  PackageCheck,
  ShieldCheck,
  ChevronRight,
  type IconType,
} from "@/components/ui/icons";

interface ServicesProcessTimelineProps {
  locale: string;
}

type TimelineStep = {
  number: string;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  icon: IconType;
};

const STEPS: TimelineStep[] = [
  {
    number: "01",
    titleEn: "Survey",
    titleTh: "สำรวจหน้างาน",
    descEn: "On-site roof structure, electrical grid & shading audit.",
    descTh: "ตรวจเช็กโครงสร้างหลังคา ระบบไฟฟ้า และทิศทางแดดหน้างานจริง",
    icon: ClipboardCheck,
  },
  {
    number: "02",
    titleEn: "Design",
    titleTh: "ออกแบบระบบ",
    descEn: "Custom 3D CAD modeling & maximum solar yield engineering.",
    descTh: "วิศวกรรมจำลองการผลิตไฟฟ้า 3D คำนวณความคุ้มค่าเฉพาะบ้านคุณ",
    icon: FileCode,
  },
  {
    number: "03",
    titleEn: "Install",
    titleTh: "ติดตั้งมาตรฐาน",
    descEn: "Certified engineers adhering to PEA/MEA safety codes.",
    descTh: "ทีมวิศวกรผู้เชี่ยวชาญ ติดตั้งตามมาตรฐานความปลอดภัย กฟภ./กฟน.",
    icon: PackageCheck,
  },
  {
    number: "04",
    titleEn: "Support",
    titleTh: "ดูแลต่อเนื่อง",
    descEn: "25-year panel warranty, mobile app monitoring & maintenance.",
    descTh: "รับประกันแผง 25 ปี ตรวจเช็กระบบประจำปี และมอนิเตอร์ผ่านแอป 24 ชม.",
    icon: ShieldCheck,
  },
];

export default function ServicesProcessTimeline({ locale }: ServicesProcessTimelineProps) {
  const isTh = locale === "th";

  return (
    <section
      aria-labelledby="services-process-heading"
      className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary-foreground)]">
              {isTh ? "ขั้นตอนมาตรฐานการบริการ" : "Our End-to-End Process"}
            </p>
            <h2
              id="services-process-heading"
              className="mt-2 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl"
            >
              {isTh ? "4 ขั้นตอนสู่พลังงานแสงอาทิตย์ที่วางใจได้" : "Survey → Design → Install → Support"}
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm font-medium text-[var(--sd-text-secondary)] leading-relaxed">
            {isTh
              ? "กระบวนการดูแลครบวงจรตั้งแต่การตรวจเช็กเบื้องต้น จนถึงการบำรุงรักษาระยะยาวโดยทีมวิศวกรมืออาชีพ"
              : "A seamless 4-step solar journey from on-site engineering survey to multi-decade performance guarantees."}
          </p>
        </div>

        {/* 4-Step Horizontal Timeline Grid */}
        <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === STEPS.length - 1;

            return (
              <div
                key={step.number}
                className="group relative flex flex-col justify-between rounded-[24px] border border-[var(--border)] bg-[var(--sd-card)] p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)]/30 text-[var(--primary-foreground)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-[var(--sd-ink)]">
                      <Icon className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black tracking-wider text-[var(--muted-foreground)]">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-black text-[var(--sd-ink)]">
                    {isTh ? step.titleTh : step.titleEn}
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-[var(--sd-text-secondary)]">
                    {isTh ? step.descTh : step.descEn}
                  </p>
                </div>

                {/* Subtitle pill + next arrow on desktop */}
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-foreground)]">
                    Step {index + 1} of 4
                  </span>
                  {!isLast ? (
                    <span
                      aria-hidden="true"
                      className="hidden lg:grid h-7 w-7 place-items-center rounded-full bg-[var(--background)] text-[var(--primary-foreground)] shadow-xs"
                    >
                      <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary-foreground)]">
                      ✓ Complete
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
