// Motor puro (sin DOM): plantas, zombis, dano, estados, terreno, oleadas y economia de nivel.
import { P, Z, FILAS, COLS, POOL_MUNDO } from './datos.js';

export const idx = (r, c) => r * COLS + c;
export function rnd(s) { s.sem = (s.sem + 0x6D2B79F5) >>> 0; let t = s.sem; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
export const ri = (s, n) => Math.floor(rnd(s) * n);
export const TM = [1, 1, 1.35, 1.8];
export const DIF = { facil: { n: 'Fácil', hp: 0.8, v: 0.9, pulso: 1 }, normal: { n: 'Normal', hp: 1, v: 1, pulso: 1 }, dificil: { n: 'Difícil', hp: 1.3, v: 1.1, pulso: 0 } };
const lvM = (lv) => 1 + 0.08 * ((lv || 1) - 1);

export function crear(cfg) {
  const niv = cfg.niv, dif = DIF[cfg.dif || 'normal'] || DIF.normal, tn = cfg.tienda || {}, mods = niv.mods || [];
  const s = {
    niv, t: 0, sem: (cfg.seed || 1) >>> 0, sig: 1, fin: null, ev: [], dif: cfg.dif || 'normal', hpM: dif.hp * (cfg.hpMult || 1) * (niv.hpMult || 1), vM: dif.v * (mods.includes('veloz') ? 1.3 : 1),
    ch: (niv.chIni != null ? niv.chIni : 50) + (tn.chispas ? 50 : 0) + (cfg.bonusCh || 0), en: Math.min(3, (niv.enIni || 0) + (tn.energia1 || 0) + (cfg.bonusEn || 0)), enMax: 3, auto: !!cfg.auto,
    cel: [], plantas: [], zombis: [], proy: [], orbes: [], cartas: [], pulso: [], efx: [], tiempo: { t: 0, f: 1 }, sigOla: 0, cielo: 5, spawned: 0,
    recM: (tn.recarga ? 0.85 : 1) * (mods.includes('recarga') ? 0.7 : 1) * (cfg.recM || 1), hpP: cfg.hpPlantas || 1, potenc: cfg.potenc || {}, dmM: 1 + (cfg.bonusDm || 0), arena: !!cfg.arena,
    bol: { mon: 0, gem: 0, col: [] }, st: { plantadas: 0, matados: 0, perdidas: 0, verdes: 0, poderes: 0, pulsos: 0, tumbas: 0, pesoMat: 0, mejoras: 0, brill: 0, pinatas: 0, energias: 0, soles: 0 },
    mec: { t: 0, carros: [], avisos: [], viento: { t: 8, dir: 0, dur: 0, aviso: 0 }, puente: 0 },
  };
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) s.cel.push({ p: null, base: null, ter: '', tb: 0, osc: 0, fase: 0 });
  (niv.ter || []).forEach((q) => { const cl = s.cel[idx(q.r, q.c)]; cl.ter = q.t; if (q.t === 'tumba') { cl.th = 100; cl.tt = 34 + (q.c % 3) * 8; } if (q.t === 'lava') { cl.fase = (q.ph != null ? q.ph : (q.r + q.c) * 1.7) % 9; } if (q.t === 'portal') cl.par = q.par; });
  const pg = s.cel.length; for (let r = 0; r < FILAS; r++) s.pulso.push((mods.includes('sinPulso') || dif.pulso === 0 ? 0 : 1) + (tn.pulso ? 1 : 0) + (cfg.bonusPulso || 0));
  (cfg.semillas || []).forEach((id) => s.cartas.push({ id, listo: mods.includes('cinta') || niv.tipo === 'cinta' ? 0 : (niv.tipo === 'jefe' ? 0 : 0), coste: P[id].coste }));
  if (niv.tipo === 'cinta' || mods.includes('cinta')) { s.cinta = { t: 1, cada: 4.5, max: 7, pool: (niv.cintaPool || cfg.semillas || []).slice() }; s.cartas = []; }
  s.olas = (niv.olas || []).map((o) => ({ ...o })).sort((a, b) => a.t - b.t);
  s.rest = s.olas.length; s.jefeVivo = false;
  return s;
}
const ev = (s, o) => { if (s.ev.length < 260) s.ev.push(o); };

/* ---------- consultas ---------- */
export const celda = (s, r, c) => (r < 0 || r >= FILAS || c < 0 || c >= COLS) ? null : s.cel[idx(r, c)];
export const plantaEn = (s, r, c) => { const cl = celda(s, r, c); return cl ? cl.p : null; };
export const vivo = (z) => z.estado !== 'muere';
export const golpeable = (z) => z.estado !== 'muere' && !z.fase && !(z.inv > 0) && z.x < 9.6 && z.x > -0.4;
export const hayZombiFila = (s, r, desde) => s.zombis.some((z) => z.r === r && z.x > desde && golpeable(z));
export const zombisVivos = (s) => s.zombis.filter(vivo).length;
export const perm = (p) => p.k === 'trampa' || p.k === 'mina' || p.k === 'base';
const nvT = (p) => TM[p.nv] * lvM(p.lv);

