export const ACTIVE_BUSINESS_COOKIE = "active_business";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

/** URL of a page scoped to a business, e.g. businessPath(id, "/invoices"). */
export function businessPath(businessId: string, path = "/dashboard"): string {
  return `/b/${businessId}${path.startsWith("/") ? path : `/${path}`}`;
}
