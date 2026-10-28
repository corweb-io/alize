import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale/fr";

/**
 * Supported currencies with their display names and locales
 */
export const SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro (€)", locale: "fr-FR" },
  { code: "USD", name: "US Dollar ($)", locale: "en-US" },
  { code: "CAD", name: "Canadian Dollar (CA$)", locale: "en-CA" },
  { code: "GBP", name: "British Pound (£)", locale: "en-GB" },
  { code: "CHF", name: "Swiss Franc (CHF)", locale: "de-CH" },
  { code: "JPY", name: "Japanese Yen (¥)", locale: "ja-JP" },
  { code: "AUD", name: "Australian Dollar (A$)", locale: "en-AU" },
  { code: "CNY", name: "Chinese Yuan (¥)", locale: "zh-CN" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

/**
 * Get locale for a given currency code
 */
function getLocaleForCurrency(currency: string): string {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  return found?.locale ?? "fr-FR";
}

/**
 * Format date in French format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: fr });
}

/**
 * Replace Unicode space characters used as thousands separators with regular space.
 * Used for PDF output where Helvetica may render U+202F (narrow no-break space) as a slash.
 */
function toPdfSafeSpaces(s: string): string {
  return s.replace(/\u202F|\u00A0/g, " ");
}

/**
 * Format number in French format (comma for decimals, space for thousands)
 */
export function formatNumber(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) return "0,00";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Same as formatNumber but with regular spaces for PDF rendering (avoids "3/000" display bug).
 */
export function formatNumberForPdf(
  value: number | string | null | undefined
): string {
  return toPdfSafeSpaces(formatNumber(value));
}

/**
 * Format currency with appropriate locale based on currency code
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "EUR"
): string {
  const locale = getLocaleForCurrency(currency);
  const currencyCode = currency || "EUR";

  // JPY doesn't use decimal places
  const fractionDigits = currencyCode === "JPY" ? 0 : 2;

  if (value === null || value === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(0);
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
}

/**
 * Format an amount for an invoice, quote or credit note. Documents are in
 * French, and "$" is ambiguous (USD, CAD, AUD…), so every currency other
 * than the euro is written with its ISO code: "1 234,56 CAD".
 */
export function formatDocumentCurrency(
  value: number | string | null | undefined,
  currency: string = "EUR"
): string {
  const currencyCode = currency || "EUR";
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  const fractionDigits = currencyCode === "JPY" ? 0 : 2;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: currencyCode === "EUR" ? "symbol" : "code",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(isNaN(num) ? 0 : num);
}

/**
 * Same as formatDocumentCurrency but with regular spaces for PDF rendering (avoids "3/000" display bug).
 */
export function formatCurrencyForPdf(
  value: number | string | null | undefined,
  currency: string = "EUR"
): string {
  return toPdfSafeSpaces(formatDocumentCurrency(value, currency));
}

/**
 * Generate invoice reference (F-000067 format)
 */
export function generateInvoiceReference(lastNumber: number): string {
  const nextNumber = lastNumber + 1;
  return `F-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Generate client reference (C-000001 format)
 */
export function generateClientReference(lastNumber: number): string {
  const nextNumber = lastNumber + 1;
  return `C-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Parse invoice reference to get number
 */
export function parseInvoiceReference(ref: string): number {
  const match = ref.match(/F-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse client reference to get number
 */
export function parseClientReference(ref: string): number {
  const match = ref.match(/C-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
