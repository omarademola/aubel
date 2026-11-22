// SERVER ONLY. Input checking, rate limiting and escaping shared by every API route.
const { POOL } = require("./pool");

const SPECIES = ["Dog", "Cat", "Goat", "Sheep", "Cattle", "Rabbit", "Poultry"];
const AGES = ["young", "juvenile", "adult"];
const hits = new Map();

// Best-effort limit: serverless instances do not share memory, so this slows abuse but is not a hard guarantee.
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  return true;
}
const clientIp = (req) => String((req.headers && req.headers["x-forwarded-for"]) || (req.socket && req.socket.remoteAddress) || "unknown").split(",")[0].trim();

// Only your own website may call these routes from a browser.
function originOk(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || "https://aubel.vercel.app").split(",").map((s) => s.trim());
  const origin = req.headers && req.headers.origin;
  if (origin) return allowed.includes(origin);
  return (req.headers && req.headers["sec-fetch-site"]) === "same-origin";
}

const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function parseBase(b) {
  if (!b || typeof b !== "object") return null;
  if (!SPECIES.includes(b.species) || !AGES.includes(b.age)) return null;
  const poultryType = b.species === "Poultry" ? b.poultryType : "";
  if (b.species === "Poultry" && !["Broiler", "Layer"].includes(poultryType)) return null;
  return { species: b.species, age: b.age, poultryType };
}

function parseCase(b) {
  const base = parseBase(b);
  if (!base) return null;
  const key = base.species === "Poultry" ? base.poultryType : base.species;
  const allowed = (POOL[key] && POOL[key][base.age] ? POOL[key][base.age] : "").split(" ");
  if (!Array.isArray(b.ids) || b.ids.length > 12 || b.ids.some((id) => typeof id !== "string" || !allowed.includes(id))) return null;
  const weight = Number(b.weight);
  if (!(weight > 0 && weight <= 5000) || !["kg", "g"].includes(b.unit)) return null;
  const other = clean(b.other, 500);
  if (!b.ids.length && !other) return null;
  return { ...base, ids: [...new Set(b.ids)], other, weight, unit: b.unit };
}

module.exports = { SPECIES, AGES, rateLimit, clientIp, originOk, clean, esc, parseBase, parseCase };
