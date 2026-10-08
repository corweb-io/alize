"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import {
  ACTIVITY_TYPE_LABELS,
} from "@/lib/finance/cotisations-st-barth";
import {
  LEGAL_FORMS,
  LEGAL_FORM_OPTIONS,
  isOnboardingComplete,
} from "@/lib/finance/legal-forms";
import type {
  ActivityType,
  DeclarationFrequency,
  FiscalSettings,
  LegalForm,
} from "@/lib/types/database";

const STEPS = [
  {
    title: "Bienvenue",
    description:
      "Configurez votre entreprise à Saint-Barthélemy pour adapter vos factures, cotisations et obligations.",
  },
  {
    title: "Votre structure",
    description:
      "La forme juridique détermine les mentions de vos factures et le calcul de vos charges.",
  },
  {
    title: "Votre activité",
    description:
      "Ces informations déterminent vos taux CPS, votre plafond de CA et vos taxes territoriales.",
  },
  {
    title: "Déclarations",
    description: "Effectif et modalités de déclaration auprès de la CPS.",
  },
] as const;

interface FiscalWizardProps {
  userId: string;
  email?: string;
  initialSettings?: FiscalSettings;
}

export default function FiscalWizard({
  userId,
  email,
  initialSettings,
}: FiscalWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<FiscalSettings>({
    legal_form: initialSettings?.legal_form,
    is_majority_manager: initialSettings?.is_majority_manager ?? true,
    activity_start_date: initialSettings?.activity_start_date ?? "",
    activity_type: initialSettings?.activity_type,
    declaration_frequency:
      initialSettings?.declaration_frequency ?? "quarterly",
    versement_liberatoire: initialSettings?.versement_liberatoire ?? false,
    employee_count: initialSettings?.employee_count ?? 0,
    is_artisan: initialSettings?.is_artisan ?? false,
  });

  const legalForm = settings.legal_form
    ? LEGAL_FORMS[settings.legal_form]
    : undefined;

  const canContinue = () => {
    if (step === 1) {
      return Boolean(legalForm);
    }
    if (step === 2) {
      return Boolean(
        settings.activity_start_date &&
          (!legalForm?.hasActivityType || settings.activity_type)
      );
    }
    if (step === 3) {
      return isOnboardingComplete(settings);
    }
    return true;
  };

  const handleFinish = async () => {
    setLoading(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      fiscal_settings: {
        ...settings,
        activity_type: legalForm?.hasActivityType
          ? settings.activity_type
          : undefined,
        is_majority_manager:
          settings.legal_form === "sarl"
            ? settings.is_majority_manager
            : undefined,
        versement_liberatoire: legalForm?.isMicro
          ? settings.versement_liberatoire
          : false,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Configuration enregistrée");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8">
        <div className="mb-4 flex gap-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= step
                  ? "bg-teal-700 dark:bg-teal-500"
                  : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          ))}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
          Étape {step + 1} sur {STEPS.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1a454f] dark:text-teal-50">
          {STEPS[step].title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {STEPS[step].description}
        </p>
      </div>

      <div className="rounded-xl border border-teal-900/10 bg-white/90 p-6 shadow-lg shadow-teal-900/5 dark:border-teal-500/10 dark:bg-stone-900/90">
        {step === 0 && (
          <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
            <li className="flex gap-2">
              <span>📊</span>
              <span>
                Suivi du plafond de chiffre d&apos;affaires (micro-entreprise)
              </span>
            </li>
            <li className="flex gap-2">
              <span>🏦</span>
              <span>Estimation des cotisations CPS et charges totales</span>
            </li>
            <li className="flex gap-2">
              <span>🧾</span>
              <span>Mentions légales adaptées à votre forme juridique</span>
            </li>
            <li className="flex gap-2">
              <span>📅</span>
              <span>Rappels de déclaration et obligations territoriales</span>
            </li>
          </ul>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Select
              label="Forme juridique"
              value={settings.legal_form ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  legal_form: (e.target.value || undefined) as
                    | LegalForm
                    | undefined,
                })
              }
              options={[
                { value: "", label: "Sélectionnez…" },
                ...LEGAL_FORM_OPTIONS,
              ]}
            />
            {legalForm && (
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {legalForm.description}
              </p>
            )}
            {settings.legal_form === "sarl" && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.is_majority_manager ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      is_majority_manager: e.target.checked,
                    })
                  }
                  className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300">
                  Je suis gérant majoritaire
                </span>
              </label>
            )}
            {legalForm && !legalForm.isMicro && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Le calcul automatique des cotisations CPS est pour l&apos;instant
                réservé aux micro-entreprises. Facturation, devis et obligations
                territoriales restent disponibles.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input
              label="Date de début d'activité"
              type="date"
              value={settings.activity_start_date ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, activity_start_date: e.target.value })
              }
            />
            {legalForm?.hasActivityType && (
              <Select
                label="Type d'activité"
                value={settings.activity_type ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    activity_type: e.target.value as ActivityType,
                    is_artisan:
                      e.target.value === "prestations_bic"
                        ? settings.is_artisan
                        : false,
                  })
                }
                options={[
                  { value: "", label: "Sélectionnez…" },
                  ...Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {legalForm?.isMicro && (
              <Select
                label="Fréquence de déclaration (DCA)"
                value={settings.declaration_frequency ?? "quarterly"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
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
              value={String(settings.employee_count ?? 0)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  employee_count: parseInt(e.target.value, 10) || 0,
                })
              }
            />
            {settings.activity_type === "prestations_bic" && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.is_artisan ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      is_artisan: e.target.checked,
                    })
                  }
                  className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300">
                  Activité artisanale (barème TED majoré)
                </span>
              </label>
            )}
            {legalForm?.isMicro && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.versement_liberatoire ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      versement_liberatoire: e.target.checked,
                    })
                  }
                  className="rounded border-stone-300 text-teal-700 focus:ring-teal-600 dark:border-stone-600"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300">
                  Versement libératoire de l&apos;impôt sur le revenu
                </span>
              </label>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || loading}
          >
            Retour
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue()}
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              disabled={!canContinue() || loading}
            >
              {loading ? "Enregistrement…" : "Terminer"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
