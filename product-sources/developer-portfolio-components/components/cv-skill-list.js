import { styleElement, define } from './styles.js';
import { parseSkills, headingLevel } from './utils.js';

const css = `
  :host { display: block; }
  .heading { font-size: 1.1rem; margin-bottom: 0.9rem; }
  ul { list-style: none; margin: 0; padding: 0; }

  /* chips variant (default) */
  :host(:not([variant="meter"])) ul { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  :host(:not([variant="meter"])) li {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.8rem;
    border-radius: var(--cv-radius-pill, 999px);
    background: var(--cv-color-tag-bg, #eef1f5);
    color: var(--cv-color-tag-text, #2b3440);
    font-size: 0.9rem;
    font-weight: 600;
  }
  :host(:not([variant="meter"])) .dots { display: inline-flex; gap: 2px; }
  :host(:not([variant="meter"])) .dot {
    width: 0.4rem; height: 0.4rem; border-radius: 50%;
    background: var(--cv-color-border, #d5dbe3);
  }
  :host(:not([variant="meter"])) .dot.on { background: var(--cv-color-accent, #2f5bd3); }
  :host(:not([variant="meter"])) .bar { display: none; }

  /* meter variant */
  :host([variant="meter"]) ul { display: grid; gap: 0.85rem; }
  :host([variant="meter"]) li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.3rem 1rem;
    font-weight: 600;
  }
  :host([variant="meter"]) .dots { display: none; }
  :host([variant="meter"]) .label {
    font-family: var(--cv-font-mono, monospace);
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--cv-color-muted, #555e6b);
  }
  :host([variant="meter"]) .bar {
    grid-column: 1 / -1;
    height: 0.5rem;
    border-radius: var(--cv-radius-pill, 999px);
    background: var(--cv-color-surface-alt, #eef1f5);
    overflow: hidden;
  }
  :host([variant="meter"]) .fill {
    display: block;
    height: 100%;
    background: var(--cv-color-accent, #2f5bd3);
    border-radius: inherit;
    transition: width calc(var(--cv-duration, 160ms) * 3) ease;
  }
  :host(:not([variant="meter"])) .label { display: none; }
`;

const DEFAULT_LEVEL_NAMES = ['None', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

/**
 * <cv-skill-list> — a list of skills, as chips (default) or level meters.
 *
 * Attributes: skills ("Name:level, Name:level, Name"), heading, heading-level (default 3),
 *             variant ("chips" | "meter"), max (default 5), level-names (comma list, max+1 entries)
 * Slot: "heading" (rich heading override)
 * Property: skills ({ name, level }[], read-only)
 */
export class CvSkillList extends HTMLElement {
  static get observedAttributes() {
    return ['skills', 'heading', 'heading-level', 'variant', 'max', 'level-names'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get max() {
    const n = Number.parseInt(this.getAttribute('max') ?? '', 10);
    return Number.isInteger(n) && n > 0 ? n : 5;
  }

  get skills() {
    return parseSkills(this.getAttribute('skills'), this.max);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.render();
  }

  _levelName(level) {
    const custom = (this.getAttribute('level-names') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (custom.length === this.max + 1) return custom[level];
    if (this.max === 5) return DEFAULT_LEVEL_NAMES[level];
    return '';
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren(styleElement(css));
    const max = this.max;
    const headingText = this.getAttribute('heading');
    const hasHeadingSlot = this.querySelector(':scope > [slot="heading"]') !== null;
    const list = document.createElement('ul');
    list.setAttribute('part', 'list');

    if (headingText || hasHeadingSlot) {
      const h = document.createElement(`h${headingLevel(this.getAttribute('heading-level'), 3)}`);
      h.className = 'heading';
      h.id = 'heading';
      h.setAttribute('part', 'heading');
      const slot = document.createElement('slot');
      slot.name = 'heading';
      slot.textContent = headingText ?? '';
      h.append(slot);
      root.append(h);
      list.setAttribute('aria-labelledby', 'heading');
    }

    for (const skill of this.skills) {
      const li = document.createElement('li');
      li.setAttribute('part', 'item');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = skill.name;
      li.append(name);

      if (skill.level !== null) {
        const levelName = this._levelName(skill.level);
        const desc = `${levelName ? `${levelName}, ` : ''}level ${skill.level} of ${max}`;

        // Screen-reader text (the visual dots / bar are decorative).
        const sr = document.createElement('span');
        sr.className = 'visually-hidden';
        sr.textContent = ` (${desc})`;
        li.append(sr);

        const label = document.createElement('span');
        label.className = 'label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = levelName || `${skill.level}/${max}`;
        li.append(label);

        const dots = document.createElement('span');
        dots.className = 'dots';
        dots.setAttribute('aria-hidden', 'true');
        for (let i = 1; i <= max; i += 1) {
          const dot = document.createElement('span');
          dot.className = i <= skill.level ? 'dot on' : 'dot';
          dots.append(dot);
        }
        li.append(dots);

        const bar = document.createElement('span');
        bar.className = 'bar';
        bar.setAttribute('aria-hidden', 'true');
        const fill = document.createElement('span');
        fill.className = 'fill';
        fill.setAttribute('part', 'meter-fill');
        fill.style.width = `${(skill.level / max) * 100}%`;
        bar.append(fill);
        li.append(bar);
      }
      list.append(li);
    }
    root.append(list);
  }
}

define('cv-skill-list', CvSkillList);
