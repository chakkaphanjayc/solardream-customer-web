import Link from "next/link";
import { ArrowRight, LifeBuoy, CheckCircle2, ShieldCheck } from "@/components/ui/icons";
import { isLocale } from "@/i18n/locales";
import { createClient } from "@/utils/supabase/server";
import BentoConfirmationFlow from "./BentoConfirmationFlow";
import { PageShell } from "@/components/ui/page-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";


interface ConsultationConfirmationPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; ref?: string }>;
}

export const instant = false;

export default async function ConsultationConfirmationPage({
  params,
  searchParams,
}: ConsultationConfirmationPageProps) {
  const { locale: localeParam } = await params;
  const { from, ref } = await searchParams;
  const locale = isLocale(localeParam) ? localeParam : "th";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isMember = !!user;

  const referenceId = ref || "SOLAR-REQ-PENDING";

  return (
    <PageShell className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-4 py-12 text-[#000000] selection:bg-[#B7D1EA]/50 md:py-20 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        
        {/* HERO SECTION - MANGA NEO-BRUTALISM */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <SoliaGuide
            alt={locale === "th" ? "Solia ฉลองการส่งคำขอออกแบบโซลาร์สำเร็จ" : "Solia celebrating your solar design request"}
            pose="greeting"
            className="mx-auto h-28 w-24"
            imageSizes="96px"
          />
          {/* Visual Success Indicator */}
          <div className="inline-flex items-center justify-center mb-2">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-[#4AA382] border-2 border-[#000000] shadow-[3px_3px_0_#000000]">
              <CheckCircle2 className="w-10 h-10 text-[#000000] stroke-[3]" />
            </div>
          </div>

          <span className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-1 text-xs font-black uppercase text-[#2B9EB3] shadow-[2px_2px_0_#000000]">
            <ShieldCheck className="h-4 w-4 text-[#2B9EB3]" />
            {locale === "th" ? "รับเรื่องเข้าสู่ระบบวิศวกรรมแล้ว" : "Engineering Request Captured"}
          </span>

          <h1 className="text-3xl md:text-5xl font-black text-[#000000] tracking-tight leading-tight uppercase">
            {locale === "th" ? "ส่งข้อมูลความต้องการสำเร็จแล้ว!" : "Request Successfully Sent!"}
          </h1>

          <p className="max-w-2xl mx-auto text-slate-700 font-bold leading-relaxed text-sm md:text-base">
            {locale === "th"
              ? "ระบบได้บันทึกรายละเอียดความต้องการของท่านส่งให้ทีมวิศวกรเรียบร้อยแล้วค่ะ ทีมงานจะติดต่อกลับเพื่อสรุปอุปกรณ์และจัดทำใบเสนอราคาอย่างเป็นทางการภายใน 24 ชม."
              : "Your requirement details have been assigned to our engineering team. We will reach out via your preferred channel to finalize specifications and deliver an official proposal within 24 hours."}
          </p>
        </div>

        {/* THE BENTO GRID ARCHITECTURE */}
        <BentoConfirmationFlow
          referenceId={referenceId}
          source={from === "build" ? "build" : from === "services" ? "services" : "wizard"}
          locale={locale}
          isMember={isMember}
        />

        {/* BOTTOM ACTION ANCHORS */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 pt-4">
          {from === "build" ? (
            <Link
              href={`/${locale}/build`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-[#D8A87B] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-[#000000] shadow-[3px_3px_0_#000000] transition-all duration-200 ease-expo hover:bg-[#C58F61] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
            >
              <span>{locale === "th" ? "กลับไปหน้าออกแบบระบบ" : "Back to Custom Builder"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          ) : (
            <Link
              href={`/${locale}/wizard`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-[#D8A87B] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-[#000000] shadow-[3px_3px_0_#000000] transition-all duration-200 ease-expo hover:bg-[#C58F61] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
            >
              <span>{locale === "th" ? "กลับไปหน้าวิซาร์ด" : "Back to Solar Wizard"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          )}

          <Link
            href={`/${locale}/support`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-white px-6 py-3.5 text-xs font-black uppercase tracking-wider text-[#000000] shadow-[3px_3px_0_#000000] transition-all duration-200 ease-expo hover:bg-[#F7F6F3] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 text-[#000000]" />
            <span>{locale === "th" ? "ติดต่อทีมสนับสนุน" : "Contact Support"}</span>
          </Link>
        </div>

      </div>
    </PageShell>
  );
}
