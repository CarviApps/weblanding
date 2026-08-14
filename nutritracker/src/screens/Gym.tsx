import { useMemo, useState } from "react";
import { Empty, Field, Segmented, Stat } from "../components/ui";
import { useStore } from "../state/store";
import { DAYS, addDays, prettyDate, todayDayName, todayISO } from "../lib/date";
import { PRESETS, presetToRoutine } from "../lib/presets";
import type { Exercise, LoggedSet, WorkoutSession } from "../lib/types";

type Mode = "hoy" | "rutina" | "historial";

interface SetState extends LoggedSet {
  done: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseSetCount(s: string): number {
  const n = parseInt(s);
  return Number.isFinite(n) && n > 0 && n <= 12 ? n : 3;
}

export default function Gym({ toast }: { toast: (m: string) => void }) {
  const [mode, setMode] = useState<Mode>("hoy");
  return (
    <div className="screen">
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { id: "hoy", label: "Hoy" },
          { id: "rutina", label: "Rutina" },
          { id: "historial", label: "Historial" },
        ]}
      />
      {mode === "hoy" && <TodayWorkout toast={toast} goPlan={() => setMode("rutina")} />}
      {mode === "rutina" && <RoutineEditor toast={toast} />}
      {mode === "historial" && <History />}
    </div>
  );
}

/* -------------------------------------------------------------- */

function TodayWorkout({ toast, goPlan }: { toast: (m: string) => void; goPlan: () => void }) {
  const { data, setData } = useStore();
  const day = todayDayName();
  const planned = data.routine[day] ?? [];

  const [sets, setSets] = useState<Record<string, SetState[]>>(() =>
    Object.fromEntries(
      planned.map((ex) => [
        ex.id,
        Array.from({ length: parseSetCount(ex.sets) }, () => ({
          reps: ex.reps ?? "",
          weight: "",
          done: false,
        })),
      ]),
    ),
  );

  /** Mejor serie registrada para un ejercicio, para saber contra qué competir. */
  const lastBest = useMemo(() => {
    const map: Record<string, { weight: number; reps: string; date: string }> = {};
    for (const s of data.workouts) {
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          const w = parseFloat(set.weight);
          if (!Number.isFinite(w)) continue;
          const prev = map[ex.name];
          if (!prev || w > prev.weight) map[ex.name] = { weight: w, reps: set.reps, date: s.date };
        }
      }
    }
    return map;
  }, [data.workouts]);

  const alreadyLogged = data.workouts.find((w) => w.date === todayISO());

  function patchSet(exId: string, i: number, p: Partial<SetState>) {
    setSets((prev) => ({
      ...prev,
      [exId]: (prev[exId] ?? []).map((s, idx) => (idx === i ? { ...s, ...p } : s)),
    }));
  }

  function addSet(exId: string) {
    setSets((prev) => {
      const cur = prev[exId] ?? [];
      const last = cur[cur.length - 1];
      return {
        ...prev,
        [exId]: [...cur, { reps: last?.reps ?? "", weight: last?.weight ?? "", done: false }],
      };
    });
  }

  function save() {
    const exercises = planned
      .map((ex) => ({
        name: ex.name,
        sets: (sets[ex.id] ?? []).filter((s) => s.done).map(({ reps, weight }) => ({ reps, weight })),
      }))
      .filter((e) => e.sets.length > 0);

    if (exercises.length === 0) {
      toast("Marcá al menos una serie como hecha");
      return;
    }

    const volume = exercises.reduce(
      (acc, ex) =>
        acc +
        ex.sets.reduce((a, s) => {
          const w = parseFloat(s.weight) || 0;
          const r = parseFloat(s.reps) || 0;
          return a + w * r;
        }, 0),
      0,
    );

    const session: WorkoutSession = {
      id: newId(),
      date: todayISO(),
      day,
      exercises,
      volume: Math.round(volume),
    };

    setData((prev) => ({
      ...prev,
      // si ya había una sesión de hoy, la reemplazamos
      workouts: [...prev.workouts.filter((w) => w.date !== todayISO()), session],
    }));
    toast(`Sesión guardada · ${Math.round(volume)} kg de volumen`);
  }

  const doneCount = Object.values(sets)
    .flat()
    .filter((s) => s.done).length;

  if (planned.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <Empty title={`${day}: día libre`}>
          No tenés ejercicios cargados para hoy. Podés armar tu semana en «Rutina».
        </Empty>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={goPlan}>
          Armar rutina
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="section-title">
        {day}
        <small>
          {doneCount} series hechas{alreadyLogged ? " · ya guardaste hoy" : ""}
        </small>
      </div>

      <div className="stack">
        {planned.map((ex) => {
          const best = lastBest[ex.name];
          return (
            <div className="ex" key={ex.id}>
              <div className="ex-head">
                <div className="name">
                  {ex.name}
                  <div className="meta">
                    objetivo {ex.sets || "-"} × {ex.reps || "-"}
                    {best ? ` · récord ${best.weight} kg (${prettyDate(best.date)})` : ""}
                  </div>
                </div>
              </div>

              <div className="set-legend">
                <span>#</span>
                <span>Reps</span>
                <span>Kg</span>
                <span>Ok</span>
              </div>

              {(sets[ex.id] ?? []).map((s, i) => (
                <div className="set-row" key={i}>
                  <span className="n">{i + 1}</span>
                  <input
                    inputMode="numeric"
                    value={s.reps}
                    placeholder={ex.reps || "-"}
                    onChange={(e) => patchSet(ex.id, i, { reps: e.target.value })}
                  />
                  <input
                    inputMode="decimal"
                    value={s.weight}
                    placeholder={best ? String(best.weight) : "kg"}
                    onChange={(e) => patchSet(ex.id, i, { weight: e.target.value })}
                  />
                  <button
                    className="ok"
                    aria-pressed={s.done}
                    aria-label="Marcar serie"
                    onClick={() => patchSet(ex.id, i, { done: !s.done })}
                  >
                    ✓
                  </button>
                </div>
              ))}

              <button
                className="btn sm ghost"
                style={{ marginTop: 6 }}
                onClick={() => addSet(ex.id)}
              >
                + serie
              </button>
            </div>
          );
        })}
      </div>

      <button className="btn accent" style={{ marginTop: 14 }} onClick={save}>
        {alreadyLogged ? "Actualizar sesión de hoy" : "Guardar sesión"}
      </button>
    </>
  );
}

