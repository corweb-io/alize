"use client";

import { useState, useEffect } from "react";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/utils/format";

interface InvoiceItem {
  id?: string;
  description: string;
  additional_info?: string;
  unit_price_ht: number;
  quantity: number;
  total_ht: number;
  order_index: number;
}

interface Invoice {
  id?: string;
  reference?: string;
  version?: string;
  client_id?: string;
  client_reference?: string;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  currency?: string;
  status?: string;
  vat_applicable: boolean;
  vat_article?: string;
  notes?: string;
  items?: InvoiceItem[];
}

interface Client {
  id: string;
  name: string;
  reference: string;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  clients?: Client[];
  defaultCurrency?: string;
  documentType?: "invoice" | "quote";
}

export default function InvoiceForm({
  invoice,
  clients = [],
  defaultCurrency = "EUR",
  documentType = "invoice",
}: InvoiceFormProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const isQuote = documentType === "quote";
  const docLabel = isQuote ? "devis" : "facture";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientsList, setClientsList] = useState<Client[]>(clients);
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items || [
      {
        description: "",
        unit_price_ht: 0,
        quantity: 1,
        total_ht: 0,
        order_index: 0,
      },
    ]
  );

  const [formData, setFormData] = useState<Invoice>({
    reference: invoice?.reference || "",
    client_id: invoice?.client_id || "",
    client_reference: invoice?.client_reference || "",
    invoice_date:
      invoice?.invoice_date || new Date().toISOString().split("T")[0],
    due_date:
      invoice?.due_date ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    payment_method: invoice?.payment_method || "Virement",
    currency: invoice?.currency || defaultCurrency,
    vat_applicable: invoice?.vat_applicable || false,
    vat_article: invoice?.vat_article || "",
    notes: invoice?.notes || "",
  });

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, name, reference")
      .eq("business_id", businessId)
      .order("name");

    if (data) {
      setClientsList(data);
    }
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "unit_price_ht" || field === "quantity") {
      newItems[index].total_ht =
        parseFloat(newItems[index].unit_price_ht.toString()) *
        parseFloat(newItems[index].quantity.toString());
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        unit_price_ht: 0,
        quantity: 1,
        total_ht: 0,
        order_index: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total_ht || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté");
      toast.error("Vous devez être connecté");
      setLoading(false);
      return;
    }

    if (!formData.client_id) {
      setError("Veuillez sélectionner un client");
      toast.error("Veuillez sélectionner un client");
      setLoading(false);
      return;
    }

    if (invoice?.id && !formData.reference?.trim()) {
      setError("La référence de facture est obligatoire");
      toast.error("La référence de facture est obligatoire");
      setLoading(false);
      return;
    }

    if (
      items.length === 0 ||
      items.some((item) => !item.description || item.total_ht === 0)
    ) {
      setError("Ajoutez au moins une ligne valide");
      toast.error("Ajoutez au moins une ligne valide");
      setLoading(false);
      return;
    }

    try {
      if (invoice?.id) {
        // Check if reference has changed and if it's unique
        if (formData.reference && formData.reference !== invoice.reference) {
          const { data: existingInvoice } = await supabase
            .from("invoices")
            .select("id")
            .eq("business_id", businessId)
            .eq("reference", formData.reference)
            .neq("id", invoice.id)
            .maybeSingle();

          if (existingInvoice) {
            setError("Une facture avec cette référence existe déjà");
            toast.error("Une facture avec cette référence existe déjà");
            setLoading(false);
            return;
          }
        }

        // Increment version when updating
        const currentVersion = parseFloat(invoice.version || "1.0");
        const newVersion = (currentVersion + 0.1).toFixed(1);

        // Update existing invoice
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            reference: formData.reference || invoice.reference,
            client_id: formData.client_id,
            client_reference: formData.client_reference?.trim() || null,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            payment_method: formData.payment_method,
            currency: formData.currency,
            vat_applicable: formData.vat_applicable,
            vat_article: formData.vat_article || null,
            notes: formData.notes || null,
            version: newVersion,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id)
          .eq("business_id", businessId);

        if (updateError) throw updateError;

        // Delete existing items and insert new ones
        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoice.id);
      } else {
        // Create via API route (enforces quota server-side, atomic insert).
        const selectedClient = clientsList.find(
          (c) => c.id === formData.client_id
        );
        if (!selectedClient) {
          throw new Error("Client introuvable");
        }
        const clientReference =
          formData.client_reference?.trim() || selectedClient.reference;

        const apiPath =
          documentType === "quote" ? "/api/quotes" : "/api/invoices";
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: businessId,
            client_id: formData.client_id,
            client_reference: clientReference,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            payment_method: formData.payment_method,
            currency: formData.currency,
            vat_applicable: formData.vat_applicable,
            vat_article: formData.vat_article || null,
            notes: formData.notes || null,
            items: items.map((item, index) => ({
              description: item.description,
              additional_info: item.additional_info || null,
              unit_price_ht: item.unit_price_ht,
              quantity: item.quantity,
              total_ht: item.total_ht,
              order_index: index,
            })),
          }),
        });

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data?.error === "quota_exceeded") {
            toast.error("Limite de la formule gratuite atteinte", {
              description:
                "Vous avez utilisé vos 3 factures ce mois-ci. Passez à Pro pour un accès illimité.",
              action: {
                label: "Passer à Pro",
                onClick: () => router.push("/account/billing"),
              },
            });
            setLoading(false);
            return;
          }
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Création impossible");
        }

        const { invoice: newInvoice, quote: newQuote } = await res.json();
        const created = newInvoice ?? newQuote;
        toast.success(
          documentType === "quote" ? "Devis créé" : "Facture créée"
        );
        router.push(
          businessPath(
            businessId,
            documentType === "quote"
              ? `/quotes/${created.id}`
              : `/invoices/${created.id}`
          )
        );
        router.refresh();
        return;
      }

      // Update items for existing invoice
      if (invoice?.id) {
        const itemsToInsert = items.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          additional_info: item.additional_info || null,
          unit_price_ht: item.unit_price_ht,
          quantity: item.quantity,
          total_ht: item.total_ht,
          order_index: index,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        toast.success(
          documentType === "quote" ? "Devis mis à jour" : "Facture mise à jour"
        );
        router.refresh();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      toast.error("Enregistrement impossible", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalHT = calculateTotal();
  const totalTTC = formData.vat_applicable ? totalHT * 1.2 : totalHT;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {invoice?.id && (
          <Input
            label={`Référence ${docLabel}`}
            required
            value={formData.reference || ""}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            placeholder={isQuote ? "ex. D-000001" : "ex. F-000067"}
          />
        )}

        <Select
          label="Client"
          required
          value={formData.client_id}
          onChange={(e) => {
            const selectedClient = clientsList.find(
              (c) => c.id === e.target.value
            );
            setFormData({
              ...formData,
              client_id: e.target.value,
              // Auto-fill client reference when client is selected (only if not already set)
              client_reference:
                formData.client_reference || selectedClient?.reference || "",
            });
          }}
          options={[
            { value: "", label: "Sélectionnez un client" },
            ...clientsList.map((client) => ({
              value: client.id,
              label: `${client.name} (${client.reference})`,
            })),
          ]}
        />

        <Input
          label="Référence client"
          value={formData.client_reference || ""}
          onChange={(e) =>
            setFormData({ ...formData, client_reference: e.target.value })
          }
          placeholder="ex. C-000001"
        />

        <Input
          label={isQuote ? "Date du devis" : "Date de facturation"}
          type="date"
          required
          value={formData.invoice_date}
          onChange={(e) =>
            setFormData({ ...formData, invoice_date: e.target.value })
          }
        />

        <Input
          label={isQuote ? "Valable jusqu'au" : "Date d'échéance"}
          type="date"
          required
          value={formData.due_date}
          onChange={(e) =>
            setFormData({ ...formData, due_date: e.target.value })
          }
        />

        <Select
          label="Mode de paiement"
          value={formData.payment_method}
          onChange={(e) =>
            setFormData({ ...formData, payment_method: e.target.value })
          }
          options={[
            { value: "Virement", label: "Virement" },
            { value: "Chèque", label: "Chèque" },
            { value: "Espèces", label: "Espèces" },
            { value: "Carte", label: "Carte" },
          ]}
        />

        <Select
          label="Devise"
          value={formData.currency || "EUR"}
          onChange={(e) =>
            setFormData({ ...formData, currency: e.target.value })
          }
          options={SUPPORTED_CURRENCIES.map((c) => ({
            value: c.code,
            label: c.name,
          }))}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lignes de facturation
          </h3>
          <Button type="button" variant="secondary" onClick={addItem}>
            Ajouter une ligne
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="space-y-4">
                <div className="space-y-4">
                  <Input
                    label="Description"
                    required
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="ex. Janvier 2024 ou jalon de projet"
                  />
                  <Input
                    label="Informations complémentaires"
                    value={item.additional_info || ""}
                    onChange={(e) =>
                      updateItem(index, "additional_info", e.target.value)
                    }
                    placeholder="Optionnel : dates, détails, etc."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Input
                      label="Prix HT"
                      type="number"
                      step="0.01"
                      required
                      value={item.unit_price_ht}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "unit_price_ht",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Input
                      label="Qté"
                      type="number"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-4 flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total
                      </label>
                      <div className="rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm">
                        {formatCurrency(item.total_ht, formData.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {items.length > 1 && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="vat_applicable"
              checked={formData.vat_applicable}
              onChange={(e) =>
                setFormData({ ...formData, vat_applicable: e.target.checked })
              }
              className="h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
            />
            <label
              htmlFor="vat_applicable"
              className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              TVA applicable
            </label>
          </div>
          {formData.vat_applicable && (
            <Input
              label="Article TVA"
              value={formData.vat_article || ""}
              onChange={(e) =>
                setFormData({ ...formData, vat_article: e.target.value })
              }
              placeholder="ex. 293 B du Code général des impôts"
            />
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-gray-50 dark:bg-zinc-800 p-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total HT:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(totalHT, formData.currency)}
            </span>
          </div>
          {formData.vat_applicable && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                TVA (20%):
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(totalTTC - totalHT, formData.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Total TTC:
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(totalTTC, formData.currency)}
            </span>
          </div>
        </div>
      </div>

      <Input
        label="Notes"
        value={formData.notes || ""}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Enregistrement…"
            : invoice
              ? `Mettre à jour le ${docLabel}`
              : `Créer le ${docLabel}`}
        </Button>
        {invoice && (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(
                businessPath(
                  businessId,
                  isQuote ? `/quotes/${invoice.id}` : `/invoices/${invoice.id}`
                )
              )
            }
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