/* ---------- zombis ---------- */
export function crearZombi(s, tipo, r, x, op = {}) {
  const d = Z[tipo], hp = d.hp * s.hpM * (op.hpM || 1);
  const H = {}; (d.h || []).forEach((k) => { H[k] = 1; });
  const z = { id: s.sig++, tipo, r, x: x == null ? 9.4 : x, hp, hpMax: hp, arm: d.arm ? { hp: d.arm.hp * s.hpM * (op.armM || 1), hpMax: d.arm.hp * s.hpM * (op.armM || 1), t: d.arm.t, metal: !!d.arm.metal, frente: !!(d.arm.frente || H.escudo), mont: !!d.arm.mont } : null,
    H, estado: 'anda', fr: 0, cong: 0, qm: 0, ve: 0, at: 0, dorm: 0, edad: 0, tm: rnd(s) * 3, br: !!op.br, hijo: !!op.hijo, pin: !!d.pinata || !!op.pin, vuelo: !!H.vuelo, aire: !!H.vuelo, fase: 0, inv: 0, tcd: 3 + rnd(s) * 4, tinv: 5, tb: 6 + rnd(s) * 4, emb: 0, tp: 0, vel: 0, ph: 0, lzT: 1 + rnd(s) * 2, tcu: 0, sk: 0, atp: 0 };
  if (op.hijo) z.sk = 1;
  if (op.vago) z.vago = 1;
  s.zombis.push(z); if (d.jefe) s.jefeVivo = true; ev(s, { k: 'zombi', id: z.id, tipo, r }); return z;
}
export function danar(s, z, d, op = {}) {
  if (!vivo(z) || d < 0) return 0;
  if (z.inv > 0) { ev(s, { k: 'bloq', x: z.x, r: z.r }); return 0; }
  if (z.fase && !op.area) { ev(s, { k: 'bloq', x: z.x, r: z.r }); return 0; }
  d *= s.dmM; let rest = d;
  if (z.arm && z.arm.hp > 0 && !op.penArm && !(op.area && z.arm.frente)) {
    const a = Math.min(z.arm.hp, rest); z.arm.hp -= a; rest -= a; ev(s, { k: z.arm.metal ? 'golpeMetal' : 'golpe', x: z.x, r: z.r });
    if (z.arm.hp <= 0) { ev(s, { k: 'armaRota', x: z.x, r: z.r, id: z.id }); if (z.arm.mont) z.arm.mont = false; }
    if (op.frente && z.arm.frente) rest = 0;
  } else ev(s, { k: 'golpe', x: z.x, r: z.r });
  z.hp -= rest; z.hit = 0.12;
  const e = op.ef; if (e) {
    const rs = z.H.gigante ? 0.5 : 1;
    if (e.fr) z.fr = Math.max(z.fr, e.fr * rs); if (e.fz) z.cong = Math.max(z.cong, e.fz * rs); if (e.qm) z.qm = Math.max(z.qm, e.qm); if (e.ve) z.ve = Math.max(z.ve, e.ve); if (e.at) z.at = Math.max(z.at, e.at * rs); if (e.dorm) z.dorm = Math.max(z.dorm, e.dorm * rs);
    if (e.fr || e.fz) z.cong = z.cong; }
  if (z.hp <= 0) matar(s, z, op);
  return d;
}
export function matar(s, z, op = {}) {
  if (z.estado === 'muere') return; z.estado = 'muere'; z.tm = 0; const d = Z[z.tipo];
  if (z.arm && z.arm.hp > 0) z.arm.hp = 0;
  s.st.matados++; s.st.pesoMat += d.peso || 1; ev(s, { k: 'muere', x: z.x, r: z.r, id: z.id, tipo: z.tipo });
  if (z.br) { orbe(s, 'verde', z.x, z.r, 1); s.st.brill++; }
  if (z.pin) { s.st.pinatas++; for (let i = 0; i < 6; i++) orbe(s, i < 3 ? 'mon' : (i === 3 ? 'gema' : 'ch'), z.x + (rnd(s) - 0.5), z.r + (rnd(s) - 0.5), i < 3 ? 5 : (i === 3 ? 1 : 50)); const cs = colecciona(s); if (cs) s.bol.col.push(cs); ev(s, { k: 'pinata', x: z.x, r: z.r }); }
  else if (rnd(s) < 0.09) orbe(s, 'mon', z.x, z.r, 1 + (d.tier > 3 ? 4 : 0));
  if (!z.pin && rnd(s) < 0.02) { const cs = colecciona(s); if (cs) s.bol.col.push(cs); }
  if (d.jefe) { s.jefeVivo = false; for (let i = 0; i < 8; i++) orbe(s, i % 2 ? 'mon' : 'gema', z.x + (rnd(s) - 0.5) * 2, z.r + (rnd(s) - 0.5) * 2, i % 2 ? 10 : 2); s.zombis.forEach((q) => { if (q !== z && vivo(q)) { q.estado = 'muere'; q.tm = 0; q.hp = 0; ev(s, { k: 'muere', x: q.x, r: q.r, id: q.id, tipo: q.tipo }); } }); s.olas.length = 0; ev(s, { k: 'jefeCae' }); }
  if (z.H.parte && !z.hijo && !d.jefe) { for (let i = 0; i < 2; i++) { const q = crearZombi(s, z.tipo, z.r, z.x + i * 0.3, { hpM: 0.35 / s.hpM * s.hpM, hijo: true }); q.hp = q.hpMax = z.hpMax * 0.4; q.arm = null; } }
  if (z.vago) { for (let i = 0; i < 2; i++) crearZombi(s, 'vaquero', z.r, z.x + i * 0.4); }
}
function colecciona(s) { const m = s.niv.mundo != null && s.niv.mundo >= 0 ? s.niv.mundo : ri(s, 10); return 'f' + m + '_' + ri(s, 8); }
export function orbe(s, k, x, y, v) { const o = { id: s.sig++, k, x, y, v, t: 0, vy: 0, caer: k === 'ch' && v === 25 ? 1 : 0, yd: y }; if (o.caer) { o.y = -0.6; } s.orbes.push(o); return o; }

/* ---------- plantas ---------- */
export function puedePlantar(s, id, r, c) {
  const d = P[id], cl = celda(s, r, c); if (!d || !cl) return false;
  if (cl.ter === 'tumba') return false;
  if (cl.ter === 'agua') { if (d.k === 'base') return !cl.base && !cl.p; if (!(d.flota || cl.base)) return false; return !cl.p; }
  if (d.k === 'base') return false;
  return !cl.p;
}
export function colocar(s, id, r, c, op = {}) {
  const d = P[id], cl = s.cel[idx(r, c)], lv = (s.potenc && s.potenc[id]) || 1, hpm = d.hp * lvM(lv) * (op.hpM || 1) * (s.hpP || 1);
  const p = { id, r, c, k: d.k, hp: hpm, hpMax: hpm, t: d.int ? d.int * 0.6 : 0, nv: 1, lv: s.arena ? 3 : lv, ed: 0, atur: 0, fx: null, mom: op.tmp || 0, arm: 0, cola: 0, ch: 0, inv: 0, tmp: !!op.tmp, gigante: 0, rev: 0 };
  if (d.k === 'base') { cl.base = p; ev(s, { k: 'planta', r, c }); s.plantas.push(p); return p; }
  if (d.k === 'bomba') p.t = d.fuse || 0.6; if (d.k === 'mina') p.arm = d.arm; if (d.k === 'cepo') p.ch = 0;
  cl.p = p; s.plantas.push(p); ev(s, { k: 'planta', r, c, id });
  if (cl.ter === 'hielo' && (d.ef && d.ef.qm || d.ignifugo)) { cl.ter = ''; ev(s, { k: 'derrite', r, c }); }
  return p;
}
export function plantar(s, i, r, c) {
  const k = s.cartas[i]; if (!k || s.fin) return false; const d = P[k.id];
  if (!puedePlantar(s, k.id, r, c)) { ev(s, { k: 'error' }); return false; }
  const libre = !!s.cinta; if (!libre && (k.listo > s.t || s.ch < k.coste)) { ev(s, { k: 'error' }); return false; }
  if (!libre) { s.ch -= k.coste; k.listo = s.t + d.rec * s.recM; } else s.cartas.splice(i, 1);
  s.st.plantadas++; colocar(s, k.id, r, c); return true;
}
export const cartaLista = (s, i) => { const k = s.cartas[i]; return k ? Math.max(0, k.listo - s.t) : 0; };
export function costeMejora(s, p) { const d = P[p.id]; return p.nv >= 3 ? 0 : Math.round(d.coste * (p.nv === 1 ? 0.6 : 0.9) / 5) * 5 || 5; }
export function mejorar(s, p) {
  if (!p || p.nv >= 3 || s.fin) return false; const c = costeMejora(s, p); if (s.ch < c) { ev(s, { k: 'error' }); return false; }
  s.ch -= c; const antes = TM[p.nv]; p.nv++; const f = TM[p.nv] / antes; p.hpMax *= f; p.hp = p.hpMax; s.st.mejoras++; ev(s, { k: 'mejora', r: p.r, c: p.c, nv: p.nv }); return true;
}
export function quitar(s, p) {
  if (!p || s.fin) return false; const d = P[p.id]; if (!s.cinta && !p.tmp) s.ch += Math.floor(d.coste * 0.25);
  retirar(s, p); ev(s, { k: 'pala', r: p.r, c: p.c }); return true;
}
function retirar(s, p) { const cl = s.cel[idx(p.r, p.c)]; if (p.k === 'base') { if (cl.base === p) cl.base = null; if (cl.p && cl.ter === 'agua' && !P[cl.p.id].flota) { const q = cl.p; cl.p = null; const i = s.plantas.indexOf(q); if (i >= 0) s.plantas.splice(i, 1); } } else if (cl.p === p) cl.p = null; const i = s.plantas.indexOf(p); if (i >= 0) s.plantas.splice(i, 1); }
export function danarPlanta(s, p, d, z) {
  if (p.inv > 0) return; if (p.gigante > 0) d *= 0.3; p.hp -= d; p.hit = 0.1;
  if (z && P[p.id].thorn) danar(s, z, d * P[p.id].thorn / 40, { area: true, penArm: true });
  if (p.hp <= 0) destruir(s, p);
}
export function destruir(s, p) {
  const d = P[p.id]; retirar(s, p); s.st.perdidas++; ev(s, { k: 'planta_muere', r: p.r, c: p.c, id: p.id });
  if (d.revive && !p.tmp && !p.rev) s.efx.push({ k: 'revive', r: p.r, c: p.c, id: p.id, t: d.revive });
}

