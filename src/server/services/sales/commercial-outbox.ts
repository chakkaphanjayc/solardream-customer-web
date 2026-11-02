import { sql } from "drizzle-orm";

import type { integrationOutbox } from "@/db/schema";
import {
  COMMERCIAL_OUTBOX_TOPICS,
  ERPNext_QUOTATION_EVENT_TOPIC,
  QUOTATION_ACCEPTED_COMMAND_TOPIC,
} from "@/server/services/sales/quotation-topics";

type CommercialOutboxEvent = Pick<
  typeof integrationOutbox.$inferSelect,
  | "id"
  | "topic"
  | "aggregateId"
  | "correlationId"
  | "dedupeKey"
  | "providerReference"
  | "payload"
>;

type QuotationAcceptedCommand = {
  eventId: string;
  aggregateId: string;
  dedupeKey: string | null;
  providerReference: string | null;
  payload: Record<string, unknown>;
};

type ERPNextQuotationEvent = {
  eventId: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

export type CommercialOutboxHandlers = {
  quotationAccepted: (event: QuotationAcceptedCommand) => Promise<unknown>;
  erpnextQuotationUpdated: (event: ERPNextQuotationEvent) => Promise<unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** SQL predicate used by the claim query to allow only wired commercial topics. */
export function commercialOutboxClaimFilter() {
  const parameters = sql.join(
    COMMERCIAL_OUTBOX_TOPICS.map((topic) => sql`${topic}`),
    sql`, `,
  );
  return sql`AND (current_event.topic NOT LIKE 'commercial.%' OR current_event.topic IN (${parameters}))`;
}

/** Maps the durable outbox contract to the supported commercial consumers. */
export function createCommercialOutboxDispatcher(handlers: CommercialOutboxHandlers) {
  return async (event: CommercialOutboxEvent): Promise<void> => {
    const payload = asRecord(event.payload);
    if (event.topic === QUOTATION_ACCEPTED_COMMAND_TOPIC) {
      await handlers.quotationAccepted({
        eventId: event.id,
        aggregateId: event.aggregateId,
        dedupeKey: event.dedupeKey,
        providerReference: event.providerReference,
        payload,
      });
      return;
    }
    if (event.topic === ERPNext_QUOTATION_EVENT_TOPIC) {
      await handlers.erpnextQuotationUpdated({
        eventId: event.correlationId || event.id,
        aggregateId: event.aggregateId,
        payload,
      });
      return;
    }
    throw new Error(`Unsupported commercial outbox topic: ${event.topic}`);
  };
}
