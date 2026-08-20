import Link from "next/link";
import Card from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { PeriodInvoice } from "@/lib/finance/turnover";
import type { PeriodSummary } from "@/lib/finance/types";

interface PeriodInvoicesProps {
  period: PeriodSummary;
  invoices: PeriodInvoice[];
  currency: string;
  isHistorical: boolean;
}

export default function PeriodInvoices({
  period,
  invoices,
  currency,
  isHistorical,
}: PeriodInvoicesProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <p className="py-4 text-center text-gray-500 dark:text-gray-400">
          Aucune facture payée sur {period.label}. Marquez vos factures comme
          payées pour suivre les cotisations de cette période.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Factures payées · ${period.label}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Facture
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                CA HT
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Provision
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                  >
                    {inv.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(inv.invoice_date)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                  {formatCurrency(inv.total_ht, inv.currency || currency)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-amber-700 dark:text-amber-300">
                  {formatCurrency(inv.reserveAmount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-zinc-800">
              <td
                colSpan={2}
                className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white"
              >
                Total{isHistorical ? ` · ${period.label}` : ""}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(period.turnover, currency)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700 dark:text-amber-300">
                {formatCurrency(period.cotisationsDue, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Montants basés sur la date de facture des factures payées, au taux de{" "}
        {period.rate}% applicable sur {period.label}. Les factures en devise
        étrangère sont converties en {currency} au taux du jour de facturation.
        Aucune cotisation n&apos;est due si votre CA est nul sur la période.
      </p>
    </Card>
  );
}
