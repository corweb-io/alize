import type { FiscalSettings } from "@/lib/types/database";

export interface Profile {
  id: string;
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  default_currency?: string | null;
  banking_info?: {
    bank_name?: string;
    RIB?: string;
    IBAN?: string;
    BIC?: string;
  } | null;
  legal_info?: {
    company_type?: string;
    siret?: string;
    siren?: string;
    rcs?: string;
    share_capital?: number;
    ape_naf?: string;
    tva_number?: string;
    service_type?: string;
    late_payment_notice?: string;
  } | null;
  fiscal_settings?: FiscalSettings | null;
}
