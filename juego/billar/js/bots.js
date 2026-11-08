// Bots (sin DOM): generan candidatos geometricos (bola fantasma) o barrido, los simulan con la misma fisica y puntuan el resultado con las reglas.
import { clonar, simular, rayo, bola, posicionLibre } from './fisica.js';
import { analizar, resolver, objetivos, esCarom, idBlanca, grupoDe } from './reglas.js';

export const NIVELES = [
  { id: 1, nombre: 'Principiante', desc: 'Falla a menudo y casi no planea.', sAng: 0.038, sPot: 0.18, cands: 1, pots: 1, sims: 0 },
  { id: 2, nombre: 'Aficionado', desc: 'Busca bolas fáciles y evita faltas.', sAng: 0.012, sPot: 0.06, cands: 4, pots: 2, sims: 1 },
  { id: 3, nombre: 'Profesional', desc: 'Prueba muchas jugadas y apenas falla.', sAng: 0.002, sPot: 0.015, cands: 9, pots: 3, sims: 2 }
];
const DT_BOT = 1 / 240;
const ceder = () => new Promise((r) => setTimeout(r, 0));
const gauss = (az) => { let s = 0; for (let i = 0; i < 6; i++) s += az(); return (s - 3) / Math.sqrt(0.5); };
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

function puntuar(S0, E, tiro) {
  const S = clonar(S0), id = idBlanca(E);
  const b = bola(S, id);
  if (tiro.mano) { b.x = tiro.mano.x; b.y = tiro.mano.y; }
  const ang = tiro.ang, pot = tiro.pot;
  const v0 = 7.5 * pot, R = S.R;
  b.vx = Math.cos(ang) * v0; b.vy = Math.sin(ang) * v0;
  const k = 2.5 * v0 / R, a = tiro.a || 0, bb = tiro.b || 0;
  b.wz = k * a; b.wx = k * bb * -Math.sin(ang); b.wy = k * bb * Math.cos(ang); b.mov = true;
  const ev = simular(S, { dt: DT_BOT, maxT: 40 });
  const an = analizar(ev, id);
  const { E: E2, info } = resolver(E, an);
  const yo = E.turno;
  let sc = 0;
  if (E2.ganador === yo) sc += 10000; else if (E2.ganador >= 0) sc -= 10000;
  if (esCarom(E.modo)) {
    if (info.punto) sc += 1000;
    else { sc += an.contactos.length * 60 + Math.min(3, an.bandasBlanca) * 8; if (an.contactos.length >= 2) sc += 150; }
    return sc;
  }
  if (info.falta) sc -= 400;
  const mias = an.embolsadas.filter((x) => E.modo === 'bola9' || (E.grupos[yo] ? grupoDe(x) === E.grupos[yo] || x === 8 : x !== 8)).length;
  sc += mias * 300 + (info.continua ? 150 : 0) - (an.embolsadas.length - mias) * 80;
  if (info.continua) { // posicion de la blanca: preferir quedar cerca de bolas propias libres
    const c = bola(S, id), obj = objetivos(E2).map((i) => bola(S, i)).filter((o) => o && o.activa);
    const dmin = obj.length ? Math.min(...obj.map((o) => Math.hypot(o.x - c.x, o.y - c.y))) : 1;
    sc -= dmin * 20;
  }
  return sc;
}

function libreCamino(S, ax, ay, bx, by, excluir) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  for (const o of S.bolas) {
    if (!o.activa || excluir.includes(o.id)) continue;
    const t = limitar(((o.x - ax) * dx + (o.y - ay) * dy) / l2, 0, 1);
    if (Math.hypot(o.x - (ax + dx * t), o.y - (ay + dy * t)) < 2 * S.R * 0.98) return false;
  }
  return true;
}

function candidatosPool(S, E, cx, cy) {
  const g = S.geo, R = S.R, cue = bola(S, 0), out = [];
  const px0 = cue.x, py0 = cue.y;
  cue.x = cx; cue.y = cy;
  const pozos = g.tron.map((p) => [p[0] === 0 ? 0 : p[0] - Math.sign(p[0]) * 0.035, p[1] - Math.sign(p[1]) * (p[0] === 0 ? 0.0 : 0.035)]);
  for (const id of objetivos(E)) {
    const t = bola(S, id);
    if (!t || !t.activa) continue;
    for (const [qx, qy] of pozos) {
      const tx = qx - t.x, ty = qy - t.y, dtp = Math.hypot(tx, ty);
      if (dtp < 1e-6) continue;
      const ux = tx / dtp, uy = ty / dtp;
      const gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
      if (Math.abs(gx) > g.hx - R || Math.abs(gy) > g.hy - R) continue;
      const dx = gx - cx, dy = gy - cy, dc = Math.hypot(dx, dy);
      if (dc < 1e-6) continue;
      const corte = Math.acos(limitar((dx * ux + dy * uy) / dc, -1, 1));
      if (corte > 1.25) continue;
      if (!libreCamino(S, cx, cy, gx, gy, [0, id]) || !libreCamino(S, t.x, t.y, qx, qy, [0, id])) continue;
      out.push({ ang: Math.atan2(dy, dx), pot: limitar(0.26 + 0.2 * (dc + dtp), 0.3, 0.9), score: corte * 1.2 + (dc + dtp) * 0.35 });
    }
  }
  cue.x = px0; cue.y = py0;
  return out.sort((a, b) => a.score - b.score);
}

