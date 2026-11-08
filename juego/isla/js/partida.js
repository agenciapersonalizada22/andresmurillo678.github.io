// Logica de partida: entidades, bus, tormenta, balas, danos, botin, red, guardado y repeticion.
import * as THREE from '../lib/three.module.min.js';
import { G, enRed, esAnfitrion, difundir, miIdRed } from './estado.js';
import { crearMundo } from './mundo.js';
import { crearConstruccion, MATS, baldosa } from './construccion.js';
import { crearBotin } from './botin.js';
import { crearBalas } from './balas.js';
import { crearEfectos } from './efectos.js';
import { crearPersonajes } from './personajes.js';
import { crearTormenta } from './tormenta.js';
import { iniciarIA, actualizarBot, armaAleatoria } from './bots.js';
import { pasoFisico } from './fisica.js';
import { golpeEst, bloqueaEst } from './terreno.js';
import { ARMAS, ARMAS_ID, RAREZAS, falloff, descItem } from './armas.js';
import { SKINS } from './almacen.js';
import { rng, clamp } from './util.js';
import { sfx } from './sonido.js';
const NOMBRES_BOT = ['Rayo', 'Cuervo', 'Lince', 'Nube', 'Roble', 'Fénix', 'Sombra', 'Trueno', 'Pixel', 'Coyote', 'Halcón', 'Mambo', 'Turbo', 'Zorro', 'Ciclón', 'Delta', 'Orca', 'Brisa', 'Cobra', 'Jaguar', 'Kiwi', 'Lobo', 'Mono', 'Nova', 'Oso', 'Puma', 'Quasar', 'Tigre', 'Viento', 'Yeti', 'Zeta', 'Ámbar'];
const COLORES = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff', '#4aa8ff', '#e85a5a'];
export const ENT0 = (id, tipo, nombre, equipo, skin, color) => ({ id, tipo, nombre, equipo, skin, color, x: 0, y: 200, z: 0, vx: 0, vy: 0, vz: 0, ry: 0, pitch: 0, vida: 100, esc: 0, vivo: true, est: 0, suelo: false, arma: null, armaSel: 0, emote: -1, emT: 0, fase: 0, velH: 0, agua: false, oculto: false, bloqueado: false });
const tmpV = new THREE.Vector3();
let stormMesh = null, temp = { dano: 0, grab: 0, snap: 0, snapB: 0, guardar: 0, cuenta: 0, sonT: 0 }, contadorSuelta = 0;

