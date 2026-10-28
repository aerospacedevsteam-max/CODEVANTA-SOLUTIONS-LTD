/*
 * pricing.js — pure pricing calculations (no DOM access).
 * Loaded in the browser as window.SaasPricing and usable in Node via require().
 */
(function (root) {
  "use strict";

  /** Round a number to 2 decimal places, avoiding floating-point drift. */
  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Effective per-month price when billed yearly.
   * @param {number} monthly  list price per month
   * @param {number} discountPercent  0–100
   */
  function yearlyMonthlyEquivalent(monthly, discountPercent) {
    var m = Number(monthly);
    var d = Number(discountPercent);
    if (!isFinite(m) || m < 0) throw new RangeError("monthly must be a non-negative number");
    if (!isFinite(d) || d < 0 || d > 100) throw new RangeError("discountPercent must be between 0 and 100");
    return round2(m * (1 - d / 100));
  }

  /** Amount charged once per year on yearly billing. */
  function yearlyTotal(monthly, discountPercent) {
    return round2(yearlyMonthlyEquivalent(monthly, discountPercent) * 12);
  }

  /** How much a customer saves per year by choosing yearly billing. */
  function yearlySavings(monthly, discountPercent) {
    return round2(Number(monthly) * 12 - yearlyTotal(monthly, discountPercent));
  }

  /**
   * Format a price for display. Whole numbers render without decimals.
   * @param {number} amount
   * @param {string} [currency] ISO 4217 code, default "USD"
   * @param {string} [locale] BCP 47 tag, default "en-US"
   */
  function formatPrice(amount, currency, locale) {
    var whole = Math.round(amount * 100) % 100 === 0;
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /** Build the display strings for one plan in one billing mode. */
  function planDisplay(monthly, cycle, discountPercent, currency, locale) {
    if (cycle !== "monthly" && cycle !== "yearly") throw new RangeError("cycle must be 'monthly' or 'yearly'");
    if (Number(monthly) === 0) {
      return { amount: formatPrice(0, currency, locale), note: "Free forever" };
    }
    if (cycle === "monthly") {
      return { amount: formatPrice(Number(monthly), currency, locale), note: "Billed monthly" };
    }
    return {
      amount: formatPrice(yearlyMonthlyEquivalent(monthly, discountPercent), currency, locale),
      note: "Billed " + formatPrice(yearlyTotal(monthly, discountPercent), currency, locale) +
        " yearly (save " + formatPrice(yearlySavings(monthly, discountPercent), currency, locale) + ")"
    };
  }

  var api = {
    round2: round2,
    yearlyMonthlyEquivalent: yearlyMonthlyEquivalent,
    yearlyTotal: yearlyTotal,
    yearlySavings: yearlySavings,
    formatPrice: formatPrice,
    planDisplay: planDisplay
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.SaasPricing = api;
  }
})(typeof self !== "undefined" ? self : this);
