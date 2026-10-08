import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateInvoiceStatus } from '@/lib/utils/invoice-status'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, paid_at: paidAtInput } = body

    if (!status || !['draft', 'sent', 'paid', 'overdue', 'unpaid'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current invoice to check due date
    const { data: invoice } = await supabase
      .from('invoices')
      .select('due_date, status, paid_at')
      .eq('id', id)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Calculate status if marking as paid/unpaid
    const newStatus =
      status === 'paid' || status === 'unpaid'
        ? calculateInvoiceStatus(invoice.due_date, invoice.status, status === 'paid')
        : status

    const paidAt =
      typeof paidAtInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paidAtInput)
        ? paidAtInput
        : null

    if (newStatus === 'paid' && !paidAt) {
      return NextResponse.json(
        { error: "Indiquez la date d'encaissement" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: newStatus,
        paid_at: newStatus === 'paid' ? paidAt : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ status: newStatus })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update status', details: errorMessage },
      { status: 500 }
    )
  }
}

