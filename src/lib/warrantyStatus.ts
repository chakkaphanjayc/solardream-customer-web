export type WarrantyStatus = "UNDER_WARRANTY" | "EXPIRED" | "PENDING";

export type WarrantyStatusTone = "covered" | "expired" | "pending";

export function getWarrantyStatusPresentation(status: WarrantyStatus) {
  switch (status) {
    case "UNDER_WARRANTY":
      return { tone: "covered", icon: "🟢", labelKey: "status.covered" } as const;
    case "EXPIRED":
      return { tone: "expired", icon: "🟠", labelKey: "status.expired" } as const;
    case "PENDING":
      return { tone: "pending", icon: "🟡", labelKey: "status.pending" } as const;
    default:
      return { tone: "pending", icon: "🟡", labelKey: "status.pending" } as const;
  }
}
