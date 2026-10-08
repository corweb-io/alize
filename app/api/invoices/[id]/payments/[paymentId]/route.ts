import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isIsoDate,
  loadInvoiceBalance,
  parseAmount,
} from "@/lib/invoices/payments";
import { dbErrorResponse } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, paymentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await loadInvoiceBalance(supabase, id);
    const current = balance?.payments.find((p) => p.id === paymentId);
    if (!balance || !current) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.amount !== undefined) {
      const amount = parseAmount(body.amount);
      if (amount === null) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      }
      const othersTotal =
        balance.paidTotal - parseFloat(String(current.amount || 0));
      if (othersTotal + amount > balance.totalTTC + 0.005) {
        return NextResponse.json(
          { error: "Le paiement dépasse le reste à payer" },
          { status: 400 }
        );
      }
      update.amount = amount;
    }

    if (body.paid_on !== undefined) {
      if (!isIsoDate(body.paid_on)) {
        return NextResponse.json(
          { error: "Indiquez la date d'encaissement" },
          { status: 400 }
        );
      }
      update.paid_on = body.paid_on;
    }

    if (body.note !== undefined) {
      update.note =
        typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    }

    const { data: payment, error } = await supabase
      .from("invoice_payments")
      .update(update)
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ payment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update payment", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id, paymentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: deleted, error } = await supabase
      .from("invoice_payments")
      .delete()
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .select("id");

    if (error) {
      return dbErrorResponse(error);
    }
    if (!deleted?.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete payment", details: errorMessage },
      { status: 500 }
    );
  }
}
