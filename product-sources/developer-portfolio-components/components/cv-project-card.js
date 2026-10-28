import { styleElement, define } from './styles.js';
import { parseList, headingLevel, safeUrl } from './utils.js';

const css = `
  :host { display: block; height: 100%; }
  article {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cv-color-surface, #fff);
    border: 1px solid var(--cv-color-border, #d5dbe3);
    border-radius: var(--cv-radius-md, 14px);
    box-shadow: var(--cv-shadow-card, 0 4px 16px rgb(0 0 0 / 6%));
    overflow: hidden;
    transition: transform var(--cv-duration, 160ms) ease, box-shadow var(--cv-duration, 160ms) ease;
  }
  article:hover { transform: translateY(-2px); }
  .media:not(.has-content) { display: none; }
  .media ::slotted(img), .media img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    background: var(--cv-color-surface-alt, #eef1f5);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    flex: 1;
  }
  .meta {
    font-family: var(--cv-font-mono, monospace);
    font-size: 0.8rem;
    color: var(--cv-color-muted, #555e6b);
  }
  .title { font-size: 1.2rem; }
  .description { color: var(--cv-color-text, #1b1f24); }
  ul.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  ul.tags li {
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: var(--cv-radius-pill, 999px);
    background: var(--cv-color-tag-bg, #eef1f5);
    color: var(--cv-color-tag-text, #2b3440);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: auto;
    padding-top: 0.5rem;
    font-weight: 600;
  }
  .links:not(.has-content) { display: none; }
`;

/**
 * <cv-project-card> — a single project.
 *
 * Attributes: heading, tags (comma-separated), href, link-label, repo, repo-label,
 *             meta (e.g. a year), image-src, image-alt, heading-level (default 3)
 * Slots: default (description), "title", "media", "links" (extra links, after the generated ones)
 * Property: tags (string[], read-only)
 */
export class CvProjectCard extends HTMLElement {
  static get observedAttributes() {
    return ['heading', 'tags', 'href', 'link-label', 'repo', 'repo-label', 'meta', 'image-src', 'image-alt', 'heading-level'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /** Tags parsed from the `tags` attribute. */
  get tags() {
    return parseList(this.getAttribute('tags'));
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    this.render();
    if (name === 'tags') {
      this.dispatchEvent(new CustomEvent('cv-tags-change', { bubbles: true, detail: { tags: this.tags } }));
    }
  }

  render() {
    const root = this.shadowRoot;
    root.replaceChildren(styleElement(css));
    const article = document.createElement('article');
    article.setAttribute('part', 'card');

    // Media: slotted content wins over image-src.
    const media = document.createElement('div');
    media.className = 'media';
    media.setAttribute('part', 'media');
    const mediaSlot = document.createElement('slot');
    mediaSlot.name = 'media';
    const imageSrc = safeUrl(this.getAttribute('image-src'));
    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = this.getAttribute('image-alt') ?? '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 640;
      img.height = 360;
      mediaSlot.append(img);
    }
    media.append(mediaSlot);
    article.append(media);

    const body = document.createElement('div');
    body.className = 'body';

    const metaText = this.getAttribute('meta');
    if (metaText) {
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.setAttribute('part', 'meta');
      meta.textContent = metaText;
      body.append(meta);
    }

    const level = headingLevel(this.getAttribute('heading-level'), 3);
    const title = document.createElement(`h${level}`);
    title.className = 'title';
    title.id = 'title';
    title.setAttribute('part', 'title');
    const titleSlot = document.createElement('slot');
    titleSlot.name = 'title';
    titleSlot.textContent = this.getAttribute('heading') ?? '';
    title.append(titleSlot);
    body.append(title);
    article.setAttribute('aria-labelledby', 'title');

    const description = document.createElement('div');
    description.className = 'description';
    description.setAttribute('part', 'description');
    description.append(document.createElement('slot'));
    body.append(description);

    const tags = this.tags;
    if (tags.length) {
      const list = document.createElement('ul');
      list.className = 'tags';
      list.setAttribute('part', 'tags');
      list.setAttribute('aria-label', 'Technologies');
      for (const tag of tags) {
        const li = document.createElement('li');
        li.textContent = tag;
        list.append(li);
      }
      body.append(list);
    }

    const links = document.createElement('div');
    links.className = 'links';
    links.setAttribute('part', 'links');
    const linksSlot = document.createElement('slot');
    linksSlot.name = 'links';
    const slottedTitle = this.querySelector(':scope > [slot="title"]');
    const heading = this.getAttribute('heading') || (slottedTitle ? slottedTitle.textContent.trim() : '') || 'project';
    let generated = 0;
    const addLink = (href, label, srLabel) => {
      const url = safeUrl(href);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.textContent = label;
      const hint = document.createElement('span');
      hint.className = 'visually-hidden';
      hint.textContent = `: ${srLabel}`;
      a.append(hint);
      links.append(a);
      generated += 1;
    };
    addLink(this.getAttribute('href'), this.getAttribute('link-label') || 'View project', heading);
    addLink(this.getAttribute('repo'), this.getAttribute('repo-label') || 'Source code', heading);
    links.append(linksSlot);
    body.append(links);

    article.append(body);
    root.append(article);

    const sync = () => {
      media.classList.toggle('has-content', mediaSlot.assignedNodes().length > 0 || Boolean(imageSrc));
      links.classList.toggle('has-content', linksSlot.assignedNodes().length > 0 || generated > 0);
    };
    mediaSlot.addEventListener('slotchange', sync);
    linksSlot.addEventListener('slotchange', sync);
    sync();
  }
}

define('cv-project-card', CvProjectCard);
