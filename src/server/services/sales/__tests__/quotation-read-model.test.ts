import assert from "node:assert/strict";

import {
  isCustomerVisibleQuotationStatus,
  normalizeERPNextQuotation,
} from "@/server/services/sales/quotation-read-model-service";

const first = normalizeERPNextQuotation({
  proposalId: "proposal-1",
  revisionId: "00000000-0000-0000-0000-000000000001",
  revisionNumber: 2,
  erpnextQuotationId: "SAL-QTN-0001",
  document: {
    docstatus: 1,
    customer: "CUST-001",
    customer_name: "Solar Customer",
    currency: "THB",
    transaction_date: "2026-10-03",
    valid_till: "2026-10-17",
    net_total: 100000,
    discount_amount: 2500,
    total_taxes_and_charges: 6825,
    grand_total: 104325,
    items: [
      {
        item_code: "SOLAR-550",
        item_name: "Solar panel",
        description: "550W panel",
        qty: 10,
        uom: "Nos",
        rate: 10000,
        amount: 100000,
      },
    ],
    taxes: [{ description: "VAT 7%", rate: 7, tax_amount: 6825 }],
    payment_schedule: [{ description: "Deposit", invoice_portion: 30, payment_amount: 31297.5 }],
    terms_and_conditions: "Valid for 14 days.",
    modified: "2026-10-03 10:00:00",
    secret_field: "must not be projected",
  },
});

assert.equal(first.status, "SUBMITTED");
assert.equal(first.items[0]?.itemCode, "SOLAR-550");
assert.equal(first.items[0]?.quantity, 10);
assert.equal(first.items[0]?.unitPrice, "10000.00");
assert.equal(first.taxes[0]?.amount, "6825.00");
assert.equal(first.paymentTerms[0]?.percentage, "30.00");
assert.equal(first.grandTotal, "104325.00");
assert.match(first.contentHash, /^[a-f0-9]{64}$/);
assert.equal(isCustomerVisibleQuotationStatus(first.status), true);

const reordered = normalizeERPNextQuotation({
  proposalId: "proposal-1",
  revisionId: "00000000-0000-0000-0000-000000000001",
  revisionNumber: 2,
  erpnextQuotationId: "SAL-QTN-0001",
  document: {
    modified: "2026-10-03 10:00:00",
    terms_and_conditions: "Valid for 14 days.",
    payment_schedule: [{ payment_amount: 31297.5, invoice_portion: 30, description: "Deposit" }],
    taxes: [{ tax_amount: 6825, rate: 7, description: "VAT 7%" }],
    items: [{ amount: 100000, rate: 10000, uom: "Nos", qty: 10, description: "550W panel", item_name: "Solar panel", item_code: "SOLAR-550" }],
    grand_total: 104325,
    total_taxes_and_charges: 6825,
    discount_amount: 2500,
    net_total: 100000,
    valid_till: "2026-10-17",
    transaction_date: "2026-10-03",
    currency: "THB",
    customer_name: "Solar Customer",
    customer: "CUST-001",
    docstatus: 1,
  },
});

assert.equal(reordered.contentHash, first.contentHash);
assert.equal(Object.prototype.hasOwnProperty.call(first, "secret_field"), false);

const ordered = normalizeERPNextQuotation({
  proposalId: "proposal-1",
  revisionNumber: 2,
  erpnextQuotationId: "SAL-QTN-0001",
  document: { docstatus: 1, status: "Ordered", grand_total: 104325 },
});
assert.equal(ordered.status, "ORDERED");
assert.equal(isCustomerVisibleQuotationStatus(ordered.status), true);

const draft = normalizeERPNextQuotation({
  proposalId: "proposal-draft",
  revisionNumber: 1,
  erpnextQuotationId: "SAL-QTN-DRAFT",
  document: { docstatus: 0, status: "Draft", grand_total: 104325 },
});
assert.equal(draft.status, "DRAFT");
assert.equal(isCustomerVisibleQuotationStatus(draft.status), false);
assert.equal(isCustomerVisibleQuotationStatus("CANCELLED"), false);
console.log("quotation read model assertions passed");
