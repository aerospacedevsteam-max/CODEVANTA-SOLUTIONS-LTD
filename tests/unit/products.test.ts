/**
 * Packages every product exactly as `npm run products:build` does and checks
 * that each archive contains real, complete, self-contained deliverables.
 */
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import JSZip from 'jszip';
// @ts-expect-error — plain ESM build scripts without type declarations
import { products } from '../../scripts/products.config.mjs';
// @ts-expect-error — plain ESM build scripts without type declarations
import { buildZip, validateFolder } from '../../scripts/lib/package-products.mjs';
// @ts-expect-error — plain ESM build scripts without type declarations
import { products as catalogue } from '../../scripts/catalogue.mjs';

const sources = join(__dirname, '..', '..', 'product-sources');
type P = { slug: string; folders: string[]; version: string };

describe('product deliverables', () => {
  it('every catalogue product has a packaging definition and vice versa', () => {
    expect((catalogue as P[]).map((p) => p.slug).sort()).toEqual((products as P[]).map((p) => p.slug).sort());
  });

  it.each((products as P[]).map((p) => [p.slug, p] as const))('%s packages into a complete archive', async (_slug, p) => {
    for (const f of p.folders) expect(validateFolder(sources, f)).toEqual([]);
    const z = await buildZip(sources, p);
    const zip = await JSZip.loadAsync(z.buffer);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    expect(names.every((n) => n.startsWith(`${p.slug}/`))).toBe(true);
    expect(names).toContain(`${p.slug}/LICENSE.txt`);
    expect(names).toContain(`${p.slug}/README.md`);
    for (const n of names) expect((await zip.file(n)!.async('uint8array')).length).toBeGreaterThan(0);
    if (p.folders.length > 1) for (const f of p.folders) expect(names).toContain(`${p.slug}/${f}/README.md`);
  });

  it('every item in each product’s “What’s included” list exists in its archive', async () => {
    for (const c of catalogue as { slug: string; contents: [string, string][] }[]) {
      const p = (products as P[]).find((x) => x.slug === c.slug)!;
      const zip = await JSZip.loadAsync((await buildZip(sources, p)).buffer);
      const names = Object.keys(zip.files).map((n) => n.slice(p.slug.length + 1));
      for (const [item] of c.contents) {
        const pattern = item.replace('*.js', '');
        expect(names.some((n) => n === item || n.startsWith(pattern)), `${c.slug}: ${item}`).toBe(true);
      }
    }
  });
});
