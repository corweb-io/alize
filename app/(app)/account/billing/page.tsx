import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCurrentPlan,
  getUsage,
} from "@/lib/billing/entitlements";
import CheckoutStatus from "@/components/billing/checkout-status";
import UpgradeCard from "@/components/billing/upgrade-card";
import ManageButton from "@/components/billing/manage-button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import StatCard from "@/components/ui/stat-card";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PLAN_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  canceled: "Annulé",
  past_due: "Impayé",
  trialing: "Essai",
};

const PRO_FEATURES = [
  "Support prioritaire",
  "Accès anticipé aux nouvelles fonctionnalités",
];

const clientsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const invoiceIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ status }, plan, usage] = await Promise.all([
    searchParams,
    getCurrentPlan(),
    getUsage(),
  ]);

  const isPro = plan.plan === "pro";

  return (
    <div className="space-y-8">
      <CheckoutStatus status={status} />

      <PageHeader
        title="Abonnement"
        description="Gérez votre formule et suivez votre utilisation."
        actions={isPro ? <ManageButton /> : undefined}
      />

      <Panel accent padding={false}>
        <div
          className={`p-6 sm:p-8 ${
            isPro
              ? "bg-gradient-to-br from-teal-800/5 via-transparent to-teal-900/10 dark:from-teal-900/20 dark:to-teal-950/40"
              : ""
          }`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <PlanBadge isPro={isPro} />
                {isPro && plan.status !== "active" && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1a454f] dark:text-teal-50">
                  Formule {isPro ? "Pro" : "Gratuite"}
                </h2>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {isPro
                    ? "Merci pour votre soutien — vous bénéficiez des avantages Pro."
                    : "Accès complet à toutes les fonctionnalités, sans limite de clients ni de factures."}
                </p>
              </div>

              {isPro && plan.current_period_end && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-teal-900/10 bg-white/60 px-3 py-2 text-sm dark:border-teal-500/20 dark:bg-stone-900/60">
                  <svg
                    className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-stone-600 dark:text-stone-400">
                    {plan.cancel_at_period_end ? "Expire le" : "Renouvellement le"}
                  </span>
                  <span className="font-medium text-[#1a454f] dark:text-teal-50">
                    {formatDate(plan.current_period_end)}
                  </span>
                </div>
              )}
            </div>

            <ul className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-[220px] lg:grid-cols-1">
              {(isPro
                ? PRO_FEATURES
                : [
                    "Clients illimités",
                    "Factures illimitées",
                    "Devis et cotisations",
                  ]
              ).map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      isPro
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1a454f] dark:text-teal-50">
          Utilisation ce mois-ci
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Clients"
            value={usage.clients}
            icon={clientsIcon}
            iconClassName="bg-teal-600 text-white"
          />
          <StatCard
            label="Factures ce mois-ci"
            value={usage.invoicesThisMonth}
            icon={invoiceIcon}
            iconClassName="bg-teal-700 text-white"
          />
        </div>
      </section>

      {!isPro && <UpgradeCard />}
    </div>
  );
}

function PlanBadge({ isPro }: { isPro: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        isPro
          ? "bg-teal-800 text-white shadow-sm shadow-teal-900/20 dark:bg-teal-700"
          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
      }`}
    >
      {isPro && (
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {isPro ? "Pro" : "Gratuit"}
    </span>
  );
}
