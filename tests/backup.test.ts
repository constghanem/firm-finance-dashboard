import { describe, expect, it } from "vitest";
import { parseBackup, toBackup, BackupError } from "../src/lib/backup";
import { initialData } from "../src/lib/initialData";

describe("النسخ الاحتياطي والاستيراد", () => {
  it("رفض JSON غير صالح", () => {
    expect(() => parseBackup("{ not json")).toThrow(BackupError);
  });

  it("رفض ملف ينقصه قسم أساسي", () => {
    expect(() => parseBackup(JSON.stringify({ settings: {}, positions: [] }))).toThrow(BackupError);
  });

  it("رفض قسماً ليس قائمة", () => {
    const bad = { ...toBackup(initialData), positions: "x" };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
  });

  it("التصدير ثم الاستيراد يحافظ على عدد السجلات", () => {
    const text = JSON.stringify(toBackup(initialData));
    const back = parseBackup(text);
    expect(back.positions.length).toBe(initialData.positions.length);
    expect(back.serviceCatalog.length).toBe(initialData.serviceCatalog.length);
    expect(back.monthlySales.length).toBe(initialData.monthlySales.length);
    expect(back.expenses.length).toBe(initialData.expenses.length);
  });
});
