// Escena 3D de la tabla de picada: todo procedural (sin modelos externos).
// Uso: const escena = await montarPicada(canvas, { nivel: 10 }); escena.setNivel(4);
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Texturas pintadas en canvas ----------
function lienzo(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const texMadera = () => lienzo(1024, 512, (g, w, h) => {
  g.fillStyle = '#9a6337'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 180; i++) {
    const y = rnd() * h, amp = 4 + rnd() * 10, fase = rnd() * 6;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '70,38,16' : '190,130,80'},${0.08 + rnd() * 0.18})`;
    g.lineWidth = 1 + rnd() * 3;
    g.beginPath();
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 90 + fase) * amp);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) { // nudos
    const x = rnd() * w, y = rnd() * h;
    const gr = g.createRadialGradient(x, y, 2, x, y, 26);
    gr.addColorStop(0, 'rgba(60,30,12,.7)'); gr.addColorStop(1, 'rgba(60,30,12,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 34, 12, 0, 0, 7); g.fill();
  }
});

const texSalame = () => lienzo(256, 256, (g, w) => {
  const r = w / 2;
  g.fillStyle = '#5a1712'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#a3312a'; g.beginPath(); g.arc(r, r, r * 0.93, 0, 7); g.fill();
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 7, d = Math.sqrt(rnd()) * r * 0.85;
    g.fillStyle = rnd() < 0.7 ? `rgba(245,225,215,${0.75 + rnd() * 0.25})` : 'rgba(110,20,18,.8)';
    g.beginPath(); g.ellipse(r + Math.cos(a) * d, r + Math.sin(a) * d, 3 + rnd() * 6, 2 + rnd() * 4, rnd() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(240,230,220,.55)'; g.lineWidth = 5; g.beginPath(); g.arc(r, r, r * 0.95, 0, 7); g.stroke();
});

const texTripa = () => lienzo(256, 128, (g, w, h) => {
  g.fillStyle = '#6b2a22'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(235,230,220,${rnd() * 0.35})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
  g.strokeStyle = 'rgba(40,12,8,.35)';
  for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 10, h); g.stroke(); }
});

const texQueso = (base, agujero) => lienzo(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = rnd() * h, rr = 6 + rnd() * 18;
    const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 1, x, y, rr);
    gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(0.8, agujero); gr.addColorStop(1, 'rgba(255,255,255,.25)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * 0.85, rnd() * 3, 0, 7); g.fill();
  }
});

const texAzul = () => lienzo(512, 512, (g, w, h) => {
  g.fillStyle = '#efe7d3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${60 + rnd() * 30},${95 + rnd() * 30},${90 + rnd() * 30},${0.35 + rnd() * 0.5})`;
    g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 4 + rnd() * 16, 2 + rnd() * 8, rnd() * 3, 0, 7); g.fill();
  }
});

