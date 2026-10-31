# Autonomous Work State

## 📋 Backlog (Auto-Queue)

- SDUX-011 (P1, important): Make proposal signing keyboard-accessible and preserve the drawn signature across resize/orientation changes with clear recovery feedback. Evidence: `src/components/CustomerPortal/SignaturePad.tsx`, `src/components/proposals/detail/ProposalSignatureModal.tsx`.
- SDUX-012 (P1, important): Make both payment-slip upload controls keyboard-operable without changing the payment API or settlement flow. Evidence: `src/app/[locale]/checkout/[id]/payment/OrderPaymentClient.tsx`.
- SDUX-013 (P1, routine): Give tracking gallery tiles button semantics and the image viewer proper dialog focus/close behavior. Evidence: `src/app/[locale]/my-proposal/[id]/tracking/TrackingGallery.tsx`.
- SDUX-014 (P2, routine): Associate quote-checkout labels with fields and show field-specific missing-input feedback in maintenance booking. Evidence: `src/app/[locale]/checkout/quote/QuoteCheckoutClient.tsx`, `src/app/[locale]/support/maintenance/PreventiveMaintenanceBooking.tsx`.
- SDUX-015 (P2, important): Announce payment and warranty loading, success, and error state changes to assistive technology without changing payment decisions. Evidence: `src/app/[locale]/checkout/[id]/payment/OrderPaymentClient.tsx`, `src/app/[locale]/portal/warranty/WarrantyCardClient.tsx`.
- SDUX-016 (P2, routine): Review low-contrast tracker and tracking labels against WCAG 2.2 and verify warranty status text on its actual background. Evidence: `src/app/[locale]/project-tracker/[id]/page.tsx`, `src/components/tracking/track-request-flow.module.css`, `src/app/[locale]/globals.css` (warranty status styles), `src/app/[locale]/portal/warranty/WarrantyCardClient.tsx`.

## ✅ Auto-Completed & Committed

- UXLOOP-001: Added route-family audit, one-task-per-run, CI, PR, review, and production-deployment rules to `AGENTS.md` and Cursor; registered the enabled weekday 09:00 Asia/Bangkok Orca automation on this PR worktree.
- SDUX-009: Scoped Solar Atelier primary actions to the DESIGN.md Nantucket fill with dark foreground, including hover and focus states. Runtime checks confirm the login primary action is 46px tall and powder blue with Abyss text; a representative Nantucket action measured 11.33:1 at rest and 9.67:1 on hover. `npm run typecheck`, `npm run lint`, and `npm run test` passed after implementation; wizard runtime checked at 390px, 768px, and 1280px with no horizontal overflow and axe reported 0 violations (1 contrast check incomplete due layered decoration).
- SDUX-010: Rebuilt the rooftop visualizer around a responsive canvas and settings flow, accessible keyboard controls, truthful empty-catalog behavior, and localized metadata. Fixed the catalog limit/filter order, nested button key handling, mobile target sizing, nested main landmark, and configured-planner heading. Commits `69554be`, `27b38f2`; `npm run typecheck`, `npm run lint` (existing warnings), `npm run test` (25/25), `npm run i18n:check`, and `git diff --check` passed. Runtime checked at 375px, 390px, 768px, and 1280px with no horizontal overflow.

- SDUX-005: Improved LINE CTA contrast and share control readability, focus indication, and 44px touch targets. Runtime-checked support and a share preview at 390px with no horizontal overflow. Commit `ab6c958`.
- SDUX-006: Aligned cookie preference reads and writes with the strict privacy consent API contract; added schema-backed tests. Commit `9a6d36c`.
- SDUX-007: Restored the production environment validator referenced by the Dockerfile and tested required build inputs and Server Actions AES key handling. `npm run typecheck`, `npm run lint`, `npm run test` (25/25), `npm run validate:production-env`, and hosted production-image CI passed. Commit `cb3e20e`.
- SDUX-008: Updated PR CI to create a masked, per-run AES key for build verification instead of passing a production secret into branch-controlled builds. Local checks and hosted production-image CI passed. Commit `9d54c20`.

- SDUX-001: Applied the Solar Atelier design system to the shared customer shell, typography, navigation, footer, cookie banner, and route surfaces. Commit `922b780`.
- SDUX-002: Restyled home, profile, proposal list, and proposal detail while preserving route and data behavior. Commit `922b780`.
- SDUX-003: Visually checked English desktop home and Thai mobile home at 390px, menu interaction, and signed-out profile/proposal redirects. Signed-in profile and proposal screens could not be observed in the available browser session. Commit `922b780`.
- SDUX-004: `npm run typecheck` passed; `npm run lint` passed with existing warnings; `npm run test` passed (16 tests). Commit `922b780`.
- Harness setup: documented canonical verification commands and autonomous worktree rules in `AGENTS.md`, added the always-on Cursor rule, and replaced the unavailable Jest test command with the repository's Node/tsx test discovery runner. Commit `922b780`.
- Initial scan found no actionable `TODO`, `FIXME`, or `XXX` markers in source; the `XXX` matches were phone and tracking-number examples.

## Route Family Coverage

- Home and shared shell: Prior Solar Atelier redesign; current source audit reviewed.
- Wizard: Rendered in Next.js at 390px, 768px, and 1280px; axe reported zero violations.
- Catalog: Runtime route shows its connection fallback because local database and Supabase configuration are unavailable.
- Profile and proposals: Source reviewed; signed-in and signature routes need runtime credentials/fixtures.
- Visualizer: English and Thai empty-catalog states rendered at 375px, 390px, 768px, and 1280px; one main landmark and no horizontal overflow. Configured canvas keyboard movement and deletion were also checked with a local-only product fixture.
- Checkout/payment, tracking, warranty/portal, and maintenance: Source-level QA backlog recorded; runtime checks need representative local data/session.
