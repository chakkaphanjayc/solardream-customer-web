import assert from "node:assert/strict";
import test from "node:test";

import { buildCookieConsentPayload, buildPrivacySessionHeaders } from "./privacyConsentClient";
import { privacyConsentSchema } from "./privacyConsent";

const sessionId = "test-session-id-2026-10-29";

test("cookie choices conform to the privacy consent API contract", () => {
  const essentialOnly = buildCookieConsentPayload({
    sessionId,
    source: "banner",
    analytics: false,
    marketing: false,
  });
  const allOptional = buildCookieConsentPayload({
    sessionId,
    source: "settings",
    analytics: true,
    marketing: true,
    policyVersion: " v1 ",
  });

  assert.equal(privacyConsentSchema.safeParse(essentialOnly).success, true);
  assert.equal(privacyConsentSchema.safeParse(allOptional).success, true);
  assert.deepEqual(essentialOnly.preferences, {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });
  assert.equal(allOptional.policyVersion, "v1");
});

test("legacy cookie payload fields are rejected by the strict API schema", () => {
  const legacyPayload = {
    sessionId,
    consentType: "essential",
    granted: true,
    purposes: ["Security", "Session Management"],
    preferences: { essential: true, analytics: false, marketing: false },
  };

  assert.equal(privacyConsentSchema.safeParse(legacyPayload).success, false);
});

test("guest consent reads send the opaque session identifier in a header", () => {
  const headers = buildPrivacySessionHeaders(sessionId);

  assert.equal(new Headers(headers).get("x-privacy-session"), sessionId);
  assert.equal(new Headers(headers).get("accept"), "application/json");
});
