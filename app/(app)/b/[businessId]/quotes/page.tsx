import { createClient } from "@/lib/supabase/server";
import { businessPath } from "@/lib/business-path";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import { Table, TableRow, TableCell } from "@/components/ui/table";
import QuoteActions from "@/components/quotes/quote-actions";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { getQuoteStatusLabel } from "@/lib/utils/labels";

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: quotes, error } = await supabase
    .from("invoices")
    .select(
      "id, reference, invoice_date, due_date, status, currency, converted_to_invoice_id, client_id, clients(name)"
    )
    .eq("business_id", businessId)
    .eq("document_type", "quote")
    .order("created_at", { ascending: false });

  const quoteTotals: Record<string, number> = {};
  if (quotes?.length) {
    const quoteIds = quotes.map((q) => q.id);
    const { data: allItems } = await supabase
      .from("invoice_items")
      .select("invoice_id, total_ht")
      .in("invoice_id", quoteIds);

    allItems?.forEach((item) => {
      quoteTotals[item.invoice_id] =
        (quoteTotals[item.invoice_id] || 0) + parseFloat(String(item.total_ht || 0));
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description="Créez des devis et convertissez-les en factures une fois acceptés"
        actions={
          <Link href={businessPath(businessId, "/quotes/new")}>
            <Button>Nouveau devis</Button>
          </Link>
        }
      />

      {error && (
        <Panel className="border-red-200/50 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            Erreur lors du chargement des devis : {error.message}
          </p>
        </Panel>
      )}

      {quotes && quotes.length > 0 ? (
        <Panel accent padding={false}>
          <Table
            headers={[
              "Référence",
              "Client",
              "Date",
              "Validité",
              "Montant",
              "Statut",
              "Actions",
            ]}
          >
            {quotes.map(
              (quote: {
                id: string;
                reference: string;
                invoice_date: string;
                due_date: string;
                status: string;
                currency?: string;
                converted_to_invoice_id?: string | null;
                client_id: string;
                clients: { name: string } | { name: string }[] | null;
              }) => {
              const clientName = Array.isArray(quote.clients)
                ? quote.clients[0]?.name
                : quote.clients?.name;
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.reference}</TableCell>
                  <TableCell>{clientName || "Inconnu"}</TableCell>
                  <TableCell>{formatDate(quote.invoice_date)}</TableCell>
                  <TableCell>{formatDate(quote.due_date)}</TableCell>
                  <TableCell>
                    {formatCurrency(quoteTotals[quote.id] || 0, quote.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        quote.status === "accepted"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                          : quote.status === "sent"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200"
                            : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200"
                      }`}
                    >
                      {getQuoteStatusLabel(quote.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <QuoteActions
                      quoteId={quote.id}
                      quoteReference={quote.reference}
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
            Aucun devis pour le moment. Créez un devis avant d&apos;émettre une
            facture.
          </p>
        </Panel>
      )}
    </div>
  );
}
