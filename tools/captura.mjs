import { chromium } from 'playwright-core';
const [,, url, out, w = '1440', h = '900', full = '1'] = process.argv;
const b = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
// scroll through to trigger reveal/lazy
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 150)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'));
await p.waitForTimeout(2500);
console.log('revelar sin visible:', await p.evaluate(() => document.querySelectorAll('.revelar:not(.visible)').length), 'de', await p.evaluate(() => document.querySelectorAll('.revelar').length));
await p.evaluate(() => document.querySelectorAll('.revelar').forEach(e => e.classList.add('visible')));
await p.waitForTimeout(1200);
await p.screenshot({ path: out, fullPage: full === '1' });
console.log(logs.join('\n') || 'no console errors');
await b.close();
