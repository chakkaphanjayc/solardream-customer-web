import { notFound, redirect } from "next/navigation";
import { getPaymentMilestones } from "@/app/actions/payments";
import CheckoutSuccessClient from "./CheckoutSuccessClient";
import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/utils/supabase/server";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export const instant = false;

export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { id, locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout/${id}/success`)}`);
  }

  // Fetch milestones and order details
  let result: Awaited<ReturnType<typeof getPaymentMilestones>>;
  try {
    result = await getPaymentMilestones(id);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      notFound();
    }
    throw error;
  }

  if (!result.success || !result.milestones || !result.order) {
    notFound();
  }

  const { milestones, order } = result;

  return (
    <PageShell className="flex items-center justify-center bg-background px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        <CheckoutSuccessClient
          order={order}
          milestones={milestones}
          locale={locale}
        />
      </div>
    </PageShell>
  );
}
