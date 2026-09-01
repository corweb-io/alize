-- Seed data for local development review.
-- Targets lefrancmathis@gmail.com if that user exists in auth.users.
-- Safe to re-run: clears and re-inserts demo data for that user only.

DO $$
DECLARE
  uid UUID;
  c1 UUID := 'a1111111-1111-4111-8111-111111111101';
  c2 UUID := 'a1111111-1111-4111-8111-111111111102';
  c3 UUID := 'a1111111-1111-4111-8111-111111111103';
  c4 UUID := 'a1111111-1111-4111-8111-111111111104';
  i1 UUID := 'b2222222-2222-4222-8222-222222222201';
  i2 UUID := 'b2222222-2222-4222-8222-222222222202';
  i3 UUID := 'b2222222-2222-4222-8222-222222222203';
  i4 UUID := 'b2222222-2222-4222-8222-222222222204';
  i5 UUID := 'b2222222-2222-4222-8222-222222222205';
  i6 UUID := 'b2222222-2222-4222-8222-222222222206';
  i7 UUID := 'b2222222-2222-4222-8222-222222222207';
  i8 UUID := 'b2222222-2222-4222-8222-222222222208';
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'lefrancmathis@gmail.com';

  IF uid IS NULL THEN
    RAISE NOTICE 'User lefrancmathis@gmail.com not found — skipping seed. Log in once locally first.';
    RETURN;
  END IF;

  -- Clear existing demo data for this user
  DELETE FROM invoice_items
    WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = uid);
  DELETE FROM invoices WHERE user_id = uid;
  DELETE FROM clients WHERE user_id = uid;
  DELETE FROM cotisation_reserves WHERE user_id = uid;
  DELETE FROM invoice_templates WHERE user_id = uid;
  DELETE FROM subscriptions WHERE user_id = uid;

  -- Profile
  INSERT INTO profiles (
    id, email, company_name, address, phone,
    default_currency, banking_info, legal_info, fiscal_settings
  ) VALUES (
    uid,
    'lefrancmathis@gmail.com',
    'Mathis Lefranc — Conseil Digital',
    'Gustavia, 97133 Saint-Barthélemy',
    '+590 690 12 34 56',
    'EUR',
    jsonb_build_object(
      'bank_name', 'Banque Populaire Antilles',
      'RIB', '12345 67890 12345678901 23',
      'IBAN', 'FR76 1234 5678 9012 3456 7890 123',
      'BIC', 'BPAAFRPPXXX'
    ),
    jsonb_build_object(
      'company_type', 'Micro-Entreprise',
      'siret', '978 934 560 00019',
      'siren', '978 934 560',
      'rcs', 'Basse-Terre',
      'ape_naf', '6201Z',
      'tva_number', '',
      'service_type', 'Prestation de services informatiques',
      'late_payment_notice', 'En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 euros sera exigée (Décret n°2012-1115 du 2 octobre 2012).'
    ),
    jsonb_build_object(
      'activity_start_date', '2024-01-15',
      'activity_type', 'prestations_bnc',
      'declaration_frequency', 'quarterly',
      'versement_liberatoire', false
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_name = EXCLUDED.company_name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    default_currency = EXCLUDED.default_currency,
    banking_info = EXCLUDED.banking_info,
    legal_info = EXCLUDED.legal_info,
    fiscal_settings = EXCLUDED.fiscal_settings,
    updated_at = NOW();

  -- Pro subscription (bypasses free-tier quotas)
  INSERT INTO subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
    plan, status, current_period_end, cancel_at_period_end
  ) VALUES (
    uid,
    'cus_seed_local_demo',
    'sub_seed_local_demo',
    'price_seed_pro_monthly',
    'pro',
    'active',
    NOW() + INTERVAL '30 days',
    false
  );

  -- Clients
  INSERT INTO clients (id, user_id, reference, name, address) VALUES
    (c1, uid, 'C-000001', 'Villa Eden Properties', 'Lorient, Saint-Barthélemy'),
    (c2, uid, 'C-000002', 'St Barth Yacht Services', 'Gustavia Harbour, Saint-Barthélemy'),
    (c3, uid, 'C-000003', 'Hôtel Le Barthélemy', 'Grand Cul-de-Sac, Saint-Barthélemy'),
    (c4, uid, 'C-000004', 'Caribbean Consulting Ltd', 'Gustavia, Saint-Barthélemy');

  -- Invoices (mixed statuses, spread across 2026 for cotisation tracking)
  INSERT INTO invoices (
    id, user_id, reference, client_id, client_reference,
    invoice_date, due_date, paid_at, payment_method, currency, status,
    vat_applicable, vat_article, notes
  ) VALUES
    (i1, uid, 'F-000001', c1, 'C-000001', '2026-01-20', '2026-02-19', '2026-01-28', 'Virement', 'EUR', 'paid', false, NULL, 'Maintenance site web — T1'),
    (i2, uid, 'F-000002', c2, 'C-000002', '2026-02-10', '2026-03-12', '2026-02-20', 'Virement', 'EUR', 'paid', false, NULL, 'Intégration API réservations'),
    (i3, uid, 'F-000003', c1, 'C-000001', '2026-04-05', '2026-05-05', '2026-04-18', 'Virement', 'EUR', 'paid', false, NULL, 'Refonte UX — avril'),
    (i4, uid, 'F-000004', c3, 'C-000003', '2026-05-15', '2026-06-14', '2026-05-30', 'Virement', 'EUR', 'paid', false, NULL, 'Dashboard analytics hôtelier'),
    (i5, uid, 'F-000005', c4, 'C-000004', '2026-06-10', '2026-07-10', '2026-06-25', 'Virement', 'EUR', 'paid', false, NULL, 'Audit sécurité application'),
    (i6, uid, 'F-000006', c1, 'C-000001', '2026-06-18', '2026-07-18', NULL, 'Virement', 'EUR', 'sent', false, NULL, 'Support mensuel — juin'),
    (i7, uid, 'F-000007', c2, 'C-000002', '2026-03-01', '2026-03-31', NULL, 'Virement', 'EUR', 'overdue', false, NULL, 'Correctifs booking engine'),
    (i8, uid, 'F-000008', c3, 'C-000003', '2026-06-22', '2026-07-22', NULL, 'Virement', 'EUR', 'draft', false, NULL, 'Projet app mobile — brouillon');

  -- Invoice line items (HT totals drive cotisation calculations)
  INSERT INTO invoice_items (invoice_id, description, additional_info, unit_price_ht, quantity, total_ht, order_index) VALUES
    (i1, 'Maintenance et hébergement web', 'Janvier 2026', 3500.00, 1, 3500.00, 0),
    (i1, 'Support technique', '2 interventions', 350.00, 2, 700.00, 1),
    (i2, 'Développement API REST', 'Phase 1', 2800.00, 1, 2800.00, 0),
    (i3, 'Conception UX/UI', 'Maquettes Figma', 1500.00, 1, 1500.00, 0),
    (i3, 'Développement front-end', 'Next.js', 1000.00, 1, 1000.00, 1),
    (i4, 'Tableau de bord Power BI', 'Mise en place + formation', 3200.00, 1, 3200.00, 0),
    (i5, 'Audit sécurité OWASP', 'Rapport + recommandations', 1800.00, 1, 1800.00, 0),
    (i6, 'Forfait support mensuel', 'Juin 2026', 1500.00, 1, 1500.00, 0),
    (i7, 'Correctifs critiques', 'Module réservation', 950.00, 1, 950.00, 0),
    (i8, 'Spécifications app mobile', 'Atelier + cahier des charges', 2200.00, 1, 2200.00, 0);

  -- Cotisation reserve for current quarter (Q2 2026)
  -- Paid Q2 CA HT: 2500 + 3200 + 1800 = 7500 → ~795 € at 10.6% (période 2 BNC)
  INSERT INTO cotisation_reserves (user_id, period_key, amount_set_aside, amount_paid, notes)
  VALUES (
    uid,
    '2026-Q2',
    500.00,
    0,
    'DCA Q2 2026 — partiellement provisionné en attente déclaration CPS'
  );

  -- Default invoice template
  INSERT INTO invoice_templates (
    user_id, name, default_payment_method, default_payment_terms,
    default_vat_settings, default_currency, is_default
  ) VALUES (
    uid,
    'Standard — Prestation BNC',
    'Virement',
    30,
    '{"vat_applicable": false}'::jsonb,
    'EUR',
    true
  );

  RAISE NOTICE 'Seed complete for user % (lefrancmathis@gmail.com)', uid;
END $$;
