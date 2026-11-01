DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.quotation_acceptances AS acceptance
      JOIN public.signature_envelopes AS envelope
        ON envelope.id = acceptance.signature_envelope_id
     WHERE envelope.revision_id <> acceptance.revision_id
  ) THEN
    RAISE EXCEPTION 'Quotation acceptance rows reference a signature envelope from a different revision';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS signature_envelopes_id_revision_key
  ON public.signature_envelopes(id, revision_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'quotation_acceptances_envelope_revision_fk'
       AND conrelid = 'public.quotation_acceptances'::regclass
  ) THEN
    ALTER TABLE public.quotation_acceptances
      ADD CONSTRAINT quotation_acceptances_envelope_revision_fk
      FOREIGN KEY (signature_envelope_id, revision_id)
      REFERENCES public.signature_envelopes(id, revision_id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
