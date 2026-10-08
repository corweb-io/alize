import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoicePayment } from "@/lib/types/database";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function parseAmount(value: unknown): number | null {
  const amount =
    typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundCents(amount);
}

/** Total TTC as displayed on the invoice (flat 20% VAT when applicable). */
export function invoiceTotalTTC(
  items: { total_ht: number | string | null }[],
  vatApplicable: boolean
): number {
  const totalHT = items.reduce(
    (sum, item) => sum + parseFloat(String(item.total_ht || 0)),
    0
  );
  return roundCents(vatApplicable ? totalHT * 1.2 : totalHT);
}

export function summarizePayments(
  payments: Pick<InvoicePayment, "amount">[],
  totalTTC: number
) {
  const paidTotal = roundCents(
    payments.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0)
  );
  return {
    paidTotal,
    remaining: roundCents(Math.max(0, totalTTC - paidTotal)),
  };
}

/**
 * Loads an invoice with its total and payments. Returns null when the invoice
 * doesn't exist, isn't visible to the user, or is a quote.
 */
export async function loadInvoiceBalance(
  supabase: SupabaseClient,
  invoiceId: string
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, business_id, due_date, status, vat_applicable, payment_method, document_type")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.document_type !== "invoice") return null;

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoice_items").select("total_ht").eq("invoice_id", invoiceId),
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("paid_on"),
  ]);

  const totalTTC = invoiceTotalTTC(items ?? [], Boolean(invoice.vat_applicable));
  const list = (payments ?? []) as InvoicePayment[];

  return {
    invoice,
    totalTTC,
    payments: list,
    ...summarizePayments(list, totalTTC),
  };
}
