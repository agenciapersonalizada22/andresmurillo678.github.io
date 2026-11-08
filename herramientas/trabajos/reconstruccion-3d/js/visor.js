/* Visor 3D (modulo ES, Three.js local). Orbita/vuelo, mediciones, cortes, anotaciones, capas, anaglifo, lado a lado, WebXR, comparador, capturas y video. window.R3D.Visor */
import * as THREE from '../lib/three.module.min.js';
const R = window.R3D, Medir = R.Medir, Malla = R.Malla;
const V = R.Visor = { THREE, capas: new Map(), medidas: [], anotaciones: [], herramienta: 'orbita', unidad: { nombre: 'u', k: 1 }, listo: false };
const ev = {};
V.on = (n, f) => { (ev[n] = ev[n] || []).push(f); };
const emit = (n, d) => (ev[n] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } });
V.opc = { punto: 3, atenuar: false, colorNube: 'rgb', apariencia: 'vertice', alambre: false, luz: 1, luzAng: 35, fondo: 'auto', rejilla: true, ejes: false, ipd: 1, estereo: 'off', comparar: 'off', cortina: 0.5, velocidad: 1 };
const corte = V.corte = { x: { on: false, v: 0, inv: false }, y: { on: false, v: 0, inv: false }, z: { on: false, v: 0, inv: false }, contorno: false };
let renderer, scene, cam, mundo, rejilla, ejes, hemi, dir, cont, canvas, over, etq, stereo, planes = [], sucio = true, tam = { w: 300, h: 300 }, raycaster = new THREE.Raycaster();
const orb = { target: new THREE.Vector3(), r: 5, th: 0.7, ph: 1.1 }, vuelo = { yaw: 0, pit: 0 }, mov = { modo: 'orbita' };
let giro = null, grabando = false, escalaEsc = 1, lineas = [], seccionObj = null, xrMundo = null, pendiente = [];
const COL_A = new THREE.Color(1, 0.35, 0.3), COL_B = new THREE.Color(0.3, 0.8, 1);

