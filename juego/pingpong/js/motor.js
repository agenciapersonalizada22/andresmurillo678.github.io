// Motor de partido sin DOM: fisica + reglas + bots + paletas. El render y la entrada solo leen su estado y le envian golpes.
import { C, nuevaBola, paso, resolverGolpe, resolverSaque, predecirPlano, giroEntrante } from './fisica.js';
import { Partido, Rally, ladoDeEquipo, ladoDerecha } from './reglas.js';
import { Bot, gauss, lerp } from './bots.js';

export const ZPLANO = C.L / 2 + 0.35;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const STATS1 = { control: 1, efecto: 1, potencia: 1 };

/* Plan de un golpe segun potencia (0..1): profundidad objetivo y rapidez de salida. */
export const profundidad = (p) => lerp(0.38, 1.22, p);
export const rapidezDe = (p) => 5.2 + 11.3 * p;

export class Motor {
  /* opt: {modo:'libre'|'torneo'|'entreno'|'reto'|'online', cfg:{puntosJuego,mejorDe,dobles,inicio}, rival:{dif,estilo}, rng,
     humanos:[ids], stats:{control,efecto,potencia} (del humano local), ayuda:1, velocidad:1, entreno:{...}, vidas:3, partido (guardado), onEvento } */
  constructor(opt = {}) {
    this.modo = opt.modo || 'libre'; this.rng = opt.rng || Math.random; this.on = opt.onEvento || (() => {});
    this.humanos = opt.humanos || [0]; this.ayuda = opt.ayuda || 1; this.vel = opt.velocidad || 1;
    this.statsLocal = opt.stats || STATS1; this.rivalCfg = opt.rival || { dif: 'normal', estilo: 'equilibrado' };
    this.bola = nuevaBola(0, C.H + 0.3, 0); this.bola.vivo = false;
    this.fase = 'espera'; this.t = 0; this.acum = 0; this.temporizador = 0; this.golpesPunto = 0; this.vivo = false;
    this.est = { golpesHum: 0, aces: 0, rallyMax: 0, puntos: [0, 0], remontadaMax: 0, saquesDir: 0 };
    this.entreno = Object.assign({ cada: 2.6, velocidad: 0.5, efecto: 'ninguno', lugar: 'azar' }, opt.entreno || {});
    this.ent = { lanzadas: 0, aciertos: 0, racha: 0, mejor: 0 };
    this.reto = { vidas: opt.vidas || 3, rallyMax: 0, rallies: 0, golpesTot: 0 };
    this.configurarJugadores(opt);
    if (this.modo === 'libre' || this.modo === 'torneo' || this.modo === 'online') this.partido = opt.partido ? Partido.cargar(opt.partido) : new Partido(opt.cfg);
    else this.partido = null;
    this.rally = null; this.memPlano = null; this.tPlano = 0;
  }
  configurarJugadores(opt) {
    const dobles = !!(opt.cfg && opt.cfg.dobles), n = dobles ? 4 : 2;
    this.jug = [];
    for (let id = 0; id < n; id++) {
      const equipo = id % 2, lado = ladoDeEquipo(equipo);
      const humano = this.humanos.includes(id);
      const j = { id, equipo, lado, tipo: humano ? (id === this.humanos[0] ? 'humano' : 'remoto') : 'bot', px: dobles ? (id < 2 ? 0.3 : -0.3) : 0, home: dobles ? (id < 2 ? 0.3 : -0.3) : 0, swing: 0, pendiente: null, bot: null, stats: humano ? (id === this.humanos[0] ? this.statsLocal : STATS1) : STATS1, espera: 0, ult: 0 };
      if (!humano) {
        const rv = opt.rivales && opt.rivales[id] ? opt.rivales[id] : this.rivalCfg;
        j.bot = new Bot(rv.dif, rv.estilo, this.rng, lado); j.vmax = j.bot.vmax; j.rv = rv;
        if (this.modo === 'reto') { j.bot.sigma = 0.035; j.vmax = 6; j.bot.reaccion = 0.05; }
      } else j.vmax = 4.6 * (this.ayuda >= 1 ? 1 : 0.85);
      this.jug.push(j);
    }
    if (this.modo === 'entreno') { this.jug[1].tipo = 'maquina'; this.jug[1].bot = null; }
  }
  jugadorDe(id) { return this.jug[id]; }
  get servidorId() { return this.partido ? this.partido.servidor() : (this.modo === 'reto' || this.modo === 'entreno' ? 1 : 0); }

