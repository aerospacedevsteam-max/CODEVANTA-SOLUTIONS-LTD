// Generates original product preview images in public/previews/ from the
// products' own files: screenshots of the real template pages, and renders of
// the real workbook data for spreadsheet products. Bundles get a cover collage.
// Usage: npm run products:previews   (needs Chrome/Edge; set CHROME_PATH if needed)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';
import { products } from './products.config.mjs';
import { launchChrome } from './lib/chrome.mjs';
import { serialToDate, valueAt, workbookToHyperFormula } from './spreadsheets/lib/hf-workbook.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = join(root, 'product-sources');
const out = join(root, 'public', 'previews');
const work = join(root, 'node_modules', '.cache', 'previews');
mkdirSync(out, { recursive: true });
mkdirSync(work, { recursive: true });

const W = 1280;
const H = 960;
const SCALE = 0.75; // → 960×720 output

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// exceljs omits falsy cached results (e.g. 0), so recalculate those cells.
function cellText(cell, hf, sheetName) {
  let v = cell.value;
  if (v && typeof v === 'object' && 'formula' in v && v.result === undefined) {
    v = valueAt(hf, sheetName, cell.address);
    // Ignore [Red]-style sections and quoted text when detecting date formats.
    const fmt = (cell.numFmt ?? '').replace(/\[[^\]]*\]|"[^"]*"/g, '');
    if (typeof v === 'number' && /[dy]/i.test(fmt)) v = serialToDate(v);
  }
  if (v && typeof v === 'object') {
    if ('result' in v) v = v.result;
    else if ('richText' in v) v = v.richText.map((r) => r.text).join('');
    else if ('text' in v) v = v.text;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (v && typeof v === 'object' && 'error' in v) return String(v.error);
  return v == null ? '' : String(v);
}

async function sheetHtml(workbookPath, sheetName, title) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);
  const { hf } = workbookToHyperFormula(wb);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`${workbookPath}: sheet "${sheetName}" not found`);
  const cols = Math.min(ws.actualColumnCount || 8, 9);
  const rows = [];
  for (let r = 1; r <= Math.min(ws.rowCount, 24); r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      const text = cellText(cell, hf, sheetName);
      const fill = cell.fill?.fgColor?.argb ? `#${cell.fill.fgColor.argb.slice(2)}` : '';
      const bold = cell.font?.bold ? 'font-weight:600;' : '';
      const color = cell.font?.color?.argb ? `color:#${cell.font.color.argb.slice(2)};` : '';
      const num = typeof (cell.value?.result ?? cell.value) === 'number';
      cells.push(`<td style="${fill ? `background:${fill};` : ''}${bold}${color}${num ? 'text-align:right;' : ''}">${esc(text)}</td>`);
    }
    rows.push(`<tr><th>${r}</th>${cells.join('')}</tr>`);
  }
  const letters = Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i));
  const tabs = wb.worksheets.map((s) => `<span class="${s.name === sheetName ? 'on' : ''}">${esc(s.name)}</span>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;font:13px/1.35 "Segoe UI",system-ui,sans-serif;background:#e9edf5;color:#0f172a}
    .win{margin:28px;background:#fff;border-radius:12px;box-shadow:0 18px 40px -18px rgba(15,23,42,.35);overflow:hidden}
    .bar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#121c36;color:#fff;font-weight:600}
    .bar i{display:inline-block;width:10px;height:10px;border-radius:50%;background:#5e8dfb}
    .bar small{margin-left:auto;font-weight:400;color:#c8d3ea}
    table{border-collapse:collapse;width:100%;table-layout:fixed}
    th,td{border:1px solid #e2e8f0;padding:5px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;height:20px}
    th{background:#f1f5f9;color:#64748b;font-weight:500;width:34px;text-align:center}
    thead th{height:18px}
    .tabs{display:flex;gap:2px;padding:6px 10px;background:#f1f5f9;border-top:1px solid #e2e8f0}
    .tabs span{padding:4px 12px;border-radius:4px;color:#475569}.tabs .on{background:#fff;color:#121c36;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
  </style><div class="win"><div class="bar"><i></i>${esc(title)}<small>Rendered from the workbook’s sample data</small></div>
  <table><thead><tr><th></th>${letters.map((l) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
  <div class="tabs">${tabs}</div></div>`;
}

