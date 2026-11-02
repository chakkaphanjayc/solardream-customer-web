import assert from "node:assert/strict";
import { test } from "node:test";

import { getLoginRedirect } from "@/lib/authNavigation";

test("profile login redirect preserves the localized destination", () => {
  assert.equal(
    getLoginRedirect("th", "profile"),
    "/th/login?next=%2Fth%2Fprofile",
  );
});

test("proposal login redirect preserves the localized destination", () => {
  assert.equal(
    getLoginRedirect("en", "proposals"),
    "/en/login?next=%2Fen%2Fproposals",
  );
});

test("unsupported locale falls back to the configured locale", () => {
  assert.equal(
    getLoginRedirect("../../external", "profile"),
    "/th/login?next=%2Fth%2Fprofile",
  );
});
