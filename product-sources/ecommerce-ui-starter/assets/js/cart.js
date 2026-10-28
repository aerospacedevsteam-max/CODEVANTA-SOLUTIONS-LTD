/*
 * cart.js — cart page: quantity update, remove, live totals (localStorage).
 * Requires catalog.js, cart-core.js and shop.js.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var core = window.ShopCore;
    var Shop = window.Shop;
    var products = window.ShopCatalog.products;
    var list = document.getElementById("cart-lines");
    var emptyMsg = document.getElementById("cart-empty");
    var summary = document.getElementById("cart-summary");
    var status = document.getElementById("cart-status");
    if (!list) return;

    function renderTotals(cart) {
      var t = core.totals(cart, products, "standard");
      document.getElementById("sum-items").textContent = String(t.itemCount);
      document.getElementById("sum-subtotal").textContent = Shop.money(t.subtotalCents);
      document.getElementById("sum-shipping").textContent = t.shippingCents === 0 ? "Free" : Shop.money(t.shippingCents);
      document.getElementById("sum-total").textContent = Shop.money(t.totalCents);
      var free = core.SHIPPING.standard.freeOverCents;
      document.getElementById("sum-free-hint").textContent = t.subtotalCents >= free
        ? "You qualify for free standard delivery."
        : "Spend " + Shop.money(free - t.subtotalCents) + " more for free standard delivery.";
    }

    function render() {
      var cart = Shop.getCart();
      var lines = core.priceLines(cart, products);
      emptyMsg.hidden = lines.length > 0;
      summary.hidden = lines.length === 0;
      list.innerHTML = lines.map(function (l, i) {
        var name = Shop.escapeHtml(l.product.name);
        var variant = Shop.escapeHtml(l.variant);
        var qtyId = "qty-" + i;
        return '<li class="cart-line" data-id="' + l.id + '" data-variant="' + variant + '">' +
          '<div class="art">' + window.ShopArt.productArt(l.product, Shop.variantHex(l.product, l.variant), 0) + "</div>" +
          "<div>" +
          '<h2><a href="product.html?id=' + encodeURIComponent(l.id) + '">' + name + "</a></h2>" +
          '<p class="meta">' + (variant || "Standard") + " · " + Shop.money(l.unitCents) + " each</p>" +
          '<div class="cart-line-actions">' +
          '<div class="field"><label for="' + qtyId + '">Quantity <span class="visually-hidden">for ' + name + "</span></label>" +
          '<input class="qty-input" type="number" id="' + qtyId + '" min="0" max="' + core.MAX_QTY + '" value="' + l.qty + '" inputmode="numeric"></div>' +
          '<button class="btn-link" type="button" data-remove>Remove <span class="visually-hidden">' + name + "</span></button>" +
          '<span class="line-total">' + Shop.money(l.lineCents) + "</span>" +
          "</div></div></li>";
      }).join("");
      renderTotals(cart);
      Shop.updateCartCount(cart);
    }

    function lineOf(el) {
      var li = el.closest(".cart-line");
      // getAttribute returns the entity-decoded value, matching the stored variant string.
      return li ? { id: li.getAttribute("data-id"), variant: li.getAttribute("data-variant"), li: li } : null;
    }

    // Quantity: update on change (blur / Enter / spinner), set 0 to remove.
    list.addEventListener("change", function (e) {
      if (!e.target.classList.contains("qty-input")) return;
      var line = lineOf(e.target);
      var inputId = e.target.id;
      var cart = core.updateQty(Shop.getCart(), line.id, line.variant, e.target.value);
      Shop.saveCart(cart);
      render();
      var same = document.getElementById(inputId);
      if (same) same.focus();
      status.textContent = "Cart updated. Total " + document.getElementById("sum-total").textContent + ".";
    });

    list.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove]");
      if (!btn) return;
      var line = lineOf(btn);
      var name = line.li.querySelector("h2").textContent;
      Shop.saveCart(core.removeItem(Shop.getCart(), line.id, line.variant));
      render();
      status.textContent = name + " removed from your cart.";
      // Move focus somewhere sensible after the row disappears.
      var next = list.querySelector(".qty-input") || document.getElementById("continue-link");
      if (next) next.focus();
    });

    render();
  });
})();
