import { useMemo } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import type { CompanyId } from "@/lib/types";
import { isFullLease, rentableUnits, unitMonth } from "@/lib/rentals";
import { fmt, pct } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { Badge, Card, INPUT, Kpi, NumInput, PageHeader, TD, TH } from "@/components/ui";

export default function Rentals() {
  const d = useData();
  const { scope } = useUi();
  const setRental = useStore((s) => s.setRental);
  const setSettings = useStore((s) => s.setSettings);
  const year = d.settings.currentYear;
  const mode = d.settings.rentCostMode ?? "building";

  const units = useMemo(
    () =>
      rentableUnits(d.rentalUnits)
        .map((u) => {
          const share = shareFor({ companyId: u.companyId ?? "beta" }, scope);
          const months = Array.from({ length: 12 }, (_, i) => unitMonth(u, year, i + 1));
          const revenue = months.reduce((t, m) => t + m.revenue, 0);
          const ownerCost = months.reduce((t, m) => t + m.ownerCost, 0);
          const occupiedMonths = months.filter((m) => m.occupied).length;
          return { u, share, revenue, ownerCost, occupiedMonths };
        })
        .filter((r) => r.share > 0),
    [d, scope, year],
  );

  const occupied = units.filter((r) => r.occupiedMonths > 0).length;
  const area = units.reduce((t, r) => t + r.u.area * r.share, 0);
  const annualRev = units.reduce((t, r) => t + r.revenue * r.share, 0);

  return (
    <>
      <PageHeader
        title="التأجير"
        subtitle="الوحدات والعقود وإيراد المستأجرين وتكلفة المالك لكل وحدة. اختر الشركة المسؤولة عن كل وحدة لتظهر في تقارير كل شركة. الوحدات الفرعية مستبعدة لتفادي الازدواج."
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            احتساب إيجار المالك في المباني المؤجرة كاملاً
            <select
              className={INPUT}
              value={mode}
              onChange={(e) => setSettings({ rentCostMode: e.target.value as "building" | "units" })}
            >
              <option value="building">مرة واحدة على الإيجار الكامل (موصى به)</option>
              <option value="units">على المكاتب الفرعية</option>
            </select>
          </label>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="عدد الوحدات" value={String(units.length)} hint={`مشغولة في أي شهر: ${occupied}`} />
        <Kpi label="إجمالي المساحة" value={`${fmt(area)} م²`} />
        <Kpi label="إيراد التأجير السنوي" value={`${fmt(annualRev)} ر.س`} />
        <Kpi label="نسبة الإشغال" value={pct(units.length ? occupied / units.length : 0)} />
      </div>

      <Card title="الوحدات" className="mt-4">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>المبنى</th>
                <th className={TH}>الوحدة</th>
                <th className={TH}>الشركة</th>
                <th className={TH}>النوع</th>
                <th className={TH}>المساحة م²</th>
                <th className={TH}>مشغولة</th>
                <th className={TH}>إيجار المستأجر/م²/سنة</th>
                <th className={TH}>إيجار المالك/م²/سنة</th>
                <th className={TH}>إيراد السنة</th>
                <th className={TH}>تكلفة المالك السنة</th>
                <th className={TH}>صافي الوحدة</th>
              </tr>
            </thead>
            <tbody>
              {units.map(({ u, revenue, ownerCost }) => {
                const net = revenue - ownerCost;
                return (
                  <tr key={u.id}>
                    <td className={TD}>{u.buildingName}</td>
                    <td className={TD}>{u.unitNumber}</td>
                    <td className={TD}>
                      <select
                        className={INPUT}
                        value={u.companyId ?? "beta"}
                        aria-label={`شركة الوحدة ${u.unitNumber}`}
                        onChange={(e) => setRental(u.id, { companyId: e.target.value as CompanyId })}
                      >
                        <option value="beta">بيتا</option>
                        <option value="alpha">ألفا</option>
                      </select>
                    </td>
                    <td className={TD}>
                      {isFullLease(u) ? <Badge tone="info">إيجار كامل</Badge> : <span className="text-slate-600">{u.unitType}</span>}
                    </td>
                    <td className={TD}><NumInput value={u.area} width="w-20" onChange={(v) => setRental(u.id, { area: v })} /></td>
                    <td className={TD}>
                      <input
                        type="checkbox"
                        className="size-4 accent-sky-700"
                        checked={u.isOccupied}
                        onChange={(e) => setRental(u.id, { isOccupied: e.target.checked })}
                        aria-label={`مشغولة ${u.unitNumber}`}
                      />
                    </td>
                    <td className={TD}>
                      <NumInput value={u.tenantRentPerSqm} onChange={(v) => setRental(u.id, { tenantRentPerSqm: v })} />
                    </td>
                    <td className={TD}>
                      <NumInput value={u.ownerRentPerSqm} onChange={(v) => setRental(u.id, { ownerRentPerSqm: v })} />
                    </td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(revenue)}</td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(ownerCost)}</td>
                    <td className={`${TD} text-end tabular-nums ${net < 0 ? "text-rose-700" : "text-emerald-700"}`} dir="ltr">{fmt(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          وحدات الإيجار الكامل تحسب تكلفة المالك مرة واحدة على المبنى حسب الإعداد أعلاه، حتى لا تتكرر مع المكاتب الفرعية في نفس المبنى.
        </p>
      </Card>
    </>
  );
}
