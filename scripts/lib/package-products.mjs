// Validates and packages product deliverables. Used by build-products.mjs and the test suite.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import JSZip from 'jszip';
import { zipName } from '../products.config.mjs';

const IGNORED = new Set(['.DS_Store', 'Thumbs.db', '.htmlvalidate.json']);

export function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/** Returns a list of problems; an empty list means the folder is shippable. */
export function validateFolder(sourcesDir, folder) {
  const dir = join(sourcesDir, folder);
  const problems = [];
  if (!existsSync(dir)) return [`${folder}: folder missing`];
  const master = readFileSync(join(sourcesDir, 'LICENSE.txt'));
  for (const required of ['README.md', 'LICENSE.txt', 'CHANGELOG.md']) {
    if (!existsSync(join(dir, required))) problems.push(`${folder}: ${required} missing`);
  }
  if (existsSync(join(dir, 'LICENSE.txt')) && !readFileSync(join(dir, 'LICENSE.txt')).equals(master)) {
    problems.push(`${folder}: LICENSE.txt differs from product-sources/LICENSE.txt`);
  }
  const files = listFiles(dir);
  if (files.length < 4) problems.push(`${folder}: too few files (${files.length})`);
  for (const f of files) {
    if (statSync(f).size === 0) problems.push(`${relative(sourcesDir, f)}: empty file`);
  }
  // Deliverables must be self-contained: no remote scripts, styles or fonts.
  for (const f of files.filter((x) => /\.(html|css|js|mjs)$/.test(x))) {
    const text = readFileSync(f, 'utf8');
    if (/<script[^>]+src=["']https?:/i.test(text) || /<link[^>]+href=["']https?:[^>]+stylesheet/i.test(text) || /@import\s+url\(["']?https?:/i.test(text)) {
      problems.push(`${relative(sourcesDir, f)}: loads a remote resource`);
    }
  }
  return problems;
}

export async function buildZip(sourcesDir, product) {
  const problems = product.folders.flatMap((f) => validateFolder(sourcesDir, f));
  if (problems.length) throw new Error(`Cannot package ${product.slug}:\n  - ${problems.join('\n  - ')}`);

  const zip = new JSZip();
  // Reproducible archives: fixed timestamps and no auto-created folder entries
  // (JSZip stamps those with the current time), so unchanged products keep the same SHA-256.
  const FIXED = { date: new Date('2026-10-28T00:00:00Z'), createFolders: false };
  const root = { file: (name, data) => zip.file(`${product.slug}/${name}`, data, FIXED) };
  const bundled = product.folders.length > 1;
  for (const folder of product.folders) {
    const dir = join(sourcesDir, folder);
    for (const file of listFiles(dir)) {
      const rel = relative(dir, file).split(sep).join('/');
      const target = bundled ? `${folder}/${rel}` : rel;
      root.file(target, readFileSync(file));
    }
  }
  if (bundled) {
    root.file('LICENSE.txt', readFileSync(join(sourcesDir, 'LICENSE.txt')));
    root.file(
      'README.md',
      [
        `# ${product.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — v${product.version}`,
        '',
        'This collection contains the following original starter kits. Each folder is self-contained and has its own README.md with setup and customisation instructions.',
        '',
        ...product.folders.map((f) => `- \`${f}/\``),
        '',
        'All files are covered by the licence in LICENSE.txt (one licensee).',
        '',
      ].join('\n'),
      { date: new Date('2026-10-28T00:00:00Z') },
    );
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  return {
    fileName: zipName(product),
    buffer,
    size: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    entries: Object.keys(zip.files).filter((n) => !zip.files[n].dir).length,
  };
}
