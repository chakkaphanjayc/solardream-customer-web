"use client";

import { useEffect, useId, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { CheckCircle2, RotateCcw } from "@/components/ui/icons";
import { useTranslations } from "next-intl";
import {
  normalizeSignatureData,
  scaleNormalizedSignatureData,
} from "@/lib/signaturePadData";

type SignaturePadProps = {
  signerName: string;
  onConfirm: (signatureDataUrl: string) => void | Promise<void>;
  disabled?: boolean;
  isSubmitting?: boolean;
};

type SignatureMethod = "draw" | "type";
type SignatureStatus =
  | "empty"
  | "ready"
  | "submitting"
  | "submitFailed"
  | "preserved"
  | "resizeFailed"
  | "signatureCreated"
  | "signatureCleared"
  | "methodChanged"
  | "nameRequired"
  | "nameChanged"
  | "typedUnavailable";

type SignatureStrokeGroups = ReturnType<SignatureCanvas["toData"]>;

const SIGNATURE_CANVAS_HEIGHT = 176;

function createTypedSignatureDataUrl(name: string, width: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = SIGNATURE_CANVAS_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0F172A";
  context.font = 'italic 38px "Segoe Script", "Brush Script MT", cursive';
  context.textBaseline = "middle";
  context.fillText(name, 16, canvas.height / 2, Math.max(1, canvas.width - 32));
  return canvas.toDataURL("image/png");
}

export default function SignaturePad({
  signerName,
  onConfirm,
  disabled = false,
  isSubmitting = false,
}: SignaturePadProps) {
  const t = useTranslations("SignaturePad");
  const instructionsId = useId();
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasWidthRef = useRef(320);
  const signaturePadRef = useRef<SignatureCanvas | null>(null);
  const normalizedSignatureRef = useRef<SignatureStrokeGroups>([]);
  const pendingRestorationRef = useRef<SignatureStrokeGroups | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>("draw");
  const [typedSignatureName, setTypedSignatureName] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [status, setStatus] = useState<SignatureStatus | null>(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(1, Math.floor(entry?.contentRect.width ?? 320));
      const previousWidth = canvasWidthRef.current;
      if (previousWidth === nextWidth) return;

      const drawnPoints = signaturePadRef.current?.toData() ?? [];
      if (drawnPoints.length > 0) {
        normalizedSignatureRef.current = normalizeSignatureData(
          drawnPoints,
          previousWidth,
          SIGNATURE_CANVAS_HEIGHT,
        );
      }

      if (normalizedSignatureRef.current.length > 0) {
        pendingRestorationRef.current = scaleNormalizedSignatureData(
          normalizedSignatureRef.current,
          nextWidth,
          SIGNATURE_CANVAS_HEIGHT,
        );
        setHasSignature(true);
        setStatus("preserved");
      }

      canvasWidthRef.current = nextWidth;
      setCanvasWidth(nextWidth);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pointGroups = pendingRestorationRef.current;
    const signaturePad = signaturePadRef.current;
    if (!pointGroups || !signaturePad) return;

    pendingRestorationRef.current = null;
    const animationFrame = window.requestAnimationFrame(() => {
      try {
        signaturePad.fromData(pointGroups);
      } catch {
        signaturePad.clear();
        normalizedSignatureRef.current = [];
        setHasSignature(false);
        setStatus("resizeFailed");
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [canvasWidth, signatureMethod]);

  const signatureNameChanged = Boolean(typedSignatureName && typedSignatureName !== signerName.trim());
  const hasCurrentSignature = hasSignature && !signatureNameChanged;

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    normalizedSignatureRef.current = [];
    pendingRestorationRef.current = null;
    setTypedSignatureName(null);
    setHasSignature(false);
    setStatus("signatureCleared");
  };

  const selectMethod = (method: SignatureMethod) => {
    if (method === signatureMethod) return;
    signaturePadRef.current?.clear();
    normalizedSignatureRef.current = [];
    pendingRestorationRef.current = null;
    setTypedSignatureName(null);
    setHasSignature(false);
    setSignatureMethod(method);
    setStatus("methodChanged");
  };

  const createTypedSignature = () => {
    const name = signerName.trim();
    if (!name) {
      setStatus("nameRequired");
      return;
    }

    if (!createTypedSignatureDataUrl(name, canvasWidthRef.current)) {
      setStatus("typedUnavailable");
      return;
    }

    setTypedSignatureName(name);
    setHasSignature(true);
    setStatus("signatureCreated");
  };

  const confirmSignature = async () => {
    if (!hasCurrentSignature || disabled || isSubmitting) return;

    const signatureDataUrl = typedSignatureName
      ? createTypedSignatureDataUrl(typedSignatureName, canvasWidthRef.current)
      : signaturePadRef.current?.toDataURL("image/png");
    if (!signatureDataUrl) {
      setStatus("typedUnavailable");
      return;
    }

    try {
      await onConfirm(signatureDataUrl);
    } catch {
      setStatus("submitFailed");
    }
  };

  const accessibleStatus = isSubmitting
    ? "submitting"
    : signatureNameChanged
      ? "nameChanged"
      : status && status !== "nameChanged"
        ? status
        : hasCurrentSignature
          ? "ready"
          : "empty";

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t("methodLabel")} className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={signatureMethod === "draw"}
          disabled={disabled || isSubmitting}
          onClick={() => selectMethod("draw")}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B7C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            signatureMethod === "draw"
              ? "border-[#0F172A] bg-[#0F172A] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {t("drawMethod")}
        </button>
        <button
          type="button"
          aria-pressed={signatureMethod === "type"}
          disabled={disabled || isSubmitting}
          onClick={() => selectMethod("type")}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B7C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            signatureMethod === "type"
              ? "border-[#0F172A] bg-[#0F172A] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {t("typeMethod")}
        </button>
      </div>

      <div ref={canvasContainerRef} className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">
        {signatureMethod === "draw" ? (
          <SignatureCanvas
            ref={signaturePadRef}
            clearOnResize={false}
            penColor="#0F172A"
            minWidth={2}
            maxWidth={4.5}
            velocityFilterWeight={0.7}
            onBegin={() => setStatus(null)}
            onEnd={() => {
              const signaturePad = signaturePadRef.current;
              if (!signaturePad) return;
              const pointGroups = signaturePad.toData();
              normalizedSignatureRef.current = normalizeSignatureData(
                pointGroups,
                canvasWidthRef.current,
                SIGNATURE_CANVAS_HEIGHT,
              );
              setHasSignature(pointGroups.length > 0);
            }}
            canvasProps={{
              width: canvasWidth,
              height: SIGNATURE_CANVAS_HEIGHT,
              className: "block h-44 w-full touch-none rounded-lg bg-white",
              role: "img",
              "aria-label": t("drawingArea"),
              "aria-describedby": instructionsId,
            }}
          />
        ) : (
          <div
            role="img"
            aria-label={typedSignatureName && !signatureNameChanged ? t("typedPreview", { name: typedSignatureName }) : t("typedPrompt")}
            className="grid h-44 place-items-center rounded-lg bg-white px-4 text-[#0F172A]"
          >
            {typedSignatureName && !signatureNameChanged ? (
              <span
                aria-hidden="true"
                className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-3xl italic"
                style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
              >
                {typedSignatureName}
              </span>
            ) : (
              <p className="max-w-xs text-center text-sm leading-6 text-slate-600">{t("typedPrompt")}</p>
            )}
          </div>
        )}
      </div>

      <p id={instructionsId} className="text-xs leading-5 text-slate-600">
        {signatureMethod === "draw" ? t("drawingInstructions") : t("typingInstructions")}
      </p>

      {signatureMethod === "type" && (
        <button
          type="button"
          onClick={createTypedSignature}
          disabled={disabled || isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B7D1EA] px-4 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#A9C4DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B7C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("applyTypedName")}
        </button>
      )}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {t(`status.${accessibleStatus}`)}
      </p>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || isSubmitting || !hasCurrentSignature}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B7C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {t("clear")}
        </button>
        <button
          type="button"
          onClick={() => void confirmSignature()}
          disabled={disabled || isSubmitting || !hasCurrentSignature}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0F172A] px-5 text-xs font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B7C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#B7D1EA]" />
          {isSubmitting ? t("signing") : t("confirm")}
        </button>
      </div>
    </div>
  );
}
