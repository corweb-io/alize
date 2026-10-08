import { redirect } from "next/navigation";
import FiscalWizard from "@/components/onboarding/fiscal-wizard";
import { getBusiness, getUserBusinesses } from "@/lib/business";
import { businessPath } from "@/lib/business-path";
import { isOnboardingComplete } from "@/lib/finance/legal-forms";
import { createClient } from "@/lib/supabase/server";

/**
 * Without ?business: creates a new business.
 * With ?business=<id>: completes the setup of an existing one (e.g. a
 * business migrated from a profile that never finished onboarding).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { business: businessId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (businessId) {
    const business = await getBusiness(businessId);
    if (isOnboardingComplete(business.fiscal_settings)) {
      redirect(businessPath(business.id));
    }

    return (
      <FiscalWizard
        businessId={business.id}
        initialCompanyName={business.company_name ?? ""}
        initialSettings={business.fiscal_settings ?? {}}
      />
    );
  }

  const businesses = await getUserBusinesses();

  return (
    <FiscalWizard
      email={user.email}
      isAdditionalBusiness={businesses.length > 0}
    />
  );
}
