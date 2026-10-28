/*
 * confirmation.js — shows the last demo order saved by checkout.js.
 * In production, render this page from your server using the verified order
 * and payment status, not from browser storage.
 * Requires catalog.js, cart-core.js and shop.js.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var Shop = window.Shop;
    var order = Shop.getLastOrder();
    var found = document.getElementById("order-found");
    var missing = document.getElementById("order-missing");
    if (!found || !missing) return;

    if (!order || !Array.isArray(order.lines)) {
      found.hidden = true;
      missing.hidden = false;
      return;
    }

    document.getElementById("order-number").textContent = order.number;
    document.getElementById("order-name").textContent = order.firstName ? ", " + order.firstName : "";
    document.getElementById("order-email").textContent = order.emailMasked || "your email address";
    document.getElementById("order-date").textContent = new Date(order.placedAt).toLocaleString();
    document.getElementById("order-shipping").textContent = order.shippingLabel;
    document.getElementById("order-lines").innerHTML = order.lines.map(function (l) {
      return "<li><span>" + Number(l.qty) + " × " + Shop.escapeHtml(l.name) +
        (l.variant ? ' <span class="meta">(' + Shop.escapeHtml(l.variant) + ")</span>" : "") +
        "</span><span>" + Shop.money(Number(l.lineCents)) + "</span></li>";
    }).join("");
    document.getElementById("order-subtotal").textContent = Shop.money(order.totals.subtotalCents);
    document.getElementById("order-delivery").textContent = order.totals.shippingCents === 0 ? "Free" : Shop.money(order.totals.shippingCents);
    document.getElementById("order-total").textContent = Shop.money(order.totals.totalCents);
  });
})();
