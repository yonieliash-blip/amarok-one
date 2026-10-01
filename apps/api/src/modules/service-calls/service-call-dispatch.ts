import { badRequest } from "../../lib/errors.js";

const MAX_DISPATCH_RANGE_MS = 48 * 60 * 60 * 1000;

export interface DispatchRange {
  scheduledFrom: Date;
  scheduledTo: Date;
}

/**
 * Dispatch is intentionally bounded to a short date range. This prevents a
 * calendar view from becoming an unbounded tenant-wide operational export.
 */
export function parseDispatchRange(scheduledFrom: string, scheduledTo: string): DispatchRange {
  const from = new Date(scheduledFrom);
  const to = new Date(scheduledTo);

  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to) {
    throw badRequest("טווח תאריכים לא תקין ללוח השיבוץ.");
  }

  if (to.valueOf() - from.valueOf() > MAX_DISPATCH_RANGE_MS) {
    throw badRequest("ניתן להציג בלוח השיבוץ עד 48 שעות בכל פעם.");
  }

  return { scheduledFrom: from, scheduledTo: to };
}
