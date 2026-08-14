import { useMemo, useState } from "react";
import { Empty, Field, LineChart, Stat } from "../components/ui";
import { useStore } from "../state/store";
import { daysBetween, lastNDays, prettyDate, todayISO } from "../lib/date";
import { round1 } from "../lib/nutrition";
import type { WeightEntry } from "../lib/types";

export default function Progress({ toast }: { toast: (m: string) => void }) {
  const { data, setData, profile, targets, currentWeight } = useStore();
  const [kg, setKg] = useState("");
  const [waist, setWaist] = useState("");

  const sortedWeights = useMemo(
    () => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weights],
  );

  function saveWeight() {
    const value = parseFloat(kg);
    if (!Number.isFinite(value) || value <= 0) return;
    const entry: WeightEntry = {
      id: Math.random().toString(36).slice(2, 10),
      date: todayISO(),
      kg: value,
      waistCm: waist ? parseFloat(waist) : null,
    };
    setData((prev) => ({
      ...prev,
      // un registro por día: el nuevo pisa al anterior
      weights: [...prev.weights.filter((w) => w.date !== todayISO()), entry],
    }));
    setKg("");
    setWaist("");
    toast("Peso registrado");
  }

  // --- Serie del gráfico ---
  const chart = useMemo(() => {
    if (!profile) return null;
    const points = sortedWeights.map((w) => ({
      x: daysBetween(profile.startDate, w.date),
      y: w.kg,
    }));
    const totalDays = profile.weeks * 7;
    const target = [
      { x: 0, y: profile.startWeightKg },
      { x: totalDays, y: profile.targetWeightKg },
    ];
    return { points, target };
  }, [sortedWeights, profile]);

  // --- Últimos 14 días de calorías ---
  const days = useMemo(() => {
    const range = lastNDays(14);
    return range.map((d) => {
      const items = data.entries.filter((e) => e.date === d);
      return {
        date: d,
        cal: items.reduce((a, e) => a + e.cal, 0),
        p: items.reduce((a, e) => a + e.p, 0),
        logged: items.length > 0,
      };
    });
  }, [data.entries]);

  const avg = useMemo(() => {
    const logged = days.filter((d) => d.logged);
    if (logged.length === 0) return { cal: 0, p: 0, n: 0 };
    return {
      cal: Math.round(logged.reduce((a, d) => a + d.cal, 0) / logged.length),
      p: Math.round(logged.reduce((a, d) => a + d.p, 0) / logged.length),
      n: logged.length,
    };
  }, [days]);

  const delta = profile ? round1(currentWeight - profile.startWeightKg) : 0;
  const maxCal = Math.max(targets?.cal ?? 2000, ...days.map((d) => d.cal), 1);

  return (
    <div className="screen">
      <div className="card">
        <div className="section-title" style={{ margin: "0 0 10px" }}>
          Registrar peso de hoy
        </div>
        <div className="grid-2">
          <Field label="Peso (kg)">
            <input
              type="number"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder={String(round1(currentWeight))}
            />
          </Field>
          <Field label="Cintura (cm)">
            <input
              type="number"
              inputMode="decimal"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </Field>
        </div>
        <button className="btn accent" style={{ marginTop: 12 }} onClick={saveWeight}>
          Guardar
        </button>
        <p className="muted" style={{ marginTop: 10 }}>
          Pesate siempre en las mismas condiciones: a la mañana, en ayunas y después del baño.
        </p>
      </div>

      <div className="stats" style={{ marginTop: 12 }}>
        <Stat v={`${delta > 0 ? "+" : ""}${delta}`} k="kg vs inicio" />
        <Stat v={avg.cal || "—"} k="kcal prom. 14d" />
        <Stat v={avg.p ? `${avg.p}g` : "—"} k="prot. prom." />
      </div>

      <h2 className="section-title">
        Peso corporal
        <small>{sortedWeights.length} registros</small>
      </h2>

      {chart && chart.points.length >= 2 ? (
        <div className="card">
          <LineChart
            points={chart.points}
            targetPoints={chart.target}
            format={(n) => n.toFixed(1)}
          />
          <div className="chart-legend">
            <span>
              <i style={{ background: "var(--accent)" }} />
              Tu peso real
            </span>
            <span>
              <i style={{ background: "var(--ink-3)" }} />
              Ritmo objetivo
            </span>
          </div>
        </div>
      ) : (
        <Empty title="Necesito al menos dos pesadas">
          Registrá tu peso una o dos veces por semana y acá vas a ver la curva contra tu
          objetivo.
        </Empty>
      )}

      <h2 className="section-title">
        Calorías
        <small>últimos 14 días</small>
      </h2>
      <div className="card">
        <div className="bars">
          {days.map((d) => {
            const h = Math.max(3, (d.cal / maxCal) * 100);
            const hit = targets ? d.cal >= targets.cal * 0.85 && d.cal <= targets.cal * 1.1 : false;
            return (
              <div key={d.date} title={`${prettyDate(d.date)}: ${Math.round(d.cal)} kcal`}>
                <div className={`col${hit ? " hit" : ""}`} style={{ height: `${h}%` }} />
                <span className="lbl">{d.date.slice(8)}</span>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Las barras llenas son los días que caíste dentro del rango de tu meta
          {targets ? ` (${Math.round(targets.cal * 0.85)}–${Math.round(targets.cal * 1.1)} kcal)` : ""}.
        </p>
      </div>

      {sortedWeights.length > 0 && (
        <>
          <h2 className="section-title">Historial de pesadas</h2>
          <div className="list">
            {[...sortedWeights].reverse().slice(0, 12).map((w) => (
              <div className="row" key={w.id}>
                <div className="body">
                  <div className="title" style={{ textTransform: "none" }}>
                    {w.kg} kg
                  </div>
                  <div className="sub">
                    {prettyDate(w.date)}
                    {w.waistCm ? ` · cintura ${w.waistCm} cm` : ""}
                  </div>
                </div>
                <button
                  className="x"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      weights: prev.weights.filter((x) => x.id !== w.id),
                    }))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
