import { NextResponse } from "next/server";

interface DbError {
  code?: string;
  message: string;
}

/**
 * Maps a Supabase/PostgREST error to an HTTP response. Permission and data
 * errors are the caller's fault and must not surface as 500s.
 */
export function dbErrorResponse(
  error: DbError,
  fallbackMessage = "Erreur serveur"
) {
  switch (error.code) {
    // Row-level security: not a member (or not allowed to edit) the business.
    case "42501":
      return NextResponse.json(
        { error: "Accès refusé à cette entreprise" },
        { status: 403 }
      );
    // Foreign key, e.g. a client that belongs to another business.
    case "23503":
      return NextResponse.json(
        { error: "Référence invalide pour cette entreprise" },
        { status: 400 }
      );
    case "23505":
      return NextResponse.json(
        { error: "Cette référence existe déjà" },
        { status: 409 }
      );
    // .single() matched no row (RLS hides rows from non-members).
    case "PGRST116":
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    default:
      console.error(fallbackMessage, error);
      return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
