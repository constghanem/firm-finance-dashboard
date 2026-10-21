export type CompanyId = "alpha" | "beta";
export type Scope = CompanyId | "all";

export const COMPANY_NAMES: Record<CompanyId, string> = {
  alpha: "شركة ألفا للمحاماة",
  beta: "شركة بيتا لخدمات الأعمال",
};

export interface CostSplit {
  type: string;
  alphaPct: number;
  betaPct: number;
}

export interface NamedAmount {
  id?: string;
  name: string;
  amount: number;
}

export interface Settings {
  vatRate: number;
  incomeTaxRate: number;
  saudiInsuranceRate: number;
  foreignInsuranceRate: number;
  annualSalaryIncrease: number;
  annualExpenseIncrease: number;
  annualRentIncrease: number;
  revenueGrowthRate: number;
  workDaysPerMonth: number;
  workHoursPerDay: number;
  productivityRate: number;
  overtimeMultiplier: number;
  currentYear: number;
  currentMonth: number;
  initialInvestment: number;
  foundingCosts: number;
  annualDepreciationRate: number;
  discountRate: number;
  breakHoursPerDay: number;
  costGrowthRate: number;
  /** طريقة احتساب إيجار المالك في المباني التي فيها إيجار كامل:
   *  building = مرة واحدة على الإيجار الكامل (افتراضي، يمنع الازدواج)
   *  units = على المكاتب الفرعية */
  rentCostMode?: "building" | "units";
}

export interface Department {
  id: string;
  name: string;
  companyId: CompanyId;
  color: string;
}

export interface Position {
  id: string;
  companyId: CompanyId;
  department: string;
  employeeName: string;
  positionTitle: string;
  nationality: string;
  workDaysPerWeek: number;
  workHoursPerDay: number;
  breakHoursPerDay: number;
  overtimeHoursPerDay: number;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  communicationAllowance: number;
  commissions: number;
  incentives: number;
  bonuses: number;
  insuranceBorneBy: "company" | "employee";
  medicalInsurance: number;
  residencePermit: number;
  workPermit: number;
  visa: number;
  sponsorshipTransfer: number;
  laborInspection: number;
  professionChange: number;
  passportFees: number;
  extraCostItems: NamedAmount[];
  productivityRate: number;
  notes: string;
  costSplit?: CostSplit;
}

export interface Service {
  id: string;
  companyId: CompanyId;
  name: string;
  category: string;
  description: string;
  hasVAT: boolean;
  basePrice: number;
  executionDays: number;
  estimatedHours: number;
  govFees: number;
  externalCost: number;
  commission: number;
  otherCosts: NamedAmount[];
}

export interface MonthlySale {
  id: string;
  companyId: CompanyId;
  serviceId: string;
  year: number;
  month: number;
  quantity: number;
  actualPrice: number;
  notes: string;
}

export interface ContractYear {
  id: string;
  yearNumber: number;
  startDate: string;
  endDate: string;
  ownerRentPerSqm: number;
  ownerServiceChargeRate: number;
  ownerElectricity: number;
  ownerWater: number;
  ownerOtherCosts: NamedAmount[];
  tenantRentPerSqm: number;
  tenantServiceChargeRate: number;
  tenantElectricity: number;
  tenantWater: number;
  tenantOtherRevenue: NamedAmount[];
  notes: string;
}

export interface RentalUnit {
  id: string;
  companyId?: CompanyId;
  buildingName: string;
  unitNumber: string;
  unitType: string;
  floor: string;
  area: number;
  ownerRentPerSqm: number;
  ownerServiceChargeRate: number;
  ownerElectricity: number;
  ownerWater: number;
  ownerOtherCosts: NamedAmount[];
  ownerHasVAT: boolean;
  tenantRentPerSqm: number;
  tenantServiceChargeRate: number;
  tenantElectricity: number;
  tenantWater: number;
  tenantOtherRevenue: NamedAmount[];
  tenantHasVAT: boolean;
  rentalPeriod: string;
  contractYears: number;
  isOccupied: boolean;
  tenantName: string;
  contractStart: string;
  contractEnd: string;
  notes: string;
  hasVAT: boolean;
  contractYearSchedule: ContractYear[];
  isSubUnit?: boolean;
  parentBuildingId?: string;
}

export interface Expense {
  id: string;
  companyId: CompanyId;
  name: string;
  category: string;
  expenseGroup: string;
  activity: string;
  behavior: string;
  distributionMethod: string;
  costCenter: string;
  monthlyAmount: number;
  annualAmount: number;
  hasVAT: boolean;
  frequency: string;
  startMonth: number;
  endMonth: number;
  year: number;
  isRecurring: boolean;
  notes: string;
  monthlyAmounts: number[];
  additionalItems: NamedAmount[];
  costSplit?: CostSplit;
  occurrenceType: string;
}

export interface Scenario {
  id: string;
  name: string;
  volumeFactor: number;
  priceFactor: number;
  costFactor: number;
  occupancyFactor: number;
}

export interface BackupFile {
  _metadata?: Record<string, unknown>;
  settings: Settings;
  departments: Department[];
  positions: Position[];
  serviceCatalog: Service[];
  monthlySales: MonthlySale[];
  rentalUnits: RentalUnit[];
  expenses: Expense[];
  scenarios: Scenario[];
}

export type DataModel = Omit<BackupFile, "_metadata">;
