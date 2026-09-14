"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Mail } from "@/components/ui/icons";
import { toast } from "sonner";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { createClient } from "@/utils/supabase/client";
import { getBrowserPublicOrigin } from "@/lib/siteUrl";

import SmartBackButton from "@/components/ui/SmartBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("ForgotPassword");
  const emailId = `${useId()}-email`;
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBrowserPublicOrigin()}/${locale}/login`,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      toast.error(error.message);
      return;
    }

    setIsSent(true);
    toast.success(t("sentToast"));
  };

  return (
    <AuthSplitLayout
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {isSent ? (
        <div role="status" aria-live="polite" className="space-y-6 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/30 text-foreground">
            <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("checkEmail")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("sentDescription", { email })}
            </p>
          </div>
          <div className="flex justify-center">
            <SmartBackButton
              fallbackHref={`/${locale}/login`}
              label={t("backToLogin")}
              className="min-h-11 bg-white shadow-none backdrop-blur-none"
            />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={emailId}>{t("emailLabel")}</Label>
            <div className="relative">
              <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `${emailId}-error` : undefined}
                className="min-h-12 bg-white pl-11 pr-4 text-base"
              />
            </div>
          </div>

          {errorMessage ? (
            <div
              id={`${emailId}-error`}
              role="alert"
              aria-live="polite"
              className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800"
            >
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="min-h-12 w-full px-5 text-sm font-bold"
          >
            {isSubmitting ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? t("sending") : t("send")}
          </Button>

          <div className="flex justify-center pt-2">
            <SmartBackButton
              fallbackHref={`/${locale}/login`}
              label={t("backToLogin")}
              className="min-h-11 bg-white shadow-none backdrop-blur-none"
            />
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
}
