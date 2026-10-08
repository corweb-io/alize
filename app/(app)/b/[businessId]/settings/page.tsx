import { Suspense } from "react";
import PageHeader from "@/components/layout/page-header";
import SettingsTabs from "@/components/settings/settings-tabs";
import CompanyForm from "@/components/settings/company-form";
import BankingForm from "@/components/settings/banking-form";
import LegalForm from "@/components/settings/legal-form";
import FiscalForm from "@/components/settings/fiscal-form";
import { getBusiness } from "@/lib/business";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { businessId } = await params;
  const { tab } = await searchParams;
  const business = await getBusiness(businessId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Gérez les informations de votre entreprise et votre fiscalité."
      />

      <Suspense
        fallback={
          <div className="h-12 animate-pulse rounded-xl bg-teal-900/5 dark:bg-teal-500/10" />
        }
      >
        <SettingsTabs
          defaultTab={tab}
          entreprise={<CompanyForm business={business} />}
          banque={<BankingForm business={business} />}
          legal={<LegalForm business={business} />}
          fiscal={<FiscalForm business={business} />}
        />
      </Suspense>
    </div>
  );
}
