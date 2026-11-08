/* Escena 3D de RA (modulo ES, Three.js local de reconstruccion-3d/lib): objetos procedurales y mallas, manipulacion con snapping, medicion,
   camara de AR desde la pose del marcador / giroscopio / WebXR (hit-test + anclas + planos) y visor (lado a lado, Cardboard con distorsion, anaglifo, WebXR VR). window.RA.E3 */
import * as THREE from '../../reconstruccion-3d/lib/three.module.min.js';
const RA = window.RA, G = RA.Geo, E = {};
const D2R = Math.PI / 180;
let renderer, scene, camAR, camVis, suelo, luz, rejilla, sombraPlano, selCaja = null, lineas = null, estereo, rtL, rtR, quadDist, camQuad, sceneQuad, matDist;
const objs = new Map();   // id -> {def, obj}
E.objs = objs; E.sel = null; E.listo = false; E.modo = 'marcador';
E.snap = { rej: true, paso: 0.1, ang: true, pasoAng: 15, esc: true, pasoEsc: 0.1 };
E.medidas = [];           // {a:[x,y,z], b:[x,y,z]} en el espacio del suelo
E.cuadro = null;          // callback por cuadro: (t, frameXR)
E.xr = { ar: false, vr: false, activa: null, planos: 0, ancla: false };

E.init = function () {
  if (E.listo) return true;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); } catch (e) { return false; }
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.autoClear = false;
  scene = new THREE.Scene(); suelo = new THREE.Group(); suelo.matrixAutoUpdate = false; scene.add(suelo);
  camAR = new THREE.PerspectiveCamera(50, 1, 0.01, 200); camVis = new THREE.PerspectiveCamera(70, 1, 0.01, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 0.95));
  luz = new THREE.DirectionalLight(0xffffff, 1.5); luz.position.set(0.8, 2.2, 1.2); luz.castShadow = true; luz.shadow.mapSize.set(1024, 1024); const sc = luz.shadow.camera; sc.left = sc.bottom = -2; sc.right = sc.top = 2; sc.near = 0.1; sc.far = 8; suelo.add(luz); suelo.add(luz.target);
  rejilla = new THREE.GridHelper(1, 10, 0x66e0ff, 0x66e0ff); rejilla.material.transparent = true; rejilla.material.opacity = 0.45; rejilla.position.y = 0.002; suelo.add(rejilla);
  sombraPlano = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.35 })); sombraPlano.rotation.x = -Math.PI / 2; sombraPlano.receiveShadow = true; suelo.add(sombraPlano);
  lineas = new THREE.Group(); suelo.add(lineas);
  estereo = new THREE.StereoCamera();
  camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); sceneQuad = new THREE.Scene();
  matDist = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, k1: { value: 0.34 }, k2: { value: 0.55 }, asp: { value: 1 }, cx: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'uniform sampler2D t;uniform float k1,k2,asp,cx;varying vec2 u;void main(){vec2 p=(u-.5)*2.;p.x=(p.x-cx)*asp;float r2=dot(p,p);float f=1.+k1*r2+k2*r2*r2;vec2 q=p*f;q.x=q.x/asp+cx;vec2 s=q*.5+.5;if(s.x<0.||s.x>1.||s.y<0.||s.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);}else gl_FragColor=texture2D(t,s);}' });
  quadDist = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matDist); sceneQuad.add(quadDist);
  renderer.setAnimationLoop(function (t, frame) { try { if (frame) xrFrame(t, frame); if (E.cuadro) E.cuadro(t, frame); } catch (e) { console.error(e); } });
  E.canvas = renderer.domElement; E.renderer = renderer; E.scene = scene; E.suelo = suelo; E.camAR = camAR; E.camVis = camVis; E.listo = true; return true;
};
E.tam = function (w, h) { renderer.setSize(w, h, false); camAR.aspect = w / h; camAR.updateProjectionMatrix(); camVis.aspect = w / h; camVis.updateProjectionMatrix(); E.w = w; E.h = h; };
E.rejilla = function (v) { rejilla.visible = v; };
E.sombras = function (v) { sombraPlano.visible = v; luz.castShadow = v; };

