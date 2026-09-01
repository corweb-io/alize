"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";

interface StatusToggleProps {
  invoiceId: string;
  currentStatus: string;
  paidAt?: string | null;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function StatusToggle({
  invoiceId,
  currentStatus,
  paidAt,
}: StatusToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [askPaidDate, setAskPaidDate] = useState(false);
  const [encaissementDate, setEncaissementDate] = useState(
    paidAt || todayIsoDate()
  );

  const updateStatus = async (newStatus: string, paidOn?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          paid_at: newStatus === "paid" ? paidOn : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Mise à jour impossible");
      }

      const displayDate = (paidOn || "").split("-").reverse().join("/");
      toast.success(
        newStatus === "paid"
          ? `Facture encaissée le ${displayDate}`
          : `Facture marquée comme ${getInvoiceStatusLabel(newStatus).toLowerCase()}`
      );
      setAskPaidDate(false);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";
      console.error("Error updating status:", error);
      toast.error("Mise à jour du statut impossible", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const openPaidDateModal = () => {
    setEncaissementDate(paidAt || todayIsoDate());
    setAskPaidDate(true);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== "paid" && (
        <Button
          variant="primary"
          size="sm"
          onClick={openPaidDateModal}
          disabled={loading}
        >
          Marquer payée
        </Button>
      )}
      {currentStatus === "paid" && (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={openPaidDateModal}
            disabled={loading}
          >
            Modifier la date d&apos;encaissement
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateStatus("unpaid")}
            disabled={loading}
          >
            Marquer non payée
          </Button>
        </>
      )}
      {currentStatus === "draft" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => updateStatus("sent")}
          disabled={loading}
        >
          Marquer envoyée
        </Button>
      )}

      <Modal
        isOpen={askPaidDate}
        onClose={() => setAskPaidDate(false)}
        title={
          currentStatus === "paid"
            ? "Date d'encaissement"
            : "Marquer la facture comme payée"
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Indiquez le jour où le paiement a été reçu. C&apos;est cette date
            qui rattache le CA au trimestre CPS, pas la date de facture.
          </p>
          <Input
            id="paid-at"
            label="Date d'encaissement"
            type="date"
            required
            max={todayIsoDate()}
            value={encaissementDate}
            onChange={(e) => setEncaissementDate(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAskPaidDate(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => updateStatus("paid", encaissementDate)}
              disabled={loading || !encaissementDate}
            >
              {loading ? "Enregistrement…" : "Confirmer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
