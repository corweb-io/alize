"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/ui/select";
import type { DeclarationFrequency } from "@/lib/types/database";

export interface PeriodOption {
  key: string;
  label: string;
  isCurrent: boolean;
}

interface PeriodSelectProps {
  periods: PeriodOption[];
  selectedKey: string;
  frequency: DeclarationFrequency;
}

export default function PeriodSelect({
  periods,
  selectedKey,
  frequency,
}: PeriodSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentKey = periods.find((period) => period.isCurrent)?.key;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      const value = event.target.value;
      if (!currentKey || value === currentKey) {
        params.delete("period");
      } else {
        params.set("period", value);
      }
      const query = params.toString();
      router.replace(query ? `/cotisations?${query}` : "/cotisations", {
        scroll: false,
      });
    },
    [currentKey, router, searchParams]
  );

  const options = periods.map((period) => ({
    value: period.key,
    label: period.isCurrent ? `${period.label} (en cours)` : period.label,
  }));

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-teal-900/8 bg-white/90 px-5 py-4 shadow-lg shadow-teal-900/5 ring-1 ring-teal-900/5 dark:border-teal-500/15 dark:bg-stone-900/90 dark:ring-teal-500/10">
      <div className="min-w-[16rem] max-w-xs flex-1">
        <Select
          id="cotisation-period"
          label={frequency === "monthly" ? "Mois" : "Trimestre"}
          options={options}
          value={selectedKey}
          onChange={handleChange}
        />
      </div>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
        Consultez le CA, le taux applicable et les cotisations dues pour chaque
        {frequency === "monthly" ? " mois" : " trimestre"}.
      </p>
    </div>
  );
}
