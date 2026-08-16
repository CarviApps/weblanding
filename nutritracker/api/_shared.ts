import crypto from "node:crypto";
import { list, put } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Sincronización de una sola cuenta protegida por contraseña.
 *
 * - La contraseña vive en la variable de entorno APP_PASSWORD y nunca viaja al
 *   bundle del cliente.
 * - El token de sesión es un HMAC firmado con una clave derivada de esa misma
 *   contraseña, así el usuario sólo tiene que configurar una variable.
 * - El contenido guardado en Blob va cifrado con AES-256-GCM: aunque la URL del
 *   blob se filtre, el archivo no se puede leer sin la contraseña.
 */

const BLOB_KEY = "nutritracker/data.enc";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 180 días

export function password(): string | null {
  const p = process.env.APP_PASSWORD;
  return p && p.length > 0 ? p : null;
}

function key(): Buffer {
  // Clave de 32 bytes derivada de la contraseña.
  return crypto.createHash("sha256").update(String(process.env.APP_PASSWORD)).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** Comparación en tiempo constante, tolerante a longitudes distintas. */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function issueToken(): string {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const body = b64url(Buffer.from(payload));
  const sig = b64url(crypto.createHmac("sha256", key()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = b64url(crypto.createHmac("sha256", key()).update(body).digest());
  if (!safeEqual(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function authed(req: VercelRequest): boolean {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return false;
  return verifyToken(header.slice(7));
}

// ---------------------------------------------------------------- cifrado

function encrypt(plain: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

function decrypt(buf: Buffer): string {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------------- storage

export interface Stored {
  data: unknown;
  updatedAt: number;
}

export async function readStored(): Promise<Stored | null> {
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  const blob = blobs.find((b) => b.pathname === BLOB_KEY);
  if (!blob) return null;
  // `cache: no-store` evita leer una versión vieja de la CDN tras un guardado.
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  const raw = Buffer.from(await res.arrayBuffer());
  try {
    return JSON.parse(decrypt(raw)) as Stored;
  } catch {
    return null;
  }
}

export async function writeStored(stored: Stored): Promise<void> {
  await put(BLOB_KEY, encrypt(JSON.stringify(stored)), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 0,
  });
}

// ---------------------------------------------------------------- helpers

export function configured(): boolean {
  return password() !== null && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.json(body);
}
