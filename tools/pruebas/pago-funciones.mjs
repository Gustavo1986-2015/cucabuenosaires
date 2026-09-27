// Prueba las funciones de pago con Mercado Pago simulado (sin credenciales reales).
// node tools/pruebas/pago-funciones.mjs
import assert from 'node:assert/strict';
import negocio from '../../src/data/negocio.json' with { type: 'json' };
import productos from '../../src/data/productos.json' with { type: 'json' };

// Activar pago online y cargar un precio de prueba sólo en memoria
negocio.pagoOnline = { mercadopago: true };
negocio.costoEnvio = 3000;
productos.productos.find((p) => p.id === 'queso-atuel').precios = { '250 g': 4500, '500 g': 8800 };

const { onRequestPost } = await import('../../functions/api/pagar.js');
const { onRequestGet } = await import('../../functions/api/pago.js');

let enviado = null;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).endsWith('/checkout/preferences')) {
    enviado = JSON.parse(init.body);
    assert.equal(init.headers.authorization, 'Bearer TEST-token');
    return new Response(JSON.stringify({ id: 'pref-1', init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1' }), { status: 201 });
  }
  if (String(url).includes('/v1/payments/123456')) {
    return new Response(JSON.stringify({ id: 123456, status: 'approved', status_detail: 'accredited', transaction_amount: 12000, external_reference: 'CUCA-REF' }));
  }
  return new Response('{}', { status: 404 });
};
const env = { MP_ACCESS_TOKEN: 'TEST-token' };
const req = (body) => new Request('https://cuca.test/api/pagar', { method: 'POST', body: JSON.stringify(body) });

// 1. Pedido válido con envío: precios del servidor, no los del navegador
let r = await onRequestPost({ env, request: req({
  items: [{ id: 'queso-atuel', opcion: '250 g', cant: 2, precio: 1 }],
  cliente: { nombre: 'Ana', telefono: '1155551234', entrega: 'envio', direccion: 'Rivadavia 8000' },
}) });
let j = await r.json();
assert.equal(r.status, 200, JSON.stringify(j));
assert.equal(j.total, 2 * 4500 + 3000);
assert.equal(enviado.items[0].unit_price, 4500);
assert.equal(enviado.items[0].quantity, 2);
assert.equal(enviado.items[1].title, 'Envío a domicilio');
assert.equal(enviado.back_urls.success, 'https://cuca.test/?pago=ok');
assert.equal(enviado.auto_return, 'approved');
console.log('✓ crea la preferencia con precios del servidor + envío:', j.total);

// 2. Producto sin precio -> 422
r = await onRequestPost({ env, request: req({ items: [{ id: 'jamon-crudo', opcion: '100 g', cant: 1 }] }) });
assert.equal(r.status, 422);
console.log('✓ rechaza productos sin precio fijo');

// 3. Cantidad inválida / pedido vacío / sin token
assert.equal((await onRequestPost({ env, request: req({ items: [{ id: 'queso-atuel', opcion: '250 g', cant: 999 }] }) })).status, 400);
assert.equal((await onRequestPost({ env, request: req({ items: [] }) })).status, 400);
assert.equal((await onRequestPost({ env: {}, request: req({ items: [{ id: 'queso-atuel', opcion: '250 g', cant: 1 }] }) })).status, 503);
console.log('✓ valida cantidades, pedido vacío y falta de credenciales');

// 4. Verificación del pago
r = await onRequestGet({ env, request: new Request('https://cuca.test/api/pago?id=123456&ref=CUCA-REF') });
j = await r.json();
assert.deepEqual(j, { estado: 'approved', detalle: 'accredited', monto: 12000, operacion: '123456' });
r = await onRequestGet({ env, request: new Request('https://cuca.test/api/pago?id=123456&ref=OTRA') });
assert.equal(r.status, 403);
console.log('✓ verifica el pago y exige que la referencia coincida');
console.log('\nTodas las pruebas pasaron.');
