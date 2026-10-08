export type ActivityType =
  | "vente_bic"
  | "prestations_bic"
  | "prestations_bnc"
  | "location_meublee";

export type DeclarationFrequency = "monthly" | "quarterly";

export type LegalForm =
  | "ei_micro"
  | "ei_reel"
  | "eurl"
  | "sarl"
  | "sasu"
  | "sas"
  | "sci";

export type Plan = "free" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface Subscription {
  user_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalSettings {
  /** Missing on legacy profiles, which are treated as micro-entreprise. */
  legal_form?: LegalForm;
  /** SARL only: a majority gérant is TNS (CPS), otherwise assimilé salarié. */
  is_majority_manager?: boolean;
  activity_start_date?: string;
  activity_type?: ActivityType;
  declaration_frequency?: DeclarationFrequency;
  versement_liberatoire?: boolean;
  employee_count?: number;
  /** Artisan BIC prestations use the higher TED bracket (390 €+). */
  is_artisan?: boolean;
}

/** A legal entity. Users access businesses through business_members. */
export interface Business {
  id: string;
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  banking_info?: {
    bank_name?: string;
    RIB?: string;
    IBAN?: string;
    BIC?: string;
  };
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
  };
  fiscal_settings?: FiscalSettings;
  default_currency?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type BusinessRole = "owner" | "admin" | "member" | "accountant";

export interface BusinessMember {
  business_id: string;
  user_id: string;
  role: BusinessRole;
  created_at: string;
}

/** User-level data. Business identity lives on Business. */
export interface Profile {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface CotisationReserve {
  id: string;
  user_id: string;
  business_id: string;
  period_key: string;
  amount_set_aside: number;
  amount_paid: number;
  declared_at?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnualObligation {
  id: string;
  user_id: string;
  business_id: string;
  year: number;
  obligation_type: "cfae" | "ted";
  amount_due: number;
  amount_paid: number;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  business_id: string;
  reference: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  business_id: string;
  reference: string;
  version: string;
  client_id: string;
  client_reference?: string;
  invoice_date: string;
  due_date: string;
  paid_at?: string | null;
  payment_method: string;
  currency?: string;
  status: "draft" | "sent" | "paid" | "overdue" | "accepted" | "declined";
  document_type?: "invoice" | "quote";
  converted_to_invoice_id?: string | null;
  source_quote_id?: string | null;
  vat_applicable: boolean;
  vat_article?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  additional_info?: string;
  unit_price_ht: number;
  quantity: number;
  total_ht: number;
  order_index: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  business_id: string;
  amount: number;
  paid_on: string;
  payment_method?: string | null;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplate {
  id: string;
  user_id: string;
  business_id: string;
  name: string;
  default_payment_method: string;
  default_payment_terms: number;
  default_vat_settings: {
    vat_applicable: boolean;
    vat_article?: string;
  };
  default_currency?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
