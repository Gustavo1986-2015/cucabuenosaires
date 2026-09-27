// Evalúa una expresión en la página: node tools/eval.mjs <url> <ancho> "<js>"
import { chromium } from 'playwright-core';
const [,, url, w, js] = process.argv;
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: +w, height: 844 }, isMobile: +w < 700, hasTouch: +w < 700 });
await p.goto(url, { waitUntil: 'networkidle' });
console.log(JSON.stringify(await p.evaluate(js), null, 1));
await b.close();
