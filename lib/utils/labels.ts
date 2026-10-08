const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  paid: "Payée",
  overdue: "En retard",
  unpaid: "Non payée",
  accepted: "Accepté",
  declined: "Refusé",
  cancelled: "Annulée",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  declined: "Refusé",
};

export function getInvoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function getQuoteStatusLabel(status: string): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function getDocumentStatusLabel(
  status: string,
  documentType: "invoice" | "quote" = "invoice"
): string {
  return documentType === "quote"
    ? getQuoteStatusLabel(status)
    : getInvoiceStatusLabel(status);
}