export function limpiar() {
  const P = G.P; if (P && P.busMesh) { G.escena.remove(P.busMesh); P.busMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
  if (P && P.tormMesh) { G.escena.remove(P.tormMesh); P.tormMesh.geometry.dispose(); P.tormMesh.material.dispose(); }
  if (G.W.mundo) { G.escena.remove(G.W.mundo.grupo); G.W.mundo.dispose(); G.W.mundo = null; }
  if (G.W.constr) { G.W.constr.dispose(); G.W.constr = null; }
  ['botin', 'balas', 'ef', 'pers'].forEach((k) => { if (G[k]) { G[k].dispose(); G[k] = null; } });
  G.ents = []; G.porId = {}; G.yo = null; G.P = null;
}

export function sonar(n, x, y, z, ganancia = 1) {
  const c = G.camara.position, d = Math.hypot(x - c.x, y - c.y, z - c.z), v = clamp(1 - d / 200, 0, 1) * ganancia; if (v <= 0.02) return;
  const e = G.camara.rotation; const dx = x - c.x, dz = z - c.z; const yaw = G.P ? G.P.camYaw || 0 : 0;
  sfx(n, v, clamp((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(d, 1) * 0.8, -1, 1) * (e ? 1 : 1));
}

export function iniciarPartida(o) {
  limpiar();
  const aj = G.aj, sem = o.semilla | 0, R = rng(sem * 5 + 1), mp = !!o.mp;
  G.W.mundo = crearMundo(sem, aj); G.escena.add(G.W.mundo.grupo); G.W.constr = crearConstruccion(G.escena);
  const T = G.W.mundo.T; G.botin = crearBotin(G.escena, T); G.balas = crearBalas(G.escena); G.ef = crearEfectos(G.escena); G.ef.reducir = !!aj.reducirMov; G.pers = crearPersonajes(G.escena);
  const hs = o.jugadores.map((j) => { const e = ENT0('h' + j.id, 'humano', j.nombre, 0, j.skin || 'base', j.color); e.rid = j.id; e.local = j.id === o.miId; return e; });
  const duos = o.modo === 'duos';
  hs.forEach((e, i) => { e.equipo = duos ? Math.floor(i / 2) : i; });
  let eq = hs.length ? Math.max(...hs.map((e) => e.equipo)) + 1 : 0;
  const nBots = o.modo === 'creativo' ? 0 : Math.max(0, o.total - hs.length), bots = [];
  for (let i = 0; i < nBots; i++) {
    const b = ENT0('b' + i, 'bot', 'Bot ' + NOMBRES_BOT[i % NOMBRES_BOT.length], 0, SKINS[1 + Math.floor(R() * (SKINS.length - 1))].id, COLORES[Math.floor(R() * COLORES.length)]);
    if (duos) { if (hs.length % 2 === 1 && i === 0) b.equipo = hs[hs.length - 1].equipo; else { const k = i - (hs.length % 2); b.equipo = eq + Math.floor(k / 2); } } else b.equipo = eq + i;
    bots.push(b);
  }
  G.ents = [...hs, ...bots];
  let spawnCre = null;
  if (o.modo === 'creativo') {
    const p = T.pois[0]; let dir = 0;
    for (let a = 0; a < 6.28 && !spawnCre; a += 0.35) for (let d = 24; d < 46 && !spawnCre; d += 4) {
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, y = T.altura(x, z); if (y < 1.5 || bloqueaEst(T, x, y, z, 3, 2.5)) continue;
      const ok = [0, 1, 2, 3].every((i) => { const mx = x + Math.cos(a) * (12 + i * 0) + (i - 1.5) * 3 * -Math.sin(a), mz = z + Math.sin(a) * 12 + (i - 1.5) * 3 * Math.cos(a); return T.altura(mx, mz) > 1.5 && !bloqueaEst(T, mx, T.altura(mx, mz), mz, 1.5, 2.5); });
      if (ok) { spawnCre = { x, z, a }; dir = a; }
    }
    if (!spawnCre) spawnCre = { x: p.x + 30, z: p.z, a: 0 };
    for (let i = 0; i < 4; i++) { const m = ENT0('m' + i, 'bot', 'Maniquí', 100 + i, 'robot', '#ffffff'); m.inerte = true; m.x = spawnCre.x + Math.cos(spawnCre.a) * 12 + (i - 1.5) * 3 * -Math.sin(spawnCre.a); m.z = spawnCre.z + Math.sin(spawnCre.a) * 12 + (i - 1.5) * 3 * Math.cos(spawnCre.a); m.y = T.altura(m.x, m.z); m.est = 3; m.suelo = true; m.ry = spawnCre.a + Math.PI / 2 + Math.PI; m.ry = Math.atan2(-Math.cos(spawnCre.a), -Math.sin(spawnCre.a)); m.vida = 100; G.ents.push(m); }
  }
  G.ents.forEach((e) => { G.porId[e.id] = e; });
  G.yo = hs.find((e) => e.local) || hs[0];
  const a = R() * Math.PI * 2, L = 560, vel = 48, dur = 2 * L / vel;
  const bus = { x0: -Math.cos(a) * L, z0: -Math.sin(a) * L, x1: Math.cos(a) * L, z1: Math.sin(a) * L, dx: Math.cos(a), dz: Math.sin(a), vel, alt: 150, dur, x: 0, y: 150, z: 0 };
  const P = G.P = { modo: o.modo, dif: o.dif, semilla: sem, total: G.ents.length, mp, t0: o.t0 || 0, t: o.modo === 'creativo' ? 1 : -3.5, fase: o.modo === 'creativo' ? 'juego' : 'cuenta', bus, torm: crearTormenta(sem), tormEst: null, est: { elims: 0, dano: 0, mats: 0, piezas: 0 }, contab: false, camYaw: 0, rep: null, buf: [], objsDestruidos: [], lootTomado: [], cofresAbiertos: [], drops: [], fin: null, miMuerte: null, espectando: null, tormMesh: null, feedMuertes: 0, ultimoSnap: 0 };
  P.tormMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 500, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a3dff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  P.tormMesh.position.y = 120; G.escena.add(P.tormMesh);
  const bm = new THREE.Group(), mb = (g, c, x, y, z) => { const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); bm.add(m); return m; };
  mb(new THREE.BoxGeometry(6, 4, 20), 0x2a76d2, 0, 0, 0); mb(new THREE.BoxGeometry(18, 0.5, 5), 0xf2f2f2, 0, 0.5, -2); mb(new THREE.SphereGeometry(8, 12, 8), 0xff4a6a, 0, 14, 0); mb(new THREE.BoxGeometry(0.3, 10, 0.3), 0x333333, 0, 6, 0);
  G.escena.add(bm); P.busMesh = bm;
  const host = esAnfitrion();
  G.ents.forEach((e) => {
    if (e.tipo === 'bot' && !e.inerte) {
      if (host) {
        const poi = T.pois[Math.floor(R() * T.pois.length)], off = R() < 0.7, dest = off ? [poi.x + (R() - 0.5) * 50, poi.z + (R() - 0.5) * 50] : [(R() - 0.5) * 500, (R() - 0.5) * 500];
        const s = (dest[0] - bus.x0) * bus.dx + (dest[1] - bus.z0) * bus.dz; iniciarIA(e, o.dif, R, dest, clamp(s / vel - (3 + R() * 3), 1, dur - 2));
      } else e.interp = new window.Red.Interpolador({ angulos: ['ry'], retardo: 130 });
    } else if (e.tipo === 'humano' && !e.local) e.interp = new window.Red.Interpolador({ angulos: ['ry'], retardo: 110 });
  });
  if (o.modo === 'creativo') { G.yo.x = spawnCre.x; G.yo.z = spawnCre.z; G.yo.y = T.altura(G.yo.x, G.yo.z); G.yo.est = 3; G.yo.suelo = true; G.yo.ry = Math.atan2(Math.cos(spawnCre.a), Math.sin(spawnCre.a)); G.P.spawnYaw = G.yo.ry; }
  else { G.yo.x = bus.x0; G.yo.y = bus.alt; G.yo.z = bus.z0; }
  G.hud.fondoMapa(G.W.mundo.minimapa(256));
  if (o.restaurar) restaurar(o.restaurar);
  return P;
}

/* ---------------- tiempo y bus ---------------- */
export const tiempoPartida = () => { const P = G.P; return P.mp ? (window.Red.reloj() - P.t0) / 1000 : P.t; };
export function busEn(t) { const b = G.P.bus, s = clamp(t, 0, b.dur) * b.vel; b.x = b.x0 + b.dx * s; b.z = b.z0 + b.dz * s; b.y = b.alt; return b; }
export const lineaVista = (ax, ay, az, bx, by, bz) => {
  const T = G.W.mundo.T, d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 2.5);
  for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t; if (y < T.altura(x, z) || golpeEst(T, x, y, z) || G.W.constr.golpe(x, y, z)) return false; }
  return true;
};

