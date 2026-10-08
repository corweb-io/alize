"use client";

import { useBusinessId } from "@/lib/use-business-id";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { CPS_DCA_URL } from "@/lib/finance/declarations";
import type { DeclarationSummary } from "@/lib/finance/declarations";
import type { CotisationReserve } from "@/lib/types/database";

interface DeclarationTrackerProps {
  declaration: DeclarationSummary;
  initialReserve?: CotisationReserve | null;
  currency?: string;
}

const STATUS_STYLES = {
  declared: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    label: "Déclarée",
    container: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-950/20",
  },
  ok: {
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
    label: "À venir",
    container: "border-teal-200/80 bg-teal-50/40 dark:border-teal-500/20 dark:bg-teal-950/20",
  },
  due_soon: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    label: "Échéance proche",
    container: "border-amber-200/80 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-950/20",
  },
  overdue: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    label: "En retard",
    container: "border-red-200/80 bg-red-50/60 dark:border-red-500/20 dark:bg-red-950/20",
  },
} as const;

export default function DeclarationTracker({
  declaration,
  initialReserve,
  currency = "EUR",
}: DeclarationTrackerProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [declaredAt, setDeclaredAt] = useState(declaration.declaredAt);
  const [declaredTurnover, setDeclaredTurnover] = useState(
    String(
      declaration.declaredTurnover ?? Math.round(declaration.turnoverEstimate)
    )
  );
  const declaredTurnoverNum = parseFloat(declaredTurnover.replace(",", "."));

  const status = declaredAt ? "declared" : declaration.status;
  const styles = STATUS_STYLES[status];

  const handleMarkDeclared = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vous devez être connecté");
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      business_id: businessId,
      period_key: declaration.periodKey,
      amount_set_aside: initialReserve?.amount_set_aside ?? 0,
      amount_paid: initialReserve?.amount_paid ?? 0,
      notes: initialReserve?.notes ?? null,
      declared_at: today,
      declared_turnover: Number.isFinite(declaredTurnoverNum)
        ? declaredTurnoverNum
        : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = initialReserve
      ? await supabase
          .from("cotisation_reserves")
          .update(payload)
          .eq("id", initialReserve.id)
      : await supabase.from("cotisation_reserves").insert(payload);

    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
    } else {
      setDeclaredAt(today);
      toast.success("Déclaration enregistrée");
      router.refresh();
    }

    setLoading(false);
  };

  const handleUndoDeclared = async () => {
    setLoading(true);

    if (!initialReserve?.id) {
      setDeclaredAt(null);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("cotisation_reserves")
      .update({
        declared_at: null,
        declared_turnover: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", initialReserve.id);

    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
    } else {
      setDeclaredAt(null);
      toast.success("Déclaration réinitialisée");
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Déclaration DCA · {declaration.periodLabel}
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
            >
              {styles.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Échéance :{" "}
            {declaration.deadline.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {!declaredAt && declaration.daysUntilDeadline >= 0 && (
              <span className="font-medium text-gray-900 dark:text-white">
                {" "}
                · J-{declaration.daysUntilDeadline}
              </span>
            )}
            {declaredAt && (
              <span className="text-emerald-700 dark:text-emerald-300">
                {" "}
                · déclarée le{" "}
                {new Date(declaredAt).toLocaleDateString("fr-FR")}
              </span>
            )}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {declaredAt && declaration.declaredTurnover !== null ? (
          <>
            CA déclaré :{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(declaration.declaredTurnover, currency)}
            </span>
            {Math.abs(declaration.declaredTurnover - declaration.turnoverEstimate) >= 1 && (
              <> (encaissé : {formatCurrency(declaration.turnoverEstimate, currency)})</>
            )}
          </>
        ) : (
          <>
            CA estimé sur la période :{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(declaration.turnoverEstimate, currency)}
            </span>
          </>
        )}
        {declaration.cotisationsEstimate > 0 && (
          <>
            {" "}
            · cotisations estimées :{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(declaration.cotisationsEstimate, currency)}
            </span>
          </>
        )}
      </p>

      {!declaredAt && (
        <div className="mt-4 max-w-xs">
          <Input
            label="CA déclaré à la CPS"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={declaredTurnover}
            onChange={(e) => setDeclaredTurnover(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={CPS_DCA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-300"
        >
          Déclarer sur le site CPS →
        </a>
        <div className="ml-auto flex gap-2">
          {declaredAt ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleUndoDeclared}
              disabled={loading}
            >
              Annuler
            </Button>
          ) : (
            <Button onClick={handleMarkDeclared} disabled={loading}>
              {loading ? "Enregistrement…" : "Marquer comme déclarée"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
