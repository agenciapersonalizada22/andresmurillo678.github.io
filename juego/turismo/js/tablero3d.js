// Escena 3D ligera del tablero: textura unica, fichas, edificios, dados y camara.
import * as THREE from '../lib/three.module.min.js';
import { dibujarTablero, dibujarGlobo } from './textura.js';
import { rectCasilla, casillaEn, punto, angulo, TAM, RB, RIN, ROUT, RMED, DT } from './geometria.js';
import { crearFicha, crearAtraccion, crearHotel, crearDado, rotacionDado } from './piezas.js';
import { COMPRABLE, CASILLAS, colorCont } from './datos.js';

const DADO_X = [-0.65, 0.65], DADO_Z = 1.55;

const ease = (t) => t * t * (3 - 2 * t);
const rad = Math.PI / 180;

export function crearTablero(cont, cfg) {
  const T = { vis: null, ocupado: 0, fps: 60, alTocar: null, alHover: null, alPaso: null, alCalidad: null };
  let g = cfg.gfx, ac = cfg.acc;
  const renderer = new THREE.WebGLRenderer({ antialias: g.antialias, powerPreference: 'high-performance' });
  renderer.domElement.className = 'lienzo'; cont.appendChild(renderer.domElement);
  const escena = new THREE.Scene(); escena.background = new THREE.Color(0x0a1018);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
  escena.add(new THREE.HemisphereLight(0xdfeaff, 0x30303a, 1.05));
  const sol = new THREE.DirectionalLight(0xfff2dd, 1.1); sol.position.set(5, 12, 7); escena.add(sol);
  const raiz = new THREE.Group(); escena.add(raiz);

  // mesa y tablero
  const mesa = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0x0f1a26 })); mesa.rotation.x = -Math.PI / 2; mesa.position.y = -0.15; raiz.add(mesa);
  const lienzoTex = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(lienzoTex); tex.anisotropy = 4;
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(RB + 0.15, RB + 0.3, 0.3, 72), new THREE.MeshLambertMaterial({ color: 0x4a3420 })); cuerpo.position.y = -0.15; raiz.add(cuerpo);
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(RB + 0.15, 96), new THREE.MeshLambertMaterial({ map: tex })); tapa.rotation.x = -Math.PI / 2; tapa.position.y = 0.002; tapa.receiveShadow = true; raiz.add(tapa);
  function pintarTextura() {
    dibujarTablero(lienzoTex, g.texTablero || 1536, { simbolos: ac.simbolos, contraste: ac.altoContraste });
    tex.needsUpdate = true;
  }
  pintarTextura();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { pintarTextura(); });
  // globo giratorio
  const globoCv = document.createElement('canvas'); dibujarGlobo(globoCv);
  const globo = new THREE.Mesh(new THREE.SphereGeometry(1.0, 36, 24), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(globoCv) }));
  globo.position.y = 1.25; globo.rotation.z = 0.4; raiz.add(globo);
  const peana = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.2, 20), new THREE.MeshLambertMaterial({ color: 0xc9a14a })); peana.position.y = 0.1; raiz.add(peana);
  const soporte = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0xc9a14a })); soporte.position.y = 0.4; raiz.add(soporte);

  // sectores (marcadores, cursor, eventos)
  const sectores = {};
  function sector(i, r1, r2) {
    const k = i + '_' + r1 + '_' + r2;
    if (!sectores[k]) { const t0 = -Math.PI / 2 - angulo(i) - DT / 2; sectores[k] = new THREE.RingGeometry(r1, r2, 8, 1, t0 + 0.01, DT - 0.02); }
    return sectores[k];
  }
  const marcas = [], edif = [], cruces = [], overl = [];
  const matCruz = new THREE.MeshBasicMaterial({ color: 0x151515 }), geoCruz = new THREE.BoxGeometry(0.5, 0.02, 0.07);
  for (let i = 0; i < 40; i++) {
    if (!COMPRABLE[i]) { marcas.push(null); edif.push(null); cruces.push(null); overl.push(null); continue; }
    const m = new THREE.Mesh(sector(i, ROUT - 0.16, ROUT), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.visible = false; raiz.add(m); marcas.push(m);
    const e = new THREE.Group(); raiz.add(e); edif.push(e);
    const x = new THREE.Group();
    [0.785, -0.785].forEach((an) => { const bb = new THREE.Mesh(geoCruz, matCruz); bb.rotation.y = an; x.add(bb); });
    const c0 = punto(i, RMED); x.position.set(c0.x, 0.03, c0.z); x.visible = false; raiz.add(x); cruces.push(x);
    const o = new THREE.Mesh(sector(i, RIN, ROUT), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    o.rotation.x = -Math.PI / 2; o.position.y = 0.018; o.visible = false; raiz.add(o); overl.push(o);
  }

  // fichas
  const fichas = [];
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  aro.rotation.x = -Math.PI / 2; aro.position.y = 0.02; aro.visible = false; raiz.add(aro);
  function lugar(j, i, ret) {
    const col = j % 3, fila = Math.floor(j / 3) % 2;
    let r = RMED + (col - 1) * 0.5, dt = (fila - 0.5) * 0.34;
    if (i === 10) { if (ret) { r = RIN + 0.55; dt = (col - 1) * 0.0 + (fila - 0.5) * 0.3; } else { r = ROUT - 0.45 + (col - 1) * 0.12; dt = (fila - 0.5) * 0.3; } }
    const p = punto(i, r, dt); return new THREE.Vector3(p.x, 0, p.z);
  }

  // dados
  const dados = [crearDado(), crearDado()];
  dados.forEach((d, k) => { d.position.set(DADO_X[k], 0.31, DADO_Z); d.visible = false; raiz.add(d); });

  // cursor
  const cursorM = new THREE.Mesh(sector(0, RIN, ROUT), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthTest: false }));
  cursorM.rotation.x = -Math.PI / 2; cursorM.position.y = 0.05; cursorM.visible = false; cursorM.renderOrder = 5; raiz.add(cursorM);
  let cursorI = -1;

  // particulas
  const NP = 90, ppos = new Float32Array(NP * 3), pvel = new Float32Array(NP * 3), pvida = new Float32Array(NP), pcol = new Float32Array(NP * 3);
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const puntos = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false })); puntos.frustumCulled = false; raiz.add(puntos);
  let pn = 0;
  T.chispas = (x, z, color, n) => {
    if (!g.particulas || ac.reducirMov) return;
    const c = new THREE.Color(color || '#ffd23d');
    for (let k = 0; k < (n || 24); k++) {
      const a = pn++ % NP, ang = Math.random() * 6.28, v = 0.8 + Math.random() * 2;
      ppos.set([x, 0.3, z], a * 3); pvel.set([Math.cos(ang) * v, 3 + Math.random() * 3, Math.sin(ang) * v], a * 3); pvida[a] = 1; pcol.set([c.r, c.g, c.b], a * 3);
    }
  };

  /* ---------- camara ---------- */
  const C = { yaw: 0, pitch: 62 * rad, dist: 30, tx: 0, tz: 0, zoom: 1 }, M = { yaw: 0, pitch: 62 * rad, tx: 0, tz: 0, zoom: 1 };
  let ancho = 1, alto = 1, fitD = 30, mTop = 0, mBot = 0;
  function ajustar() {
    const util = Math.max(120, alto - mTop - mBot), asp = ancho / alto, t = Math.tan(cam.fov * rad / 2);
    fitD = Math.max((TAM * Math.sin(Math.max(M.pitch, 0.9)) * 0.5 + 0.7) / (t * util / alto), (TAM / 2 + 0.95) / (t * asp));
  }
  function aplicarCam() {
    const d = fitD * C.zoom, cp = Math.cos(C.pitch);
    cam.position.set(C.tx + d * Math.sin(C.yaw) * cp, d * Math.sin(C.pitch), C.tz + d * Math.cos(C.yaw) * cp);
    cam.lookAt(C.tx, 0, C.tz);
  }
  T.camara = {
    reset() { M.yaw = 0; M.pitch = 62 * rad; M.tx = M.tz = 0; M.zoom = 1; ajustar(); },
    cenital() { M.pitch = M.pitch > 80 * rad ? 62 * rad : 89 * rad; M.yaw = 0; ajustar(); },
    rotar(d) { M.yaw += d; },
    inclinar(d) { M.pitch = Math.max(25 * rad, Math.min(89 * rad, M.pitch + d)); ajustar(); },
    zoom(f) { M.zoom = Math.max(0.3, Math.min(1.25, M.zoom * f)); },
    pan(dx, dz) { M.tx = Math.max(-6, Math.min(6, M.tx + dx)); M.tz = Math.max(-6, Math.min(6, M.tz + dz)); },
    enfocar(i) { const r = rectCasilla(i), k = M.zoom < 0.9 ? 0.7 : 0; M.tx = r.x * k; M.tz = r.z * k; }
  };
  function pxPorUnidad() { return (2 * fitD * C.zoom * Math.tan(cam.fov * rad / 2)) / alto; }

  /* ---------- entrada del puntero ---------- */
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pt = new THREE.Vector3();
  function casillaDePunto(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    v2.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, cam);
    if (!ray.ray.intersectPlane(plano, pt)) return -1;
    return casillaEn(pt.x, pt.z);
  }
  const punt = new Map(); let tap = null, hoverT = 0, distPinza = 0, angPinza = 0;
  const el = renderer.domElement; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (ev) => {
    el.setPointerCapture(ev.pointerId); punt.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, b: ev.button, sh: ev.shiftKey });
    tap = punt.size === 1 ? { x: ev.clientX, y: ev.clientY, t: performance.now(), mov: 0 } : null;
    if (punt.size === 2) { const [a, b] = [...punt.values()]; distPinza = Math.hypot(a.x - b.x, a.y - b.y); angPinza = Math.atan2(b.y - a.y, b.x - a.x); }
  });
  el.addEventListener('pointermove', (ev) => {
    const p = punt.get(ev.pointerId);
    if (!p) { if (ev.pointerType === 'mouse' && T.alHover && performance.now() - hoverT > 60) { hoverT = performance.now(); T.alHover(casillaDePunto(ev.clientX, ev.clientY)); } return; }
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
    if (tap) tap.mov += Math.abs(dx) + Math.abs(dy);
    if (punt.size === 2) {
      const [a, b] = [...punt.values()], d = Math.hypot(a.x - b.x, a.y - b.y), an = Math.atan2(b.y - a.y, b.x - a.x);
      if (distPinza > 0) T.camara.zoom(distPinza / d);
      let da = an - angPinza; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      T.camara.rotar(-da * 0.9); distPinza = d; angPinza = an; tap = null; return;
    }
    if (p.b === 2 || p.sh) { T.camara.rotar(-dx * 0.006 * cfg.sens); T.camara.inclinar(dy * 0.004 * cfg.sens); return; }
    if (tap && tap.mov < 6) return;
    const s = pxPorUnidad(), cy = Math.cos(C.yaw), sy = Math.sin(C.yaw);
    T.camara.pan(-(cy * dx + sy * dy / Math.max(0.35, Math.sin(C.pitch))) * s * cfg.sens, -(-sy * dx + cy * dy / Math.max(0.35, Math.sin(C.pitch))) * s * cfg.sens);
  });
  const soltar = (ev) => {
    const p = punt.get(ev.pointerId); punt.delete(ev.pointerId);
    if (p && tap && ev.type === 'pointerup' && tap.mov < 8 && performance.now() - tap.t < 600 && T.alTocar) T.alTocar(casillaDePunto(ev.clientX, ev.clientY), ev);
    if (!punt.size) tap = null;
  };
  el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  el.addEventListener('wheel', (ev) => { ev.preventDefault(); T.camara.zoom(Math.exp(ev.deltaY * 0.001)); }, { passive: false });
  el.addEventListener('contextmenu', (ev) => ev.preventDefault());

  /* ---------- tweens ---------- */
  const tw = [];
  function anim(dur, fn) {
    return new Promise((res) => {
      if (T.rapido) dur *= 0.25;
      if (ac.reducirMov) dur *= 0.5;
      T.ocupado++; tw.push({ t: 0, dur: Math.max(1, dur * (1 / (ac.velocidad || 1))), fn, res });
    });
  }
  const espera = (ms) => anim(ms, () => {});
  T.espera = espera;

  /* ---------- sincronizacion de estado ---------- */
  function fichaDe(j, color) {
    if (fichas[j]) return fichas[j];
    const f = crearFicha(j, color); f.userData = { tile: 0, activo: false }; raiz.add(f); fichas[j] = f; return f;
  }
  function pintarEdificios(i, c, animar) {
    const grp = edif[i]; if (!grp) return;
    while (grp.children.length) grp.remove(grp.children[0]);
    if (CASILLAS[i].tipo !== 'dest') return;
    const col = colorCont(CASILLAS[i].grupo), r0 = RIN + 0.95, giro = Math.PI - angulo(i);
    const poner = (h, r) => { const p = punto(i, r); h.position.set(p.x, 0, p.z); h.rotation.y = giro; grp.add(h); return h; };
    if (c === 4) { const h = poner(crearHotel(col), r0); if (animar) caer(h, 0); }
    else for (let k = 0; k < c; k++) { const h = poner(crearAtraccion(col, k + 1), r0 + (k - 1) * 0.38); if (animar && k === c - 1) caer(h, 0); }
  }
  function caer(o, y1) { const y0 = 2; return anim(450, (p) => { const q = ease(p); o.position.y = y1 + (1 - q) * y0 * (1 - q) + Math.abs(Math.sin(p * 9)) * 0.12 * (1 - p); }).then(() => { o.position.y = y1; }); }
  function sincronizar(v, parcial) {
    v.jug.forEach((p, j) => {
      const f = fichaDe(j, p.color);
      if (f.userData.mov) return;
      f.visible = !p.quebrado; f.userData.tile = p.pos;
      const l = lugar(j, p.pos, p.carcel); f.position.copy(l);
    });
    v.prop.forEach((q, i) => {
      if (!q) return;
      const m = marcas[i]; m.visible = q.o >= 0;
      if (q.o >= 0) { m.material.color.set(v.jug[q.o].color); m.material.opacity = q.h ? 0.35 : 0.95; }
      cruces[i].visible = !!q.h;
      const ant = edif[i].userData.c || 0;
      if (ant !== q.c) { pintarEdificios(i, q.c, parcial && q.c > ant); edif[i].userData.c = q.c; }
    });
    T.vis = v;
  }
  T.poner = (v) => sincronizar(v, false);
  T.actualizarParcial = (v, i) => { // aplica solo una propiedad visualmente (para animaciones secuenciales)
    const q = v.prop[i], m = marcas[i];
    m.visible = q.o >= 0; if (q.o >= 0) { m.material.color.set(v.jug[q.o].color); m.material.opacity = q.h ? 0.35 : 0.95; }
    cruces[i].visible = !!q.h;
    if ((edif[i].userData.c || 0) !== q.c) { const mas = q.c > (edif[i].userData.c || 0); pintarEdificios(i, q.c, mas); edif[i].userData.c = q.c; }
  };
  T.activo = (j) => { fichas.forEach((f, k) => { if (f) f.userData.activo = k === j; }); aro.visible = j >= 0; T._act = j; };
  T.cursor = (i) => {
    cursorI = i; cursorM.visible = i >= 0;
    if (i >= 0) cursorM.geometry = sector(i, RIN, ROUT);
  };
  T.proyectar = (i) => {
    const r = rectCasilla(i), v = new THREE.Vector3(r.x, 0.2, r.z).project(cam), b = el.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * b.width + b.left, y: (-v.y * 0.5 + 0.5) * b.height + b.top };
  };

  /* ---------- animaciones de eventos ---------- */
  T.dados = (vals) => {
    dados.forEach((d, k) => d.visible = true);
    const jobs = dados.map((d, k) => {
      const dest = new THREE.Vector3(DADO_X[k] + (Math.random() - 0.5) * 0.2, 0.31, DADO_Z + (Math.random() - 0.5) * 0.2), ini = new THREE.Vector3(k ? 3.2 : -3.2, 3.4, 3.2 + Math.random());
      const objetivo = rotacionDado(vals[k], Math.random() * 6.28), spin = new THREE.Euler((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20), qs = new THREE.Quaternion();
      return anim(950, (p) => {
        d.position.lerpVectors(ini, dest, ease(p)); d.position.y = 0.31 + Math.abs(Math.sin(p * 9)) * 0.9 * (1 - p) * (1 - p) + (1 - p) * (1 - p) * 1.2;
        const e = (1 - p) * (1 - p); qs.setFromEuler(new THREE.Euler(spin.x * e, spin.y * e, spin.z * e)); d.quaternion.copy(qs).multiply(objetivo);
      });
    });
    return Promise.all(jobs);
  };
  T.verDados = (vals) => { dados.forEach((d, k) => { d.visible = true; d.position.set(DADO_X[k], 0.31, DADO_Z); d.quaternion.copy(rotacionDado(vals[k], k * 1.3)); }); };
  T.mover = async (j, ruta, vel) => {
    const f = fichas[j]; if (!f) return;
    f.userData.mov = true;
    for (const i of ruta) {
      const a = f.position.clone(), b = lugar(j, i, false);
      await anim(vel || 210, (p) => { f.position.lerpVectors(a, b, p); f.position.y = Math.sin(p * Math.PI) * 0.28; });
      f.position.copy(b); f.userData.tile = i; if (T.alPaso) T.alPaso(j, i);
      if (!ac.reducirMov && ac.camaraAuto) T.camara.enfocar(i);
    }
    f.userData.mov = false;
  };
  T.salto = async (j, i, ret, modo) => {
    const f = fichas[j]; if (!f) return;
    f.userData.mov = true; const a = f.position.clone(), b = lugar(j, i, ret);
    const alto = modo === 'aire' ? 3.2 : modo === 'mar' ? 0.25 : 1.6, dur = modo === 'aire' ? 1100 : modo === 'mar' ? 900 : 650;
    const dx = b.x - a.x, dz = b.z - a.z;
    await anim(dur, (p) => {
      f.position.lerpVectors(a, b, ease(p)); f.position.y = Math.sin(p * Math.PI) * alto;
      if (modo === 'aire' || modo === 'mar') { f.rotation.y = Math.atan2(-dz, dx); if (modo === 'aire') f.rotation.z = Math.sin(p * Math.PI) * 0.35; }
    });
    f.rotation.y = 0; f.rotation.z = 0;
    f.position.copy(b); f.userData.tile = i; f.userData.mov = false;
  };
  T.sello = (i, color) => { const p = punto(i, RMED); T.chispas(p.x, p.z, color || '#ffd23d', 16); const o = overl[i]; if (!o) return Promise.resolve(); return anim(520, (q) => { o.visible = true; o.material.color.set(color || '#ffd23d'); o.material.opacity = 0.5 * (1 - q); }).then(() => { o.material.opacity = 0; refrescarEventos(); }); };
  let eventosAct = [];
  function refrescarEventos() {
    overl.forEach((o) => { if (o) { o.visible = false; o.material.opacity = 0; o.userData.base = 0; } });
    eventosAct.forEach((v) => {
      if (v.tipo === 'alta' || v.tipo === 'baja') CASILLAS.forEach((c) => { if (c.tipo === 'dest' && c.grupo === v.cont) { overl[c.i].visible = true; overl[c.i].userData.base = v.tipo === 'alta' ? 0.38 : 0.3; overl[c.i].material.color.set(v.tipo === 'alta' ? '#ffd23d' : '#4a8ff0'); } });
      else if (v.tipo === 'huelga' || v.tipo === 'tormenta') CASILLAS.forEach((c) => { if (c.tipo === 'trans' && (v.tipo === 'tormenta' ? c.modo === 'mar' : c.modo !== 'mar')) { overl[c.i].visible = true; overl[c.i].userData.base = 0.4; overl[c.i].material.color.set('#e0463c'); } });
      else if (v.tipo === 'oferta') CASILLAS.forEach((c) => { if (c.tipo === 'trans' && c.modo === 'aire') { overl[c.i].visible = true; overl[c.i].userData.base = 0.35; overl[c.i].material.color.set('#6dff6d'); } });
    });
  }
  T.eventos = (lista) => { eventosAct = lista || []; refrescarEventos(); };
  T.compra = (i, color) => { const r = rectCasilla(i); T.chispas(r.x, r.z, color, 30); const m = marcas[i]; return anim(380, (p) => { m.scale.z = 1; m.position.y = 0.012 + Math.sin(p * Math.PI) * 0.3; }).then(() => { m.position.y = 0.012; }); };
  T.quiebra = (j) => { const f = fichas[j]; if (!f) return Promise.resolve(); return anim(700, (p) => { f.scale.setScalar(1 - p); f.rotation.y += 0.3; }).then(() => { f.visible = false; f.scale.setScalar(1); }); };
  T.confeti = () => { for (let k = 0; k < 6; k++) T.chispas((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, ['#ffd23d', '#ff4fd8', '#3df5ff', '#6dff6d'][k % 4], 14); };

  /* ---------- tamano y calidad ---------- */
  function redimensionar() {
    const r = cont.getBoundingClientRect(); ancho = Math.max(2, r.width); alto = Math.max(2, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, g.pixel || 1)); renderer.setSize(ancho, alto, false);
    cam.aspect = ancho / alto; cam.setViewOffset(ancho, alto, 0, (mBot - mTop) / 2, ancho, alto); cam.updateProjectionMatrix(); ajustar();
  }
  new ResizeObserver(redimensionar).observe(cont);
  T.margenes = (top, bot) => { if (Math.abs(top - mTop) + Math.abs(bot - mBot) > 2) { mTop = top; mBot = bot; redimensionar(); } };
  T.configurar = (nuevo) => {
    const tex0 = g.texTablero, sim0 = ac.simbolos, con0 = ac.altoContraste;
    g = nuevo.gfx; ac = nuevo.acc; cfg.sens = nuevo.sens;
    renderer.shadowMap.enabled = !!g.sombras; sol.castShadow = !!g.sombras;
    if (g.sombras) { sol.shadow.mapSize.set(1024, 1024); const s = sol.shadow.camera; s.left = s.bottom = -8; s.right = s.top = 8; s.far = 40; }
    escena.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    if (g.texTablero !== tex0 || ac.simbolos !== sim0 || ac.altoContraste !== con0 || ac.daltonico !== (T._dal || false)) { T._dal = ac.daltonico; pintarTextura(); dibujarGlobo(globoCv); globo.material.map.needsUpdate = true; }
    redimensionar();
  };
  T.configurar({ gfx: g, acc: ac, sens: cfg.sens });
  T.camara.reset();
  Object.assign(C, M, { dist: fitD });

  /* ---------- bucle ---------- */
  const tIni = performance.now(); let ult = tIni, nf = 0, pausado = false, tFps = performance.now(), bajas = 0;
  const reloj = new THREE.Clock();
  function bucle(now) {
    requestAnimationFrame(bucle);
    if (pausado || document.hidden) { ult = now; return; }
    const minDt = g.fpsMax ? 1000 / g.fpsMax - 3 : 0;
    if (now - ult < minDt) return;
    const dt = Math.min(0.1, (now - ult) / 1000); ult = now;
    for (let k = tw.length - 1; k >= 0; k--) {
      const w = tw[k]; w.t += dt * 1000; const p = Math.min(1, w.t / w.dur); w.fn(p);
      if (p >= 1) { tw.splice(k, 1); T.ocupado--; w.res(); }
    }
    const kk = 1 - Math.exp(-dt * 7);
    C.yaw += (M.yaw - C.yaw) * kk; C.pitch += (M.pitch - C.pitch) * kk; C.tx += (M.tx - C.tx) * kk; C.tz += (M.tz - C.tz) * kk; C.zoom += (M.zoom - C.zoom) * kk;
    aplicarCam();
    const t = reloj.elapsedTime;
    fichas.forEach((f, j) => { if (f && f.visible && !f.userData.mov) f.position.y = f.userData.activo ? 0.08 + Math.abs(Math.sin(t * 3)) * 0.12 : 0; if (f && j === T._act) { aro.position.x = f.position.x; aro.position.z = f.position.z; aro.scale.setScalar(1 + Math.sin(t * 4) * 0.08); aro.material.color.set(T.vis ? T.vis.jug[j].color : '#fff'); } });
    if (cursorI >= 0) cursorM.material.opacity = 0.4 + Math.sin(t * 6) * 0.2;
    if (!ac.reducirMov) globo.rotation.y += dt * 0.25;
    overl.forEach((o) => { if (o && o.visible && o.userData.base && !o.userData.anim) o.material.opacity = o.userData.base * (ac.reducirMov ? 1 : 0.75 + Math.sin(t * 2.5) * 0.25); });
    for (let a = 0; a < NP; a++) if (pvida[a] > 0) {
      pvida[a] -= dt * 1.2; pvel[a * 3 + 1] -= 9 * dt;
      for (let c = 0; c < 3; c++) ppos[a * 3 + c] += pvel[a * 3 + c] * dt;
      if (ppos[a * 3 + 1] < 0.05) { ppos[a * 3 + 1] = 0.05; pvel[a * 3 + 1] *= -0.4; }
      if (pvida[a] <= 0) ppos[a * 3 + 1] = -50;
    }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
    renderer.render(escena, cam);
    nf++;
    if (now - tFps > 1000) {
      T.fps = Math.round(nf * 1000 / (now - tFps)); nf = 0; tFps = now;
      if (g.autoCalidad && T.fps < 28 && !T.ocupado && now - tIni > 10000) { if (++bajas >= 4 && g.pixel > 0.8 && T.alCalidad) { bajas = 0; T.alCalidad(); } } else bajas = 0;
    }
  }
  requestAnimationFrame(bucle);
  T.pausar = (p) => { pausado = p; };
  T.renderer = renderer;
  return T;
}
