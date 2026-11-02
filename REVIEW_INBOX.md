# Review Inbox

### 🔔 [SDUX-010] Proposal publication and lifecycle hardening
- **Why you need to see this**: This changes quotation schema, customer-visible publication rules, signing, and webhook replay handling.
- **Files Changed**: `drizzle/0114_quotation_read_models.sql`, `src/server/api/quotations/sign/route.ts`, `src/server/api/proposals/[proposalId]/native-pdf/route.ts`, `src/server/services/sales/quotation-acceptance-service.ts` (`50fa624`).
- **Verification**: Passed (`npm run typecheck`, `npm run lint`, `npm run test` (35/35), `npm run i18n:check`, `npm run build:cloudflare`); migration execution was not run.
- **Key Decision / Risk**:
  - Customer-visible totals, files, and signatures bind to sent or accepted revisions and their canonical hashes.
  - Migrations 0111 and 0114–0119 were added and build-tested but not applied to staging or production; the independent static review found no P0/P1 lifecycle regressions.

### 🔔 [SDUX-012] Staff full-tree lint memory limit
- **Why you need to see this**: The repository-wide Staff lint command exhausted Node’s heap at 4GB, 6GB, and 8GB, while direct lint on the changed auth files passed.
- **Files Changed**: `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/auth/AuthSplitLayout.tsx`, `src/components/auth/AuthModal.tsx`, `src/app/[locale]/globals.css` (`e459bef`).
- **Verification**: Passed (`npm run typecheck`, `npm run test` (14/14), targeted `npx eslint` on changed TSX files, `npm run build:cloudflare`); full-tree `npm run lint` did not complete after three heap retries.
- **Key Decision / Risk**:
  - The edited TypeScript components pass ESLint directly and the production build succeeds.
  - Full repository lint needs chunking or a repository-level memory fix before it can be relied on in this environment.
