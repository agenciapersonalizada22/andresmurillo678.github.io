// Entrada: raton/tactil sobre la mesa, barra de fuerza, selector de efecto, teclado y mando Xbox. Fuera de partida (menus/modales) navega por [data-f].
import { $, $$ } from './dom.js';
import { D } from './ajustes.js';
import { Partida } from './partida.js';
import { Vista } from './vista.js';

export const E = { alMenu: null, alAyuda: null, alAtras: null, alPestana: null, alVista: null, bloqueado: () => false, alTirar: null };
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
const tecla = new Set();
export const teclasPulsadas = tecla;
const H = { izq: false, der: false };
let repetir = { dir: '', t: 0, n: 0 }, mandoPrev = {};

export function capaActiva() {
  const capas = $$('.capa, .cu-fondo').filter((c) => !c.hidden && c.getClientRects().length > 0);
  return capas.length ? capas[capas.length - 1] : null;
}
function candidatos(capa) { return $$('[data-f]', capa).filter((e) => !e.disabled && e.getClientRects().length > 0); }
function mover(capa, dx, dy) {
  const lista = candidatos(capa);
  if (!lista.length) return;
  const act = lista.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { lista[0].focus(); return; }
  if (act.type === 'range' && dx) { act.stepUp ? (dx > 0 ? act.stepUp() : act.stepDown()) : 0; act.dispatchEvent(new Event('input', { bubbles: true })); return; }
  const r0 = act.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let mejor = null, md = 1e9;
  for (const cono of [true, false]) {
    for (const e of lista) {
      if (e === act) continue;
      const r = e.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const avance = dx * x + dy * y, lateral = Math.abs(dx ? y : x);
      if (avance <= 2 || (cono && avance < lateral * 0.7)) continue;
      const d = avance + lateral * 2.2;
      if (d < md) { md = d; mejor = e; }
    }
    if (mejor) break;
  }
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function atras(capa) {
  if (capa && capa.classList.contains('cu-fondo')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; }
  const b = capa && capa.querySelector('[data-cerrar]');
  if (b) { b.click(); return true; }
  if (E.alAtras) return E.alAtras();
  return false;
}
const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (x) { /* puntero sintetico */ } };
const jugando = () => Partida.activa && !document.getElementById('juego').hidden;

/* ---------- acciones de juego ---------- */
export function tirar() {
  if (!(Partida.turnoLocal() && Partida.fase === 'apuntando')) return false;
  const a = Partida.ap;
  if (E.alTirar) E.alTirar();
  return Partida.tirar({ ang: a.ang, pot: a.pot, a: a.a, b: a.b, mano: a.mano });
}
export function confirmarOTirar() {
  if (Partida.fase === 'colocando') return Partida.confirmarBlanca();
  return tirar();
}
const fuerzaDe = (d) => Partida.fijarPotencia(Partida.ap.pot + d);

