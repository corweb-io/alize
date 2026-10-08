import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { isOnboardingComplete } from "@/lib/finance/legal-forms";
import type { FiscalSettings } from "@/lib/types/database";

export default async function DashboardLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("fiscal_settings")
    .eq("id", user.id)
    .maybeSingle();

  const fiscalSettings = (profile?.fiscal_settings || {}) as FiscalSettings;
  if (!isOnboardingComplete(fiscalSettings)) {
    redirect("/onboarding");
  }

  return (
    <div className="app-shell-bg flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
