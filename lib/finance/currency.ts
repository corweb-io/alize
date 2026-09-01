/**
 * Fiscal analytics use EUR (Saint-Barthélemy / France micro-entreprise rules).
 */
export const FISCAL_BASE_CURRENCY = "EUR";

const FRANKFURTER_API = "https://api.frankfurter.app";

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

const rateCache = new Map<string, number>();

function toIsoDate(date: string | Date): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  if (parsed > today) {
    return today.toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

async function fetchExchangeRate(
  from: string,
  to: string,
  date: string
): Promise<number> {
  if (from === to) return 1;

  const cacheKey = `${date}:${from}:${to}`;
  const cached = rateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const response = await fetch(
    `${FRANKFURTER_API}/${date}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { next: { revalidate: 86_400 } }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to fetch exchange rate for ${from} → ${to} on ${date}`
    );
  }

  const data = (await response.json()) as FrankfurterResponse;
  const rate = data.rates[to];
  if (typeof rate !== "number") {
    throw new Error(`Missing exchange rate for ${from} → ${to} on ${date}`);
  }

  rateCache.set(cacheKey, rate);
  return rate;
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string | Date
): Promise<number> {
  const from = fromCurrency || FISCAL_BASE_CURRENCY;
  const to = toCurrency || FISCAL_BASE_CURRENCY;

  if (from === to) return amount;

  const rate = await fetchExchangeRate(from, to, toIsoDate(date));
  return Math.round(amount * rate * 100) / 100;
}

function fiscalDate(item: {
  invoice_date: string;
  paid_at?: string | null;
}): string {
  return toIsoDate(item.paid_at || item.invoice_date);
}

export async function convertAmountsToBaseCurrency<
  T extends {
    total_ht: number;
    currency?: string;
    invoice_date: string;
    paid_at?: string | null;
  },
>(items: T[], baseCurrency: string = FISCAL_BASE_CURRENCY): Promise<
  (T & { total_ht_base: number })[]
> {
  if (!items.length) return [];

  const uniquePairs = new Set<string>();
  for (const item of items) {
    const from = item.currency || baseCurrency;
    if (from === baseCurrency) continue;
    uniquePairs.add(`${fiscalDate(item)}:${from}`);
  }

  const rateMap = new Map<string, number>();
  await Promise.all(
    [...uniquePairs].map(async (key) => {
      const [date, from] = key.split(":");
      rateMap.set(key, await fetchExchangeRate(from, baseCurrency, date));
    })
  );

  return items.map((item) => {
    const from = item.currency || baseCurrency;
    if (from === baseCurrency) {
      return { ...item, total_ht_base: item.total_ht };
    }

    const date = fiscalDate(item);
    const rate = rateMap.get(`${date}:${from}`);
    if (rate === undefined) {
      return { ...item, total_ht_base: item.total_ht };
    }

    return {
      ...item,
      total_ht_base: Math.round(item.total_ht * rate * 100) / 100,
    };
  });
}
