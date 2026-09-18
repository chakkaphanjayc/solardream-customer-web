import { redirect } from "next/navigation";

type BuilderPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;


export default async function BuilderPageRedirect({ params }: BuilderPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/build`);
}
