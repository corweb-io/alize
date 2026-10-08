import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/lib/business";
import { ACTIVE_BUSINESS_COOKIE, businessPath } from "@/lib/business-path";

/**
 * Resolves legacy and business-less URLs (e.g. /dashboard after login) to the
 * last used business, or the first one the user belongs to.
 */
export default async function ResolveBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const businesses = await getUserBusinesses();
  if (businesses.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const lastBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  const business =
    businesses.find((b) => b.id === lastBusinessId) ?? businesses[0];

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(businessPath(business.id, safeNext));
}
