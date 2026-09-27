// Tabla de picada 3D, procedural (sin modelos externos) y pensada para verse lo más real posible:
// texturas pintadas con relieve, formas orgánicas con variación, sombras suaves y sombras de contacto.
// Uso: const escena = await montarPicada(canvas, { nivel: 16 }); escena.setNivel(20, ['aceitunas', 'queso', ...]);
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Utilidades ----------
let semilla = 11;
const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
const rango = (a, b) => a + (b - a) * rnd();
const lerp = (a, b, t) => a + (b - a) * t;

function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Ruido de valor 3D suave, 0..1 */
function ruido3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  const x1 = lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v);
  const x2 = lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v);
  return lerp(x1, x2, w);
}
const fbm = (x, y, z) => ruido3(x, y, z) * 0.6 + ruido3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + ruido3(x * 4.3, y * 4.3, z * 4.3) * 0.1;

/** Desplaza cada vértice a lo largo de su normal: f(posición) -> distancia */
function deformar(geo, f) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = f(v);
    p.setXYZ(i, v.x + n.getX(i) * d, v.y + n.getY(i) * d, v.z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- Texturas pintadas ----------
function lienzo(w, h, pintar, color = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const motas = (g, w, h, n, colores, rMin, rMax) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colores[Math.floor(rnd() * colores.length)];
    g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rango(rMin, rMax), rango(rMin, rMax) * 0.8, rnd() * 3, 0, 7); g.fill();
  }
};

