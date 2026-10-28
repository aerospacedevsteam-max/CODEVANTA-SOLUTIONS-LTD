# `<cv-project-grid>`

A responsive grid of project cards with a tag filter. The filter buttons are
built from the `tags` attributes of the grid's direct children.

```js
import './components/cv-project-card.js';
import './components/cv-project-grid.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `filter` | `""` (all) | The active tag. Matching ignores case. An unknown tag shows every project. The attribute updates when a visitor picks a filter, so it reflects the current choice. |
| `label` | `Filter projects by tag` | Accessible name for the filter toolbar. |
| `all-label` | `All` | Text for the "show everything" button. |
| `empty-text` | `No projects match this filter.` | Message shown when nothing matches. |
| `no-filter` | *(absent)* | Boolean. Hides the toolbar, so the element works as a plain grid. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `filter` | `string` | Gets or sets the active tag. Setting `""` shows all projects. |
| `items` | `Element[]` (read-only) | The children that take part in filtering: every `<cv-project-card>` plus any other child with a `tags` attribute. |

## Slots

| Slot | Description |
| --- | --- |
| *(default)* | `<cv-project-card>` elements, or any elements with a `tags` attribute. |

## Events

| Event | Detail | When |
| --- | --- | --- |
| `cv-filter-change` | `{ tag: string, visible: number, total: number }` | On first render and whenever the filter or the set of projects changes. Bubbles. |

```js
document.querySelector('cv-project-grid').addEventListener('cv-filter-change', (e) => {
  const url = new URL(location.href);
  if (e.detail.tag) url.searchParams.set('tag', e.detail.tag);
  else url.searchParams.delete('tag');
  history.replaceState(null, '', url);
});
```

## Behaviour

- Projects that don't match the filter get the `hidden` attribute. Don't use
  `hidden` on cards yourself; the grid overwrites it.
- A `MutationObserver` watches the grid. Adding, removing or re-tagging cards
  updates the filter buttons automatically.
- Tags are sorted alphabetically, ignoring case.
- Column width is controlled by `--cv-grid-min` (default `16rem`). The grid
  holds as many columns as fit.

## Keyboard and screen readers

- The buttons sit in a `role="toolbar"` with a roving tab index, so the toolbar
  is a single Tab stop.
- Arrow Left/Right (or Up/Down) move between buttons, Home and End jump to the
  first and last button, and Enter or Space applies the filter.
- Each button exposes `aria-pressed`.
- A polite live region announces the result, for example "Showing 2 of 6
  projects tagged 'Rust'". It only speaks after the visitor changes the filter.

## CSS custom properties used

`--cv-grid-min`, `--cv-space`, `--cv-color-surface`, `--cv-color-border`,
`--cv-color-text`, `--cv-color-muted`, `--cv-color-accent`,
`--cv-color-on-accent`, `--cv-radius-pill`, `--cv-radius-md`, `--cv-duration`.

## Shadow parts

`toolbar`, `chip` (each filter button), `grid`, `empty`.

## Example

```html
<cv-project-grid label="Filter projects by technology" filter="Rust">
  <cv-project-card heading="Quietline Notes" tags="Rust, CLI">A note-taking CLI.</cv-project-card>
  <cv-project-card heading="Orchard Metrics" tags="Python, Data">Sensor dashboards.</cv-project-card>
  <cv-project-card heading="Ferrous Queue" tags="Go, Docker">A tiny job queue.</cv-project-card>
</cv-project-grid>
```