/* ---------- area ---------- */
export function area(s, cx, cr, rad, d, op = {}) {
  let n = 0;
  for (const z of s.zombis) { if (!vivo(z) || (z.aire && !op.aire) || z.x > 9.7) continue; const dx = z.x - cx, dy = (z.r + 0.5 - 0.5 - cr) * 0.9; if (dx * dx + dy * dy <= rad * rad) { danar(s, z, d, { ...op, area: true }); n++; } }
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) { const cl = s.cel[idx(r, c)]; if (cl.ter === 'tumba' && (c + 0.5 - cx) ** 2 + (r - cr) ** 2 <= rad * rad) { cl.th -= d >= 300 ? 100 : 40; if (cl.th <= 0) romperTumba(s, r, c); } }
  ev(s, { k: 'area', x: cx, r: cr, rad, c: op.col }); return n;
}
function romperTumba(s, r, c) { const cl = s.cel[idx(r, c)]; if (cl.ter !== 'tumba') return; cl.ter = ''; s.st.tumbas++; ev(s, { k: 'tumbaRota', r, c }); if (rnd(s) < 0.5) orbe(s, 'mon', c + 0.5, r, 2); }
export function golpearTumba(s, r, c) { const cl = celda(s, r, c); if (!cl || cl.ter !== 'tumba') return false; cl.th -= 20; ev(s, { k: 'tumbaGolpe', r, c }); if (cl.th <= 0) romperTumba(s, r, c); return true; }

/* ---------- orbes ---------- */
export function recoger(s, id) {
  const i = s.orbes.findIndex((o) => o.id === id); if (i < 0) return 0; const o = s.orbes[i]; s.orbes.splice(i, 1);
  if (o.k === 'ch') { s.ch += o.v; s.st.soles++; } else if (o.k === 'mon') s.bol.mon += o.v; else if (o.k === 'gema') s.bol.gem += o.v; else if (o.k === 'verde') { if (s.en < s.enMax) s.en++; s.st.verdes++; }
  ev(s, { k: 'recoge', o: o.k, x: o.x, y: o.y, v: o.v }); return o.v;
}
export function recogerTodo(s) { [...s.orbes].forEach((o) => recoger(s, o.id)); }

/* ---------- poderes de dedo ---------- */
export function poder(s, id, z, op = {}) {
  if (!z || !vivo(z) || s.fin) return false; s.st.poderes++;
  if (id === 'pellizcar') { danar(s, z, 150, { penArm: true, ef: { at: 1.5 } }); ev(s, { k: 'pellizco', x: z.x, r: z.r }); return true; }
  if (id === 'sacudir') { if (z.arm) z.arm.hp = 0; z.at = Math.max(z.at, 2.5); danar(s, z, 20, { penArm: true }); ev(s, { k: 'sacude', x: z.x, r: z.r }); return true; }
  if (id === 'lanzar') {
    const r = Math.max(0, Math.min(FILAS - 1, op.r != null ? op.r : z.r)), x = Math.max(0.6, Math.min(9.4, op.x != null ? op.x : z.x + 1.5));
    if (z.H.gigante) { z.at = Math.max(z.at, 1); danar(s, z, 100, {}); return true; }
    ev(s, { k: 'lanza', x: z.x, r: z.r, x2: x, r2: r }); z.r = r; z.x = x; z.at = Math.max(z.at, 1.2); z.aire = false; danar(s, z, 90, { penArm: true }); return true;
  }
  return false;
}
export function objetivoCercano(s, x, y) { let b = null, bd = 1e9; for (const z of s.zombis) { if (!vivo(z) || z.x > 9.8) continue; const d = (z.x - x) ** 2 + ((z.r + 0.5) - y) ** 2 * 1.2; if (d < bd) { bd = d; b = z; } } return bd < 1.6 ? b : null; }

/* ---------- paso de simulacion ---------- */
export function paso(s, dt) {
  if (s.fin) return; s.t += dt;
  if (s.tiempo.t > 0) { s.tiempo.t -= dt; if (s.tiempo.t <= 0) s.tiempo.f = 1; }
  oleadas(s, dt); cielo(s, dt); terreno(s, dt); auras(s); plantasPaso(s, dt); zombisPaso(s, dt); proyPaso(s, dt); orbesPaso(s, dt); efxPaso(s, dt); cintaPaso(s, dt);
  s.zombis = s.zombis.filter((z) => z.estado !== 'muere' || (z.tm += 0, z.tm < 0.9)); s.zombis.forEach((z) => { if (z.estado === 'muere') z.tm += dt; });
  comprobarFin(s);
}
function oleadas(s, dt) {
  while (s.olas.length && s.olas[0].t <= s.t) {
    const o = s.olas.shift();
    if (o.aviso) ev(s, { k: 'ola', t: o.aviso });
    if (o.z) { if (o.vago) vagoneta(s, o.r); else crearZombi(s, o.z, o.r, null, { br: o.br, pin: o.pin, hpM: o.hpM, armM: o.armM }); s.spawned++; }
  }
}
function cielo(s, dt) {
  if (!s.niv.cielo) return; s.cielo -= dt; if (s.cielo <= 0) { s.cielo = (s.niv.cieloInt || 9) * (s.niv.mods && s.niv.mods.includes('lluviaChispas') ? 0.35 : 1) + rnd(s) * 3; orbe(s, 'ch', 0.8 + rnd(s) * 7.6, ri(s, FILAS), 25); }
}
function cintaPaso(s, dt) {
  const c = s.cinta; if (!c) return; c.t -= dt; if (c.t <= 0 && s.cartas.length < c.max) { c.t = c.cada; const id = c.pool[ri(s, c.pool.length)]; s.cartas.push({ id, listo: 0, coste: 0 }); }
}

