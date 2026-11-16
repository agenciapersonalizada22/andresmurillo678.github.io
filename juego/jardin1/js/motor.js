// Motor puro (sin DOM): reglas de plantas, zombis, dano, economia, oleadas y colisiones por carril.
import { P, Z, FILAS, COLS, DIF } from './datos.js';

export const idx = (r, c) => r * COLS + c;
export function rnd(s) { // mulberry32 sobre s.sem
  s.sem = (s.sem + 0x6D2B79F5) >>> 0; let t = s.sem;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (s, n) => Math.floor(rnd(s) * n);

export function crear(cfg) {
  const niv = cfg.nivel, dif = DIF[cfg.dif || 'normal'] || DIF.normal, tienda = cfg.tienda || {};
  const s = {
    niv, dif, difId: cfg.dif || 'normal', t: 0, sem: (cfg.seed || 1) >>> 0, sig: 1, fin: null, ev: [],
    sol: Math.round(((niv.solIni != null ? niv.solIni : 50) + (tienda.solini ? 50 : 0))), solVal: tienda.solgrande ? 30 : 25,
    celdas: [], plantas: [], zombis: [], proy: [], soles: [], monedas: [], bolas: [], cort: [], cartas: [], recMult: dif.rec * (tienda.rec2 ? 0.8 : tienda.rec1 ? 0.9 : 1),
    palaOro: !!tienda.palaoro, tCielo: (niv.cielo || niv.noche) ? 5 : 1e9, despierto: 0, nieblaOff: 0, monedasGan: 0, olaNum: 0, olaIdx: 0, proxOla: 0, aviso: 0, oleadaAviso: null,
    stats: { matados: 0, plantadas: 0, perdidas: 0, soles: 0, cortadoras: 0, jarrones: 0, tumbasRotas: 0, olas: 0 },
    cinta: null, cola: [], mano: [], versus: niv.tipo === 'versus' ? { cerebros: 150, tC: 0 } : null,
  };
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) s.celdas.push({ p: null, base: null, esc: null, tumba: 0, pozo: 0, hielo: 0, agua: niv.agua.includes(r), jarro: null });
  const tc = tienda.cortFuego ? 'fuego' : tienda.cortHielo ? 'hielo' : tienda.cortTurbo ? 'turbo' : 'normal';
  for (let r = 0; r < FILAS; r++) s.cort.push({ estado: (niv.sinCort || !dif.cort || niv.tipo === 'puzzle' || niv.tipo === 'versus') ? 'no' : 'lista', x: 0, tipo: tc, usos: tc === 'turbo' ? 2 : 1 });
  (niv.tumbas || []).forEach(([r, c]) => { s.celdas[idx(r, c)].tumba = niv.tipo === 'tumbas' ? 3 : 1; });
  (niv.jarros || []).forEach((j) => { s.celdas[idx(j.r, j.c)].jarro = j.k; });
  if (niv.cinta) s.cinta = { lista: niv.cinta.lista, cada: niv.cinta.cada, t: 1.5, max: niv.cinta.max || 8, pesos: niv.cinta.pesos || null };
  (cfg.semillas || []).forEach((id) => s.cartas.push({ id, listo: 0 }));
  if (niv.mano) niv.mano.forEach((id) => s.cola.push(id));
  if (niv.puzzle) {
    niv.puzzle.plantas.forEach((q) => { const cel = s.celdas[idx(q.r, q.c)]; if (q.base) cel.base = q.base; colocar(s, q.id, q.r, q.c, true); });
    niv.puzzle.zombis.forEach((q) => crearZombi(s, q.z, q.r, q.x));
  }
  s.olas = (niv.olas || []).slice();
  s.proxOla = s.olas.length ? s.olas[0].t : 1e9;
  return s;
}

/* ---------- dano ---------- */
export function crearZombi(s, tipo, r, x, op = {}) {
  const d = Z[tipo], hpm = d.hp * s.dif.hp * (s.niv.hpMult || 1);
  const z = {
    id: s.sig++, tipo, r, x: x == null ? 9.8 : x, hp: hpm, hpMax: hpm, arm: d.arm ? { k: d.arm.k, hp: d.arm.hp * s.dif.hp, hpMax: d.arm.hp * s.dif.hp, metal: !!d.arm.metal, frente: !!d.arm.frente } : null,
    v: d.v, estado: 'anda', lento: 0, frio: 0, cong: 0, atur: 0, dorm: 0, atrapado: 0, edad: 0, tm: 0, saltos: d.salta || 0, salto: null, dir: -1, hip: false,
    vuelo: !!d.vuelo, bajo: false, sumergido: false, fase: false, rabia: false, tbaila: 5, tira: d.tira || 0, tTira: 3, tAplasta: 0, usoEsc: false, usoPozo: false, come: false,
    cae: d.cae ? 2.2 : 0, tArma: 4 + rnd(s) * 3, lanzo: false, tf: rnd(s) * 3, buff: false, lucha: false, ataque: 0, filas: d.final ? [1, 2, 3] : null, ciclo: 0, tJefe: 6,
  };
  if (d.cava) { z.bajo = true; z.v = d.v; }
  if (d.cae) { z.x = 3.5 + rnd(s) * 4; z.cayendo = true; }
  if (d.final) { z.x = 9.1; z.r = 2; }
  if (op.dir) z.dir = op.dir;
  s.zombis.push(z); s.ev.push({ k: 'zombi', z: z.id, tipo });
  return z;
}
const metalArm = (z) => z.arm && z.arm.metal;
const enAgua = (s, z) => { const r = z.r, c = Math.floor(z.x); return c >= 0 && c < COLS && r >= 0 && r < FILAS && s.celdas[idx(r, c)].agua; };

