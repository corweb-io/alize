import type { DeclarationFrequency } from "./types";

export interface DeclarationPeriod {
  key: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function getMonthlyPeriod(date: Date): DeclarationPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return {
    key: `${year}-${pad(month + 1)}`,
    label: `${MONTH_NAMES[month]} ${year}`,
    startDate,
    endDate,
  };
}

export function getQuarterlyPeriod(date: Date): DeclarationPeriod {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

  const quarterLabels = ["T1", "T2", "T3", "T4"];

  return {
    key: `${year}-Q${quarter}`,
    label: `${quarterLabels[quarter - 1]} ${year}`,
    startDate,
    endDate,
  };
}

export function getDeclarationPeriod(
  frequency: DeclarationFrequency,
  date: Date
): DeclarationPeriod {
  return frequency === "monthly"
    ? getMonthlyPeriod(date)
    : getQuarterlyPeriod(date);
}

export function getCurrentDeclarationPeriod(
  frequency: DeclarationFrequency,
  date: Date = new Date()
): DeclarationPeriod {
  return getDeclarationPeriod(frequency, date);
}

export function parsePeriodKey(
  key: string,
  frequency: DeclarationFrequency
): DeclarationPeriod | null {
  if (frequency === "monthly") {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) return null;
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return getMonthlyPeriod(new Date(Number(match[1]), month - 1, 1));
  }

  const match = /^(\d{4})-Q([1-4])$/.exec(key);
  if (!match) return null;
  return getQuarterlyPeriod(
    new Date(Number(match[1]), (Number(match[2]) - 1) * 3, 1)
  );
}

export function listDeclarationPeriods(
  frequency: DeclarationFrequency,
  fromDate: Date,
  toDate: Date = new Date()
): DeclarationPeriod[] {
  const startPeriod = getDeclarationPeriod(frequency, fromDate);
  const endPeriod = getDeclarationPeriod(frequency, toDate);

  if (startPeriod.startDate > endPeriod.startDate) {
    return [endPeriod];
  }

  const periods: DeclarationPeriod[] = [];
  let cursor = new Date(startPeriod.startDate.getTime());
  const max = frequency === "monthly" ? 120 : 40;

  for (let i = 0; i < max; i++) {
    const period = getDeclarationPeriod(frequency, cursor);
    periods.push(period);
    if (period.key === endPeriod.key) break;
    cursor =
      frequency === "monthly"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        : new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1);
  }

  return periods;
}

export function resolveDeclarationPeriod(
  frequency: DeclarationFrequency,
  periodKey: string | undefined,
  availablePeriods: DeclarationPeriod[],
  fallback: DeclarationPeriod
): DeclarationPeriod {
  if (!periodKey) return fallback;
  const parsed = parsePeriodKey(periodKey, frequency);
  if (!parsed) return fallback;
  return availablePeriods.find((period) => period.key === parsed.key) ?? fallback;
}

export function getYearToDateRange(date: Date = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  return {
    startDate: new Date(date.getFullYear(), 0, 1),
    endDate: new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

export function isDateInPeriod(
  dateStr: string,
  period: DeclarationPeriod
): boolean {
  const date = new Date(dateStr);
  return date >= period.startDate && date <= period.endDate;
}
