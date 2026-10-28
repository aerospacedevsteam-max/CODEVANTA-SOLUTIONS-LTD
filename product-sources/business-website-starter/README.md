# Business Website Starter

A four-page static website template for a small business or consultancy. Plain HTML5, CSS and vanilla JavaScript: no build step, no frameworks, no external fonts, images, CDNs or tracking.

"Fernvale Studio", the team names and all quotes are invented placeholders.

## What's included

```
business-website-starter/
├── index.html        Home: hero, services grid, stats, testimonials (placeholder), FAQ, call to action
├── about.html        Story, values and team
├── services.html     Detailed service cards and a services FAQ
├── contact.html      Enquiry form with client-side validation, contact details
├── assets/
│   ├── css/styles.css   All styles; theme tokens in the :root block
│   └── js/main.js       Mobile nav, FAQ behaviour, form validation, footer year
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

## Getting started

1. Unzip the folder.
2. Open `index.html` in a browser. Everything works from the file system; no server is needed.
3. To publish, upload the whole folder to any static host.

## Customising

### Colours
All colours live in the `:root` block at the top of `assets/css/styles.css`. Change `--color-primary`, `--color-primary-dark` and `--color-accent` to rebrand. If you change them, check the contrast between text and background colours (at least 4.5:1 for body text). `--color-focus` and `--color-focus-on-dark` control the keyboard focus ring on light and dark backgrounds.

The inline SVG illustrations use fixed hex colours. Search for `#0f5257`, `#0a3a3e` and `#f2a541` in the HTML files to recolour them as well.

### Fonts
The template uses system fonts (`--font-body`, `--font-heading`), so nothing is downloaded. To use your own font, add the font files to `assets/fonts/`, declare them with `@font-face` in `styles.css`, and update the two variables.

### Content
- The header and footer are repeated in each HTML file. If you rename a page or add one, update the navigation in **all four files** and move `aria-current="page"` to the current page's link.
- The **testimonials** on `index.html` are clearly marked placeholder content. Replace them with genuine quotes you have permission to publish, or delete the section.
- The stats on the home page are placeholders. Use real figures or remove them.
- Team avatars are gradient SVGs. To use photos, replace each `<svg class="avatar">` with `<img class="avatar" src="..." alt="Photo of [name]" width="72" height="72">`.

### Form backend (required before going live)
The contact form **does not send anything**. It validates in the browser and shows a local message saying that it is a demo. A static site cannot send email by itself. To make it work:

1. Choose a backend:
   - **A hosted form service**: sign up with any form-handling service and copy the endpoint URL it gives you.
   - **Your own server**: create an endpoint (for example `/api/contact`) that accepts a POST request, validates the fields again on the server, and sends or stores the message.
2. In `contact.html`, set `action="YOUR-ENDPOINT"` and `method="post"` on the `<form>`.
3. In `assets/js/main.js`, inside `initContactForm`, remove `event.preventDefault()` (or replace the demo message with a `fetch()` call to your endpoint) and remove the demo confirmation text.
4. Add spam protection that your backend supports, such as a honeypot field or a challenge.

## Browser support

Built with widely supported features: CSS custom properties, flexbox, grid, `clamp()`, `<details>`/`<summary>` and `:focus-visible`. It targets the current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported.

What we checked before release:
- `html-validate` (recommended rules): 0 errors on all four pages.
- `node --check` on `assets/js/main.js`.
- A script that confirms every internal link, asset path and `#fragment` points to a file or ID that exists.
- Headless Chrome at 320, 375, 768, 1024 and 1440 px wide: no horizontal scrolling on any page. The mobile menu toggle, Escape-to-close, FAQ behaviour and form validation were tested by script, with no JavaScript errors.

We did not test manually in Firefox, Safari or on real mobile devices. Test there before you launch.

## Accessibility notes

- Skip link, semantic landmarks (`header`, `nav` with labels, `main`, `footer`) and one `h1` per page with no skipped heading levels.
- The mobile menu is a real `<button>` with `aria-expanded` and `aria-controls`, and Escape closes it. Without JavaScript the menu is always visible.
- A visible focus ring on every interactive element, with separate colours for light and dark backgrounds.
- Every form field has a `<label>`. Errors are linked with `aria-describedby`, marked with `aria-invalid`, and focus moves to the first invalid field. The form status uses `role="status"`.
- The FAQ uses native `<details>`, so it works with the keyboard and without JavaScript.
- Meaningful SVGs have `role="img"` and a `<title>`. Decorative SVGs are `aria-hidden`.
- `prefers-reduced-motion` turns off smooth scrolling and transitions.
- The default colour pairs were chosen to meet WCAG AA contrast. Check them again if you change the palette.

## Licence

See `LICENSE.txt`.
