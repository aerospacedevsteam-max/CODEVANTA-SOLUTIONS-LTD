# `<cv-project-card>`

A card for one project. It shows an optional image, a meta line (such as the
year), a title, a description, tags and links.

```js
import './components/cv-project-card.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `heading` | — | Project title. |
| `tags` | — | Comma-separated tags, for example `"TypeScript, PostgreSQL"`. Duplicates are removed without regard to case. `<cv-project-grid>` uses these tags for filtering. |
| `href` | — | Main project link (live site or case study). |
| `link-label` | `View project` | Text for the `href` link. |
| `repo` | — | Source-code link. |
| `repo-label` | `Source code` | Text for the `repo` link. |
| `meta` | — | Small line above the title, for example `2026` or `Client work`. |
| `image-src` | — | Cover image URL, shown at a 16:9 ratio. |
| `image-alt` | `""` | Alt text for the cover image. Leave it empty if the image is decorative. |
| `heading-level` | `3` | Heading level for the title (1–6). Match it to your page outline. |

`heading` is used instead of `title` on purpose. A `title` attribute makes the
browser show a tooltip over the whole card.

Link URLs must be `http(s)`, `mailto:`, `tel:` or relative. Any other scheme,
such as `javascript:`, is ignored.

Each generated link also includes visually hidden text. Screen-reader users hear
"View project: Tidewater Booking" rather than a run of identical "View project"
links.

## Slots

| Slot | Description |
| --- | --- |
| *(default)* | Description text. |
| `title` | Rich title content that replaces `heading`. |
| `media` | Your own `<img>`, `<picture>` or `<video>`. It replaces `image-src`. |
| `links` | Extra links, shown after the generated `href` and `repo` links. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `tags` | `string[]` (read-only) | Parsed tags. |

## Events

| Event | Detail | When |
| --- | --- | --- |
| `cv-tags-change` | `{ tags: string[] }` | The `tags` attribute changes after the card is connected. Bubbles. |

## CSS custom properties used

`--cv-color-surface`, `--cv-color-surface-alt`, `--cv-color-border`,
`--cv-color-text`, `--cv-color-muted`, `--cv-color-link`,
`--cv-color-tag-bg`, `--cv-color-tag-text`, `--cv-radius-md`,
`--cv-radius-pill`, `--cv-shadow-card`, `--cv-font-mono`, `--cv-duration`.

## Shadow parts

`card`, `media`, `meta`, `title`, `description`, `tags`, `links`.

## Accessibility

- The card is an `<article>` labelled by its title.
- Tags are a list labelled "Technologies".
- The hover lift uses a transition. With `prefers-reduced-motion: reduce` the
  transition is removed.

## Example

```html
<cv-project-card
  heading="Tidewater Booking"
  meta="2026"
  tags="TypeScript, Web Components, PostgreSQL"
  href="https://example.com/tidewater"
  repo="https://example.com/code/tidewater"
  image-src="images/tidewater.png"
  image-alt="">
  A booking system for a fictional ferry: seat maps, offline tickets and an accessible checkout.
  <a slot="links" href="/case-studies/tidewater">Case study</a>
</cv-project-card>
```
