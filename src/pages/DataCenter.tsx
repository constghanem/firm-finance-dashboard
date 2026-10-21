import { useRef, useState } from "react";
import { useData } from "@/lib/useData";
import { getData, useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { parseBackup, toBackup, BackupError } from "@/lib/backup";
import { checkData } from "@/lib/dataQuality";
import { buildWorkbook, workbookBytes } from "@/lib/excelExport";
import { download, toCsv } from "@/lib/csv";
import { fmt, num, pct } from "@/lib/money";
import { shareFor } from "@/lib/share";
import { expenseMonth, expenseYearTotal } from "@/lib/expenses";
import { laborFor } from "@/lib/labor";
import { rentableUnits, unitMonth } from "@/lib/rentals";
import { monthlySeries, BASE_SCENARIO, aggregate } from "@/lib/finance";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, Badge, Card, PageHeader, TD, TH } from "@/components/ui";
import { MONTHS_AR } from "@/lib/money";
import { TOTAL_SALES_ID } from "@/lib/sales";

const today = () => new Date().toISOString().slice(0, 10);

export default function DataCenter() {
  const d = useData();
  const { scope } = useUi();
  const replaceData = useStore((s) => s.replaceData);
  const resetData = useStore((s) => s.resetData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const issues = checkData(d);
  const year = d.settings.currentYear;

  const exportBackup = () => {
    const b = toBackup(getData());
    download(`backup-${today()}.json`, JSON.stringify(b, null, 2), "application/json");
  };

  const exportExcel = () => {
    const wb = buildWorkbook(d, scope);
    download(`financial-model-${scope}-${today()}.xlsx`, new Blob([workbookBytes(wb)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  };

  const exportCsv = (kind: "positions" | "services" | "sales" | "rentals" | "expenses" | "pnl") => {
    if (kind === "positions") {
      download(`positions-${today()}.csv`, toCsv(
        ["الموظف", "الشركة", "المسمى", "الأساسي", "التكلفة الشهرية الكاملة", "تكلفة الساعة المنتجة"],
        d.positions.map((p) => {
          const l = laborFor(p, d.settings);
          return [p.employeeName, p.companyId, p.positionTitle, num(p.basicSalary), Math.round(l.monthlyTotal), Math.round(l.productiveHourCost)];
        }),
      ));
    }
    if (kind === "services") {
      download(`services-${today()}.csv`, toCsv(
        ["الخدمة", "الشركة", "السعر", "رسوم الجهات", "تكلفة خارجية", "عمولة", "ساعات التنفيذ"],
        d.serviceCatalog.filter((s) => s.id !== TOTAL_SALES_ID).map((s) => [s.name, s.companyId, num(s.basePrice), num(s.govFees), num(s.externalCost), num(s.commission), num(s.estimatedHours)]),
      ));
    }
    if (kind === "sales") {
      download(`sales-${today()}.csv`, toCsv(
        ["الخدمة", "الشركة", "السنة", "الشهر", "الكمية", "السعر الفعلي"],
        d.monthlySales.map((s) => {
          const name = d.serviceCatalog.find((x) => x.id === s.serviceId)?.name ?? s.serviceId;
          return [name, s.companyId, s.year, s.month, num(s.quantity), num(s.actualPrice)];
        }),
      ));
    }
    if (kind === "rentals") {
      download(`rentals-${today()}.csv`, toCsv(
        ["المبنى", "الوحدة", "المساحة", "مشغولة", "إيجار المستأجر/م²", "إيجار المالك/م²", "إيراد السنة", "تكلفة المالك السنة"],
        rentableUnits(d.rentalUnits).map((u) => {
          const ms = Array.from({ length: 12 }, (_, i) => unitMonth(u, year, i + 1));
          return [u.buildingName, u.unitNumber, num(u.area), u.isOccupied ? "نعم" : "لا", num(u.tenantRentPerSqm), num(u.ownerRentPerSqm), Math.round(ms.reduce((t, m) => t + m.revenue, 0)), Math.round(ms.reduce((t, m) => t + m.ownerCost, 0))];
        }),
      ));
    }
    if (kind === "expenses") {
      download(`expenses-${today()}.csv`, toCsv(
        ["البند", "الفئة", "الشركة", "الإجمالي السنوي", ...MONTHS_AR],
        d.expenses.map((e) => [e.name, e.category, e.companyId, Math.round(expenseYearTotal(e)), ...Array.from({ length: 12 }, (_, i) => expenseMonth(e, i + 1))]),
      ));
    }
    if (kind === "pnl") {
      const rows = monthlySeries(d, scope, year, BASE_SCENARIO);
      const t = aggregate(rows, d.settings);
      download(`pnl-${scope}-${today()}.csv`, toCsv(
        ["الشهر", "الإيرادات", "التكاليف المباشرة", "الرواتب", "الإيجار", "المصروفات", "الإهلاك", "الربح التشغيلي", "الضريبة", "الصافي"],
        [
          ...rows.map((r) => [MONTHS_AR[r.month - 1], Math.round(r.revenue), Math.round(r.cogs), Math.round(r.salaries), Math.round(r.rentCost), Math.round(r.expenses), Math.round(r.depreciation), Math.round(r.ebit), Math.round(r.tax), Math.round(r.net)]),
          ["الإجمالي", Math.round(t.revenue), Math.round(t.cogs), Math.round(t.salaries), Math.round(t.rentCost), Math.round(t.expenses), Math.round(t.depreciation), Math.round(t.ebit), Math.round(t.tax), Math.round(t.net)],
        ],
      ));
    }
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const next = parseBackup(text);
      if (!confirm("سيتم استبدال كل البيانات الحالية بمحتوى الملف. متابعة؟")) return;
      replaceData(next);
      setMsg({ tone: "good", text: `تم الاستيراد: ${next.positions.length} موظف، ${next.serviceCatalog.length} خدمة، ${next.rentalUnits.length} وحدة، ${next.expenses.length} بند مصروف.` });
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof BackupError ? e.message : "تعذّر قراءة الملف." });
    }
  };

  return (
    <>
      <PageHeader title="البيانات والتصدير" subtitle="نسخ احتياطي واستيراد، وتصدير Excel وCSV وPDF، وفحص جودة البيانات." />

      {msg && (
        <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${msg.tone === "good" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="التصدير">
          <div className="flex flex-wrap gap-2">
            <button className={BTN_PRIMARY} onClick={exportExcel}>Excel بمعادلات حية</button>
            <button className={BTN_GHOST} onClick={() => window.print()}>PDF (طباعة)</button>
            <button className={BTN_GHOST} onClick={exportBackup}>نسخة احتياطية JSON</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            ملف Excel يحتوي على الملخص وقائمة الدخل والتدفق والتوقع والرواتب والمبيعات والخدمات والتأجير والمصروفات والافتراضات.
            الإجماليات والتدفق والتوقع معادلات، فتتغير تلقائياً إذا عدّلت أي قيمة إدخال داخل الملف.
          </p>
          <div className="mt-4 text-sm font-medium text-slate-700">CSV حسب الجدول</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["positions", "services", "sales", "rentals", "expenses", "pnl"] as const).map((k) => (
              <button key={k} className={BTN_GHOST} onClick={() => exportCsv(k)}>
                {{ positions: "الموظفون", services: "الخدمات", sales: "المبيعات", rentals: "التأجير", expenses: "المصروفات", pnl: "قائمة الدخل" }[k]}
              </button>
            ))}
          </div>
        </Card>

        <Card title="الاستيراد والاستعادة">
          <p className="text-sm text-slate-600">
            استيراد ملف JSON بنفس صيغة النسخة الاحتياطية. يتم التحقق من الملف قبل الاستبدال، ولا تُحفظ أي بيانات تالفة.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
            <button className={BTN_PRIMARY} onClick={() => fileRef.current?.click()}>اختيار ملف للاستيراد</button>
            <button
              className={BTN_DANGER}
              onClick={() => {
                if (confirm("إعادة البيانات إلى النسخة الأصلية المُنقّحة؟ ستفقد التعديلات الحالية.")) {
                  resetData();
                  setMsg({ tone: "good", text: "تمت إعادة البيانات إلى الأصل." });
                }
              }}
            >
              إعادة إلى الأصل
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            البيانات تُحفظ في متصفحك فقط (localStorage). لا يُرسل شيء إلى أي خادم. استخدم النسخة الاحتياطية للانتقال إلى جهاز آخر.
          </p>
        </Card>
      </div>

      <Card title={`فحص جودة البيانات (${issues.length})`} className="mt-4">
        {issues.length === 0 ? (
          <p className="text-sm text-emerald-700">لا توجد ملاحظات.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {issues.map((i, k) => (
              <li key={k} className="flex items-start gap-3 py-2 text-sm">
                <Badge tone={i.severity === "warn" ? "warn" : "info"}>{i.area}</Badge>
                <span className="text-slate-700">{i.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="ملخص سريع للبيانات" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>الجدول</th>
                <th className={TH}>عدد السجلات</th>
                <th className={TH}>ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["الموظفون", d.positions.length, "التكلفة الكاملة تشمل التأمين والرسوم والإضافي"],
                ["الخدمات", d.serviceCatalog.length, "يتضمن إجمالي المبيعات التقديري"],
                ["سجلات المبيعات", d.monthlySales.length, "الكمية × السعر لكل شهر"],
                ["وحدات التأجير", d.rentalUnits.length, "الوحدات الفرعية مستبعدة من الحساب"],
                ["بنود المصروفات", d.expenses.length, "قيم شهرية لكل بند"],
                ["السيناريوهات", d.scenarios.length, "تُعدَّل من صفحة السيناريوهات"],
              ].map(([name, count, note]) => (
                <tr key={name as string}>
                  <td className={TD}>{name as string}</td>
                  <td className={`${TD} text-end tabular-nums`} dir="ltr">{fmt(count as number)}</td>
                  <td className={TD}>{note as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">نسبة الضريبة {pct(num(d.settings.incomeTaxRate) / 100)} · ضريبة القيمة المضافة {d.settings.vatRate}%</p>
      </Card>
    </>
  );
}
