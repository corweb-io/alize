"use client";

import { useBusinessId } from "@/lib/use-business-id";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import type { ObligationItem } from "@/lib/finance/obligations";
import {
  getDaysUntilDue,
  getObligationStatus,
} from "@/lib/finance/obligations-st-barth";

interface ObligationTrackerProps {
  obligations: ObligationItem[];
  year: number;
  currency?: string;
}

const STATUS_STYLES = {
  paid: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    label: "Payée",
  },
  overdue: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    label: "En retard",
  },
  due_soon: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    label: "Échéance proche",
  },
  upcoming: {
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
    label: "À venir",
  },
} as const;

function ObligationRow({
  obligation,
  currency,
}: {
  obligation: ObligationItem;
  currency: string;
}) {
  const businessId = useBusinessId();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [amountDue, setAmountDue] = useState(String(obligation.amountDue));
  const [amountPaid, setAmountPaid] = useState(String(obligation.amountPaid));
  const [paidAt, setPaidAt] = useState(obligation.paidAt ?? "");
  const [notes, setNotes] = useState(obligation.notes ?? "");

  const amountDueNum = parseFloat(amountDue) || 0;
  const amountPaidNum = parseFloat(amountPaid) || 0;
  const remaining = Math.max(0, amountDueNum - amountPaidNum);
  const status = getObligationStatus(
    amountDueNum,
    amountPaidNum,
    obligation.dueDate
  );
  const daysUntilDue = getDaysUntilDue(obligation.dueDate);
  const statusStyle = STATUS_STYLES[status];

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(value);

  const handleSave = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vous devez être connecté");
      setLoading(false);
      return;
    }

    const payload = {
      business_id: businessId,
      year: obligation.year,
      obligation_type: obligation.type,
      amount_due: amountDueNum,
      amount_paid: amountPaidNum,
      paid_at: paidAt || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = obligation.recordId
      ? await supabase
          .from("annual_obligations")
          .update(payload)
          .eq("id", obligation.recordId)
      : await supabase.from("annual_obligations").insert(payload);

    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
    } else {
      toast.success(`${obligation.label} enregistrée`);
    }

    setLoading(false);
  };

  const handleMarkPaid = () => {
    setAmountPaid(amountDue);
    if (!paidAt) {
      setPaidAt(new Date().toISOString().slice(0, 10));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {obligation.label}
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle.badge}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {obligation.fullName}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            Échéance{" "}
            {obligation.dueDate.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {status !== "paid" && daysUntilDue >= 0 && (
            <p className="font-medium text-gray-900 dark:text-white">
              J-{daysUntilDue}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {obligation.description}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Montant dû
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {formatAmount(amountDueNum)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Montant payé
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {formatAmount(amountPaidNum)}
          </p>
        </div>
        <div
          className={`rounded-lg p-3 ${
            remaining > 0
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-green-50 dark:bg-green-900/20"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              remaining > 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-green-700 dark:text-green-300"
            }`}
          >
            Reste à payer
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              remaining > 0
                ? "text-amber-900 dark:text-amber-100"
                : "text-green-900 dark:text-green-100"
            }`}
          >
            {formatAmount(remaining)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Montant dû (€)"
          type="number"
          step="0.01"
          min="0"
          value={amountDue}
          onChange={(e) => setAmountDue(e.target.value)}
        />
        <Input
          label="Montant payé (€)"
          type="number"
          step="0.01"
          min="0"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
        />
        <Input
          label="Date de paiement"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes
        </label>
        <textarea
          className="w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-teal-600 focus:ring-teal-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          rows={2}
          placeholder="Référence de virement, numéro SIRET…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a
          href={obligation.paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-300"
        >
          {obligation.paymentLabel} →
        </a>
        <div className="flex gap-2">
          {amountPaidNum < amountDueNum && (
            <Button type="button" variant="secondary" onClick={handleMarkPaid}>
              Marquer comme payée
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ObligationTracker({
  obligations,
  year,
  currency = "EUR",
}: ObligationTrackerProps) {
  if (obligations.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Aucune obligation territoriale due pour {year} (exonération possible en
        année de création).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Taxes annuelles de la Collectivité et d&apos;Ouanalao Environnement pour{" "}
        {year}. Échéance habituelle : 31 mars.
      </p>
      {obligations.map((obligation) => (
        <ObligationRow
          key={obligation.type}
          obligation={obligation}
          currency={currency}
        />
      ))}
    </div>
  );
}
