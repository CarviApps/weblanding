import { useMemo, useState } from "react";
import { Field } from "../components/ui";
import { ACTIVITY, GOALS, computeTargets } from "../lib/nutrition";
import { todayISO } from "../lib/date";
import type { ActivityKey, GoalKind, Profile, Sex } from "../lib/types";

const STEPS = 5;

export default function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex>("m");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState("");
  const [activity, setActivity] = useState<ActivityKey>("mod");
  const [goal, setGoal] = useState<GoalKind>("recomp");

  const profile = useMemo<Profile>(
    () => ({
      name: name.trim() || "Vos",
      sex,
      age: parseInt(age) || 25,
      heightCm: parseFloat(heightCm) || 175,
      startWeightKg: parseFloat(weight) || 75,
      targetWeightKg: parseFloat(target) || parseFloat(weight) || 75,
      activity,
      goal,
      startDate: todayISO(),
      weeks: 17,
      manualCalories: null,
      manualProtein: null,
    }),
    [name, sex, age, heightCm, weight, target, activity, goal],
  );

  const targets = useMemo(
    () => computeTargets(profile, profile.startWeightKg),
    [profile],
  );

  const canContinue =
    step === 0
      ? age.trim() !== ""
      : step === 1
        ? heightCm.trim() !== "" && weight.trim() !== ""
        : true;

  return (
    <div className="onboard">
      <div className="eyebrow">
        Paso {step + 1} de {STEPS}
      </div>

      {step === 0 && (
        <>
          <h1>Armemos tu plan</h1>
          <p className="lead">
            Cuatro meses alcanzan de sobra para un cambio real. Primero necesito algunos
            datos para calcular tus calorías y tu proteína.
          </p>
          <div className="stack">
            <Field label="Tu nombre (opcional)">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mateo" />
            </Field>
            <div className="grid-2">
              <Field label="Edad">
                <input
                  type="number"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="24"
                />
              </Field>
              <Field label="Sexo biológico">
                <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                  <option value="m">Masculino</option>
                  <option value="f">Femenino</option>
                </select>
              </Field>
            </div>
            <p className="muted">
              El sexo biológico solo se usa en la fórmula de gasto energético (Mifflin-St
              Jeor).
            </p>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1>Tus números de hoy</h1>
          <p className="lead">Con esto calculo tu gasto diario y el ritmo del plan.</p>
          <div className="stack">
            <div className="grid-2">
              <Field label="Altura (cm)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="178"
                />
              </Field>
              <Field label="Peso actual (kg)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="78"
                />
              </Field>
            </div>
            <Field label="Peso objetivo en 4 meses (kg)">
              <input
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="72"
              />
            </Field>
            <p className="muted">
              Si tu meta es recomposición podés poner el mismo peso: el objetivo es cambiar
              la composición, no el número de la balanza.
            </p>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1>¿Cuánto te movés?</h1>
          <p className="lead">Contá tu semana promedio, no la mejor.</p>
          {(Object.keys(ACTIVITY) as ActivityKey[]).map((k) => (
            <button
              key={k}
              className="opt"
              aria-pressed={activity === k}
              onClick={() => setActivity(k)}
            >
              <div className="t">{ACTIVITY[k].label}</div>
              <div className="d">{ACTIVITY[k].hint}</div>
            </button>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <h1>¿Qué buscás?</h1>
          <p className="lead">Esto define el déficit o el superávit de calorías.</p>
          {(Object.keys(GOALS) as GoalKind[]).map((k) => (
            <button key={k} className="opt" aria-pressed={goal === k} onClick={() => setGoal(k)}>
              <div className="t">{GOALS[k].label}</div>
              <div className="d">{GOALS[k].hint}</div>
            </button>
          ))}
        </>
      )}

      {step === 4 && (
        <>
          <h1>Tus metas diarias</h1>
          <p className="lead">
            Calculado a partir de tus datos. Podés ajustarlo cuando quieras desde Perfil.
          </p>
          <div className="card">
            <div className="summary-line">
              <span>Gasto estimado (TDEE)</span>
              <b>{targets.tdee} kcal</b>
            </div>
            <div className="summary-line">
              <span>Calorías objetivo</span>
              <b>{targets.cal} kcal</b>
            </div>
            <div className="summary-line">
              <span>Proteína</span>
              <b>{targets.p} g</b>
            </div>
            <div className="summary-line">
              <span>Carbohidratos</span>
              <b>{targets.c} g</b>
            </div>
            <div className="summary-line">
              <span>Grasas</span>
              <b>{targets.f} g</b>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            Son una guía, no una receta médica. Si entrenás fuerte, dormís mal o tenés alguna
            condición de salud, consultá con un profesional.
          </p>
        </>
      )}

      <div className="row-btns" style={{ marginTop: 26 }}>
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>
            Atrás
          </button>
        )}
        {step < STEPS - 1 ? (
          <button
            className="btn accent"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
          >
            Seguir
          </button>
        ) : (
          <button className="btn accent" onClick={() => onDone(profile)}>
            Empezar los 4 meses
          </button>
        )}
      </div>
    </div>
  );
}
