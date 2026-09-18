import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type MangaPanelTone = "light" | "dark" | "accent";

type MangaPanelProps = HTMLAttributes<HTMLDivElement> & {
  tone?: MangaPanelTone;
};

const toneClasses: Record<MangaPanelTone, string> = {
  light: "bg-white text-[#10213B]",
  dark: "bg-[#071B3D] text-white",
  accent: "bg-[#DFF7FF] text-[#10213B]",
};

export function MangaPanel({ className, tone = "light", ...props }: MangaPanelProps) {
  return (
    <div
      data-bagui="card"
      data-liquid-glass={tone === "dark" ? "dark" : undefined}
      data-manga-panel
      data-manga-tone={tone}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-[#101828]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
