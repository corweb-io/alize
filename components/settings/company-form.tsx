"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/format";
import type { Business } from "@/lib/types/database";
import { useBusinessUpdate } from "@/components/settings/use-business-update";

interface CompanyFormProps {
  business: Business;
}

export default function CompanyForm({ business }: CompanyFormProps) {
  const { save, loading, error } = useBusinessUpdate();
  const [formData, setFormData] = useState({
    company_name: business.company_name || "",
    address: business.address || "",
    phone: business.phone || "",
    email: business.email || "",
    default_currency: business.default_currency || "EUR",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({
      company_name: formData.company_name || null,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      default_currency: formData.default_currency || "EUR",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <Card title="Informations entreprise">
        <div className="space-y-4">
          <Input
            label="Nom de l'entreprise"
            value={formData.company_name}
            onChange={(e) =>
              setFormData({ ...formData, company_name: e.target.value })
            }
          />

          <Input
            label="Adresse"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />

          <Input
            label="Téléphone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <Select
            label="Devise par défaut"
            value={formData.default_currency}
            onChange={(e) =>
              setFormData({ ...formData, default_currency: e.target.value })
            }
            options={SUPPORTED_CURRENCIES.map((c) => ({
              value: c.code,
              label: c.name,
            }))}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
