-- fiscal_settings.legal_form drives structure-specific behaviour
-- (ei_micro, ei_reel, eurl, sarl, sasu, sas, sci). Every profile created
-- before this setting existed went through the micro-entreprise onboarding.
UPDATE profiles
SET fiscal_settings = fiscal_settings || '{"legal_form": "ei_micro"}'::jsonb
WHERE fiscal_settings ? 'activity_start_date'
  AND NOT fiscal_settings ? 'legal_form';
