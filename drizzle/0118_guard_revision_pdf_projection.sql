CREATE OR REPLACE FUNCTION public.guard_legacy_proposal_commercial_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_status public.proposal_revision_status;
  current_revision_number integer;
  current_pdf_reference text;
  current_document_hash text;
  safe_pdf_projection boolean := false;
BEGIN
  SELECT revision.status,
         revision.revision_number,
         revision.pdf_document_reference,
         revision.document_hash
    INTO current_status,
         current_revision_number,
         current_pdf_reference,
         current_document_hash
    FROM public.proposal_revisions AS revision
   WHERE revision.proposal_id = OLD.id
   ORDER BY revision.revision_number DESC
   LIMIT 1;

  safe_pdf_projection := COALESCE(
    current_revision_number IS NOT NULL
    AND current_pdf_reference IS NOT NULL
    AND current_document_hash IS NOT NULL
    AND NEW.revision_number = current_revision_number
    AND NEW.revised_pdf_url = current_pdf_reference,
    false
  );

  IF current_status IN ('SENT', 'VIEWED', 'ACCEPTED') AND (
    OLD.system_size_kwp IS DISTINCT FROM NEW.system_size_kwp OR
    OLD.panel_count IS DISTINCT FROM NEW.panel_count OR
    OLD.total_price IS DISTINCT FROM NEW.total_price OR
    OLD.monthly_savings IS DISTINCT FROM NEW.monthly_savings OR
    OLD.payback_period IS DISTINCT FROM NEW.payback_period OR
    OLD.service_items IS DISTINCT FROM NEW.service_items OR
    OLD.service_fees IS DISTINCT FROM NEW.service_fees OR
    OLD.selected_financing_id IS DISTINCT FROM NEW.selected_financing_id OR
    OLD.erpnext_quotation_id IS DISTINCT FROM NEW.erpnext_quotation_id OR
    OLD.pdf_url IS DISTINCT FROM NEW.pdf_url OR
    (
      OLD.revised_pdf_url IS DISTINCT FROM NEW.revised_pdf_url
      AND NOT safe_pdf_projection
    )
  ) THEN
    RAISE EXCEPTION 'Commercial mutation requires a new proposal revision'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS legacy_proposal_commercial_immutability ON public.proposals;
CREATE TRIGGER legacy_proposal_commercial_immutability
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_legacy_proposal_commercial_mutation();
