import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_COOKIE_CONSENT_SETTINGS,
  resolveCookieBannerCopy,
  type CookieConsentTranslationCopy,
} from "./cookieConsentPresentation";

const thaiCopy: CookieConsentTranslationCopy = {
  title: "การตั้งค่าคุกกี้",
  description: "ข้อความเกี่ยวกับคุกกี้",
  privacyPolicy: "นโยบายความเป็นส่วนตัว",
  essentialOnly: "เฉพาะที่จำเป็น",
  acceptAll: "ยอมรับทั้งหมด",
  managePreferences: "จัดการการตั้งค่า",
};

test("localizes default cookie banner content without replacing admin copy", () => {
  const localized = resolveCookieBannerCopy(
    { ...DEFAULT_COOKIE_CONSENT_SETTINGS },
    "th",
    thaiCopy,
  );

  assert.equal(localized.cookieTitle, thaiCopy.title);
  assert.equal(localized.cookieMessage, thaiCopy.description);
  assert.equal(localized.essentialButtonText, thaiCopy.essentialOnly);
  assert.equal(localized.acceptAllButtonText, thaiCopy.acceptAll);
  assert.equal(localized.managePreferencesText, thaiCopy.managePreferences);
  assert.equal(localized.privacyPolicyText, thaiCopy.privacyPolicy);

  const custom = resolveCookieBannerCopy(
    {
      ...DEFAULT_COOKIE_CONSENT_SETTINGS,
      cookieMessage: "Admin-provided notice",
      acceptAllButtonText: "Allow every category",
    },
    "th",
    thaiCopy,
  );

  assert.equal(custom.cookieTitle, thaiCopy.title);
  assert.equal(custom.cookieMessage, "Admin-provided notice");
  assert.equal(custom.essentialButtonText, thaiCopy.essentialOnly);
  assert.equal(custom.acceptAllButtonText, "Allow every category");
});

test("leaves English cookie settings unchanged", () => {
  const copy = resolveCookieBannerCopy(
    { ...DEFAULT_COOKIE_CONSENT_SETTINGS },
    "en",
    thaiCopy,
  );

  assert.deepEqual(copy, {
    ...DEFAULT_COOKIE_CONSENT_SETTINGS,
    privacyPolicyText: thaiCopy.privacyPolicy,
  });
});
