import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { redirect } from "next/navigation";
import InvoiceForm from "@/components/invoices/invoice-form";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [clientsResult, business] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, reference")
      .eq("business_id", businessId)
      .order("name"),
    getBusiness(businessId),
  ]);

  const clients = clientsResult.data;
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle facture"
        description="Créez une nouvelle facture pour votre client"
      />

      <Panel accent>
        <InvoiceForm
          clients={clients || []}
          defaultCurrency={business.default_currency}
        />
      </Panel>
    </div>
  );
}
