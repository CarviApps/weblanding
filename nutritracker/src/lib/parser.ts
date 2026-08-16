import type { Food } from "./types";

// Ojo: el texto llega ya normalizado (sin tildes ni ñ), así que las
// entradas de estas tablas se escriben también sin acentos.
const STOPWORDS = new Set([
  "comi", "coma", "comio", "comer", "tome", "desayune",
  "cene", "almorce", "merende",
  "de", "del", "un", "una", "unos", "unas", "el", "la", "los", "las", "al",
  "y", "e", "mas", "porcion", "porciones", "plato", "platos",
  "trozo", "trozos", "pedazo", "pedazos", "hoy", "para", "en", "a",
  "almuerzo", "cena", "desayuno", "merienda", "snack",
  "aproximadamente", "como", "casi", "algo", "poco", "poquito",
]);

/** Palabras que representan una unidad con peso estimado en gramos. */
const UNITS: Record<string, number> = {
  taza: 200, tazas: 200,
  vaso: 200, vasos: 200,
  cucharada: 15, cucharadas: 15,
  cucharadita: 5, cucharaditas: 5,
  rebanada: 30, rebanadas: 30,
  feta: 25, fetas: 25,
  scoop: 30, scoops: 30,
  medida: 30, medidas: 30,
  punado: 30, punados: 30,
};

const HALF_WORDS = ["medio", "media"];

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita plural simple para comparar palabras. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export interface Quantity {
  /** Gramos explícitos, si el texto los indicaba. */
  grams: number | null;
  /** Cantidad de unidades ("2 huevos"), si no había gramos. */
  count: number | null;
  rest: string;
}

export function extractQuantity(segment: string): Quantity {
  let rest = segment;
  let multiplier = 1;

  // "medio pollo", "media taza"
  for (const hw of HALF_WORDS) {
    const re = new RegExp(`\\b${hw}\\b`);
    if (re.test(rest)) {
      multiplier = 0.5;
      rest = rest.replace(re, " ");
      break;
    }
  }

  // kilos: "2 kg", "kilo de carne", "medio kilo"
  const kg =
    rest.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogramos?)\b/) ??
    rest.match(/()\b(?:kilos?|kilogramos?)\b/);
  if (kg) {
    const n = kg[1] ? parseFloat(kg[1].replace(",", ".")) : 1;
    return { grams: n * 1000 * multiplier, count: null, rest: rest.replace(kg[0], " ") };
  }

  // litros -> se asume densidad 1
  const l =
    rest.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litros?)\b/) ??
    rest.match(/()\b(?:litros?)\b/);
  if (l) {
    const n = l[1] ? parseFloat(l[1].replace(",", ".")) : 1;
    return { grams: n * 1000 * multiplier, count: null, rest: rest.replace(l[0], " ") };
  }
  const ml = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/);
  if (ml) {
    return {
      grams: parseFloat(ml[1].replace(",", ".")) * multiplier,
      count: null,
      rest: rest.replace(ml[0], " "),
    };
  }

  // gramos explícitos
  const g = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grs|gramos?)\b/);
  if (g) {
    return {
      grams: parseFloat(g[1].replace(",", ".")) * multiplier,
      count: null,
      rest: rest.replace(g[0], " "),
    };
  }

  // unidades de cocina: "2 cucharadas", "una taza"
  const unitNames = Object.keys(UNITS).join("|");
  const unit = rest.match(new RegExp(`(?:(\\d+(?:[.,]\\d+)?)\\s*)?\\b(${unitNames})\\b`));
  if (unit) {
    const n = unit[1] ? parseFloat(unit[1].replace(",", ".")) : 1;
    return {
      grams: n * UNITS[unit[2]] * multiplier,
      count: null,
      rest: rest.replace(unit[0], " "),
    };
  }

  // número suelto: si es chico lo tomamos como cantidad de unidades
  const bare = rest.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (bare) {
    const n = parseFloat(bare[1].replace(",", "."));
    const cleaned = rest.replace(bare[0], " ");
    if (n <= 12) return { grams: null, count: n * multiplier, rest: cleaned };
    return { grams: n * multiplier, count: null, rest: cleaned };
  }

  if (multiplier !== 1) return { grams: null, count: multiplier, rest };
  return { grams: null, count: null, rest };
}

function cleanWords(rest: string): string {
  return rest
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ")
    .trim();
}

export function scoreMatch(query: string, foodName: string): number {
  if (!query) return 0;
  if (foodName === query) return 1000;
  if (foodName.startsWith(query)) return 500 + query.length;
  if (foodName.includes(query)) return 300 + query.length;
  if (query.includes(foodName)) return 200 + foodName.length;

  const qWords = query.split(" ").filter(Boolean).map(stem);
  const fWords = foodName.split(" ").filter(Boolean).map(stem);
  let overlap = 0;
  for (const w of qWords) {
    if (w.length < 3) continue;
    // sólo comparamos contra palabras con contenido: artículos como "a" o "la"
    // hacían que cualquier texto matcheara por prefijo.
    if (fWords.some((fw) => fw.length >= 3 && (fw === w || fw.startsWith(w) || w.startsWith(fw))))
      overlap++;
  }
  if (overlap === 0) return 0;
  // premiamos que casi todas las palabras del alimento estén cubiertas
  return overlap * 40 - Math.abs(fWords.length - qWords.length) * 2;
}

export function findMatches(query: string, allFoods: Food[], limit = 8): Food[] {
  const q = normalize(query);
  if (!q) return [];
  return allFoods
    .map((f) => ({ food: f, score: scoreMatch(q, normalize(f.name)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.food);
}

export interface ParsedItem {
  id: string;
  rawText: string;
  query: string;
  grams: number;
  matches: Food[];
  selected: Food | null;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Gramos finales para un alimento dado, según lo que se pudo extraer. */
function resolveGrams(q: Quantity, food: Food | null): number {
  if (q.grams != null) return Math.round(q.grams);
  const serving = food?.serving ?? 100;
  if (q.count != null) return Math.round(q.count * serving);
  return serving;
}

export function parseEntry(text: string, allFoods: Food[]): ParsedItem[] {
  const norm = normalize(text);
  const segments = norm
    .split(/\by\b|\be\b|,|\bcon\b|\bmas\b|\+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: ParsedItem[] = [];
  for (const seg of segments) {
    const q = extractQuantity(seg);
    const query = cleanWords(q.rest);
    if (!query) continue;
    const matches = findMatches(query, allFoods);
    const selected = matches[0] ?? null;
    results.push({
      id: newId(),
      rawText: seg.trim(),
      query,
      grams: resolveGrams(q, selected),
      matches,
      selected,
    });
  }
  return results;
}
