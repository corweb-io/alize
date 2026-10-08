import { createClient } from '@/lib/supabase/server'
import { businessPath } from "@/lib/business-path";
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/button'
import PageHeader from '@/components/layout/page-header'
import Panel from '@/components/ui/panel'
import ClientList from '@/components/clients/client-list'

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params;
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gérez vos clients"
        actions={
          <Link href={businessPath(businessId, "/clients/new")}>
            <Button>Ajouter un client</Button>
          </Link>
        }
      />

      {error && (
        <Panel className="border-red-200/50 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            Erreur lors du chargement des clients : {error.message}
          </p>
        </Panel>
      )}

      <ClientList clients={clients || []} />
    </div>
  )
}

