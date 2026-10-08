import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateInvoiceStatus } from '@/lib/utils/invoice-status'
import { isIsoDate, loadInvoiceBalance } from '@/lib/invoices/payments'

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

    const balance = await loadInvoiceBalance(supabase, id)

    if (!balance) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const { invoice } = balance

    // Payment status is derived from invoice_payments (see the
    // invoice_payments_sync trigger): marking paid records the remaining
    // balance as one payment, marking unpaid removes all payments.
    if (status === 'paid') {
      if (!isIsoDate(paidAtInput)) {
        return NextResponse.json(
          { error: "Indiquez la date d'encaissement" },
          { status: 400 }
        )
      }

      if (balance.remaining > 0) {
        const { error: paymentError } = await supabase
          .from('invoice_payments')
          .insert({
            invoice_id: id,
            business_id: invoice.business_id,
            amount: balance.remaining,
            paid_on: paidAtInput,
            payment_method: invoice.payment_method,
          })

        if (paymentError) {
          return NextResponse.json({ error: paymentError.message }, { status: 500 })
        }
      }

      return NextResponse.json({ status: 'paid' })
    }

    if (status === 'unpaid' && balance.payments.length > 0) {
      const { error: deleteError } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('invoice_id', id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    }

    const currentStatus = invoice.status === 'paid' ? 'sent' : invoice.status
    const newStatus =
      status === 'unpaid'
        ? calculateInvoiceStatus(invoice.due_date, currentStatus, false)
        : status

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: newStatus,
        paid_at: null,
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

