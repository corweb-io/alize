import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { redirect } from "next/navigation";
import InvoiceForm from "@/components/invoices/invoice-form";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [clientsResult, business] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, reference")
      .eq("business_id", businessId)
      .order("name"),
    getBusiness(businessId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau devis"
        description="Créez un devis à envoyer à votre client avant facturation"
      />

      <Panel accent>
        <InvoiceForm
          documentType="quote"
          clients={clientsResult.data || []}
          defaultCurrency={business.default_currency}
        />
      </Panel>
    </div>
  );
}
