import { useMemo, useState } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import type { CompanyId } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { fmt, MONTHS_AR, num } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { Card, CompanyBadge, Kpi, NumInput, PageHeader, TD, TH, INPUT } from "@/components/ui";
import { TOTAL_SALES_ID } from "@/lib/sales";

const RANGE_MIN = 150_000;
const RANGE_MAX = 300_000;

export default function Sales() {
  const d = useData();
  const upsertSale = useStore((s) => s.upsertSale);
  const setService = useStore((s) => s.setService);
  const { scope } = useUi();
  const year = d.settings.currentYear;
  const [q, setQ] = useState("");

  const monthlyTotal = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const sale = d.monthlySales.find((s) => s.serviceId === TOTAL_SALES_ID && s.year === year && s.month === i + 1);
        return sale ? num(sale.quantity) * num(sale.actualPrice) : 0;
      }),
    [d, year],
  );
  const totalYear = monthlyTotal.reduce((a, b) => a + b, 0);
  const totalCompany: CompanyId = d.serviceCatalog.find((s) => s.id === TOTAL_SALES_ID)?.companyId ?? "beta";
  const setTotalCompany = (c: CompanyId) => {
    setService(TOTAL_SALES_ID, { companyId: c });
    for (let m = 1; m <= 12; m++) upsertSale(TOTAL_SALES_ID, year, m, { companyId: c });
  };
  const avg = totalYear / 12;
  const outOfRange = monthlyTotal.filter((v) => v < RANGE_MIN || v > RANGE_MAX).length;

  const services = useMemo(
    () =>
      d.serviceCatalog
        .filter((s) => s.id !== TOTAL_SALES_ID)
        .filter((s) => shareFor({ companyId: s.companyId }, scope) > 0)
        .filter((s) => !q || s.name.includes(q) || s.category.includes(q)),
    [d.serviceCatalog, scope, q],
  );

  const detailRevenue = (serviceId: string) => {
    const svc = d.serviceCatalog.find((s) => s.id === serviceId);
    return d.monthlySales
      .filter((s) => s.serviceId === serviceId && s.year === year)
      .reduce((t, s) => t + num(s.quantity) * num(s.actualPrice || svc?.basePrice), 0);
  };
  const detailTotal = services.reduce((t, s) => t + detailRevenue(s.id), 0);

  return (
    <>
      <PageHeader
        title="المبيعات"
        subtitle="الإيرادات الشهرية للخدمات. الإجمالي التقديري يُستخدم عندما لا تتوفر تفاصيل الخدمات، والتفصيل حسب الخدمة يُضاف فوقه."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="إجمالي المبيعات السنوية (تقدير)" value={`${fmt(totalYear)} ر.س`} />
        <Kpi label="متوسط الشهر" value={`${fmt(avg)} ر.س`} hint={`النطاق المتوقع ${fmt(RANGE_MIN)} إلى ${fmt(RANGE_MAX)}`} />
        <Kpi label="أشهر خارج النطاق" value={String(outOfRange)} tone={outOfRange ? "warn" : "good"} />
        <Kpi label={`ضريبة القيمة المضافة ${d.settings.vatRate}%`} value={`${fmt((totalYear * d.settings.vatRate) / 100)} ر.س`} hint="تُضاف فوق المبيعات وتُورَّد للهيئة، ولا تدخل الإيراد" />
        <Kpi label="مبيعات التفصيل حسب الخدمة" value={`${fmt(detailTotal)} ر.س`} hint="يُحسب فقط عند إدخال كميات" />
      </div>

      <Card
        title={`إجمالي المبيعات الشهرية ${year} (تقدير)`}
        className="mt-4"
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            تُسجَّل على
            <select className={INPUT} value={totalCompany} onChange={(e) => setTotalCompany(e.target.value as CompanyId)}>
              <option value="beta">شركة بيتا لخدمات الأعمال</option>
              <option value="alpha">شركة ألفا للمحاماة</option>
            </select>
          </label>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {MONTHS_AR.map((m) => (
                  <th key={m} className={TH}>{m}</th>
                ))}
                <th className={TH}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTotal.map((v, i) => {
                  const bad = v < RANGE_MIN || v > RANGE_MAX;
                  return (
                    <td key={i} className={`${TD} ${bad ? "bg-amber-50" : ""}`}>
                      <NumInput
                        value={v}
                        width="w-28"
                        aria-label={`مبيعات ${MONTHS_AR[i]}`}
                        onChange={(val) => upsertSale(TOTAL_SALES_ID, year, i + 1, { actualPrice: val, quantity: 1 })}
                      />
                    </td>
                  );
                })}
                <td className={`${TD} text-end font-semibold tabular-nums`} dir="ltr">{fmt(totalYear)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          القيمة الأساسية منتصف النطاق (225 ألف شهرياً). الخانات الصفراء خارج النطاق 150 إلى 300 ألف. المبالغ قبل الضريبة، وتُضاف عليها ضريبة القيمة المضافة 15% عند الفوترة. اختر الشركة التي تسجَّل عليها هذه المبيعات.
        </p>
      </Card>

      <Card
        title="المبيعات التفصيلية حسب الخدمة (الكمية × السعر)"
        className="mt-4"
        actions={
          <input className={`${INPUT} w-56`} placeholder="بحث باسم الخدمة أو الفئة" value={q} onChange={(e) => setQ(e.target.value)} />
        }
      >
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الخدمة</th>
                <th className={TH}>الشركة</th>
                <th className={TH}>السعر</th>
                {MONTHS_AR.map((m) => (
                  <th key={m} className={TH}>{m}</th>
                ))}
                <th className={TH}>الإيراد السنوي</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const rev = detailRevenue(s.id);
                return (
                  <tr key={s.id}>
                    <td className={`${TD} max-w-xs truncate`} title={s.name}>{s.name}</td>
                    <td className={TD}><CompanyBadge id={s.companyId} /></td>
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(s.basePrice)}</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const sale = d.monthlySales.find((x) => x.serviceId === s.id && x.year === year && x.month === i + 1);
                      return (
                        <td key={i} className={TD}>
                          <NumInput
                            value={sale ? num(sale.quantity) : 0}
                            width="w-16"
                            aria-label={`كمية ${s.name} ${MONTHS_AR[i]}`}
                            onChange={(qty) => upsertSale(s.id, year, i + 1, { quantity: qty })}
                          />
                        </td>
                      );
                    })}
                    <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(rev)}</td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td colSpan={17} className={`${TD} text-center text-slate-400`}>لا توجد خدمات مطابقة.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
