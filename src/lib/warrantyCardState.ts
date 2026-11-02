export type WarrantyCardErrorKind = "notReady" | "retryable" | "generic";

export function getWarrantyCardErrorKind(response: {
  code?: string;
  retryable?: boolean;
}): WarrantyCardErrorKind {
  if (response.code === "WARRANTY_CARD_NOT_READY") return "notReady";
  return response.retryable === true ? "retryable" : "generic";
}