/* ---------- objetos procedurales (y arriba, base en y=0, ~0.5 de ancho) ---------- */
const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o || {}));
function malla(g, c, x, y, z) { const m = new THREE.Mesh(g, mat(c)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; return m; }
function pipsTex(n) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#111'; const P = { 1: [[64, 64]], 2: [[32, 32], [96, 96]], 3: [[32, 32], [64, 64], [96, 96]], 4: [[32, 32], [96, 32], [32, 96], [96, 96]], 5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]], 6: [[32, 28], [96, 28], [32, 64], [96, 64], [32, 100], [96, 100]] }[n]; P.forEach(p => { x.beginPath(); x.arc(p[0], p[1], 11, 0, 7); x.fill(); }); const t = new THREE.CanvasTexture(c); return t; }
const PRIM = {
  cubo: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.BoxGeometry(0.4, 0.4, 0.4), c, 0, 0.2, 0)); return g; },
  esfera: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.SphereGeometry(0.22, 32, 20), c, 0, 0.22, 0)); return g; },
  cilindro: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 32), c, 0, 0.225, 0)); return g; },
  piramide: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.ConeGeometry(0.28, 0.45, 4), c, 0, 0.225, 0)); g.children[0].rotation.y = Math.PI / 4; return g; },
  flecha: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), c, 0, 0.15, 0)); g.add(malla(new THREE.ConeGeometry(0.12, 0.2, 20), c, 0, 0.4, 0)); return g; },
  ejes: () => { const g = new THREE.Group(); [[0xe03131, 'x'], [0x2f9e44, 'y'], [0x1c7ed6, 'z']].forEach(([c, a]) => { const f = new THREE.Group(); f.add(malla(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), c, 0, 0.2, 0)); f.add(malla(new THREE.ConeGeometry(0.04, 0.1, 12), c, 0, 0.45, 0)); if (a === 'x') f.rotation.z = -Math.PI / 2; if (a === 'z') f.rotation.x = Math.PI / 2; g.add(f); }); return g; },
  ajedrez: () => {
    const g = new THREE.Group(), s = 0.0625; g.add(malla(new THREE.BoxGeometry(0.54, 0.02, 0.54), 0x4a3426, 0, 0.01, 0));
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.add(malla(new THREE.BoxGeometry(s, 0.006, s), (i + j) % 2 ? 0xb58863 : 0xf0d9b5, (j - 3.5) * s, 0.023, (i - 3.5) * s));
    const alt = [0.07, 0.05, 0.06, 0.08, 0.11, 0.06, 0.05, 0.07];
    for (let j = 0; j < 8; j++) { [[0, 0x212529, 1], [1, 0x212529, 0.045], [6, 0xf1f3f5, 0.045], [7, 0xf1f3f5, 1]].forEach(([fila, col, k]) => { const h = k === 1 ? alt[j] : 0.045, p = new THREE.Group(); p.add(malla(new THREE.CylinderGeometry(0.014, 0.022, h, 14), col, 0, h / 2, 0)); p.add(malla(new THREE.SphereGeometry(0.017, 12, 10), col, 0, h + 0.012, 0)); p.position.set((j - 3.5) * s, 0.026, (fila - 3.5) * s); g.add(p); }); }
    return g;
  },
  dado: () => { const g = new THREE.Group(), mats = [3, 4, 1, 6, 2, 5].map(n => new THREE.MeshStandardMaterial({ map: pipsTex(n), roughness: 0.4 })), m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), mats); m.position.y = 0.11; m.castShadow = true; g.add(m); return g; },
  carro: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.BoxGeometry(0.5, 0.1, 0.24), c, 0, 0.1, 0)); g.add(malla(new THREE.BoxGeometry(0.26, 0.09, 0.2), 0xdee2e6, -0.03, 0.195, 0)); [[-0.16, 0.12], [0.16, 0.12], [-0.16, -0.12], [0.16, -0.12]].forEach(([x, z]) => { const w = malla(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 20), 0x16181d, x, 0.055, z); w.rotation.x = Math.PI / 2; g.add(w); }); return g; },
  robot: (c) => { const g = new THREE.Group(); g.add(malla(new THREE.BoxGeometry(0.22, 0.26, 0.14), c, 0, 0.3, 0)); g.add(malla(new THREE.BoxGeometry(0.16, 0.14, 0.14), 0xced4da, 0, 0.5, 0)); g.add(malla(new THREE.SphereGeometry(0.02, 10, 8), 0x22d3ee, -0.04, 0.51, 0.07)); g.add(malla(new THREE.SphereGeometry(0.02, 10, 8), 0x22d3ee, 0.04, 0.51, 0.07)); g.add(malla(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), 0x868e96, 0, 0.62, 0)); g.add(malla(new THREE.BoxGeometry(0.07, 0.2, 0.08), 0x868e96, -0.08, 0.1, 0)); g.add(malla(new THREE.BoxGeometry(0.07, 0.2, 0.08), 0x868e96, 0.08, 0.1, 0)); return g; }
};
E.PRIM = [['cubo', 'Cubo'], ['esfera', 'Esfera'], ['cilindro', 'Cilindro'], ['piramide', 'Pirámide'], ['flecha', 'Flecha'], ['ejes', 'Ejes XYZ'], ['ajedrez', 'Ajedrez 3D (tablero y piezas)'], ['dado', 'Dado'], ['carro', 'Carro'], ['robot', 'Robot']];

