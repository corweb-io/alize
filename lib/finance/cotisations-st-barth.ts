import type {
  ActivityPeriod,
  ActivityType,
  CotisationRate,
  CpsDeclarationBreakdown,
  DeclarationFrequency,
  FiscalSettings,
} from "./types";
import { isMicroEntreprise } from "./legal-forms";

/**
 * CPS Saint-Barthélemy cotisation rates for artisans, commerçants,
 * and non-regulated liberal professions (DROM reduced rates).
 *
 * Source: https://cps-stbarth.msa.fr/lfp/micro-entrepreneur/calcul-des-cotisations
 * Décret 2017-972 — three periods based on activity duration.
 */
const RATES: Record<
  ActivityType,
  Record<ActivityPeriod, CotisationRate>
> = {
  vente_bic: {
    1: { cotisations: 2.1, cotisationsWithVersementLiberatoire: 3.1 },
    2: { cotisations: 6.2, cotisationsWithVersementLiberatoire: 7.2 },
    3: { cotisations: 8.2, cotisationsWithVersementLiberatoire: 9.2 },
  },
  prestations_bic: {
    1: { cotisations: 3.6, cotisationsWithVersementLiberatoire: 5.3 },
    2: { cotisations: 10.6, cotisationsWithVersementLiberatoire: 12.3 },
    3: { cotisations: 14.2, cotisationsWithVersementLiberatoire: 15.9 },
  },
  prestations_bnc: {
    1: { cotisations: 3.9, cotisationsWithVersementLiberatoire: 6.1 },
    2: { cotisations: 10.6, cotisationsWithVersementLiberatoire: 13.8 },
    3: { cotisations: 15.4, cotisationsWithVersementLiberatoire: 17.6 },
  },
  location_meublee: {
    1: { cotisations: 1.0, cotisationsWithVersementLiberatoire: 2.0 },
    2: { cotisations: 3.0, cotisationsWithVersementLiberatoire: 4.0 },
    3: { cotisations: 4.0, cotisationsWithVersementLiberatoire: 5.0 },
  },
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  vente_bic: "Vente de marchandises (BIC)",
  prestations_bic: "Prestations de services commerciales ou artisanales (BIC)",
  prestations_bnc: "Autres prestations de services (BNC)",
  location_meublee: "Location meublée de tourisme classée",
};

export const PERIOD_LABELS: Record<ActivityPeriod, string> = {
  1: "Période 1 — jusqu'à la fin du 7ème trimestre civil",
  2: "Période 2 — du 8ème trimestre à la fin de la 3ème année civile",
  3: "Régime de croisière — à partir de la 4ème année civile",
};

export function getCalendarQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Determines which rate period applies based on activity start date.
 *
 * Period 1: through end of 7th calendar quarter after start
 * Period 2: from 8th quarter through end of 3rd calendar year of activity
 * Period 3: from 4th calendar year onward ("régime de croisière")
 */
export function getActivityPeriod(
  activityStartDate: Date,
  referenceDate: Date = new Date()
): ActivityPeriod {
  const startYear = activityStartDate.getFullYear();
  const startQuarter = getCalendarQuarter(activityStartDate);
  const refYear = referenceDate.getFullYear();
  const refQuarter = getCalendarQuarter(referenceDate);

  const quartersSinceStart =
    (refYear - startYear) * 4 + (refQuarter - startQuarter) + 1;

  if (quartersSinceStart <= 7) return 1;

  const activityCalendarYear = refYear - startYear + 1;
  if (activityCalendarYear <= 3) return 2;

  return 3;
}

export function getApplicableRate(
  settings: FiscalSettings,
  referenceDate: Date = new Date()
): number {
  if (!settings.activity_type || !settings.activity_start_date) return 0;

  const period = getActivityPeriod(
    new Date(settings.activity_start_date),
    referenceDate
  );
  const rateEntry = RATES[settings.activity_type][period];

  return settings.versement_liberatoire
    ? rateEntry.cotisationsWithVersementLiberatoire
    : rateEntry.cotisations;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** CPS DCA receipts round each contribution line to the nearest euro. */
function roundEuros(value: number): number {
  return Math.round(value);
}

/**
 * Contribution formation professionnelle, as billed on CPS DCA receipts.
 * Commerçant receipts use 0.1%; artisans use the higher 0.3% rate.
 */
export function getCfpRate(settings: FiscalSettings): number {
  if (settings.activity_type === "prestations_bnc") return 0.2;
  if (settings.activity_type === "prestations_bic" && settings.is_artisan) {
    return 0.3;
  }
  return 0.1;
}

/**
 * Taxe pour frais de chambre consulaire, as billed on CPS DCA receipts.
 * St Barth applies the rate on the declared period CA (no 5 000 € floor).
 */
export function getChambreConsulaireRate(settings: FiscalSettings): {
  rate: number;
  label: string;
} {
  if (settings.activity_type === "prestations_bnc") {
    return { rate: 0, label: "Taxe chambre consulaire" };
  }
  if (settings.activity_type === "vente_bic") {
    return { rate: 0.015, label: "Taxe pour frais de chambre CCI" };
  }
  if (settings.activity_type === "location_meublee") {
    return { rate: 0.015, label: "Taxe pour frais de chambre CCI" };
  }
  if (settings.is_artisan) {
    return { rate: 0.48, label: "Taxe pour frais de chambre CMA" };
  }
  return { rate: 0.044, label: "Taxe pour frais de chambre CCI" };
}

export function computeCotisations(
  turnover: number,
  settings: FiscalSettings,
  referenceDate: Date = new Date()
): number {
  const rate = getApplicableRate(settings, referenceDate);
  return roundCents(turnover * (rate / 100));
}

export function computeCpsDeclaration(
  turnover: number,
  settings: FiscalSettings,
  referenceDate: Date = new Date()
): CpsDeclarationBreakdown {
  const socialRate = getApplicableRate(settings, referenceDate);
  const cfpRate = getCfpRate(settings);
  const chambre = getChambreConsulaireRate(settings);
  const social = roundEuros(turnover * (socialRate / 100));
  const cfp = roundEuros(turnover * (cfpRate / 100));
  const chambreAmount = roundEuros(turnover * (chambre.rate / 100));

  return {
    social,
    socialRate,
    cfp,
    cfpRate,
    chambre: chambreAmount,
    chambreRate: chambre.rate,
    chambreLabel: chambre.label,
    total: social + cfp + chambreAmount,
  };
}

/** Settings required for the micro-entreprise CPS calculations. */
export function isMicroFiscalSettingsComplete(
  settings: FiscalSettings | null | undefined
): settings is FiscalSettings & {
  activity_start_date: string;
  activity_type: ActivityType;
  declaration_frequency: DeclarationFrequency;
} {
  return Boolean(
    isMicroEntreprise(settings) &&
      settings?.activity_start_date &&
      settings?.activity_type &&
      settings?.declaration_frequency
  );
}