V.iniciar = function (contenedor) {
  canvas = document.createElement('canvas'); canvas.className = 'r3d-canvas'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Visor 3D: arrastra para orbitar, pellizca para acercar'); canvas.setAttribute('role', 'application');
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false }); } catch (e) { V.error = 'Tu navegador no pudo crear el contexto WebGL: ' + e.message; emit('error', V.error); return false; }
  renderer.localClippingEnabled = true; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.autoClear = false;
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(45, 1, 0.01, 1000); mundo = new THREE.Group(); scene.add(mundo);
  hemi = new THREE.HemisphereLight(0xffffff, 0x556070, 0.9); dir = new THREE.DirectionalLight(0xffffff, 1.2); scene.add(hemi, dir, dir.target);
  rejilla = new THREE.GridHelper(10, 20, 0x8890a8, 0x4a5068); ejes = new THREE.AxesHelper(1); ejes.visible = false; scene.add(rejilla, ejes); stereo = new THREE.StereoCamera();
  contenedor.classList.add('r3d-visor'); cont = contenedor; contenedor.appendChild(canvas);
  over = document.createElement('div'); over.className = 'r3d-over'; contenedor.appendChild(over); etq = document.createElement('div'); etq.className = 'r3d-etqs'; over.appendChild(etq);
  V.cortinaEl = document.createElement('div'); V.cortinaEl.className = 'r3d-cortina'; V.cortinaEl.hidden = true; V.cortinaEl.setAttribute('role', 'slider'); V.cortinaEl.setAttribute('aria-label', 'Divisor antes y después'); V.cortinaEl.tabIndex = 0; over.appendChild(V.cortinaEl);
  V.mira = document.createElement('div'); V.mira.className = 'r3d-mira'; V.mira.hidden = true; over.appendChild(V.mira);
  entradas(); new ResizeObserver(ajustar).observe(contenedor); ajustar(); aplicarFondo(); luces(); actualizarCorte();
  renderer.setAnimationLoop(tick); V.listo = true; sondearXR(); return true;
};
function ajustar() { const w = Math.max(50, cont.clientWidth), h = Math.max(50, cont.clientHeight); tam = { w, h }; renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; cam.aspect = w / h; cam.updateProjectionMatrix(); sucio = true; }
V.pedir = () => { sucio = true; };
function aplicarFondo() { const f = V.opc.fondo, osc = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-tema') !== 'claro' || document.documentElement.getAttribute('data-tema') === 'oscuro'; const c = f === 'claro' ? 0xeef1f9 : f === 'gris' ? 0x808690 : f === 'negro' ? 0x05060a : (osc ? 0x10152a : 0xdfe5f2); renderer.setClearColor(c, 1); sucio = true; }
function luces() { hemi.intensity = 0.55 * V.opc.luz; dir.intensity = 1.1 * V.opc.luz; const a = V.opc.luzAng * Math.PI / 180; dir.position.set(Math.sin(a) * 10, 12, Math.cos(a) * 10); sucio = true; }

/* ---------- capas ---------- */
function coloresAltura(m) { const n = m.pos.length / 3, c = new Float32Array(n * 3), b = Malla.caja(m), h = (b.max[1] - b.min[1]) || 1; for (let i = 0; i < n; i++) { const t = (m.pos[i * 3 + 1] - b.min[1]) / h, r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3))), g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2))), bb = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1))); c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = bb; } return c; }
V.poner = function (def) { // def {id,nombre,malla,grupo,visible,opacidad,color}
  V.quitar(def.id, true); const m = def.malla, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  if (m.idx) { g.setIndex(new THREE.BufferAttribute(m.idx, 1)); g.computeVertexNormals(); }
  def.caja = Malla.caja(m); def.visible = def.visible !== false; def.opacidad = def.opacidad == null ? 1 : def.opacidad; def.grupo = def.grupo || ''; def.color = def.color || '#8fb3ff';
  const obj = m.idx ? new THREE.Mesh(g, new THREE.MeshBasicMaterial()) : new THREE.Points(g, new THREE.PointsMaterial());
  obj.frustumCulled = false; mundo.add(obj); V.capas.set(def.id, { def, obj, g, alt: null }); aplicarMaterial(def.id); enmarcarEscena(); emit('capas'); sucio = true;
};
V.quitar = function (id, silencio) { const c = V.capas.get(id); if (!c) return; mundo.remove(c.obj); c.g.dispose(); c.obj.material.dispose(); V.capas.delete(id); if (!silencio) { enmarcarEscena(); emit('capas'); sucio = true; } };
function aplicarMaterial(id) {
  const c = V.capas.get(id); if (!c) return; const d = c.def, m = d.malla, o = V.opc, esMalla = !!m.idx; let mat; const vc = !!m.col;
  const compar = o.comparar === 'superponer' && d.grupo;
  const geom = c.g, usarCol = (modo) => { // devuelve atributo color segun modo
    if (modo === 'altura') { if (!c.alt) c.alt = coloresAltura(m); geom.setAttribute('color', new THREE.BufferAttribute(c.alt, 3)); return true; }
    if (modo === 'vertice' && vc) { geom.setAttribute('color', new THREE.BufferAttribute(m.col, 3)); return true; } geom.deleteAttribute('color'); return false; };
  if (esMalla) {
    const modo = compar ? 'solido' : o.apariencia;
    if (modo === 'normales') mat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    else { const u = usarCol(modo); mat = new THREE.MeshStandardMaterial({ vertexColors: u, color: compar ? (d.grupo === 'A' ? COL_A : COL_B) : (u ? 0xffffff : new THREE.Color(d.color)), roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide }); }
    mat.wireframe = o.alambre;
  } else {
    const modo = compar ? 'unico' : o.colorNube, u = modo === 'rgb' ? usarCol('vertice') : modo === 'altura' ? usarCol('altura') : (geom.deleteAttribute('color'), false);
    mat = new THREE.PointsMaterial({ size: o.punto, sizeAttenuation: o.atenuar, vertexColors: u, color: compar ? (d.grupo === 'A' ? COL_A : COL_B) : (u ? 0xffffff : (modo === 'rgb' ? 0xdfe6ff : new THREE.Color(d.color))) });
    if (o.atenuar) mat.size = o.punto * escalaEsc * 0.01;
  }
  mat.transparent = d.opacidad < 1 || !!compar; mat.opacity = compar ? Math.min(d.opacidad, 0.65) : d.opacidad; mat.depthWrite = !mat.transparent; mat.clippingPlanes = planes; c.obj.material.dispose(); c.obj.material = mat; c.obj.visible = d.visible; mat.needsUpdate = true; sucio = true;
}
V.actualizarCapa = (id) => { aplicarMaterial(id); emit('capas'); };
V.actualizarTodo = () => { V.capas.forEach((_, id) => aplicarMaterial(id)); luces(); rejilla.visible = V.opc.rejilla; ejes.visible = V.opc.ejes; aplicarFondo(); compararModo(); sucio = true; };
function cajaVisible() { let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], hay = false; V.capas.forEach(c => { if (!c.def.visible && V.capas.size > 1) return; hay = true; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c.def.caja.min[k]); mx[k] = Math.max(mx[k], c.def.caja.max[k]); } }); return hay ? { min: mn, max: mx } : { min: [-1, -1, -1], max: [1, 1, 1] }; }
V.caja = cajaVisible;
function enmarcarEscena() {
  const b = cajaVisible(), s = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) || 1; escalaEsc = s;
  rejilla.scale.setScalar(s / 10 * 1.5); rejilla.position.set((b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2); ejes.scale.setScalar(s * 0.3); ejes.position.set(b.min[0], b.min[1], b.min[2]);
  cam.near = s / 500; cam.far = s * 60; cam.updateProjectionMatrix(); if (V.opc.atenuar) V.actualizarTodo();
}
V.encuadrar = function () {
  const b = cajaVisible(), c = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2), s = escalaEsc;
  orb.target.copy(c); orb.r = s * 1.5 / Math.tan(cam.fov * Math.PI / 360) * 0.55; mov.modo = 'orbita'; sucio = true; emit('estado');
};
V.vistaPred = function (n) { const m = { frente: [0, Math.PI / 2], atras: [Math.PI, Math.PI / 2], izq: [-Math.PI / 2, Math.PI / 2], der: [Math.PI / 2, Math.PI / 2], arriba: [0, 0.001], iso: [0.7, 1.0] }[n]; if (!m) return; orb.th = m[0]; orb.ph = m[1]; mov.modo = 'orbita'; sucio = true; emit('estado'); };

