import type { CompanyId, Service } from "./types";
import { num, sumBy, safeDiv } from "./money";

export interface ServiceEconomics {
  price: number; // سعر البيع (بدون ضريبة القيمة المضافة)
  otherCosts: number; // مصروفات الجهات (المحددة في الخدمة)
  govFees: number;
  externalCost: number;
  commission: number;
  directCost: number; // التكلفة المباشرة = كل ما سبق بدون عمالة الشركة
  internalLabor: number; // ساعات التنفيذ × تكلفة الساعة المنتجة للشركة
  fullCost: number; // التكلفة الكاملة للتسعير
  directMargin: number; // هامش على التكلفة المباشرة
  fullMargin: number; // هامش على التكلفة الكاملة
  vatOnPrice: number; // الضريبة المستحقة على السعر (للعرض فقط)
}

export function serviceEconomics(s: Service, hourCost: number, vatRate: number): ServiceEconomics {
  const price = num(s.basePrice);
  const otherCosts = sumBy(s.otherCosts, (x) => x.amount);
  const govFees = num(s.govFees);
  const externalCost = num(s.externalCost);
  const commission = num(s.commission);
  const directCost = otherCosts + govFees + externalCost + commission;
  const internalLabor = num(s.estimatedHours) * num(hourCost);
  const fullCost = directCost + internalLabor;
  return {
    price,
    otherCosts,
    govFees,
    externalCost,
    commission,
    directCost,
    internalLabor,
    fullCost,
    directMargin: safeDiv(price - directCost, price),
    fullMargin: safeDiv(price - fullCost, price),
    vatOnPrice: s.hasVAT ? (price * num(vatRate)) / 100 : 0,
  };
}

export function serviceCompany(s: Service): CompanyId {
  return s.companyId;
}