/* ---------- mallas importadas ---------- */
function geoDeMalla(m) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.pos), 3));
  if (m.col) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.col), 3)); if (m.idx) g.setIndex(new THREE.BufferAttribute(m.idx instanceof Uint32Array ? m.idx : new Uint32Array(m.idx), 1));
  if (m.idx) g.computeVertexNormals(); return g;
}
function objDeMalla(m, def) {
  const g = geoDeMalla(m), grp = new THREE.Group(), envol = new THREE.Group();
  const cuerpo = m.idx ? new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: m.col ? 0xffffff : (def.color || '#adb5bd'), vertexColors: !!m.col, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide })) : new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: !!m.col, color: m.col ? 0xffffff : 0x74c0fc }));
  cuerpo.castShadow = !!m.idx; if (m.zArriba) cuerpo.rotation.x = -Math.PI / 2;
  grp.add(cuerpo); grp.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(grp), tam = b.getSize(new THREE.Vector3()), cen = b.getCenter(new THREE.Vector3()), k = 0.8 / (Math.max(tam.x, tam.y, tam.z) || 1);
  grp.scale.setScalar(k); grp.position.set(-cen.x * k, -b.min.y * k, -cen.z * k); envol.add(grp); envol.userData.base = { tam: [tam.x * k, tam.y * k, tam.z * k] }; return envol;
}
const mallasMem = new Map();   // modeloId -> malla (en memoria)
E.registrarMalla = function (id, m) { mallasMem.set(id, m); };
E.tieneMalla = id => mallasMem.has(id);

