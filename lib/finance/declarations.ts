import type { DeclarationFrequency, FiscalSettings } from "./types";
import type { DeclarationPeriod } from "./periods";
import { getCurrentDeclarationPeriod } from "./periods";
import type { PeriodSummary } from "./types";

export const CPS_DCA_URL =
  "https://cps-stbarth.msa.fr/lfp/declarer-chiffre-affaires";

export type DeclarationStatus = "declared" | "ok" | "due_soon" | "overdue";

export interface DeclarationSummary {
  periodKey: string;
  periodLabel: string;
  deadline: Date;
  daysUntilDeadline: number;
  status: DeclarationStatus;
  declaredAt: string | null;
  turnoverEstimate: number;
  /** CA declared to the CPS, when recorded */
  declaredTurnover: number | null;
  cotisationsEstimate: number;
}

export function getDeclarationDeadline(
  period: DeclarationPeriod,
  frequency: DeclarationFrequency
): Date {
  if (frequency === "monthly") {
    const periodEndMonth = period.endDate.getMonth();
    const periodEndYear = period.endDate.getFullYear();
    const followingMonth = periodEndMonth + 1;
    const deadlineYear =
      followingMonth > 11 ? periodEndYear + 1 : periodEndYear;
    const deadlineMonth = followingMonth % 12;
    return new Date(deadlineYear, deadlineMonth + 1, 0, 23, 59, 59, 999);
  }

  const match = period.key.match(/^(\d+)-Q(\d)$/);
  if (!match) {
    return new Date(period.endDate.getFullYear(), period.endDate.getMonth() + 2, 0);
  }

  const year = parseInt(match[1], 10);
  const quarter = parseInt(match[2], 10);

  switch (quarter) {
    case 1:
      return new Date(year, 3, 30, 23, 59, 59, 999);
    case 2:
      return new Date(year, 6, 31, 23, 59, 59, 999);
    case 3:
      return new Date(year, 9, 31, 23, 59, 59, 999);
    case 4:
      return new Date(year + 1, 0, 31, 23, 59, 59, 999);
    default:
      return new Date(year, 3, 30, 23, 59, 59, 999);
  }
}

export function getDaysUntilDeadline(
  deadline: Date,
  now: Date = new Date()
): number {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfDeadline = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );
  return Math.ceil(
    (startOfDeadline.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getDeclarationStatus(
  declaredAt: string | null | undefined,
  deadline: Date,
  now: Date = new Date()
): DeclarationStatus {
  if (declaredAt) return "declared";

  const days = getDaysUntilDeadline(deadline, now);
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "ok";
}

export function buildDeclarationSummary(
  settings: FiscalSettings,
  periodSummary: PeriodSummary,
  declaredAt?: string | null,
  now: Date = new Date()
): DeclarationSummary {
  const frequency = settings.declaration_frequency || "quarterly";
  const period: DeclarationPeriod = {
    key: periodSummary.periodKey,
    label: periodSummary.label,
    startDate: periodSummary.startDate,
    endDate: periodSummary.endDate,
  };
  const deadline = getDeclarationDeadline(period, frequency);

  return {
    periodKey: periodSummary.periodKey,
    periodLabel: periodSummary.label,
    deadline,
    daysUntilDeadline: getDaysUntilDeadline(deadline, now),
    status: getDeclarationStatus(declaredAt, deadline, now),
    declaredAt: declaredAt ?? null,
    turnoverEstimate: periodSummary.turnover,
    declaredTurnover: periodSummary.declaredTurnover,
    cotisationsEstimate: periodSummary.cotisationsDue,
  };
}

export function getCurrentPeriodDeclarationSummary(
  settings: FiscalSettings,
  declaredAt?: string | null,
  turnoverEstimate = 0,
  cotisationsEstimate = 0,
  now: Date = new Date()
): DeclarationSummary {
  const frequency = settings.declaration_frequency || "quarterly";
  const period = getCurrentDeclarationPeriod(frequency, now);
  const deadline = getDeclarationDeadline(period, frequency);

  return {
    periodKey: period.key,
    periodLabel: period.label,
    deadline,
    daysUntilDeadline: getDaysUntilDeadline(deadline, now),
    status: getDeclarationStatus(declaredAt, deadline, now),
    declaredAt: declaredAt ?? null,
    turnoverEstimate,
    declaredTurnover: null,
    cotisationsEstimate,
  };
}

export function shouldShowDeclarationReminder(
  summary: DeclarationSummary
): boolean {
  if (summary.status === "declared") return false;
  return summary.status === "overdue" || summary.status === "due_soon" || summary.daysUntilDeadline <= 14;
}
