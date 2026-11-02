# Review Inbox

### 🔔 [SDUX-006] Customer privacy consent contract
- **Why you need to see this**: This records customer consent preferences through the privacy API and guest-session identity contract.
- **Files Changed**: `src/components/layout/CookieBanner.tsx`, `src/lib/privacyConsentClient.ts`, `src/lib/privacyConsentClient.test.ts` (`9a6d36c`)
- **Verification**: Passed (`npm run typecheck`, `npm run test`, `npm run lint` with existing warnings)
- **Key Decision / Risk**:
  - One COOKIE record stores necessary, functional, analytics, and marketing choices.
  - Guest reads carry the session in `x-privacy-session`; the write path was not re-run because it records consent audit events.

### 🔔 [SDUX-007] Production build environment validation
- **Why you need to see this**: The Docker production build now requires deployment inputs and validates the Server Actions encryption key before embedding it.
- **Files Changed**: `scripts/validate-production-build-env.mjs`, `src/lib/productionBuildEnv.test.ts`, `Dockerfile` (`cb3e20e`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate:production-env`, hosted production-image CI)
- **Key Decision / Risk**:
  - Accepts canonical Base64 AES keys of 16, 24, or 32 bytes; validation errors omit key values.
  - Production builds still require their configured persistent key.

### 🔔 [SDUX-008] Isolate pull request builds from production secrets
- **Why you need to see this**: PR builds no longer pass the production Server Actions key into builds that execute branch-controlled code.
- **Files Changed**: `.github/workflows/ci.yml` (`9d54c20`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run verify:standalone`, workflow YAML parse, hosted production-image CI)
- **Key Decision / Risk**:
  - PR builds use a masked, per-run 32-byte key shared only by that run's build steps.
  - Production key configuration is still required for actual deployments.

### 🔔 [SDUX-011] Keyboard-accessible proposal signing
- **Why you need to see this**: Adds typed-name PNG signing as an alternative accepted by the official proposal-signing endpoint.
- **Files Changed**: `src/components/CustomerPortal/SignaturePad.tsx`, `src/components/proposals/detail/ProposalSignatureModal.tsx`, `src/lib/signaturePadData.ts`, `messages/en.json`, `messages/th.json` (`3945e4e`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint` with existing warnings, `npm run test` (30/30), `npm run i18n:check`, `git diff --check`)
- **Key Decision / Risk**:
  - Typed names use the existing `POST /api/quotations/sign` request and payload.
  - Legal owners should confirm typed-name signatures meet the intended consent requirements.

### 🔔 [SDUX-010] Proposal publication and lifecycle hardening
- **Why you need to see this**: This changes quotation schema, customer-visible publication rules, signing, and webhook replay handling.
- **Files Changed**: `drizzle/0114_quotation_read_models.sql`, `src/server/api/quotations/sign/route.ts`, `src/server/api/proposals/[proposalId]/native-pdf/route.ts`, `src/server/services/sales/quotation-acceptance-service.ts` (`50fa624`)
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test` (35/35), `npm run i18n:check`, `npm run build:cloudflare`); migrations were not applied.
- **Key Decision / Risk**:
  - Customer-visible totals, files, and signatures bind to sent or accepted revisions and canonical hashes.
  - Migrations 0111 and 0114–0119 need staging validation before production; static review found no P0/P1 lifecycle regressions.

### 🔔 [SDUX-012] Staff full-tree lint memory limit
- **Why you need to see this**: The Staff repository-wide lint command exhausted Node’s heap at 4GB, 6GB, and 8GB.
- **Files Changed**: `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/auth/AuthSplitLayout.tsx`, `src/components/auth/AuthModal.tsx`, `src/app/[locale]/globals.css` (`e459bef`)
- **Verification**: Passed (`npm run typecheck`, `npm run test` (14/14), targeted `npx eslint` on changed TSX files, `npm run build:cloudflare`); full-tree lint did not complete.
- **Key Decision / Risk**:
  - Changed TSX files pass ESLint directly and the production build succeeds.
  - Full repository lint needs chunked execution or a repository memory fix.
