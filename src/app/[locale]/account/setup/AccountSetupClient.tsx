"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { completeAccountSetup } from "@/app/actions/profile";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone, UserRound } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountSetupClientProps = {
  email: string;
  initialName: string;
  initialPhoneNumber: string;
  nextPath: string;
};

export default function AccountSetupClient({
  email,
  initialName,
  initialPhoneNumber,
  nextPath,
}: AccountSetupClientProps) {
  const t = useTranslations("AccountSetup");
  const router = useRouter();
  const fieldPrefix = useId();
  const [name, setName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitSetup = (formData: FormData) => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await completeAccountSetup(formData);

      if (!result.success) {
        const message = result.error || t("saveFailed");
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success(t("saved"));
      router.replace(nextPath);
      router.refresh();
    });
  };

  const nameId = `${fieldPrefix}-name`;
  const phoneId = `${fieldPrefix}-phone`;

  return (
    <AuthSplitLayout
      title={t("title")}
      subtitle={t("description")}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-[20px] bg-[#DCE8F5] p-4 text-[#2E2C27]">
          <Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#4F7FA8]" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4E4B44]">{t("signedInAs")}</p>
            <p className="mt-1 break-all text-sm font-bold text-[#2E2C27]">{email}</p>
          </div>
        </div>

        <form action={submitSetup} aria-busy={isPending} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={nameId} className="text-xs font-bold text-[#4E4B44]">{t("fullName")}</Label>
            <div className="relative">
              <UserRound
                aria-hidden="true"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E8B83]"
              />
              <Input
                id={nameId}
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("fullNamePlaceholder")}
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                className="min-h-12 pl-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={phoneId} className="text-xs font-bold text-[#4E4B44]">{t("phone")}</Label>
            <div className="relative">
              <Phone
                aria-hidden="true"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E8B83]"
              />
              <Input
                id={phoneId}
                name="phoneNumber"
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="08x-xxx-xxxx"
                autoComplete="tel"
                required
                minLength={6}
                maxLength={32}
                className="min-h-12 pl-12 text-base"
              />
            </div>
          </div>

          {errorMessage ? (
            <div
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
            disabled={isPending}
            className="min-h-12 w-full rounded-full bg-[#B7D1EA] text-white hover:bg-[#A5C2DE] active:scale-95 shadow-md font-bold"
          >
            {isPending ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : null}
            {t("save")}
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
