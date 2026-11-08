// Jugador local: bus, caida, planeo, movimiento, combate, recoger, curarse, construir, editar, emotes y camara de tercera persona.
import { G, esAnfitrion, difundir, enRed } from './estado.js';
import { ARMAS, ARMAS_ID, RAREZAS, MUN, CONS, MATERIALES, descItem } from './armas.js';
import { pasoFisico, altSuelo } from './fisica.js';
import { golpeEst } from './terreno.js';
import { MATS, NOMBRE_PIEZA, clave } from './construccion.js';
import { EMOTES } from './personajes.js';
import { disparar, ponerPieza, editarPieza, destruirObj, soltarItems, aplicarDano, tiempoPartida, busEn, sonar, danarPieza } from './partida.js';
import { sfx } from './sonido.js';
import { seguirSol } from './escena.js';
import { clamp, lerp, difAng } from './util.js';
const COSTO = 10, tmp = { cd: 0, picoCd: 0, bloom: 0, recoilT: 0, constrCd: 0, mensajeT: 0, pasos: 0 };

export function iniciarJugador() {
  const y = G.yo, P = G.P, cre = P.modo === 'creativo';
  if (!P.restaurada) {
  y.inv = { slots: [{ w: 'pico', r: 0 }, null, null, null, null, null], mun: { ligera: 0, media: 0, pesada: 0, cartuchos: 0, cohetes: 0 }, cons: { vendaje: 0, botiquin: 0, escudo_peq: 0, escudo: 0 }, mats: { madera: 0, piedra: 0, metal: 0 } };
  y.matSel = 'madera'; y.piezaSel = 'p'; y.construyendo = false; y.usando = null; y.recarga = 0; y.armaSel = 0; y.arma = { w: 'pico', r: 0 };
  if (cre) {
    ['pistola', 'smg', 'escopeta', 'rifle', 'francotirador'].forEach((w, i) => { y.inv.slots[i + 1] = { w, r: 3, mag: ARMAS[w].mag }; });
    for (const m in y.inv.mats) y.inv.mats[m] = 9999; for (const t in MUN) y.inv.mun[t] = MUN[t].max; y.inv.cons.vendaje = 5; y.vida = 100; y.esc = 100;
  }
  }
  y.piezaSel = 'p'; y.construyendo = false; y.usando = null; y.recarga = 0; y.matSel = y.matSel || 'madera';
  P.camYaw = P.restaurada ? P.camYaw : 0; P.camPitch = 0.1; P.recoilP = 0; P.recoilY = 0; P.fov = 72; P.camPos = null; P.espectando = null;
  const bus = P.bus; if (!cre && !P.restaurada) P.camYaw = Math.atan2(bus.dx, bus.dz); if (cre && P.spawnYaw != null) P.camYaw = P.spawnYaw;
  sincArma(false);
}
export function sincArma(avisar = true) {
  const y = G.yo, s = y.inv.slots[y.armaSel]; y.arma = s ? { w: s.w, r: s.r } : null; y.recarga = 0;
  if (avisar) difundir('eq', { w: !s ? -2 : s.w === 'pico' ? -1 : ARMAS_ID.indexOf(s.w), r: s ? s.r : 0, s: y.armaSel });
}
const msg = (t, ms) => G.hud.mensaje(t, ms);
function elegirSlot(i) { const y = G.yo; if (i < 0 || i > 5) return; if (i > 0 && !y.inv.slots[i]) return; y.armaSel = i; y.construyendo = false; y.usando = null; G.I.construyendo = false; G.W.constr.fantasma(null); sincArma(); sfx('ui', 0.4); }
export function cambiarSlot(i) { elegirSlot(i); }
function cicloArma(d) { const y = G.yo; let i = y.armaSel; for (let k = 0; k < 6; k++) { i = (i + d + 6) % 6; if (y.inv.slots[i]) break; } elegirSlot(i); }

