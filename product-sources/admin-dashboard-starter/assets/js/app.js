/*
 * app.js — shared shell behaviour: collapsible sidebar, tabs, settings form demo.
 * Load on every page. Features only run if their markup exists.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "dash-sidebar-collapsed";

  function readPref() {
    try { return window.localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { return false; }
  }
  function writePref(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Sidebar: off-canvas on mobile, collapsible on desktop ---------- */
  function initSidebar() {
    var app = document.querySelector(".app");
    var sidebar = document.getElementById("sidebar");
    var toggle = document.querySelector("[data-sidebar-toggle]");
    var backdrop = document.querySelector("[data-backdrop]");
    if (!app || !sidebar || !toggle) return;
    var desktop = window.matchMedia("(min-width: 900px)");

    function sync() {
      if (desktop.matches) {
        var collapsed = app.classList.contains("is-collapsed");
        sidebar.classList.remove("is-open");
        sidebar.removeAttribute("inert");
        if (backdrop) backdrop.hidden = true;
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      } else {
        var open = sidebar.classList.contains("is-open");
        // Hidden off-canvas sidebar must not receive focus.
        if (open) sidebar.removeAttribute("inert"); else sidebar.setAttribute("inert", "");
        if (backdrop) backdrop.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      }
    }

    function closeMobile(returnFocus) {
      sidebar.classList.remove("is-open");
      sync();
      if (returnFocus) toggle.focus();
    }

    if (readPref()) app.classList.add("is-collapsed");

    toggle.addEventListener("click", function () {
      if (desktop.matches) {
        var collapsed = !app.classList.contains("is-collapsed");
        app.classList.toggle("is-collapsed", collapsed);
        writePref(collapsed);
        sync();
      } else {
        var open = !sidebar.classList.contains("is-open");
        sidebar.classList.toggle("is-open", open);
        sync();
        if (open) {
          var first = sidebar.querySelector("a");
          if (first) first.focus();
        }
      }
    });
    if (backdrop) backdrop.addEventListener("click", function () { closeMobile(false); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !desktop.matches && sidebar.classList.contains("is-open")) closeMobile(true);
    });
    if (desktop.addEventListener) desktop.addEventListener("change", sync);
    sync();
  }

  /* ---------- Tabs (WAI-ARIA tabs pattern, automatic activation) ---------- */
  function initTabs() {
    document.querySelectorAll("[role='tablist']").forEach(function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute("aria-selected", String(selected));
          t.tabIndex = selected ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !selected;
        });
        if (focus) tab.focus();
        if (tab.id && window.history && window.history.replaceState) {
          window.history.replaceState(null, "", "#" + tab.id);
        }
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (event) {
          var next = null;
          if (event.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          else if (event.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (event.key === "Home") next = tabs[0];
          else if (event.key === "End") next = tabs[tabs.length - 1];
          if (next) { event.preventDefault(); select(next, true); }
        });
      });

      // Open the tab named in the URL hash, e.g. settings.html#tab-security
      var fromHash = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
      var initial = tabs.indexOf(fromHash) !== -1 ? fromHash : tabs.filter(function (t) {
        return t.getAttribute("aria-selected") === "true";
      })[0] || tabs[0];
      if (initial) select(initial, false);
    });
  }

  /* ---------- Settings forms (demo only: nothing is sent anywhere) ---------- */
  function initDemoForms() {
    document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
      var status = form.querySelector("[data-form-status]");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        // Replace this block with a fetch() to your own API.
        if (status) status.textContent = "Saved (demo only — connect this form to your API).";
      });
      form.addEventListener("reset", function () {
        if (status) status.textContent = "Changes discarded.";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSidebar();
    initTabs();
    initDemoForms();
  });
})();
