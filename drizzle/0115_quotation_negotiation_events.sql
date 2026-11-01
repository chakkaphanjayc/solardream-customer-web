CREATE TABLE IF NOT EXISTS public.quotation_negotiation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
  revision_id uuid REFERENCES public.proposal_revisions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  actor_user_id text REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('CUSTOMER_CHANGE_REQUEST','CUSTOMER_MESSAGE','STAFF_MESSAGE','STAFF_COUNTER_OFFER','REVISION_ISSUED','ACCEPTANCE_RECORDED')),
  source text NOT NULL DEFAULT 'PORTAL',
  visibility text NOT NULL DEFAULT 'CUSTOMER' CHECK (visibility IN ('CUSTOMER','INTERNAL')),
  message text NOT NULL,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotation_negotiation_events_proposal_created_idx
  ON public.quotation_negotiation_events(proposal_id, created_at);

CREATE INDEX IF NOT EXISTS quotation_negotiation_events_revision_idx
  ON public.quotation_negotiation_events(revision_id);

CREATE UNIQUE INDEX IF NOT EXISTS quotation_negotiation_events_idempotency_partial_key
  ON public.quotation_negotiation_events(proposal_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
