const $ = (id) => document.getElementById(id);
const INPUT = "w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg";
const BTN = "bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg";
const AGES = { young: "Under 6 months", juvenile: "6-12 months", adult: "Over 1 year" };
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
const show = (view) => ["auth", "dash"].forEach((v) => $(v).classList.toggle("hidden", v !== view));

async function sendCode(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const email = $("email").value.trim().toLowerCase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: $("su-name").value.trim() ? { full_name: $("su-name").value.trim() } : undefined } });
  if (error) return say("auth-msg", friendly(error), true);
  pendingEmail = email;
  $("verify").classList.remove("hidden");
  say("auth-msg", "We sent a code to your email. Enter it below.");
  $("code").focus();
}

async function verifyCode(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token: $("code").value.trim(), type: "email" });
  if (error) return say("auth-msg", friendly(error), true);
  load();
}

async function passwordLogin(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { error } = await sb.auth.signInWithPassword({ email: $("pw-email").value.trim(), password: $("pw").value });
  if (error) return say("auth-msg", /invalid/i.test(error.message) ? "That email or password is not right. If this account never had a password, use the email code above, or set one with the SQL step in the setup guide." : friendly(error), true);
  load();
}

async function load() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return show("auth");
  show("dash");
  $("who").textContent = session.user.email;
  const { data: me } = await sb.from("profiles").select("full_name,phone,address,role").eq("id", session.user.id).single();
  if (me) {
    $("full_name").value = me.full_name || (session.user.user_metadata && session.user.user_metadata.full_name) || "";
    $("phone").value = me.phone || "";
    $("address").value = me.address || "";
    $("admin-sec").classList.toggle("hidden", me.role !== "admin");
    if (me.role === "admin") loadRegistry();
  }
  loadPets(session.user.id);
}

async function saveProfile(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { data: { session } } = await sb.auth.getSession();
  const { error } = await sb.from("profiles").update({ full_name: $("full_name").value.trim(), phone: $("phone").value.trim(), address: $("address").value.trim() }).eq("id", session.user.id);
  say("profile-msg", error ? friendly(error) : "Details saved.", !!error);
}

async function loadPets(userId) {
  const { data, error } = await sb.from("pets").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
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
      loadPets(userId);
    };
    card.append(info, remove);
    box.append(card);
  });
}

async function addPet(event) {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  const { data: { session } } = await sb.auth.getSession();
  const vaccinated = $("p-vacc").checked;
  const { error } = await sb.from("pets").insert({
    owner_id: session.user.id, name: $("p-name").value.trim(), species: $("p-species").value, breed: $("p-breed").value.trim() || null,
    age_band: $("p-age").value || null, vaccinated, vaccine_name: vaccinated ? $("p-vname").value.trim() || null : null, vaccine_date: vaccinated ? $("p-vdate").value || null : null,
  });
  if (error) return say("pet-msg", friendly(error), true);
  $("pet-form").reset();
  $("vacc-fields").classList.add("hidden");
  say("pet-msg", "Pet added.");
  loadPets(session.user.id);
}

async function loadRegistry() {
  const { data, error } = await sb.rpc("admin_registry");
  const box = $("registry");
  box.replaceChildren();
  if (error) return say("admin-msg", friendly(error), true);
  if (!data.length) box.append(h("p", "text-xs text-slate-500", "No clients yet."));
  data.forEach((r) => {
    const row = h("div", "border border-slate-200 rounded-lg p-3 text-xs space-y-1");
    row.append(
      h("p", "font-bold text-sm", `${r.pet_name} (${r.species}${r.breed ? `, ${r.breed}` : ""})`),
      h("p", "", `Owner: ${r.owner_name || "-"} | ${r.phone || "-"} | ${r.email}`),
      h("p", "", `Address: ${r.address || "-"}`),
      h("p", "text-slate-500", `Registered: ${new Date(r.registered_at).toLocaleDateString()}`),
    );
    const line = h("div", "flex gap-2 pt-1");
    const input = h("input", `${INPUT} flex-1`);
    input.value = r.registration_no || "";
    input.placeholder = "Registration number";
    input.maxLength = 40;
    const save = h("button", BTN, "Save");
    const msg = h("p", "text-xs");
    save.type = "button";
    save.onclick = async () => {
      const { error: err } = await sb.rpc("assign_registration_no", { p_pet: r.pet_id, p_reg: input.value });
      msg.textContent = err ? err.message : "Saved.";
      msg.className = err ? "text-xs text-red-700" : "text-xs text-emerald-700";
      if (!err) input.value = input.value.trim().toUpperCase();
    };
    line.append(input, save);
    row.append(line, msg);
    box.append(row);
  });
}

$("send").addEventListener("submit", sendCode);
$("verify").addEventListener("submit", verifyCode);
$("pw-form").addEventListener("submit", passwordLogin);
$("profile-form").addEventListener("submit", saveProfile);
$("pet-form").addEventListener("submit", addPet);
$("p-vacc").addEventListener("change", () => $("vacc-fields").classList.toggle("hidden", !$("p-vacc").checked));
$("pw-change-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!inlineValidate(event.target)) return;
  if ($("new-pw").value.length < 10) return say("pw-msg", "Please use at least 10 characters.", true);
  const { error } = await sb.auth.updateUser({ password: $("new-pw").value });
  say("pw-msg", error ? friendly(error) : "Password saved. You can now use it under “Admin: use a password instead”.", !!error);
  if (!error) $("new-pw").value = "";
});
$("signout").addEventListener("click", async () => { await sb.auth.signOut(); show("auth"); });
load();
