# SolarDream customer UI route inventory

Audit date: 2026-09-17

This inventory is the route-level companion to
[`CUSTOMER-UI-IMPLEMENTATION-PLAN.md`](./CUSTOMER-UI-IMPLEMENTATION-PLAN.md).
It records the user-facing surface, the interaction/data responsibility, the
shared UI contract, and the known state/QA boundary. API, staff, and admin
surfaces are intentionally excluded.

## Shared contract

- Public marketing routes use the editorial home/public header language.
- Product journeys use `SiteChrome` with `SolarRouteShell`/`PageShell`, the
  shared SolarDream tokens, semantic buttons/cards, and the compact product
  navigation.
- `L` = loading, `E` = empty, `X` = recoverable error, `S` = success. A state
  is only listed where the route's data model can produce it.
- Solia is purposeful guidance or recovery; real installation photography is
  used as proof on Works/Project surfaces. `EnergyLine` is the continuity
  motif for flow, system relationships, or technical annotation.
- Hydrated cart and quote screens keep their state in client leaves while a
  server page wrapper owns the route segment and intentional runtime metadata
  boundary.
- QA evidence currently covers representative Thai/English routes at
  1440/1280/1024/768/430/390px as recorded in the implementation plan. The
  live route smoke matrix also checks one main landmark, no horizontal overflow,
  and no browser error after hydration. The latest pass includes a fresh
  35-route Thai 430px smoke matrix across marketing, guided, commerce,
  tracking, support, portal empty states, auth/account, and legal surfaces,
  plus localized portal warranty/access, proposal recovery, and Visualizer
  checks. A route marked `dependency` is controlled by an
  external/authenticated system.

## Marketing

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]` | Understand SolarDream and start a system design; editorial landing | `SiteChrome` home mode, editorial sections, `MangaPanel`, `EnergyLine` | Hero CTA, workflow story, impact calculator, before/after, real project links | Solia hero/guide moments; Energy Line tells input → system → result; no data-dependent empty state | representative desktop/mobile visual pass |
| `/[locale]/works` | Inspect real installations; evidence gallery | `PageShell`, editorial gallery, `ProjectDetailModal` | Filter/gallery cards, modal, image lightbox, contextual CTA | Real photography, restrained technical annotation, blueprint Solia in dossier; S | representative desktop/mobile + modal/keyboard pass |
| `/[locale]/blog` | Browse product/design knowledge | `PageShell`, `PageHeader`, article cards | Article navigation and wizard CTA | Empty-safe server list; no mascot repetition; no chart | Thai/English index pass |
| `/[locale]/blog/[slug]` | Read one knowledge article and continue to design | `PageShell`, `EnergyLine`, semantic panels | Back link, related articles, wizard CTA | Blueprint Solia as contextual guide; Energy Line frames article evidence; X via `notFound` | four Thai detail slugs, English mobile, 1440 visual pass |
| `/[locale]/news` | Browse SolarDream news/guides | `PageShell`, `PageHeader`, content cards | Read article links and wizard CTA | L/E-safe content list; empty copy from `NewsPage`; no decorative overload | Thai/English mobile pass |
| `/[locale]/news/[id]` | Read a published news article | `PageShell`, article content, `notFound` guard | Back/read CTA | X for missing/unpublished article; optional content proof; no forced Solia | dynamic route source/visual pass |
| `/[locale]/contact` | Choose a contact path | `PageShell`, `SoliaGuide`, semantic CTA cards | Consultation, tracking, support links | Solia greeting as guide; S is represented by destination flows | Thai/English 1440/430 pass |
| `/[locale]/forum/[[...legacyPath]]` | Enter the community forum | redirect-only route | Discourse SSO handoff | `dependency`: external Discourse/SSO owns loading/error UI | redirect contract preserved; external availability not app-owned |

## Guided flow and analysis

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/wizard` | Answer progressive sizing questions | `SolarRouteShell`, shared stepper, `SolarChoiceCard`, `SoliaGuide` | Choice/radio/checkbox cards, slider, validation, add-ons, analytics, handoff | L/X in route fallback; Solia gives short contextual guidance; Energy Line tracks progress | Thai/English 1440/430/390, keyboard and state handoff pass |
| `/[locale]/wizard/summary` | Understand recommendation and adjust assumptions | `SolarRouteShell`, `SolarDecisionCard`, `SolarLivePlan`, tabs, `SolarStatePanel` | Package/energy/financial/impact tabs, sliders, add-ons, accessible cash-flow and chart data tables, quote/save/report actions, dialogs | L, unknown custom-price messaging, S/X feedback; low-intensity blueprint Solia; Energy Line/data flow | Thai/English 1440/430/390, tabs, 24-row chart table, labelled sliders, focusable cash-flow region, no-overflow/axe violations pass; 25 kWp and 1 kWp contact-price states show no visible `฿0`, pending payback, or enabled financial report; remaining missing-data shapes are fixture-dependent |
| `/[locale]/consultation/confirmation` | Confirm a consultation request and next action | `PageShell`, confirmation flow, semantic action cards | Tracking link, support/home actions | S success view, recoverable X; small celebrating Solia | Thai mobile axe/heading pass; full data-backed confirmation remains integration-dependent |