function construir(def) {
  let o;
  if (def.tipo === 'malla') { const m = mallasMem.get(def.modeloId); if (!m) return null; o = objDeMalla(m, def); }
  else { const f = PRIM[def.clave]; if (!f) return null; o = f(def.color || '#e03131'); }
  o.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  if (!o.userData.base) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.userData.base = { tam: [s.x, s.y, s.z] }; }
  return o;
}
function aplicar(e) { const d = e.def; e.obj.position.set(d.pos[0], d.pos[1], d.pos[2]); e.obj.rotation.set(0, d.rotY * D2R, 0); e.obj.scale.setScalar(d.escala); e.obj.updateMatrixWorld(true); if (E.sel === d.id) marcarSel(); }
E.agregar = function (def) {
  def = Object.assign({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nombre: def.clave || 'Objeto', tipo: 'prim', pos: [0, 0, 0], rotY: 0, escala: 1, color: '#e03131' }, def);
  const o = construir(def); if (!o) return null; suelo.add(o); const e = { def, obj: o }; objs.set(def.id, e); aplicar(e); E.sel = def.id; marcarSel(); return def;
};
E.quitar = function (id) { const e = objs.get(id); if (!e) return; suelo.remove(e.obj); e.obj.traverse(x => { if (x.geometry) x.geometry.dispose(); }); objs.delete(id); if (E.sel === id) { E.sel = null; marcarSel(); } };
E.limpiar = function () { [...objs.keys()].forEach(E.quitar); E.medidas = []; pintarMedidas(); };
E.defs = () => [...objs.values()].map(e => Object.assign({}, e.def, { pos: e.def.pos.slice() }));
E.def = id => (objs.get(id) || {}).def;
E.cambiar = function (id, cambios) {
  const e = objs.get(id); if (!e) return;
  if (cambios.color && cambios.color !== e.def.color && e.def.tipo === 'prim') { const viejo = new THREE.Color(e.def.color).getHex(); e.obj.traverse(x => { if (x.material && x.material.color && !x.material.map && x.material.color.getHex() === viejo) x.material.color.set(cambios.color); }); }
  else if (cambios.color && e.def.tipo === 'malla') e.obj.traverse(x => { if (x.isMesh && !x.geometry.attributes.color) x.material.color.set(cambios.color); });
  Object.assign(e.def, cambios); aplicar(e);
};
E.duplicar = function (id) { const e = objs.get(id); if (!e) return null; const d = Object.assign({}, e.def, { id: undefined, pos: [e.def.pos[0] + 0.12, e.def.pos[1], e.def.pos[2] + 0.12] }); return E.agregar(d); };
E.seleccionar = function (id) { E.sel = id && objs.has(id) ? id : null; marcarSel(); };
function marcarSel() {
  if (selCaja) { suelo.remove(selCaja); selCaja.geometry.dispose(); selCaja = null; }
  const e = E.sel && objs.get(E.sel); if (!e) return; const b = new THREE.Box3().setFromObject(e.obj); selCaja = new THREE.Box3Helper(b, 0xffd43b); suelo.add(selCaja);
}
/* tamano del objeto en unidades (lado de marcador = 1), con escala aplicada */
E.dimensiones = function (id) { const e = objs.get(id); if (!e) return null; const t = e.obj.userData.base.tam; return t.map(v => v * e.def.escala); };
E.ajustarAlto = function (id, altoU) { const e = objs.get(id); if (!e) return; const t = e.obj.userData.base.tam[1] || 1; E.cambiar(id, { escala: altoU / t }); };

