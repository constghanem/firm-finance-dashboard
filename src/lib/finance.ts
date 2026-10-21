import type { DataModel, Scenario, Scope, Settings } from "./types";
import { num, safeDiv } from "./money";
import { shareFor } from "./share";
import { laborFor, companyProductiveHourCost } from "./labor";
import { unitMonth, rentableUnits, isFullLease } from "./rentals";
import { expenseMonth } from "./expenses";

/** الإهلاك يُقسَّم مناصفة بين الشركتين عند عرض شركة واحدة */
const DEP_SHARE: Record<Scope, number> = { all: 1, alpha: 0.5, beta: 0.5 };
const NEUTRAL: Scenario = { id: "base", name: "الوضع الحالي", volumeFactor: 1, priceFactor: 1, costFactor: 1, occupancyFactor: 1 };

export interface MonthRow {
  month: number;
  revServices: number;
  revRentals: number;
  vat: number; // ضريبة القيمة المضافة المحصّلة على الخدمات (مذكرة، لا تدخل الإيراد)
  revenue: number;
  cogs: number; // تكلفة الخدمات المباشرة (مصروفات الجهات + رسوم + عمولات)
  grossProfit: number;
  salaries: number;
  rentCost: number; // إيجار المالك للوحدات
  expenses: number;
  depreciation: number;
  ebit: number;
  tax: number;
  net: number;
  salesQty: number;
  occupiedUnits: number;
  totalUnits: number;
}

export const emptyRow = (month: number): MonthRow => ({
  month, revServices: 0, revRentals: 0, vat: 0, revenue: 0, cogs: 0, grossProfit: 0, salaries: 0,
  rentCost: 0, expenses: 0, depreciation: 0, ebit: 0, tax: 0, net: 0, salesQty: 0,
  occupiedUnits: 0, totalUnits: 0,
});

function finishRow(r: MonthRow, s: Settings): MonthRow {
  r.revenue = r.revServices + r.revRentals;
  r.grossProfit = r.revenue - r.cogs;
  r.ebit = r.grossProfit - r.salaries - r.rentCost - r.expenses - r.depreciation;
  r.tax = 0;
  r.net = r.ebit;
  return r;
}

/** السلسلة الشهرية (12 شهراً) لسنة معيّنة وشركة أو للمجموع، مع سيناريو اختياري */
export function monthlySeries(d: DataModel, scope: Scope, year: number, scenario: Scenario = NEUTRAL): MonthRow[] {
  // المجموع = مجموع الشركتين: كل شركة كيان قانوني مستقل تُحسب ضريبتها على ربحها وحده
  if (scope === "all") {
    const a = monthlySeries(d, "alpha", year, scenario);
    const b = monthlySeries(d, "beta", year, scenario);
    return a.map((r, i) => sumRows(r, b[i]));
  }
  const s = d.settings;
  const vol = num(scenario.volumeFactor) || 1;
  const price = num(scenario.priceFactor) || 1;
  const cost = num(scenario.costFactor) || 1;
  const occ = num(scenario.occupancyFactor) || 1;
  const units = rentableUnits(d.rentalUnits);
  const fullLeaseBuildings = new Set(units.filter(isFullLease).map((u) => u.buildingName));
  const rows: MonthRow[] = [];

  // أجور الموظفين (شهرياً ثابتة، تتغير بالسنة فقط عبر التوقعات)
  const salariesMonthly = d.positions.reduce((t, p) => t + laborFor(p, s).monthlyTotal * shareFor(p, scope), 0);
  const depMonthly = (num(s.initialInvestment) * num(s.annualDepreciationRate)) / 100 / 12 * (DEP_SHARE[scope] ?? 1);

  for (let m = 1; m <= 12; m++) {
    const r = emptyRow(m);

    for (const sale of d.monthlySales) {
      if (sale.year !== year || sale.month !== m) continue;
      const share = sale.companyId === scope ? 1 : 0;
      if (!share) continue;
      const svc = d.serviceCatalog.find((x) => x.id === sale.serviceId);
      const qty = num(sale.quantity) * vol;
      const unitPrice = (num(sale.actualPrice) || num(svc?.basePrice)) * price;
      const direct = svc
        ? num(svc.govFees) + num(svc.externalCost) + num(svc.commission) +
          (svc.otherCosts ?? []).reduce((t, x) => t + num(x.amount), 0)
        : 0;
      r.revServices += qty * unitPrice;
      if (svc?.hasVAT) r.vat += qty * unitPrice * (num(s.vatRate) / 100);
      r.cogs += qty * direct * cost;
      r.salesQty += qty;
    }

    for (const u of units) {
      const uc = u.companyId ?? "beta";
      const share = shareFor({ companyId: uc }, scope);
      if (!share) continue;
      const um = unitMonth(u, year, m);
      let ownerCost = um.ownerCost;
      // المبنى المستأجر كاملاً: تكلفة المالك تُحسب مرة واحدة (بدون ازدواج مع المكاتب الفرعية)
      if (fullLeaseBuildings.has(u.buildingName)) {
        const mode = s.rentCostMode ?? "building";
        if (mode === "building" && !isFullLease(u)) ownerCost = 0;
        if (mode === "units" && isFullLease(u)) ownerCost = 0;
      }
      if (!isFullLease(u)) {
        r.totalUnits += share;
        if (um.revenue > 0) r.occupiedUnits += share;
      }
      r.revRentals += um.revenue * share * occ;
      r.rentCost += ownerCost * share * cost;
    }

    r.salaries = salariesMonthly * cost;
    r.expenses = d.expenses.reduce((t, e) => t + expenseMonth(e, m) * shareFor(e, scope), 0) * cost;
    r.depreciation = depMonthly;
    rows.push(finishRow(r, s));
  }
  allocateTax(rows, s);
  return rows;
}