/* -------------------------------------------------------------- */

function RoutineEditor({ toast }: { toast: (m: string) => void }) {
  const { data, setData } = useStore();
  const [day, setDay] = useState<string>(todayDayName());
  const [form, setForm] = useState({ name: "", sets: "", reps: "" });

  const list = data.routine[day] ?? [];

  function add() {
    if (!form.name.trim()) return;
    const ex: Exercise = {
      id: newId(),
      name: form.name.trim().toLowerCase(),
      sets: form.sets || "3",
      reps: form.reps || "10",
    };
    setData((prev) => ({
      ...prev,
      routine: { ...prev.routine, [day]: [...(prev.routine[day] ?? []), ex] },
    }));
    setForm({ name: "", sets: "", reps: "" });
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      routine: { ...prev.routine, [day]: (prev.routine[day] ?? []).filter((e) => e.id !== id) },
    }));
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setData((prev) => ({ ...prev, routine: presetToRoutine(preset, prev.routine) }));
    toast(`Rutina «${preset.name}» cargada`);
  }

  const totalExercises = Object.values(data.routine).flat().length;

  return (
    <>
      <div className="chips scroll" style={{ margin: "16px 0 14px" }}>
        {DAYS.map((d) => {
          const n = (data.routine[d] ?? []).length;
          return (
            <button key={d} className="chip" aria-pressed={day === d} onClick={() => setDay(d)}>
              {d.slice(0, 3)}
              {n > 0 ? ` · ${n}` : ""}
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="stack">
          <Field label="Ejercicio">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: sentadilla"
            />
          </Field>
          <div className="grid-2">
            <Field label="Series">
              <input
                inputMode="numeric"
                value={form.sets}
                onChange={(e) => setForm({ ...form, sets: e.target.value })}
                placeholder="4"
              />
            </Field>
            <Field label="Reps">
              <input
                inputMode="numeric"
                value={form.reps}
                onChange={(e) => setForm({ ...form, reps: e.target.value })}
                placeholder="8"
              />
            </Field>
          </div>
          <button className="btn accent" onClick={add}>
            Agregar a {day}
          </button>
        </div>
      </div>

      <h2 className="section-title">
        {day}
        <small>{list.length} ejercicios</small>
      </h2>

      {list.length === 0 ? (
        <Empty title="Día sin ejercicios">Descanso o todavía sin cargar.</Empty>
      ) : (
        <div className="list">
          {list.map((e) => (
            <div className="row" key={e.id}>
              <div className="body">
                <div className="title">{e.name}</div>
                <div className="sub">
                  {e.sets} series × {e.reps} reps
                </div>
              </div>
              <button className="x" onClick={() => remove(e.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {totalExercises === 0 && (
        <>
          <h2 className="section-title">Empezar con una rutina armada</h2>
          <div className="stack">
            {PRESETS.map((p) => (
              <button key={p.id} className="opt" onClick={() => applyPreset(p.id)}>
                <div className="t">{p.name}</div>
                <div className="d">{p.hint}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------- */

function History() {
  const { data } = useStore();
  const sessions = useMemo(
    () => [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)),
    [data.workouts],
  );

  const stats = useMemo(() => {
    const totalVolume = sessions.reduce((a, s) => a + s.volume, 0);
    const last30 = sessions.filter((s) => s.date >= addDays(todayISO(), -29));
    return {
      total: sessions.length,
      last30: last30.length,
      volume: totalVolume,
    };
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <Empty title="Sin sesiones todavía">
          Cuando guardes tu primer entrenamiento vas a ver acá el historial y tus récords.
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="stats" style={{ marginTop: 16 }}>
        <Stat v={stats.total} k="sesiones" />
        <Stat v={stats.last30} k="últimos 30 d" />
        <Stat v={`${(stats.volume / 1000).toFixed(1)}t`} k="volumen total" />
      </div>

      <h2 className="section-title">Historial</h2>
      <div className="list">
        {sessions.map((s) => (
          <div className="row" key={s.id}>
            <div className="body">
              <div className="title" style={{ textTransform: "none" }}>
                {s.day} · {prettyDate(s.date)}
              </div>
              <div className="sub">
                {s.exercises.length} ejercicios ·{" "}
                {s.exercises.reduce((a, e) => a + e.sets.length, 0)} series
              </div>
            </div>
            <span className="kcal">{s.volume} kg</span>
          </div>
        ))}
      </div>
    </>
  );
}
