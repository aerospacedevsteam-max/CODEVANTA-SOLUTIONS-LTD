/* ==========================================================================
   Portfolio Starter — theme.js
   Loaded WITHOUT `defer` in <head> so the saved theme is applied before the
   page paints (prevents a flash of the wrong theme). Keep this file tiny.
   Order of preference: saved choice -> operating system setting -> light.
   ========================================================================== */
(function () {
  "use strict";
  var theme = null;
  try {
    theme = window.localStorage.getItem("portfolio-theme");
  } catch (e) {
    theme = null; // Storage can be blocked (private mode, strict settings).
  }
  if (theme !== "light" && theme !== "dark") {
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.add("has-js");
})();
