// Nucleo del juego: turnos, lanzamientos, puntuacion, modos (libre, liga, desafio, diario, online), guardado y recompensas.
import * as F from './fisica.js';
import * as S from './puntuacion.js';
import { decidir } from './bots.js';
import * as Pr from './progreso.js';
import { BOLAS, LIGAS, DESAFIOS, PINOS, rondasDiarias, fechaHoy } from './catalogo.js';
import { Sonido } from './sonido.js';
import * as En from './entrada.js';
import { D as AJ } from './ajustes.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';
import * as Cu from './cuenta-bolos.js';

export const H = { hud() {}, medidor() {}, mensaje() {}, fin() {}, cerrado() {}, estado() {}, vibrar() {} };
export const J = { activo: false, fase: 'inactivo', modo: '', jug: [], tiros: [], masks: [], turno: 0, yo: 0, enPie: 1023, seq: 0, rapido: false, layout: [], ronda: null, online: false, ganancia: 0, pausado: false };
let esc = null, simAcum = 0, temporizador = 0, bloqueoMsg = null;
export const enlazar = (escena) => { esc = escena; };
const R = () => window.Red;

const rondaLayout = (mask, tipos) => F.layoutCompleto().filter((l) => mask & (1 << l.i)).map((l) => ({ ...l, tipo: (tipos && tipos[l.i]) || 'normal' }));
const maskDe = (pinos) => pinos.reduce((m, p) => m | (1 << p.i), 0);
const contarMask = F.contar;
export const bolaDe = (id) => BOLAS.find((b) => b.id === id) || BOLAS[0];
export const totalDe = (i) => S.calcular(J.tiros[i]).total;
export const esLocal = (i) => {
  const p = J.jug[i];
  if (!p || p.tipo === 'bot') return false;
  return J.online ? i === J.yo : true;
};
export const puedeLanzar = () => J.fase === 'apuntar' && esLocal(J.turno);
const anfitrionOBase = () => !J.online || (R() && R().esAnfitrion);
const luego = (f, ms) => { clearTimeout(temporizador); temporizador = setTimeout(function r() { if (!J.activo) return; if (J.pausado) { temporizador = setTimeout(r, 300); return; } f(); }, ms * (window.__bolosK || 1)); };

/* ---------- guardado ---------- */
function paquete() {
  return { v: 1, modo: J.modo, cfg: J.cfg, jug: J.jug.map((p) => ({ nombre: p.nombre, color: p.color, tipo: p.tipo, hab: p.hab, bola: p.bola, token: p.token || '', n: p.n })), tiros: J.tiros, masks: J.masks, turno: J.turno, enPie: J.enPie, seq: J.seq, ronda: J.ronda, ganancia: J.ganancia, ts: Date.now(), vuelo: J.vuelo || null };
}
export function guardar() {
  if (!J.activo) return;
  if (J.online) { if (R() && R().esAnfitrion) escribir(CLAVES.sala, paquete()); } else escribir(CLAVES.partida, paquete());
}
export const guardado = () => leer(CLAVES.partida, null);
export const salaGuardada = () => leer(CLAVES.sala, null);
export function limpiarGuardado() { borrar(CLAVES.partida); borrar(CLAVES.sala); }

