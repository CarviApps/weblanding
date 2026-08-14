export const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/** Fecha local en formato yyyy-mm-dd (sin usar toISOString, que pasa a UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function dayName(iso: string): string {
  const idx = parseISODate(iso).getDay(); // 0 = domingo
  return DAYS[(idx + 6) % 7];
}

export function todayDayName(): string {
  return dayName(todayISO());
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISOStr).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Últimos n días terminando hoy, del más viejo al más nuevo. */
export function lastNDays(n: number, end = todayISO()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function prettyDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function prettyDateLong(iso: string): string {
  const d = parseISODate(iso);
  return `${dayName(iso)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function timeOfDay(isoTime: string): string {
  const d = new Date(isoTime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Slot de comida sugerido según la hora actual. */
export function guessSlot(): "desayuno" | "almuerzo" | "merienda" | "cena" | "snack" {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 15) return "almuerzo";
  if (h < 19) return "merienda";
  if (h < 24) return "cena";
  return "snack";
}
