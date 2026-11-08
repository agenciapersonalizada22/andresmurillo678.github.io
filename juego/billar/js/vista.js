// Vista 3D / cenital: renderer, camara, bolas, taco, linea guia y animacion de caida en tronera.
import { THREE, construirMesa, construirTaco, texturaBola, entornoReflejos, colorBola } from './mesa3d.js';
import { rayo, bola } from './fisica.js';

const P = (x, y, z = 0) => new THREE.Vector3(x, z, -y);
const LIM = {
  ninguna: null,
  corta: { cue: 0.7, obj: 0.12, defl: 0.1, reb: 0.3 },
  media: { cue: 1.8, obj: 0.4, defl: 0.28, reb: 0.7 },
  larga: { cue: 8, obj: 1.0, defl: 0.55, reb: 1.6 }
};
const suave = (dt, k) => 1 - Math.exp(-dt * k);

export const Vista = {
  listo: false, modo: '3d', S: null, tipoJuego: 'pool', rodando: false, extraZoom: 1,
  yaw: 0, pitch: 0.34, dist: 0.95, rotado: false, aim: null, fps: 0,
  _r: null, _scene: null, _cam: null, _cont: null, _mesa: null, _mallas: {}, _caida: {}, _taco: null, _cinta: [], _anillo: null, _golpe: null, _cfg: null, _luz: null, _hemi: null, _env: null, _tacoDef: null, _blobs: {}, _ancho: 1, _alto: 1, _ct: new THREE.Vector3(), _cp: new THREE.Vector3(), _dalto: false, _cuePos: { x: 0, y: 0 },

  init(cont, cfg) {
    Vista._cont = cont; Vista._cfg = { ...cfg };
    try { Vista._crearRenderer(); } catch (e) { Vista.listo = false; return false; }
    const sc = Vista._scene = new THREE.Scene();
    sc.background = new THREE.Color(0x0b1411);
    sc.fog = new THREE.Fog(0x0b1411, 6, 14);
    Vista._cam = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    Vista._hemi = new THREE.HemisphereLight(0xdfe9ff, 0x2a3328, 0.7); sc.add(Vista._hemi);
    const luz = Vista._luz = new THREE.SpotLight(0xfff3dc, 26, 9, 1.0, 0.55, 1.4);
    luz.position.set(0, 2.5, 0); luz.target.position.set(0, 0, 0); sc.add(luz, luz.target);
    // cinta de guia (reutilizable) y anillo fantasma
    const mc = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mc.clone()); m.rotation.x = -Math.PI / 2; m.renderOrder = 5; m.visible = false; sc.add(m); Vista._cinta.push(m); }
    const an = Vista._anillo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    an.rotation.x = -Math.PI / 2; an.renderOrder = 6; an.visible = false; sc.add(an);
    Vista.listo = true;
    Vista._ro = new ResizeObserver(() => Vista.redimensionar()); Vista._ro.observe(cont);
    Vista.redimensionar();
    return true;
  },

  _crearRenderer() {
    const c = Vista._cfg, viejo = Vista._r;
    const r = new THREE.WebGLRenderer({ antialias: !!c.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.setAttribute('aria-label', 'Mesa de billar'); r.domElement.style.touchAction = 'none';
    if (viejo) { viejo.domElement.remove(); viejo.dispose(); }
    Vista._cont.appendChild(r.domElement);
    Vista._r = r; Vista._env = null;
    Vista._aplicarSombras();
  },
  _aplicarSombras() {
    const r = Vista._r, c = Vista._cfg;
    r.shadowMap.enabled = !!c.sombras && !c.simple;
    if (Vista._luz) {
      Vista._luz.castShadow = r.shadowMap.enabled;
      const res = c.pixelRatio >= 3 ? 4096 : c.pixelRatio >= 2 ? 2048 : 1024;
      if (Vista._luz.shadow.mapSize.x !== res) { Vista._luz.shadow.mapSize.set(res, res); if (Vista._luz.shadow.map) { Vista._luz.shadow.map.dispose(); Vista._luz.shadow.map = null; } }
      Vista._luz.shadow.bias = -0.0004; Vista._luz.shadow.camera.near = 1; Vista._luz.shadow.camera.far = 6;
    }
  },

  aplicarCalidad(cfg) {
    const antes = Vista._cfg || {};
    Vista._cfg = { ...cfg };
    if (!Vista._r) return;
    if (antes.antialias !== cfg.antialias) Vista._crearRenderer();
    Vista._aplicarSombras();
    Vista.redimensionar();
    if (Vista.S && (antes.detalle !== cfg.detalle || antes.simple !== cfg.simple || antes.reflejos !== cfg.reflejos || antes.sombras !== cfg.sombras)) Vista.cargar(Vista.S, Vista.tipoJuego, Vista._tema, Vista._tacoDef, Vista._dalto);
  },

  redimensionar() {
    if (!Vista._r) return;
    const w = Math.max(2, Vista._cont.clientWidth), h = Math.max(2, Vista._cont.clientHeight);
    Vista._ancho = w; Vista._alto = h;
    Vista._r.setPixelRatio(Math.min(window.devicePixelRatio || 1, Vista._cfg.pixelRatio || 1));
    Vista._r.setSize(w, h, false);
    Vista._r.domElement.style.width = w + 'px'; Vista._r.domElement.style.height = h + 'px';
    Vista._cam.aspect = w / h; Vista._cam.updateProjectionMatrix();
    Vista.rotado = w / h < 1.0;
  },

  /* ---------- escena ---------- */
  cargar(S, tipoJuego, tema, tacoDef, dalto) {
    if (!Vista.listo) return;
    const sc = Vista._scene, cfg = Vista._cfg;
    Vista.S = S; Vista.tipoJuego = tipoJuego; Vista._tema = tema; Vista._tacoDef = tacoDef; Vista._dalto = !!dalto;
    if (Vista._mesa) { sc.remove(Vista._mesa.group); Vista._mesa.liberar(); }
    for (const id in Vista._mallas) { sc.remove(Vista._mallas[id]); const m = Vista._mallas[id]; m.geometry.dispose(); m.material.map && m.material.map.dispose(); m.material.dispose(); }
    for (const id in Vista._blobs) { sc.remove(Vista._blobs[id]); }
    Vista._mallas = {}; Vista._blobs = {}; Vista._caida = {};
    if (Vista._taco) { sc.remove(Vista._taco); Vista._taco.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    Vista._mesa = construirMesa(S.geo, tema, cfg);
    sc.add(Vista._mesa.group);
    const seg = [[14, 10], [24, 16], [40, 28]][cfg.detalle == null ? 1 : cfg.detalle];
    if (!Vista._env && cfg.reflejos && !cfg.simple) Vista._env = entornoReflejos(Vista._r);
    const bl = Vista._blobTex || (Vista._blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })());
    for (const b of S.bolas) {
      const map = texturaBola(b.id, tipoJuego, dalto);
      const mat = cfg.simple ? new THREE.MeshLambertMaterial({ map }) : (cfg.reflejos ? new THREE.MeshPhysicalMaterial({ map, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMap: Vista._env, envMapIntensity: 0.9 }) : new THREE.MeshStandardMaterial({ map, roughness: 0.3 }));
      const m = new THREE.Mesh(new THREE.SphereGeometry(S.R, seg[0], seg[1]), mat);
      m.castShadow = true; m.receiveShadow = false; sc.add(m); Vista._mallas[b.id] = m;
      if (!(cfg.sombras && !cfg.simple)) { const bm = new THREE.Mesh(new THREE.PlaneGeometry(S.R * 3.4, S.R * 3.4), new THREE.MeshBasicMaterial({ map: bl, transparent: true, depthWrite: false })); bm.rotation.x = -Math.PI / 2; bm.position.y = 0.002; sc.add(bm); Vista._blobs[b.id] = bm; }
    }
    const t = Vista._taco = construirTaco(tacoDef); t.visible = false; sc.add(t);
    Vista.sincronizar(true);
  },

  sincronizar(inmediato) {
    const S = Vista.S; if (!S) return;
    for (const b of S.bolas) {
      const m = Vista._mallas[b.id]; if (!m) continue;
      if (b.activa) { delete Vista._caida[b.id]; m.visible = true; m.position.copy(P(b.x, b.y, S.R)); m.scale.setScalar(1); }
      else if (inmediato) { m.visible = false; delete Vista._caida[b.id]; }
      if (Vista._blobs[b.id]) { Vista._blobs[b.id].visible = b.activa; Vista._blobs[b.id].position.set(b.x, 0.002, -b.y); }
    }
  },

  /* sim: tiempo de simulacion avanzado este cuadro; real: tiempo real */
  actualizar(sim, real) {
    const S = Vista.S; if (!S || !Vista.listo) return;
    const q = new THREE.Quaternion(), ax = new THREE.Vector3();
    for (const b of S.bolas) {
      const m = Vista._mallas[b.id]; if (!m) continue;
      if (b.activa) {
        m.position.set(b.x, S.R, -b.y);
        if (b.mov && sim > 0) {
          ax.set(b.wx, b.wz, -b.wy); const w = ax.length();
          if (w > 1e-6) { q.setFromAxisAngle(ax.multiplyScalar(1 / w), Math.min(w * sim, 1.2)); m.quaternion.premultiply(q); }
        }
        if (Vista._blobs[b.id]) Vista._blobs[b.id].position.set(b.x, 0.002, -b.y);
      } else if (b.emb >= 0 && m.visible) {
        let c = Vista._caida[b.id];
        if (!c) { c = Vista._caida[b.id] = { t: 0, x: b.x, y: b.y }; if (Vista._blobs[b.id]) Vista._blobs[b.id].visible = false; }
        c.t += real; const k = Math.min(1, c.t / 0.45), tp = S.geo.tron[b.emb] || [b.x, b.y];
        const px = tp[0] + Math.sign(tp[0]) * 0.02, py = tp[1] + Math.sign(tp[1]) * 0.02;
        m.position.set(c.x + (px - c.x) * k, S.R - k * k * 0.16, -(c.y + (py - c.y) * k));
        if (k >= 1) m.visible = false;
      }
    }
    Vista._tacoYGuia(real);
    Vista._camara(real);
    Vista._r.render(Vista._scene, Vista._cam);
  },

  /* ---------- taco y guia ---------- */
  apuntar(est) { Vista.aim = est; },
  golpe(cb, reducir) {
    if (reducir || !Vista.aim || !Vista._taco) { cb(); return; }
    Vista._golpe = { t: 0, cb, desde: Vista.aim.pot };
  },
  _tacoYGuia(real) {
    const e = Vista.aim, S = Vista.S, taco = Vista._taco;
    for (const c of Vista._cinta) c.visible = false;
    Vista._anillo.visible = false;
    if (!e || !e.visible) { if (!Vista._golpe) taco.visible = false; return; }
    const c = bola(S, e.id); if (!c || !c.activa) { taco.visible = false; return; }
    const cx = e.cx != null ? e.cx : c.x, cy = e.cy != null ? e.cy : c.y;
    Vista._cuePos = { x: cx, y: cy };
    const dx = Math.cos(e.ang), dy = Math.sin(e.ang);
    let holgura = 0.014 + 0.2 * Math.min(1, e.pot) * (e.colocando ? 0 : 1) + (e.reposo || 0);
    const g = Vista._golpe;
    if (g) {
      g.t += real;
      const k = Math.min(1, g.t / 0.14);
      holgura = (0.014 + 0.2 * g.desde) * (1 - k * k) - 0.012 * k;
      taco.visible = true;
      if (k >= 1) { const cb = g.cb; Vista._golpe = null; taco.visible = false; cb(); return; }
    } else taco.visible = !e.colocando;
    // posicion del taco: la punta sobre la bola, desplazada por el punto de impacto (a,b)
    const R = S.R, off = (e.a || 0) * R, offz = (e.b || 0) * R;
    const sx = dy, sy = -dx; // derecha del apuntado
    const tx = cx + sx * off - dx * (R + holgura), ty = cy + sy * off - dy * (R + holgura);
    taco.position.set(tx, R + offz, -ty);
    taco.rotation.set(0, e.ang + Math.PI, 0);
    if (e.colocando) return;
    const lim = LIM[e.guia];
    if (!lim) return;
    const d = [dx, dy];
    const saved = { x: c.x, y: c.y }; c.x = cx; c.y = cy;
    const r = rayo(S, e.id, d[0], d[1]);
    const dibujar = (i, x0, y0, x1, y1, col, ancho = 0.0075, op = 0.85) => {
      const m = Vista._cinta[i], len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 1e-4) return;
      m.visible = true; m.position.set((x0 + x1) / 2, 0.003 + i * 0.0004, -(y0 + y1) / 2);
      m.scale.set(len, ancho, 1); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(y1 - y0, x1 - x0), 0);
      m.material.color.set(col); m.material.opacity = op;
    };
    const clip = (x, y, dx, dy, l) => { let t = l; if (dx > 1e-9) t = Math.min(t, (S.geo.hx - x) / dx); else if (dx < -1e-9) t = Math.min(t, (-S.geo.hx - x) / dx); if (dy > 1e-9) t = Math.min(t, (S.geo.hy - y) / dy); else if (dy < -1e-9) t = Math.min(t, (-S.geo.hy - y) / dy); return Math.max(0, t); };
    const lc = Math.min(r.t, lim.cue);
    dibujar(0, cx, cy, cx + d[0] * lc, cy + d[1] * lc, '#ffffff');
    if (r.tipo === 'bola' && lc >= r.t - 1e-6) {
      const an = Vista._anillo; an.visible = true; an.position.set(r.x, 0.004, -r.y); an.scale.setScalar(S.R); an.material.color.set('#ffffff');
      const o = bola(S, r.id), lo = clip(o.x, o.y, r.nx, r.ny, lim.obj);
      dibujar(1, o.x, o.y, o.x + r.nx * lo, o.y + r.ny * lo, '#ffd23d', 0.0085);
      const dn = d[0] * r.nx + d[1] * r.ny;
      let ux = d[0] - dn * r.nx, uy = d[1] - dn * r.ny; const ul = Math.hypot(ux, uy);
      if (ul > 0.05) { ux /= ul; uy /= ul; const l = clip(r.x, r.y, ux, uy, lim.defl * ul); dibujar(2, r.x, r.y, r.x + ux * l, r.y + uy * l, '#7fd8ff', 0.0065, 0.7); }
    } else if (r.tipo === 'banda' && lim.reb && e.rebote && lc >= r.t - 1e-6) {
      const dn = d[0] * r.nx + d[1] * r.ny, rx = d[0] - 2 * dn * r.nx, ry = d[1] - 2 * dn * r.ny;
      c.x = r.x; c.y = r.y; const r2 = rayo(S, e.id, rx, ry);
      const l = Math.min(r2.t, lim.reb);
      dibujar(1, r.x, r.y, r.x + rx * l, r.y + ry * l, '#bfeaff', 0.006, 0.6);
    }
    c.x = saved.x; c.y = saved.y;
  },

  /* ---------- camara ---------- */
  setModo(m) { Vista.modo = m; },
  orbitar(dyaw, dpitch) { Vista.yaw += dyaw; Vista.pitch = Math.max(0.12, Math.min(1.35, Vista.pitch + dpitch)); },
  zoom(f) { Vista.extraZoom = Math.max(0.55, Math.min(2.2, Vista.extraZoom * f)); },
  _camara(dt) {
    const S = Vista.S, cam = Vista._cam, e = Vista.aim, R = S.R;
    const k = suave(dt, Vista._rapida ? 30 : 6);
    const cp = Vista._cp, ct = Vista._ct;
    if (Vista.modo === 'cenital') {
      const fov = cam.fov * Math.PI / 360, asp = cam.aspect, rot = Vista.rotado;
      const hh = rot ? S.geo.hx + 0.3 : S.geo.hy + 0.3, hw = rot ? S.geo.hy + 0.3 : S.geo.hx + 0.3;
      const h = Math.max(hh / Math.tan(fov), hw / (Math.tan(fov) * asp)) / Math.max(0.6, Vista.extraZoom * 0.92 + 0.08);
      cp.set(0, h, 0.0001); ct.set(0, 0, 0);
      cam.up.set(rot ? 1 : 0, 0, rot ? 0 : -1);
    } else {
      cam.up.set(0, 1, 0);
      const c = e && e.visible ? { x: Vista._cuePos.x, y: Vista._cuePos.y } : (Vista._ultimaBlanca || { x: 0, y: 0 });
      if (e && e.visible) { Vista._ultimaBlanca = c; if (!Vista._yawFijo) { let dy = ((e.ang - Vista.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; Vista.yaw += dy * Math.min(1, suave(dt, 14)); } }
      const aim = Vista.yaw, ca = Math.cos(aim), sa = Math.sin(aim);
      if (Vista.rodando) {
        const fov = cam.fov * Math.PI / 360, rot = Vista.rotado, asp = cam.aspect;
        const hh = rot ? S.geo.hx + 0.35 : S.geo.hy + 0.35, hw = rot ? S.geo.hy + 0.35 : S.geo.hx + 0.35;
        const hf = Math.max(hh / Math.tan(fov), hw / (Math.tan(fov) * asp)) / Vista.extraZoom;
        const base = rot ? 0.5 : 0.28;
        cp.set(-ca * hf * base, hf * 0.9, sa * hf * base); ct.set(0, 0, 0);
      } else {
        const d = Vista.dist / Vista.extraZoom * (Vista.rotado ? 1.15 : 1), p = Vista.pitch;
        cp.set(c.x - ca * d * Math.cos(p), d * Math.sin(p) + R, -c.y + sa * d * Math.cos(p));
        ct.set(c.x + ca * 0.35, R * 0.4, -(c.y + sa * 0.35));
      }
    }
    if (!Vista._init) { cam.position.copy(cp); Vista._look = ct.clone(); Vista._init = true; }
    cam.position.lerp(cp, k); Vista._look.lerp(ct, k);
    cam.lookAt(Vista._look);
    if (Vista.modo === 'cenital') { cam.position.copy(cp); cam.lookAt(ct); }
  },
  encuadrar() { Vista._init = false; },

  /* ---------- conversiones pantalla <-> mesa ---------- */
  pantallaAMesa(px, py) {
    const r = Vista._r.domElement.getBoundingClientRect();
    const v = new THREE.Vector3(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1, 0.5).unproject(Vista._cam);
    const o = Vista._cam.position, d = v.sub(o).normalize();
    if (Math.abs(d.y) < 1e-5) return null;
    const t = (Vista.S.R - o.y) / d.y;
    return { x: o.x + d.x * t, y: -(o.z + d.z * t) };
  },
  proyectar(x, y) {
    const v = P(x, y, Vista.S ? Vista.S.R : 0.03).project(Vista._cam), r = Vista._r.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  },
  liberar() {
    if (Vista._ro) Vista._ro.disconnect();
    if (Vista._r) { Vista._r.dispose(); Vista._r.domElement.remove(); }
  }
};
