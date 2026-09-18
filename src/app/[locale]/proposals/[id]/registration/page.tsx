import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq, or } from "drizzle-orm";

import ProjectWarrantyRegistrationForm from "./ProjectWarrantyRegistrationForm";
import { db } from "@/db";
import { installationWorkflowProjects, projectWarrantyRegistrations, proposals } from "@/db/schema";
import { PORTAL_SESSION_COOKIE, validatePortalToken } from "@/lib/portalTokens";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";


interface RegistrationPageProps {
  params: Promise<{ locale: string; id: string }>;
}

function textDetail(details: unknown, key: string) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export default async function RegistrationPage({ params }: RegistrationPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "WarrantyRegistration" });
  const proposal = await db.query.proposals.findFirst({
    where: or(eq(proposals.id, id), eq(proposals.magicTokenSlug, id)),
  });
  if (!proposal) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const portalToken = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value || "";
  const isOwner = user?.id === proposal.userId;
  const guestAccess = !isOwner
    ? await validatePortalToken({ token: portalToken, proposalId: proposal.id, requiredScope: "documents:write" })
    : null;
  if (!isOwner && !guestAccess) notFound();

  const project = await db.query.installationWorkflowProjects.findFirst({
    where: eq(installationWorkflowProjects.proposalId, proposal.id),
  });
  const registration = project
    ? await db.query.projectWarrantyRegistrations.findFirst({
      where: eq(projectWarrantyRegistrations.projectId, project.id),
    })
    : null;
  const returnHref = `/${locale}/proposals/${proposal.magicTokenSlug}`;

  return (
    <PageShell className="bg-[#F0EEE9] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href={returnHref} className="inline-flex min-h-11 items-center text-sm font-black text-[#0F172A] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#4F7FA8] focus:ring-offset-2">
          {t("backToProject")}
        </Link>
        <Card className="mt-5 border-[3px] border-[#000000] bg-[#B7D1EA] p-5 text-[#0F172A] shadow-[5px_5px_0_#000000] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#4F7FA8]">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-base leading-7 text-[#475569]">
            {t("description")}
          </p>
        </Card>

        {!project || project.status !== "FINISHED" ? (
          <Card className="mt-5 border-[3px] border-[#000000] bg-white p-5 shadow-[4px_4px_0_#000000] sm:p-8">
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[#0F172A]">
              {t("handoverTitle")}
            </h2>
            <p className="mt-2 text-base leading-7 text-[#475569]">
              {t("handoverDescription")}
            </p>
          </Card>
        ) : (
          <Card className="mt-5 border-[3px] border-[#000000] bg-white p-5 shadow-[4px_4px_0_#000000] sm:p-8">
            <ProjectWarrantyRegistrationForm
              proposalId={proposal.id}
              initiallyRegistered={Boolean(registration)}
              initialValues={{
                customerName: registration?.customerName || "",
                phone: registration?.phone || "",
                installationAddress: registration?.installationAddress || "",
                systemSerialNumber: textDetail(registration?.details, "systemSerialNumber"),
                notes: textDetail(registration?.details, "notes"),
              }}
            />
          </Card>
        )}
      </div>
    </PageShell>
  );
}