/* ---------- inicio ---------- */
export function nueva(setup) {
  detener(); cola.length = 0;
  const jug = setup.jug.map((p, i) => ({ nombre: p.nombre, color: p.color, tipo: p.tipo, hab: p.hab == null ? 0.5 : p.hab, bola: p.bola || 'clasica', token: p.token || '', rid: p.rid != null ? p.rid : null, ausente: !!p.ausente, n: i }));
  Object.assign(J, { activo: true, fase: 'inactivo', modo: setup.modo, cfg: setup.cfg || {}, jug, tiros: jug.map(() => []), masks: jug.map(() => []), turno: 0, yo: setup.yo | 0, seq: 0, online: !!setup.online, ganancia: 0, rapido: false, pausado: false, ronda: null, layout: [], enPie: 1023 });
  if (J.modo === 'desafio') {
    const d = DESAFIOS.find((x) => x.id === J.cfg.desafio) || DESAFIOS[0];
    J.ronda = { tipo: 'desafio', id: d.id, r: 0, usados: 0, pts: 0, lista: [{ pinos: d.pinos, tiros: d.tiros }] };
  } else if (J.modo === 'diario') {
    const f = fechaHoy();
    J.ronda = { tipo: 'diario', fecha: f, r: 0, usados: 0, pts: 0, lista: rondasDiarias(f) };
  }
  if (J.ronda) iniciarRonda(true);
  const e = setup.estado;
  if (e) { J.tiros = e.tiros; J.masks = e.masks; J.turno = e.turno; J.enPie = e.enPie; J.seq = e.seq; J.layout = rondaLayout(J.enPie); }
  else { Pr.D.stats.partidas++; Pr.guardar(); }
  guardar(); H.estado('juego');
  empezarTurno(!!e);
}
export function reanudar(g) {
  detener();
  Object.assign(J, { activo: true, fase: 'inactivo', modo: g.modo, cfg: g.cfg || {}, jug: g.jug.map((p) => ({ ...p, rid: null })), tiros: g.tiros, masks: g.masks, turno: g.turno, yo: 0, seq: g.seq | 0, online: false, ganancia: g.ganancia | 0, rapido: false, pausado: false, ronda: g.ronda || null, enPie: g.enPie });
  if (J.ronda) { J.ronda.lista = J.ronda.tipo === 'diario' ? rondasDiarias(J.ronda.fecha) : [{ pinos: DESAFIOS.find((d) => d.id === J.ronda.id).pinos, tiros: 3 }]; }
  H.estado('juego');
  empezarTurno(true);
}
export function detener() {
  clearTimeout(temporizador); J.activo = false; J.fase = 'inactivo'; J.sim = null;
  En.habilitar(false); Sonido.rodar(0);
  if (esc) esc.guia(null);
}
export function abandonar() { const online = J.online; detener(); if (online) limpiarGuardadoSala(); else limpiarGuardado(); }
const limpiarGuardadoSala = () => borrar(CLAVES.sala);

/* ---------- rondas (desafio / diario) ---------- */
function iniciarRonda(sinPantalla) {
  const r = J.ronda, def = r.lista[r.r];
  r.usados = 0; r.tipos = {};
  def.pinos.forEach((p) => { r.tipos[p.i] = p.tipo; });
  J.enPie = maskDe(def.pinos); J.layout = rondaLayout(J.enPie, r.tipos);
  if (!sinPantalla && esc) esc.colocarPinos(J.layout, true);
}

/* ---------- turnos ---------- */
function layoutActual() { return J.layout && J.layout.length ? J.layout : rondaLayout(J.enPie, J.ronda && J.ronda.tipos); }
function empezarTurno(reanudando) {
  if (!J.activo) return;
  let fresco;
  if (J.ronda) { fresco = reanudando || J.ronda.usados === 0; if (reanudando) { J.ronda.tipos = {}; J.ronda.lista[J.ronda.r].pinos.forEach((p) => { J.ronda.tipos[p.i] = p.tipo; }); J.layout = rondaLayout(J.enPie, J.ronda.tipos); } }
  else {
    const sg = S.siguiente(J.tiros[J.turno]);
    if (sg.terminado) return terminarPartida();
    fresco = sg.rack || reanudando;
    if (sg.rack) { J.enPie = 1023; J.layout = rondaLayout(1023); } else if (reanudando) J.layout = rondaLayout(J.enPie);
  }
  if (esc) {
    if (J.ronda && J.ronda.usados === 0 && !reanudando) esc.colocarPinos(J.layout, true);
    else if (!J.ronda && S.siguiente(J.tiros[J.turno]).rack) esc.colocarPinos(J.layout, true);
    else if (reanudando) esc.colocarPinos(J.layout, false);
  }
  void fresco;
  const p = J.jug[J.turno];
  esc && esc.ponerBola(p.bola || 'clasica');
  H.hud();
  if (J.online && cola.some((d) => d.s === J.seq && d.j === J.turno)) { J.fase = 'espera'; procesarCola(); return; }
  if (p.tipo === 'bot' || (J.online && !esLocal(J.turno) && p.auto)) {
    J.fase = 'espera'; esc && esc.modoCam('lanzar');
    if (anfitrionOBase()) luego(botLanza, 1100 + Math.random() * 500);
    procesarCola();
  } else if (esLocal(J.turno)) apuntar();
  else {
    J.fase = 'espera'; esc && esc.modoCam('lanzar'); procesarCola();
    if (J.online && R() && R().esAnfitrion && p.ausente) luego(() => { p.auto = true; botLanza(); }, 5000);
  }
}
function apuntar() {
  J.fase = 'apuntar';
  const p = J.jug[J.turno];
  if (esc) { esc.ponerBola(p.tipo === 'humano' && (J.turno === J.yo || !J.online) ? Pr.D.sel.bola : p.bola); esc.modoCam('lanzar'); esc.colocarBola(En.E.x, 0, true); }
  En.habilitar(true, En.E.x);
  H.hud(); actualizarGuia();
}
function botLanza() {
  if (!J.activo || J.fase !== 'espera') return;
  const p = J.jug[J.turno];
  const prm = decidir(layoutActual(), p.hab, p.bola);
  lanzar(prm, p.bola, 'bot');
}
export function actualizarGuia() {
  if (!esc) return;
  if (J.fase === 'apuntar') {
    esc.colocarBola(En.E.x, 0, true);
    if (AJ.guia) esc.guia(F.trayectoria(En.params(9), bolaDe(esc.bolaId)), '#ffffff'); else esc.guia(null);
  } else esc.guia(null);
}
En.E.alCambiar = () => { if (J.fase === 'apuntar') actualizarGuia(); H.medidor(); };
En.E.alLanzar = (p) => { if (puedeLanzar()) lanzar(p, J.jug[J.turno].tipo === 'humano' ? Pr.D.sel.bola : J.jug[J.turno].bola, 'local'); };

