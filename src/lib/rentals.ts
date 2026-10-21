import type { ContractYear, RentalUnit } from "./types";
import { num, sumBy } from "./money";

const toTime = (s: string): number | null => {
  if (!s) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
};

const monthStart = (y: number, m: number) => Date.UTC(y, m - 1, 1);
const monthEnd = (y: number, m: number) => Date.UTC(y, m, 0);

/** شهر العقد: 0 للسنة الأولى، 1 للثانية... */
function contractYearIndex(u: RentalUnit, y: number, m: number): number {
  const start = toTime(u.contractStart);
  if (start === null) return 0;
  const d = new Date(start);
  const months = (y - d.getUTCFullYear()) * 12 + (m - 1 - d.getUTCMonth());
  return Math.max(0, Math.floor(months / 12));
}

/** السنة التعاقدية المطبقة على شهر معيّن (من الجدول إن وُجد، وإلا الحقول الأساسية) */
export function activeContractYear(u: RentalUnit, y: number, m: number): ContractYear | undefined {
  const rows = u.contractYearSchedule ?? [];
  if (rows.length === 0) return undefined;
  const ms = monthStart(y, m);
  const dated = rows.find((r) => {
    const a = toTime(r.startDate), b = toTime(r.endDate);
    return a !== null && b !== null && ms >= a && ms <= b;
  });
  if (dated) return dated;
  const idx = contractYearIndex(u, y, m) + 1;
  return rows.find((r) => r.yearNumber === idx && !r.startDate);
}

export interface UnitMonth {
  occupied: boolean;
  area: number;
  rentRate: number; // سعر المستأجر للمتر سنوياً
  revenue: number; // إيراد المستأجر الشهري (بدون ضريبة)
  ownerCost: number; // تكلفة المالك الشهرية (تُدفع حتى لو الوحدة شاغرة)
  rate: { ownerRentPerSqm: number; tenantRentPerSqm: number };
}

export function unitMonth(u: RentalUnit, y: number, m: number): UnitMonth {
  const ms = monthStart(y, m), me = monthEnd(y, m);
  const cs = toTime(u.contractStart), ce = toTime(u.contractEnd);
  const inContract = (cs === null || me >= cs) && (ce === null || ms <= ce);
  const occupied = Boolean(u.isOccupied) && inContract;
  const area = num(u.area);

  const yr = activeContractYear(u, y, m);
  const ownerRate = num(yr ? yr.ownerRentPerSqm : u.ownerRentPerSqm);
  const tenantRate = num(yr ? yr.tenantRentPerSqm : u.tenantRentPerSqm);
  const ownerSvc = num(yr ? yr.ownerServiceChargeRate : u.ownerServiceChargeRate);
  const tenantSvc = num(yr ? yr.tenantServiceChargeRate : u.tenantServiceChargeRate);
  const ownerEl = num(yr ? yr.ownerElectricity : u.ownerElectricity);
  const ownerWa = num(yr ? yr.ownerWater : u.ownerWater);
  const tenantEl = num(yr ? yr.tenantElectricity : u.tenantElectricity);
  const tenantWa = num(yr ? yr.tenantWater : u.tenantWater);
  const ownerOther = sumBy(yr ? yr.ownerOtherCosts : u.ownerOtherCosts, (x) => x.amount);
  const tenantOther = sumBy(yr ? yr.tenantOtherRevenue : u.tenantOtherRevenue, (x) => x.amount);

  const ownerRent = (ownerRate * area) / 12;
  const ownerCost = ownerRent * (1 + ownerSvc / 100) + (ownerEl + ownerWa + ownerOther) / 12;

  const tenantRent = (tenantRate * area) / 12;
  const revenue = occupied
    ? tenantRent * (1 + tenantSvc / 100) + (tenantEl + tenantWa + tenantOther) / 12
    : 0;

  return {
    occupied,
    area,
    rentRate: tenantRate,
    revenue,
    ownerCost,
    rate: { ownerRentPerSqm: ownerRate, tenantRentPerSqm: tenantRate },
  };
}

/** عدد الوحدات الفعلية (تستثني الوحدات الفرعية لتفادي الازدواج) */
export function rentableUnits(units: RentalUnit[]): RentalUnit[] {
  return units.filter((u) => !u.isSubUnit);
}

/** وحدة إيجار كامل للمبنى (المستأجَر كله من المالك كوحدة واحدة) */
export const isFullLease = (u: RentalUnit): boolean => u.unitType.includes("إيجار كامل");
