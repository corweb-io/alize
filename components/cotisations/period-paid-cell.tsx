"use client";

import { useBusinessId } from "@/lib/use-business-id";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import type { CotisationReserve } from "@/lib/types/database";
import type { PostgrestError } from "@supabase/supabase-js";

interface PeriodPaidCellProps {
  periodKey: string;
  cotisationsDue: number;
  initialReserve?: CotisationReserve | null;
  currency: string;
}

export default function PeriodPaidCell({
  periodKey,
  cotisationsDue,
  initialReserve,
  currency,
}: PeriodPaidCellProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const [paid, setPaid] = useState(
    Number(initialReserve?.amount_paid) > 0
      ? String(initialReserve?.amount_paid)
      : ""
  );
  const [savedPaid, setSavedPaid] = useState(
    Number(initialReserve?.amount_paid ?? 0)
  );
  const [loading, setLoading] = useState(false);

  const paidNum = parseFloat(paid.replace(",", ".")) || 0;
  const remaining = Math.round((cotisationsDue - paidNum) * 100) / 100;

  const persist = async (nextPaid: number) => {
    if (nextPaid === savedPaid) return;

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
      amount_paid: nextPaid,
      updated_at: new Date().toISOString(),
    };

    let error: PostgrestError | null = null;

    if (initialReserve) {
      ({ error } = await supabase
        .from("cotisation_reserves")
        .update(payload)
        .eq("id", initialReserve.id));
    } else {
      ({ error } = await supabase.from("cotisation_reserves").insert({
        business_id: businessId,
        period_key: periodKey,
        amount_set_aside: 0,
        ...payload,
      }));

      if (error?.code === "23505") {
        ({ error } = await supabase
          .from("cotisation_reserves")
          .update(payload)
          .eq("business_id", businessId)
          .eq("period_key", periodKey));
      }
    }

    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
    } else {
      setSavedPaid(nextPaid);
      toast.success("Montant versé enregistré");
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        aria-label="Montant versé à la CPS"
        value={paid}
        disabled={loading}
        onChange={(event) => setPaid(event.target.value)}
        onBlur={() => persist(paidNum)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        placeholder="0,00"
        className="w-28 rounded-lg border border-stone-200 bg-white/90 px-2 py-1.5 text-right text-sm text-stone-900 placeholder-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800/90 dark:text-white"
      />
      <p
        className={`text-xs ${
          remaining > 0
            ? "text-amber-700 dark:text-amber-300"
            : paidNum > 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {cotisationsDue === 0 && paidNum === 0
          ? "—"
          : remaining > 0
            ? `Reste ${formatCurrency(remaining, currency)}`
            : "Soldé"}
      </p>
    </div>
  );
}
