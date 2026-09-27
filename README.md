# Cuca Buenos Aires

Sitio web de **Cuca**, fiambrería y quesería de San Blas 4101, Floresta (CABA).
Una sola página, dinámica, pensada primero para el celular:

- Hero con la **foto real de una picada de Cuca**, con inclinación 3D, reflejo y etiquetas en capas.
- **Pizarra de ofertas** que se actualiza editando un archivo, con fechas de vigencia.
- **Catálogo** con filtros y pedido por presentación (100 g, docena, etc.).
- **Armá tu picada**: configurador por cantidad de personas, momento, estilo y extras, con una tabla redonda 3D
  (Three.js, procedural) que se llena según la cantidad de personas y el estilo elegido.
- **Galería "Así es Cuca"** con fotos reales y link a Instagram (@cucabuenosaires).
- **Sándwiches de miga, medialunas y bandejas para eventos**.
- **Reseñas reales de Google**, mapa, horarios y estado "abierto / cerrado" en vivo.
- **Pedido online**: carrito + formulario que abre WhatsApp (5491159524637) con el pedido escrito,
  y **pago online con Mercado Pago** para productos con precio fijo.

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
| WhatsApp, horarios, dirección, medios de pago, alias | `src/data/negocio.json` |

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

### Fotos reales

Los originales están en `fotos-originales/`. Para agregar fotos nuevas:

1. Copiarlas a `fotos-originales/` y sumarlas al diccionario `MAPA` de `tools/procesar-fotos.py`.
2. Ejecutar `python tools/procesar-fotos.py` (mejora nitidez/color y exporta a `public/img/reales/` en WebP).
   Opcional: ampliar antes con IA (EDSR x4 de OpenCV) y pasar la carpeta como argumento.
3. Usar la ruta `reales/<nombre>.webp` en `productos.json`, `ofertas.json` o `Galeria.astro`.

> No guardar fotos dentro de `dist/`: esa carpeta se borra en cada build.

### Medios de pago

El cliente elige en el formulario: **Mercado Pago, MODO, Cuenta DNI, transferencia o efectivo**.

- **Mercado Pago online (integrado)**: si el pedido tiene sólo productos con precio fijo, aparece el botón
  "Pagar $X con Mercado Pago". El cliente paga en Mercado Pago (tarjetas, débito o dinero en cuenta), vuelve al
  sitio, el pago se verifica con Mercado Pago y se abre WhatsApp con el pedido marcado como **PAGADO**.
  Si hay productos a consultar (se pesan o son a medida), se pide por WhatsApp y Cuca manda el link de pago.
- **MODO**: QR de cobro (cualquier QR interoperable se paga desde MODO o la app del banco).
- **Cuenta DNI (Banco Provincia)**: link de pago o QR desde la app *Cuenta DNI Comercios*.
- **Transferencia**: completar `alias` en `negocio.json` para mostrarlo en el formulario.

---

## Activar el cobro online con Mercado Pago

El código ya está hecho (`functions/api/pagar.js` y `functions/api/pago.js`, Cloudflare Pages Functions).
Para encenderlo **no hacen falta datos bancarios**: el dinero entra a la cuenta de Mercado Pago de Cuca
(y de ahí se transfiere a su banco como siempre). Sólo se necesita el *Access Token* de esa cuenta:

1. Con la cuenta de Mercado Pago del negocio, entrar a <https://www.mercadopago.com.ar/developers/panel/app>
   → **Crear aplicación** → tipo *Pagos online* / **Checkout Pro**.
2. En la aplicación, **Credenciales de producción** → copiar el **Access Token** (`APP_USR-...`).
3. En Cloudflare → Workers & Pages → el proyecto → **Settings → Variables and Secrets** → agregar una variable
   de tipo **Secret** llamada `MP_ACCESS_TOKEN` con ese valor (entorno *Production*). Nunca se sube al repositorio.
4. Cargar precios fijos: en `productos.json` agregar `"precios": { "250 g": 4500, "500 g": 8800 }` al producto
   (precio por presentación) y, en ofertas con precio cerrado, `"pagoOnline": true`.
5. En `negocio.json` poner `"pagoOnline": { "mercadopago": true }`. Opcional: `"costoEnvio": 3000` para cobrar
   el envío en el mismo pago (si queda en `null`, el envío se abona aparte).

**Prueba antes de cobrar de verdad**: en la misma aplicación de Mercado Pago están las *Credenciales de prueba*.
Cargando el Access Token de prueba (`TEST-...`) en el entorno *Preview* de Cloudflare, se puede pagar con las
tarjetas de prueba de Mercado Pago sin mover dinero real.

Pruebas automáticas (con Mercado Pago simulado):

```bash
node tools/pruebas/pago-funciones.mjs
```

Seguridad: los precios se recalculan en el servidor con los datos del sitio (el navegador no puede cambiarlos),
el token vive sólo como secreto en Cloudflare y el pago se verifica contra la API de Mercado Pago al volver.

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

## Otros medios de cobro online

- **MODO** como botón en la web: se suma a través de un gateway compatible (Payway, Getnet, Mobbex, etc.)
  con el SDK de MODO; requiere contrato con ese gateway.
- **Cuenta DNI**: no encontré una integración pública para tiendas web; se cobra con link de pago o QR desde Cuenta DNI Comercios.

## Créditos

- Fotos reales de Cuca en `public/img/reales/` y la fachada. Algunas fotos de fiambres siguen siendo ilustrativas
  de [Unsplash](https://unsplash.com) (licencia libre) hasta tener fotos propias.
- Monograma CK redibujado en vector a partir del cartel del local.
