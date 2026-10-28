/*
 * shop.js — shared helpers for every page: safe localStorage, cart persistence,
 * header cart count and accessible tabs. Requires catalog.js and cart-core.js.
 */
(function (root) {
  "use strict";

  var CART_KEY = "fernwick-cart-v1";
  var ORDER_KEY = "fernwick-last-order-v1";
  var memory = {}; // fallback when storage is blocked (private mode, disabled cookies)

  function read(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memory[key] || null;
    }
  }
  function write(key, value) {
    memory[key] = value;
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(key) {
    delete memory[key];
    try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  function getCart() {
    return root.ShopCore.sanitizeCart(read(CART_KEY), root.ShopCatalog.products);
  }
  function saveCart(cart) {
    write(CART_KEY, cart);
    updateCartCount(cart);
  }

  function updateCartCount(cart) {
    var count = root.ShopCore.itemCount(cart || getCart());
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = String(count); });
    document.querySelectorAll("[data-cart-label]").forEach(function (el) {
      el.textContent = ", " + count + (count === 1 ? " item" : " items");
    });
  }

  function money(cents) {
    return root.ShopCore.formatMoney(cents, root.ShopCatalog.currency);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Colour hex for a variant string such as "Sage / 450 ml". */
  function variantHex(product, variant) {
    var name = String(variant || "").split(" / ")[0];
    for (var i = 0; i < product.colors.length; i++) if (product.colors[i].name === name) return product.colors[i].hex;
    return product.colors[0].hex;
  }

  /* WAI-ARIA tabs with arrow-key navigation (automatic activation). */
  function initTabs(scope) {
    (scope || document).querySelectorAll("[role='tablist']").forEach(function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") next = tabs[0];
          else if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
    });
  }

  root.Shop = {
    getCart: getCart,
    saveCart: saveCart,
    updateCartCount: updateCartCount,
    getLastOrder: function () { return read(ORDER_KEY); },
    saveLastOrder: function (order) { return write(ORDER_KEY, order); },
    clearCart: function () { remove(CART_KEY); updateCartCount([]); },
    money: money,
    escapeHtml: escapeHtml,
    variantHex: variantHex,
    initTabs: initTabs
  };

  document.addEventListener("DOMContentLoaded", function () { updateCartCount(); });
})(window);
