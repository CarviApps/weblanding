import type { RoutineTemplate } from "./types";

type Plan = Record<string, [string, string, string][]>; // día -> [nombre, series, reps]

export interface Preset {
  id: string;
  name: string;
  hint: string;
  plan: Plan;
}

export const PRESETS: Preset[] = [
  {
    id: "fullbody3",
    name: "Full body 3 días",
    hint: "Lun / Mié / Vie. Ideal si arrancás o tenés poco tiempo.",
    plan: {
      Lunes: [
        ["sentadilla", "4", "8"],
        ["press banca", "4", "8"],
        ["remo con barra", "4", "10"],
        ["press militar", "3", "10"],
        ["plancha", "3", "40s"],
      ],
      Miércoles: [
        ["peso muerto", "4", "6"],
        ["dominadas", "4", "8"],
        ["press inclinado con mancuernas", "3", "10"],
        ["zancadas", "3", "12"],
        ["curl de biceps", "3", "12"],
      ],
      Viernes: [
        ["prensa de piernas", "4", "12"],
        ["press banca", "4", "8"],
        ["remo en polea", "4", "12"],
        ["elevaciones laterales", "3", "15"],
        ["extension de triceps", "3", "12"],
      ],
    },
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    hint: "6 días. El clásico para ganar músculo con volumen alto.",
    plan: {
      Lunes: [
        ["press banca", "4", "8"],
        ["press militar", "3", "10"],
        ["press inclinado con mancuernas", "3", "10"],
        ["elevaciones laterales", "4", "15"],
        ["extension de triceps", "3", "12"],
      ],
      Martes: [
        ["dominadas", "4", "8"],
        ["remo con barra", "4", "10"],
        ["remo en polea", "3", "12"],
        ["curl de biceps", "4", "12"],
        ["face pull", "3", "15"],
      ],
      Miércoles: [
        ["sentadilla", "4", "8"],
        ["peso muerto rumano", "4", "10"],
        ["prensa de piernas", "3", "12"],
        ["curl femoral", "3", "12"],
        ["gemelos", "4", "15"],
      ],
      Jueves: [
        ["press banca", "4", "8"],
        ["press militar con mancuernas", "3", "10"],
        ["aperturas", "3", "12"],
        ["elevaciones laterales", "4", "15"],
        ["fondos", "3", "10"],
      ],
      Viernes: [
        ["remo con barra", "4", "8"],
        ["dominadas", "4", "8"],
        ["pullover", "3", "12"],
        ["curl martillo", "3", "12"],
        ["face pull", "3", "15"],
      ],
      Sábado: [
        ["sentadilla frontal", "4", "8"],
        ["peso muerto", "3", "6"],
        ["zancadas", "3", "12"],
        ["extension de cuadriceps", "3", "15"],
        ["gemelos", "4", "15"],
      ],
    },
  },
  {
    id: "upperlower",
    name: "Torso / Pierna 4 días",
    hint: "Lun / Mar / Jue / Vie. Buen equilibrio entre volumen y descanso.",
    plan: {
      Lunes: [
        ["press banca", "4", "8"],
        ["remo con barra", "4", "10"],
        ["press militar", "3", "10"],
        ["dominadas", "3", "8"],
        ["curl de biceps", "3", "12"],
      ],
      Martes: [
        ["sentadilla", "4", "8"],
        ["peso muerto rumano", "4", "10"],
        ["prensa de piernas", "3", "12"],
        ["gemelos", "4", "15"],
        ["abdominales", "3", "15"],
      ],
      Jueves: [
        ["press inclinado con mancuernas", "4", "10"],
        ["remo en polea", "4", "12"],
        ["elevaciones laterales", "4", "15"],
        ["extension de triceps", "3", "12"],
        ["curl martillo", "3", "12"],
      ],
      Viernes: [
        ["peso muerto", "4", "6"],
        ["zancadas", "3", "12"],
        ["curl femoral", "3", "12"],
        ["extension de cuadriceps", "3", "15"],
        ["plancha", "3", "45s"],
      ],
    },
  },
];

export function presetToRoutine(preset: Preset, base: RoutineTemplate): RoutineTemplate {
  const next: RoutineTemplate = Object.fromEntries(
    Object.keys(base).map((d) => [d, []]),
  ) as RoutineTemplate;
  for (const [day, list] of Object.entries(preset.plan)) {
    next[day] = list.map(([name, sets, reps]) => ({
      id: Math.random().toString(36).slice(2, 10),
      name,
      sets,
      reps,
    }));
  }
  return next;
}
