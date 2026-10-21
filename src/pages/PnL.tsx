import { useMemo, useState } from "react";
import { useData } from "@/lib/useData";
import { useUi } from "@/lib/ui";
import { aggregate, monthlySeries, scenarioOf, type MonthRow } from "@/lib/finance";
import { DEFAULT_PERIOD, monthsOf, periodLabel, type PeriodFilter } from "@/lib/period";
import { fmt, MONTHS_AR, marginText } from "@/lib/money";
import { BTN_GHOST, Card, INPUT, PageHeader, ScenarioSelect, TD, TH } from "@/components/ui";
import { COMPANY_NAMES } from "@/lib/types";

type LineKey = "revServices" | "revRentals" | "revenue" | "cogs" | "grossProfit" | "salaries" | "rentCost" | "expenses" | "depreciation" | "ebit" | "tax" | "net";

const LINES: { key: LineKey; label: string; total?: boolean }[] = [
  { key: "revServices", label: "إيرادات الخدمات" },
  { key: "revRentals", label: "إيرادات التأجير" },
  { key: "revenue", label: "إجمالي الإيرادات", total: true },
  { key: "cogs", label: "تكلفة الخدمات المباشرة" },
  { key: "grossProfit", label: "مجمل الربح", total: true },
  { key: "salaries", label: "الرواتب" },
  { key: "rentCost", label: "إيجار المالك" },
  { key: "expenses", label: "المصروفات التشغيلية" },
  { key: "depreciation", label: "الإهلاك" },
  { key: "ebit", label: "الربح التشغيلي قبل الضريبة", total: true },
  { key: "tax", label: "ضريبة الدخل" },
  { key: "net", label: "صافي الربح", total: true },
];

export default function PnL() {
  const d = useData();
  const { scope, scenarioId } = useUi();
  const year = d.settings.currentYear;
  const sc = scenarioOf(d, scenarioId);
  const [period, setPeriod] = useState<PeriodFilter>({ ...DEFAULT_PERIOD, year });

  const rows: MonthRow[] = useMemo(() => monthlySeries(d, scope, year, sc), [d, scope, year, sc]);
  const months = monthsOf(period);
  const selected = rows.filter((r) => months.includes(r.month));
  const total = useMemo(() => aggregate(selected, d.settings), [selected, d.settings]);

  return (
    <>
      <PageHeader
        title="قائمة الدخل"
        subtitle={`${scope === "all" ? "المجموعة كاملة" : COMPANY_NAMES[scope]} — ${periodLabel(period, MONTHS_AR)} — ${sc.id === "base" ? "الوضع الحالي" : sc.name}`}
        actions={
          <>
            <ScenarioSelect scenarios={d.scenarios} />
            <button className={BTN_GHOST} onClick={() => window.print()}>طباعة / حفظ PDF</button>
          </>
        }
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">الفترة:</span>
          <select className={INPUT} value={period.mode} onChange={(e) => setPeriod({ ...period, mode: e.target.value as PeriodFilter["mode"] })}>
            <option value="year">السنة كاملة</option>
            <option value="month">شهر واحد</option>
            <option value="range">من شهر إلى شهر</option>
          </select>
          {period.mode === "month" && (
            <select className={INPUT} value={period.month} onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}>
              {MONTHS_AR.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          )}
          {period.mode === "range" && (
            <>
              <select className={INPUT} value={period.from} onChange={(e) => setPeriod({ ...period, from: Number(e.target.value) })}>
                {MONTHS_AR.map((m, i) => (
                  <option key={m} value={i + 1}>من {m}</option>
                ))}
              </select>
              <select className={INPUT} value={period.to} onChange={(e) => setPeriod({ ...period, to: Number(e.target.value) })}>
                {MONTHS_AR.map((m, i) => (
                  <option key={m} value={i + 1}>إلى {m}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>البند</th>
                <th className={`${TH} bg-sky-50 text-sky-900`}>الفترة المختارة</th>
                {MONTHS_AR.map((m) => (
                  <th key={m} className={TH}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => {
                const neg = (v: number) => (v < 0 ? "text-rose-700" : "");
                return (
                  <tr key={line.key} className={line.total ? "font-semibold" : ""}>
                    <td className={`${TD} ${line.total ? "bg-slate-50" : ""}`}>{line.label}</td>
                    <td className={`${TD} bg-sky-50 text-end tabular-nums ${neg(total[line.key])}`} dir="ltr">
                      {fmt(total[line.key])}
                    </td>
                    {rows.map((r) => (
                      <td
                        key={r.month}
                        className={`${TD} text-end tabular-nums ${line.total ? "bg-slate-50" : ""} ${
                          months.includes(r.month) ? "" : "text-slate-400"
                        } ${neg(r[line.key])}`}
                        dir="ltr"
                      >
                        {fmt(r[line.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <td className={TD}>هامش الربح التشغيلي</td>
                <td className={`${TD} bg-sky-50 text-end`} dir="ltr">{marginText(total.ebit, total.revenue)}</td>
                {rows.map((r) => (
                  <td key={r.month} className={`${TD} text-end`} dir="ltr">{marginText(r.ebit, r.revenue)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          الضريبة تُحسب على صافي ربح الفترة المختارة (لا تُحسب على الأشهر الخاسرة بشكل منفصل). الأرقام على أساس الاستحقاق (وليس النقدي).
        </p>
      </Card>
    </>
  );
}
