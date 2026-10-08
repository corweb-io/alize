"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import { ACTIVITY_TYPE_LABELS } from "@/lib/finance/cotisations-st-barth";
import {
  LEGAL_FORM_OPTIONS,
  getLegalForm,
  getLegalFormDefinition,
} from "@/lib/finance/legal-forms";
import type {
  ActivityType,
  DeclarationFrequency,
  FiscalSettings,
  LegalForm,
} from "@/lib/types/database";
import type { Business } from "@/lib/types/database";
import { useBusinessUpdate } from "@/components/settings/use-business-update";

interface FiscalFormProps {
  business: Business;
}

export default function FiscalForm({ business }: FiscalFormProps) {
  const { save, loading, error } = useBusinessUpdate();
  const [fiscalSettings, setFiscalSettings] = useState<FiscalSettings>({
    legal_form: getLegalForm(business.fiscal_settings),
    is_majority_manager: business.fiscal_settings?.is_majority_manager ?? true,
    activity_start_date: business.fiscal_settings?.activity_start_date || "",
    activity_type: business.fiscal_settings?.activity_type,
    declaration_frequency:
      business.fiscal_settings?.declaration_frequency || "quarterly",
    versement_liberatoire: business.fiscal_settings?.versement_liberatoire || false,
    employee_count: business.fiscal_settings?.employee_count ?? 0,
    is_artisan: business.fiscal_settings?.is_artisan ?? false,
  });

  const legalForm = getLegalFormDefinition(fiscalSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({
      fiscal_settings: {
        ...fiscalSettings,
        is_majority_manager:
          fiscalSettings.legal_form === "sarl"
            ? fiscalSettings.is_majority_manager
            : undefined,
        versement_liberatoire: legalForm.isMicro
          ? fiscalSettings.versement_liberatoire
          : false,
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

      <Card title="Structure juridique">
        <div className="space-y-4">
          <Select
            label="Forme juridique"
            value={fiscalSettings.legal_form ?? "ei_micro"}
            onChange={(e) =>
              setFiscalSettings({
                ...fiscalSettings,
                legal_form: e.target.value as LegalForm,
              })
            }
            options={LEGAL_FORM_OPTIONS}
          />
          <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
            {legalForm.description}
          </p>

          {fiscalSettings.legal_form === "sarl" && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={fiscalSettings.is_majority_manager ?? true}
                onChange={(e) =>
                  setFiscalSettings({
                    ...fiscalSettings,
                    is_majority_manager: e.target.checked,
                  })
                }
                className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Gérant majoritaire
              </span>
            </label>
          )}
        </div>
      </Card>

      <Card
        title={
          legalForm.isMicro ? "Micro-entreprise (CPS St Barth)" : "Activité"
        }
      >
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {legalForm.isMicro
            ? "Configurez votre activité pour calculer les cotisations sociales. Les taux suivent le barème CPS Saint-Barthélemy (taux DROM réduits)."
            : "Ces informations servent au calcul de vos obligations territoriales (CFAE, TED)."}
        </p>
        <div className="space-y-4">
          <Input
            label="Date de début d'activité"
            type="date"
            value={fiscalSettings.activity_start_date || ""}
            onChange={(e) =>
              setFiscalSettings({
                ...fiscalSettings,
                activity_start_date: e.target.value,
              })
            }
          />

          {legalForm.hasActivityType && (
            <Select
              label="Type d'activité"
              value={fiscalSettings.activity_type || ""}
              onChange={(e) =>
                setFiscalSettings({
                  ...fiscalSettings,
                  activity_type: e.target.value as ActivityType,
                  is_artisan:
                    e.target.value === "prestations_bic"
                      ? fiscalSettings.is_artisan
                      : false,
                })
              }
              options={[
                { value: "", label: "Sélectionnez un type d'activité…" },
                ...Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          )}

          {legalForm.isMicro && (
            <Select
              label="Fréquence de déclaration (DCA)"
              value={fiscalSettings.declaration_frequency || "quarterly"}
              onChange={(e) =>
                setFiscalSettings({
                  ...fiscalSettings,
                  declaration_frequency: e.target.value as DeclarationFrequency,
                })
              }
              options={[
                { value: "monthly", label: "Mensuelle" },
                { value: "quarterly", label: "Trimestrielle" },
              ]}
            />
          )}

          <Input
            label="Nombre de salariés"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={String(fiscalSettings.employee_count ?? 0)}
            onChange={(e) =>
              setFiscalSettings({
                ...fiscalSettings,
                employee_count: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
            Utilisé pour la CFAE (350 € + 100 € par salarié) et le barème TED
            (entrepreneur inclus).
          </p>

          {fiscalSettings.activity_type === "prestations_bic" && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={fiscalSettings.is_artisan ?? false}
                onChange={(e) =>
                  setFiscalSettings({
                    ...fiscalSettings,
                    is_artisan: e.target.checked,
                  })
                }
                className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Activité artisanale (barème TED majoré)
              </span>
            </label>
          )}

          {legalForm.isMicro && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={fiscalSettings.versement_liberatoire || false}
                onChange={(e) =>
                  setFiscalSettings({
                    ...fiscalSettings,
                    versement_liberatoire: e.target.checked,
                  })
                }
                className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Versement libératoire de l&apos;impôt sur le revenu
              </span>
            </label>
          )}
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
