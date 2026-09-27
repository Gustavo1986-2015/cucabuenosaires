// Captura un elemento: node tools/captura-el.mjs <url> <selector> <salida> [ancho] [espera_ms] [js_previo]
import { chromium } from 'playwright-core';
const [,, url, sel, out, w = '1440', espera = '3000', js = ''] = process.argv;
const b = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: 900 } });
await p.goto(url, { waitUntil: 'load' });
await p.evaluate(() => document.querySelectorAll('.revelar').forEach(e => e.classList.add('visible')));
const el = p.locator(sel).first();
await el.scrollIntoViewIfNeeded();
if (js) await p.evaluate(js);
await p.waitForTimeout(+espera);
await el.screenshot({ path: out });
await b.close();
