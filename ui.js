// Inline form messages shared by every page: errors appear under the field, never in a pop-up window.
(function () {
  const keyOf = (el) => (el.type === "radio" ? el.name : el.id || el.name);
  const holderOf = (el) => el.closest("fieldset") || (el.type === "checkbox" && el.closest("label") && el.closest("label").parentElement) || el.parentElement;
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
  window.inlineValidate = (form) => {
    let first = null;
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      window.clearFieldError(el);
      const hiddenInside = el.closest(".hidden");
      if (el.disabled || el.type === "hidden" || (hiddenInside && hiddenInside !== form && form.contains(hiddenInside)) || el.checkValidity()) return;
      window.fieldError(el, el.validity.valueMissing ? "This field is required." : el.type === "email" ? "Please enter a valid email address." : "Please check this field.");
      first = first || el;
    });
    if (first) first.focus();
    return !first;
  };
  const clear = (e) => e.target && e.target.matches && e.target.matches("input, select, textarea") && window.clearFieldError(e.target);
  document.addEventListener("input", clear);
  document.addEventListener("change", clear);
})();
