import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/locales";


export default async function MaintenancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  redirect(`/${locale}/services`);
}
