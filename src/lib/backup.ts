import type { BackupFile, DataModel } from "./types";
import { normalize } from "./initialData";

/** تصدير بنفس صيغة النسخة الاحتياطية الأصلية */
export function toBackup(d: DataModel): BackupFile {
  return {
    _metadata: { version: "2.0", exportedAt: new Date().toISOString(), appName: "Firm Finance Dashboard" },
    settings: d.settings,
    departments: d.departments,
    positions: d.positions,
    serviceCatalog: d.serviceCatalog,
    monthlySales: d.monthlySales,
    rentalUnits: d.rentalUnits,
    expenses: d.expenses,
    scenarios: d.scenarios,
  };
}

export class BackupError extends Error {}

/** يتحقق من شكل الملف قبل الاستيراد ويرفض الملفات غير الصالحة */
export function parseBackup(text: string): DataModel {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError("الملف ليس JSON صالحاً.");
  }
  const b = json as Partial<BackupFile>;
  const required = ["settings", "positions", "serviceCatalog", "rentalUnits", "expenses"] as const;
  for (const k of required) {
    if (!b || b[k] === undefined) throw new BackupError(`الملف ينقصه القسم: ${k}`);
  }
  if (typeof b.settings !== "object" || b.settings === null) throw new BackupError("قسم الإعدادات غير صالح.");
  for (const k of ["positions", "serviceCatalog", "rentalUnits", "expenses"] as const) {
    if (!Array.isArray(b[k])) throw new BackupError(`القسم ${k} يجب أن يكون قائمة.`);
  }
  return normalize(b);
}
