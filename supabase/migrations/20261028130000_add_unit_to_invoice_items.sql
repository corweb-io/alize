-- Unit of a line's quantity, so documents can show "5,5 h" or "19 j"
-- instead of a bare number.
ALTER TABLE invoice_items
  ADD COLUMN unit TEXT NOT NULL DEFAULT 'unit'
    CHECK (unit IN ('unit', 'hour', 'day'));

-- Credit notes copy the unit of the lines they cancel.
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
    unit_price_ht, quantity, unit, total_ht, order_index
  )
  SELECT
    new_id, description, additional_info, start_date, end_date,
    -unit_price_ht, quantity, unit, -total_ht, order_index
  FROM invoice_items
  WHERE invoice_id = inv.id;

  UPDATE invoices
  SET status = 'cancelled', paid_at = NULL
  WHERE id = inv.id;

  RETURN new_id;
END $$;
