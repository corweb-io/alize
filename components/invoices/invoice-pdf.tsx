import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  formatDate,
  formatCurrencyForPdf,
  formatNumberForPdf,
} from "@/lib/utils/format";
import {
  buildLegalMentions,
  getDocumentSenderName,
} from "@/lib/finance/legal-forms";
import type { FiscalSettings } from "@/lib/types/database";

interface InvoiceItem {
  description: string;
  additional_info?: string;
  unit_price_ht: number;
  quantity: number;
  total_ht: number;
}

interface Invoice {
  reference: string;
  version: string;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  currency?: string;
  vat_applicable: boolean;
  vat_article?: string;
  notes?: string;
  client_reference?: string;
  document_type?: "invoice" | "quote";
  clients?: {
    name: string;
    address?: string;
  };
  businesses?: {
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    banking_info?: {
      bank_name?: string;
      RIB?: string;
      IBAN?: string;
      BIC?: string;
    };
    legal_info?: {
      company_type?: string;
      siret?: string;
      siren?: string;
      rcs?: string;
      ape_naf?: string;
      tva_number?: string;
      service_type?: string;
      share_capital?: number;
      late_payment_notice?: string;
    };
    fiscal_settings?: FiscalSettings | null;
  };
  items: InvoiceItem[];
}

interface InvoicePDFProps {
  invoice: Invoice;
  totalHT: number;
  totalTTC: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  titleBox: {
    backgroundColor: "#E5E7EB",
    padding: 10,
    borderRadius: 4,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  invoiceInfo: {
    textAlign: "left",
    fontSize: 9,
    color: "#4B5563",
    marginTop: 8,
  },
  invoiceInfoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  invoiceInfoItem: {
    marginRight: 15,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  address: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 2,
  },
  clientSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  clientAddress: {
    fontSize: 10,
    color: "#4B5563",
    marginBottom: 2,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  colDescription: {
    width: "40%",
  },
  colPrice: {
    width: "20%",
    textAlign: "right",
  },
  colQuantity: {
    width: "20%",
    textAlign: "right",
  },
  colTotal: {
    width: "20%",
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  tableCellText: {
    fontSize: 9,
    color: "#111827",
  },
  additionalInfo: {
    fontSize: 8,
    color: "#6B7280",
    marginTop: 2,
  },
  totals: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 9,
    color: "#4B5563",
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  totalFinal: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 5,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: 5,
    paddingBottom: 5,
    marginTop: 5,
  },
  totalFinalRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 5,
    marginTop: 5,
  },
  vatInfo: {
    fontSize: 8,
    color: "#6B7280",
    marginTop: 10,
  },
  bankingSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bankingColumn: {
    width: "45%",
  },
  bankingTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  bankingText: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 2,
  },
  paymentInfo: {
    fontSize: 9,
    color: "#4B5563",
    marginTop: 5,
  },
  notes: {
    marginTop: 20,
    fontSize: 9,
    color: "#4B5563",
  },
  footer: {
    marginTop: 5,
    textAlign: "left",
    fontSize: 8,
    color: "#9CA3AF",
  },
  legalDisclaimer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 1.4,
  },
  legalDisclaimerText: {
    marginTop: 4,
  },
});

