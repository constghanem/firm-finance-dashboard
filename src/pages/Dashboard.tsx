import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/lib/useData";
import { useUi } from "@/lib/ui";
import { aggregate, breakEven, monthlySeries, scenarioOf } from "@/lib/finance";
import { checkData } from "@/lib/dataQuality";
import { fmt, MONTHS_AR, pct, compact, marginText } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { Card, Kpi, PageHeader, ScenarioSelect, Badge, TD, TH } from "@/components/ui";
import { COMPANY_NAMES, type Scope } from "@/lib/types";

const SAR = (n: number) => `${fmt(n)} ر.س`;

export default function Dashboard() {
  const d = useData();
  const { scope, scenarioId } = useUi();
  const year = d.settings.currentYear;
  const sc = scenarioOf(d, scenarioId);

  const { rows, totals, byCompany, issues } = useMemo(() => {
    const rows = monthlySeries(d, scope, year, sc);
    const totals = aggregate(rows, d.settings);
    const byCompany = (["alpha", "beta"] as const).map((c) => ({
      id: c,
      name: COMPANY_NAMES[c],
      t: aggregate(monthlySeries(d, c, year, sc), d.settings),
    }));
    const issues = checkData(d).filter((i) => i.severity === "warn");
    return { rows, totals, byCompany, issues };
  }, [d, scope, year, sc]);

  const heads = d.positions.filter((p) => shareFor(p, scope as Scope) > 0).length;
  const be = breakEven(totals);
  const avgRevenue = totals.revenue / 12;
  const costs = totals.cogs + totals.salaries + totals.rentCost + totals.expenses + totals.depreciation;

  const chart = rows.map((r) => ({
    name: MONTHS_AR[r.month - 1],
    الإيرادات: Math.round(r.revenue),
    التكاليف: Math.round(r.cogs + r.salaries + r.rentCost + r.expenses + r.depreciation),
    "الربح قبل الضريبة": Math.round(r.ebit),
  }));

  const tone = (n: number) => (n >= 0 ? "good" : "bad");

  return (
    <>
      <PageHeader
        title={`لوحة المؤشرات ${year}`}
        subtitle={`${scope === "all" ? "إجمالي المجموعة" : COMPANY_NAMES[scope]} — ${sc.id === "base" ? "الوضع الحالي" : sc.name}`}
        actions={<ScenarioSelect scenarios={d.scenarios} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="إجمالي الإيرادات" value={SAR(totals.revenue)} hint={`خدمات ${compact(totals.revServices)} · تأجير ${compact(totals.revRentals)}`} />
        <Kpi label="الربح التشغيلي (قبل الضريبة)" value={SAR(totals.ebit)} tone={tone(totals.ebit)} hint={`هامش ${marginText(totals.ebit, totals.revenue)}`} />
        <Kpi label="صافي الربح بعد الضريبة" value={SAR(totals.net)} tone={tone(totals.net)} hint={`الضريبة ${pct((d.settings.incomeTaxRate ?? 0) / 100)} على الأرباح فقط`} />
        <Kpi label="نسبة الإشغال" value={pct(totals.occupancy)} hint="وحدات التأجير المشغولة من الإجمالي" />
        <Kpi label="نقطة التعادل الشهرية" value={Number.isFinite(be) ? SAR(be) : "غير محدد"} tone={avgRevenue >= be ? "good" : "bad"} hint={`متوسط الإيراد الشهري ${fmt(avgRevenue)} ر.س`} />
        <Kpi label="إجمالي التكاليف" value={SAR(costs)} hint={`الرواتب ${compact(totals.salaries)} · الإيجار ${compact(totals.rentCost)}`} />
        <Kpi label="عدد الموظفين" value={String(heads)} hint="حسب الشركة المختارة" />
        <Kpi label="تنبيهات البيانات" value={String(issues.length)} tone={issues.length ? "warn" : "good"} hint="انظر صفحة البيانات والتصدير" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="الإيرادات والتكاليف والربح شهرياً" className="xl:col-span-2">
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v) => SAR(Number(v))} />
                <Legend />
                <Bar dataKey="الإيرادات" fill="#0369a1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="التكاليف" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Line type="monotone" dataKey="الربح قبل الضريبة" stroke="#047857" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="مقارنة الشركتين">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>المؤشر</th>
                  {byCompany.map((c) => (
                    <th key={c.id} className={TH}>{c.id === "alpha" ? "ألفا" : "بيتا"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["الإيرادات", (t: typeof totals) => fmt(t.revenue)],
                  ["الرواتب", (t: typeof totals) => fmt(t.salaries)],
                  ["إيجار المالك", (t: typeof totals) => fmt(t.rentCost)],
                  ["المصروفات", (t: typeof totals) => fmt(t.expenses)],
                  ["الربح التشغيلي", (t: typeof totals) => fmt(t.ebit)],
                  ["هامش الربح", (t: typeof totals) => marginText(t.ebit, t.revenue)],
                ].map(([label, get]) => (
                  <tr key={label as string}>
                    <td className={TD}>{label as string}</td>
                    {byCompany.map((c) => (
                      <td key={c.id} className={`${TD} text-end tabular-nums`} dir="ltr">
                        {(get as (t: typeof totals) => string)(c.t)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            الإيجار المشترك والإهلاك يُوزَّعان حسب نسب الشركات المحددة في البيانات. المجموع الكلي لا يتضاعف فيه أي بند.
          </p>
        </Card>
      </div>

      {issues.length > 0 && (
        <Card title="ملاحظات تحتاج مراجعة" className="mt-4">
          <ul className="space-y-2">
            {issues.map((i, k) => (
              <li key={k} className="flex items-start gap-2 text-sm">
                <Badge tone="warn">{i.area}</Badge>
                <span className="text-slate-700">{i.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
