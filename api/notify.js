const { triage, differentials, SIGNS } = require("./_lib/pool");
const g = require("./_lib/guard");
const { buildEmail } = require("./_lib/mail");

let cached;
const smtp = () => {
  if (!cached) cached = require("nodemailer").createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  return cached;
};

// Private email to the vet. Only a logged-in, verified client can trigger it, and the owner and animal details
// are read from the database with THEIR OWN token, so nothing about them can be forged in the request.
function make(deps = {}) {
  const doFetch = deps.fetch || fetch;
  const transporter = deps.transporter || { sendMail: (m) => smtp().sendMail(m) };
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!g.originOk(req)) return res.status(403).json({ error: "Forbidden" });
    if (!g.rateLimit(`notify-ip:${g.clientIp(req)}`, 10, 60000)) return res.status(429).json({ error: "Too many requests" });
    const token = String((req.headers && req.headers.authorization) || "").replace(/^Bearer\s+/i, "");
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SMTP_USER, SMTP_PASS, ADMIN_EMAIL } = process.env;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) return res.status(500).json({ error: "Not configured" });
    if (token.length < 20) return res.status(401).json({ error: "Please log in" });
    try {
      const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` };
      const who = await doFetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
      if (!who.ok) return res.status(401).json({ error: "Please log in" });
      const user = await who.json();
      if (!user.id || !user.email_confirmed_at) return res.status(401).json({ error: "Please verify your email" });
      if (!g.rateLimit(`notify-user:${user.id}`, 5, 600000)) return res.status(429).json({ error: "Too many requests" });
      const c = g.parseCase(req.body);
      if (!c) return res.status(400).json({ error: "Invalid request" });
      const [prof, pets] = await Promise.all([
        doFetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,phone,address`, { headers }).then((r) => r.json()),
        doFetch(`${SUPABASE_URL}/rest/v1/pets?owner_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=1&select=*`, { headers }).then((r) => r.json()),
      ]);
      const { code, noOpen } = triage(c.species, c.ids, c.other);
      const diffs = differentials(c.species, c.age, c.ids, c.other);
      const { subject, html } = buildEmail({ c, code, noOpen, signs: c.ids.map((id) => SIGNS[id][0]), diffs, owner: Array.isArray(prof) ? prof[0] : null, email: user.email, pet: Array.isArray(pets) ? pets[0] : null });
      await transporter.sendMail({ from: `"Aubel Vet On The Go" <${SMTP_USER}>`, to: ADMIN_EMAIL, subject, html });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Could not send" });
    }
  };
}

module.exports = make();
module.exports.make = make;
