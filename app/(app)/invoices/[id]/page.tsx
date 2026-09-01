import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import InvoiceForm from "@/components/invoices/invoice-form";
import InvoicePreview from "@/components/invoices/invoice-preview";
import StatusToggle from "@/components/invoices/status-toggle";
import DuplicateButton from "@/components/invoices/duplicate-button";
import DeleteButton from "@/components/invoices/delete-button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { isOverdue } from "@/lib/utils/invoice-status";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(*), profiles(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !invoice) {
    redirect("/invoices");
  }

  if (invoice.document_type === "quote") {
    redirect(`/quotes/${id}`);
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("order_index");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, reference")
    .eq("user_id", user.id)
    .order("name");

  const totalHT =
    items?.reduce((sum, item) => sum + parseFloat(item.total_ht || "0"), 0) ||
    0;
  const totalTTC = invoice.vat_applicable ? totalHT * 1.2 : totalHT;

  // Check if invoice is overdue and update status if needed
  const overdue = isOverdue(invoice.due_date, invoice.status);
  if (overdue && invoice.status !== "paid" && invoice.status !== "overdue") {
    // Update status to overdue in background (non-blocking)
    supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", id)
      .eq("user_id", user.id)
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
            <Link href="/invoices">
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
                paidAt={invoice.paid_at}
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
