import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote, error: quoteError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("document_type", "quote")
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.converted_to_invoice_id) {
      return NextResponse.json(
        { error: "Quote already converted", invoiceId: quote.converted_to_invoice_id },
        { status: 409 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("order_index");

    if (itemsError) {
      return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
    }

    const { data: newReference, error: refError } = await supabase.rpc(
      "generate_invoice_reference",
      { p_user_id: user.id }
    );

    if (refError || !newReference) {
      return NextResponse.json(
        { error: "Failed to generate reference" },
        { status: 500 }
      );
    }

    const { data: invoice, error: createError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        reference: newReference,
        document_type: "invoice",
        version: "1.0",
        client_id: quote.client_id,
        client_reference: quote.client_reference,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_method: quote.payment_method,
        currency: quote.currency,
        status: "draft",
        vat_applicable: quote.vat_applicable,
        vat_article: quote.vat_article,
        notes: quote.notes,
        source_quote_id: quote.id,
      })
      .select("id, reference")
      .single();

    if (createError || !invoice) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create invoice" },
        { status: 500 }
      );
    }

    if (items?.length) {
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        additional_info: item.additional_info || null,
        unit_price_ht: item.unit_price_ht,
        quantity: item.quantity,
        total_ht: item.total_ht,
        order_index: index,
      }));

      const { error: itemsInsertError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (itemsInsertError) {
        await supabase.from("invoices").delete().eq("id", invoice.id);
        return NextResponse.json(
          { error: "Failed to copy items" },
          { status: 500 }
        );
      }
    }

    await supabase
      .from("invoices")
      .update({
        status: "accepted",
        converted_to_invoice_id: invoice.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    return NextResponse.json({
      id: invoice.id,
      reference: invoice.reference,
      quoteId: quote.id,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to convert quote", details: errorMessage },
      { status: 500 }
    );
  }
}
