/**
 * Pure helper functions shared by the cv-* components.
 * No DOM access here — everything is unit-testable in plain Node.
 */

/**
 * Split a comma-separated attribute value into a clean list.
 * Trims whitespace, drops empty entries and removes case-insensitive duplicates
 * (the first spelling wins).
 * @param {string | null | undefined} value
 * @returns {string[]}
 */
export function parseList(value) {
  if (value === null || value === undefined) return [];
  const seen = new Set();
  const out = [];
  for (const part of String(value).split(',')) {
    const item = part.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Collect the unique tags from several tag lists, sorted alphabetically
 * (case-insensitive). The first spelling of each tag is kept.
 * @param {string[][]} tagLists
 * @returns {string[]}
 */
export function collectTags(tagLists) {
  const map = new Map();
  for (const list of tagLists) {
    for (const tag of list) {
      const key = tag.trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, tag.trim());
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Does a tag list match the active filter? An empty filter matches everything.
 * @param {string[]} tags
 * @param {string | null | undefined} filter
 */
export function matchesTag(tags, filter) {
  const wanted = (filter ?? '').trim().toLowerCase();
  if (!wanted) return true;
  return tags.some((t) => t.trim().toLowerCase() === wanted);
}

/**
 * Filter items by tag.
 * @template T
 * @param {T[]} items
 * @param {string | null | undefined} filter
 * @param {(item: T) => string[]} getTags
 * @returns {T[]}
 */
export function filterByTag(items, filter, getTags) {
  return items.filter((item) => matchesTag(getTags(item), filter));
}

/**
 * Parse a skills attribute such as "TypeScript:5, Go:3, Docker".
 * Levels are optional, rounded and clamped to 0..max. Invalid levels become null.
 * @param {string | null | undefined} value
 * @param {number} [max=5]
 * @returns {{ name: string, level: number | null }[]}
 */
export function parseSkills(value, max = 5) {
  const safeMax = Number.isFinite(max) && max > 0 ? Math.round(max) : 5;
  return parseList(value).map((entry) => {
    const idx = entry.lastIndexOf(':');
    if (idx === -1) return { name: entry, level: null };
    const name = entry.slice(0, idx).trim();
    const raw = entry.slice(idx + 1).trim();
    const num = raw === '' ? Number.NaN : Number(raw);
    if (!name) return { name: entry, level: null };
    if (!Number.isFinite(num)) return { name, level: null };
    return { name, level: Math.min(safeMax, Math.max(0, Math.round(num))) };
  });
}

/**
 * Pragmatic email check: one "@", non-empty local part, a dot in the domain,
 * no whitespace. (Real verification can only happen server-side.)
 * @param {string} value
 */
export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v);
}

/** Default limits for the contact form. */
export const CONTACT_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 100,
  messageMin: 10,
  messageMax: 5000,
});

/**
 * Validate contact-form data.
 * @param {{ name?: string, email?: string, message?: string }} data
 * @param {Partial<typeof CONTACT_LIMITS>} [limits]
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateContact(data, limits = {}) {
  const l = { ...CONTACT_LIMITS, ...limits };
  const errors = {};
  const name = (data.name ?? '').trim();
  const email = (data.email ?? '').trim();
  const message = (data.message ?? '').trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < l.nameMin) errors.name = `Name must be at least ${l.nameMin} characters.`;
  else if (name.length > l.nameMax) errors.name = `Name must be ${l.nameMax} characters or fewer.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address, like name@example.com.';

  if (!message) errors.message = 'Please enter a message.';
  else if (message.length < l.messageMin) errors.message = `Message must be at least ${l.messageMin} characters.`;
  else if (message.length > l.messageMax) errors.message = `Message must be ${l.messageMax} characters or fewer.`;

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Decide which theme to use: a valid stored choice wins, otherwise the OS preference.
 * @param {string | null | undefined} stored
 * @param {boolean} prefersDark
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(stored, prefersDark) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Parse a heading-level attribute into 1..6, falling back when invalid.
 * @param {string | null | undefined} value
 * @param {number} fallback
 */
export function headingLevel(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : fallback;
}

/**
 * Human-readable summary for the project grid's live region.
 * @param {number} visible
 * @param {number} total
 * @param {string} [tag]
 */
export function filterSummary(visible, total, tag) {
  const noun = total === 1 ? 'project' : 'projects';
  if (!tag) return `Showing all ${total} ${noun}.`;
  return `Showing ${visible} of ${total} ${noun} tagged “${tag}”.`;
}

/**
 * Only allow http(s), mailto, tel and relative URLs in generated links.
 * Returns null for anything else (e.g. "javascript:").
 * @param {string | null | undefined} url
 */
export function safeUrl(url) {
  if (url === null || url === undefined) return null;
  const v = String(url).trim();
  if (!v) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (!scheme) return v; // relative URL or fragment
  return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase()) ? v : null;
}