/* ---- utilidades ---- */
const dirCam = (yaw, pit) => [Math.sin(yaw) * Math.cos(pit), Math.sin(pit), Math.cos(yaw) * Math.cos(pit)];
function rayoMundo(o, d, max, paso = 0.3) {
  const T = G.W.mundo.T, C = G.W.constr;
  for (let t = 1.5; t < max; t += paso) { const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t; if (y < T.altura(x, z) || golpeEst(T, x, y, z) || C.golpe(x, y, z)) return { t, x, y, z }; }
  return null;
}
function recoger(l) {
  const y = G.yo, it = l.item, inv = y.inv;
  if (it.k === 'arma') {
    let s = inv.slots.findIndex((q, i) => i > 0 && !q); const reemplazo = s < 0; if (reemplazo) s = y.armaSel > 0 ? y.armaSel : 1;
    const viejo = inv.slots[s]; if (viejo) soltarItems([{ k: 'arma', w: viejo.w, r: viejo.r }], y.x, y.y, y.z);
    inv.slots[s] = { w: it.w, r: it.r, mag: ARMAS[it.w].mag }; if (reemplazo || y.armaSel === 0 || true) { y.armaSel = s; y.construyendo = false; G.I.construyendo = false; sincArma(); }
  } else if (it.k === 'mun') { if (inv.mun[it.t] >= MUN[it.t].max) return false; inv.mun[it.t] = Math.min(MUN[it.t].max, inv.mun[it.t] + it.n); }
  else if (it.k === 'cons') { if (inv.cons[it.t] >= CONS[it.t].max) return false; inv.cons[it.t] = Math.min(CONS[it.t].max, inv.cons[it.t] + it.n); }
  else { inv.mats[it.t] += it.n; G.P.est.mats += it.n; }
  G.botin.quitar(l.id); G.P.lootTomado.push(l.id); difundir('tomar', { i: l.id }); sfx('recoger', 0.7); G.I.vibrar(0.1, 0.2, 40); return true;
}
function usarConsumible() {
  const y = G.yo, c = y.inv.cons; let t = null;
  if (y.esc <= 50 && c.escudo > 0) t = 'escudo'; else if (y.esc < 50 && c.escudo_peq > 0) t = 'escudo_peq'; else if (y.vida < 75 && c.vendaje > 0) t = 'vendaje'; else if (y.vida < 100 && c.botiquin > 0) t = 'botiquin'; else if (y.esc < 100 && c.escudo > 0) t = 'escudo'; else if (y.esc < 50 && c.escudo_peq > 0) t = 'escudo_peq';
  if (!t) { msg('No hay nada que usar ahora', 1500); return; }
  y.usando = { t, dur: CONS[t].t, p: 0 }; y.construyendo = false; G.I.construyendo = false; G.W.constr.fantasma(null);
}

