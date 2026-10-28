-- When the service was performed (a date or a period, e.g. "octobre 2026").
-- Required on invoices when it differs from the invoice date.
ALTER TABLE invoices ADD COLUMN service_period TEXT;
