# Cuca Buenos Aires

Sitio web de **Cuca**, fiambrería y quesería de San Blas 4101, Floresta (CABA).
Una sola página, dinámica, pensada primero para el celular:

- Hero con una **tabla de picada en 3D** (Three.js, procedural) que se arma sola.
- **Pizarra de ofertas** que se actualiza editando un archivo, con fechas de vigencia.
- **Catálogo** con filtros y pedido por presentación (100 g, docena, etc.).
- **Armá tu picada**: configurador por cantidad de personas, momento, estilo y extras, con vista 3D.
- **Sándwiches de miga, medialunas y bandejas para eventos**.
- **Reseñas reales de Google**, mapa, horarios y estado "abierto / cerrado" en vivo.
- **Pedido online**: carrito + formulario que abre WhatsApp (5491159524637) con el pedido escrito.

Hecho con [Astro](https://astro.build) (sitio estático) y publicado en **Cloudflare Pages**.

---

## Cómo actualizar el contenido (sin programar)

Todo el contenido está en `src/data/`. Se puede editar desde GitHub (botón ✏️ en el archivo) y al guardar
("Commit changes") Cloudflare publica la nueva versión en 1 o 2 minutos.

| Qué | Archivo |
|---|---|
| Ofertas de la pizarra | `src/data/ofertas.json` |
| Productos y presentaciones | `src/data/productos.json` |
| Reseñas | `src/data/resenas.json` |
| WhatsApp, horarios, dirección, medios de pago | `src/data/negocio.json` |

### Ofertas (`ofertas.json`)

```json
{
  "id": "cremoso-promo",
  "titulo": "¡Cremoso en promo!",
  "bajada": "Texto corto debajo del título",
  "items": [{ "nombre": "Tregar", "precio": "$6.900" }],
  "precio": "",
  "etiqueta": "Promo",
  "color": "menta",
  "destacada": false,
  "desde": "2026-09-01",
  "hasta": "2026-09-30"
}
```

- `desde` / `hasta` (AAAA-MM-DD): la oferta aparece y desaparece sola. `hasta` vacío = no vence.
- `color`: `mostaza`, `menta`, `rosa` o `tiza`.
- `destacada: true` la muestra grande (conviene una sola).
- Si tiene `items`, al tocar "Lo quiero" el cliente elige cuál.
- Actualizá también `"actualizado"` con la fecha del día.

### Productos (`productos.json`)

- `precio` vacío muestra "Consultar". Si se completa (ej. `"$12.500"`), se muestra en la tarjeta.
- `cat` debe ser una de las categorías de arriba del archivo; las presentaciones salen de la categoría.
- `img` es un archivo de `public/img/`. Para usar fotos propias, subirlas ahí (ideal `.webp`, 900×700).

---

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

Herramientas de control (usan Microsoft Edge instalado, sin descargas extra):

```bash
node tools/prueba-pedido.mjs http://localhost:4321/          # prueba el pedido de punta a punta
node tools/secciones.mjs http://localhost:4321/ capturas 390 844   # capturas por sección (celular)
```

## Publicación en Cloudflare Pages

1. En Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** y elegir este repositorio.
2. Configuración de build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variable de entorno: `NODE_VERSION` = `22`
3. Guardar y desplegar. Cada cambio en `main` se publica solo.
4. Cuando se registre **cucabuenosaires.com.ar**: Pages → Custom domains → agregar el dominio, y actualizar
   `site` en `astro.config.mjs`, `public/robots.txt` y `public/sitemap.xml`.

## Créditos

- Fotos de producto ilustrativas de [Unsplash](https://unsplash.com) (licencia libre). Reemplazar por fotos propias
  del local cuando estén disponibles. La foto de la fachada y el logo son de Cuca.
- Monograma CK redibujado en vector a partir del cartel del local.
