import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isIsoDate,
  loadInvoiceBalance,
  parseAmount,
} from "@/lib/invoices/payments";
import { dbErrorResponse } from "@/lib/api-errors";

export async function POST(
  request: Request,
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

    const body = await request.json();
    const amount = parseAmount(body.amount);
    if (amount === null) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!isIsoDate(body.paid_on)) {
      return NextResponse.json(
        { error: "Indiquez la date d'encaissement" },
        { status: 400 }
      );
    }

    const balance = await loadInvoiceBalance(supabase, id);
    if (!balance) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (balance.invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Cette facture est annulée par un avoir" },
        { status: 409 }
      );
    }

    if (amount > balance.remaining + 0.005) {
      return NextResponse.json(
        { error: "Le paiement dépasse le reste à payer" },
        { status: 400 }
      );
    }

    const { data: payment, error } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: id,
        business_id: balance.invoice.business_id,
        amount,
        paid_on: body.paid_on,
        payment_method:
          typeof body.payment_method === "string" && body.payment_method.trim()
            ? body.payment_method.trim()
            : balance.invoice.payment_method,
        note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      })
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to record payment", details: errorMessage },
      { status: 500 }
    );
  }
}