/* terreno ---------------------------------------------------------- */
function vagoneta(s, r) { const z = crearZombi(s, 'vagoneta', r, 9.7, { vago: true }); return z; }
function terreno(s, dt) {
  const m = s.mec, mu = s.niv.mecanica; m.t += dt;
  for (let i = 0; i < s.cel.length; i++) {
    const cl = s.cel[i];
    if (cl.osc > 0) cl.osc -= dt;
    if (cl.ter === 'tumba') { cl.tt -= dt; if (cl.tt <= 0) { cl.tt = 50 + rnd(s) * 15; if (s.zombis.length < 40) crearZombi(s, 'momia', Math.floor(i / COLS), (i % COLS) + 0.6); ev(s, { k: 'tumbaAbre', r: Math.floor(i / COLS), c: i % COLS }); } }
    if (cl.ter === 'lava') { cl.fase += dt; const f = cl.fase % 9; if (f < dt && cl.fase > 1) { /* nada */ } if (f >= 5.5 && f - dt < 5.5) ev(s, { k: 'lavaAviso', r: Math.floor(i / COLS), c: i % COLS }); if (f >= 7.5 && f - dt < 7.5) erupcion(s, Math.floor(i / COLS), i % COLS); }
  }
  if (mu === 'apagon') { m.tA = (m.tA == null ? 6 : m.tA) - dt; if (m.tA <= 0) { m.tA = 13 + rnd(s) * 4; const n = 3 + ri(s, 3); for (let k = 0; k < n; k++) { const cl = s.cel[idx(ri(s, FILAS), 1 + ri(s, COLS - 1))]; cl.osc = 7; } ev(s, { k: 'apagon' }); } }
  if (mu === 'viento') {
    const v = m.viento; if (v.dur > 0) { v.dur -= dt; if (v.dur <= 0) v.dir = 0; } else if (v.aviso > 0) { v.aviso -= dt; if (v.aviso <= 0) { v.dur = 5; v.dir = v.pend; ev(s, { k: 'viento', dir: v.dir }); } } else { v.t -= dt; if (v.t <= 0) { v.t = 12 + rnd(s) * 8; v.aviso = 2; v.pend = rnd(s) < 0.5 ? 1 : -1; ev(s, { k: 'vientoAviso', dir: v.pend }); } }
  }
  if (mu === 'rieles' && !s.niv.sinCarros) { m.tc = (m.tc == null ? 38 : m.tc) - dt; const filas = s.niv.rieles || []; if (m.tc <= 0 && filas.length) { m.tc = (s.niv.cartaInt || 26) + rnd(s) * 8; const r = filas[ri(s, filas.length)]; m.avisos.push({ r, t: 3 }); ev(s, { k: 'carroAviso', r }); } }
  for (let i = m.avisos.length - 1; i >= 0; i--) { m.avisos[i].t -= dt; if (!m.avisos[i].nave && m.avisos[i].t <= 0) { vagoneta(s, m.avisos[i].r); m.avisos.splice(i, 1); } }
  if (mu === 'medieval' || mu === 'almenas') { m.puente = (m.puente + dt) % 24; }
  if (mu === 'pistas') {
    m.tn = (m.tn == null ? 18 : m.tn) - dt; const pf = s.niv.pistas || [];
    if (m.tn <= 0 && pf.length) { m.tn = (s.niv.naveInt || 22) + rnd(s) * 6; const r = pf[ri(s, pf.length)], c = 4 + ri(s, 4); m.avisos.push({ r, c, t: 2.8, nave: 1 }); ev(s, { k: 'naveAviso', r, c }); }
    for (let i = m.avisos.length - 1; i >= 0; i--) { const a = m.avisos[i]; if (!a.nave) continue; if (a.t <= 0) { aterrizar(s, a.r, a.c); m.avisos.splice(i, 1); } }
  }
}
function aterrizar(s, r, c) {
  const cl = s.cel[idx(r, c)]; if (cl.p) destruir(s, cl.p); if (cl.base) retirar(s, cl.base);
  area(s, c + 0.5, r, 1.2, 150, { col: '#aab8ff' }); ev(s, { k: 'naveAterriza', r, c });
  const pool = POOL_MUNDO(9).filter((id) => Z[id].tier <= 3); const n = 2 + ri(s, 2); for (let i = 0; i < n; i++) crearZombi(s, pool[ri(s, pool.length)], r, c + 0.6 + i * 0.3);
}
function erupcion(s, r, c) {
  const cl = s.cel[idx(r, c)]; ev(s, { k: 'lava', r, c });
  if (cl.p && !(P[cl.p.id].ignifugo)) { destruir(s, cl.p); }
  for (const z of s.zombis) if (vivo(z) && z.r === r && Math.floor(z.x) === c && !z.aire) danar(s, z, 180, { ef: { qm: 3 }, area: true });
}
export const viento = (s) => (s.niv.mecanica === 'viento' ? s.mec.viento.dir * (s.mec.viento.dur > 0 ? 1 : 0) : 0);
export const oscuro = (s, p) => { const cl = s.cel[idx(p.r, p.c)]; return cl.osc > 0 && !p.luz; };

/* auras ------------------------------------------------------------ */
function auras(s) {
  for (const p of s.plantas) { p.rate = 1; p.dm = 1; p.luz = 0; p.slowA = 0; }
  for (const p of s.plantas) {
    const d = P[p.id]; if (p.atur > 0) continue;
    if (d.k === 'aura' || d.k === 'luz') {
      for (const q of s.plantas) { if (q === p) continue; const dx = Math.abs(q.c - p.c), dy = Math.abs(q.r - p.r); if (dx * dx + dy * dy <= d.rad * d.rad + 0.01) { if (d.rate) q.rate *= d.rate; if (d.dano) q.dm *= d.dano; } }
      if (d.k === 'luz' || d.id === 'faro') for (const q of s.plantas) { const dx = Math.abs(q.c - p.c), dy = Math.abs(q.r - p.r); if (dx * dx + dy * dy <= d.rad * d.rad + 0.01) q.luz = 1; }
    }
    if (p.id === 'faro') { p.luz = 1; }
  }
  for (const p of s.plantas) { if (s.cel[idx(p.r, p.c)].ter === 'almena') p.dm *= 1.4; if (p.fx) { p.rate *= p.fx.mult; p.dm *= p.fx.dano; } }
}

