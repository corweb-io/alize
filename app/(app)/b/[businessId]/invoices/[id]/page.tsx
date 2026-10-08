import { createClient } from "@/lib/supabase/server";
import { businessPath } from "@/lib/business-path";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import InvoiceForm from "@/components/invoices/invoice-form";
import InvoicePreview from "@/components/invoices/invoice-preview";
import StatusToggle from "@/components/invoices/status-toggle";
import InvoicePayments from "@/components/invoices/invoice-payments";
import DuplicateButton from "@/components/invoices/duplicate-button";
import DeleteButton from "@/components/invoices/delete-button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { isOverdue } from "@/lib/utils/invoice-status";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";
import { invoiceTotalTTC, summarizePayments } from "@/lib/invoices/payments";
import type { InvoicePayment } from "@/lib/types/database";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; id: string }>;
}) {
  const { businessId, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(*), businesses(*)")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (error || !invoice) {
    redirect(businessPath(businessId, "/invoices"));
  }

  if (invoice.document_type === "quote") {
    redirect(businessPath(businessId, `/quotes/${id}`));
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("order_index");

  const { data: paymentRows } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_on");
  const payments = (paymentRows ?? []) as InvoicePayment[];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, reference")
    .eq("business_id", businessId)
    .order("name");

  const totalHT =
    items?.reduce((sum, item) => sum + parseFloat(item.total_ht || "0"), 0) ||
    0;
  const totalTTC = invoiceTotalTTC(items ?? [], Boolean(invoice.vat_applicable));
  const { paidTotal, remaining } = summarizePayments(payments, totalTTC);
  const partiallyPaid = invoice.status !== "paid" && paidTotal > 0;

  // Check if invoice is overdue and update status if needed
  const overdue = isOverdue(invoice.due_date, invoice.status);
  if (overdue && invoice.status !== "paid" && invoice.status !== "overdue") {
    // Update status to overdue in background (non-blocking)
    supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", id)
      .eq("business_id", businessId)
      .then(() => {});
  }

  const displayStatus =
    overdue && invoice.status !== "paid" ? "overdue" : invoice.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.reference}
        description={`Version ${invoice.version} · Créée le ${formatDate(invoice.created_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={businessPath(businessId, "/invoices")}>
              <Button variant="secondary">Retour aux factures</Button>
            </Link>
            <Link href={`/api/invoices/${id}/pdf`} target="_blank">
              <Button>Télécharger le PDF</Button>
            </Link>
            <DuplicateButton invoiceId={id} />
            <DeleteButton invoiceId={id} invoiceReference={invoice.reference} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <InvoicePreview
            invoice={{
              ...invoice,
              items: items || [],
            }}
            totalHT={totalHT}
            totalTTC={totalTTC}
          />
        </div>

        <div className="space-y-6">
          <Panel accent>
            <h2 className="mb-4 text-lg font-semibold text-[#1a454f] dark:text-teal-50">
              Détails de la facture
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">
                  Statut :
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                      displayStatus === "paid"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                        : displayStatus === "overdue"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                        : displayStatus === "sent"
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200"
                        : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200"
                    }`}
                  >
                    {getInvoiceStatusLabel(displayStatus)}
                  </span>
                  {partiallyPaid && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      Partiellement payée
                    </span>
                  )}
                </div>
              </div>
              {displayStatus === "paid" && invoice.paid_at && (
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">
                    Encaissée le :
                  </span>
                  <span className="font-medium text-[#1a454f] dark:text-teal-50">
                    {formatDate(invoice.paid_at)}
                  </span>
                </div>
              )}
              <StatusToggle
                invoiceId={id}
                currentStatus={displayStatus}
                partiallyPaid={partiallyPaid}
                remainingLabel={formatCurrency(remaining, invoice.currency)}
              />
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">
                  Total HT:
                </span>
                <span className="font-semibold text-[#1a454f] dark:text-teal-50">
                  {formatCurrency(totalHT, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">
                  Total TTC:
                </span>
                <span className="font-semibold text-[#1a454f] dark:text-teal-50">
                  {formatCurrency(totalTTC, invoice.currency)}
                </span>
              </div>
            </div>
            <div className="mt-6 border-t border-stone-200 pt-4 dark:border-stone-700">
              <InvoicePayments
                invoiceId={id}
                payments={payments}
                totalTTC={totalTTC}
                paidTotal={paidTotal}
                remaining={remaining}
                currency={invoice.currency}
              />
            </div>
          </Panel>

          <Panel accent>
            <InvoiceForm
            invoice={{ ...invoice, items: items || [] }}
            clients={clients || []}
            defaultCurrency={invoice.profiles?.default_currency}
          />
          </Panel>
        </div>
      </div>
    </div>
  );
}
