# Theming

Every component reads its colours, fonts, radii and timing from `--cv-*` CSS
custom properties. Custom properties inherit through Shadow DOM, so setting them
on `:root` or on any wrapper restyles every component inside it.

`components/theme.css` defines:

- the light values on `:root`
- the dark values for `:root[data-theme="dark"]`
- the dark values for `prefers-color-scheme: dark`, unless `data-theme="light"`
  is set

Each component also has built-in fallbacks, so it stays readable even if you
don't load `theme.css`.

## Variables

| Variable | Purpose |
| --- | --- |
| `--cv-font-body`, `--cv-font-heading`, `--cv-font-mono` | Font stacks. |
| `--cv-color-bg`, `--cv-color-surface`, `--cv-color-surface-alt` | Page background, cards, subtle fills. |
| `--cv-color-text`, `--cv-color-heading`, `--cv-color-muted` | Text colours. |
| `--cv-color-border` | Borders and the timeline line. |
| `--cv-color-accent`, `--cv-color-accent-hover`, `--cv-color-accent-soft`, `--cv-color-on-accent` | Buttons, active filters, markers and meters. |
| `--cv-color-link`, `--cv-color-link-hover` | Links. |
| `--cv-color-focus`, `--cv-focus-width` | Focus ring. |
| `--cv-color-danger`, `--cv-color-danger-soft`, `--cv-color-success`, `--cv-color-success-soft` | Form errors and status messages. |
| `--cv-color-tag-bg`, `--cv-color-tag-text` | Tag and skill chips. |
| `--cv-radius-sm`, `--cv-radius-md`, `--cv-radius-pill` | Corner radii. |
| `--cv-shadow-card` | Card shadow. |
| `--cv-duration` | Transition length. Every transition is removed under `prefers-reduced-motion: reduce`. |
| `--cv-space` | Base spacing unit. |
| `--cv-grid-min` | Minimum card width in `<cv-project-grid>`. |

## Example: brand colours

```css
:root {
  --cv-color-accent: #0f766e;
  --cv-color-accent-hover: #115e59;
  --cv-color-accent-soft: #ccfbf1;
  --cv-color-link: #0f766e;
  --cv-font-heading: "Your Brand Font", system-ui, sans-serif;
}
:root[data-theme="dark"] {
  --cv-color-accent: #5eead4;
  --cv-color-on-accent: #042f2e;
}
```

If you change colours, check the contrast of text against its background and of
`--cv-color-on-accent` against `--cv-color-accent`. Use a contrast checker and
aim for WCAG AA (4.5:1 for body text).

## Shadow parts

For styling that variables don't cover, each component exposes `::part()`
names. They are listed on each component's page.

```css
cv-project-card::part(card) { border-width: 2px; }
cv-project-grid::part(chip) { text-transform: uppercase; }
```
