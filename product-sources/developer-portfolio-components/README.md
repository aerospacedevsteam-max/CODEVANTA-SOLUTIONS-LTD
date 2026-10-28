# Developer Portfolio Components

A set of framework-agnostic **Web Components** for developer portfolios. They are
plain JavaScript Custom Elements written as ES modules, with no dependencies, no
build step and no CDN. All of them share one CSS custom-property theme with light
and dark modes.

| Element | What it does | Docs |
| --- | --- | --- |
| `<cv-hero>` | Name, tagline, intro, call-to-action links and avatar. | [docs/cv-hero.md](docs/cv-hero.md) |
| `<cv-project-card>` | One project: image, title, description, tags and links. | [docs/cv-project-card.md](docs/cv-project-card.md) |
| `<cv-project-grid>` | Responsive grid of cards with a keyboard-accessible tag filter. | [docs/cv-project-grid.md](docs/cv-project-grid.md) |
| `<cv-skill-list>` | Skills as chips or level meters. | [docs/cv-skill-list.md](docs/cv-skill-list.md) |
| `<cv-timeline>` / `<cv-timeline-item>` | Experience and education timeline. | [docs/cv-timeline.md](docs/cv-timeline.md) |
| `<cv-contact-form>` | Validated contact form. Fires a `cv-submit` event and never sends data by itself. | [docs/cv-contact-form.md](docs/cv-contact-form.md) |
| `<cv-theme-toggle>` | Light/dark switch that remembers the choice. | [docs/cv-theme-toggle.md](docs/cv-theme-toggle.md) |

Theme variables and `::part()` styling are covered in [docs/theming.md](docs/theming.md).

## What's in the folder

```
components/
  index.js              registers every component (and re-exports utils)
  cv-*.js               one module per component (each registers itself)
  utils.js              pure helpers: tag parsing and filtering, validation, theme resolution
  styles.js             shared Shadow DOM base styles
  theme.css             --cv-* theme variables (light + dark)
demo/
  index.html            every component on one page (placeholder content)
  demo.js, *.svg        demo-only script and placeholder images
docs/                   one page per component, plus theming
CHANGELOG.md, LICENSE.txt
```

## Install

**Option 1: copy the folder.** Copy `components/` into your site, for example to
`/assets/cv/`, then add:

```html
<link rel="stylesheet" href="/assets/cv/theme.css">
<script type="module" src="/assets/cv/index.js"></script>
```

**Option 2: import only what you need.** Each module registers its own element:

```js
import '/assets/cv/cv-project-card.js';
import '/assets/cv/cv-project-grid.js';
```

**With a bundler** (Vite, webpack, Rollup, esbuild and so on), import the files
with relative paths, for example `import './vendor/cv/index.js';`. No
configuration is needed.

**Frameworks:** the elements are standard Custom Elements, so you can use them
in plain HTML or in any framework that renders custom elements. Pass string
attributes as shown in the docs. Listen for events such as `cv-submit` with
`addEventListener`, or with your framework's custom-event syntax.

The modules are safe to import twice. An element is only defined if it isn't
already registered.

## Running the demo

Browsers won't load ES modules from `file://` URLs, so open the demo through any
local web server from the pack's root folder, for example:

```sh
npx serve .            # then open http://localhost:3000/demo/
# or
python -m http.server  # then open http://localhost:8000/demo/
```

## Quick example

```html
<cv-theme-toggle></cv-theme-toggle>

<cv-hero name="Avery Lindqvist" tagline="Full-stack developer">
  <p>I build accessible web apps.</p>
  <a slot="actions" href="#projects">See my work</a>
</cv-hero>

<cv-project-grid>
  <cv-project-card heading="Quietline Notes" tags="Rust, CLI" repo="https://example.com/code">
    A note-taking CLI with full-text search.
  </cv-project-card>
  <cv-project-card heading="Orchard Metrics" tags="Python, Data" href="https://example.com">
    Sensor dashboards and weekly reports.
  </cv-project-card>
</cv-project-grid>

<cv-contact-form heading="Say hello"></cv-contact-form>
<script type="module">
  document.querySelector('cv-contact-form').addEventListener('cv-submit', (e) => {
    e.detail.waitUntil(fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e.detail.data),
    }).then((res) => { if (!res.ok) throw new Error(res.status); }));
  });
</script>
```

The contact form doesn't send anything by default.
[docs/cv-contact-form.md](docs/cv-contact-form.md) shows how to connect it to
your own endpoint, to a form service or to a `mailto:` fallback.

## Accessibility features

- Native elements wherever possible: real `<button>`, `<form>`, `<label>`,
  headings, `<time>` and lists.
- Configurable heading levels (`heading-level`), so components fit your page
  outline.
- Visible `:focus-visible` rings, themeable with `--cv-color-focus`.
- Keyboard support:
  - The project filter toolbar uses a roving tab index with Arrow, Home and End
    keys.
  - Everything else uses the browser's native keyboard behaviour.
- ARIA where native semantics aren't enough: `aria-pressed` on toggles and filter
  buttons, `aria-invalid` and `aria-describedby` on form errors, and live
  regions for filter results and form status.
- Decorative icons, dots and bars are hidden from assistive technology. Their
  meaning is also given as text.
- `prefers-reduced-motion: reduce` removes every transition and animation.
- `prefers-color-scheme` is respected until the visitor picks a theme.

Run your own accessibility review on the finished site. Your content, colours
and page structure matter too.

## Security notes

- Attribute values are inserted with `textContent`, never parsed as HTML.
- Link and image attributes only accept `http(s)`, `mailto:`, `tel:` and
  relative URLs. Anything else, such as `javascript:`, is dropped.
- `localStorage` is only used by `<cv-theme-toggle>`, and only inside
  `try/catch`.

## Browser support

The components use standard web platform features: Custom Elements v1, Shadow
DOM (including `<slot>` and `::part`), ES modules, CSS custom properties and
`:focus-visible`.

**What we actually checked for this release:**

- Every `.js` file passes `node --check` (syntax).
- `demo/index.html` passes `html-validate` with its recommended rules and no
  errors.
- The pure helpers in `components/utils.js` pass a Node unit-test suite.
- A scripted DOM smoke test in **jsdom** passes. It checks that every element
  registers and renders, and covers grid filtering, keyboard navigation, form
  validation, `cv-submit`, and theme toggling with blocked storage.

**Not yet checked:** we haven't tested this release by hand in specific
browsers or with specific screen readers, so we make no claims about particular
browser versions. jsdom isn't a real browser and doesn't check layout or
rendering. Before you launch, test in the browsers your audience uses.

## Customising

- **Colours, fonts and spacing:** override the `--cv-*` variables
  ([docs/theming.md](docs/theming.md)).
- **Finer styling:** use `::part()` names (listed on each component's page).
- **Behaviour:** the source is small and commented. Edit the modules directly.

## Licence

See [LICENSE.txt](LICENSE.txt). The demo content (names, companies, projects) is
invented placeholder text. Replace it with your own.
