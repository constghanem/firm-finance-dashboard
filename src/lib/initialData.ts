import raw from "../../data/financials.json";
import type { BackupFile, DataModel, Expense, Position, RentalUnit, Service, MonthlySale } from "./types";
import { DEFAULT_SCENARIOS } from "./defaults";

/** تطبيع البيانات: معرّفات ثابتة، وحقول افتراضية عند نقصها */
export function normalize(input: unknown): DataModel {
  const src = input as BackupFile;
  const withId = <T extends { id?: string }>(arr: T[] | undefined, prefix: string): (T & { id: string })[] =>
    (arr ?? []).map((x, i) => ({ ...x, id: x.id ?? `${prefix}-${i + 1}` }));

  const positions = withId<Position>(src.positions, "p").map((p) => ({
    ...p,
    extraCostItems: p.extraCostItems ?? [],
  }));
  const expenses = withId<Expense>(src.expenses, "e").map((e) => ({
    ...e,
    monthlyAmounts: Array.isArray(e.monthlyAmounts) && e.monthlyAmounts.length === 12 ? e.monthlyAmounts : Array(12).fill(Number(e.monthlyAmount) || 0),
    additionalItems: Array.isArray(e.additionalItems) ? e.additionalItems : [],
  }));
  const rentalUnits = withId<RentalUnit>(src.rentalUnits, "u").map((u) => ({
    ...u,
    contractYearSchedule: u.contractYearSchedule ?? [],
    ownerOtherCosts: u.ownerOtherCosts ?? [],
    tenantOtherRevenue: u.tenantOtherRevenue ?? [],
  }));
  return {
    settings: src.settings,
    departments: withId(src.departments, "d"),
    positions,
    serviceCatalog: withId<Service>(src.serviceCatalog, "s").map((s) => ({ ...s, otherCosts: s.otherCosts ?? [] })),
    monthlySales: withId<MonthlySale>(src.monthlySales, "x"),
    rentalUnits,
    expenses,
    scenarios: src.scenarios && src.scenarios.length ? src.scenarios : DEFAULT_SCENARIOS,
  };
}

export const initialData: DataModel = normalize(raw);