// tipo: 'recto' | 'alto' | 'arco' | 'area'
export function golpeable(s, z, tipo) {
  if (z.estado === 'muere' || z.x > 9.35 || z.x < -0.3 || z.cayendo) return false;
  if (z.bajo) return tipo === 'area';
  if (z.fase && tipo !== 'area') return false;
  if (z.sumergido && tipo === 'recto') return false;
  if (z.vuelo && tipo !== 'alto' && tipo !== 'area') return false;
  return true;
}
export function danar(s, z, dano, op = {}) {
  if (z.estado === 'muere' || dano <= 0) return 0;
  if (z.piedraDef === undefined) z.piedraDef = !!Z[z.tipo].piedra;
  if (z.piedraDef && op.proyectil) dano *= 0.5;
  let resto = dano;
  if (z.arm && !op.ignora) {
    if (z.arm.frente && !op.arco && !op.area && !op.expl) { z.arm.hp -= dano; if (z.arm.hp <= 0) perderArm(s, z); s.ev.push({ k: 'golpe', z: z.id, arm: 1 }); return dano; }
    if (z.arm.frente) { z.hp -= dano; s.ev.push({ k: 'golpe', z: z.id }); if (z.hp <= 0) matar(s, z); return dano; }
    z.arm.hp -= dano; if (z.arm.hp > 0) { s.ev.push({ k: 'golpe', z: z.id, arm: 1 }); return dano; }
    resto = -z.arm.hp; perderArm(s, z);
  } else if (z.arm && op.ignora && op.expl) { perderArm(s, z); }
  if (z.vuelo && z.arm == null && !op.alto) { /* globo no cuenta como armadura */ }
  z.hp -= resto; s.ev.push({ k: 'golpe', z: z.id });
  if (z.vuelo && z.hp < z.hpMax * 0.4 && false) z.vuelo = false;
  if (z.hp <= 0) matar(s, z);
  return dano;
}
function perderArm(s, z) {
  const k = z.arm.k; z.arm = null; s.ev.push({ k: 'armRota', z: z.id, arm: k });
  if (Z[z.tipo].rabia) { z.rabia = true; z.v = Z[z.tipo].v * 2.4; }
}
export function matar(s, z) {
  if (z.estado === 'muere') return;
  z.estado = 'muere'; z.hp = 0; z.tm = 0; z.atrapado = 0;
  if (!z.hip) { s.stats.matados++; }
  s.ev.push({ k: 'muere', z: z.id, tipo: z.tipo, x: z.x, r: z.r });
  const d = Z[z.tipo];
  if (d.final) { s.olaIdx = s.olas.length; s.proxOla = 1e9; s.zombis.forEach((o) => { if (o !== z && o.estado !== 'muere') matar(s, o); }); }
  if (!z.hip && rnd(s) < (s.niv.tipo === 'carrera' ? 1 : 0.05 + (d.grande ? 0.9 : 0))) {
    if (s.niv.tipo === 'carrera') s.soles.push({ id: s.sig++, x: z.x, y: z.r + 0.5, y0: z.r + 0.5, val: 25, vida: 9, tipo: 'caida', cae: 0 });
    else s.monedas.push({ id: s.sig++, x: z.x, y: z.r + 0.5, val: d.grande ? 50 : 10, vida: 12 });
  }
}
export function aplicarHielo(s, z, ef) {
  if (z.estado === 'muere') return;
  if (ef === 'hielo') {
    if (Z[z.tipo].inmuneHielo || Z[z.tipo].piedra || Z[z.tipo].final) return;
    z.lento = 10; z.frio++;
    if (z.frio >= 3) { z.cong = 3; z.frio = 0; s.ev.push({ k: 'congela', z: z.id }); }
  } else if (ef === 'fuego') { z.lento = 0; z.frio = 0; if (z.cong > 0) z.cong = 0; }
  else if (ef === 'mante') { if (!Z[z.tipo].final) z.atur = 3; }
}
export function zonaIgnora(z) { return z.estado === 'muere'; }

/* ---------- plantar / palear ---------- */
export function puedePlantarEn(s, id, r, c) {
  const d = P[id]; if (!d || r < 0 || r >= FILAS || c < 0 || c >= COLS) return false;
  const cel = s.celdas[idx(r, c)];
  if (cel.pozo > 0 || cel.hielo > 0 || cel.jarro) return false;
  if (cel.tumba) return d.t === 'escarba' && !cel.p;
  if (d.t === 'escarba') return false;
  const w = s.niv.tejado ? 'tejado' : cel.agua ? 'agua' : null;
  if (d.mejora) return !!cel.p && cel.p.id === d.mejora;
  if (d.t === 'escudo') return !cel.esc && (!!cel.p || !!(w ? cel.base || (d.agua) : true));
  if (d.t === 'base') return d.base === w && !cel.base && !cel.p;
  if (cel.p) return false;
  if (d.agua) return cel.agua && !cel.p;
  if (cel.agua || s.niv.tejado) return !!cel.base;
  return true;
}
export function colocar(s, id, r, c, libre) {
  const d = P[id], cel = s.celdas[idx(r, c)];
  const hp = d.hp;
  if (d.t === 'base') { cel.base = id; s.ev.push({ k: 'planta', r, c, id }); return null; }
  if (d.t === 'escudo') { cel.esc = { id, hp, hpMax: hp }; s.ev.push({ k: 'planta', r, c, id }); return cel.esc; }
  if (d.mejora && cel.p) { const old = cel.p; old.id = id; old.hp = Math.min(hp, d.hp); old.hpMax = hp; old.hp = hp; old.cd = Math.min(old.cd, 1); s.ev.push({ k: 'mejora', r, c, id }); return old; }
  const p = { pid: s.sig++, id, r, c, hp, hpMax: hp, t: 0, cd: d.ini != null ? d.ini : (d.cada ? d.cada * 0.5 : 0), fuse: d.fuse || 0, arma: d.arma || 0, mastica: 0, preso: 0, anim: 0, ataque: 0, ult: 0, hold: 0 };
  if (d.t === 'tiro' || d.t === 'estrella') p.cd = (d.cada || 1) * 0.6;
  cel.p = p; s.plantas.push(p); s.ev.push({ k: 'planta', r, c, id }); if (!libre) s.stats.plantadas++;
  return p;
}
export function cartaListaEn(s, i) { const c = s.cartas[i]; return c ? Math.max(0, c.listo - s.t) : 0; }
export function plantar(s, i, r, c) {
  if (s.fin) return { ok: false, motivo: 'fin' };
  if (s.niv.tipo === 'bolera') return lanzarBola(s, i, r);
  if (s.niv.tipo === 'versus' && false) return { ok: false };
  const usaCola = !!(s.cinta || s.niv.mano);
  let id, carta = null;
  if (usaCola) { id = s.cola[i]; if (!id) return { ok: false, motivo: 'vacia' }; }
  else { carta = s.cartas[i]; if (!carta) return { ok: false, motivo: 'vacia' }; id = carta.id; }
  const d = P[id];
  if (!puedePlantarEn(s, id, r, c)) return { ok: false, motivo: 'casilla' };
  if (!usaCola) {
    if (cartaListaEn(s, i) > 0) return { ok: false, motivo: 'recarga' };
    if (s.sol < d.c) return { ok: false, motivo: 'sol' };
    s.sol -= d.c; carta.listo = s.t + d.rec * s.recMult;
  } else s.cola.splice(i, 1);
  colocar(s, id, r, c); s.ev.push({ k: 'plantar', id }); return { ok: true, id };
}
export function pala(s, r, c) {
  const cel = s.celdas[idx(r, c)]; if (!cel) return false;
  if (cel.tumba && s.niv.tipo === 'tumbas') { cel.tumba--; s.ev.push({ k: 'golpeTumba', r, c }); if (!cel.tumba) { s.stats.tumbasRotas++; s.ev.push({ k: 'tumbaRota', r, c }); } return true; }
  const q = cel.esc || cel.p || cel.base; if (!q) return false;
  const id = cel.esc ? cel.esc.id : cel.p ? cel.p.id : cel.base;
  if (cel.esc) cel.esc = null;
  else if (cel.p) { quitar(s, cel.p); }
  else cel.base = null;
  if (s.palaOro) s.sol += Math.floor(P[id].c / 2);
  s.ev.push({ k: 'pala', r, c }); return true;
}
export function quitar(s, p) { const cel = s.celdas[idx(p.r, p.c)]; if (cel.p === p) cel.p = null; const i = s.plantas.indexOf(p); if (i >= 0) s.plantas.splice(i, 1); }
function destruirPlanta(s, p, causa) {
  quitar(s, p); s.stats.perdidas++; s.ev.push({ k: 'plantaMuere', r: p.r, c: p.c, id: p.id, causa });
}
export function romperJarro(s, r, c) {
  const cel = s.celdas[idx(r, c)]; if (!cel || !cel.jarro) return null;
  const k = cel.jarro; cel.jarro = null; s.stats.jarrones++; s.ev.push({ k: 'jarro', r, c, v: k });
  if (k === 's') { s.monedas.push({ id: s.sig++, x: c + 0.5, y: r + 0.5, val: 15, vida: 14 }); }
  else if (k.startsWith('p:')) s.cola.push(k.slice(2));
  else if (k.startsWith('z:')) crearZombi(s, k.slice(2), r, c + 0.5);
  return k;
}

