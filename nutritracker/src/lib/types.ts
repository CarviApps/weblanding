export type Sex = "m" | "f";

export type GoalKind = "cut" | "recomp" | "bulk";

export type ActivityKey = "sed" | "light" | "mod" | "high" | "athlete";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  activity: ActivityKey;
  goal: GoalKind;
  startDate: string; // ISO yyyy-mm-dd
  weeks: number; // duración del plan
  /** Si el usuario pisa las metas calculadas */
  manualCalories: number | null;
  manualProtein: number | null;
}

export interface Food {
  name: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  /** porción habitual en gramos, para el botón rápido */
  serving?: number;
  custom?: boolean;
}

export type MealSlot = "desayuno" | "almuerzo" | "merienda" | "cena" | "snack";

export interface FoodEntry {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // ISO
  slot: MealSlot;
  name: string;
  grams: number;
  cal: number;
  p: number;
  c: number;
  f: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  /** peso objetivo/último usado, para pre-cargar */
  lastWeight?: string;
}

export type RoutineTemplate = Record<string, Exercise[]>;

export interface LoggedSet {
  reps: string;
  weight: string;
}

export interface LoggedExercise {
  name: string;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  day: string;
  durationMin?: number;
  exercises: LoggedExercise[];
  volume: number; // kg totales movidos
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
  waistCm?: number | null;
  note?: string;
}

export type Tab = "today" | "meals" | "gym" | "progress" | "profile";

export interface AppData {
  profile: Profile | null;
  customFoods: Food[];
  entries: FoodEntry[];
  routine: RoutineTemplate;
  workouts: WorkoutSession[];
  weights: WeightEntry[];
  favorites: string[];
}
