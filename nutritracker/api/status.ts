import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authed, configured, json } from "./_shared.js";

/** Le dice al cliente si la sincronización está lista y si su token sigue vivo. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return json(res, 200, { configured: configured(), authed: authed(req) });
}
