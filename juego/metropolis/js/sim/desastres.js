// Desastres (terremoto, tornado, inundación, epidemia), daños y reparación.
import { N, azar, notar, fx, quitarEdif, edifEn } from './ciudad.js';
import { ITEM, ZONAS } from './datos.js';

const ci = (b) => Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01);

function proteccion(c, b, sismo) {
  let f = c.r.def[ci(b)] > 0 ? 0.5 : 1;
  if (sismo) { if (c.ord.antisismica) f *= 0.5; if (c.tech.sismologia) f *= 0.5; }
  return f;
}

export function danar(c, b, niv) {
  if (b.t === 'ayuntamiento') return false;
  const it = ITEM[b.t];
  if (it.tipo === 'zona') {
    if (b.n > 0) { if (!b.dan) b.danN = b.n; b.n = Math.max(0, b.n - niv); b.pop = Math.min(b.pop, b.n ? ZONAS.R.cap[b.n] : 0); }
    b.dan = true;
  } else {
    b.dan = true;
    if (niv >= 2 && azar(c) < 0.25) { quitarEdif(c, b); fx(c, { k: 'derribo', x: b.x, y: b.y, w: it.w, h: it.h, t: b.t }); return true; }
  }
  fx(c, { k: 'danio', x: b.cx, y: b.cy });
  c.sucio = true;
  return true;
}

export function costoReparacion(c) {
  let t = 0;
  for (const b of c.edif.values()) {
    if (!b.dan) continue;
    const it = ITEM[b.t];
    t += it.tipo === 'zona' ? 40 * (b.danN || 1) : Math.round(it.costo * 0.3);
  }
  return Math.round(t);
}
export function contarDanados(c) { let n = 0; for (const b of c.edif.values()) if (b.dan) n++; return n; }

export function repararTodo(c) {
  const falta = contarDanados(c);
  if (!falta) return { ok: false, razon: 'No hay daños' };
  const cs = costoReparacion(c);
  if (c.dinero < cs && c.modo !== 'sandbox') return { ok: false, razon: 'Dinero insuficiente', costo: cs };
  if (c.modo !== 'sandbox') c.dinero -= cs;
  for (const b of c.edif.values()) {
    if (!b.dan) continue;
    b.dan = false;
    if (b.danN) { b.n = Math.max(b.n, b.danN); delete b.danN; }
  }
  c.sucio = true;
  c.evt.pend = c.evt.pend.filter((p) => !['terremoto', 'tornado', 'inundacion'].includes(p.tipo));
  notar(c, 'Reparaciones completadas (' + falta + ' edificios)', 'ok');
  fx(c, { k: 'sonido', n: 'ok' });
  return { ok: true, costo: cs, n: falta };
}

export function terremoto(c, mag) {
  const lista = [...c.edif.values()];
  if (!lista.length) return;
  const e = lista[Math.floor(azar(c) * lista.length)], R = 5 + mag * 3, pb = [0.25, 0.5, 0.8][mag - 1];
  let n = 0;
  for (const b of lista) {
    const d = Math.hypot(b.cx - e.cx, b.cy - e.cy);
    if (d > R) continue;
    if (azar(c) < pb * proteccion(c, b, true) * (1 - d / (R + 2))) if (danar(c, b, mag >= 3 ? 2 : 1)) n++;
  }
  c.cont.desastres++;
  c.evt.pend.push({ tipo: 'terremoto', vence: c.t.dia + 3, x: e.cx, y: e.cy, mag });
  notar(c, 'Terremoto de magnitud ' + (4 + mag) + ': ' + n + ' edificios dañados', 'mal', e.cx, e.cy);
  fx(c, { k: 'terremoto', x: e.cx, y: e.cy, mag }); fx(c, { k: 'sonido', n: 'alerta' });
}

