# `<cv-theme-toggle>`

A light/dark switch. It sets `data-theme="light"` or `data-theme="dark"` on
`<html>`, which `theme.css` uses to swap every `--cv-*` colour. The visitor's
choice is saved in `localStorage`.

```js
import './components/cv-theme-toggle.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `label` | `Dark mode` | Button text and accessible name. |
| `storage-key` | `cv-theme` | `localStorage` key. |
| `icon-only` | *(absent)* | Boolean. Hides the text visually but keeps it for screen readers. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `theme` | `"light" \| "dark"` | Reads the current theme. Setting it applies and saves the theme. |

## Events

| Event | Detail | When |
| --- | --- | --- |
| `cv-theme-change` | `{ theme: "light" \| "dark", source: "init" \| "user" \| "system" }` | When the toggle connects (`init`), when the visitor clicks it (`user`), and when the OS setting changes and the visitor hasn't saved a choice (`system`). Bubbles and is composed. |

## How the starting theme is chosen

1. A valid saved value in `localStorage` (`light` or `dark`).
2. Otherwise, the operating system preference (`prefers-color-scheme`).

All storage access is wrapped in `try/catch`. If storage is blocked (some
private-browsing modes, sandboxed iframes or strict privacy settings), the toggle
still works for the current page view; the choice just isn't remembered.

If a page has several toggles, they stay in sync.

## Avoiding a flash of the wrong theme

Modules load after the first paint. To apply a saved choice before then, add this
small inline script in `<head>`, before your stylesheets render:

```html
<script>
  (function () {
    try {
      var saved = window.localStorage.getItem('cv-theme');
      if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
    } catch (e) {}
  })();
</script>
```

If your Content Security Policy blocks inline scripts, move this snippet into a
small external file that loads without `defer`.

## Accessibility

- The toggle is a real `<button>` with `aria-pressed` (`true` means dark mode is
  on) and a visible text label.
- The icons are decorative.
- The button is at least 44 × 44 px.

## CSS custom properties used

`--cv-color-surface`, `--cv-color-border`, `--cv-color-text`,
`--cv-color-accent`, `--cv-radius-pill`, `--cv-duration`, `--cv-color-focus`.

## Shadow parts

`button`

## Example

```html
<cv-theme-toggle></cv-theme-toggle>
<cv-theme-toggle label="Dark theme" icon-only></cv-theme-toggle>
```

```js
document.addEventListener('cv-theme-change', (e) => console.log('theme is now', e.detail.theme));
```
