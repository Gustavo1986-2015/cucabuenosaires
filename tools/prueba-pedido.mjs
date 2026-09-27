// Prueba de punta a punta: agregar productos, armar picada, completar el formulario y leer el link de WhatsApp
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://127.0.0.1:4321/';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on('pageerror', e => errores.push(e.message));
await p.addInitScript(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); return null; }; });
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle' });

// 1. Producto con presentación
await p.selectOption('#op-queso-ahumado', '250 g');
await p.click('[data-agregar][data-id="queso-ahumado"]');
await p.click('[data-agregar][data-id="queso-ahumado"]');
// 2. Oferta con variantes (selector)
await p.click('[data-agregar][data-id="oferta-cremoso-promo"]');
await p.check('dialog[open] input[value^="Tregar"]');
await p.click('dialog[open] button[value="ok"]');
// 3. Picada a medida
for (let i = 0; i < 4; i++) await p.click('[data-personas="1"]');
await p.check('input[name="estilo"][value="premium"]', { force: true });
await p.check('input[name="extra"][value="miga"]', { force: true });
await p.click('[data-res-agregar]');
const contador = await p.textContent('[data-contador]');
// 4. Formulario vacío -> errores
await p.click('[data-btn-wa]');
const errNombre = await p.textContent('[data-error="nombre"]');
// 5. Completar
await p.fill('#p-nombre', 'Prueba Cuca');
await p.fill('#p-tel', '11 5555-1234');
await p.fill('#p-dir', 'Av. Rivadavia 8000');
await p.fill('#p-notas', 'Timbre 3B');
await p.click('[data-btn-wa]');
const abiertos = await p.evaluate(() => window.__abiertos);
const waPicada = await p.getAttribute('[data-res-wa]', 'href');
console.log('contador:', contador, '| error nombre:', errNombre);
console.log('\n--- mensaje de pedido ---\n' + decodeURIComponent((abiertos[0] || '').split('text=')[1] || 'NO SE ABRIÓ'));
console.log('\n--- link picada ---\n' + decodeURIComponent(waPicada.split('text=')[1]));
console.log('\nerrores:', errores.length ? errores : 'ninguno');
await b.close();
