import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasPublishedCustomerQuotation,
  redactUnpublishedCustomerProposal,
} from "@/lib/proposalPortalExposure";
import type { ClientProposal } from "@/types/proposals";

const draftProposal: ClientProposal = {
  id: "proposal-1",
  userId: "customer-1",
  systemSizeKwp: 5.5,
  panelCount: 10,
  totalPrice: 120_000,
  monthlySavings: 4_500,
  paybackPeriod: "6.2",
  pdfUrl: "https://drive.google.com/file/d/draft-file/view",
  revisedPdfUrl: "https://drive.google.com/file/d/draft-revision/view",
  signedDocumentDriveUrl: null,
  revisionNumber: 1,
  status: "DRAFT",
  dispatchStatus: "PENDING_DISPATCH",
  configurationData: {
    trackingRef: "SD-2026-001",
    items: [{ name: "Panel", totalPrice: 120_000 }],
  },
  fulfillmentType: "INSTALLATION",
  erpnextQuotationId: "QTN-DRAFT-1",
  selectedFinancing: null,
  user: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

test("draft proposal fields are not classified as customer-published", () => {
  assert.equal(hasPublishedCustomerQuotation({
    status: draftProposal.status,
    dispatchStatus: draftProposal.dispatchStatus,
    hasPublishedReadModel: false,
    hasAcceptance: false,
  }), false);
});

test("unpublished customer proposal serialization retains only the tracking reference", () => {
  const redacted = redactUnpublishedCustomerProposal(draftProposal);

  assert.equal(redacted.totalPrice, 0);
  assert.equal(redacted.systemSizeKwp, 0);
  assert.equal(redacted.panelCount, 0);
  assert.equal(redacted.pdfUrl, null);
  assert.equal(redacted.revisedPdfUrl, null);
  assert.equal(redacted.erpnextQuotationId, null);
  assert.deepEqual(redacted.configurationData, { trackingRef: "SD-2026-001" });
  assert.deepEqual(redacted.serviceItems, []);
});

test("a sent proposal or published read model is customer-visible", () => {
  assert.equal(hasPublishedCustomerQuotation({
    status: "DRAFT",
    dispatchStatus: "DISPATCHED",
    hasPublishedReadModel: false,
    hasAcceptance: false,
  }), true);
  assert.equal(hasPublishedCustomerQuotation({
    status: "DRAFT",
    dispatchStatus: "PENDING_DISPATCH",
    hasPublishedReadModel: true,
    hasAcceptance: false,
  }), true);
  assert.equal(hasPublishedCustomerQuotation({
    status: "REVISION_REQUIRED",
    dispatchStatus: "PENDING_DISPATCH",
    hasPublishedReadModel: true,
    hasAcceptance: false,
  }), false);
});
