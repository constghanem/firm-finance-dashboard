import { create } from "zustand";
import type { Scope } from "./types";

interface UiState {
  scope: Scope;
  scenarioId: string;
  setScope: (s: Scope) => void;
  setScenario: (id: string) => void;
}

/** حالة الفلاتر المشتركة بين الصفحات (غير محفوظة) */
export const useUi = create<UiState>()((set) => ({
  scope: "all",
  scenarioId: "base",
  setScope: (scope) => set({ scope }),
  setScenario: (scenarioId) => set({ scenarioId }),
}));
