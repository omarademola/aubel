const $ = (id) => document.getElementById(id);
const INPUT = "w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg";
const BTN = "bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg";
const AGES = { young: "Under 6 months", juvenile: "6-12 months", adult: "Over 1 year" };
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

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  me = null;
  if (session) {
    uid = session.user.id;
    const { data } = await sb.from("profiles").select("full_name,phone,address,role").eq("id", uid).single();
    me = { ...data, meta: session.user.user_metadata || {} };
  }
  route();
}

function route() {
  const view = (location.hash || "#dashboard").slice(1);
  const asAdmin = new URLSearchParams(location.search).get("as") === "admin";
  const role = me ? (me.role === "admin" ? "admin" : "client") : null;
  $("login-client").classList.toggle("hidden", !!me || asAdmin);
  $("login-admin").classList.toggle("hidden", !!me || !asAdmin);
  document.querySelectorAll("[data-view]").forEach((s) => s.classList.toggle("hidden", !(me && s.dataset.view === view && (s.dataset.role === "both" || s.dataset.role === role))));
  if (!me) return;
  const loaders = {
    dashboard: role === "admin" ? loadRegistry : loadClient,
    notifications: role === "admin" ? loadAdminNotes : loadNotes,
    regno: loadRegno,
  };
  if (loaders[view]) loaders[view]();
}

async function sendCode(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const name = $("su-name").value.trim();
  const email = $("email").value.trim().toLowerCase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? { full_name: name } : undefined } });
  if (error) return say("auth-msg", friendly(error), true);
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
  $("full_name").value = me.full_name || me.meta.full_name || "";
  $("phone").value = ngPhone.show(me.phone);
  $("address").value = me.address || "";
  loadPets();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { error } = await sb.from("profiles").update({ full_name: $("full_name").value.trim(), phone: ngPhone.value($("phone")), address: $("address").value.trim() }).eq("id", uid);
  say("profile-msg", error ? friendly(error) : "Details saved.", !!error);
}

async function loadPets() {
  const { data, error } = await sb.from("pets").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
  const box = $("pets");
  box.replaceChildren();
  if (error) return say("pet-msg", friendly(error), true);
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No pets saved yet."));
  data.forEach((p) => {
    const card = h("div", "border border-slate-200 rounded-lg p-3 flex justify-between gap-3");
    const info = h("div", "text-xs space-y-0.5");
    info.append(
      h("p", "font-bold text-sm", p.name),
      h("p", "", `${p.species}${p.breed ? `, ${p.breed}` : ""}, ${AGES[p.age_band] || "age not set"}`),
      h("p", "", p.vaccinated ? `Vaccinated: ${p.vaccine_name || "yes"}${p.vaccine_date ? `, ${p.vaccine_date}` : ""}` : "No previous vaccination"),
      h("p", "text-brand-600 font-semibold", p.registration_no ? `Registration no: ${p.registration_no}` : "Registration number pending"),
    );
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
    card.append(info, remove);
    box.append(card);
  });
}

async function addPet(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const vaccinated = $("p-vacc").checked;
  const { error } = await sb.from("pets").insert({
    owner_id: uid, name: $("p-name").value.trim(), species: $("p-species").value, breed: $("p-breed").value.trim() || null,
    age_band: $("p-age").value || null, vaccinated, vaccine_name: vaccinated ? $("p-vname").value.trim() || null : null, vaccine_date: vaccinated ? $("p-vdate").value || null : null,
  });
  if (error) return say("pet-msg", friendly(error), true);
  $("pet-form").reset();
  $("vacc-fields").classList.add("hidden");
  say("pet-msg", "Pet added.");
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
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No pets saved yet."));
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

function assignRow(r, done) {
  const line = h("div", "flex gap-2 pt-1");
  const input = h("input", `${INPUT} flex-1`);
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
  data.forEach((r) => {
    const row = h("div", "border border-slate-200 rounded-lg p-3 text-xs space-y-1");
    const top = h("div", "flex items-center justify-between gap-2");
    const toggle = h("button", "font-bold text-sm text-brand-600 underline", r.registration_no || "No number yet");
    toggle.type = "button";
    top.append(toggle, h("span", "text-slate-500", new Date(r.registered_at).toLocaleDateString()));
    row.append(top, h("p", "", `${r.pet_name} (${r.species}) | Owner: ${r.owner_name || "-"}`));
    const detail = h("div", "hidden space-y-1 border-t border-slate-200 pt-2");
    detail.append(h("p", "font-semibold", "Owner profile"), h("p", "", `${r.owner_name || "-"} | ${shownPhone(r.phone)} | ${r.email}`), h("p", "", `Address: ${r.address || "-"}`), h("p", "font-semibold pt-1", "Pets and animals"));
    data.filter((x) => x.owner_id === r.owner_id).forEach((x) => {
      const vacc = x.vaccinated ? `vaccinated${x.vaccine_name ? ` (${x.vaccine_name}${x.vaccine_date ? `, ${x.vaccine_date}` : ""})` : ""}` : "not vaccinated";
      detail.append(h("p", "", `${x.pet_name}: ${x.species}${x.breed ? `, ${x.breed}` : ""}, ${AGES[x.age_band] || "age not set"}, ${vacc}, no. ${x.registration_no || "pending"}`));
    });
    detail.append(assignRow(r, loadRegistry));
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
