// Escena 3D (Three.js): pista procedural, pinos, bola, camara, luces, guia de punteria y chispas.
import * as THREE from '../lib/three.module.min.js';
import { P, posPino } from './fisica.js';
import { PISTAS, PINOS, BOLAS } from './catalogo.js';

const ZINI = -4.5, ZLARGO = P.ZFIN - ZINI;
const col = (c) => new THREE.Color(c);

function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function aleatorio(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

function texturaPista(t, reducida) {
  const W = reducida ? 128 : 256, H = reducida ? 1024 : 2048, c = lienzo(W, H), g = c.getContext('2d'), r = aleatorio(7);
  const nb = 39, bw = W / nb;
  for (let i = 0; i < nb; i++) {
    g.fillStyle = i % 2 ? t.tabla1 : t.tabla2; g.fillRect(i * bw, 0, bw + 1, H);
    g.fillStyle = 'rgba(0,0,0,' + (0.04 + r() * 0.08) + ')'; g.fillRect(i * bw, 0, bw + 1, H);
    for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.08 + ')'; g.fillRect(i * bw + r() * bw, r() * H, 1, 40 + r() * 200); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * bw, 0, 1, H);
  }
  const zy = (z) => (z - ZINI) / ZLARGO * H;
  g.fillStyle = 'rgba(20,10,0,.85)'; g.fillRect(0, zy(0) - 2, W, 4);
  g.fillStyle = t.flechas;
  for (let k = -3; k <= 3; k++) {
    const x = W / 2 + k * (W / 9), z = 4.57 - (3 - Math.abs(k)) * 0.35, y = zy(z);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 18); g.lineTo(x + 5, y + 18); g.closePath(); g.fill();
  }
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(W / 2 + k * (W / 9), zy(2.1), 1.8, 0, 7); g.fill(); }
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(W / 2 + k * (W / 9), zy(3.6), 1.4, 0, 7); g.fill(); }
  const gr = g.createLinearGradient(0, zy(0), 0, zy(ZLARGO + ZINI)); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = gr; g.fillRect(0, zy(0), W, H);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}

function texturaBola(b, daltonico) {
  const c = lienzo(256, 128), g = c.getContext('2d'), r = aleatorio(b.id.length * 97);
  const gr = g.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, b.c1); gr.addColorStop(1, b.c2);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.globalAlpha = 0.35;
  for (let k = 0; k < 9; k++) { g.strokeStyle = k % 2 ? b.c2 : '#fff'; g.lineWidth = 3 + r() * 9; g.beginPath(); g.moveTo(0, r() * 128); g.bezierCurveTo(80, r() * 128, 170, r() * 128, 256, r() * 128); g.stroke(); }
  g.globalAlpha = 1;
  if (b.estrellas) for (let k = 0; k < 90; k++) { g.fillStyle = 'rgba(255,255,255,' + (0.4 + r() * 0.6) + ')'; g.fillRect(r() * 256, r() * 128, 1 + r() * 1.5, 1 + r() * 1.5); }
  if (daltonico) { g.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 4; k++) g.fillRect(k * 64 + 28, 0, 8, 128); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

function perfilPino(n) {
  const base = [[0, 0], [0.0285, 0], [0.0405, 0.02], [0.0525, 0.06], [0.0605, 0.114], [0.0575, 0.15], [0.0455, 0.205], [0.0325, 0.255], [0.0285, 0.295], [0.0325, 0.335], [0.0378, 0.362], [0.0345, 0.378], [0, 0.382]];
  const curva = new THREE.SplineCurve(base.map((p) => new THREE.Vector2(p[0], p[1])));
  return curva.getPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
}

const MAXCH = 160;

