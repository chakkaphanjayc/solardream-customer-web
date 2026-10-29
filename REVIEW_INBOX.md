# Review Inbox

### 🔔 [SDUX-006] Cookie consent API contract alignment
- **Why you need to see this**: The cookie banner now submits preference records using the strict privacy consent API schema and guest session identity contract.
- **Files Changed**: `src/components/layout/CookieBanner.tsx`, `src/lib/privacyConsentClient.ts`, `src/lib/privacyConsentClient.test.ts` (9a6d36c49db8c2ea8a7566e10e9769f6f719618e)
- **Verification**: Passed (`npm run typecheck`, `npm run test` with 17/17 passing, `npm run lint` with existing warnings).
- **Key Decision / Risk**:
  - A single `COOKIE` record stores explicit necessary, functional, analytics, and marketing choices; guest reads carry the session in `x-privacy-session`.
  - [Customer PR #1](https://github.com/chakkaphanjayc/solardream-customer-web/pull/1) is open; author approval is blocked by GitHub. The browser POST was not re-run because it writes consent audit records.
