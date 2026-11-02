"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle, ExternalLink } from "@/components/ui/icons";

interface SocialShareBarProps {
  title: string;
  articleId: string;
  locale: string;
}

const shareButtonClassName = "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1C1A] focus-visible:ring-offset-2";

export default function SocialShareBar({ title, locale }: SocialShareBarProps) {
  const t = useTranslations("SocialShareBar");
  const [copied, setCopied] = useState(false);

  const getArticleUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return `https://solardream.com/${locale}/news`;
  };

  const handleCopyLink = async () => {
    try {
      const url = getArticleUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("copiedSuccess"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(getArticleUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=400");
  };

  const shareToTwitter = () => {
    const url = encodeURIComponent(getArticleUrl());
    const text = encodeURIComponent(title);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=600,height=400");
  };

  const shareToLine = () => {
    const url = encodeURIComponent(getArticleUrl());
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}`, "_blank", "width=600,height=500");
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(getArticleUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "width=600,height=500");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-2">
        <Share2 className="w-4 h-4 text-[#0369a1]" />
        <span>{t("shareArticle")}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* LINE */}
        <button
          type="button"
          onClick={shareToLine}
          className={`${shareButtonClassName} border border-[#06C755]/30 bg-[#06C755]/10 text-[#111827] hover:bg-[#06C755]/20`}
          aria-label={t("shareTo", { network: "LINE" })}
        >
          <MessageCircle className="w-3.5 h-3.5 text-[#06C755]" aria-hidden="true" />
          <span>LINE</span>
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={shareToFacebook}
          className={`${shareButtonClassName} border border-[#1877F2]/30 bg-[#1877F2]/10 text-[#111827] hover:bg-[#1877F2]/20`}
          aria-label={t("shareTo", { network: "Facebook" })}
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#1877F2]" aria-hidden="true" />
          <span>Facebook</span>
        </button>

        {/* X / Twitter */}
        <button
          type="button"
          onClick={shareToTwitter}
          className={`${shareButtonClassName} border border-slate-900/20 bg-slate-900/10 text-slate-900 hover:bg-slate-900/20`}
          aria-label={t("shareTo", { network: "X" })}
        >
          <span className="font-black text-xs" aria-hidden="true">𝕏</span>
          <span>Twitter</span>
        </button>

        {/* LinkedIn */}
        <button
          type="button"
          onClick={shareToLinkedIn}
          className={`${shareButtonClassName} border border-[#0A66C2]/30 bg-[#0A66C2]/10 text-[#111827] hover:bg-[#0A66C2]/20`}
          aria-label={t("shareTo", { network: "LinkedIn" })}
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" aria-hidden="true" />
          <span>LinkedIn</span>
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`${shareButtonClassName} bg-slate-200/80 text-slate-800 hover:bg-slate-300`}
          aria-label={t("copyLink")}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
              <span className="text-emerald-700">{t("copied")}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{t("copyLink")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
