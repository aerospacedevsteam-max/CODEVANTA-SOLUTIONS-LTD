/*
 * products.js — product listing: filters (sidebar / mobile drawer), sort, grid.
 * Requires catalog.js, cart-core.js and shop.js.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var core = window.ShopCore;
    var products = window.ShopCatalog.products;
    var grid = document.getElementById("product-grid");
    var form = document.getElementById("filters-form");
    var sortSelect = document.getElementById("sort");
    var count = document.getElementById("result-count");
    if (!grid || !form) return;

    function checked(name) {
      return Array.prototype.map.call(form.querySelectorAll("input[name='" + name + "']:checked"), function (i) { return i.value; });
    }

    function render() {
      var max = form.elements["max-price"].value;
      var filtered = core.filterProducts(products, {
        categories: checked("category[]"),
        colors: checked("color[]"),
        maxPriceCents: max ? Number(max) : null,
        inStockOnly: form.elements["in-stock"].checked
      });
      var list = core.sortProducts(filtered, sortSelect.value);
      count.textContent = list.length + (list.length === 1 ? " product" : " products");

      if (!list.length) {
        grid.innerHTML = '<li class="empty">No products match these filters. <button class="btn-link" type="button" data-clear>Clear all filters</button></li>';
        return;
      }
      grid.innerHTML = list.map(function (p) {
        var name = window.Shop.escapeHtml(p.name);
        return '<li class="product-card">' +
          '<div class="art">' + window.ShopArt.productArt(p, p.colors[0].hex, 0) + "</div>" +
          '<div class="product-card-body">' +
          '<h3><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + name + "</a></h3>" +
          '<p class="price">' + window.Shop.money(p.priceCents) + "</p>" +
          '<p class="meta">' + p.category + " · " + p.colors.length + " colours · Rated " + p.rating.toFixed(1) + " of 5</p>" +
          (p.inStock ? "" : '<span class="badge">Out of stock</span>') +
          "</div></li>";
      }).join("");
    }

    form.addEventListener("change", render);
    sortSelect.addEventListener("change", render);
    form.addEventListener("reset", function () { setTimeout(render, 0); });
    form.addEventListener("submit", function (e) { e.preventDefault(); closeDrawer(true); });
    grid.addEventListener("click", function (e) {
      if (e.target.closest("[data-clear]")) { form.reset(); }
    });

    /* ---------- Mobile filter drawer ---------- */
    var drawer = document.getElementById("filters");
    var openBtn = document.querySelector("[data-filters-open]");
    var closeBtn = document.querySelector("[data-filters-close]");
    var backdrop = document.querySelector("[data-drawer-backdrop]");
    var mobile = window.matchMedia("(max-width: 899.98px)");

    function openDrawer() {
      drawer.classList.add("is-open");
      openBtn.setAttribute("aria-expanded", "true");
      backdrop.hidden = false;
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      closeBtn.focus();
    }
    function closeDrawer(returnFocus) {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      backdrop.hidden = true;
      drawer.removeAttribute("role");
      drawer.removeAttribute("aria-modal");
      if (returnFocus) openBtn.focus();
    }
    if (drawer && openBtn && closeBtn && backdrop) {
      openBtn.addEventListener("click", openDrawer);
      closeBtn.addEventListener("click", function () { closeDrawer(true); });
      backdrop.addEventListener("click", function () { closeDrawer(true); });
      drawer.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { closeDrawer(true); return; }
        // Keep focus inside the drawer while it is open on mobile.
        if (e.key !== "Tab" || !mobile.matches || !drawer.classList.contains("is-open")) return;
        var focusable = drawer.querySelectorAll("button, input, select, a[href]");
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      if (mobile.addEventListener) mobile.addEventListener("change", function () { closeDrawer(false); });
    }

    render();
  });
})();