const redondear = (p) => ({ x: Math.round(p.x * 1e4) / 1e4, ang: Math.round(p.ang * 1e5) / 1e5, v: Math.round(p.v * 1e3) / 1e3, w: Math.round(p.w * 1e3) / 1e3 });
export function lanzar(prm, bolaId, origen, mascaraFinal) {
  if (!J.activo || (J.fase !== 'apuntar' && J.fase !== 'espera')) return false;
  clearTimeout(temporizador);
  const p = redondear(prm), b = bolaDe(bolaId), bola = { m: b.m, hook: b.hook };
  J.fase = 'rodando'; J.rapido = false; En.habilitar(false); if (esc) esc.guia(null);
  J.forzar = mascaraFinal == null ? null : mascaraFinal;
  J.sim = F.nuevaSim(layoutActual(), p, bola); simAcum = 0; J.bolaId = bolaId; J.parms = p;
  if (J.online) {
    if (origen !== 'red') { const c = F.nuevaSim(layoutActual(), p, bola); F.correr(c); J.vuelo = { s: J.seq, j: J.turno, p: [p.x, p.ang, p.v, p.w], b: bolaId, m: F.mascara(c) }; if (R() && R().conectado) R().difundir('bolos_tiro', J.vuelo); }
    else J.vuelo = { s: J.seq, j: J.turno, p: [p.x, p.ang, p.v, p.w], b: bolaId, m: mascaraFinal };
  }
  if (esc) { esc.ponerBola(bolaId); esc.colocarBola(p.x, 0, true); esc.modoCam('seguir'); }
  Sonido.fx('lanzar', (p.v - 5.5) / 5.5);
  H.hud();
  return true;
}

