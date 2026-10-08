"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CheckoutStatusProps {
  status?: string;
}

export default function CheckoutStatus({ status }: CheckoutStatusProps) {
  const router = useRouter();

  useEffect(() => {
    if (status === "success") {
      toast.success("Abonnement activé", {
        description: "Votre formule Pro est maintenant active.",
      });
    } else if (status === "cancel") {
      toast.info("Paiement annulé", {
        description: "Aucun changement n'a été apporté à votre abonnement.",
      });
    } else {
      return;
    }

    router.replace("/account/billing");
  }, [status, router]);

  return null;
}
