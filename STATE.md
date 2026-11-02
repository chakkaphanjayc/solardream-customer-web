# Autonomous Work State

## 📋 Backlog (Auto-Queue)

- SDUX-012 (P1, important): Make both payment-slip upload controls keyboard-operable without changing the payment API or settlement flow. Evidence: `src/app/[locale]/checkout/[id]/payment/OrderPaymentClient.tsx`.
- SDUX-013 (P1, routine): Give tracking gallery tiles button semantics and the image viewer proper dialog focus/close behavior. Evidence: `src/app/[locale]/my-proposal/[id]/tracking/TrackingGallery.tsx`.
- SDUX-014 (P2, routine): Associate quote-checkout labels with fields and show field-specific missing-input feedback in maintenance booking. Evidence: `src/app/[locale]/checkout/quote/QuoteCheckoutClient.tsx`, `src/app/[locale]/support/maintenance/PreventiveMaintenanceBooking.tsx`.
- SDUX-015 (P2, important): Announce payment and warranty loading, success, and error state changes to assistive technology without changing payment decisions. Evidence: `src/app/[locale]/checkout/[id]/payment/OrderPaymentClient.tsx`, `src/app/[locale]/portal/warranty/WarrantyCardClient.tsx`.
- SDUX-016 (P2, routine): Review low-contrast tracker and tracking labels against WCAG 2.2 and verify warranty status text on its actual background. Evidence: `src/app/[locale]/project-tracker/[id]/page.tsx`, `src/components/tracking/track-request-flow.module.css`, `src/app/[locale]/globals.css` (warranty status styles), `src/app/[locale]/portal/warranty/WarrantyCardClient.tsx`.

## ✅ Auto-Completed & Committed

- SDUX-001: Applied the Solar Atelier design system to the shared customer shell, typography, navigation, footer, cookie banner, and route surfaces. Commit `922b780`.
- SDUX-002: Restyled home, profile, proposal list, and proposal detail while preserving route and data behavior. Commit `922b780`.
- SDUX-003: Visually checked English desktop home and Thai mobile home at 390px, menu interaction, and signed-out profile/proposal redirects. Signed-in profile and proposal screens could not be observed in the available browser session. Commit `922b780`.
- SDUX-004: `npm run typecheck`, `npm run lint` (existing warnings), and `npm run test` (16 tests) passed. Commit `922b780`.
- SDUX-005: Added the localized `/[locale]/projects` alias to the existing `/[locale]/works` gallery and improved LINE CTA/share control contrast, focus indication, and touch targets. Browser checks passed. Commits `1919928`, `ab6c958`.
- SDUX-006: Corrected low-contrast works-gallery text and Solar Atelier action foregrounds; aligned cookie preference reads and writes with the privacy consent API contract and added schema-backed tests. Commits `50fa624`, `9a6d36c`.
- SDUX-007: Added service-booking navigation and honest service tier labels; restored production build environment validation. Commits `50fa624`, `cb3e20e`.
- SDUX-008: Kept the mobile catalog comparison dock clear of cookie preferences; isolated PR builds from the production Server Actions key. Commits `50fa624`, `9d54c20`.
- SDUX-009: Raised shared mobile actions to 44px targets, replaced catalog alerts with inline status, fixed comparison price contrast, exposed one keyboard-accessible system-size slider, and aligned Solar Atelier primary actions with DESIGN.md. Commits `50fa624`, `69554be`.
- SDUX-010: Rebuilt the rooftop visualizer with a responsive canvas, accessible keyboard controls, truthful empty-catalog behavior, and localized metadata; implemented proposal publication/revision guards, signed-document hash binding, replay-safe ERPNext/webhook processing, and migrations 0111 and 0114–0119. Commits `69554be`, `27b38f2`, `50fa624`.
- SDUX-010 QA follow-up: Narrowed panel catalog matching, removed guessed specifications and pricing, queried panel categories alongside the general catalog, and aligned empty-state geometry and share metadata with DESIGN.md. Commit `013e9a9`.
- SDUX-011: Added keyboard-operated typed-name signing and normalized stroke coordinates; refined Staff login and registration focus, contrast, and responsive layout. Commits `3945e4e`, `e459bef`.
- UXLOOP-001: Added autonomous route-family audit, one-task-per-run, CI, PR, review, and deployment rules to `AGENTS.md` and Cursor; registered the enabled weekday 09:00 Asia/Bangkok Orca automation on the PR worktree.
- Customer verification before stacking: `npm run typecheck`, `npm run lint` (existing warnings), `npm run test` (35/35), `npm run i18n:check` (5,346 keys), and `npm run build:cloudflare` passed.
- Staff verification: `npm run typecheck`, `npm run test` (14/14), `npm run i18n:check` (4,325 keys), targeted ESLint on changed auth TSX files, and `npm run build:cloudflare` passed. Full-tree `npm run lint` exceeded Node heap at 4GB, 6GB, and 8GB; targeted lint passed.

## Route Family Coverage

- Home and shared shell: Solar Atelier redesign checked at desktop and mobile widths.
- Wizard: Rendered at 390px, 768px, and 1280px; axe reported zero violations.
- Catalog: Browser route displays its connection fallback when local database and Supabase configuration are unavailable; comparison and slider interactions were checked with browser fixtures.
- Profile and proposals: Source reviewed; signed-in views require runtime credentials or fixtures.
- Visualizer: English and Thai states rendered at 375px, 390px, 768px, and 1280px; no horizontal overflow. Configured keyboard movement and deletion checked with a local-only fixture.
- Proposal signature: Keyboard typed-name option, stroke-coordinate scaling, and submission recovery are covered by source review and unit tests; live dialog interaction was not rechecked in this session.
- Checkout/payment, tracking, warranty/portal, and maintenance: Source-level QA backlog recorded above; runtime checks need representative local data/session.

## 🚧 External Release Gates

- GitHub CLI is not authenticated; browser GitHub access is available for creating/updating PRs. A pull request author cannot approve their own PR, so a separate reviewer is required for approval.
- Customer migrations 0111 and 0114–0119 have not been applied to a database; validate them in staging before production deployment.
- Staff full-tree lint needs chunked execution or a repository-level memory fix; changed auth files pass targeted ESLint.
