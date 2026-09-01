import { formatCurrency } from "@/lib/utils/format";
import type { CpsDeclarationBreakdown } from "@/lib/finance/types";

interface CpsBreakdownProps {
  turnover: number;
  breakdown: CpsDeclarationBreakdown;
  periodLabel: string;
  currency: string;
}

export default function CpsBreakdown({
  turnover,
  breakdown,
  periodLabel,
  currency,
}: CpsBreakdownProps) {
  const rows = [
    {
      key: "ca",
      label: "CA BIC prestations de services",
      rate: null as string | null,
      amount: turnover,
    },
    {
      key: "social",
      label: "Cotisations, contribution et impôt",
      rate: `${breakdown.socialRate}%`,
      amount: breakdown.social,
    },
    {
      key: "cfp",
      label: "Formation professionnelle",
      rate: `${breakdown.cfpRate}%`,
      amount: breakdown.cfp,
    },
    {
      key: "chambre",
      label: breakdown.chambreLabel,
      rate: `${breakdown.chambreRate}%`,
      amount: breakdown.chambre,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Détail du montant CPS pour {periodLabel}, au format de l&apos;accusé de
        déclaration de chiffre d&apos;affaires.
      </p>
      <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <dt className="text-gray-600 dark:text-gray-400">
              {row.label}
              {row.rate && (
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                  {row.rate}
                </span>
              )}
            </dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(row.amount, currency)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-3 text-sm dark:bg-zinc-800">
          <dt className="font-semibold text-gray-900 dark:text-white">
            Montant à payer
          </dt>
          <dd className="font-semibold text-amber-700 dark:text-amber-300">
            {formatCurrency(breakdown.total, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