/* ---------- bolera ---------- */
export function lanzarBola(s, i, r) {
  const id = s.cola[i]; if (!id) return { ok: false, motivo: 'vacia' };
  s.cola.splice(i, 1);
  if (id === 'bomba') { // cereza que rueda y explota al tocar
    s.bolas.push({ id: s.sig++, r, x: 0.5, tipo: id, hits: 0, v: 3.2 });
  } else s.bolas.push({ id: s.sig++, r, x: 0.5, tipo: id, hits: 0, v: 3.2 });
  s.ev.push({ k: 'bola', r }); return { ok: true, id };
}

/* ---------- sol / monedas ---------- */
export function recogerSol(s, id) { const i = s.soles.findIndex((q) => q.id === id); if (i < 0) return 0; const q = s.soles[i]; s.soles.splice(i, 1); s.sol += q.val; s.stats.soles += q.val; s.ev.push({ k: 'sol', val: q.val }); return q.val; }
export function recogerMoneda(s, id) { const i = s.monedas.findIndex((q) => q.id === id); if (i < 0) return 0; const q = s.monedas[i]; s.monedas.splice(i, 1); s.monedasGan += q.val; s.ev.push({ k: 'moneda', val: q.val }); return q.val; }
export function recogerTodo(s) { let n = 0; [...s.soles].forEach((q) => { n += recogerSol(s, q.id); }); [...s.monedas].forEach((q) => recogerMoneda(s, q.id)); return n; }
function nuevoSol(s, x, y, val, tipo) { s.soles.push({ id: s.sig++, x, y, y0: y, val, vida: tipo === 'cielo' ? 11 : 9, tipo, cae: tipo === 'cielo' ? 1 : 0, t: 0 }); }

/* ---------- niebla ---------- */
export function visibleEn(s, r, x) {
  if (!s.niv.niebla || s.t < s.nieblaOff || x < 3.8) return true;
  for (const p of s.plantas) if (P[p.id].t === 'faro' && Math.hypot(x - (p.c + 0.5), r - p.r) <= P[p.id].radio) return true;
  return false;
}

/* ---------- ayudas de busqueda ---------- */
function zonaFilas(z) { return z.filas || [z.r]; }
const enFila = (z, r) => z.filas ? z.filas.includes(r) : z.r === r;
function primeroEnFila(s, r, x0, tipo, max) {
  let b = null;
  for (const z of s.zombis) { if (!enFila(z, r) || z.hip || z.x < x0 || (max != null && z.x > x0 + max)) continue; if (!golpeable(s, z, tipo)) continue; if (!b || z.x < b.x) b = z; }
  return b;
}
function hayZombiEnFila(s, r, x0, tipo, rango) { return !!primeroEnFila(s, r, x0, tipo, rango); }
function mult(s, p) {
  let m = 1;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const r = p.r + dr, c = p.c + dc; if (r < 0 || r >= FILAS || c < 0 || c >= COLS) continue; const q = s.celdas[idx(r, c)].p; if (q && P[q.id].t === 'ritmo') m += 0.25; }
  return Math.min(m, 1.5);
}
const dormida = (s, d) => d.hongo && !s.niv.noche && s.t >= s.despierto;

/* ---------- area ---------- */
export function areaDano(s, cx, cr, rad, dano, op = {}) {
  let n = 0;
  for (const z of s.zombis) {
    if (z.estado === 'muere' || (z.hip && !op.contraHip)) continue;
    if (!op.vuelan && z.vuelo && !op.expl) continue;
    if (z.x > 9.5 || z.x < -0.3) continue;
    const dx = z.x - cx; const zr = z.filas ? Math.min(Math.max(cr, z.filas[0]), z.filas[2]) : z.r; const dy = zr - cr;
    const lim = op.filas != null ? op.filas : 0;
    if (op.fila ? dy !== 0 : (Math.abs(dy) > lim + (op.circ ? rad : 0) || dx * dx + (op.circ ? dy * dy : 0) > rad * rad)) continue;
    danar(s, z, dano * (op.mitad && Math.abs(z.x - cx) > 0.3 ? op.mitad : 1), { ...op, area: true, ignora: !!op.expl || !!op.ign }); n++;
    if (op.ef) aplicarHielo(s, z, op.ef);
  }
  return n;
}
function explosion(s, p, d) {
  s.ev.push({ k: 'explosion', r: p.r, c: p.c, id: p.id, radio: d.radio || 1.5 });
  if (d.fila) areaDano(s, 0, p.r, 99, d.dano, { fila: 1, expl: true, ign: true, vuelan: 0 });
  else areaDano(s, p.c + 0.5, p.r, d.radio, d.dano, { circ: true, expl: true, ign: true, vuelan: 1 });
}