/* ---------- camara ---------- */
function aplicarCam() {
  if (mov.modo === 'orbita') { orb.ph = Math.min(Math.PI - 0.001, Math.max(0.001, orb.ph)); orb.r = Math.max(escalaEsc * 0.02, Math.min(escalaEsc * 40, orb.r)); const s = Math.sin(orb.ph); cam.position.set(orb.target.x + orb.r * s * Math.sin(orb.th), orb.target.y + orb.r * Math.cos(orb.ph), orb.target.z + orb.r * s * Math.cos(orb.th)); cam.up.set(0, 1, 0); cam.lookAt(orb.target); }
  else { vuelo.pit = Math.max(-1.5, Math.min(1.5, vuelo.pit)); cam.rotation.set(vuelo.pit, vuelo.yaw, 0, 'YXZ'); }
}
V.modoCamara = function (m) {
  if (m === mov.modo) return; if (m === 'vuelo') { const d = new THREE.Vector3(); cam.getWorldDirection(d); vuelo.yaw = Math.atan2(-d.x, -d.z); vuelo.pit = Math.asin(d.y); mov.modo = 'vuelo'; }
  else { const d = new THREE.Vector3(); cam.getWorldDirection(d); orb.target.copy(cam.position).addScaledVector(d, orb.r); const v = cam.position.clone().sub(orb.target); orb.r = v.length(); orb.th = Math.atan2(v.x, v.z); orb.ph = Math.acos(v.y / orb.r); mov.modo = 'orbita'; }
  sucio = true; emit('estado');
};
V.modo = () => mov.modo;
function panear(dx, dy) { const k = orb.r * Math.tan(cam.fov * Math.PI / 360) * 2 / tam.h, r = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1); if (mov.modo === 'orbita') orb.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); else cam.position.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); sucio = true; }
function avanzar(f, l) { const d = new THREE.Vector3(); cam.getWorldDirection(d); const r = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), p = escalaEsc * 0.5; if (mov.modo === 'vuelo') cam.position.addScaledVector(d, f * p).addScaledVector(r, l * p); else { orb.r *= Math.pow(1.5, -f); } sucio = true; }

