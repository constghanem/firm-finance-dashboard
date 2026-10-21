import type { CostSplit, Scope } from "./types";

interface Splittable {
  companyId?: "alpha" | "beta";
  costSplit?: CostSplit;
}

/**
 * نسبة حصة الشركة المختارة من بند مشترك.
 * scope = all => 100% (إجمالي المجموعة).
 */
export function shareFor(item: Splittable, scope: Scope): number {
  if (scope === "all") return 1;
  if (item.costSplit) {
    const pct = scope === "alpha" ? item.costSplit.alphaPct : item.costSplit.betaPct;
    return (Number.isFinite(pct) ? pct : 0) / 100;
  }
  return item.companyId === scope ? 1 : 0;
}
