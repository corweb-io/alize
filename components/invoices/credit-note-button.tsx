"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";

interface CreditNoteButtonProps {
  invoiceId: string;
  invoiceReference: string;
}

function todayIsoDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function CreditNoteButton({
  invoiceId,
  invoiceReference,
}: CreditNoteButtonProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueDate, setIssueDate] = useState(todayIsoDate());
  const [reason, setReason] = useState("");

  const create = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_date: issueDate, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Création de l'avoir impossible");
      }

      toast.success(`Avoir ${data.reference} émis, ${invoiceReference} annulée`);
      setOpen(false);
      router.push(businessPath(businessId, `/invoices/${data.id}`));
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Avoir non émis", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Annuler par un avoir
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Annuler ${invoiceReference}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Une facture émise ne peut pas être supprimée. L&apos;avoir reprend
            toutes ses lignes en négatif, reçoit son propre numéro et
            {" "}{invoiceReference} passe au statut « Annulée ». Cette opération
            est définitive.
          </p>
          <Input
            id="credit-note-date"
            label="Date de l'avoir"
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Input
            id="credit-note-reason"
            label="Motif (facultatif, imprimé sur l'avoir)"
            placeholder="Ex. : projet annulé"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Retour
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={create}
              disabled={loading || !issueDate}
            >
              {loading ? "Émission…" : "Émettre l'avoir"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