/* ---------- entradas: raton, tacto, teclado ---------- */
function entradas() {
  const ptr = new Map(); let multi = false, d0 = 0, m0 = null;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), b: e.button, shift: e.shiftKey }); if (ptr.size === 2) { multi = true; const [a, b] = [...ptr.values()]; d0 = Math.hypot(a.x - b.x, a.y - b.y); m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } if (ptr.size === 1) multi = false; canvas.focus({ preventScroll: true }); });
  canvas.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptr.size === 1) { if (p.b === 2 || p.b === 1 || p.shift) panear(dx, dy); else if (mov.modo === 'orbita') { orb.th -= dx * 0.008; orb.ph -= dy * 0.008; sucio = true; } else { vuelo.yaw += dx * 0.004; vuelo.pit += dy * 0.004; sucio = true; } }
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if (d0 > 0) { if (mov.modo === 'orbita') orb.r *= d0 / d; else avanzar((d - d0) / tam.h * 3, 0); } panear(m.x - m0.x, m.y - m0.y); d0 = d; m0 = m; sucio = true; }
  });
  const fin = e => { const p = ptr.get(e.pointerId); ptr.delete(e.pointerId); if (!p) return; const mov2 = Math.hypot(e.clientX - p.x0, e.clientY - p.y0); if (!multi && mov2 < 8 && performance.now() - p.t0 < 500 && p.b === 0 && e.type === 'pointerup') { const r = canvas.getBoundingClientRect(); recoger((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, e.clientX - r.left); } if (!ptr.size) multi = false; };
  canvas.addEventListener('pointerup', fin); canvas.addEventListener('pointercancel', fin);
  canvas.addEventListener('wheel', e => { e.preventDefault(); if (mov.modo === 'orbita') orb.r *= Math.exp(e.deltaY * 0.0012); else avanzar(-e.deltaY * 0.002, 0); sucio = true; }, { passive: false });
  canvas.addEventListener('keydown', e => {
    const k = e.key, paso = 0.12; let usado = true;
    if (k === 'ArrowLeft') orb.th += paso; else if (k === 'ArrowRight') orb.th -= paso; else if (k === 'ArrowUp') orb.ph += paso; else if (k === 'ArrowDown') orb.ph -= paso;
    else if (k === '+' || k === '=') avanzar(0.4, 0); else if (k === '-') avanzar(-0.4, 0);
    else if (mov.modo === 'vuelo' && 'wasd'.includes(k.toLowerCase())) avanzar(k === 'w' ? 0.2 : k === 's' ? -0.2 : 0, k === 'd' ? 0.2 : k === 'a' ? -0.2 : 0);
    else if (k === 'f' || k === 'F') V.encuadrar(); else if (k >= '1' && k <= '6') V.vistaPred(['frente', 'atras', 'izq', 'der', 'arriba', 'iso'][+k - 1]);
    else if (k === 'Escape') V.cancelar(); else if (k === 'Enter') V.terminar(); else if (k === 'Delete' || k === 'Backspace') V.deshacer(); else usado = false;
    if (usado) { e.preventDefault(); sucio = true; }
  });
  V.cortinaEl.addEventListener('pointerdown', e => { V.cortinaEl.setPointerCapture(e.pointerId); V.cortinaEl._arr = true; });
  V.cortinaEl.addEventListener('pointermove', e => { if (!V.cortinaEl._arr) return; const r = cont.getBoundingClientRect(); V.opc.cortina = Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width)); sucio = true; });
  V.cortinaEl.addEventListener('pointerup', () => { V.cortinaEl._arr = false; });
  V.cortinaEl.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') V.opc.cortina = Math.max(0.03, V.opc.cortina - 0.03); else if (e.key === 'ArrowRight') V.opc.cortina = Math.min(0.97, V.opc.cortina + 0.03); sucio = true; });
}

