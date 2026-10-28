# Service Business Starter

A one-page website template for a local service business, such as home repairs, cleaning, gardening or consulting, with a separate thank-you page. Plain HTML5, CSS and vanilla JavaScript: no build step, no frameworks, no external fonts, images, CDNs or tracking.

"Brightbirch Home Services", the prices and the neighbourhood names are invented placeholders.

## What's included

```
service-business-starter/
├── index.html        Hero with booking CTA, pricing cards, process steps,
│                     service areas, FAQ accordion, booking/enquiry form
├── thank-you.html    Confirmation page shown after the form is submitted
├── assets/
│   ├── css/styles.css   All styles; theme tokens in the :root block
│   └── js/main.js       Mobile menu, FAQ accordion, booking form validation, year
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

## Getting started

Open `index.html` in a browser. No server or build step is needed. To publish, upload the folder to any static host.

## Customising

### Colours and shape
Edit the `:root` block at the top of `assets/css/styles.css`:
- `--brand` and `--brand-deep` set the main colour (header text, headings and the dark "How it works" band).
- `--cta` and `--cta-hover` set the colour of the booking buttons. White text sits on top of them, so keep them dark enough for at least 4.5:1 contrast.
- `--highlight` is used on dark backgrounds.
- `--radius-sm` and `--radius-lg` control how rounded the corners are.

The logo and illustrations are inline SVGs with fixed colours. Search for `#1d3f8f`, `#13285c`, `#c2410c` and `#ffd166` in the HTML to recolour them.

### Fonts
The template uses system font stacks (`--font-sans` and `--font-display`), so nothing is downloaded. To use your own font, host the files in `assets/fonts/`, add `@font-face` rules, and update the variables.

### Content
- **Prices** are marked "(placeholder)". Replace them with your real rates, or use "From £…" or "Free quote". Say whether prices include tax.
- **Service areas**: edit the list in the `#areas` section. The map is a stylised SVG, not a real map.
- **FAQ**: copy a `<h3><button …></button></h3>` and `<div class="accordion-panel">` pair. Give each panel a unique `id` and set the button's `aria-controls` to that id.
- **Booking form**: add or remove fields. If you add a required field, add a rule for it in the `checks` object in `main.js` and a `<p class="field-error" id="NAME-error">` element under it.

### Form backend (required before going live)
The booking form **does not send or store any data**. After it passes validation in the browser, it opens `thank-you.html`. That page shows a "Template demo notice" saying that nothing has been sent. To accept real bookings:

1. Choose a backend: **a hosted form service** (copy its endpoint URL) or **your own server** endpoint that accepts POST requests and validates every field again on the server.
2. In `index.html`, set the form's `action` to your endpoint and change `method="get"` to `method="post"`.
3. In `assets/js/main.js` (section 3), remove `event.preventDefault()` and the `window.location.href = "thank-you.html"` redirect. Most form services can redirect to `thank-you.html` themselves. Alternatively, submit with `fetch()` and redirect when the request succeeds.
4. Delete the `.demo-banner` paragraph from `thank-you.html` and the demo note under the submit button.
5. Add spam protection that your backend supports.

Without JavaScript, the form submits with GET straight to `thank-you.html`, so the field values appear in the address bar. Connecting a POST backend removes this.

## Browser support

Uses CSS custom properties, grid, flexbox, `clamp()`, counters, `accent-color` and `:focus-visible`, plus `String.prototype.padStart` and `Element.closest` in JavaScript. It targets the current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported. `<input type="date">` uses each browser's own date picker.

What we checked before release:
- `html-validate` (recommended rules): 0 errors on both pages.
- `node --check` on `assets/js/main.js`.
- A script that confirms every internal link, asset and `#fragment` resolves.
- Headless Chrome at 320, 375, 768, 1024 and 1440 px: no horizontal scrolling. The mobile menu, accordion, form validation and redirect to `thank-you.html` were tested by script, with no JavaScript errors.

We did not test manually in Firefox, Safari or on real devices. Test there before you launch.

## Accessibility notes

- Skip link, labelled `nav` landmarks, one `h1` per page and a logical heading order.
- The mobile menu button uses `aria-expanded` and `aria-controls`. It closes on Escape and after you choose a link. Without JavaScript the menu stays visible.
- The FAQ follows the accordion pattern: a `<button aria-expanded aria-controls>` inside a heading controls a panel. Panels are visible if JavaScript is off.
- Every field has a label. The time-window radio buttons sit inside a `<fieldset>` with a `<legend>`. Errors are linked with `aria-describedby`, the summary alert uses `role="alert"`, and focus moves to the first invalid field.
- Focus rings are visible on light, dark and footer backgrounds.
- `prefers-reduced-motion` turns off smooth scrolling and transitions.
- The default colours were chosen to meet WCAG AA contrast. Check them again after rebranding.

## Licence

See `LICENSE.txt`.
