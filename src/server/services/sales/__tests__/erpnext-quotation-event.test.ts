import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildERPNextQuotationProposalProjection } from "@/server/services/sales/erpnext-quotation-event-service";

test("ERPNext proposal projection uses authoritative read-model status and amount", () => {
  const projection = buildERPNextQuotationProposalProjection({
    eventId: "provider-event-1",
    quotationId: "QTN-1",
    existingConfigurationData: { customerNotes: "keep me" },
    readModel: {
      status: "OPEN",
      grandTotal: "104325.00",
      revisionNumber: 4,
      contentHash: "a".repeat(64),
    },
    receivedAt: new Date("2026-11-01T00:00:00.000Z"),
  });

  assert.equal(projection.providerStatus, "OPEN");
  assert.equal(projection.mappedStatus, "SENT");
  assert.equal(projection.proposalUpdate.totalPrice, 104325);
  assert.equal(projection.proposalUpdate.status, "SENT");
  assert.equal(
    (projection.proposalUpdate.configurationData as Record<string, unknown>).customerNotes,
    "keep me",
  );
  assert.deepEqual(projection.proposalUpdate.configurationData.erpnextProviderProjection, {
    eventId: "provider-event-1",
    quotationId: "QTN-1",
    providerStatus: "OPEN",
    mappedStatus: "SENT",
    readModelRevision: 4,
    readModelHash: "a".repeat(64),
    receivedAt: "2026-11-01T00:00:00.000Z",
  });
});

test("event processor sources proposal fields from the fetched read model, not webhook status", () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const servicePath = resolve(testDirectory, "../erpnext-quotation-event-service.ts");
  const source = readFileSync(servicePath, "utf8");

  assert.match(source, /const providerStatus = input\.readModel\.status/);
  assert.match(source, /Number\(input\.readModel\.grandTotal\)/);
  assert.doesNotMatch(source, /payload\.(?:providerStatus|status|grand_total)/);
});

test("unpublished or immutable quotations are acknowledged without retrying projection", () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const servicePath = resolve(testDirectory, "../erpnext-quotation-event-service.ts");
  const source = readFileSync(servicePath, "utf8");

  assert.match(source, /if \(!readModel\)\s*\{\s*return\s*\{\s*ignored: true/);
  assert.doesNotMatch(source, /Quotation read model was not published/);
});

test("unmapped authoritative ERPNext status leaves the existing proposal status untouched", () => {
  const projection = buildERPNextQuotationProposalProjection({
    eventId: "provider-event-2",
    quotationId: "QTN-2",
    existingConfigurationData: {},
    readModel: {
      status: "DRAFT",
      grandTotal: "2500.00",
      revisionNumber: 1,
      contentHash: "b".repeat(64),
    },
    receivedAt: new Date("2026-11-01T00:00:00.000Z"),
  });

  assert.equal(projection.mappedStatus, null);
  assert.equal(Object.hasOwn(projection.proposalUpdate, "status"), false);
  assert.equal(projection.proposalUpdate.totalPrice, 2500);
});
