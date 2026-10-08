"use client";

import { useBusinessId } from "@/lib/use-business-id";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import type { CotisationReserve } from "@/lib/types/database";

interface ReserveTrackerProps {
  periodKey: string;
  periodLabel: string;
  cotisationsDue: number;
  initialReserve?: CotisationReserve | null;
  currency?: string;
}

export default function ReserveTracker({
  periodKey,
  periodLabel,
  cotisationsDue,
  initialReserve,
  currency = "EUR",
}: ReserveTrackerProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [setAside, setSetAside] = useState(
    String(initialReserve?.amount_set_aside ?? "")
  );
  const [paid, setPaid] = useState(String(initialReserve?.amount_paid ?? ""));
  const [notes, setNotes] = useState(initialReserve?.notes ?? "");

  const setAsideNum = parseFloat(setAside) || 0;
  const paidNum = parseFloat(paid) || 0;
  const gap = cotisationsDue - setAsideNum;
  const remainingToPay = Math.max(0, cotisationsDue - paidNum);
  const remaining = setAsideNum - paidNum;

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
      period_key: periodKey,
      amount_set_aside: setAsideNum,
      amount_paid: paidNum,
      notes: notes || null,
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
      toast.success("Provisions enregistrées");
      router.refresh();
    }

    setLoading(false);
  };

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(value);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Suivez les montants provisionnés et versés à la CPS pour{" "}
        <span className="font-medium">{periodLabel}</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-teal-50 p-4 dark:bg-teal-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Estimation due
          </p>
          <p className="mt-1 text-xl font-semibold text-teal-900 dark:text-teal-100">
            {formatAmount(cotisationsDue)}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 ${
            gap > 0
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-green-50 dark:bg-green-900/20"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              gap > 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-green-700 dark:text-green-300"
            }`}
          >
            Reste à provisionner
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              gap > 0
                ? "text-amber-900 dark:text-amber-100"
                : "text-green-900 dark:text-green-100"
            }`}
          >
            {formatAmount(Math.max(0, gap))}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 ${
            remainingToPay > 0
              ? "bg-gray-50 dark:bg-zinc-800"
              : "bg-green-50 dark:bg-green-900/20"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              remainingToPay > 0
                ? "text-gray-600 dark:text-gray-400"
                : "text-green-700 dark:text-green-300"
            }`}
          >
            Reste à payer
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              remainingToPay > 0
                ? "text-gray-900 dark:text-white"
                : "text-green-900 dark:text-green-100"
            }`}
          >
            {formatAmount(remainingToPay)}
          </p>
          {setAsideNum > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provision disponible : {formatAmount(Math.max(0, remaining))}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Montant provisionné"
          type="number"
          step="0.01"
          min="0"
          value={setAside}
          onChange={(e) => setSetAside(e.target.value)}
          placeholder="0,00"
        />
        <Input
          label="Montant versé à la CPS"
          type="number"
          step="0.01"
          min="0"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          className="w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-teal-600 focus:ring-teal-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          rows={2}
          placeholder="Référence DCA, date de paiement…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
