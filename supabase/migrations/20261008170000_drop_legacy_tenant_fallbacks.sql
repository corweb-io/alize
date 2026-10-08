-- Cleanup after the multi-tenant rollout (20261008130000_add_businesses).
-- The app now always sends business_id and lets triggers assign references,
-- and business identity lives in businesses, so the transitional pieces kept
-- for the previous app version can go.

DROP TRIGGER IF EXISTS a_legacy_default_business_id_trigger ON clients;
DROP TRIGGER IF EXISTS a_legacy_default_business_id_trigger ON invoices;
DROP TRIGGER IF EXISTS a_legacy_default_business_id_trigger ON invoice_templates;
DROP TRIGGER IF EXISTS a_legacy_default_business_id_trigger ON cotisation_reserves;
DROP TRIGGER IF EXISTS a_legacy_default_business_id_trigger ON annual_obligations;
DROP FUNCTION IF EXISTS legacy_default_business_id();

DROP FUNCTION IF EXISTS generate_invoice_reference(UUID);
DROP FUNCTION IF EXISTS generate_quote_reference(UUID);
DROP FUNCTION IF EXISTS generate_client_reference(UUID);

-- Copied to businesses (same id) by 20261008130000; profiles is user-level now.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS banking_info,
  DROP COLUMN IF EXISTS legal_info,
  DROP COLUMN IF EXISTS fiscal_settings,
  DROP COLUMN IF EXISTS default_currency;
