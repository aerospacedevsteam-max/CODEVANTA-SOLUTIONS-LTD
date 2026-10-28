# `<cv-skill-list>`

A list of skills. It can show them as chips (the default), with optional
proficiency dots, or as labelled level bars.

```js
import './components/cv-skill-list.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `skills` | — | Comma-separated `Name:level` pairs. The level is optional, for example `"TypeScript:5, Go:3, Docker"`. Levels are rounded and clamped to 0…`max`. The name is everything before the **last** colon. |
| `heading` | — | Optional heading above the list. The list is labelled by it. |
| `heading-level` | `3` | Heading level (1–6). |
| `variant` | `chips` | `chips` or `meter`. |
| `max` | `5` | Highest level. |
| `level-names` | `None, Beginner, Basic, Intermediate, Advanced, Expert` | A comma list with exactly `max + 1` names, for levels 0…max. The default names only apply when `max` is 5. Otherwise the label shows `level/max`. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `skills` | `{ name: string, level: number \| null }[]` (read-only) | Parsed skills. |
| `max` | `number` (read-only) | Resolved maximum level. |

## Slots

| Slot | Description |
| --- | --- |
| `heading` | Rich heading content that replaces the `heading` attribute. |

## Events

None.

## Accessibility

- The dots and bars are decorative (`aria-hidden`).
- Each item with a level includes visually hidden text, for example
  "TypeScript (Expert, level 5 of 5)". Screen-reader users get the same
  information as sighted users.
- The bar-fill transition is removed under `prefers-reduced-motion: reduce`.

## CSS custom properties used

`--cv-color-tag-bg`, `--cv-color-tag-text`, `--cv-color-accent`,
`--cv-color-border`, `--cv-color-surface-alt`, `--cv-color-muted`,
`--cv-radius-pill`, `--cv-font-mono`, `--cv-duration`.

## Shadow parts

`heading`, `list`, `item`, `meter-fill`.

## Examples

```html
<cv-skill-list heading="Languages" variant="meter"
  skills="TypeScript:5, Python:4, SQL:4, Go:3"></cv-skill-list>

<cv-skill-list heading="Tools" skills="Docker:4, PostgreSQL:4, Linux:3"></cv-skill-list>

<cv-skill-list heading="Also comfortable with" skills="GraphQL, Figma, Technical writing"></cv-skill-list>

<cv-skill-list variant="meter" max="3" level-names="None, Learning, Working, Fluent"
  skills="Spanish:2, Swedish:3"></cv-skill-list>
```