/* ---------- seleccion de puntos, mediciones, anotaciones ---------- */
const hecho = { pts: [] }; // medicion en curso
function planosActivos() { return planes; }
function recortado(p) { return planes.some(pl => pl.distanceToPoint(p) < 0); }
V.recogerPunto = function (nx, ny) { // devuelve THREE.Vector3 | null
  if (compararActivo() && V.opc.comparar !== 'superponer') { const w = V.opc.comparar === 'lado' ? 0.5 : V.opc.cortina, px = (nx + 1) / 2; if (V.opc.comparar === 'lado') nx = ((px % 0.5) * 2) * 2 - 1; else void w; }
  raycaster.setFromCamera({ x: nx, y: ny }, cam); const objs = []; V.capas.forEach(c => { if (c.def.visible) objs.push(c.obj); });
  const dist = orb.r || escalaEsc; raycaster.params.Points.threshold = Math.max(escalaEsc * 0.004, dist * Math.tan(cam.fov * Math.PI / 360) * 2 / tam.h * (V.opc.punto + 3) * (V.opc.atenuar ? 1 : 1.2));
  const hits = raycaster.intersectObjects(objs, false).filter(h => !recortado(h.point)); if (!hits.length) return null; return hits[0].point.clone();
};
function recoger(nx, ny) { if (['orbita', 'vuelo', 'nada'].indexOf(V.herramienta) >= 0) return; const p = V.recogerPunto(nx, ny); if (!p) { emit('aviso', 'No toqué ninguna superficie. Toca sobre el modelo.'); return; } puntoElegido(p); }
V.recogerCentro = function () { const p = V.recogerPunto(0, 0); if (p) puntoElegido(p); else emit('aviso', 'La mira no apunta al modelo.'); };
function puntoElegido(p) {
  const h = V.herramienta, a = [p.x, p.y, p.z];
  if (h === 'anotar') { V.anotaciones.push({ id: R.Plano.id('n'), pos: a, texto: 'Nota ' + (V.anotaciones.length + 1) }); emit('medidas'); redibujarMedidas(); sucio = true; return; }
  hecho.pts.push(a); const necesita = h === 'distancia' ? 2 : h === 'angulo' ? 3 : Infinity;
  if (hecho.pts.length >= necesita) V.terminar(); else { redibujarMedidas(); emit('medidas'); }
}
V.terminar = function () {
  const h = V.herramienta, p = hecho.pts; if (!p.length) return;
  if (h === 'distancia' && p.length === 2) V.medidas.push({ id: R.Plano.id('m'), tipo: 'dist', pts: p.slice(), valor: Medir.distancia(p[0], p[1]) });
  else if (h === 'angulo' && p.length === 3) V.medidas.push({ id: R.Plano.id('m'), tipo: 'ang', pts: p.slice(), valor: Medir.angulo(p[0], p[1], p[2]) });
  else if (h === 'area' && p.length >= 3) V.medidas.push({ id: R.Plano.id('m'), tipo: 'area', pts: p.slice(), valor: Medir.areaPoligono(p), perim: Medir.perimetro(p, true), plano: Medir.desvioPlano(p) / (escalaEsc || 1) });
  else if (h === 'distancia' || h === 'angulo' || h === 'area') { emit('aviso', h === 'area' ? 'El área necesita al menos 3 puntos.' : 'Faltan puntos.'); return; }
  hecho.pts = []; redibujarMedidas(); emit('medidas'); sucio = true;
};
V.cancelar = () => { hecho.pts = []; redibujarMedidas(); emit('medidas'); };
V.deshacer = () => { if (hecho.pts.length) hecho.pts.pop(); else V.medidas.pop(); redibujarMedidas(); emit('medidas'); };
V.pendientes = () => hecho.pts.length;
V.borrarMedida = id => { V.medidas = V.medidas.filter(m => m.id !== id); redibujarMedidas(); emit('medidas'); };
V.borrarNota = id => { V.anotaciones = V.anotaciones.filter(m => m.id !== id); redibujarMedidas(); emit('medidas'); };
V.editarNota = (id, t) => { const n = V.anotaciones.find(x => x.id === id); if (n) { n.texto = t; redibujarMedidas(); } };
V.restaurarMedidas = (med, notas) => { V.medidas = med || []; V.anotaciones = notas || []; hecho.pts = []; redibujarMedidas(); emit('medidas'); };
V.herr = function (h) { V.herramienta = h; hecho.pts = []; redibujarMedidas(); canvas.style.cursor = ['orbita', 'vuelo', 'nada'].indexOf(h) >= 0 ? 'grab' : 'crosshair'; if (h === 'vuelo') V.modoCamara('vuelo'); else if (h === 'orbita') V.modoCamara('orbita'); emit('herramienta', h); };
const fmt = (v, k) => { const x = v * k; return (Math.abs(x) >= 100 ? x.toFixed(1) : Math.abs(x) >= 1 ? x.toFixed(2) : x.toPrecision(3)); };
V.txtMedida = m => m.tipo === 'dist' ? fmt(m.valor, V.unidad.k) + ' ' + V.unidad.nombre : m.tipo === 'ang' ? m.valor.toFixed(1) + '°' : fmt(m.valor, V.unidad.k * V.unidad.k) + ' ' + V.unidad.nombre + '²';
function redibujarMedidas() {
  lineas.forEach(o => { mundo.remove(o); o.geometry.dispose(); o.material.dispose(); }); lineas = []; etq.textContent = ''; V._et = [];
  const r = Math.max(escalaEsc * 0.006, 1e-6), matL = (c) => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true }), matS = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false });
  function marca(p, c) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), matS(c)); s.position.set(p[0], p[1], p[2]); s.renderOrder = 10; mundo.add(s); lineas.push(s); }
  function linea(pts, c, cerrado) { const arr = pts.slice(); if (cerrado) arr.push(pts[0]); const g = new THREE.BufferGeometry().setFromPoints(arr.map(p => new THREE.Vector3(p[0], p[1], p[2]))), l = new THREE.Line(g, matL(c)); l.renderOrder = 9; mundo.add(l); lineas.push(l); }
  function texto(pos, t, cls) { const e = document.createElement('div'); e.className = 'r3d-etq ' + (cls || ''); e.textContent = t; etq.appendChild(e); V._et.push({ e, pos: new THREE.Vector3(pos[0], pos[1], pos[2]) }); }
  V.medidas.forEach(m => { const c = m.tipo === 'dist' ? 0xffd43b : m.tipo === 'ang' ? 0xff922b : 0x69db7c; m.pts.forEach(p => marca(p, c)); linea(m.pts, c, m.tipo === 'area'); const mid = m.pts.reduce((a, p) => [a[0] + p[0] / m.pts.length, a[1] + p[1] / m.pts.length, a[2] + p[2] / m.pts.length], [0, 0, 0]); texto(m.tipo === 'dist' ? [(m.pts[0][0] + m.pts[1][0]) / 2, (m.pts[0][1] + m.pts[1][1]) / 2, (m.pts[0][2] + m.pts[1][2]) / 2] : m.tipo === 'ang' ? m.pts[1] : mid, V.txtMedida(m), 'm'); });
  hecho.pts.forEach(p => marca(p, 0xffffff)); if (hecho.pts.length > 1) linea(hecho.pts, 0xffffff, false);
  V.anotaciones.forEach((n, i) => { marca(n.pos, 0xff6b6b); texto(n.pos, (i + 1) + ' · ' + n.texto, 'n'); });
  sucio = true;
}
function etiquetas() {
  const mostrar = V.opc.estereo === 'off' && V.opc.comparar === 'off' && !grabando; etq.style.display = mostrar ? '' : 'none'; if (!mostrar || !V._et) return; const v = new THREE.Vector3();
  V._et.forEach(o => { v.copy(o.pos).project(cam); const ok = v.z < 1 && v.z > -1; o.e.style.display = ok ? '' : 'none'; if (ok) o.e.style.transform = 'translate(' + ((v.x + 1) / 2 * tam.w) + 'px,' + ((1 - v.y) / 2 * tam.h) + 'px) translate(-50%,-120%)'; });
}

