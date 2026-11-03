# Review Inbox

### 🔔 [SDUX-013] Accessible tracking-gallery previews
- **Why you need to see this**: Tracking evidence can now be opened from keyboard-operable, labeled gallery buttons, and its preview uses the shared dialog focus and dismissal behavior.
- **Files Changed**: `src/app/[locale]/my-proposal/[id]/tracking/TrackingGallery.tsx`, `messages/en.json`, `messages/th.json` (`1e342eb`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint` with zero errors and existing warnings, `npm run test` with 30/30 passing, `npm run i18n:check`, `git diff --check`, Next MCP tracking-route compilation with no issues).
- **Key Decision / Risk**:
  - Gallery buttons have localized, numbered names (including PDF type), visible focus, and reduced-motion-safe hover feedback. The shared dialog manages focus containment, Escape/outside dismissal, and focus return; image/PDF preview and new-tab links remain unchanged.
  - The dev server starts, but the tracking route renders the shared temporary-error page at 390x844, 768x1024, and 1280x800 because this worktree lacks `DATABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`. Gallery and dialog interactions were not verified in the browser.
  - PR #1 is open for this branch and will be updated by its push. `.github/workflows` contains only the CI workflow, and `gh` has no authenticated session, so no reviewer request was available.

### 🔔 [SDUX-012] Keyboard-accessible payment-slip uploads
- **Why you need to see this**: All three payment-slip picker variants are now reachable by keyboard and expose visible focus on the upload surface. Payment validation, APIs, and settlement behavior are unchanged.
- **Files Changed**: `src/app/[locale]/checkout/[id]/payment/OrderPaymentClient.tsx` (`5fb0b50`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint` with zero errors and existing warnings, `npm run test` with 30/30 passing, `git diff --check`, Next MCP route compilation with no issues).
- **Key Decision / Risk**:
  - The native file inputs remain associated with their existing labels and are visually hidden with `sr-only`; label focus rings make keyboard focus visible. Drag-and-drop, validation, and payment submission paths are unchanged.
  - The app starts, but the payment route renders a temporary error because this worktree lacks `DATABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`. Runtime interaction and the requested 390px, 768px, and 1280px checks remain unverified.
  - PR #1 is open, but no reviewer is requested, `.github` contains only the CI workflow, and `gh` has no authenticated session; a GitHub reviewer request is unavailable in this session.

### 🔔 [SDUX-011] Keyboard-accessible proposal signing
- **Why you need to see this**: Adds a typed-name PNG as an alternative signature method accepted by the official proposal-signing path.
- **Files Changed**: `src/components/CustomerPortal/SignaturePad.tsx`, `src/components/proposals/detail/ProposalSignatureModal.tsx`, `src/lib/signaturePadData.ts`, `messages/en.json`, `messages/th.json` (`3945e4e`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint` with existing warnings, `npm run test` with 30/30 passing, `npm run i18n:check`, `git diff --check`)
- **Key Decision / Risk**:
  - Typed names are rendered as PNG and use the existing `POST /api/quotations/sign` request and payload.
  - Legal owners should confirm typed-name signatures meet the intended consent requirements; runtime dialog behavior was not observed in this session.

### 🔔 [SDUX-006] Cookie consent API contract alignment
- **Why you need to see this**: The cookie banner now submits preference records using the strict privacy consent API schema and guest session identity contract.
- **Files Changed**: `src/components/layout/CookieBanner.tsx`, `src/lib/privacyConsentClient.ts`, `src/lib/privacyConsentClient.test.ts` (9a6d36c49db8c2ea8a7566e10e9769f6f719618e)
- **Verification**: Passed (`npm run typecheck`, `npm run test` with 17/17 passing, `npm run lint` with existing warnings).
- **Key Decision / Risk**:
  - A single `COOKIE` record stores explicit necessary, functional, analytics, and marketing choices; guest reads carry the session in `x-privacy-session`.
  - [Customer PR #1](https://github.com/chakkaphanjayc/solardream-customer-web/pull/1) is open; author approval is blocked by GitHub. The browser POST was not re-run because it writes consent audit records.

### 🔔 [SDUX-007] Restore production build environment validation
- **Why you need to see this**: The production Docker build now enforces deployment inputs and validates the Server Actions encryption key before embedding it in the build.
- **Files Changed**: `scripts/validate-production-build-env.mjs`, `src/lib/productionBuildEnv.test.ts` (`cb3e20e`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test` with 25/25 passing, `npm run validate:production-env`, `git diff --check`, hosted production-image CI run [40910356305](https://github.com/chakkaphanjayc/solardream-customer-web/actions/runs/40910356305)).
- **Key Decision / Risk**:
  - Accepts only canonical Base64 AES keys of 16, 24, or 32 bytes, matching Next.js; validation errors never print key values.
  - HTTP is accepted only for the loopback Supabase fixture currently used by CI.

### 🔔 [SDUX-008] Isolate pull request builds from the production key
- **Why you need to see this**: CI previously passed the production Server Actions encryption secret into builds that execute branch-controlled code.
- **Files Changed**: `.github/workflows/ci.yml` (`9d54c20`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test` with 25/25 passing, `npm run verify:standalone`, workflow YAML parse, hosted production-image CI run [40910356305](https://github.com/chakkaphanjayc/solardream-customer-web/actions/runs/40910356305)).
- **Key Decision / Risk**:
  - PR builds use a masked random 32-byte key shared only by that run's two build steps.
  - Production deployment builds still need their configured persistent key; this CI job does not validate that production secret.
