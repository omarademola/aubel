const { signsFor } = require("./_lib/pool");
const g = require("./_lib/guard");

// Returns only the 2 to 10 signs the client may pick. The rest of the pool stays on the server.
module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  // Typing the address in a browser is allowed for this one harmless route, so you can check it works.
  if (!g.originOk(req) && (req.headers || {})["sec-fetch-site"] !== "none") return res.status(403).json({ error: "Forbidden" });
  if (!g.rateLimit(`signs:${g.clientIp(req)}`, 60, 60000)) return res.status(429).json({ error: "Too many requests" });
  const q = req.query || {};
  const base = g.parseBase({ species: q.species, age: q.age, poultryType: q.type });
  if (!base) return res.status(400).json({ error: "Invalid request" });
  return res.status(200).json({ signs: signsFor(base.species, base.poultryType, base.age) });
};
