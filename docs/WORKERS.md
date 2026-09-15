# Customer event boundary

Customer routes enqueue durable communication and document events into the
shared PostgreSQL `integration_outbox`. The Customer repository does not own
the Staff worker processes; run `worker:documents` and
`worker:communications` from the Staff repository after configuring the
shared database and provider credentials.

The job schemas are vendored in `packages/contracts/src/workers.ts`. Run
`npm run test:worker-contract` to verify that this checkout stays compatible
with the Staff consumers.

Customer signing remains authenticated and server-only. Signature images,
signer metadata, and signing keys are not placed in outbox JSON until a
private document-service transport is introduced.
