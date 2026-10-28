# SaaS Landing Starter

A static landing page for a software product, written in plain HTML5, CSS and vanilla JavaScript. It needs no build step, framework, CDN, web font or image file. The demo brand, **Tidegrid**, is fictional.

Open `index.html` in a browser to see the page. Open `components.html` for notes on each block.

## What's included

```
saas-landing-starter/
├── index.html            Landing page (all sections)
├── components.html       Component guide with copy-paste notes for each block
├── assets/
│   ├── css/styles.css    All styles; design tokens in a single :root block
│   └── js/
│       ├── pricing.js    Pure pricing maths (no DOM), exposed as window.SaasPricing
│       └── main.js       Mobile nav, monthly/yearly pricing toggle, FAQ accordion, footer year
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

Sections on `index.html`: sticky header with mobile menu, hero with a product UI mock built from HTML/CSS/SVG, a placeholder logo strip (clearly labelled), a feature grid, alternating text-and-illustration rows, a pricing table with a monthly/yearly toggle, a comparison list, an FAQ accordion, a final call to action and a footer.

## Customising

**Colours, type and spacing.** Edit the custom properties in the `:root` block at the top of `assets/css/styles.css`. Every component reads from these tokens. If you change a colour, check that text still has at least 4.5:1 contrast (3:1 for large text and UI outlines).

**Inline SVG colours.** The logo and illustrations use literal hex values that match the default palette. Search for `#3b3fc4` in the HTML files when you rebrand.

**Fonts.** The kit uses the system font stack. To use a brand font, self-host the font files, add an `@font-face` rule and change `--font-sans`.

**Copy.** All text is placeholder copy for a fictional product. Replace it with your own, and only make claims about your product that are accurate.

**Logo cloud.** The six slots are placeholders. Only show logos of customers who have agreed to it.

**Pricing.** Each plan has a `data-plan-monthly` value. The yearly discount (`data-discount`) and currency (`data-currency`) are set on the `[data-billing-toggle]` wrapper. Yearly prices are calculated by `pricing.js`. Keep the monthly price written into the HTML as well, because it is what visitors see if JavaScript is off.

**Dark mode.** There is no dark theme. To add one, put a `@media (prefers-color-scheme: dark)` block after `:root` that overrides the same tokens, then re-check contrast.

**Removing blocks.** Each section sits between `<!-- ===== Name ===== -->` comments. `main.js` checks that a block's markup exists before it runs that block's code, so deleting a section does not cause errors.

## Connecting real data or a backend

- **Sign-up and CTA buttons** link to page anchors. Point them at your sign-up or app URL.
- **Prices.** If prices come from a billing system, render `data-plan-monthly` on the server, or set it from your API before `main.js` runs. Prices on the page are for display only. Your billing provider decides what is actually charged.
- **Forms.** The page has no data-collecting forms. If you add a newsletter or contact form, post it to your own endpoint, and add consent wording and a privacy policy link that suit your jurisdiction.
- **Analytics.** The kit contains no tracking. If you add any, follow the consent rules that apply to you.

## Accessibility notes

- Landmarks (`header`, `nav`, `main`, `footer`), a skip link and one `h1` per page, with headings in order.
- The mobile menu button updates `aria-expanded` and its label. <kbd>Esc</kbd> closes the menu and returns focus to the button. Without JavaScript the links are shown inline.
- The billing toggle is a native radio group inside a `fieldset` with a `legend`. A polite live region announces when prices change.
- The FAQ follows the WAI-ARIA accordion pattern: buttons inside headings, `aria-expanded`/`aria-controls`, and labelled panels. <kbd>↑</kbd>, <kbd>↓</kbd>, <kbd>Home</kbd> and <kbd>End</kbd> move between questions. Panels stay visible when JavaScript is off.
- Decorative SVGs have `aria-hidden="true"`. Meaningful illustrations have `role="img"` and a title or label.
- Every interactive element shows a visible `:focus-visible` outline. The focus colour has at least 4.7:1 contrast with the light page backgrounds and 3.3:1 with the dark CTA band.
- `prefers-reduced-motion` turns off smooth scrolling and transitions.
- We calculated contrast for the main token pairs (body text, muted text, buttons, accents) and all are 4.5:1 or higher. This was a calculation on the token values, not an audit of every element as rendered.

## Browser support

The kit is written for current versions of Chrome, Edge, Firefox and Safari. It uses CSS custom properties, Grid, `clamp()`, `:focus-visible`, `backdrop-filter` (an optional enhancement) and `Intl.NumberFormat`.

**What was actually checked:**

- `npx html-validate` with `html-validate:recommended` reports 0 errors on both HTML files.
- `node --check` passes on both JS files.
- The pricing maths in `pricing.js` passed 14 Node assertions.
- Both pages were loaded in jsdom 30 (a simulated DOM, not a real browser) and the scripts ran with no errors. The tests switched to yearly pricing and checked the new prices, opened an FAQ item, and opened the mobile menu and closed it with <kbd>Esc</kbd>.
- All internal links, `#fragment` targets and `aria-*`/`for` id references resolve.

**Not checked:** the kit has not been tested by hand in a real browser, at real screen widths (the layout is built for 320–1440 px), or with a screen reader. Do that before you publish.

## Licence

See `LICENSE.txt`. The kit contains no third-party code, fonts or images.
