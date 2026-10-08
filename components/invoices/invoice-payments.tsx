"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { InvoicePayment } from "@/lib/types/database";

interface InvoicePaymentsProps {
  invoiceId: string;
  payments: InvoicePayment[];
  totalTTC: number;
  paidTotal: number;
  remaining: number;
  currency?: string;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  paymentId: string | null;
  amount: string;
  paidOn: string;
  note: string;
};

export default function InvoicePayments({
  invoiceId,
  payments,
  totalTTC,
  paidTotal,
  remaining,
  currency,
}: InvoicePaymentsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const openNew = () =>
    setForm({
      paymentId: null,
      amount: remaining.toFixed(2),
      paidOn: todayIsoDate(),
      note: "",
    });

  const openEdit = (payment: InvoicePayment) =>
    setForm({
      paymentId: payment.id,
      amount: Number(payment.amount).toFixed(2),
      paidOn: payment.paid_on,
      note: payment.note ?? "",
    });

  const editingAmount = form?.paymentId
    ? Number(payments.find((p) => p.id === form.paymentId)?.amount ?? 0)
    : 0;
  const maxAmount = Math.round((remaining + editingAmount) * 100) / 100;

  const request = async (url: string, init: RequestInit, success: string) => {
    setLoading(true);
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Enregistrement impossible");
      }
      toast.success(success);
      setForm(null);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error("Paiement non enregistré", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!form) return;
    const body = JSON.stringify({
      amount: parseFloat(form.amount.replace(",", ".")),
      paid_on: form.paidOn,
      note: form.note,
    });
    if (form.paymentId) {
      request(
        `/api/invoices/${invoiceId}/payments/${form.paymentId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body },
        "Paiement modifié"
      );
    } else {
      request(
        `/api/invoices/${invoiceId}/payments`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
        "Paiement enregistré"
      );
    }
  };

  const remove = (payment: InvoicePayment) =>
    request(
      `/api/invoices/${invoiceId}/payments/${payment.id}`,
      { method: "DELETE" },
      "Paiement supprimé"
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a454f] dark:text-teal-50">
          Paiements reçus
        </h3>
        {remaining > 0 && (
          <Button variant="secondary" size="sm" onClick={openNew} disabled={loading}>
            Ajouter un paiement
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Aucun paiement enregistré.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 text-sm dark:divide-stone-700">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <span className="font-medium text-[#1a454f] dark:text-teal-50">
                  {formatDate(payment.paid_on)}
                </span>
                {payment.note && (
                  <span className="ml-2 text-stone-500 dark:text-stone-400">
                    {payment.note}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#1a454f] dark:text-teal-50">
                  {formatCurrency(Number(payment.amount), currency)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(payment)}
                  disabled={loading}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(payment)}
                  disabled={loading}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {payments.length > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-stone-500 dark:text-stone-400">
            Encaissé {formatCurrency(paidTotal, currency)} sur{" "}
            {formatCurrency(totalTTC, currency)}
          </span>
          {remaining > 0 && (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              Reste {formatCurrency(remaining, currency)}
            </span>
          )}
        </div>
      )}

      <Modal
        isOpen={form !== null}
        onClose={() => setForm(null)}
        title={form?.paymentId ? "Modifier le paiement" : "Ajouter un paiement"}
        size="sm"
      >
        {form && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Chaque paiement est rattaché au trimestre CPS de sa date
              d&apos;encaissement.
            </p>
            <Input
              id="payment-amount"
              label="Montant"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={maxAmount}
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              autoFocus
            />
            <Input
              id="payment-paid-on"
              label="Date d'encaissement"
              type="date"
              required
              max={todayIsoDate()}
              value={form.paidOn}
              onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
            />
            <Input
              id="payment-note"
              label="Note (facultatif)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setForm(null)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={save}
                disabled={
                  loading ||
                  !form.paidOn ||
                  !(parseFloat(form.amount.replace(",", ".")) > 0)
                }
              >
                {loading ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
