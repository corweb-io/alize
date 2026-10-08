-- Split payments: an invoice can be settled by several payments (encaissements)
-- on different dates. Each payment's amount is attributed to the CPS
-- declaration period of its own date, instead of the whole invoice landing on
-- invoices.paid_at.
--
-- invoices.status / invoices.paid_at are kept in sync by trigger: the invoice
-- is 'paid' once its payments cover the total TTC, and paid_at is then the date
-- of the last payment (date of full settlement).

-- Lets invoice_payments reference (invoice_id, business_id) so a payment can
-- never point at another business's invoice.
ALTER TABLE invoices ADD CONSTRAINT invoices_id_business_id_key
  UNIQUE (id, business_id);

CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  paid_on DATE NOT NULL,
  payment_method TEXT,
  note TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (invoice_id, business_id)
    REFERENCES invoices (id, business_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments (invoice_id);
CREATE INDEX idx_invoice_payments_business_paid_on ON invoice_payments (business_id, paid_on);

CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoice payments" ON invoice_payments FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert invoice payments" ON invoice_payments FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update invoice payments" ON invoice_payments FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete invoice payments" ON invoice_payments FOR DELETE
  USING (can_edit_business(business_id));

-- ---------------------------------------------------------------------------
-- Totals and status sync
-- ---------------------------------------------------------------------------

-- Total TTC as shown in the app (VAT is a flat 20% when applicable).
CREATE OR REPLACE FUNCTION invoice_total_ttc(p_invoice_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT ROUND(
    COALESCE(SUM(it.total_ht), 0) * CASE WHEN i.vat_applicable THEN 1.2 ELSE 1 END,
    2
  )
  FROM invoices i
  LEFT JOIN invoice_items it ON it.invoice_id = i.id
  WHERE i.id = p_invoice_id
  GROUP BY i.id, i.vat_applicable;
$$;

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

CREATE OR REPLACE FUNCTION invoice_payments_sync_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM sync_invoice_payment_status(OLD.invoice_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.invoice_id <> OLD.invoice_id OR NEW.amount <> OLD.amount OR NEW.paid_on <> OLD.paid_on) THEN
    PERFORM sync_invoice_payment_status(NEW.invoice_id);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER invoice_payments_sync
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION invoice_payments_sync_trigger();

-- Editing the lines of a paid invoice changes its total, hence its status.
CREATE OR REPLACE FUNCTION invoice_items_payment_sync_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM sync_invoice_payment_status(OLD.invoice_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM sync_invoice_payment_status(NEW.invoice_id);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER invoice_items_payment_sync
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION invoice_items_payment_sync_trigger();

-- ---------------------------------------------------------------------------
-- Backfill: one payment for the full amount of each paid invoice
-- ---------------------------------------------------------------------------

INSERT INTO invoice_payments (invoice_id, business_id, amount, paid_on, payment_method, created_by, created_at)
SELECT
  i.id,
  i.business_id,
  invoice_total_ttc(i.id),
  COALESCE(i.paid_at, i.invoice_date),
  i.payment_method,
  i.user_id,
  COALESCE(i.updated_at, NOW())
FROM invoices i
WHERE i.document_type = 'invoice'
  AND i.status = 'paid'
  AND invoice_total_ttc(i.id) > 0;
