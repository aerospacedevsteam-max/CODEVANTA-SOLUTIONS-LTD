# E-commerce UI Starter

The front-end pages of an online shop, from product listing to order confirmation, written in plain HTML5, CSS and vanilla JavaScript. It needs no build step, framework, CDN, web font or image file. The demo brand, **Fernwick Goods**, and all twelve products are fictional. Product pictures are drawn as inline SVG.

> **This is a UI kit, not a working shop.** It does not take payment, create real orders or calculate tax. The checkout's payment step is a clearly labelled placeholder panel and contains no card fields. To sell anything you must connect a backend and a real payment provider (see below).

Open `products.html` in a browser to start.

## What's included

```
ecommerce-ui-starter/
├── products.html              Listing: product grid, filter sidebar (a drawer on mobile), sort
├── product.html               Product detail: gallery and thumbnails, colour/size, quantity, add to cart, tabs (?id=…)
├── cart.html                  Cart: change quantity, remove items, live totals
├── checkout.html              Four-step checkout: contact → address → delivery → payment placeholder and review
├── order-confirmation.html    Confirmation of the last demo order
├── assets/
│   ├── css/shop.css           All styles; design tokens in a single :root block
│   └── js/
│       ├── catalog.js         FICTIONAL catalogue (window.ShopCatalog) and SVG product art (window.ShopArt)
│       ├── cart-core.js       Pure cart, shipping, filter and sort logic, in integer cents (window.ShopCore)
│       ├── shop.js            Shared: safe localStorage, cart persistence, header cart count, tabs (window.Shop)
│       ├── products.js        Listing page
│       ├── product.js         Product detail page
│       ├── cart.js            Cart page
│       ├── checkout.js        Checkout steps
│       └── confirmation.js    Confirmation page
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

Every page loads `catalog.js`, `cart-core.js` and `shop.js` first, then its own page script.

## How the demo works

- The cart is stored in `localStorage` under the key `fernwick-cart-v1` as `[{ id, variant, qty }]`. Every read and write is wrapped in `try/catch`. If storage is blocked, the cart is kept in memory for the current page, and a corrupted value is treated as an empty cart.
- Prices are **never** read from storage. Cart lines are priced from the catalogue each time (`priceLines()`), and unknown products and invalid quantities are dropped (`sanitizeCart()`).
- All money is handled in integer cents to avoid floating-point errors. Quantities are limited to 1–99.
- Delivery: standard costs $6.50 and is free from $75; express costs $14; collection is free. You can change these in `SHIPPING` in `cart-core.js`.
- When a demo order is placed, the confirmation page receives only the order number, first name, a **masked** email address, the delivery method, the order lines and the totals. These are saved under `fernwick-last-order-v1`. The street address and phone number are not stored.

## Customising

- **Theme.** Edit the `:root` block in `shop.css`. Headings use `--font-display`, which defaults to a system serif. The colour swatches use the `.swatch-<name>` classes; add one for each new colour name.
- **Products.** Edit the `products` array in `catalog.js`. Each product needs an `id`, `name`, `category`, `priceCents`, `rating`, `featuredRank`, `inStock`, `shape`, `colors[]` (`{ name, hex }`), `sizes[]` (which can be empty), a `description` and `details[]`. If you add a category or colour, add a matching checkbox to the filter form in `products.html`.
- **Real photos.** Replace `ShopArt.productArt()` calls with `<img src alt width height>` tags. Use the product name and variant as the `alt` text in the gallery, and keep the thumbnail buttons' `aria-label`s.
- **Copy and policies.** The shipping and returns text and the product copy are examples. Replace them with your own policies and check that they comply with consumer law where you sell.

## Connecting a backend

1. **Catalogue.** Load products from your API or CMS. You can set `window.ShopCatalog` before the page scripts run, or `fetch()` the data and then render. Keep prices in cents, or convert them when the data arrives.
2. **Cart.** For multi-device carts, keep the cart on the server keyed by session, and use `localStorage` only as a cache. Whatever the client sends, **recalculate prices, discounts, delivery and tax on the server.**
3. **Tax.** No tax is calculated. Work it out on the server, or with your payment or tax provider, using the delivery address.
4. **Payment (required).** In `checkout.html`, replace the `.payment-placeholder` panel with your payment provider's component, either an embedded secure-fields widget or a redirect to its hosted payment page. Do not add your own card number, expiry or CVC inputs, and never send card data to your own server or store it in the browser. The "Place demo order" handler in `checkout.js` should instead:
   - create the order on your server and get back an amount and a payment session from your provider,
   - confirm the payment with the provider's SDK,
   - redirect to a confirmation URL that your server renders after it has verified the payment (for example with a webhook), instead of reading from `localStorage`.
5. **Validation.** The checkout checks required fields and email format in the browser for usability only. Validate everything again on the server.
6. **Privacy.** If you add marketing opt-ins, accounts or analytics, provide a privacy notice and get consent as required in your jurisdiction. The demo's newsletter checkbox starts unchecked.

## Accessibility notes

- Each page has a skip link, landmarks, one `h1` and headings in order. The demo banner sits above the header so it is read first.
- **Header cart link:** the visible count badge is `aria-hidden`, and a visually hidden text such as ", 3 items" is read with the link instead.
- **Listing:** filters are native checkboxes and a `select`, grouped in `fieldset`/`legend`. The result count is a `role="status"` live region. On mobile, the filter panel becomes a modal drawer (`role="dialog"` and `aria-modal` while open). Focus moves into it, <kbd>Tab</kbd> stays inside, and <kbd>Esc</kbd> or the backdrop closes it and returns focus to the "Filters" button. Each product card is fully clickable through a stretched link, with a focus ring on the whole card.
- **Product page:** the gallery image has `role="img"` and a label that names the colour and view. Thumbnails are buttons with `aria-pressed`. Colour and size are native radio groups. The quantity stepper buttons have labels. The "Added to cart" message is a `role="status"` live region. Information tabs follow the WAI-ARIA tabs pattern.
- **Cart:** each quantity input and Remove button names its product for screen readers. After a change, a status message announces the update or removal, and focus moves somewhere sensible.
- **Checkout:** the progress list marks the current step with `aria-current="step"`. Each step is a `fieldset` whose `legend` is focused when the step opens. Invalid fields get `aria-invalid` and a linked error message, and focus moves to the first error. The `autocomplete` attributes help autofill.
- Visible `:focus-visible` outlines are used throughout, and `prefers-reduced-motion` is respected.
- We calculated contrast for the token pairs (text, muted text, buttons, links, borders, notice panel) and all meet 4.5:1 for text or 3:1 for borders.

## Browser support

The kit is written for current versions of Chrome, Edge, Firefox and Safari. It uses CSS Grid, custom properties, `aspect-ratio`, `:focus-visible`, `localStorage`, `URLSearchParams`, `matchMedia` and `Intl.NumberFormat`. One effect uses `:has()`: the highlighted border on the selected delivery option. In browsers without `:has()`, only that highlight is missing; the radio button still works and is still visible.

**What was actually checked:**

- `npx html-validate` with `html-validate:recommended` reports 0 errors on all five pages.
- `node --check` passes on every JS file.
- `cart-core.js` and the catalogue passed 21 Node assertions. These covered adding and merging lines, the quantity cap, updating and removing lines, cleaning corrupted carts, subtotals in cents, the free-delivery threshold, totals, filtering and every sort mode.
- All five pages were loaded in jsdom 30 (a simulated DOM, not a real browser) and the scripts ran with no errors. The tests ran this flow:
  - filter and sort the listing, see the empty state, reset, and open and close the drawer;
  - change gallery view and colour, step the quantity and add to cart;
  - update a quantity and remove a line in the cart, with the totals and free-delivery hint changing;
  - check that checkout blocks invalid fields, steps through, and recalculates delivery;
  - check that the payment step has no data inputs, and that the demo acknowledgement is required;
  - check that the saved order holds no street address, and that the confirmation renders.
  
  Empty-cart checkout, a missing order and corrupted storage were also tested.
- All internal links and id references resolve.

**Not checked:** the kit has not been tested by hand in a real browser, at real screen widths (the layout is built for 320–1440 px), or with a screen reader. Do that before you ship.

## Licence

See `LICENSE.txt`. The kit contains no third-party code, fonts or images.
