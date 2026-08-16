import type { AppData } from "./types";

const TOKEN_KEY = "nutritracker:token";
const SKIP_KEY = "nutritracker:sync-skipped";

export interface RemoteStatus {
  configured: boolean;
  authed: boolean;
}

export interface RemotePayload {
  data: AppData | null;
  updatedAt: number;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function hasSkipped(): boolean {
  return localStorage.getItem(SKIP_KEY) === "1";
}

export function markSkipped(): void {
  localStorage.setItem(SKIP_KEY, "1");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchStatus(): Promise<RemoteStatus> {
  try {
    const res = await fetch("/api/status", { headers: authHeaders() });
    if (!res.ok) return { configured: false, authed: false };
    return (await res.json()) as RemoteStatus;
  } catch {
    return { configured: false, authed: false };
  }
}

export type LoginResult = "ok" | "wrong" | "unconfigured" | "error";

export async function login(password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status === 401) return "wrong";
    if (res.status === 503) return "unconfigured";
    if (!res.ok) return "error";
    const { token } = (await res.json()) as { token: string };
    setToken(token);
    return "ok";
  } catch {
    return "error";
  }
}

export function logout(): void {
  setToken(null);
}

export async function pull(): Promise<RemotePayload | null> {
  try {
    const res = await fetch("/api/data", { headers: authHeaders() });
    if (res.status === 401) {
      setToken(null);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as RemotePayload;
  } catch {
    return null;
  }
}

export type PushResult = "ok" | "stale" | "unauthorized" | "error";

export async function push(data: AppData, updatedAt: number): Promise<PushResult> {
  try {
    const res = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ data, updatedAt }),
    });
    if (res.status === 401) {
      setToken(null);
      return "unauthorized";
    }
    if (res.status === 409) return "stale";
    if (!res.ok) return "error";
    return "ok";
  } catch {
    return "error";
  }
}
