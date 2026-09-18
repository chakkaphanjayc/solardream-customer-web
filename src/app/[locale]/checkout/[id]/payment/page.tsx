import { notFound, redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { paymentTransactions, paymentRequests } from "@/db/schema";
import { getPaymentMilestones } from "@/app/actions/payments";
import OrderPaymentClient from "./OrderPaymentClient";
import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/utils/supabase/server";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ paymentSession?: string; paymentRequest?: string }>;
}

export const instant = false;

function toConfigurationData(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toPositiveAmount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getLoginPath(
  locale: string,
  id: string,
  paymentSession?: string,
  paymentRequest?: string,
) {
  const query = new URLSearchParams();
  if (paymentSession) query.set("paymentSession", paymentSession);
  if (paymentRequest) query.set("paymentRequest", paymentRequest);

  const paymentPath = `/${locale}/checkout/${id}/payment${
    query.size > 0 ? `?${query.toString()}` : ""
  }`;
  return `/${locale}/login?next=${encodeURIComponent(paymentPath)}`;
}


export default async function OrderPaymentPage({ params, searchParams }: PageProps) {
  const { id, locale } = await params;
  const { paymentSession, paymentRequest } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(getLoginPath(locale, id, paymentSession, paymentRequest));
  }

  // 1. Fetch payment milestones for this order
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
        amountRequested: toPositiveAmount(activePR.amountRequested),
        title: activePR.title,
      }
    : null;

  return (
    <PageShell className="solar-transaction-page bg-background px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
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
                  amount: toPositiveAmount(paymentSessionRecord.amount),
                }
              : null
          }
        />
      </div>
    </PageShell>
  );
}