export default function InvoicePDF({
  invoice,
  totalHT,
  totalTTC,
}: InvoicePDFProps) {
  const sender = invoice.businesses;
  const senderName = getDocumentSenderName(sender);
  const legalMentions = buildLegalMentions(sender);
  const client = invoice.clients;
  const currency = invoice.currency || "EUR";
  const isQuote = invoice.document_type === "quote";
  const documentTitle = isQuote ? "DEVIS" : "FACTURE";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              {senderName && (
                <Text style={styles.companyName}>{senderName}</Text>
              )}
              {sender?.address &&
                (() => {
                  const addressParts = sender.address
                    .split(",")
                    .map((part) => part.trim());
                  const groupedAddress: string[] = [];
                  for (let i = 0; i < addressParts.length; i += 2) {
                    groupedAddress.push(
                      addressParts.slice(i, i + 2).join(", ")
                    );
                  }
                  return groupedAddress.map((line, index) => (
                    <Text key={index} style={styles.address}>
                      {line}
                    </Text>
                  ));
                })()}
              {sender?.phone && (
                <Text style={styles.address}>Tél.: {sender.phone}</Text>
              )}
              {sender?.email && (
                <Text style={styles.address}>{sender.email}</Text>
              )}
            </View>
            <View>
              <View style={styles.titleBox}>
                <Text style={styles.title}>{documentTitle}</Text>
              </View>
              <View style={styles.invoiceInfo}>
                <Text>Référence: {invoice.reference}</Text>
                <Text>Version: {invoice.version}</Text>
                <Text>
                  Date de facturation: {formatDate(invoice.invoice_date)}
                </Text>
                {invoice.client_reference && (
                  <Text>Référence client: {invoice.client_reference}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Client Info */}
        {client && (
          <View style={styles.clientSection}>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.address && (
              <Text style={styles.clientAddress}>{client.address}</Text>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.tableHeaderText}>Prix Unit. HT</Text>
            </View>
            <View style={styles.colQuantity}>
              <Text style={styles.tableHeaderText}>Quantité</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableHeaderText}>Total HT</Text>
            </View>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.tableCellText}>{item.description}</Text>
                {item.additional_info && (
                  <Text style={styles.additionalInfo}>
                    {item.additional_info}
                  </Text>
                )}
              </View>
              <View style={styles.colPrice}>
                <Text style={styles.tableCellText}>
                  {formatCurrencyForPdf(item.unit_price_ht, currency)}
                </Text>
              </View>
              <View style={styles.colQuantity}>
                <Text style={styles.tableCellText}>
                  {formatNumberForPdf(item.quantity)}
                </Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={styles.tableCellText}>
                  {formatCurrencyForPdf(item.total_ht, currency)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT:</Text>
            <Text style={styles.totalValue}>
              {formatCurrencyForPdf(totalHT, currency)}
            </Text>
          </View>
          {invoice.vat_applicable && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA (20%):</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyForPdf(totalTTC - totalHT, currency)}
              </Text>
            </View>
          )}
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinal}>Total Net TTC:</Text>
            <Text style={styles.totalFinal}>
              {formatCurrencyForPdf(totalTTC, currency)}
            </Text>
          </View>
          <View style={styles.totalFinalRowBottom}>
            <Text style={styles.totalFinal}>Net à payer:</Text>
            <Text style={styles.totalFinal}>
              {formatCurrencyForPdf(totalTTC, currency)}
            </Text>
          </View>
        </View>

        {/* VAT Info */}
        {!invoice.vat_applicable && invoice.vat_article && (
          <Text style={styles.vatInfo}>
            TVA non applicable, {invoice.vat_article}
          </Text>
        )}

        {/* Banking and Payment Info */}
        <View style={styles.bankingSection}>
          <View style={styles.bankingColumn}>
            <Text style={styles.bankingTitle}>Informations Bancaires</Text>
            {sender?.banking_info && (
              <>
                {sender.banking_info.bank_name && (
                  <Text style={styles.bankingText}>
                    Banque: {sender.banking_info.bank_name}
                  </Text>
                )}
                {sender.banking_info.RIB && (
                  <Text style={styles.bankingText}>
                    RIB: {sender.banking_info.RIB}
                  </Text>
                )}
                {sender.banking_info.IBAN && (
                  <Text style={styles.bankingText}>
                    IBAN: {sender.banking_info.IBAN}
                  </Text>
                )}
                {sender.banking_info.BIC && (
                  <Text style={styles.bankingText}>
                    BIC: {sender.banking_info.BIC}
                  </Text>
                )}
              </>
            )}
          </View>
          <View style={styles.bankingColumn}>
            <Text style={styles.paymentInfo}>
              Date d&apos;échéance: {formatDate(invoice.due_date)}
            </Text>
            <Text style={styles.paymentInfo}>
              Mode de paiement: {invoice.payment_method}
            </Text>
            {sender?.legal_info?.service_type && (
              <Text style={styles.footer}>
                {sender.legal_info.service_type}
              </Text>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Legal Disclaimer - Positioned at bottom */}
        {(legalMentions.length > 0 ||
          sender?.legal_info?.late_payment_notice) && (
          <View style={styles.legalDisclaimer}>
            {legalMentions.length > 0 && (
              <Text>{legalMentions.join(" - ")}</Text>
            )}
            {sender?.legal_info?.late_payment_notice && (
              <Text style={styles.legalDisclaimerText}>
                {sender.legal_info.late_payment_notice}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
