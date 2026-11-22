// Site menu on the LEFT of the logo. Desktop: opens on hover (pure CSS). Mobile: slides in from the left under the header
// (swipe right from the left side, or tap the icon). It never covers the logo or the header.
(function () {
  const host = document.getElementById("site-menu");
  if (!host || !window.sb) return;
  const desktop = () => window.matchMedia("(min-width: 768px)").matches;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const trigger = make("button", "menu-btn");
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Menu");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const dot = make("span", "menu-dot hidden");
  trigger.append(dot);
  const panel = make("nav", "menu-panel");
  panel.setAttribute("aria-label", "Site menu");
  const overlay = make("div", "menu-overlay hidden");
  host.append(trigger, overlay, panel);

  const setNavHeight = () => {
    const nav = host.closest("nav");
    if (nav) document.documentElement.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
  };
  setNavHeight();
  window.addEventListener("resize", setNavHeight);

  const isOpen = () => panel.classList.contains("open");
  const open = () => {
    setNavHeight();
    panel.classList.add("open");
    overlay.classList.toggle("hidden", desktop());
    trigger.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    panel.classList.remove("open");
    overlay.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
  };
  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  let start = null;
  document.addEventListener("touchstart", (e) => { start = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!start || desktop()) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = Math.abs(e.changedTouches[0].clientY - start.y);
    if (dy < 50 && dx > 70 && start.x < 60) open();
    if (dy < 50 && dx < -70 && isOpen()) close();
    start = null;
  }, { passive: true });

  const here = () => {
    const page = location.pathname.split("/").pop() || "index.html";
    if (page !== "account.html") return page;
    return location.hash ? `account.html${location.hash}` : location.search ? `account.html${location.search}` : "account.html#dashboard";
  };
  const markActive = () => panel.querySelectorAll("a.menu-item").forEach((a) => (a.getAttribute("href") === here() ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));

  const item = (label, href, count) => {
    const a = make("a", "menu-item", label);
    a.href = href;
    if (count) a.append(make("span", "menu-badge", String(count)));
    a.addEventListener("click", close);
    return a;
  };

  async function render() {
    const { data: { session } } = await sb.auth.getSession();
    const nodes = [];
    let total = 0;
    if (!session) {
      nodes.push(item("Client Login / Sign up", "account.html?as=client"), item("Admin Login", "account.html?as=admin"));
    } else {
      const { data: me } = await sb.from("profiles").select("role").eq("id", session.user.id).single();
      if (me && me.role === "admin") {
        const { data: n } = await sb.rpc("admin_badge");
        total = n || 0;
        nodes.push(item("Dashboard", "account.html#dashboard"), item("Notification", "account.html#notifications", total), item("Purchased Plans", "account.html#plans"));
      } else {
        const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", session.user.id).eq("read", false);
        total = count || 0;
        nodes.push(item("Dashboard", "account.html#dashboard"), item("Purchased plans", "account.html#plans"), item("Notification", "account.html#notifications", total), item("Registration Number", "account.html#regno"), item("Complaint", "account.html#complaint"));
      }
      const out = make("button", "menu-item danger", "Sign out");
      out.type = "button";
      out.addEventListener("click", async () => { await sb.auth.signOut(); location.href = "index.html"; });
      nodes.push(out);
    }
    panel.replaceChildren(...nodes);
    dot.classList.toggle("hidden", !total);
    markActive();
  }
  window.refreshMenu = render;
  window.addEventListener("hashchange", markActive);
  render();
  sb.auth.onAuthStateChange(() => setTimeout(render, 0));
})();
