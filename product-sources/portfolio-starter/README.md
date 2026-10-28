# Portfolio Starter

A personal portfolio template with filterable projects, a case-study page and a light/dark theme toggle. Plain HTML5, CSS and vanilla JavaScript: no build step, no frameworks, no external fonts, images, CDNs or tracking.

"Riley Quinn", the employers and the projects are invented placeholders.

## What's included

```
portfolio-starter/
├── index.html        Hero/bio, filterable project cards, skills,
│                     experience timeline, contact section with form
├── project.html      Case-study detail template (duplicate per project)
├── assets/
│   ├── css/styles.css   All styles; light tokens in :root, dark tokens in [data-theme="dark"]
│   └── js/
│       ├── theme.js     Applies the saved or system theme before the page renders (loaded in <head>)
│       └── main.js      Theme toggle, mobile nav, project filter, contact form, year
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

## Getting started

Open `index.html` in a browser. No server is needed. To publish, upload the folder to any static host.

## Customising

### Colours and themes
`assets/css/styles.css` defines the colours in three places:
1. `:root` holds the light theme.
2. `:root[data-theme="dark"]` holds the dark theme.
3. The `@media (prefers-color-scheme: dark)` block is a fallback for visitors without JavaScript. Keep its values the same as block 2.

The main colours are `--primary` (violet) and `--mint`. `--primary-contrast` is the text colour used on top of `--primary`.

Project thumbnails are pure CSS gradients (`.thumb-a` to `.thumb-f`). To use screenshots, replace `<div class="thumb thumb-a"></div>` with `<img class="thumb" src="assets/img/your-image.webp" alt="Describe the screenshot" width="800" height="500">`.

### Theme preference
The visitor's choice is saved in `localStorage` under the key `portfolio-theme`. Every read and write is wrapped in `try/catch`, so the toggle still works for the current page view if storage is blocked. If no choice has been saved, the operating system setting is used.

### Fonts
The template uses system font stacks (`--font-sans` and `--font-mono`). To use your own font, self-host it with `@font-face` and update the variables.

### Projects and the filter
Each card is an `<li data-tags="design research">` inside `<ul class="projects">`. Tags are separated by spaces and must match the `data-filter` values on the filter buttons. To add a category, add a button such as `<button class="filter-btn" type="button" data-filter="video" aria-pressed="false">Video</button>` and tag the cards. The filter bar is hidden when JavaScript is off, and all projects are shown.

### Case studies
Duplicate `project.html` for each project (for example `project-tally.html`), edit its content, and update the "Read case study" links in `index.html`.

### Contact form backend (required before going live)
The form **does not send anything**. It validates in the browser and shows a notice saying that it is a demo. To receive messages:
1. Use **a hosted form service** (copy its endpoint) or **your own server** endpoint that accepts POST requests and validates again on the server.
2. In `index.html`, set `action="YOUR-ENDPOINT"` and `method="post"` on `#contact-form`.
3. In `assets/js/main.js` (section 4), remove `event.preventDefault()` or replace it with a `fetch()` submission, and change the demo notice text.
4. Add spam protection that your backend supports.

## Browser support

Uses CSS custom properties, grid, `clamp()`, `aspect-ratio`, `conic-gradient`, `:focus-visible` and `color-mix()`. Browsers without `color-mix()` fall back to a solid header background through `@supports`. It targets the current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.

What we checked before release:
- `html-validate` (recommended rules): 0 errors on both pages.
- `node --check` on `theme.js` and `main.js`.
- A script that confirms every internal link, asset and `#fragment` resolves.
- Headless Chrome at 320, 375, 768, 1024 and 1440 px: no horizontal scrolling. We also tested by script that the filter works, the theme toggle saves the choice and it is restored on `project.html`, and the form shows its validation messages and demo notice, with no JavaScript errors.

We did not test manually in Firefox, Safari or on real devices. Test there before you launch.

## Accessibility notes

- Skip link, labelled landmarks, one `h1` per page and a logical heading order.
- The theme toggle is a `<button>` with `aria-pressed` and the accessible name "Dark theme".
- The menu toggle uses `aria-expanded` and `aria-controls`, and Escape closes it.
- Filter buttons use `aria-pressed` inside a labelled group. The number of visible projects is announced through a `role="status"` region.
- "Read case study" links include hidden text with the project name, so each link makes sense out of context.
- Form fields have labels. Errors are linked with `aria-describedby` and `aria-invalid`, and focus moves to the first invalid field.
- Both themes were designed to meet WCAG AA contrast. Check them again after changing colours.
- `prefers-reduced-motion` turns off smooth scrolling and card transitions.

## Licence

See `LICENSE.txt`.
