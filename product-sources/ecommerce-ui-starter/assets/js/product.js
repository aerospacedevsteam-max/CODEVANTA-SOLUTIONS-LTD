/*
 * product.js — product detail page: gallery, variant selectors, quantity,
 * add to cart and tabs. Reads ?id= from the URL (defaults to the first product).
 * Requires catalog.js, cart-core.js and shop.js.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var core = window.ShopCore;
    var Shop = window.Shop;
    var art = window.ShopArt;
    var products = window.ShopCatalog.products;
    var root = document.getElementById("pdp");
    if (!root) return;

    var id = new URLSearchParams(window.location.search).get("id");
    var product = core.findProduct(products, id) || products[0];
    var view = 0;

    document.title = product.name + " — Fernwick Goods";
    document.getElementById("crumb-current").textContent = product.name;
    document.getElementById("pdp-title").textContent = product.name;
    document.getElementById("pdp-price").textContent = Shop.money(product.priceCents);
    document.getElementById("pdp-desc").textContent = product.description;
    document.getElementById("pdp-meta").textContent = product.category + " · Rated " + product.rating.toFixed(1) + " of 5 (fictional reviews)";
    document.getElementById("tab-details-list").innerHTML = product.details.map(function (d) {
      return "<li>" + Shop.escapeHtml(d) + "</li>";
    }).join("");

    /* ---------- Variant options ---------- */
    var colorWrap = document.getElementById("color-options");
    colorWrap.innerHTML = product.colors.map(function (c, i) {
      return '<label class="option"><input type="radio" name="color" value="' + c.name + '"' + (i === 0 ? " checked" : "") + ">" +
        '<span><span class="swatch-dot swatch-' + c.name.toLowerCase() + '"></span>' + c.name + "</span></label>";
    }).join("");

    var sizeGroup = document.getElementById("size-group");
    var sizeWrap = document.getElementById("size-options");
    if (product.sizes.length) {
      sizeWrap.innerHTML = product.sizes.map(function (s, i) {
        return '<label class="option"><input type="radio" name="size" value="' + Shop.escapeHtml(s) + '"' + (i === 0 ? " checked" : "") + "><span>" + Shop.escapeHtml(s) + "</span></label>";
      }).join("");
    } else {
      sizeGroup.hidden = true;
    }

    function selected(name) {
      var input = root.querySelector("input[name='" + name + "']:checked");
      return input ? input.value : "";
    }
    function currentVariant() {
      return [selected("color"), selected("size")].filter(Boolean).join(" / ");
    }
    function currentHex() { return Shop.variantHex(product, selected("color")); }

    /* ---------- Gallery ---------- */
    var main = document.getElementById("gallery-main");
    var thumbs = document.getElementById("thumbs");

    function renderGallery() {
      var hex = currentHex();
      main.innerHTML = art.productArt(product, hex, view);
      main.setAttribute("aria-label", product.name + " in " + selected("color") + ", " + art.views[view].toLowerCase() + " view (illustration)");
      thumbs.innerHTML = art.views.map(function (label, i) {
        return '<li><button class="thumb" type="button" data-view="' + i + '" aria-pressed="' + (i === view) + '" aria-label="Show ' + label.toLowerCase() + ' view">' +
          art.productArt(product, hex, i) + "</button></li>";
      }).join("");
    }
    thumbs.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-view]");
      if (!btn) return;
      view = Number(btn.getAttribute("data-view"));
      renderGallery();
      var again = thumbs.querySelector("[data-view='" + view + "']");
      if (again) again.focus();
    });
    root.addEventListener("change", function (e) {
      if (e.target.name === "color") renderGallery();
    });

    /* ---------- Quantity ---------- */
    var qty = document.getElementById("qty");
    qty.max = String(core.MAX_QTY);
    root.querySelectorAll("[data-qty-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        qty.value = String(core.clampQty(Number(qty.value) + Number(btn.getAttribute("data-qty-step"))));
      });
    });
    qty.addEventListener("change", function () { qty.value = String(core.clampQty(qty.value)); });

    /* ---------- Add to cart ---------- */
    var addBtn = document.getElementById("add-to-cart");
    var notice = document.getElementById("cart-notice");
    if (!product.inStock) {
      addBtn.disabled = true;
      addBtn.textContent = "Out of stock";
    }
    document.getElementById("buy-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!product.inStock) return;
      var amount = core.clampQty(qty.value);
      var cart = core.addItem(Shop.getCart(), product.id, currentVariant(), amount);
      Shop.saveCart(cart);
      notice.innerHTML = "";
      notice.appendChild(document.createTextNode("Added " + amount + " × " + product.name + " (" + currentVariant() + ") to your cart. "));
      var link = document.createElement("a");
      link.href = "cart.html";
      link.textContent = "View cart";
      notice.appendChild(link);
    });

    renderGallery();
    Shop.initTabs(document);
  });
})();
