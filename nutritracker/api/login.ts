import type { VercelRequest, VercelResponse } from "@vercel/node";
import { configured, issueToken, json, password, safeEqual } from "./_shared.js";

/** Frena un poco los intentos por fuerza bruta contra la contraseña. */
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  if (!configured()) return json(res, 503, { error: "not_configured" });

  const given = typeof req.body?.password === "string" ? req.body.password : "";
  if (!given) return json(res, 400, { error: "missing_password" });

  if (!safeEqual(given, password() as string)) {
    await delay(600);
    return json(res, 401, { error: "wrong_password" });
  }

  return json(res, 200, { token: issueToken() });
}
