import { redirect } from "next/navigation";

import { getOptionalDiscourseSsoStartUrl } from "@/lib/discourseConnect";
import { isLocale } from "@/i18n/locales";

type LegacyForumRedirectProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function LegacyForumRedirect({ params }: LegacyForumRedirectProps) {
  const { locale } = await params;
  const forumUrl = getOptionalDiscourseSsoStartUrl();
  redirect(forumUrl?.toString() ?? `/${isLocale(locale) ? locale : "th"}`);
}