/* ---------------- disparos y balas ---------------- */
export function disparar(tirador, origen, dir, w, r, dm, spread) {
  const seed = (Math.random() * 1e9) | 0, d = { o: tirador.id, p: origen, d: dir, w: ARMAS_ID.indexOf(w), r, s: seed, dm: dm || 1, sp: spread == null ? ARMAS[w].disp : spread };
  crearDisparo(d); difundir('bala', { o: d.o, p: d.p.map((v) => Math.round(v * 100) / 100), d: d.d.map((v) => Math.round(v * 1000) / 1000), w: d.w, r, s: seed, dm: d.dm, sp: Math.round(d.sp * 100) / 100 });
}
export function crearDisparo(d) {
  const w = ARMAS_ID[d.w], A = ARMAS[w], t = G.porId[d.o]; if (!A) return;
  const R = rng(d.s), sp = d.sp * Math.PI / 180, host = esAnfitrion(), mia = t && (t === G.yo || (host && t.tipo === 'bot'));
  for (let i = 0; i < A.pel; i++) {
    let dx = d.d[0] + (R() - 0.5) * 2 * sp, dy = d.d[1] + (R() - 0.5) * 2 * sp, dz = d.d[2] + (R() - 0.5) * 2 * sp; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    G.balas.nueva({ x: d.p[0], y: d.p[1], z: d.p[2], vx: dx * A.vel, vy: dy * A.vel, vz: dz * A.vel, g: A.g, w, r: d.r, dano: A.dano * RAREZAS[d.r].m * d.dm, dueno: d.o, equipo: t ? t.equipo : -1, local: !!mia, yo: t === G.yo, exp: A.expl || 0, col: w === 'cohete' ? 0xffa040 : w === 'francotirador' ? 0xffffff : 0xffe08a, grosor: A.pel > 1 ? 0.6 : 1 });
  }
  if (t) { sonar(w === 'cohete' ? 'cohete' : w, d.p[0], d.p[1], d.p[2], t === G.yo ? 0.8 : 1); if (t === G.yo) { /* local */ } }
}
export function pasoBala(b, ax, ay, az) {
  const T = G.W.mundo.T, C = G.W.constr, dx = b.x - ax, dy = b.y - ay, dz = b.z - az, n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25)), yo = G.yo;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    for (const e of G.ents) {
      if (!e.vivo || e.dueno === b.dueno || e.id === b.dueno || e.est === 0 || e.oculto || e.equipo === b.equipo) continue;
      if (Math.abs(x - e.x) < 0.6 && Math.abs(z - e.z) < 0.6 && y > e.y && y < e.y + 1.85 && Math.hypot(x - e.x, z - e.z) < 0.55) { impactoEnt(b, e, x, y, z); return true; }
    }
    let tipo = null, ref = null;
    if (y < T.altura(x, z)) tipo = 'terreno';
    else { const g = golpeEst(T, x, y, z); if (g) { tipo = g.tipo; ref = g; } else { const p = C.golpe(x, y, z); if (p) { tipo = 'pieza'; ref = p; } } }
    if (tipo) { impactoMundo(b, tipo, ref, x, y, z); return true; }
  }
  return false;
}
function impactoEnt(b, e, x, y, z) {
  if (b.exp) { explosion(x, y, z, b); return; }
  const head = y > e.y + 1.45; let d = b.dano * falloff(b.w, b.dist) * (head ? (b.w === 'francotirador' ? 2.5 : 2) : 1);
  G.ef.emitir(x, y, z, head ? 0xffee55 : 0xff4a4a, 5, 4, 0.4);
  if (e === G.yo) aplicarDano(e, d, b.dueno, head, b.w, x, z);
  else if (e.tipo === 'bot' && esAnfitrion()) aplicarDano(e, d, b.dueno, head, b.w, x, z);
  if (b.yo && e !== G.yo) { const mata = e.vivo && (e.vida + e.esc) <= d; G.hud.impacto(head, mata && esAnfitrion()); sfx(head ? 'headshot' : 'hit', 0.8); if (head && b.w === 'francotirador' && b.dist > 100) G.P.largaDist = true; G.P.ultimoImpacto = { w: b.w, dist: b.dist }; G.P.est.dano += Math.min(d, 100); }
}
function impactoMundo(b, tipo, ref, x, y, z) {
  if (b.exp) { explosion(x, y, z, b); return; }
  G.ef.emitir(x, y, z, tipo === 'pieza' ? MATS[ref.mat].c : 0xcdbb94, 4, 3, 0.35);
  if (tipo === 'pieza' && b.local) { const d = b.dano * 0.8; difundir('pd', { k: ref.k, d: Math.round(d) }); danarPieza(ref.k, d); }
}
export function danarPieza(k, d) {
  const r = G.W.constr.danar(k, d); if (!r) return;
  if (r.destruida) { const t = baldosa(r.p, 1, 1); G.ef.emitir(t.x, t.y, t.z, MATS[r.p.mat].c, 14, 6, 0.8); sonar('romper', t.x, t.y, t.z); }
}
export function explosion(x, y, z, b) {
  G.ef.explosion(x, y, z, b.exp); sonar('explosion', x, y, z, 1.2);
  const R = b.exp * 1.25;
  for (const e of G.ents) {
    if (!e.vivo || e.est === 0) continue; if (e.equipo === b.equipo && e.id !== b.dueno) continue;
    const d = Math.hypot(e.x - x, e.y + 0.9 - y, e.z - z); if (d > R) continue;
    const dm = b.dano * (1 - d / R) * (e.id === b.dueno ? 0.4 : 1);
    if (e === G.yo) aplicarDano(e, dm, b.dueno, false, b.w, x, z); else if (e.tipo === 'bot' && esAnfitrion()) aplicarDano(e, dm, b.dueno, false, b.w, x, z);
    if (b.yo && e !== G.yo) { G.hud.impacto(false, false); G.P.est.dano += Math.min(dm, 100); }
  }
  if (b.local) for (const p of G.W.constr.piezasCerca(x, y, z, R)) { const t = baldosa(p, 1, 1), d = Math.hypot(t.x - x, t.y - y, t.z - z), dm = 500 * Math.max(0, 1 - d / (R + 2.5)); if (dm > 1) { difundir('pd', { k: p.k, d: Math.round(dm) }); danarPieza(p.k, dm); } }
}

