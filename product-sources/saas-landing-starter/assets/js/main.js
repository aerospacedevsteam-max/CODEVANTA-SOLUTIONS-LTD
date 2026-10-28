/*
 * main.js — interactive behaviour for the SaaS Landing Starter.
 * Requires pricing.js to be loaded first (for the pricing toggle).
 * Every feature checks that its markup exists, so blocks can be removed freely.
 */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close after choosing a link (small screens) and on Escape.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    // Reset state when resizing up to desktop.
    var mq = window.matchMedia("(min-width: 900px)");
    var onChange = function () { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
  }

  /* ---------- Pricing monthly / yearly toggle ---------- */
  function initPricing() {
    var form = document.querySelector("[data-billing-toggle]");
    var pricing = window.SaasPricing;
    if (!form || !pricing) return;
    var discount = Number(form.getAttribute("data-discount")) || 0;
    var currency = form.getAttribute("data-currency") || "USD";
    var status = document.getElementById("billing-status");
    var plans = document.querySelectorAll("[data-plan-monthly]");

    function render(cycle) {
      plans.forEach(function (plan) {
        var monthly = Number(plan.getAttribute("data-plan-monthly"));
        var display = pricing.planDisplay(monthly, cycle, discount, currency);
        var amount = plan.querySelector("[data-plan-amount]");
        var note = plan.querySelector("[data-plan-note]");
        if (amount) amount.textContent = display.amount;
        if (note) note.textContent = display.note;
      });
      if (status) {
        status.textContent = cycle === "yearly"
          ? "Showing yearly prices, " + discount + "% off."
          : "Showing monthly prices.";
      }
    }

    form.addEventListener("change", function (event) {
      if (event.target.name === "billing") render(event.target.value);
    });
    var checked = form.querySelector("input[name='billing']:checked");
    render(checked ? checked.value : "monthly");
  }

  /* ---------- FAQ accordion ---------- */
  function initAccordion() {
    document.querySelectorAll("[data-accordion]").forEach(function (accordion) {
      var triggers = Array.prototype.slice.call(accordion.querySelectorAll(".faq-trigger"));

      triggers.forEach(function (trigger, index) {
        var panel = document.getElementById(trigger.getAttribute("aria-controls"));
        // Panels are visible without JS; collapse the ones marked as closed.
        if (panel) panel.hidden = trigger.getAttribute("aria-expanded") !== "true";
        trigger.addEventListener("click", function () {
          var open = trigger.getAttribute("aria-expanded") === "true";
          trigger.setAttribute("aria-expanded", String(!open));
          if (panel) panel.hidden = open;
        });
        // Arrow / Home / End keys move between headers (WAI-ARIA accordion pattern).
        trigger.addEventListener("keydown", function (event) {
          var next = null;
          if (event.key === "ArrowDown") next = triggers[(index + 1) % triggers.length];
          else if (event.key === "ArrowUp") next = triggers[(index - 1 + triggers.length) % triggers.length];
          else if (event.key === "Home") next = triggers[0];
          else if (event.key === "End") next = triggers[triggers.length - 1];
          if (next) { event.preventDefault(); next.focus(); }
        });
      });
    });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.documentElement.classList.remove("no-js");

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initPricing();
    initAccordion();
    initYear();
  });
})();
