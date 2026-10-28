/* ==========================================================================
   Business Website Starter — main.js
   Plain JavaScript, no dependencies. Loaded with `defer` on every page.
   1. Mobile navigation toggle
   2. FAQ accordion: keep one item open at a time (optional enhancement)
   3. Contact form validation (demo only — see the note in initContactForm)
   4. Current year in the footer
   ========================================================================== */
(function () {
  "use strict";

  // Lets the CSS know JavaScript is running (the mobile menu collapses only then).
  document.documentElement.classList.add("has-js");

  /* 1. Mobile navigation ------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close with Escape and return focus to the toggle button.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset state when resizing up to the desktop layout.
    var desktop = window.matchMedia("(min-width: 48rem)");
    var onChange = function () { if (desktop.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onChange);
  }

  /* 2. FAQ accordion ------------------------------------------------------ */
  // Uses native <details>/<summary>, which already works without JS.
  // This only closes the other items when one is opened.
  function initFaq() {
    var groups = document.querySelectorAll("[data-faq]");
    groups.forEach(function (group) {
      var items = group.querySelectorAll("details");
      items.forEach(function (item) {
        item.addEventListener("toggle", function () {
          if (!item.open) return;
          items.forEach(function (other) { if (other !== item) other.open = false; });
        });
      });
    });
  }

  /* 3. Contact form ------------------------------------------------------- */
  // IMPORTANT: this form does NOT send anything. A static site cannot deliver
  // email by itself. To make it work, point the <form action="..."> at a form
  // backend (a hosted form service, or your own server endpoint), set
  // method="post", and remove the `event.preventDefault()` call below once you
  // no longer want the local demo confirmation. See README.md, "Form backend".
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var status = form.querySelector(".form-status");

    var rules = {
      name: function (v) { return v.trim().length >= 2 ? "" : "Please enter your name."; },
      email: function (v) {
        if (!v.trim()) return "Please enter your email address.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email address, like name@example.com.";
      },
      topic: function (v) { return v ? "" : "Please choose a topic."; },
      message: function (v) { return v.trim().length >= 10 ? "" : "Please write a message of at least 10 characters."; },
      consent: function (v, el) { return el.checked ? "" : "Please confirm you agree to be contacted."; }
    };

    function validateField(el) {
      var rule = rules[el.name];
      if (!rule) return true;
      var message = rule(el.value, el);
      var errorEl = document.getElementById(el.id + "-error");
      el.setAttribute("aria-invalid", message ? "true" : "false");
      if (errorEl) errorEl.textContent = message;
      return !message;
    }

    form.addEventListener("blur", function (event) {
      var el = event.target;
      if (el.name && el.getAttribute("aria-invalid") !== null) validateField(el);
    }, true);

    form.addEventListener("submit", function (event) {
      event.preventDefault(); // Remove when a real backend is connected.
      var firstInvalid = null;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && rules[el.name] && !validateField(el) && !firstInvalid) firstInvalid = el;
      });

      status.className = "form-status";
      if (firstInvalid) {
        status.classList.add("is-error");
        status.textContent = "Please fix the highlighted fields and try again.";
        firstInvalid.focus();
        return;
      }

      status.classList.add("is-success");
      status.textContent = "Demo confirmation: your details passed validation, but this message has NOT been sent. " +
        "Connect the form to a form service or your own server to receive enquiries.";
      form.reset();
      Array.prototype.forEach.call(form.elements, function (el) { el.removeAttribute("aria-invalid"); });
    });
  }

  /* 4. Footer year -------------------------------------------------------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  initNav();
  initFaq();
  initContactForm();
  initYear();
})();