/** ضريبة الدخل تُحسب على ربح الشركة السنوي (لا تُخفَّض بخسائر شركة أخرى)، ثم تُوزَّع على الأشهر حسب ربح كل شهر */
function allocateTax(rows: MonthRow[], s: Settings): void {
  const rate = num(s.incomeTaxRate) / 100;
  const annualTax = Math.max(0, rows.reduce((t, r) => t + r.ebit, 0)) * rate;
  const positive = rows.reduce((t, r) => t + Math.max(0, r.ebit), 0);
  for (const r of rows) {
    r.tax = positive > 0 ? (annualTax * Math.max(0, r.ebit)) / positive : 0;
    r.net = r.ebit - r.tax;
  }
}

/** جمع شهرين (لشركتين) حقلاً حقلاً */
function sumRows(a: MonthRow, b: MonthRow): MonthRow {
  const out: MonthRow = { ...a };
  const o = out as unknown as Record<string, number>;
  const A = a as unknown as Record<string, number>;
  const B = b as unknown as Record<string, number>;
  for (const k of Object.keys(A)) if (k !== "month") o[k] = A[k] + B[k];
  return out;
}

export interface Totals extends Omit<MonthRow, "month" | "salesQty" | "occupiedUnits" | "totalUnits"> {
  occupancy: number;
  margin: number;
  netMargin: number;
}

export function aggregate(rows: MonthRow[], s: Settings): Totals {
  const t = rows.reduce<Totals>(
    (acc, r) => {
      acc.revServices += r.revServices;
      acc.revRentals += r.revRentals;
      acc.vat += r.vat;
      acc.tax += r.tax;
      acc.cogs += r.cogs;
      acc.salaries += r.salaries;
      acc.rentCost += r.rentCost;
      acc.expenses += r.expenses;
      acc.depreciation += r.depreciation;
      return acc;
    },
    { revServices: 0, revRentals: 0, vat: 0, revenue: 0, cogs: 0, grossProfit: 0, salaries: 0, rentCost: 0, expenses: 0,
      depreciation: 0, ebit: 0, tax: 0, net: 0, occupancy: 0, margin: 0, netMargin: 0 },
  );
  t.revenue = t.revServices + t.revRentals;
  t.grossProfit = t.revenue - t.cogs;
  t.ebit = t.grossProfit - t.salaries - t.rentCost - t.expenses - t.depreciation;
  // الضريبة = مجموع ضرائب الأشهر (وكل شهر موزَّع من ضريبة الشركة السنوية)
  t.net = t.ebit - t.tax;
  const occSum = rows.reduce((a, r) => a + r.occupiedUnits, 0);
  const totSum = rows.reduce((a, r) => a + r.totalUnits, 0);
  t.occupancy = safeDiv(occSum, totSum);
  t.margin = safeDiv(t.grossProfit, t.revenue);
  t.netMargin = safeDiv(t.net, t.revenue);
  return t;
}

