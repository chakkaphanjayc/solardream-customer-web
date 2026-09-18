"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Loader2, Mail } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InvisibleTurnstile, {
  type InvisibleTurnstileHandle,
} from "@/components/security/InvisibleTurnstile";
import { useTranslations } from "next-intl";

interface PublicMagicLinkFormProps {
  trackingRef: string;
  locale: string;
}

export default function PublicMagicLinkForm({
  trackingRef,
  locale,
}: PublicMagicLinkFormProps) {
  const t = useTranslations("PublicMagicLink");
  const emailId = useId();
  const feedbackId = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const turnstileRef = useRef<InvisibleTurnstileHandle>(null);

  const isEmailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isEmailValid || busy) return;

    setBusy(true);
    setError("");
    setComplete(false);

    try {
      const turnstileToken = await turnstileRef.current?.getToken();
      const response = await fetch("/api/track/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingRef,
          email: email.trim(),
          locale,
          turnstileToken,
        }),
      });
      turnstileRef.current?.reset();

      if (!response.ok) throw new Error("Failed to send link");

      setComplete(true);
      setEmail("");
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-5 space-y-4"
      aria-busy={busy}
      aria-describedby={complete || error ? feedbackId : undefined}
    >
      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-[var(--sd-ink)]">{t("label")}</Label>
        <Input
          id={emailId}
          required
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setComplete(false);
            setError("");
          }}
          placeholder="name@example.com"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(error)}
          aria-describedby={complete || error ? feedbackId : undefined}
          className="min-h-12 text-base"
        />
      </div>

      {complete && (
        <p
          id={feedbackId}
          role="status"
          aria-live="polite"
          className="rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-4 text-sm font-semibold leading-6 text-[var(--sd-ink)]"
        >
          {t("success")}
        </p>
      )}

      {error && (
        <p
          id={feedbackId}
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-800"
        >
          {error}
        </p>
      )}

      <InvisibleTurnstile
        ref={turnstileRef}
        action="track_request"
      />

      <Button
        type="submit"
        disabled={busy || !isEmailValid}
        className="min-h-12 w-full"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        ) : (
          <Mail aria-hidden="true" />
        )}
        {busy ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
