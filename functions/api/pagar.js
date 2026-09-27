// POST /api/pagar — crea una preferencia de Checkout Pro de Mercado Pago.
// Requiere la variable secreta MP_ACCESS_TOKEN en Cloudflare Pages (Settings → Environment variables).
import productos from '../../src/data/productos.json' with { type: 'json' };
import ofertas from '../../src/data/ofertas.json' with { type: 'json' };
import negocio from '../../src/data/negocio.json' with { type: 'json' };
import { crearPrecios, aNumero } from '../../src/lib/precios.js';

const precioDe = crearPrecios(productos, ofertas);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const texto = (v, max) => String(v ?? '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!negocio.pagoOnline?.mercadopago || !env.MP_ACCESS_TOKEN) {
    return json({ error: 'pago-no-configurado', mensaje: 'El pago online todavía no está habilitado.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'json-invalido' }, 400); }

  const pedidos = Array.isArray(body?.items) ? body.items.slice(0, 40) : [];
  if (!pedidos.length) return json({ error: 'pedido-vacio' }, 400);

  // Precios recalculados en el servidor
  const items = [];
  for (const it of pedidos) {
    const id = texto(it.id, 80);
    const opcion = texto(it.opcion, 120);
    const cant = Math.floor(Number(it.cant));
    if (!Number.isFinite(cant) || cant < 1 || cant > 50) return json({ error: 'cantidad-invalida', id }, 400);
    const precio = precioDe(id, opcion);
    if (precio == null) return json({ error: 'sin-precio', id, mensaje: 'Hay productos sin precio fijo: te enviamos el link por WhatsApp.' }, 422);
    const base = productos.productos.find((p) => p.id === id)?.nombre ?? ofertas.ofertas.find((o) => `oferta-${o.id}` === id)?.titulo ?? id;
    items.push({ id, title: `${base}${opcion ? ` (${opcion})` : ''}`.slice(0, 250), quantity: cant, unit_price: precio, currency_id: 'ARS' });
  }

  const cliente = body.cliente ?? {};
  const entrega = cliente.entrega === 'envio' ? 'envio' : 'retiro';
  const costoEnvio = aNumero(negocio.costoEnvio);
  if (entrega === 'envio' && costoEnvio) {
    items.push({ id: 'envio', title: 'Envío a domicilio', quantity: 1, unit_price: costoEnvio, currency_id: 'ARS' });
  }

  const origen = new URL(request.url).origin;
  const referencia = `CUCA-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const vence = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const preferencia = {
    items,
    payer: { name: texto(cliente.nombre, 60), phone: { number: texto(cliente.telefono, 30) } },
    external_reference: referencia,
    back_urls: {
      success: `${origen}/?pago=ok`,
      pending: `${origen}/?pago=pendiente`,
      failure: `${origen}/?pago=error`,
    },
    auto_return: 'approved',
    statement_descriptor: 'CUCA',
    expires: true,
    expiration_date_to: vence,
    metadata: {
      cliente: texto(cliente.nombre, 60),
      telefono: texto(cliente.telefono, 30),
      entrega,
      direccion: entrega === 'envio' ? texto(cliente.direccion, 120) : 'Retiro en el local',
      dia: texto(cliente.dia, 60),
      franja: texto(cliente.franja, 30),
    },
  };

  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'x-idempotency-key': referencia,
    },
    body: JSON.stringify(preferencia),
  });
  if (!r.ok) {
    console.error('Mercado Pago', r.status, await r.text());
    return json({ error: 'mercadopago', mensaje: 'No pudimos iniciar el pago. Probá de nuevo o pedí por WhatsApp.' }, 502);
  }
  const pref = await r.json();
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  return json({ url: pref.init_point, referencia, total });
}