const T = {
  madera: () => lienzo(2048, 1024, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#a36a3c'); base.addColorStop(0.5, '#b07446'); base.addColorStop(1, '#94603a');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const y = rnd() * h, amp = rango(3, 14), fase = rnd() * 6, fr = rango(60, 160);
      g.strokeStyle = rnd() < 0.55 ? `rgba(78,42,18,${rango(0.05, 0.22)})` : `rgba(214,160,110,${rango(0.05, 0.16)})`;
      g.lineWidth = rango(0.8, 3.2);
      g.beginPath();
      for (let x = 0; x <= w; x += 12) g.lineTo(x, y + Math.sin(x / fr + fase) * amp + Math.sin(x / 23 + fase) * 0.8);
      g.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = rango(200, w - 200), y = rango(100, h - 100);
      for (let k = 7; k > 0; k--) { g.strokeStyle = `rgba(70,36,14,${0.08 * k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 10 + k * 9, 4 + k * 3, 0, 0, 7); g.stroke(); }
    }
    motas(g, w, h, 900, ['rgba(60,30,10,.08)', 'rgba(230,190,140,.06)'], 1, 3);
  }),
  queso: (base = '#f4c94e', sombra = 'rgba(176,118,24,.6)') => lienzo(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    motas(g, w, h, 300, ['rgba(255,240,190,.18)', 'rgba(200,140,30,.12)'], 2, 6);
    for (let i = 0; i < 22; i++) {
      const x = rnd() * w, y = rnd() * h, r = rango(5, 17);
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
      gr.addColorStop(0, 'rgba(90,55,5,.55)'); gr.addColorStop(0.75, sombra); gr.addColorStop(1, 'rgba(255,245,200,.35)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.8, rnd() * 3, 0, 7); g.fill();
    }
  }),
  quesoRelieve: () => lienzo(512, 512, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) { g.fillStyle = '#222'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rango(5, 16), rango(4, 12), rnd() * 3, 0, 7); g.fill(); }
  }, false),
  salame: () => lienzo(512, 512, (g, w) => {
    const r = w / 2;
    g.fillStyle = '#4f1510'; g.fillRect(0, 0, w, w);
    const gr = g.createRadialGradient(r, r, r * 0.2, r, r, r * 0.95);
    gr.addColorStop(0, '#b0362c'); gr.addColorStop(1, '#8e2620');
    g.fillStyle = gr; g.beginPath(); g.arc(r, r, r * 0.93, 0, 7); g.fill();
    for (let i = 0; i < 140; i++) {
      const a = rnd() * 7, d = Math.sqrt(rnd()) * r * 0.86;
      const x = r + Math.cos(a) * d, y = r + Math.sin(a) * d;
      const t = rnd();
      g.fillStyle = t < 0.62 ? `rgba(248,228,218,${rango(0.75, 1)})` : t < 0.85 ? 'rgba(120,22,18,.9)' : 'rgba(30,20,18,.9)';
      const s = t < 0.85 ? rango(3, 10) : rango(2, 3.5);
      g.beginPath(); g.ellipse(x, y, s, s * rango(0.6, 1), rnd() * 3, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(245,238,228,.7)'; g.lineWidth = 9; g.beginPath(); g.arc(r, r, r * 0.955, 0, 7); g.stroke();
  }),
  tripa: () => lienzo(512, 256, (g, w, h) => {
    g.fillStyle = '#5e241c'; g.fillRect(0, 0, w, h);
    motas(g, w, h, 1600, ['rgba(240,236,228,.22)', 'rgba(240,236,228,.35)', 'rgba(30,8,5,.25)'], 1, 4);
    g.strokeStyle = 'rgba(25,8,5,.35)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 26) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, h * 0.3, x - 6, h * 0.7, x + 10, h); g.stroke(); }
  }),
  crudo: () => lienzo(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f6ebe2'); gr.addColorStop(0.13, '#f0c8bb'); gr.addColorStop(0.25, '#c24a42');
    gr.addColorStop(0.7, '#a8342e'); gr.addColorStop(0.9, '#b8453d'); gr.addColorStop(1, '#e4a397');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(252,226,214,${rango(0.08, 0.3)})`; g.lineWidth = rango(0.8, 2.6);
      const y = rango(40, h - 20); g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + rango(-12, 12), w * 0.7, y + rango(-12, 12), w, y + rango(-6, 6)); g.stroke();
    }
  }),
  cocido: () => lienzo(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#fbeee6'); gr.addColorStop(0.08, '#f2c2b8'); gr.addColorStop(0.2, '#eaa8a0'); gr.addColorStop(1, '#e39b93');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    motas(g, w, h, 260, ['rgba(255,235,228,.18)', 'rgba(200,110,100,.12)'], 3, 12);
  }),
  azul: () => lienzo(512, 512, (g, w, h) => {
    g.fillStyle = '#f1ead7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${rango(50, 80)},${rango(90, 115)},${rango(95, 120)},${rango(0.3, 0.8)})`;
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rango(2, 14), rango(1.5, 6), rnd() * 3, 0, 7); g.fill();
    }
  }),
  blanco: () => lienzo(512, 512, (g, w, h) => {
    g.fillStyle = '#f7f2e6'; g.fillRect(0, 0, w, h);
    motas(g, w, h, 700, ['rgba(220,210,190,.25)', 'rgba(255,255,255,.4)'], 1, 4);
  }),
  miga: () => lienzo(512, 512, (g, w, h) => {
    g.fillStyle = '#f0dcb0'; g.fillRect(0, 0, w, h);
    motas(g, w, h, 500, ['rgba(160,110,50,.35)', 'rgba(255,245,215,.5)', 'rgba(120,80,30,.25)'], 1.5, 6);
    const r = w / 2; g.strokeStyle = '#a9642a'; g.lineWidth = 34; g.beginPath(); g.arc(r, r, r - 17, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(90,45,15,.6)'; g.lineWidth = 6; g.beginPath(); g.arc(r, r, r - 4, 0, 7); g.stroke();
  }),
  corteza: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#b8732f'; g.fillRect(0, 0, w, h);
    motas(g, w, h, 500, ['rgba(95,50,15,.35)', 'rgba(230,170,100,.3)'], 1, 5);
  }),
  nuez: () => lienzo(256, 256, (g, w, h) => {
    g.fillStyle = '#8f5a2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.6 ? '58,30,10' : '205,150,90'},${rango(0.3, 0.7)})`; g.lineWidth = rango(1.5, 5);
      g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      g.bezierCurveTo(x + rango(-30, 30), y + rango(-30, 30), x + rango(-30, 30), y + rango(-30, 30), x + rango(-40, 40), y + rango(-40, 40)); g.stroke();
    }
  }),
  pepino: () => lienzo(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#4a5f1c'); gr.addColorStop(0.5, '#6f8a2c'); gr.addColorStop(1, '#4a5f1c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) { g.fillStyle = 'rgba(40,55,12,.25)'; g.fillRect(x, 0, 5, h); }
    motas(g, w, h, 420, ['rgba(190,205,110,.6)', 'rgba(30,45,10,.45)', 'rgba(150,170,70,.5)'], 1.5, 5);
  }),
  relieve: (escala = 6) => lienzo(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = fbm((x / w) * escala, (y / h) * escala, 0.5) * 255;
      const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false),
  manchaSombra: () => lienzo(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }),
};

