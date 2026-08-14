import { useMemo } from "react";
import { Empty, MacroBar, Ring, Stat } from "../components/ui";
import { useDayTotals, useStore } from "../state/store";
import { addDays, daysBetween, prettyDateLong, todayDayName, todayISO } from "../lib/date";
import { round1 } from "../lib/nutrition";
import type { MealSlot, Tab } from "../lib/types";

const SLOT_ORDER: MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena", "snack"];

/** Días consecutivos con al menos un registro, contando desde hoy o ayer. */
function streakOf(dates: Set<string>): number {
  const today = todayISO();
  let cursor = dates.has(today) ? today : addDays(today, -1);
  if (!dates.has(cursor)) return 0;
  let n = 0;
  while (dates.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export default function Today({ go }: { go: (t: Tab) => void }) {
  const { data, setData, targets, currentWeight, profile } = useStore();
  const { entries, totals } = useDayTotals();

  const streak = useMemo(
    () => streakOf(new Set(data.entries.map((e) => e.date))),
    [data.entries],
  );

  const workoutsThisWeek = useMemo(() => {
    const from = addDays(todayISO(), -6);
    return data.workouts.filter((w) => w.date >= from).length;
  }, [data.workouts]);

  const trainedToday = data.workouts.some((w) => w.date === todayISO());
  const todayPlanned = data.routine[todayDayName()] ?? [];

  const plan = useMemo(() => {
    if (!profile) return null;
    const elapsed = Math.max(0, daysBetween(profile.startDate, todayISO()));
    const totalDays = profile.weeks * 7;
    const week = Math.min(profile.weeks, Math.floor(elapsed / 7) + 1);
    return {
      week,
      elapsed,
      totalDays,
      pct: Math.min(100, (elapsed / totalDays) * 100),
    };
  }, [profile]);

  const grouped = useMemo(() => {
    return SLOT_ORDER.map((slot) => ({
      slot,
      items: entries.filter((e) => e.slot === slot),
    })).filter((g) => g.items.length > 0);
  }, [entries]);

  if (!targets) return null;

  return (
    <div className="screen">
      <div className="card">
        <div className="hero">
          <Ring value={totals.cal} goal={targets.cal} />
          <div className="hero-side">
            <MacroBar
              name="Proteína"
              value={totals.p}
              goal={targets.p}
              color="var(--prot)"
            />
            <MacroBar name="Carbos" value={totals.c} goal={targets.c} color="var(--carb)" />
            <MacroBar name="Grasas" value={totals.f} goal={targets.f} color="var(--fat)" />
          </div>
        </div>
        <button className="btn accent" style={{ marginTop: 15 }} onClick={() => go("meals")}>
          Registrar comida
        </button>
      </div>

      {plan && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ margin: 0 }}>
            Semana {plan.week} de {profile!.weeks}
            <small>{Math.max(0, plan.totalDays - plan.elapsed)} días restantes</small>
          </div>
          <div className="plan-bar">
            <span style={{ width: `${plan.pct}%` }} />
          </div>
          <div className="muted">
            Objetivo: {profile!.targetWeightKg} kg · hoy estás en {round1(currentWeight)} kg
          </div>
        </div>
      )}

      <div className="stats" style={{ marginTop: 12 }}>
        <Stat v={`${streak}d`} k="racha" />
        <Stat v={workoutsThisWeek} k="entrenos / 7d" />
        <Stat v={`${round1(currentWeight)}`} k="kg actual" />
      </div>

      <h2 className="section-title">
        Entreno de hoy
        <small>{todayDayName()}</small>
      </h2>
      <button
        className="row"
        style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
        onClick={() => go("gym")}
      >
        <div className="body">
          <div className="title" style={{ textTransform: "none" }}>
            {trainedToday
              ? "Sesión completada"
              : todayPlanned.length > 0
                ? `${todayPlanned.length} ejercicios planificados`
                : "Día libre"}
          </div>
          <div className="sub">
            {trainedToday
              ? "Buen trabajo. Tocá para ver el detalle."
              : todayPlanned.length > 0
                ? todayPlanned.map((e) => e.name).join(" · ")
                : "Cargá tu rutina en la pestaña Gym"}
          </div>
        </div>
        <span className="kcal">{trainedToday ? "✓" : "›"}</span>
      </button>

      <h2 className="section-title">
        Comidas de hoy
        <small>{prettyDateLong(todayISO())}</small>
      </h2>

      {grouped.length === 0 ? (
        <Empty title="Todavía no registraste nada">
          Tocá «Registrar comida» y escribí o dictá lo que comiste.
        </Empty>
      ) : (
        grouped.map((g) => (
          <div className="meal-group" key={g.slot}>
            <div className="meal-head">
              <span className="name">{g.slot}</span>
              <span className="kcal">
                {Math.round(g.items.reduce((a, e) => a + e.cal, 0))} kcal
              </span>
            </div>
            <div className="list">
              {g.items.map((e) => (
                <div className="row" key={e.id}>
                  <div className="body">
                    <div className="title">{e.name}</div>
                    <div className="sub">
                      {e.grams} g · P {e.p} · C {e.c} · G {e.f}
                    </div>
                  </div>
                  <span className="kcal">{Math.round(e.cal)}</span>
                  <button
                    className="x"
                    aria-label={`Borrar ${e.name}`}
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        entries: prev.entries.filter((x) => x.id !== e.id),
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