/* ---- actualizacion ---- */
export function actualizarJugador(dt) {
  const y = G.yo, P = G.P, I = G.I, H = G.hud, C = G.W.constr, T = G.W.mundo.T, aj = G.aj;
  const ed = H.ed.abierta;
  if (I.pausa) { if (H.emotesAbiertos) H.cerrarEmotes(); else if (H.mapaAbierto) H.toggleMapa(false); else if (G.pausar) G.pausar(); }
  if (I.mapa) H.toggleMapa();
  if (ed) { H.ed.mover(I.lx * 14, I.ly * 14); if (I.disparoPulso) H.ed.presionar(true); if (!I.disparo) H.ed.presionar(false); else H.ed.arrastrar(); I.lx = I.ly = 0; }
  else { P.camYaw += I.lx; P.camPitch = clamp(P.camPitch - I.ly, -1.3, 1.25); }
  P.recoilT -= dt; if (P.recoilT <= 0) { P.recoilP *= Math.exp(-7 * dt); P.recoilY *= Math.exp(-7 * dt); }
  if (!y.vivo) { espectar(dt); camara(dt); return; }
  const yaw = P.camYaw, t = tiempoPartida(), fp = Math.sin(yaw), fc = Math.cos(yaw);
  if (P.fase === 'cuenta') { camara(dt); return; }
  if (y.est === 0) {
    const b = busEn(t); y.x = b.x; y.y = b.y; y.z = b.z; y.oculto = true;
    if (I.saltarPulso || t > b.dur - 1) { y.est = 1; y.oculto = false; y.vy = -10; y.vx = b.dx * 14; y.vz = b.dz * 14; sfx('salto', 0.6); P.cayo = true; }
  } else if (y.est === 1 || y.est === 2) {
    const alt = y.y - Math.max(T.altura(y.x, y.z), altSuelo(G.W, y.x, y.z, y.y)), gl = y.est === 2;
    const mx = I.mx, mz = I.mz, sp = gl ? 16 : 26, tx = (fp * mz + fc * mx) * sp + (gl ? 0 : fp * 6), tz = (fc * mz - fp * mx) * sp + (gl ? 0 : fc * 6);
    y.vx = lerp(y.vx, tx, Math.min(1, dt * 2)); y.vz = lerp(y.vz, tz, Math.min(1, dt * 2)); y.x += y.vx * dt; y.z += y.vz * dt;
    const mira = Math.max(0, -P.camPitch), vz = gl ? -9 + (mz > 0 ? 2 : 0) : -(48 + (mz > 0 ? 8 * mira : 0) + (mz < 0 ? -14 : 0));
    y.vy = lerp(y.vy, vz, Math.min(1, dt * 3)); y.y += y.vy * dt; y.ry = yaw; y.velH = 0;
    y.x = clamp(y.x, -395, 395); y.z = clamp(y.z, -395, 395);
    if (!gl && (I.saltarPulso || alt < 55)) { y.est = 2; sfx('salto', 0.5); }
    const s = Math.max(T.altura(y.x, y.z), altSuelo(G.W, y.x, y.z, y.y));
    if (y.y <= s + 0.05) { y.y = s; y.vy = 0; y.est = 3; y.suelo = true; sfx('salto', 0.7); G.I.vibrar(0.3, 0.2, 100); }
  } else movimiento(dt);
  if (y.est === 3) { acciones(dt); }
  if (H.emotesAbiertos && I.slot >= 0 && I.slot < EMOTES.length) { H.cerrarEmotes(); emote(I.slot); }
  G.hud.el.torvig.dataset.on = '';
  camara(dt);
  seguirSol(y.x, y.y, y.z);
}
function emote(i) { const y = G.yo; if (y.est !== 3 || !y.vivo) return; y.emote = i; y.emT = 0; y.construyendo = false; difundir('em', { e: i }); sfx('emote', 0.6); }
export { emote as reproducirEmote };

function movimiento(dt) {
  const y = G.yo, I = G.I, P = G.P, aj = G.aj, yaw = P.camYaw, fp = Math.sin(yaw), fc = Math.cos(yaw), ed = G.hud.ed.abierta;
  let mx = ed ? 0 : I.mx, mz = ed ? 0 : I.mz; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const wx = fp * mz + fc * mx, wz = fc * mz - fp * mx, mag = Math.hypot(wx, wz);
  let vel = (I.correr && mz > 0.2 && !I.apuntar ? 7.6 : 5.3) * (mag > 0 ? mag : 0); if (I.apuntar) vel *= 0.7; if (y.usando) vel *= 0.45; if (y.agua) vel *= 0.55; if (y.emote >= 0 && mag > 0.1) y.emote = -1;
  const dmg = pasoFisico(G.W, y, mag > 0 ? wx / mag : 0, mag > 0 ? wz / mag : 0, vel, I.saltar && !ed, dt);
  if (dmg > 1) aplicarDano(y, dmg, null, false, 'caida');
  if (I.saltarPulso && y.suelo === false && y.vy > 7) sfx('salto', 0.4);
  y.velH = vel;
  y.fase = (y.fase || 0) + vel * dt * 1.8;
  const armado = y.armaSel > 0 || y.construyendo || I.apuntar || I.disparo;
  if (armado) y.ry += difAng(y.ry, yaw) * Math.min(1, dt * 14); else if (mag > 0.1) y.ry += difAng(y.ry, Math.atan2(wx, wz)) * Math.min(1, dt * 10);
  y.pitch = P.camPitch + P.recoilP;
  tmp.pasos += vel * dt; if (tmp.pasos > 2.2 && y.suelo) { tmp.pasos = 0; }
}

