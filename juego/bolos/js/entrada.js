// Entrada del lanzamiento: gesto tactil/raton (arrastrar = posicion; deslizar = direccion, fuerza y efecto), teclado y mando.
import { D } from './ajustes.js';
import { P } from './fisica.js';

const lim = (x, a, b) => Math.max(a, Math.min(b, x));
const VMIN = 5.5, VMAX = 11;
export const E = {
  activo: false, x: 0, ang: 0, w: 0, carga: 0, cargando: false, gesto: null, alCambiar: null, alLanzar: null, alPulsar: null,
  teclas: new Set(), botones: new Set(), bloqueado: () => false, _t0: 0, _ultimo: 0
};

export const potenciaAV = (p) => VMIN + (VMAX - VMIN) * lim(p, 0, 1);
export const params = (v) => ({ x: E.x, ang: E.ang, v: v || 9, w: D.invertirEfecto ? -E.w : E.w });
const avisar = () => { if (E.alCambiar) E.alCambiar(); };

export function habilitar(b, x) {
  E.activo = b; E.cargando = false; E.carga = 0; E.gesto = null;
  if (x != null) { E.x = x; E.ang = 0; E.w = 0; }
  if (!b) { E.teclas.clear(); E.botones.clear(); }
  avisar();
}
export function reiniciar() { E.x = 0; E.ang = 0; E.w = 0; avisar(); }

function lanzarDesde(v) { const p = params(v); E.activo = false; E.cargando = false; E.carga = 0; avisar(); if (E.alLanzar) E.alLanzar(p); }

/* ---------- gesto de puntero ---------- */
export function iniciarPuntero(el) {
  const posx = (ev) => ev.clientX, posy = (ev) => ev.clientY;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (ev) => {
    if (!E.activo || E.gesto || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    el.setPointerCapture && el.setPointerCapture(ev.pointerId);
    E.gesto = { id: ev.pointerId, x0: posx(ev), y0: posy(ev), t0: performance.now(), modo: null, pts: [{ x: posx(ev), y: posy(ev), t: performance.now() }], xb: E.x };
  });
  el.addEventListener('pointermove', (ev) => {
    const g = E.gesto; if (!g || ev.pointerId !== g.id) return;
    g.pts.push({ x: posx(ev), y: posy(ev), t: performance.now() });
    const dx = posx(ev) - g.x0, dy = posy(ev) - g.y0, W = el.clientWidth || 390;
    if (!g.modo && Math.hypot(dx, dy) > 12) g.modo = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'pos' : dy < 0 ? 'swipe' : 'nada';
    if (g.modo === 'pos') { E.x = lim(g.xb + dx / W * 1.9 * D.sens, -0.42, 0.42); avisar(); }
    else if (g.modo === 'swipe') { const r = calcular(g, el); if (r) { E.ang = r.ang; E.w = r.w; E.carga = r.p; avisar(); } }
  });
  const fin = (ev, cancel) => {
    const g = E.gesto; if (!g || ev.pointerId !== g.id) return;
    E.gesto = null;
    if (cancel || g.modo !== 'swipe') { if (g.modo === 'swipe') { E.ang = 0; E.w = 0; E.carga = 0; avisar(); } if (!g.modo && E.alPulsar) E.alPulsar(); return; }
    const r = calcular(g, el);
    E.carga = 0;
    if (!r || r.len < 0.1 * (el.clientHeight || 700)) { E.ang = 0; E.w = 0; avisar(); return; }
    E.ang = r.ang; E.w = r.w;
    lanzarDesde(potenciaAV(r.p));
  };
  el.addEventListener('pointerup', (ev) => fin(ev, false));
  el.addEventListener('pointercancel', (ev) => fin(ev, true));
}
/* Direccion = rumbo de la primera mitad del trazo; fuerza = velocidad final; efecto = giro del rumbo entre el inicio y el final. */
function calcular(g, el) {
  const pts = g.pts, n = pts.length;
  if (n < 3) return null;
  const a = pts[0], b = pts[n - 1], H = el.clientHeight || 700;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const m = pts[Math.max(1, Math.floor(n * 0.5))];
  const rumbo = (p, q) => Math.atan2(q.x - p.x, -(q.y - p.y));
  const r0 = rumbo(a, m);
  const i1 = Math.floor(n * 0.5), r1 = rumbo(pts[i1], b);
  const t1 = Math.max(60, pts[n - 1].t - pts[Math.max(0, n - 6)].t), pv = pts[Math.max(0, n - 6)];
  const vel = Math.hypot(b.x - pv.x, b.y - pv.y) / t1 * 1000 / H;
  const p = lim((vel * D.sens - 0.6) / 2.8, 0, 1);
  let w = lim((r1 - r0) / 0.55, -1, 1); if (Math.abs(w) < 0.12) w = 0;
  return { ang: lim(r0 * 0.25, -0.07, 0.07), w, p, len };
}