/* ---------- interaccion (coordenadas normalizadas -1..1) ---------- */
const rc = new THREE.Raycaster(), v2 = new THREE.Vector2();
function camActiva() { return E.modoVista === 'visor' ? camVis : camAR; }
E.hit = function (nx, ny) {
  v2.set(nx, ny); rc.setFromCamera(v2, camActiva()); const lista = []; objs.forEach(e => lista.push(e.obj)); const h = rc.intersectObjects(lista, true)[0]; if (!h) return null;
  let o = h.object; while (o && o.parent !== suelo) o = o.parent; for (const [id, e] of objs) if (e.obj === o) return { id, punto: suelo.worldToLocal(h.point.clone()).toArray() }; return null;
};
E.piso = function (nx, ny, y) { // interseccion con el plano y=y del suelo
  v2.set(nx, ny); rc.setFromCamera(v2, camActiva()); suelo.updateMatrixWorld(true); const inv = suelo.matrixWorld.clone().invert(), r = rc.ray.clone().applyMatrix4(inv), t = r.direction.y === 0 ? null : (y || 0) - r.origin.y;
  if (t === null) return null; const k = t / r.direction.y; if (k < 0) return null; return r.origin.clone().addScaledVector(r.direction, k).toArray();
};
E.aPantalla = function (p, w, h) { const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(suelo.matrixWorld).project(camActiva()); return v.z > 1 ? null : [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; };
const redond = (v, p) => Math.round(v / p) * p;
E.mover = function (id, x, z, libre) { const e = objs.get(id); if (!e) return; if (E.snap.rej && !libre) { x = redond(x, E.snap.paso); z = redond(z, E.snap.paso); } e.def.pos[0] = x; e.def.pos[2] = z; aplicar(e); };
E.girar = function (id, deg, absoluto, libre) { const e = objs.get(id); if (!e) return; let r = absoluto ? deg : e.def.rotY + deg; if (E.snap.ang && !libre) r = redond(r, E.snap.pasoAng); e.def.rotY = ((r % 360) + 360) % 360; aplicar(e); };
E.escalar = function (id, factor, absoluto, libre) { const e = objs.get(id); if (!e) return; let s = absoluto ? factor : e.def.escala * factor; if (E.snap.esc && !libre) s = redond(s, E.snap.pasoEsc); e.def.escala = Math.min(20, Math.max(0.05, s)); aplicar(e); };

/* ---------- medicion ---------- */
function pintarMedidas() {
  while (lineas.children.length) { const c = lineas.children.pop(); c.geometry.dispose(); }
  E.medidas.forEach(m => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...m.a), new THREE.Vector3(...m.b)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffd43b, depthTest: false })); l.renderOrder = 9; lineas.add(l); [m.a, m.b].forEach(p => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd43b, depthTest: false })); s.position.set(...p); s.renderOrder = 10; lineas.add(s); }); });
}
E.medir = (a, b) => { E.medidas.push({ a, b }); pintarMedidas(); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
E.borrarMedidas = () => { E.medidas = []; pintarMedidas(); };

/* ---------- camara AR ---------- */
const mS = new THREE.Matrix4().makeRotationX(Math.PI / 2);
E.arMarcador = function (K, w, h, pose) { // pose de G.poseDeHom
  camAR.fov = G.fovVertical(K, h); camAR.aspect = w / h; camAR.position.set(0, 0, 0); camAR.quaternion.identity(); camAR.updateProjectionMatrix(); camAR.updateMatrixWorld(true);
  suelo.matrix.fromArray(G.matrizThree(pose)).multiply(mS); suelo.matrixWorldNeedsUpdate = true; suelo.visible = true; suelo.updateMatrixWorld(true);
};
E.arGiro = function (q, fovH, w, h, yawExtra, escala) { // 3DoF: el suelo queda 1.4 abajo y 2.5 al frente (en metros * escala)
  const k = Math.tan(fovH * D2R / 2) / (w / h); camAR.fov = 2 * Math.atan(k) / D2R; camAR.aspect = w / h; camAR.position.set(0, 0, 0); camAR.quaternion.set(q[0], q[1], q[2], q[3]); camAR.updateProjectionMatrix(); camAR.updateMatrixWorld(true);
  const s = escala || 0.5; suelo.matrix.compose(new THREE.Vector3(Math.sin(-(yawExtra || 0)) * 2.5, -1.4, -Math.cos(yawExtra || 0) * 2.5), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawExtra || 0), new THREE.Vector3(s, s, s)); suelo.visible = true; suelo.updateMatrixWorld(true);
};
E.renderAR = function () { renderer.setScissorTest(false); renderer.setViewport(0, 0, E.w, E.h); renderer.clear(true, true, true); renderer.render(scene, camAR); };

