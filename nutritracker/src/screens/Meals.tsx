import { useMemo, useState } from "react";
import { Empty, Field, Segmented } from "../components/ui";
import { IconMic, IconStop } from "../components/icons";
import { useStore } from "../state/store";
import { useSpeech } from "../lib/useSpeech";
import { findMatches, normalize, parseEntry, type ParsedItem } from "../lib/parser";
import { computeNutrients } from "../lib/nutrition";
import { guessSlot, todayISO } from "../lib/date";
import type { Food, FoodEntry, MealSlot } from "../lib/types";

const SLOTS: MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena", "snack"];

type Mode = "dictar" | "buscar" | "mios";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Meals({ toast }: { toast: (m: string) => void }) {
  const { setData, allFoods } = useStore();
  const [mode, setMode] = useState<Mode>("dictar");
  const [slot, setSlot] = useState<MealSlot>(() => guessSlot());

  function addFoods(items: { food: Food; grams: number }[]) {
    const rows: FoodEntry[] = items.map(({ food, grams }) => ({
      id: newId(),
      date: todayISO(),
      time: new Date().toISOString(),
      slot,
      name: food.name,
      grams,
      ...computeNutrients(food, grams),
    }));
    setData((prev) => ({ ...prev, entries: [...prev.entries, ...rows] }));
    const kcal = Math.round(rows.reduce((a, r) => a + r.cal, 0));
    toast(`Agregado a ${slot} · ${kcal} kcal`);
  }

  return (
    <div className="screen">
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { id: "dictar", label: "Dictar" },
          { id: "buscar", label: "Buscar" },
          { id: "mios", label: "Mis alimentos" },
        ]}
      />

      {mode !== "mios" && (
        <>
          <div className="chips" style={{ margin: "14px 0 4px" }}>
            {SLOTS.map((s) => (
              <button
                key={s}
                className="chip"
                aria-pressed={slot === s}
                onClick={() => setSlot(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "dictar" && <DictateTab allFoods={allFoods} onAdd={addFoods} />}
      {mode === "buscar" && <SearchTab allFoods={allFoods} onAdd={addFoods} />}
      {mode === "mios" && <MyFoodsTab />}
    </div>
  );
}

/* -------------------------------------------------------------- */

function DictateTab({
  allFoods,
  onAdd,
}: {
  allFoods: Food[];
  onAdd: (items: { food: Food; grams: number }[]) => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ParsedItem[]>([]);
  const [note, setNote] = useState("");

  const { supported, listening, toggle } = useSpeech((t) =>
    setText((prev) => (prev ? `${prev} ${t}` : t)),
  );

  function analyze() {
    if (!text.trim()) return;
    const parsed = parseEntry(text, allFoods);
    if (parsed.length === 0) {
      setNote('No reconocí ningún alimento. Probá con algo como "150 g de pollo con arroz".');
      setPending([]);
      return;
    }
    setNote("");
    setPending(parsed);
  }

  function patch(id: string, p: Partial<ParsedItem>) {
    setPending((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  function confirm() {
    const items = pending
      .filter((p) => p.selected && p.grams > 0)
      .map((p) => ({ food: p.selected as Food, grams: p.grams }));
    if (items.length === 0) return;
    onAdd(items);
    setPending([]);
    setText("");
  }

  return (
    <>
      <p className="help" style={{ marginTop: 14 }}>
        Contame qué comiste en una sola frase. Entiende gramos, unidades y porciones:{" "}
        <em>«2 huevos con 60 g de avena y una banana»</em>.
      </p>

      <div className="composer">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí o dictá lo que comiste..."
        />
        {supported && (
          <button
            className="mic"
            data-on={listening}
            onClick={toggle}
            aria-label={listening ? "Detener dictado" : "Dictar por voz"}
          >
            {listening ? <IconStop /> : <IconMic />}
          </button>
        )}
      </div>

      <button className="btn" style={{ marginTop: 10 }} onClick={analyze}>
        Analizar
      </button>

      {note && (
        <p className="muted" style={{ marginTop: 10 }}>
          {note}
        </p>
      )}

      {pending.length > 0 && (
        <div className="stack" style={{ marginTop: 14 }}>
          {pending.map((p) => (
            <div className="parsed" key={p.id}>
              <div className="parsed-head">
                <span className="parsed-raw">«{p.rawText}»</span>
                <button
                  className="x"
                  onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
                >
                  ✕
                </button>
              </div>

              {p.matches.length > 0 ? (
                <>
                  <select
                    value={p.selected?.name ?? ""}
                    onChange={(e) => {
                      const f = allFoods.find((x) => x.name === e.target.value) ?? null;
                      patch(p.id, {
                        selected: f,
                        grams: f?.serving && p.grams === 100 ? f.serving : p.grams,
                      });
                    }}
                  >
                    {p.matches.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    <option value="">— ninguno de estos —</option>
                  </select>
                  <div className="qty">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={p.grams}
                      onChange={(e) => patch(p.id, { grams: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="unit">g</span>
                    {p.selected && (
                      <span className="out">
                        {computeNutrients(p.selected, p.grams).cal} kcal ·{" "}
                        {computeNutrients(p.selected, p.grams).p} g prot
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted">
                  No encontré «{p.query}». Agregalo en «Mis alimentos» y volvé a intentar.
                </p>
              )}
            </div>
          ))}
          <button className="btn accent" onClick={confirm}>
            Agregar {pending.filter((p) => p.selected).length} alimento(s)
          </button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------- */

function SearchTab({
  allFoods,
  onAdd,
}: {
  allFoods: Food[];
  onAdd: (items: { food: Food; grams: number }[]) => void;
}) {
  const { data, setData } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);

  const results = useMemo(() => {
    if (!q.trim()) {
      const favs = data.favorites
        .map((n) => allFoods.find((f) => f.name === n))
        .filter(Boolean) as Food[];
      if (favs.length > 0) return favs;
      return allFoods.slice(0, 14);
    }
    return findMatches(q, allFoods, 30);
  }, [q, allFoods, data.favorites]);

  function toggleFav(name: string) {
    setData((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(name)
        ? prev.favorites.filter((f) => f !== name)
        : [...prev.favorites, name],
    }));
  }

  return (
    <>
      <div style={{ marginTop: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alimento..."
          autoComplete="off"
        />
      </div>

      {!q.trim() && data.favorites.length > 0 && (
        <p className="muted" style={{ marginTop: 10 }}>
          Tus favoritos. Buscá para ver toda la base.
        </p>
      )}

      <div className="list" style={{ marginTop: 12 }}>
        {results.map((f) => (
          <div className="row" key={f.name}>
            <button
              className="body"
              style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}
              onClick={() => {
                setOpen(f);
                setGrams(f.serving ?? 100);
              }}
            >
              <div className="title">{f.name}</div>
              <div className="sub">
                {f.cal} kcal · P {f.p} · C {f.c} · G {f.f} (100 g)
              </div>
            </button>
            <button
              className="x"
              onClick={() => toggleFav(f.name)}
              aria-label="Marcar favorito"
              style={{ color: data.favorites.includes(f.name) ? "var(--gold)" : undefined }}
            >
              {data.favorites.includes(f.name) ? "★" : "☆"}
            </button>
          </div>
        ))}
        {results.length === 0 && (
          <Empty title="Sin resultados">
            Podés crearlo en la pestaña «Mis alimentos».
          </Empty>
        )}
      </div>

      {open && (
        <div className="card" style={{ position: "sticky", bottom: 14, marginTop: 14 }}>
          <div className="parsed-head">
            <b style={{ textTransform: "capitalize" }}>{open.name}</b>
            <button className="x" onClick={() => setOpen(null)}>
              ✕
            </button>
          </div>
          <div className="qty">
            <input
              type="number"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
            />
            <span className="unit">g</span>
            <span className="out">
              {computeNutrients(open, grams).cal} kcal · {computeNutrients(open, grams).p} g prot
            </span>
          </div>
          <button
            className="btn accent"
            style={{ marginTop: 12 }}
            onClick={() => {
              onAdd([{ food: open, grams }]);
              setOpen(null);
            }}
          >
            Agregar
          </button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------- */

function MyFoodsTab() {
  const { data, setData } = useStore();
  const [form, setForm] = useState({ name: "", cal: "", p: "", c: "", f: "", serving: "" });
  const [error, setError] = useState("");

  function add() {
    if (!form.name.trim() || form.cal === "") {
      setError("Necesito al menos el nombre y las calorías por 100 g.");
      return;
    }
    const name = normalize(form.name);
    if (data.customFoods.some((f) => f.name === name)) {
      setError("Ya tenés un alimento con ese nombre.");
      return;
    }
    setError("");
    const food: Food = {
      name,
      cal: parseFloat(form.cal) || 0,
      p: parseFloat(form.p) || 0,
      c: parseFloat(form.c) || 0,
      f: parseFloat(form.f) || 0,
      serving: form.serving ? parseFloat(form.serving) : undefined,
      custom: true,
    };
    setData((prev) => ({ ...prev, customFoods: [...prev.customFoods, food] }));
    setForm({ name: "", cal: "", p: "", c: "", f: "", serving: "" });
  }

  return (
    <>
      <p className="help" style={{ marginTop: 14 }}>
        Cargá acá los productos que comés seguido con los valores del envase o los que te pasó
        tu nutricionista. Tienen prioridad sobre la base general.
      </p>

      <div className="card">
        <div className="stack">
          <Field label="Nombre">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: barrita marca X"
            />
          </Field>
          <div className="grid-4">
            <Field label="kcal">
              <input
                type="number"
                inputMode="decimal"
                value={form.cal}
                onChange={(e) => setForm({ ...form, cal: e.target.value })}
              />
            </Field>
            <Field label="Prot">
              <input
                type="number"
                inputMode="decimal"
                value={form.p}
                onChange={(e) => setForm({ ...form, p: e.target.value })}
              />
            </Field>
            <Field label="Carb">
              <input
                type="number"
                inputMode="decimal"
                value={form.c}
                onChange={(e) => setForm({ ...form, c: e.target.value })}
              />
            </Field>
            <Field label="Grasa">
              <input
                type="number"
                inputMode="decimal"
                value={form.f}
                onChange={(e) => setForm({ ...form, f: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Porción habitual en gramos (opcional)">
            <input
              type="number"
              inputMode="decimal"
              value={form.serving}
              onChange={(e) => setForm({ ...form, serving: e.target.value })}
              placeholder="Ej: 30"
            />
          </Field>
          {error && (
            <p className="muted" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button className="btn accent" onClick={add}>
            Guardar alimento
          </button>
        </div>
      </div>

      <h2 className="section-title">
        Tus alimentos
        <small>{data.customFoods.length} cargados</small>
      </h2>

      {data.customFoods.length === 0 ? (
        <Empty title="Todavía no cargaste ninguno">
          Los valores van siempre por cada 100 g de producto.
        </Empty>
      ) : (
        <div className="list">
          {data.customFoods.map((f) => (
            <div className="row" key={f.name}>
              <div className="body">
                <div className="title">{f.name}</div>
                <div className="sub">
                  {f.cal} kcal · P {f.p} · C {f.c} · G {f.f} (100 g)
                </div>
              </div>
              <button
                className="x"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    customFoods: prev.customFoods.filter((x) => x.name !== f.name),
                  }))
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
