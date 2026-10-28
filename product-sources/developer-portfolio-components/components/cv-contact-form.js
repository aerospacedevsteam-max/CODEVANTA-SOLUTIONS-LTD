import { styleElement, define } from './styles.js';
import { validateContact, CONTACT_LIMITS, headingLevel } from './utils.js';

const css = `
  :host { display: block; }
  form {
    display: grid;
    gap: 1.1rem;
    padding: calc(var(--cv-space, 1rem) * 1.5);
    background: var(--cv-color-surface, #fff);
    border: 1px solid var(--cv-color-border, #d5dbe3);
    border-radius: var(--cv-radius-md, 14px);
  }
  .heading { font-size: 1.25rem; }
  .intro { color: var(--cv-color-muted, #555e6b); }
  .intro:not(.has-content) { display: none; }
  .field { display: grid; gap: 0.35rem; }
  label { font-weight: 600; }
  .req { color: var(--cv-color-danger, #b42318); }
  input, textarea {
    font: inherit;
    width: 100%;
    padding: 0.65rem 0.8rem;
    border-radius: var(--cv-radius-sm, 8px);
    border: 1px solid var(--cv-color-border, #d5dbe3);
    background: var(--cv-color-bg, #f7f8fa);
    color: var(--cv-color-text, #1b1f24);
  }
  textarea { min-height: 9rem; resize: vertical; }
  input:hover, textarea:hover { border-color: var(--cv-color-muted, #555e6b); }
  [aria-invalid="true"] {
    border-color: var(--cv-color-danger, #b42318);
    background: var(--cv-color-danger-soft, #fdecea);
  }
  .error {
    color: var(--cv-color-danger, #b42318);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .error:empty { display: none; }
  .hint { color: var(--cv-color-muted, #555e6b); font-size: 0.85rem; }
  .status {
    padding: 0.75rem 1rem;
    border-radius: var(--cv-radius-sm, 8px);
    font-weight: 600;
  }
  .status:empty { display: none; }
  .status[data-kind="success"] { background: var(--cv-color-success-soft, #e6f4ea); color: var(--cv-color-success, #146c43); }
  .status[data-kind="error"] { background: var(--cv-color-danger-soft, #fdecea); color: var(--cv-color-danger, #b42318); }
  .status[data-kind="pending"] { background: var(--cv-color-surface-alt, #eef1f5); color: var(--cv-color-text, #1b1f24); }
  .actions { display: flex; justify-content: flex-start; }
`;

const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { name: 'message', label: 'Message', type: 'textarea', autocomplete: 'off' },
];

/**
 * <cv-contact-form> — accessible contact form with client-side validation.
 * It never sends data anywhere: on a valid submit it fires a `cv-submit`
 * CustomEvent so YOU decide how to deliver the message (see docs).
 *
 * Attributes: heading, heading-level (default 2), submit-label, success-message,
 *             error-message, pending-message, message-min, message-max
 * Slots: "intro" (text under the heading)
 * Events: cv-submit { data: { name, email, message }, waitUntil(promise) } (cancelable)
 * Methods: reset(), showSuccess(message?), showError(message?)
 */
export class CvContactForm extends HTMLElement {
  static get observedAttributes() {
    return ['heading', 'heading-level', 'submit-label', 'message-min', 'message-max'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._touched = new Set();
    this._busy = false;
  }

  connectedCallback() {
    if (!this._form) this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._form) return;
    const values = this._values();
    this.render();
    for (const [key, value] of Object.entries(values)) this._input(key).value = value;
  }

  get _limits() {
    const num = (attr, fallback) => {
      const n = Number.parseInt(this.getAttribute(attr) ?? '', 10);
      return Number.isInteger(n) && n > 0 ? n : fallback;
    };
    return {
      messageMin: num('message-min', CONTACT_LIMITS.messageMin),
      messageMax: num('message-max', CONTACT_LIMITS.messageMax),
    };
  }

  _input(name) {
    return this._form.elements.namedItem(name);
  }

