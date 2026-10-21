import type { Expense } from "./types";
import { num } from "./money";

/** مصروف الشهر (1..12) لسنة الخطة: القيمة الفعلية من مصفوفة الأشهر */
export function expenseMonth(e: Expense, m: number): number {
  const arr = e.monthlyAmounts;
  if (Array.isArray(arr) && arr.length >= m) return num(arr[m - 1]);
  return num(e.monthlyAmount);
}

export function expenseYearTotal(e: Expense): number {
  const arr = Array.isArray(e.monthlyAmounts) ? e.monthlyAmounts : [];
  if (arr.length === 0) return num(e.annualAmount);
  return arr.reduce((t, x) => t + num(x), 0);
}
