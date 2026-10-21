import { useShallow } from "zustand/react/shallow";
import { pickData, useStore, type Store } from "./store";
import type { DataModel } from "./types";

/** بيانات التطبيق بالكامل، مع إعادة الرسم فقط عند تغيّر البيانات فعلياً */
export function useData(): DataModel {
  return useStore(useShallow((s: Store) => pickData(s)));
}
