import * as XLSX from "xlsx";
import type { DataModel, Scope, Settings } from "./types";
import { COMPANY_NAMES } from "./types";
import { BASE_SCENARIO, aggregate, cashFlow, forecastFor, hourCostFor, monthlySeries } from "./finance";
import { laborFor } from "./labor";
import { rentableUnits, unitMonth } from "./rentals";
import { expenseMonth } from "./expenses";
import { serviceEconomics } from "./services";
import { shareFor } from "./share";
import { num, MONTHS_AR } from "./money";
import { TOTAL_SALES_ID } from "./sales";

/** خلية معادلة: الصيغة الحية + القيمة المحسوبة (لتظهر في أي عارض قبل إعادة الحساب) */
type Formula = { f: string; v: number };
type Cell = string | number | Formula;
type Row = Cell[];

/** أرقام صفوف قائمة الدخل (الصف 1 هو الترويسة) */
const PL = { REV_S: 2, REV_R: 3, REV: 4, COGS: 5, GP: 6, SAL: 7, RENT: 8, EXP: 9, DEP: 10, EBIT: 11, TAX: 12, NET: 13, VAT: 16 } as const;
const AS = "'الافتراضات'";
const PLS = "'قائمة الدخل'";
const col = (i: number) => XLSX.utils.encode_col(i);
const F = (f: string, v: number): Formula => ({ f, v: Number.isFinite(v) ? v : 0 });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const safe = (a: number, b: number) => (b ? a / b : 0);

function sheet(rows: Row[], widths: number[]): XLSX.WorkSheet {
  const aoa = rows.map((r) => r.map((c) => (typeof c === "object" ? { t: "n", f: c.f, v: c.v } : c)));
  const ws = XLSX.utils.aoa_to_sheet(aoa as unknown as (string | number)[][]);
  ws["!cols"] = widths.map((w) => ({ wch: w }));
  return ws;
}

