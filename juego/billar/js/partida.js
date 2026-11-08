// Controlador de partida (sin DOM): estado fisico + reglas, turnos, bots, estadisticas y guardado. La interfaz y la red se conectan por ganchos.
import { DT, bola, paso, enReposo, instantanea, aplicarInstantanea, posicionLibre } from './fisica.js';
import { armar, nuevaPartida, idBlanca, objetivos, MODOS, esCarom, analizar } from './reglas.js';
import { iniciarTiro, terminarTiro } from './nucleo.js';
import { elegirTiro } from './bots.js';

const ng = () => ({ tiros: 0, embolsadas: 0, faltas: 0, serie: 0, serieMax: 0, bandasMax: 0, tresSeguidas: false, bolasSaque: false, combo: false, racha: 0 });
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

export const Partida = {
  S: null, E: null, cfg: null, asientos: [], fase: 'inactiva', stats: [], ap: null, velocidad: 1, pausada: false,
  ultimo: null, tiroActual: null, _acc: 0, _cursor: 0, _espera: 0, _tokenBot: 0, _enPartida: false,
  gancho: { evento() {}, resultado() {}, fase() {}, fin() {}, golpear(t, cb) { cb(); }, apunta() {}, tiro() {}, difundirRes() {}, guardar() {} },

  get activa() { return Partida.fase !== 'inactiva'; },
  esAutoridad() { return !Partida.cfg.online || Partida.cfg.anfitrion; },
  esLocal(i) { const a = Partida.asientos[i]; return !!a && a.tipo === 'local'; },
  turnoLocal() { return Partida.fase !== 'fin' && Partida.esLocal(Partida.E.turno); },
  asientoTurno() { return Partida.asientos[Partida.E.turno]; },
  idBlanca() { return idBlanca(Partida.E); },

  nueva(cfg, asientos) {
    const semilla = cfg.semilla || ((Math.random() * 1e9) | 0) + 1;
    Partida.cfg = { objetivo: 15, online: false, anfitrion: true, ...cfg, semilla };
    Partida.asientos = asientos;
    Partida.S = armar(cfg.modo, semilla);
    Partida.E = nuevaPartida({ modo: cfg.modo, n: asientos.length, objetivo: Partida.cfg.objetivo });
    Partida.stats = asientos.map(ng);
    Partida.ultimo = null; Partida._enPartida = true;
    Partida._empezarTurno();
  },
  restaurar(g) {
    Partida.cfg = g.cfg; Partida.asientos = g.asientos;
    Partida.S = armar(g.cfg.modo, g.cfg.semilla);
    aplicarInstantanea(Partida.S, g.snap);
    Partida.E = g.E; Partida.stats = g.stats || g.asientos.map(ng); Partida._enPartida = true;
    Partida._empezarTurno();
  },
  serializar() {
    return { v: 1, cfg: Partida.cfg, asientos: Partida.asientos.map((a) => ({ ...a, redId: null })), E: Partida.E, snap: instantanea(Partida.S), stats: Partida.stats, t: Date.now() };
  },
  /* estado completo para enviar a un jugador remoto que se une/reconecta */
  estadoRed() { return { cfg: Partida.cfg, asientos: Partida.asientos, E: Partida.E, snap: instantanea(Partida.S), stats: Partida.stats }; },
  detener() { Partida.fase = 'inactiva'; Partida._tokenBot++; Partida._enPartida = false; Partida.ap = null; },

  _fase(f) { Partida.fase = f; Partida.gancho.fase(f); },

  _empezarTurno() {
    const E = Partida.E, S = Partida.S;
    if (E.fase === 'fin') { Partida._fase('fin'); Partida.gancho.fin(); return; }
    const id = idBlanca(E), c = bola(S, id);
    const lista = objetivos(E).map((i) => bola(S, i)).filter((o) => o && o.activa);
    lista.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    const o = lista[0] || { x: 0, y: 0 };
    Partida.ap = { ang: Math.atan2(o.y - c.y, o.x - c.x), pot: 0.5, a: 0, b: 0, mano: null, colocada: !E.mano, enMano: !!E.mano };
    if (E.mano) {
      const x0 = E.mano === 'cabecera' ? -S.geo.L / 4 : (c.activa ? c.x : -S.geo.L / 4);
      let p = posicionLibre(S, id, x0, c.activa && E.mano === 'libre' ? c.y : 0, E.mano === 'cabecera' ? -S.geo.L / 4 : null);
      if (!p.ok) for (let i = 1; i < 40 && !p.ok; i++) p = posicionLibre(S, id, x0 - (i % 2 ? 1 : -1) * Math.ceil(i / 2) * S.R * 1.2, 0, E.mano === 'cabecera' ? -S.geo.L / 4 : null);
      Partida.ap.mano = { x: p.x, y: p.y };
      Partida.ap.ang = Math.atan2(o.y - p.y, o.x - p.x);
      c.activa = true; c.emb = -1; c.x = p.x; c.y = p.y;
    }
    Partida._fase(Partida.turnoLocal() ? (E.mano ? 'colocando' : 'apuntando') : 'espera');
    Partida.gancho.guardar();
    if (Partida.esAutoridad() && Partida.asientoTurno().tipo === 'bot') Partida._pensar();
  },

  /* ---------- apuntado (usado por entrada local y por mensajes remotos) ---------- */
  _puedeApuntar() { return Partida.turnoLocal() && (Partida.fase === 'apuntando' || Partida.fase === 'colocando'); },
  girar(d) { if (!Partida._puedeApuntar()) return; Partida.ap.ang += d; Partida._emitir(); },
  fijarAngulo(a) { if (!Partida._puedeApuntar()) return; Partida.ap.ang = a; Partida._emitir(); },
  fijarPotencia(p) { if (!Partida._puedeApuntar()) return; Partida.ap.pot = limitar(p, 0.03, 1); Partida._emitir(); },
  fijarEfecto(a, b) {
    if (!Partida._puedeApuntar()) return;
    const m = Math.hypot(a, b), k = m > 0.6 ? 0.6 / m : 1;
    Partida.ap.a = a * k; Partida.ap.b = b * k; Partida._emitir();
  },
  moverBlanca(x, y) {
    if (!Partida.turnoLocal() || Partida.fase !== 'colocando') return;
    const S = Partida.S, E = Partida.E;
    const p = posicionLibre(S, idBlanca(E), x, y, E.mano === 'cabecera' ? -S.geo.L / 4 : null);
    if (!p.ok) return;
    Partida.ap.mano = { x: p.x, y: p.y }; const c = bola(S, idBlanca(E)); c.x = p.x; c.y = p.y;
  },
  confirmarBlanca() {
    if (Partida.fase !== 'colocando' || !Partida.turnoLocal()) return false;
    const m = Partida.ap.mano; if (!m) return false;
    const p = posicionLibre(Partida.S, idBlanca(Partida.E), m.x, m.y, Partida.E.mano === 'cabecera' ? -Partida.S.geo.L / 4 : null);
    if (!p.ok) return false;
    Partida.ap.mano = { x: p.x, y: p.y }; Partida.ap.colocada = true; Partida._fase('apuntando'); Partida._emitir(true);
    return true;
  },
  posBlanca() {
    const ap = Partida.ap, c = bola(Partida.S, idBlanca(Partida.E));
    return ap && ap.mano && Partida.E.mano ? ap.mano : { x: c.x, y: c.y };
  },
  _emitir(ya) {
    const t = performance.now();
    if (!ya && t - (Partida._ult || 0) < 90) return;
    Partida._ult = t; Partida.gancho.apunta(Partida.ap);
  },
  /* aplicado desde la red: el asiento remoto en turno esta apuntando */
  apuntaRemoto(seat, ap) {
    if (seat !== Partida.E.turno || Partida.fase === 'rodando' || Partida.fase === 'golpeando') return;
    Partida.ap = { ...Partida.ap, ...ap };
    if (ap.mano && Partida.E.mano) { const c = bola(Partida.S, idBlanca(Partida.E)); c.activa = true; c.x = ap.mano.x; c.y = ap.mano.y; }
  },

  /* ---------- tiro ---------- */
  tirar(t, origen = 'local') {
    if (!(Partida.fase === 'apuntando' || (Partida.fase === 'espera' && origen !== 'local')) || !Partida.E || Partida.E.fase === 'fin') return false;
    const E = Partida.E;
    if (E.mano && !t.mano) t.mano = Partida.ap.mano;
    if (E.mano && t.mano) { const p = posicionLibre(Partida.S, idBlanca(E), t.mano.x, t.mano.y, E.mano === 'cabecera' ? -Partida.S.geo.L / 4 : null); t.mano = { x: p.x, y: p.y }; }
    Partida.tiroActual = { ...t, seat: E.turno };
    if (origen === 'local') Partida.gancho.tiro(Partida.tiroActual);
    Partida.ap = { ...Partida.ap, ang: t.ang, pot: t.pot, a: t.a || 0, b: t.b || 0, mano: t.mano || null, colocada: true };
    Partida.gancho.guardar();
    Partida._fase('golpeando');
    Partida.gancho.golpear(Partida.tiroActual, () => Partida._soltar());
    return true;
  },
  _soltar() {
    const t = Partida.tiroActual; if (!t || Partida.fase !== 'golpeando') return;
    Partida._idBlanca = iniciarTiro(Partida.S, Partida.E, t);
    Partida._acc = 0; Partida._cursor = 0;
    Partida._fase('rodando');
  },
  /* avanza la simulacion: dt = segundos reales */
  avanzar(dt) {
    if (Partida.fase === 'espera' || Partida.fase === 'apuntando' || Partida.fase === 'colocando') return 0;
    if (Partida.fase === 'asentando') { Partida._espera -= dt; if (Partida._espera <= 0) Partida._despuesDelResultado(); return 0; }
    if (Partida.fase !== 'rodando') return 0;
    const S = Partida.S;
    Partida._acc += Math.min(dt, 0.05) * Partida.velocidad;
    let n = 0, sim = 0;
    while (Partida._acc >= DT && n < 60 * Math.max(1, Partida.velocidad)) {
      paso(S, DT); Partida._acc -= DT; n++; sim += DT;
      if (S.ev.length > Partida._cursor) { for (; Partida._cursor < S.ev.length; Partida._cursor++) Partida.gancho.evento(S.ev[Partida._cursor]); }
      if (enReposo(S)) break;
      if (S.t > 200) break;
    }
    if (enReposo(S) || S.t > 200) Partida._termino();
    return sim;
  },
  _termino() {
    const S = Partida.S;
    if (!Partida.esAutoridad()) { Partida._fase('esperaRes'); return; }
    const r = terminarTiro(S, Partida.E, Partida._idBlanca);
    Partida._aplicarCierre(r);
    Partida.gancho.difundirRes({ E: r.E, info: r.info, an: r.an, snap: instantanea(S), stats: Partida.stats, seat: Partida.tiroActual.seat });
  },
  _aplicarCierre(r) {
    const E0 = Partida.E, p = E0.turno, st = Partida.stats[p];
    st.tiros++;
    const obj = r.an.embolsadas;
    st.embolsadas += obj.length;
    if (r.info.falta) st.faltas++;
    if (E0.fase === 'saque' && obj.length && !r.info.falta) st.bolasSaque = true;
    if (r.info.punto) { st.serie++; st.serieMax = Math.max(st.serieMax, st.serie); st.bandasMax = Math.max(st.bandasMax, r.an.bandasAntes2); } else st.serie = 0;
    if (r.info.continua && !esCarom(E0.modo)) { st.racha += obj.length; if (st.racha >= 3) st.tresSeguidas = true; } else st.racha = 0;
    if (E0.modo === 'bola9' && obj.includes(9) && !r.info.falta && r.an.primero !== 9) st.combo = true;
    Partida.E = r.E; Partida.ultimo = { info: r.info, an: r.an, seat: p, E0 };
    Partida._espera = 0.7;
    Partida._fase('asentando');
    Partida.gancho.resultado(Partida.ultimo);
  },
  /* cliente: resultado oficial del anfitrion */
  aplicarResultado(m) {
    if (!Partida._enPartida) return;
    const S = Partida.S;
    aplicarInstantanea(S, m.snap);
    Partida.stats = m.stats || Partida.stats;
    const E0 = Partida.E;
    Partida.E = m.E; Partida.ultimo = { info: m.info, an: m.an, seat: m.seat, E0 };
    Partida._espera = Partida.fase === 'rodando' ? 0.3 : 0.7;
    Partida._fase('asentando');
    Partida.gancho.resultado(Partida.ultimo);
  },
  _despuesDelResultado() {
    const E = Partida.E, S = Partida.S;
    // a veces el resultado trae el cuadro final distinto del simulado localmente: la instantanea ya esta aplicada en cliente
    if (Partida.esAutoridad() === false) { /* instantanea ya aplicada */ }
    if (E.fase === 'fin') { Partida._fase('fin'); Partida.gancho.fin(); return; }
    void S;
    Partida._empezarTurno();
  },
  /* cliente: llega el tiro de otro jugador */
  tiroRemoto(t) {
    if (!Partida._enPartida || !Partida.E || Partida.E.fase === 'fin') return;
    if (Partida.fase === 'rodando' || Partida.fase === 'golpeando' || Partida.fase === 'asentando') return;
    if (Partida.E.turno !== t.seat) return;
    Partida.fase = 'espera';
    Partida.tirar(t, 'remoto');
  },

  /* ---------- bots ---------- */
  async _pensar() {
    const token = ++Partida._tokenBot, E = Partida.E, S = Partida.S, as = Partida.asientoTurno();
    const t0 = performance.now();
    let tiro;
    try { tiro = await elegirTiro(S, E, as.nivel || 2); } catch (e) { tiro = { ang: Math.random() * 6.28, pot: 0.5, a: 0, b: 0, mano: null }; }
    if (token !== Partida._tokenBot || Partida.E !== E) return;
    // animacion de apuntado del bot (visible para todos) antes de tirar
    const espera = Math.max(0, 900 - (performance.now() - t0));
    await new Promise((r) => setTimeout(r, espera * 0.3));
    if (token !== Partida._tokenBot) return;
    const ap = Partida.ap, a0 = ap.ang;
    let da = ((tiro.ang - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (tiro.mano) { ap.mano = tiro.mano; }
    const pasos = 14;
    for (let i = 1; i <= pasos; i++) {
      await new Promise((r) => setTimeout(r, espera * 0.7 / pasos + 10));
      if (token !== Partida._tokenBot) return;
      while (Partida.pausada) { await new Promise((r) => setTimeout(r, 200)); if (token !== Partida._tokenBot) return; }
      const k = i / pasos, e = k * k * (3 - 2 * k);
      ap.ang = a0 + da * e; ap.pot = 0.5 + (tiro.pot - 0.5) * e; ap.a = (tiro.a || 0) * e; ap.b = (tiro.b || 0) * e;
      Partida._emitir();
    }
    Partida.gancho.apunta(ap);
    Partida.tiroActual = null;
    Partida.fase = 'apuntando';
    Partida.tirar({ ang: tiro.ang, pot: tiro.pot, a: tiro.a || 0, b: tiro.b || 0, mano: tiro.mano }, 'local');
  }
};
export { MODOS, analizar };