/* ---------- raton y tactil ---------- */
export function iniciarPuntero(lienzo, barra, efecto) {
  const ps = new Map();
  let ang0 = 0, a0 = 0, p0 = null, mover3d = 0, pinch = 0, botonDer = false, ult = null;
  const tactil = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  lienzo.addEventListener('pointerdown', (e) => {
    if (E.bloqueado()) return;
    cap(lienzo, e);
    ps.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    botonDer = e.button === 2;
    if (ps.size === 2) { const [p, q] = [...ps.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); return; }
    ult = { x: e.clientX, y: e.clientY };
    if (Partida.turnoLocal() && Partida.fase === 'colocando' && !botonDer) { colocar(e); return; }
    if (Partida._puedeApuntar() && !botonDer && Vista.modo === 'cenital') {
      const c = Partida.posBlanca(), m = Vista.pantallaAMesa(e.clientX, e.clientY);
      p0 = m; ang0 = m ? Math.atan2(m.y - c.y, m.x - c.x) : 0; a0 = Partida.ap.ang;
    }
  });
  const colocar = (e) => {
    const off = tactil(e) ? -56 : 0, m = Vista.pantallaAMesa(e.clientX, e.clientY + off);
    if (m) Partida.moverBlanca(m.x, m.y);
  };
  lienzo.addEventListener('pointermove', (e) => {
    const p = ps.get(e.pointerId); if (!p || E.bloqueado()) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ps.size >= 2) {
      const [a, b] = [...ps.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) Vista.zoom(d / pinch); pinch = d;
      if (Vista.modo === '3d') Vista.orbitar(0, (D.invertirY ? 1 : -1) * dy * 0.003 * 0.5);
      return;
    }
    if (Partida.fase === 'colocando' && !botonDer) { colocar(e); return; }
    if (botonDer) { if (Vista.modo === '3d') Vista.orbitar(0, (D.invertirY ? 1 : -1) * dy * 0.004); return; }
    if (!Partida._puedeApuntar()) return;
    if (Vista.modo === 'cenital') {
      const c = Partida.posBlanca(), m = Vista.pantallaAMesa(e.clientX, e.clientY);
      if (m && Math.hypot(m.x - c.x, m.y - c.y) > 0.1 && p0) Partida.fijarAngulo(a0 + (Math.atan2(m.y - c.y, m.x - c.x) - ang0));
      else Partida.girar((Vista.rotado ? dy : -dx) * 0.0035 * D.sens);
    } else {
      Partida.girar(-dx * 0.0032 * D.sens);
      Vista.orbitar(0, (D.invertirY ? 1 : -1) * dy * 0.0025);
    }
  });
  const fin = (e) => { ps.delete(e.pointerId); if (ps.size < 2) pinch = 0; p0 = null; };
  lienzo.addEventListener('pointerup', fin); lienzo.addEventListener('pointercancel', fin);
  lienzo.addEventListener('wheel', (e) => {
    if (E.bloqueado()) return;
    e.preventDefault();
    if (e.ctrlKey) Vista.zoom(e.deltaY < 0 ? 1.08 : 0.92);
    else if (Partida._puedeApuntar() && Partida.fase === 'apuntando') fuerzaDe((e.deltaY < 0 ? 1 : -1) * 0.03);
  }, { passive: false });

  // barra de fuerza: arrastrar hacia abajo para cargar y soltar para tirar (o fijar el valor y usar TIRAR)
  let carga = null;
  const cuerpo = barra.querySelector('.pot-cuerpo');
  const alto = () => cuerpo.getBoundingClientRect();
  barra.addEventListener('pointerdown', (e) => {
    if (!Partida._puedeApuntar() || Partida.fase !== 'apuntando') return;
    cap(barra, e);
    const r = alto();
    if (D.soltarParaTirar) carga = { y0: e.clientY, h: r.height * 0.8, ini: true };
    else { carga = { abs: true }; Partida.fijarPotencia(1 - (e.clientY - r.top) / r.height); }
    e.preventDefault();
  });
  barra.addEventListener('pointermove', (e) => {
    if (!carga) return;
    if (carga.abs) { const r = alto(); Partida.fijarPotencia(1 - (e.clientY - r.top) / r.height); return; }
    Partida.fijarPotencia(limitar((e.clientY - carga.y0) / carga.h, 0, 1) || 0.03);
  });
  const soltar = (e) => {
    if (!carga) return;
    const c = carga; carga = null;
    if (!c.abs && Partida.ap.pot > 0.07 && Partida.fase === 'apuntando') tirar();
    else if (!c.abs) Partida.fijarPotencia(0.35);
  };
  barra.addEventListener('pointerup', soltar); barra.addEventListener('pointercancel', () => { carga = null; });

  // efecto: punto de impacto en la bola
  let tocando = false;
  const poner = (e) => {
    const r = efecto.getBoundingClientRect(), R = r.width / 2;
    const a = (e.clientX - (r.left + R)) / R, b = -(e.clientY - (r.top + R)) / R;
    Partida.fijarEfecto(a, b); pintarEfecto();
  };
  efecto.addEventListener('pointerdown', (e) => { if (!Partida._puedeApuntar()) return; tocando = true; cap(efecto, e); poner(e); e.preventDefault(); });
  efecto.addEventListener('pointermove', (e) => { if (tocando) poner(e); });
  efecto.addEventListener('pointerup', () => { tocando = false; }); efecto.addEventListener('pointercancel', () => { tocando = false; });
  efecto.addEventListener('dblclick', () => { Partida.fijarEfecto(0, 0); pintarEfecto(); });
  for (const [id, k] of [['bFinoIzq', 'izq'], ['bFinoDer', 'der']]) {
    const b = document.getElementById(id);
    b.addEventListener('pointerdown', (e) => { H[k] = true; cap(b, e); e.preventDefault(); });
    const x = () => { H[k] = false; };
    b.addEventListener('pointerup', x); b.addEventListener('pointercancel', x); b.addEventListener('lostpointercapture', x);
  }
}
export function pintarEfecto() {
  const ap = Partida.ap, i = document.querySelector('#efecto i');
  if (!i || !ap) return;
  i.style.left = (50 + ap.a * 50 / 0.6 * 0.82) + '%'; i.style.top = (50 - ap.b * 50 / 0.6 * 0.82) + '%';
}

