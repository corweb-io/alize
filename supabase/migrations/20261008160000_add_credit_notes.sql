-- Credit notes (avoirs): an issued invoice can't be deleted or edited, it is
-- cancelled by a credit note that has its own gapless numbering (A-000001)
-- and references the invoice it cancels. Credit notes share the invoices
-- table with document_type = 'credit_note'; their lines are the cancelled
-- invoice's lines with negative amounts.
--
-- Only full cancellation of an invoice without payments is supported:
-- turnover is cash-based (invoice_payments), so cancelling an unpaid invoice
-- has no effect on CPS turnover.

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_document_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_document_type_check
  CHECK (document_type IN ('invoice', 'quote', 'credit_note'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'accepted', 'declined', 'cancelled'));

-- NO ACTION (checked at end of statement) so deleting a client still cascades
-- to both the invoice and its credit note, while deleting the invoice alone fails.
ALTER TABLE invoices
  ADD COLUMN credited_invoice_id UUID REFERENCES invoices(id);

ALTER TABLE invoices ADD CONSTRAINT invoices_credit_note_link_check
  CHECK ((document_type = 'credit_note') = (credited_invoice_id IS NOT NULL));

CREATE UNIQUE INDEX invoices_credited_invoice_id_key
  ON invoices (credited_invoice_id)
  WHERE credited_invoice_id IS NOT NULL;

-- Credit notes get their own sequence (A-000001).
CREATE OR REPLACE FUNCTION assign_invoice_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
BEGIN
  IF NEW.reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  prefix := CASE NEW.document_type
    WHEN 'quote' THEN 'D'
    WHEN 'credit_note' THEN 'A'
    ELSE 'F'
  END;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('invoices:' || NEW.business_id::text || ':' || prefix, 0)
  );

  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '^' || prefix || '-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE business_id = NEW.business_id
    AND document_type = NEW.document_type;

  NEW.reference := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END $$;

-- A cancelled invoice keeps its status whatever happens to payments.
CREATE OR REPLACE FUNCTION sync_invoice_payment_status(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  payment_count INTEGER;
  paid_total NUMERIC;
  last_paid_on DATE;
  total NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0), MAX(paid_on)
  INTO payment_count, paid_total, last_paid_on
  FROM invoice_payments
  WHERE invoice_id = p_invoice_id;

  total := invoice_total_ttc(p_invoice_id);
  IF total IS NULL THEN
    RETURN; -- invoice deleted
  END IF;

  IF payment_count > 0 AND paid_total >= total THEN
    UPDATE invoices
    SET status = 'paid', paid_at = last_paid_on
    WHERE id = p_invoice_id
      AND document_type = 'invoice'
      AND status <> 'cancelled'
      AND (status IS DISTINCT FROM 'paid' OR paid_at IS DISTINCT FROM last_paid_on);
  ELSE
    -- Overdue is recomputed from due_date when the invoice is displayed.
    UPDATE invoices
    SET status = 'sent', paid_at = NULL
    WHERE id = p_invoice_id
      AND document_type = 'invoice'
      AND status = 'paid';
  END IF;
END $$;

-- Issues a credit note cancelling an invoice in one transaction. Runs with the
-- caller's rights, so RLS decides who may cancel.
CREATE OR REPLACE FUNCTION create_credit_note(
  p_invoice_id UUID,
  p_issue_date DATE DEFAULT CURRENT_DATE,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  inv invoices%ROWTYPE;
  new_id UUID;
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;

  IF NOT FOUND OR inv.document_type <> 'invoice' THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF inv.status = 'cancelled'
     OR EXISTS (SELECT 1 FROM invoices WHERE credited_invoice_id = inv.id) THEN
    RAISE EXCEPTION 'invoice_already_cancelled' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM invoice_payments WHERE invoice_id = inv.id) THEN
    RAISE EXCEPTION 'invoice_has_payments' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO invoices (
    business_id, user_id, document_type, version, client_id, client_reference,
    invoice_date, due_date, payment_method, currency, status, vat_applicable,
    vat_article, notes, credited_invoice_id
  )
  VALUES (
    inv.business_id, COALESCE(auth.uid(), inv.user_id), 'credit_note', '1.0',
    inv.client_id, inv.client_reference, p_issue_date, p_issue_date,
    inv.payment_method, inv.currency, 'sent', inv.vat_applicable,
    inv.vat_article, NULLIF(TRIM(p_reason), ''), inv.id
  )
  RETURNING id INTO new_id;

  INSERT INTO invoice_items (
    invoice_id, description, additional_info, start_date, end_date,
    unit_price_ht, quantity, total_ht, order_index
  )
  SELECT
    new_id, description, additional_info, start_date, end_date,
    -unit_price_ht, quantity, -total_ht, order_index
  FROM invoice_items
  WHERE invoice_id = inv.id;

  UPDATE invoices
  SET status = 'cancelled', paid_at = NULL
  WHERE id = inv.id;

  RETURN new_id;
END $$;

REVOKE EXECUTE ON FUNCTION create_credit_note(UUID, DATE, TEXT) FROM anon;
