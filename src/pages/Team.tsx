import { useMemo } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { laborFor } from "@/lib/labor";
import { fmt, pct, num } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { Card, CompanyBadge, Kpi, NumInput, PageHeader, TD, TH, TextCell } from "@/components/ui";

export default function Team() {
  const d = useData();
  const { scope } = useUi();
  const setPosition = useStore((s) => s.setPosition);

  const rows = useMemo(
    () =>
      d.positions
        .filter((p) => shareFor(p, scope) > 0)
        .map((p) => ({ p, l: laborFor(p, d.settings), share: shareFor(p, scope) })),
    [d, scope],
  );

  const monthly = rows.reduce((t, r) => t + r.l.monthlyTotal * r.share, 0);
  const avgProductiveHour = rows.length
    ? rows.reduce((t, r) => t + r.l.productiveHourCost * r.share, 0) / rows.reduce((t, r) => t + r.share, 0)
    : 0;

  return (
    <>
      <PageHeader
        title="الموظفون والرواتب"
        subtitle="التكلفة الكاملة لكل موظف تشمل الأساسي والبدلات والتأمين والرسوم والإضافي، مع تكلفة الساعة والإنتاجية."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="عدد الموظفين" value={String(rows.length)} />
        <Kpi label="إجمالي الرواتب الشهرية الكاملة" value={`${fmt(monthly)} ر.س`} hint="بعد التأمين والرسوم والإضافي" />
        <Kpi label="متوسط تكلفة الساعة المنتجة" value={`${fmt(avgProductiveHour)} ر.س`} hint={`الإنتاجية الافتراضية ${d.settings.productivityRate}%`} />
        <Kpi label="ساعات العمل الصافية اليومية" value={`${d.settings.workHoursPerDay - d.settings.breakHoursPerDay}`} hint="بعد خصم الاستراحة" />
      </div>

      <Card title="تفاصيل الموظفين" className="mt-4">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الموظف</th>
                <th className={TH}>الشركة</th>
                <th className={TH}>القسم</th>
                <th className={TH}>المسمى</th>
                <th className={TH}>الجنسية</th>
                <th className={TH}>الأساسي</th>
                <th className={TH}>السكن</th>
                <th className={TH}>النقل</th>
                <th className={TH}>ساعات إضافية/يوم</th>
                <th className={TH}>الإنتاجية %</th>
                <th className={TH}>التكلفة الشهرية الكاملة</th>
                <th className={TH}>تكلفة اليوم</th>
                <th className={TH}>تكلفة الساعة</th>
                <th className={TH}>تكلفة الساعة المنتجة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, l }) => (
                <tr key={p.id}>
                  <td className={TD}>
                    <TextCell value={p.employeeName} width="w-40" onChange={(v) => setPosition(p.id, { employeeName: v })} />
                  </td>
                  <td className={TD}><CompanyBadge id={p.companyId} /></td>
                  <td className={TD}>{p.department || "—"}</td>
                  <td className={TD}>{p.positionTitle}</td>
                  <td className={TD}>{p.nationality}</td>
                  <td className={TD}><NumInput value={p.basicSalary} onChange={(v) => setPosition(p.id, { basicSalary: v })} /></td>
                  <td className={TD}><NumInput value={p.housingAllowance} onChange={(v) => setPosition(p.id, { housingAllowance: v })} /></td>
                  <td className={TD}><NumInput value={p.transportAllowance} onChange={(v) => setPosition(p.id, { transportAllowance: v })} /></td>
                  <td className={TD}><NumInput value={p.overtimeHoursPerDay} width="w-20" onChange={(v) => setPosition(p.id, { overtimeHoursPerDay: v })} /></td>
                  <td className={TD}><NumInput value={p.productivityRate} width="w-20" onChange={(v) => setPosition(p.id, { productivityRate: v })} /></td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(l.monthlyTotal)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(l.dailyCost)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt2(l.hourlyCost)}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt2(l.productiveHourCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          التأمين: {d.settings.saudiInsuranceRate}% للسعودي و{d.settings.foreignInsuranceRate}% لغير السعودي على الأساسي والسكن عندما تتحمله الشركة. الإضافي يُحسب بمعامل {d.settings.overtimeMultiplier}.
        </p>
      </Card>
    </>
  );
}

function fmt2(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0);
}
