// SERVER ONLY. This file is never sent to the browser (files starting with _ in /api are not public routes).
const SIGNS = {
  vd: ["Vomiting or diarrhoea", "digestive", 1],
  bd: ["Bloody diarrhoea or droppings", "digestive", 2],
  wd: ["Watery droppings", "digestive", 1],
  na: ["Not eating or drinking", "digestive", 1],
  bl: ["Bloated abdomen", "digestive", 2],
  nd: ["No droppings", "digestive", 2],
  dr: ["Drooling or wet chin", "digestive", 1],
  br: ["Difficulty breathing or gasping", "respiratory", 2],
  co: ["Coughing, sneezing or nasal discharge", "respiratory", 1],
  pg: ["Pale gums or eyelids", "circulatory", 1],
  bo: ["Bleeding from the body or a body opening", "circulatory", 2],
  sz: ["Seizures, tremors or paralysis", "nervous", 2],
  ht: ["Head tilt or loss of balance", "nervous", 1],
  wk: ["Weakness or unusual sleepiness", "generalized", 1],
  sd: ["Sudden deaths", "generalized", 2],
  ns: ["Not nursing or weak suckling", "generalized", 2],
  nv: ["Swollen or discharging navel", "generalized", 1],
  lm: ["Limping, lameness or pain", "musculoskeletal", 1],
  ds: ["Difficulty standing", "musculoskeletal", 2],
  un: ["Straining or unable to urinate", "urinary", 2],
  dy: ["Difficulty giving birth", "reproductive", 2],
  mk: ["Drop in milk production", "reproductive", 1],
  eg: ["Drop in egg production or poor shells", "reproductive", 1],
  sk: ["Itching, hair loss or skin sores", "integument", 0],
  ey: ["Eye discharge or cloudy eye", "eye", 1],
  ea: ["Ear discharge or head shaking", "ear", 1],
  tx: ["Suspected poisoning or toxin exposure", "toxicosis", 2],
  hs: ["Heavy panting or heat stress", "metabolic", 2],
  gr: ["Poor growth", "metabolic", 1],
  th: ["Excess thirst or urination", "endocrine", 1],
  fs: ["Swollen face, eyes or wattles", "poultry", 1],
};
// Species-specific severity overrides
const OVERRIDE = { Dog: { pg: 2 }, Cat: { pg: 2 }, Rabbit: { na: 2, wd: 2 } };
const RUMINANTS = ["Goat", "Sheep", "Cattle"];
const SMALL = {
  young: "vd bd na wk br bl pg tx sz ds",
  juvenile: "vd bd na co lm sk un tx hs bo",
  adult: "vd bd na br lm sk bl un tx hs",
};
const POOL = {
  Dog: SMALL,
  Cat: {
    young: "vd na wk co ey br pg tx",
    juvenile: "vd na co ey un lm sk tx",
    adult: "vd na un br lm sk th tx dr pg",
  },
  Goat: {
    young: "ns wd co bl ds pg wk nv",
    juvenile: "wd na co bl ds pg lm gr sd",
    adult: "na wd bl co pg lm dy ds bo sd",
  },
  Sheep: {
    young: "ns wd co bl ds pg wk nv",
    juvenile: "wd na co bl ds pg lm gr sd",
    adult: "na wd bl co pg lm dy ds bo sd",
  },
  Cattle: {
    young: "ns wd co nv ds bl wk",
    juvenile: "wd na co lm bl ey gr",
    adult: "na mk wd br lm bl dy bo sd ds",
  },
  Rabbit: {
    young: "na wd wk co ey nd bl",
    juvenile: "na wd nd co ht lm ey",
    adult: "na nd dr co ht lm ey ea tx hs",
  },
  Broiler: {
    young: "wk na wd co sd ds",
    juvenile: "gr na bd co lm sd",
    adult: "na wk co bd hs sd sz",
  },
  Layer: {
    young: "wk na wd co sd ds",
    juvenile: "gr na bd co sd eg",
    adult: "eg na bd co fs sz sd hs",
  },
};

