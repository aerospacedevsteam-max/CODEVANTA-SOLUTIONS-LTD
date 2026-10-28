import { styleElement, define } from './styles.js';
import { headingLevel } from './utils.js';

const timelineCss = `
  :host { display: block; }
  .list {
    position: relative;
    display: grid;
    gap: calc(var(--cv-space, 1rem) * 1.75);
    margin: 0;
    padding: 0 0 0 1.75rem;
  }
  .list::before {
    content: "";
    position: absolute;
    top: 0.4rem;
    bottom: 0.4rem;
    left: 0.45rem;
    width: 2px;
    background: var(--cv-color-border, #d5dbe3);
  }
`;

const itemCss = `
  :host { display: block; position: relative; }
  .marker {
    position: absolute;
    left: -1.75rem;
    top: 0.3rem;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--cv-color-surface, #fff);
    border: 3px solid var(--cv-color-accent, #2f5bd3);
  }
  :host([current]) .marker { background: var(--cv-color-accent, #2f5bd3); }
  .date {
    display: block;
    font-family: var(--cv-font-mono, monospace);
    font-size: 0.82rem;
    color: var(--cv-color-muted, #555e6b);
    margin-bottom: 0.2rem;
  }
  .heading { font-size: 1.1rem; }
  .org { color: var(--cv-color-muted, #555e6b); font-weight: 500; margin-top: 0.15rem; }
  .body { margin-top: 0.5rem; }
  .body ::slotted(ul) { margin: 0.5rem 0 0; padding-left: 1.1rem; }
`;

/**
 * <cv-timeline> — vertical timeline (experience, education, milestones).
 * Contains <cv-timeline-item> children.
 *
 * Attributes: label (accessible name for the list)
 */
export class CvTimeline extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this._list = document.createElement('div');
    this._list.className = 'list';
    this._list.setAttribute('role', 'list');
    this._list.setAttribute('part', 'list');
    this._list.append(document.createElement('slot'));
    root.append(styleElement(timelineCss), this._list);
  }

  connectedCallback() {
    this._syncLabel();
  }

  attributeChangedCallback() {
    this._syncLabel();
  }

  _syncLabel() {
    const label = this.getAttribute('label');
    if (label) this._list.setAttribute('aria-label', label);
    else this._list.removeAttribute('aria-label');
  }
}

/**
 * <cv-timeline-item> — one entry inside <cv-timeline>.
 *
 * Attributes: heading, org, date (display text), datetime (machine-readable, optional),
 *             current (boolean: highlights the marker), heading-level (default 3)
 * Slots: default (description), "heading", "org"
 */
export class CvTimelineItem extends HTMLElement {
  static get observedAttributes() {
    return ['heading', 'org', 'date', 'datetime', 'current', 'heading-level'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.render();
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren(styleElement(itemCss));

    const marker = document.createElement('span');
    marker.className = 'marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.setAttribute('part', 'marker');
    root.append(marker);

    const dateText = this.getAttribute('date');
    if (dateText) {
      const time = document.createElement('time');
      time.className = 'date';
      time.setAttribute('part', 'date');
      const dt = this.getAttribute('datetime');
      if (dt) time.dateTime = dt;
      time.textContent = dateText;
      root.append(time);
    }

    const h = document.createElement(`h${headingLevel(this.getAttribute('heading-level'), 3)}`);
    h.className = 'heading';
    h.setAttribute('part', 'heading');
    const hSlot = document.createElement('slot');
    hSlot.name = 'heading';
    hSlot.textContent = this.getAttribute('heading') ?? '';
    h.append(hSlot);
    if (this.hasAttribute('current')) {
      const sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = ' (current)';
      h.append(sr);
    }
    root.append(h);

    const orgText = this.getAttribute('org');
    if (orgText || this.querySelector(':scope > [slot="org"]')) {
      const org = document.createElement('p');
      org.className = 'org';
      org.setAttribute('part', 'org');
      const oSlot = document.createElement('slot');
      oSlot.name = 'org';
      oSlot.textContent = orgText ?? '';
      org.append(oSlot);
      root.append(org);
    }

    const body = document.createElement('div');
    body.className = 'body';
    body.setAttribute('part', 'body');
    body.append(document.createElement('slot'));
    root.append(body);
  }
}

define('cv-timeline', CvTimeline);
define('cv-timeline-item', CvTimelineItem);
