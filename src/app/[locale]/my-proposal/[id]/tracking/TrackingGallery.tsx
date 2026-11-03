"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ExternalLink, FileText } from "@/components/ui/icons";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GsapPulse } from "@/components/ui/GsapMotion";
import ProgressiveImage from "@/components/ui/progressive-image";
import { cn } from "@/lib/utils";

interface TrackingGalleryProps {
  photos: string[];
}

interface SelectedAsset {
  url: string;
  isPdf: boolean;
  number: number;
}

export default function TrackingGallery({ photos }: TrackingGalleryProps) {
  const t = useTranslations("TrackingGallery");
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="rounded-2xl border border-[#F1D6B8]/40 bg-[#F1D6B8]/5 p-8 text-center transition-all duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1D6B8]/10 text-[#D8A87B]">
          <GsapPulse scale={1.08}>
            <Camera className="h-6 w-6" />
          </GsapPulse>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          {t("empty.title")}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  const dialogTitle = selectedAsset?.isPdf
    ? t("documentPreview")
    : t("surveyPreviewAlt");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {t("header.evidenceCount", { count: photos.length })}
        </p>
        <span className="text-[10px] font-bold text-slate-400">
          {t("header.clickToEnlarge")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((url, index) => {
          const isPdf =
            url.toLowerCase().includes(".pdf") || url.includes("google.com/file");
          const isLoaded = loadedImages[index];
          const number = index + 1;

          return (
            <button
              key={index}
              type="button"
              aria-label={
                isPdf
                  ? t("openSurveyPdf", { number })
                  : t("openSurveyAsset", { number })
              }
              aria-haspopup="dialog"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                setSelectedAsset({ url, isPdf, number });
              }}
              className="group relative flex aspect-square min-h-11 min-w-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-slate-200/60 bg-white text-left shadow-xs transition-all duration-300 hover:scale-[1.02] hover:border-[#B7D1EA] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              {isPdf ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-4 text-slate-500 transition-colors group-hover:bg-slate-100 motion-reduce:transition-none">
                  <FileText className="h-10 w-10 text-red-400 transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                  <span className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pdfDocument")}
                  </span>
                </div>
              ) : (
                <div className="relative h-full w-full bg-slate-100">
                  {!isLoaded && (
                    <GsapPulse
                      className="absolute inset-0 bg-slate-200/50 backdrop-blur-md"
                      scale={1.01}
                    >
                      <span />
                    </GsapPulse>
                  )}
                  <ProgressiveImage
                    src={url}
                    alt={t("surveyAssetAlt", { number })}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className={cn(
                      "h-full w-full object-cover",
                      isLoaded ? "opacity-100" : "opacity-60",
                    )}
                    onLoad={() =>
                      setLoadedImages((previous) => ({
                        ...previous,
                        [index]: true,
                      }))
                    }
                  />
                </div>
              )}

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
              >
                <span className="rounded-full bg-white/90 p-2 text-slate-800 shadow-sm">
                  <ExternalLink className="h-4 w-4" />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Dialog
        isOpen={selectedAsset !== null}
        onClose={() => setSelectedAsset(null)}
        size="full"
        tone="light"
        ariaLabel={dialogTitle}
        closeLabel={t("closeImageAriaLabel")}
      >
        {selectedAsset && (
          <DialogContent className="min-h-0">
            <DialogHeader className="[&_.solar-dialog-close:focus-visible]:ring-[#0F172A]">
              <div>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("previewDialogDescription", {
                    number: selectedAsset.number,
                  })}
                </DialogDescription>
              </div>
            </DialogHeader>
            <DialogBody className="flex min-h-0 flex-col items-center justify-center gap-3">
              {selectedAsset.isPdf ? (
                <div className="flex min-h-[40vh] w-full flex-1 flex-col items-center justify-center bg-white/60 p-6 text-center">
                  <FileText aria-hidden="true" className="mb-4 h-16 w-16 text-red-500" />
                  <p className="text-sm font-bold text-slate-700">
                    {t("documentPreview")}
                  </p>
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B7D1EA] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-900 transition-colors hover:bg-[#B7D1EA]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    <span>{t("openDocument")}</span>
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <>
                  <div className="relative h-[60dvh] min-h-[40dvh] w-full overflow-hidden rounded-lg">
                    <ProgressiveImage
                      src={selectedAsset.url}
                      alt={t("surveyAssetAlt", {
                        number: selectedAsset.number,
                      })}
                      fill
                      sizes="90vw"
                      className="object-contain"
                    />
                  </div>
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    <span>{t("openOriginal")}</span>
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
