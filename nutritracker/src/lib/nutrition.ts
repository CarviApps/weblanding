import type { ActivityKey, Food, GoalKind, Profile } from "./types";

export const ACTIVITY: Record<ActivityKey, { label: string; factor: number; hint: string }> = {
  sed: { label: "Sedentario", factor: 1.2, hint: "Escritorio, poco movimiento" },
  light: { label: "Ligero", factor: 1.375, hint: "1-3 entrenos por semana" },
  mod: { label: "Moderado", factor: 1.55, hint: "3-5 entrenos por semana" },
  high: { label: "Alto", factor: 1.725, hint: "6-7 entrenos por semana" },
  athlete: { label: "Muy alto", factor: 1.9, hint: "Doble turno o trabajo físico" },
};

export const GOALS: Record<GoalKind, { label: string; hint: string; kcalDelta: number; proteinPerKg: number }> = {
  cut: {
    label: "Bajar grasa",
    hint: "Déficit moderado, proteína alta para no perder músculo",
    kcalDelta: -0.18,
    proteinPerKg: 2.2,
  },
  recomp: {
    label: "Recomposición",
    hint: "Mantener peso, bajar grasa y ganar músculo a la vez",
    kcalDelta: -0.05,
    proteinPerKg: 2.1,
  },
  bulk: {
    label: "Ganar músculo",
    hint: "Superávit controlado para crecer sin engordar de más",
    kcalDelta: 0.12,
    proteinPerKg: 1.9,
  },
};

/** Mifflin-St Jeor */
export function bmr(profile: Profile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "m" ? base + 5 : base - 161;
}

export function tdee(profile: Profile, weightKg: number): number {
  return bmr(profile, weightKg) * ACTIVITY[profile.activity].factor;
}

export interface Targets {
  cal: number;
  p: number;
  c: number;
  f: number;
  tdee: number;
  maintenance: number;
}

/**
 * Metas diarias. Proteína por kg de peso corporal, grasas al 25 % de las
 * calorías (mínimo 0,6 g/kg por salud hormonal) y el resto a carbohidratos.
 */
export function computeTargets(profile: Profile, currentWeightKg: number): Targets {
  const maintenance = tdee(profile, currentWeightKg);
  const goal = GOALS[profile.goal];

  const cal = Math.round(profile.manualCalories ?? maintenance * (1 + goal.kcalDelta));

  const p = Math.round(profile.manualProtein ?? goal.proteinPerKg * currentWeightKg);

  const fatFromPct = (cal * 0.25) / 9;
  const fatFloor = 0.6 * currentWeightKg;
  const f = Math.round(Math.max(fatFromPct, fatFloor));

  const carbKcal = cal - p * 4 - f * 9;
  const c = Math.max(0, Math.round(carbKcal / 4));

  return { cal, p, c, f, tdee: Math.round(maintenance), maintenance: Math.round(maintenance) };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeNutrients(food: Food, grams: number) {
  const factor = grams / 100;
  return {
    cal: round1(food.cal * factor),
    p: round1(food.p * factor),
    c: round1(food.c * factor),
    f: round1(food.f * factor),
  };
}

/**
 * Ritmo de cambio de peso saludable por semana, en kg, según objetivo.
 * Se usa para dibujar la curva esperada del plan.
 */
export function weeklyPace(goal: GoalKind, weightKg: number): number {
  if (goal === "cut") return -0.0065 * weightKg; // ~0,5 kg/sem a 75 kg
  if (goal === "bulk") return 0.0025 * weightKg;
  return 0;
}
