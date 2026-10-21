import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DataModel, Expense, MonthlySale, Position, RentalUnit, Scenario, Service, Settings } from "./types";
import { initialData, normalize } from "./initialData";

type WithId = { id: string };
const patchList = <T extends WithId>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));
const removeFrom = <T extends WithId>(list: T[], id: string): T[] => list.filter((x) => x.id !== id);
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export interface Store extends DataModel {
  setPosition: (id: string, patch: Partial<Position>) => void;
  addPosition: (p: Partial<Position>) => void;
  removePosition: (id: string) => void;
  setService: (id: string, patch: Partial<Service>) => void;
  addService: (s: Partial<Service>) => void;
  removeService: (id: string) => void;
  setRental: (id: string, patch: Partial<RentalUnit>) => void;
  setExpense: (id: string, patch: Partial<Expense>) => void;
  setExpenseMonth: (id: string, month: number, value: number) => void;
  addExpense: (e: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  upsertSale: (serviceId: string, year: number, month: number, patch: Partial<MonthlySale>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setScenario: (id: string, patch: Partial<Scenario>) => void;
  addScenario: () => void;
  removeScenario: (id: string) => void;
  replaceData: (d: DataModel) => void;
  resetData: () => void;
}

const safeStorage = {
  getItem: (name: string) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); } catch { /* التخزين غير متاح: التطبيق يعمل بالذاكرة */ }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch { /* تجاهل */ }
  },
};

export const pickData = (s: Store): DataModel => ({
  settings: s.settings,
  departments: s.departments,
  positions: s.positions,
  serviceCatalog: s.serviceCatalog,
  monthlySales: s.monthlySales,
  rentalUnits: s.rentalUnits,
  expenses: s.expenses,
  scenarios: s.scenarios,
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData,
      setPosition: (id, patch) => set((s) => ({ positions: patchList(s.positions, id, patch) })),
      addPosition: (p) => set((s) => ({
        positions: [...s.positions, {
          id: uid("p"), companyId: "beta", department: "", employeeName: "موظف جديد", positionTitle: "وظيفة",
          nationality: "سعودي", workDaysPerWeek: 5, workHoursPerDay: 9, breakHoursPerDay: 1, overtimeHoursPerDay: 0,
          basicSalary: 0, housingAllowance: 0, transportAllowance: 0, communicationAllowance: 0, commissions: 0,
          incentives: 0, bonuses: 0, insuranceBorneBy: "company", medicalInsurance: 0, residencePermit: 0, workPermit: 0,
          visa: 0, sponsorshipTransfer: 0, laborInspection: 0, professionChange: 0, passportFees: 0,
          extraCostItems: [], productivityRate: 80, notes: "", ...p,
        }],
      })),
      removePosition: (id) => set((s) => ({ positions: removeFrom(s.positions, id) })),
      setService: (id, patch) => set((s) => ({ serviceCatalog: patchList(s.serviceCatalog, id, patch) })),
      addService: (sv) => set((s) => ({
        serviceCatalog: [...s.serviceCatalog, {
          id: uid("s"), companyId: "beta", name: "خدمة جديدة", category: "عام", description: "", hasVAT: false,
          basePrice: 0, executionDays: 0, estimatedHours: 0, govFees: 0, externalCost: 0, commission: 0, otherCosts: [], ...sv,
        }],
      })),
      removeService: (id) => set((s) => ({ serviceCatalog: removeFrom(s.serviceCatalog, id) })),
      setRental: (id, patch) => set((s) => ({ rentalUnits: patchList(s.rentalUnits, id, patch) })),
      setExpense: (id, patch) => set((s) => ({ expenses: patchList(s.expenses, id, patch) })),
      setExpenseMonth: (id, month, value) => set((s) => ({
        expenses: s.expenses.map((e) => {
          if (e.id !== id) return e;
          const arr = [...e.monthlyAmounts];
          arr[month - 1] = value;
          return { ...e, monthlyAmounts: arr };
        }),
      })),
      addExpense: (e) => set((s) => ({
        expenses: [...s.expenses, {
          id: uid("e"), companyId: "beta", name: "بند جديد", category: "أخرى", expenseGroup: "تشغيلية عامة",
          activity: "مشترك", behavior: "ثابت", distributionMethod: "موزع شهرياً", costCenter: "إدارة",
          monthlyAmount: 0, annualAmount: 0, hasVAT: false, frequency: "شهري", startMonth: 1, endMonth: 12,
          year: 2026, isRecurring: true, notes: "", monthlyAmounts: Array(12).fill(0), additionalItems: [],
          occurrenceType: "recurring", ...e,
        }],
      })),
      removeExpense: (id) => set((s) => ({ expenses: removeFrom(s.expenses, id) })),
      upsertSale: (serviceId, year, month, patch) => set((s) => {
        const existing = s.monthlySales.find((x) => x.serviceId === serviceId && x.year === year && x.month === month);
        if (existing) {
          return { monthlySales: patchList(s.monthlySales, existing.id, patch) };
        }
        const svc = s.serviceCatalog.find((x) => x.id === serviceId);
        const rec: MonthlySale = {
          id: uid("x"), companyId: svc?.companyId ?? "beta", serviceId, year, month,
          quantity: 0, actualPrice: svc?.basePrice ?? 0, notes: "", ...patch,
        };
        return { monthlySales: [...s.monthlySales, rec] };
      }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setScenario: (id, patch) => set((s) => ({ scenarios: patchList(s.scenarios, id, patch) })),
      addScenario: () => set((s) => ({
        scenarios: [...s.scenarios, { id: uid("sc"), name: "سيناريو جديد", volumeFactor: 1, priceFactor: 1, costFactor: 1, occupancyFactor: 1 }],
      })),
      removeScenario: (id) => set((s) => ({ scenarios: removeFrom(s.scenarios, id) })),
      replaceData: (d) => set({ ...d }),
      resetData: () => set({ ...initialData }),
    }),
    {
      name: "firm-finance-v2",
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => pickData(s as Store),
      merge: (persisted, current) => {
        const p = persisted as Partial<DataModel> | undefined;
        if (!p || !p.positions) return current;
        return { ...current, ...normalize({ ...initialData, ...p }) };
      },
    },
  ),
);

export const getData = (): DataModel => pickData(useStore.getState());