/* Llamado cada cuadro por el bucle principal. */
export function tick(dt) {
  if (!J.activo || J.pausado || J.fase !== 'rodando' || !J.sim) return;
  const s = J.sim; simAcum += dt * (J.rapido ? 3 : 1);
  let n = 0;
  while (simAcum >= s.dt && !s.fin && n++ < 3000) { F.paso(s); simAcum -= s.dt; }
  for (const e of s.eventos) {
    if (e.tipo === 'golpe') {
      Sonido.fx(e.bola ? 'golpeBola' : 'golpePino', e.fuerza);
      if (esc && !AJ.reducirMov) esc.emitir(e.x, e.z, Math.min(8, 2 + (e.fuerza | 0)), e.fuerza);
      if (e.bola) vibrarSuave(0.6, 0.4, 90);
    } else if (e.tipo === 'caida') Sonido.fx('caida');
    else if (e.tipo === 'canal') { Sonido.fx('canal'); }
    else if (e.tipo === 'explosion') { Sonido.fx('explosion'); if (esc) { esc.destello(1); esc.shake = 1.2; } vibrarSuave(1, 1, 220); if (J.activo && esLocal(J.turno)) Pr.logro('explosivo'); }
  }
  s.eventos.length = 0;
  if (esc) {
    esc.moverBola(s.bola, dt); esc.actualizarPinos(s.pinos);
    if (esc.camModo === 'seguir' && s.bola.z > F.P.Z1 - 2.6) esc.modoCam('pinos');
  }
  Sonido.rodar(s.bola.est === 'rodando' || s.bola.est === 'canal' ? Math.min(1, Math.sqrt(s.bola.vz * s.bola.vz + s.bola.vx * s.bola.vx) / 10) : 0);
  if (s.fin) finLanzamiento();
}
function vibrarSuave(a, b, ms) { H.vibrar(a, b, ms); }

function ajustarFinal(s) {
  if (J.forzar == null) return;
  for (const p of s.pinos) {
    const debe = (J.forzar & (1 << p.i)) !== 0;
    if (debe && p.est === 0) { p.est = 2; p.dx = 0; p.dz = 1; }
    else if (!debe && p.est !== 0) { const n = F.posPino(p.i); p.est = 0; p.x = n.x; p.z = n.z; p.tc = 0; p.vx = p.vz = 0; }
  }
  esc && esc.actualizarPinos(s.pinos);
}
function esSplit(en) {
  if (en & 1) return false;
  const ids = []; for (let i = 1; i < 10; i++) if (en & (1 << i)) ids.push(i);
  if (ids.length < 2) return false;
  const ady = (a, b) => { const p = F.posPino(a), q = F.posPino(b); return Math.hypot(p.x - q.x, p.z - q.z) < 0.32; };
  const vis = new Set([ids[0]]), cola = [ids[0]];
  while (cola.length) { const a = cola.pop(); for (const b of ids) if (!vis.has(b) && ady(a, b)) { vis.add(b); cola.push(b); } }
  return vis.size < ids.length;
}

function finLanzamiento() {
  const s = J.sim; J.sim = null; J.vuelo = null; Sonido.rodar(0);
  ajustarFinal(s);
  const m = F.mascara(s) & J.enPie, n = contarMask(m), antes = contarMask(J.enPie), t = J.turno;
  const canal = s.bola.est === 'canal' && n === 0;
  const yoSoy = J.online ? t === J.yo : t === 0 && J.jug[0].tipo === 'humano';
  J.tiros[t].push(n); J.masks[t].push(m); J.seq++;
  J.enPie &= ~m;
  J.layout = F.supervivientes(s).filter((p) => J.enPie & (1 << p.i));
  const sp = n === antes && antes < 10, st = n === antes && antes === 10;
  const splitAntes = J.enPie && !st && !sp && !J.ronda ? esSplit(J.enPie) : false;
  let msg = '', tipo = '';
  if (J.ronda) { msg = n === antes ? '¡Todos!' : n ? n + (n === 1 ? ' pino' : ' pinos') : 'Nada'; tipo = n === antes ? 'bien' : ''; }
  else if (st) { msg = '¡STRIKE!'; tipo = 'strike'; Sonido.fx('strike'); esc && (esc.destello(0.8), esc.shake = 0.8); }
  else if (sp) { msg = '¡Spare!'; tipo = 'spare'; Sonido.fx('spare'); }
  else if (canal) { msg = 'Canal'; tipo = 'mal'; }
  else if (splitAntes) { msg = 'Split: ' + n; tipo = 'split'; }
  else msg = n === 0 ? 'Fallo' : String(n);
  H.mensaje(msg, tipo);
  if (st || sp) vibrarSuave(1, 0.8, 300);
  if (yoSoy) {
    Pr.regLanzamiento(n, false, canal);
    Pr.monedas(n + (st ? 4 : 0) + (sp ? 2 : 0)); J.ganancia += n + (st ? 4 : 0) + (sp ? 2 : 0);
    if (canal) Pr.logro('canalero');
    if (!J.ronda) {
      if (st) { Pr.logro('primer_strike'); const r = S.rachaStrikes(J.tiros[t]); if (r >= 2) Pr.logro('doble'); if (r >= 3) Pr.logro('pavo'); if (r >= 4) Pr.logro('cuatro_seguidos'); }
      if (sp) { Pr.logro('primer_spare'); if (J.splitPrevio) Pr.logro('split'); }
    }
  }
  J.splitPrevio = splitAntes && !J.ronda;
  H.hud();
  guardar();
  if (esc) esc.modoCam('pinos');
  luego(() => despues(m), st || sp ? 1900 : 1500);
}

