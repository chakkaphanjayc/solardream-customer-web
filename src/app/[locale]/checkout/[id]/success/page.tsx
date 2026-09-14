import { notFound } from "next/navigation";
import { getPaymentMilestones } from "@/app/actions/payments";
import CheckoutSuccessClient from "./CheckoutSuccessClient";
import { PageShell } from "@/components/ui/page-shell";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}


export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { id, locale } = await params;

  // Fetch milestones and order details
  const result = await getPaymentMilestones(id);

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
