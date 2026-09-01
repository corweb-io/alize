-- Date d'encaissement for CPS CA declarations (micro-social).
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at DATE;

UPDATE invoices
SET paid_at = invoice_date
WHERE status = 'paid'
  AND paid_at IS NULL;

COMMENT ON COLUMN invoices.paid_at IS
  'Date the invoice was paid (encaissement). Used to assign CA to a CPS declaration period.';