function despues(m) {
  if (J.ronda) return despuesRonda(m);
  const prox = S.siguienteTurno(J.tiros, J.turno), sgSig = prox >= 0 ? S.siguiente(J.tiros[prox]) : null;
  if (esc) esc.barrer(sgSig && !sgSig.rack ? m : 0x3ff);
  if (prox < 0) { luego(terminarPartida, 700); return; }
  J.turno = prox;
  luego(() => empezarTurno(false), 750);
}
function despuesRonda(m) {
  const r = J.ronda, def = r.lista[r.r];
  r.usados++;
  const limpio = J.enPie === 0, agotado = r.usados >= def.tiros;
  if (!limpio && !agotado) {
    if (esc) esc.barrer(m);
    luego(() => empezarTurno(false), 700); guardar(); return;
  }
  esc && esc.barrer(0x3ff);
  if (r.tipo === 'diario') {
    const hechos = def.pinos.length - contarMask(J.enPie);
    r.pts += hechos * 10 + (limpio ? (r.usados === 1 ? 30 : 20) : 0);
    J.tiros[0].push(hechos);
    if (r.r + 1 < r.lista.length) { r.r++; r.usados = 0; guardar(); luego(() => { iniciarRonda(false); empezarTurno(false); }, 900); return; }
    return luego(terminarDiario, 700);
  }
  luego(() => terminarDesafio(limpio ? (r.usados === 1 ? 3 : r.usados === 2 ? 2 : 1) : 0), 700);
}

