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

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
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
  return migrate(JSON.parse(text));
}
