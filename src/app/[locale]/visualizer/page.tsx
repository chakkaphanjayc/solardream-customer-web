import { Suspense } from "react";
import type { Metadata } from "next";
import VisualizerClient from "./VisualizerClient";
import { getVisualizerPanelProducts } from "@/app/actions/visualizerProducts";
import { PageShell } from "@/components/ui/page-shell";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === "en";
  const title = isEnglish
    ? "Solar Roof Planner"
    : "วางแผนโซลาร์บนหลังคา";
  const description = isEnglish
    ? "Plan a rooftop solar layout, see where panels fit, and review an estimate for your home."
    : "วางแผนตำแหน่งแผงโซลาร์บนหลังคา ดูการจัดวาง และตรวจสอบประมาณการสำหรับบ้านของคุณ";

  return { title, description };
}


export default async function VisualizerPage() {
  const panelProducts = await getVisualizerPanelProducts();

  return (
    <PageShell surface="atelier" as="div" className="m-0 box-border min-h-dvh w-full bg-[#F0EEE9] p-0">
      <Suspense fallback={<div className="min-h-dvh bg-[#F0EEE9]" aria-hidden="true" />}>
        <VisualizerClient initialProducts={panelProducts} />
      </Suspense>
    </PageShell>
  );
}