// ---------- Materiales ----------
function crearMateriales(liviano) {
  const relieveFino = T.relieve(14), relieveMedio = T.relieve(6);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const quesoMap = T.queso(); quesoMap.repeat.set(0.7, 0.7);
  const quesoBump = T.quesoRelieve(); quesoBump.repeat.set(0.7, 0.7);
  const azul = T.azul(); azul.repeat.set(0.9, 0.9);
  const tripa = T.tripa(); tripa.repeat.set(2, 1);
  return {
    madera: phy({ map: T.madera(), roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.6, bumpMap: relieveFino, bumpScale: 0.6 }),
    maderaCanto: std({ color: 0x8a5530, map: T.madera(), roughness: 0.7 }),
    queso: std({ map: quesoMap, bumpMap: quesoBump, bumpScale: 2, roughness: 0.5 }),
    quesoCorte: std({ color: 0xffeaa6, map: quesoMap, bumpMap: quesoBump, bumpScale: 2, roughness: 0.45 }),
    quesoBaston: std({ color: 0xffffff, roughness: 0.48, bumpMap: relieveFino, bumpScale: 0.4 }),
    salame: std({ map: T.salame(), roughness: 0.42, bumpMap: relieveFino, bumpScale: 0.5 }),
    salameCanto: std({ color: 0x5c1f18, roughness: 0.7 }),
    tripa: std({ map: tripa, roughness: 0.85, bumpMap: relieveMedio, bumpScale: 1.2 }),
    crudo: phy({ map: T.crudo(), roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide }),
    cocido: phy({ map: T.cocido(), roughness: 0.42, clearcoat: 0.2, side: THREE.DoubleSide }),
    azul: std({ map: azul, roughness: 0.7, bumpMap: relieveMedio, bumpScale: 1.4 }),
    blanco: std({ map: T.blanco(), roughness: 0.75, bumpMap: relieveFino, bumpScale: 0.8 }),
    ceramica: phy({ color: 0xf5f1e8, roughness: 0.18, clearcoat: 0.8 }),
    aceituna: phy({ color: 0xffffff, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
    uva: phy({ color: 0xffffff, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc9bfd6) }),
    tallo: std({ color: 0x6b5a33, roughness: 0.8 }),
    tomate: phy({ color: 0xffffff, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    hoja: std({ color: 0x3f6b24, roughness: 0.6, side: THREE.DoubleSide }),
    pepino: phy({ map: T.pepino(), roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.3, bumpMap: relieveFino, bumpScale: 1.5 }),
    nuez: std({ map: T.nuez(), roughness: 0.85, bumpMap: relieveFino, bumpScale: 2.2 }),
    nuezCorte: std({ color: 0xd9b27a, roughness: 0.9 }),
    miga: std({ map: T.miga(), roughness: 0.9, bumpMap: relieveFino, bumpScale: 1.5 }),
    corteza: std({ map: T.corteza(), roughness: 0.8, bumpMap: relieveMedio, bumpScale: 1 }),
    grisin: std({ color: 0xd9a35e, roughness: 0.75, bumpMap: relieveFino, bumpScale: 1 }),
    romero: std({ color: 0x3d5a2e, roughness: 0.7 }),
    sombra: new THREE.MeshBasicMaterial({ map: T.manchaSombra(), transparent: true, depthWrite: false, opacity: 0 }),
    _liviano: liviano,
  };
}

// ---------- Geometrías base (se reutilizan) ----------
function geometriaPepinillo(largo = 0.62, radio = 0.105) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, y = (t - 0.5) * largo;
    const r = radio * Math.pow(Math.sin(Math.PI * t), 0.32) * (1 - 0.1 * t);
    pts.push(new THREE.Vector2(Math.max(r, 0.004), y));
  }
  const geo = new THREE.LatheGeometry(pts, 18);
  deformar(geo, (v) => (ruido3(v.x * 45, v.y * 45, v.z * 45) - 0.5) * 0.02 + (ruido3(v.x * 90, v.y * 90, v.z * 90) > 0.78 ? 0.008 : 0));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.pow(p.getY(i) / largo, 2) * 0.12); // curvatura
  geo.computeVertexNormals();
  return geo;
}
function geometriaNuez(k) {
  const geo = new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(1.15, 0.66, 0.88);
  deformar(geo, (v) => {
    const s = Math.abs(Math.sin(v.x * 70 + ruido3(v.x * 25 + k, v.y * 25, v.z * 25) * 6)) * 0.012;
    return -s + (ruido3(v.x * 30 + k, v.y * 30, v.z * 30) - 0.5) * 0.016;
  });
  return geo;
}

