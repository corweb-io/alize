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

  const [clientsResult, business, lastVatArticle] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, reference")
      .eq("business_id", businessId)
      .order("name"),
    getBusiness(businessId),
    supabase
      .from("invoices")
      .select("vat_article")
      .eq("business_id", businessId)
      .not("vat_article", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
          defaultVatArticle={lastVatArticle.data?.vat_article ?? undefined}
        />
      </Panel>
    </div>
  );
}
