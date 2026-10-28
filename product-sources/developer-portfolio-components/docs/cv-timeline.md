# `<cv-timeline>` and `<cv-timeline-item>`

A vertical timeline for work history, education or milestones. Both elements are
defined in `cv-timeline.js`.

```js
import './components/cv-timeline.js';
```

## `<cv-timeline>` attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `label` | — | Accessible name for the list, for example `Work history`. |

## `<cv-timeline-item>` attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `heading` | — | Entry title, such as a job title or qualification. |
| `org` | — | Organisation line under the heading. |
| `date` | — | Date text as displayed, for example `2021 — 2024`. |
| `datetime` | — | Optional machine-readable date for the `<time>` element, for example `2021` or `2021-09`. |
| `current` | *(absent)* | Boolean. Fills in the marker and adds "(current)" for screen readers. |
| `heading-level` | `3` | Heading level (1–6). |

## Slots

| Element | Slot | Description |
| --- | --- | --- |
| `cv-timeline` | *(default)* | `<cv-timeline-item>` elements. |
| `cv-timeline-item` | *(default)* | Description. Paragraphs and lists both work. |
| `cv-timeline-item` | `heading` | Rich heading content that replaces `heading`. |
| `cv-timeline-item` | `org` | Rich organisation content, for example a link. It replaces `org`. |

## Events

None.

## Accessibility

- The timeline has `role="list"`.
- Each item gets `role="listitem"` unless you set a role yourself. Screen readers
  announce "list, 3 items".
- Dates use `<time>`. The markers are decorative.

## CSS custom properties used

`--cv-color-border`, `--cv-color-accent`, `--cv-color-surface`,
`--cv-color-muted`, `--cv-font-mono`, `--cv-space`.

## Shadow parts

- `cv-timeline`: `list`
- `cv-timeline-item`: `marker`, `date`, `heading`, `org`, `body`

## Example

```html
<cv-timeline label="Work history">
  <cv-timeline-item date="2024 — present" datetime="2024"
    heading="Senior Full-stack Developer" org="Northwind Harbour Software" current>
    Leads a team of four building booking and payments features.
  </cv-timeline-item>
  <cv-timeline-item date="2021 — 2024" datetime="2021"
    heading="Front-end Developer" org="Brightfield Studio">
    <ul>
      <li>Built marketing sites and web apps.</li>
      <li>Introduced automated accessibility checks.</li>
    </ul>
  </cv-timeline-item>
</cv-timeline>
```