/* ---------- visor: orbita / cabeza, estereo, Cardboard, anaglifo ---------- */
const orb = { th: 0.6, ph: 0.45, r: 1.6, tx: 0, ty: 0.2, tz: 0 };
E.orbita = orb;
E.visor = { modo: 'mono', ipd: 63, k1: 0.34, k2: 0.55, sep: 0, fov: 80, mpu: 0.5, cabeza: false, quat: null, pos: [0, 0.45, 1.3], yaw: 0, pit: 0 };
E.preparaVisor = function () { // el suelo vuelve a identidad con la escala del visor
  suelo.matrix.identity(); suelo.visible = true; suelo.updateMatrixWorld(true); E.modoVista = 'visor';
};
E.salirVisor = function () { E.modoVista = 'ar'; };
const fovV = (fov, asp) => asp >= 1 ? fov : 2 * Math.atan(Math.tan(fov * D2R / 2) / asp) / D2R;   // el campo de vision vale para el lado corto
function colocaCamVisor(asp) {
  const v = E.visor; camVis.fov = fovV(v.fov, asp); camVis.aspect = E.w / E.h;
  if (v.cabeza) { camVis.position.set(v.pos[0], v.pos[1], v.pos[2]); const base = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.pit, v.yaw, 0, 'YXZ')); if (v.quat) base.multiply(new THREE.Quaternion(v.quat[0], v.quat[1], v.quat[2], v.quat[3])); camVis.quaternion.copy(base); }
  else { const o = orb; camVis.position.set(o.tx + o.r * Math.cos(o.ph) * Math.sin(o.th), o.ty + o.r * Math.sin(o.ph), o.tz + o.r * Math.cos(o.ph) * Math.cos(o.th)); camVis.lookAt(o.tx, o.ty, o.tz); }
  camVis.updateProjectionMatrix(); camVis.updateMatrixWorld(true);
}
function eyeRT(w, h) { const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }; if (!rtL || rtL.width !== w || rtL.height !== h) { if (rtL) { rtL.dispose(); rtR.dispose(); } rtL = new THREE.WebGLRenderTarget(w, h, o); rtR = new THREE.WebGLRenderTarget(w, h, o); } }
E.renderVisor = function () {
  const v = E.visor, W = E.w, H = E.h, gl = renderer.getContext(); if (selCaja) selCaja.visible = false; scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0e1220');
  const dist = v.cabeza ? 1.5 : orb.r; const w2e = Math.floor(W / 2); colocaCamVisor(v.modo === 'sbs' || v.modo === 'cardboard' ? w2e / H : W / H); estereo.eyeSep = (v.ipd / 1000) / v.mpu; camVis.focus = dist;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); renderer.clear(true, true, true);
  if (v.modo === 'mono') renderer.render(scene, camVis);
  else if (v.modo === 'anaglifo') { estereo.aspect = W / H; estereo.update(camVis); renderer.setClearColor(0x000000, 1); renderer.clear(); gl.colorMask(true, false, false, true); renderer.render(scene, estereo.cameraL); renderer.clearDepth(); gl.colorMask(false, true, true, true); renderer.render(scene, estereo.cameraR); gl.colorMask(true, true, true, true); renderer.setClearColor(0x000000, 0); }
  else {
    const w2 = Math.floor(W / 2); estereo.aspect = w2 / H; estereo.update(camVis);
    if (v.modo === 'sbs') { renderer.setScissorTest(true); [[0, estereo.cameraL], [w2, estereo.cameraR]].forEach(([x, c]) => { renderer.setViewport(x, 0, w2, H); renderer.setScissor(x, 0, w2, H); renderer.render(scene, c); }); renderer.setScissorTest(false); }
    else { // cardboard
      eyeRT(w2, H); matDist.uniforms.k1.value = v.k1; matDist.uniforms.k2.value = v.k2; matDist.uniforms.asp.value = w2 / H;
      [[rtL, estereo.cameraL, 0, -1], [rtR, estereo.cameraR, w2, 1]].forEach(([rt, c, x, lado]) => {
        renderer.setRenderTarget(rt); renderer.setViewport(0, 0, w2, H); renderer.clear(true, true, true); renderer.render(scene, c); renderer.setRenderTarget(null);
        matDist.uniforms.t.value = rt.texture; matDist.uniforms.cx.value = lado * v.sep; renderer.setScissorTest(true); renderer.setViewport(x, 0, w2, H); renderer.setScissor(x, 0, w2, H); renderer.clear(true, true, true); renderer.render(sceneQuad, camQuad); renderer.setScissorTest(false);
      });
    }
  }
  scene.background = null; if (selCaja) selCaja.visible = true;
};
E.encuadre = function () { let b = new THREE.Box3(); objs.forEach(e => b.expandByObject(e.obj)); if (b.isEmpty()) return; const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); orb.tx = c.x; orb.ty = c.y; orb.tz = c.z; orb.r = Math.max(0.7, Math.max(s.x, s.y, s.z) * 1.7); };

