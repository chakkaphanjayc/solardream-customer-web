import { getUser, ensureUserExists } from "@/app/actions/auth";
import { getSavedConfigurations } from "@/app/actions/configurations";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfileLayout from "@/components/profile/ProfileLayout";
import type { ProfileUser } from "@/types/profile";
import { PageShell } from "@/components/ui/page-shell";
import { getSystemSetting } from "@/app/actions/systemSettings";

export const instant = false;

export default async function ProfilePage() {
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    redirect("/");
  }

  await ensureUserExists(supabaseUser);

  const [dbUser, savedBuilds] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, supabaseUser.id) }),
    getSavedConfigurations(),
  ]);

  if (!dbUser) {
    redirect("/");
  }

  const botBasicId = await getSystemSetting("line_bot_basic_id");
  const botDisplayName = await getSystemSetting("line_bot_display_name");
  const botPictureUrl = await getSystemSetting("line_bot_picture_url");

  const user: ProfileUser = {
    ...dbUser,
    savedConfigurations: savedBuilds,
    lineBotInfo: {
      basicId: botBasicId || "",
      displayName: botDisplayName || "SolarDream Official",
      pictureUrl: botPictureUrl || "",
    }
  };

  return (
    <PageShell
      as="main"
      className="w-full px-4 pb-16 pt-6 text-foreground sm:px-6 sm:pt-8 lg:px-8 lg:pt-10"
    >
      <ProfileLayout user={user} />
    </PageShell>
  );
}
