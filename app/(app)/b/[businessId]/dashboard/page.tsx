import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { businessPath } from "@/lib/business-path";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import StatCard from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";
import { isMicroFiscalSettingsComplete } from "@/lib/finance/cotisations-st-barth";
import { getCotisationSummary } from "@/lib/finance/turnover";
import { getObligationSummary } from "@/lib/finance/obligations";
import { getPlafondSummary } from "@/lib/finance/plafonds";
import {
  buildDeclarationSummary,
  shouldShowDeclarationReminder,
} from "@/lib/finance/declarations";
import { computePeriodCharges } from "@/lib/finance/charges";
import { FISCAL_BASE_CURRENCY } from "@/lib/finance/currency";
import PlafondCard from "@/components/cotisations/plafond-card";
import TotalChargesCard from "@/components/cotisations/total-charges-card";
import type { FiscalSettings } from "@/lib/types/database";

const docIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const usersIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const coinIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const chartIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default async function DashboardPage({
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

  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select("id, reference, invoice_date, status, client_id, clients(name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(5);

  const business = await getBusiness(businessId);
  const fiscalSettings = (business.fiscal_settings || {}) as FiscalSettings;
  const fiscalCurrency = FISCAL_BASE_CURRENCY;
  const hasFiscalConfig = isMicroFiscalSettingsComplete(fiscalSettings);

  let cotisationData = null;
  let obligationData = null;
  let plafondData = null;
  let declarationData = null;
  let chargesData = null;
  if (hasFiscalConfig) {
    cotisationData = await getCotisationSummary(businessId, fiscalSettings);
    obligationData = await getObligationSummary(businessId, fiscalSettings);
    plafondData = getPlafondSummary(
      fiscalSettings.activity_type,
      cotisationData.ytdTurnover
    );
    chargesData = computePeriodCharges(
      fiscalSettings,
      cotisationData.periodSummary.turnover,
      cotisationData.periodSummary.label,
      cotisationData.periodSummary.startDate.getFullYear(),
      cotisationData.periodSummary.startDate
    );

    const { data: reserve } = await supabase
      .from("cotisation_reserves")
      .select("declared_at")
      .eq("business_id", businessId)
      .eq("period_key", cotisationData.periodSummary.periodKey)
      .maybeSingle();

    declarationData = buildDeclarationSummary(
      fiscalSettings,
      cotisationData.periodSummary,
      reserve?.declared_at
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        description="Bon retour ! Voici un aperçu de votre activité."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total factures"
          value={invoiceCount || 0}
          icon={docIcon}
          iconClassName="bg-teal-700 text-white"
          href={businessPath(businessId, "/invoices")}
        />
        <StatCard
          label="Total clients"
          value={clientCount || 0}
          icon={usersIcon}
          iconClassName="bg-teal-600 text-white"
          href={businessPath(businessId, "/clients")}
        />
        {cotisationData ? (
          <>
            <StatCard
              label={`Cotisations (${cotisationData.periodSummary.label})`}
              value={formatCurrency(
                cotisationData.periodSummary.cotisationsDue,
                fiscalCurrency
              )}
              icon={coinIcon}
              iconClassName="bg-amber-600 text-white"
              href={businessPath(businessId, "/cotisations")}
              valueClassName="text-amber-800 dark:text-amber-300"
            />
            <StatCard
              label={`CA ${new Date().getFullYear()}`}
              value={formatCurrency(cotisationData.ytdTurnover, fiscalCurrency)}
              icon={chartIcon}
              iconClassName="bg-[#1a454f] text-white"
              href={businessPath(businessId, "/cotisations")}
              valueClassName={
                plafondData && plafondData.status !== "ok"
                  ? plafondData.status === "critical"
                    ? "text-red-800 dark:text-red-300"
                    : "text-amber-800 dark:text-amber-300"
                  : undefined
              }
            />
          </>
        ) : null}
      </div>

      {chargesData && (
        <TotalChargesCard
                  businessId={businessId}
          charges={chargesData}
          periodTurnover={cotisationData!.periodSummary.turnover}
          currency={fiscalCurrency}
          compact
        />
      )}

      {plafondData && (
        <Link
          href={businessPath(businessId, "/cotisations")}
          className="block overflow-hidden rounded-xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-teal-900/5 ring-1 ring-teal-900/5 backdrop-blur-sm transition-all hover:shadow-xl hover:ring-teal-700/20 dark:border-stone-700/80 dark:bg-stone-900/90 dark:ring-teal-500/10"
        >
          <PlafondCard plafond={plafondData} currency={fiscalCurrency} />
        </Link>
      )}

      {declarationData && shouldShowDeclarationReminder(declarationData) && (
        <Link
          href={businessPath(businessId, "/cotisations")}
          className={`block overflow-hidden rounded-xl border p-5 transition-colors ${
            declarationData.status === "overdue"
              ? "border-red-200/80 bg-red-50/60 hover:border-red-300 dark:border-red-500/20 dark:bg-red-950/20"
              : "border-amber-200/80 bg-amber-50/60 hover:border-amber-300 dark:border-amber-500/20 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className={`text-sm font-semibold ${
                  declarationData.status === "overdue"
                    ? "text-red-900 dark:text-red-200"
                    : "text-amber-900 dark:text-amber-200"
                }`}
              >
                Déclaration DCA · {declarationData.periodLabel}
                {declarationData.status === "overdue"
                  ? " en retard"
                  : " à faire"}
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                Échéance{" "}
                {declarationData.deadline.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
                {declarationData.daysUntilDeadline >= 0 && (
                  <> · J-{declarationData.daysUntilDeadline}</>
                )}
                {" · CA estimé "}
                {formatCurrency(declarationData.turnoverEstimate, fiscalCurrency)}
              </p>
            </div>
            <span
              className={`text-sm font-medium ${
                declarationData.status === "overdue"
                  ? "text-red-800 dark:text-red-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}
            >
              Déclarer →
            </span>
          </div>
        </Link>
      )}

      {obligationData && obligationData.unpaidCount > 0 && (
        <Link
          href={businessPath(businessId, "/cotisations")}
          className="block overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/60 p-5 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {obligationData.unpaidCount} obligation
                {obligationData.unpaidCount !== 1 ? "s" : ""} à régler en{" "}
                {obligationData.year}
              </p>
              {obligationData.nextUnpaid && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  Prochaine échéance : {obligationData.nextUnpaid.label} (
                  {formatCurrency(
                    obligationData.nextUnpaid.amountDue -
                      obligationData.nextUnpaid.amountPaid,
                    fiscalCurrency
                  )}{" "}
                  restants · J-
                  {Math.max(0, obligationData.nextUnpaid.daysUntilDue)})
                </p>
              )}
            </div>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Voir →
            </span>
          </div>
        </Link>
      )}

      {recentInvoices && recentInvoices.length > 0 && (
        <Panel accent padding={false}>
          <div className="border-b border-teal-900/5 px-6 py-4 dark:border-teal-500/10">
            <h2 className="text-lg font-semibold text-[#1a454f] dark:text-teal-50">
              Factures récentes
            </h2>
          </div>
          <div className="divide-y divide-teal-900/5 dark:divide-stone-700">
            {recentInvoices.map(
              (invoice: {
                id: string;
                reference: string;
                invoice_date: string;
                status: string;
                clients: { name: string } | { name: string }[] | null;
              }) => {
                const clientName = Array.isArray(invoice.clients)
                  ? invoice.clients[0]?.name
                  : invoice.clients?.name;
                return (
                  <Link
                    key={invoice.id}
                    href={businessPath(businessId, `/invoices/${invoice.id}`)}
                    className="block px-6 py-4 transition-colors hover:bg-teal-50/40 dark:hover:bg-stone-800/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                          {invoice.reference}
                        </p>
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                          {clientName || "Client inconnu"} ·{" "}
                          {formatDate(invoice.invoice_date)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          invoice.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : invoice.status === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                              : invoice.status === "sent"
                                ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                                : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                        }`}
                      >
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
