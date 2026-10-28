import type { ItemUnit } from "@/lib/types/database";

export const ITEM_UNIT_OPTIONS: { value: ItemUnit; label: string }[] = [
  { value: "unit", label: "Quantité" },
  { value: "hour", label: "Heures" },
  { value: "day", label: "Jours" },
];

const UNIT_SUFFIX: Record<ItemUnit, { quantity: string; price: string }> = {
  unit: { quantity: "", price: "" },
  hour: { quantity: " h", price: " / h" },
  day: { quantity: " j", price: " / jour" },
};

function unitOf(unit?: string | null): ItemUnit {
  return unit === "hour" || unit === "day" ? unit : "unit";
}

/**
 * Quantity as printed on documents: "5,5 h", "19 j", or "2,00" for plain
 * units. Uses regular spaces so it is safe in PDFs.
 */
export function formatItemQuantity(
  quantity: number | string,
  unit?: string | null
): string {
  const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  const itemUnit = unitOf(unit);
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: itemUnit === "unit" ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
  return (formatted + UNIT_SUFFIX[itemUnit].quantity).replace(
    / | /g,
    " "
  );
}

/** Suffix after a unit price: " / h", " / jour", or nothing. */
export function getUnitPriceSuffix(unit?: string | null): string {
  return UNIT_SUFFIX[unitOf(unit)].price;
}
