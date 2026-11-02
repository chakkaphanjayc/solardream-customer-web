import assert from "node:assert/strict";
import { test } from "node:test";

import { getWarrantyCardErrorKind } from "@/lib/warrantyCardState";

test("warranty registration not-ready stays distinct from service errors", () => {
  assert.equal(
    getWarrantyCardErrorKind({ code: "WARRANTY_CARD_NOT_READY" }),
    "notReady",
  );
  assert.equal(getWarrantyCardErrorKind({ retryable: true }), "retryable");
  assert.equal(getWarrantyCardErrorKind({ retryable: false }), "generic");
  assert.equal(getWarrantyCardErrorKind({}), "generic");
});
