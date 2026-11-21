// Site menu: hover dropdown on desktop, slide-in drawer on mobile (swipe right from the left side, or tap the menu button).
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
  const trigger = make("button", "relative text-xs md:text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-lg", "☰ Menu");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  const dot = make("span", "menu-dot hidden");
  trigger.append(dot);
  const overlay = make("div", "menu-overlay hidden");
  const panel = make("nav", "menu-panel bg-white border border-slate-200 shadow-xl space-y-1");
  panel.setAttribute("aria-label", "Site menu");
  host.append(trigger);
  document.body.append(overlay, panel);

  let timer;
  const isOpen = () => panel.classList.contains("open");
  const open = () => {
    clearTimeout(timer);
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
  [trigger, panel].forEach((node) => {
    node.addEventListener("mouseenter", () => desktop() && open());
    node.addEventListener("mouseleave", () => desktop() && (timer = setTimeout(close, 180)));
  });
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

  const item = (label, href, count) => {
    const a = make("a", "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 hover:bg-brand-50", label);
    a.href = href;
    if (count) a.append(make("span", "bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full", String(count)));
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
      const out = make("button", "w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50", "Sign out");
      out.type = "button";
      out.addEventListener("click", async () => { await sb.auth.signOut(); location.href = "index.html"; });
      nodes.push(out);
    }
    panel.replaceChildren(...nodes);
    dot.classList.toggle("hidden", !total);
  }
  window.refreshMenu = render;
  render();
  sb.auth.onAuthStateChange(() => setTimeout(render, 0));
})();
