import { createClient } from "@/lib/supabase/server";
import {
  convertAmountsToBaseCurrency,
  FISCAL_BASE_CURRENCY,
} from "./currency";
import { computeCpsDeclaration } from "./cotisations-st-barth";
import {
  getCurrentDeclarationPeriod,
  isDateInPeriod,
  listDeclarationPeriods,
  resolveDeclarationPeriod,
} from "./periods";
import type { FiscalSettings, PeriodSummary } from "./types";

/**
 * One encaissement: a payment received on an invoice. An invoice settled in
 * several payments yields several rows, each attributed to the period of its
 * own date.
 */
export interface PaidInvoiceWithTotal {
  /** Payment id */
  id: string;
  invoice_id: string;
  reference: string;
  invoice_date: string;
  /** Date the payment was received */
  paid_at: string | null;
  /** HT share of this payment */
  total_ht: number;
  total_ht_base: number;
  /** Invoice total HT, to tell partial payments apart */
  invoice_total_ht: number;
  currency?: string;
}

export function getEncaissementDate(invoice: {
  paid_at?: string | null;
  invoice_date: string;
}): string {
  return invoice.paid_at || invoice.invoice_date;
}

export type PeriodInvoice = PaidInvoiceWithTotal & { reserveAmount: number };

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number | string;
  paid_on: string;
  invoices: {
    reference: string;
    invoice_date: string;
    currency: string | null;
    vat_applicable: boolean | null;
  } | null;
};

export async function fetchPaidInvoicesWithTotals(
  businessId: string
): Promise<PaidInvoiceWithTotal[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoice_payments")
    .select(
      "id, invoice_id, amount, paid_on, invoices!inner(reference, invoice_date, currency, vat_applicable, document_type)"
    )
    .eq("business_id", businessId)
    .eq("invoices.document_type", "invoice")
    .order("paid_on");

  const payments = (data ?? []) as unknown as PaymentRow[];
  if (!payments.length) return [];

  const invoiceIds = [...new Set(payments.map((p) => p.invoice_id))];
  const { data: items } = await supabase
    .from("invoice_items")
    .select("invoice_id, total_ht")
    .in("invoice_id", invoiceIds);

  const totals: Record<string, number> = {};
  items?.forEach((item) => {
    totals[item.invoice_id] =
      (totals[item.invoice_id] || 0) + parseFloat(String(item.total_ht || 0));
  });

  const rawPayments = payments.map((payment) => {
    const invoice = payment.invoices;
    const amount = parseFloat(String(payment.amount || 0));
    // Payments are TTC; turnover is HT.
    const htShare = invoice?.vat_applicable ? amount / 1.2 : amount;
    return {
      id: payment.id,
      invoice_id: payment.invoice_id,
      reference: invoice?.reference ?? "",
      invoice_date: invoice?.invoice_date ?? payment.paid_on,
      paid_at: payment.paid_on,
      total_ht: Math.round(htShare * 100) / 100,
      invoice_total_ht: totals[payment.invoice_id] || 0,
      currency: invoice?.currency ?? undefined,
    };
  });

  return convertAmountsToBaseCurrency(rawPayments, FISCAL_BASE_CURRENCY);
}

function sumTurnoverInRange(
  invoices: PaidInvoiceWithTotal[],
  startDate: Date,
  endDate: Date
): { turnover: number; invoiceCount: number } {
  const filtered = invoices.filter((inv) => {
    const date = new Date(getEncaissementDate(inv));
    return date >= startDate && date <= endDate;
  });

  return {
    turnover: filtered.reduce((sum, inv) => sum + inv.total_ht_base, 0),
    invoiceCount: new Set(filtered.map((inv) => inv.invoice_id)).size,
  };
}

function buildPeriodSummary(
  invoices: PaidInvoiceWithTotal[],
  settings: FiscalSettings,
  period: { key: string; label: string; startDate: Date; endDate: Date },
  declaredTurnovers: Map<string, number>
): PeriodSummary {
  const periodData = sumTurnoverInRange(
    invoices,
    period.startDate,
    period.endDate
  );
  const declaredTurnover = declaredTurnovers.get(period.key) ?? null;
  // Once declared, what's owed to the CPS follows the declared CA.
  const cpsBreakdown = computeCpsDeclaration(
    declaredTurnover ?? periodData.turnover,
    settings,
    period.startDate
  );

  return {
    periodKey: period.key,
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    turnover: periodData.turnover,
    declaredTurnover,
    cotisationsDue: cpsBreakdown.total,
    rate: cpsBreakdown.socialRate,
    invoiceCount: periodData.invoiceCount,
    cpsBreakdown,
  };
}

function invoicesForPeriod(
  invoices: PaidInvoiceWithTotal[],
  settings: FiscalSettings,
  period: { key: string; label: string; startDate: Date; endDate: Date }
): PeriodInvoice[] {
  return invoices
    .filter((inv) => isDateInPeriod(getEncaissementDate(inv), period))
    .map((inv) => ({
      ...inv,
      reserveAmount: computeCpsDeclaration(
        inv.total_ht_base,
        settings,
        period.startDate
      ).total,
    }));
}

export async function getCotisationSummary(
  businessId: string,
  settings: FiscalSettings,
  options?: { periodKey?: string }
) {
  const supabase = await createClient();
  const [invoices, { data: reserves }] = await Promise.all([
    fetchPaidInvoicesWithTotals(businessId),
    supabase
      .from("cotisation_reserves")
      .select("period_key, declared_turnover")
      .eq("business_id", businessId)
      .not("declared_turnover", "is", null),
  ]);
  const declaredTurnovers = new Map<string, number>(
    (reserves ?? []).map((r) => [r.period_key, Number(r.declared_turnover)])
  );
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
    .map((period) =>
      buildPeriodSummary(invoices, settings, period, declaredTurnovers)
    );

  const periodSummary =
    periodHistory.find((period) => period.periodKey === currentPeriod.key) ??
    buildPeriodSummary(invoices, settings, currentPeriod, declaredTurnovers);
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
