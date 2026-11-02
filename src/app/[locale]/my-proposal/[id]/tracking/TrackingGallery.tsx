"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ExternalLink, X, Camera } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { GsapPulse } from "@/components/ui/GsapMotion";
import ProgressiveImage from "@/components/ui/progressive-image";

interface TrackingGalleryProps {
  photos: string[];
}

export default function TrackingGallery({ photos }: TrackingGalleryProps) {
  const t = useTranslations("TrackingGallery");
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selectedPhoto) return;

    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [selectedPhoto]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {t("header.evidenceCount", { count: photos.length })}
        </p>
        <span className="text-[10px] font-bold text-slate-400">{t("header.clickToEnlarge")}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((url, index) => {
          const isPdf = url.toLowerCase().includes(".pdf") || url.includes("google.com/file");
          const isLoaded = loadedImages[index];

          return (
            <button
              type="button"
              key={index}
              onClick={() => setSelectedPhoto(url)}
              aria-label={t("openPreview", { count: index + 1 })}
              aria-haspopup="dialog"
              aria-controls="tracking-photo-dialog"
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-0 text-left shadow-xs transition-all duration-300 hover:scale-[1.02] hover:border-[#B7D1EA] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C486A] focus-visible:ring-offset-2"
            >
              {isPdf ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-4 text-slate-500 transition-colors group-hover:bg-slate-100">
                  <FileText className="h-10 w-10 text-red-400 transition-transform group-hover:scale-105" />
                  <span className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("pdfDocument")}
                  </span>
                </div>
              ) : (
                <div className="relative h-full w-full bg-slate-100">
                  {/* Blur placeholder */}
                  {!isLoaded && (
                    <GsapPulse className="absolute inset-0 bg-slate-200/50 backdrop-blur-md" scale={1.01}>
                      <span />
                    </GsapPulse>
                  )}
                  <ProgressiveImage
                    src={url}
                    alt={t("surveyAssetAlt", { count: index + 1 })}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className={cn(
                      "h-full w-full object-cover",
                      isLoaded ? "opacity-100" : "opacity-60"
                    )}
                    onLoad={() =>
                      setLoadedImages((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="rounded-full bg-white/90 p-2 shadow-sm text-slate-800">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <dialog
          ref={dialogRef}
          id="tracking-photo-dialog"
          aria-labelledby="tracking-photo-dialog-title"
          aria-modal="true"
          className="m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-visible bg-transparent p-0 text-inherit backdrop:bg-slate-950/60 backdrop:backdrop-blur-md"
          onClose={() => setSelectedPhoto(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPhoto(null);
          }}
        >
          <div className="relative max-h-[85dvh] max-w-[90vw] overflow-auto rounded-2xl bg-white p-2 shadow-2xl transition-all duration-300">
            <h2 id="tracking-photo-dialog-title" className="sr-only">
              {t("previewDialogTitle")}
            </h2>
            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              autoFocus
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-4 top-4 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-950/70 p-2 text-white shadow-sm transition-colors hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              aria-label={t("closeImageAriaLabel")}
            >
              <X className="h-5 w-5" />
            </button>

            {selectedPhoto.toLowerCase().includes(".pdf") || selectedPhoto.includes("google.com/file") ? (
              <div className="flex h-[60vh] w-[80vw] flex-col items-center justify-center bg-slate-50 p-6">
                <FileText className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-sm font-bold text-slate-700">{t("documentPreview")}</p>
                <a
                  href={selectedPhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B7D1EA] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-900 transition-all hover:bg-[#B7D1EA]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C486A] focus-visible:ring-offset-2"
                >
                  <span>{t("openDocument")}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative max-h-[75vh] w-full min-h-[40vh] overflow-hidden rounded-lg">
                  <ProgressiveImage
                    src={selectedPhoto}
                    alt={t("surveyPreviewAlt")}
                    fill
                    sizes="90vw"
                    className="object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4 px-2 py-1">
                  <a
                    href={selectedPhoto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C486A] focus-visible:ring-offset-2"
                  >
                    <span>{t("openOriginal")}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
