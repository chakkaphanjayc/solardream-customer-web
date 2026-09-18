import { redirect } from "next/navigation";
import { getDbUser } from "@/app/actions/auth";
import { getArticles } from "@/app/actions/articles";
import SupportDashboardClient from "./SupportDashboardClient";
import { isLocale } from "@/i18n/locales";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import type { SupportDashboardArticle } from "@/types/support";



export default async function SupportDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  const [user, articles] = await Promise.all([
    getDbUser(),
    getArticles(3),
  ]);

  if (!user?.isActive || user.anonymizedAt || user.deletionRequestedAt) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/support/dashboard`)}`);
  }

  const serializedArticles: SupportDashboardArticle[] = articles.map(art => ({
    id: art.id,
    title: art.title,
    content: art.content,
    coverImage: art.coverImage || null,
    createdAt: art.createdAt.toISOString(),
  }));

  return (
    <SolarRouteShell className="solar-support-page solar-support-dashboard-shell px-4 py-8 md:px-8">
      <SupportDashboardClient user={user} articles={serializedArticles} />
    </SolarRouteShell>
  );
}
