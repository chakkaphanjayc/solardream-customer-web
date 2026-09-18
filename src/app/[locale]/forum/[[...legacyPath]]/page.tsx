import { redirect } from "next/navigation";

import { getDiscourseSsoStartUrl } from "@/lib/discourseConnect";

export const instant = false;

export default function LegacyForumRedirect() {
  redirect(getDiscourseSsoStartUrl().toString());
}