/* ---------- teclado ---------- */
export function iniciarTeclado() {
  window.addEventListener('keyup', (e) => tecla.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => tecla.clear());
  window.addEventListener('keydown', (e) => {
    if (E.bloqueado()) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && e.target.type !== 'range')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(), t = D.teclas;
    document.body.classList.add('usando-teclado'); document.body.classList.remove('usando-mando');
    const capa = capaActiva();
    if (capa) {
      const dir = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
      if (dir && tag !== 'select') { e.preventDefault(); mover(capa, dir[0], dir[1]); return; }
      if (k === 'escape') { if (atras(capa)) e.preventDefault(); }
      return;
    }
    if (!jugando()) return;
    tecla.add(k);
    if (k === t.menu) { e.preventDefault(); E.alMenu && E.alMenu(); }
    else if (k === t.tirar || k === 'enter') { e.preventDefault(); if (!e.repeat) confirmarOTirar(); }
    else if (k === t.vista) { e.preventDefault(); E.alVista && E.alVista(); }
    else if (k === t.centrar) { Partida.fijarEfecto(0, 0); pintarEfecto(); }
    else if (k === t.zoomMas || k === '=') Vista.zoom(1.1);
    else if (k === t.zoomMenos || k === '_') Vista.zoom(0.9);
    else if (k === '?' || k === 'f1') { e.preventDefault(); E.alAyuda && E.alAyuda(); }
    else if ([t.efArriba, t.efAbajo, t.efIzq, t.efDer].includes(k)) {
      const ap = Partida.ap; if (!ap) return;
      const p = 0.1;
      Partida.fijarEfecto(ap.a + (k === t.efDer ? p : k === t.efIzq ? -p : 0), ap.b + (k === t.efArriba ? p : k === t.efAbajo ? -p : 0)); pintarEfecto();
    } else if ([t.izq, t.der, t.masFuerza, t.menosFuerza].includes(k)) e.preventDefault();
  });
  window.addEventListener('pointerdown', () => document.body.classList.remove('usando-teclado', 'usando-mando'));
}

