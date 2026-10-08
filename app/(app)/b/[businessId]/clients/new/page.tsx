import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientForm from '@/components/clients/client-form'
import PageHeader from '@/components/layout/page-header'
import Panel from '@/components/ui/panel'

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the last client number to generate next reference
  const { data: lastClient } = await supabase
    .from('clients')
    .select('reference')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextReference = 'C-000001'
  if (lastClient?.reference) {
    const match = lastClient.reference.match(/C-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      nextReference = `C-${String(num + 1).padStart(6, '0')}`
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau client"
        description="Ajoutez un nouveau client"
      />

      <Panel accent>
        <ClientForm initialReference={nextReference} />
      </Panel>
    </div>
  )
}