  _values() {
    if (!this._form) return {};
    return Object.fromEntries(FIELDS.map((f) => [f.name, this._input(f.name).value]));
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren(styleElement(css));
    const form = document.createElement('form');
    form.noValidate = true; // we validate ourselves for consistent, accessible messages
    form.setAttribute('part', 'form');

    const headingText = this.getAttribute('heading');
    if (headingText) {
      const h = document.createElement(`h${headingLevel(this.getAttribute('heading-level'), 2)}`);
      h.className = 'heading';
      h.id = 'form-heading';
      h.textContent = headingText;
      form.append(h);
      form.setAttribute('aria-labelledby', 'form-heading');
    } else {
      form.setAttribute('aria-label', 'Contact form');
    }

    const intro = document.createElement('div');
    intro.className = 'intro';
    const introSlot = document.createElement('slot');
    introSlot.name = 'intro';
    const syncIntro = () => intro.classList.toggle('has-content', introSlot.assignedNodes().length > 0);
    introSlot.addEventListener('slotchange', syncIntro);
    intro.append(introSlot);
    form.append(intro);

    const required = document.createElement('p');
    required.className = 'hint';
    required.textContent = 'All fields are required.';
    form.append(required);

    const { messageMin, messageMax } = this._limits;
    for (const f of FIELDS) {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const id = `cv-field-${f.name}`;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = f.label;
      const control = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type !== 'textarea') control.type = f.type;
      control.id = id;
      control.name = f.name;
      control.required = true;
      control.autocomplete = f.autocomplete;
      control.setAttribute('aria-required', 'true');
      control.setAttribute('part', 'control');
      const describedBy = [];
      if (f.name === 'message') {
        control.rows = 6;
        control.maxLength = messageMax;
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.id = `${id}-hint`;
        hint.textContent = `${messageMin} to ${messageMax} characters.`;
        describedBy.push(hint.id);
        wrap.append(label, control, hint);
      } else {
        if (f.name === 'name') control.maxLength = CONTACT_LIMITS.nameMax;
        if (f.name === 'email') control.setAttribute('spellcheck', 'false');
        wrap.append(label, control);
      }
      const error = document.createElement('p');
      error.className = 'error';
      error.id = `${id}-error`;
      describedBy.push(error.id);
      control.setAttribute('aria-describedby', describedBy.join(' '));
      wrap.append(error);
      form.append(wrap);

      control.addEventListener('blur', () => {
        if (control.value.trim() !== '') this._touched.add(f.name);
        if (this._touched.has(f.name)) this._validate([f.name]);
      });
      control.addEventListener('input', () => {
        if (this._touched.has(f.name)) this._validate([f.name]);
      });
    }

    this._status = document.createElement('p');
    this._status.className = 'status';
    this._status.setAttribute('role', 'status');
    this._status.setAttribute('part', 'status');
    form.append(this._status);

    const actions = document.createElement('div');
    actions.className = 'actions';
    this._submit = document.createElement('button');
    this._submit.type = 'submit';
    this._submit.className = 'btn';
    this._submit.setAttribute('part', 'submit');
    this._submit.textContent = this.getAttribute('submit-label') || 'Send message';
    actions.append(this._submit);
    form.append(actions);

    form.addEventListener('submit', (e) => this._onSubmit(e));
    this._form = form;
    root.append(form);
    syncIntro();
  }

  /** Validate some or all fields, update the UI and return the result. */
  _validate(names = FIELDS.map((f) => f.name)) {
    const result = validateContact(this._values(), this._limits);
    for (const name of names) {
      const control = this._input(name);
      const error = this.shadowRoot.getElementById(`cv-field-${name}-error`);
      const message = result.errors[name] ?? '';
      error.textContent = message;
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
    return result;
  }

  async _onSubmit(event) {
    event.preventDefault();
    if (this._busy) return;
    FIELDS.forEach((f) => this._touched.add(f.name));
    const result = this._validate();
    if (!result.valid) {
      const count = Object.keys(result.errors).length;
      this._setStatus('error', `Please fix ${count} ${count === 1 ? 'field' : 'fields'} and try again.`);
      const first = FIELDS.find((f) => result.errors[f.name]);
      this._input(first.name).focus();
      return;
    }

    const data = Object.fromEntries(FIELDS.map((f) => [f.name, this._input(f.name).value.trim()]));
    const pending = [];
    const submitEvent = new CustomEvent('cv-submit', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        data,
        /** Register a promise; the form shows a pending state until it settles. */
        waitUntil: (promise) => {
          pending.push(Promise.resolve(promise));
        },
      },
    });
    const notCancelled = this.dispatchEvent(submitEvent);

    if (pending.length) {
      this._setBusy(true);
      this._setStatus('pending', this.getAttribute('pending-message') || 'Sending…');
      try {
        await Promise.all(pending);
        this.showSuccess();
      } catch {
        this.showError();
      } finally {
        this._setBusy(false);
      }
      return;
    }
    // A listener that calls preventDefault() takes over and must call
    // showSuccess() / showError() itself.
    if (notCancelled) this.showSuccess();
  }

  _setBusy(busy) {
    this._busy = busy;
    this._submit.disabled = busy;
    this._form.setAttribute('aria-busy', String(busy));
  }

  _setStatus(kind, text) {
    this._status.dataset.kind = kind;
    this._status.textContent = text;
  }

  /** Clear all fields, errors and the status message. */
  reset() {
    if (!this._form) return;
    this._form.reset();
    this._touched.clear();
    for (const f of FIELDS) {
      this._input(f.name).removeAttribute('aria-invalid');
      this.shadowRoot.getElementById(`cv-field-${f.name}-error`).textContent = '';
    }
    this._setStatus('', '');
  }

  /** Show the success message and clear the form. */
  showSuccess(message) {
    const text = message || this.getAttribute('success-message') || 'Thanks! Your message has been sent.';
    this.reset();
    this._setStatus('success', text);
  }

  /** Show an error message (the typed values are kept so the visitor can retry). */
  showError(message) {
    this._setStatus('error', message || this.getAttribute('error-message') || 'Sorry, your message could not be sent. Please try again later.');
  }
}

define('cv-contact-form', CvContactForm);
