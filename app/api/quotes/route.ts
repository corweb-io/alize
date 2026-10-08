import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface QuoteItemInput {
  description: string;
  additional_info?: string | null;
  unit_price_ht: number;
  quantity: number;
  total_ht: number;
  order_index?: number;
}

interface CreateQuoteBody {
  business_id: string;
  client_id: string;
  client_reference?: string | null;
  invoice_date: string;
  due_date: string;
  payment_method?: string;
  currency?: string;
  vat_applicable?: boolean;
  vat_article?: string | null;
  notes?: string | null;
  items: QuoteItemInput[];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateQuoteBody;

  if (!body.business_id) {
    return NextResponse.json({ error: "business_id is required" }, { status: 400 });
  }
  if (!body.client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one item is required" },
      { status: 400 }
    );
  }

  const { data: quote, error: insertError } = await supabase
    .from("invoices")
    .insert({
      // RLS checks membership; the reference is assigned by a DB trigger.
      business_id: body.business_id,
      document_type: "quote",
      client_id: body.client_id,
      client_reference: body.client_reference?.trim() || null,
      invoice_date: body.invoice_date,
      due_date: body.due_date,
      payment_method: body.payment_method ?? "Virement",
      currency: body.currency ?? "EUR",
      status: "draft",
      vat_applicable: body.vat_applicable ?? false,
      vat_article: body.vat_article?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select("id, reference")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const itemsToInsert = body.items.map((it, index) => ({
    invoice_id: quote.id,
    description: it.description,
    additional_info: it.additional_info?.trim() || null,
    unit_price_ht: it.unit_price_ht,
    quantity: it.quantity,
    total_ht: it.total_ht,
    order_index: it.order_index ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsToInsert);
  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", quote.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ quote });
}