/* ---------- finales ---------- */
function terminarDesafio(estrellas) {
  const nuevas = Pr.regDesafio(J.ronda.id, estrellas);
  const gan = nuevas * 30; if (gan) Pr.monedas(gan);
  const idx = DESAFIOS.findIndex((d) => d.id === J.ronda.id);
  const res = { modo: 'desafio', estrellas, nuevas, monedas: gan + J.ganancia, id: J.ronda.id, hay: idx + 1 < DESAFIOS.length, idx };
  finComun(res);
  Cu.enviarPuntajes({ estrellas: Pr.estrellasTotal() });
}
function terminarDiario() {
  const pts = J.ronda.pts, primera = Pr.regDiario(pts, J.ronda.fecha);
  const bono = primera ? 40 + Math.min(10, Pr.D.diario.racha) * 5 : 0; if (bono) Pr.monedas(bono);
  const res = { modo: 'diario', puntos: pts, primera, racha: Pr.D.diario.racha, monedas: bono + J.ganancia };
  finComun(res);
  Cu.enviarPuntajes({ diario: pts });
}
function terminarPartida() {
  const tot = J.jug.map((_, i) => S.calcular(J.tiros[i]).total), max = Math.max(...tot);
  const ganadores = tot.map((t, i) => (t === max ? i : -1)).filter((i) => i >= 0);
  const yo = J.online ? J.yo : 0, yoTot = tot[yo], multi = J.jug.length > 1;
  const empate = ganadores.length > 1 && ganadores.includes(yo);
  const gano = multi && ganadores.includes(yo) && !empate;
  const res = {
    modo: J.modo, tot, ganadores, yo, empate, gano, cfg: J.cfg, filas: J.jug.map((p, i) => ({ nombre: p.nombre, color: p.color, total: tot[i], strikes: S.contarStrikes(J.tiros[i]), spares: S.contarSpares(J.tiros[i]), tabla: S.calcular(J.tiros[i]) })), monedas: 0
  };
  if (J.jug[yo] && J.jug[yo].tipo !== 'bot') {
    const strikes = S.contarStrikes(J.tiros[yo]), spares = S.contarSpares(J.tiros[yo]);
    Pr.regFinPartida({ puntos: yoTot, strikes, spares, gano });
    let extra = 10 + (gano ? 20 : 0); Pr.monedas(extra); J.ganancia += extra;
    if (yoTot > 100) Pr.logro('cien'); if (yoTot > 150) Pr.logro('ciento_cincuenta'); if (yoTot > 200) Pr.logro('doscientos'); if (yoTot >= 300) Pr.logro('perfecta');
    if (gano) { Pr.logro('primera_victoria'); if (J.online) { Pr.logro('ganar_online'); Pr.D.stats.ganadasOnline++; } }
    if (J.online) Pr.D.stats.online++;
    Cu.enviarPuntajes({ puntos: yoTot, strikes: Pr.D.stats.strikes });
    if (J.modo === 'liga') res.liga = resolverLiga(gano, empate, yoTot);
    res.monedas = J.ganancia + (res.liga ? res.liga.premio : 0);
  }
  finComun(res);
}
function resolverLiga(gano, empate) {
  const L = Pr.D.liga, lg = LIGAS[J.cfg.liga], out = { liga: lg.id, estado: 'sigue', premio: 0 };
  if (empate) { out.estado = 'empate'; return out; }
  if (J.cfg.liga !== L.nivel) { out.estado = 'practica'; return out; }
  const repetida = L.campeon.includes(lg.id);
  if (gano) L.v++; else L.d++;
  if (L.v >= 2) {
    out.estado = 'campeon'; out.premio = repetida ? 0 : lg.premio; Pr.monedas(out.premio); Pr.ligaCampeon(lg.id); Pr.logro(lg.id === 'leyenda' ? 'rey_de_los_bolos' : 'liga_' + lg.id);
    Pr.desbloquear('pista', lg.pista);
    L.nivel = Math.max(L.nivel, Math.min(LIGAS.length - 1, J.cfg.liga + 1)); L.v = 0; L.d = 0;
    if (J.cfg.liga === LIGAS.length - 1) out.final = true;
  } else if (L.d >= 2) { out.estado = 'eliminado'; L.v = 0; L.d = 0; }
  Pr.guardar();
  return out;
}
function finComun(res) {
  J.activo = false; J.fase = 'fin'; En.habilitar(false);
  const online = J.online; if (online) borrar(CLAVES.sala); else borrar(CLAVES.partida);
  Sonido.fx('fin');
  H.fin(res);
}

