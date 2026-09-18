"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, LoaderCircle } from "@/components/ui/icons";

type RegistrationValues = {
  customerName: string;
  phone: string;
  installationAddress: string;
  systemSerialNumber: string;
  notes: string;
};

interface ProjectWarrantyRegistrationFormProps {
  proposalId: string;
  initialValues: RegistrationValues;
  initiallyRegistered: boolean;
}

export default function ProjectWarrantyRegistrationForm({
  proposalId,
  initialValues,
  initiallyRegistered,
}: ProjectWarrantyRegistrationFormProps) {
  const t = useTranslations("WarrantyRegistration");
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initiallyRegistered ? "saved" : "idle",
  );
  const [error, setError] = useState("");

  const setValue = (key: keyof RegistrationValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (status === "error") setStatus("idle");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/proposals/project-warranty-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ proposalId, ...values }),
      });
      const result: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t("saveError"));
      }
      setStatus("saved");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("saveError"),
      );
      setStatus("error");
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {status === "saved" ? (
        <div className="flex gap-3 rounded-xl bg-[#B7D1EA]/35 p-4 text-sm leading-6 text-[#0F172A]" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{t("savedMessage")}</p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-[#0F172A]">
          {t("fullName")}
          <input required value={values.customerName} onChange={(event) => setValue("customerName", event.target.value)} autoComplete="name" className="min-h-11 w-full rounded-xl border-2 border-[#000000] bg-white px-3 text-base font-normal outline-none transition focus:border-[#4F7FA8] focus:ring-2 focus:ring-[#B7D1EA]" />
        </label>
        <label className="space-y-2 text-sm font-semibold text-[#0F172A]">
          {t("phone")}
          <input required value={values.phone} onChange={(event) => setValue("phone", event.target.value)} autoComplete="tel" inputMode="tel" className="min-h-11 w-full rounded-xl border-2 border-[#000000] bg-white px-3 text-base font-normal outline-none transition focus:border-[#4F7FA8] focus:ring-2 focus:ring-[#B7D1EA]" />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-semibold text-[#0F172A]">
        {t("installationAddress")}
        <textarea required value={values.installationAddress} onChange={(event) => setValue("installationAddress", event.target.value)} autoComplete="street-address" rows={3} className="w-full rounded-xl border-2 border-[#000000] bg-white px-3 py-2.5 text-base font-normal leading-6 outline-none transition focus:border-[#4F7FA8] focus:ring-2 focus:ring-[#B7D1EA]" />
      </label>
      <label className="block space-y-2 text-sm font-semibold text-[#0F172A]">
        {t("serialNumber")} <span className="font-normal text-[#475569]">({t("optional")})</span>
        <input value={values.systemSerialNumber} onChange={(event) => setValue("systemSerialNumber", event.target.value)} className="min-h-11 w-full rounded-xl border-2 border-[#000000] bg-white px-3 text-base font-normal outline-none transition focus:border-[#4F7FA8] focus:ring-2 focus:ring-[#B7D1EA]" />
      </label>
      <label className="block space-y-2 text-sm font-semibold text-[#0F172A]">
        {t("notes")} <span className="font-normal text-[#475569]">({t("optional")})</span>
        <textarea value={values.notes} onChange={(event) => setValue("notes", event.target.value)} rows={3} className="w-full rounded-xl border-2 border-[#000000] bg-white px-3 py-2.5 text-base font-normal leading-6 outline-none transition focus:border-[#4F7FA8] focus:ring-2 focus:ring-[#B7D1EA]" />
      </label>
      {status === "error" ? <p className="text-sm font-medium text-red-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={status === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-[#B7D1EA] px-5 text-sm font-black text-[#0F172A] shadow-[3px_3px_0_#000000] transition-all hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[4px_4px_0_#000000] focus:outline-none focus:ring-2 focus:ring-[#4F7FA8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none">
        {status === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {status === "saving" ? t("saving") : status === "saved" ? t("updateRegistration") : t("registerWarranty")}
      </button>
    </form>
  );
}
