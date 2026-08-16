import React from "react";

/** Anillo de progreso de calorías. */
export function Ring({
  value,
  goal,
  label = "kcal",
}: {
  value: number;
  goal: number;
  label?: string;
}) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? value / goal : 0;
  const shown = Math.min(1, ratio);
  const over = ratio > 1.03;
  const left = Math.round(goal - value);

  return (
    <div className="ring">
      <svg viewBox="0 0 132 132">
        <circle className="track" cx="66" cy="66" r={r} fill="none" strokeWidth="11" />
        <circle
          className={`fill${over ? " over" : ""}`}
          cx="66"
          cy="66"
          r={r}
          fill="none"
          strokeWidth="11"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
        />
      </svg>
      <div className="ring-center">
        <div className="big">{Math.round(value)}</div>
        <div className="sub">
          {left >= 0 ? `quedan ${left}` : `+${Math.abs(left)} de más`} {label}
        </div>
      </div>
    </div>
  );
}

/** Barra de un macro con su meta. */
export function MacroBar({
  name,
  value,
  goal,
  color,
  unit = "g",
}: {
  name: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="macro">
      <span className="name">{name}</span>
      <span className="val">
        <b>{Math.round(value)}</b> / {Math.round(goal)}
        {unit}
      </span>
      <div className="bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function Stat({ v, k }: { v: React.ReactNode; k: string }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Gráfico de línea simple para el peso corporal. */
export function LineChart({
  points,
  targetPoints,
  format = (n: number) => String(n),
}: {
  points: { x: number; y: number }[];
  targetPoints?: { x: number; y: number }[];
  format?: (n: number) => string;
}) {
  const W = 320;
  const H = 150;
  const padL = 30;
  const padR = 8;
  const padT = 12;
  const padB = 20;

  const all = [...points, ...(targetPoints ?? [])];
  if (all.length === 0) return null;

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const pad = Math.max(0.5, (rawMax - rawMin) * 0.15);
  const minY = rawMin - pad;
  const maxY = rawMax + pad;

  const sx = (x: number) =>
    padL + ((x - minX) / Math.max(1, maxX - minX)) * (W - padL - padR);
  const sy = (y: number) =>
    padT + (1 - (y - minY) / Math.max(0.001, maxY - minY)) * (H - padT - padB);

  const path = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const area =
    points.length > 1
      ? `${path(points)} L${sx(points[points.length - 1].x).toFixed(1)},${H - padB} L${sx(
          points[0].x,
        ).toFixed(1)},${H - padB} Z`
      : "";

  const ticks = [maxY, (maxY + minY) / 2, minY];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} />
          <text
            x={padL - 6}
            y={sy(t) + 3.5}
            textAnchor="end"
            fontSize="9"
            fill="var(--ink-3)"
          >
            {format(t)}
          </text>
        </g>
      ))}
      {targetPoints && targetPoints.length > 1 && (
        <path className="target-line" d={path(targetPoints)} />
      )}
      {points.length > 1 && <path className="area" d={area} />}
      {points.length > 1 && <path className="line" d={path(points)} />}
      {points.map((p, i) => (
        <circle key={i} className="dot" cx={sx(p.x)} cy={sy(p.y)} r="3" />
      ))}
    </svg>
  );
}
