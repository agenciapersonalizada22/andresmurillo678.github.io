// IA de bots (solo el anfitrion o el modo un jugador la ejecuta). Tres dificultades.
import { ARMAS, RAREZAS, generarItem } from './armas.js';
import { pasoFisico } from './fisica.js';
import { difAng } from './util.js';
export const DIFICULTADES = {
  facil: { n: 'Fácil', err: 7, reac: 0.95, cd: 1.9, mov: 0.82, dmg: 0.55, vista: 55, construye: false },
  normal: { n: 'Normal', err: 3.4, reac: 0.5, cd: 1.3, mov: 0.95, dmg: 0.85, vista: 85, construye: false },
  dificil: { n: 'Difícil', err: 1.3, reac: 0.22, cd: 1.0, mov: 1.05, dmg: 1.0, vista: 120, construye: true }
};
const ARM_BOT = ['pistola', 'smg', 'escopeta', 'rifle', 'rifle', 'smg', 'francotirador', 'cohete'];
export function iniciarIA(e, dif, R, destino, tDrop) {
  e.ia = { dif: DIFICULTADES[dif] || DIFICULTADES.normal, estado: 'bus', tDrop, dest: destino, lootT: 6 + R() * 12, armaT: 3 + R() * 9, tgt: null, reac: 0, cd: 0, mag: 0, recarga: 0, scan: R() * 0.4, strafe: 1, strafeT: 0, desvio: 0, desvioT: 0, saltoT: 0, curaT: 0, golpeT: 0, mats: dif === 'dificil' ? 120 : 0, muroT: 0, ult: null };
}
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function actualizarBot(e, dt, X) {
  const I = e.ia, R = X.R, W = X.W;
  e.fase = (e.fase || 0) + (e.velH || 0) * dt * 1.8; e.velH = 0;
  if (!e.vivo) return;
  if (I.estado === 'bus') {
    e.x = X.bus.x; e.y = X.bus.y; e.z = X.bus.z; e.est = 0; e.oculto = true;
    if (X.tiempo >= I.tDrop) { I.estado = 'caida'; e.est = 1; e.oculto = false; e.vy = -20; e.suelo = false; }
    return;
  }
  const alt = e.y - W.mundo.T.altura(e.x, e.z), dx = I.dest[0] - e.x, dz = I.dest[1] - e.z, dd = Math.hypot(dx, dz) || 1;
  if (I.estado === 'caida') {
    if (e.est === 1 && alt < 75) e.est = 2;
    const sp = e.est === 1 ? (dd > 30 ? 26 : 14) : 17, k = Math.min(1, dd / 6);
    e.x += dx / dd * sp * k * dt; e.z += dz / dd * sp * k * dt; e.vy = e.est === 1 ? -52 : -9; e.y += e.vy * dt; e.ry = Math.atan2(dx, dz);
    const s = Math.max(W.mundo.T.altura(e.x, e.z), W.constr.suelo(e.x, e.z, e.y));
    if (e.y <= s) { e.y = s; e.vy = 0; e.est = 3; e.suelo = true; I.estado = 'tierra'; }
    return;
  }
  if (e.est !== 3) e.est = 3;
  I.cd -= dt; I.golpeT -= dt; I.saltoT -= dt; I.curaT -= dt; I.muroT -= dt; I.strafeT -= dt; I.desvioT -= dt; I.scan -= dt; I.armaT -= dt;
  if (!e.arma && I.armaT <= 0) { const w = ARM_BOT[(R() * ARM_BOT.length) | 0]; e.arma = { w, r: Math.min(4, Math.floor(R() * 3.2)) }; e.armaSel = 1; I.mag = ARMAS[w].mag; }
  if (I.recarga > 0 && e.arma) { I.recarga -= dt; if (I.recarga <= 0) I.mag = ARMAS[e.arma.w].mag; }
  if (e.vida < 55 && I.curaT <= 0 && !I.tgt) { e.vida = Math.min(100, e.vida + 30); I.curaT = 14; }
  if (e.esc < 40 && I.curaT <= 0 && !I.tgt) { e.esc = Math.min(100, e.esc + 40); I.curaT = 12; }
  /* vista */
  if (I.scan <= 0) {
    I.scan = 0.35 + R() * 0.15; let mejor = null, md = 1e9;
    if (e.arma) for (const o of X.ents) {
      if (o === e || !o.vivo || o.equipo === e.equipo || o.est === 0 || o.oculto) continue;
      const d = dist2(e, o); if (d < md && d < I.dif.vista && X.lineaVista(e.x, e.y + 1.5, e.z, o.x, o.y + 1.2, o.z)) { md = d; mejor = o; }
    }
    if (mejor && I.tgt !== mejor.id) I.reac = I.dif.reac;
    I.tgt = mejor ? mejor.id : null; I.ult = mejor ? { x: mejor.x, z: mejor.z } : I.ult;
  }
  const tgt = I.tgt ? X.porId[I.tgt] : null;
  let mx = 0, mz = 0, vel = 5.2 * I.dif.mov, saltar = false;
  const tor = X.torm, fuera = Math.hypot(e.x - tor.cx, e.z - tor.cz) > tor.r - 8, futuro = tor.modo === 'cierra' || tor.resto < 25;
  if (tgt && tgt.vivo && e.arma) {
    const d = dist2(e, tgt), A = ARMAS[e.arma.w], ideal = Math.min(A.alc * 0.7, 45);
    const ax = tgt.x - e.x, az = tgt.z - e.z, ay = (tgt.y + 1.15) - (e.y + 1.4), dl = Math.hypot(ax, ay, az) || 1;
    e.ry += difAng(e.ry, Math.atan2(ax, az)) * Math.min(1, dt * 9); e.pitch = Math.atan2(ay, Math.hypot(ax, az)) * 0.5;
    if (I.strafeT <= 0) { I.strafe = R() < 0.5 ? -1 : 1; I.strafeT = 0.8 + R() * 1.4; }
    const fx = ax / d, fz = az / d, ap = d > ideal * 1.2 ? 1 : d < ideal * 0.5 ? -0.7 : 0.1;
    mx = fx * ap + -fz * I.strafe * 0.8; mz = fz * ap + fx * I.strafe * 0.8; vel *= 1.1;
    I.reac -= dt;
    if (I.reac <= 0 && I.cd <= 0 && I.recarga <= 0 && d < Math.min(A.alc * 2.6, I.dif.vista)) {
      if (I.mag <= 0) I.recarga = A.rec * 1.1;
      else {
        const err = (I.dif.err * (d > 40 ? 1.3 : 1) * Math.PI / 180) * (A.pel > 1 ? 0.6 : 1);
        const dir = [ax / dl + (R() - 0.5) * 2 * err, ay / dl + (R() - 0.5) * 2 * err, az / dl + (R() - 0.5) * 2 * err]; const n = Math.hypot(dir[0], dir[1], dir[2]);
        X.disparar(e, [dir[0] / n, dir[1] / n, dir[2] / n], e.arma.w, e.arma.r, I.dif.dmg); I.mag--; I.cd = A.cd * I.dif.cd * (A.auto ? 1 : 1.15);
      }
    }
    if (I.dif.construye && I.golpeT > 0 && I.muroT <= 0 && I.mats >= 10) { I.muroT = 4; I.mats -= 10; X.muroBot(e, Math.atan2(ax, az)); }
    if (R() < dt * 0.4) saltar = true;
  } else {
    I.reac = I.dif.reac;
    let tx = I.dest[0], tz = I.dest[1];
    if (fuera || futuro) { tx = tor.prox.x; tz = tor.prox.z; if (Math.hypot(e.x - tx, e.z - tz) < Math.max(6, tor.prox.r * 0.4)) { tx = e.x; tz = e.z; } vel *= 1.15; }
    else if (I.lootT > 0) I.lootT -= dt;
    else if (Math.hypot(e.x - tx, e.z - tz) < 6) { const a = R() * 6.28, d = 30 + R() * 60; I.dest = [Math.max(-300, Math.min(300, e.x + Math.cos(a) * d)), Math.max(-300, Math.min(300, e.z + Math.sin(a) * d))]; }
    const ddx = tx - e.x, ddz = tz - e.z, dl = Math.hypot(ddx, ddz);
    if (dl > 1.5) { mx = ddx / dl; mz = ddz / dl; e.ry += difAng(e.ry, Math.atan2(mx, mz)) * Math.min(1, dt * 6); }
    e.pitch = 0;
  }
  const ml = Math.hypot(mx, mz);
  if (ml > 0.01) {
    mx /= ml; mz /= ml;
    if (I.desvioT > 0) { const c = Math.cos(I.desvio), s = Math.sin(I.desvio), nx = mx * c - mz * s, nz = mx * s + mz * c; mx = nx; mz = nz; }
    if (e.bloqueado && I.saltoT <= 0) { saltar = true; I.saltoT = 0.5; if (R() < 0.4) { I.desvio = (R() < 0.5 ? 1 : -1) * 1.2; I.desvioT = 1; } }
    if (e.agua) vel *= 0.5;
    pasoFisico(W, e, mx, mz, vel, saltar, dt); e.velH = vel;
  } else pasoFisico(W, e, 0, 0, 0, saltar, dt);
}
export function armaAleatoria(R) { const it = generarItem(R, true); return it.k === 'arma' ? { w: it.w, r: it.r } : { w: 'pistola', r: 0 }; }
export { RAREZAS };
