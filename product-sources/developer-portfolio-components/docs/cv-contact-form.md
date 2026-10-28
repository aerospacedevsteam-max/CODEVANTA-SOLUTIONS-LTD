# `<cv-contact-form>`

An accessible contact form (name, email, message) with client-side validation.

**It never sends data anywhere by itself.** When a visitor submits a valid form,
the component fires a `cv-submit` event with the form data. Your code decides
where the message goes.

```js
import './components/cv-contact-form.js';
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `heading` | — | Heading inside the form. The form is labelled by it; without a heading the form is labelled "Contact form". |
| `heading-level` | `2` | Heading level (1–6). |
| `submit-label` | `Send message` | Text on the submit button. |
| `success-message` | `Thanks! Your message has been sent.` | Shown after a successful submit. |
| `error-message` | `Sorry, your message could not be sent. Please try again later.` | Shown when a `waitUntil` promise rejects. |
| `pending-message` | `Sending…` | Shown while a `waitUntil` promise is pending. |
| `message-min` | `10` | Minimum message length in characters. |
| `message-max` | `5000` | Maximum message length in characters. |

## Validation rules

All validation is done by the pure `validateContact()` function in `utils.js`:

| Field | Rule |
| --- | --- |
| Name | Required, 2–100 characters after trimming. |
| Email | Required, `something@domain.tld` format, no spaces, 254 characters at most. |
| Message | Required, `message-min`…`message-max` characters after trimming. |

When are fields checked?

- Each field is checked when it loses focus, provided it has a value.
- After that first check, it is re-checked as the visitor types.
- Submitting checks every field.

How are errors shown?

- Each error message is linked to its field with `aria-describedby`.
- The field gets `aria-invalid="true"`.
- On submit, focus moves to the first invalid field.
- A summary ("Please fix 2 fields and try again.") is announced through a
  `role="status"` live region.

Client-side validation only helps the visitor. **Always validate again on the
server.**

## Slots

| Slot | Description |
| --- | --- |
| `intro` | Text under the heading, for example your response time. |

## Events

| Event | Detail | Notes |
| --- | --- | --- |
| `cv-submit` | `{ data: { name, email, message }, waitUntil(promise) }` | Fired only when the form is valid. Bubbles, is composed and is cancelable. Values are trimmed. |

How the form responds to the event:

1. **You call `event.detail.waitUntil(promise)`.** The form disables the button
   and shows the pending message. When the promise resolves, it shows the
   success message and clears the fields. If the promise rejects, it shows the
   error message and keeps the typed values so the visitor can try again.
2. **You call `event.preventDefault()`.** Your code takes over. Call
   `form.showSuccess()` or `form.showError()` yourself.
3. **You do neither.** The success message appears at once. This is fine for
   demos, but in production use option 1 so that failures are reported.

## Methods

| Method | Description |
| --- | --- |
| `reset()` | Clears the fields, errors and status message. |
| `showSuccess(message?)` | Shows a success message (or the `success-message` attribute) and clears the form. |
| `showError(message?)` | Shows an error message (or the `error-message` attribute). The values are kept. |

## Wiring it to a backend

### Your own endpoint (`fetch`)

```js
const form = document.querySelector('cv-contact-form');
form.addEventListener('cv-submit', (event) => {
  event.detail.waitUntil(
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event.detail.data),
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
  );
});
```

On the server, check the fields again, rate-limit by IP and send the email or
store the message. Any server or serverless function that accepts JSON will work.

### A form service that expects form-encoded data

```js
form.addEventListener('cv-submit', (event) => {
  const body = new URLSearchParams(event.detail.data);
  event.detail.waitUntil(
    fetch('https://forms.example.com/your-form-id', { method: 'POST', body, headers: { Accept: 'application/json' } })
      .then((res) => { if (!res.ok) throw new Error('Failed'); }),
  );
});
```

Replace the URL with your provider's endpoint. If the service lives on another
domain, check its CORS rules.

### `mailto:` fallback (no server)

```js
form.addEventListener('cv-submit', (event) => {
  const { name, email, message } = event.detail.data;
  const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} <${email}>`);
  window.location.href = `mailto:you@example.com?subject=${subject}&body=${body}`;
});
```

### Spam protection

The component doesn't include a CAPTCHA or honeypot. Handle spam on the server,
for example with rate limiting, a server-side honeypot or your form provider's
built-in filtering.

## CSS custom properties used

`--cv-color-surface`, `--cv-color-bg`, `--cv-color-border`, `--cv-color-text`,
`--cv-color-muted`, `--cv-color-danger`, `--cv-color-danger-soft`,
`--cv-color-success`, `--cv-color-success-soft`, `--cv-color-surface-alt`,
`--cv-color-accent`, `--cv-color-accent-hover`, `--cv-color-on-accent`,
`--cv-radius-sm`, `--cv-radius-md`, `--cv-color-focus`, `--cv-focus-width`.

## Shadow parts

`form`, `control` (each input and the textarea), `status`, `submit`.

## Example

```html
<cv-contact-form heading="Send a message" submit-label="Send"
  success-message="Thanks — I’ll reply within two working days.">
  <p slot="intro">Prefer email? Write to hello@example.com.</p>
</cv-contact-form>
```
