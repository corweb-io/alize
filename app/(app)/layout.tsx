import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { getUserBusinesses } from "@/lib/business";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/business-path";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const businesses = await getUserBusinesses();
  if (businesses.length === 0) {
    redirect("/onboarding");
  }

  // Used for navigation on pages outside /b/[businessId] (e.g. /account).
  const cookieStore = await cookies();
  const lastBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  const fallbackBusinessId =
    businesses.find((b) => b.id === lastBusinessId)?.id ?? businesses[0].id;

  return (
    <div className="app-shell-bg flex h-screen">
      <Sidebar
        businesses={businesses.map((b) => ({
          id: b.id,
          name: b.company_name || "Entreprise sans nom",
          legalForm: b.fiscal_settings?.legal_form,
        }))}
        fallbackBusinessId={fallbackBusinessId}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