/* plantas ---------------------------------------------------------- */
function objetivoFila(s, r, desde, aire) { let b = null; for (const z of s.zombis) if (z.r === r && z.x > desde && golpeable(z) && (aire || !z.aire) && (!b || z.x < b.x)) b = z; return b; }
function plantasPaso(s, dt) {
  const lista = s.plantas.slice();
  for (const p of lista) {
    if (!s.plantas.includes(p)) continue; const d = P[p.id];
    if (p.hit > 0) p.hit -= dt; if (p.inv > 0) p.inv -= dt; if (p.gigante > 0) p.gigante -= dt; if (p.fx) { p.fx.t -= dt; if (p.fx.t <= 0) p.fx = null; }
    if (p.tmp) { p.mom -= dt; if (p.mom <= 0) { retirar(s, p); continue; } }
    if (d.regen && p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + d.regen * dt * 0.04 * 4);
    if (p.regenT > 0) { p.regenT -= dt; p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.06 * dt); }
    if (p.esp) { p.esp.t -= dt; p.esp.c -= dt; if (p.esp.c <= 0) { p.esp.c = 0.5; for (const z of s.zombis) if (golpeable(z) && !z.aire && Math.abs(z.r - p.r) <= 1 && Math.abs(z.x - (p.c + 0.5)) <= p.esp.rad) danar(s, z, p.esp.d * 0.5, { area: true, penArm: true }); ev(s, { k: 'espinas', r: p.r, c: p.c }); } if (p.esp.t <= 0) p.esp = null; }
    if (p.gigante > 0) { p.gc = (p.gc || 0) - dt; if (p.gc <= 0) { p.gc = 0.5; area(s, p.c + 0.5, p.r, 1.3, 60, { area: true, col: '#b0b0b0' }); } }
    if (p.atur > 0) { p.atur -= dt; continue; }
    if (oscuro(s, p)) continue;
    const dm = p.dm * nvT(p) * s.dmM, rate = p.rate;
    switch (d.k) {
      case 'prod': { p.t += dt * rate; const pr = d.pr; if (p.t >= d.int) { p.t = 0; const v = Math.round(pr * nvT(p) / 5) * 5; if (d.id === 'singular' || d.pr) { orbe(s, 'ch', p.c + 0.5, p.r, v).yd = p.r; } } if (d.tiraInt) { p.t2 = (p.t2 || 0) + dt * rate; const z = objetivoFila(s, p.r, p.c + 0.5, true); if (z && p.t2 >= d.tiraInt) { p.t2 = 0; disparar(s, p, 0, d.d * dm, d); } } break; }
      case 'tira': {
        p.t += dt * rate; const filas = d.carr || [0]; let z = null; for (const o of filas) { const rr = p.r + o; if (rr < 0 || rr >= FILAS) continue; z = z || objetivoFila(s, rr, p.c + 0.5, true); }
        if (z && p.t >= d.int) { p.t = 0; const n = d.rafaga || d.nb || 1; for (const o of filas) { const rr = p.r + o; if (rr < 0 || rr >= FILAS) continue; for (let i = 0; i < n; i++) disparar(s, p, o, d.d * dm * (d.rafaga ? 1 : 1), d, i * 0.11); } if (p.fx && p.fx.mult > 3) ev(s, { k: 'dispara', r: p.r, quiet: true }); else ev(s, { k: 'dispara', r: p.r, c: p.c, col: d.col[0] }); }
        break; }
      case 'rayo': { p.t += dt * rate; const z = objetivoFila(s, p.r, p.c + 0.5, true); if (z && p.t >= d.int) { p.t = 0; cadena(s, p, z, d.d * dm, d.cad); } break; }
      case 'lob': { p.t += dt * rate; const z = objetivoFila(s, p.r, p.c + 1.2, false); if (z && p.t >= d.int) { p.t = 0; const x1 = Math.max(p.c + 1.2, z.x - z.vel * 0.9); s.efx.push({ k: 'lob', r: p.r, x0: p.c + 0.5, x1, t: 0, T: 0.9, d: d.d * dm, rad: d.rad, ef: d.ef, col: d.col[0] }); ev(s, { k: 'lobSale', r: p.r, c: p.c }); } break; }
      case 'bomba': { p.t -= dt; if (p.t <= 0) explotarBomba(s, p, d, dm); break; }
      case 'mina': { if (p.arm > 0) { p.arm -= dt; break; } const z = s.zombis.find((q) => q.r === p.r && golpeable(q) && !q.aire && Math.abs(q.x - (p.c + 0.5)) <= d.rad); if (z) { area(s, p.c + 0.5, p.r, 1.1, d.d * dm, { col: '#ffaa55' }); ev(s, { k: 'explosion', x: p.c + 0.5, r: p.r }); retirar(s, p); } break; }
      case 'trampa': { p.t += dt; if (p.t >= d.int) { p.t = 0; let n = 0; for (const z of s.zombis) if (z.r === p.r && golpeable(z) && !z.aire && Math.floor(z.x) === p.c) { danar(s, z, d.d * dm, { penArm: true, area: true }); n++; } if (n) ev(s, { k: 'pincho', r: p.r, c: p.c }); } break; }
      case 'cepo': { if (p.ch > 0) { p.ch -= dt; break; } const z = s.zombis.find((q) => q.r === p.r && golpeable(q) && !q.aire && Math.abs(q.x - (p.c + 0.5)) <= 0.5); if (z) { if (z.H.gigante || Z[z.tipo].jefe) danar(s, z, 450 * nvT(p), { area: true, penArm: true }); else { z.hp = 0; matar(s, z); } p.ch = d.chew; ev(s, { k: 'muerde', r: p.r, c: p.c }); } break; }
      case 'aura': { if (d.slow || d.cura) { if (d.cura) for (const q of s.plantas) { const dx = q.c - p.c, dy = q.r - p.r; if (dx * dx + dy * dy <= d.rad * d.rad + 0.01 && q.hp < q.hpMax) q.hp = Math.min(q.hpMax, q.hp + d.cura * dt * nvT(p)); } } break; }
      case 'sueno': { p.t += dt * rate; if (p.t >= d.int) { const z = s.zombis.find((q) => golpeable(q) && Math.abs(q.r - p.r) <= 1 && Math.abs(q.x - (p.c + 0.5)) <= d.rad); if (z) { p.t = 0; for (const q of s.zombis) if (golpeable(q) && Math.abs(q.r - p.r) <= 1 && Math.abs(q.x - (p.c + 0.5)) <= d.rad) q.dorm = Math.max(q.dorm, d.dur * nvT(p) * 0.8); ev(s, { k: 'sueno', r: p.r, c: p.c }); } } break; }
      case 'tornado': { p.t += dt * rate; if (p.t >= d.int && objetivoFila(s, p.r, p.c + 0.5, true)) { p.t = 0; for (const q of s.zombis) if (golpeable(q) && Math.abs(q.r - p.r) <= 0 && q.x > p.c && q.x < p.c + 3.6 && !q.H.gigante) { q.x = Math.min(9.5, q.x + d.emp); danar(s, q, d.d * dm, { area: true }); } ev(s, { k: 'tornado', r: p.r, c: p.c }); } break; }
      case 'tormenta': { p.t += dt * rate; if (p.t >= d.int) { const z = s.zombis.filter((q) => golpeable(q) && !q.aire && q.x < 9.2); if (z.length) { p.t = 0; const q = z[ri(s, z.length)]; area(s, q.x, q.r, d.rad, d.d * dm, { col: '#ffe84a' }); ev(s, { k: 'rayoCae', x: q.x, r: q.r }); } } break; }
      case 'paradoja': { p.t += dt * rate; if (p.t >= d.int) { const z = objetivoFila(s, p.r, p.c + 0.5, true); if (z && !Z[z.tipo].jefe && z.x < 8) { p.t = 0; ev(s, { k: 'paradoja', x: z.x, r: z.r, x2: 9.4 }); z.x = 9.4; z.at = Math.max(z.at, 1); } } break; }
      case 'iman': { p.t += dt * rate; if (p.t >= d.int) { const z = s.zombis.filter((q) => q.r === p.r && golpeable(q) && q.arm && q.arm.hp > 0 && q.arm.metal && q.x > p.c && q.x < p.c + d.alc + 0.5).sort((a, b) => a.x - b.x)[0]; if (z) { p.t = 0; z.arm.hp = 0; ev(s, { k: 'imana', x: z.x, r: z.r, c: p.c }); } } break; }
    }
  }
  for (let i = s.efx.length - 1; i >= 0; i--) { const e = s.efx[i]; if (e.k === 'revive') { e.t -= dt; if (e.t <= 0) { s.efx.splice(i, 1); if (!s.cel[idx(e.r, e.c)].p && puedePlantar(s, e.id, e.r, e.c)) { const q = colocar(s, e.id, e.r, e.c); q.rev = 1; ev(s, { k: 'revive', r: e.r, c: e.c }); } } } }
}
function disparar(s, p, o, d, def, esp = 0) {
  const r = p.r + o; s.proy.push({ id: s.sig++, r, x: p.c + 0.9, v: 6.2, d, ef: def.ef || null, perf: !!def.perf, penArm: !!def.penArm, boom: !!def.boom, back: 0, split: !!def.split, esp, hit: [], col: def.col[0], from: p.id, vsAgua: def.vsAgua || 0, tp: 0, mine: 1 });
}
function cadena(s, p, z0, d, n) {
  const usados = [z0]; let z = z0, x = p.c + 0.5, r = p.r; const pts = [{ x, r }]; let dd = d;
  for (let i = 0; i < n && z; i++) { pts.push({ x: z.x, r: z.r }); danar(s, z, dd, {}); dd *= 0.8; x = z.x; r = z.r; let b = null, bd = 6; for (const q of s.zombis) { if (usados.includes(q) || !golpeable(q)) continue; const dist = Math.hypot(q.x - x, q.r - r); if (dist < bd) { bd = dist; b = q; } } z = b; if (z) usados.push(z); }
  ev(s, { k: 'rayo', pts });
}
function explotarBomba(s, p, d, dm) {
  const x = p.c + 0.5; ev(s, { k: 'explosion', x, r: p.r });
  if (d.fila) { for (const z of s.zombis) if (z.r === p.r && vivo(z) && !z.aire) danar(s, z, d.d * dm, { ef: d.ef, area: true }); for (let c = 0; c < COLS; c++) { const cl = s.cel[idx(p.r, c)]; if (cl.ter === 'hielo') cl.ter = ''; } ev(s, { k: 'fuegoFila', r: p.r }); }
  else if (d.cong) { for (const z of s.zombis) if (vivo(z)) danar(s, z, d.d * dm, { ef: { fz: d.cong * TM[p.nv] }, area: true }); ev(s, { k: 'congelaTodo' }); }
  else area(s, x, p.r, d.rad, d.d * dm, { col: '#ff9a4a' });
  if (d.rad >= 1) for (let r = Math.max(0, p.r - 1); r <= Math.min(FILAS - 1, p.r + 1); r++) for (let c = Math.max(0, p.c - 1); c <= Math.min(COLS - 1, p.c + 1); c++) { const cl = s.cel[idx(r, c)]; if (cl.ter === 'hielo' && d.ef && d.ef.qm) cl.ter = ''; }
  retirar(s, p);
}

