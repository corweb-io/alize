"use client";

import { useRouter } from "next/navigation";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import Link from "next/link";
import Button from "@/components/ui/button";
import DeleteButton from "@/components/invoices/delete-button";

interface QuoteActionsProps {
  quoteId: string;
  quoteReference: string;
}

export default function QuoteActions({
  quoteId,
  quoteReference,
}: QuoteActionsProps) {
  const businessId = useBusinessId();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Link href={businessPath(businessId, `/quotes/${quoteId}`)}>
        <Button variant="ghost" size="sm">
          Voir
        </Button>
      </Link>
      <Link href={`/api/invoices/${quoteId}/pdf`} target="_blank">
        <Button variant="ghost" size="sm">
          PDF
        </Button>
      </Link>
      <DeleteButton
        invoiceId={quoteId}
        invoiceReference={quoteReference}
        variant="ghost"
        size="sm"
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