/* ---------- proyectiles ---------- */
function disparar(s, p, d, r0, vr = 0, dir = 1) {
  const n = d.raf || 1;
  for (let k = 0; k < n; k++) {
    const pr = { id: s.sig++, r: r0, x: p.c + 0.9 - k * 0.3, vx: 6.5 * dir, vr, dano: d.dano, ef: d.ef || null, arco: false, alto: !!d.alto, ign: !!d.ign, fuego: false, dir, de: p.pid, vida: 3, rangoMax: d.rango ? p.c + 0.5 + d.rango : (s.niv.tejado && p.c < 5 ? p.c + 3.5 : 99) };
    if (d.ign) { pr.vx = 5; pr.nube = true; }
    s.proy.push(pr);
  }
  s.ev.push({ k: 'dispara', id: p.id, r: p.r, c: p.c }); p.ataque = 0.25;
}
function lanzarArco(s, p, d, tz) {
  const dist = Math.max(1, tz.x - (p.c + 0.5)), T = Math.max(0.7, dist / 5.5);
  const tx = Math.max(p.c + 1, tz.x - tz.v * 0.7 * T * (tz.estado === 'come' ? 0 : 1));
  s.proy.push({ id: s.sig++, r: p.r, x: p.c + 0.5, x0: p.c + 0.5, x1: tx, tr: tz.r, t: 0, T, dano: d.dano, ef: d.ef || null, arco: true, area: d.area || 0.6, filas: d.filas || 0, splash: d.splash || 0.5, de: p.pid, id2: p.id });
  s.ev.push({ k: 'dispara', id: p.id, r: p.r, c: p.c, arco: 1 }); p.ataque = 0.25;
}
function pasoProy(s, dt) {
  for (let i = s.proy.length - 1; i >= 0; i--) {
    const q = s.proy[i];
    if (q.arco) {
      q.t += dt; q.x = q.x0 + (q.x1 - q.x0) * Math.min(1, q.t / q.T);
      if (q.t >= q.T) {
        s.proy.splice(i, 1);
        const mejor = primeroEnFila(s, q.tr, q.x1 - 0.9, 'arco', 1.8) || null;
        const cx = mejor ? mejor.x : q.x1;
        s.ev.push({ k: 'impacto', x: cx, r: q.tr, arco: 1 });
        // principal: la mas cercana al punto de caida; vecinas segun area
        for (const z of s.zombis) {
          if (z.hip || !golpeable(s, z, 'arco')) continue;
          const dr = (z.filas ? Math.min(Math.max(q.tr, z.filas[0]), z.filas[2]) : z.r) - q.tr;
          if (Math.abs(dr) > q.filas) continue;
          const dx = Math.abs(z.x - cx);
          if (z === mejor) { danar(s, z, q.dano, { arco: true, proyectil: true }); if (q.ef) aplicarHielo(s, z, q.ef); }
          else if (dx <= q.area && (q.area > 0.5 || q.filas)) { danar(s, z, q.dano * q.splash, { arco: true, proyectil: true }); if (q.ef) aplicarHielo(s, z, q.ef); }
        }
      }
      continue;
    }
    q.x += q.vx * dt; q.r += q.vr * dt; q.vida -= dt;
    if (q.x > 10 || q.x < -1 || q.r < -0.6 || q.r > FILAS + 0.4 || q.vida <= 0 || (q.dir > 0 && q.x > q.rangoMax)) { s.proy.splice(i, 1); continue; }
    const cx = Math.floor(q.x), cr = Math.min(FILAS - 1, Math.max(0, Math.floor(q.r + 0.0001)));
    // antorcha
    if (!q.fuego && !q.nube && q.vr === 0 && q.dir > 0 && cx >= 0 && cx < COLS) {
      const pl = s.celdas[idx(cr, cx)].p;
      if (pl && P[pl.id].t === 'antorcha' && q.x >= cx + 0.5 && !q.pasoAnt) { q.pasoAnt = 1; if (q.ef === 'hielo') q.ef = null; else { q.fuego = true; q.dano *= 2; q.ef = 'fuego'; s.ev.push({ k: 'enciende', r: cr, c: cx }); } }
    }
    let hit = null;
    for (const z of s.zombis) {
      if (z.hip || !zonaFilaProy(z, q.r)) continue;
      const tipo = q.nube ? 'area' : q.alto ? 'alto' : 'recto';
      if (!golpeable(s, z, tipo) && !(q.alto && z.vuelo && golpeable(s, z, 'alto'))) continue;
      if (q.dir > 0 ? (q.x >= z.x - 0.35 && q.x <= z.x + 0.45) : (q.x <= z.x + 0.35 && q.x >= z.x - 0.45)) { if (!hit || Math.abs(z.x - q.x) < Math.abs(hit.x - q.x)) hit = z; }
    }
    if (hit) {
      danar(s, hit, q.dano, { proyectil: true, ignora: q.ign, alto: q.alto });
      if (q.ef) aplicarHielo(s, hit, q.ef);
      if (q.fuego) areaDano(s, hit.x, hit.r, 0.5, q.dano * 0.5, { proyectil: true, mitad: 1 });
      s.ev.push({ k: 'impacto', x: q.x, r: hit.r, fuego: q.fuego });
      s.proy.splice(i, 1);
    }
  }
}
function zonaFilaProy(z, r) { const rr = Math.min(FILAS - 1, Math.max(0, Math.floor(r))); return z.filas ? (rr >= z.filas[0] && rr <= z.filas[2]) : z.r === rr; }

