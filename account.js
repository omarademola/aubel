const $ = (id) => document.getElementById(id);
const INPUT = "w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg";
const BTN = "bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg";
const AGES = { young: "Under 6 months", juvenile: "6-12 months", adult: "Over 1 year" };
const TITLES = { dashboard: "Dashboard", notifications: "Notification", regno: "Registration Number", complaint: "Complaint", plans: "Purchased plans" };
const FIELDS = [
  { id: "p-name", label: "Animal Name", req: true },
  { id: "p-species", label: "Animal type", type: "select", req: true, opts: ["Dog", "Cat", "Sheep", "Goat", "Rabbit", "Poultry", "Cattle"].map((s) => [s, s]) },
  { id: "p-age", label: "Age", type: "select", req: true, opts: Object.entries(AGES) },
  { id: "p-breed", label: "Breed" },
  { id: "p-sex", label: "Sex", type: "radio", req: true, opts: [["male", "Male"], ["female", "Female"]] },
  { id: "p-color", label: "Color/Markings" },
  { id: "p-housing", label: "House/Bedding" },
  { id: "p-feed", label: "Type of Feed" },
  { id: "p-freq", label: "Frequency of feeding", type: "select", opts: [["once", "Once"], ["twice", "Twice"], ["thrice", "Thrice"], ["ad-libitum", "Ad-libitum"]] },
  { id: "p-others", label: "Other animals", type: "radio", req: true, opts: [["yes", "Yes"], ["no", "No"]] },
];
let me = null;
let uid = null;
let pendingEmail = "";

const h = (tag, cls = "", text = "") => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};
const say = (id, message, bad) => {
  $(id).textContent = message;
  $(id).className = `text-xs mt-2 ${bad ? "text-red-700" : "text-emerald-700"}`;
};
const friendly = (error) => (error.status === 429 ? "Too many attempts. Please wait a minute and try again." : error.message);
const shownPhone = (p) => (p ? `+234 (0) ${ngPhone.show(p)}` : "-");
const refresh = () => window.refreshMenu && window.refreshMenu();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const syncName = (full) => { const r = sb.auth.updateUser({ data: nameMeta(full) }); if (r && r.catch) r.catch(() => {}); };

function table(title, rows) {
  const box = h("div", "space-y-1");
  box.append(h("h3", "font-semibold text-xs", title));
  const grid = h("table", "w-full text-xs border border-slate-200");
  const body = h("tbody");
  rows.forEach(([k, v]) => {
    const tr = h("tr", "border-t border-slate-200");
    tr.append(h("th", "text-left font-semibold p-2 w-2/5 align-top bg-slate-50", k), h("td", "p-2 break-words", v || "-"));
    body.append(tr);
  });
  grid.append(body);
  box.append(grid);
  return box;
}
const animalTable = (a) => table(a.name, [
  ["Animal type", a.species], ["Breed", a.breed], ["Age", AGES[a.age_band]], ["Sex", cap(a.sex)], ["Color/Markings", a.color_markings],
  ["House/Bedding", a.housing], ["Type of Feed", a.feed_type], ["Frequency of feeding", cap(a.feed_frequency)],
  ["Other animals", a.other_animals == null ? "" : a.other_animals ? "Yes" : "No"],
  ["Vaccination", a.vaccinated ? `${a.vaccine_name || "Yes"}${a.vaccine_date ? `, ${a.vaccine_date}` : ""}` : "No previous vaccination"],
  ["Registration number", a.registration_no || "Not assigned yet"],
]);
const fromRegistry = (r) => ({ ...r, name: r.pet_name });

function renderFields() {
  const box = $("pet-fields");
  FIELDS.forEach((f) => {
    const wrap = h("div");
    if (f.type === "radio") {
      const set = h("fieldset", "space-y-1");
      set.append(h("legend", "block text-xs font-semibold", f.label));
      f.opts.forEach(([value, text], i) => {
        const label = h("label", "mr-4 text-xs");
        const radio = h("input");
        Object.assign(radio, { type: "radio", name: f.id, value, required: !!f.req && i === 0 });
        label.append(radio, ` ${text}`);
        set.append(label);
      });
      wrap.append(set);
    } else {
      const label = h("label", "block text-xs font-semibold mb-1", f.label);
      label.htmlFor = f.id;
      const control = f.type === "select" ? h("select", INPUT) : h("input", INPUT);
      control.id = f.id;
      control.required = !!f.req;
      if (f.type === "select") {
        control.append(new Option("Choose", ""));
        f.opts.forEach(([value, text]) => control.append(new Option(text, value)));
      } else {
        control.type = "text";
        control.maxLength = 120;
      }
      wrap.append(label, control);
    }
    box.append(wrap);
  });
}
const value = (f) => (f.type === "radio" ? (document.querySelector(`input[name="${f.id}"]:checked`) || {}).value : $(f.id).value.trim());

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  me = null;
  if (session) {
    uid = session.user.id;
    const { data } = await sb.from("profiles").select("full_name,phone,address,role").eq("id", uid).single();
    me = { ...data, email: session.user.email, meta: session.user.user_metadata || {} };
    if (me.full_name && !me.meta.first_name) syncName(me.full_name);
  }
  route();
}

