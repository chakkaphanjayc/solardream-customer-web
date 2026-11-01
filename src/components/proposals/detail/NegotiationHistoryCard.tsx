import type { ProposalNegotiationEventDto } from "@/types/proposals";

function eventLabel(eventType: string, locale: string) {
  if (locale === "th") {
    if (eventType === "CUSTOMER_CHANGE_REQUEST") return "ลูกค้าขอแก้ไขใบเสนอราคา";
    if (eventType === "STAFF_COUNTER_OFFER") return "เจ้าหน้าที่ส่งข้อเสนอปรับปรุง";
    if (eventType === "REVISION_ISSUED") return "ออกใบเสนอราคาฉบับใหม่";
    if (eventType === "ACCEPTANCE_RECORDED") return "บันทึกการยอมรับใบเสนอราคา";
    return "ข้อความเกี่ยวกับใบเสนอราคา";
  }
  if (eventType === "CUSTOMER_CHANGE_REQUEST") return "Customer requested changes";
  if (eventType === "STAFF_COUNTER_OFFER") return "Staff sent a counter-offer";
  if (eventType === "REVISION_ISSUED") return "Quotation revision issued";
  if (eventType === "ACCEPTANCE_RECORDED") return "Quotation acceptance recorded";
  return "Quotation message";
}

export function NegotiationHistoryCard({
  events,
  locale,
}: {
  events: ProposalNegotiationEventDto[];
  locale: string;
}) {
  return (
    <section className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6" aria-labelledby="negotiation-history-title">
      <div className="border-b border-[var(--sd-line)] pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sd-blue-600)]">
          {locale === "th" ? "ประวัติการพูดคุย" : "Negotiation history"}
        </p>
        <h2 id="negotiation-history-title" className="mt-1 text-xl font-bold text-[var(--sd-ink)]">
          {locale === "th" ? "การเปลี่ยนแปลงและข้อเสนอ" : "Requests and offers"}
        </h2>
      </div>
      <ol className="mt-5 space-y-4">
        {events.map((event) => (
          <li key={event.id} className="relative border-l-2 border-[var(--sd-selected)] pl-4">
            <p className="text-sm font-bold text-[var(--sd-ink)]">{eventLabel(event.eventType, locale)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--sd-muted)]">{event.message}</p>
            <time className="mt-2 block text-xs text-[var(--sd-muted)]" dateTime={event.createdAt}>
              {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