function tiroSeguro(S, E, cx, cy) {
  const lista = objetivos(E).map((i) => bola(S, i)).filter((o) => o && o.activa);
  lista.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  const o = lista[0] || S.bolas.find((x) => x.id !== 0 && x.activa);
  return { ang: Math.atan2(o.y - cy, o.x - cx), pot: 0.5 };
}

function colocarMano(S, E, nivel, az) {
  const g = S.geo, maxX = E.mano === 'cabecera' ? -g.L / 4 : null;
  if (nivel.id === 1) { const p = posicionLibre(S, 0, -g.L / 4 - 0.1 * az(), (az() - 0.5) * 0.5, maxX); return p.ok ? p : posicionLibre(S, 0, -g.L / 4, 0, maxX); }
  let mejor = null, ms = 1e9;
  const muestras = nivel.id === 2 ? 10 : 24;
  for (let i = 0; i < muestras; i++) {
    const x = (maxX == null ? -g.hx : -g.hx) + 0.1 + az() * ((maxX == null ? g.L : g.L / 4) - 0.2), y = (az() - 0.5) * (g.W - 0.2);
    const p = posicionLibre(S, 0, x, y, maxX); if (!p.ok) continue;
    const c = candidatosPool(S, E, p.x, p.y);
    const sc = c.length ? c[0].score : 9;
    if (sc < ms) { ms = sc; mejor = p; }
  }
  return mejor || posicionLibre(S, 0, -g.L / 4, 0, maxX);
}

export async function elegirTiro(S, E, nivelId = 2, az = Math.random) {
  const nivel = NIVELES.find((n) => n.id === nivelId) || NIVELES[1];
  const id = idBlanca(E);
  let mano = null;
  const cue = bola(S, id);
  let cx = cue.x, cy = cue.y;
  if (E.mano) { mano = colocarMano(S, E, nivel, az); cx = mano.x; cy = mano.y; }
  let cands = [], mejor = null, ms = -1e9;
  const probar = async (t, i) => {
    const sc = puntuar(S, E, { ...t, mano });
    if (sc > ms) { ms = sc; mejor = t; }
    if (i % 6 === 5) await ceder();
  };
  if (esCarom(E.modo)) {
    const paso = nivel.id === 3 ? 3 : nivel.id === 2 ? 8 : 25;
    const pots = nivel.id === 3 ? [0.55, 0.8, 1] : nivel.id === 2 ? [0.7, 1] : [0.7];
    const spins = nivel.id === 3 ? [[0, 0], [0.35, 0], [-0.35, 0], [0, 0.3], [0, -0.3]] : nivel.id === 2 ? [[0, 0], [0.3, 0]] : [[0, 0]];
    let i = 0;
    const off = az() * paso;
    for (let d = 0; d < 360; d += paso) for (const pot of pots) for (const [a, b] of spins) await probar({ ang: ((d + off) * Math.PI) / 180, pot, a, b }, i++);
    if (nivel.id === 1) { mejor = null; ms = -1e9; for (let k = 0; k < 2; k++) await probar({ ang: az() * 6.283, pot: 0.5 + az() * 0.4 }, k); }
  } else {
    cands = candidatosPool(S, E, cx, cy);
    if (!cands.length) cands = [tiroSeguro(S, E, cx, cy)];
    const lista = cands.slice(0, nivel.cands);
    if (nivel.sims === 0) mejor = lista[0];
    else {
      let i = 0;
      const factores = nivel.pots === 2 ? [1, 0.8] : [1, 0.8, 1.25];
      const spins = nivel.id === 3 ? [[0, 0], [0, 0.3], [0, -0.3]] : [[0, 0]];
      for (const c of lista) for (const f of factores.slice(0, nivel.pots)) for (const [a, b] of spins) await probar({ ang: c.ang, pot: limitar(c.pot * f, 0.2, 1), a, b }, i++);
      const seg = tiroSeguro(S, E, cx, cy); await probar(seg, i++);
    }
  }
  if (!mejor) mejor = { ang: az() * 6.283, pot: 0.5 };
  return { ang: mejor.ang + gauss(az) * nivel.sAng, pot: limitar(mejor.pot * (1 + gauss(az) * nivel.sPot), 0.1, 1), a: mejor.a || 0, b: mejor.b || 0, mano };
}
