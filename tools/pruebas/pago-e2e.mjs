// Flujo de pago en el navegador con la API simulada. Requiere precios y pagoOnline activos.
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://127.0.0.1:4321/';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
let cuerpo = null;
await p.route('**/api/pagar', async (r) => {
  cuerpo = JSON.parse(r.request().postData());
  await r.fulfill({ json: { url: url + '?pago=ok&payment_id=987654&external_reference=CUCA-E2E&status=approved', referencia: 'CUCA-E2E', total: 9000 } });
});
await p.route('**/api/pago?*', (r) => r.fulfill({ json: { estado: 'approved', detalle: 'accredited', monto: 9000, operacion: '987654' } }));
await p.addInitScript(() => { window.open = () => null; });
await p.goto(url, { waitUntil: 'load' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1500);

await p.selectOption('#op-queso-atuel', '250 g');
await p.click('[data-agregar][data-id="queso-atuel"]');
await p.click('[data-agregar][data-id="queso-atuel"]');
await p.check('input[name="pago"][value="Mercado Pago"]', { force: true });
const panel = await p.textContent('[data-pago-online-txt]');
const btnMp = await p.textContent('[data-btn-mp]');
const total = await p.textContent('[data-res-total]');
console.log('panel:', panel.trim().slice(0, 70), '…');
console.log('botón:', btnMp.trim(), '| total resumen:', total.trim());

await p.fill('#p-nombre', 'Prueba MP');
await p.fill('#p-tel', '11 5555-1234');
await p.click('.segmentado input[value="retiro"]', { force: true });
await p.click('[data-btn-mp]');
await p.waitForURL(/#pedido/, { timeout: 15000 });
await p.waitForSelector('[data-resultado-pago][open]');
await p.waitForFunction(() => document.querySelector('[data-rp-titulo]').textContent.includes('aprobado'), null, { timeout: 10000 });
console.log('enviado a /api/pagar:', JSON.stringify(cuerpo.items));
console.log('diálogo:', (await p.textContent('[data-rp-titulo]')).trim(), '-', (await p.textContent('[data-rp-texto]')).trim());
const wa = await p.getAttribute('[data-rp-wa]', 'href');
console.log('\n--- WhatsApp ---\n' + decodeURIComponent(wa.split('text=')[1]));
console.log('carrito vacío:', await p.evaluate(() => JSON.parse(localStorage.getItem('cuca-pedido-v1') || '[]').length === 0));
console.log('errores:', errores.length ? errores : 'ninguno');
await b.close();
