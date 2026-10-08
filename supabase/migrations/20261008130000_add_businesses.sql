-- Multi-tenant: a user can own several businesses (legal entities), and a
-- business can later be shared with other users through business_members.
-- Business identity (name, address, banking, legal, fiscal) moves from
-- profiles to businesses; business data is scoped by business_id.
--
-- Existing profiles become one business each, reusing the profile id as the
-- business id so every existing row maps with business_id = user_id.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  banking_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  fiscal_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Only 'owner' is exposed in the UI for now; the other roles are ready for
-- invitations (accountant = read-only).
CREATE TABLE business_members (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'member', 'accountant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, user_id)
);

CREATE INDEX idx_business_members_user_id ON business_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER so policies don't recurse through
-- business_members RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION has_business_role(p_business_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role = ANY (p_roles)
  );
$$;

-- Roles allowed to create and edit business data.
CREATE OR REPLACE FUNCTION can_edit_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_business_role(p_business_id, ARRAY['owner', 'admin', 'member']);
$$;

REVOKE EXECUTE ON FUNCTION is_business_member(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION has_business_role(UUID, TEXT[]) FROM anon;
REVOKE EXECUTE ON FUNCTION can_edit_business(UUID) FROM anon;

-- Creates a business and its owner membership atomically (there is no INSERT
-- policy on businesses / business_members).
CREATE OR REPLACE FUNCTION create_business(
  p_company_name TEXT,
  p_fiscal_settings JSONB DEFAULT '{}'::jsonb,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO businesses (company_name, fiscal_settings, email, created_by)
  VALUES (
    NULLIF(TRIM(p_company_name), ''),
    COALESCE(p_fiscal_settings, '{}'::jsonb),
    p_email,
    auth.uid()
  )
  RETURNING id INTO new_id;

  INSERT INTO business_members (business_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END $$;

REVOKE EXECUTE ON FUNCTION create_business(TEXT, JSONB, TEXT) FROM anon;

-- ---------------------------------------------------------------------------
-- RLS on businesses / business_members
-- ---------------------------------------------------------------------------

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their businesses"
  ON businesses FOR SELECT
  USING (is_business_member(id));

CREATE POLICY "Owners and admins can update their businesses"
  ON businesses FOR UPDATE
  USING (has_business_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (has_business_role(id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners can delete their businesses"
  ON businesses FOR DELETE
  USING (has_business_role(id, ARRAY['owner']));

CREATE POLICY "Members can view memberships of their businesses"
  ON business_members FOR SELECT
  USING (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- Backfill: one business per existing profile, same id
-- ---------------------------------------------------------------------------

INSERT INTO businesses (
  id, company_name, address, phone, email, banking_info, legal_info,
  fiscal_settings, default_currency, created_by, created_at, updated_at
)
SELECT
  p.id,
  p.company_name,
  p.address,
  p.phone,
  p.email,
  COALESCE(p.banking_info, '{}'::jsonb),
  COALESCE(p.legal_info, '{}'::jsonb),
  COALESCE(p.fiscal_settings, '{}'::jsonb),
  COALESCE(p.default_currency, 'EUR'),
  p.id,
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM profiles p;

INSERT INTO business_members (business_id, user_id, role)
SELECT p.id, p.id, 'owner'
FROM profiles p;

COMMENT ON COLUMN profiles.company_name IS 'Deprecated: moved to businesses.';
COMMENT ON COLUMN profiles.banking_info IS 'Deprecated: moved to businesses.';
COMMENT ON COLUMN profiles.legal_info IS 'Deprecated: moved to businesses.';
COMMENT ON COLUMN profiles.fiscal_settings IS 'Deprecated: moved to businesses.';

-- ---------------------------------------------------------------------------
-- business_id on tenant tables
-- ---------------------------------------------------------------------------

ALTER TABLE clients ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE invoice_templates ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE cotisation_reserves ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE annual_obligations ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

UPDATE clients SET business_id = user_id;
UPDATE invoices SET business_id = user_id;
UPDATE invoice_templates SET business_id = user_id;
UPDATE cotisation_reserves SET business_id = user_id;
UPDATE annual_obligations SET business_id = user_id;

-- Transitional: lets the previous app version (which doesn't send
-- business_id) keep inserting into the user's original business while the
-- new version is deployed. Drop once the deploy is complete. The "a_" prefix
-- makes it fire before assign_*_reference (BEFORE triggers run in name order).
CREATE OR REPLACE FUNCTION legacy_default_business_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    NEW.business_id := NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER a_legacy_default_business_id_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION legacy_default_business_id();
CREATE TRIGGER a_legacy_default_business_id_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION legacy_default_business_id();
CREATE TRIGGER a_legacy_default_business_id_trigger
  BEFORE INSERT ON invoice_templates
  FOR EACH ROW EXECUTE FUNCTION legacy_default_business_id();
CREATE TRIGGER a_legacy_default_business_id_trigger
  BEFORE INSERT ON cotisation_reserves
  FOR EACH ROW EXECUTE FUNCTION legacy_default_business_id();
CREATE TRIGGER a_legacy_default_business_id_trigger
  BEFORE INSERT ON annual_obligations
  FOR EACH ROW EXECUTE FUNCTION legacy_default_business_id();

ALTER TABLE clients ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE invoice_templates ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE cotisation_reserves ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE annual_obligations ALTER COLUMN business_id SET NOT NULL;

-- user_id now means "created by"; default it so callers only send business_id.
ALTER TABLE clients ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoice_templates ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE cotisation_reserves ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE annual_obligations ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Uniqueness is per business, not per user.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_reference_key;
ALTER TABLE clients ADD CONSTRAINT clients_business_id_reference_key
  UNIQUE (business_id, reference);
-- Lets invoices reference (client_id, business_id) so an invoice can never
-- point at another business's client.
ALTER TABLE clients ADD CONSTRAINT clients_id_business_id_key
  UNIQUE (id, business_id);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_user_id_reference_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_business_id_reference_key
  UNIQUE (business_id, reference);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_business_id_fkey
  FOREIGN KEY (client_id, business_id)
  REFERENCES clients (id, business_id)
  ON DELETE CASCADE;

ALTER TABLE cotisation_reserves
  DROP CONSTRAINT IF EXISTS cotisation_reserves_user_id_period_key_key;
ALTER TABLE cotisation_reserves ADD CONSTRAINT cotisation_reserves_business_id_period_key_key
  UNIQUE (business_id, period_key);

ALTER TABLE annual_obligations
  DROP CONSTRAINT IF EXISTS annual_obligations_user_id_year_obligation_type_key;
ALTER TABLE annual_obligations ADD CONSTRAINT annual_obligations_business_id_year_obligation_type_key
  UNIQUE (business_id, year, obligation_type);

CREATE INDEX idx_invoices_business_id ON invoices (business_id, document_type);
CREATE INDEX idx_invoice_templates_business_id ON invoice_templates (business_id);

-- ---------------------------------------------------------------------------
-- Gapless, race-free references assigned at insert time
-- ---------------------------------------------------------------------------

-- Invoices must follow one continuous sequence per legal entity. Computing the
-- next number inside the INSERT under a per-business advisory lock avoids both
-- duplicates (concurrent MAX()+1) and gaps (a reserved number never used).
CREATE OR REPLACE FUNCTION assign_invoice_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
BEGIN
  IF NEW.reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  prefix := CASE WHEN NEW.document_type = 'quote' THEN 'D' ELSE 'F' END;

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

CREATE TRIGGER assign_invoice_reference_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION assign_invoice_reference();

CREATE OR REPLACE FUNCTION assign_client_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('clients:' || NEW.business_id::text, 0)
  );

  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '^C-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM clients
  WHERE business_id = NEW.business_id;

  NEW.reference := 'C-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END $$;

CREATE TRIGGER assign_client_reference_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION assign_client_reference();

-- Legacy RPCs used by the previous app version: legacy business id = user id.
CREATE OR REPLACE FUNCTION generate_invoice_reference(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT 'F-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(reference FROM '^F-(\d+)$') AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  FROM invoices
  WHERE business_id = p_user_id AND document_type = 'invoice';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION generate_quote_reference(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT 'D-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(reference FROM '^D-(\d+)$') AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  FROM invoices
  WHERE business_id = p_user_id AND document_type = 'quote';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION generate_client_reference(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT 'C-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(reference FROM '^C-(\d+)$') AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  FROM clients
  WHERE business_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- RLS on tenant tables: membership-based
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

CREATE POLICY "Members can view clients" ON clients FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert clients" ON clients FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update clients" ON clients FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete clients" ON clients FOR DELETE
  USING (can_edit_business(business_id));

DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

CREATE POLICY "Members can view invoices" ON invoices FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert invoices" ON invoices FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update invoices" ON invoices FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete invoices" ON invoices FOR DELETE
  USING (can_edit_business(business_id));

DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;

CREATE POLICY "Members can view invoice items" ON invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND is_business_member(invoices.business_id)
  ));
CREATE POLICY "Editors can insert invoice items" ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND can_edit_business(invoices.business_id)
  ));
CREATE POLICY "Editors can update invoice items" ON invoice_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND can_edit_business(invoices.business_id)
  ));
CREATE POLICY "Editors can delete invoice items" ON invoice_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
      AND can_edit_business(invoices.business_id)
  ));

DROP POLICY IF EXISTS "Users can view own templates" ON invoice_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON invoice_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON invoice_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON invoice_templates;

CREATE POLICY "Members can view templates" ON invoice_templates FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert templates" ON invoice_templates FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update templates" ON invoice_templates FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete templates" ON invoice_templates FOR DELETE
  USING (can_edit_business(business_id));

DROP POLICY IF EXISTS "Users can view own cotisation reserves" ON cotisation_reserves;
DROP POLICY IF EXISTS "Users can insert own cotisation reserves" ON cotisation_reserves;
DROP POLICY IF EXISTS "Users can update own cotisation reserves" ON cotisation_reserves;
DROP POLICY IF EXISTS "Users can delete own cotisation reserves" ON cotisation_reserves;

CREATE POLICY "Members can view cotisation reserves" ON cotisation_reserves FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert cotisation reserves" ON cotisation_reserves FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update cotisation reserves" ON cotisation_reserves FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete cotisation reserves" ON cotisation_reserves FOR DELETE
  USING (can_edit_business(business_id));

DROP POLICY IF EXISTS "Users can view own annual obligations" ON annual_obligations;
DROP POLICY IF EXISTS "Users can insert own annual obligations" ON annual_obligations;
DROP POLICY IF EXISTS "Users can update own annual obligations" ON annual_obligations;
DROP POLICY IF EXISTS "Users can delete own annual obligations" ON annual_obligations;

CREATE POLICY "Members can view annual obligations" ON annual_obligations FOR SELECT
  USING (is_business_member(business_id));
CREATE POLICY "Editors can insert annual obligations" ON annual_obligations FOR INSERT
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can update annual obligations" ON annual_obligations FOR UPDATE
  USING (can_edit_business(business_id))
  WITH CHECK (can_edit_business(business_id));
CREATE POLICY "Editors can delete annual obligations" ON annual_obligations FOR DELETE
  USING (can_edit_business(business_id));