// ---------- Piezas ----------
// Tabla redonda de radio 2.3 (los radios del plan se escalan × 0.86). Cada pieza se ubica en coordenadas polares: centro, anillo interior (r≈1.2)
// y anillo exterior (r≈2.0). Ángulo en grados: 0° = derecha, 90° = frente (hacia la cámara).
function crearPiezas(m) {
  const L = m._liviano;
  const col = (hex, v = 0.06) => { const c = new THREE.Color(hex); c.offsetHSL(rango(-v, v) * 0.3, rango(-v, v), rango(-v, v)); return c; };
  const sombrear = (o) => { o.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); return o; };

  const cuña = (matTapa, matLado, radio, alto, ang) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(radio, 0); s.absarc(0, 0, radio, 0, ang, false); s.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: alto, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 28 });
    geo.rotateX(-Math.PI / 2); geo.center(); geo.translate(0, alto / 2 + 0.025, 0);
    return new THREE.Mesh(geo, [matTapa, matLado]);
  };

  // ----- Constructores (se pueden usar varias veces) -----
  const B = {
    queso: (radio = 1.1, alto = 0.58) => { const g = new THREE.Group(); g.add(cuña(m.queso, m.quesoCorte, radio, alto, 0.7)); return g; },

    racimo: (colorBase, n) => {
      const g = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.125, L ? 14 : 20, L ? 10 : 16); geo.scale(1, 0.95, 1.12);
      const inst = new THREE.InstancedMesh(geo, m.uva, n), d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const t = i / n, capa = Math.floor(t * 5), ancho = 0.42 * (1 - t * 0.7), a = rnd() * Math.PI * 2;
        d.position.set(Math.cos(a) * ancho * rango(0.4, 1), 0.13 + (capa % 2) * 0.12 + rnd() * 0.07, (t - 0.5) * 1.05 + Math.sin(a) * 0.1);
        d.rotation.set(rnd() * 3, rnd() * 3, 0); d.scale.setScalar(rango(0.85, 1.12));
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, col(colorBase, 0.08));
      }
      g.add(inst);
      const eje = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.34, -0.52), new THREE.Vector3(0.02, 0.28, -0.2), new THREE.Vector3(-0.02, 0.2, 0.2), new THREE.Vector3(0.01, 0.14, 0.42)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(eje, 20, 0.014, 6), m.tallo));
      const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.18, 6), m.tallo);
      punta.position.set(0, 0.38, -0.6); punta.rotation.x = 0.9; g.add(punta);
      return g;
    },

    pepinillos: (n = 7) => {
      const g = new THREE.Group();
      const geos = [geometriaPepinillo(0.6, 0.105), geometriaPepinillo(0.5, 0.095), geometriaPepinillo(0.66, 0.11)];
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(geos[i % 3], m.pepino);
        p.rotation.set(Math.PI / 2 + rango(-0.15, 0.15), 0, rango(-0.5, 0.5) + (i % 2) * 0.4);
        p.position.set((i % 4) * 0.17 - 0.25, 0.08 + (i > 3 ? 0.13 : 0), Math.floor(i / 4) * 0.06 + rango(-0.06, 0.06));
        g.add(p);
      }
      return g;
    },

    nueces: (n, k0 = 1) => {
      const g = new THREE.Group();
      const geos = [geometriaNuez(k0), geometriaNuez(k0 + 6), geometriaNuez(k0 + 12)];
      for (let i = 0; i < n; i++) {
        const nuez = new THREE.Mesh(geos[i % 3], m.nuez);
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.32;
        nuez.position.set(Math.cos(a) * r, 0.02 + (r < 0.14 ? 0.09 : 0), Math.sin(a) * r * 0.85);
        nuez.rotation.set(rango(-0.3, 0.3), rnd() * 6, rango(-0.3, 0.3));
        nuez.scale.setScalar(rango(0.85, 1.1));
        g.add(nuez);
      }
      return g;
    },

    abanico: (n = 9, radio = 0.3, largo = 1.3) => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(radio, radio, 0.045, L ? 28 : 40);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Mesh(geo, [m.salameCanto, m.salame, m.salame]);
        const t = n > 1 ? i / (n - 1) : 0.5;
        s.position.set(lerp(-largo / 2, largo / 2, t), 0.035 + i * 0.02, Math.sin(t * Math.PI) * -0.14);
        s.rotation.set(-0.1, rnd() * 3, 0.16);
        g.add(s);
      }
      return g;
    },

    bolAceitunas: () => {
      const g = new THREE.Group();
      const perfil = [[0, 0], [0.5, 0], [0.56, 0.03], [0.64, 0.32], [0.61, 0.36], [0.56, 0.33], [0.5, 0.07], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y));
      g.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 48), m.ceramica));
      const geo = new THREE.SphereGeometry(0.1, 16, 12); geo.scale(0.82, 0.82, 1.15);
      const n = 24, inst = new THREE.InstancedMesh(geo, m.aceituna, n), d = new THREE.Object3D();
      const colores = [0x2a1a24, 0x3b2233, 0x4b2b3d, 0x6d7a2c, 0x7f8c34];
      for (let i = 0; i < n; i++) {
        const capa = i < 12 ? 0 : i < 20 ? 1 : 2;
        const cuenta = capa === 0 ? 12 : capa === 1 ? 8 : 4;
        const a = ((i - (capa === 0 ? 0 : capa === 1 ? 12 : 20)) / cuenta) * Math.PI * 2 + capa;
        const r = capa === 0 ? 0.37 : capa === 1 ? 0.22 : 0.08;
        d.position.set(Math.cos(a) * r, 0.17 + capa * 0.1, Math.sin(a) * r);
        d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, col(colores[i % colores.length], 0.05));
      }
      g.add(inst);
      return g;
    },

    cocido: (n = 4) => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 28, 1, true, 0, Math.PI * 1.8);
      const geo2 = new THREE.CylinderGeometry(0.095, 0.095, 0.8, 22, 1, true, 1, Math.PI * 1.7);
      for (let i = 0; i < n; i++) {
        const r = new THREE.Group();
        r.add(new THREE.Mesh(geo, m.cocido), new THREE.Mesh(geo2, m.cocido));
        r.rotation.set(0, 0.12 * i, Math.PI / 2);
        const arriba = i >= Math.ceil(n * 0.6);
        r.position.set(0, 0.16 + (arriba ? 0.26 : 0), (arriba ? (i - n * 0.6) * 0.3 - 0.1 : i * 0.3) - 0.3);
        g.add(r);
      }
      return g;
    },

    cubos: (n = 12) => {
      const g = new THREE.Group();
      const geo = new RoundedBoxGeometry(0.24, 0.24, 0.24, 2, 0.03);
      const inst = new THREE.InstancedMesh(geo, m.quesoBaston, n), d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const piso = i >= 8 ? 1 : 0, j = piso ? i - 8 : i;
        d.position.set((j % 4) * 0.26 - 0.39 + piso * 0.13 + rango(-0.03, 0.03), 0.12 + piso * 0.24, Math.floor(j / 4) * 0.26 - 0.13 + rango(-0.03, 0.03));
        d.rotation.set(0, rango(-0.3, 0.3), 0);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, col(i % 3 ? 0xf2c648 : 0xf6e7b5, 0.03));
      }
      g.add(inst);
      return g;
    },

    pan: (n = 7) => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.07, 28); geo.scale(1.25, 1, 0.8);
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(geo, [m.corteza, m.miga, m.miga]);
        p.position.set(i * 0.14 - (n * 0.07), 0.05 + i * 0.03, rango(-0.03, 0.03));
        p.rotation.set(0, rango(-0.1, 0.1), -0.22);
        g.add(p);
      }
      return g;
    },

    crudo: (n = 4, fase = 0) => {
      const g = new THREE.Group();
      for (let k = 0; k < n; k++) {
        const geo = new THREE.PlaneGeometry(0.95, 0.38, L ? 32 : 56, 8);
        const pa = geo.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i);
          pa.setZ(i, Math.sin(x * 9 + k * 1.3 + fase) * 0.085 + Math.sin(y * 6 + x * 2) * 0.02 + (ruido3(x * 5, y * 5, k + fase) - 0.5) * 0.03);
        }
        geo.computeVertexNormals();
        const c = new THREE.Mesh(geo, m.crudo);
        c.rotation.set(-Math.PI / 2 + 0.1, 0, 0.5 - k * 0.35);
        c.position.set(k * 0.08 - 0.12, 0.09 + k * 0.045, k * 0.16 - 0.24);
        g.add(c);
      }
      return g;
    },

    roquefort: () => {
      const g = new THREE.Group();
      const w = cuña(m.azul, m.azul, 0.9, 0.46, 0.8);
      deformar(w.geometry, (v) => (ruido3(v.x * 9, v.y * 9, v.z * 9) - 0.5) * 0.04);
      g.add(w);
      return g;
    },

    salameEntero: () => {
      const g = new THREE.Group();
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.05, 32, 1, true), m.tripa);
      const punta = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.tripa);
      punta.scale.y = 0.5; punta.position.y = 0.525;
      const corte = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), m.salame);
      corte.rotation.x = Math.PI / 2; corte.position.y = -0.525;
      const s = new THREE.Group(); s.add(cuerpo, punta, corte);
      s.rotation.z = Math.PI / 2; s.position.set(0.2, 0.25, 0);
      g.add(s);
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 32), [m.salameCanto, m.salame, m.salame]);
        r.position.set(-0.55 - i * 0.18, 0.05 + i * 0.015, 0.04); r.rotation.set(0.1, 0, 0.2); g.add(r);
      }
      return g;
    },

    bastones: (n = 12) => {
      const g = new THREE.Group();
      const geo = new RoundedBoxGeometry(0.14, 0.14, 0.72, 2, 0.022);
      const inst = new THREE.InstancedMesh(geo, m.quesoBaston, n), d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const capa = Math.floor(i / 4), j = i % 4;
        d.position.set(j * 0.16 - 0.24, 0.07 + capa * 0.14, capa % 2 ? 0.04 : 0);
        d.rotation.set(0, (capa % 2 ? 0.08 : -0.05) + rango(-0.04, 0.04), 0);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, col(i % 3 === 1 ? 0xf7e3a0 : 0xf3c64a, 0.03));
      }
      g.add(inst);
      return g;
    },

    tomates: () => {
      const g = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.13, 22, 16); geo.scale(1, 0.9, 1);
      const hoja = new THREE.ConeGeometry(0.035, 0.12, 3); hoja.rotateZ(Math.PI / 2); hoja.scale(1, 0.25, 1);
      [[0, 0, 0], [0.26, 0, 0.05], [0.12, 0.13, 0.2], [-0.16, 0, 0.2], [0.3, 0, -0.2], [-0.05, 0, -0.24]].forEach(([x, y, z]) => {
        const t = new THREE.Mesh(geo, m.tomate.clone()); t.material.color = col(0xcf2418, 0.05);
        t.position.set(x, 0.12 + y, z); g.add(t);
        for (let k = 0; k < 5; k++) {
          const h = new THREE.Mesh(hoja, m.hoja);
          h.position.set(x + Math.cos((k / 5) * 6.28) * 0.05, 0.235 + y, z + Math.sin((k / 5) * 6.28) * 0.05);
          h.rotation.y = -(k / 5) * 6.28; g.add(h);
        }
      });
      return g;
    },

    quesoBlanco: () => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.85, 0); s.lineTo(0.18, 0.68); s.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
      geo.rotateX(-Math.PI / 2); geo.center(); geo.translate(0, 0.15, 0);
      const g = new THREE.Group(); g.add(new THREE.Mesh(geo, m.blanco)); return g;
    },

    grisines: () => {
      const g = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.03, 0.034, 1.25, 8, 12);
      deformar(geo, (v) => (ruido3(v.x * 30, v.y * 12, v.z * 30) - 0.5) * 0.012);
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(geo, m.grisin);
        s.rotation.set(0, 0, Math.PI / 2 + rango(-0.05, 0.05));
        s.rotation.y = (i - 2) * 0.09;
        s.position.set(0, 0.04 + i * 0.028, (i - 2) * 0.07);
        g.add(s);
      }
      return g;
    },

    aceitunasSueltas: (n = 8) => {
      const g = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.1, 16, 12); geo.scale(0.82, 0.82, 1.15);
      const inst = new THREE.InstancedMesh(geo, m.aceituna, n), d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        d.position.set(rango(-0.28, 0.28), 0.085 + (i === 3 || i === 6 ? 0.13 : 0), rango(-0.22, 0.22));
        d.rotation.set(Math.PI / 2, rnd() * 3, 0);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, col(i % 2 ? 0x7f8c34 : 0x2f1d29, 0.05));
      }
      g.add(inst);
      return g;
    },

    romero: () => {
      const g = new THREE.Group();
      for (let r = 0; r < 2; r++) {
        const rama = new THREE.Group();
        rama.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.75, 5), m.tallo).rotateZ(Math.PI / 2));
        const aguja = new THREE.BoxGeometry(0.11, 0.008, 0.018);
        for (let i = 0; i < 26; i++) {
          const a = new THREE.Mesh(aguja, m.romero);
          a.position.set(-0.34 + (i / 26) * 0.68, 0.01, (i % 2 ? 1 : -1) * 0.045);
          a.rotation.set(0, (i % 2 ? 1 : -1) * 1.1, rango(-0.2, 0.2));
          rama.add(a);
        }
        rama.position.set(0, 0.3 + r * 0.02, r * 0.12);
        rama.rotation.y = r * 0.5;
        g.add(rama);
      }
      return g;
    },
  };

  // Relleno: mezcla chica que tapa los huecos (aceitunas, nueces, uvas, cubitos, tomate)
  const geoAceituna = new THREE.SphereGeometry(0.1, 14, 10); geoAceituna.scale(0.82, 0.82, 1.15);
  const geoUva = new THREE.SphereGeometry(0.125, 16, 12); geoUva.scale(1, 0.95, 1.1);
  const geoCubo = new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03);
  const geosNuez = [geometriaNuez(21), geometriaNuez(27)];
  B.relleno = (k) => {
    const g = new THREE.Group();
    const poner = (mesh, x, z, y) => { mesh.position.set(x, y, z); mesh.rotation.set(rnd() * 0.6, rnd() * 6, rnd() * 0.6); g.add(mesh); };
    for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(geoAceituna, m.aceituna.clone()); a.material.color = col([0x2f1d29, 0x7f8c34, 0x4b2b3d][(i + k) % 3], 0.05); poner(a, rango(-0.25, 0.25), rango(-0.2, 0.2), 0.085); }
    for (let i = 0; i < 2; i++) poner(new THREE.Mesh(geosNuez[(i + k) % 2], m.nuez), rango(-0.25, 0.25), rango(-0.2, 0.2), 0.02);
    if (k % 2) for (let i = 0; i < 4; i++) { const u = new THREE.Mesh(geoUva, m.uva.clone()); u.material.color = col(k % 4 === 1 ? 0x5a2350 : 0x9fb04a, 0.06); poner(u, rango(-0.22, 0.22), rango(-0.2, 0.2), 0.12); }
    else for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(geoCubo, m.quesoBaston.clone()); c.material.color = col(0xf2c648, 0.04); poner(c, rango(-0.22, 0.22), rango(-0.2, 0.2), 0.11); c.rotation.x = 0; c.rotation.z = 0; }
    return g;
  };

  // ----- Ubicación en la tabla redonda -----
  // [id, constructor, ángulo°, radio, giro: 'tan' (a lo largo del anillo) | 'rad' (hacia afuera) | número (rad)]
  const plan = [
    ['aceitunas', () => B.bolAceitunas(), 0, 0, 0],
    ['queso', () => B.queso(1.1, 0.58), 180, 1.95, 'rad'],
    ['salame', () => B.abanico(9, 0.3, 1.3), 90, 2.0, 'tan'],
    ['uvas', () => B.racimo(0x5a2350, L ? 30 : 40), 270, 1.95, 'tan'],
    ['pepinillos', () => B.pepinillos(7), 45, 1.2, 'tan'],
    ['nueces', () => B.nueces(12, 1), 135, 1.2, 0],
    ['bastones', () => B.bastones(12), 90, 1.15, 'tan'],
    ['cocido', () => B.cocido(4), 225, 1.95, 'tan'],
    ['pan', () => B.pan(7), 30, 2.0, 'tan'],
    ['tomates', () => B.tomates(), 225, 1.15, 0],
    ['crudo', () => B.crudo(4, 0), 315, 1.95, 'tan'],
    ['roquefort', () => B.roquefort(), 0, 1.25, 'rad'],
    ['salame2', () => B.abanico(7, 0.28, 0.95), 150, 2.0, 'tan'],
    ['quesoBlanco', () => B.quesoBlanco(), 180, 1.15, 'rad'],
    ['uvasVerdes', () => B.racimo(0x9fb04a, L ? 24 : 34), 0, 2.05, 'tan'],
    ['salameEntero', () => B.salameEntero(), 60, 2.0, 'tan'],
    ['grisines', () => B.grisines(), 315, 1.05, 'rad'],
    ['cubos', () => B.cubos(12), 120, 2.0, 'tan'],
    ['nueces2', () => B.nueces(8, 3), 285, 1.1, 0],
    ['aceitunasSueltas', () => B.aceitunasSueltas(8), 330, 2.1, 0],
    ['romero', () => B.romero(), 100, 0.62, 0.4],
    ['crudo2', () => B.crudo(3, 2), 250, 2.05, 'tan'],
    ['queso2', () => B.queso(0.85, 0.48), 205, 2.05, 'rad'],
    ['salame3', () => B.abanico(6, 0.27, 0.8), 345, 1.3, 'tan'],
    ['cocido2', () => B.cocido(3), 165, 1.2, 'tan'],
    ['uvas2', () => B.racimo(0x4a1c44, L ? 22 : 30), 60, 1.15, 'rad'],
    ...[22, 67, 112, 157, 202, 247, 292, 337].map((ang, k) => [`relleno${k + 1}`, () => B.relleno(k), ang, 1.6, 0]),
  ];

  return plan.map(([id, crear, grados, r, giro]) => {
    const a = (grados * Math.PI) / 180;
    const obj = sombrear(crear());
    obj.rotation.y = giro === 'tan' ? -(a + Math.PI / 2) : giro === 'rad' ? -a : giro;
    const rr = r * 0.86; // anillos ajustados a la tabla (radio 2.3)
    return { id, obj, pos: [Math.cos(a) * rr, Math.sin(a) * rr] };
  });
}

