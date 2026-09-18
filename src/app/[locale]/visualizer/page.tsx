import { Suspense } from "react";
import VisualizerClient from "./VisualizerClient";
import { getVisualizerPanelProducts } from "@/app/actions/visualizerProducts";
import { PageShell } from "@/components/ui/page-shell";


export const metadata = {
  title: "2D Rooftop Solar Visualizer | Clean Tech Planner",
  description: "Calculate and visualize the optimal solar cell array on your roof structure with our dynamic 2D canvas planner.",
};

export const instant = false;

export default async function VisualizerPage() {
  const panelProducts = await getVisualizerPanelProducts();

  return (
    <PageShell surface="dark" as="div" className="m-0 box-border flex h-dvh w-full flex-col overflow-hidden bg-[#0F172A] p-0">
      <Suspense fallback={<div className="min-h-dvh bg-[#0F172A]" aria-hidden="true" />}>
        <VisualizerClient initialProducts={panelProducts} />
      </Suspense>
    </PageShell>
  );
}
