import { createClient } from "@/lib/supabase/server";
import { businessPath } from "@/lib/business-path";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import { Table, TableRow, TableCell } from "@/components/ui/table";
import InvoiceActions from "@/components/invoices/invoice-actions";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ status?: string; client?: string }>;
}) {
  const { businessId } = await params;
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("invoices")
    .select(
      "id, reference, document_type, invoice_date, due_date, status, currency, client_id, clients(name)"
    )
    .eq("business_id", businessId)
    .in("document_type", ["invoice", "credit_note"])
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.client) {
    query = query.eq("client_id", filters.client);
  }

  const { data: invoices, error } = await query;

  // Get total amounts for all invoices in one query
  const invoiceTotals: Record<string, number> = {};
  if (invoices && invoices.length > 0) {
    const invoiceIds = invoices.map((inv: { id: string }) => inv.id);
    const { data: allItems } = await supabase
      .from("invoice_items")
      .select("invoice_id, total_ht")
      .in("invoice_id", invoiceIds);

    if (allItems) {
      allItems.forEach((item) => {
        if (!invoiceTotals[item.invoice_id]) {
          invoiceTotals[item.invoice_id] = 0;
        }
        invoiceTotals[item.invoice_id] += parseFloat(item.total_ht || "0");
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Gérez vos factures et suivez les paiements"
        actions={
          <Link href={businessPath(businessId, "/invoices/new")}>
            <Button>Nouvelle facture</Button>
          </Link>
        }
      />

      {error && (
        <Panel className="border-red-200/50 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            Erreur lors du chargement des factures : {error.message}
          </p>
        </Panel>
      )}

      {invoices && invoices.length > 0 ? (
        <Panel accent padding={false}>
          <Table
            headers={[
              "Référence",
              "Client",
              "Date",
              "Échéance",
              "Montant",
              "Statut",
              "Actions",
            ]}
          >
            {invoices.map(
              (invoice: {
                id: string;
                reference: string;
                document_type: string;
                invoice_date: string;
                due_date: string;
                status: string;
                currency?: string;
                client_id: string;
                clients: { name: string } | { name: string }[] | null;
              }) => {
                const isCreditNote = invoice.document_type === "credit_note";
                const clientName = Array.isArray(invoice.clients)
                  ? invoice.clients[0]?.name
                  : invoice.clients?.name;
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.reference}
                    </TableCell>
                    <TableCell>{clientName || "Inconnu"}</TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell>
                      {isCreditNote ? "—" : formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(
                        invoiceTotals[invoice.id] || 0,
                        invoice.currency
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          isCreditNote
                            ? "bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-200"
                            : invoice.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                            : invoice.status === "overdue"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                            : invoice.status === "sent"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200"
                            : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200"
                        }`}
                      >
                        {isCreditNote
                          ? "Avoir"
                          : getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InvoiceActions
                        invoiceId={invoice.id}
                        invoiceReference={invoice.reference}
                        canDelete={!isCreditNote && invoice.status !== "cancelled"}
                      />
                    </TableCell>
                  </TableRow>
                );
              }
            )}
          </Table>
        </Panel>
      ) : (
        <Panel className="text-center">
          <p className="text-stone-500 dark:text-stone-400">
            Aucune facture pour le moment. Créez votre première facture pour
            commencer.
          </p>
        </Panel>
      )}
    </div>
  );
}
