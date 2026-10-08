"use client";

import { useRouter } from "next/navigation";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import Link from "next/link";
import Button from "@/components/ui/button";
import DeleteButton from "@/components/invoices/delete-button";

interface InvoiceActionsProps {
  invoiceId: string;
  invoiceReference: string;
  /** Issued credit notes and cancelled invoices can't be deleted */
  canDelete?: boolean;
}

export default function InvoiceActions({
  invoiceId,
  invoiceReference,
  canDelete = true,
}: InvoiceActionsProps) {
  const businessId = useBusinessId();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Link href={businessPath(businessId, `/invoices/${invoiceId}`)}>
        <Button variant="ghost" size="sm">
          Voir
        </Button>
      </Link>
      <Link href={`/api/invoices/${invoiceId}/pdf`} target="_blank">
        <Button variant="ghost" size="sm">
          PDF
        </Button>
      </Link>
      {canDelete && (
        <DeleteButton
          invoiceId={invoiceId}
          invoiceReference={invoiceReference}
          variant="ghost"
          size="sm"
          onDeleted={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
