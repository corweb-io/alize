import { formatCurrencyForPdf } from "@/lib/utils/format";
import type { Business, FiscalSettings, LegalForm } from "@/lib/types/database";

/**
 * How social contributions are computed for a structure.
 * - turnover: % of declared CA (micro-entreprise, CPS DCA)
 * - profit: TNS contributions on profit / remuneration (CPS)
 * - salary: assimilé salarié, payroll contributions
 * - none: no social contributions for the structure itself (e.g. SCI)
 */
export type CotisationModel = "turnover" | "profit" | "salary" | "none";

export interface LegalFormDefinition {
  value: LegalForm;
  label: string;
  description: string;
  /** Short form printed on documents (e.g. "SASU"). */
  documentLabel: string;
  isCompany: boolean;
  requiresShareCapital: boolean;
  /** Micro-only: turnover ceiling, DCA declarations, versement libératoire. */
  isMicro: boolean;
  /** Whether the activity type (BIC/BNC…) is relevant for this structure. */
  hasActivityType: boolean;
}

export const LEGAL_FORMS: Record<LegalForm, LegalFormDefinition> = {
  ei_micro: {
    value: "ei_micro",
    label: "Micro-entreprise",
    description:
      "Entreprise individuelle au régime micro : cotisations sur le CA, plafond de chiffre d'affaires.",
    documentLabel: "EI",
    isCompany: false,
    requiresShareCapital: false,
    isMicro: true,
    hasActivityType: true,
  },
  ei_reel: {
    value: "ei_reel",
    label: "Entreprise individuelle (régime réel)",
    description:
      "Entreprise individuelle imposée sur le bénéfice réel, sans plafond de CA.",
    documentLabel: "EI",
    isCompany: false,
    requiresShareCapital: false,
    isMicro: false,
    hasActivityType: true,
  },
  eurl: {
    value: "eurl",
    label: "EURL",
    description: "SARL à associé unique. Gérant travailleur non salarié (CPS).",
    documentLabel: "EURL",
    isCompany: true,
    requiresShareCapital: true,
    isMicro: false,
    hasActivityType: true,
  },
  sarl: {
    value: "sarl",
    label: "SARL",
    description:
      "Société à plusieurs associés. Gérant TNS s'il est majoritaire, assimilé salarié sinon.",
    documentLabel: "SARL",
    isCompany: true,
    requiresShareCapital: true,
    isMicro: false,
    hasActivityType: true,
  },
  sasu: {
    value: "sasu",
    label: "SASU",
    description: "SAS à associé unique. Président assimilé salarié.",
    documentLabel: "SASU",
    isCompany: true,
    requiresShareCapital: true,
    isMicro: false,
    hasActivityType: true,
  },
  sas: {
    value: "sas",
    label: "SAS",
    description: "Société par actions simplifiée. Président assimilé salarié.",
    documentLabel: "SAS",
    isCompany: true,
    requiresShareCapital: true,
    isMicro: false,
    hasActivityType: true,
  },
  sci: {
    value: "sci",
    label: "SCI",
    description: "Société civile immobilière : détention et gestion de biens.",
    documentLabel: "SCI",
    isCompany: true,
    requiresShareCapital: true,
    isMicro: false,
    hasActivityType: false,
  },
};

export const LEGAL_FORM_OPTIONS = Object.values(LEGAL_FORMS).map((form) => ({
  value: form.value,
  label: form.label,
}));

/** Legacy profiles predate the setting and were all micro-entreprises. */
export function getLegalForm(settings?: FiscalSettings | null): LegalForm {
  return settings?.legal_form ?? "ei_micro";
}

export function getLegalFormDefinition(
  settings?: FiscalSettings | null
): LegalFormDefinition {
  return LEGAL_FORMS[getLegalForm(settings)];
}

export function getCotisationModel(
  settings?: FiscalSettings | null
): CotisationModel {
  switch (getLegalForm(settings)) {
    case "ei_micro":
      return "turnover";
    case "ei_reel":
    case "eurl":
      return "profit";
    case "sarl":
      return settings?.is_majority_manager === false ? "salary" : "profit";
    case "sasu":
    case "sas":
      return "salary";
    case "sci":
      return "none";
  }
}

export function isMicroEntreprise(settings?: FiscalSettings | null): boolean {
  return getLegalFormDefinition(settings).isMicro;
}

/** Minimum settings required to leave onboarding, depending on the structure. */
export function isOnboardingComplete(
  settings?: FiscalSettings | null
): boolean {
  if (!settings?.activity_start_date) return false;
  const form = getLegalFormDefinition(settings);
  if (form.hasActivityType && !settings.activity_type) return false;
  if (form.isMicro && !settings.declaration_frequency) return false;
  return true;
}

type SenderProfile = Pick<Business, "company_name" | "legal_info"> & {
  fiscal_settings?: FiscalSettings | null;
};

/**
 * Company name as it must appear on documents: an entrepreneur individuel
 * must show "EI" next to their name (loi n° 2022-172).
 */
export function getDocumentSenderName(
  sender?: SenderProfile | null
): string | undefined {
  const name = sender?.company_name?.trim();
  if (!name || !sender?.fiscal_settings?.legal_form) return name;
  const form = LEGAL_FORMS[sender.fiscal_settings.legal_form];
  if (form.isCompany || /\b(EI|entrepreneur individuel)\b/i.test(name)) {
    return name;
  }
  return `${name} EI`;
}

/** Legal identification line printed at the bottom of invoices and quotes. */
export function buildLegalMentions(sender?: SenderProfile | null): string[] {
  const legal = sender?.legal_info;
  const legalForm = sender?.fiscal_settings?.legal_form;
  const mentions: (string | false | undefined)[] = [];

  if (legalForm) {
    const form = LEGAL_FORMS[legalForm];
    mentions.push(
      form.requiresShareCapital && legal?.share_capital
        ? `${form.documentLabel} au capital de ${formatCurrencyForPdf(legal.share_capital, "EUR")}`
        : form.isCompany
          ? form.documentLabel
          : "Entrepreneur individuel"
    );
  } else {
    mentions.push(legal?.company_type);
  }

  mentions.push(
    legal?.siret && `SIRET: ${legal.siret}`,
    legal?.siren && `SIREN: ${legal.siren}`,
    legal?.rcs && `RCS: ${legal.rcs}`,
    legal?.ape_naf && `APE/NAF: ${legal.ape_naf}`,
    legal?.tva_number && `Num TVA: ${legal.tva_number}`
  );

  return mentions.filter((m): m is string => Boolean(m));
}
