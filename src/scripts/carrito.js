// Estado del pedido compartido por toda la página (se guarda en este navegador).
import negocio from '../data/negocio.json';
import productos from '../data/productos.json';
import ofertas from '../data/ofertas.json';
import { crearPrecios, formatoPesos } from '../lib/precios.js';

export const precioDe = crearPrecios(productos, ofertas);
export { formatoPesos };

const CLAVE = 'cuca-pedido-v1';
const subs = new Set();

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* modo privado: seguimos en memoria */ }
}

let estado = leer();

const avisar = () => { guardar(); subs.forEach((fn) => fn(estado)); };

export const obtenerItems = () => estado;
export const totalUnidades = () => estado.reduce((s, i) => s + i.cant, 0);
export function suscribir(fn) { subs.add(fn); fn(estado); return () => subs.delete(fn); }

export function agregarAlCarrito({ id, nombre, opcion = '', img = '' }, origen) {
  const clave = `${id}|${opcion}`;
  const existente = estado.find((i) => i.clave === clave);
  if (existente) existente.cant += 1;
  else estado = [...estado, { clave, id, nombre, opcion, img, cant: 1 }];
  avisar();
  document.dispatchEvent(new CustomEvent('cuca:agregado', { detail: { nombre, opcion } }));
  if (origen) {
    origen.classList.add('ok');
    setTimeout(() => origen.classList.remove('ok'), 900);
  }
}

export function cambiarCantidad(clave, delta) {
  estado = estado
    .map((i) => (i.clave === clave ? { ...i, cant: i.cant + delta } : i))
    .filter((i) => i.cant > 0);
  avisar();
}

export function quitar(clave) { estado = estado.filter((i) => i.clave !== clave); avisar(); }
export function vaciar() { estado = []; avisar(); }

/** Precio unitario vigente de un ítem del pedido (null = a consultar) */
export const precioItem = (i) => precioDe(i.id, i.opcion);

/** { total, completo }: completo = todos los ítems tienen precio fijo (se pueden pagar online) */
export function resumenTotal(items = estado) {
  let total = 0, completo = items.length > 0;
  for (const i of items) {
    const p = precioItem(i);
    if (p == null) completo = false; else total += p * i.cant;
  }
  return { total, completo };
}

export const lineaItem = (i) => {
  const p = precioItem(i);
  return `• ${i.cant} × ${i.nombre}${i.opcion ? ` (${i.opcion})` : ''}${p != null ? ` — ${formatoPesos(p * i.cant)}` : ''}`;
};

export function linkWhatsApp(texto) {
  return `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(texto)}`;
}

// Arma el mensaje final del pedido
export function mensajePedido(d, items = estado, pago = null) {
  const partes = ['¡Hola Cuca! 👋 Quiero hacer un pedido:', ''];
  if (items.length) partes.push(...items.map(lineaItem));
  const { total, completo } = resumenTotal(items);
  if (total > 0) partes.push(`${completo ? 'Total' : 'Subtotal (sin los productos a consultar)'}: ${formatoPesos(total)}`);
  if (d.detalle) partes.push(items.length ? `• Además: ${d.detalle}` : d.detalle);
  partes.push('', `👤 ${d.nombre}`, `📞 ${d.telefono}`);
  if (d.entrega === 'envio') {
    partes.push(`🚚 Envío a: ${d.direccion}${d.entreCalles ? ` (entre ${d.entreCalles})` : ''}`);
  } else {
    partes.push('🏪 Retiro en el local (San Blas 4101)');
  }
  if (d.dia) partes.push(`📅 ${d.dia}${d.franja ? ` · ${d.franja} h` : ''}`);
  if (pago) {
    partes.push(`✅ PAGADO con Mercado Pago: ${formatoPesos(pago.monto)} · operación N° ${pago.operacion}`);
  } else if (d.pago) {
    const conLink = ['Mercado Pago', 'MODO', 'Cuenta DNI'].includes(d.pago);
    partes.push(`💳 Pago: ${d.pago}${conLink ? ' (envíenme el link o QR de pago)' : ''}`);
  }
  if (d.notas) partes.push(`📝 ${d.notas}`);
  partes.push('', pago ? '¿Me confirman la entrega? ¡Gracias!' : '¿Me confirman precio y disponibilidad? ¡Gracias!');
  return partes.join('\n').replace(/\n{3,}/g, '\n\n');
}

// Delegación global: cualquier botón con data-agregar suma al pedido
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-agregar]');
  if (!btn) return;
  const { id, nombre, img = '', opciones, select, opcion } = btn.dataset;
  if (opciones) {
    document.dispatchEvent(new CustomEvent('cuca:elegir', { detail: { id, nombre, img, opciones: JSON.parse(opciones), origen: btn } }));
    return;
  }
  const valor = select ? document.querySelector(select)?.value : opcion;
  agregarAlCarrito({ id, nombre, opcion: valor || '', img }, btn);
});
