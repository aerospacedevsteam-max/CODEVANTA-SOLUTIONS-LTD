import { styleElement, define } from './styles.js';
import { resolveTheme } from './utils.js';

const css = `
  :host { display: inline-block; }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0.5rem 0.85rem;
    border-radius: var(--cv-radius-pill, 999px);
    border: 1px solid var(--cv-color-border, #d5dbe3);
    background: var(--cv-color-surface, #fff);
    color: var(--cv-color-text, #1b1f24);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--cv-duration, 160ms) ease;
  }
  button:hover { border-color: var(--cv-color-accent, #2f5bd3); }
  svg { width: 1.25rem; height: 1.25rem; flex: none; }
  .sun { display: none; }
  button[aria-pressed="true"] .sun { display: block; }
  button[aria-pressed="true"] .moon { display: none; }
  :host([icon-only]) .text {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
`;

const ICONS = `
  <svg class="moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.3 14.9A8.5 8.5 0 0 1 9.1 3.7a8.5 8.5 0 1 0 11.2 11.2z"/></svg>
  <svg class="sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
`;

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe, privacy settings)
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore: the theme still changes for this page view */
  }
}

/**
 * <cv-theme-toggle> — light/dark switch. Sets data-theme="light|dark" on <html>
 * and remembers the choice in localStorage (when storage is available).
 *
 * Attributes: label (default "Dark mode"), storage-key (default "cv-theme"), icon-only
 * Events: cv-theme-change { theme: "light" | "dark", source: "user" | "system" | "init" }
 * Property: theme ("light" | "dark")
 */
export class CvThemeToggle extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this._button = document.createElement('button');
    this._button.type = 'button';
    this._button.setAttribute('part', 'button');
    this._button.innerHTML = ICONS; // static markup only, no user data
    this._text = document.createElement('span');
    this._text.className = 'text';
    this._button.append(this._text);
    root.append(styleElement(css), this._button);
    this._button.addEventListener('click', () => {
      this._apply(this.theme === 'dark' ? 'light' : 'dark', 'user');
      writeStorage(this.storageKey, this.theme);
    });
    this._onSystemChange = (e) => {
      if (readStorage(this.storageKey) === null) this._apply(e.matches ? 'dark' : 'light', 'system');
    };
  }

  get storageKey() {
    return this.getAttribute('storage-key') || 'cv-theme';
  }

  get theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  set theme(value) {
    if (value !== 'light' && value !== 'dark') return;
    this._apply(value, 'user');
    writeStorage(this.storageKey, value);
  }

  connectedCallback() {
    this._mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this._mql?.addEventListener?.('change', this._onSystemChange);
    this._text.textContent = this.getAttribute('label') || 'Dark mode';
    this._apply(resolveTheme(readStorage(this.storageKey), Boolean(this._mql?.matches)), 'init');
  }

  disconnectedCallback() {
    this._mql?.removeEventListener?.('change', this._onSystemChange);
  }

  attributeChangedCallback() {
    this._text.textContent = this.getAttribute('label') || 'Dark mode';
  }

  _apply(theme, source) {
    const changed = document.documentElement.getAttribute('data-theme') !== theme;
    document.documentElement.setAttribute('data-theme', theme);
    this._button.setAttribute('aria-pressed', String(theme === 'dark'));
    // Keep every toggle on the page in sync.
    for (const other of document.querySelectorAll('cv-theme-toggle')) {
      if (other !== this && other._button) other._button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    if (changed || source === 'init') {
      this.dispatchEvent(new CustomEvent('cv-theme-change', { bubbles: true, composed: true, detail: { theme, source } }));
    }
  }
}

define('cv-theme-toggle', CvThemeToggle);