## Configuration and commerce

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/build` | Configure system capacity and architecture | `SolarRouteShell`, `SolarRouteHeader`, `SolarChoiceCard`, `BuildStepper`, `BuildLiveSummary`, `MobileActionBar` | Capacity, tier, phase, inverter, add-ons, battery sizing, lead form, estimate and CTA | Locked dependency message, contact-price state, L/X lead state; blueprint/guide Solia; Energy Line in plan relationship | Thai/English 1440/430/390, 44px CTA and no-overflow/axe pass |
| `/[locale]/builder` | Preserve legacy builder link | locale-preserving redirect to `/build` | Redirect only | Redirect error owned by Next/app shell | redirect contract verified |
| `/[locale]/visualizer` | Explore a technical system visualizer | dark `PageShell`, locked visualizer surface | Full-screen simulator overlay and controls | Technical surface; no unnecessary Solia; X handled by visualizer | viewport-lock route boundary; requires deeper visualizer-specific pass |
| `/[locale]/catalog` | Browse components | `PageShell`, `PageHeader`, `SolarStatePanel` | Product cards, filter/detail links | L/E/X with recovery; Solia helps recover empty/error catalog | Thai mobile axe pass; server catalog availability is dependency |
| `/[locale]/catalog/[id]` | Inspect one product | `PageShell`, product detail client | Product gallery/details, quote/cart CTA | X via `notFound`; no forced mascot | dynamic product data dependency |
| `/[locale]/catalog/bundles` | Compare curated bundles | `PageShell`, `PageHeader`, bundle cards | Bundle selection/detail/cart/quote links | E/X-safe product list; no decorative mascot repetition | Thai mobile contrast pass; product data dependency |
| `/[locale]/cart` | Review selected components | server page wrapper + `CartClient`, `PageShell`, `SolarStatePanel`, cart rows | Quantity/remove, continue to quote/checkout | L/E/X/S cart states; Solia invites a next step in empty state; runtime metadata marker preserves the hydrated client leaf | Thai/English 1440/430 pass; empty state has no browser errors; commerce data dependency |
| `/[locale]/checkout/quote` | Submit a quote request | server page wrapper + `QuoteCheckoutClient`, shared quote shell, `SolarChoiceCard`, `SoliaGuide`, location picker | Contact form, location, appointment, package/add-on selection | L/X/S quote states and validation; Solia calculates/guides; runtime metadata marker preserves the form client leaf | Thai/English 1440/430 pass; empty state has no browser errors; submit path requires backend fixture |
| `/[locale]/checkout/[id]/payment` | Pay an existing order | transaction `PageShell`, payment client | Payment form/provider handoff | X missing order, payment failure; S redirects to success | unauthenticated access now redirects to locale-aware login with preserved query context; auth/order/provider dependency |
| `/[locale]/checkout/[id]/success` | Confirm payment | `PageShell`, success client | Receipt/order next links | S, X/missing order via `notFound` | unauthenticated access now redirects to locale-aware login; auth/order/provider dependency |

## Project, tracking, and portal

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/track` | Find a request/project | `PageShell`, `SoliaGuide`, tracking form | Token/reference form and result link | L/X/recovery; Solia points to next step; Energy Line marks journey | Thai/English 1440/430 pass |
| `/[locale]/track/[token]` | Open token-based tracking | semantic tracking client/page, `SolarRouteShell` treatment, `SoliaGuide` | Token resolution, status updates, secure-link rotation, account claim | L/X/S owned by tracking client; Energy Line checkpoint timeline; `dependency` on token data | Thai 430/1440 expired-token recovery has one landmark, no overflow, and no axe violations; ready state still needs a valid token fixture |
| `/[locale]/track/public/[id]` | View public project progress | `PageShell`, semantic progressbar/timeline, `SoliaGuide`, localized `PublicTracking` catalog | Timeline/status, secure portal-link CTA | X missing/invalid project; Solia anchors the secure-access checkpoint; Energy Line connects milestone states | Existing proposal fixture: Thai 1440/430 and English 1024 visual/a11y/no-overflow pass; invalid reference remains a `notFound` dependency |
| `/[locale]/project-tracker/[id]` | Follow installation progress | `SolarRouteShell`, shared read-only `SolarProgressStepper`, evidence panels, `SoliaGuide` | Progress, documents, service/contact links | X/not-found, status states; Solia explains installation phase; real site photos remain evidence; missing quotation values stay pending | invalid route and representative mobile pass |
| `/[locale]/my-proposal/[id]/tracking` | Follow a proposal handoff | `PageShell`, timeline, `SoliaGuide` | Proposal stages, review CTA, documents | X/not-found; Solia explains site-survey handoff; Energy Line marks input → review | invalid route/mobile pass; authenticated fixture dependency |
| `/[locale]/portal/[proposalId]` | Enter a proposal portal | portal session exchange/client shell | Session exchange, proposal links | L/X/auth handoff; no duplicate shell; `dependency` on proposal session | unauthenticated/auth callback boundary |
| `/[locale]/portal/projects` | Review customer projects | portal shell, project cards | Project selection and status links | L/E/X/S where data model allows; quiet Solia only for recovery | unauthenticated and no-overflow pass; auth/data dependency |
| `/[locale]/portal/projects/[projectId]` | Inspect one project | portal shell, dossier/detail client | Timeline, docs, gallery/status actions | L/X/not-found; technical annotations remain restrained | auth/project fixture dependency |
| `/[locale]/portal/warranties` | Review warranties | portal shell, warranty cards | Warranty selection/detail links | L/E/X; status language is explicit | unauthenticated/mobile pass; auth/data dependency |
| `/[locale]/portal/warranty` | Review one warranty | portal shell, warranty detail client | Claim/service links, status | L/X/S where claim model allows | unauthenticated/error pass; auth/data dependency |
| `/[locale]/portal/service` | Follow a service request | localized portal shell, semantic service form/case panels | Ticket/status/contact actions | L/E/X/S; operational data stays restrained while Solia is reserved for loading/recovery | Thai/English disabled-state axe/no-overflow pass; enabled service data dependency |

