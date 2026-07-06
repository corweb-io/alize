import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InvoiceForm from "@/components/invoices/invoice-form";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [clientsResult, profileResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, reference")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .single(),
  ]);

  const clients = clientsResult.data;
  const profile = profileResult.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle facture"
        description="Créez une nouvelle facture pour votre client"
      />

      <Panel accent>
        <InvoiceForm
          clients={clients || []}
          defaultCurrency={profile?.default_currency}
        />
      </Panel>
    </div>
  );
}
