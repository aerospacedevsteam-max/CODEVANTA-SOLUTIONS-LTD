/* ==========================================================================
   Portfolio Starter — main.js
   No dependencies. Loaded with `defer`.
   1. Theme toggle   2. Mobile nav   3. Project filter   4. Contact form   5. Year
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;

  /* 1. Theme toggle ------------------------------------------------------- */
  var themeButton = document.querySelector(".theme-toggle");
  function applyTheme(theme, save) {
    root.setAttribute("data-theme", theme);
    if (themeButton) themeButton.setAttribute("aria-pressed", String(theme === "dark"));
    if (save) {
      try {
        window.localStorage.setItem("portfolio-theme", theme);
      } catch (e) {
        /* Storage unavailable: the theme still changes for this page view. */
      }
    }
  }
  if (themeButton) {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
    themeButton.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  /* 2. Mobile navigation -------------------------------------------------- */
  var navButton = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (navButton && nav) {
    var setNav = function (open) {
      navButton.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
    };
    navButton.addEventListener("click", function () {
      setNav(navButton.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navButton.getAttribute("aria-expanded") === "true") {
        setNav(false);
        navButton.focus();
      }
    });
  }

  /* 3. Project filter ----------------------------------------------------- */
  // Buttons carry data-filter="tag" ("all" shows everything).
  // Cards carry data-tags="tag1 tag2". Matching is by whole word.
  var filterBar = document.querySelector("[data-filters]");
  if (filterBar) {
    var buttons = filterBar.querySelectorAll("[data-filter]");
    var cards = document.querySelectorAll("[data-tags]");
    var count = document.getElementById("result-count");
    var filterProjects = function (tag) {
      var shown = 0;
      cards.forEach(function (card) {
        var tags = card.getAttribute("data-tags").split(/\s+/);
        var match = tag === "all" || tags.indexOf(tag) !== -1;
        card.hidden = !match;
        if (match) shown += 1;
      });
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === tag));
      });
      if (count) count.textContent = "Showing " + shown + " of " + cards.length + " projects.";
    };
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { filterProjects(b.getAttribute("data-filter")); });
    });
    filterBar.hidden = false; // The filter bar is hidden in the HTML so no-JS users never see dead buttons.
    filterProjects("all");
  }

  /* 4. Contact form ------------------------------------------------------- */
  // DEMO ONLY: nothing is sent. Connect the form to a form service or your own
  // server endpoint (set action + method="post") and remove preventDefault().
  var form = document.getElementById("contact-form");
  if (form) {
    var notice = form.querySelector(".notice");
    var rules = {
      "c-name": function (v) { return v.trim() ? "" : "Please add your name."; },
      "c-email": function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please add a valid email address."; },
      "c-message": function (v) { return v.trim().length >= 10 ? "" : "Please write at least 10 characters."; }
    };
    var check = function (id) {
      var input = document.getElementById(id);
      var msg = rules[id](input.value);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      document.getElementById(id + "-error").textContent = msg;
      return !msg;
    };
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // Remove when connected to a real backend.
      var invalid = Object.keys(rules).filter(function (id) { return !check(id); });
      if (invalid.length) {
        notice.textContent = "";
        document.getElementById(invalid[0]).focus();
        return;
      }
      notice.textContent = "Demo only: your message passed validation but was NOT sent. " +
        "The site owner needs to connect this form to a form service or server.";
      form.reset();
      Object.keys(rules).forEach(function (id) { document.getElementById(id).removeAttribute("aria-invalid"); });
    });
  }

  /* 5. Year --------------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