/* ---------- plantas ---------- */
function actPlanta(s, p, dt) {
  const d = P[p.id]; p.t += dt; p.ataque = Math.max(0, p.ataque - dt);
  if (dormida(s, d)) { p.dorm = true; return; } p.dorm = false;
  if (p.mastica > 0) { p.mastica -= dt; return; }
  const m = mult(s, p);
  switch (d.t) {
    case 'sol': p.cd -= dt * m; if (p.cd <= 0) { p.cd = d.cada; for (let k = 0; k < (d.cant || 1); k++) nuevoSol(s, p.c + 0.5 + (k ? 0.35 : (d.cant > 1 ? -0.2 : 0)), p.r + 0.5, d.val, 'planta'); p.ataque = 0.4; } break;
    case 'moneda': p.cd -= dt * m; if (p.cd <= 0) { p.cd = d.cada; s.monedas.push({ id: s.sig++, x: p.c + 0.5, y: p.r + 0.5, val: d.val, vida: 14 }); } break;
    case 'tiro': {
      p.cd -= dt * m; if (p.cd > 0) break;
      const rows = d.carriles === 3 ? [p.r - 1, p.r, p.r + 1].filter((r) => r >= 0 && r < FILAS) : [p.r];
      if (d.arco) {
        let z = null;
        for (const r of rows) { const q = primeroEnFila(s, r, p.c + 0.9, 'arco'); if (q && (!z || q.x < z.x)) z = q; }
        if (z) { p.cd = d.cada; lanzarArco(s, p, d, z); }
        break;
      }
      const rango = d.rango || (s.niv.tejado && p.c < 5 ? 3.5 : 99);
      let any = false;
      for (const r of rows) if (hayZombiEnFila(s, r, p.c + 0.5, d.alto ? 'alto' : d.ign ? 'area' : 'recto', rango)) any = true;
      // la alta tambien ve globos
      if (!any && d.alto) for (const r of rows) if (hayZombiEnFila(s, r, p.c + 0.5, 'alto', rango)) any = true;
      if (any) { p.cd = d.cada; for (const r of rows) disparar(s, p, d, r + 0.5); }
      break;
    }
    case 'estrella': {
      p.cd -= dt * m; if (p.cd > 0) break;
      if (s.zombis.some((z) => !z.hip && golpeable(s, z, 'alto') && z.x < 9.2)) {
        p.cd = d.cada;
        for (const [vr, dir] of [[0, 1], [-1.2, 1], [1.2, 1], [0, -1], [-1.2, -1]]) {
          s.proy.push({ id: s.sig++, r: p.r + 0.5, x: p.c + 0.5, vx: 5.5 * dir, vr, dano: d.dano, ef: null, arco: false, alto: true, ign: false, fuego: false, dir, de: p.pid, vida: 2.2, rangoMax: 99, nube: false });
        }
        s.ev.push({ k: 'dispara', id: p.id, r: p.r, c: p.c }); p.ataque = 0.25;
      }
      break;
    }
    case 'explota': p.fuse -= dt; if (p.fuse <= 0) { explosion(s, p, d); destruirPlanta(s, p, 'explosion'); s.stats.perdidas--; } break;
    case 'mina': {
      if (p.arma > 0) { p.arma -= dt; break; }
      for (const z of s.zombis) if (!z.hip && enFila(z, p.r) && z.estado !== 'muere' && !z.vuelo && !z.bajo && z.x >= p.c && z.x <= p.c + 1.1) { explosion(s, p, d); destruirPlanta(s, p, 'explosion'); s.stats.perdidas--; return; }
      break;
    }
    case 'pincho': {
      for (const z of s.zombis) {
        if (z.hip || !enFila(z, p.r) || z.estado === 'muere' || z.vuelo || z.bajo || z.x < p.c - 0.1 || z.x > p.c + 1.1) continue;
        if (Z[z.tipo].vehiculo) { danar(s, z, 1800, { ignora: true }); destruirPlanta(s, p, 'vehiculo'); return; }
        if (Z[z.tipo].grande) { destruirPlanta(s, p, 'aplasta'); return; }
        p.ult -= dt; if (p.ult <= 0) { p.ult = 0.5; danar(s, z, d.dps * 0.5, { ignora: true }); p.ataque = 0.2; s.ev.push({ k: 'pincha', r: p.r, c: p.c }); }
      }
      break;
    }
    case 'tragar': {
      for (const z of s.zombis) {
        if (z.hip || !enFila(z, p.r) || z.estado === 'muere' || z.vuelo || z.bajo || z.cayendo) continue;
        if (z.x < p.c + 0.2 || z.x > p.c + 1.4) continue;
        const dd = Z[z.tipo];
        if (dd.grande || dd.vehiculo) { danar(s, z, 600, { ignora: true }); p.mastica = 14; }
        else { matar(s, z); z.tragado = true; p.mastica = d.mastica; }
        s.ev.push({ k: 'traga', r: p.r, c: p.c, agua: d.agua }); p.ataque = 0.5; break;
      }
      break;
    }
    case 'enred': {
      if (p.preso) { const z = s.zombis.find((q) => q.id === p.preso); p.hold -= dt; if (!z || z.estado === 'muere' || p.hold <= 0) { if (z) z.atrapado = 0; destruirPlanta(s, p, 'gastada'); s.stats.perdidas--; return; } danar(s, z, d.dps * dt, { ignora: true }); z.atrapado = 0.3; break; }
      for (const z of s.zombis) { if (z.hip || !enFila(z, p.r) || z.estado === 'muere' || z.vuelo || z.bajo || Z[z.tipo].grande || Z[z.tipo].vehiculo) continue; if (z.x >= p.c && z.x <= p.c + 1.0) { p.preso = z.id; p.hold = d.hold; z.atrapado = 0.3; s.ev.push({ k: 'atrapa', r: p.r, c: p.c }); break; } }
      break;
    }
    case 'hipno': break; // se resuelve al ser mordida
    case 'sueno': if (p.t > 0.6) { for (const z of s.zombis) if (!z.hip && z.estado !== 'muere' && Math.abs(z.r - p.r) <= 1 && Math.abs(z.x - (p.c + 0.5)) <= d.radio && z.x < 9.4 && !Z[z.tipo].final) z.dorm = d.dur; s.ev.push({ k: 'sueno', r: p.r, c: p.c }); destruirPlanta(s, p, 'gastada'); s.stats.perdidas--; } break;
    case 'escarba': { const cel = s.celdas[idx(p.r, p.c)]; p.cd2 = (p.cd2 || 0) + dt; if (p.cd2 >= 6) { cel.tumba = 0; s.stats.tumbasRotas++; s.ev.push({ k: 'tumbaRota', r: p.r, c: p.c }); destruirPlanta(s, p, 'gastada'); s.stats.perdidas--; } break; }
    case 'soplo': if (p.t > 0.7) { s.nieblaOff = s.t + 40; s.zombis.forEach((z) => { if (z.vuelo && z.estado !== 'muere') { z.vuelo = false; z.cayendo = false; z.atur = 1.5; s.ev.push({ k: 'globoPincha', z: z.id }); } }); s.ev.push({ k: 'soplo', r: p.r, c: p.c }); destruirPlanta(s, p, 'gastada'); s.stats.perdidas--; } break;
    case 'despierta': if (p.t > 0.5) { s.despierto = s.t + 45; destruirPlanta(s, p, 'gastada'); s.stats.perdidas--; } break;
    case 'iman': {
      p.cd -= dt; if (p.cd > 0) break;
      let b = null, bd = 99;
      for (const z of s.zombis) { if (z.hip || z.estado === 'muere' || !metalArm(z) || z.x > 9.3) continue; const dd = Math.hypot(z.x - (p.c + 0.5), z.r - p.r); if (dd <= d.rango && dd < bd) { b = z; bd = dd; } }
      if (b) { p.cd = d.cada; const k = b.arm.k; b.arm = null; s.ev.push({ k: 'armRota', z: b.id, arm: k, iman: 1, r: p.r, c: p.c }); p.ataque = 0.4; }
      break;
    }
    default: break;
  }
}

