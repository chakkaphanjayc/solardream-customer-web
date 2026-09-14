import { notFound, redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { paymentTransactions, paymentRequests } from "@/db/schema";
import { getPaymentMilestones } from "@/app/actions/payments";
import OrderPaymentClient from "./OrderPaymentClient";
import { PageShell } from "@/components/ui/page-shell";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ paymentSession?: string; paymentRequest?: string }>;
}

function toConfigurationData(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}


export default async function OrderPaymentPage({ params, searchParams }: PageProps) {
  const { id, locale } = await params;
  const { paymentSession, paymentRequest } = await searchParams;

  // 1. Fetch payment milestones for this order
  const result = await getPaymentMilestones(id);

  if (!result.success || !result.milestones || !result.order) {
    notFound();
  }

  const { milestones, order } = result;

  const paymentSessionRecord = paymentSession
    ? await db.query.paymentTransactions.findFirst({
        where: and(
          eq(paymentTransactions.id, paymentSession),
          eq(paymentTransactions.proposalId, order.id),
          eq(paymentTransactions.status, "PENDING"),
          gt(paymentTransactions.expiresAt, new Date()),
        ),
        columns: {
          id: true,
          qrString: true,
          expiresAt: true,
          amount: true,
        },
      })
    : null;

  // 3. Fetch active PENDING payment request if any
  const activePR = await db.query.paymentRequests.findFirst({
    where: and(
      ...(paymentRequest ? [eq(paymentRequests.id, paymentRequest)] : []),
      eq(paymentRequests.proposalId, order.id),
      eq(paymentRequests.status, "PENDING")
    ),
  });

  // Fully paid projects can still have standalone after-sales payment requests.
  if (order.status === "FULLY_PAID" && !activePR) {
    redirect(`/${locale}/checkout/${id}/success`);
  }

  const activePaymentRequest = activePR
    ? {
        id: activePR.id,
        amountRequested: Number(activePR.amountRequested),
        title: activePR.title,
      }
    : null;

  return (
    <PageShell className="bg-background px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <OrderPaymentClient
          orderId={order.id}
          milestones={milestones}
          locale={locale}
          fulfillmentType={order.fulfillmentType}
          orderStatus={order.status}
          configurationData={toConfigurationData(order.configurationData)}
          systemSizeKwp={order.systemSizeKwp}
          panelCount={order.panelCount}
          activePaymentRequest={activePaymentRequest}
          paymentSession={
            paymentSessionRecord
              ? {
                  id: paymentSessionRecord.id,
                  qrString: paymentSessionRecord.qrString,
                  expiresAt: paymentSessionRecord.expiresAt.toISOString(),
                  amount: Number(paymentSessionRecord.amount),
                }
              : null
          }
        />
      </div>
    </PageShell>
  );
}
