import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
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

    // Get original invoice
    const { data: originalInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (invoiceError || !originalInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('order_index')

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
    }

    // Generate new reference
    const { data: newReference, error: refError } = await supabase.rpc(
      'generate_invoice_reference',
      { p_user_id: user.id }
    )

    if (refError) {
      return NextResponse.json({ error: 'Failed to generate reference' }, { status: 500 })
    }

    // Create duplicate invoice
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        reference: newReference,
        version: '1.0',
        client_id: originalInvoice.client_id,
        client_reference: originalInvoice.client_reference,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: originalInvoice.payment_method,
        status: 'draft',
        vat_applicable: originalInvoice.vat_applicable,
        vat_article: originalInvoice.vat_article,
        notes: originalInvoice.notes,
      })
      .select()
      .single()

    if (createError || !newInvoice) {
      return NextResponse.json({ error: 'Failed to create duplicate' }, { status: 500 })
    }

    // Duplicate items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        additional_info: item.additional_info || null,
        unit_price_ht: item.unit_price_ht,
        quantity: item.quantity,
        total_ht: item.total_ht,
        order_index: index,
      }))

      const { error: itemsInsertError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsInsertError) {
        return NextResponse.json({ error: 'Failed to duplicate items' }, { status: 500 })
      }
    }

    return NextResponse.json({ id: newInvoice.id, reference: newInvoice.reference })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to duplicate invoice', details: errorMessage },
      { status: 500 }
    )
  }
}

