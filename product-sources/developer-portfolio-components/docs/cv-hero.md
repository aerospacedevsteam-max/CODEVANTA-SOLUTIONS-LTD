# `<cv-hero>`

The introduction block at the top of a portfolio page. It shows a heading with
your name, a tagline, intro text, call-to-action links and an optional avatar.

```js
import './components/cv-hero.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `name` | — | Text for the main heading. |
| `tagline` | — | One-line description shown under the name. |
| `eyebrow` | — | Small line above the name, for example "Hello, I'm". |
| `avatar-src` | — | Image URL. Only `http(s)` and relative URLs are used; other schemes such as `javascript:` or `data:` are ignored. When set, the layout switches to two columns on wide screens. |
| `avatar-alt` | `""` | Alt text for the avatar. Leave it empty if the image is decorative. |
| `heading-level` | `1` | Heading level for the name (1–6). Use `1` once per page. |

`tagline` is used instead of `role` on purpose: `role` is an ARIA attribute and
would change how assistive technology reads the element.

## Slots

| Slot | Description |
| --- | --- |
| *(default)* | Intro paragraph(s). |
| `actions` | Buttons or links, for example "See my work" and "Contact". The row is hidden when empty. |
| `name` | Rich content that replaces the `name` attribute text, for example with a `<span>` for styling. |
| `tagline` | Rich content that replaces the `tagline` attribute text. |

## Events

None.

## CSS custom properties used

`--cv-font-body`, `--cv-font-heading`, `--cv-font-mono`, `--cv-color-text`,
`--cv-color-heading`, `--cv-color-muted`, `--cv-color-accent`,
`--cv-color-surface`, `--cv-color-surface-alt`, `--cv-shadow-card`, `--cv-space`.

## Shadow parts

`section`, `eyebrow`, `name`, `tagline`, `intro`, `actions`, `avatar`. For example:

```css
cv-hero::part(name) { letter-spacing: -0.04em; }
```

## Accessibility

- The section is labelled by the heading (`aria-labelledby`).
- Slotted links keep their own semantics and the shared focus ring.
- No motion is used.

## Example

```html
<cv-hero
  eyebrow="Hello, I’m"
  name="Avery Lindqvist"
  tagline="Full-stack developer building calm, fast web apps"
  avatar-src="images/avatar.svg"
  avatar-alt="">
  <p>I design and ship accessible interfaces and the APIs behind them.</p>
  <a slot="actions" class="button" href="#projects">See my work</a>
  <a slot="actions" href="#contact">Get in touch</a>
</cv-hero>
```

Slotted links are part of your page, so you style them with your own CSS. The
demo page shows one way to do it.
