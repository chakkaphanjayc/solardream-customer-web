# SolarDream customer UI implementation plan

Status: active migration plan — current checkpoint: Phase 11 (final verification; canonical proposal fixture verified, broader private-route fixtures and legacy CSS cleanup remain)

Verification checkpoint (2026-09-18): representative Thai and English journeys
have been checked at 1440px and 430px, with the representative 390px pass
completed after hydration. A representative route matrix at 1280px, 1024px,
and 768px also completed without horizontal overflow. The broader 430px audit
covers marketing, guided, configuration, account, support, and utility routes;
checked routes have one main landmark, no horizontal overflow, and no browser
runtime errors after hydration, with external SSO/forum and authenticated record
shapes recorded as dependencies. The broader 430px matrix now includes cart,
quote, portal, warranty, support, and utility routes after hydration, and the
cart/quote client islands use a server page wrapper with an explicit runtime
metadata marker. Reduced-motion was checked on the Wizard. The confirmation
flow parser issue found during runtime verification is fixed, and the loading
Summary state now exposes a level-one heading. Build dependency guidance is
rendered through the shared `SolarDependencyNote` primitive, and Summary
disables the financial-report action when pricing is contact-only so an unknown
amount is never presented or exported as `฿0` through that UI path. Proposal,
payment, receipt, project-hub, and checkout-success surfaces now use explicit
pending-price states for missing or invalid amounts and suppress PromptPay
payload generation until a positive amount exists. The 25 kWp custom-price
permutation was exercised on mobile: the recommendation, Live Plan, blueprint,
and financial tab all show contact-only language with no visible zero-price
fallback. The same check now covers 1 kWp, and Summary impact, journey, and
add-on labels come from the locale catalogs. Unreachable legacy LINE/lead/
quotation modal branches were removed so the active inline consultation flow
is the only quote handoff.
The final recovery smoke also covers unauthenticated checkout payment and
success routes: both preserve the locale-aware login return path without
invoking protected payment actions, and the core 430px routes remain at one
main landmark with no overflow, app-error text, or Next issue overlay.
Profile proposal history and saved-build surfaces now use the shared Solar
surface contract, localized pending-price copy, and locale-preserving builder
links for authenticated account journeys. Guest proposal recovery now shares
the route shell/state contract, and the server-rendered project tracker uses
the read-only progress stepper, evidence panels, and pending quotation state.
The profile’s LINE linking instructions now use the locale catalogs for account
authorization, QR guidance, connection states, and confirmation copy. Summary
package names, tier labels, hardware profile cards, environmental units, and the
fallback battery add-on are also localized so the Thai route no longer exposes
English presentation strings in the primary review path.
The locale-aware 404 Solia asset is eager/priority-loaded because it is the
above-the-fold LCP, and redundant route-shell compatibility rules were removed
after confirming the actual BagUI wrapper hierarchy.
An existing open proposal fixture was reviewed through the guest dashboard at
1440px and 430px with the customer identifier redacted in the captured review;
the surface renders real proposal data without a zero-price fallback. Missing
`SERVICE_PORTAL_TOKEN_SECRET` now degrades only the optional service-order
lookup instead of taking down the proposal dashboard.
The public tracking route now uses the same semantic surface contract, localized
milestone labels, accessible progressbar, responsive Energy Line timeline, and
purposeful Solia checkpoint; the existing proposal fixture passed Thai 1440/430
and English 1024 visual/a11y review without horizontal overflow or browser errors.
The temporary external-access handoff now follows the same customer recovery
surface, localizes its loading/error/session/project copy in Thai and English,
maps common work statuses, and keeps invalid-token recovery at one main landmark
with no horizontal overflow or axe violations at 430px.
The customer portal shell and service workspace now resolve navigation, loading,
empty, error, and service-case status copy from the locale catalogs; portal
surfaces use the same fixed-header-safe spacing and semantic Solar palette.
The canonical proposal detail surface now uses the Future Manga semantic palette
through its quotation, payment, and project-progress panels, with Solia reserved
for review and progress guidance. Billing and progress states keep unknown
amounts pending, suppress fake zero totals and PromptPay payloads, and expose
localized payment, revision, and recovery copy. The existing open proposal
fixture was checked in Thai at 1440px/430px and English at 1024px, including
payment and progress tab interaction, with no horizontal overflow, raw namespace
text, or axe violations.
The Wizard and Support default hero copy are Thai-first while editable support
content remains intact when it differs from the shipped default. Summary's
energy chart now exposes a keyboard/screen-reader data table (24 rows for the
24-hour state), and its financial sliders and cash-flow table have semantic
labels/focusable overflow regions. A fresh 35-route Thai 430px smoke matrix
also passed with one main landmark, no horizontal overflow, and no visible
application-error state; this strengthens the public/unauthenticated route
evidence while private record fixtures remain a separate dependency.

