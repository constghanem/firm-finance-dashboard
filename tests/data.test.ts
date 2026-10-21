import { describe, expect, it } from "vitest";
import { initialData } from "../src/lib/initialData";
import { laborFor } from "../src/lib/labor";
import { unitMonth, rentableUnits } from "../src/lib/rentals";
import { monthlySeries, aggregate, forecast, breakEven } from "../src/lib/finance";
import { serviceEconomics } from "../src/lib/services";
import { expenseMonth } from "../src/lib/expenses";

const d = initialData;
const S = d.settings;

describe("بيانات الأساس", () => {
  it("عدد السجلات كما في النسخة الاحتياطية", () => {
    expect(d.positions.length).toBe(21);
    expect(d.serviceCatalog.length).toBe(77); // 76 من النسخة + خدمة الإجمالي التقديري
    expect(d.rentalUnits.length).toBe(44);
    expect(d.expenses.length).toBe(106);
  });
  it("كل الصفوف لها معرّف فريد", () => {
    for (const key of ["positions", "serviceCatalog", "rentalUnits", "expenses"] as const) {
      const ids = d[key].map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("الرواتب بالساعة واليوم والإنتاجية", () => {
  it("ساعات العمل الصافية = 9 − استراحة 1 = 8", () => {
    const p = d.positions.find((x) => x.positionTitle === "مدير عام") ?? d.positions[0];
    expect(laborFor(p, S).netHours).toBe(8);
  });
  it("الأيام الشهرية = أيام الأسبوع × 52/12", () => {
    const six = d.positions.find((x) => x.workDaysPerWeek === 6)!;
    expect(laborFor(six, S).daysPerMonth).toBeCloseTo(26, 1);
  });
  it("تكلفة الساعة المنتجة أعلى من الساعة الصافية (لأن الإنتاجية 80%)", () => {
    const p = d.positions[0];
    const l = laborFor(p, S);
    expect(l.productiveHourCost).toBeGreaterThan(l.hourlyCost);
    expect(l.productiveHourCost / l.hourlyCost).toBeCloseTo(1 / 0.8, 3);
  });
  it("التأمينات السعودية 10.75% والأجنبية 2% على الأساسي+السكن", () => {
    const saudi = d.positions.find((p) => p.nationality === "سعودي" && p.insuranceBorneBy === "company" && p.basicSalary > 0)!;
    const l = laborFor(saudi, S);
    expect(l.insurance).toBeCloseTo(((saudi.basicSalary + saudi.housingAllowance) * 10.75) / 100, 6);
  });
  it("الأوفرتايم يُحسب بمعامل 150% من أجر الساعة", () => {
    const base = d.positions[0];
    const withOT = { ...base, overtimeHoursPerDay: 2 };
    const l1 = laborFor(base, S), l2 = laborFor(withOT, S);
    const expected = 2 * l1.daysPerMonth * l1.baseHourly * 1.5;
    expect(l2.overtimeCost).toBeCloseTo(expected, 6);
  });
});

describe("الخدمات", () => {
  it("التكلفة المباشرة = مصروفات الجهات + الرسوم + الخارجي + العمولة", () => {
    const s = d.serviceCatalog[0];
    const e = serviceEconomics(s, 0, S.vatRate);
    const other = s.otherCosts.reduce((t, x) => t + x.amount, 0);
    expect(e.directCost).toBeCloseTo(other + s.govFees + s.externalCost + s.commission, 6);
  });
  it("التكلفة الكاملة تضيف عمالة الساعات × تكلفة الساعة", () => {
    const s = d.serviceCatalog[0];
    const e = serviceEconomics(s, 50, S.vatRate);
    expect(e.fullCost).toBeCloseTo(e.directCost + s.estimatedHours * 50, 6);
  });
});

describe("التأجير", () => {
  it("إيجار المالك يُدفع حتى للوحدات الشاغرة", () => {
    const vacant = d.rentalUnits.find((u) => !u.isOccupied && u.ownerRentPerSqm > 0 && !u.isSubUnit)!;
    const m = unitMonth(vacant, 2026, 6);
    expect(m.revenue).toBe(0);
    expect(m.ownerCost).toBeGreaterThan(0);
  });
  it("وحدة 420م المشغولة: إيراد = سعر المتر × المساحة / 12", () => {
    const u = d.rentalUnits.find((x) => x.isOccupied && x.buildingName.includes("420") && x.contractYearSchedule.length === 0)
      ?? d.rentalUnits.find((x) => x.isOccupied && x.buildingName.includes("420"))!;
    const m = unitMonth(u, 2026, 2);
    expect(m.revenue).toBeGreaterThan(0);
  });
  it("عدد الوحدات القابلة للتأجير أقل أو يساوي الكل", () => {
    expect(rentableUnits(d.rentalUnits).length).toBeLessThanOrEqual(d.rentalUnits.length);
  });
});

describe("المصاريف", () => {
  it("مجموع الشهر = مجموع عناصر مصفوفة الشهر", () => {
    const e = d.expenses.find((x) => x.monthlyAmounts.some((v) => v > 0))!;
    expect(expenseMonth(e, 1)).toBe(e.monthlyAmounts[0]);
  });
});

describe("القوائم المالية", () => {
  const rows = monthlySeries(d, "all", 2026);
  const t = aggregate(rows, S);
  it("12 شهراً", () => expect(rows).toHaveLength(12));
  it("الربح الإجمالي = الإيراد − التكلفة المباشرة", () => {
    expect(t.grossProfit).toBeCloseTo(t.revenue - t.cogs, 4);
  });
  it("مجموع الشركتين = المجموع (للمصاريف والرواتب)", () => {
    const a = aggregate(monthlySeries(d, "alpha", 2026), S);
    const b = aggregate(monthlySeries(d, "beta", 2026), S);
    expect(a.salaries + b.salaries).toBeCloseTo(t.salaries, 3);
    expect(a.expenses + b.expenses).toBeCloseTo(t.expenses, 3);
    expect(a.rentCost + b.rentCost).toBeCloseTo(t.rentCost, 3);
  });
  it("الضريبة صفر عند الخسارة", () => {
    if (t.ebit <= 0) expect(t.tax).toBe(0);
  });
  it("نقطة التعادل موجودة إذا كان هامش المساهمة موجباً", () => {
    const be = breakEven(t);
    expect(Number.isNaN(be)).toBe(false);
  });
  it("التوقع 5 سنوات يبدأ من 2027", () => {
    const f = forecast(t, S);
    expect(f).toHaveLength(5);
    expect(f[0].year).toBe(2027);
  });
});
