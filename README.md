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
npm run i18n:check
npm run build
npm run start:local
```

The production build requires `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and
`NEXT_DEPLOYMENT_ID`; the full environment contract is documented in
`.env.example`.

## Container

```bash
docker build -t solardream-customer-web:local .
docker run --rm --env-file .env -p 3100:3100 solardream-customer-web:local
```

The image exposes the Customer surface only. Production routing for
`solar-dream.org` must be changed separately after staging verification.

## Shared code

`packages/` is vendored at the current split revision so this repository can
build without the original monorepo. Changes to shared contracts, UI, auth
adapters, or observability must be synchronized with the Staff repository
until those packages are published from a dedicated shared repository.
