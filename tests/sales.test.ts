import { describe, expect, it } from "vitest";
import { initialData } from "../src/lib/initialData";
import { aggregate, cashFlow, monthlySeries, scenarioOf, BASE_SCENARIO } from "../src/lib/finance";
import { TOTAL_SALES_ID } from "../src/lib/sales";
import { ESTIMATED_MONTHLY_SALES } from "../src/lib/defaults";

const d = initialData;

describe("المبيعات الشهرية التقديرية (150 إلى 300 ألف)", () => {
  it("القيمة الأساسية منتصف النطاق لكل شهر من السنة", () => {
    const totals = d.monthlySales.filter((s) => s.serviceId === TOTAL_SALES_ID && s.year === 2026);
    expect(totals.length).toBe(12);
    for (const s of totals) expect(s.actualPrice).toBe(ESTIMATED_MONTHLY_SALES);
  });

  it("إيراد الخدمات السنوي في الوضع الحالي = 225 ألف × 12", () => {
    const rows = monthlySeries(d, "all", 2026, BASE_SCENARIO);
    const t = aggregate(rows, d.settings);
    expect(Math.round(t.revServices)).toBe(ESTIMATED_MONTHLY_SALES * 12);
  });

  it("سيناريو الحد الأدنى = 150 ألف والأعلى = 300 ألف شهرياً", () => {
    const low = aggregate(monthlySeries(d, "all", 2026, scenarioOf(d, "sc-sales-min")), d.settings);
    const high = aggregate(monthlySeries(d, "all", 2026, scenarioOf(d, "sc-sales-max")), d.settings);
    expect(Math.round(low.revServices)).toBe(150_000 * 12);
    expect(Math.round(high.revServices)).toBe(300_000 * 12);
  });

  it("ربح التشغيل يتحرك مع المبيعات بالاتجاه الصحيح", () => {
    const low = aggregate(monthlySeries(d, "all", 2026, scenarioOf(d, "sc-sales-min")), d.settings);
    const high = aggregate(monthlySeries(d, "all", 2026, scenarioOf(d, "sc-sales-max")), d.settings);
    expect(high.ebit).toBeGreaterThan(low.ebit);
  });

  it("ضريبة 15% تُحسب فوق المبيعات ولا تدخل الإيراد", () => {
    const t = aggregate(monthlySeries(d, "all", 2026, BASE_SCENARIO), d.settings);
    expect(Math.round(t.vat)).toBe(Math.round((ESTIMATED_MONTHLY_SALES * 12 * d.settings.vatRate) / 100));
    expect(Math.round(t.revServices)).toBe(ESTIMATED_MONTHLY_SALES * 12);
  });

  it("الضريبة لا تغيّر صافي النقد: الرصيد النهائي = صافي الربح + الإهلاك", () => {
    const rows = monthlySeries(d, "all", 2026, BASE_SCENARIO);
    const t = aggregate(rows, d.settings);
    const cash = cashFlow(rows, 0);
    expect(Math.round(cash[11].balance)).toBe(Math.round(t.net + t.depreciation));
  });

  it("مجموع الشركتين يساوي المجموع الكلي للإيرادات", () => {
    const all = aggregate(monthlySeries(d, "all", 2026, BASE_SCENARIO), d.settings);
    const a = aggregate(monthlySeries(d, "alpha", 2026, BASE_SCENARIO), d.settings);
    const b = aggregate(monthlySeries(d, "beta", 2026, BASE_SCENARIO), d.settings);
    expect(Math.round(a.revenue + b.revenue)).toBe(Math.round(all.revenue));
  });
});