/* ---------------- dano y muertes ---------------- */
export function aplicarDano(e, dm, origen, head, w, hx, hz) {
  if (!e.vivo || e.invulnerable || dm <= 0) return;
  const s = Math.min(e.esc, dm); e.esc -= s; e.vida -= dm - s;
  if (e === G.yo) { G.hud.dano(dm / 60 + 0.25); sfx('dano', 0.8); G.I.vibrar(0.6, 0.3, 140); G.P.ultDano = performance.now(); if (hx != null) G.P.dirDano = Math.atan2(hx - e.x, hz - e.z); }
  if (e.ia) { e.ia.golpeT = 1.5; if (origen && origen !== e.id) e.ia.tgt = origen; if (e.ia.reac > 0.15) e.ia.reac = Math.min(e.ia.reac, 0.25); }
  if (e.vida <= 0) { e.vida = 0; morir(e, origen, w); }
}
function nombreArma(w) { return ARMAS[w] ? ARMAS[w].n : w === 'tormenta' ? 'la tormenta' : w === 'caida' ? 'una caída' : 'un golpe'; }
function morir(e, k, w) {
  if (e.inerte) { difundir('muerte', { v: e.id, k, w: w || '' }); registrar(e.id, k, w); return; }
  const items = [];
  if (e === G.yo) { G.yo.inv.slots.forEach((s, i) => { if (s && i > 0) items.push({ k: 'arma', w: s.w, r: s.r }); }); ['ligera', 'media', 'cartuchos'].forEach((t) => { if (G.yo.inv.mun[t] > 0) items.push({ k: 'mun', t, n: G.yo.inv.mun[t] }); }); }
  else if (e.arma && e.arma.w !== 'pico') { items.push({ k: 'arma', w: e.arma.w, r: e.arma.r }); items.push({ k: 'mun', t: ARMAS[e.arma.w].mun, n: 20 }); if (Math.random() < 0.5) items.push({ k: 'cons', t: 'vendaje', n: 3 }); }
  soltarItems(items, e.x, e.y, e.z);
  difundir('muerte', { v: e.id, k, w: w || '' }); registrar(e.id, k, w);
}
export function soltarItems(items, x, y, z) {
  items.forEach((it, i) => { const id = 'd' + miIdRed() + '_' + (contadorSuelta++), a = i * 2.3 + Math.random(), px = x + Math.cos(a) * 1.4, pz = z + Math.sin(a) * 1.4; G.botin.soltar(it, px, y + 0.3, pz, id); G.P.drops.push({ id, it, x: px, y: y + 0.3, z: pz }); difundir('soltar', { id, it, x: Math.round(px * 10) / 10, y: Math.round((y + 0.3) * 10) / 10, z: Math.round(pz * 10) / 10 }); });
}
export function registrar(vId, kId, w) {
  const v = G.porId[vId], k = G.porId[kId], P = G.P; if (!v || !v.vivo) return;
  v.vivo = false; v.est = 3;
  if (v.inerte) { setTimeout(() => { if (G.P === P) { v.vivo = true; v.vida = 100; } }, 3000); return; }
  const txt = k && k !== v ? `${k.nombre} eliminó a ${v.nombre} (${nombreArma(w)})` : `${v.nombre} cayó por ${nombreArma(w || kId)}`;
  G.hud.baja(txt, k === G.yo || v === G.yo);
  if (k === G.yo && v !== G.yo) {
    P.est.elims++; sfx('victoria', 0.25); G.hud.impacto(false, true);
    P.ultKill = { w, dist: P.ultimoImpacto ? P.ultimoImpacto.dist : 0 }; if (G.cuenta) G.cuenta.eventoKill(P, w);
  }
  if (v === G.yo) { P.miMuerte = { killer: k ? k.id : null, w }; }
  chequearFin();
}
export function equiposVivos() { const s = new Set(); for (const e of G.ents) if (e.vivo && !e.inerte) s.add(e.equipo); return s; }
export function chequearFin() {
  const P = G.P; if (!P || P.modo === 'creativo' || P.fase === 'fin') return;
  const s = equiposVivos(), yo = G.yo;
  if (!s.has(yo.equipo) && !P.contab) { P.contab = true; P.puesto = s.size + 1; finalizar(false); }
  if (s.size <= 1) { P.fase = 'fin'; P.fin = { ganadorEq: [...s][0] }; if (s.has(yo.equipo) && !P.contab) { P.contab = true; P.puesto = 1; finalizar(true); } else if (!P.finAvisado) { P.finAvisado = true; if (G.alFin) G.alFin(P); } }
}
function finalizar(gano) { const P = G.P; const res = { gano, puesto: P.puesto, elims: P.est.elims, dano: Math.round(P.est.dano), tiempo: Math.max(0, tiempoPartida()), total: new Set(G.ents.filter((e) => !e.inerte).map((e) => e.equipo)).size, modo: P.modo, piezas: P.est.piezas, mats: P.est.mats, largaDist: !!P.largaDist, cohete: !!P.ultKill && P.ultKill.w === 'cohete' }; P.res = res; if (G.alTerminar) G.alTerminar(res); }