function acciones(dt) {
  const y = G.yo, I = G.I, P = G.P, H = G.hud, C = G.W.constr, aj = G.aj, inv = y.inv, creat = P.modo === 'creativo';
  if (I.slot >= 0 && !H.emotesAbiertos) elegirSlot(I.slot); if (I.armaDelta) cicloArma(I.armaDelta);
  if (I.emote) { if (H.emotesAbiertos) H.cerrarEmotes(); else H.abrirEmotes(); }
  /* curacion */
  if (I.curar && !y.usando && !H.ed.abierta) usarConsumible();
  if (y.usando) { const u = y.usando; u.p += dt / u.dur; if (I.saltarPulso && false) y.usando = null; if (u.p >= 1) { const c = CONS[u.t]; if (c.cura) y.vida = Math.min(c.tope, Math.max(y.vida, y.vida + c.cura)); if (c.esc) y.esc = Math.min(c.tope, y.esc + c.esc); inv.cons[u.t]--; y.usando = null; sfx('curar', 0.8); } }
  /* recoger / abrir */
  const cer = G.botin.cercano(y.x, y.y, y.z, 2.6); P.cerca = cer;
  if (cer && cer.tipo === 'item') {
    const it = cer.obj.item, dist = Math.hypot(cer.obj.x - y.x, cer.obj.z - y.z);
    if (it.k !== 'arma' && dist < 1.7 && !(it.k === 'mun' && inv.mun[it.t] >= MUN[it.t].max) && !(it.k === 'cons' && inv.cons[it.t] >= CONS[it.t].max)) recoger(cer.obj);
    else if (I.interactuar && !H.ed.abierta) recoger(cer.obj);
  } else if (cer && cer.tipo === 'cofre' && I.interactuar) { difundir('cofre', { i: cer.obj.id }); G.botin.abrirCofre(cer.obj); sfx('recoger', 0.9); G.I.vibrar(0.2, 0.4, 80); }
  /* construccion */
  if (I.pieza) {
    if (I.pieza === 'salir') { y.construyendo = false; } else { y.piezaSel = I.pieza; y.construyendo = true; y.usando = null; }
    I.construyendo = y.construyendo; if (!y.construyendo) C.fantasma(null); sincArma(false);
  }
  if (I.material) { const i = MATERIALES.indexOf(y.matSel); y.matSel = MATERIALES[(i + 1) % 3]; sfx('ui', 0.4); }
  if (y.construyendo) {
    const d = C.colocacion(y.piezaSel, y, P.camYaw), ok = !C.piezas.has(clave(d.t, d.gx, d.gy, d.gz, d.d)) && (creat || inv.mats[y.matSel] >= COSTO);
    C.fantasma(H.ed.abierta ? null : d, ok); tmp.constrCd -= dt;
    if (I.disparo && ok && tmp.constrCd <= 0 && !H.ed.abierta) { tmp.constrCd = 0.14; if (!creat) inv.mats[y.matSel] -= COSTO; if (ponerPieza(d, y.matSel, y.id, true)) { P.est.piezas++; G.I.vibrar(0.05, 0.1, 25); } }
    else if (I.disparo && !ok && tmp.constrCd <= 0 && !H.ed.abierta) { tmp.constrCd = 0.5; if (!creat && inv.mats[y.matSel] < COSTO) msg('Sin ' + MATS[y.matSel].n.toLowerCase(), 1200); }
  }
  /* edicion rapida */
  if (I.editarPulso && !H.ed.abierta) {
    const eye = [y.x, y.y + 1.55, y.z], d = dirCam(P.camYaw, P.camPitch); let sel = null;
    for (let t = 0.3; t < 10 && !sel; t += 0.15) sel = C.golpe(eye[0] + d[0] * t, eye[1] + d[1] * t, eye[2] + d[2] * t);
    for (const hh of [1.2, 0.5, 2.0]) for (let t = 0.3; t < 6 && !sel; t += 0.15) sel = C.golpe(y.x + Math.sin(P.camYaw) * t, y.y + hh, y.z + Math.cos(P.camYaw) * t);
    if (sel) { y.editando = sel; H.ed.abrir(sel.mask); G.I.sinBloqueo = false; } else msg('Apunta a una pieza tuya para editarla', 1500);
  }
  if (I.editarSuelta && H.ed.abierta) { const p = y.editando; if (p && C.piezas.get(p.k)) editarPieza(p.k, H.ed.mask, true); H.ed.cerrar(); y.editando = null; sfx('construir', 0.5); }
  /* combate */
  const s = inv.slots[y.armaSel]; tmp.cd -= dt; tmp.picoCd -= dt; tmp.bloom = Math.max(0, tmp.bloom - dt * 2);
  if (!s || y.construyendo || H.ed.abierta || y.usando || y.emote >= 0 && !I.disparo) { if (I.disparo && y.emote >= 0) y.emote = -1; return; }
  if (y.emote >= 0 && I.disparo) y.emote = -1;
  if (s.w === 'pico') { if (I.disparo && tmp.picoCd <= 0) { tmp.picoCd = 0.5; pico(); } return; }
  const A = ARMAS[s.w], res = creat ? 999 : inv.mun[A.mun];
  if (y.recarga > 0) { y.recarga -= dt; if (y.recarga <= 0) { const n = Math.min(A.mag - s.mag, res); s.mag += n; if (!creat) inv.mun[A.mun] -= n; y.recarga = 0; } return; }
  if (I.recargar && s.mag < A.mag && res > 0) { y.recarga = A.rec; sfx('recarga', 0.7); return; }
  const quiere = A.auto ? I.disparo : I.disparoPulso;
  if (quiere && tmp.cd <= 0) {
    if (s.mag <= 0) { if (res > 0) { y.recarga = A.rec; sfx('recarga', 0.7); } else if (I.disparoPulso) msg('Sin munición', 1200); return; }
    tmp.cd = A.cd; s.mag--; tirar(s, A);
  }
}
function tirar(s, A) {
  const y = G.yo, P = G.P, I = G.I, yaw = P.camYaw + P.recoilY, pit = P.camPitch + P.recoilP, d = dirCam(yaw, pit), c = G.camara.position;
  const hit = rayoMundo([c.x + d[0] * 3, c.y + d[1] * 3, c.z + d[2] * 3], d, 300), obj = hit ? [hit.x, hit.y, hit.z] : [c.x + d[0] * 300, c.y + d[1] * 300, c.z + d[2] * 300];
  const ox = y.x + Math.sin(y.ry) * 0.55 + Math.cos(y.ry) * 0.2, oy = y.y + 1.4, oz = y.z + Math.cos(y.ry) * 0.55 - Math.sin(y.ry) * 0.2;
  let dx = obj[0] - ox, dy = obj[1] - oy, dz = obj[2] - oz; let l = Math.hypot(dx, dy, dz); if (l < 3 || (dx * d[0] + dy * d[1] + dz * d[2]) < 0) { dx = d[0]; dy = d[1]; dz = d[2]; l = 1; }
  const moving = y.velH > 1, sp = A.disp * (I.apuntar ? 0.45 : 1) * (1 + tmp.bloom) * (moving ? 1.35 : 1) * (y.suelo ? 1 : 2.2);
  disparar(y, [ox, oy, oz], [dx / l, dy / l, dz / l], s.w, s.r, 1, sp);
  tmp.bloom = Math.min(1.5, tmp.bloom + 0.18 + A.retro * 0.02); P.recoilP += A.retro * (Math.PI / 180) * 0.6; P.recoilY += (Math.random() - 0.5) * A.retro * 0.004; P.recoilT = 0.08;
  if (!G.aj.reducirMov) P.shake = Math.min(0.12, A.retro * 0.01);
  I.vibrar(0.2 + A.retro * 0.05, 0.4, 70);
}
function pico() {
  const y = G.yo, P = G.P, eye = [y.x, y.y + 1.5, y.z], d = dirCam(P.camYaw, P.camPitch), T = G.W.mundo.T; let g = null, pos = null;
  y.golpeT = 0.3;
  for (let t = 0.6; t < 3.8 && !g; t += 0.2) { const x = eye[0] + d[0] * t, yy = eye[1] + d[1] * t, z = eye[2] + d[2] * t; const e = golpeEst(T, x, yy, z); if (e) { g = { e }; pos = [x, yy, z]; } else { const p = G.W.constr.golpe(x, yy, z); if (p) { g = { p }; pos = [x, yy, z]; } else if (yy < T.altura(x, z)) { g = { t: 1 }; pos = [x, yy, z]; } } }
  sfx('golpe', 0.5);
  if (!g) return;
  if (g.e && g.e.tipo === 'obj') {
    const o = T.objetos[g.e.i], dm = 25; difundir('obj', { i: g.e.i, d: dm }); const dest = destruirObj(g.e.i, dm);
    const gan = 8 + (dest ? 10 : 0); y.inv.mats[o.mat] += gan; P.est.mats += gan; sfx('cosecha', 0.8); G.I.vibrar(0.2, 0.2, 50);
  } else if (g.p) { difundir('pd', { k: g.p.k, d: 40 }); danarPieza(g.p.k, 40); } else G.ef.emitir(pos[0], pos[1], pos[2], 0xcdbb94, 4, 3, 0.3);
}

