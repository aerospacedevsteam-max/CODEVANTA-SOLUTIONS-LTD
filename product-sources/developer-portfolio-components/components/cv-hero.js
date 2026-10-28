import { styleElement, define } from './styles.js';
import { headingLevel, safeUrl } from './utils.js';

const css = `
  :host { display: block; }
  section {
    display: grid;
    gap: calc(var(--cv-space, 1rem) * 2);
    align-items: center;
    padding: calc(var(--cv-space, 1rem) * 3) 0;
  }
  :host([avatar-src]) section { grid-template-columns: minmax(0, 1fr) auto; }
  .eyebrow {
    font-family: var(--cv-font-mono, monospace);
    font-size: 0.9rem;
    color: var(--cv-color-accent, #2f5bd3);
    margin-bottom: 0.5rem;
  }
  .name { font-size: clamp(2.2rem, 6vw, 3.6rem); letter-spacing: -0.02em; }
  .tagline {
    font-size: clamp(1.15rem, 2.6vw, 1.5rem);
    color: var(--cv-color-muted, #555e6b);
    margin-top: 0.5rem;
    font-weight: 500;
  }
  .intro { margin-top: 1.25rem; max-width: 60ch; font-size: 1.075rem; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.75rem; }
  .actions:not(.has-content) { display: none; }
  ::slotted(a) { text-decoration: none; }
  .avatar {
    width: clamp(8rem, 22vw, 12rem);
    aspect-ratio: 1;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid var(--cv-color-surface, #fff);
    box-shadow: var(--cv-shadow-card, 0 4px 16px rgb(0 0 0 / 8%));
    background: var(--cv-color-surface-alt, #eef1f5);
  }
  @media (max-width: 40rem) {
    :host([avatar-src]) section { grid-template-columns: 1fr; }
    .avatar { order: -1; }
  }
`;

/**
 * <cv-hero> — introduction block for the top of a portfolio.
 *
 * Attributes: name, tagline, eyebrow, avatar-src, avatar-alt, heading-level (default 1)
 * Slots: default (intro text), "actions" (buttons / links), "name" and "tagline" (rich overrides)
 */
export class CvHero extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'tagline', 'eyebrow', 'avatar-src', 'avatar-alt', 'heading-level'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren(styleElement(css));

    const section = document.createElement('section');
    section.setAttribute('part', 'section');
    const text = document.createElement('div');
    text.className = 'text';

    const eyebrow = this.getAttribute('eyebrow');
    if (eyebrow) {
      const p = document.createElement('p');
      p.className = 'eyebrow';
      p.setAttribute('part', 'eyebrow');
      p.textContent = eyebrow;
      text.append(p);
    }

    const level = headingLevel(this.getAttribute('heading-level'), 1);
    const heading = document.createElement(`h${level}`);
    heading.className = 'name';
    heading.id = 'cv-hero-heading';
    heading.setAttribute('part', 'name');
    const nameSlot = document.createElement('slot');
    nameSlot.name = 'name';
    nameSlot.textContent = this.getAttribute('name') ?? '';
    heading.append(nameSlot);
    text.append(heading);
    section.setAttribute('aria-labelledby', heading.id);

    const tagline = document.createElement('p');
    tagline.className = 'tagline';
    tagline.setAttribute('part', 'tagline');
    const taglineSlot = document.createElement('slot');
    taglineSlot.name = 'tagline';
    taglineSlot.textContent = this.getAttribute('tagline') ?? '';
    tagline.append(taglineSlot);
    text.append(tagline);

    const intro = document.createElement('div');
    intro.className = 'intro';
    intro.setAttribute('part', 'intro');
    intro.append(document.createElement('slot'));
    text.append(intro);

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.setAttribute('part', 'actions');
    const actionsSlot = document.createElement('slot');
    actionsSlot.name = 'actions';
    const syncActions = () => {
      actions.classList.toggle('has-content', actionsSlot.assignedNodes().length > 0);
    };
    actionsSlot.addEventListener('slotchange', syncActions);
    actions.append(actionsSlot);
    text.append(actions);

    section.append(text);

    const avatarSrc = safeUrl(this.getAttribute('avatar-src'));
    if (avatarSrc) {
      const img = document.createElement('img');
      img.className = 'avatar';
      img.setAttribute('part', 'avatar');
      img.src = avatarSrc;
      img.alt = this.getAttribute('avatar-alt') ?? '';
      img.width = 192;
      img.height = 192;
      img.decoding = 'async';
      section.append(img);
    }

    root.append(section);
    syncActions();
  }
}

define('cv-hero', CvHero);
