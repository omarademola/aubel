const { triage } = require("./_lib/pool");
const g = require("./_lib/guard");

// Colour code for the client. Differentials are never returned here.
module.exports = function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!g.originOk(req)) return res.status(403).json({ error: "Forbidden" });
  if (!g.rateLimit(`analyze:${g.clientIp(req)}`, 30, 60000)) return res.status(429).json({ error: "Too many requests" });
  const c = g.parseCase(req.body);
  if (!c) return res.status(400).json({ error: "Invalid request" });
  const { code, noOpen } = triage(c.species, c.ids, c.other);
  return res.status(200).json({ code, noOpen });
};
