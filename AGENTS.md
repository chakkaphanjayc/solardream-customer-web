# Multi-Agent Configuration: Next.js Ecosystem

# 1. Agent Roles & Specializations

## Agent A: [Architect] - Systems & Blueprint
- **Role**: Software Architect & Tech Lead.
- **Expertise**: Directory structures, security patterns, performance budget, and system workflows.
- **Responsibilities**: 
  - Reviews and approves step-by-step blueprints before execution.
  - Ensures clean separation between Server and Client components.
  - Finalizes directory mapping and TypeScript type strictness.

## Agent B: [Frontend UI/UX] - Client Interface
- **Role**: Senior Frontend Engineer.
- **Expertise**: React 18+, Tailwind CSS (mobile-first), BagUI (`anelkabag/bag-ui`), shadcn/ui, `react-icons`, and dynamic layouts.
- **Responsibilities**:
  - Implements UI presentation layers using **BagUI** (`https://github.com/anelkabag/bag-ui`, `https://bagui.pro`) as the primary component base and reference.
  - Builds responsive components in `components/ui/` and `components/features/`.
  - Integrates Zustand global state slices and local React hooks for interactivity.
  - Follows the `.agents/skills/bag-ui/SKILL.md` skill for all UI blocks, buttons, heroes, navbars, and bento cards.

## Agent C: [Backend & Mutation] - Server Operations
- **Role**: Core Backend Engineer (Next.js Runtime).
- **Expertise**: Node.js, Next.js Server Actions, Native Fetch, API Routes, Caching/Revalidation, and Data Mapping.
- **Responsibilities**:
  - Implements logic inside `actions/` and API endpoints.
  - Ensures strict runtime type validation (avoiding `any` at all costs).
  - Handles secure form submissions, error catching, and database/external service connectivity.

# 2. Multi-Agent Handshake & Workflow Protocol

When a new feature request is initiated, the agents must collaborate in this strict sequence:

1. **[Architect] Phase 1 - Analysis & Blueprint**:
   - Outlines the complete component tree.
   - Designates every file as either `'use server'` or `'use client'`.
   - Maps out folder distribution (`app/`, `components/`, `actions/`, etc.).

2. **[Backend] Phase 2 - Data & Logic Layer**:
   - Creates TypeScript interfaces (`types/`).
   - Implements Server Actions (`actions/`) or mock data structures.
   - Defines Zustand store models (`store/`).

3. **[Frontend] Phase 3 - Presentation Layer**:
   - Takes interfaces and logic from Phase 2.
   - Builds UI using **BagUI** patterns, Tailwind, and shadcn components.
   - Implements loading states (`loading.tsx`/Suspense) and error boundaries.

4. **[Architect] Phase 4 - Review & Consolidation**:
   - Checks code against global rules (Strict types, no placeholders).
   - Validates proper error handling and accessibility.

# 3. Output Directives & Communication
- Every agent must provide clean, production-ready, complete functional blocks.
- In autonomous runs, complete the phases in sequence without requesting confirmation between them. Record material risks for post-execution review.

## UI Component Base (BagUI)
- **Primary UI Base**: All UI components, sections, and blocks MUST use [BagUI](https://github.com/anelkabag/bag-ui) (`https://bagui.pro`) as the foundational base library and pattern reference.
- Consult `.agents/skills/bag-ui/SKILL.md` whenever adding, modifying, or refactoring UI elements.

## Icon convention

- Use `react-icons` for generic web UI icons in new work. Use `@/components/ui/icons` when an existing SolarDream icon name should be preserved.
- Retain custom artwork and exact product or third-party marks only when they are required by the product or provider.

# 4. Design Context (Impeccable & BagUI)
All agents MUST read and follow the visual style guide, branding, and strategic principles defined in:
- [PRODUCT.md](../SolarDream/PRODUCT.md) — Strategic rules, register, users, and voice.
- [DESIGN.md](../SolarDream/DESIGN.md) — Color tokens (Linen Ground, Nantucket Breeze), typography scales, and component guidelines.
- [BagUI SKILL.md](../SolarDream/.agents/skills/bag-ui/SKILL.md) — BagUI component registry mapping and implementation standards.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Autonomous Loop Standard

- Do not ask the user to approve routine implementation phases, verification, or local commits. Use reasonable engineering judgment and report material risks afterward.
- Run the repository verification commands after each queued task. The canonical commands are `npm run typecheck`, `npm run lint`, and `npm run test`.
- If verification fails, fix the task-owned changes and retry up to three times. If they still fail, revert only the task-owned files or hunks, record the failure in `REVIEW_INBOX.md`, and continue with the next independent task. Never run a broad `git checkout -- .` in a dirty worktree.
- Commit only task-owned changes. Leave pre-existing staged, unstaged, and untracked work untouched.
- Routine UI polish and refactoring are routine review items. Changes to auth/security, schema/migrations, payment/billing, public contracts, or core architecture must still be implemented and verified, then recorded in `REVIEW_INBOX.md` for human diff review.

## Customer UX Engineering Loop

- Treat `STATE.md` as the route-level UX backlog. Cover home, catalog/product detail, the solar wizard, proposals, profile, warranty/portal, works/gallery, financing, sign-in, and customer support.
- At the start of each run, read `PRODUCT.md`, `DESIGN.md`, the BagUI skill, and the applicable Next.js guide from `node_modules/next/dist/docs/`. Keep the Solar Atelier visual language and preserve route, data, API, and customer journey behavior.
- Complete one independent UI task per run. If the backlog is empty, audit one not-yet-covered route family, record concrete source evidence, and queue only actionable fixes. Do not make visual changes without a user-facing issue.
- Use semantic HTML, keyboard access, visible focus, clear error and empty states, reduced-motion support, and mobile-first layouts. Check the applicable WCAG 2.2 criteria and use 390px, 768px, and 1280px viewports for changed routes when runtime browsing is available.
- Keep Server Components as the default and interactive state at client leaves. Use the BagUI patterns and existing SolarDream tokens; do not add a parallel design system.
- After each task, run `npm run typecheck`, `npm run lint`, and `npm run test`; run route-level runtime checks for UI changes when the app can be started. Record checks actually performed.

## PR, Review, and Deployment Loop

- Work on an isolated feature branch. Review the diff, commit only task-owned files, push the branch, and create or update its pull request when repository authentication is available.
- Run the repository CI and inspect its result before reporting the task complete. Request an independent reviewer on the pull request when available; a self-review is not an approval.
- Never approve your own pull request, bypass required checks/reviews, or merge a feature branch to production. If GitHub authentication or reviewer access blocks a step, leave the change pushed when possible and record the blocker without broadening credential scopes.
- Pull request builds use Cloudflare Workers Builds for preview validation. Production deployment follows the configured Workers Builds production branch after an authorized merge; do not run `wrangler deploy` from a feature branch. Verify the resulting deployment status after the production merge.
