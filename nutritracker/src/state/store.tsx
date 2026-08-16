import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_FOODS } from "../lib/foods";
import { computeTargets, type Targets } from "../lib/nutrition";
import { emptyData, loadPersisted, savePersisted } from "../lib/storage";
import { todayISO } from "../lib/date";
import * as sync from "../lib/sync";
import type { AppData, Food, Profile } from "../lib/types";

export type SyncState = "off" | "idle" | "syncing" | "error";

interface Snapshot {
  data: AppData;
  updatedAt: number;
}

interface StoreValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  replaceAll: (data: AppData) => void;
  allFoods: Food[];
  currentWeight: number;
  targets: Targets | null;
  profile: Profile | null;
  /** true una vez que leímos localStorage y consultamos el estado del servidor. */
  ready: boolean;

  // --- sincronización ---
  syncConfigured: boolean;
  signedIn: boolean;
  syncState: SyncState;
  lastSyncedAt: number | null;
  signIn: (password: string) => Promise<sync.LoginResult>;
  signOut: () => void;
  syncNow: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const PUSH_DEBOUNCE_MS = 1500;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(() => ({ data: emptyData(), updatedAt: 0 }));
  const [ready, setReady] = useState(false);
  const [syncConfigured, setSyncConfigured] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("off");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Bandera de estado, no ref: un ref se pondría en true dentro del mismo
  // commit y el efecto de guardado escribiría el snapshot vacío inicial
  // encima de lo que había en disco.
  const [hydrated, setHydrated] = useState(false);
  const pushedAt = useRef(0);
  const pushTimer = useRef<number | undefined>(undefined);
  /** Snapshot vivo, para poder empujar sin re-crear los efectos. */
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // Toda mutación del usuario pasa por acá y refresca la marca de tiempo.
  const setData = useCallback<React.Dispatch<React.SetStateAction<AppData>>>((action) => {
    setSnap((prev) => {
      const next =
        typeof action === "function" ? (action as (d: AppData) => AppData)(prev.data) : action;
      if (next === prev.data) return prev;
      return { data: next, updatedAt: Date.now() };
    });
  }, []);

  /** Reemplazo total sin marcar cambios locales nuevos (import / llegada remota). */
  const adopt = useCallback((data: AppData, updatedAt: number) => {
    pushedAt.current = updatedAt;
    setSnap({ data, updatedAt });
  }, []);

  const replaceAll = useCallback((data: AppData) => {
    setSnap({ data, updatedAt: Date.now() });
  }, []);

  const doPush = useCallback(async () => {
    const { data, updatedAt } = snapRef.current;
    if (updatedAt <= pushedAt.current) return;
    setSyncState("syncing");
    const result = await sync.push(data, updatedAt);
    if (result === "ok") {
      pushedAt.current = updatedAt;
      setLastSyncedAt(Date.now());
      setSyncState("idle");
    } else if (result === "unauthorized") {
      setSignedIn(false);
      setSyncState("off");
    } else if (result === "stale") {
      // El otro dispositivo guardó algo más nuevo: lo traemos.
      const remote = await sync.pull();
      if (remote?.data) {
        adopt(remote.data, remote.updatedAt);
        setLastSyncedAt(Date.now());
        setSyncState("idle");
      } else {
        setSyncState("error");
      }
    } else {
      setSyncState("error");
    }
  }, [adopt]);

  const doPull = useCallback(async () => {
    setSyncState("syncing");
    const remote = await sync.pull();
    if (!remote) {
      setSyncState(sync.getToken() ? "error" : "off");
      setSignedIn(Boolean(sync.getToken()));
      return;
    }
    const local = snapRef.current;
    if (remote.data && remote.updatedAt > local.updatedAt) {
      adopt(remote.data, remote.updatedAt);
      setLastSyncedAt(Date.now());
      setSyncState("idle");
      return;
    }
    if (local.updatedAt > remote.updatedAt) {
      await doPush();
      return;
    }
    pushedAt.current = local.updatedAt;
    setLastSyncedAt(Date.now());
    setSyncState("idle");
  }, [adopt, doPush]);

  // --- arranque: local primero, después el servidor ---
  useEffect(() => {
    const persisted = loadPersisted();
    setSnap(persisted);
    snapRef.current = persisted;
    pushedAt.current = persisted.updatedAt;
    setHydrated(true);

    (async () => {
      const status = await sync.fetchStatus();
      setSyncConfigured(status.configured);
      setSignedIn(status.authed);
      if (status.authed) {
        await doPull();
      } else {
        setSyncState("off");
        if (!status.configured) sync.logout();
      }
      setReady(true);
    })();
    // Sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- persistencia local en cada cambio ---
  useEffect(() => {
    if (!hydrated) return;
    savePersisted(snap);
  }, [snap, hydrated]);

  // --- empuje al servidor, con debounce ---
  useEffect(() => {
    if (!hydrated || !signedIn) return;
    if (snap.updatedAt <= pushedAt.current) return;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => void doPush(), PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(pushTimer.current);
  }, [snap, hydrated, signedIn, doPush]);

  // --- al volver a la pestaña, buscamos lo que haya cargado el otro aparato ---
  useEffect(() => {
    if (!signedIn) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void doPull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedIn, doPull]);

  const signIn = useCallback(
    async (password: string) => {
      const result = await sync.login(password);
      if (result === "ok") {
        setSignedIn(true);
        await doPull();
      }
      return result;
    },
    [doPull],
  );

  const signOut = useCallback(() => {
    sync.logout();
    setSignedIn(false);
    setSyncState("off");
    setLastSyncedAt(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!signedIn) return;
    await doPull();
  }, [signedIn, doPull]);

  const allFoods = useMemo<Food[]>(
    () => [...snap.data.customFoods.map((f) => ({ ...f, custom: true })), ...DEFAULT_FOODS],
    [snap.data.customFoods],
  );

  const currentWeight = useMemo(() => {
    if (snap.data.weights.length > 0) {
      const sorted = [...snap.data.weights].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[sorted.length - 1].kg;
    }
    return snap.data.profile?.startWeightKg ?? 70;
  }, [snap.data.weights, snap.data.profile]);

  const targets = useMemo(
    () => (snap.data.profile ? computeTargets(snap.data.profile, currentWeight) : null),
    [snap.data.profile, currentWeight],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data: snap.data,
      setData,
      replaceAll,
      allFoods,
      currentWeight,
      targets,
      profile: snap.data.profile,
      ready,
      syncConfigured,
      signedIn,
      syncState,
      lastSyncedAt,
      signIn,
      signOut,
      syncNow,
    }),
    [
      snap.data,
      setData,
      replaceAll,
      allFoods,
      currentWeight,
      targets,
      ready,
      syncConfigured,
      signedIn,
      syncState,
      lastSyncedAt,
      signIn,
      signOut,
      syncNow,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/** Totales de macros para una fecha. */
export function useDayTotals(dateISO: string = todayISO()) {
  const { data } = useStore();
  return useMemo(() => {
    const dayEntries = data.entries.filter((e) => e.date === dateISO);
    const totals = dayEntries.reduce(
      (acc, e) => ({
        cal: acc.cal + e.cal,
        p: acc.p + e.p,
        c: acc.c + e.c,
        f: acc.f + e.f,
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
    return { entries: dayEntries, totals };
  }, [data.entries, dateISO]);
}
