"use client";

import { useRouter } from "next/navigation";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button";

interface ConvertQuoteButtonProps {
  quoteId: string;
  disabled?: boolean;
}

export default function ConvertQuoteButton({
  quoteId,
  disabled = false,
}: ConvertQuoteButtonProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: "POST",
      });

      if (res.status === 403) {
        toast.error("Limite de la formule gratuite atteinte", {
          description:
            "Vous avez utilisé vos 3 factures ce mois-ci. Passez à Pro pour un accès illimité.",
        });
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        toast.info("Ce devis a déjà été converti");
        if (data.invoiceId) {
          router.push(businessPath(businessId, `/invoices/${data.invoiceId}`));
        }
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Conversion impossible");
      }

      const data = await res.json();
      toast.success("Devis converti en facture");
      router.push(businessPath(businessId, `/invoices/${data.id}`));
      router.refresh();
    } catch (err) {
      toast.error("Conversion impossible", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleConvert} disabled={loading || disabled}>
      {loading ? "Conversion…" : "Convertir en facture"}
    </Button>
  );
}
