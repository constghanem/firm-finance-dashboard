import { useMemo } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { aggregate, monthlySeries, BASE_SCENARIO } from "@/lib/finance";
import { fmt, pct } from "@/lib/money";
import { BTN_GHOST, BTN_PRIMARY, Card, NumInput, PageHeader, TD, TH, TextCell } from "@/components/ui";
import type { Scenario } from "@/lib/types";

export default function Scenarios() {
  const d = useData();
  const { scope } = useUi();
  const setScenario = useStore((s) => s.setScenario);
  const addScenario = useStore((s) => s.addScenario);
  const removeScenario = useStore((s) => s.removeScenario);
  const year = d.settings.currentYear;

  const results = useMemo(
    () =>
      [BASE_SCENARIO as Scenario, ...d.scenarios].map((sc) => {
        const t = aggregate(monthlySeries(d, scope, year, sc), d.settings);
        return { sc, t };
      }),
    [d, scope, year],
  );

  return (
    <>
      <PageHeader
        title="السيناريوهات"
        subtitle="كل سيناريو يضرب الكميات والأسعار والتكاليف ونسبة الإشغال بمعامل. مقارنة النتائج تظهر أدناه."
        actions={<button className={BTN_PRIMARY} onClick={addScenario}>+ سيناريو جديد</button>}
      />

      <Card title="مقارنة النتائج السنوية" className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>السيناريو</th>
                <th className={TH}>الإيرادات</th>
                <th className={TH}>الربح التشغيلي</th>
                <th className={TH}>صافي الربح</th>
                <th className={TH}>الهامش</th>
                <th className={TH}>الإشغال</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ sc, t }) => (
                <tr key={sc.id}>
                  <td className={`${TD} font-medium`}>{sc.id === "base" ? "الوضع الحالي" : sc.name}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(t.revenue)}</td>
                  <td className={`${TD} text-end tabular-nums ${t.ebit < 0 ? "text-rose-700" : "text-emerald-700"}`} dir="ltr">{fmt(t.ebit)}</td>
                  <td className={`${TD} text-end tabular-nums ${t.net < 0 ? "text-rose-700" : "text-emerald-700"}`} dir="ltr">{fmt(t.net)}</td>
                  <td className={`${TD} text-end`} dir="ltr">{pct(t.margin)}</td>
                  <td className={`${TD} text-end`} dir="ltr">{pct(t.occupancy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="معاملات السيناريوهات">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الاسم</th>
                <th className={TH}>معامل الكمية</th>
                <th className={TH}>معامل السعر</th>
                <th className={TH}>معامل التكلفة</th>
                <th className={TH}>معامل الإشغال</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {d.scenarios.map((s) => (
                <tr key={s.id}>
                  <td className={TD}>
                    <TextCell value={s.name} width="w-80" onChange={(v) => setScenario(s.id, { name: v })} />
                  </td>
                  <td className={TD}><NumInput value={s.volumeFactor} width="w-24" step="0.01" onChange={(v) => setScenario(s.id, { volumeFactor: v })} /></td>
                  <td className={TD}><NumInput value={s.priceFactor} width="w-24" onChange={(v) => setScenario(s.id, { priceFactor: v })} /></td>
                  <td className={TD}><NumInput value={s.costFactor} width="w-24" onChange={(v) => setScenario(s.id, { costFactor: v })} /></td>
                  <td className={TD}><NumInput value={s.occupancyFactor} width="w-24" onChange={(v) => setScenario(s.id, { occupancyFactor: v })} /></td>
                  <td className={TD}>
                    <button className={BTN_GHOST} onClick={() => confirm(`حذف السيناريو "${s.name}"؟`) && removeScenario(s.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          المعامل 1 يعني بدون تغيير. سيناريو الحد الأدنى والأعلى للمبيعات يستخدم معامل الكمية (150 ألف ÷ 225 ألف، و300 ألف ÷ 225 ألف).
        </p>
      </Card>
    </>
  );
}