function collageHtml(title, images) {
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:${W}px;height:${H}px;font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(ellipse at top right,#3a68f2 0,transparent 55%),#121c36;color:#fff;overflow:hidden}
    h1{margin:56px 64px 8px;font-size:44px;letter-spacing:-.02em}p{margin:0 64px;color:#c8d3ea;font-size:20px}
    .grid{display:grid;grid-template-columns:repeat(${images.length > 3 ? 2 : images.length},1fr);gap:22px;margin:40px 64px}
    img{width:100%;height:${images.length > 3 ? 300 : 560}px;object-fit:cover;object-position:top;border-radius:12px;box-shadow:0 20px 40px -16px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.12)}
  </style><h1>${esc(title)}</h1><p>${images.length} original starter kits · HTML, CSS & JavaScript · one licence</p>
  <div class="grid">${images.map((i) => `<img src="${pathToFileURL(i).href}">`).join('')}</div>`;
}

const titleOf = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Ui', 'UI');

// Serve product-sources over HTTP: ES-module demos do not load from file:// URLs.
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  if (rel.startsWith('..')) return res.writeHead(403).end();
  try {
    const body = readFileSync(join(sources, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const chrome = await launchChrome();
const written = {};
try {
  await chrome.viewport(W, H);
  for (const p of products) {
    const files = [];
    const shots = [];
    if (p.previewPages) {
      for (const [i, page] of p.previewPages.entries()) {
        const [file, hash] = page.split('#');
        await chrome.goto(base + file);
        let y = 0;
        if (hash) y = await chrome.evaluate(`(() => { const el = document.getElementById(${JSON.stringify(hash)}); if (!el) return 0; scrollTo(0, el.getBoundingClientRect().top + scrollY); return scrollY; })()`);
        const img = await chrome.screenshot({ y, width: W, height: H, scale: SCALE });
        const shot = join(work, `${p.slug}-${i + 1}.jpg`);
        writeFileSync(shot, img);
        shots.push(shot);
      }
    }
    if (p.workbook) {
      for (const [i, sheet] of p.previewSheets.entries()) {
        const html = join(work, `${p.slug}-sheet-${i + 1}.html`);
        writeFileSync(html, await sheetHtml(join(sources, p.workbook), sheet, `${titleOf(p.slug)} — ${sheet}`));
        await chrome.goto(pathToFileURL(html).href, 400);
        const img = await chrome.screenshot({ width: W, height: H, scale: SCALE });
        const shot = join(work, `${p.slug}-${i + 1}.jpg`);
        writeFileSync(shot, img);
        shots.push(shot);
      }
    }
    if (p.folders.length > 1) {
      const html = join(work, `${p.slug}-cover.html`);
      writeFileSync(html, collageHtml(titleOf(p.slug), shots));
      await chrome.goto(pathToFileURL(html).href, 600);
      const cover = await chrome.screenshot({ width: W, height: H, scale: SCALE });
      writeFileSync(join(out, `${p.slug}-1.jpg`), cover);
      files.push(`/previews/${p.slug}-1.jpg`);
      shots.forEach((s, i) => {
        const name = `${p.slug}-${i + 2}.jpg`;
        writeFileSync(join(out, name), readFileSync(s));
        files.push(`/previews/${name}`);
      });
    } else {
      shots.forEach((s, i) => {
        const name = `${p.slug}-${i + 1}.jpg`;
        writeFileSync(join(out, name), readFileSync(s));
        files.push(`/previews/${name}`);
      });
    }
    written[p.slug] = files;
    console.log(`OK ${p.slug}: ${files.length} images`);
  }
} finally {
  await chrome.close();
  server.close();
}
writeFileSync(join(out, 'previews.json'), JSON.stringify(written, null, 2));