/* proyectiles ------------------------------------------------------ */
function proyPaso(s, dt) {
  const w = viento(s);
  for (let i = s.proy.length - 1; i >= 0; i--) {
    const q = s.proy[i]; if (q.esp > 0) { q.esp -= dt; continue; }
    if (q.enem) { // proyectil zombi: avanza a la izquierda y golpea la primera planta
      q.x -= q.v * dt; const c = Math.floor(q.x); const pl = plantaEn(s, q.r, c);
      if (pl && !perm(pl) && !(pl.k === 'base')) { if (P[pl.id].refl) { q.enem = false; q.v = 6; q.d = q.d * 2; q.mine = 1; q.hit = []; ev(s, { k: 'refleja', x: q.x, r: q.r }); continue; } danarPlanta(s, pl, q.d); ev(s, { k: 'impactoP', x: q.x, r: q.r }); s.proy.splice(i, 1); continue; }
      if (q.x < -0.5) s.proy.splice(i, 1); continue;
    }
    const dir = q.back ? -1 : 1, f = 1 + (w === 1 ? 0.5 : w === -1 ? -0.4 : 0), x0 = q.x; q.x += q.v * dt * dir * (f > 0.2 ? f : 0.2); const lo = Math.min(x0, q.x) - 0.32, hi = Math.max(x0, q.x) + 0.32;
    portalProy(s, q);
    let quita = false;
    for (const z of s.zombis) {
      if (z.r !== q.r || !golpeable(z) || q.hit.includes(z.id) || z.x < lo || z.x > hi) continue;
      let d = q.d; if (q.vsAgua && (celda(s, z.r, Math.floor(z.x)) || {}).ter === 'agua') d *= q.vsAgua;
      danar(s, z, d, { ef: q.ef, perf: q.perf, penArm: q.penArm, frente: true }); q.hit.push(z.id); ev(s, { k: 'impacto', x: q.x, r: q.r, col: q.col });
      if (q.split && !q.splitHecho) { q.splitHecho = 1; for (const o of [-1, 1]) if (q.r + o >= 0 && q.r + o < FILAS) s.proy.push({ ...q, id: s.sig++, r: q.r + o, hit: [z.id], splitHecho: 1, split: false }); }
      if (!q.perf) { quita = true; break; }
    }
    if (quita) { s.proy.splice(i, 1); continue; }
    if (q.boom && !q.back && q.x > 9.1) { q.back = 1; q.hit = []; }
    if ((!q.back && q.x > 10.2) || (q.back && q.x < -0.2) || q.x < -0.5) s.proy.splice(i, 1);
  }
}
function portalProy(s, q) {
  if (q.tp > 0) { q.tp -= 0.016; return; } const c = Math.floor(q.x), cl = celda(s, q.r, c); if (!cl || cl.ter !== 'portal' || !cl.par) return;
  if (Math.abs(q.x - (c + 0.5)) < 0.15) { const [r2, c2] = cl.par; q.r = r2; q.x = c2 + 0.55; q.tp = 0.5; ev(s, { k: 'portal', r: r2, c: c2 }); }
}

