import { useMemo, useState } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { hourCostFor } from "@/lib/finance";
import { serviceEconomics } from "@/lib/services";
import { fmt, pct } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { BTN_GHOST, BTN_PRIMARY, Card, CompanyBadge, INPUT, NumInput, PageHeader, TD, TH, TextCell, Badge } from "@/components/ui";
import { TOTAL_SALES_ID } from "@/lib/sales";

export default function Services() {
  const d = useData();
  const { scope } = useUi();
  const setService = useStore((s) => s.setService);
  const addService = useStore((s) => s.addService);
  const removeService = useStore((s) => s.removeService);
  const [q, setQ] = useState("");

  const hourCost = useMemo(
    () => ({ alpha: hourCostFor(d, "alpha"), beta: hourCostFor(d, "beta") }),
    [d],
  );

  const rows = d.serviceCatalog
    .filter((s) => s.id !== TOTAL_SALES_ID)
    .filter((s) => shareFor({ companyId: s.companyId }, scope) > 0)
    .filter((s) => !q || s.name.includes(q) || s.category.includes(q));

  const vat = d.settings.vatRate;

  return (
    <>
      <PageHeader
        title="الخدمات وتسعيرها"
        subtitle="سعر كل خدمة مع تكلفتها المباشرة وتكلفة العمل الداخلي، وهامش الربح على كل منهما."
        actions={
          <>
            <input className={`${INPUT} w-56`} placeholder="بحث باسم الخدمة أو الفئة" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={BTN_PRIMARY} onClick={() => addService({ companyId: scope === "alpha" ? "alpha" : "beta" })}>
              + خدمة جديدة
            </button>
          </>
        }
      />

      <Card>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الخدمة</th>
                <th className={TH}>الفئة</th>
                <th className={TH}>الشركة</th>
                <th className={TH}>السعر</th>
                <th className={TH}>ساعات التنفيذ</th>
                <th className={TH}>رسوم الجهات</th>
                <th className={TH}>تكلفة خارجية</th>
                <th className={TH}>عمولة</th>
                <th className={TH}>التكلفة المباشرة</th>
                <th className={TH}>تكلفة العمل الداخلي</th>
                <th className={TH}>هامش مباشر</th>
                <th className={TH}>هامش كامل</th>
                <th className={TH}>ضريبة السعر</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const e = serviceEconomics(s, hourCost[s.companyId], vat);
                return (
                  <tr key={s.id}>
                    <td className={`${TD} max-w-xs`}>
                      <TextCell value={s.name} width="w-64" onChange={(v) => setService(s.id, { name: v })} />
                    </td>
                    <td className={TD}>{s.category}</td>
                    <td className={TD}><CompanyBadge id={s.companyId} /></td>
                    <td className={TD}><NumInput value={s.basePrice} onChange={(v) => setService(s.id, { basePrice: v })} /></td>
                    <td className={TD}><NumInput value={s.estimatedHours} width="w-20" onChange={(v) => setService(s.id, { estimatedHours: v })} /></td>
                    <td className={TD}><NumInput value={s.govFees} onChange={(v) => setService(s.id, { govFees: v })} /></td>
                    <td className={TD}><NumInput value={s.externalCost} onChange={(v) => setService(s.id, { externalCost: v })} /></td>
                    <td className={TD}><NumInput value={s.commission} width="w-20" onChange={(v) => setService(s.id, { commission: v })} /></td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(e.directCost)}</td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(e.internalLabor)}</td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">
                      <Badge tone={e.directMargin >= 0.5 ? "good" : e.directMargin >= 0 ? "warn" : "bad"}>{pct(e.directMargin)}</Badge>
                    </td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">
                      <Badge tone={e.fullMargin >= 0.3 ? "good" : e.fullMargin >= 0 ? "warn" : "bad"}>{pct(e.fullMargin)}</Badge>
                    </td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{s.hasVAT ? fmt(e.vatOnPrice) : "—"}</td>
                    <td className={TD}>
                      <button className={BTN_GHOST} onClick={() => confirm(`حذف الخدمة "${s.name}"؟`) && removeService(s.id)}>حذف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          تكلفة العمل الداخلي = ساعات التنفيذ × تكلفة الساعة المنتجة للشركة (من صفحة الموظفون). ضريبة القيمة المضافة المحسوبة {vat}% على الخدمات الخاضعة لها فقط.
        </p>
      </Card>
    </>
  );
}
