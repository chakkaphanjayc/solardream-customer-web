const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getTrustedInvoicePdfUrl(
  value: string | null | undefined,
  trustedBaseUrl: string | null | undefined,
): string | null {
  if (!value || !trustedBaseUrl) return null;

  try {
    const trustedBase = new URL(trustedBaseUrl);
    const invoiceUrl = new URL(value);
    const localDevelopment = LOCAL_HOSTS.has(trustedBase.hostname);
    const isSecureProtocol = trustedBase.protocol === "https:"
      || (localDevelopment && trustedBase.protocol === "http:");

    if (
      !isSecureProtocol
      || invoiceUrl.origin !== trustedBase.origin
      || invoiceUrl.username
      || invoiceUrl.password
    ) {
      return null;
    }

    return invoiceUrl.toString();
  } catch {
    return null;
  }
}

export type InvoiceStatusKey = "paid" | "partiallyPaid" | "unpaid" | "unknown";

export function getInvoiceStatusKey(status: string): InvoiceStatusKey {
  switch (status.trim().toUpperCase()) {
    case "PAID":
      return "paid";
    case "PARTIALLY_PAID":
      return "partiallyPaid";
    case "UNPAID":
      return "unpaid";
    default:
      return "unknown";
  }
}
