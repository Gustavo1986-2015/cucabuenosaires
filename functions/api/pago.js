// GET /api/pago?id=<payment_id>&ref=<external_reference>
// Verifica con Mercado Pago el estado real del pago cuando el cliente vuelve al sitio
// (no se confía en los parámetros de la URL de retorno).
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  if (!env.MP_ACCESS_TOKEN) return json({ error: 'pago-no-configurado' }, 503);
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const ref = url.searchParams.get('ref') ?? '';
  if (!/^\d{5,20}$/.test(id)) return json({ error: 'id-invalido' }, 400);

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return json({ error: 'no-encontrado' }, 404);
  const p = await r.json();
  if (!ref || p.external_reference !== ref) return json({ error: 'referencia-distinta' }, 403);

  return json({ estado: p.status, detalle: p.status_detail, monto: p.transaction_amount, operacion: String(p.id) });
}
