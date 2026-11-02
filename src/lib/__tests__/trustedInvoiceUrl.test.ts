import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getInvoiceStatusKey,
  getTrustedInvoicePdfUrl,
} from "@/lib/trustedInvoiceUrl";

test("invoice PDFs are accepted only from the configured secure ERP origin", () => {
  assert.equal(
    getTrustedInvoicePdfUrl(
      "https://erp.example.com/private/invoice.pdf?id=invoice-1",
      "https://erp.example.com",
    ),
    "https://erp.example.com/private/invoice.pdf?id=invoice-1",
  );
  assert.equal(
    getTrustedInvoicePdfUrl("https://attacker.example/invoice.pdf", "https://erp.example.com"),
    null,
  );
  assert.equal(
    getTrustedInvoicePdfUrl("http://erp.example.com/invoice.pdf", "https://erp.example.com"),
    null,
  );
  assert.equal(
    getTrustedInvoicePdfUrl("https://user:password@erp.example.com/invoice.pdf", "https://erp.example.com"),
    null,
  );
});

test("invoice status copy is selected from known billing states", () => {
  assert.equal(getInvoiceStatusKey("paid"), "paid");
  assert.equal(getInvoiceStatusKey(" PARTIALLY_PAID "), "partiallyPaid");
  assert.equal(getInvoiceStatusKey("unpaid"), "unpaid");
  assert.equal(getInvoiceStatusKey("REVERSED"), "unknown");
});