/* ---------- zombis ---------- */
function plantaFrente(s, z) {
  if (z.vuelo || z.fase || z.bajo || z.cayendo) return null;
  const c = z.dir < 0 ? Math.floor(z.x) : Math.floor(z.x);
  if (c < 0 || c >= COLS) return null;
  const rows = z.filas || [z.r];
  for (const r of rows) {
    const cel = s.celdas[idx(r, c)];
    const p = cel.p; if (!p && !cel.esc) continue;
    if (p && P[p.id].t === 'pincho' && !cel.esc) continue;
    if (p && p.escalera && !cel.esc) continue;
    if (z.dir < 0 ? z.x <= c + 0.9 : z.x >= c + 0.1) return { cel, p, esc: cel.esc, c, r };
  }
  return null;
}
function velocidad(s, z, dt) {
  let m = (z.lento > 0 ? 0.5 : 1) * s.dif.vel * (z.buff ? 1.3 : 1);
  return z.v * m;
}
function actZombi(s, z, dt) {
  const d = Z[z.tipo]; z.edad += dt; z.ataque = Math.max(0, z.ataque - dt);
  if (z.estado === 'muere') { z.tm += dt; if (z.tm > 1.1) z.borrar = true; return; }
  z.lento = Math.max(0, z.lento - dt); if (z.cong > 0) z.cong -= dt; z.atur = Math.max(0, z.atur - dt); z.dorm = Math.max(0, z.dorm - dt); z.atrapado = Math.max(0, z.atrapado - dt);
  const inmov = z.cong > 0 || z.atur > 0 || z.dorm > 0 || z.atrapado > 0;
  if (z.cayendo) { z.cae -= dt; if (z.cae <= 0) { z.cayendo = false; z.estado = 'anda'; s.ev.push({ k: 'aterriza', z: z.id }); } return; }
  if (inmov) { z.come = false; return; }
  if (z.hip) { actHip(s, z, dt); return; }
  if (d.final) return actJefe(s, z, dt);
  // fase del espectro
  if (d.fase) { z.fase = (z.edad % 5) > 3; }
  // submarinos
  if (d.agua) z.sumergido = enAgua(s, z) && z.estado !== 'come' && !s.plantas.some((p) => p.r === z.r && p.c + 1 >= z.x - 3.2 && p.c <= z.x);
  if (d.vuelo) z.vuelo = z.vuelo; // se mantiene hasta pincharlo
  // aura tambor
  if (d.aura) s.zombis.forEach((o) => { if (o !== z && !o.hip && Math.abs(o.r - z.r) <= 1 && Math.abs(o.x - z.x) <= 2.2) o.buffT = 0.3; });
  // salto en curso
  if (z.salto) { z.salto.t += dt; z.x = z.salto.x0 + (z.salto.x1 - z.salto.x0) * Math.min(1, z.salto.t / z.salto.T); if (z.salto.t >= z.salto.T) { z.salto = null; z.estado = 'anda'; if (z.tipo === 'pertiguista' || z.tipo === 'vallista') z.v = d.v2; } return; }
  // rumbero
  if (d.baila) { z.tbaila -= dt; if (z.tbaila <= 0 && z.x < 9.3) { z.tbaila = 9; z.estado = 'baila'; z.tB = 1.2; [[-1, 0], [1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const r = z.r + dr; if (r >= 0 && r < FILAS) crearZombi(s, 'coro', r, Math.min(9.4, z.x + dc * 0.9 + (dr ? 0 : 0))); }); s.ev.push({ k: 'baila', z: z.id }); } if (z.tB > 0) { z.tB -= dt; return; } }
  // honda
  if (d.tira && z.x < 8 && z.tira > 0) {
    const pls = s.plantas.filter((p) => p.r === z.r);
    if (pls.length && z.x > 4.5) { z.estado = 'apunta'; z.tTira -= dt; if (z.tTira <= 0) { z.tTira = 3.2; z.tira--; const p = pls[ri(s, pls.length)]; s.ev.push({ k: 'roca', z: z.id, r: p.r, c: p.c }); const cel = s.celdas[idx(p.r, p.c)]; const tg = cel.esc || p; tg.hp -= 220; if (tg.hp <= 0) { if (cel.esc === tg) cel.esc = null; else destruirPlanta(s, p, 'roca'); } } return; }
  }
  // cava (topo)
  if (d.cava && z.bajo) { z.x -= velocidad(s, z, dt) * dt; if (z.x <= 0.6) { z.bajo = false; z.dir = 1; z.estado = 'anda'; z.v = 0.22; s.ev.push({ k: 'emerge', z: z.id }); } return; }
  // jefe capataz: invoca
  if (d.invoca) { z.tJefe -= dt; if (z.tJefe <= 0 && z.x < 9.3) { z.tJefe = 14; for (let k = 0; k < 2; k++) crearZombi(s, d.invoca, ri(s, FILAS), 9.8 + k * 0.4); s.ev.push({ k: 'invoca', z: z.id }); } }
  if (d.lanza && !z.lanzo && z.hp < z.hpMax * 0.5) { z.lanzo = true; crearZombi(s, d.lanza, z.r, Math.max(1.5, z.x - 3.5)); s.ev.push({ k: 'lanzaEnano', z: z.id }); }
  const f = plantaFrente(s, z);
  if (f) {
    z.come = true; z.estado = 'come';
    if (d.cae && false) return;
    // salto
    if (z.saltos > 0 && !(f.p && P[f.p.id].t === 'pincho') && z.dir < 0) { z.saltos--; z.salto = { t: 0, T: 0.8, x0: z.x, x1: Math.max(-0.2, f.c - 0.1) }; z.estado = 'salta'; z.come = false; s.ev.push({ k: 'salta', z: z.id }); return; }
    if (d.escala && !z.usoEsc && f.p && !f.esc && (P[f.p.id].t === 'muro')) { z.usoEsc = true; f.p.escalera = true; z.arm = null; s.ev.push({ k: 'escalera', r: f.r, c: f.c }); z.come = false; z.estado = 'anda'; return; }
    if (d.pozo && !z.usoPozo && f.p) { z.usoPozo = true; if (f.esc) f.cel.esc = null; destruirPlanta(s, f.p, 'pozo'); f.cel.pozo = 20; s.ev.push({ k: 'pozo', r: f.r, c: f.c }); z.estado = 'anda'; z.come = false; return; }
    if (f.p && P[f.p.id].t === 'hipno' && !f.esc) { z.hip = true; z.dir = 1; z.come = false; z.estado = 'anda'; z.v = 0.3; destruirPlanta(s, f.p, 'hipno'); s.stats.perdidas--; s.ev.push({ k: 'hipnotiza', z: z.id }); return; }
    if (d.vehiculo) { // aplasta
      if (f.esc) f.cel.esc = null;
      if (f.p) destruirPlanta(s, f.p, 'aplasta');
      f.cel.hielo = 18; s.ev.push({ k: 'aplasta', r: f.r, c: f.c }); z.come = false; z.estado = 'anda'; z.x -= 0.15; return;
    }
    if (d.aplasta) { z.tAplasta -= dt; if (z.tAplasta <= 0) { z.tAplasta = d.cada; if (f.esc) f.cel.esc = null; if (f.p) destruirPlanta(s, f.p, 'aplasta'); s.ev.push({ k: 'aplasta', r: f.r, c: f.c }); } return; }
    if (z.tipo === 'corredor' && z.v !== d.v2) z.v = d.v2;
    const dps = d.dps * (z.rabia ? 1.5 : 1) * (z.lento > 0 ? 0.5 : 1);
    const blanco = f.esc || f.p;
    blanco.hp -= dps * dt; z.ataque = 0.3; z.mordio = (z.mordio || 0) + dt;
    if (z.mordio > 0.7) { z.mordio = 0; s.ev.push({ k: 'muerde', r: f.r, c: f.c }); }
    if (blanco.hp <= 0) { if (f.esc && blanco === f.esc) f.cel.esc = null; else destruirPlanta(s, f.p, 'comida'); }
    return;
  }
  z.come = false; if (z.estado === 'come' || z.estado === 'apunta' || z.estado === 'baila') z.estado = 'anda';
  z.x += z.dir * velocidad(s, z, dt) * dt;
  if (z.dir > 0 && z.x > 10.2) z.borrar = true;
}
function actHip(s, z, dt) {
  z.x += 0.3 * s.dif.vel * dt * (z.lucha ? 0 : 1) * 1;
  z.lucha = false;
  for (const o of s.zombis) { if (o === z || o.hip || o.estado === 'muere' || !enFila(o, z.r) || o.vuelo || o.bajo) continue; if (Math.abs(o.x - z.x) < 0.7) { z.lucha = true; danar(s, o, 100 * dt, { ignora: true }); danar(s, z, 60 * dt, { ignora: true }); } }
  if (z.x > 10.2) z.borrar = true;
}
function actJefe(s, z, dt) {
  const hpr = z.hp / z.hpMax; z.tJefe -= dt;
  if (z.x > 8.7) z.x -= 0.4 * dt;
  if (z.tJefe <= 0) {
    z.tJefe = hpr < 0.5 ? 5.5 : 8; z.ciclo++; const k = z.ciclo % 3;
    if (k === 1) { z.ataque = 1; s.ev.push({ k: 'jefeInvoca' }); const pool = s.niv.poolJefe || ['paseante', 'baliza', 'cubero', 'corredor']; for (let i = 0; i < (hpr < 0.5 ? 4 : 3); i++) crearZombi(s, pool[ri(s, pool.length)], ri(s, FILAS), 9.8 + i * 0.5); }
    else if (k === 2) { const pls = s.plantas.slice(); if (pls.length) { const p = pls[ri(s, pls.length)]; z.ataque = 1; s.ev.push({ k: 'jefeBola', r: p.r, c: p.c }); for (let dr = 0; dr <= 1; dr++) for (let dc = 0; dc <= 1; dc++) { const cel = s.celdas[idx(Math.min(FILAS - 1, p.r + dr), Math.min(COLS - 1, p.c + dc))]; if (cel.esc) cel.esc = null; if (cel.p) destruirPlanta(s, cel.p, 'jefe'); } } }
    else { z.ataque = 1; s.ev.push({ k: 'jefeApaga' }); s.plantas.forEach((p) => { p.cd += 4; }); s.cartas.forEach((c) => { c.listo = Math.max(c.listo, s.t + 3); }); }
  }
}

