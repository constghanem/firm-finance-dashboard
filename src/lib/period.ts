export type PeriodMode = "month" | "year" | "range";

export interface PeriodFilter {
  mode: PeriodMode;
  year: number;
  month: number; // 1..12 (لوضع الشهر)
  from: number; // 1..12 (لوضع الفترة)
  to: number;
}

export const DEFAULT_PERIOD: PeriodFilter = { mode: "year", year: 2026, month: 1, from: 1, to: 12 };

/** أرقام الأشهر (1..12) الداخلة في الفلتر */
export function monthsOf(f: PeriodFilter): number[] {
  if (f.mode === "month") return [f.month];
  if (f.mode === "range") {
    const a = Math.min(f.from, f.to), b = Math.max(f.from, f.to);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function periodLabel(f: PeriodFilter, months: readonly string[]): string {
  if (f.mode === "month") return `${months[f.month - 1]} ${f.year}`;
  if (f.mode === "range") return `${months[Math.min(f.from, f.to) - 1]} – ${months[Math.max(f.from, f.to) - 1]} ${f.year}`;
  return `سنة ${f.year}`;
}