// ---------- Piezas ----------
function crearPiezas(mats) {
  const piezas = [];
  const sombra = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  const cuña = (matTapa, matLado, ancho = 1.55, alto = 0.62, ang = 0.62) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(ancho, 0); s.absarc(0, 0, ancho, 0, ang, false); s.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: alto, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2); geo.center(); geo.translate(0, alto / 2 + 0.03, 0);
    return sombra(new THREE.Mesh(geo, [matTapa, matLado]));
  };

  // 1. Cuña de queso amarillo
  { const g = new THREE.Group(); const m = cuña(mats.quesoTapa, mats.quesoLado); g.add(m); g.rotation.y = 0.5; piezas.push({ obj: g, pos: [-2.2, -0.7] }); }

  // 2. Abanico de salame
  {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.36, 0.36, 0.05, 40);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(geo, [mats.salameLado, mats.salameCara, mats.salameCara]);
      const t = i / 7;
      m.position.set(lerp(-0.85, 0.85, t), 0.05 + i * 0.022, Math.sin(t * Math.PI) * -0.18);
      m.rotation.set(-0.12, 0, 0.14);
      g.add(m);
    }
    piezas.push({ obj: sombra(g), pos: [0.45, 0.85] });
  }

  // 3. Bol de aceitunas
  {
    const g = new THREE.Group();
    const perfil = [[0, 0], [0.5, 0], [0.56, 0.03], [0.62, 0.34], [0.58, 0.37], [0.53, 0.08], [0, 0.08]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), mats.ceramica));
    const olGeo = new THREE.SphereGeometry(0.12, 20, 14); olGeo.scale(1, 0.8, 0.8);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rnd(), d = i < 7 ? 0.3 : 0.12;
      const o = new THREE.Mesh(olGeo, i % 3 === 0 ? mats.aceitunaNegra : mats.aceitunaVerde);
      o.position.set(Math.cos(a) * d, i < 7 ? 0.2 : 0.3, Math.sin(a) * d);
      o.rotation.set(rnd() * 3, rnd() * 3, 0);
      g.add(o);
    }
    piezas.push({ obj: sombra(g), pos: [2.05, -0.75] });
  }

  // 4. Rollitos de jamón
  {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.17, 0.17, 0.95, 28, 1, true, 0, Math.PI * 1.75);
    const geo2 = new THREE.CylinderGeometry(0.1, 0.1, 0.95, 20, 1, true, 1, Math.PI * 1.6);
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Group();
      r.add(new THREE.Mesh(geo, mats.jamon), new THREE.Mesh(geo2, mats.jamon));
      r.rotation.set(0, 0.2 * i, Math.PI / 2);
      r.position.set(0, 0.18 + (i === 1 ? 0.12 : 0), -0.34 + i * 0.3);
      g.add(r);
    }
    g.rotation.y = -0.25;
    piezas.push({ obj: sombra(g), pos: [-0.75, -0.8] });
  }

  // 5. Cubitos de queso
  {
    const g = new THREE.Group();
    const geo = new RoundedBoxGeometry(0.28, 0.28, 0.28, 2, 0.04);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(geo, i % 2 ? mats.cubo1 : mats.cubo2);
      m.position.set((i % 3) * 0.34 - 0.34 + rnd() * 0.06, 0.14 + (i === 4 ? 0.26 : 0), Math.floor(i / 3) * 0.34 - 0.34 + rnd() * 0.06);
      m.rotation.y = rnd() * 0.8;
      g.add(m);
    }
    piezas.push({ obj: sombra(g), pos: [-2.25, 0.95] });
  }

  // 6. Salame entero cortado
  {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.45, 32), [mats.tripa, mats.salameCara, mats.salameCara]);
    m.rotation.z = Math.PI / 2; m.position.y = 0.27;
    g.add(m);
    g.rotation.y = 0.45;
    piezas.push({ obj: sombra(g), pos: [2.25, 0.9] });
  }

  // 7. Racimo de uvas
  {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.125, 18, 14);
    const pts = [[0, 0], [0.22, 0.05], [-0.2, 0.08], [0.1, 0.24], [-0.12, 0.26], [0.3, 0.3], [0, 0.48], [0.2, 0.52], [-0.2, 0.5], [0.05, 0.72], [-0.05, 0.1]];
    pts.forEach(([x, z], i) => { const u = new THREE.Mesh(geo, mats.uva); u.position.set(x, 0.12 + (i % 3 === 0 ? 0.12 : 0), z - 0.35); g.add(u); });
    const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8), mats.tallo);
    tallo.rotation.x = Math.PI / 2.3; tallo.position.set(0.05, 0.3, 0.55); g.add(tallo);
    g.rotation.y = 0.5;
    piezas.push({ obj: sombra(g), pos: [0.6, -0.85] });
  }

  // 8. Cuña de roquefort
  { const g = new THREE.Group(); g.add(cuña(mats.azul, mats.azul, 1.2, 0.5, 0.7)); g.rotation.y = 2.4; piezas.push({ obj: g, pos: [-1.05, 0.7] }); }

  // 9. Galletitas
  {
    const g = new THREE.Group();
    const geo = new RoundedBoxGeometry(0.5, 0.05, 0.5, 2, 0.02);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(geo, mats.galleta);
      m.position.set(i * 0.12, 0.05 + i * 0.035, 0);
      m.rotation.set(0, 0.1 * i, -0.18);
      g.add(m);
    }
    g.rotation.y = 0.8;
    piezas.push({ obj: sombra(g), pos: [1.15, 0.05] });
  }

  // 10. Grisines
  {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 1.9, 10);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geo, mats.galleta);
      m.rotation.set(Math.PI / 2, 0, 0.3 + i * 0.12);
      m.position.set(i * 0.1, 0.04 + i * 0.03, 0);
      g.add(m);
    }
    piezas.push({ obj: sombra(g), pos: [-0.3, 0.05] });
  }

  return piezas;
}

