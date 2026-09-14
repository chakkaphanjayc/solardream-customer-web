import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserProposals } from "@/app/actions/proposals";
import ProposalsClient from "./ProposalsClient";
import { isLocale } from "@/i18n/locales";
import type { ComponentProps } from "react";
import { db } from "@/db";
import { proposals as proposalsTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PageShell } from "@/components/ui/page-shell";

type ProposalsPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function ProposalsPage({ params }: ProposalsPageProps) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const result = await getUserProposals();
  let proposals = (
    result.success && result.proposals ? result.proposals : []
  ) as unknown as ComponentProps<typeof ProposalsClient>["initialProposals"];

  if (proposals.length === 0) {
    proposals = (await db.query.proposals.findMany({
      where: eq(proposalsTable.userId, user.id),
      orderBy: [desc(proposalsTable.createdAt)],
    })) as unknown as ComponentProps<typeof ProposalsClient>["initialProposals"];
  }

  return (
    <PageShell className="flex flex-col bg-[#F0EEE9]">
      <ProposalsClient initialProposals={proposals} userId={user.id} />
    </PageShell>
  );
}
