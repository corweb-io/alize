"use client";

import Link from "next/link";
import Button from "@/components/ui/button";
import Panel from "@/components/ui/panel";

interface QuotaReachedProps {
  resource: "clients" | "invoices";
  used: number;
  limit: number;
}

export default function QuotaReached({
  resource,
  used,
  limit,
}: QuotaReachedProps) {
  const noun =
    resource === "clients" ? "clients" : "factures ce mois-ci";

  return (
    <Panel className="space-y-3 border-amber-200/60 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30">
      <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
        Limite de la formule gratuite atteinte
      </h2>
      <p className="text-sm text-amber-800 dark:text-amber-300">
        Vous utilisez {used} sur {limit} {noun} avec la formule gratuite.
        Passez à Pro pour un accès illimité.
      </p>
      <div>
        <Link href="/account/billing">
          <Button>Passer à Pro</Button>
        </Link>
      </div>
    </Panel>
  );
}