export class Escena {
  constructor(cont, q) {
    this.cont = cont; this.q = q; this.t = 0; this.camModo = 'lanzar'; this.shake = 0; this.pv = []; this.geoPino = {}; this.matPino = {}; this.flash = 0;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
    this.cam.position.set(0, 0.95, -2.8);
    this.camObj = new THREE.Vector3(0, 0.15, 6); this.camPos = this.cam.position.clone();
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x302020, 1.1); this.scene.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xffffff, 2.2); this.sol.position.set(2, 6, 14); this.sol.target.position.set(0, 0, 18); this.scene.add(this.sol, this.sol.target);
    this.foco = new THREE.PointLight(0xffffff, 6, 7, 1.6); this.foco.position.set(0, 2.2, 17.5); this.scene.add(this.foco);
    this.luzBola = new THREE.PointLight(0xffffff, 0.6, 5, 2); this.scene.add(this.luzBola);
    this.fijo = new THREE.Group(); this.scene.add(this.fijo);
    this.crearRenderer();
    this.montarBola(); this.montarPuntos(); this.montarChispas();
    this.pinosGrupo = new THREE.Group(); this.scene.add(this.pinosGrupo);
    this.montarPinos();
    this.tema(PISTAS[0].id);
    this.cont.addEventListener('webglcontextlost', (e) => e.preventDefault(), true);
    this.ro = new ResizeObserver(() => this.redim()); this.ro.observe(cont);
    this.redim();
  }

  crearRenderer() {
    const q = this.q;
    if (this.r) { this.r.dispose(); this.r.domElement.remove(); }
    this.r = new THREE.WebGLRenderer({ antialias: !!q.aa, powerPreference: 'high-performance', alpha: false });
    this.r.setPixelRatio(q.pr); this.r.domElement.className = 'lienzo3d';
    this.r.shadowMap.enabled = !!q.sombras; this.r.shadowMap.type = q.sombras > 1 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.cont.prepend(this.r.domElement);
    this.sol.castShadow = !!q.sombras;
    if (q.sombras) {
      const s = this.sol.shadow, m = q.sombras > 1 ? 2048 : 1024;
      s.mapSize.set(m, m); s.camera.left = -1.3; s.camera.right = 1.3; s.camera.top = 7; s.camera.bottom = -7; s.camera.near = 1; s.camera.far = 25; s.bias = -0.0005;
      if (s.map) { s.map.dispose(); s.map = null; }
      this.sol.position.set(1.5, 7, 15); this.sol.target.position.set(0, 0, 16);
    }
    this.redim();
  }

  aplicarCalidad(q) {
    const prev = this.q, rec = prev.aa !== q.aa || prev.sombras !== q.sombras || prev.pr !== q.pr;
    const det = prev.detalle !== q.detalle; this.q = q;
    if (rec) this.crearRenderer();
    if (det) { this.montarPinos(); this.montarBola(); }
    this.tema(this.temaId, true);
    this.luzBola.intensity = q.sombras ? 0.6 : 0.3;
  }

  redim() {
    const w = Math.max(1, this.cont.clientWidth), h = Math.max(1, this.cont.clientHeight);
    this.r.setSize(w, h, false); this.r.domElement.style.width = '100%'; this.r.domElement.style.height = '100%';
    this.cam.aspect = w / h; this.cam.fov = this.cam.aspect < 0.8 ? 66 : this.cam.aspect < 1.2 ? 58 : 50; this.cam.updateProjectionMatrix();
  }

  /* ---------- pista y entorno ---------- */
  tema(id, recrear) {
    const t = PISTAS.find((p) => p.id === id) || PISTAS[0];
    if (!recrear && this.temaId === id) return;
    this.temaId = id; this.tm = t;
    const lujo = this.q.detalle > 0;
    this.fijo.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.map) && o.material.map.dispose(); o.material.dispose(); } });
    while (this.fijo.children.length) this.fijo.remove(this.fijo.children[0]);
    this.scene.background = col(t.fondo); this.scene.fog = new THREE.Fog(col(t.fondo), 14, 42);
    this.hemi.intensity = 0.9 * t.luz; this.sol.intensity = 1.9 * t.luz; this.foco.intensity = 5 * t.luz;
    const Std = this.q.detalle > 0 ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    const mat = (o) => new Std(o);
    const carril = mat({ map: texturaPista(t, this.q.detalle === 0), roughness: t.brillante ? 0.18 : 0.38, metalness: t.brillante ? 0.25 : 0.05 });
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(P.ANCHO, ZLARGO), carril);
    pista.rotation.x = -Math.PI / 2; pista.position.set(0, 0, ZINI + ZLARGO / 2); pista.receiveShadow = true; this.fijo.add(pista);
    // canales
    const canalMat = mat({ color: 0x15151a, roughness: 0.6, side: THREE.DoubleSide });
    for (const lado of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, ZLARGO, lujo ? 14 : 8, 1, true, -Math.PI / 2, Math.PI), canalMat);
      c.rotation.x = Math.PI / 2; c.position.set(lado * P.XCANAL, 0, ZINI + ZLARGO / 2); c.receiveShadow = true; this.fijo.add(c);
      // muro lateral con tira de neon
      const muro = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, ZLARGO), mat({ color: t.pared, roughness: 0.6 }));
      muro.position.set(lado * (P.XCANAL + 0.37), 0.1, ZINI + ZLARGO / 2); this.fijo.add(muro);
      const tira = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, ZLARGO), new THREE.MeshBasicMaterial({ color: lado < 0 ? t.neon : (t.neon2 || t.neon) }));
      tira.position.set(lado * (P.XCANAL + 0.2), 0.33, ZINI + ZLARGO / 2); this.fijo.add(tira);
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(10, ZLARGO + 6), mat({ color: col(t.pared).multiplyScalar(0.6), roughness: 0.9 }));
      suelo.rotation.x = -Math.PI / 2; suelo.position.set(lado * (P.XCANAL + 0.62 + 5), -0.02, ZINI + ZLARGO / 2); this.fijo.add(suelo);
    }
    // foso y fondo
    const foso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 2), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    foso.position.set(0, -0.31, P.ZFOSO + 0.85); this.fijo.add(foso);
    const fondo = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 0.3), mat({ color: t.pared, roughness: 0.7 }));
    fondo.position.set(0, 1.5, 21); this.fijo.add(fondo);
    const cv = lienzo(512, 128), gx = cv.getContext('2d');
    gx.fillStyle = 'rgba(0,0,0,.5)'; gx.fillRect(0, 0, 512, 128); gx.font = '800 44px Orbitron, system-ui, sans-serif'; gx.textAlign = 'center'; gx.fillStyle = t.neon; gx.shadowColor = t.neon; gx.shadowBlur = 18; gx.fillText('REY DE LOS BOLOS', 256, 80);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
    cartel.position.set(0, 1.95, 20.8); cartel.rotation.y = Math.PI; this.fijo.add(cartel);
    const capucha = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 2), mat({ color: t.pared, roughness: 0.5 }));
    capucha.position.set(0, 1.35, 20.1); this.fijo.add(capucha);
    const techoTira = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), new THREE.MeshBasicMaterial({ color: t.neon }));
    techoTira.position.set(0, 1.16, 19.2); this.fijo.add(techoTira);
    if (t.estrellas) {
      const pts = new Float32Array(300 * 3); const r = aleatorio(5);
      for (let i = 0; i < 300; i++) { pts[i * 3] = (r() - 0.5) * 24; pts[i * 3 + 1] = 0.5 + r() * 9; pts[i * 3 + 2] = 14 + r() * 20; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      this.fijo.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, fog: false })));
    }
    // luces del techo laterales (decorativas)
    for (let k = 0; k < 6; k++) for (const lado of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: k % 2 ? t.neon : (t.neon2 || t.neon) }));
      l.position.set(lado * 1.7, 2.6, 2 + k * 3.4); this.fijo.add(l);
    }
    this.recolorPinos();
  }

  /* ---------- pinos ---------- */
  geoDePino(tipo) {
    const k = tipo + this.q.detalle;
    if (this.geoPino[k]) return this.geoPino[k];
    const d = this.q.detalle, g = new THREE.LatheGeometry(perfilPino(d === 0 ? 9 : d === 1 ? 16 : 24), d === 0 ? 8 : d === 1 ? 14 : 20);
    const pos = g.attributes.position, cs = new Float32Array(pos.count * 3), T = PINOS[tipo] || PINOS.normal;
    const b = col(T.color), s = col(this.daltonico ? '#0a3dff' : T.franja);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), franja = (y > 0.225 && y < 0.255) || (y > 0.268 && y < 0.292);
      const c = franja ? s : b; cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
    return (this.geoPino[k] = g);
  }
  matDePino(tipo) {
    if (this.matPino[tipo]) return this.matPino[tipo];
    const M = this.q.detalle > 0 ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    const o = { vertexColors: true }; if (this.q.detalle > 0) { o.roughness = 0.3; o.metalness = tipo === 'pesado' ? 0.8 : 0.05; if (tipo === 'explosivo') { o.emissive = col('#661a00'); } }
    return (this.matPino[tipo] = new M(o));
  }
  recolorPinos() { Object.values(this.matPino).forEach((m) => m.dispose()); this.matPino = {}; Object.values(this.geoPino).forEach((g) => g.dispose()); this.geoPino = {}; this.pv.forEach((v) => this.vestirPino(v, v.tipo, true)); }
  ponerDaltonico(b) { if (this.daltonico !== b) { this.daltonico = b; this.recolorPinos(); this.montarBola(); } }
  vestirPino(v, tipo, forzar) {
    if (v.tipo === tipo && !forzar && v.mesh.geometry) return;
    v.tipo = tipo; v.mesh.geometry = this.geoDePino(tipo); v.mesh.material = this.matDePino(tipo);
  }
  montarPinos() {
    this.pv.forEach((v) => { this.pinosGrupo.remove(v.g); });
    this.pv = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group(), mesh = new THREE.Mesh(this.geoDePino('normal'), this.matDePino('normal'));
      mesh.castShadow = true; g.add(mesh); g.visible = false; this.pinosGrupo.add(g);
      this.pv.push({ g, mesh, tipo: 'normal', anim: null, y: 0, vis: false });
    }
    this.recolorPinos();
  }
  /* Coloca los pinos de un layout ({i,tipo,x?,z?}); los demas se ocultan. anim: bajan desde arriba. */
  colocarPinos(layout, anim) {
    const en = new Set(layout.map((l) => l.i));
    this.pv.forEach((v, i) => {
      const l = layout.find((q) => q.i === i);
      v.anim = null;
      if (!en.has(i)) { v.vis = false; v.g.visible = false; return; }
      const n = posPino(i);
      this.vestirPino(v, l.tipo || 'normal');
      v.vis = true; v.g.visible = true; v.g.rotation.set(0, 0, 0); v.mesh.rotation.set(0, 0, 0);
      v.x = l.x != null ? l.x : n.x; v.z = l.z != null ? l.z : n.z; v.f = 0; v.dx = 0; v.dz = 1;
      v.g.position.set(v.x, 0, v.z);
      if (anim) { v.y = 0.7; v.anim = { t: -0.04 * i, dur: 0.5, de: 0.7, a: 0 }; v.g.position.y = 0.7; }
      else v.y = 0;
    });
  }
  /* Pinos tumbados se hunden (barrido) y los que siguen en pie vuelven a su sitio. */
  barrer(masc) {
    this.pv.forEach((v, i) => { if (v.vis && (masc & (1 << i))) v.anim = { t: 0, dur: 0.45, de: v.g.position.y, a: -0.6, ocultar: true }; });
  }
  actualizarPinos(ps) {
    for (const p of ps) {
      const v = this.pv[p.i]; if (!v || !v.vis || v.anim) continue;
      let f = 0;
      if (p.est >= 1) { f = Math.min(1, (p.est === 1 ? p.tc : 9) / 0.42); }
      const dx = p.dx, dz = p.dz, g = v.g;
      g.position.set(p.x - dx * 0.17 * f, 0.055 * f, p.z - dz * 0.17 * f);
      if (f > 0) { v.mesh.rotation.set(0, 0, 0); g.quaternion.setFromAxisAngle(new THREE.Vector3(dz, 0, -dx), f * f * (3 - 2 * f) * Math.PI / 2); } else g.quaternion.identity();
      g.visible = p.est !== 3 || p.z < P.ZFOSO + 0.2;
      if (p.est === 3) { g.position.y = Math.min(g.position.y, 0.055) - 0.0; if (p.z > P.ZFOSO) g.position.y = -0.3; }
    }
  }

  /* ---------- bola ---------- */
  montarBola() {
    if (this.bolaMesh) { this.scene.remove(this.bolaMesh); this.bolaMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); if (o.material) o.material.dispose(); }); }
    const d = this.q.detalle, seg = d === 0 ? 14 : d === 1 ? 24 : 40;
    const b = BOLAS.find((x) => x.id === this.bolaId) || BOLAS[0];
    const M = d > 0 ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    const o = { map: texturaBola(b, this.daltonico) }; if (d > 0) { o.roughness = 1 - b.brillo * 0.85; o.metalness = b.metal ? 0.85 : 0.15; if (b.emi) o.emissive = col(b.emi); }
    const m = new THREE.Mesh(new THREE.SphereGeometry(P.RBOLA, seg, Math.round(seg * 0.7)), new M(o)); m.castShadow = true;
    const agujero = new THREE.MeshBasicMaterial({ color: 0x050505 });
    [[0.02, 0], [-0.02, 0.005], [0, -0.03]].forEach(([a, c]) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8), agujero); h.position.set(a * 1.2, P.RBOLA * 0.99, c * 1.2 + 0.0); m.add(h); });
    this.bolaMesh = new THREE.Group(); this.bolaMesh.add(m); this.bolaRot = m;
    this.bolaMesh.position.set(0, P.RBOLA, 0); this.scene.add(this.bolaMesh);
  }
  ponerBola(id) { if (this.bolaId !== id) { this.bolaId = id; this.montarBola(); } }
  colocarBola(x, z, visible = true) { this.bolaMesh.position.set(x, P.RBOLA, z); this.bolaMesh.visible = visible; this.bx = x; this.bz = z; }
  moverBola(b, dt) {
    const m = this.bolaMesh; if (!m) return;
    const y = b.est === 'canal' ? P.RBOLA - 0.07 : P.RBOLA;
    m.position.set(b.x, b.z > P.ZFOSO + 0.5 ? -0.3 : y, b.z);
    const v = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (v > 0.01) {
      const ax = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
      this.bolaRot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, v * dt / P.RBOLA));
    }
    this.luzBola.position.set(b.x, 0.8, b.z + 0.5);
    this.bx = b.x; this.bz = b.z;
  }

  /* ---------- guia de punteria y chispas ---------- */
  montarPuntos() {
    this.pts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 48);
    this.pts.count = 0; this.pts.frustumCulled = false; this.scene.add(this.pts);
    this.puntosDummy = new THREE.Object3D();
  }
  guia(trayecto, color) {
    if (!trayecto || !trayecto.length) { this.pts.count = 0; return; }
    const d = this.puntosDummy; this.pts.material.color.set(color || '#ffffff');
    trayecto.forEach((p, i) => { d.position.set(p.x, 0.012, p.z); d.updateMatrix(); this.pts.setMatrixAt(i, d.matrix); });
    this.pts.count = trayecto.length; this.pts.instanceMatrix.needsUpdate = true;
  }
  montarChispas() {
    const g = new THREE.BufferGeometry();
    this.chPos = new Float32Array(MAXCH * 3); this.chVel = new Float32Array(MAXCH * 3); this.chVida = new Float32Array(MAXCH); this.chN = 0;
    g.setAttribute('position', new THREE.BufferAttribute(this.chPos, 3));
    this.chispas = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe9a0, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false }));
    this.chispas.frustumCulled = false; this.scene.add(this.chispas);
  }
  emitir(x, z, n, fuerza) {
    for (let k = 0; k < n; k++) {
      const i = this.chN++ % MAXCH, a = Math.random() * 6.283, v = (0.6 + Math.random()) * Math.min(3, 0.6 + fuerza * 0.2);
      this.chPos[i * 3] = x; this.chPos[i * 3 + 1] = 0.12; this.chPos[i * 3 + 2] = z;
      this.chVel[i * 3] = Math.cos(a) * v; this.chVel[i * 3 + 1] = 0.8 + Math.random() * 1.8; this.chVel[i * 3 + 2] = Math.sin(a) * v; this.chVida[i] = 0.5 + Math.random() * 0.4;
    }
  }
  destello(v) { this.flash = v; }

  /* ---------- camara ---------- */
  modoCam(m, instante) {
    this.camModo = m;
    if (instante) this.cortarCam();
  }
  cortarCam() { this.cam.position.copy(this.objetivoCam().pos); this.camObj.copy(this.objetivoCam().mira); this.cam.lookAt(this.camObj); }
  objetivoCam() {
    const bx = this.bx || 0, bz = this.bz || 0, port = this.cam.aspect < 0.8;
    if (this.camModo === 'menu') return { pos: new THREE.Vector3(Math.sin(this.t * 0.25) * 0.9, 0.95, P.Z1 - 3.4), mira: new THREE.Vector3(0, 0.15, P.Z1 + 0.5) };
    if (this.camModo === 'lanzar') return { pos: new THREE.Vector3(bx * 0.55, port ? 1.12 : 0.9, bz - (port ? 2.9 : 2.5)), mira: new THREE.Vector3(bx * 0.25, 0.1, bz + 6.5) };
    if (this.camModo === 'seguir') {
      const z = Math.min(bz - 2.2, P.Z1 - 4.4);
      return { pos: new THREE.Vector3(bx * 0.5, 0.85, z), mira: new THREE.Vector3(bx * 0.3, 0.12, Math.min(bz + 6, P.Z1 + 1)) };
    }
    return { pos: new THREE.Vector3(0, port ? 0.95 : 0.8, P.Z1 - (port ? 3.9 : 3.0)), mira: new THREE.Vector3(0, 0.12, P.Z1 + 0.6) };
  }
  actualizarCamara(dt) {
    const o = this.objetivoCam(), k = this.reducir ? 1 : 1 - Math.exp(-(this.camModo === 'seguir' ? 6 : 3.2) * dt);
    this.cam.position.lerp(o.pos, k); this.camObj.lerp(o.mira, k);
    this.cam.lookAt(this.camObj);
    if (this.shake > 0 && !this.reducir) { this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.05; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.04; this.shake = Math.max(0, this.shake - dt * 2.5); }
  }

  /* ---------- cuadro ---------- */
  render(dt) {
    this.t += dt;
    for (const v of this.pv) {
      const a = v.anim; if (!a) continue;
      a.t += dt; const u = Math.max(0, Math.min(1, a.t / a.dur)), e = u * u * (3 - 2 * u);
      v.g.position.y = a.ocultar ? a.de + (a.a - a.de) * e : a.de * (1 - e);
      if (u >= 1) { if (a.ocultar) { v.vis = false; v.g.visible = false; } else v.g.position.y = 0; v.anim = null; }
    }
    if (this.chN) {
      let vivos = 0;
      for (let i = 0; i < MAXCH; i++) {
        if (this.chVida[i] <= 0) { this.chPos[i * 3 + 1] = -5; continue; }
        this.chVida[i] -= dt; vivos++;
        this.chVel[i * 3 + 1] -= 7 * dt;
        this.chPos[i * 3] += this.chVel[i * 3] * dt; this.chPos[i * 3 + 1] = Math.max(0.01, this.chPos[i * 3 + 1] + this.chVel[i * 3 + 1] * dt); this.chPos[i * 3 + 2] += this.chVel[i * 3 + 2] * dt;
      }
      this.chispas.geometry.attributes.position.needsUpdate = true;
      if (!vivos) this.chN = 0;
    }
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 2); this.foco.intensity = (5 + this.flash * 30) * this.tm.luz; }
    this.actualizarCamara(dt);
    this.r.render(this.scene, this.cam);
  }

  destruir() {
    this.ro.disconnect();
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.map) && o.material.map.dispose(); o.material.dispose(); } });
    this.r.dispose(); this.r.domElement.remove();
  }
}
