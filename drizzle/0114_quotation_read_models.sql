CREATE TABLE IF NOT EXISTS public.quotation_read_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
  revision_id uuid REFERENCES public.proposal_revisions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  erpnext_quotation_id text NOT NULL,
  status text NOT NULL,
  customer_name text,
  currency text NOT NULL DEFAULT 'THB',
  quotation_date text,
  valid_until text,
  subtotal numeric(18, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(18, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(18, 2) NOT NULL DEFAULT 0,
  grand_total numeric(18, 2) NOT NULL DEFAULT 0,
  items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  taxes_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_terms_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms text,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  provider_modified_at text,
  published_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_read_models_proposal_revision_key UNIQUE (proposal_id, revision_number)
);

CREATE INDEX IF NOT EXISTS quotation_read_models_provider_idx
  ON public.quotation_read_models(erpnext_quotation_id);

CREATE INDEX IF NOT EXISTS quotation_read_models_published_idx
  ON public.quotation_read_models(proposal_id, published_at);
