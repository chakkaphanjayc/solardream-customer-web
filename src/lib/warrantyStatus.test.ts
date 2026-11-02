import assert from "node:assert/strict";
import { test } from "node:test";

import { getWarrantyStatusPresentation } from "./warrantyStatus";

test("warranty card keeps pending registration separate from expired coverage", () => {
  assert.deepEqual(getWarrantyStatusPresentation("UNDER_WARRANTY"), {
    tone: "covered",
    icon: "🟢",
    labelKey: "status.covered",
  });
  assert.deepEqual(getWarrantyStatusPresentation("EXPIRED"), {
    tone: "expired",
    icon: "🟠",
    labelKey: "status.expired",
  });
  assert.deepEqual(getWarrantyStatusPresentation("PENDING"), {
    tone: "pending",
    icon: "🟡",
    labelKey: "status.pending",
  });
});
