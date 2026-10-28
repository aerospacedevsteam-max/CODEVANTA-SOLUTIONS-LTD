/**
 * Shared Shadow DOM styles. Every value reads a --cv-* custom property from
 * theme.css, with a fallback so components still look reasonable without it.
 * Custom properties inherit through shadow boundaries, so setting them on
 * :root (or any ancestor) themes every component.
 */
export const baseStyles = `
  :host {
    box-sizing: border-box;
    font-family: var(--cv-font-body, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
    color: var(--cv-color-text, #1b1f24);
    line-height: 1.55;
  }
  :host([hidden]) { display: none !important; }
  *, *::before, *::after { box-sizing: inherit; }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--cv-font-heading, inherit);
    line-height: 1.2;
    margin: 0;
    color: var(--cv-color-heading, var(--cv-color-text, #1b1f24));
  }
  p { margin: 0; }
  a {
    color: var(--cv-color-link, #2f5bd3);
    text-underline-offset: 0.18em;
  }
  a:hover { color: var(--cv-color-link-hover, #1d3f9e); }
  a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
    outline: var(--cv-focus-width, 3px) solid var(--cv-color-focus, #f59e0b);
    outline-offset: 2px;
  }
  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0);
    white-space: nowrap; border: 0;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    min-height: 2.75rem;
    padding: 0.55rem 1.1rem;
    border-radius: var(--cv-radius-sm, 8px);
    border: 1px solid var(--cv-color-accent, #2f5bd3);
    background: var(--cv-color-accent, #2f5bd3);
    color: var(--cv-color-on-accent, #ffffff);
    font: inherit;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color var(--cv-duration, 160ms) ease, transform var(--cv-duration, 160ms) ease;
  }
  .btn:hover { background: var(--cv-color-accent-hover, #1d3f9e); color: var(--cv-color-on-accent, #ffffff); }
  .btn[disabled] { opacity: 0.6; cursor: progress; }
  .btn--ghost {
    background: transparent;
    color: var(--cv-color-accent, #2f5bd3);
  }
  .btn--ghost:hover { background: var(--cv-color-accent-soft, #e7edfc); color: var(--cv-color-accent-hover, #1d3f9e); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * Create a <style> element containing the base styles plus component CSS.
 * @param {string} css
 */
export function styleElement(css) {
  const style = document.createElement('style');
  style.textContent = baseStyles + css;
  return style;
}

/**
 * Define a custom element once (safe if the module is imported twice).
 * @param {string} name
 * @param {CustomElementConstructor} ctor
 */
export function define(name, ctor) {
  if (!customElements.get(name)) customElements.define(name, ctor);
}