function route() {
  const view = (location.hash || "#dashboard").slice(1);
  const asAdmin = new URLSearchParams(location.search).get("as") === "admin";
  const role = me ? (me.role === "admin" ? "admin" : "client") : null;
  $("login-client").classList.toggle("hidden", !!me || asAdmin);
  $("login-admin").classList.toggle("hidden", !!me || !asAdmin);
  let shown = false;
  document.querySelectorAll("[data-view]").forEach((s) => {
    const on = !!me && s.dataset.view === view && (s.dataset.role === "both" || s.dataset.role === role);
    s.classList.toggle("hidden", !on);
    shown = shown || on;
  });
  const title = $("view-title");
  title.classList.toggle("hidden", !shown);
  title.textContent = shown ? (role === "admin" && view === "plans" ? "Purchased Plans" : TITLES[view]) : "";
  window.scrollTo(0, 0);
  if (!me) return;
  const loaders = { dashboard: role === "admin" ? loadRegistry : loadClient, notifications: role === "admin" ? loadAdminNotes : loadNotes, regno: loadRegno };
  if (loaders[view]) loaders[view]();
}

async function sendCode(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const name = $("su-name").value.trim();
  const email = $("email").value.trim().toLowerCase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? nameMeta(name) : undefined } });
  if (error) return say("auth-msg", friendly(error), true);
  try { localStorage.setItem("aubel:login", JSON.stringify({ name, email })); } catch (e) { /* storage unavailable */ }
  pendingEmail = email;
  $("verify").classList.remove("hidden");
  $("code").focus();
}

async function verifyCode(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token: $("code").value.trim(), type: "email" });
  if (error) return fieldError($("code"), friendly(error));
  location.hash = "dashboard";
  await init();
  refresh();
}

async function passwordLogin(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { error } = await sb.auth.signInWithPassword({ email: $("pw-email").value.trim(), password: $("pw").value });
  if (error) return say("admin-msg", /invalid/i.test(error.message) ? "That email or password is not right." : friendly(error), true);
  location.hash = "dashboard";
  await init();
  refresh();
}

function loadClient() {
  $("owner-table").replaceChildren(table("Owner", [["Name", me.full_name || me.meta.full_name], ["Email", me.email], ["Phone", shownPhone(me.phone)], ["Address", me.address]]));
  $("full_name").value = me.full_name || me.meta.full_name || "";
  $("phone").value = ngPhone.show(me.phone);
  $("address").value = me.address || "";
  loadPets();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const row = { full_name: $("full_name").value.trim(), phone: ngPhone.value($("phone")), address: $("address").value.trim() };
  const { error } = await sb.from("profiles").update(row).eq("id", uid);
  if (error) return say("profile-msg", friendly(error), true);
  me = { ...me, ...row };
  syncName(row.full_name);
  say("profile-msg", "Details saved.");
  loadClient();
}

async function loadPets() {
  const { data, error } = await sb.from("pets").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
  const box = $("pets");
  box.replaceChildren();
  if (error) return say("pet-msg", friendly(error), true);
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No pet(s)/animal(s) saved yet."));
  data.forEach((p) => {
    const card = h("div", "space-y-1");
    card.append(animalTable(p));
    if (!p.registration_no) {
      const remove = h("button", "text-xs text-red-700 font-semibold", "Remove");
      remove.type = "button";
      let armed = false;
      remove.onclick = async () => {
        if (!armed) {
          armed = true;
          remove.textContent = "Tap again to confirm";
          setTimeout(() => { armed = false; remove.textContent = "Remove"; }, 4000);
          return;
        }
        await sb.from("pets").delete().eq("id", p.id);
        loadPets();
      };
      card.append(remove);
    }
    box.append(card);
  });
}

