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
root, set the build command to `npm run build` (it automatically selects the
OpenNext build when Workers Builds provides `WORKERS_CI=1`) or explicitly use
`npm run build:cloudflare`, and set the deploy command to `npx wrangler deploy`.
Keep the checked-in `wrangler.jsonc` in this repository so Wrangler targets
`.open-next/worker.js` instead of trying to auto-detect the original workspace.
Configure the following in the Cloudflare Workers Builds environment (they are
needed while `next build` inlines the browser bundle):

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- `NEXT_DEPLOYMENT_ID`

Configure server-only values such as `DATABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` as Worker runtime secrets as well. A value added
only to the Worker runtime is not available when Next.js inlines a
`NEXT_PUBLIC_*` variable during the build. Never commit `.env` or secrets.

Workers Builds variables are only available while the build is running; they
are not automatically exposed to the deployed Worker. Add the values needed
by server-rendered routes under the Worker’s **Runtime variables and secrets**
section, or set them with Wrangler before deploying:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put DISCOURSE_SSO_SECRET
npx wrangler secret put ERPNEXT_API_KEY
npx wrangler secret put ERPNEXT_API_SECRET
```

Do not leave `DATABASE_URL` as a plaintext Workers Builds variable. Move it
to a runtime secret and rotate the database password if it has already been
exposed in the Cloudflare dashboard.

Keep the public `NEXT_PUBLIC_*` values in the Workers Builds environment so
they are inlined into the browser bundle. `DISCOURSE_FORUM_URL` is checked in
as a non-secret Worker variable in `wrangler.jsonc`; the forum SSO secret must
still be configured as a runtime secret.

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