/* ---------------- construccion compartida ---------------- */
export function ponerPieza(d, mat, dueno, avisar) {
  const p = G.W.constr.poner(d.t, d.gx, d.gy, d.gz, d.d, mat, dueno); if (!p) return null;
  const t = baldosa(p, 1, 1); sonar('construir', t.x, t.y, t.z, 0.7);
  if (avisar) difundir('b', { t: d.t, gx: d.gx, gy: d.gy, gz: d.gz, d: d.d, m: mat, o: dueno });
  return p;
}
export function editarPieza(k, mask, avisar) { const p = G.W.constr.piezas.get(k); if (!p) return; G.W.constr.editar(p, mask); if (avisar) difundir('bm', { k, mask }); }

/* ---------------- red ---------------- */
export function recibir(tipo, d, de) {
  const P = G.P; if (!P) return;
  if (tipo === 'p') { const e = G.porId['h' + de]; if (e && e.interp) { e.interp.agregar(d.t, d.p); e.vidaVista = d.p.v; } }
  else if (tipo === 'bots') { d.b.forEach((a) => { const e = G.porId['b' + a[0]]; if (e && e.interp) e.interp.agregar(d.t, { x: a[1], y: a[2], z: a[3], ry: a[4], e: a[5] }); }); }
  else if (tipo === 'eq') { const e = G.porId[d.i != null ? d.i : 'h' + de]; if (e) { e.arma = d.w >= 0 ? { w: ARMAS_ID[d.w] || 'pico', r: d.r } : null; if (d.w === -1) e.arma = { w: 'pico', r: 0 }; if (d.w === -2) e.arma = null; e.armaSel = d.s; } }
  else if (tipo === 'bala') crearDisparo(d);
  else if (tipo === 'muerte') registrar(d.v, d.k, d.w);
  else if (tipo === 'b') G.W.constr.poner(d.t, d.gx, d.gy, d.gz, d.d, d.m, d.o) && sonar('construir', d.gx * 4, d.gy * 3, d.gz * 4, 0.6);
  else if (tipo === 'bm') editarPieza(d.k, d.mask, false);
  else if (tipo === 'pd') danarPieza(d.k, d.d);
  else if (tipo === 'tomar') G.botin.quitar(d.i);
  else if (tipo === 'cofre') { const c = G.botin.cofres.get(d.i); if (c && !c.abierto) { G.botin.abrirCofre(c); sonar('recoger', c.x, c.y, c.z); } }
  else if (tipo === 'soltar') { G.botin.soltar(d.it, d.x, d.y, d.z, d.id); }
  else if (tipo === 'obj') destruirObj(d.i, d.d);
  else if (tipo === 'em') { const e = G.porId['h' + de]; if (e) { e.emote = d.e; e.emT = 0; sonar('emote', e.x, e.y, e.z); } }
  else if (tipo === 'hola') { const e = G.porId['h' + de]; if (e) e.skin = d.skin; }
  else if (tipo === 'bemo') { const e = G.porId[d.i]; if (e) { e.emote = d.e; e.emT = 0; } }
}
export function destruirObj(i, dm) {
  const o = G.W.mundo.T.objetos[i]; if (!o || !o.vivo) return false;
  o.hp -= dm; G.ef.emitir(o.x, o.y + o.alto * 0.5, o.z, o.mat === 'madera' ? 0x9b6b3a : o.mat === 'piedra' ? 0x999999 : 0x88aacc, 4, 4, 0.5);
  if (o.hp <= 0) { G.W.mundo.destruirObjeto(i); G.P.objsDestruidos.push(i); G.ef.emitir(o.x, o.y + 1, o.z, o.mat === 'madera' ? 0x3d8a3a : 0x888888, 14, 6, 0.8); sonar('romper', o.x, o.y, o.z, 0.8); return true; }
  return false;
}

