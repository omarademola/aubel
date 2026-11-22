let selectedSigns = new Set();
let otherOn = false;
let currentHealthResult = null;
let recordSaved = false;

const byId = (id) => document.getElementById(id);
const radio = (name) => (document.querySelector(`input[name="${name}"]:checked`) || {}).value;
const opt = (id) => byId(id).value.trim() || null;
const CHIP_OFF = ["bg-slate-100", "text-slate-700", "border-slate-300"];
const CHIP_ON = ["bg-brand-600", "text-white", "border-brand-600"];

function setChip(button, on) {
  button.classList.remove(...(on ? CHIP_OFF : CHIP_ON));
  button.classList.add(...(on ? CHIP_ON : CHIP_OFF));
  button.setAttribute("aria-pressed", String(on));
}

function updateAnimalFields() {
  const species = byId("pet-species").value;
  byId("pet-age").disabled = !species;
  byId("poultry-type-wrap").classList.toggle("hidden", species !== "Poultry");
  byId("poultry-type").required = species === "Poultry";
  updateSigns();
}

let signsToken = 0;
const signLabels = {};

async function updateSigns() {
  const species = byId("pet-species").value;
  const age = byId("pet-age").value;
  const poultryType = byId("poultry-type").value;
  const container = byId("symptom-chips");
  const prompt = byId("symptom-prompt");
  container.replaceChildren();
  selectedSigns.clear();
  otherOn = false;
  byId("other-wrap").classList.add("hidden");
  container.classList.add("hidden");
  if (!species || !age || (species === "Poultry" && !poultryType)) {
    prompt.textContent = species === "Poultry" && age ? "Choose broiler or layer to see relevant signs." : "Choose animal type and age to see relevant signs.";
    return;
  }
  const token = ++signsToken;
  prompt.textContent = "Loading signs...";
  let options;
  try {
    const response = await fetch(`/api/signs?species=${encodeURIComponent(species)}&age=${encodeURIComponent(age)}&type=${encodeURIComponent(poultryType)}`);
    if (!response.ok) throw new Error("signs");
    options = (await response.json()).signs;
  } catch (error) {
    if (token === signsToken) prompt.textContent = "Could not load the signs. Please check your connection and try again.";
    return;
  }
  if (token !== signsToken) return;
  const who = species === "Poultry" ? poultryType.toLowerCase() : species.toLowerCase();
  prompt.textContent = `Common signs reported in ${age} ${who}. Select at least one:`;
  container.classList.remove("hidden");
  const addChip = (label, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip text-xs px-2.5 py-1.5 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 transition";
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => onClick(button));
    container.append(button);
  };
  options.forEach(({ id, label }) => {
    signLabels[id] = label;
    addChip(label, (button) => {
      const on = !selectedSigns.has(id);
      if (on) selectedSigns.add(id);
      else selectedSigns.delete(id);
      setChip(button, on);
    });
  });
  addChip("Other (type it)", (button) => {
    otherOn = !otherOn;
    setChip(button, otherOn);
    byId("other-wrap").classList.toggle("hidden", !otherOn);
    if (otherOn) byId("symptom-text").focus();
  });
}

function missingFields() {
  const species = byId("pet-species").value;
  const missing = [];
  if (!species) missing.push("Animal type");
  if (!byId("pet-age").value) missing.push("Age category");
  if (species === "Poultry" && !byId("poultry-type").value) missing.push("Poultry type (broiler or layer)");
  if (!(Number(byId("pet-weight").value) > 0)) missing.push("Approximate weight");
  if (!selectedSigns.size && !otherOn) missing.push("At least one sign (tap the signs you see)");
  if (otherOn && !byId("symptom-text").value.trim()) missing.push("Your own description under “Other”");
  return missing;
}

