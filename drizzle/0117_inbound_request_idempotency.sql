ALTER TABLE public.inbound_requests
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS idempotency_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS inbound_requests_idempotency_key
  ON public.inbound_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