/* ---------------- bucle de partida ---------------- */
const lastPos = new Map();
function snapshots(dt) {
  const P = G.P; if (!enRed()) return; const t = window.Red.reloj(), yo = G.yo;
  temp.snap -= dt; temp.snapB -= dt;
  if (temp.snap <= 0 && yo) { temp.snap = 0.066; difundir('p', { t, p: window.Red.compactar({ x: yo.x, y: yo.y, z: yo.z, ry: yo.ry, e: yo.est, v: Math.round(yo.vida + yo.esc) }, 2) }, false); }
  if (esAnfitrion() && temp.snapB <= 0) { temp.snapB = 0.1; const b = []; for (const e of G.ents) if (e.tipo === 'bot' && !e.inerte) b.push([+e.id.slice(1), Math.round(e.x * 10) / 10, Math.round(e.y * 10) / 10, Math.round(e.z * 10) / 10, Math.round(e.ry * 100) / 100, e.est]); difundir('bots', { t, b }, false); }
}
function remotos(dt) {
  for (const e of G.ents) {
    if (!e.interp || !e.vivo) { if (e.interp) e.fase += 0; continue; }
    const s = e.interp.obtener(); if (!s) continue;
    const dx = s.x - e.x, dz = s.z - e.z; e.velH = Math.hypot(dx, dz) / Math.max(dt, 0.001); if (e.velH > 40) e.velH = 0; e.fase += e.velH * dt * 1.8;
    e.x = s.x; e.y = s.y; e.z = s.z; e.ry = s.ry; e.est = Math.round(s.e); e.oculto = e.est === 0;
  }
}
export function actualizarPartida(dt) {
  const P = G.P; if (!P) return;
  if (P.mp) P.t = tiempoPartida(); else if (P.fase !== 'fin' || true) P.t += dt;
  const t = P.t, bus = busEn(t);
  if (P.fase === 'cuenta' && t >= 0) { P.fase = 'juego'; sfx('bus', 0.5); }
  if (P.fase === 'cuenta') { const n = Math.ceil(-t); if (n !== temp.cuenta) { temp.cuenta = n; G.hud.cuentaAtras(n > 0 ? n : ''); sfx('ui', 0.6); } } else if (temp.cuenta !== 0) { temp.cuenta = 0; G.hud.cuentaAtras(''); }
  P.tormEst = P.modo === 'creativo' ? null : P.torm.estado(Math.max(0, t));
  const te = P.tormEst, host = esAnfitrion();
  P.busMesh.position.set(bus.x, bus.y, bus.z); P.busMesh.rotation.y = Math.atan2(bus.dx, bus.dz); P.busMesh.visible = t < bus.dur + 4;
  if (P.fase === 'cuenta') G.ents.forEach((e) => { if (e.est === 0) { e.x = bus.x; e.y = bus.y; e.z = bus.z; } });
  /* bots */
  if (host && P.fase !== 'cuenta') {
    const X = { R: botR, W: G.W, ents: G.ents, porId: G.porId, tiempo: t, bus, torm: te || { cx: 0, cz: 0, r: 9999, modo: 'espera', resto: 99, prox: { x: 0, z: 0, r: 9999 } }, lineaVista, disparar: (e, dir, w, r, dm) => disparar(e, [e.x + Math.sin(e.ry) * 0.5, e.y + 1.45, e.z + Math.cos(e.ry) * 0.5], dir, w, r, dm, ARMAS[w].disp * 0.4), muroBot };
    for (const e of G.ents) if (e.ia && e.vivo) { const eqAntes = e.arma ? e.arma.w + e.arma.r : ''; actualizarBot(e, dt, X); const eqDesp = e.arma ? e.arma.w + e.arma.r : ''; if (eqAntes !== eqDesp && e.arma) difundir('eq', { i: e.id, w: ARMAS_ID.indexOf(e.arma.w), r: e.arma.r, s: e.armaSel }); }
  }
  remotos(dt);
  G.ents.forEach((e) => { if (e.emote >= 0) { e.emT += dt; if (e.emT > 2.8) e.emote = -1; } if (e.vivo && e.id !== G.yo.id && !e.interp && !e.ia) e.fase += (e.velH || 0) * dt * 1.8; });
  G.balas.actualizar(dt, pasoBala); G.ef.actualizar(dt); G.botin.actualizar(G.camara.position, dt); G.W.mundo.actualizar(G.camara.position);
  /* tormenta */
  if (te) {
    P.tormMesh.position.set(te.cx, 120, te.cz); P.tormMesh.scale.set(Math.max(te.r, 0.5), 1, Math.max(te.r, 0.5));
    temp.dano -= dt;
    if (temp.dano <= 0) {
      temp.dano = 1;
      for (const e of G.ents) { if (!e.vivo || e.inerte || e.est === 0) continue; if (e !== G.yo && !(e.tipo === 'bot' && host)) continue; if (Math.hypot(e.x - te.cx, e.z - te.cz) > te.r && te.dano > 0 && t > 45) aplicarDano(e, te.dano, 'tormenta', false, 'tormenta'); }
    }
    if (te.fase >= 0 && te.fase !== P.faseAvisada) { P.faseAvisada = te.fase; if (te.fase > 0) { G.hud.mensaje('Fase ' + (te.fase + 1) + ': la tormenta se cierra', 3500); sfx('tormenta', 0.6); } }
  }
  /* grabacion para la repeticion */
  temp.grab -= dt; if (temp.grab <= 0 && P.fase !== 'fin') { temp.grab = 0.1; const f = new Float32Array(G.ents.length * 7); G.ents.forEach((e, i) => { f.set([e.x, e.y, e.z, e.ry, e.est, e.vivo ? 1 : 0, e.emote], i * 7); }); P.buf.push(f); if (P.buf.length > 90) P.buf.shift(); }
  snapshots(dt);
  if (!P.mp) { temp.guardar -= dt; if (temp.guardar <= 0) { temp.guardar = 4; guardarSP(); } }
  if (P.fase !== 'cuenta') chequearFin();
}
const botR = (() => { let a = 12345; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
function muroBot(e, yaw) {
  const d = G.W.constr.colocacion('p', e, yaw), p = ponerPieza(d, 'madera', e.id, true); if (p) { /* bot construyo */ }
}
export function terminarSesion() { limpiar(); }

/* ---------------- guardado un jugador ---------------- */
import { CLAVES, escribir, borrar, leer } from './almacen.js';
export function guardarSP() {
  const P = G.P; if (!P || P.mp || P.fase === 'fin' || !G.yo || !G.yo.vivo || P.modo === 'creativo' && false) return;
  const y = G.yo, r = (n) => Math.round(n * 100) / 100;
  escribir(CLAVES.partida, {
    v: 1, modo: P.modo, dif: P.dif, semilla: P.semilla, total: P.total, t: r(P.t), faseAv: P.faseAvisada, est: P.est, fase: P.fase,
    yo: { x: r(y.x), y: r(y.y), z: r(y.z), ry: r(y.ry), vy: 0, vida: y.vida, esc: y.esc, est: y.est, inv: y.inv, armaSel: y.armaSel, yaw: G.P.camYaw, pitch: y.pitch },
    ents: G.ents.filter((e) => e.tipo === 'bot').map((e) => [e.id, r(e.x), r(e.y), r(e.z), r(e.ry), e.vida, e.esc, e.vivo ? 1 : 0, e.est, e.arma, e.armaSel, e.ia ? { estado: e.ia.estado, dest: e.ia.dest, tDrop: e.ia.tDrop, lootT: e.ia.lootT, armaT: e.ia.armaT, mats: e.ia.mats } : null]),
    objs: P.objsDestruidos, tomado: P.lootTomado, cofres: [...G.botin.cofres.values()].filter((c) => c.abierto).map((c) => c.id), drops: P.drops.filter((d) => G.botin.items.has(d.id)), piezas: G.W.constr.lista()
  });
}
export function hayPartidaGuardada() { const s = leer(CLAVES.partida, null); return s && s.v === 1 && s.fase !== 'fin' ? s : null; }
export function borrarGuardada() { borrar(CLAVES.partida); }
function restaurar(s) {
  const P = G.P, y = G.yo, B = G.botin;
  P.t = s.t; P.fase = s.fase === 'cuenta' ? 'juego' : s.fase; P.est = s.est || P.est; P.faseAvisada = s.faseAv; if (P.fase !== 'cuenta' && P.modo !== 'creativo' && P.t < 0) P.t = 0;
  Object.assign(y, { x: s.yo.x, y: s.yo.y, z: s.yo.z, ry: s.yo.ry, vida: s.yo.vida, esc: s.yo.esc, est: s.yo.est, inv: s.yo.inv, armaSel: s.yo.armaSel, pitch: s.yo.pitch || 0 }); P.camYaw = s.yo.yaw || 0;
  s.ents.forEach((a) => { const e = G.porId[a[0]]; if (!e) return; Object.assign(e, { x: a[1], y: a[2], z: a[3], ry: a[4], vida: a[5], esc: a[6], vivo: !!a[7], est: a[8], arma: a[9], armaSel: a[10] }); if (e.ia && a[11]) { Object.assign(e.ia, a[11]); if (e.arma) e.ia.mag = ARMAS[e.arma.w].mag; } if (e.est === 0 && e.ia && e.ia.estado === 'bus') e.oculto = true; });
  (s.objs || []).forEach((i) => { destruirObj(i, 1e9); });
  (s.tomado || []).forEach((id) => { B.quitar(id); P.lootTomado.push(id); });
  (s.cofres || []).forEach((id) => { const c = B.cofres.get(id); if (c) { c.abierto = true; } });
  (s.drops || []).forEach((d) => { B.soltar(d.it, d.x, d.y, d.z, d.id); P.drops.push(d); });
  (s.piezas || []).forEach((p) => { G.W.constr.poner(p[0], p[1], p[2], p[3], p[4], p[5], 'h0', p[6], p[7]); });
  P.restaurada = true;
}
/* los cofres abiertos antes de guardar ya soltaron sus items (se guardan en drops): no volver a soltarlos */

/* ---------------- repeticion ---------------- */
export function iniciarRepeticion(objetivoId) {
  const P = G.P; if (!P || P.buf.length < 5) return false;
  const idx = Math.max(0, G.ents.findIndex((e) => e.id === objetivoId)); P.rep = { frames: P.buf.slice(-80), t: 0, idx, ang: 0 }; return true;
}
export function actualizarRepeticion(dt) {
  const P = G.P, r = P.rep; if (!r) return true;
  r.t += dt * 1; r.ang += dt * 0.5; const f = r.frames, k = r.t * 10, i = Math.min(f.length - 1, Math.floor(k)), j = Math.min(f.length - 1, i + 1), u = k - i;
  G.ents.forEach((e, n) => { const a = f[i], b = f[j], o = n * 7; e.x = a[o] + (b[o] - a[o]) * u; e.y = a[o + 1] + (b[o + 1] - a[o + 1]) * u; e.z = a[o + 2] + (b[o + 2] - a[o + 2]) * u; e.ry = a[o + 3]; e.est = a[o + 4]; e.vivo = !!a[o + 5]; e.emote = a[o + 6]; e.velH = e.vivo ? 5 : 0; e.fase += dt * 9; e.emT += dt; e.oculto = false; });
  const o = G.ents[r.idx], c = G.camara, rad = 7;
  c.position.set(o.x + Math.cos(r.ang) * rad, o.y + 3.5, o.z + Math.sin(r.ang) * rad); c.lookAt(o.x, o.y + 1.2, o.z);
  G.pers.dibujar(G.ents, c.position, 400, 0);
  return k >= f.length - 1;
}
