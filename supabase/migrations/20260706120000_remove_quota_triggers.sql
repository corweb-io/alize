-- Tier quotas disabled for now; drop enforcement triggers.
DROP TRIGGER IF EXISTS enforce_client_quota_trigger ON clients;
DROP TRIGGER IF EXISTS enforce_invoice_quota_trigger ON invoices;

DROP FUNCTION IF EXISTS enforce_client_quota();
DROP FUNCTION IF EXISTS enforce_invoice_quota();