/** مصنف Excel كامل: القيم في جداول المدخلات، والإجماليات والقوائم معادلات حية مع قيمها */
export function buildWorkbook(d: DataModel, scope: Scope): XLSX.WorkBook {
  const s: Settings = d.settings;
  const year = s.currentYear;
  const scLabel = scope === "all" ? "المجموعة كاملة" : COMPANY_NAMES[scope];
  const series = monthlySeries(d, scope, year, BASE_SCENARIO);
  const t = aggregate(series, s);
  const months = MONTHS_AR;
  const wb = XLSX.utils.book_new();

  // ---- الافتراضات ----
  const wsAs = sheet(
    [
      ["الافتراض", "القيمة", "ملاحظة"],
      ["نسبة ضريبة الدخل %", num(s.incomeTaxRate), "تُحسب لكل شركة على ربحها وحدها، وتُوزَّع على الأشهر حسب ربح كل شهر (قيم في الجداول)"],
      ["نمو الإيرادات السنوي %", num(s.revenueGrowthRate), "للتوقع"],
      ["نمو التكاليف المباشرة %", num(s.costGrowthRate), "للتوقع عند عدم وجود إيرادات"],
      ["زيادة الرواتب السنوية %", num(s.annualSalaryIncrease), "للتوقع"],
      ["زيادة الإيجار السنوية %", num(s.annualRentIncrease), "للتوقع"],
      ["زيادة المصروفات السنوية %", num(s.annualExpenseIncrease), "للتوقع"],
      ["الرصيد النقدي الافتتاحي", num(s.initialInvestment), "افتراض: رأس المال المستثمر، ويُعدَّل"],
      ["سنة الأساس", year, ""],
    ],
    [30, 16, 40],
  );

  // ---- قائمة الدخل ----
  const monthCols = Array.from({ length: 12 }, (_, i) => col(i + 1));
  const valueRow = (label: string, vals: number[], r: number): Row => [
    label,
    ...vals,
    F(`SUM(B${r}:M${r})`, sum(vals)),
  ];
  const formulaRow = (label: string, f: (c: string) => string, monthly: number[], total: number): Row => [
    label,
    ...monthCols.map((c, i) => F(f(c), monthly[i])),
    F(f("N"), total),
  ];
  const plRows: Row[] = [
    ["البند", ...months, "الإجمالي"],
    valueRow("إيرادات الخدمات", series.map((r) => r.revServices), PL.REV_S),
    valueRow("إيرادات التأجير", series.map((r) => r.revRentals), PL.REV_R),
    formulaRow("إجمالي الإيرادات", (c) => `${c}${PL.REV_S}+${c}${PL.REV_R}`, series.map((r) => r.revenue), t.revenue),
    valueRow("تكلفة الخدمات المباشرة", series.map((r) => r.cogs), PL.COGS),
    formulaRow("مجمل الربح", (c) => `${c}${PL.REV}-${c}${PL.COGS}`, series.map((r) => r.grossProfit), t.grossProfit),
    valueRow("الرواتب", series.map((r) => r.salaries), PL.SAL),
    valueRow("إيجار المالك", series.map((r) => r.rentCost), PL.RENT),
    valueRow("المصروفات التشغيلية", series.map((r) => r.expenses), PL.EXP),
    valueRow("الإهلاك", series.map((r) => r.depreciation), PL.DEP),
    formulaRow(
      "الربح التشغيلي قبل الضريبة",
      (c) => `${c}${PL.GP}-${c}${PL.SAL}-${c}${PL.RENT}-${c}${PL.EXP}-${c}${PL.DEP}`,
      series.map((r) => r.ebit),
      t.ebit,
    ),
    valueRow("ضريبة الدخل", series.map((r) => r.tax), PL.TAX),
    formulaRow("صافي الربح", (c) => `${c}${PL.EBIT}-${c}${PL.TAX}`, series.map((r) => r.net), t.net),
    [],
    [
      "هامش صافي الربح",
      ...series.map((r, i) => F(`IFERROR(${monthCols[i]}${PL.NET}/${monthCols[i]}${PL.REV},0)`, safe(r.net, r.revenue))),
      F(`IFERROR(N${PL.NET}/N${PL.REV},0)`, safe(t.net, t.revenue)),
    ],
    valueRow("ضريبة القيمة المضافة المحصّلة (مذكرة، لا تدخل الإيراد)", series.map((r) => r.vat), PL.VAT),
  ];
  const wsPL = sheet(plRows, [32, ...Array(13).fill(14)]);

  // ---- التدفق النقدي ----
  const cash = cashFlow(series, s.initialInvestment);
  const cashRows: Row[] = [["الشهر", "المقبوضات", "المدفوعات", "صافي الشهر", "الرصيد التراكمي"]];
  cash.forEach((c, i) => {
    const cc = monthCols[i];
    const r = i + 2;
    cashRows.push([
      months[i],
      F(`${PLS}!${cc}${PL.REV}+${PLS}!${cc}${PL.VAT}`, c.inflow),
      F(`${PLS}!${cc}${PL.COGS}+${PLS}!${cc}${PL.SAL}+${PLS}!${cc}${PL.RENT}+${PLS}!${cc}${PL.EXP}+${PLS}!${cc}${PL.TAX}+${PLS}!${cc}${PL.VAT}`, c.outflow),
      F(`B${r}-C${r}`, c.net),
      i === 0 ? F(`${AS}!$B$8+D${r}`, c.balance) : F(`E${r - 1}+D${r}`, c.balance),
    ]);
  });
  const wsCash = sheet(cashRows, [14, 18, 18, 18, 20]);

  // ---- التوقع 5 سنوات ----
  const fc = forecastFor(d, scope, year, BASE_SCENARIO);
  const B = {
    rev: `${PLS}!$N$${PL.REV}`,
    cogs: `${PLS}!$N$${PL.COGS}`,
    sal: `${PLS}!$N$${PL.SAL}`,
    rent: `${PLS}!$N$${PL.RENT}`,
    exp: `${PLS}!$N$${PL.EXP}`,
    dep: `${PLS}!$N$${PL.DEP}`,
  };
  const fcRows: Row[] = [["السنة", "الإيرادات", "التكلفة المباشرة", "الرواتب", "الإيجار", "المصروفات", "الإهلاك", "الربح التشغيلي", "الضريبة", "صافي الربح"]];
  fc.forEach((f, idx) => {
    const k = idx + 1;
    const r = k + 1;
    const grow = (row: number) => `(1+${AS}!$B$${row}/100)^${k}`;
    const tax = f.tax;
    fcRows.push([
      f.year,
      F(`${B.rev}*${grow(3)}`, f.revenue),
      F(`IFERROR(${B.cogs}*B${r}/${B.rev},${B.cogs}*${grow(4)})`, f.cogs),
      F(`${B.sal}*${grow(5)}`, f.salaries),
      F(`${B.rent}*${grow(6)}`, f.rent),
      F(`${B.exp}*${grow(7)}`, f.expenses),
      F(`${B.dep}`, f.depreciation),
      F(`B${r}-C${r}-D${r}-E${r}-F${r}-G${r}`, f.ebit),
      tax,
      F(`H${r}-I${r}`, f.net),
    ]);
  });
  const wsFc = sheet(fcRows, [10, 16, 18, 16, 16, 16, 14, 18, 14, 16]);

  // ---- الرواتب ----
  const payRows: Row[] = [
    ["الموظف", "الشركة", "المسمى", "الأساسي", "السكن", "النقل", "الاتصال", "متغيرات", "التأمين", "الطبي", "رسوم سنوية÷12", "بنود إضافية", "الإضافي", "المجموع الشهري"],
  ];
  const payCols: number[][] = [];
  d.positions
    .filter((p) => shareFor(p, scope) > 0)
    .forEach((p) => {
      const sh = shareFor(p, scope);
      const l = laborFor(p, s);
      const annual =
        num(p.residencePermit) + num(p.workPermit) + num(p.visa) + num(p.sponsorshipTransfer) +
        num(p.laborInspection) + num(p.professionChange) + num(p.passportFees);
      const extra = (p.extraCostItems ?? []).reduce((x, y) => x + num(y.amount), 0);
      const vals = [
        num(p.basicSalary) * sh,
        num(p.housingAllowance) * sh,
        num(p.transportAllowance) * sh,
        num(p.communicationAllowance) * sh,
        (num(p.commissions) + num(p.incentives) + num(p.bonuses)) * sh,
        l.insurance * sh,
        num(p.medicalInsurance) * sh,
        (annual / 12) * sh,
        extra * sh,
        l.overtimeCost * sh,
      ];
      payCols.push(vals);
      const r = payRows.length + 1;
      payRows.push([
        p.employeeName,
        COMPANY_NAMES[p.companyId],
        p.positionTitle,
        ...vals.map((v) => v),
        F(`SUM(D${r}:M${r})`, sum(vals)),
      ]);
    });
  const payLast = payRows.length;
  const colSums = Array.from({ length: 11 }, (_, j) => sum(payCols.map((v) => (j < 10 ? v[j] : sum(v)))));
  payRows.push([
    "الإجمالي", "", "",
    ...Array.from({ length: 11 }, (_, j) => F(`SUM(${col(j + 3)}2:${col(j + 3)}${payLast})`, colSums[j])),
  ]);
  const wsPay = sheet(payRows, [24, 24, 22, 12, 12, 12, 12, 12, 12, 12, 14, 14, 12, 16]);

  // ---- المبيعات ----
  const salesRows: Row[] = [["الخدمة", "الشركة", ...months, "الإجمالي"]];
  const salesMonthlyAll: number[][] = [];
  d.serviceCatalog
    .filter((x) => shareFor({ companyId: x.companyId }, scope) > 0)
    .forEach((x) => {
      const monthly = Array.from({ length: 12 }, (_, i) =>
        d.monthlySales
          .filter((m) => m.serviceId === x.id && m.year === year && m.month === i + 1)
          .reduce((acc, m) => acc + num(m.quantity) * (num(m.actualPrice) || num(x.basePrice)), 0),
      );
      salesMonthlyAll.push(monthly);
      const r = salesRows.length + 1;
      salesRows.push([x.name, COMPANY_NAMES[x.companyId], ...monthly, F(`SUM(C${r}:N${r})`, sum(monthly))]);
    });
  const salesLast = salesRows.length;
  const salesColTotals = Array.from({ length: 12 }, (_, i) => sum(salesMonthlyAll.map((m) => m[i])));
  salesRows.push([
    "الإجمالي", "",
    ...salesColTotals.map((v, i) => F(`SUM(${col(i + 2)}2:${col(i + 2)}${salesLast})`, v)),
    F(`SUM(O2:O${salesLast})`, sum(salesColTotals)),
  ]);
  const wsSales = sheet(salesRows, [44, 24, ...Array(12).fill(12), 16]);

  // ---- الخدمات ----
  const hc = { alpha: hourCostFor(d, "alpha"), beta: hourCostFor(d, "beta") };
  const svcRows: Row[] = [["الخدمة", "الفئة", "الشركة", "السعر", "التكلفة المباشرة", "تكلفة العمل الداخلي", "هامش مباشر", "هامش كامل"]];
  d.serviceCatalog
    .filter((x) => x.id !== TOTAL_SALES_ID && shareFor({ companyId: x.companyId }, scope) > 0)
    .forEach((x) => {
      const e = serviceEconomics(x, hc[x.companyId], s.vatRate);
      const r = svcRows.length + 1;
      svcRows.push([
        x.name, x.category, COMPANY_NAMES[x.companyId], num(x.basePrice), e.directCost, e.internalLabor,
        F(`IFERROR((D${r}-E${r})/D${r},0)`, e.directMargin),
        F(`IFERROR((D${r}-E${r}-F${r})/D${r},0)`, e.fullMargin),
      ]);
    });
  const wsSvc = sheet(svcRows, [44, 20, 24, 14, 18, 18, 14, 14]);

  // ---- التأجير ----
  const unitRows: Row[] = [["المبنى", "الوحدة", "الشركة", "النوع", "المساحة م²", "أشهر الإشغال", "إيراد السنة", "تكلفة المالك السنة", "الصافي"]];
  const unitTotals = { area: 0, rev: 0, cost: 0 };
  rentableUnits(d.rentalUnits)
    .filter((u) => shareFor({ companyId: u.companyId ?? "beta" }, scope) > 0)
    .forEach((u) => {
      const sh = shareFor({ companyId: u.companyId ?? "beta" }, scope);
      const ms = Array.from({ length: 12 }, (_, i) => unitMonth(u, year, i + 1));
      const rev = sum(ms.map((m) => m.revenue)) * sh;
      const cost = sum(ms.map((m) => m.ownerCost)) * sh;
      const r = unitRows.length + 1;
      unitTotals.area += num(u.area) * sh;
      unitTotals.rev += rev;
      unitTotals.cost += cost;
      unitRows.push([
        u.buildingName, u.unitNumber, COMPANY_NAMES[u.companyId ?? "beta"], u.unitType, num(u.area),
        ms.filter((m) => m.occupied).length, rev, cost, F(`G${r}-H${r}`, rev - cost),
      ]);
    });
  const unitsLast = unitRows.length;
  unitRows.push([
    "الإجمالي", "", "", "",
    F(`SUM(E2:E${unitsLast})`, unitTotals.area), "",
    F(`SUM(G2:G${unitsLast})`, unitTotals.rev),
    F(`SUM(H2:H${unitsLast})`, unitTotals.cost),
    F(`SUM(I2:I${unitsLast})`, unitTotals.rev - unitTotals.cost),
  ]);
  const wsUnits = sheet(unitRows, [22, 14, 24, 22, 12, 12, 16, 18, 16]);

  // ---- المصروفات ----
  const expRows: Row[] = [["البند", "الفئة", "المجموعة", "الشركة", ...months, "الإجمالي"]];
  const expMonthly: number[][] = [];
  d.expenses
    .filter((e) => shareFor(e, scope) > 0)
    .forEach((e) => {
      const sh = shareFor(e, scope);
      const monthly = Array.from({ length: 12 }, (_, i) => expenseMonth(e, i + 1) * sh);
      expMonthly.push(monthly);
      const r = expRows.length + 1;
      expRows.push([e.name, e.category, e.expenseGroup, COMPANY_NAMES[e.companyId], ...monthly, F(`SUM(E${r}:P${r})`, sum(monthly))]);
    });
  const expLast = expRows.length;
  const expColTotals = Array.from({ length: 12 }, (_, i) => sum(expMonthly.map((m) => m[i])));
  expRows.push([
    "الإجمالي", "", "", "",
    ...expColTotals.map((v, i) => F(`SUM(${col(i + 4)}2:${col(i + 4)}${expLast})`, v)),
    F(`SUM(Q2:Q${expLast})`, sum(expColTotals)),
  ]);
  const wsExp = sheet(expRows, [40, 20, 22, 24, ...Array(12).fill(12), 16]);

  // ---- الملخص ----
  const wsSum = sheet(
    [
      [`ملخص ${year} — ${scLabel}`, ""],
      ["إجمالي الإيرادات", F(`${PLS}!N${PL.REV}`, t.revenue)],
      ["الربح التشغيلي قبل الضريبة", F(`${PLS}!N${PL.EBIT}`, t.ebit)],
      ["صافي الربح", F(`${PLS}!N${PL.NET}`, t.net)],
      ["هامش صافي الربح", F(`IFERROR(B4/B2,0)`, safe(t.net, t.revenue))],
      ["إجمالي الرواتب", F(`${PLS}!N${PL.SAL}`, t.salaries)],
      ["إجمالي إيجار المالك", F(`${PLS}!N${PL.RENT}`, t.rentCost)],
      ["إجمالي المصروفات", F(`${PLS}!N${PL.EXP}`, t.expenses)],
      ["الرصيد النقدي في نهاية السنة", F(`'التدفق النقدي'!E13`, cash[11]?.balance ?? 0)],
    ],
    [36, 20],
  );

  const add = (name: string, ws: XLSX.WorkSheet) => XLSX.utils.book_append_sheet(wb, ws, name);
  add("الملخص", wsSum);
  add("قائمة الدخل", wsPL);
  add("التدفق النقدي", wsCash);
  add("التوقع 5 سنوات", wsFc);
  add("الرواتب", wsPay);
  add("المبيعات", wsSales);
  add("الخدمات", wsSvc);
  add("التأجير", wsUnits);
  add("المصروفات", wsExp);
  add("الافتراضات", wsAs);
  wb.Workbook = {
    Sheets: wb.SheetNames.map(() => ({ RTL: true })),
    CalcPr: { fullCalcOnLoad: true },
  } as unknown as XLSX.WorkBook["Workbook"];
  return wb;
}

export function workbookBytes(wb: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}
