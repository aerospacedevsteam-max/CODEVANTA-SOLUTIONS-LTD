/*
 * cart-core.js — pure cart, pricing and catalogue helpers (no DOM, no storage).
 * Browser: window.ShopCore. Node: require("./cart-core.js").
 *
 * Money is handled in integer cents to avoid floating-point rounding errors.
 * IMPORTANT: totals shown in the browser are for display only. Your server or
 * payment provider must recalculate prices, shipping and tax before charging.
 */
(function (root) {
  "use strict";

  var MAX_QTY = 99;

  var SHIPPING = {
    standard: { label: "Standard (3–5 working days)", cents: 650, freeOverCents: 7500 },
    express: { label: "Express (1–2 working days)", cents: 1400, freeOverCents: null },
    pickup: { label: "Collect from studio (fictional)", cents: 0, freeOverCents: null }
  };

  function clampQty(qty) {
    var n = Math.floor(Number(qty));
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, MAX_QTY);
  }

  function lineKey(productId, variant) {
    return productId + "|" + (variant || "");
  }

  /** Add a product/variant to the cart; merges with an existing line. Returns a new array. */
  function addItem(cart, productId, variant, qty) {
    var key = lineKey(productId, variant);
    var found = false;
    var next = cart.map(function (line) {
      if (lineKey(line.id, line.variant) === key) {
        found = true;
        return { id: line.id, variant: line.variant, qty: clampQty(line.qty + clampQty(qty)) };
      }
      return { id: line.id, variant: line.variant, qty: line.qty };
    });
    if (!found) next.push({ id: productId, variant: variant || "", qty: clampQty(qty) });
    return next;
  }

  /** Set the quantity of a line. Quantity 0 or less removes it. Returns a new array. */
  function updateQty(cart, productId, variant, qty) {
    var n = Math.floor(Number(qty));
    if (!isFinite(n) || n <= 0) return removeItem(cart, productId, variant);
    var key = lineKey(productId, variant);
    return cart.map(function (line) {
      return lineKey(line.id, line.variant) === key
        ? { id: line.id, variant: line.variant, qty: clampQty(n) }
        : { id: line.id, variant: line.variant, qty: line.qty };
    });
  }

  function removeItem(cart, productId, variant) {
    var key = lineKey(productId, variant);
    return cart.filter(function (line) { return lineKey(line.id, line.variant) !== key; });
  }

  /** Drop malformed lines and lines whose product no longer exists (e.g. tampered storage). */
  function sanitizeCart(raw, products) {
    if (!Array.isArray(raw)) return [];
    var ids = {};
    products.forEach(function (p) { ids[p.id] = true; });
    return raw.filter(function (line) {
      return line && typeof line.id === "string" && ids[line.id] && isFinite(Number(line.qty)) && Number(line.qty) >= 1;
    }).map(function (line) {
      return { id: line.id, variant: typeof line.variant === "string" ? line.variant : "", qty: clampQty(line.qty) };
    });
  }

  function findProduct(products, id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }

  /** Price lines from the catalogue (never trust prices stored client-side). */
  function priceLines(cart, products) {
    return cart.map(function (line) {
      var p = findProduct(products, line.id);
      var unit = p ? p.priceCents : 0;
      return { id: line.id, variant: line.variant, qty: line.qty, product: p, unitCents: unit, lineCents: unit * line.qty };
    }).filter(function (l) { return l.product; });
  }

  function subtotalCents(cart, products) {
    return priceLines(cart, products).reduce(function (sum, l) { return sum + l.lineCents; }, 0);
  }

  function itemCount(cart) {
    return cart.reduce(function (sum, line) { return sum + line.qty; }, 0);
  }

  function shippingCents(method, subtotal) {
    var m = SHIPPING[method];
    if (!m) throw new RangeError("Unknown shipping method: " + method);
    if (subtotal <= 0) return 0;
    if (m.freeOverCents != null && subtotal >= m.freeOverCents) return 0;
    return m.cents;
  }

  /** Full order summary in cents. Tax is intentionally not calculated (do it server-side). */
  function totals(cart, products, method) {
    var sub = subtotalCents(cart, products);
    var ship = shippingCents(method || "standard", sub);
    return { subtotalCents: sub, shippingCents: ship, totalCents: sub + ship, itemCount: itemCount(cart) };
  }

  function formatMoney(cents, currency, locale) {
    return new Intl.NumberFormat(locale || "en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);
  }

  /* ---------- Catalogue filtering & sorting ---------- */

  /**
   * filters = { categories: [], colors: [], maxPriceCents: number|null, inStockOnly: bool }
   * Empty arrays mean "any".
   */
  function filterProducts(products, filters) {
    var f = filters || {};
    var cats = f.categories || [];
    var colors = f.colors || [];
    return products.filter(function (p) {
      if (cats.length && cats.indexOf(p.category) === -1) return false;
      if (colors.length && !p.colors.some(function (c) { return colors.indexOf(c.name) !== -1; })) return false;
      if (f.maxPriceCents != null && p.priceCents > f.maxPriceCents) return false;
      if (f.inStockOnly && !p.inStock) return false;
      return true;
    });
  }

  function sortProducts(products, mode) {
    var list = products.slice();
    var byName = function (a, b) { return a.name.localeCompare(b.name); };
    switch (mode) {
      case "price-asc": return list.sort(function (a, b) { return a.priceCents - b.priceCents || byName(a, b); });
      case "price-desc": return list.sort(function (a, b) { return b.priceCents - a.priceCents || byName(a, b); });
      case "name": return list.sort(byName);
      case "rating": return list.sort(function (a, b) { return b.rating - a.rating || byName(a, b); });
      default: return list.sort(function (a, b) { return a.featuredRank - b.featuredRank; });
    }
  }

  var api = {
    MAX_QTY: MAX_QTY,
    SHIPPING: SHIPPING,
    clampQty: clampQty,
    addItem: addItem,
    updateQty: updateQty,
    removeItem: removeItem,
    sanitizeCart: sanitizeCart,
    findProduct: findProduct,
    priceLines: priceLines,
    subtotalCents: subtotalCents,
    itemCount: itemCount,
    shippingCents: shippingCents,
    totals: totals,
    formatMoney: formatMoney,
    filterProducts: filterProducts,
    sortProducts: sortProducts
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShopCore = api;
})(typeof self !== "undefined" ? self : this);