async function addPet(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const v = Object.fromEntries(FIELDS.map((f) => [f.id, value(f)]));
  const vaccinated = $("p-vacc").checked;
  const { error } = await sb.from("pets").insert({
    owner_id: uid, name: v["p-name"], species: v["p-species"], age_band: v["p-age"], breed: v["p-breed"] || null, sex: v["p-sex"],
    color_markings: v["p-color"] || null, housing: v["p-housing"] || null, feed_type: v["p-feed"] || null, feed_frequency: v["p-freq"] || null,
    other_animals: v["p-others"] === "yes", vaccinated, vaccine_name: vaccinated ? $("p-vname").value.trim() || null : null, vaccine_date: vaccinated ? $("p-vdate").value || null : null,
  });
  if (error) return say("pet-msg", friendly(error), true);
  $("pet-form").reset();
  $("vacc-fields").classList.add("hidden");
  say("pet-msg", "Pet/animal added.");
  refresh();
  loadPets();
}

async function loadNotes() {
  const { data, error } = await sb.from("notifications").select("id,message,read,created_at").eq("user_id", uid).order("created_at", { ascending: false });
  const box = $("notes");
  box.replaceChildren();
  if (error) return box.append(h("p", "text-xs text-red-700", friendly(error)));
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No notifications yet."));
  data.forEach((n) => {
    const card = h("div", `border rounded-lg p-3 text-xs ${n.read ? "border-slate-200" : "border-brand-500"}`);
    card.append(h("p", n.read ? "" : "font-bold", n.message), h("p", "text-slate-500", new Date(n.created_at).toLocaleString()));
    box.append(card);
  });
  if (data.some((n) => !n.read)) {
    await sb.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    refresh();
  }
}

async function loadRegno() {
  const { data, error } = await sb.from("pets").select("name,species,registration_no").eq("owner_id", uid).order("created_at", { ascending: false });
  const box = $("regno-list");
  box.replaceChildren();
  if (error) return box.append(h("p", "text-xs text-red-700", friendly(error)));
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No pet(s)/animal(s) saved yet."));
  data.forEach((p) => {
    const card = h("div", "border border-slate-200 rounded-lg p-3 text-xs");
    card.append(h("p", "font-bold text-sm", `${p.name} (${p.species})`), h("p", p.registration_no ? "text-brand-600 font-semibold" : "text-slate-500", p.registration_no || "Not assigned yet"));
    box.append(card);
  });
}

async function sendComplaint(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  if ($("c-text").value.trim().length < 5) return fieldError($("c-text"), "Please describe the complaint (at least 5 characters).");
  const { error } = await sb.from("complaints").insert({ owner_id: uid, registration_no: $("c-reg").value.trim(), message: $("c-text").value.trim() });
  if (error) return /registration number/i.test(error.message) ? fieldError($("c-reg"), error.message) : say("c-msg", friendly(error), true);
  event.target.reset();
  say("c-msg", "Your complaint has been sent to Dr. Aubel.");
}

function twoStep(label, action) {
  const button = h("button", "text-xs text-red-700 font-semibold", label);
  button.type = "button";
  let armed = false;
  button.onclick = async () => {
    if (!armed) {
      armed = true;
      button.textContent = "Tap again to confirm";
      setTimeout(() => { armed = false; button.textContent = label; }, 4000);
      return;
    }
    await action();
  };
  return button;
}

function assignRow(r, done) {
  const line = h("div", "flex gap-2 pt-1");
  const input = h("input", `${INPUT} flex-1`);
  input.type = "text";
  input.value = r.registration_no || "";
  input.placeholder = "Registration number";
  input.maxLength = 40;
  const save = h("button", BTN, "Save");
  save.type = "button";
  const msg = h("p", "text-xs");
  save.onclick = async () => {
    const { error } = await sb.rpc("assign_registration_no", { p_pet: r.pet_id, p_reg: input.value });
    msg.textContent = error ? error.message : "Saved.";
    msg.className = error ? "text-xs text-red-700" : "text-xs text-emerald-700";
    if (!error) { input.value = input.value.trim().toUpperCase(); refresh(); if (done) done(); }
  };
  const wrap = h("div");
  line.append(input, save);
  wrap.append(line, msg);
  return wrap;
}