## Proposals and warranty transactions

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/proposals` | Review owned proposals | `PageShell`, auth guard, proposal client | Proposal list/detail/register links | Auth redirect, L/E/X; quiet application tone | unauthenticated redirect preserves locale |
| `/[locale]/proposals/[id]` | Review a proposal | canonical `GuestProposalSignView`, semantic proposal panels, dialogs/forms | Access verification, quotation review/signing, revision request, milestone payment/proof, project progress, registration/payment links | Auth/guest access, X/not-found; Solia guides quotation review and project progress; unknown payment totals remain pending | Existing open-proposal fixture passed Thai 1440/430 and English 1024 tab interaction, no-overflow, browser-error, and axe-violation checks; broader authenticated records remain a dependency |
| `/[locale]/proposals/[id]/registration` | Register proposal details | `PageShell`, registration form | Address/contact/consent submission | L/X/S validation states | invalid route and mobile pass; backend dependency |
| `/[locale]/guest/proposals` | Open guest proposal handoff | `SolarRouteShell`, guest proposal client, `SolarStatePanel` | Magic access and proposal actions | L/X/S guest handoff; Solia protects recovery and account-linking moments; proposal prices and system sizes stay pending until confirmed | unauthenticated and existing open-proposal fixture visual pass at 1440/430 (identifier redacted); service-order lookup remains optional when its secret is not configured |
| `/[locale]/warranty` | Register/request warranty support | warranty request client, `SolarRouteShell` | Warranty form and support handoff | L/X/S; Solia is recovery/guide only | Thai mobile pass; backend/data dependency |
| `/[locale]/warranty/access/[token]` | Access guest warranty record | `SolarRouteShell`, `SolarStatePanel`-style disabled/error states | Token access, request/support actions | disabled/L/X/S; localized disabled state added; Solia explains recovery | invalid/feature-disabled route verified; token dependency |

## Account and authentication

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/login` | Sign in | auth layout, shared form/button primitives | Email/OAuth/LINE sign-in, next-path handoff | L/X/S; minimal brand guidance | Thai/English mobile pass; provider dependency |
| `/[locale]/register` | Create an account | auth layout, shared form/button primitives | Email/OAuth/LINE registration | L/X/S; minimal Solia if auth copy requires | Thai/English mobile pass; provider dependency |
| `/[locale]/forgot-password` | Recover account access | auth layout, form/state surfaces | Reset email form | L/X/S and validation; no decorative overload | Thai/English mobile pass |
| `/[locale]/account/setup` | Complete first-run profile | `PageShell`, account setup form | Profile fields and redirect target | Auth redirect, L/X/S | locale-preserving redirect verified; auth dependency |
| `/[locale]/profile` | Manage profile | `PageShell`, quiet account form | Profile/preferences/sign-out actions | Auth redirect, L/X/S | locale-preserving redirect verified; auth dependency |
| `/[locale]/my-assets` | Review saved designs/assets | `PageShell`, semantic asset/warranty cards, refund timeline, service-request modal | Search, warranty status, serial copy, service request, return/refund actions | Auth redirect, L/E/X; empty copy points to wizard; Solia remains reserved for recoverable states | locale-preserving redirect verified; asset/refund records require authenticated fixture |
| `/[locale]/auth/callback` | Complete provider callback | callback utility route | OAuth/OTP callback and next redirect | X/recovery owned by auth callback | provider dependency |
| `/[locale]/line-callback` | Complete LINE callback/linking | utility client, minimal shell | LIFF/profile/link polling | L/X/S with typed polling; no marketing decoration | targeted lint/typecheck and runtime callback branch pass; LINE dependency |

