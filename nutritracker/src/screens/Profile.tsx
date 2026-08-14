import { useRef, useState } from "react";
import { Field } from "../components/ui";
import { useStore } from "../state/store";
import { ACTIVITY, GOALS } from "../lib/nutrition";
import { exportData, importData } from "../lib/storage";
import { prettyDate } from "../lib/date";
import type { ActivityKey, GoalKind, Sex } from "../lib/types";

export default function Profile({
  toast,
  theme,
  setTheme,
}: {
  toast: (m: string) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  const { data, setData, profile, targets, currentWeight } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!profile || !targets) return null;

  function patch(p: Partial<typeof profile>) {
    setData((prev) => ({ ...prev, profile: { ...prev.profile!, ...p } }));
  }

  return (
    <div className="screen">
      <h2 className="section-title" style={{ marginTop: 8 }}>
        Tus metas diarias
        <small>según {Math.round(currentWeight)} kg actuales</small>
      </h2>
      <div className="card">
        <div className="summary-line">
          <span>Gasto estimado</span>
          <b>{targets.tdee} kcal</b>
        </div>
        <div className="summary-line">
          <span>Calorías objetivo</span>
          <b>{targets.cal} kcal</b>
        </div>
        <div className="summary-line">
          <span>Proteína · carbos · grasas</span>
          <b>
            {targets.p} · {targets.c} · {targets.f} g
          </b>
        </div>
      </div>

      <h2 className="section-title">Ajustar a mano</h2>
      <div className="card">
        <div className="grid-2">
          <Field label="Calorías">
            <input
              type="number"
              inputMode="numeric"
              value={profile.manualCalories ?? ""}
              placeholder={String(targets.cal)}
              onChange={(e) =>
                patch({ manualCalories: e.target.value ? parseInt(e.target.value) : null })
              }
            />
          </Field>
          <Field label="Proteína (g)">
            <input
              type="number"
              inputMode="numeric"
              value={profile.manualProtein ?? ""}
              placeholder={String(targets.p)}
              onChange={(e) =>
                patch({ manualProtein: e.target.value ? parseInt(e.target.value) : null })
              }
            />
          </Field>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Dejalos vacíos para volver al cálculo automático. Si te pasó valores un
          nutricionista, cargalos acá.
        </p>
      </div>

      <h2 className="section-title">Tus datos</h2>
      <div className="card">
        <div className="stack">
          <Field label="Nombre">
            <input value={profile.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <div className="grid-2">
            <Field label="Edad">
              <input
                type="number"
                inputMode="numeric"
                value={profile.age}
                onChange={(e) => patch({ age: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Sexo biológico">
              <select value={profile.sex} onChange={(e) => patch({ sex: e.target.value as Sex })}>
                <option value="m">Masculino</option>
                <option value="f">Femenino</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Altura (cm)">
              <input
                type="number"
                inputMode="decimal"
                value={profile.heightCm}
                onChange={(e) => patch({ heightCm: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Peso objetivo (kg)">
              <input
                type="number"
                inputMode="decimal"
                value={profile.targetWeightKg}
                onChange={(e) => patch({ targetWeightKg: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <Field label="Nivel de actividad">
            <select
              value={profile.activity}
              onChange={(e) => patch({ activity: e.target.value as ActivityKey })}
            >
              {(Object.keys(ACTIVITY) as ActivityKey[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY[k].label} — {ACTIVITY[k].hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objetivo">
            <select
              value={profile.goal}
              onChange={(e) => patch({ goal: e.target.value as GoalKind })}
            >
              {(Object.keys(GOALS) as GoalKind[]).map((k) => (
                <option key={k} value={k}>
                  {GOALS[k].label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid-2">
            <Field label="Inicio del plan">
              <input
                type="date"
                value={profile.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Field>
            <Field label="Duración (semanas)">
              <input
                type="number"
                inputMode="numeric"
                value={profile.weeks}
                onChange={(e) => patch({ weeks: parseInt(e.target.value) || 17 })}
              />
            </Field>
          </div>
        </div>
      </div>

      <h2 className="section-title">Apariencia</h2>
      <div className="segmented">
        <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
          Claro
        </button>
        <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
          Oscuro
        </button>
      </div>

      <h2 className="section-title">
        Tus datos guardados
        <small>
          {data.entries.length} comidas · {data.workouts.length} entrenos
        </small>
      </h2>
      <div className="card">
        <p className="muted" style={{ marginBottom: 12 }}>
          Todo se guarda solo en este navegador. Si borrás los datos del sitio o cambiás de
          teléfono, se pierde: exportá una copia de vez en cuando.
        </p>
        <div className="row-btns" style={{ marginTop: 0 }}>
          <button className="btn ghost" onClick={() => exportData(data)}>
            Exportar
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const imported = await importData(file);
              setData(imported);
              toast("Datos importados");
            } catch {
              toast("No pude leer ese archivo");
            }
            e.target.value = "";
          }}
        />
      </div>

      <h2 className="section-title">Empezar de cero</h2>
      <div className="card">
        {confirmReset ? (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>
              Esto borra tu perfil, comidas, entrenos y pesadas. No se puede deshacer.
            </p>
            <div className="row-btns" style={{ marginTop: 0 }}>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setData({
                    profile: null,
                    customFoods: [],
                    entries: [],
                    routine: data.routine,
                    workouts: [],
                    weights: [],
                    favorites: [],
                  });
                  setConfirmReset(false);
                }}
              >
                Sí, borrar todo
              </button>
            </div>
          </>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            Borrar todos mis datos
          </button>
        )}
      </div>

      <p className="muted" style={{ marginTop: 22, textAlign: "center" }}>
        Plan iniciado el {prettyDate(profile.startDate)} · {profile.weeks} semanas
      </p>
    </div>
  );
}