/* ---- espectador ---- */
function espectar(dt) {
  const P = G.P, I = G.I; const vivos = G.ents.filter((e) => e.vivo && !e.inerte && e.est !== 0);
  if (!P.espectando || !P.espectando.vivo || I.saltarPulso) {
    const pref = P.espectando && P.espectando.vivo && I.saltarPulso ? vivos[(vivos.indexOf(P.espectando) + 1) % Math.max(1, vivos.length)] : (G.porId[P.miMuerte && P.miMuerte.killer] && G.porId[P.miMuerte.killer].vivo ? G.porId[P.miMuerte.killer] : vivos.find((e) => e.equipo === G.yo.equipo) || vivos[0]);
    P.espectando = pref || null;
  }
  const e = P.espectando; G.yo.oculto = false;
  G.hud.el.espectar.dataset.v = '1';
}

/* ---- camara ---- */
export function camara(dt) {
  const y = G.yo, P = G.P, I = G.I, c = G.camara, T = G.W.mundo.T, C = G.W.constr;
  const t = !y.vivo && P.espectando ? P.espectando : y, aim = I.apuntar && y.est === 3 && y.vivo && !y.construyendo, A = y.arma && ARMAS[y.arma.w];
  const scope = aim && A && A.zoom < 20; let dist = aim ? 2.1 : y.est === 1 || y.est === 2 ? 7.5 : y.est === 0 ? 16 : 4.3, sh = (aim ? 0.55 : y.est === 3 ? 0.85 : 0) * (c.aspect < 1 ? 0.55 : 1), up = 1.55;
  if (y.est === 0 && y.vivo) { const b = P.bus; t.x = b.x; t.y = b.y; t.z = b.z; up = 3; }
  const yaw = P.camYaw, pit = P.camPitch + P.recoilP, f = dirCam(yaw, pit), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const hx = t.x, hy = t.y + up, hz = t.z;
  let px = hx - f[0] * dist + rx * sh, py = hy - f[1] * dist + 0.1, pz = hz - f[2] * dist + rz * sh;
  if (scope) { px = hx + f[0] * 0.3; py = t.y + 1.6; pz = hz + f[2] * 0.3; }
  else for (let s = 1; s <= 10; s++) { const k = s / 10, x = hx + (px - hx) * k, yy = hy + (py - hy) * k, z = hz + (pz - hz) * k; if (yy < T.altura(x, z) + 0.35 || golpeEst(T, x, yy, z) || C.golpe(x, yy, z)) { const kk = Math.max(0, (s - 1.5) / 10); px = hx + (px - hx) * kk; py = hy + (py - hy) * kk + 0.2; pz = hz + (pz - hz) * kk; break; } }
  const sh2 = P.shake ? (Math.random() - 0.5) * P.shake : 0; P.shake = (P.shake || 0) * 0.8;
  c.position.set(px + sh2, py + sh2, pz); c.lookAt(px + f[0] * 40, py + f[1] * 40, pz + f[2] * 40);
  const fov = scope ? A.zoom : aim && A ? A.zoom * 0.8 : y.est === 1 ? 82 : 72; P.fov = lerp(P.fov, fov, Math.min(1, dt * 10));
  if (Math.abs(c.fov - P.fov) > 0.05) { c.fov = P.fov; c.updateProjectionMatrix(); }
  if (y.vivo) y.oculto = scope || y.est === 0;
}

