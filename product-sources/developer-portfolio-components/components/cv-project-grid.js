import { styleElement, define } from './styles.js';
import { parseList, collectTags, matchesTag, filterSummary } from './utils.js';

const css = `
  :host { display: block; }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: calc(var(--cv-space, 1rem) * 1.5);
  }
  .toolbar:empty { display: none; }
  .chip {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    min-height: 2.25rem;
    padding: 0.3rem 0.9rem;
    border-radius: var(--cv-radius-pill, 999px);
    border: 1px solid var(--cv-color-border, #d5dbe3);
    background: var(--cv-color-surface, #fff);
    color: var(--cv-color-text, #1b1f24);
    cursor: pointer;
    transition: background-color var(--cv-duration, 160ms) ease, color var(--cv-duration, 160ms) ease;
  }
  .chip:hover { border-color: var(--cv-color-accent, #2f5bd3); }
  .chip[aria-pressed="true"] {
    background: var(--cv-color-accent, #2f5bd3);
    border-color: var(--cv-color-accent, #2f5bd3);
    color: var(--cv-color-on-accent, #fff);
  }
  .grid {
    display: grid;
    gap: calc(var(--cv-space, 1rem) * 1.5);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--cv-grid-min, 16rem)), 1fr));
  }
  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--cv-color-muted, #555e6b);
    border: 1px dashed var(--cv-color-border, #d5dbe3);
    border-radius: var(--cv-radius-md, 14px);
  }
`;

/**
 * <cv-project-grid> — responsive grid of <cv-project-card> (or any element with a
 * `tags` attribute) plus a keyboard-accessible tag filter.
 *
 * Attributes: filter (active tag, reflected), label (toolbar label), all-label,
 *             empty-text, no-filter (hide the toolbar)
 * Events: cv-filter-change { tag, visible, total }
 * Property: filter (string)
 */
export class CvProjectGrid extends HTMLElement {
  static get observedAttributes() {
    return ['filter', 'label', 'all-label', 'empty-text', 'no-filter'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this._toolbar = document.createElement('div');
    this._toolbar.className = 'toolbar';
    this._toolbar.setAttribute('role', 'toolbar');
    this._toolbar.setAttribute('part', 'toolbar');
    this._status = document.createElement('p');
    this._status.className = 'visually-hidden';
    this._status.setAttribute('role', 'status');
    this._grid = document.createElement('div');
    this._grid.className = 'grid';
    this._grid.setAttribute('part', 'grid');
    this._grid.append(document.createElement('slot'));
    this._empty = document.createElement('p');
    this._empty.className = 'empty';
    this._empty.setAttribute('part', 'empty');
    this._empty.hidden = true;
    root.append(styleElement(css), this._toolbar, this._status, this._grid, this._empty);
    this._tagKey = null;
    this._onKeydown = this._onKeydown.bind(this);
    this._refresh = () => this._update(false);
  }

  get filter() {
    return this.getAttribute('filter') ?? '';
  }

  set filter(value) {
    if (value) this.setAttribute('filter', String(value));
    else this.removeAttribute('filter');
  }

  /** Elements that take part in filtering. */
  get items() {
    return [...this.children].filter((el) => el.localName === 'cv-project-card' || el.hasAttribute('tags'));
  }

  connectedCallback() {
    this._toolbar.addEventListener('keydown', this._onKeydown);
    this._observer = new MutationObserver(this._refresh);
    // subtree is needed to see `tags` attribute changes on the child cards.
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['tags'] });
    this._update(false);
  }

  disconnectedCallback() {
    this._toolbar.removeEventListener('keydown', this._onKeydown);
    this._observer?.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (name === 'label' || name === 'all-label' || name === 'no-filter') this._tagKey = null;
    this._update(false);
  }

  _setFilter(tag) {
    this.filter = tag;
    this._update(true);
  }

  _update(announce) {
    const items = this.items;
    const tagLists = items.map((el) => parseList(el.getAttribute('tags')));
    const tags = collectTags(tagLists);

    // Resolve the active filter to the canonical spelling; unknown tags reset to "all".
    let active = '';
    const wanted = this.filter.trim().toLowerCase();
    if (wanted) active = tags.find((t) => t.toLowerCase() === wanted) ?? '';

    this._renderToolbar(tags, active);

    let visible = 0;
    items.forEach((el, i) => {
      const show = matchesTag(tagLists[i], active);
      el.hidden = !show;
      if (show) visible += 1;
    });

    this._empty.textContent = this.getAttribute('empty-text') || 'No projects match this filter.';
    this._empty.hidden = !(items.length > 0 && visible === 0);
    if (announce) this._status.textContent = filterSummary(visible, items.length, active);

    if (this._lastDetail !== `${active}|${visible}|${items.length}`) {
      this._lastDetail = `${active}|${visible}|${items.length}`;
      this.dispatchEvent(
        new CustomEvent('cv-filter-change', { bubbles: true, detail: { tag: active, visible, total: items.length } }),
      );
    }
  }

  _renderToolbar(tags, active) {
    this._toolbar.setAttribute('aria-label', this.getAttribute('label') || 'Filter projects by tag');
    if (this.hasAttribute('no-filter') || tags.length === 0) {
      this._toolbar.replaceChildren();
      this._tagKey = null;
      return;
    }
    const key = tags.join('\u0000');
    if (key !== this._tagKey) {
      this._tagKey = key;
      const focusedTag = this.shadowRoot.activeElement?.dataset?.tag;
      const buttons = [['', this.getAttribute('all-label') || 'All'], ...tags.map((t) => [t, t])].map(([tag, text]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.dataset.tag = tag;
        b.textContent = text;
        b.setAttribute('part', 'chip');
        b.addEventListener('click', () => this._setFilter(tag));
        return b;
      });
      this._toolbar.replaceChildren(...buttons);
      if (focusedTag !== undefined) buttons.find((b) => b.dataset.tag === focusedTag)?.focus();
    }
    for (const b of this._toolbar.querySelectorAll('button')) {
      const pressed = b.dataset.tag === active;
      b.setAttribute('aria-pressed', String(pressed));
      b.tabIndex = pressed ? 0 : -1; // roving tabindex: one tab stop for the toolbar
    }
  }

  _onKeydown(event) {
    const buttons = [...this._toolbar.querySelectorAll('button')];
    const index = buttons.indexOf(this.shadowRoot.activeElement);
    if (index === -1) return;
    let next = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % buttons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons.forEach((b, i) => {
      b.tabIndex = i === next ? 0 : -1;
    });
    buttons[next].focus();
  }
}

define('cv-project-grid', CvProjectGrid);
