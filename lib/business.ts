import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/business-path";
import type { Business } from "@/lib/types/database";

/** Businesses the current user is a member of (RLS-scoped). */
export const getUserBusinesses = cache(async (): Promise<Business[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Business[];
});

/**
 * Loads a business the current user can access, or 404s. RLS guarantees a
 * non-member gets no row, so a guessed id is indistinguishable from a
 * missing one.
 */
export const getBusiness = cache(async (businessId: string): Promise<Business> => {
  if (!isUuid(businessId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (!data) notFound();
  return data as Business;
});
