import Link from "next/link";
import Card from "@/components/ui/card";
import { businessPath } from "@/lib/business-path";
import PeriodPaidCell from "@/components/cotisations/period-paid-cell";
import { formatCurrency } from "@/lib/utils/format";
import type { PeriodSummary } from "@/lib/finance/types";
import type { CotisationReserve, DeclarationFrequency } from "@/lib/types/database";

interface PeriodHistoryProps {
  businessId: string;
  periods: PeriodSummary[];
  reserves: CotisationReserve[];
  selectedKey: string;
  currentKey: string;
  frequency: DeclarationFrequency;
  currency: string;
}

export default function PeriodHistory({
  businessId,
  periods,
  reserves,
  selectedKey,
  currentKey,
  frequency,
  currency,
}: PeriodHistoryProps) {
  const reservesByPeriod = new Map(
    reserves.map((reserve) => [reserve.period_key, reserve])
  );

  const title =
    frequency === "monthly"
      ? "Historique des mois"
      : "Historique des trimestres";

  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Période
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                CA HT
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Taux
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Cotisations dues
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Versé à la CPS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                DCA
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <span className="sr-only">Détail</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {periods.map((period) => {
              const reserve = reservesByPeriod.get(period.periodKey);
              const isSelected = period.periodKey === selectedKey;
              const isCurrent = period.periodKey === currentKey;
              const href =
                period.periodKey === currentKey
                  ? businessPath(businessId, "/cotisations?tab=cps")
                  : businessPath(
                      businessId,
                      `/cotisations?tab=cps&period=${encodeURIComponent(period.periodKey)}`
                    );

              return (
                <tr
                  key={period.periodKey}
                  className={
                    isSelected
                      ? "bg-teal-50/70 dark:bg-teal-950/30"
                      : undefined
                  }
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {period.label}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-teal-700 dark:text-teal-300">
                        en cours
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(period.turnover, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {period.rate}%
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-amber-700 dark:text-amber-300">
                    {formatCurrency(period.cotisationsDue, currency)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PeriodPaidCell
                      periodKey={period.periodKey}
                      cotisationsDue={period.cotisationsDue}
                      initialReserve={reserve}
                      currency={currency}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {reserve?.declared_at ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        Déclaré
                      </span>
                    ) : (
                      "Non déclaré"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <Link
                      href={href}
                      className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Indiquez le montant déjà versé à la CPS pour chaque période. Les
        cotisations sont calculées avec le taux applicable à cette date
        (périodes 1, 2 ou régime de croisière).
      </p>
    </Card>
  );
}
