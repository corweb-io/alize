"use client";

import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Panel from "@/components/ui/panel";
import { PRO_PRICING, type BillingInterval } from "@/lib/billing/pricing";

type Interval = BillingInterval;

const PRO_BENEFITS = [
  "Support prioritaire",
  "Accès anticipé aux nouvelles fonctionnalités",
  "Soutien au développement",
  "Résiliable à tout moment",
];

export default function UpgradeCard() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Impossible de démarrer le paiement");
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Paiement impossible", { description: msg });
      setLoading(false);
    }
  };

  return (
    <Panel accent padding={false}>
      <div className="grid lg:grid-cols-[1fr_auto] lg:divide-x lg:divide-teal-900/8 dark:lg:divide-teal-500/10">
        <div className="space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-[#1a454f] dark:text-teal-50">
              Passer à Pro
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Soutenez le projet et bénéficiez des avantages Pro.
            </p>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {PRO_BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-300"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center gap-5 border-t border-teal-900/8 bg-teal-800/[0.03] p-6 sm:p-8 dark:border-teal-500/10 dark:bg-teal-950/20 lg:min-w-[280px] lg:border-t-0">
          <div className="inline-flex self-start rounded-lg border border-teal-900/10 bg-white/80 p-1 dark:border-stone-700 dark:bg-stone-800/80">
            {(["monthly", "yearly"] as Interval[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  interval === opt
                    ? "bg-teal-800 text-white shadow-sm dark:bg-teal-700"
                    : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                {opt === "monthly" ? "Mensuel" : "Annuel"}
              </button>
            ))}
          </div>

          <div>
            <p className="text-3xl font-semibold tracking-tight text-[#1a454f] dark:text-teal-50">
              {PRO_PRICING[interval].label}
              <span className="text-base font-normal text-stone-400">
                {" "}
                / {PRO_PRICING[interval].per}
              </span>
            </p>
            {interval === "yearly" && (
              <p className="mt-1 text-sm text-teal-700 dark:text-teal-400">
                {PRO_PRICING.yearly.savings} par rapport au mensuel
              </p>
            )}
          </div>

          <Button onClick={startCheckout} disabled={loading} size="lg" className="w-full">
            {loading ? "Redirection…" : "Passer à Pro"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
