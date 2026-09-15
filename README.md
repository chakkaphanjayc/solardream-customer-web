# SolarDream Customer Web

Standalone Customer App for `solar-dream.org`.

This repository is intentionally independent from the original `SolarDream`
monorepo. It contains a dereferenced copy of the Customer route tree and the
small shared packages required to build it. There are no symlinked source
files or `workspace:` dependencies.

## Local development

```bash
npm ci
cp .env.example .env
npm run dev:local
```

Open <http://localhost:3100/th>. Set the Supabase and server-only variables in
`.env` before testing authenticated flows or production builds.

## Verification and production build

```bash
npm run verify:standalone
npm run typecheck
npm run security:client-env
npm run i18n:check
npm run test:worker-contract
npm run build
npm run start:local
```

The production build requires `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and
`NEXT_DEPLOYMENT_ID`; the full environment contract is documented in
`.env.example`.

## Cloudflare Workers

This is a full-stack Next.js app. Deploy it as a Cloudflare Worker with
OpenNext; do not use the Cloudflare Pages static-export preset.

Local adapter verification:

```bash
npm run build:cloudflare
npx wrangler deploy --dry-run
npm run preview:cloudflare
```

For Cloudflare Workers Builds, use the standalone repository as the project
root, set the build command to `npm run build:cloudflare`, and set the deploy
command to `npx wrangler deploy`. Keep the checked-in `wrangler.jsonc` in this
repository so Wrangler targets `.open-next/worker.js` instead of trying to
auto-detect the original workspace. Set the required build-time and runtime
variables from `.env.example` in Cloudflare; never commit `.env` or secrets.

## Container

```bash
docker build -t solardream-customer-web:local .
docker run --rm --env-file .env -p 3100:3100 solardream-customer-web:local
```

The image exposes the Customer surface only. Production routing for
`solar-dream.org` must be changed separately after staging verification.

If a legacy Technician PWA was installed from the Customer origin, the
temporary recovery bridge remains disabled by default. Enable
`LEGACY_TECH_COMPAT_ENABLED=true` only during the documented cross-origin
recovery window and configure `STAFF_SYNC_INTERNAL_URL` to the Staff sync
endpoint.

Customer lifecycle routes may enqueue shared outbox jobs, but worker processes
are owned by the Staff repository. See [`docs/WORKERS.md`](docs/WORKERS.md).

## Shared code

`packages/` is vendored at the current split revision so this repository can
build without the original monorepo. Changes to shared contracts, UI, auth
adapters, or observability must be synchronized with the Staff repository
until those packages are published from a dedicated shared repository.
