import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_FOODS } from "../lib/foods";
import { computeTargets, type Targets } from "../lib/nutrition";
import { emptyData, loadData, saveData } from "../lib/storage";
import { todayISO } from "../lib/date";
import type { AppData, Food, Profile } from "../lib/types";

interface StoreValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  update: (patch: Partial<AppData>) => void;
  allFoods: Food[];
  /** Peso más reciente registrado, o el inicial del perfil. */
  currentWeight: number;
  targets: Targets | null;
  profile: Profile | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const hydrated = useRef(false);

  // Hidratamos una sola vez desde localStorage.
  useEffect(() => {
    setData(loadData());
    hydrated.current = true;
  }, []);

  // Persistimos en cada cambio, salvo el render inicial vacío.
  useEffect(() => {
    if (!hydrated.current) return;
    saveData(data);
  }, [data]);

  const update = useCallback((patch: Partial<AppData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const allFoods = useMemo<Food[]>(
    () => [...data.customFoods.map((f) => ({ ...f, custom: true })), ...DEFAULT_FOODS],
    [data.customFoods],
  );

  const currentWeight = useMemo(() => {
    if (data.weights.length > 0) {
      const sorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[sorted.length - 1].kg;
    }
    return data.profile?.startWeightKg ?? 70;
  }, [data.weights, data.profile]);

  const targets = useMemo(
    () => (data.profile ? computeTargets(data.profile, currentWeight) : null),
    [data.profile, currentWeight],
  );

  const value = useMemo<StoreValue>(
    () => ({ data, setData, update, allFoods, currentWeight, targets, profile: data.profile }),
    [data, update, allFoods, currentWeight, targets],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/** Totales de macros para una fecha. */
export function useDayTotals(dateISO: string = todayISO()) {
  const { data } = useStore();
  return useMemo(() => {
    const dayEntries = data.entries.filter((e) => e.date === dateISO);
    const totals = dayEntries.reduce(
      (acc, e) => ({
        cal: acc.cal + e.cal,
        p: acc.p + e.p,
        c: acc.c + e.c,
        f: acc.f + e.f,
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
    return { entries: dayEntries, totals };
  }, [data.entries, dateISO]);
}