/* ---------- cortes y secciones ---------- */
function actualizarCorte() {
  planes.length = 0; const b = cajaVisible(), ejes = ['x', 'y', 'z'];
  ejes.forEach((k, i) => { const c = corte[k]; if (!c.on) return; const v = b.min[i] + (b.max[i] - b.min[i]) * c.v, n = new THREE.Vector3(); n.setComponent(i, c.inv ? -1 : 1); planes.push(new THREE.Plane(n, c.inv ? v : -v)); });
  V.capas.forEach(c => { c.obj.material.clippingPlanes = planes; c.obj.material.clipShadows = false; c.obj.material.needsUpdate = true; });
  dibujarSeccion(); sucio = true;
}
V.actualizarCorte = actualizarCorte;
V.seccionInfo = null;
function dibujarSeccion() {
  if (seccionObj) { mundo.remove(seccionObj); seccionObj.geometry.dispose(); seccionObj.material.dispose(); seccionObj = null; } V.seccionInfo = null; if (!corte.contorno) return;
  const b = cajaVisible(), ejes = ['x', 'y', 'z'], i = ejes.findIndex(k => corte[k].on); if (i < 0) return; const n = [0, 0, 0]; n[i] = 1; const d = b.min[i] + (b.max[i] - b.min[i]) * corte[ejes[i]].v; let segs = [], L = 0, A = 0;
  V.capas.forEach(c => { if (!c.def.visible || !c.def.malla.idx) return; const s = Medir.contorno(c.def.malla, n, d); if (s.length) { segs.push(s); L += Medir.longitudSegmentos(s); A += Medir.areaSeccion(s, n); } });
  if (!segs.length) return; const tot = segs.reduce((a, s) => a + s.length, 0), arr = new Float32Array(tot); let o = 0; segs.forEach(s => { arr.set(s, o); o += s.length; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); seccionObj = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xff3b6b, depthTest: false })); seccionObj.renderOrder = 8; mundo.add(seccionObj); V.seccionInfo = { eje: ejes[i], longitud: L, area: A };
}

/* ---------- comparador ---------- */
const compararActivo = () => V.opc.comparar !== 'off';
function compararModo() { V.cortinaEl.hidden = V.opc.comparar !== 'cortina'; V.capas.forEach((_, id) => { if (V.opc.comparar === 'superponer' || V._cmpAnt === 'superponer') aplicarMaterial(id); }); V._cmpAnt = V.opc.comparar; sucio = true; }
V.compararModo = compararModo;
V.compararStats = function (idA, idB) { const a = V.capas.get(idA), b = V.capas.get(idB); if (!a || !b) return null; return Medir.comparar(a.def.malla, b.def.malla); };

