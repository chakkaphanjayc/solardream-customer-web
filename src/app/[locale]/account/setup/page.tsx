import { redirect } from "next/navigation";

import { ensureUserExists, getUser } from "@/app/actions/auth";
import { users } from "@/db/schema";
import { getSafeInternalPath } from "@/lib/safeRedirect";
import { getProfileDisplayName, isProfileComplete } from "@/lib/profileCompletion";
import { eq } from "drizzle-orm";
import AccountSetupClient from "./AccountSetupClient";
import { PageShell } from "@/components/ui/page-shell";



type AccountSetupPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export const instant = false;

export default async function AccountSetupPage({
  params,
  searchParams,
}: AccountSetupPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const nextPath = getSafeInternalPath(query.next, `/${locale}`);
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/setup?next=${encodeURIComponent(nextPath)}`)}`);
  }

  await ensureUserExists(supabaseUser);

  const { db } = await import("@/db");
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, supabaseUser.id),
    columns: {
      id: true,
      email: true,
      name: true,
      fullName: true,
      phoneNumber: true,
    },
  });

  if (isProfileComplete(dbUser)) {
    redirect(nextPath);
  }

  return (
    <PageShell className="bg-background">
      <AccountSetupClient
        email={dbUser?.email || supabaseUser.email || ""}
        initialName={getProfileDisplayName(dbUser) || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || ""}
        initialPhoneNumber={dbUser?.phoneNumber || ""}
        nextPath={nextPath}
      />
    </PageShell>
  );
}
