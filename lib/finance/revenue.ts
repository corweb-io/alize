import { createClient } from "@/lib/supabase/server";
import { invoiceTotalTTC, summarizePayments } from "@/lib/invoices/payments";
import { isOverdue } from "@/lib/utils/invoice-status";
import {
  convertAmountsToBaseCurrency,
  FISCAL_BASE_CURRENCY,
} from "./currency";
import { getQuarterlyPeriod, getYearToDateRange } from "./periods";
import { fetchPaidInvoicesWithTotals, getEncaissementDate } from "./turnover";

/**
 * Revenue received (encaissé, HT, in EUR) for the current year and quarter.
 * Structure-independent: used on every business's dashboard.
 */
export async function getRevenueSummary(
  businessId: string,
  now: Date = new Date()
) {
  const payments = await fetchPaidInvoicesWithTotals(businessId);
  const year = getYearToDateRange(now);
  const quarter = getQuarterlyPeriod(now);

  const sumBetween = (start: Date, end: Date) =>
    payments
      .filter((payment) => {
        const date = new Date(getEncaissementDate(payment));
        return date >= start && date <= end;
      })
      .reduce((sum, payment) => sum + payment.total_ht_base, 0);

  return {
    year: now.getFullYear(),
    yearToDate: sumBetween(year.startDate, year.endDate),
    quarterLabel: quarter.label,
    quarter: sumBetween(quarter.startDate, quarter.endDate),
  };
}

/** Issued invoices still to be collected (TTC, in EUR), and how much is overdue. */
export async function getReceivablesSummary(businessId: string) {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_date, due_date, status, currency, vat_applicable, invoice_items(total_ht), invoice_payments(amount)"
    )
    .eq("business_id", businessId)
    .eq("document_type", "invoice")
    .in("status", ["sent", "overdue"]);

  const open = (invoices ?? [])
    .map((invoice) => {
      const totalTTC = invoiceTotalTTC(
        invoice.invoice_items ?? [],
        Boolean(invoice.vat_applicable)
      );
      const { remaining } = summarizePayments(
        invoice.invoice_payments ?? [],
        totalTTC
      );
      return {
        // convertAmountsToBaseCurrency converts `total_ht`; here it holds the
        // remaining TTC amount.
        total_ht: remaining,
        currency: invoice.currency ?? undefined,
        invoice_date: invoice.invoice_date,
        overdue: isOverdue(invoice.due_date, invoice.status),
      };
    })
    .filter((invoice) => invoice.total_ht > 0);

  const converted = await convertAmountsToBaseCurrency(
    open,
    FISCAL_BASE_CURRENCY
  );
  const overdue = converted.filter((invoice) => invoice.overdue);
  const sum = (list: typeof converted) =>
    list.reduce((total, invoice) => total + invoice.total_ht_base, 0);

  return {
    outstanding: sum(converted),
    outstandingCount: converted.length,
    overdue: sum(overdue),
    overdueCount: overdue.length,
  };
}
