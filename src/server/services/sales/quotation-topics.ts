export const QUOTATION_ACCEPTED_COMMAND_TOPIC = "commercial.quotation.accepted";
export const ERPNext_QUOTATION_EVENT_TOPIC = "commercial.erpnext.quotation.updated";

export const COMMERCIAL_OUTBOX_TOPICS = [
  QUOTATION_ACCEPTED_COMMAND_TOPIC,
  ERPNext_QUOTATION_EVENT_TOPIC,
] as const;
