"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessId } from "@/lib/use-business-id";
import { toast } from "sonner";

/** Saves fields on the active business (from the /b/[businessId] route). */
export function useBusinessUpdate() {
  const router = useRouter();
  const businessId = useBusinessId();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async (
    fields: Record<string, unknown>,
    successMessage = "Entreprise mise à jour"
  ) => {
    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("businesses")
        .update(fields)
        .eq("id", businessId);

      if (updateError) throw updateError;

      toast.success(successMessage);
      router.refresh();
      return true;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String(err.message)
            : "Une erreur est survenue";
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
