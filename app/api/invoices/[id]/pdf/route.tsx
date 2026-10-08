import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoicePDF from '@/components/invoices/invoice-pdf'

export async function GET(
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

    // Fetch invoice with relations
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, clients(*), businesses(*)')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('order_index')

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
    }

    // Calculate totals
    const totalHT =
      items?.reduce((sum, item) => sum + parseFloat(item.total_ht || '0'), 0) || 0
    const totalTTC = invoice.vat_applicable ? totalHT * 1.2 : totalHT

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <InvoicePDF
        invoice={{
          ...invoice,
          items: items || [],
        }}
        totalHT={totalHT}
        totalTTC={totalTTC}
      />
    )

    // Return PDF as response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.document_type === 'quote' ? 'devis' : 'facture'}-${invoice.reference}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    )
  }
}