/** نقطة التعادل الشهرية = (التكاليف الثابتة للفترة ÷ عدد أشهرها) ÷ نسبة هامش المساهمة */
export function breakEven(t: Totals, months = 12): number {
  const fixed = t.salaries + t.rentCost + t.expenses + t.depreciation;
  const contribution = safeDiv(t.revenue - t.cogs, t.revenue);
  return contribution > 0 ? fixed / months / contribution : Number.POSITIVE_INFINITY;
}

export interface CashRow {
  month: number;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

/** التدفق النقدي الشهري (تقريبي على أساس الاستحقاق) مع الرصيد التراكمي */
export function cashFlow(rows: MonthRow[], opening: number): CashRow[] {
  let bal = num(opening);
  return rows.map((r) => {
    const inflow = r.revenue + r.vat; // المقبوضات شاملة الضريبة المحصّلة
    const outflow = r.cogs + r.salaries + r.rentCost + r.expenses + r.tax + r.vat; // وتوريد الضريبة للهيئة
    const net = inflow - outflow;
    bal += net;
    return { month: r.month, inflow, outflow, net, balance: bal };
  });
}

export interface ForecastRow {
  year: number;
  revenue: number;
  cogs: number;
  salaries: number;
  rent: number;
  expenses: number;
  depreciation: number;
  ebit: number;
  tax: number;
  net: number;
}

/** توقع خمس سنوات بعد سنة الأساس: كل بند ينمو بمعدله من الإعدادات */
export function forecast(base: Totals, s: Settings, years = 5, baseYear = 2026): ForecastRow[] {
  const out: ForecastRow[] = [];
  const g = (rate: number, k: number) => Math.pow(1 + num(rate) / 100, k);
  for (let k = 1; k <= years; k++) {
    const revenue = base.revenue * g(s.revenueGrowthRate, k);
    const cogs = base.revenue ? base.cogs * (revenue / base.revenue) : base.cogs * g(s.costGrowthRate, k);
    const salaries = base.salaries * g(s.annualSalaryIncrease, k);
    const rent = base.rentCost * g(s.annualRentIncrease, k);
    const expenses = base.expenses * g(s.annualExpenseIncrease, k);
    const depreciation = base.depreciation;
    const ebit = revenue - cogs - salaries - rent - expenses - depreciation;
    const tax = Math.max(0, ebit) * (num(s.incomeTaxRate) / 100);
    out.push({ year: baseYear + k, revenue, cogs, salaries, rent, expenses, depreciation, ebit, tax, net: ebit - tax });
  }
  return out;
}

/** توقع السنوات الخمس للمجموعة أو لشركة: المجموع = مجموع الشركتين، وكل واحدة تُحسب ضريبتها على حدة */
export function forecastFor(d: DataModel, scope: Scope, year: number, scenario: Scenario = NEUTRAL, years = 5): ForecastRow[] {
  const one = (c: Scope) => forecast(aggregate(monthlySeries(d, c, year, scenario), d.settings), d.settings, years, year);
  if (scope !== "all") return one(scope);
  const a = forecast(aggregate(monthlySeries(d, "alpha", year, scenario), d.settings), d.settings, years, year);
  const b = forecast(aggregate(monthlySeries(d, "beta", year, scenario), d.settings), d.settings, years, year);
  return a.map((r, i) => {
    const o = b[i];
    return {
      year: r.year,
      revenue: r.revenue + o.revenue,
      cogs: r.cogs + o.cogs,
      salaries: r.salaries + o.salaries,
      rent: r.rent + o.rent,
      expenses: r.expenses + o.expenses,
      depreciation: r.depreciation + o.depreciation,
      ebit: r.ebit + o.ebit,
      tax: r.tax + o.tax,
      net: r.net + o.net,
    };
  });
}

export function scenarioOf(d: DataModel, id: string | undefined): Scenario {
  return d.scenarios.find((x) => x.id === id) ?? NEUTRAL;
}

export const BASE_SCENARIO = NEUTRAL;

/** تكلفة الساعة المنتجة للشركة (لتسعير الخدمات) */
export function hourCostFor(d: DataModel, company: "alpha" | "beta"): number {
  return companyProductiveHourCost(d.positions, d.settings, company);
}