function signsFor(species, poultryType, age) {
  const key = species === "Poultry" ? poultryType : species;
  const ids = (POOL[key]?.[age] || "").split(" ").filter(Boolean);
  return ids.map((id) => ({ id, label: SIGNS[id][0] }));
}

// Free-text rules: [pattern, level, per-species override]
const RULES = [
  [/seiz|convuls|\bfits?\b|tremor|paraly|collaps|unrespons|unconscious|(cannot|can'?t|unable to|not able to) (stand|walk|rise|get up)|not breathing|gasp|(difficult|hard|laboured|labored|struggl)\w*( to)? breath|breath\w*( is| was)? (difficult|hard|laboured|labored)|blue (gum|tongue)|pale gum/, 2],
  [/heavy bleed|profuse|bleeding (a lot|heavily|badly|non-?stop)|won'?t stop bleeding|hit by (a )?(car|vehicle|motorcycle)|broken (bone|leg)|fractur|prolapse|burn(ed|t)|snake ?bite|bitten by (a )?snake/, 2],
  [/poison|toxi[cn]|pesticide|insecticide|rat ?(bait|poison)|ate (bait|chemical)|drank (chemical|kerosene|bleach)|ingested/, 2],
  [/(unable|cannot|can'?t|not able)( to)? (urinate|pee|pass urine)|(not|no) (urinat|peeing|passing urine)|straining to (urinate|pee)|no urine/, 2],
  [/bloat|swollen (belly|abdomen|stomach)|distended|hard (belly|abdomen)/, 2],
  [/(difficult\w*|trouble|stuck|prolonged) ?(giving birth|calving|lambing|kidding|whelping|delivery|labou?r)|stuck (calf|kid|lamb|puppy|kitten)|labou?r .{0,20}hours/, 2],
  [/sudden(ly)? (death|died|dead)|found dead|died (suddenly|overnight)|several .{0,20}(dead|died)|dying|(many|several) (birds|chickens|chicks|animals) (died|dead|dying)/, 2],
  [/heat ?stroke|overheat/, 2],
  [/not (eating|drinking)|stopped (eating|drinking)|off (feed|food)|refus\w+ (food|feed|water)|no appetite|reduced appetite/, 1, { Rabbit: 2 }],
  [/diarrh|loose (stool|dropping)|watery dropping/, 1, { Rabbit: 2 }],
  [/vomit|diarrh|loose (stool|dropping)|watery|lethar|weak|dull|limp|lame|swell|discharge|cough|sneez|itch|scratch|wound|pus\b|fever|shiv|thin\b|weight loss|losing weight|drool|head tilt|shak|blood|bleed|lump|abscess|ticks?\b|fleas?\b|worm|maggot|egg (drop|production)|jaundice|yellow/, 1],
];
const BLEED = /bleed|blood|haemorrh|hemorrh/g;
const ORIFICE = /\b(ears?|nose|nostrils?|mouth|anus|anal|vulva|vagina|penile|penis|prepuce|urethra|orifices?|eyes?)\b/;
const NEGATOR = /\b(no|not|without|never|nil|isn'?t|doesn'?t|don'?t|hasn'?t|neither|nor)\b/;

// A sign is ignored if a negating word comes earlier in the same clause ("no bleeding").
function negated(text, index) {
  const clause = text.slice(Math.max(0, index - 30), index).split(/[,.;:!?\n]| but | and | however /).pop();
  return NEGATOR.test(clause);
}

function triage(species, ids, freeText) {
  const text = (freeText || "").toLowerCase().trim();
  let level = 0;
  let noOpen = false;
  ids.forEach((id) => {
    level = Math.max(level, OVERRIDE[species]?.[id] ?? SIGNS[id][2]);
  });
  if (RUMINANTS.includes(species) && (ids.includes("sd") || ids.includes("bo"))) noOpen = true;
  let matched = false;
  RULES.forEach(([re, l, byAnimal]) => {
    const g = new RegExp(re.source, "g");
    let m;
    while ((m = g.exec(text))) {
      if (negated(text, m.index)) continue;
      matched = true;
      level = Math.max(level, byAnimal?.[species] ?? l);
      break;
    }
  });
  let bleeding = false;
  let m;
  BLEED.lastIndex = 0;
  while ((m = BLEED.exec(text))) {
    if (!negated(text, m.index)) bleeding = true;
  }
  if (bleeding && ORIFICE.test(text)) {
    matched = true;
    level = 2;
    if (RUMINANTS.includes(species)) noOpen = true;
  }
  if (/sudden(ly)? (death|died|dead)|found dead/.test(text) && RUMINANTS.includes(species)) noOpen = true;
  // Fail safe: text we could not understand is never reported as GREEN.
  if (text && !matched) level = Math.max(level, 1);
  return { code: ["GREEN", "ORANGE", "RED"][level], noOpen };
}


// ---------------------------------------------------------------------------------------------
// DIFFERENTIAL POOL (server only). DRAFT for veterinary review: built from general veterinary knowledge.
// Cross-checked against the MSD Veterinary Manual so far: anthrax in ruminants, rabbit digestive disease.
// Format: [name, species list, origin, ages (y=young j=juvenile a=adult), "sign:weight ...", keyword regex, urgency 1|2]
// ---------------------------------------------------------------------------------------------
const DISEASES = [
  ["Canine parvovirus enteritis", "Dog", "infectious", "yj", "vd:3 bd:4 na:2 wk:2 pg:1", "parvo", 2],
  ["Canine distemper", "Dog", "infectious", "yj", "co:2 ey:2 vd:1 sz:3 wk:1 na:1", "distemper|twitch|myoclon", 2],
  ["Rabies", "Dog,Cat", "zoonotic", "yja", "sz:3 dr:3 wk:1", "rabies|aggressive|biting|hydrophob|stray", 2],
  ["Babesiosis / tick-borne disease", "Dog", "infectious", "yja", "pg:4 wk:3 na:2", "tick|dark urine|jaundice|yellow", 2],
  ["Gastric dilatation-volvulus", "Dog", "non-infectious", "a", "bl:4 br:1 wk:1", "retch|unproductive", 2],
  ["Heatstroke", "Dog,Rabbit,Poultry", "managemental", "yja", "hs:4 wk:1 sz:1", "heat ?stroke|overheat|hot weather|panting", 2],
  ["Toxicosis / poisoning", "Dog,Cat,Rabbit,Goat,Sheep,Cattle", "toxic", "yja", "tx:4 sz:2 vd:2 dr:2 wk:1", "poison|toxi[cn]|pesticide|insecticide|bait", 2],
  ["Urethral obstruction / urolithiasis", "Dog,Cat,Goat,Sheep", "non-infectious", "ja", "un:4", "urinat|pee|urine", 2],
  ["Mange / parasitic dermatitis", "Dog,Cat", "infectious", "yja", "sk:3", "itch|scratch|hair loss|mange|flea|mite", 1],
  ["Leptospirosis", "Dog,Cattle", "zoonotic", "ja", "vd:2 na:2 wk:2", "jaundice|red urine|rodent|flood", 1],
  ["Otitis externa", "Dog,Cat,Rabbit", "infectious", "ja", "ea:3", "ear", 1],
  ["Feline panleukopenia", "Cat", "infectious", "yj", "vd:3 na:2 wk:2", "panleuk|distemper", 2],
  ["Feline upper respiratory disease", "Cat", "infectious", "yja", "co:3 ey:3 na:2", "sneez|nasal|conjunctiv", 1],
  ["Feline lower urinary tract disease", "Cat", "non-infectious", "ja", "un:4", "litter|urinat|straining", 2],
  ["Diabetes mellitus / hyperthyroidism", "Cat,Dog", "non-infectious", "a", "th:3 wk:1 na:1", "thirst|drinking a lot|weight loss", 1],
  ["Peste des petits ruminants (PPR)", "Goat,Sheep", "infectious", "yja", "co:2 wd:2 ey:2 na:2 dr:1 wk:1 sd:1", "ppr|mouth sore|nasal discharge", 2],
  ["Haemonchosis (barber's pole worm)", "Goat,Sheep", "infectious", "yja", "pg:4 wk:2 gr:2 wd:1", "bottle jaw|anaemi|worm", 1],
  ["Ruminal bloat (tympany)", "Goat,Sheep,Cattle", "managemental", "ja", "bl:4 br:2 na:1", "bloat|swollen left|lush|legume", 2],
  ["Enterotoxaemia (overeating disease)", "Goat,Sheep,Cattle", "infectious", "yja", "sd:3 sz:2 bl:1 wd:1 ds:1", "overeat|grain|sudden", 2],
  ["Anthrax", "Goat,Sheep,Cattle", "zoonotic", "ja", "sd:4 bo:4", "anthrax|blood from|bleeding from|unclotted|tarry", 2],
  ["Pneumonia / pasteurellosis", "Goat,Sheep,Cattle,Rabbit,Poultry", "infectious", "yja", "co:3 br:2 wk:1 na:1 sd:1", "pneumonia|pasteur|snuffle|nasal", 1],
  ["Contagious caprine pleuropneumonia", "Goat", "infectious", "ja", "br:3 co:3 wk:1", "cccp|pleuropneumonia|goats coughing", 2],
  ["Pregnancy toxaemia / ketosis", "Goat,Sheep,Cattle", "metabolic", "a", "na:2 wk:2 ds:2 sz:1", "pregnan|late gestation|twin|ketosis", 2],
  ["Dystocia (difficult birth)", "Dog,Cat,Goat,Sheep,Cattle,Rabbit", "non-infectious", "a", "dy:5", "birth|labou?r|calving|kidding|lambing|whelping", 2],
  ["Coccidiosis", "Goat,Sheep,Cattle,Rabbit,Poultry", "infectious", "yj", "wd:3 bd:3 wk:1 gr:1", "coccid|bloody dropping|bloody diarrh", 1],
  ["Navel ill / neonatal weakness", "Goat,Sheep,Cattle", "infectious", "y", "ns:3 nv:3 ds:2 wk:1", "navel|colostrum|weak newborn", 2],
  ["Foot rot / lameness", "Goat,Sheep,Cattle", "infectious", "ja", "lm:3", "foot|hoof|limp|lame", 1],
  ["Mastitis", "Goat,Sheep,Cattle", "infectious", "a", "mk:3 wk:1", "udder|mastitis|milk clots|swollen udder", 1],
  ["Bovine ephemeral fever (three-day sickness)", "Cattle", "infectious", "ja", "lm:2 ds:3 wk:2 na:2 mk:2", "stiff|three.day|fever", 1],
  ["Foot-and-mouth disease / vesicular stomatitis", "Cattle,Goat,Sheep", "infectious", "yja", "dr:3 lm:3 na:2 mk:2", "blister|vesicle|mouth sore|drool|saliva|fmd", 2],
  ["Hypocalcaemia (milk fever)", "Cattle,Goat,Sheep", "metabolic", "a", "ds:4 wk:2 na:2 mk:1", "calving|just calved|downer|milk fever", 2],
  ["Calf / kid / lamb scours", "Cattle,Goat,Sheep", "infectious", "y", "wd:4 ds:2 wk:2 na:1", "scour|watery|dehydrat|sunken eyes", 2],
  ["Babesiosis / anaplasmosis (tick-borne)", "Cattle,Goat,Sheep", "infectious", "ja", "pg:3 wk:2 na:2 mk:1", "tick|jaundice|red urine|anaemi", 1],
  ["Lumpy skin disease", "Cattle", "infectious", "yja", "wk:1 na:1 mk:1", "lump|nodule|skin|swollen glands", 1],
  ["Gastrointestinal stasis", "Rabbit", "non-infectious", "yja", "na:4 nd:4 bl:1 wk:1", "hair|pellet|not eating|small droppings|hunched", 2],
  ["Enteritis / enterotoxaemia", "Rabbit", "infectious", "yj", "wd:4 wk:2 na:2 sd:2", "diarrh|watery|sudden", 2],
  ["Pasteurellosis (snuffles)", "Rabbit", "infectious", "yja", "co:3 ey:2 ht:2", "snuffle|sneez|nasal", 1],
  ["Ear mites / middle ear disease", "Rabbit", "infectious", "ja", "ea:3 ht:3", "ear|head tilt|crust", 1],
  ["Dental disease", "Rabbit", "non-infectious", "ja", "dr:3 na:2", "tooth|teeth|drool|wet chin", 1],
  ["Encephalitozoonosis", "Rabbit", "infectious", "ja", "ht:4 lm:1", "head tilt|rolling|balance", 1],
  ["Newcastle disease", "Poultry", "infectious", "yja", "co:3 wd:2 sz:3 sd:3 eg:2 wk:2 na:2 br:1", "newcastle|twisted neck|green|gasp|tremor", 2],
  ["Infectious bursal disease (Gumboro)", "Poultry", "infectious", "yj", "wd:3 wk:3 na:2 sd:2", "gumboro|whitish|ruffled|vent pecking|huddl", 2],
  ["Infectious bronchitis", "Poultry", "infectious", "yja", "co:3 eg:3 br:1", "bronchitis|rattle|sneez|nasal", 1],
  ["Fowl cholera", "Poultry", "infectious", "ja", "sd:3 wk:2 wd:2 fs:2", "cholera|swollen wattle|green", 2],
  ["Infectious coryza", "Poultry", "infectious", "ja", "fs:4 co:3 ey:2", "coryza|swollen face|eye discharge|smell", 1],
  ["Avian influenza", "Poultry", "infectious", "yja", "sd:4 fs:3 br:2 eg:2 wd:1", "avian influenza|bird flu|purple|swollen face|many birds", 2],
  ["Pullorum / salmonellosis", "Poultry", "infectious", "yj", "wd:3 wk:2 sd:2", "white diarrh|pasty|vent", 2],
  ["Mycoplasmosis (chronic respiratory disease)", "Poultry", "infectious", "ja", "co:3 br:2 ey:1", "mycoplasma|rattle|sneez|nasal", 1],
  ["Egg drop / nutritional or managemental causes", "Poultry", "nutritional", "a", "eg:4", "egg|shell|calcium|lighting|feed change", 1],
  ["Marek's disease", "Poultry", "infectious", "j", "sz:3 wk:2 gr:1", "paraly|leg|wing|marek", 1],
];
const DIS = DISEASES.map(([n, sp, o, ag, w, k, u]) => ({ n, sp: sp.split(","), o, ag, k: new RegExp(k, "g"), u, w: Object.fromEntries(w.split(" ").map((p) => p.split(":")).map(([id, v]) => [id, Number(v)])) }));
const BAND = { young: "y", juvenile: "j", adult: "a" };

// Ranked list of tentative differentials for the vet's private email. Never sent to the browser.
function differentials(species, age, ids, freeText) {
  const text = (freeText || "").toLowerCase();
  const out = [];
  DIS.forEach((d) => {
    if (!d.sp.includes(species) || !d.ag.includes(BAND[age])) return;
    const matched = ids.filter((id) => d.w[id]);
    let score = matched.reduce((sum, id) => sum + d.w[id], 0);
    let words = 0;
    d.k.lastIndex = 0;
    let m;
    while ((m = d.k.exec(text))) {
      if (m[0] === "") { d.k.lastIndex++; continue; }
      if (!negated(text, m.index)) { words++; if (words >= 2) break; }
    }
    score += words * 3;
    if (score <= 0) return;
    const max = Object.values(d.w).reduce((a, b) => a + b, 0) + 6;
    out.push({ name: d.n, origin: d.o, urgency: d.u, matched: matched.map((id) => SIGNS[id][0]), words, strength: Math.min(100, Math.round((score / max) * 100)) });
  });
  return out.sort((a, b) => b.strength - a.strength || b.urgency - a.urgency).slice(0, 5);
}

module.exports = { SIGNS, POOL, signsFor, triage, differentials };
