import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isIsoDate } from "@/lib/invoices/payments";

const ERRORS: Record<string, { message: string; status: number }> = {
  invoice_not_found: { message: "Facture introuvable", status: 404 },
  invoice_already_cancelled: {
    message: "Cette facture est déjà annulée par un avoir",
    status: 409,
  },
  invoice_has_payments: {
    message:
      "Cette facture a des paiements enregistrés : supprimez-les avant de l'annuler",
    status: 409,
  },
};

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

    const body = await request.json().catch(() => ({}));

    const { data: creditNoteId, error } = await supabase.rpc(
      "create_credit_note",
      {
        p_invoice_id: id,
        ...(isIsoDate(body.issue_date) ? { p_issue_date: body.issue_date } : {}),
        p_reason: typeof body.reason === "string" ? body.reason : null,
      }
    );

    if (error) {
      const known = Object.entries(ERRORS).find(([code]) =>
        error.message.includes(code)
      );
      return known
        ? NextResponse.json({ error: known[1].message }, { status: known[1].status })
        : NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: creditNote } = await supabase
      .from("invoices")
      .select("id, reference")
      .eq("id", creditNoteId)
      .single();

    return NextResponse.json(creditNote, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create credit note", details: errorMessage },
      { status: 500 }
    );
  }
}
