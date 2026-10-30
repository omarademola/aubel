const symptomCatalog = {
  Dog: {
    young: [
      "Vomiting or diarrhea",
      "Poor feeding",
      "Weakness or unusual sleepiness",
      "Coughing or difficult breathing",
      "Bloated abdomen",
      "Pale gums",
      "Possible toxin exposure",
    ],
    juvenile: [
      "Vomiting or diarrhea",
      "Reduced appetite",
      "Coughing or nasal discharge",
      "Limping or pain",
      "Itching or hair loss",
      "Difficulty urinating",
      "Possible toxin exposure",
    ],
    adult: [
      "Vomiting or diarrhea",
      "Reduced appetite",
      "Coughing or difficult breathing",
      "Limping or pain",
      "Itching or hair loss",
      "Bloated abdomen",
      "Difficulty urinating",
      "Possible toxin exposure",
    ],
  },
  Cat: {
    young: [
      "Vomiting or diarrhea",
      "Poor feeding",
      "Weakness or unusual sleepiness",
      "Eye or nasal discharge",
      "Coughing or difficult breathing",
      "Difficulty urinating",
    ],
    juvenile: [
      "Vomiting or diarrhea",
      "Reduced appetite",
      "Eye or nasal discharge",
      "Difficulty urinating",
      "Limping or pain",
      "Itching or hair loss",
    ],
    adult: [
      "Vomiting or diarrhea",
      "Reduced appetite",
      "Difficulty urinating",
      "Straining in the litter area",
      "Coughing or difficult breathing",
      "Limping or pain",
      "Possible toxin exposure",
    ],
  },
  Goat: {
    young: [
      "Not nursing or weak suckling",
      "Diarrhea or soiled tail",
      "Coughing or nasal discharge",
      "Bloated abdomen",
      "Difficulty standing",
      "Pale eyelids",
    ],
    juvenile: [
      "Diarrhea",
      "Poor growth or appetite",
      "Coughing or nasal discharge",
      "Bloated abdomen",
      "Difficulty standing",
      "Pale eyelids",
      "Limping",
    ],
    adult: [
      "Reduced appetite or cud chewing",
      "Diarrhea",
      "Bloated abdomen",
      "Coughing or nasal discharge",
      "Pale eyelids",
      "Limping or swollen joints",
      "Difficulty giving birth",
    ],
  },
  Sheep: {
    young: [
      "Not nursing or weak suckling",
      "Diarrhea or soiled tail",
      "Coughing or nasal discharge",
      "Bloated abdomen",
      "Difficulty standing",
      "Pale eyelids",
    ],
    juvenile: [
      "Diarrhea",
      "Poor growth or appetite",
      "Coughing or nasal discharge",
      "Bloated abdomen",
      "Difficulty standing",
      "Pale eyelids",
      "Limping",
    ],
    adult: [
      "Reduced appetite or cud chewing",
      "Diarrhea",
      "Bloated abdomen",
      "Coughing or nasal discharge",
      "Pale eyelids",
      "Limping",
      "Difficulty giving birth",
    ],
  },
  Cattle: {
    young: [
      "Not nursing or weak suckling",
      "Diarrhea",
      "Coughing or nasal discharge",
      "Navel swelling or discharge",
      "Difficulty standing",
      "Bloated abdomen",
    ],
    juvenile: [
      "Diarrhea",
      "Poor growth or appetite",
      "Coughing or nasal discharge",
      "Lameness",
      "Bloated abdomen",
      "Eye discharge",
    ],
    adult: [
      "Reduced appetite or cud chewing",
      "Drop in milk production",
      "Diarrhea",
      "Coughing or difficult breathing",
      "Lameness",
      "Bloated abdomen",
      "Difficulty giving birth",
    ],
  },
  Rabbit: {
    young: [
      "Not eating",
      "Diarrhea or very small droppings",
      "Weakness or unusual sleepiness",
      "Nasal or eye discharge",
      "No droppings",
      "Bloated abdomen",
    ],
    juvenile: [
      "Not eating",
      "Diarrhea or very small droppings",
      "No droppings",
      "Nasal or eye discharge",
      "Head tilt or loss of balance",
      "Limping",
    ],
    adult: [
      "Not eating",
      "No droppings or very small droppings",
      "Drooling or wet chin",
      "Nasal or eye discharge",
      "Head tilt or loss of balance",
      "Limping",
      "Possible toxin exposure",
    ],
  },
};

const poultrySymptomCatalog = {
  Broiler: {
    young: [
      "Several chicks weak or inactive",
      "Poor feed or water intake",
      "Watery droppings",
      "Coughing, sneezing, or gasping",
      "Drooping wings",
      "Sudden deaths",
    ],
    juvenile: [
      "Uneven flock growth",
      "Poor feed or water intake",
      "Watery or bloody droppings",
      "Coughing, sneezing, or gasping",
      "Lameness",
      "Sudden deaths",
    ],
    adult: [
      "Reduced feed or water intake",
      "Weakness or lameness",
      "Coughing, sneezing, or gasping",
      "Watery or bloody droppings",
      "Sudden deaths",
    ],
  },
  Layer: {
    young: [
      "Several chicks weak or inactive",
      "Poor feed or water intake",
      "Watery droppings",
      "Coughing, sneezing, or gasping",
      "Drooping wings",
      "Sudden deaths",
    ],
    juvenile: [
      "Uneven flock growth",
      "Poor feed or water intake",
      "Watery or bloody droppings",
      "Coughing, sneezing, or gasping",
      "Delayed or uneven maturity",
      "Sudden deaths",
    ],
    adult: [
      "Drop in egg production",
      "Thin, soft, or misshapen eggs",
      "Poor feed or water intake",
      "Watery or bloody droppings",
      "Coughing, sneezing, or gasping",
      "Sudden deaths",
    ],
  },
};

