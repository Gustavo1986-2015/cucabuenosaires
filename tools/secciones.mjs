// Captura cada sección por separado: node tools/secciones.mjs <url> <carpeta> [ancho] [alto]
import { chromium } from 'playwright-core';
const [,, url, dir, w = '1440', h = '900'] = process.argv;
const b = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
const logs = [];
p.on('console', m => { if (m.type() === 'error') logs.push('error: ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'));
const ids = await p.evaluate(() => [...document.querySelectorAll('main > section, main > div')].filter(s => s.offsetHeight > 0).map((s, i) => { s.dataset.cap = i; return s.id || `bloque${i}`; }));
for (const [i, id] of ids.entries()) {
  const sel = `[data-cap="${i}"]`;
  const el = p.locator(sel).first();
  if (!(await el.count())) continue;
  await el.scrollIntoViewIfNeeded();
  await p.evaluate(() => document.querySelectorAll('.revelar').forEach(e => e.classList.add('visible')));
  await p.waitForTimeout(id === 'inicio' || id === 'picada' ? 3500 : 900);
  await el.screenshot({ path: `${dir}/${String(i).padStart(2, '0')}-${id}.png` }).catch(() => {});
}
await p.locator('footer.pie').screenshot({ path: `${dir}/99-footer.png` });
console.log(ids.join(', '));
console.log(logs.join('\n') || 'no console errors');
await b.close();