## Support and utility

| Route | User task / page type | Shell + shared UI | Interactions / data surfaces | States + Solia / Energy Line | QA boundary |
| --- | --- | --- | --- | --- | --- |
| `/[locale]/support` | Find after-sales help | `SolarRouteShell`, `SolarRouteHeader`, `SoliaGuide` | Search, categories, contact/track links | L/E/X; Solia guides recovery; quiet Energy Line optional | Thai mobile axe/no-overflow pass |
| `/[locale]/support/dashboard` | Enter support dashboard | `SolarRouteShell`, auth guard | Ticket/order links | Auth/L/E/X | unauthenticated redirect verified |
| `/[locale]/support/knowledge` | Search knowledge base | `SolarRouteShell`, `SolarRouteHeader` | GET search form, article links | E/X-safe search results | Thai/English mobile pass; content dependency |
| `/[locale]/support/maintenance` | Find maintenance help | redirect to services | Redirect only | dependency on service route | redirect preserved |
| `/[locale]/support/orders/[id]` | Review service order support | `PageShell`, auth guard, order client | Order status, support actions | Auth/L/X/not-found | auth/order fixture dependency |
| `/[locale]/services` | Choose service | `PageShell`, `SolarStatePanel`, semantic service surfaces | Service cards/contact links | disabled/L/E/X; localized MaintenanceView keeps Solia and recovery actions clear | Thai mobile axe/no-overflow pass; disabled state now clears the fixed header |
| `/[locale]/verify-document` | Verify a SolarDream document | `PageShell`, verification client | Code/ID form and result | L/X/S; low-intensity utility surface | Thai mobile pass; verification backend dependency |
| `/[locale]/external-access/[token]` | Open secure external handoff | localized utility client shell | Token/session exchange | L/X/S; no public data leakage | invalid-token Thai/English mobile pass; token dependency |
| `/[locale]/privacy` | Read privacy summary | `PageShell`, legal content | Internal policy links | static content; no mascot | Thai mobile axe pass |
| `/[locale]/terms` | Read terms summary | `PageShell`, legal content | Internal policy links | static content; no mascot | Thai mobile axe pass |
| `/[locale]/legal/privacy-policy` | Read full privacy policy | `PageShell`, sanitized legal content | Anchors/internal links | static content; no mascot | Thai mobile axe pass |
| `/[locale]/legal/terms-of-service` | Read full terms | `PageShell`, sanitized legal content | Anchors/internal links | static content; Solia mentioned only as legal IP content | Thai mobile axe pass |
| `/[locale]/legal/refund-policy` | Read refund policy | `PageShell`, sanitized legal content | Anchors/internal links | static content; no mascot | Thai mobile axe pass |

## Framework-level recovery surfaces

| Surface | Purpose | Shared treatment | QA boundary |
| --- | --- | --- | --- |
| `/[locale]/loading`, route `loading.tsx` files | Keep navigation and async data understandable | `SolarRouteShell`/`SolarRouteLoading`, semantic loading copy, optional chibi Solia only where useful | compile and representative navigation checks |
| `/[locale]/error`, `(auth)/error`, route `error.tsx` files | Recover from route errors | localized recovery action, `SolarStatePanel`/`SolarRouteShell`, no raw stack traces | invalid route and error-state checks |
| `/[locale]/not-found`, route `not-found.tsx` | Recover from missing records/routes | locale-aware not-found action and correct landmark ownership | invalid route checks have no duplicate landmarks |

## Open audit items

1. Complete screenshot-level review for every authenticated/data-backed route
   with representative fixtures; the public/unauthenticated 430px smoke matrix
   now covers 35 routes and browser evidence includes the guest proposal
   dashboard with an existing open proposal, but not every private project,
   portal, profile, payment, and saved-record shape.
2. Finish Summary financial hardening for every remaining missing-data
   permutation, then remove legacy CSS compatibility aliases only after those
   permutations are visually rechecked. The 25 kWp and 1 kWp contact-price
   paths now show no `฿0`; chart data-table and keyboard coverage are verified
   for the representative 24-hour state.