function showFormAlert(missing, heading = "Please complete all fields before analysing:") {
  const box = byId("form-alert");
  box.replaceChildren();
  box.classList.toggle("hidden", !missing.length);
  if (!missing.length) return;
  const title = document.createElement("p");
  title.className = "font-bold mb-1";
  title.textContent = heading;
  const list = document.createElement("ul");
  list.className = "list-disc list-inside";
  missing.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    list.append(item);
  });
  box.append(title, list);
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function runHealthCheck(event) {
  event.preventDefault();
  const missing = missingFields();
  showFormAlert(missing);
  if (missing.length) return;
  const species = byId("pet-species").value;
  const age = byId("pet-age").selectedOptions[0].textContent.trim();
  const poultryType = species === "Poultry" ? byId("poultry-type").value : "";
  const unit = byId("pet-weight-unit").value;
  const other = otherOn ? byId("symptom-text").value.trim() : "";
  const input = { species, age: byId("pet-age").value, poultryType, ids: [...selectedSigns], other, weight: Number(byId("pet-weight").value), unit };
  const signs = [...input.ids.map((id) => signLabels[id] || id), other && `Other: ${other}`].filter(Boolean);
  byId("health-check-loading").classList.remove("hidden");
  byId("health-check-result").classList.add("hidden");
  let outcome;
  try {
    const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error("analyze");
    outcome = await response.json();
  } catch (error) {
    byId("health-check-loading").classList.add("hidden");
    showFormAlert(["Please check your connection and try again."], "We could not reach the health service:");
    return;
  }
  const { code, noOpen } = outcome;
  const urgent = code === "RED";
  const caution = code === "ORANGE";
  const title = urgent ? "Urgent veterinary assessment" : caution ? "Contact a veterinarian promptly" : "No urgent signs selected";
  const explanation = urgent
    ? "One or more reported signs can indicate an emergency. Contact a veterinarian now. This screen cannot diagnose the cause or rule out serious illness."
    : caution
      ? "These signs may need timely examination, especially if worsening, persistent, or affecting several animals. This screen cannot diagnose illness."
      : "No urgent sign was selected. A normal result does not rule out illness; seek veterinary advice if you remain concerned.";
  byId("health-check-loading").classList.add("hidden");
  byId("health-check-result").classList.remove("hidden");
  byId("severity-banner").className = `p-4 rounded-xl text-white font-bold flex items-center justify-between shadow-md ${urgent ? "bg-red-600" : caution ? "bg-orange-500" : "bg-emerald-600"}`;
  byId("severity-icon").className = `fa-solid ${urgent ? "fa-triangle-exclamation" : caution ? "fa-circle-exclamation" : "fa-circle-check"} text-2xl`;
  byId("severity-title").textContent = title;
  byId("health-check-explanation").textContent = explanation;
  const firstAidList = byId("first-aid-steps");
  firstAidList.replaceChildren();
  [
    "Keep the animal calm and avoid giving human medicines.",
    "Record when the signs began and any recent feed, medication, or exposure changes.",
    "Contact a veterinarian urgently for severe, worsening, or breathing-related signs.",
    ...(noOpen ? ["Do not open, skin or move a dead animal showing these signs. Keep people and other animals away and call a veterinarian now."] : []),
  ].forEach((step) => {
    const item = document.createElement("li");
    item.className = "leading-tight";
    item.textContent = step;
    firstAidList.append(item);
  });
  currentHealthResult = { species, age, poultryType, weight: `${input.weight} ${unit}`, signs: signs.join(", "), code, title, input };
}

function showGate(items) {
  const notice = byId("gate-notice");
  notice.replaceChildren();
  notice.classList.toggle("hidden", !items.length);
  if (!items.length) return true;
  const title = document.createElement("p");
  title.className = "font-bold mb-1";
  title.textContent = "Before you continue, please complete:";
  const list = document.createElement("ul");
  list.className = "list-disc list-inside space-y-1";
  items.forEach(([text, tab]) => {
    const item = document.createElement("li");
    item.append(`${text} `);
    if (tab) {
      const go = document.createElement("button");
      go.type = "button";
      go.className = "underline font-semibold";
      go.textContent = "Open it";
      go.addEventListener("click", () => {
        switchTab(tab, true);
        byId(`tab-${tab}`).scrollIntoView({ behavior: "smooth", block: "start" });
      });
      item.append(go);
    }
    list.append(item);
  });
  notice.append(title, list);
  notice.scrollIntoView({ behavior: "smooth", block: "center" });
  return false;
}

function requireRecord() {
  const items = [];
  if (!byId("terms-accepted").checked) items.push(["Tick the terms and conditions in Cost Estimator.", "pricing"]);
  if (!recordSaved) items.push(["Fill in the Digital Health Record and press Save Health Record.", "records"]);
  return showGate(items);
}
document.addEventListener("click", (event) => {
  if (event.target.closest("a[data-gated]") && !requireRecord()) event.preventDefault();
});
(async function prepareRecordForm() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    byId("owner-email").value = session.user.email;
    byId("owner-email").readOnly = true;
    const { data: me } = await sb.from("profiles").select("full_name,phone,address").eq("id", session.user.id).single();
    if (me && me.full_name && me.phone && me.address) {
      byId("owner-name").value = me.full_name;
      byId("owner-phone").value = ngPhone.show(me.phone);
      byId("owner-address").value = me.address;
      byId("owner-fields").classList.add("hidden");
    }
  } catch (error) {
    /* not logged in, or the cloud script did not load */
  }
})();

