import type { ProposalQuotationReadModelDto } from "@/types/proposals";

function formatMoney(value: string, currency: string, locale: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

function label(locale: string, thai: string, english: string) {
  return locale === "th" ? thai : english;
}

export function StructuredQuotationCard({
  quotation,
  locale,
}: {
  quotation: ProposalQuotationReadModelDto;
  locale: string;
}) {
  return (
    <section
      id="structured-quotation"
      className="solar-route-card overflow-hidden bg-[var(--sd-raised)] p-5 sm:p-6"
      aria-labelledby="structured-quotation-title"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--sd-line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sd-blue-600)]">
            {label(locale, "ข้อมูลจากระบบการค้า", "Commercial quotation")}
          </p>
          <h2
            id="structured-quotation-title"
            className="mt-1 text-xl font-bold tracking-tight text-[var(--sd-ink)] sm:text-2xl"
          >
            {label(locale, "รายละเอียดใบเสนอราคา", "Quotation details")}
          </h2>
          <p className="mt-2 text-sm text-[var(--sd-muted)]">
            {quotation.erpnextQuotationId} · {label(locale, "ฉบับที่", "Revision")} {quotation.revisionNumber}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-[var(--sd-selected)] px-3 py-1 text-xs font-bold text-[var(--sd-ink)]">
          {quotation.status}
        </span>
      </div>

      <p className="mt-5 text-xs text-[var(--sd-muted)] sm:hidden">
        {label(locale, "เลื่อนตารางเพื่อดูรายละเอียดทั้งหมด", "Scroll to view all quotation details")}
      </p>
      <div
        className="mt-2 overflow-x-auto rounded-[var(--sd-radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sd-focus)] sm:mt-5"
        role="region"
        aria-label={label(locale, "รายการในใบเสนอราคา", "Quotation line items")}
        tabIndex={0}
      >
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-[var(--sd-line)] text-xs font-bold uppercase tracking-wide text-[var(--sd-muted)]">
            <tr>
              <th className="pb-3 pr-4">{label(locale, "รายการ", "Item")}</th>
              <th className="pb-3 pr-4 text-right">{label(locale, "จำนวน", "Qty")}</th>
              <th className="pb-3 pr-4 text-right">{label(locale, "ราคาต่อหน่วย", "Unit price")}</th>
              <th className="pb-3 text-right">{label(locale, "รวม", "Amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sd-line)]">
            {quotation.items.map((item, index) => (
              <tr key={`${item.itemCode || item.name}-${index}`}>
                <td className="py-3 pr-4 align-top">
                  <p className="font-semibold text-[var(--sd-ink)]">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--sd-muted)]">{item.description}</p>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-right align-top text-[var(--sd-text)]">
                  {formatQuantity(item.quantity)} {item.unit || ""}
                </td>
                <td className="py-3 pr-4 text-right align-top text-[var(--sd-text)]">
                  {formatMoney(item.unitPrice, quotation.currency, locale)}
                </td>
                <td className="py-3 text-right align-top font-semibold text-[var(--sd-ink)]">
                  {formatMoney(item.amount, quotation.currency, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-5 border-t border-[var(--sd-line)] pt-5 md:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {quotation.paymentTerms.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold text-[var(--sd-ink)]">
                {label(locale, "เงื่อนไขการชำระเงิน", "Payment terms")}
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-[var(--sd-muted)]">
                {quotation.paymentTerms.map((term, index) => (
                  <li key={`${term.label}-${index}`} className="flex flex-wrap justify-between gap-3">
                    <span>{term.label}</span>
                    <span className="font-semibold text-[var(--sd-text)]">
                      {term.amount ? formatMoney(term.amount, quotation.currency, locale) : term.percentage ? `${term.percentage}%` : term.dueDate || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {quotation.terms ? (
            <div>
              <h3 className="text-sm font-bold text-[var(--sd-ink)]">
                {label(locale, "เงื่อนไขและหมายเหตุ", "Terms and notes")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--sd-muted)]">{quotation.terms}</p>
            </div>
          ) : null}
        </div>

        <dl className="space-y-3 rounded-[var(--sd-radius-md)] bg-[var(--sd-soft-solar)] p-4 text-sm">
          <div className="flex justify-between gap-4 text-[var(--sd-muted)]">
            <dt>{label(locale, "ราคาก่อนภาษี", "Subtotal")}</dt>
            <dd className="font-semibold text-[var(--sd-text)]">{formatMoney(quotation.subtotal, quotation.currency, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-[var(--sd-muted)]">
            <dt>{label(locale, "ส่วนลด", "Discount")}</dt>
            <dd className="font-semibold text-[var(--sd-text)]">{formatMoney(quotation.discountAmount, quotation.currency, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-[var(--sd-muted)]">
            <dt>{label(locale, "ภาษี", "Tax")}</dt>
            <dd className="font-semibold text-[var(--sd-text)]">{formatMoney(quotation.taxAmount, quotation.currency, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--sd-line)] pt-3 text-base font-bold text-[var(--sd-ink)]">
            <dt>{label(locale, "ยอดรวมสุทธิ", "Grand total")}</dt>
            <dd>{formatMoney(quotation.grandTotal, quotation.currency, locale)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