/* ---------- dibujo ---------- */
function vis(pred) { V.capas.forEach(c => { c.obj.visible = c.def.visible && pred(c.def); }); }
function pasada(x, y, w, h, camara, pred) { renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true); vis(pred); renderer.clearDepth(); renderer.render(scene, camara); }
function dibujar() {
  const W = tam.w, H = tam.h, o = V.opc, gl = renderer.getContext(); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); renderer.clear(true, true, true); cam.aspect = W / H; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const dist = mov.modo === 'orbita' ? orb.r : escalaEsc;
  if (o.estereo === 'off' && !renderer.xr.isPresenting) {
    if (o.comparar === 'lado') { const w2 = Math.floor(W / 2); cam.aspect = w2 / H; cam.updateProjectionMatrix(); pasada(0, 0, w2, H, cam, d => d.grupo !== 'B'); pasada(w2, 0, W - w2, H, cam, d => d.grupo !== 'A'); }
    else if (o.comparar === 'cortina') { const s = Math.round(W * o.cortina); pasada(0, 0, s, H, cam, d => d.grupo !== 'B'); pasada(s, 0, W - s, H, cam, d => d.grupo !== 'A'); V.cortinaEl.style.left = (o.cortina * 100) + '%'; }
    else { renderer.setScissorTest(false); vis(() => true); renderer.render(scene, cam); }
  } else if (o.estereo === 'sbs') {
    vis(() => true); stereo.aspect = 0.5; stereo.eyeSep = dist * 0.06 * o.ipd; cam.focus = dist; stereo.update(cam); const w2 = Math.floor(W / 2);
    renderer.setScissorTest(true); [[0, stereo.cameraL], [w2, stereo.cameraR]].forEach(([x, c]) => { renderer.setViewport(x, 0, w2, H); renderer.setScissor(x, 0, w2, H); renderer.render(scene, c); });
  } else if (o.estereo === 'anaglifo') {
    vis(() => true); stereo.aspect = 1; stereo.eyeSep = dist * 0.05 * o.ipd; cam.focus = dist; stereo.update(cam);
    gl.colorMask(true, false, false, true); renderer.render(scene, stereo.cameraL); renderer.clearDepth(); gl.colorMask(false, true, true, true); renderer.render(scene, stereo.cameraR); gl.colorMask(true, true, true, true);
  }
  renderer.setScissorTest(false); etiquetas();
}
function mando(dt) {
  const M = window.Mando; if (!M) return; M.leer(); V.mira.hidden = !(M.activo && M.conectado && V.herramienta !== 'orbita' && V.herramienta !== 'vuelo'); if (!M.conectado) return;
  const L = M.ejes.izq, Rr = M.ejes.der, s = dt * 60;
  if (mov.modo === 'orbita') { orb.th -= Rr.x * 0.03 * s; orb.ph -= Rr.y * 0.03 * s; if (L.x || L.y) panear(-L.x * 8 * s, -L.y * 8 * s); orb.r *= Math.exp((M.gatillo.izq - M.gatillo.der) * 0.03 * s); }
  else { vuelo.yaw -= Rr.x * 0.03 * s; vuelo.pit -= Rr.y * 0.03 * s; avanzar(-L.y * 0.03 * s + (M.gatillo.der - M.gatillo.izq) * 0.0, L.x * 0.03 * s); }
  if (L.x || L.y || Rr.x || Rr.y || M.gatillo.izq || M.gatillo.der) sucio = true;
  if (M.pulsado('A')) V.recogerCentro(); if (M.pulsado('B')) V.deshacer(); if (M.pulsado('X')) { V.herr(mov.modo === 'orbita' ? 'vuelo' : 'orbita'); } if (M.pulsado('Y')) V.encuadrar();
  const hs = ['orbita', 'distancia', 'area', 'angulo', 'anotar'], hi = hs.indexOf(V.herramienta); if (M.pulsado('RB')) V.herr(hs[(hi + 1 + hs.length) % hs.length]); if (M.pulsado('LB')) V.herr(hs[(hi - 1 + hs.length) % hs.length]); if (M.pulsado('MENU')) emit('mando-menu'); if (M.pulsado('VISTA')) emit('mando-captura'); if (M.pulsado('L3') && hecho.pts.length) V.terminar();
}
let tPrev = performance.now();
function tick() {
  const now = performance.now(), dt = Math.min(0.1, (now - tPrev) / 1000); tPrev = now;
  try { mando(dt); } catch (e) { /* sin mando */ }
  if (giro) { const f = Math.min(1, (now - giro.t0) / giro.dur); orb.th = giro.th0 + f * Math.PI * 2 * giro.sentido; sucio = true; if (f >= 1) { const fin = giro.fin; giro = null; fin(); } }
  if (!sucio && !renderer.xr.isPresenting) return; sucio = false; if (!renderer.xr.isPresenting) aplicarCam(); dibujar();
}

