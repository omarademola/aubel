// SERVER ONLY. Builds the private email for the vet. Every value is escaped; the subject uses only checked values.
const { esc, clean } = require("./guard");

const AGE_LABEL = { young: "Under 6 months", juvenile: "6-12 months", adult: "Over 1 year" };
const row = (k, v) => `<tr><td style="padding:4px 10px;border:1px solid #ccc;font-weight:bold">${esc(k)}</td><td style="padding:4px 10px;border:1px solid #ccc">${esc(v || "-")}</td></tr>`;
const table = (title, rows) => `<h3 style="margin:16px 0 6px">${esc(title)}</h3><table style="border-collapse:collapse;font-size:14px">${rows.join("")}</table>`;

function buildEmail({ c, code, noOpen, signs, diffs, owner, email, pet }) {
  const subject = `AUBEL check: CODE ${code} | ${c.species}${c.poultryType ? ` (${c.poultryType})` : ""} | ${AGE_LABEL[c.age]}`;
  const own = owner || {};
  const p = pet || {};
  const html = [
    `<h2 style="margin:0">New health check: CODE ${esc(code)}</h2>`,
    noOpen ? `<p style="color:#b91c1c;font-weight:bold">Possible anthrax pattern. The client was told not to open or move a dead animal.</p>` : "",
    table("Owner", [row("Name", own.full_name), row("Email", email), row("Phone", own.phone), row("Address", own.address)]),
    table("Animal", [row("Name", p.name), row("Species", c.species + (c.poultryType ? ` (${c.poultryType})` : "")), row("Breed", p.breed), row("Age", AGE_LABEL[c.age]), row("Sex", p.sex), row("Colour / markings", p.color_markings), row("House / bedding", p.housing), row("Feed", p.feed_type), row("Feeding frequency", p.feed_frequency), row("Other animals", p.other_animals == null ? "" : p.other_animals ? "Yes" : "No"), row("Vaccination", p.vaccinated ? `${p.vaccine_name || "Yes"} ${p.vaccine_date || ""}` : "No"), row("Registration no.", p.registration_no)]),
    table("Health check", [row("Approx. weight", `${c.weight} ${c.unit}`), row("Signs selected", signs.join("; ")), row("Other signs typed by client", c.other)]),
    `<h3 style="margin:16px 0 6px">Tentative differentials (draft pool, for your clinical judgement)</h3>`,
    diffs.length
      ? `<ol>${diffs.map((d) => `<li><b>${esc(d.name)}</b> (${esc(d.origin)}, match ${d.strength}%)${d.matched.length ? `<br>Signs matched: ${esc(d.matched.join("; "))}` : ""}${d.words ? `<br>Matched wording in the client text` : ""}</li>`).join("")}</ol>`
      : `<p>No match in the pool. Please review the signs above.</p>`,
    `<p style="color:#666;font-size:12px">This message is private to the practice. It is generated from the client's answers and is not a diagnosis.</p>`,
  ].join("");
  return { subject: clean(subject, 150), html };
}

module.exports = { buildEmail };