/* zombis ----------------------------------------------------------- */
const velBase = (s, z, d) => (z.arm && z.arm.mont && z.arm.hp > 0 ? d.v : (d.arm && d.arm.mont ? 0.2 : d.v));
function zombisPaso(s, dt) {
  const mu = s.niv.mecanica;
  for (const z of s.zombis) {
    if (z.estado === 'muere') continue; const d = Z[z.tipo]; z.edad += dt; if (z.hit > 0) z.hit -= dt;
    // estados
    if (z.qm > 0) { z.qm -= dt; z.hp -= 12 * dt; if (z.hp <= 0) { matar(s, z); continue; } }
    if (z.ve > 0) { z.ve -= dt; z.hp -= (z.veD || 8) * dt; if (z.hp <= 0) { matar(s, z); continue; } }
    if (z.fr > 0) z.fr -= dt; if (z.cong > 0) z.cong -= dt; if (z.at > 0) z.at -= dt; if (z.dorm > 0) z.dorm -= dt; if (z.inv > 0) z.inv -= dt; if (z.fase > 0) z.fase -= dt; if (z.tcu > 0) z.tcu -= dt;
    z.vel = 0;
    if (z.cong > 0 || z.at > 0 || z.dorm > 0) { z.comiendo = false; continue; }
    // habilidades de periodo
    habilidades(s, z, d, dt);
    if (z.estado === 'muere') continue;
    const cx = Math.floor(z.x - 0.25), cl = celda(s, z.r, Math.floor(z.x));
    let v = velBase(s, z, d) * s.vM * (z.emb > 0 ? 3.2 : 1) * (z.buffed ? 1.35 : 1);
    if (z.fr > 0) v *= 0.5;
    if (s.tiempo.t > 0) v *= s.tiempo.f;
    let sl = 0; for (const p of s.plantas) if (p.k === 'aura' && P[p.id].slow && p.atur <= 0 && !oscuro(s, p) && Math.abs(p.r - z.r) <= 1 && Math.abs(p.c + 0.5 - z.x) <= P[p.id].rad) sl = Math.max(sl, P[p.id].slow * TM[p.nv]); if (sl) v *= 1 - Math.min(0.8, sl);
    if (cl) { if (cl.ter === 'hielo') v *= 1.7; if (cl.ter === 'agua' && !z.aire) v *= 1.25; }
    if (mu === 'medieval' && s.mec.puente > 14 && z.x > 6 && z.x < 7.2) v *= 0.4;
    const wv = viento(s); if (wv) v *= wv === -1 ? 1.4 : 0.7;
    if (z.H.vuelo) z.aire = z.x > 2.2; 
    z.vel = v;
    // portal
    if (cl && cl.ter === 'portal' && cl.par && z.tp <= 0 && Math.abs(z.x - (Math.floor(z.x) + 0.5)) < 0.12) { const [r2, c2] = cl.par; z.r = r2; z.x = c2 + 0.5; z.tp = 1.6; ev(s, { k: 'portal', r: r2, c: c2 }); }
    z.tp = Math.max(0, z.tp - dt);
    // objetivo planta
    const pl = z.aire ? null : plantaEn(s, z.r, cx);
    if (d.id === 'vagoneta' || z.vago) { carro(s, z, dt, v); continue; }
    // lanzadores
    if (z.H.lanza && lanzar(s, z, d, dt)) continue;
    if (pl && !pl.tmpIgnora && !perm(pl) && z.x - 0.25 >= cx + 0.1 && !z.salta) {
      if (z.H.salto && !z.saltado) { z.saltado = 1; z.sx = z.x; z.salta = 0.55; ev(s, { k: 'salto', x: z.x, r: z.r }); continue; }
      if (z.H.explota) { ev(s, { k: 'explosion', x: z.x, r: z.r }); area(s, z.x - 0.4, z.r, 1.6, 0, { col: '#ff7a2a' }); for (const q of s.plantas.slice()) if (Math.abs(q.r - z.r) <= 1 && Math.abs(q.c + 0.5 - z.x) <= 1.6) danarPlanta(s, q, 400); z.hp = 0; matar(s, z); continue; }
      z.comiendo = true; const dps = d.dps * (z.emb > 0 ? 3 : 1) * (d.jefe ? 1 : 1);
      if (z.H.atrapa && !pl.atrapada) { pl.atrapada = 1; pl.atur = 4; ev(s, { k: 'atrapa', r: pl.r, c: pl.c }); }
      if (pl.sticky === undefined) pl.sticky = !!P[pl.id].sticky; if (pl.sticky) z.fr = Math.max(z.fr, 2.5);
      danarPlanta(s, pl, dps * dt * (z.dorm > 0 ? 0 : 1), z); z.mord = (z.mord || 0) + dt; if (z.mord > 0.5) { z.mord = 0; ev(s, { k: 'muerde', x: z.x, r: z.r }); }
      if (z.emb > 0 && pl.hp > 0 && z.emb < 1e9) { /* embiste sigue comiendo rapido */ }
      continue;
    }
    // si comia y ya no hay planta: sigue
    z.comiendo = false;
    if (z.salta) { z.salta -= dt; z.x -= 1.9 * dt; if (z.salta <= 0) { z.salta = 0; } continue; }
    z.x -= v * dt;
    if (wv) z.x += wv * 0.1 * dt;
    if (z.x < -0.3) { llegoFin(s, z); }
  }
}
function llegoFin(s, z) {
  if (z.estado === 'muere') return; const r = z.r;
  if (s.pulso[r] > 0) { s.pulso[r]--; s.st.pulsos++; ev(s, { k: 'pulso', r }); for (const q of s.zombis) if (q.r === r && vivo(q) && q.x < 9.6 && !Z[q.tipo].jefe) { q.hp = 0; matar(s, q); } if (vivo(z)) { z.x = 1.5; z.at = 3; if (z.H.gigante || Z[z.tipo].jefe) z.x = 2.6; } return; }
  s.fin = 'derrota'; ev(s, { k: 'fin', r: 'derrota' });
}
function carro(s, z, dt, v) {
  z.estado = 'anda'; z.x -= 2.7 * dt; const c = Math.floor(z.x - 0.2), pl = plantaEn(s, z.r, c);
  if (pl && !perm(pl) && !z.golpeo) { z.golpeo = 1; ev(s, { k: 'carroGolpe', x: z.x, r: z.r }); danarPlanta(s, pl, 600); if (pl.hp > 0) { z.hp = 0; matar(s, z); return; } }
  if (z.golpeo && !plantaEn(s, z.r, Math.floor(z.x - 0.2))) z.golpeo = 0;
  if (z.x < -0.3) { z.hp = 0; z.vago = 0; llegoFin(s, z); z.estado = 'muere'; z.tm = 1; }
}
function lanzar(s, z, d, dt) {
  const lz = z.tipoLz || d.lz; if (!lz) return false; z.lzT -= dt; let blanco = null;
  for (let c = Math.floor(z.x - 0.4); c >= Math.max(0, Math.floor(z.x - lz.r)); c--) { const p = plantaEn(s, z.r, c); if (p && !perm(p)) { blanco = p; break; } }
  if (!blanco) return false;
  if (z.x - (blanco.c + 1) < 1.2) return false; // ya cerca: va a morder
  if (z.lzT <= 0) { z.lzT = lz.t; s.proy.push({ id: s.sig++, r: z.r, x: z.x - 0.4, v: 3.2, d: lz.d, enem: true, esp: 0, hit: [], col: '#ff6a4a' }); ev(s, { k: 'lanzaZ', x: z.x, r: z.r }); }
  return true;
}
function habilidades(s, z, d, dt) {
  const H = z.H;
  if (H.cura) { z.tcu = (z.tcu || 0); z.tcuP = (z.tcuP || 0) - dt; if (z.tcuP <= 0) { z.tcuP = 1; for (const q of s.zombis) if (q !== z && vivo(q) && Math.abs(q.r - z.r) <= 1 && Math.abs(q.x - z.x) <= 2.2 && q.hp < q.hpMax) { q.hp = Math.min(q.hpMax, q.hp + 14); z.healed = 0.4; } } }
  if (H.buff) { z.bP = (z.bP || 0) - dt; if (z.bP <= 0) { z.bP = 0.5; for (const q of s.zombis) if (q !== z && vivo(q)) q.buffed = (Math.abs(q.x - z.x) <= 2.5 && Math.abs(q.r - z.r) <= 1) ? 1 : (q.buffed && 0); } }
  if (H.fase) { z.ph += dt; const c = z.ph % 4.5; z.fase = c > 3 ? 1.5 - (c - 3) : 0; if (c > 3) z.fase = 0.5; }
  if (H.teleporta) { z.tcd -= dt; if (z.tcd <= 0 && z.x < 9) { z.tcd = 5 + rnd(s) * 3; const dx = rnd(s) < 0.6 ? -1.6 : 1.2, nr = Math.max(0, Math.min(FILAS - 1, z.r + (ri(s, 3) - 1))); ev(s, { k: 'teleporta', x: z.x, r: z.r, x2: z.x + dx, r2: nr }); z.x = Math.max(0.5, Math.min(9.3, z.x + dx)); z.r = nr; } }
  if (d.jefe) jefe(s, z, d, dt);
}
function jefe(s, z, d, dt) {
  const H = z.H, f = z.hp / z.hpMax;
  if (!z.ph1 && f < 0.66) { z.ph1 = 1; minions(s, z, 3); ev(s, { k: 'faseJefe', n: 1 }); }
  if (!z.ph2 && f < 0.33) { z.ph2 = 1; minions(s, z, 4); z.inv = 2.5; ev(s, { k: 'faseJefe', n: 2 }); }
  if (H.invoca) { z.tb -= dt; if (z.tb <= 0) { z.tb = 13; minions(s, z, 2); } }
  if (H.escudoT) { z.tinv -= dt; if (z.tinv <= 0) { z.tinv = 14; z.inv = 2.6; ev(s, { k: 'jefeEscudo', x: z.x, r: z.r }); } }
  if (H.embiste) { z.tEm = (z.tEm == null ? 9 : z.tEm) - dt; if (z.tEm <= 0) { z.tEm = 16; z.emb = 2.4; ev(s, { k: 'jefeEmbiste', x: z.x, r: z.r }); } if (z.emb > 0) z.emb -= dt; }
  if (H.rugido) { z.tRu = (z.tRu == null ? 11 : z.tRu) - dt; if (z.tRu <= 0) { z.tRu = 15; for (const p of s.plantas) if (Math.abs(p.c + 0.5 - z.x) <= 3.2) p.atur = Math.max(p.atur, 2); ev(s, { k: 'rugido', x: z.x, r: z.r }); } }
  if (H.lluvia) { z.tLl = (z.tLl == null ? 10 : z.tLl) - dt; if (z.tLl <= 0) { z.tLl = 12; for (let i = 0; i < 4; i++) { const r = ri(s, FILAS), c = ri(s, COLS - 2); s.efx.push({ k: 'lob', r, x0: z.x, x1: c + 0.5, t: -0.5 - i * 0.2, T: 1, d: 0, dp: 140, rad: 0.8, col: '#ff6a4a', enem: 1, x: z.x }); } ev(s, { k: 'jefeLluvia' }); } }
}
function minions(s, z, n) { const d = Z[z.tipo], pool = d.boss; for (let i = 0; i < n; i++) { const r = (z.r + i - 1 + FILAS) % FILAS; crearZombi(s, pool, r, Math.min(9.3, z.x + 0.5 + i * 0.2)); } ev(s, { k: 'invoca', x: z.x, r: z.r }); }