Latest verification: `npm run typecheck`, `npm run i18n:check`,
`npm run i18n:content-check`, `npm run security:client-env`, `git diff --check`,
 full `npm run lint` (22/22 chunks, 1,060 files, 0 errors; existing warnings remain), and the browser/runtime
compilation and error checks pass. The i18n content fallback fixture now correctly
uses unsupported locale `zz`, and the parity check reports 5,281 aligned leaf
keys. The native customer `npm run build` was rerun after the latest external-access
localization changes and passed with Turbopack: it
compiled, passed TypeScript, generated 84/84 static pages, and completed route
optimization. The build's request-time boundaries use Next 16's
`instant = false` on auth/config/database/redirect routes and the cart/quote
client-island wrappers that cannot provide a static shell; locale metadata uses
an explicit Suspense-wrapped runtime marker. The hero Solia asset is served as
an optimized WebP with priority loading. Portal session recovery, proposal
hub, payment/checkout, checkout success, proposal tracking, and LINE callback
customer copy now use the locale catalogs; the server-rendered tracking surface
and token-based recovery state follow the same localized copy contract. The
authenticated asset register now uses the same opaque reading surfaces,
warranty status language, and milestone timeline treatment; its live records
still require an authenticated fixture. The shared MaintenanceView now keeps
disabled feature recovery copy locale-safe and clears the fixed product header.
Local dev now enables the same Cache
Components mode as production,
while Cloudflare retains its stable-cache
configuration.

The Works gallery's remaining warm field-notes/filter surfaces were moved onto
the semantic white/cool-white/navy palette and rechecked at 430px and 1440px;
the route now has no horizontal overflow, no browser errors, one `main`
landmark, and no axe violations. The success-state Solia greeting on Services
is explicitly eager/priority-loaded because it is the above-the-fold recovery
visual when that state is reached. The production build was rerun after these
final source changes and completed successfully, generating all 84 static pages.
The customer auth shell now uses the same opaque semantic account surfaces and
blue action hierarchy, with no backdrop blur on its form/header layers. Payment
and checkout-success now check the Supabase session before loading protected
server actions, preserve locale/query context in the login return path, and
convert ownership failures to the route's not-found boundary. Unauthenticated
payment and success routes were rechecked at 430px with no runtime error or
development issue overlay.

The customer compatibility layer now resolves legacy sand/cream aliases into
the white/cool-white, deep-navy, electric-blue semantic palette from
`ui-skill.md`; primary actions keep an explicit disabled treatment and the
global banner fallback is localized, claim-free, and locale-preserving. The
locale-aware 404 state now keeps one semantic main landmark, and project
tracking treats missing photo/component payloads as pending instead of fake
empty counts.

The hardcoded UI audit reports 378 candidates across 93 files; the remaining
matches are primarily admin/staff surfaces, technical labels, data/API values,
or JSX-handler false positives outside this customer migration scope.

Direction: **SolarDream Anime-Tech Product System** — a calm, premium solar
atelier where clean UI carries the task, Solar technology carries evidence,
Energy Line carries continuity, and Solia carries guidance and personality.

## Scope and invariants

- Migrate the entire customer-facing product, not only the marketing homepage.
- Preserve existing server actions, data contracts, routes, analytics, pricing,
  authentication, privacy behavior, and localized content.
- Keep Thai as the primary interface language for `/th`; keep technical English
  terms only where they improve comprehension.
- Keep real installation photography as proof. Generated art is reserved for
  purposeful Solia guidance and decorative, clearly illustrative visuals.
- Keep the intensity matched to the job: marketing expressive, Wizard guided,
  Build technical, Summary analytical, Project evidential, Account quiet.
- Use React Server Components by default and keep interactive state in leaf
  client components.

## Route inventory