/* ---------- teclado ---------- */
export function iniciarTeclado() {
  addEventListener('keydown', (e) => {
    if (!E.activo || E.bloqueado() || e.ctrlKey || e.metaKey || e.altKey || (e.target.tagName || '') === 'INPUT' || (e.target.tagName || '') === 'TEXTAREA') return;
    const T = D.teclas;
    if (Object.values(T).includes(e.code)) { if (e.code !== T.pausa && e.code !== T.tabla) e.preventDefault(); }
    if (e.code === T.lanzar && !e.repeat && !E.cargando) { E.cargando = true; E._t0 = performance.now(); }
    E.teclas.add(e.code);
  });
  addEventListener('keyup', (e) => {
    E.teclas.delete(e.code);
    if (e.code === D.teclas.lanzar && E.cargando && E.activo) lanzarDesde(potenciaAV(E.carga));
  });
  addEventListener('blur', () => E.teclas.clear());
}
export function botonCargar(b) { // boton tactil "Lanzar": mantener y soltar
  if (b && !E.cargando && E.activo) { E.cargando = true; E._t0 = performance.now(); }
  else if (!b && E.cargando && E.activo) lanzarDesde(potenciaAV(E.carga));
}
export const onda = () => { const t = ((performance.now() - E._t0) / 1700) % 2; return t < 1 ? t : 2 - t; };

/* ---------- por cuadro: teclas sostenidas, botones tactiles y mando ---------- */
export function cuadro(dt, Mando) {
  if (!E.activo) return;
  const T = D.teclas, K = E.teclas, B = E.botones, s = D.sens;
  let dx = (K.has(T.der) || B.has('der') ? 1 : 0) - (K.has(T.izq) || B.has('izq') ? 1 : 0);
  let da = (K.has(T.apDer) || B.has('apDer') ? 1 : 0) - (K.has(T.apIzq) || B.has('apIzq') ? 1 : 0);
  let dw = (K.has(T.efDer) || B.has('efDer') ? 1 : 0) - (K.has(T.efIzq) || B.has('efIzq') ? 1 : 0);
  let cargaPad = false;
  if (Mando && Mando.conectado) {
    const z = D.zonaMando, f = (v) => (Math.abs(v) < z ? 0 : (v - Math.sign(v) * z) / (1 - z));
    dx += f(Mando.ejes.izq.x) + (Mando.sostenido('DER') ? 1 : 0) - (Mando.sostenido('IZQ') ? 1 : 0);
    da += f(Mando.ejes.der.x);
    dw += Mando.gatillo.der - Mando.gatillo.izq;
    cargaPad = Mando.sostenido('A');
    if (Mando.pulsado('A') && !E.cargando) { E.cargando = true; E._t0 = performance.now(); }
    if (Mando.soltado('A') && E.cargando) { lanzarDesde(potenciaAV(E.carga)); return; }
  }
  if (dx) E.x = lim(E.x + dx * 0.4 * s * dt, -0.42, 0.42);
  if (da) E.ang = lim(E.ang + da * 0.035 * s * dt, -0.07, 0.07);
  if (dw) E.w = lim(E.w + dw * 1.3 * dt, -1, 1);
  if (E.cargando) E.carga = onda();
  if (dx || da || dw || E.cargando || cargaPad) avisar();
}
void P;
