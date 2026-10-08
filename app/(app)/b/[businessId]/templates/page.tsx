import Link from "next/link";
import { businessPath } from "@/lib/business-path";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Panel from "@/components/ui/panel";
import { Table, TableRow, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export default async function TemplatesPage({
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

  const { data: templates, error } = await supabase
    .from("invoice_templates")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modèles de facture"
        description="Gérez vos modèles de facture réutilisables"
      />

      {error && (
        <Panel className="border-red-200/50 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            Erreur lors du chargement des modèles : {error.message}
          </p>
        </Panel>
      )}

      {templates && templates.length > 0 ? (
        <Panel accent padding={false}>
          <Table
            headers={[
              "Nom",
              "Mode de paiement",
              "Délai de paiement",
              "Par défaut",
              "Créé le",
              "Actions",
            ]}
          >
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>{template.default_payment_method}</TableCell>
                <TableCell>{template.default_payment_terms} jours</TableCell>
                <TableCell>
                  {template.is_default ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold text-green-800 dark:bg-green-900/20 dark:text-green-200">
                      Oui
                    </span>
                  ) : (
                    <span className="text-stone-400">Non</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(template.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={businessPath(businessId, `/invoices/new?template=${template.id}`)}>
                      <Button variant="ghost" size="sm">
                        Utiliser
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </Panel>
      ) : (
        <Panel className="text-center">
          <p className="text-stone-500 dark:text-stone-400">
            Aucun modèle pour le moment. Créez des modèles à partir de vos
            factures existantes pour gagner du temps.
          </p>
        </Panel>
      )}
    </div>
  );
}
