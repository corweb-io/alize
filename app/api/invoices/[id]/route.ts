import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
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

    // Verify invoice exists and belongs to user
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, document_type, status")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.document_type === "credit_note" || invoice.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            invoice.document_type === "credit_note"
              ? "Un avoir ne peut pas être supprimé"
              : "Une facture annulée par un avoir ne peut pas être supprimée",
        },
        { status: 409 }
      );
    }

    // Delete invoice items first (if cascade delete is not configured)
    const { error: itemsDeleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (itemsDeleteError) {
      return NextResponse.json(
        { error: "Failed to delete invoice items" },
        { status: 500 }
      );
    }

    // Delete invoice
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete invoice", details: errorMessage },
      { status: 500 }
    );
  }
}
