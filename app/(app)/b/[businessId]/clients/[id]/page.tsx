import { createClient } from '@/lib/supabase/server'
import { businessPath } from "@/lib/business-path";
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/button'
import Card from '@/components/ui/card'
import { formatDate } from "@/lib/utils/format";
import { getInvoiceStatusLabel } from "@/lib/utils/labels";
import ClientForm from '@/components/clients/client-form'
import PageHeader from '@/components/layout/page-header'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ businessId: string; id: string }>
}) {
  const { businessId, id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('business_id', businessId)
    .single()

  if (error || !client) {
    redirect(businessPath(businessId, "/clients"))
  }

  // Get invoices for this client
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, reference, invoice_date, status, due_date')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={`Référence : ${client.reference}`}
        actions={
          <Link href={businessPath(businessId, "/clients")}>
            <Button variant="secondary">Retour aux clients</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Informations client">
          <ClientForm client={client} />
        </Card>

        {invoices && invoices.length > 0 && (
          <Card title="Factures">
            <div className="space-y-2">
              {invoices.map((invoice: { id: string; reference: string; invoice_date: string; status: string; due_date: string }) => (
                <Link
                  key={invoice.id}
                  href={businessPath(businessId, `/invoices/${invoice.id}`)}
                  className="block rounded-lg border border-teal-900/10 p-4 transition-colors hover:bg-teal-50/50 dark:border-stone-700 dark:hover:bg-stone-800/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1a454f] dark:text-teal-50">
                        {invoice.reference}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {formatDate(invoice.invoice_date)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 text-xs font-semibold ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {getInvoiceStatusLabel(invoice.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

