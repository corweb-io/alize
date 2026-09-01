export type {
  ActivityType,
  DeclarationFrequency,
  FiscalSettings,
  CotisationReserve,
} from "@/lib/types/database";

export type ActivityPeriod = 1 | 2 | 3;

export interface CotisationRate {
  cotisations: number;
  cotisationsWithVersementLiberatoire: number;
}

export interface CpsDeclarationBreakdown {
  social: number;
  socialRate: number;
  cfp: number;
  cfpRate: number;
  chambre: number;
  chambreRate: number;
  chambreLabel: string;
  total: number;
}

export interface PeriodSummary {
  periodKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
  turnover: number;
  cotisationsDue: number;
  rate: number;
  invoiceCount: number;
  cpsBreakdown: CpsDeclarationBreakdown;
}