| Family | Routes | Primary task | Migration target |
| --- | --- | --- | --- |
| Marketing | `/[locale]`, `/works`, `/blog`, `/blog/[slug]`, `/news`, `/news/[id]`, `/contact`, `/forum` | Understand SolarDream and explore proof | Public shell, editorial hierarchy, real project evidence |
| Guided flow | `/wizard`, `/wizard/summary`, `/consultation/confirmation` | Answer questions and review a recommendation | Stepper, choice cards, Solia guide, analytical summary |
| Configuration | `/build`, `/builder`, `/visualizer`, `/catalog`, `/catalog/[id]`, `/catalog/bundles`, `/cart` | Choose a system and equipment | Canonical selection language, Live Plan, action bar |
| Project | `/my-proposal/[id]/tracking`, `/project-tracker/[id]`, `/track`, `/track/[token]`, `/track/public/[id]`, `/portal/[proposalId]`, `/portal/projects/**`, `/portal/warranties/**`, `/portal/warranty`, `/portal/service` | Follow delivery, documents, warranty, and service | Project dossier, status language, safe empty/error states |
| Transaction | `/checkout/quote`, `/checkout/[id]/payment`, `/checkout/[id]/success`, `/proposals`, `/proposals/[id]`, `/proposals/[id]/registration`, `/warranty`, `/warranty/access/[token]` | Request, sign, pay, and register | Clear CTA hierarchy, secure handoff, milestone status |
| Account | `/login`, `/register`, `/forgot-password`, `/account/setup`, `/profile`, `/my-assets` | Authenticate and manage saved work | Quiet auth/account shell, accessible form states |
| Utility | `/verify-document`, `/line-callback`, `/external-access/[token]`, legal/privacy/terms pages | Verify, recover, or read policy information | Low-intensity utility layouts, explicit recovery |

API routes, server actions, admin routes, and staff/technician surfaces remain
out of this customer UI migration unless a shared primitive change affects
their contracts.

## Shared system contract

### Tokens

Add a single semantic SolarDream token layer in `src/app/[locale]/globals.css`:

- `sd-navy-950`, `sd-navy-900`, `sd-ink`, `sd-text`, `sd-muted`
- `sd-blue-600`, `sd-blue-500`, `sd-cyan-400`, `sd-cyan-100`
- `sd-yellow-400`, `sd-success`, `sd-warning`, `sd-danger`
- `sd-page`, `sd-raised`, `sd-soft-solar`, `sd-technical`, `sd-selected`,
  `sd-anime-highlight`
- `sd-radius-sm`, `sd-radius-md`, `sd-radius-lg`, `sd-radius-xl`,
  `sd-radius-panel`
- `sd-shadow-1` through `sd-shadow-4`
- `sd-space-xs` through `sd-space-2xl`

Existing legacy aliases remain temporarily for compatibility. New customer UI
must use semantic tokens and the legacy aliases are removed only after route
migration and visual regression.

### Canonical primitives

Reuse the local BagUI-derived primitives in `src/components/ui/`, then add or
consolidate:

- `SolarRouteShell` and `SolarRouteHeader`
- `SolarButton`, `SolarBadge`, `SolarPanel`, and `SolarChoiceCard`
- `SolarProgressStepper`
- `SolarLivePlanPanel`
- `SolarMetric`, `SolarDataGroup`, and `SolarStatus`
- `SoliaGuide`, `SoliaCallout`, `SoliaScene`, and `EnergyLine`
- `SolarEmptyState`, `SolarLoadingState`, `SolarErrorState`, and
  `SolarSuccessState`
- `SolarProjectDossier` and `SolarProjectDetail`

Every primitive must expose semantic HTML, visible focus, a 44px pointer target,
localized labels supplied by the route, and reduced-motion behavior where it
animates.

## Implementation phases

### Phase 0 — Full application audit

- [x] Enumerate customer-facing routes and families.
- [x] Identify existing route shells, BagUI primitives, Solia assets, and
  Energy Line implementation.
- [x] Record major route states and known constraints in this document.
- [~] Complete rendered inventory for every route family after the shared
  primitives land; representative public/recovery coverage is complete and
  authenticated record fixtures remain.

### Phase 1 — Global foundation

- [x] Add semantic SolarDream tokens without breaking legacy aliases.
- [x] Normalize font, body ground, focus rings, selection colors, radii, and
  elevation roles.