let selectedSymptoms = new Set();
let currentHealthResult = null;

const byId = (id) => document.getElementById(id);

function updateAnimalFields() {
  const species = byId("pet-species").value;
  const ageSelect = byId("pet-age");
  const hasSpecies = Boolean(symptomCatalog[species]) || species === "Poultry";
  ageSelect.disabled = !hasSpecies;
  byId("pet-weight").disabled = !hasSpecies || !ageSelect.value;
  byId("poultry-type-wrap").classList.toggle("hidden", species !== "Poultry");
  byId("poultry-type").required = species === "Poultry";
  updateSymptoms();
}

function updateSymptoms() {
  const species = byId("pet-species").value;
  const age = byId("pet-age").value;
  const poultryType = byId("poultry-type").value;
  const options =
    species === "Poultry"
      ? poultrySymptomCatalog[poultryType]?.[age] || []
      : symptomCatalog[species]?.[age] || [];
  const container = byId("symptom-chips");
  container.replaceChildren();
  container.classList.toggle("hidden", options.length === 0);
  selectedSymptoms.clear();

  byId("symptom-prompt").textContent = options.length
    ? `Common signs reported in ${age === "young" ? "young" : age === "juvenile" ? "juvenile" : "adult"} ${poultryType ? poultryType.toLowerCase() : species.toLowerCase()}:`
    : species === "Poultry" && age
      ? "Choose broiler or layer to see relevant signs."
      : "Choose pet type and age to see relevant signs.";

  options.forEach((symptom) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "chip text-xs px-2.5 py-1.5 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 transition";
    button.textContent = symptom;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (selectedSymptoms.has(symptom)) {
        selectedSymptoms.delete(symptom);
        button.classList.remove(
          "bg-brand-600",
          "text-white",
          "border-brand-600",
        );
        button.classList.add(
          "bg-slate-100",
          "text-slate-700",
          "border-slate-300",
        );
        button.setAttribute("aria-pressed", "false");
      } else {
        selectedSymptoms.add(symptom);
        button.classList.add("bg-brand-600", "text-white", "border-brand-600");
        button.classList.remove(
          "bg-slate-100",
          "text-slate-700",
          "border-slate-300",
        );
        button.setAttribute("aria-pressed", "true");
      }
    });
    container.append(button);
  });
}

function runHealthCheck(event) {
  event.preventDefault();
  const species = byId("pet-species").value;
  const age = byId("pet-age").selectedOptions[0].textContent.trim();
  const poultryType = species === "Poultry" ? byId("poultry-type").value : "";
  const weight = byId("pet-weight").value.trim() || "Not specified";
  const description = byId("symptom-text").value.trim();
  const symptoms = [...selectedSymptoms, description].filter(Boolean);
  const text = symptoms.join(" ").toLowerCase();
  const urgent =
    /collapse|unresponsive|possible toxin|poison|no droppings|difficulty breathing|gasping|sudden deaths|unable to urinate|difficulty urinating|bloated abdomen|bloody droppings/.test(
      text,
    );
  const caution =
    /vomit|diarrhea|weak|poor feeding|not eating|reduced appetite|limp|pain|discharge|drop in/.test(
      text,
    );
  const severity = urgent ? "RED" : caution ? "YELLOW" : "GREEN";
  const title = urgent
    ? "Urgent veterinary assessment"
    : caution
      ? "Contact a veterinarian promptly"
      : "No urgent signs selected";
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
    const banner = byId("severity-banner");
    banner.className = `p-4 rounded-xl text-white font-bold flex items-center justify-between shadow-md ${urgent ? "bg-red-600" : caution ? "bg-amber-500" : "bg-emerald-600"}`;
    byId("severity-icon").className =
      `fa-solid ${urgent ? "fa-triangle-exclamation" : caution ? "fa-circle-exclamation" : "fa-circle-check"} text-2xl`;
    byId("severity-code").textContent = `URGENCY LEVEL: ${severity}`;
    byId("severity-title").textContent = title;
    byId("health-check-explanation").textContent = explanation;
    const firstAidList = byId("first-aid-steps");
    firstAidList.replaceChildren();
    [
      "Keep the animal calm and avoid giving human medicines.",
      "Record when the signs began and any recent feed, medication, or exposure changes.",
      "Contact a veterinarian urgently for severe, worsening, or breathing-related signs.",
    ].forEach((step) => {
      const item = document.createElement("li");
      item.className = "leading-tight";
      item.textContent = step;
      firstAidList.append(item);
    });
    currentHealthResult = {
      species,
      age,
      poultryType,
      weight,
      symptoms: symptoms.join(", ") || "None selected",
      severity,
      title,
    };
  }, 250);
}

function dispatchWhatsApp() {
  if (!currentHealthResult) {
    window.alert("Please run the health check first.");
    return;
  }
  const result = currentHealthResult;
  const text = `AUBEL VET HEALTH SUMMARY\nPet: ${result.species}${result.poultryType ? ` (${result.poultryType})` : ""}, ${result.age}, ${result.weight}\nUrgency: ${result.severity} - ${result.title}\nReported signs: ${result.symptoms}`;
  window.open(
    `https://wa.me/2348108710868?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.add("hidden"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((button) =>
      button.classList.remove("border-brand-500", "bg-brand-50"),
    );
  byId(`tab-${tabName}`).classList.remove("hidden");
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
    switchTab("pricing");
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
  byId("poultry-type").addEventListener("change", updateSymptoms);
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