/* ---- datos para el HUD ---- */
export function datosHud(fps) {
  const y = G.yo, P = G.P, inv = y.inv, I = G.I, te = P.tormEst, t = P.t;
  const nomAr = (s) => (s.w === 'pico' ? 'Pico' : ARMAS[s.w].n);
  const slots = inv.slots.map((s, i) => (s ? { n: s.w === 'pico' ? 'Pico' : nomAr(s).slice(0, 8) + ' ' + s.mag, color: s.w === 'pico' ? '#b9b9b9' : RAREZAS[s.r].c } : null));
  const s = inv.slots[y.armaSel], A = s && s.w !== 'pico' ? ARMAS[s.w] : null, cre = P.modo === 'creativo';
  let ammo = ''; if (A) ammo = (y.recarga > 0 ? 'Recargando…' : s.mag + ' / ' + (cre ? '∞' : inv.mun[A.mun]));
  const key = (G.aj.teclas.interactuar || 'KeyE').replace('Key', ''), tecla = I.tipo === 'tactil' ? 'Usar' : I.tipo === 'mando' ? 'Y' : key;
  let prompt = '';
  if (P.cerca && y.vivo && y.est === 3) { const c = P.cerca; prompt = c.tipo === 'cofre' ? `${tecla}: abrir cofre` : (c.obj.item.k === 'arma' ? `${tecla}: ` : '') + (c.obj.item.k === 'arma' ? descItem(c.obj.item) : ''); if (c.tipo === 'item' && c.obj.item.k !== 'arma') prompt = ''; }
  const yoVivo = y.vivo;
  const fuera = te && yoVivo && Math.hypot(y.x - te.cx, y.z - te.cz) > te.r && t > 45;
  const mm = (v) => Math.floor(v / 60) + ':' + String(Math.max(0, Math.ceil(v) % 60)).padStart(2, '0');
  const tormTxt = !te ? (cre ? 'Modo creativo' : '') : te.fase < 0 && t < 45 ? 'Tormenta en ' + mm(te.resto) : te.modo === 'cierra' ? 'Tormenta cerrándose ' + mm(te.resto) : te.modo === 'final' ? 'Última zona' : 'Cierra en ' + mm(te.resto);
  const vivos = G.ents.filter((e) => e.vivo && !e.inerte).length, esp = !y.vivo && P.fase !== 'fin' ? 'Espectando: ' + (P.espectando ? P.espectando.nombre : '—') + (I.tipo === 'tactil' ? '' : '  (Espacio: siguiente)') : '';
  const ps = ['pared', 'piso', 'rampa', 'techo'], pn = { p: 'Pared', s: 'Piso', r: 'Rampa', t: 'Techo' };
  const aim = I.apuntar && y.arma && ARMAS[y.arma.w] && ARMAS[y.arma.w].zoom < 20 && y.est === 3;
  const cons = `Vendaje ${inv.cons.vendaje} · Botiquín ${inv.cons.botiquin} · Escudo peq. ${inv.cons.escudo_peq} · Escudo ${inv.cons.escudo}`;
  const et = [];
  for (const e of G.ents) { if (e === y || !e.vivo || e.equipo !== y.equipo || e.oculto) continue; const v = G.camara.position, dx = e.x - v.x, dz = e.z - v.z; const p = proyectar(e.x, e.y + 2.2, e.z); if (p) et.push({ x: p.x, y: p.y, n: e.nombre, c: G.aj.daltonico !== 'no' ? '#4aa8ff' : '#6dff6d' }); }
  const bus = P.bus;
  return {
    vida: y.vida, esc: y.esc, mats: inv.mats, matSel: y.matSel, slots, slotSel: y.armaSel, ammo, cons, vivos, elims: P.est.elims, tormTxt, tormModo: te ? te.modo : '', prompt, usando: y.usando ? { p: y.usando.p, t: CONS[y.usando.t].n } : null,
    construyendo: y.construyendo && y.vivo, piezaNombre: pn[y.piezaSel], matNombre: MATS[y.matSel].n, costo: P.modo === 'creativo' ? 'libre' : '10', mira: aim, cruz: yoVivo && y.est === 3 && !aim, fueraTormenta: fuera, fps, espectar: esp,
    busTxt: y.est === 0 && P.fase !== 'cuenta' ? (I.tipo === 'tactil' ? 'Toca Salto para lanzarte' : I.tipo === 'mando' ? 'Pulsa A para lanzarte' : 'Pulsa ' + (G.aj.teclas.saltar === 'Space' ? 'ESPACIO' : G.aj.teclas.saltar.replace('Key', '')) + ' para lanzarte') : (y.est === 1 && yoVivo ? 'Caída libre: pulsa saltar para abrir el planeador' : ''),
    etiquetas: et,
    mapaDatos: { yo: { x: (y.vivo ? y : (P.espectando || y)).x, z: (y.vivo ? y : (P.espectando || y)).z, ry: P.camYaw }, torm: te ? { cx: te.cx, cz: te.cz, r: te.r, prox: te.prox } : null, pois: G.W.mundo.T.pois, bus: (y.est === 0 || t < bus.dur + 5) && P.modo !== 'creativo' ? { x0: bus.x0, z0: bus.z0, x1: bus.x1, z1: bus.z1, x: bus.x, z: bus.z } : null, aliados: G.ents.filter((e) => e !== y && e.vivo && e.equipo === y.equipo), cofres: [...G.botin.cofres.values()].filter((c) => !c.abierto) }
  };
}
const _v = { x: 0, y: 0 };
function proyectar(x, y, z) {
  const c = G.camara, e = c.matrixWorldInverse.elements; const vx = e[0] * x + e[4] * y + e[8] * z + e[12], vy = e[1] * x + e[5] * y + e[9] * z + e[13], vz = e[2] * x + e[6] * y + e[10] * z + e[14];
  if (vz > -0.5) return null; const f = 1 / Math.tan(c.fov * Math.PI / 360);
  return { x: (vx * f / (-vz * c.aspect) * 0.5 + 0.5) * innerWidth, y: (0.5 - vy * f / (-vz) * 0.5) * innerHeight };
}
export { emote as emoteLocal };
