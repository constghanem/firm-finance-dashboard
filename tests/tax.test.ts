import { describe, expect, it } from "vitest";
import { initialData } from "../src/lib/initialData";
import { aggregate, forecastFor, monthlySeries, BASE_SCENARIO } from "../src/lib/finance";

const d = initialData;
const rate = d.settings.incomeTaxRate / 100;

describe("ضريبة الدخل لكل شركة على حدة", () => {
  it("مجموع ضرائب الأشهر = ضريبة الفترة", () => {
    const rows = monthlySeries(d, "beta", 2026, BASE_SCENARIO);
    const t = aggregate(rows, d.settings);
    expect(t.tax).toBeCloseTo(rows.reduce((a, r) => a + r.tax, 0), 6);
  });

  it("ضريبة المجموعة = ضريبة ألفا + ضريبة بيتا (بلا مقاصة خسائر بين الشركات)", () => {
    const all = aggregate(monthlySeries(d, "all", 2026, BASE_SCENARIO), d.settings);
    const a = aggregate(monthlySeries(d, "alpha", 2026, BASE_SCENARIO), d.settings);
    const b = aggregate(monthlySeries(d, "beta", 2026, BASE_SCENARIO), d.settings);
    expect(all.tax).toBeCloseTo(a.tax + b.tax, 6);
  });

  it("شركة بخسارة سنوية لا تدفع ضريبة، ولا تُخفّض ضريبة الشركة الأخرى", () => {
    const a = aggregate(monthlySeries(d, "alpha", 2026, BASE_SCENARIO), d.settings);
    expect(a.ebit).toBeLessThan(0);
    expect(a.tax).toBe(0);
  });

  it("الضريبة السنوية للشركة الرابحة = نسبة الضريبة × ربحها السنوي", () => {
    const b = aggregate(monthlySeries(d, "beta", 2026, BASE_SCENARIO), d.settings);
    expect(b.ebit).toBeGreaterThan(0);
    expect(b.tax).toBeCloseTo(b.ebit * rate, 4);
  });

  it("الأشهر الخاسرة لا تحمل ضريبة", () => {
    const rows = monthlySeries(d, "beta", 2026, BASE_SCENARIO);
    for (const r of rows) if (r.ebit <= 0) expect(r.tax).toBe(0);
  });

  it("توقع المجموعة يجمع ضرائب الشركتين", () => {
    const all = forecastFor(d, "all", 2026, BASE_SCENARIO, 5);
    const a = forecastFor(d, "alpha", 2026, BASE_SCENARIO, 5);
    const b = forecastFor(d, "beta", 2026, BASE_SCENARIO, 5);
    all.forEach((r, i) => expect(r.tax).toBeCloseTo(a[i].tax + b[i].tax, 4));
  });
});