function dispatchWhatsApp() {
  if (!currentHealthResult) {
    showGate([["Run the health check first.", null]]);
    return;
  }
  if (!requireRecord()) return;
  const r = currentHealthResult;
  const text = `AUBEL VET HEALTH SUMMARY\nAnimal: ${r.species}${r.poultryType ? ` (${r.poultryType})` : ""}, ${r.age}, ${r.weight}\nCODE: ${r.code}\nReported signs: ${r.signs}`;
  window.open(`https://wa.me/2348108710868?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  notifyVet(r);
}

// Sends the full case privately to the vet's email through the server. The client sees nothing of this.
async function notifyVet(r) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    await fetch("/api/notify", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(r.input) });
  } catch (error) {
    /* the WhatsApp message still goes through */
  }
}

function switchTab(tabName, forceOpen) {
  const panel = byId(`tab-${tabName}`);
  const open = forceOpen || panel.classList.contains("hidden");
  document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("border-brand-500", "bg-brand-50"));
  if (!open) return;
  panel.classList.remove("hidden");
  byId(`tab-btn-${tabName}`).classList.add("border-brand-500", "bg-brand-50");
}

function calculateFee() {
  const zone = byId("calc-zone").value;
  const service = byId("calc-service").value;
  let base = 15000;
  if (zone === "abeokuta") base += 5000;
  if (zone === "lagos-mainland") base += 7000;
  if (zone === "lagos-island") base += 12000;
  if (service === "emergency") base += 10000;
  if (service === "vaccine") base += 3000;
  byId("fee-output").textContent =
    `₦${base.toLocaleString()} - ₦${(base + 5000).toLocaleString()}`;
}

async function savePetRecord(event) {
  event.preventDefault();
  const form = event.currentTarget || event.target;
  if (form && form.querySelectorAll && !inlineValidate(form)) return;
  const terms = byId("terms-accepted");
  clearFieldError(terms);
  if (!terms.checked) {
    switchTab("pricing", true);
    fieldError(terms, "Please tick the terms and conditions, then press Save Health Record again.");
    terms.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!byId("pet-species").value || !byId("pet-age").value) {
    const field = byId("pet-species").value ? byId("pet-age") : byId("pet-species");
    fieldError(field, "Choose the animal type and age in the Health Checker first.");
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const status = byId("record-status");
  status.textContent = "";
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return beginRecordVerification();
  await finishRecord(session);
}

async function beginRecordVerification() {
  const email = byId("owner-email").value.trim().toLowerCase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: nameMeta(byId("owner-name").value.trim()) } });
  if (error) return fieldError(byId("owner-email"), error.status === 429 ? "Too many attempts. Please wait a minute and try again." : error.message);
  byId("record-verify").classList.remove("hidden");
  byId("record-code").focus();
}

async function verifyRecordEmail() {
  const code = byId("record-code");
  clearFieldError(code);
  if (!code.value.trim()) return fieldError(code, "This field is required.");
  const { data, error } = await sb.auth.verifyOtp({ email: byId("owner-email").value.trim().toLowerCase(), token: code.value.trim(), type: "email" });
  if (error) return fieldError(code, error.message);
  byId("record-verify").classList.add("hidden");
  code.value = "";
  await finishRecord(data.session);
}

async function finishRecord(session) {
  const vaccination = document.querySelector('input[name="previous-vaccination"]:checked').value;
  const lastDate = vaccination === "yes" ? byId("rec-date").value : "";
  const status = byId("record-status");
  const owner = { full_name: byId("owner-name").value.trim(), phone: ngPhone.value(byId("owner-phone")), address: byId("owner-address").value.trim() };
  const saved = await sb.from("profiles").update(owner).eq("id", session.user.id);
  const pet = await sb.from("pets").insert({
    owner_id: session.user.id, name: byId("rec-name").value.trim(), species: byId("pet-species").value, age_band: byId("pet-age").value, breed: opt("rec-breed"),
    sex: radio("rec-sex"), color_markings: opt("rec-color"), housing: opt("rec-housing"), feed_type: opt("rec-feed"), feed_frequency: byId("rec-freq").value || null, other_animals: radio("rec-others") === "yes",
    vaccinated: vaccination === "yes", vaccine_name: vaccination === "yes" ? byId("rec-vaccine").value.trim() || null : null, vaccine_date: lastDate || null,
  });
  if (saved.error || pet.error) {
    status.className = "text-xs mt-2 text-red-700";
    status.textContent = `Could not save: ${(saved.error || pet.error).message}`;
    return;
  }
  recordSaved = true;
  byId("gate-notice").classList.add("hidden");
  status.className = "text-xs mt-2 text-emerald-700";
  status.textContent = "Record saved to your private dashboard. You can add another pet by changing the pet details and saving again.";
  const baseline = new Date();
  const dateAfter = (days) => {
    const date = new Date(baseline);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const summary = byId("record-summary");
  const heading = document.createElement("h4");
  heading.className = "text-sm font-bold text-slate-800 mb-2";
  heading.textContent = "Health record summary";
  const details = [
    `Owner: ${byId("owner-name").value.trim()} (${byId("owner-email").value.trim()})`,
    `Animal: ${byId("rec-name").value.trim()}${byId("rec-breed").value.trim() ? ` (${byId("rec-breed").value.trim()})` : ""}`,
    vaccination === "yes"
      ? `Previous vaccination: ${byId("rec-vaccine").value.trim()}, ${new Date(`${lastDate}T12:00:00`).toLocaleDateString()}`
      : "Previous vaccination: No",
    `Suggested vaccination follow-up window: ${dateAfter(21)} to ${dateAfter(28)}. Confirm timing and vaccine plan with your veterinarian.`,
  ];
  summary.replaceChildren(heading);
  details.forEach((detail) => {
    const paragraph = document.createElement("p");
    paragraph.className = "text-xs text-slate-600 mb-1";
    paragraph.textContent = detail;
    summary.append(paragraph);
  });
  summary.classList.remove("hidden");
  const sync = sb.auth.updateUser({ data: nameMeta(owner.full_name) });
  if (sync && sync.catch) sync.catch(() => {});
  byId("owner-fields").classList.add("hidden");
  ["rec-name", "rec-breed", "rec-color", "rec-housing", "rec-feed", "rec-vaccine", "rec-date"].forEach((id) => { byId(id).value = ""; });
  byId("rec-freq").value = "";
  document.querySelectorAll('input[name="rec-sex"], input[name="rec-others"], input[name="previous-vaccination"]').forEach((r) => { r.checked = false; });
  byId("vaccination-details").classList.add("hidden");
  if (window.refreshMenu) window.refreshMenu();
  if (currentHealthResult) {
    const share = byId("whatsapp-dispatch-btn");
    share.scrollIntoView({ behavior: "smooth", block: "center" });
    share.focus();
  } else {
    status.textContent += " Now run the health check above to get your summary, then share it.";
  }
}
byId("record-verify-btn").addEventListener("click", verifyRecordEmail);

function trackEmergencyCall() {
  // Call links perform the action; this hook remains for existing markup.
}

function updateVaccinationFields() {
  const vaccinated =
    document.querySelector('input[name="previous-vaccination"]:checked')
      ?.value === "yes";
  const section = byId("vaccination-details");
  section.classList.toggle("hidden", !vaccinated);
  section.classList.toggle("grid", vaccinated);
  byId("rec-date").required = vaccinated;
  byId("rec-date").disabled = !vaccinated;
  byId("rec-vaccine").required = vaccinated;
  byId("rec-vaccine").disabled = !vaccinated;
}

function toggleTerms() {
  const content = byId("terms-content");
  const expanded = content.classList.toggle("hidden") === false;
  byId("terms-toggle").setAttribute("aria-expanded", String(expanded));
  byId("terms-toggle").textContent = expanded
    ? "Hide terms and conditions"
    : "Show terms and conditions";
}

document.addEventListener("DOMContentLoaded", () => {
  byId("pet-species").addEventListener("change", () => {
    byId("pet-age").value = "";
    byId("pet-weight").value = "";
    byId("poultry-type").value = "";
    updateAnimalFields();
  });
  byId("pet-age").addEventListener("change", updateAnimalFields);
  byId("poultry-type").addEventListener("change", updateSigns);
  byId("terms-toggle").addEventListener("click", toggleTerms);
  document
    .querySelectorAll('input[name="previous-vaccination"]')
    .forEach((radio) =>
      radio.addEventListener("change", updateVaccinationFields),
    );
  document
    .querySelectorAll("#calc-zone, #calc-service")
    .forEach((control) => control.addEventListener("change", calculateFee));
  byId("health-check-form").addEventListener("submit", runHealthCheck);
  byId("record-form").addEventListener("submit", savePetRecord);
  byId("whatsapp-dispatch-btn").addEventListener("click", dispatchWhatsApp);
  updateAnimalFields();
  updateVaccinationFields();
  calculateFee();
});