- [~] Make `SolarRouteShell` and `SolarRouteHeader` the default public journey
  foundation.
- [ ] Remove accidental glass/cream variations after dependent routes migrate.

### Phase 2 — Primitive components

- [x] Preserve and reuse local BagUI-derived button, card, dialog, sheet,
  badge, input, label, tabs, and accordion primitives.
- [~] Add canonical choice, status, metric, loading, empty, error, and success
  primitives with shared state language.
- [~] Replace clickable `div` selectors with button/radio/checkbox semantics.

### Phase 3 — Product components

- [x] Build one Live Plan panel used by Build and Summary handoff surfaces.
- [x] Build one progress stepper used by Wizard and Build.
- [~] Build one configuration action bar for desktop and mobile.
- [x] Build shared dependency messaging for options that become unavailable or
  relevant after a selection.

### Phase 4 — Solia and Energy Line

- [x] Establish `SoliaScene` and `EnergyLine` contracts.
- [x] Add purpose-built transparent `energyStudio` Solia asset for guidance.
- [~] Assign existing poses to route roles and remove decorative repetition.
- [~] Add contextual Solia guidance to Wizard, Build, Summary, quote, tracking,
  portal, and empty/error
  states without turning the product into a chatbot.

### Phase 5 — Wizard migration

- [~] Use the shared stepper and choice-card states.
- [x] Keep auto-scroll, tooltip, validation, add-on selection, analytics, and
  recommendation handoff intact.
- [x] Add short contextual Solia guidance and explain locked dependencies.

### Phase 6 — Build / Configurator migration

- [x] Standardize capacity, phase, inverter, and add-on selectors.
- [~] Keep the Live Plan visible on desktop and move it below configuration on
  mobile with a compact sticky CTA.
- [~] Preserve pricing, save, lead capture, and component selection behavior.

### Phase 7 — Summary / Analysis migration

- [~] Reorder into recommendation, energy behavior, financial outcome, system,
  environmental impact, and next action.
- [x] Separate zero from unknown values; never show placeholder zeros.
- [x] Keep charts analytical, with legend, touch/keyboard support, an accessible
  data-table alternative, and plain language explanation.

### Phase 8 — Portfolio / Project migration

- [~] Use real imagery and a project dossier visual hierarchy.
- [~] Keep technical annotations restrained and contextual.
- [x] Add inspiration-only language to project-derived CTAs.
- [x] Preserve project detail modal and gallery behavior.

### Phase 9 — Remaining customer routes

- [~] Migrate catalog, product detail, cart, checkout, quote, proposals, and
  warranty flows.
- [~] Migrate tracking, portal, service, account, authentication, legal, and
  utility routes.
- [~] Add route-level loading/error/empty/success states where missing.

### Phase 10 — Responsive and accessibility

- [~] Review 1440, 1280, 1024, 768, 430, and 390px.
- [~] Verify keyboard focus, labels, target sizes, screen-reader names,
  reduced motion, safe-area spacing, and no horizontal overflow.
- [~] Verify Thai and English copy for every migrated route; default Wizard and
  Support hero regressions are fixed, while editable/data-backed copy still
  needs fixture review.

### Phase 11 — Visual regression and cleanup

- [~] Capture representative screenshots at 1440×900, 1024×768, and 430×932
  for every route family; marketing and primary guided surfaces are captured,
  and the canonical proposal portal now has a real open-proposal fixture pass;
  other private data-backed surfaces still need fixtures.
- [~] Compare shared header, title, button, card, selected, status, Solia, and
  Energy Line treatments; token-based tracking recovery now uses the shared
  semantic shell and checkpoint timeline, while its ready state still needs a
  valid token fixture.
- [ ] Remove legacy CSS only after the route-level migration is verified; the
  remaining aliases are isolated compatibility selectors and still need a
  full private-route fixture pass before deletion.
- [x] Run typecheck, full lint, i18n parity/content, security checks, and the
  native production build; automated checks pass, while final private
  record-fixture review remains.

## Definition of done

A user can move through Home → Wizard → Recommendation → Build → Configuration
→ Summary → Quote → Tracking without feeling that the product changed design
systems. Marketing tells the story, Wizard guides, Build gives control, Summary
explains, Project proves, Quote converts, and Account supports. Every route has
an intentional responsive composition and recoverable loading/empty/error state
where its data model allows one.
