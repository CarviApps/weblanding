import React, { useCallback, useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "./state/store";
import Onboarding from "./screens/Onboarding";
import Today from "./screens/Today";
import Meals from "./screens/Meals";
import Gym from "./screens/Gym";
import Progress from "./screens/Progress";
import Profile from "./screens/Profile";
import {
  IconChart,
  IconDumbbell,
  IconHome,
  IconMoon,
  IconPlate,
  IconSun,
  IconUser,
} from "./components/icons";
import { prettyDateLong, todayISO } from "./lib/date";
import type { Tab } from "./lib/types";

const THEME_KEY = "nutritracker:theme";

type IconComponent = (p: { className?: string }) => React.ReactElement;

const TABS: { id: Tab; label: string; Icon: IconComponent }[] = [
  { id: "today", label: "Hoy", Icon: IconHome },
  { id: "meals", label: "Comer", Icon: IconPlate },
  { id: "gym", label: "Gym", Icon: IconDumbbell },
  { id: "progress", label: "Progreso", Icon: IconChart },
  { id: "profile", label: "Perfil", Icon: IconUser },
];

const TITLES: Record<Tab, { eyebrow: string; title: string }> = {
  today: { eyebrow: "", title: "" }, // se arma con la fecha
  meals: { eyebrow: "Registro", title: "¿Qué comiste?" },
  gym: { eyebrow: "Entrenamiento", title: "Gym" },
  progress: { eyebrow: "4 meses", title: "Tu progreso" },
  profile: { eyebrow: "Ajustes", title: "Perfil y metas" },
};

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return [theme, setTheme] as const;
}

function Shell() {
  const { profile, setData } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [theme, setTheme] = useTheme();
  const [toastMsg, setToastMsg] = useState("");
  const timerRef = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToastMsg(""), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const go = useCallback((t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  if (!profile) {
    return <Onboarding onDone={(p) => setData((prev) => ({ ...prev, profile: p }))} />;
  }

  const head =
    tab === "today"
      ? { eyebrow: prettyDateLong(todayISO()), title: `Hola, ${profile.name}` }
      : TITLES[tab];

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">{head.eyebrow}</div>
          <h1>{head.title}</h1>
        </div>
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main key={tab}>
        {tab === "today" && <Today go={go} />}
        {tab === "meals" && <Meals toast={toast} />}
        {tab === "gym" && <Gym toast={toast} />}
        {tab === "progress" && <Progress toast={toast} />}
        {tab === "profile" && <Profile toast={toast} theme={theme} setTheme={setTheme} />}
      </main>

      {toastMsg && <div className="toast">{toastMsg}</div>}

      <nav className="nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-current={tab === id ? "page" : undefined}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
