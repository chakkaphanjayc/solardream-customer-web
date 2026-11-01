import { redirect } from "next/navigation";

import { isLocale } from "@/i18n/locales";

type ProjectsAliasPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function ProjectsAliasPage({
  params,
}: ProjectsAliasPageProps) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";

  redirect(`/${locale}/works`);
}