  /* ---------- ciclo del punto ---------- */
  comenzar() { this.prepararSaque(); }
  prepararSaque() {
    if (this.partido) this.rally = this.partido.rally;
    else this.rally = new Rally({ servidor: 1, receptor: 0, ladoSaque: -1, orden: [1, 0] });
    const sv = this.jug[this.servidorId], lado = sv.lado;
    const mitad = this.partido && this.partido.cfg.dobles ? ladoDerecha(lado) : 1;
    sv.px = 0.3 * mitad; this.golpesPunto = 0; this.vivo = false;
    Object.assign(this.bola, { x: sv.px, y: C.H + 0.22, z: lado * (C.L / 2 + 0.14), vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0, vivo: false });
    this.fase = 'saque'; this.temporizador = sv.tipo === 'bot' || sv.tipo === 'maquina' ? 0.9 + this.rng() * 0.5 : 0;
    if (sv.tipo === 'maquina') this.temporizador = this.entreno.cada;
    this.jug.forEach((j) => { j.pendiente = null; if (j.bot) j.bot.nuevaPelota(); });
    if (this.partido) this.jug.forEach((j) => { if (j.id !== sv.id) j.px = j.home; });
    this.on('saque', { servidor: sv.id, lado, mitad });
  }
  /* Comando de saque o golpe de un humano (id): cmd = {aimX, power, top, curva}. lag = retraso de red en segundos (remoto). */
  golpeHumano(id, cmd, lag = 0) {
    const j = this.jug[id]; if (!j || j.tipo === 'bot' || j.tipo === 'maquina') return false;
    if (this.fase === 'saque' && this.servidorId === id) { this.servir(j, cmd); return true; }
    if (this.fase === 'juego') { j.pendiente = { cmd, t: this.t, lag }; j.swing = Math.max(j.swing, 0.01); return true; }
    return false;
  }
  servir(j, cmd) {
    const dobles = this.partido && this.partido.cfg.dobles, lado = j.lado;
    let ax = cmd.aimX || 0;
    if (dobles) { const s = ladoDerecha(-lado); ax = s * clamp(Math.abs(ax) < 0.1 ? 0.3 : Math.abs(ax), 0.1, 0.66) * (Math.sign(ax) === s || Math.abs(ax) < 0.1 ? 1 : 0.5); }
    const p = 0.28 + 0.62 * clamp(cmd.power == null ? 0.4 : cmd.power, 0, 1), st = j.stats, rs = this.rng;
    const sg = Math.hypot(cmd.sigma || 0, 0.03 / st.control) * (0.6 + p);
    const tx = clamp(ax + gauss(rs) * sg, -0.7, 0.7), prof = clamp(profundidad(p * 0.9) + gauss(rs) * sg * 0.8, 0.35, 1.25);
    const v0 = (4.2 + 6.5 * p) * st.potencia, pos = { x: this.bola.x, y: this.bola.y, z: this.bola.z };
    let top = clamp(cmd.top || 0, -1, 1), cur = clamp(cmd.curva || 0, -1, 1), r = null;
    for (const k of [1, 0.6, 0.3, 0]) { r = resolverSaque(pos, lado, tx, -lado * prof, v0, top * k, cur * k, st.efecto); if (r && r.err < 0.35) break; }
    if (!r || r.err > 0.6) r = resolverSaque(pos, lado, 0, -lado * 0.8, 6, 0, 0, 1) || r;
    if (!r) { Object.assign(this.bola, { vx: 0, vy: 1.5, vz: -lado * 5 }); } else Object.assign(this.bola, r.bola);
    this.bola.vivo = true; this.vivo = true; j.swing = 1; j.ult = this.t; this.golpesPunto = 1; this.fase = 'juego';
    this.on('golpe', { id: j.id, lado, saque: true, q: 1, power: cmd.power, vel: Math.hypot(this.bola.vx, this.bola.vy, this.bola.vz), top: cmd.top || 0, curva: cmd.curva || 0 });
    this.regla('golpe', { lado, id: j.id });
    this.jug.forEach((o) => { if (o.lado !== lado) o.espera = o.bot ? o.bot.reaccion : 0.1; });
  }
  maquinaLanza() {
    const e = this.entreno, rs = this.rng, ef = e.efecto, bola = this.bola;
    const sv = this.jug[1]; sv.px = clamp((rs() - 0.5) * 0.4, -0.2, 0.2);
    Object.assign(bola, { x: sv.px, y: C.H + 0.22, z: -(C.L / 2 + 0.14), vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
    const tx = e.lugar === 'izq' ? -0.45 : e.lugar === 'der' ? 0.45 : e.lugar === 'centro' ? 0 : (rs() - 0.5) * 1.1;
    const top = ef === 'top' ? 0.8 : ef === 'corte' ? -0.8 : ef === 'mixto' ? (rs() < 0.5 ? 0.8 : -0.8) : 0;
    const curva = ef === 'lateral' ? (rs() < 0.5 ? -0.7 : 0.7) : ef === 'mixto' ? (rs() - 0.5) * 1.2 : 0;
    const p = clamp(e.velocidad, 0.1, 1), prof = clamp(0.5 + p * 0.55 + (rs() - 0.5) * 0.3, 0.3, 1.2);
    let r = resolverSaque({ x: bola.x, y: bola.y, z: bola.z }, -1, -tx, 1 * prof, 4.4 + 6 * p, top, curva, 1);
    if (!r) r = resolverSaque({ x: bola.x, y: bola.y, z: bola.z }, -1, 0, 0.8, 6, 0, 0, 1);
    if (r) Object.assign(bola, r.bola);
    bola.vivo = true; this.vivo = true; this.golpesPunto = 1; this.fase = 'juego'; sv.swing = 1; this.ent.lanzadas++;
    this.regla('golpe', { lado: -1, id: 1 });
    this.on('maquina', { lanzadas: this.ent.lanzadas });
  }
  regla(tipo, d) {
    if (!this.vivo && tipo !== 'golpe') return;
    const r = this.partido ? this.partido.evento(tipo, d) : this.rally.evento(tipo, d);
    if (r) this.cerrarPunto(r);
  }
  cerrarPunto(r) {
    this.vivo = false; this.fase = 'pausa'; this.temporizador = this.modo === 'entreno' ? 1.0 : 1.5;
    if (r.let) { this.on('let', {}); this.rallyLet = true; return; }
    this.rallyLet = false;
    const fin = this.partido ? r : this.rally.fin;
    const ladoG = this.partido ? ladoDeEquipo(r.equipo) : fin.ladoGanador;
    const golpes = this.partido ? r.golpes : fin.golpes;
    this.est.rallyMax = Math.max(this.est.rallyMax, golpes);
    const info = { ladoGanador: ladoG, golpes, motivo: this.partido ? r.motivo : fin.motivo, ace: this.partido ? r.ace : fin.ace, res: this.partido ? r : null };
    if (this.partido) { this.est.puntos[r.equipo]++; if (r.ace && r.equipo === 0) this.est.aces++; }
    if (this.modo === 'entreno') {
      const ok = ladoG === 1 && golpes >= 2;
      if (ok) { this.ent.aciertos++; this.ent.racha++; this.ent.mejor = Math.max(this.ent.mejor, this.ent.racha); } else this.ent.racha = 0;
      info.acierto = ok;
    } else if (this.modo === 'reto') {
      this.reto.rallyMax = Math.max(this.reto.rallyMax, golpes); this.reto.rallies++; this.reto.golpesTot += golpes;
      if (ladoG === -1) { this.reto.vidas--; info.perdioVida = true; }
      if (this.reto.vidas <= 0) { this.fase = 'pausa'; this.finReto = true; }
    }
    this.on('punto', info);
    if (this.partido && r.finPartido) this.finPartidoPend = true;
  }
  /* ---------- paso de simulacion ---------- */
  avanzar(dt) {
    dt = Math.min(dt, 0.05); this.acum += dt * this.vel;
    let n = 0;
    while (this.acum >= C.dt && n < 14) { this.acum -= C.dt; n++; this.paso(); }
    if (n >= 14) this.acum = 0;
    this.mover(dt);
    this.jug.forEach((j) => { if (j.swing > 0) j.swing = Math.min(1.5, j.swing + dt * 7); if (j.swing >= 1.5) j.swing = 0; });
    this.temporizadores(dt);
  }
  temporizadores(dt) {
    if (this.fase === 'saque') {
      const sv = this.jug[this.servidorId];
      if (sv.tipo === 'bot' || sv.tipo === 'maquina') {
        this.temporizador -= dt;
        if (this.temporizador <= 0) {
          if (sv.tipo === 'maquina') this.maquinaLanza();
          else this.servir(sv, sv.bot.saque({ mitad: this.partido && this.partido.cfg.dobles ? ladoDerecha(-sv.lado) : 0 }));
        }
      }
    } else if (this.fase === 'pausa') {
      this.temporizador -= dt;
      if (this.temporizador <= 0) {
        if (this.finReto) { this.fase = 'fin'; this.on('fin', { modo: 'reto', reto: this.reto }); }
        else if (this.finPartidoPend) { this.fase = 'fin'; this.on('fin', { modo: this.modo, partido: this.partido.estado(), ganador: this.partido.fin.ganador }); }
        else this.prepararSaque();
      }
    }
  }
  paso() {
    const b = this.bola; this.t += C.dt;
    if (b.vivo || this.fase === 'pausa') {
      paso(b, C.dt, (tipo, d) => this.evento(tipo, d), null);
      if (Math.abs(b.z) > 6 || Math.abs(b.x) > 5 || b.y > 6) { b.vivo = false; this.regla('suelo', {}); }
    }
    if (this.fase === 'juego' && this.vivo) this.golpes();
    if (this.fase === 'pausa' && b.y <= C.R + 1e-3 && Math.hypot(b.vx, b.vz) < 0.2) b.vx = b.vz = 0;
  }
  evento(tipo, d) {
    if (tipo === 'rebote') { this.on('rebote', d); if (this.vivo) { this.regla('rebote', d); if (this.fase === 'juego' && this.vivo) this.nuevaRecepcion(d.lado); } }
    else if (tipo === 'suelo') { if (this.vivo) { this.on('suelo', d); this.regla('suelo', d); } else if (this.fase === 'pausa') this.on('suelo2', d); }
    else if (tipo === 'red' || tipo === 'cinta') { this.on(tipo, d); this.regla(tipo, d); }
  }
  nuevaRecepcion() { /* hook para ajustes del bot tras el bote */ }

  /* ---------- golpes ---------- */
  debido() { // jugador que debe golpear ahora
    const r = this.rally; if (!r || r.fase !== 'bote') return null;
    if (this.modo === 'entreno') return this.jug[0];
    return this.jug[r.siguiente()];
  }
  golpes() {
    const j = this.debido(), b = this.bola; if (!j) return;
    const lado = j.lado; if (b.vz * lado <= 0) return;
    const dz = lado * b.z - C.L / 2, lag = j.pendiente ? j.pendiente.lag : 0;
    const vz = Math.abs(b.vz), fin = C.zonaFin * this.ayuda + vz * lag;
    if (dz < C.zonaIni || dz > fin) { if (dz > fin && j.pendiente) { j.pendiente = null; } return; }
    const h = b.y - C.H, alcance = (j.tipo === 'bot' ? 0.32 : 0.34 * this.ayuda), dx = Math.abs(j.px - b.x);
    if (h < -0.12 || h > 0.95) return;
    let cmd = null;
    if (j.pendiente) {
      if (this.t - j.pendiente.t > 0.5) { j.pendiente = null; return; }
      cmd = j.pendiente.cmd;
    } else if (j.bot) {
      if (dz > j.bot.dzGolpe) return;
      const riv = this.jug.find((o) => o.lado !== lado);
      cmd = j.bot.golpe({ h, rivalX: riv ? riv.px : 0, racha: this.golpesPunto });
      if (this.modo === 'reto') { cmd.power = Math.min(0.92, 0.28 + 0.022 * this.golpesPunto); cmd.sigma = 0.03 + Math.max(0, this.golpesPunto - 30) * 0.004; }
    } else return;
    j.pendiente = null;
    if (dx > alcance) { j.swing = Math.max(j.swing, 0.01); this.on('fallo', { id: j.id, dx }); return; }
    this.ejecutarGolpe(j, cmd, dz - vz * lag, h, dx / alcance);
  }
  ejecutarGolpe(j, cmd, dzVisto, h, xerr) {
    const b = this.bola, lado = j.lado, rs = this.rng, st = j.stats;
    const zerr = Math.abs(dzVisto - C.zonaDulce) / 0.85, herr = Math.abs(h - 0.2) / 0.55;
    const q = clamp(1 - 0.5 * zerr - 0.25 * herr - 0.35 * xerr, 0.15, 1);
    const p = clamp(cmd.power, 0.05, 1), gi = giroEntrante(b), atenua = 1 - 0.6 * q;
    const sg = Math.hypot(cmd.sigma || 0, (1 - q) * 0.30 * (0.55 + 0.9 * p)) / st.control;
    const tx = clamp((cmd.aimX || 0) + gauss(rs) * sg + gi.side * 0.0007 * atenua, -0.85, 0.85);
    const prof = clamp(profundidad(p) + gauss(rs) * sg * 0.9 + gi.top * 0.0009 * atenua, 0.08, 1.9);
    const v0 = rapidezDe(p) * st.potencia;
    const r = resolverGolpe({ x: b.x, y: b.y, z: b.z }, lado, tx, -lado * prof, v0, clamp(cmd.top || 0, -1, 1), clamp(cmd.curva || 0, -1, 1), st.efecto);
    Object.assign(b, r.bola);
    j.swing = Math.max(j.swing, 0.01); j.ult = this.t; this.golpesPunto++;
    if (j.tipo !== 'bot' && j.tipo !== 'maquina') this.est.golpesHum++;
    this.jug.forEach((o) => { if (o.lado !== lado) { o.espera = o.bot ? o.bot.reaccion : 0.08; if (o.bot) o.bot.nuevaPelota(); } });
    this.on('golpe', { id: j.id, lado, q, vel: Math.hypot(b.vx, b.vy, b.vz), top: cmd.top || 0, curva: cmd.curva || 0, power: p });
    this.regla('golpe', { lado, id: j.id });
  }

  /* ---------- paletas ---------- */
  mover(dt) {
    const b = this.bola, r = this.rally;
    const due = this.fase === 'juego' && r && r.fase !== 'saque0' && r.fase !== 'fin' ? this.jug[r.siguiente()] : null;
    this.tPlano -= dt;
    this.jug.forEach((j) => { if (j.pendiente && this.t - j.pendiente.t > 0.5) j.pendiente = null; });
    this.jug.forEach((j) => {
      if (j.tipo === 'maquina') return;
      let obj = j.home;
      if (this.fase === 'saque') { if (j.id === this.servidorId) return; obj = j.home; }
      else if (due && j.id === due.id && b.vz * j.lado > 0) {
        if (this.tPlano <= 0 || !this.memPlano || this.memPlano.id !== j.id) { const pr = predecirPlano(b, j.lado * ZPLANO); this.memPlano = { id: j.id, x: pr ? pr.x : b.x }; this.tPlano = 0.06; }
        obj = this.memPlano.x;
        if (j.espera > 0) { j.espera -= dt; obj = j.px; }
      } else if (this.modo === 'entreno' || this.modo === 'reto' || !this.partido) obj = 0;
      else if (this.partido && !this.partido.cfg.dobles) obj = 0;
      const d = clamp(obj - j.px, -j.vmax * dt, j.vmax * dt);
      j.px = clamp(j.px + d, -1.4, 1.4);
    });
  }
  resumen() { return { modo: this.modo, est: this.est, ent: this.ent, reto: this.reto, partido: this.partido ? this.partido.estado() : null }; }
  snapshot() { const b = this.bola; return { t: 0, b: [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.wx, b.wy, b.wz], px: this.jug.map((j) => j.px), sw: this.jug.map((j) => j.swing), f: this.fase }; }
}
