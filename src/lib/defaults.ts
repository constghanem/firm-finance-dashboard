import type { Scenario } from "./types";

/** متوسط المبيعات الشهرية المقدَّر (منتصف النطاق 150 إلى 300 ألف) */
export const ESTIMATED_MONTHLY_SALES = 225_000;

/** سيناريوهات افتراضية تُستخدم إذا لم تكن محفوظة في النسخة الاحتياطية */
export const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "sc-optimistic", name: "متفائل (+25% كمية، +5% سعر)", volumeFactor: 1.25, priceFactor: 1.05, costFactor: 1, occupancyFactor: 1.1 },
  { id: "sc-conservative", name: "متحفظ (−20% كمية، +5% تكلفة)", volumeFactor: 0.8, priceFactor: 1, costFactor: 1.05, occupancyFactor: 0.9 },
  { id: "sc-price-pressure", name: "ضغط أسعار (−10% سعر، +10% تكلفة)", volumeFactor: 1, priceFactor: 0.9, costFactor: 1.1, occupancyFactor: 1 },
  { id: "sc-sales-min", name: "مبيعات عند الحد الأدنى (150 ألف شهرياً)", volumeFactor: 150_000 / ESTIMATED_MONTHLY_SALES, priceFactor: 1, costFactor: 1, occupancyFactor: 1 },
  { id: "sc-sales-max", name: "مبيعات عند الحد الأعلى (300 ألف شهرياً)", volumeFactor: 300_000 / ESTIMATED_MONTHLY_SALES, priceFactor: 1, costFactor: 1, occupancyFactor: 1 },
];
