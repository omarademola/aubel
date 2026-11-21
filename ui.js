// Inline form messages shared by every page: errors appear under the field, never in a pop-up window.
(function () {
  const keyOf = (el) => (el.type === "radio" ? el.name : el.id || el.name);
  const holderOf = (el) => el.closest("fieldset") || (el.dataset.type === "ngphone" && el.parentElement.parentElement) || (el.type === "checkbox" && el.closest("label") && el.closest("label").parentElement) || el.parentElement;
  window.clearFieldError = (el) => {
    holderOf(el).querySelectorAll(`.field-error[data-for="${keyOf(el)}"]`).forEach((n) => n.remove());
    el.removeAttribute("aria-invalid");
  };
  window.fieldError = (el, message) => {
    window.clearFieldError(el);
    const note = document.createElement("p");
    note.className = "field-error text-xs text-red-700 mt-1";
    note.dataset.for = keyOf(el);
    note.setAttribute("role", "alert");
    note.textContent = message;
    holderOf(el).append(note);
    el.setAttribute("aria-invalid", "true");
  };
  const NAME = /^[\p{L}][\p{L}\p{M} .'-]+$/u;
  window.ngPhone = {
    digits: (raw) => { let d = String(raw || "").replace(/\D/g, ""); if (d.startsWith("234")) d = d.slice(3); if (d.startsWith("0")) d = d.slice(1); return d.slice(0, 10); },
    format: (d) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" "),
    value: (el) => `+234${window.ngPhone.digits(el.value)}`,
    show: (stored) => window.ngPhone.format(window.ngPhone.digits(stored)),
  };
  const customCheck = (el) => {
    if (el.dataset.type === "name" && !NAME.test(el.value.trim())) return "Enter a valid name using letters only.";
    if (el.dataset.type === "ngphone" && window.ngPhone.digits(el.value).length !== 10) return "Enter the 10 digits after +234 (0), for example 810 871 0868.";
    return "";
  };
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches("[data-type=ngphone]")) e.target.value = window.ngPhone.format(window.ngPhone.digits(e.target.value)); });
  window.inlineValidate = (form) => {
    let first = null;
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      window.clearFieldError(el);
      const hiddenInside = el.closest(".hidden");
      if (el.disabled || el.type === "hidden" || (hiddenInside && hiddenInside !== form && form.contains(hiddenInside))) return;
      const message = !el.checkValidity()
        ? el.validity.valueMissing ? "This field is required." : el.type === "email" ? "Please enter a valid email address." : "Please check this field."
        : customCheck(el);
      if (!message) return;
      window.fieldError(el, message);
      first = first || el;
    });
    if (first) first.focus();
    return !first;
  };
  const clear = (e) => e.target && e.target.matches && e.target.matches("input, select, textarea") && window.clearFieldError(e.target);
  document.addEventListener("input", clear);
  document.addEventListener("change", clear);
})();
