import Link from "next/link";
import { businessPath } from "@/lib/business-path";
import { formatCurrency } from "@/lib/utils/format";
import type { ChargesSummary } from "@/lib/finance/charges";

interface TotalChargesCardProps {
  businessId: string;
  charges: ChargesSummary;
  periodTurnover: number;
  currency?: string;
  compact?: boolean;
}

export default function TotalChargesCard({
  businessId,
  charges,
  periodTurnover,
  currency = "EUR",
  compact = false,
}: TotalChargesCardProps) {
  if (compact) {
    return (
      <Link
        href={businessPath(businessId, "/cotisations")}
        className="block overflow-hidden rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white p-5 shadow-lg shadow-teal-900/5 ring-1 ring-teal-900/5 transition-all hover:shadow-xl hover:ring-teal-700/20 dark:border-teal-500/20 dark:from-teal-950/30 dark:to-stone-900/90 dark:ring-teal-500/10"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
              À provisionner · {charges.periodLabel}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-[#1a454f] dark:text-teal-50">
              {formatCurrency(charges.total, currency)}
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              sur {formatCurrency(periodTurnover, currency)} de CA HT
            </p>
          </div>
          <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
            Détail →
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
          {charges.lines.map((line) => (
            <span key={line.key}>
              {line.label} :{" "}
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {formatCurrency(line.amount, currency)}
              </span>
            </span>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total à provisionner · {charges.periodLabel}
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(charges.total, currency)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            sur {formatCurrency(periodTurnover, currency)} de CA HT facturé
          </p>
        </div>
      </div>

      <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {charges.lines.map((line) => (
          <div
            key={line.key}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <dt className="text-gray-600 dark:text-gray-400">{line.label}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(line.amount, currency)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-3 text-sm dark:bg-zinc-800">
          <dt className="font-semibold text-gray-900 dark:text-white">Total</dt>
          <dd className="font-semibold text-teal-800 dark:text-teal-200">
            {formatCurrency(charges.total, currency)}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Estimation basée sur votre CA payé et les montants annuels CFAE/TED
        répartis sur la période ({charges.periodLabel}). Les cotisations CPS
        sont calculées selon votre barème DROM.
      </p>
    </div>
  );
}
