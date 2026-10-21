import { COMPANY_NAMES, type DataModel } from "./types";
import { isFullLease, rentableUnits } from "./rentals";
import { num } from "./money";

export type Severity = "warn" | "info";
export interface QualityIssue {
  severity: Severity;
  area: string;
  message: string;
}

const buildingSizeFromName = (name: string): number | null => {
  const m = name.match(/(\d{2,5})\s*م/);
  return m ? Number(m[1]) : null;
};

/** فحوص جودة البيانات: تكشف النقص والتعارض قبل أن تُفهم الأرقام خطأً */
export function checkData(d: DataModel): QualityIssue[] {
  const out: QualityIssue[] = [];

  const totalQty = d.monthlySales.reduce((t, s) => t + num(s.quantity), 0);
  if (totalQty === 0) {
    out.push({ severity: "warn", area: "المبيعات", message: "لا توجد مبيعات خدمات مسجلة (كل الكميات صفر). الإيراد الحالي هو إيراد التأجير فقط." });
  }

  const units = rentableUnits(d.rentalUnits);
  const fullLeases = units.filter(isFullLease);
  const subUnits = d.rentalUnits.filter((u) => u.isSubUnit).length;
  if (subUnits) {
    out.push({ severity: "info", area: "التأجير", message: `${subUnits} وحدة فرعية مستبعدة من الحساب لأنها تقسيم بديل للإيجار الكامل (أسعارها صفر أصلاً).` });
  }
  for (const fl of fullLeases) {
    out.push({
      severity: "info",
      area: "التأجير",
      message: `"${fl.buildingName}": إيجار كامل من المالك. تكلفة المالك تُحسب مرة واحدة (الوضع الحالي: ${d.settings.rentCostMode ?? "building"}).`,
    });
  }

  const buildings = Array.from(new Set(units.map((u) => u.buildingName)));
  for (const b of buildings) {
    const size = buildingSizeFromName(b);
    const officeArea = units
      .filter((u) => u.buildingName === b && !isFullLease(u))
      .reduce((t, u) => t + num(u.area), 0);
    if (size && officeArea > size) {
      out.push({ severity: "warn", area: "التأجير", message: `"${b}": مجموع مساحات الوحدات ${officeArea}م² أكبر من مساحة المبنى ${size}م².` });
    } else if (size && officeArea < size) {
      out.push({ severity: "info", area: "التأجير", message: `"${b}": ${size - officeArea}م² من المبنى غير مدرجة كوحدات (ممرات أو مشتركة أو غير مؤجرة).` });
    }
  }

  const noTenantRate = units.filter((u) => u.isOccupied && !isFullLease(u) && num(u.tenantRentPerSqm) === 0);
  if (noTenantRate.length) {
    out.push({ severity: "warn", area: "التأجير", message: `${noTenantRate.length} وحدة مشغولة بدون سعر إيجار للمستأجر.` });
  }
  const noDates = units.filter((u) => u.isOccupied && !isFullLease(u) && !u.contractStart);
  if (noDates.length) {
    out.push({ severity: "info", area: "التأجير", message: `${noDates.length} وحدة مشغولة بدون تاريخ بداية عقد (تُحسب طوال السنة).` });
  }

  const noSplit = d.positions.filter((p) => !p.costSplit).length;
  if (noSplit) {
    out.push({ severity: "info", area: "الرواتب", message: `${noSplit} موظف بدون توزيع تكلفة صريح، ويُنسب 100% لشركته.` });
  }

  const zeroSalary = d.positions.filter((p) => num(p.basicSalary) === 0).length;
  if (zeroSalary) {
    out.push({ severity: "warn", area: "الرواتب", message: `${zeroSalary} وظيفة بدون راتب أساسي (شاغرة أو لم تُدخل بعد).` });
  }

  const zeroPrice = d.serviceCatalog.filter((s) => num(s.basePrice) === 0).length;
  if (zeroPrice) {
    out.push({ severity: "warn", area: "الخدمات", message: `${zeroPrice} خدمة بسعر صفر.` });
  }

  const emptyExp = d.expenses.filter((e) => e.monthlyAmounts.every((v) => num(v) === 0)).length;
  if (emptyExp) {
    out.push({ severity: "info", area: "المصاريف", message: `${emptyExp} بند مصروف بقيم صفرية لكل الأشهر.` });
  }

  for (const c of ["alpha", "beta"] as const) {
    const salesRev = d.monthlySales
      .filter((s) => s.companyId === c)
      .reduce((t, s) => t + num(s.quantity) * num(s.actualPrice), 0);
    const hasRent = units.some((u) => (u.companyId ?? "beta") === c && u.isOccupied);
    const hasPayroll = d.positions.some((p) => p.companyId === c);
    if (salesRev === 0 && !hasRent && hasPayroll) {
      out.push({
        severity: "warn",
        area: "الإيرادات",
        message: `${COMPANY_NAMES[c]}: لا توجد إيرادات مسجلة مقابل رواتبها. راجع توزيع المبيعات والتأجير بين الشركتين.`,
      });
    }
  }

  return out;
}
