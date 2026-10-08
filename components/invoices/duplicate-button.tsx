"use client";

import { useState } from "react";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/button";

interface DuplicateButtonProps {
  invoiceId: string;
}

export default function DuplicateButton({ invoiceId }: DuplicateButtonProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/duplicate`, {
        method: "POST",
      });

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data?.error === "quota_exceeded") {
          toast.error("Limite de la formule gratuite atteinte", {
            description: "Passez à Pro pour créer plus de factures ce mois-ci.",
            action: {
              label: "Passer à Pro",
              onClick: () => router.push("/account/billing"),
            },
          });
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Duplication impossible");
      }

      const data = await response.json();
      toast.success("Facture dupliquée");
      router.push(businessPath(businessId, `/invoices/${data.id}`));
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";
      console.error("Error duplicating invoice:", error);
      toast.error("Duplication impossible", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleDuplicate} disabled={loading}>
      {loading ? "Duplication…" : "Dupliquer"}
    </Button>
  );
}
