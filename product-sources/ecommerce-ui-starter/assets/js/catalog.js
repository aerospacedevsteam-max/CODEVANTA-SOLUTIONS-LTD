/*
 * catalog.js — FICTIONAL sample catalogue for "Fernwick Goods", an invented
 * homeware brand. Replace window.ShopCatalog with data from your own API or CMS.
 * Product images are drawn as inline SVG by ShopArt so the kit ships with no
 * image files; swap productArt() for <img> tags when you have photography.
 */
(function (root) {
  "use strict";

  var C = {
    Clay: "#b5643c",
    Sage: "#6f8f72",
    Ink: "#2d3a4f",
    Oat: "#d9c7a7",
    Rose: "#c97b84",
    Mustard: "#c99a2e"
  };
  function colors() {
    return Array.prototype.map.call(arguments, function (n) { return { name: n, hex: C[n] }; });
  }

  var products = [
    { id: "fw-mug-01", name: "Hearth Stoneware Mug", category: "Kitchen", priceCents: 2400, rating: 4.7, featuredRank: 1, inStock: true, shape: "mug",
      colors: colors("Clay", "Sage", "Ink"), sizes: ["300 ml", "450 ml"],
      description: "A weighty, hand-glazed mug with a generous handle, made for slow mornings.",
      details: ["Glazed stoneware", "Dishwasher safe", "Each glaze varies slightly"] },
    { id: "fw-vase-02", name: "Tidepool Bud Vase", category: "Living", priceCents: 3200, rating: 4.5, featuredRank: 2, inStock: true, shape: "vase",
      colors: colors("Sage", "Oat", "Rose"), sizes: [],
      description: "A narrow-necked vase sized for a single stem or a few dried grasses.",
      details: ["Matte ceramic", "Height 18 cm", "Watertight interior glaze"] },
    { id: "fw-lamp-03", name: "Lantern Desk Lamp", category: "Lighting", priceCents: 8900, rating: 4.8, featuredRank: 3, inStock: true, shape: "lamp",
      colors: colors("Ink", "Mustard", "Oat"), sizes: [],
      description: "A small desk lamp with a tilting shade and a soft, warm glow.",
      details: ["Powder-coated steel", "E14 bulb (not included)", "1.8 m fabric cable"] },
    { id: "fw-cushion-04", name: "Meadow Linen Cushion", category: "Textiles", priceCents: 3800, rating: 4.4, featuredRank: 4, inStock: true, shape: "cushion",
      colors: colors("Oat", "Sage", "Rose", "Mustard"), sizes: ["45 × 45 cm", "50 × 50 cm"],
      description: "Washed linen cover with a recycled-fibre inner, piped edge and hidden zip.",
      details: ["100% linen cover", "Machine wash 30°C", "Inner included"] },
    { id: "fw-bowl-05", name: "Shoreline Serving Bowl", category: "Kitchen", priceCents: 4600, rating: 4.6, featuredRank: 5, inStock: true, shape: "bowl",
      colors: colors("Oat", "Ink"), sizes: ["Medium", "Large"],
      description: "A wide, shallow bowl for salads, fruit or the middle of a long table.",
      details: ["Stoneware", "Oven safe to 200°C", "Diameter 28 cm (Large)"] },
    { id: "fw-candle-06", name: "Ember Pillar Candle", category: "Living", priceCents: 1800, rating: 4.2, featuredRank: 6, inStock: true, shape: "candle",
      colors: colors("Oat", "Rose", "Sage"), sizes: ["Small", "Tall"],
      description: "Unscented plant-wax pillar with a cotton wick and a slow, even burn.",
      details: ["Plant-based wax", "Approx. 40 h burn (Tall)", "Never leave a candle unattended"] },
    { id: "fw-planter-07", name: "Fernhill Planter", category: "Living", priceCents: 2900, rating: 4.3, featuredRank: 7, inStock: false, shape: "planter",
      colors: colors("Clay", "Ink"), sizes: ["12 cm", "17 cm"],
      description: "Tapered planter with drainage hole and matching saucer.",
      details: ["Terracotta", "Drainage hole and saucer", "Indoor use"] },
    { id: "fw-throw-08", name: "Harbour Wool Throw", category: "Textiles", priceCents: 11900, rating: 4.9, featuredRank: 8, inStock: true, shape: "throw",
      colors: colors("Ink", "Mustard", "Oat"), sizes: [],
      description: "A soft woven throw with a fringed edge, heavy enough for winter evenings.",
      details: ["Wool blend", "130 × 180 cm", "Dry clean recommended"] },
    { id: "fw-mug-09", name: "Pebble Espresso Cup", category: "Kitchen", priceCents: 1600, rating: 4.1, featuredRank: 9, inStock: true, shape: "mug",
      colors: colors("Rose", "Oat"), sizes: [],
      description: "A small, rounded cup for short coffees and strong opinions.",
      details: ["Porcelain", "90 ml", "Dishwasher safe"] },
    { id: "fw-lamp-10", name: "Dune Floor Lamp", category: "Lighting", priceCents: 16500, rating: 4.6, featuredRank: 10, inStock: true, shape: "lamp",
      colors: colors("Oat", "Ink"), sizes: [],
      description: "A tall lamp with a wide linen shade that throws light across a room.",
      details: ["Oak and steel", "Height 150 cm", "Foot switch"] },
    { id: "fw-vase-11", name: "Grove Tall Vase", category: "Living", priceCents: 5400, rating: 4.4, featuredRank: 11, inStock: true, shape: "vase",
      colors: colors("Ink", "Clay"), sizes: [],
      description: "A statement vase for branches and big seasonal arrangements.",
      details: ["Reactive glaze", "Height 32 cm", "Watertight"] },
    { id: "fw-cushion-12", name: "Quarry Bouclé Cushion", category: "Textiles", priceCents: 4200, rating: 4.0, featuredRank: 12, inStock: true, shape: "cushion",
      colors: colors("Oat", "Ink"), sizes: ["40 × 60 cm"],
      description: "A textured rectangular cushion that softens a reading chair.",
      details: ["Bouclé cover", "Spot clean", "Inner included"] }
  ];

  /* ---------- Inline SVG product illustrations ---------- */
  var SHAPES = {
    mug: function (c) {
      return '<path d="M70 70h90v80a20 20 0 0 1-20 20H90a20 20 0 0 1-20-20z" fill="' + c + '"/>' +
        '<path d="M160 90h12a18 18 0 0 1 0 36h-12" fill="none" stroke="' + c + '" stroke-width="10"/>' +
        '<ellipse cx="115" cy="70" rx="45" ry="7" fill="#000" opacity=".15"/>';
    },
    vase: function (c) {
      return '<path d="M108 40h24v18c0 10 26 22 26 60s-20 52-38 52-38-14-38-52 26-50 26-60z" fill="' + c + '"/>' +
        '<path d="M120 40c-10-20 4-30 14-34M120 40c6-14-6-22-16-26" stroke="#6f8f72" stroke-width="3" fill="none"/>';
    },
    lamp: function (c) {
      return '<path d="M80 50h80l20 50H60z" fill="' + c + '"/><rect x="116" y="100" width="8" height="58" fill="#2d3a4f"/>' +
        '<ellipse cx="120" cy="164" rx="36" ry="8" fill="#2d3a4f"/><ellipse cx="120" cy="104" rx="40" ry="6" fill="#fff3c4" opacity=".7"/>';
    },
    cushion: function (c) {
      return '<rect x="50" y="60" width="140" height="110" rx="26" fill="' + c + '"/>' +
        '<rect x="62" y="72" width="116" height="86" rx="18" fill="none" stroke="#fff" stroke-opacity=".5" stroke-dasharray="5 5" stroke-width="2"/>';
    },
    bowl: function (c) {
      return '<path d="M40 96h160c0 44-36 70-80 70S40 140 40 96z" fill="' + c + '"/>' +
        '<ellipse cx="120" cy="96" rx="80" ry="12" fill="#fff" opacity=".35"/>';
    },
    candle: function (c) {
      return '<rect x="92" y="70" width="56" height="100" rx="6" fill="' + c + '"/><ellipse cx="120" cy="70" rx="28" ry="6" fill="#fff" opacity=".4"/>' +
        '<path d="M120 64v-10" stroke="#2d3a4f" stroke-width="2"/><path d="M120 30c8 10 8 18 0 24-8-6-8-14 0-24z" fill="#e8a33a"/>';
    },
    planter: function (c) {
      return '<path d="M70 100h100l-12 70H82z" fill="' + c + '"/><rect x="64" y="92" width="112" height="14" rx="4" fill="' + c + '"/>' +
        '<path d="M120 92c-4-30-30-40-44-38 6 18 22 32 44 38zM120 92c4-36 26-50 44-48-4 20-22 40-44 48z" fill="#6f8f72"/>';
    },
    throw: function (c) {
      return '<path d="M50 60h140v90H50z" fill="' + c + '"/><path d="M50 84h140M50 126h140" stroke="#fff" stroke-opacity=".45" stroke-width="6"/>' +
        '<path d="M58 150v14M74 150v14M90 150v14M106 150v14M122 150v14M138 150v14M154 150v14M170 150v14M186 150v14" stroke="' + c + '" stroke-width="3"/>';
    }
  };

  var VIEW_BG = ["#f1ece4", "#e8eef0", "#f4ebe9"];
  var VIEW_TRANSFORM = ["", "translate(-60 -50) scale(1.5)", "translate(240 0) scale(-1 1)"];

  /** Return an SVG string (decorative; wrap it in an element with role="img" + label). */
  function productArt(product, colorHex, view) {
    var v = view || 0;
    var draw = SHAPES[product.shape] || SHAPES.bowl;
    return '<svg viewBox="0 0 240 200" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="240" height="200" fill="' + VIEW_BG[v % 3] + '"/>' +
      '<ellipse cx="120" cy="178" rx="70" ry="8" fill="#000" opacity=".08"/>' +
      '<g transform="' + VIEW_TRANSFORM[v % 3] + '">' + draw(colorHex || product.colors[0].hex) + "</g></svg>";
  }

  root.ShopCatalog = { currency: "USD", products: products, colorHex: C };
  root.ShopArt = { productArt: productArt, views: ["Front", "Close-up", "Reverse"] };
})(typeof self !== "undefined" ? self : this);
