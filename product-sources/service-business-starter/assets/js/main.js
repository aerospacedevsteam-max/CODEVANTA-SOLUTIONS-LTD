/* ==========================================================================
   Service Business Starter — main.js
   No dependencies. Loaded with `defer`.
   1. Mobile menu   2. FAQ accordion   3. Booking form validation   4. Year
   ========================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("has-js");

  /* 1. Mobile menu -------------------------------------------------------- */
  var menuButton = document.querySelector(".menu-button");
  var nav = document.getElementById("site-nav");
  if (menuButton && nav) {
    var setMenu = function (open) {
      menuButton.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
    };
    menuButton.addEventListener("click", function () {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
    // Close after choosing an in-page link, and on Escape.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuButton.focus();
      }
    });
  }

  /* 2. FAQ accordion ------------------------------------------------------ */
  // Each trigger is a <button aria-expanded aria-controls> inside a heading.
  // Panels are visible by default (no-JS friendly) and collapsed here.
  document.querySelectorAll(".accordion-trigger").forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!panel) return;
    trigger.setAttribute("aria-expanded", "false");
    panel.hidden = true;
    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });

  /* 3. Booking form ------------------------------------------------------- */
  // DEMO BEHAVIOUR: after client-side validation, the visitor is sent to
  // thank-you.html. NO DATA IS SENT OR STORED. To receive bookings, set the
  // form's action to your form service / server endpoint, use method="post",
  // and delete the `event.preventDefault()` + redirect below (most services
  // can redirect to thank-you.html themselves). See README.md.
  var form = document.getElementById("booking-form");
  if (form) {
    var alertBox = form.querySelector(".form-alert");
    var today = new Date();
    var dateInput = form.querySelector("#date");
    if (dateInput) {
      // Earliest selectable date is today (local time).
      var pad = function (n) { return String(n).padStart(2, "0"); };
      dateInput.min = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
    }

    var checks = {
      fullname: function (v) { return v.trim().length > 1 || "Enter your name."; },
      phone: function (v) {
        return /^[+()\d\s-]{7,20}$/.test(v.trim()) || "Enter a phone number using digits, spaces, +, - or brackets.";
      },
      email: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Enter an email address like name@example.com.";
      },
      service: function (v) { return v !== "" || "Choose the service you need."; },
      postcode: function (v) { return v.trim().length >= 3 || "Enter your postcode or ZIP code."; },
      date: function (v) {
        if (!v) return "Choose a preferred date.";
        return v >= dateInput.min || "Choose today or a later date.";
      },
      timeslot: function () {
        return !!form.querySelector("input[name='timeslot']:checked") || "Choose a time window.";
      }
    };

    var showError = function (name, message) {
      var error = document.getElementById(name + "-error");
      var fields = form.querySelectorAll("[name='" + name + "']");
      fields.forEach(function (f) {
        if (f.type !== "radio") f.setAttribute("aria-invalid", message ? "true" : "false");
      });
      if (error) error.textContent = message || "";
    };

    var validate = function (name) {
      var field = form.elements[name];
      var result = checks[name](field && field.value !== undefined ? field.value : "");
      showError(name, result === true ? "" : result);
      return result === true;
    };

    form.addEventListener("change", function (event) {
      var name = event.target.name;
      if (checks[name] && form.dataset.submitted) validate(name);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault(); // Remove once a real backend is connected.
      form.dataset.submitted = "true";
      var firstBad = null;
      Object.keys(checks).forEach(function (name) {
        if (!validate(name) && !firstBad) firstBad = name;
      });
      if (firstBad) {
        alertBox.textContent = "Some details need attention. Please check the fields marked below.";
        var target = form.querySelector("[name='" + firstBad + "']");
        if (target) target.focus();
        return;
      }
      alertBox.textContent = "";
      window.location.href = "thank-you.html";
    });
  }

  /* 4. Year --------------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
