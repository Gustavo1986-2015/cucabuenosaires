// Precios compartidos entre la página (para mostrar totales) y la función de pago
// (que los vuelve a calcular en el servidor: nunca se confía en el precio que manda el navegador).

/** "$42.000" -> 42000 · "$7.300,50" -> 7300.5 · "Consultá" -> null */
export function aNumero(txt) {
  if (typeof txt === 'number') return txt > 0 ? txt : null;
  const limpio = String(txt ?? '').replace(/[^\d,]/g, '').replace(',', '.');
  const n = Number(limpio);
  return limpio && Number.isFinite(n) && n > 0 ? n : null;
}

export const formatoPesos = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const hoyBA = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

/**
 * Devuelve una función precioDe(id, opcion) -> número o null (null = "a consultar", no se cobra online).
 * - Productos: se cobran si tienen "precios": { "<opción>": número }.
 * - Ofertas: se cobran si tienen "pagoOnline": true y están vigentes (precio del ítem elegido o precio general).
 */
export function crearPrecios(productos, ofertas) {
  return function precioDe(id, opcion = '') {
    if (!id) return null;
    if (id.startsWith('oferta-')) {
      const o = ofertas.ofertas.find((x) => `oferta-${x.id}` === id);
      if (!o || !o.pagoOnline) return null;
      const hoy = hoyBA();
      if ((o.desde && o.desde > hoy) || (o.hasta && o.hasta < hoy)) return null;
      if (o.items?.length) {
        const it = o.items.find((i) => `${i.nombre} ${i.precio}` === opcion || i.nombre === opcion);
        return it ? aNumero(it.precio) : null;
      }
      return aNumero(o.precio);
    }
    const p = productos.productos.find((x) => x.id === id);
    if (!p?.precios) return null;
    return aNumero(p.precios[opcion]);
  };
}