/* ---------- red ---------- */
export function mensajeRed(tipo, d, de) {
  const Red = R();
  if (tipo === 'bolos_hola' && Red.esAnfitrion && J.activo && J.online) { enlazarAsiento(de, d); return; }
  if (tipo === 'bolos_ini' && !Red.esAnfitrion) { aplicarIni(d); return; }
  if (tipo === 'bolos_pedir' && Red.esAnfitrion && J.activo) { enviarIni(de); return; }
  if (tipo === 'bolos_tiro') {
    if (J.activo && J.online && d.s < J.seq) return;
    if (Red.esAnfitrion) { const p = J.jug[d.j]; if (!J.activo || !p || p.rid !== de) return; }
    cola.push(d); if (cola.length > 8) cola.shift();
    if (J.activo && J.fase === 'espera') procesarCola();
    else if (J.activo && d.s > J.seq + 1 && !Red.esAnfitrion) Red.enviar('bolos_pedir', {});
  }
}
const cola = [];
function procesarCola() {
  cola.splice(0, cola.length, ...cola.filter((d) => d.s >= J.seq));
  const k = cola.findIndex((d) => d.s === J.seq && d.j === J.turno);
  if (k < 0 || J.fase !== 'espera') return;
  const d = cola.splice(k, 1)[0];
  lanzar({ x: d.p[0], ang: d.p[1], v: d.p[2], w: d.p[3] }, d.b, 'red', d.m);
}
function enlazarAsiento(rid, d) {
  let i = J.jug.findIndex((p) => d.token && p.token === d.token);
  if (i < 0) i = J.jug.findIndex((p) => p.rid === rid);
  if (i < 0) i = J.jug.findIndex((p) => p.tipo === 'humano' && p.rid == null && !p.token);
  if (i < 0) i = J.jug.findIndex((p) => p.tipo === 'humano' && p.rid == null && p.ausente);
  if (i < 0) { R().enviar('bolos_ini', { espectador: true }, { a: rid }); return; }
  const p = J.jug[i]; p.rid = rid; p.token = d.token || p.token; p.ausente = false; p.auto = false;
  const rj = R().jugadores[rid]; if (rj) { p.nombre = rj.nombre; p.color = rj.color; }
  enviarIni(rid); guardar(); H.hud();
}
export function enviarIni(rid) {
  const Red = R(); if (!Red || !Red.conectado || !J.activo) return;
  const enviar = (id) => { const i = J.jug.findIndex((p) => p.rid === id); Red.enviar('bolos_ini', { ...paquete(), yo: i, jug: J.jug.map((p) => ({ nombre: p.nombre, color: p.color, tipo: p.tipo, hab: p.hab, bola: p.bola, ausente: !!p.ausente })) }, { a: id }); };
  if (rid != null) enviar(rid); else Object.keys(Red.jugadores).forEach((k) => { if (+k !== Red.miId) enviar(+k); });
}
function aplicarIni(d) {
  if (d.espectador) { H.cerrado('La partida ya empezó y no hay asiento libre para ti.'); return; }
  if (J.activo && J.online && J.fase !== 'inactivo' && d.seq === J.seq && d.turno === J.turno) {
    J.yo = d.yo; d.jug.forEach((q, i) => { if (J.jug[i]) Object.assign(J.jug[i], { ausente: q.ausente, nombre: q.nombre }); }); H.hud(); return;
  }
  const primera = !J.activo || !J.online;
  detener();
  Object.assign(J, { activo: true, fase: 'inactivo', modo: d.modo, cfg: d.cfg || {}, jug: d.jug.map((p, n) => ({ ...p, n, rid: null })), tiros: d.tiros, masks: d.masks, turno: d.turno, yo: d.yo, seq: d.seq, online: true, ganancia: 0, rapido: false, pausado: false, ronda: null, enPie: d.enPie, layout: [] });
  if (primera) { Pr.D.stats.partidas++; Pr.guardar(); H.estado('juego'); }
  J.layout = rondaLayout(J.enPie);
  if (d.vuelo && d.vuelo.s === d.seq) cola.push(d.vuelo);
  empezarTurno(true);
}
export function iniciarOnline(config, jugadores, restaurar) {
  const Red = R();
  if (Red.esAnfitrion) {
    if (J.activo && J.online && config && config.reanudar) { enviarIni(); return; }
    const sala = restaurar;
    let jug = jugadores.map((j) => ({ nombre: j.nombre, color: j.color, tipo: 'humano', rid: j.id, hab: 0.5, bola: 'clasica' }));
    if (sala) jug = sala.jug.map((p, i) => (i === 0 ? { ...p, tipo: 'humano', rid: 0 } : p.tipo === 'humano' ? { ...p, rid: null, ausente: true } : p));
    else if (config && config.modo === 'bots') {
      const nombres = ['Marta', 'Bruno', 'Lucía', 'Tomás'], cols = ['#ff6b4a', '#ffd23d', '#6dff6d', '#c77dff'];
      let k = 0; while (jug.length < 4) { jug.push({ nombre: nombres[k] + ' (bot)', color: cols[k], tipo: 'bot', hab: 0.35 + Math.random() * 0.5, bola: BOLAS[Math.floor(Math.random() * 4)].id }); k++; }
    }
    nueva({ modo: 'online', cfg: { modo: config && config.modo }, jug, yo: 0, online: true, estado: sala || null });
    setTimeout(() => enviarIni(), 350);
  } else {
    H.estado('esperando');
    const tok = leer(CLAVES.asiento, {}).token || Math.random().toString(36).slice(2, 10);
    escribir(CLAVES.asiento, { token: tok });
    Red.enviar('bolos_hola', { token: tok });
  }
}
export function jugadorSalio(id) {
  if (!J.activo || !J.online) return;
  const i = J.jug.findIndex((p) => p.rid === id);
  if (i < 0) return;
  J.jug[i].rid = null; J.jug[i].ausente = true; H.hud();
  if (R().esAnfitrion && J.turno === i && J.fase === 'espera') luego(() => { J.jug[i].auto = true; botLanza(); }, 5000);
}
export const pausar = (b) => { J.pausado = b; };
