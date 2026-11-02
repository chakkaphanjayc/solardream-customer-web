DO $$ BEGIN
  CREATE TYPE public.quotation_acceptance_status AS ENUM ('RECORDED','ORDER_PENDING','ORDER_CREATED','ORDER_FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quotation_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  revision_id uuid NOT NULL REFERENCES public.proposal_revisions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  signature_envelope_id uuid NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  erpnext_quotation_id text NOT NULL,
  source_document_hash text NOT NULL CHECK (source_document_hash ~ '^[0-9a-f]{64}$'),
  signed_document_hash text NOT NULL CHECK (signed_document_hash ~ '^[0-9a-f]{64}$'),
  signer_name text NOT NULL,
  signer_user_id text REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  verification_method text NOT NULL,
  verification_url text NOT NULL,
  accepted_at timestamptz NOT NULL,
  status public.quotation_acceptance_status NOT NULL DEFAULT 'RECORDED',
  provider_sales_order_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quotation_acceptances_revision_key
  ON public.quotation_acceptances(revision_id);
CREATE UNIQUE INDEX IF NOT EXISTS quotation_acceptances_signature_envelope_key
  ON public.quotation_acceptances(signature_envelope_id);
CREATE INDEX IF NOT EXISTS quotation_acceptances_proposal_status_idx
  ON public.quotation_acceptances(proposal_id, status);
CREATE INDEX IF NOT EXISTS quotation_acceptances_provider_order_idx
  ON public.quotation_acceptances(provider_sales_order_id);