/* ---------- cortadoras ---------- */
function pasoCort(s, dt) {
  for (let r = 0; r < FILAS; r++) {
    const m = s.cort[r];
    if (m.estado === 'lista') {
      if (s.zombis.some((z) => !z.hip && z.estado !== 'muere' && !z.vuelo && !z.bajo && !z.cayendo && enFila(z, r) && z.x < 0.35)) { m.estado = 'activa'; m.x = 0; s.stats.cortadoras++; s.ev.push({ k: 'cortadora', r });
        if (m.tipo === 'hielo') s.zombis.forEach((z) => { if (enFila(z, r) && !z.hip && z.estado !== 'muere') z.cong = 8; });
        if (m.tipo === 'fuego') s.zombis.forEach((z) => { if (enFila(z, r) && !z.hip && z.estado !== 'muere') danar(s, z, 400, { ignora: true }); }); }
    } else if (m.estado === 'activa') {
      m.x += (m.tipo === 'turbo' ? 9 : 5.5) * dt;
      for (const z of s.zombis) { if (z.hip || z.estado === 'muere' || z.vuelo || z.bajo || !enFila(z, r)) continue; if (Math.abs(z.x - m.x) < 0.6) { if (Z[z.tipo].final) { danar(s, z, 1500, { ignora: true }); } else matar(s, z); } }
      if (m.x > 10.5) { m.usos--; m.estado = m.usos > 0 && m.tipo === 'turbo' ? 'lista' : 'gastada'; m.x = 0; }
    }
  }
}
function pasoBolas(s, dt) {
  for (let i = s.bolas.length - 1; i >= 0; i--) {
    const b = s.bolas[i]; b.x += b.v * dt; let fin = false;
    for (const z of s.zombis) {
      if (z.hip || z.estado === 'muere' || z.vuelo || z.bajo || z.cayendo || b.tocados && b.tocados.includes(z.id)) continue;
      if (!enFila(z, b.r) || Math.abs(z.x - b.x) > 0.55) continue;
      (b.tocados = b.tocados || []).push(z.id);
      if (b.tipo === 'bomba') { s.ev.push({ k: 'explosion', r: b.r, c: Math.floor(b.x), id: 'cereza', radio: 1.6 }); areaDano(s, b.x, b.r, 1.6, 1800, { circ: true, expl: true, ign: true }); fin = true; break; }
      const dano = b.tipo === 'bolagr' ? 2000 : 1000;
      danar(s, z, dano, { ignora: true, expl: true }); s.ev.push({ k: 'bolazo', r: b.r, x: b.x }); b.hits++;
      if (b.tipo === 'bolagr') areaDano(s, b.x, b.r, 1.0, 600, { circ: true, expl: true, ign: true });
      if (b.hits >= (b.tipo === 'bolagr' ? 6 : 4)) { fin = true; break; }
    }
    if (fin || b.x > 10.5) s.bolas.splice(i, 1);
  }
}

/* ---------- oleadas ---------- */
export function zombisVivos(s) { return s.zombis.filter((z) => z.estado !== 'muere' && !z.hip).length; }
function lanzarOla(s, o) {
  const graves = []; s.celdas.forEach((c, i) => { if (c.tumba) graves.push(i); });
  o.z.forEach((e, i) => {
    if (e.z === 'coro') return;
    let x = 9.7 + (i % 4) * 0.28 + rnd(s) * 0.2;
    if (graves.length && (e.t || (s.niv.tipo === 'tumbas' ? true : rnd(s) < 0.35))) { const g = graves[ri(s, graves.length)]; const z = crearZombi(s, e.z, Math.floor(g / COLS), (g % COLS) + 0.5); z.salidaTumba = 0.8; return; }
    crearZombi(s, e.z, e.r, x);
  });
  s.olaNum++; s.stats.olas = s.olaNum; s.ev.push({ k: 'ola', n: s.olaNum, grande: !!o.grande, ultima: !!o.ultima });
}
function pasoOlas(s, dt) {
  if (s.niv.tipo === 'jarros' && !s.olas.length) return;
  if (s.niv.infinito && s.olaIdx >= s.olas.length) { const g = s.niv.generar(s.olaIdx, s); s.olas.push(g); if (s.proxOla > 1e8) s.proxOla = g.t; }
  const o = s.olas[s.olaIdx];
  if (!o) return;
  if (!s.oleadaAviso && (o.grande || o.ultima) && s.t >= s.proxOla - 4.5 && s.olaIdx > 0) { s.oleadaAviso = o.ultima ? 'final' : 'grande'; s.ev.push({ k: 'avisoOla', final: !!o.ultima }); }
  // adelanto si el tablero esta vacio
  if (s.olaIdx > 0 && zombisVivos(s) === 0 && s.proxOla - s.t > 5 && !o.grande && !o.ultima && !s.niv.infinito) s.proxOla = s.t + 5;
  if (s.t >= s.proxOla) {
    lanzarOla(s, o); s.oleadaAviso = null; s.olaIdx++;
    const n = s.olas[s.olaIdx];
    if (n) s.proxOla = n.t; else if (s.niv.infinito) { const g = s.niv.generar(s.olaIdx, s); s.olas.push(g); s.proxOla = s.t + g.espera; } else s.proxOla = 1e9;
  }
}
export const ultimaLanzada = (s) => !s.niv.infinito && s.olaIdx >= s.olas.length && s.olas.length > 0;

