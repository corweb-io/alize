"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function useProfileUpdate() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async (
    fields: Record<string, unknown>,
    successMessage = "Profil mis à jour"
  ) => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté");
      toast.error("Vous devez être connecté");
      setLoading(false);
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          ...fields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(successMessage);
      router.refresh();
      return true;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      toast.error("Mise à jour impossible", {
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { save, loading, error };
}
