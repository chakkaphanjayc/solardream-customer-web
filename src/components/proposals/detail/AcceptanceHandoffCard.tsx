import type { ProposalAcceptanceDto } from "@/types/proposals";

function copyForStatus(status: ProposalAcceptanceDto["status"], locale: string) {
  if (locale === "th") {
    if (status === "ORDER_CREATED") return { label: "สร้างคำสั่งซื้อแล้ว", detail: "ทีมงานกำลังเตรียมขั้นตอนถัดไปให้คุณ" };
    if (status === "ORDER_FAILED") return { label: "กำลังตรวจสอบการส่งต่อ", detail: "เราได้รับการยอมรับใบเสนอราคาแล้ว และทีมงานจะติดต่อกลับเพื่อตรวจสอบขั้นตอนถัดไป" };
    if (status === "ORDER_PENDING") return { label: "กำลังส่งต่อคำสั่งซื้อ", detail: "เราได้รับการยอมรับใบเสนอราคาแล้ว ระบบกำลังส่งต่อข้อมูลให้ทีมงาน" };
    return { label: "ยอมรับใบเสนอราคาแล้ว", detail: "บันทึกการยอมรับของคุณเรียบร้อยแล้ว" };
  }
  if (status === "ORDER_CREATED") return { label: "Sales Order created", detail: "The team is preparing the next delivery step." };
  if (status === "ORDER_FAILED") return { label: "Handoff under review", detail: "Your acceptance was recorded. Our team will review the next step and contact you." };
  if (status === "ORDER_PENDING") return { label: "Sales Order handoff pending", detail: "Your acceptance was recorded and is being sent to the delivery team." };
  return { label: "Quotation accepted", detail: "Your acceptance has been recorded." };
}

export function AcceptanceHandoffCard({
  acceptance,
  locale,
}: {
  acceptance: ProposalAcceptanceDto;
  locale: string;
}) {
  const copy = copyForStatus(acceptance.status, locale);
  return (
    <section className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6" aria-labelledby="acceptance-handoff-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sd-blue-600)]">
            {locale === "th" ? "สถานะหลังยอมรับ" : "After acceptance"}
          </p>
          <h2 id="acceptance-handoff-title" className="mt-1 text-xl font-bold text-[var(--sd-ink)]">{copy.label}</h2>
        </div>
        <span className="inline-flex w-fit rounded-full bg-[var(--sd-anime-highlight)] px-3 py-1 text-xs font-bold text-[var(--sd-ink)]">v{acceptance.revisionNumber}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--sd-muted)]">{copy.detail}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--sd-surface)] p-3"><dt className="text-xs text-[var(--sd-muted)]">{locale === "th" ? "วันที่ยอมรับ" : "Accepted"}</dt><dd className="mt-1 font-semibold text-[var(--sd-ink)]">{new Date(acceptance.acceptedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}</dd></div>
        <div className="rounded-xl bg-[var(--sd-surface)] p-3"><dt className="text-xs text-[var(--sd-muted)]">{locale === "th" ? "เลขคำสั่งซื้อ" : "Sales Order"}</dt><dd className="mt-1 font-mono text-xs font-semibold text-[var(--sd-ink)]">{acceptance.providerSalesOrderId || (locale === "th" ? "กำลังดำเนินการ" : "Processing")}</dd></div>
      </dl>
    </section>
  );
}
