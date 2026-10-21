import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { useData } from "@/lib/useData";
import { useUi } from "@/lib/ui";
import { aggregate, breakEven, cashFlow, forecastFor, monthlySeries, scenarioOf } from "@/lib/finance";
import { fmt, MONTHS_AR, compact, pct, num } from "@/lib/money";
import { Card, INPUT, Kpi, NumInput, PageHeader, ScenarioSelect, TD, TH, Badge } from "@/components/ui";

export default function CashForecast() {
  const d = useData();
  const { scope, scenarioId } = useUi();
  const year = d.settings.currentYear;
  const sc = scenarioOf(d, scenarioId);
  const [opening, setOpening] = useState<number>(num(d.settings.initialInvestment));

  const rows = useMemo(() => monthlySeries(d, scope, year, sc), [d, scope, year, sc]);
  const totals = useMemo(() => aggregate(rows, d.settings), [rows, d.settings]);
  const cash = useMemo(() => cashFlow(rows, opening), [rows, opening]);
  const fc = useMemo(() => forecastFor(d, scope, year, sc), [d, scope, year, sc]);
  const be = breakEven(totals);
  const avgRevenue = totals.revenue / 12;
  const safety = avgRevenue > 0 ? (avgRevenue - be) / avgRevenue : 0;
  const minBal = Math.min(...cash.map((c) => c.balance));

  return (
    <>
      <PageHeader
        title="التدفق النقدي والتوقعات"
        subtitle="التدفق الشهري تقريبي على أساس الاستحقاق. التوقع يبني على سنة الأساس بمعدلات النمو في الإعدادات."
        actions={
          <>
            <ScenarioSelect scenarios={d.scenarios} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              رصيد افتتاحي
              <NumInput value={opening} width="w-36" onChange={setOpening} />
            </label>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="نقطة التعادل الشهرية" value={Number.isFinite(be) ? `${fmt(be)} ر.س` : "غير محدد"} tone={avgRevenue >= be ? "good" : "bad"} hint={`متوسط الإيراد ${fmt(avgRevenue)} ر.س`} />
        <Kpi label="هامش الأمان" value={pct(safety)} tone={safety >= 0 ? "good" : "bad"} hint="كم يمكن أن تنخفض الإيرادات قبل الخسارة" />
        <Kpi label="أدنى رصيد نقدي" value={`${fmt(minBal)} ر.س`} tone={minBal < 0 ? "bad" : "good"} />
        <Kpi label="الرصيد في نهاية السنة" value={`${fmt(cash[11]?.balance ?? 0)} ر.س`} tone={(cash[11]?.balance ?? 0) < 0 ? "bad" : "good"} />
      </div>

      <Card title="الرصيد النقدي الشهري" className="mt-4">
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cash.map((c) => ({ name: MONTHS_AR[c.month - 1], الرصيد: Math.round(c.balance) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 12 }} width={60} />
              <Tooltip formatter={(v) => `${fmt(Number(v))} ر.س`} />
              <ReferenceLine y={0} stroke="#be123c" />
              <Area type="monotone" dataKey="الرصيد" stroke="#0369a1" fill="#bae6fd" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="التدفق النقدي الشهري" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الشهر</th>
                <th className={TH}>المقبوضات (شامل الضريبة)</th>
                <th className={TH}>المدفوعات (شامل توريد الضريبة)</th>
                <th className={TH}>صافي الشهر</th>
                <th className={TH}>الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              {cash.map((c) => (
                <tr key={c.month}>
                  <td className={TD}>{MONTHS_AR[c.month - 1]}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(c.inflow)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(c.outflow)}</td>
                  <td className={`${TD} text-end tabular-nums ${c.net < 0 ? "text-rose-700" : "text-emerald-700"}`} dir="ltr">{fmt(c.net)}</td>
                  <td className={`${TD} text-end tabular-nums ${c.balance < 0 ? "text-rose-700" : ""}`} dir="ltr">{fmt(c.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          المقبوضات تشمل ضريبة القيمة المضافة المحصّلة على الخدمات، والمدفوعات تشمل توريدها للهيئة، فلا تؤثر الضريبة في صافي النقد. المدفوعات تشمل أيضاً التكلفة المباشرة والرواتب والإيجار والمصروفات وضريبة الدخل. الإهلاك غير نقدي فلا يدخل فيها.
        </p>
      </Card>

      <Card title="توقع خمس سنوات بعد سنة الأساس" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>السنة</th>
                <th className={TH}>الإيرادات</th>
                <th className={TH}>التكلفة المباشرة</th>
                <th className={TH}>الرواتب</th>
                <th className={TH}>الإيجار</th>
                <th className={TH}>المصروفات</th>
                <th className={TH}>الإهلاك</th>
                <th className={TH}>الربح التشغيلي</th>
                <th className={TH}>صافي الربح</th>
              </tr>
            </thead>
            <tbody>
              {fc.map((f) => (
                <tr key={f.year}>
                  <td className={`${TD} font-semibold`}>{f.year} {f.year === year + 1 && <Badge tone="info">الأولى</Badge>}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.revenue)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.cogs)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.salaries)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.rent)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.expenses)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(f.depreciation)}</td>
                  <td className={`${TD} text-end tabular-nums ${f.ebit < 0 ? "text-rose-700" : ""}`} dir="ltr">{fmt(f.ebit)}</td>
                  <td className={`${TD} text-end tabular-nums ${f.net < 0 ? "text-rose-700" : ""}`} dir="ltr">{fmt(f.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          معدلات النمو (الإيرادات، التكاليف، الرواتب، الإيجار، المصروفات) تُعدَّل من إعدادات البيانات. التكلفة المباشرة تنمو تبعاً للإيرادات.
        </p>
      </Card>
    </>
  );
}
