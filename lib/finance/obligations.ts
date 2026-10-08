import { createClient } from "@/lib/supabase/server";
import type { AnnualObligation, FiscalSettings } from "@/lib/types/database";
import {
  getDefaultAmountDue,
  getObligationDueDate,
  getObligationStatus,
  getDaysUntilDue,
  OBLIGATION_DEFINITIONS,
  shouldIncludeObligation,
  type ObligationType,
} from "./obligations-st-barth";

export interface ObligationItem {
  type: ObligationType;
  year: number;
  label: string;
  fullName: string;
  description: string;
  paymentUrl: string;
  paymentLabel: string;
  amountDue: number;
  amountPaid: number;
  paidAt: string | null;
  notes: string | null;
  dueDate: Date;
  daysUntilDue: number;
  status: "paid" | "overdue" | "due_soon" | "upcoming";
  recordId: string | null;
}

const OBLIGATION_TYPES: ObligationType[] = ["cfae", "ted"];

function buildObligationItem(
  type: ObligationType,
  year: number,
  settings: FiscalSettings,
  record: AnnualObligation | undefined,
  now: Date
): ObligationItem {
  const def = OBLIGATION_DEFINITIONS[type];
  const dueDate = getObligationDueDate(type, year);
  const amountDue = record
    ? Number(record.amount_due)
    : getDefaultAmountDue(type, settings);
  const amountPaid = record ? Number(record.amount_paid) : 0;

  return {
    type,
    year,
    label: def.label,
    fullName: def.fullName,
    description: def.description,
    paymentUrl: def.paymentUrl,
    paymentLabel: def.paymentLabel,
    amountDue,
    amountPaid,
    paidAt: record?.paid_at ?? null,
    notes: record?.notes ?? null,
    dueDate,
    daysUntilDue: getDaysUntilDue(dueDate, now),
    status: getObligationStatus(amountDue, amountPaid, dueDate, now),
    recordId: record?.id ?? null,
  };
}

export async function getObligationSummary(
  businessId: string,
  settings: FiscalSettings,
  year: number = new Date().getFullYear()
) {
  const supabase = await createClient();
  const now = new Date();

  const { data: records } = await supabase
    .from("annual_obligations")
    .select("*")
    .eq("business_id", businessId)
    .eq("year", year);

  const recordByType = new Map(
    (records ?? []).map((r) => [r.obligation_type as ObligationType, r])
  );

  const obligations = OBLIGATION_TYPES.filter((type) =>
    shouldIncludeObligation(type, settings, year)
  ).map((type) =>
    buildObligationItem(
      type,
      year,
      settings,
      recordByType.get(type),
      now
    )
  );

  const unpaid = obligations.filter((o) => o.status !== "paid");
  const nextUnpaid = [...unpaid].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  )[0];

  return {
    year,
    obligations,
    unpaidCount: unpaid.length,
    totalDue: obligations.reduce((sum, o) => sum + o.amountDue, 0),
    totalPaid: obligations.reduce((sum, o) => sum + o.amountPaid, 0),
    nextUnpaid,
  };
}
