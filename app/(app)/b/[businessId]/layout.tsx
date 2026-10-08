import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { isOnboardingComplete } from "@/lib/finance/legal-forms";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);

  if (!isOnboardingComplete(business.fiscal_settings)) {
    redirect(`/onboarding?business=${business.id}`);
  }

  return children;
}
