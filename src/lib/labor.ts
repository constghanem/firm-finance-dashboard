import type { CompanyId, Position, Settings } from "./types";
import { num, safeDiv, sumBy } from "./money";
import { shareFor } from "./share";

const WEEKS_PER_MONTH = 52 / 12;

export interface LaborCost {
  netHours: number; // ساعات العمل الصافية (بعد الاستراحة)
  daysPerMonth: number;
  monthlyTotal: number; // التكلفة الشهرية الكاملة للموظف على الشركة
  dailyCost: number;
  hourlyCost: number; // التكلفة بالساعة (الصافية)
  productiveHours: number; // ساعات الإنتاج الشهرية
  productiveHourCost: number; // تكلفة الساعة المنتجة
  insurance: number;
  overtimeCost: number;
  baseHourly: number; // أجر الساعة الأساسي (الأساس + البدلات) للأوفرتايم
}

export function laborFor(p: Position, s: Settings): LaborCost {
  const netHours = Math.max(0, num(p.workHoursPerDay) - num(p.breakHoursPerDay));
  const daysPerMonth = num(p.workDaysPerWeek) * WEEKS_PER_MONTH;

  const basic = num(p.basicSalary);
  const allowances = num(p.housingAllowance) + num(p.transportAllowance) + num(p.communicationAllowance);
  const variable = num(p.commissions) + num(p.incentives) + num(p.bonuses);

  const insRate = p.nationality === "سعودي" ? s.saudiInsuranceRate : s.foreignInsuranceRate;
  const insurance = p.insuranceBorneBy === "company" ? ((basic + num(p.housingAllowance)) * insRate) / 100 : 0;

  // الرسوم والتراخيص الشخصية تُحسب سنوياً ثم تُوزَّع شهرياً
  const annualPersonal =
    num(p.residencePermit) + num(p.workPermit) + num(p.visa) + num(p.sponsorshipTransfer) +
    num(p.laborInspection) + num(p.professionChange) + num(p.passportFees);

  const extra = sumBy(p.extraCostItems, (x) => x.amount);

  const baseHourly = safeDiv(basic + allowances, daysPerMonth * netHours);
  const overtimeCost = num(p.overtimeHoursPerDay) * daysPerMonth * baseHourly * num(s.overtimeMultiplier);

  const monthlyTotal =
    basic + allowances + variable + insurance + num(p.medicalInsurance) + annualPersonal / 12 + extra + overtimeCost;

  const productiveHours = (daysPerMonth * netHours * num(p.productivityRate)) / 100;

  return {
    netHours,
    daysPerMonth,
    monthlyTotal,
    dailyCost: safeDiv(monthlyTotal, daysPerMonth),
    hourlyCost: safeDiv(monthlyTotal, daysPerMonth * netHours),
    productiveHours,
    productiveHourCost: safeDiv(monthlyTotal, productiveHours),
    insurance,
    overtimeCost,
    baseHourly,
  };
}

/** متوسط تكلفة الساعة المنتجة لشركة معيّنة (يُستخدم لتسعير الخدمات بالوقت الداخلي) */
export function companyProductiveHourCost(positions: Position[], s: Settings, company: CompanyId): number {
  let cost = 0;
  let hours = 0;
  for (const p of positions) {
    const share = shareFor(p, company);
    if (share === 0) continue;
    const l = laborFor(p, s);
    cost += l.monthlyTotal * share;
    hours += l.productiveHours * share;
  }
  return safeDiv(cost, hours);
}
