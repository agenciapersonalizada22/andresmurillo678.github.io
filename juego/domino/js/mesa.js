// Mesa: arbitro del anfitrion. Une motor + bots + temporizadores y emite paquetes filtrados por asiento.
// El reloj es inyectable ({ahora, prog, cancelar}) para poder simular partidas completas en Node.
import * as R from './reglas.js';
import { decidir, observar, nuevaMemoria, memoriaDeLog, NIVELES } from './bots.js';

export const FRASES = ['¡Buena jugada!', '¡Pasé!', 'Date prisa…', '¡Capicúa!', 'Gracias, compañero', 'Revancha', '¡Qué trancazo!', 'Jaja'];
export const EMOJIS = ['😀', '😂', '😎', '😱', '😡', '👏', '🔥', '🤔'];
export const N_CHAT = FRASES.length + EMOJIS.length;
export const ESPERA_SIGUIENTE = 14000;

export class Mesa {
  constructor(o) {
    this.reloj = o.reloj;
    this.salida = o.salida || (() => {});
    this.escala = o.escala == null ? 1 : o.escala;
    this.as = o.asientos.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel | 0, token: a.token || '', ausente: !!a.ausente, fallos: 0, ultChat: -1e9 }));
    this.est = o.est || R.nuevaPartida(o.cfg, this.as.length, o.semilla == null ? 1 : o.semilla);
    this.seq = 0; this.pausada = !!o.pausada; this.turnoHasta = 0; this.turnoTotal = 0; this.sigHasta = 0;
    this.t = { turno: 0, bot: 0, sig: 0 };
    this.mem = this.as.map(() => (o.est ? memoriaDeLog(this.est) : nuevaMemoria()));
    this.rs = ((o.semilla == null ? 7 : o.semilla) ^ 0x9e3779b9) | 0;
    this.id = o.id || '';
    this.alCambiar = o.alCambiar || null;
    this.alFin = o.alFin || null;
  }

  azarBot() { let t = (this.rs = (this.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  rango(r) { return (r[0] + this.azarBot() * (r[1] - r[0])) * this.escala; }
  esBot(i) { const a = this.as[i]; return a.tipo === 'bot' || a.ausente || a.fallos >= 2; }
  nivelDe(i) { return this.as[i].tipo === 'bot' ? this.as[i].nivel : 1; }
  ahora() { return this.reloj.ahora(); }

  /* ----- paquetes ----- */
  vista(i) { return R.vista(this.est, i, this.ahora()); }
  paquete(i, evs, extra) {
    const p = {
      seq: this.seq, mesa: this.id, v: this.vista(i), ev: evs.map((e) => (e.t === 'robo' && e.j !== i ? { ...e, id: undefined } : e)),
      lim: this.turnoHasta ? { ms: Math.max(0, this.turnoHasta - this.ahora()), total: this.turnoTotal } : null,
      sig: this.sigHasta && this.est.fin ? Math.max(0, this.sigHasta - this.ahora()) : null,
      nombres: this.as.map((a) => a.nombre), colores: this.as.map((a) => a.color), tipos: this.as.map((a) => (a.tipo === 'bot' ? 'bot' + a.nivel : a.ausente ? 'ausente' : 'humano'))
    };
    if (extra) Object.assign(p, extra);
    return p;
  }
  emitir(evs, extra) {
    this.seq++;
    for (let i = 0; i < this.as.length; i++) if (this.as[i].tipo === 'humano') this.salida(i, this.paquete(i, evs, extra));
    if (this.alCambiar) this.alCambiar(this);
  }
  reenviar(i) { if (this.as[i] && this.as[i].tipo === 'humano') this.salida(i, this.paquete(i, [], { resync: true })); }

  /* ----- ciclo ----- */
  iniciar() { this.tras(); }
  tras() {
    const evs = this.est.ev.splice(0);
    for (const e of evs) {
      for (let i = 0; i < this.as.length; i++) observar(this.mem[i], e);
      if (e.t === 'fin') { this.alFin && this.alFin(this, e); this.reaccionBot(e); }
      if (e.t === 'jugar' && e.n === 0) this.reaccionBot({ t: 'ultima', j: e.j });
    }
    this.programar();
    this.emitir(evs);
  }
  limpiar() {
    this.reloj.cancelar(this.t.turno); this.reloj.cancelar(this.t.bot); this.reloj.cancelar(this.t.sig);
    this.t.turno = this.t.bot = this.t.sig = 0; this.turnoHasta = 0; this.sigHasta = 0;
  }
  programar() {
    this.limpiar();
    if (this.pausada) return;
    const est = this.est;
    if (est.fin) {
      if (!est.fin.partida) { this.sigHasta = this.ahora() + ESPERA_SIGUIENTE * this.escala; this.t.sig = this.reloj.prog(() => this.comando(-1, { t: 'siguiente' }), ESPERA_SIGUIENTE * this.escala); }
      return;
    }
    const i = est.turno;
    if (this.esBot(i)) {
      const nv = this.nivelDe(i);
      this.t.bot = this.reloj.prog(() => this.movBot(i), this.rango(NIVELES[nv].retardo));
    } else if (est.cfg.tiempo) {
      this.turnoTotal = est.cfg.tiempo; this.turnoHasta = this.ahora() + est.cfg.tiempo;
      this.t.turno = this.reloj.prog(() => this.agotado(i), est.cfg.tiempo);
    }
  }
  reaccionBot(e) {
    const quien = e.t === 'fin' ? e.ganador : e.j;
    if (quien == null || quien < 0 || this.as[quien].tipo !== 'bot' || this.azarBot() > 0.4) return;
    const k = e.t === 'fin' ? (e.capicua ? 3 : e.tipo === 'tranque' ? 6 : 0) : 0;
    this.reloj.prog(() => { if (!this.pausada) this.emitir([{ t: 'chat', j: quien, k }]); }, 700 * this.escala);
  }
  agotado(i) {
    const est = this.est;
    if (est.fin || est.turno !== i) return;
    this.as[i].fallos++;
    if (this.as[i].fallos === 2) this.emitir([{ t: 'piloto', j: i }]);
    this.jugarPor(i, 1);
  }
  // Ejecuta una jugada (o robo/pase) por el asiento i con la IA del nivel dado; repite si debe seguir robando.
  jugarPor(i, nv) {
    const est = this.est;
    for (let g = 0; g < 60 && !est.fin && est.turno === i; g++) {
      const cmd = decidir(this.vista(i), this.mem[i], nv, () => this.azarBot());
      let r = R.aplicar(est, i, cmd);
      if (!r.ok) { r = R.aplicar(est, i, { t: 'pasar' }); if (!r.ok) r = R.aplicar(est, i, { t: 'robar' }); }
      if (!r.ok) break;
      this.tras();
      if (cmd.t !== 'robar') break;
    }
  }
  movBot(i) {
    const est = this.est;
    if (this.pausada || est.fin || est.turno !== i) return;
    const nv = this.nivelDe(i);
    const cmd = decidir(this.vista(i), this.mem[i], nv, () => this.azarBot());
    let r = R.aplicar(est, i, cmd);
    if (!r.ok) { r = R.aplicar(est, i, { t: 'robar' }); if (!r.ok) r = R.aplicar(est, i, { t: 'pasar' }); }
    this.tras();
  }

  /* ----- ordenes de asientos ----- */
  comando(i, cmd) {
    if (!cmd || typeof cmd !== 'object') return { ok: false, err: 'orden' };
    const est = this.est;
    if (cmd.t === 'siguiente') {
      if (!est.fin || est.fin.partida) return { ok: false, err: 'no aplica' };
      R.siguienteMano(est); this.as.forEach((a) => { a.fallos = 0; }); this.mem = this.as.map(() => nuevaMemoria());
      for (const e of est.ev) this.mem.forEach((m) => observar(m, e));
      this.tras(); return { ok: true };
    }
    if (!Number.isInteger(i) || i < 0 || i >= this.as.length) return { ok: false, err: 'asiento' };
    if (cmd.t === 'chat') {
      const a = this.as[i], ahora = this.ahora();
      if (!Number.isInteger(cmd.k) || cmd.k < 0 || cmd.k >= N_CHAT || ahora - a.ultChat < 700) return { ok: false, err: 'chat' };
      a.ultChat = ahora; this.emitir([{ t: 'chat', j: i, k: cmd.k }]); return { ok: true };
    }
    if (this.pausada) return { ok: false, err: 'pausa' };
    const r = R.aplicar(est, i, cmd);
    if (r.ok) { this.as[i].fallos = 0; this.tras(); }
    return r;
  }

  /* ----- asientos humanos ----- */
  ponerAusente(i, b) {
    const a = this.as[i];
    if (!a || a.tipo !== 'humano' || a.ausente === b) return;
    a.ausente = b; if (!b) a.fallos = 0;
    this.programar();
    this.emitir([{ t: 'presencia', j: i, ausente: b }]);
  }
  pausar(b) { this.pausada = b; if (b) this.limpiar(); else this.programar(); }
  destruir() { this.limpiar(); this.pausada = true; }

  /* ----- guardado ----- */
  guardar() { return { v: 1, id: this.id, est: this.est, as: this.as.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel, token: a.token })), rs: this.rs, seq: this.seq }; }
  static restaurar(d, deps) {
    if (!d || d.v !== 1 || !d.est || !Array.isArray(d.as) || d.est.n !== d.as.length || !Array.isArray(d.est.manos)) return null;
    const m = new Mesa({ ...deps, asientos: d.as, est: d.est, id: d.id, semilla: 1, pausada: true });
    m.rs = d.rs | 0; m.seq = d.seq | 0;
    m.as.forEach((a) => { if (a.tipo === 'humano') a.ausente = true; });
    m.est.ev = [];
    return m;
  }
}

/* Reloj virtual para pruebas: avanzar(ms) ejecuta lo programado en orden. */
export function relojVirtual() {
  let t = 0, id = 0; const tareas = new Map();
  return {
    ahora: () => t,
    prog(fn, ms) { const k = ++id; tareas.set(k, { en: t + Math.max(0, ms), fn, k }); return k; },
    cancelar(k) { tareas.delete(k); },
    pendientes: () => tareas.size,
    avanzar(ms) {
      const fin = t + ms;
      for (let guarda = 0; ; guarda++) {
        if (guarda > 100000) throw new Error('bucle de temporizadores sin avance');
        let s = null;
        for (const x of tareas.values()) if (x.en <= fin && (!s || x.en < s.en || (x.en === s.en && x.k < s.k))) s = x;
        if (!s) break;
        tareas.delete(s.k); t = Math.max(t, s.en); s.fn();
      }
      t = fin;
    }
  };
}
export const relojReal = {
  ahora: () => Date.now(),
  prog: (fn, ms) => setTimeout(fn, ms),
  cancelar: (k) => clearTimeout(k)
};
