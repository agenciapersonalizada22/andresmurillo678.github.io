// Escena 3D (Three.js): sala, mesa, red, paletas, pelota con giro visible, estela, marcador de bote y calidad ajustable.
import * as THREE from '../lib/three.module.min.js';
import { C } from './fisica.js';
import { ZPLANO } from './motor.js';
import { item } from './economia.js';

const lienzo = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const lim = (o) => { o.traverse((n) => { if (n.geometry) n.geometry.dispose(); const ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : []; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }); };
const ALTO_PALETA = C.H + 0.24;

export class Escena {
  constructor(cont, aj, equipo) {
    this.cont = cont; this.aj = aj; this.equipo = equipo || { mesa: 'azul', paleta: 'clasica', sala: 'gimnasio' };
    this.snap = Object.assign({}, aj.gr, { dalt: aj.ac.daltonismo });
    this.vista = 1; this.t = 0; this.ancho = 1; this.alto = 1; this.anillos = []; this.estela = []; this.marca = null;
    this.escena = new THREE.Scene(); this.camara = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
    this.crearRenderer(); this.sala = null; this.mesa = null; this.paletas = []; this.jugColores = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d'];
    this.luces();
    this.reconstruirTodo();
    this.redimensionar();
  }
  crearRenderer() {
    const g = this.aj.gr;
    if (this.r) { this.r.dispose(); this.r.domElement.remove(); }
    this.r = new THREE.WebGLRenderer({ antialias: !!g.antialias, powerPreference: 'high-performance', alpha: false });
    this.r.domElement.className = 'lienzo3d'; this.cont.prepend(this.r.domElement);
    this.r.shadowMap.enabled = g.sombras > 0; this.r.shadowMap.type = g.sombras >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.ratio();
  }
  ratio() { const g = this.aj.gr; this.r.setPixelRatio(Math.max(0.4, Math.min(g.res * (window.devicePixelRatio || 1), g.preset === 'ultra' ? 3 : 2.2))); }
  luces() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445066, 0.7); this.escena.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xffffff, 1.0); this.sol.position.set(1.5, 5, 1.5); this.sol.target.position.set(0, C.H, 0);
    this.escena.add(this.sol, this.sol.target);
    this.configurarSombra();
  }
  configurarSombra() {
    const g = this.aj.gr, s = this.sol; s.castShadow = g.sombras > 0;
    const m = [0, 1024, 2048, 4096][Math.min(3, g.sombras)] || 1024; s.shadow.mapSize.set(m, m);
    const k = 3; Object.assign(s.shadow.camera, { left: -k, right: k, top: k, bottom: -k, near: 0.5, far: 14 }); s.shadow.camera.updateProjectionMatrix(); s.shadow.bias = -0.0004;
    if (s.shadow.map) { s.shadow.map.dispose(); s.shadow.map = null; }
  }
  /* ---- construccion ---- */
  reconstruirTodo() { this.construirSala(); this.construirMesa(); this.construirPaletas(); this.construirBola(); }
  setEquipo(eq) { const c = eq.sala !== this.equipo.sala, m = eq.mesa !== this.equipo.mesa, p = eq.paleta !== this.equipo.paleta; this.equipo = Object.assign({}, eq); if (c) this.construirSala(); if (m) this.construirMesa(); if (p) this.construirPaletas(); }
  setCalidad(aj) {
    const ant = this.snap || {}, g = aj.gr, dalt = aj.ac.daltonismo;
    const rr = ant.antialias !== g.antialias || (ant.sombras > 0) !== (g.sombras > 0);
    const det = ant.detalle !== g.detalle, som = ant.sombras !== g.sombras, col = ant.dalt !== dalt;
    this.aj = aj; this.snap = Object.assign({}, g, { dalt });
    if (rr) { this.crearRenderer(); this.configurarSombra(); } else { this.ratio(); this.r.shadowMap.type = g.sombras >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; if (som) this.configurarSombra(); }
    if (det || rr) this.reconstruirTodo(); else if (col) { this.construirMesa(); this.bola.material.color.set(this.colores().bola); }
    this.estela.length = 0; if (this.linea) this.linea.visible = !!g.estela && !aj.ac.reducir;
    this.redimensionar();
  }
  colores() {
    const d = this.aj.ac.daltonismo, m = item('mesas', this.equipo.mesa);
    if (d === 'alto_contraste') return { mesa: '#101010', borde: '#ffff00', bola: '#ff7a00' };
    if (d === 'azul_naranja') return { mesa: '#10306b', borde: '#ffffff', bola: '#ff8a1a' };
    return { mesa: m.color, borde: m.borde, bola: '#fff8ee' };
  }
  construirMesa() {
    if (this.mesa) { this.escena.remove(this.mesa); lim(this.mesa); }
    const col = this.colores(), m = item('mesas', this.equipo.mesa), g = new THREE.Group(), std = this.aj.gr.detalle >= 2;
    const Mat = std ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    const tex = lienzo(560, 1024, (x, w, h) => {
      x.fillStyle = col.mesa; x.fillRect(0, 0, w, h);
      if (m.brillo) { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(60,245,255,.25)'); gr.addColorStop(1, 'rgba(255,79,216,.2)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }
      x.strokeStyle = col.borde; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
      x.lineWidth = 5; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.lineWidth = 3; x.globalAlpha = 0.5; x.stroke();
    });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(C.W, C.L), new Mat({ map: tex, roughness: 0.35, metalness: 0 })); top.rotation.x = -Math.PI / 2; top.position.y = C.H + 0.0005; top.receiveShadow = true; g.add(top);
    const caja = new THREE.Mesh(new THREE.BoxGeometry(C.W, 0.04, C.L), new Mat({ color: new THREE.Color(col.mesa).multiplyScalar(0.6) })); caja.position.y = C.H - 0.02; caja.castShadow = true; g.add(caja);
    const pata = new THREE.MeshLambertMaterial({ color: 0x20232b });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, C.H - 0.04, 0.06), pata); p.position.set(sx * (C.W / 2 - 0.12), (C.H - 0.04) / 2, sz * (C.L / 2 - 0.2)); p.castShadow = true; g.add(p); }
    const W2 = C.W + C.redExtra * 2, nt = lienzo(256, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(20,20,24,.35)'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; for (let i = 0; i <= w; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 0; j <= h; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); } x.fillStyle = '#fff'; x.fillRect(0, 0, w, 5); });
    const red = new THREE.Mesh(new THREE.PlaneGeometry(W2, C.redH), new THREE.MeshBasicMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, depthWrite: false })); red.position.set(0, C.H + C.redH / 2, 0); red.rotation.y = Math.PI / 2; red.rotation.y = 0; g.add(red);
    const poste = new THREE.MeshLambertMaterial({ color: 0x15151a });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, C.redH + 0.02, 8), poste); p.position.set(s * W2 / 2, C.H + C.redH / 2, 0); g.add(p); }
    this.mesa = g; this.escena.add(g);
    if (this.bola) this.bola.material.color.set(col.bola);
  }
  construirPaletas() {
    this.paletas.forEach((p) => { this.escena.remove(p.g); lim(p.g); }); this.paletas = [];
    const pd = item('paletas', this.equipo.paleta);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group(), c1 = i % 2 === 0 ? pd.caras[0] : '#2a6cd6', c2 = i % 2 === 0 ? pd.caras[1] : '#16161a';
      const seg = this.aj.gr.detalle >= 2 ? 32 : 16;
      const cara = (c, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.006, seg), new THREE.MeshLambertMaterial({ color: c })); m.rotation.x = Math.PI / 2; m.position.z = z; m.castShadow = true; return m; };
      const madera = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, seg), new THREE.MeshLambertMaterial({ color: pd.mango })); madera.rotation.x = Math.PI / 2;
      g.add(madera, cara(c1, 0.006), cara(c2, -0.006));
      const mango = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.1, 0.02), new THREE.MeshLambertMaterial({ color: pd.mango })); mango.position.y = -0.115; mango.castShadow = true; g.add(mango);
      const color = new THREE.Color(this.jugColores[i]);
      const mano = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), new THREE.MeshLambertMaterial({ color })); mano.position.set(0, -0.19, 0); g.add(mano);
      const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.34, 10), new THREE.MeshLambertMaterial({ color })); brazo.position.set(0, -0.3, 0.12); brazo.rotation.x = 0.55; g.add(brazo);
      g.visible = false; this.escena.add(g); this.paletas.push({ g, brazo });
    }
  }
  setColores(cols) { this.jugColores = cols; this.construirPaletas(); }
  construirBola() {
    if (this.bola) { this.escena.remove(this.bola); lim(this.bola); }
    if (this.sombraBola) { this.escena.remove(this.sombraBola); lim(this.sombraBola); }
    const tex = lienzo(128, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#d0381f'; x.fillRect(0, h * 0.42, w, h * 0.16); x.fillStyle = '#222'; x.beginPath(); x.arc(w * 0.25, h * 0.5, 6, 0, 7); x.fill(); x.beginPath(); x.arc(w * 0.75, h * 0.5, 6, 0, 7); x.fill(); });
    const Mat = this.aj.gr.detalle >= 2 ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    const seg = this.aj.gr.detalle >= 2 ? 24 : 12;
    this.bola = new THREE.Mesh(new THREE.SphereGeometry(C.R, seg, Math.max(8, seg / 2)), new Mat({ map: tex, color: this.colores().bola, roughness: 0.4 }));
    this.bola.castShadow = true; this.escena.add(this.bola);
    this.sombraBola = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false })); this.sombraBola.rotation.x = -Math.PI / 2; this.escena.add(this.sombraBola);
    if (this.linea) { this.escena.remove(this.linea); lim(this.linea); }
    const N = 28, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); this.estelaN = N;
    this.linea = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); this.linea.frustumCulled = false; this.linea.visible = !!this.aj.gr.estela && !this.aj.ac.reducir; this.escena.add(this.linea);
    this.marca = this.marca || null;
    if (this.marca) { this.escena.remove(this.marca); lim(this.marca); }
    this.marca = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.7, depthWrite: false })); this.marca.rotation.x = -Math.PI / 2; this.marca.visible = false; this.escena.add(this.marca);
    this.qBola = new THREE.Quaternion();
    this.anillos.forEach((a) => { this.escena.remove(a.m); lim(a.m); }); this.anillos = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; this.escena.add(m); this.anillos.push({ m, t: 9 }); }
  }
  construirSala() {
    if (this.sala) { this.escena.remove(this.sala); lim(this.sala); }
    const g = new THREE.Group(), det = this.aj.gr.detalle, id = this.equipo.sala;
    const L = (c) => new THREE.MeshLambertMaterial({ color: c });
    const plano = (w, h, mat, x, y, z, rx = 0, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; g.add(m); return m; };
    let fondo = 0x10131c, niebla = null, piso, pared = 0x2a3042;
    if (id === 'gimnasio') {
      piso = new THREE.MeshLambertMaterial({ map: lienzo(512, 512, (x, w, h) => { x.fillStyle = '#b98a52'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#c4955c' : '#a97b46'; x.fillRect(0, i * 32, w, 30); } x.strokeStyle = '#f4f4f4'; x.lineWidth = 6; x.strokeRect(40, 40, w - 80, h - 80); }) }); piso.map.wrapS = piso.map.wrapT = THREE.RepeatWrapping; piso.map.repeat.set(5, 5);
      fondo = 0x1a2233; pared = 0xd9dde6;
    } else if (id === 'club') { piso = L(0x0d0b16); fondo = 0x07050d; pared = 0x1b0f2e; }
    else if (id === 'azotea') { piso = L(0x8a8f99); fondo = 0x86b7e8; niebla = [0x86b7e8, 14, 50]; pared = 0; }
    else if (id === 'espacio') { piso = new THREE.MeshLambertMaterial({ color: 0x0c1a2e }); fondo = 0x02030a; pared = 0; }
    else { piso = L(0x2a2d36); fondo = 0x0b0d14; pared = 0x151822; }
    this.escena.background = new THREE.Color(fondo); this.escena.fog = niebla ? new THREE.Fog(niebla[0], niebla[1], niebla[2]) : null;
    plano(30, 30, piso, 0, 0, 0, -Math.PI / 2);
    const cfg = { gimnasio: [0xffffff, 0.75, 0xfff2dd], club: [0x8a6cff, 0.35, 0xff4fd8], azotea: [0xffffff, 0.85, 0xfff0cc], espacio: [0x6a7cff, 0.45, 0x9fd0ff], estadio: [0xffffff, 0.55, 0xffffff] }[id];
    this.hemi.color.set(cfg[0]); this.hemi.intensity = cfg[1]; this.sol.color.set(cfg[2]); this.sol.intensity = id === 'club' ? 1.1 : 1.0;
    if (pared) { const pm = L(pared); plano(30, 30, pm, 0, 8, 0, Math.PI / 2); plano(30, 8, pm, 0, 4, -9, 0, 0); plano(30, 8, pm, 0, 4, 9, 0, Math.PI); plano(30, 8, pm, -9, 4, 0, 0, Math.PI / 2); plano(30, 8, pm, 9, 4, 0, 0, -Math.PI / 2); }
    const emi = (c) => new THREE.MeshBasicMaterial({ color: c });
    if (id === 'gimnasio') {
      for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.04), emi(i % 2 ? 0x3d7bf5 : 0xf5503d)); b.position.set(i * 3, 3.3, -8.9); g.add(b); }
      if (det > 0) for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.4), emi(0xffffff)); l.position.set(i * 2.5, 6, 0); g.add(l); }
    } else if (id === 'club') {
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3 + i % 3, 0.08), emi(i % 2 ? 0x3df5ff : 0xff4fd8)); b.position.set(-7.5 + i * 3, 1.8, -8.8); g.add(b); }
      if (det > 0) { const s = new THREE.PointLight(0xff4fd8, 8, 9); s.position.set(-2, 3, 1); const s2 = new THREE.PointLight(0x3df5ff, 8, 9); s2.position.set(2, 3, -1); g.add(s, s2); }
    } else if (id === 'azotea') {
      const n = det > 1 ? 40 : 18; for (let i = 0; i < n; i++) { const hgt = 3 + (i * 7 % 11), b = new THREE.Mesh(new THREE.BoxGeometry(2.2, hgt, 2.2), L(0x5b6f8c)); b.position.set(-30 + i * 1.6 + (i % 3), hgt / 2 - 0.1, -14 - (i % 4) * 3); g.add(b); }
    } else if (id === 'espacio') {
      const n = det > 1 ? 800 : 250, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 - 0.1, r = 40; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(e) * r + 8; pos[i * 3 + 2] = Math.sin(a) * r; }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.add(new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 })));
      const pl = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshLambertMaterial({ color: 0x3a6fd0, emissive: 0x0a1a40 })); pl.position.set(-14, 9, -28); g.add(pl);
      const rej = new THREE.GridHelper(30, 30, 0x3df5ff, 0x16345a); rej.position.y = 0.01; g.add(rej);
    } else {
      const filas = det > 1 ? 7 : 4; for (let f = 0; f < filas; f++) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 1.2), L(f % 2 ? 0x2c3144 : 0x3a3f56)); b.position.set(0, 0.25 + f * 0.5, s * (6 + f * 1.1)); g.add(b); }
      if (det > 1) { const n = 220, c = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.4, 0.2), new THREE.MeshLambertMaterial({ color: 0xffffff }), n), d = new THREE.Object3D(), col = new THREE.Color(); for (let i = 0; i < n; i++) { const f = i % filas, s = i % 2 ? 1 : -1; d.position.set(((i * 37) % 17) - 8.5, 0.75 + f * 0.5, s * (6.1 + f * 1.1)); d.updateMatrix(); c.setMatrixAt(i, d.matrix); col.setHSL((i * 0.137) % 1, 0.6, 0.55); c.setColorAt(i, col); } g.add(c); }
      for (const s of [-1, 1]) { const f = new THREE.PointLight(0xffffff, det > 0 ? 6 : 0, 14); f.position.set(s * 4, 5, 0); g.add(f); }
    }
    this.sala = g; this.escena.add(g);
  }
  /* ---- cada cuadro ---- */
  redimensionar() {
    const w = this.cont.clientWidth || innerWidth, h = this.cont.clientHeight || innerHeight; this.ancho = w; this.alto = h;
    this.r.setSize(w, h, false); this.r.domElement.style.width = '100%'; this.r.domElement.style.height = '100%';
    this.camara.aspect = w / h; this.camara.fov = w / h < 1 ? 60 : 55; this.camara.updateProjectionMatrix(); this.colocarCamara(0, true);
  }
  colocarCamara(dx = 0, forzar) {
    const a = this.camara.aspect, v = this.vista, vf = this.camara.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * a);
    const d = Math.max(a > 1.2 ? 2.5 : 1.55, 1.02 / Math.tan(hf)), z = C.L / 2 + d * 0.82, y = C.H + 0.45 + d * 0.45;
    this.camPos = this.camPos || new THREE.Vector3();
    this.camPos.set(dx * v, y, v * z);
    this.camara.position.copy(this.camPos); this.camara.lookAt(dx * 0.3 * v, C.H + 0.02, -v * (a < 1 ? 0.5 : 0.25));
  }
  anillo(x, z, color, esc = 0.08) { const a = this.anillos.find((o) => o.t > 0.5) || this.anillos[0]; a.t = 0; a.esc = esc; a.m.position.set(x, C.H + 0.003, z); a.m.material.color.set(color); a.m.visible = true; }
  anilloAire(x, y, z, color) { const a = this.anillos.find((o) => o.t > 0.5) || this.anillos[0]; a.t = 0; a.esc = 0.1; a.m.position.set(x, y, z); a.m.material.color.set(color); a.m.visible = true; a.m.lookAt(this.camara.position); }
  /* e: {bola:{x,y,z,wx,wy,wz}, jug:[{px,lado,swing,activo}], marca:{x,z}|null} */
  actualizar(e, dt) {
    this.t += dt;
    const b = e.bola, reduce = this.aj.ac.reducir;
    this.bola.position.set(b.x, b.y, b.z);
    const w = Math.hypot(b.wx, b.wy, b.wz);
    if (w > 1) { const ang = Math.min(w * dt * 0.1, 0.8); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(b.wx / w, b.wy / w, b.wz / w), ang); this.bola.quaternion.premultiply(q); }
    this.sombraBola.position.set(b.x, C.H + 0.002, b.z); const alt = Math.max(0, b.y - C.H);
    const sobre = Math.abs(b.x) < C.W / 2 + 0.05 && Math.abs(b.z) < C.L / 2 + 0.05 && b.y > C.H;
    this.sombraBola.visible = sobre && this.aj.gr.sombras < 2; this.sombraBola.scale.setScalar(1 + alt * 0.8); this.sombraBola.material.opacity = Math.max(0.1, 0.45 - alt * 0.3);
    if (this.linea.visible) {
      const p = this.linea.geometry.attributes.position, N = this.estelaN;
      for (let i = N - 1; i > 0; i--) { p.array[i * 3] = p.array[(i - 1) * 3]; p.array[i * 3 + 1] = p.array[(i - 1) * 3 + 1]; p.array[i * 3 + 2] = p.array[(i - 1) * 3 + 2]; }
      p.array[0] = b.x; p.array[1] = b.y; p.array[2] = b.z; p.needsUpdate = true;
      this.linea.visible = e.vivo !== false;
    }
    if (e.marca && this.aj.gr.guia) { this.marca.visible = true; this.marca.position.set(e.marca.x, C.H + 0.004, e.marca.z); this.marca.scale.setScalar(1 + 0.15 * Math.sin(this.t * 8)); } else this.marca.visible = false;
    e.jug.forEach((j, i) => {
      const p = this.paletas[i]; if (!p) return; p.g.visible = !!j.activo; if (!j.activo) return;
      const s = j.swing, k = s > 0 ? Math.sin(Math.min(1, s / 1.2) * Math.PI) : 0, lado = j.lado;
      const y = ALTO_PALETA + (j.alto || 0) + k * 0.05, z = lado * (ZPLANO - 0.15) - lado * k * 0.45;
      p.g.position.set(j.px, y, z);
      p.g.rotation.set(0, lado > 0 ? 0 : Math.PI, 0);
      p.g.rotateX(-0.35 * k); p.g.rotateZ(-0.5 * k * (j.lado));
    });
    this.anillos.forEach((a) => { if (a.t > 0.5) { a.m.visible = false; return; } a.t += dt * (reduce ? 3 : 1.6); const f = Math.min(1, a.t / 0.5); a.m.scale.setScalar(a.esc * (0.4 + f * 1.4)); a.m.material.opacity = 0.7 * (1 - f); });
    this.colocarCamara(reduce ? 0 : Math.max(-0.5, Math.min(0.5, b.x * 0.18)));
  }
  dibujar() { this.r.render(this.escena, this.camara); }
  /* Punto de pantalla -> x de la mesa en el plano del campo rival (para apuntar con puntero). */
  destruir() { lim(this.escena); this.r.dispose(); this.r.domElement.remove(); }
}
