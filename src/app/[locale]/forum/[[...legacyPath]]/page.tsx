import { redirect } from "next/navigation";

import { getDiscourseSsoStartUrl } from "@/lib/discourseConnect";


export default function LegacyForumRedirect() {
  redirect(getDiscourseSsoStartUrl().toString());
}