/* ---------- WebXR ---------- */
async function sondearXR() { try { if (navigator.xr && navigator.xr.isSessionSupported) { E.xr.ar = await navigator.xr.isSessionSupported('immersive-ar'); E.xr.vr = await navigator.xr.isSessionSupported('immersive-vr'); } } catch (e) { /* sin WebXR */ } window.dispatchEvent(new Event('ra-xr')); }
let hitSrc = null, retic = null, ancla = null, refSpace = null, planosGrp = null, sesion = null, colocado = false;
E.entrarVR = async function () {
  if (!E.xr.vr) throw new Error('Este dispositivo no ofrece WebXR immersive-vr.');
  const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }); renderer.xr.enabled = true; await renderer.xr.setSession(s); E.xr.activa = 'vr'; E.preparaVisor();
  suelo.matrix.compose(new THREE.Vector3(0, 0.75, -0.9), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.6, 0.6)); suelo.updateMatrixWorld(true);
  s.addEventListener('end', () => { renderer.xr.enabled = false; E.xr.activa = null; suelo.matrix.identity(); window.dispatchEvent(new Event('ra-xr')); }); window.dispatchEvent(new Event('ra-xr')); return s;
};
E.entrarAR = async function (raizUI, alColocar) {
  if (!E.xr.ar) throw new Error('Este dispositivo o navegador no ofrece WebXR immersive-ar (prueba Chrome en Android con ARCore).');
  const opt = { requiredFeatures: ['hit-test'], optionalFeatures: ['anchors', 'plane-detection', 'local-floor'] }; if (raizUI) { opt.optionalFeatures.push('dom-overlay'); opt.domOverlay = { root: raizUI }; }
  const s = await navigator.xr.requestSession('immersive-ar', opt); sesion = s; renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local'); await renderer.xr.setSession(s);
  refSpace = renderer.xr.getReferenceSpace(); const vs = await s.requestReferenceSpace('viewer'); hitSrc = await s.requestHitTestSource({ space: vs }); colocado = false; ancla = null;
  retic = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x66e0ff })); retic.matrixAutoUpdate = false; retic.visible = false; scene.add(retic);
  planosGrp = new THREE.Group(); scene.add(planosGrp); suelo.visible = false; suelo.matrixAutoUpdate = false; E.xr.activa = 'ar'; E.xr.ancla = false; E.xr.planos = 0; scene.background = null;
  s.addEventListener('select', async () => {
    if (!retic.visible) return; suelo.matrix.copy(retic.matrix); suelo.visible = true; colocado = true; suelo.updateMatrixWorld(true); if (alColocar) alColocar();
    if (hitSrc && E.ultimoHit) { try { if (E.ultimoHit.createAnchor) { ancla = await E.ultimoHit.createAnchor(); E.xr.ancla = !!ancla; } } catch (e) { ancla = null; } }
  });
  s.addEventListener('end', () => { renderer.xr.enabled = false; scene.remove(retic); scene.remove(planosGrp); hitSrc = null; ancla = null; E.xr.activa = null; suelo.visible = true; suelo.matrix.identity(); window.dispatchEvent(new Event('ra-xr')); });
  window.dispatchEvent(new Event('ra-xr')); return s;
};
E.salirXR = function () { const s = renderer.xr.getSession(); if (s) s.end(); };
function xrFrame(t, frame) {
  if (E.xr.activa !== 'ar') return;
  const hits = hitSrc ? frame.getHitTestResults(hitSrc) : []; E.ultimoHit = hits[0] || null;
  if (hits.length && !colocado) { const p = hits[0].getPose(refSpace); if (p) { retic.visible = true; retic.matrix.fromArray(p.transform.matrix); } } else if (!colocado) retic.visible = false;
  else if (retic) { if (hits.length) { const p = hits[0].getPose(refSpace); if (p) { retic.visible = true; retic.matrix.fromArray(p.transform.matrix); } } }
  if (ancla && ancla.anchorSpace) { const p = frame.getPose(ancla.anchorSpace, refSpace); if (p) { suelo.matrix.fromArray(p.transform.matrix); suelo.updateMatrixWorld(true); } }
  if (frame.detectedPlanes) { E.xr.planos = frame.detectedPlanes.size; while (planosGrp.children.length) planosGrp.remove(planosGrp.children[0]); let n = 0; frame.detectedPlanes.forEach(pl => { if (n++ > 6) return; const pp = frame.getPose(pl.planeSpace, refSpace); if (!pp || !pl.polygon) return; const pts = pl.polygon.map(q => new THREE.Vector3(q.x, q.y, q.z)); pts.push(pts[0]); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x51cf66 })); l.matrixAutoUpdate = false; l.matrix.fromArray(pp.transform.matrix); planosGrp.add(l); }); }
}
sondearXR(); window.RA.E3 = E; window.dispatchEvent(new Event('ra-3d-listo'));
