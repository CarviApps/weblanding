import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authed, configured, json, readStored, writeStored } from "./_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!configured()) return json(res, 503, { error: "not_configured" });
  if (!authed(req)) return json(res, 401, { error: "unauthorized" });

  if (req.method === "GET") {
    const stored = await readStored();
    if (!stored) return json(res, 200, { data: null, updatedAt: 0 });
    return json(res, 200, stored);
  }

  if (req.method === "PUT") {
    const { data, updatedAt } = req.body ?? {};
    if (data == null || typeof updatedAt !== "number") {
      return json(res, 400, { error: "bad_payload" });
    }

    // El que llega con datos más viejos no pisa lo que ya está guardado.
    const current = await readStored();
    if (current && current.updatedAt > updatedAt) {
      return json(res, 409, { error: "stale", ...current });
    }

    await writeStored({ data, updatedAt });
    return json(res, 200, { ok: true, updatedAt });
  }

  return json(res, 405, { error: "method_not_allowed" });
}