// ---------- Montaje ----------
export async function montarPicada(canvas, opciones = {}) {
  const { nivel = 10, parallax = true } = opciones;
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const liviano = matchMedia('(max-width: 700px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !liviano, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, liviano ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  // Luces: cálidas, tipo vidriera de fiambrería
  scene.add(new THREE.HemisphereLight(0xffe9c9, 0x1a1512, 0.55));
  const key = new THREE.DirectionalLight(0xffdcae, 2.6);
  key.position.set(-4, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(liviano ? 1024 : 2048, liviano ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  key.shadow.bias = -0.0005;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd6bf, 0.9);
  rim.position.set(5, 3, -5);
  scene.add(rim);
  const calido = new THREE.PointLight(0xe3a82b, 6, 12, 2);
  calido.position.set(3, 2.5, 3);
  scene.add(calido);

  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const madera = texMadera();
  const quesoTex = texQueso('#f4c94e', 'rgba(190,130,30,.55)');
  quesoTex.wrapS = quesoTex.wrapT = THREE.RepeatWrapping; quesoTex.repeat.set(0.9, 0.9);
  const salameTex = texSalame();
  const tripaTex = texTripa(); tripaTex.wrapS = THREE.RepeatWrapping; tripaTex.repeat.set(2, 1);
  const azulTex = texAzul(); azulTex.wrapS = azulTex.wrapT = THREE.RepeatWrapping; azulTex.repeat.set(0.8, 0.8);

  const mats = {
    quesoTapa: M(0xffffff, { map: quesoTex, roughness: 0.55 }),
    quesoLado: M(0xffe7a8, { map: quesoTex, roughness: 0.5 }),
    salameCara: M(0xffffff, { map: salameTex, roughness: 0.45 }),
    salameLado: M(0x6b2a22, { roughness: 0.7 }),
    tripa: M(0xffffff, { map: tripaTex, roughness: 0.85 }),
    ceramica: new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, roughness: 0.25, clearcoat: 0.6 }),
    aceitunaVerde: new THREE.MeshPhysicalMaterial({ color: 0x7c8a2e, roughness: 0.3, clearcoat: 0.8 }),
    aceitunaNegra: new THREE.MeshPhysicalMaterial({ color: 0x2b1d1f, roughness: 0.25, clearcoat: 0.9 }),
    jamon: M(0xeaa3a0, { roughness: 0.45, side: THREE.DoubleSide }),
    cubo1: M(0xf3c84b, { roughness: 0.5 }),
    cubo2: M(0xf6e6b4, { roughness: 0.55 }),
    uva: new THREE.MeshPhysicalMaterial({ color: 0x4d1f47, roughness: 0.25, clearcoat: 1, sheen: 0.4 }),
    tallo: M(0x5b4a2a),
    azul: M(0xffffff, { map: azulTex, roughness: 0.65 }),
    galleta: M(0xd8a45f, { roughness: 0.8 }),
  };

  // Tabla
  const raiz = new THREE.Group();
  scene.add(raiz);
  const forma = new THREE.Shape();
  const W = 6.6, H = 3.9, R = 0.4;
  forma.moveTo(-W / 2 + R, -H / 2);
  forma.lineTo(W / 2 - R, -H / 2); forma.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
  forma.lineTo(W / 2, H / 2 - R); forma.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
  forma.lineTo(-W / 2 + R, H / 2); forma.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
  forma.lineTo(-W / 2, -H / 2 + R); forma.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
  const agujero = new THREE.Path(); agujero.absarc(-W / 2 + 0.45, 0, 0.16, 0, Math.PI * 2, true); forma.holes.push(agujero);
  const tablaGeo = new THREE.ExtrudeGeometry(forma, { depth: 0.24, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 20 });
  tablaGeo.rotateX(-Math.PI / 2);
  tablaGeo.translate(0, -0.3, 0);
  // UV de la tapa: mapear x/z a la textura
  const uv = tablaGeo.attributes.uv, pos = tablaGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getZ(i) + H / 2) / H);
  const tabla = new THREE.Mesh(tablaGeo, [M(0xffffff, { map: madera, roughness: 0.62 }), M(0x7a4a26, { map: madera, roughness: 0.7 })]);
  tabla.receiveShadow = true; tabla.castShadow = true;
  raiz.add(tabla);

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.45 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -0.37; piso.receiveShadow = true;
  scene.add(piso);

  const piezas = crearPiezas(mats);
  piezas.forEach((p, i) => {
    p.obj.position.set(p.pos[0], 0, p.pos[1]);
    p.obj.visible = false;
    p.anim = { estado: 'oculto', inicio: 0 };
    p.i = i;
    raiz.add(p.obj);
  });

  // Animación de caída con rebote
  const rebote = (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };

  let nivelActual = 0;
  function setNivel(n) {
    n = Math.max(1, Math.min(piezas.length, Math.round(n)));
    let orden = 0;
    piezas.forEach((p, i) => {
      const mostrar = i < n;
      if (mostrar && (p.anim.estado === 'oculto' || p.anim.estado === 'saliendo')) {
        p.anim = { estado: 'entrando', inicio: performance.now() / 1000 + (reducir ? -1 : (orden++) * 0.12) };
        p.obj.visible = true;
      } else if (!mostrar && (p.anim.estado === 'visible' || p.anim.estado === 'entrando')) {
        p.anim = { estado: 'saliendo', inicio: performance.now() / 1000 };
      }
    });
    nivelActual = n;
  }

  // Tamaño responsive
  function ajustar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = camera.aspect < 1 ? 10.5 / camera.aspect ** 0.6 : 10.2;
    camera.position.set(0, dist * 0.62, dist * 0.78);
    camera.lookAt(0, -0.35, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(canvas);
  ajustar();

  // Interacción: parallax con el puntero y leve giro con el scroll
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
  function frame(ahora) {
    pendiente = false;
    const t = (ahora - t0) / 1000;

    suave.x = lerp(suave.x, puntero.x, 0.05);
    suave.y = lerp(suave.y, puntero.y, 0.05);
    raiz.rotation.y = -0.32 + (reducir ? 0 : Math.sin(t * 0.22) * 0.22) + suave.x * 0.35;
    raiz.rotation.x = suave.y * 0.12;
    raiz.position.y = reducir ? 0 : Math.sin(t * 0.8) * 0.04;
    raiz.position.x = -0.25;

    piezas.forEach((p) => {
      const a = p.anim;
      if (a.estado === 'entrando') {
        const k = Math.min(1, Math.max(0, (ahora / 1000 - a.inicio) / 0.95));
        p.obj.position.y = (1 - rebote(k)) * 4.5;
        p.obj.scale.setScalar(k > 0 ? 1 : 0.001);
        if (k >= 1) a.estado = 'visible';
      } else if (a.estado === 'saliendo') {
        const k = Math.min(1, (ahora / 1000 - a.inicio) / 0.3);
        p.obj.scale.setScalar(Math.max(0.001, 1 - k));
        if (k >= 1) { a.estado = 'oculto'; p.obj.visible = false; }
      }
    });

    renderer.render(scene, camera);
    if (visible && !document.hidden) loop();
  }

  setNivel(nivel);
  loop();
  canvas.classList.add('listo');
  return { setNivel, get nivel() { return nivelActual; }, total: piezas.length };
}
