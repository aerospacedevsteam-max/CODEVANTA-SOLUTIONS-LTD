// Renders public/previews/og-default.jpg (1200×630) for social sharing.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;font-family:'Segoe UI',system-ui,sans-serif;background:radial-gradient(ellipse at top right,#3a68f2 0,transparent 55%),#121c36;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
<svg viewBox="0 0 40 40" width="84" height="84"><rect width="40" height="40" rx="10" fill="#fff" fill-opacity=".08"/><path d="M23 11.5h-4.5a8.5 8.5 0 0 0 0 17H23" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M24.5 15.5l4 9 4-9" fill="none" stroke="#5e8dfb" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<p style="margin:28px 0 0;font-size:30px;font-weight:800;letter-spacing:-.01em">CODEVANTA<span style="color:#90b5ff">SOLUTIONSLTD</span></p>
<h1 style="margin:14px 0 0;font-size:64px;line-height:1.08;letter-spacing:-.02em">Digital Resources to Build<br>Better, Faster.</h1>
<p style="margin:22px 0 0;font-size:26px;color:#c8d3ea">Website templates · UI kits · Developer resources · Business templates</p></body>`;
const chrome = await launchChrome({ port: 9345 });
try {
  await chrome.viewport(1200, 630);
  await chrome.goto('data:text/html;charset=utf-8,' + encodeURIComponent(html), 500);
  writeFileSync(join(root, 'public', 'previews', 'og-default.jpg'), await chrome.screenshot({ width: 1200, height: 630, quality: 88 }));
  console.log('Wrote public/previews/og-default.jpg');
} finally {
  await chrome.close();
}