/* ---------- cuadro: teclas sostenidas y mando ---------- */
export function cuadro(Mando, t, dt) {
  const hold = (n) => tecla.has(D.teclas[n]);
  if (jugando() && !capaActiva() && !E.bloqueado()) {
    const fino = tecla.has('shift') ? 0.2 : 1;
    if (Partida._puedeApuntar()) {
      if (Partida.fase === 'colocando') {
        const ap = Partida.ap, m = ap.mano || { x: 0, y: 0 };
        const dx = (hold('der') ? 1 : 0) - (hold('izq') ? 1 : 0), dy = (hold('masFuerza') ? 1 : 0) - (hold('menosFuerza') ? 1 : 0);
        if (dx || dy) Partida.moverBlanca(m.x + dx * 0.5 * dt * fino * (tecla.has('shift') ? 1 : 2), m.y + dy * 0.5 * dt * fino * (tecla.has('shift') ? 1 : 2));
      } else {
        const g = (hold('der') ? -1 : 0) + (hold('izq') ? 1 : 0) + (H.der ? -0.25 : 0) + (H.izq ? 0.25 : 0);
        if (g) Partida.girar(g * 0.5 * D.sens * fino * dt * 0.8);
        const f = (hold('masFuerza') ? 1 : 0) - (hold('menosFuerza') ? 1 : 0);
        if (f) fuerzaDe(f * 0.45 * dt * (fino < 1 ? 0.3 : 1));
      }
    }
  }
  if (!Mando || E.bloqueado()) return;
  Mando.leer();
  if (!Mando.conectado) return;
  const usa = Mando.activo && (Object.keys(Mando._ahora).some((k) => Mando._ahora[k]) || Math.hypot(Mando.ejes.izq.x, Mando.ejes.izq.y) > 0.3);
  if (usa) { document.body.classList.add('usando-mando'); document.body.classList.remove('usando-teclado'); }
  const capa = capaActiva();
  const zm = D.zonaMuerta, ex = Mando.ejes.izq.x, ey = Mando.ejes.izq.y;
  let dx = 0, dy = 0;
  if (Mando.sostenido('IZQ') || ex < -zm) dx = -1; else if (Mando.sostenido('DER') || ex > zm) dx = 1;
  if (Mando.sostenido('ARRIBA') || ey < -zm * 1.2) dy = -1; else if (Mando.sostenido('ABAJO') || ey > zm * 1.2) dy = 1;
  if (Math.abs(ex) > Math.abs(ey) * 1.3 && !Mando.sostenido('ARRIBA') && !Mando.sostenido('ABAJO')) dy = 0;
  const clave = dx + ',' + dy;
  let paso = false;
  if (dx || dy) {
    if (repetir.dir !== clave) { repetir = { dir: clave, t: t + 380, n: 0 }; paso = true; }
    else if (t >= repetir.t) { repetir.t = t + (repetir.n > 3 ? 70 : 130); repetir.n++; paso = true; }
  } else repetir.dir = '';
  if (capa) {
    if (paso) mover(capa, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && capa.contains(document.activeElement)) document.activeElement.click();
    else if (Mando.pulsado('A')) { const l = candidatos(capa); if (l[0]) l[0].focus(); }
    if (Mando.pulsado('B')) atras(capa);
    if (E.alPestana) { if (Mando.pulsado('LB')) E.alPestana(-1); if (Mando.pulsado('RB')) E.alPestana(1); }
    if (Mando.pulsado('MENU') && capa.id !== 'modal') atras(capa);
    return;
  }
  if (!jugando()) {
    if (Mando.pulsado('MENU')) E.alMenu && E.alMenu();
    return;
  }
  if (Mando.pulsado('MENU')) { E.alMenu && E.alMenu(); return; }
  if (Mando.pulsado('VISTA')) { E.alAyuda && E.alAyuda(); return; }
  if (Mando.pulsado('X')) E.alVista && E.alVista();
  if (Mando.sostenido('LB')) Vista.zoom(1 - 0.9 * dt); if (Mando.sostenido('RB')) Vista.zoom(1 + 0.9 * dt);
  if (!Partida._puedeApuntar()) return;
  const fino = Mando.gatillo.izq > 0.3 ? 0.2 : 1;
  const sx = Mando.ejes.izq.x, sy = Mando.ejes.izq.y;
  if (Partida.fase === 'colocando') {
    const m = Partida.ap.mano || { x: 0, y: 0 };
    if (sx || sy) Partida.moverBlanca(m.x + sx * 0.7 * dt * fino, m.y - sy * 0.7 * dt * fino);
    if (Mando.pulsado('A')) Partida.confirmarBlanca();
    return;
  }
  if (sx) Partida.girar(-Math.sign(sx) * Math.abs(sx) ** 1.6 * 1.5 * D.sens * fino * dt);
  const py = Mando.ejes.der.y;
  if (py) fuerzaDe(-py * 0.7 * dt);
  const rt = Mando.gatillo.der; if (rt > 0.1 && mandoPrev.rt <= 0.1) { /* RT pulsado: nada, evita tiros accidentales */ }
  mandoPrev.rt = rt;
  const ap = Partida.ap, p = 0.1;
  const pasoEf = (n) => Mando.pulsado(n);
  if (pasoEf('DER') || pasoEf('IZQ') || pasoEf('ARRIBA') || pasoEf('ABAJO')) { Partida.fijarEfecto(ap.a + (pasoEf('DER') ? p : pasoEf('IZQ') ? -p : 0), ap.b + (pasoEf('ARRIBA') ? p : pasoEf('ABAJO') ? -p : 0)); pintarEfecto(); }
  if (Mando.pulsado('Y')) { Partida.fijarEfecto(0, 0); pintarEfecto(); }
  if (Mando.pulsado('A')) tirar();
}
