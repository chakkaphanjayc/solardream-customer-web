import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  commercialOutboxClaimFilter,
  createCommercialOutboxDispatcher,
} from "@/server/services/sales/commercial-outbox";
import {
  ERPNext_QUOTATION_EVENT_TOPIC,
  QUOTATION_ACCEPTED_COMMAND_TOPIC,
} from "@/server/services/sales/quotation-topics";

test("commercial outbox claim filter admits both wired quotation topics", () => {
  const query = new PgDialect().sqlToQuery(commercialOutboxClaimFilter());

  assert.match(query.sql, /current_event\.topic NOT LIKE 'commercial\.%'/);
  assert.match(query.sql, /current_event\.topic IN/);
  assert.deepEqual(query.params, [
    QUOTATION_ACCEPTED_COMMAND_TOPIC,
    ERPNext_QUOTATION_EVENT_TOPIC,
  ]);
});

test("integration outbox applies the commercial claim filter and delivery dispatcher", () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const processorPath = resolve(testDirectory, "../../../../lib/outboxProcessor.ts");
  const source = readFileSync(processorPath, "utf8");

  assert.match(source, /\$\{commercialOutboxClaimFilter\(\)\}/);
  assert.match(source, /if \(event\.topic\.startsWith\("commercial\."\)\)/);
  assert.match(source, /await deliverCommercialOutboxEvent\(event\)/);
});

test("commercial outbox dispatcher consumes quotation acceptance and ERPNext quotation events", async () => {
  const accepted: unknown[] = [];
  const erpnext: unknown[] = [];
  const dispatch = createCommercialOutboxDispatcher({
    quotationAccepted: async (event) => { accepted.push(event); },
    erpnextQuotationUpdated: async (event) => { erpnext.push(event); },
  });

  await dispatch({
    id: "accepted-event",
    topic: QUOTATION_ACCEPTED_COMMAND_TOPIC,
    aggregateId: "proposal-1",
    correlationId: null,
    dedupeKey: "acceptance:proposal-1:revision-2",
    providerReference: "SO-1",
    payload: { proposalId: "proposal-1" },
  });
  await dispatch({
    id: "erpnext-event",
    topic: ERPNext_QUOTATION_EVENT_TOPIC,
    aggregateId: "QTN-1",
    correlationId: "provider-event-1",
    dedupeKey: "erpnext.quotation.event:provider-event-1",
    providerReference: null,
    payload: { quotationId: "QTN-1" },
  });

  assert.deepEqual(accepted, [{
    eventId: "accepted-event",
    aggregateId: "proposal-1",
    dedupeKey: "acceptance:proposal-1:revision-2",
    providerReference: "SO-1",
    payload: { proposalId: "proposal-1" },
  }]);
  assert.deepEqual(erpnext, [{
    eventId: "provider-event-1",
    aggregateId: "QTN-1",
    payload: { quotationId: "QTN-1" },
  }]);
});
