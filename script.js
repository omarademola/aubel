let selectedSigns = new Set();
let otherOn = false;
let currentHealthResult = null;

const byId = (id) => document.getElementById(id);
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

function updateSigns() {
  const species = byId("pet-species").value;
  const age = byId("pet-age").value;
  const poultryType = byId("poultry-type").value;
  const options = signsFor(species, poultryType, age);
  const container = byId("symptom-chips");
  container.replaceChildren();
  selectedSigns.clear();
  otherOn = false;
  byId("other-wrap").classList.add("hidden");
  container.classList.toggle("hidden", options.length === 0);
  const who = species === "Poultry" ? poultryType.toLowerCase() : species.toLowerCase();
  byId("symptom-prompt").textContent = options.length
    ? `Common signs reported in ${age === "young" ? "young" : age === "juvenile" ? "juvenile" : "adult"} ${who}. Select at least one:`
    : species === "Poultry" && age
      ? "Choose broiler or layer to see relevant signs."
      : "Choose pet type and age to see relevant signs.";
  const addChip = (label, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip text-xs px-2.5 py-1.5 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 transition";
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => onClick(button));
    container.append(button);
  };
  options.forEach(({ id, label }) =>
    addChip(label, (button) => {
      const on = !selectedSigns.has(id);
      if (on) selectedSigns.add(id);
      else selectedSigns.delete(id);
      setChip(button, on);
    }),
  );
  if (options.length)
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
  if (!species) missing.push("Pet type");
  if (!byId("pet-age").value) missing.push("Age category");
  if (species === "Poultry" && !byId("poultry-type").value) missing.push("Poultry type (broiler or layer)");
  if (!(Number(byId("pet-weight").value) > 0)) missing.push("Approximate weight");
  if (!selectedSigns.size && !otherOn) missing.push("At least one sign (tap the signs you see)");
  if (otherOn && !byId("symptom-text").value.trim()) missing.push("Your own description under “Other”");
  return missing;
}

function showFormAlert(missing) {
  const box = byId("form-alert");
  box.replaceChildren();
  box.classList.toggle("hidden", !missing.length);
  if (!missing.length) return;
  const heading = document.createElement("p");
  heading.className = "font-bold mb-1";
  heading.textContent = "Please complete all fields before analysing:";
  const list = document.createElement("ul");
  list.className = "list-disc list-inside";
  missing.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    list.append(item);
  });
  box.append(heading, list);
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function runHealthCheck(event) {
  event.preventDefault();
  const missing = missingFields();
  showFormAlert(missing);
  if (missing.length) return;
  const species = byId("pet-species").value;
  const age = byId("pet-age").selectedOptions[0].textContent.trim();
  const poultryType = species === "Poultry" ? byId("poultry-type").value : "";
  const weight = `${byId("pet-weight").value} ${byId("pet-weight-unit").value}`;
  const other = otherOn ? byId("symptom-text").value.trim() : "";
  const signs = [...[...selectedSigns].map((id) => SIGNS[id][0]), other && `Other: ${other}`].filter(Boolean);
  const { code, noOpen } = triage(species, [...selectedSigns], other);
  const urgent = code === "RED";
  const caution = code === "ORANGE";
  const title = urgent ? "Urgent veterinary assessment" : caution ? "Contact a veterinarian promptly" : "No urgent signs selected";
  const explanation = urgent
    ? "One or more reported signs can indicate an emergency. Contact a veterinarian now. This screen cannot diagnose the cause or rule out serious illness."
    : caution
      ? "These signs may need timely examination, especially if worsening, persistent, or affecting several animals. This screen cannot diagnose illness."
      : "No urgent sign was selected. A normal result does not rule out illness; seek veterinary advice if you remain concerned.";

  byId("health-check-loading").classList.remove("hidden");
  byId("health-check-result").classList.add("hidden");
  window.setTimeout(() => {
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
    currentHealthResult = { species, age, poultryType, weight, signs: signs.join(", "), code, title };
  }, 250);
}

function dispatchWhatsApp() {
  if (!currentHealthResult) {
    window.alert("Please run the health check first.");
    return;
  }
  const r = currentHealthResult;
  const text = `AUBEL VET HEALTH SUMMARY\nPet: ${r.species}${r.poultryType ? ` (${r.poultryType})` : ""}, ${r.age}, ${r.weight}\nCODE: ${r.code}\nReported signs: ${r.signs}`;
  window.open(`https://wa.me/2348108710868?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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

function savePetRecord(event) {
  event.preventDefault();
  const terms = byId("terms-accepted");
  if (!terms.checked) {
    terms.setCustomValidity(
      "Please accept the terms and conditions before saving.",
    );
    terms.reportValidity();
    switchTab("pricing", true);
    return;
  }
  terms.setCustomValidity("");

  const vaccination = document.querySelector(
    'input[name="previous-vaccination"]:checked',
  ).value;
  const lastDate = vaccination === "yes" ? byId("rec-date").value : "";
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
    `Pet: ${byId("rec-name").value.trim()} (${byId("rec-breed").value.trim()})`,
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
}

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