// ---------- Montaje ----------
export async function montarPicada(canvas, opciones = {}) {
  const { nivel = 16, parallax = true, zoom = 1 } = opciones;
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const liviano = matchMedia('(max-width: 700px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  semilla = 11;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, liviano ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Luz principal cálida y suave (como una ventana), relleno y contraluz
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1f18, 0.5));
  const key = new THREE.DirectionalLight(0xffe2bd, 2.8);
  key.position.set(-5, 9, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(liviano ? 1024 : 2048, liviano ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -5.5, right: 5.5, top: 5, bottom: -5, near: 1, far: 22 });
  key.shadow.radius = liviano ? 4 : 7;
  key.shadow.blurSamples = liviano ? 8 : 16;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const relleno = new THREE.DirectionalLight(0xd8e6ff, 0.45);
  relleno.position.set(6, 4, 6);
  scene.add(relleno);
  const contra = new THREE.DirectionalLight(0xffd9a0, 1.1);
  contra.position.set(3, 5, -7);
  scene.add(contra);

  const m = crearMateriales(liviano);

  // Tabla redonda con manija
  const raiz = new THREE.Group();
  scene.add(raiz);
  const RADIO = 2.3;
  const mapearUV = (geo, escala) => {
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / escala + 0.5, pos.getZ(i) / escala + 0.5);
  };
  const disco = new THREE.Shape(); disco.absarc(0, 0, RADIO, 0, Math.PI * 2, false);
  const tablaGeo = new THREE.ExtrudeGeometry(disco, { depth: 0.26, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.07, bevelSegments: 6, curveSegments: 110 });
  tablaGeo.rotateX(-Math.PI / 2); tablaGeo.translate(0, -0.33, 0);
  mapearUV(tablaGeo, RADIO * 2);
  const tabla = new THREE.Mesh(tablaGeo, [m.madera, m.maderaCanto]);
  tabla.receiveShadow = true; tabla.castShadow = true;
  raiz.add(tabla);
  // Manija
  const mango = new THREE.Shape();
  mango.moveTo(0, -0.36); mango.lineTo(0.95, -0.3); mango.quadraticCurveTo(1.35, -0.3, 1.35, 0); mango.quadraticCurveTo(1.35, 0.3, 0.95, 0.3); mango.lineTo(0, 0.36); mango.lineTo(0, -0.36);
  const agujero = new THREE.Path(); agujero.absarc(1.02, 0, 0.12, 0, Math.PI * 2, true); mango.holes.push(agujero);
  const mangoGeo = new THREE.ExtrudeGeometry(mango, { depth: 0.26, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 5, curveSegments: 24 });
  mangoGeo.rotateX(-Math.PI / 2); mangoGeo.translate(0, -0.33, 0);
  mapearUV(mangoGeo, RADIO * 2);
  const manija = new THREE.Mesh(mangoGeo, [m.madera, m.maderaCanto]);
  const aM = (205 * Math.PI) / 180;
  manija.position.set(Math.cos(aM) * (RADIO - 0.25), 0, Math.sin(aM) * (RADIO - 0.25));
  manija.rotation.y = -aM;
  manija.receiveShadow = true; manija.castShadow = true;
  raiz.add(manija);

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.5 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -0.41; piso.receiveShadow = true;
  scene.add(piso);

  // Piezas + sombra de contacto de cada una (oclusión suave sobre la madera)
  const piezas = crearPiezas(m);
  const caja = new THREE.Box3(), tam = new THREE.Vector3(), centro = new THREE.Vector3();
  piezas.forEach((p) => {
    p.obj.position.set(p.pos[0], 0, p.pos[1]);
    raiz.add(p.obj);
    p.obj.updateMatrixWorld(true);
    caja.setFromObject(p.obj); caja.getSize(tam); caja.getCenter(centro);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m.sombra.clone());
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.set(centro.x, 0.004, centro.z);
    sombra.scale.set(tam.x * 1.25 + 0.15, tam.z * 1.25 + 0.15, 1);
    sombra.renderOrder = 1;
    raiz.add(sombra);
    p.sombra = sombra;
    p.obj.visible = false;
    p.anim = { estado: 'oculto', inicio: 0 };
  });

  const rebote = (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };

  let nivelActual = 0;
  let orden = piezas.map((p) => p.id);
  /** n = cantidad de piezas visibles; ids = orden de aparición (por id) */
  function setNivel(n, ids) {
    if (ids) orden = [...ids, ...piezas.map((p) => p.id).filter((id) => !ids.includes(id))];
    n = Math.max(1, Math.min(piezas.length, Math.round(n)));
    const visibles = new Set(orden.slice(0, n));
    let retraso = 0;
    const ahora = performance.now() / 1000;
    piezas.forEach((p) => {
      const mostrar = visibles.has(p.id);
      if (mostrar && (p.anim.estado === 'oculto' || p.anim.estado === 'saliendo')) {
        p.anim = { estado: 'entrando', inicio: ahora + (reducir ? -1 : (retraso++) * 0.09) };
        p.obj.visible = true;
      } else if (!mostrar && (p.anim.estado === 'visible' || p.anim.estado === 'entrando')) {
        p.anim = { estado: 'saliendo', inicio: ahora };
      }
    });
    nivelActual = n;
    loop();
  }

  function ajustar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = (camera.aspect < 1.2 ? 10.9 / camera.aspect ** 0.7 : 10.4) / zoom;
    camera.position.set(0, dist * 0.7, dist * 0.71);
    camera.lookAt(0, -0.45, -0.05);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(canvas);
  ajustar();

  const puntero = { x: 0, y: 0 }, suave = { x: 0, y: 0 };
  if (parallax && !reducir) {
    window.addEventListener('pointermove', (e) => {
      puntero.x = e.clientX / innerWidth - 0.5;
      puntero.y = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  let visible = true;
  const t0 = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  let pendiente = false;
  function loop() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(frame);
  }
  function frame(ahoraMs) {
    pendiente = false;
    const t = (ahoraMs - t0) / 1000, ahora = ahoraMs / 1000;

    suave.x = lerp(suave.x, puntero.x, 0.05);
    suave.y = lerp(suave.y, puntero.y, 0.05);
    raiz.rotation.y = -0.18 + (reducir ? 0 : Math.sin(t * 0.2) * 0.14) + suave.x * 0.3;
    raiz.rotation.x = suave.y * 0.08;

    piezas.forEach((p) => {
      const a = p.anim;
      if (a.estado === 'entrando') {
        const k = Math.min(1, Math.max(0, (ahora - a.inicio) / 0.9));
        p.obj.position.y = (1 - rebote(k)) * 4;
        p.obj.scale.setScalar(k > 0 ? 1 : 0.001);
        p.sombra.material.opacity = 0.55 * Math.min(1, k * 1.4);
        if (k >= 1) a.estado = 'visible';
      } else if (a.estado === 'saliendo') {
        const k = Math.min(1, (ahora - a.inicio) / 0.3);
        p.obj.scale.setScalar(Math.max(0.001, 1 - k));
        p.sombra.material.opacity = 0.55 * (1 - k);
        if (k >= 1) { a.estado = 'oculto'; p.obj.visible = false; }
      }
    });

    renderer.render(scene, camera);
    if (visible && !document.hidden) loop();
  }

  setNivel(nivel);
  canvas.classList.add('listo');
  return { setNivel, get nivel() { return nivelActual; }, total: piezas.length, ids: piezas.map((p) => p.id) };
}
