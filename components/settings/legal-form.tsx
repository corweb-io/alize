"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import type { Profile } from "@/components/settings/profile-types";
import { useProfileUpdate } from "@/components/settings/use-profile-update";
import { getLegalFormDefinition } from "@/lib/finance/legal-forms";

interface LegalFormProps {
  profile: Profile;
}

export default function LegalForm({ profile }: LegalFormProps) {
  const { save, loading, error } = useProfileUpdate();
  const legalForm = getLegalFormDefinition(profile.fiscal_settings);
  const [shareCapital, setShareCapital] = useState(
    profile.legal_info?.share_capital?.toString() ?? ""
  );
  const [legalInfo, setLegalInfo] = useState({
    company_type: profile.legal_info?.company_type || "",
    siret: profile.legal_info?.siret || "",
    siren: profile.legal_info?.siren || "",
    rcs: profile.legal_info?.rcs || "",
    ape_naf: profile.legal_info?.ape_naf || "",
    tva_number: profile.legal_info?.tva_number || "",
    service_type: profile.legal_info?.service_type || "",
    late_payment_notice: profile.legal_info?.late_payment_notice || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capital = parseFloat(shareCapital.replace(",", "."));
    await save({
      legal_info: {
        ...legalInfo,
        share_capital:
          legalForm.requiresShareCapital && Number.isFinite(capital)
            ? capital
            : undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <Card title="Informations légales">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Ces informations apparaîtront en bas de vos factures.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800/60">
            <span className="text-gray-700 dark:text-gray-300">
              Forme juridique :{" "}
              <span className="font-medium">{legalForm.label}</span>
            </span>
            <Link
              href="/settings?tab=fiscal"
              className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
            >
              Modifier
            </Link>
          </div>

          {legalForm.requiresShareCapital && (
            <Input
              label="Capital social (€)"
              type="number"
              min="0"
              step="0.01"
              placeholder="ex. 1000"
              value={shareCapital}
              onChange={(e) => setShareCapital(e.target.value)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="SIRET"
              placeholder="ex. 978 934 560 00019"
              value={legalInfo.siret}
              onChange={(e) =>
                setLegalInfo({ ...legalInfo, siret: e.target.value })
              }
            />

            <Input
              label="SIREN"
              placeholder="ex. 978 934 560"
              value={legalInfo.siren}
              onChange={(e) =>
                setLegalInfo({ ...legalInfo, siren: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="RCS (ville)"
              placeholder="ex. Paris, Basse-Terre"
              value={legalInfo.rcs}
              onChange={(e) =>
                setLegalInfo({ ...legalInfo, rcs: e.target.value })
              }
            />

            <Input
              label="Code APE/NAF"
              placeholder="ex. 6201Z"
              value={legalInfo.ape_naf}
              onChange={(e) =>
                setLegalInfo({ ...legalInfo, ape_naf: e.target.value })
              }
            />
          </div>

          <Input
            label="N° TVA intracommunautaire"
            placeholder="ex. FR 70 978 934 560"
            value={legalInfo.tva_number}
            onChange={(e) =>
              setLegalInfo({ ...legalInfo, tva_number: e.target.value })
            }
          />

          <Input
            label="Type de prestation"
            placeholder="ex. Prestation de service"
            value={legalInfo.service_type}
            onChange={(e) =>
              setLegalInfo({ ...legalInfo, service_type: e.target.value })
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pénalités de retard de paiement
            </label>
            <textarea
              className="w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-teal-600 focus:ring-teal-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              rows={3}
              placeholder="ex. En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 euros sera exigée…"
              value={legalInfo.late_payment_notice}
              onChange={(e) =>
                setLegalInfo({
                  ...legalInfo,
                  late_payment_notice: e.target.value,
                })
              }
            />
          </div>
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
