/**
 * Shared helpers for installment due-date evaluation, Holiday / Leave exemptions,
 * overdue calculations, and schedule extension dates.
 */

export const EXEMPT_INSTALLMENT_STATUSES = new Set(['holiday', 'leave', 'missed']);

/**
 * Returns YYYY-MM-DD in Asia/Kolkata so day comparisons remain consistent
 * across IST clients and UTC production servers.
 */
export const getISTDateStr = (dateInput = new Date()) => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Returns the effective due date of an installment, preferring rescheduled_due_date
 * when a holiday reschedule is active.
 */
export const getEffectiveDueDate = (inst) => {
  const raw = inst?.rescheduled_due_date || inst?.dueDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * True when an installment is skipped / exempted due to Holiday, Leave, or Missed day.
 * Exempt installments must never become Overdue or accrue late penalties.
 */
export const isInstallmentExempt = (inst) => {
  return Boolean(inst && EXEMPT_INSTALLMENT_STATUSES.has(inst.status));
};

/**
 * True when an installment is still payable (neither paid nor holiday/leave/missed).
 */
export const isInstallmentPayable = (inst) => {
  return Boolean(inst && inst.status !== 'paid' && !isInstallmentExempt(inst));
};

/**
 * True when an installment counts as Overdue on the given reference date:
 * excludes Paid and Holiday/Leave/Missed rows and compares rescheduled_due_date || dueDate.
 */
export const isInstallmentOverdue = (inst, refDate = new Date()) => {
  if (!isInstallmentPayable(inst)) return false;
  const effDue = getEffectiveDueDate(inst);
  if (!effDue) return false;
  const effStr = getISTDateStr(effDue);
  const todayStr = getISTDateStr(refDate);
  return Boolean(effStr && todayStr && effStr < todayStr);
};

/**
 * Computes the next installment due date (+1 day, +7 days, or +1 month)
 * after `baseDate` according to the loan's financeType.
 */
export const computeNextPeriodDueDate = (baseDate, financeType = 'daily') => {
  const d = new Date(baseDate || new Date());
  if (financeType === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (financeType === 'monthly') {
    const origDay = d.getDate();
    d.setMonth(d.getMonth() + 1);
    // Handle end-of-month rollover (e.g., Jan 31 -> Feb 28 instead of Mar 3)
    if (d.getDate() < origDay) {
      d.setDate(0);
    }
  } else {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

/**
 * Computes the highest effective due date across a loan's schedule.
 */
export const getScheduleMaxDueDate = (schedule = []) => {
  let maxDate = null;
  for (const s of schedule) {
    const d = getEffectiveDueDate(s);
    if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
      maxDate = d;
    }
  }
  return maxDate;
};

/**
 * Recomputes overall loan status ('completed' | 'overdue' | 'active') using
 * rescheduled_due_date when present and ignoring holiday/leave/missed installments.
 */
export const computeLoanStatusFromSchedule = (loan, refDate = new Date()) => {
  if (!loan) return 'active';
  if (Number(loan.remainingBalance) <= 0) return 'completed';
  const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
  const hasOverdue = schedule.some((inst) => isInstallmentOverdue(inst, refDate));
  return hasOverdue ? 'overdue' : 'active';
};