export function iniciarTornado(c) {
  const lado = azar(c) < 0.5, a = 4 + azar(c) * (N - 8);
  const dx = lado ? 1 : (azar(c) - 0.5) * 0.6, dy = lado ? (azar(c) - 0.5) * 0.6 : 1;
  c.evt.tornado = { x: lado ? 2 : a, y: lado ? a : 2, dx: dx * 0.9, dy: dy * 0.9, vida: 60 };
  c.cont.desastres++;
  c.evt.pend.push({ tipo: 'tornado', vence: c.t.dia + 3 });
  notar(c, '¡Tornado avistado! Avanza por la ciudad', 'mal');
  fx(c, { k: 'sonido', n: 'alerta' });
}

export function pasoTornado(c) {
  const t = c.evt.tornado; if (!t) return;
  t.x += t.dx + (azar(c) - 0.5) * 0.7; t.y += t.dy + (azar(c) - 0.5) * 0.7; t.vida--;
  let n = 0;
  for (const b of c.edif.values()) {
    if (Math.hypot(b.cx - t.x, b.cy - t.y) < 1.7 && azar(c) < 0.7 * proteccion(c, b, false)) if (danar(c, b, 2)) n++;
  }
  if (n) { fx(c, { k: 'sonido', n: 'derribo' }); c.sucio = true; }
  if (t.vida <= 0 || t.x < -2 || t.y < -2 || t.x > N + 2 || t.y > N + 2) { c.evt.tornado = null; notar(c, 'El tornado se disipó', 'info'); }
}

export function inundacion(c) {
  let n = 0;
  for (const b of c.edif.values()) {
    const i = ci(b);
    if (c.r.cercaAgua[i] && !c.r.dique[i] && azar(c) < 0.45) if (danar(c, b, 1)) n++;
  }
  c.clima.lluvia = 0;
  if (!n) return;
  c.cont.desastres++;
  c.evt.pend.push({ tipo: 'inundacion', vence: c.t.dia + 3 });
  notar(c, 'Inundación: ' + n + ' edificios afectados. Los diques previenen esto', 'mal');
  fx(c, { k: 'sonido', n: 'alerta' });
}

export function epidemia(c) {
  for (const b of c.edif.values()) if (b.t === 'zonaR' && b.pop > 0) b.pop = Math.round(b.pop * 0.92);
  c.evt.epidemia = 36;
  c.evt.pend.push({ tipo: 'epidemia', vence: c.t.dia + 2, costo: Math.round(200 + c.s.pop * 0.4) });
  notar(c, 'Brote epidémico: más clínicas y agua limpia ayudan', 'mal');
  fx(c, { k: 'sonido', n: 'alerta' });
}

// Cada día: sorteo de desastres. crisis multiplica las probabilidades.
export function desastresDia(c) {
  const s = c.s, k = c.esc && c.esc.id === 'crisis' ? 3 : 1;
  if (s.pop >= 300 && azar(c) < 0.012 * k) terremoto(c, azar(c) < 0.6 ? 1 : azar(c) < 0.8 ? 2 : 3);
  if (s.pop >= 250 && !c.evt.tornado && azar(c) < (c.clima.tipo === 'tormenta' ? 0.05 : 0.008) * k) iniciarTornado(c);
  if (c.clima.lluvia >= 12 && s.pop >= 200 && azar(c) < 0.4) inundacion(c);
  if (s.pop >= 400 && s.salud < 40 && !c.evt.epidemia && azar(c) < 0.1) epidemia(c);
  if (s.pop >= 400 && s.crimen > 45 && azar(c) < 0.15) {
    const robo = Math.round(40 + s.crimen * s.pop * 0.05);
    c.dinero -= robo; notar(c, 'Ola de robos: -$' + robo, 'mal');
  }
}

// Defensa civil repara gratis de a poco
export function autoReparar(c) {
  for (const b of c.edif.values()) {
    if (b.dan && c.r.def[ci(b)] > 0 && azar(c) < 0.05) {
      b.dan = false;
      if (b.danN) { b.n = Math.max(b.n, b.danN); delete b.danN; }
      c.sucio = true;
    }
  }
}
export { edifEn };