async function loadRegistry() {
  const { data, error } = await sb.rpc("admin_registry");
  const box = $("registry");
  box.replaceChildren();
  if (error) return say("reg-msg", friendly(error), true);
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No clients yet."));
  const reload = () => { refresh(); loadRegistry(); };
  data.forEach((r) => {
    const row = h("div", "border border-slate-200 rounded-lg p-3 text-xs space-y-1");
    const top = h("div", "flex items-center justify-between gap-2");
    const toggle = h("button", "font-bold text-sm text-brand-600 underline", r.registration_no || "No number yet");
    toggle.type = "button";
    top.append(toggle, h("span", "text-slate-500", new Date(r.registered_at).toLocaleDateString()));
    row.append(top, h("p", "", `${r.pet_name} (${r.species}) | Owner: ${r.owner_name || "-"}`));
    const detail = h("div", "hidden space-y-3 border-t border-slate-200 pt-2");
    detail.append(table("Owner", [["Name", r.owner_name], ["Email", r.email], ["Phone", shownPhone(r.phone)], ["Address", r.address]]));
    data.filter((x) => x.owner_id === r.owner_id).forEach((x) => {
      const block = h("div", "space-y-1");
      block.append(animalTable(fromRegistry(x)), assignRow(x, reload));
      const actions = h("div", "flex gap-4");
      if (x.registration_no) actions.append(twoStep("Remove registration number", async () => { await sb.rpc("admin_remove_registration_no", { p_pet: x.pet_id }); reload(); }));
      actions.append(twoStep("Delete animal record", async () => { await sb.rpc("admin_delete_pet", { p_pet: x.pet_id }); reload(); }));
      block.append(actions);
      detail.append(block);
    });
    toggle.onclick = () => detail.classList.toggle("hidden");
    row.append(detail);
    box.append(row);
  });
}

async function loadAdminNotes() {
  const [reg, com] = await Promise.all([sb.rpc("admin_registry"), sb.rpc("admin_complaints")]);
  const wait = $("a-wait");
  const box = $("a-complaints");
  wait.replaceChildren();
  box.replaceChildren();
  const waiting = (reg.data || []).filter((r) => !r.registration_no);
  if (!waiting.length) wait.append(h("p", "text-xs text-slate-500", "No one is waiting."));
  waiting.forEach((r) => {
    const card = h("div", "border border-brand-500 rounded-lg p-3 text-xs space-y-1");
    card.append(h("p", "font-bold text-sm", `${r.pet_name} (${r.species})`), h("p", "", `Owner: ${r.owner_name || "-"} | ${shownPhone(r.phone)} | ${r.email}`), assignRow(r, loadAdminNotes));
    wait.append(card);
  });
  if (!(com.data || []).length) box.append(h("p", "text-xs text-slate-500", "No complaints yet."));
  (com.data || []).forEach((c) => {
    const card = h("div", `border rounded-lg p-3 text-xs space-y-1 ${c.status === "new" ? "border-brand-500" : "border-slate-200"}`);
    card.append(h("p", "font-bold", `${c.registration_no} | ${c.owner_name || "-"} | ${shownPhone(c.phone)}`), h("p", "", c.message), h("p", "text-slate-500", new Date(c.created_at).toLocaleString()));
    if (c.status === "new") {
      const done = h("button", BTN, "Mark as handled");
      done.type = "button";
      done.onclick = async () => { await sb.rpc("admin_resolve_complaint", { p_id: c.id }); refresh(); loadAdminNotes(); };
      card.append(done);
    }
    box.append(card);
  });
}

renderFields();
try {
  const saved = JSON.parse(localStorage.getItem("aubel:login") || "{}");
  if (saved.name) $("su-name").value = saved.name;
  if (saved.email) { $("email").value = saved.email; $("pw-email").value = saved.email; }
} catch (e) { /* storage unavailable */ }
$("send").addEventListener("submit", sendCode);
$("verify").addEventListener("submit", verifyCode);
$("pw-form").addEventListener("submit", passwordLogin);
$("profile-form").addEventListener("submit", saveProfile);
$("pet-form").addEventListener("submit", addPet);
$("complaint-form").addEventListener("submit", sendComplaint);
$("p-vacc").addEventListener("change", () => $("vacc-fields").classList.toggle("hidden", !$("p-vacc").checked));
$("pw-change-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  if ($("new-pw").value.length < 10) return say("pw-msg", "Please use at least 10 characters.", true);
  const { error } = await sb.auth.updateUser({ password: $("new-pw").value });
  say("pw-msg", error ? friendly(error) : "Password saved.", !!error);
  if (!error) $("new-pw").value = "";
});
window.addEventListener("hashchange", route);
init();
