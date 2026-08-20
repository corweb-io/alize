import { createClient } from "@/lib/supabase/server";
import {
  convertAmountsToBaseCurrency,
  FISCAL_BASE_CURRENCY,
} from "./currency";
import { computeCotisations, getApplicableRate } from "./cotisations-st-barth";
import {
  getCurrentDeclarationPeriod,
  isDateInPeriod,
  listDeclarationPeriods,
  resolveDeclarationPeriod,
} from "./periods";
import type { FiscalSettings, PeriodSummary } from "./types";

export interface PaidInvoiceWithTotal {
  id: string;
  reference: string;
  invoice_date: string;
  total_ht: number;
  total_ht_base: number;
  currency?: string;
}

export type PeriodInvoice = PaidInvoiceWithTotal & { reserveAmount: number };

async function fetchPaidInvoicesWithTotals(
  userId: string
): Promise<PaidInvoiceWithTotal[]> {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, reference, invoice_date, currency")
    .eq("user_id", userId)
    .eq("document_type", "invoice")
    .eq("status", "paid");

  if (!invoices?.length) return [];

  const invoiceIds = invoices.map((inv) => inv.id);
  const { data: items } = await supabase
    .from("invoice_items")
    .select("invoice_id, total_ht")
    .in("invoice_id", invoiceIds);

  const totals: Record<string, number> = {};
  items?.forEach((item) => {
    totals[item.invoice_id] =
      (totals[item.invoice_id] || 0) + parseFloat(String(item.total_ht || 0));
  });

  const rawInvoices = invoices.map((inv) => ({
    id: inv.id,
    reference: inv.reference,
    invoice_date: inv.invoice_date,
    total_ht: totals[inv.id] || 0,
    currency: inv.currency,
  }));

  return convertAmountsToBaseCurrency(rawInvoices, FISCAL_BASE_CURRENCY);
}

function sumTurnoverInRange(
  invoices: PaidInvoiceWithTotal[],
  startDate: Date,
  endDate: Date
): { turnover: number; invoiceCount: number } {
  const filtered = invoices.filter((inv) => {
    const date = new Date(inv.invoice_date);
    return date >= startDate && date <= endDate;
  });

  return {
    turnover: filtered.reduce((sum, inv) => sum + inv.total_ht_base, 0),
    invoiceCount: filtered.length,
  };
}

function buildPeriodSummary(
  invoices: PaidInvoiceWithTotal[],
  settings: FiscalSettings,
  period: { key: string; label: string; startDate: Date; endDate: Date }
): PeriodSummary {
  const periodData = sumTurnoverInRange(
    invoices,
    period.startDate,
    period.endDate
  );
  const rate = getApplicableRate(settings, period.startDate);

  return {
    periodKey: period.key,
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    turnover: periodData.turnover,
    cotisationsDue: computeCotisations(
      periodData.turnover,
      settings,
      period.startDate
    ),
    rate,
    invoiceCount: periodData.invoiceCount,
  };
}

function invoicesForPeriod(
  invoices: PaidInvoiceWithTotal[],
  settings: FiscalSettings,
  period: { key: string; label: string; startDate: Date; endDate: Date }
): PeriodInvoice[] {
  return invoices
    .filter((inv) => isDateInPeriod(inv.invoice_date, period))
    .map((inv) => ({
      ...inv,
      reserveAmount: computeCotisations(
        inv.total_ht_base,
        settings,
        period.startDate
      ),
    }));
}

export async function getCotisationSummary(
  userId: string,
  settings: FiscalSettings,
  options?: { periodKey?: string }
) {
  const invoices = await fetchPaidInvoicesWithTotals(userId);
  const frequency = settings.declaration_frequency || "quarterly";
  const currentPeriod = getCurrentDeclarationPeriod(frequency);
  const activityStart = settings.activity_start_date
    ? new Date(settings.activity_start_date)
    : currentPeriod.startDate;

  const availablePeriods = listDeclarationPeriods(
    frequency,
    activityStart,
    currentPeriod.endDate
  );
  const selectedPeriod = resolveDeclarationPeriod(
    frequency,
    options?.periodKey,
    availablePeriods,
    currentPeriod
  );

  const periodHistory = [...availablePeriods]
    .reverse()
    .map((period) => buildPeriodSummary(invoices, settings, period));

  const periodSummary =
    periodHistory.find((period) => period.periodKey === currentPeriod.key) ??
    buildPeriodSummary(invoices, settings, currentPeriod);
  const selectedPeriodSummary =
    periodHistory.find((period) => period.periodKey === selectedPeriod.key) ??
    periodSummary;

  const currentYear = new Date().getFullYear();
  const ytdPeriods = periodHistory.filter(
    (period) => period.startDate.getFullYear() === currentYear
  );
  const ytdTurnover = ytdPeriods.reduce(
    (sum, period) => sum + period.turnover,
    0
  );
  const ytdCotisations = ytdPeriods.reduce(
    (sum, period) => sum + period.cotisationsDue,
    0
  );

  return {
    periodSummary,
    selectedPeriodSummary,
    isHistorical: selectedPeriodSummary.periodKey !== periodSummary.periodKey,
    periodHistory,
    ytdTurnover,
    ytdCotisations,
    rate: periodSummary.rate,
    periodInvoices: invoicesForPeriod(invoices, settings, selectedPeriod),
    allPaidInvoices: invoices,
  };
}