/* efectos diferidos (lob) y varios --------------------------------- */
function efxPaso(s, dt) {
  for (let i = s.efx.length - 1; i >= 0; i--) {
    const e = s.efx[i];
    if (e.k === 'campo') { e.t -= dt; e.c -= dt; if (e.c <= 0) { e.c = 0.5; for (const z of s.zombis) if (golpeable(z) && !z.aire) danar(s, z, e.d * 0.5, { area: true, penArm: true }); ev(s, { k: 'campo' }); } if (e.t <= 0) s.efx.splice(i, 1); continue; }
    if (e.k !== 'lob') continue; e.t += dt; if (e.t < e.T) continue;
    s.efx.splice(i, 1);
    if (e.enem) { for (const p of s.plantas.slice()) if (Math.abs(p.r - e.r) <= 0.7 && Math.abs(p.c + 0.5 - e.x1) <= 0.8) danarPlanta(s, p, e.dp); ev(s, { k: 'area', x: e.x1, r: e.r, rad: 0.8, c: '#ff6a4a' }); }
    else { area(s, e.x1, e.r, e.rad, e.d, { ef: e.ef, col: e.col }); ev(s, { k: 'explosion', x: e.x1, r: e.r, chica: 1 }); }
  }
}
function orbesPaso(s, dt) {
  for (let i = s.orbes.length - 1; i >= 0; i--) {
    const o = s.orbes[i]; o.t += dt;
    if (o.caer) { o.y += 1.6 * dt; if (o.y >= o.yd) { o.y = o.yd; o.caer = 0; } } else if (o.vy !== undefined && o.k !== 'ch') { /* quietos */ }
    if (s.auto && o.t > 0.8 && !o.caer) recoger(s, o.id);
    else if (o.t > (o.k === 'verde' ? 22 : 13)) s.orbes.splice(i, 1);
  }
}
function comprobarFin(s) {
  if (s.fin) return;
  const vivos = s.zombis.some((z) => z.estado !== 'muere'), pend = s.olas.length > 0 || s.mec.avisos.some((a) => !a.nave);
  if (!pend && !vivos && !s.niv.sinFin) { s.fin = 'victoria'; ev(s, { k: 'fin', r: 'victoria' }); }
}
/* energia verde ---------------------------------------------------- */
const vivosZ = (s) => s.zombis.filter((z) => vivo(z) && z.x < 9.7 && z.x > -0.3);
function lluviaMeteoros(s, p, n, d, rad, ef, col, t0 = 0, sep = 0.18) {
  const zs = vivosZ(s).filter((z) => !z.aire);
  for (let i = 0; i < n; i++) { const z = zs.length ? zs[ri(s, zs.length)] : null, r = z ? z.r : ri(s, FILAS), x = z ? z.x : 2 + rnd(s) * 7; s.efx.push({ k: 'lob', r, x0: x, x1: x, t: -t0 - i * sep, T: 0.5, d, rad, ef, col, cielo: 1 }); }
}
export function puedeEnergia(s, p) { return !!(p && !s.fin && s.en >= 1 && P[p.id] && P[p.id].en && !p.tmp); }
export function energia(s, p) {
  if (!puedeEnergia(s, p)) { ev(s, { k: 'error' }); return false; }
  const d = P[p.id], e = d.en, dm = nvT(p) * s.dmM; s.en--; s.st.energias++; p.verde = 1.2; ev(s, { k: 'energia', r: p.r, c: p.c, id: p.id, e: e.k });
  switch (e.k) {
    case 'prodburst': for (let i = 0; i < e.n; i++) { const o = orbe(s, 'ch', p.c + 0.5 + (rnd(s) - 0.5) * 2.4, p.r, e.v); o.y = p.r - 0.5 - rnd(s) * 0.4; o.yd = p.r + (rnd(s) - 0.5) * 0.4; o.caer = 1; } break;
    case 'frenesi': p.fx = { t: e.dur, mult: e.mult, dano: e.dano }; break;
    case 'espinas': p.esp = { t: e.dur, d: e.dano, rad: e.rad, c: 0 }; p.inv = Math.max(p.inv, 1); break;
    case 'meteoros': lluviaMeteoros(s, p, e.n, e.d * dm, e.rad, d.ef, '#ff8a3a'); break;
    case 'haz': for (const o of e.filas) { const r = p.r + o; if (r < 0 || r >= FILAS) continue; for (const z of s.zombis) if (z.r === r && golpeable(z) && z.x > p.c) danar(s, z, e.d * dm, { ef: e.ef, penArm: true, area: true }); ev(s, { k: 'haz', r, c: p.c, col: d.col[0] }); } break;
    case 'trampas': { let n = 0, intentos = 0; while (n < e.n && intentos++ < 60) { const r = ri(s, FILAS), c = Math.min(COLS - 1, p.c + 1 + ri(s, COLS)); if (puedePlantar(s, 'mina', r, c)) { const q = colocar(s, 'mina', r, c, { tmp: 40 }); q.arm = 0; n++; } } break; }
    case 'cong': for (const z of vivosZ(s)) danar(s, z, (e.d || 0) * dm, { ef: { fz: e.dur }, area: true }); break;
    case 'alfombra': s.efx.push({ k: 'campo', t: e.dur, c: 0, d: e.d * dm, r: -1 }); break;
    case 'tiempo': s.tiempo = { t: e.dur, f: e.f }; break;
    case 'ola': for (const z of s.zombis) if (golpeable(z) && !z.aire && Math.abs(z.r - p.r) <= 1) { danar(s, z, e.d * dm * (e.dos ? 2 : 1), { ef: e.ef, area: true }); if (!Z[z.tipo].jefe && !z.H.gigante) z.x = Math.min(9.5, z.x + (e.emp || 0) * 1.5); } ev(s, { k: 'ola_e', r: p.r, c: p.c, col: d.col[0] }); break;
    case 'clones': { let n = 0; for (let c = p.c + 1; c < COLS && n < 2; c++) if (puedePlantar(s, p.id, p.r, c)) { colocar(s, p.id, p.r, c, { tmp: e.dur }); n++; } for (let o = -1; o <= 1 && n < 2; o += 2) if (puedePlantar(s, p.id, p.r + o, p.c)) { colocar(s, p.id, p.r + o, p.c, { tmp: e.dur }); n++; } break; }
    case 'cura': for (const q of s.plantas) { q.hp = Math.min(q.hpMax, q.hp + q.hpMax * e.pct); q.regenT = e.dur; } break;
    case 'inspira': for (const q of s.plantas) q.fx = { t: e.dur, mult: e.mult, dano: e.dano }; break;
    case 'sueno': for (const z of vivosZ(s)) if (!Z[z.tipo].jefe) z.dorm = Math.max(z.dorm, e.dur); else z.dorm = Math.max(z.dorm, e.dur * 0.4); break;
    case 'peste': for (const z of vivosZ(s)) { z.ve = Math.max(z.ve, e.dur); z.veD = e.dps; } break;
    case 'rebobinar': for (const z of vivosZ(s)) { if (Z[z.tipo].jefe) { z.x = Math.min(9.4, z.x + 1); continue; } z.x = Math.min(9.5, z.x + e.cols); if (e.stun) z.at = Math.max(z.at, e.stun); if (e.dano) danar(s, z, e.dano * dm, { area: true }); } break;
    case 'nova': area(s, p.c + 0.5, p.r, e.rad, e.d * dm, { col: d.col[0], aire: true }); break;
    case 'domo': for (const q of s.plantas) if ((q.c - p.c) ** 2 + (q.r - p.r) ** 2 <= e.rad * e.rad) { q.inv = e.dur; q.hp = Math.min(q.hpMax, q.hp + q.hpMax * e.cura); } break;
    case 'tormenta': lluviaMeteoros(s, p, e.n, e.d * dm, e.rad, null, '#ffe84a', 0, e.dur / e.n); break;
    case 'muralla': { p.hpMax += e.hp; p.hp = p.hpMax; for (let r = 0; r < FILAS; r++) { const c = Math.min(COLS - 2, p.c + 1); if (puedePlantar(s, 'bambu', r, c)) colocar(s, 'bambu', r, c, { tmp: 14 }); } break; }
    case 'imanazo': for (const z of vivosZ(s)) { if (z.arm && z.arm.metal && z.arm.hp > 0) z.arm.hp = 0; if (z.arm && z.arm.metal) danar(s, z, e.d * dm, { area: true }); } break;
    case 'gigante': p.gigante = e.dur; p.hpMax *= 1.5; p.hp = p.hpMax; break;
  }
  return true;
}

export function serializar(s) { return JSON.stringify(s); }
export function restaurar(txt) { try { const s = JSON.parse(txt); if (!s || !s.niv || !Array.isArray(s.cel)) return null; s.ev = []; return s; } catch (e) { return null; } }
