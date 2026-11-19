// Signs pool and triage rules. Checked against the MSD Veterinary Manual so far: anthrax signs in ruminants, rabbit digestive disease.
// Everything else is still a draft for veterinary review. PHASE 2 MOVES THIS LOGIC TO THE SERVER so it is not readable here.
// Level: 2 = RED (emergency), 1 = ORANGE (prompt examination), 0 = routine.
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

if (typeof module !== "undefined") module.exports = { triage, signsFor, SIGNS, POOL };
