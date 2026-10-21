import { useMemo, useState } from "react";
import { useData } from "@/lib/useData";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { expenseMonth, expenseYearTotal } from "@/lib/expenses";
import { fmt, MONTHS_AR } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { BTN_GHOST, BTN_PRIMARY, Card, CompanyBadge, INPUT, Kpi, NumInput, PageHeader, TD, TH } from "@/components/ui";

export default function Expenses() {
  const d = useData();
  const { scope } = useUi();
  const setExpenseMonth = useStore((s) => s.setExpenseMonth);
  const addExpense = useStore((s) => s.addExpense);
  const removeExpense = useStore((s) => s.removeExpense);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const categories = useMemo(() => Array.from(new Set(d.expenses.map((e) => e.category))).sort(), [d.expenses]);
  const rows = d.expenses
    .filter((e) => shareFor(e, scope) > 0)
    .filter((e) => !cat || e.category === cat)
    .filter((e) => !q || e.name.includes(q));

  const yearTotal = rows.reduce((t, e) => t + expenseYearTotal(e) * shareFor(e, scope), 0);
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    rows.reduce((t, e) => t + expenseMonth(e, i + 1) * shareFor(e, scope), 0),
  );

  return (
    <>
      <PageHeader
        title="المصروفات"
        subtitle="المصروفات التشغيلية والإدارية شهراً بشهر. تعديل أي خانة يُحدّث قائمة الدخل مباشرة."
        actions={
          <>
            <select className={INPUT} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">كل الفئات</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input className={`${INPUT} w-48`} placeholder="بحث بالاسم" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={BTN_PRIMARY} onClick={() => addExpense({ companyId: scope === "alpha" ? "alpha" : "beta" })}>+ بند جديد</button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="إجمالي المصروفات السنوية" value={`${fmt(yearTotal)} ر.س`} hint={`${rows.length} بند`} />
        <Kpi label="متوسط المصروف الشهري" value={`${fmt(yearTotal / 12)} ر.س`} />
        <Kpi label="أعلى شهر" value={`${fmt(Math.max(0, ...monthTotals))} ر.س`} />
      </div>

      <Card title="بنود المصروفات" className="mt-4">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>البند</th>
                <th className={TH}>الفئة</th>
                <th className={TH}>المجموعة</th>
                <th className={TH}>الشركة</th>
                <th className={TH}>الإجمالي السنوي</th>
                {MONTHS_AR.map((m) => (
                  <th key={m} className={TH}>{m}</th>
                ))}
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className={`${TD} max-w-xs truncate`} title={e.name}>{e.name}</td>
                  <td className={TD}>{e.category}</td>
                  <td className={TD}>{e.expenseGroup}</td>
                  <td className={TD}><CompanyBadge id={e.companyId} /></td>
                  <td className={`${TD} text-end tabular-nums font-semibold`} dir="ltr">{fmt(expenseYearTotal(e))}</td>
                  {Array.from({ length: 12 }, (_, i) => (
                    <td key={i} className={TD}>
                      <NumInput
                        value={expenseMonth(e, i + 1)}
                        width="w-24"
                        aria-label={`${e.name} ${MONTHS_AR[i]}`}
                        onChange={(v) => setExpenseMonth(e.id, i + 1, v)}
                      />
                    </td>
                  ))}
                  <td className={TD}>
                    <button className={BTN_GHOST} onClick={() => confirm(`حذف البند "${e.name}"؟`) && removeExpense(e.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className={TD} colSpan={4}>الإجمالي</td>
                <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(yearTotal)}</td>
                {monthTotals.map((v, i) => (
                  <td key={i} className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(v)}</td>
                ))}
                <td className={TD}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}
