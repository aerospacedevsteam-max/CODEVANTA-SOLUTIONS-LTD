/*
 * checkout.js — multi-step checkout UI (contact → address → delivery → payment).
 * This is a FRONT-END DEMO. It does not take payment. The payment step is a
 * placeholder panel: integrate a real payment provider's hosted fields or
 * redirect there, and create/verify the order on your server.
 * Requires catalog.js, cart-core.js and shop.js.
 */
(function () {
  "use strict";

  function maskEmail(email) {
    var parts = String(email).split("@");
    if (parts.length !== 2) return "";
    return parts[0].charAt(0) + "•••@" + parts[1];
  }

  document.addEventListener("DOMContentLoaded", function () {
    var core = window.ShopCore;
    var Shop = window.Shop;
    var products = window.ShopCatalog.products;
    var form = document.getElementById("checkout-form");
    if (!form) return;

    var steps = Array.prototype.slice.call(form.querySelectorAll(".checkout-step"));
    var indicators = Array.prototype.slice.call(document.querySelectorAll("#step-list li"));
    var current = 0;

    /* ---------- Summary sidebar ---------- */
    function shippingMethod() {
      var r = form.querySelector("input[name='shipping']:checked");
      return r ? r.value : "standard";
    }
    function renderSummary() {
      var cart = Shop.getCart();
      var lines = core.priceLines(cart, products);
      var t = core.totals(cart, products, shippingMethod());
      document.getElementById("co-lines").innerHTML = lines.map(function (l) {
        return "<li><span>" + l.qty + " × " + Shop.escapeHtml(l.product.name) +
          (l.variant ? ' <span class="meta">(' + Shop.escapeHtml(l.variant) + ")</span>" : "") +
          "</span><span>" + Shop.money(l.lineCents) + "</span></li>";
      }).join("");
      document.getElementById("co-subtotal").textContent = Shop.money(t.subtotalCents);
      document.getElementById("co-shipping").textContent = t.shippingCents === 0 ? "Free" : Shop.money(t.shippingCents);
      document.getElementById("co-total").textContent = Shop.money(t.totalCents);
      // Price labels on the delivery options
      Object.keys(core.SHIPPING).forEach(function (key) {
        var el = document.getElementById("price-" + key);
        if (el) {
          var c = core.shippingCents(key, t.subtotalCents);
          el.textContent = c === 0 ? "Free" : Shop.money(c);
        }
      });
      return { cart: cart, lines: lines, totals: t };
    }

    var initial = renderSummary();
    if (!initial.lines.length) {
      document.getElementById("checkout-empty").hidden = false;
      form.closest(".cart-layout").hidden = true;
      return;
    }

    /* ---------- Steps ---------- */
    function showStep(index, focus) {
      current = index;
      steps.forEach(function (s, i) { s.hidden = i !== index; });
      indicators.forEach(function (li, i) {
        if (i === index) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
        li.classList.toggle("is-done", i < index);
      });
      if (index === steps.length - 1) renderReview();
      if (focus) {
        var heading = steps[index].querySelector("legend");
        steps[index].setAttribute("tabindex", "-1");
        steps[index].focus();
        if (heading) steps[index].scrollIntoView({ block: "start" });
      }
    }

    function fieldError(input, message) {
      var err = document.getElementById("err-" + input.id);
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (err) { err.textContent = message; err.hidden = false; }
      } else {
        input.removeAttribute("aria-invalid");
        if (err) { err.textContent = ""; err.hidden = true; }
      }
    }

    function validateStep(index) {
      var firstInvalid = null;
      steps[index].querySelectorAll("input, select").forEach(function (input) {
        if (input.type === "radio" || input.type === "checkbox") return;
        if (input.checkValidity()) fieldError(input, "");
        else {
          fieldError(input, input.validity.valueMissing ? "This field is required." : input.validationMessage);
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    form.addEventListener("click", function (e) {
      var next = e.target.closest("[data-next]");
      var back = e.target.closest("[data-back]");
      if (next && validateStep(current)) showStep(current + 1, true);
      if (back) showStep(current - 1, true);
    });
    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true" && e.target.checkValidity()) fieldError(e.target, "");
    });
    form.addEventListener("change", function (e) {
      if (e.target.name === "shipping") renderSummary();
    });

    /* ---------- Review (final step) ---------- */
    function val(id) { return document.getElementById(id).value.trim(); }
    function renderReview() {
      var method = core.SHIPPING[shippingMethod()];
      var rows = [
        ["Email", val("email")],
        ["Deliver to", [val("full-name"), val("address1"), val("address2"), val("city"), val("postcode"), document.getElementById("country").selectedOptions[0].text].filter(Boolean).join(", ")],
        ["Delivery", method.label]
      ];
      document.getElementById("review").innerHTML = rows.map(function (r) {
        return "<dt>" + r[0] + "</dt><dd>" + Shop.escapeHtml(r[1]) + "</dd>";
      }).join("");
    }

    /* ---------- Place demo order ---------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (current !== steps.length - 1) {
        // Enter pressed inside an earlier step: behave like "Continue".
        if (validateStep(current)) showStep(current + 1, true);
        return;
      }
      var ack = document.getElementById("demo-ack");
      if (!ack.checked) {
        fieldError(ack, "Please confirm you understand this is a demo.");
        ack.focus();
        return;
      }
      fieldError(ack, "");
      var summary = renderSummary();
      // Only minimal, masked details are kept in the browser for the confirmation page.
      var order = {
        number: "FW-DEMO-" + String(Date.now()).slice(-6),
        placedAt: new Date().toISOString(),
        firstName: val("full-name").split(" ")[0],
        emailMasked: maskEmail(val("email")),
        shippingLabel: core.SHIPPING[shippingMethod()].label,
        lines: summary.lines.map(function (l) {
          return { name: l.product.name, variant: l.variant, qty: l.qty, lineCents: l.lineCents };
        }),
        totals: summary.totals
      };
      Shop.saveLastOrder(order);
      Shop.clearCart();
      window.location.href = "order-confirmation.html";
    });

    showStep(0, false);
  });
})();