/* ---------- paso principal ---------- */
export function paso(s, dt) {
  let r = dt; while (r > 1e-9 && !s.fin) { const h = Math.min(0.05, r); sub(s, h); r -= h; }
}
function sub(s, dt) {
  s.t += dt;
  // cielo
  const luna = !s.niv.cielo && s.niv.noche && (s.niv.tipo === 'normal' || s.niv.tipo === 'surv' || s.niv.tipo === 'jefe');
  if (luna) { s.tCielo -= dt; if (s.tCielo <= 0) { s.tCielo = 10 + rnd(s) * 3; nuevoSol(s, 0.6 + rnd(s) * 8, -0.6, 15, 'cielo'); s.soles[s.soles.length - 1].y0 = 0.7 + rnd(s) * 3.6; } }
  else if (s.niv.cielo && s.niv.tipo !== 'puzzle' && s.niv.tipo !== 'versus') { s.tCielo -= dt; if (s.tCielo <= 0) { s.tCielo = (s.niv.tipo === 'carrera' ? 2.2 : 6.5 + rnd(s) * 3) * (s.dif.sol > 1 ? 0.9 : 1); nuevoSol(s, 0.6 + rnd(s) * 8, -0.6, Math.round(s.solVal * 1), 'cielo'); s.soles[s.soles.length - 1].y0 = 0.7 + rnd(s) * 3.6; } }
  if (s.versus) { s.versus.tC -= dt; if (s.versus.tC <= 0) { s.versus.tC = 2.4; s.versus.cerebros = Math.min(999, s.versus.cerebros + 15); } s.tCielo = 1e9; if (s.sol < 999) s.tSolV = (s.tSolV || 0) + dt, s.tSolV > 3 && (s.tSolV = 0, s.sol += 25); }
  // cinta
  if (s.cinta) { s.cinta.t -= dt; if (s.cinta.t <= 0) { s.cinta.t = s.cinta.cada; if (s.cola.length < s.cinta.max) { const L = s.cinta.lista; s.cola.push(L[ri(s, L.length)]); s.ev.push({ k: 'cinta' }); } } }
  // tumbas / suelo
  s.celdas.forEach((c) => { if (c.pozo > 0) c.pozo -= dt; if (c.hielo > 0) c.hielo -= dt; });
  pasoOlas(s, dt);
  for (const p of s.plantas.slice()) actPlanta(s, p, dt);
  pasoProy(s, dt); pasoBolas(s, dt);
  s.zombis.forEach((z) => { z.buff = (z.buffT || 0) > 0; if (z.buffT) z.buffT -= dt; });
  for (const z of s.zombis.slice()) actZombi(s, z, dt);
  // lucha entre hipnotizados y otros
  s.zombis.forEach((z) => { if (!z.hip && z.estado !== 'muere') { for (const h of s.zombis) if (h.hip && h.estado !== 'muere' && h.r === z.r && Math.abs(h.x - z.x) < 0.7 && !z.salto) { z.atur = Math.max(z.atur, 0.05); } } });
  pasoCort(s, dt);
  s.zombis = s.zombis.filter((z) => !z.borrar);
  // soles
  for (let i = s.soles.length - 1; i >= 0; i--) {
    const q = s.soles[i]; q.t = (q.t || 0) + dt;
    if (q.cae && q.y < q.y0) { q.y += 0.7 * dt; if (q.y >= q.y0) { q.y = q.y0; q.cae = 0; } } else q.vida -= dt;
    if (s.autoSol && q.t > s.autoSol && !q.cae) { recogerSol(s, q.id); continue; }
    if (q.vida <= 0) s.soles.splice(i, 1);
  }
  for (let i = s.monedas.length - 1; i >= 0; i--) { s.monedas[i].vida -= dt; if (s.monedas[i].vida <= 0) s.monedas.splice(i, 1); }
  fin(s);
}
function fin(s) {
  if (s.fin) return;
  const dens = s.zombis.some((z) => !z.hip && z.estado !== 'muere' && !z.vuelo && z.x < -0.3 && !z.bajo && (s.cort[Math.min(FILAS - 1, Math.max(0, z.r))].estado !== 'activa'));
  const vol = s.zombis.some((z) => !z.hip && z.estado !== 'muere' && z.vuelo && z.x < -0.3);
  if (s.niv.tipo !== 'versus' && (dens || vol)) { s.fin = 'derrota'; s.ev.push({ k: 'fin', v: 0 }); return; }
  if (s.niv.tipo === 'versus') { if (dens || vol) { s.fin = 'zombis'; s.ev.push({ k: 'fin', v: 0 }); return; } if (s.t >= s.niv.duracion) { s.fin = 'plantas'; s.ev.push({ k: 'fin', v: 1 }); } return; }
  if (s.niv.infinito) return;
  const obj = s.niv.objetivo;
  if (obj && obj.tipo === 'soles') { if (s.stats.soles >= obj.n) { s.fin = 'victoria'; s.ev.push({ k: 'fin', v: 1 }); } return; }
  const vivos = zombisVivos(s);
  if (s.niv.tipo === 'jarros') { if (!s.celdas.some((c) => c.jarro) && !vivos && s.olaIdx >= s.olas.length) { s.fin = 'victoria'; s.ev.push({ k: 'fin', v: 1 }); } return; }
  if (s.niv.tipo === 'tumbas') { if (!s.celdas.some((c) => c.tumba) && !vivos) { s.fin = 'victoria'; s.ev.push({ k: 'fin', v: 1 }); } return; }
  if (s.niv.tipo === 'puzzle') { if (!vivos) { s.fin = 'victoria'; s.ev.push({ k: 'fin', v: 1 }); } return; }
  if (s.olaIdx >= s.olas.length && s.olas.length && !vivos) { s.fin = 'victoria'; s.ev.push({ k: 'fin', v: 1 }); }
}

/* ---------- versus ---------- */
export function lanzarZombi(s, tipo, r, coste) {
  if (!s.versus || s.fin || s.versus.cerebros < coste) return false;
  s.versus.cerebros -= coste; crearZombi(s, tipo, r, 9.6); return true;
}

/* ---------- serializacion (partida efimera) ---------- */
export function serializar(s) {
  const o = { ...s, ev: [] }; delete o.niv; delete o.dif; delete o.olas;
  o.celdas = s.celdas.map((c) => ({ ...c, p: c.p ? c.p.pid : null }));
  return JSON.stringify(o);
}
export function restaurar(txt, nivel, difId) {
  const o = JSON.parse(txt); o.niv = nivel; o.dif = DIF[difId] || DIF.normal; o.ev = [];
  o.olas = nivel.infinito ? [] : (nivel.olas || []).slice();
  if (nivel.infinito) for (let i = 0; i < o.olaIdx; i++) o.olas.push({ t: 0, z: [], espera: 20 });
  const por = new Map(o.plantas.map((p) => [p.pid, p])); o.celdas.forEach((c) => { c.p = c.p != null ? por.get(c.p) || null : null; });
  return o;
}
