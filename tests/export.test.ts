import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { initialData } from "../src/lib/initialData";
import { buildWorkbook, workbookBytes } from "../src/lib/excelExport";
import { aggregate, monthlySeries, BASE_SCENARIO } from "../src/lib/finance";

const read = () => XLSX.read(new Uint8Array(workbookBytes(buildWorkbook(initialData, "all"))), { cellFormula: true, cellNF: false });

describe("تصدير Excel بمعادلات حية", () => {
  const wb = read();

  it("يحتوي الأوراق المتوقعة بأسمائها العربية", () => {
    expect(wb.SheetNames).toEqual(
      ["الملخص", "قائمة الدخل", "التدفق النقدي", "التوقع 5 سنوات", "الرواتب", "المبيعات", "الخدمات", "التأجير", "المصروفات", "الافتراضات"],
    );
  });

  it("إجمالي الإيرادات معادلة جمع مع قيمة محسوبة مطابقة للتطبيق", () => {
    const ws = wb.Sheets["قائمة الدخل"];
    expect(ws["B4"].f).toBe("B2+B3");
    expect(ws["N4"].f).toBe("N2+N3");
    const t = aggregate(monthlySeries(initialData, "all", 2026, BASE_SCENARIO), initialData.settings);
    expect(Math.round(ws["N4"].v)).toBe(Math.round(t.revenue));
  });

  it("الربح التشغيلي والضريبة وصافي الربح معادلات", () => {
    const ws = wb.Sheets["قائمة الدخل"];
    expect(ws["B11"].f).toBe("B6-B7-B8-B9-B10");
    expect(typeof ws["B12"].v).toBe("number");
    expect(ws["N13"].f).toBe("N11-N12");
  });

  it("التدفق النقدي يرجع إلى قائمة الدخل ويتراكم الرصيد", () => {
    const ws = wb.Sheets["التدفق النقدي"];
    expect(ws["B2"].f).toBe("'قائمة الدخل'!B4+'قائمة الدخل'!B16");
    expect(ws["E3"].f).toBe("E2+D3");
  });

  it("الملخص يشير إلى الأوراق الأخرى", () => {
    const ws = wb.Sheets["الملخص"];
    expect(ws["B2"].f).toBe("'قائمة الدخل'!N4");
    expect(ws["B9"].f).toBe("'التدفق النقدي'!E13");
  });
});