/* ---------- salida: captura, video giratorio ---------- */
V.captura = function (tipo) { aplicarCam(); dibujar(); return new Promise(ok => canvas.toBlob(b => ok(b), tipo || 'image/png')); };
V.videoGiro = function (seg, progreso) {
  seg = seg || 8; return new Promise((ok, ko) => {
    const th0 = orb.th; mov.modo === 'vuelo' && V.modoCamara('orbita'); const sentido = -1, fin = () => { orb.th = th0; };
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) { // alternativa: cuadros PNG
      const n = Math.round(seg * 12), cuadros = []; (async () => { for (let i = 0; i < n; i++) { orb.th = th0 + i / n * Math.PI * 2 * sentido; sucio = true; aplicarCam(); dibujar(); const b = await new Promise(r => canvas.toBlob(r, 'image/png')); cuadros.push({ nombre: 'cuadro_' + String(i).padStart(3, '0') + '.png', datos: new Uint8Array(await b.arrayBuffer()) }); if (progreso) progreso(i / n); } fin(); ok({ cuadros, tipo: 'png' }); })().catch(ko); return;
    }
    const mt = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '', fr = canvas.captureStream(30), rec = new MediaRecorder(fr, mt ? { mimeType: mt, videoBitsPerSecond: 4e6 } : {}), trozos = [];
    rec.ondataavailable = e => { if (e.data.size) trozos.push(e.data); }; rec.onerror = e => ko(e.error || new Error('Error de grabación')); rec.onstop = () => { grabando = false; fin(); ok({ blob: new Blob(trozos, { type: rec.mimeType || 'video/webm' }), tipo: 'webm' }); };
    grabando = true; rec.start(250); giro = { t0: performance.now(), dur: seg * 1000, th0, sentido, fin: () => rec.stop() };
    const id = setInterval(() => { if (!giro) clearInterval(id); else if (progreso) progreso(Math.min(1, (performance.now() - giro.t0) / giro.dur)); }, 200);
  });
};
V.girando = () => !!giro;

/* ---------- WebXR ---------- */
V.xr = { soportado: false };
async function sondearXR() { try { if (navigator.xr && navigator.xr.isSessionSupported) { V.xr.soportado = await navigator.xr.isSessionSupported('immersive-vr'); emit('xr'); } } catch (e) { /* sin XR */ } }
V.entrarVR = async function () {
  if (!V.xr.soportado) throw new Error('Este dispositivo no ofrece WebXR immersive-vr.');
  renderer.xr.enabled = true; const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }); await renderer.xr.setSession(s);
  const b = cajaVisible(), c = [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2], k = 1.2 / escalaEsc; xrMundo = { p: mundo.position.clone(), s: mundo.scale.clone() }; mundo.scale.setScalar(k); mundo.position.set(-c[0] * k, 0.9 - 0 * c[1], -c[2] * k - 1.2);
  s.addEventListener('end', () => { renderer.xr.enabled = false; mundo.position.copy(xrMundo.p); mundo.scale.copy(xrMundo.s); sucio = true; emit('xr'); });
};

/* ---------- estado ---------- */
V.estadoCamara = () => ({ modo: mov.modo, t: orb.target.toArray(), r: orb.r, th: orb.th, ph: orb.ph });
V.restaurarCamara = e => { if (!e) return; orb.target.fromArray(e.t); orb.r = e.r; orb.th = e.th; orb.ph = e.ph; mov.modo = 'orbita'; sucio = true; };
V.tam = () => tam;
V.memoriaGPU = () => { let b = 0; V.capas.forEach(c => { b += Malla.bytes(c.def.malla); }); return b; };
V.redimensionar = ajustar;
V.fondoRefrescar = aplicarFondo;
V.opcCambio = () => { luces(); rejilla.visible = V.opc.rejilla; ejes.visible = V.opc.ejes; aplicarFondo(); compararModo(); V.capas.forEach((_, id) => aplicarMaterial(id)); sucio = true; };
window.dispatchEvent(new CustomEvent('r3d-visor-modulo'));
