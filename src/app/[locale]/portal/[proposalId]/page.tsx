import PortalSessionExchange from "./PortalSessionExchange";


export default async function PortalAccessPage({
  params,
}: {
  params: Promise<{ locale: string; proposalId: string }>;
}) {
  const { locale, proposalId } = await params;
  return <PortalSessionExchange locale={locale} proposalId={proposalId} />;
}
