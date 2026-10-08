"use client";

import { useState } from "react";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";

interface DeleteButtonProps {
  invoiceId: string;
  invoiceReference?: string;
  onDeleted?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export default function DeleteButton({
  invoiceId,
  invoiceReference,
  onDeleted,
  variant = "secondary",
  size = "md",
}: DeleteButtonProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Suppression impossible");
      }

      toast.success("Facture supprimée");
      setShowConfirm(false);

      if (onDeleted) {
        onDeleted();
      } else {
        router.push(businessPath(businessId, "/invoices"));
        router.refresh();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";
      console.error("Error deleting invoice:", error);
      toast.error("Suppression impossible", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowConfirm(true)}
        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      >
        Supprimer
      </Button>
      <Modal
        isOpen={showConfirm}
        onClose={() => !loading && setShowConfirm(false)}
        title="Supprimer la facture"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Voulez-vous vraiment supprimer{" "}
            {invoiceReference && (
              <span className="font-semibold text-gray-900 dark:text-white">
                {invoiceReference}
              </span>
            )}{" "}
            ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Suppression…" : "Supprimer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
