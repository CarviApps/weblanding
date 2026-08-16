import { DAYS } from "./date";
import type { AppData, RoutineTemplate } from "./types";

const KEY = "nutritracker:v1";

export function emptyRoutine(): RoutineTemplate {
  return Object.fromEntries(DAYS.map((d) => [d, []])) as RoutineTemplate;
}

export function emptyData(): AppData {
  return {
    profile: null,
    customFoods: [],
    entries: [],
    routine: emptyRoutine(),
    workouts: [],
    weights: [],
    favorites: [],
  };
}

/** Completa campos faltantes para que datos viejos no rompan la app. */
function migrate(raw: Partial<AppData>): AppData {
  const base = emptyData();
  const routine = { ...base.routine, ...(raw.routine ?? {}) };
  return {
    profile: raw.profile ?? null,
    customFoods: raw.customFoods ?? [],
    entries: raw.entries ?? [],
    routine,
    workouts: raw.workouts ?? [],
    weights: raw.weights ?? [],
    favorites: raw.favorites ?? [],
  };
}

export interface Persisted {
  data: AppData;
  updatedAt: number;
}

/**
 * En disco guardamos `{ data, updatedAt }`. Las versiones anteriores guardaban
 * el AppData pelado, así que si no viene el sobre lo tratamos como datos v1
 * para no perder nada de lo ya cargado en el teléfono.
 */
export function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: emptyData(), updatedAt: 0 };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed && "updatedAt" in parsed) {
      return {
        data: migrate(parsed.data as Partial<AppData>),
        updatedAt: Number(parsed.updatedAt) || 0,
      };
    }
    return { data: migrate(parsed as Partial<AppData>), updatedAt: Date.now() };
  } catch {
    return { data: emptyData(), updatedAt: 0 };
  }
}

export function savePersisted(persisted: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // almacenamiento lleno o bloqueado: seguimos en memoria
  }
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nutritracker-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Aceptamos tanto el export nuevo como el viejo.
  if (parsed && typeof parsed === "object" && "data" in parsed && "updatedAt" in parsed) {
    return migrate(parsed.data as Partial<AppData>);
  }
  return migrate(parsed as Partial<AppData>);
}
