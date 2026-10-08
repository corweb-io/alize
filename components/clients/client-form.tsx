"use client";

import { useState, useMemo } from "react";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

interface Client {
  id?: string;
  reference: string;
  name: string;
  address?: string;
}

interface ClientFormProps {
  client?: Client;
  initialReference?: string;
}

export default function ClientForm({
  client,
  initialReference,
}: ClientFormProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialFormData = useMemo(
    () => ({
      reference: client?.reference || initialReference || "",
      name: client?.name || "",
      address: client?.address || "",
    }),
    [client, initialReference]
  );

  const [formData, setFormData] = useState<Client>(initialFormData);

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

    if (client?.id) {
      if (!formData.reference.trim()) {
        setError("La référence ne peut pas être vide");
        toast.error("La référence ne peut pas être vide");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          reference: formData.reference,
          name: formData.name,
          address: formData.address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id)
        .eq("business_id", businessId);

      if (updateError) {
        setError(updateError.message);
        toast.error("Mise à jour impossible", {
          description: updateError.message,
        });
        setLoading(false);
      } else {
        toast.success("Client mis à jour");
        router.refresh();
      }
    } else {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          reference: formData.reference || null,
          name: formData.name,
          address: formData.address || null,
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === "quota_exceeded") {
          toast.error("Limite de la formule gratuite atteinte", {
            description: "Passez à Pro pour ajouter plus de clients.",
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
        const msg = data?.error ?? "Création impossible";
        setError(msg);
        toast.error("Création impossible", { description: msg });
        setLoading(false);
      } else {
        toast.success("Client créé");
        router.push(businessPath(businessId, "/clients"));
        router.refresh();
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <Input
        label="Référence"
        onChange={(e) =>
          setFormData({ ...formData, reference: e.target.value })
        }
        value={formData.reference}
        placeholder="Générée automatiquement si vide"
      />

      <Input
        label="Nom"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <Input
        label="Adresse"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Enregistrement…"
            : client
              ? "Mettre à jour"
              : "Créer le client"}
        </Button>
        {client && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(businessPath(businessId, "/clients"))}
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
