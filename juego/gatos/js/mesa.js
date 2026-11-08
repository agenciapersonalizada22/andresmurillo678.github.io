// Mesa: arbitro del anfitrion. Une motor + bots + temporizadores y emite paquetes filtrados por asiento.
// El reloj es inyectable ({ahora, prog, cancelar}) para poder simular partidas completas en Node.
import * as R from './reglas.js';
import { decidir, decidirNope, observar, nuevaMemoria, NIVELES } from './bots.js';

export const FRASES = ['¡Miau!', 'Eso dolió', 'Nooo…', 'Buena jugada', 'Date prisa…', 'Cuidado con la bomba', 'Gracias', 'Revancha'];
export const EMOJIS = ['😺', '😹', '😼', '🙀', '😾', '👏', '🔥', '💥'];
export const N_CHAT = FRASES.length + EMOJIS.length;

export class Mesa {
  constructor(o) {
    this.reloj = o.reloj;
    this.salida = o.salida || (() => {});
    this.escala = o.escala == null ? 1 : o.escala;
    this.as = o.asientos.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel | 0, token: a.token || '', ausente: !!a.ausente, fallos: 0, ultChat: -1e9 }));
    this.est = o.est || R.nuevaPartida(o.cfg, this.as.length, o.semilla == null ? 1 : o.semilla);
    this.seq = 0; this.pausada = !!o.pausada; this.turnoHasta = 0; this.turnoTotal = 0;
    this.tm = [];
    this.mem = this.as.map(() => nuevaMemoria());
    this.rs = ((o.semilla == null ? 7 : o.semilla) ^ 0x9e3779b9) | 0;
    this.id = o.id || '';
    this.alCambiar = o.alCambiar || null;
    this.alFin = o.alFin || null;
    this.actualizarHum();
  }

  azarBot() { let t = (this.rs = (this.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  humanoVivo() { return this.as.some((a, i) => a.tipo === 'humano' && !a.ausente && this.est.vivo[i]); }
  rango(r) { return (r[0] + this.azarBot() * (r[1] - r[0])) * this.escala * (this.humanoVivo() ? 1 : 0.3); }
  esBot(i) { const a = this.as[i]; return a.tipo === 'bot' || a.ausente || a.fallos >= 2; }
  nivelDe(i) { return this.as[i].tipo === 'bot' ? this.as[i].nivel : 1; }
  ahora() { return this.reloj.ahora(); }
  actualizarHum() { this.est.hum = this.as.map((a) => a.tipo === 'humano' && !a.ausente && a.fallos < 2); }

  /* ----- paquetes ----- */
  vista(i) { return R.vista(this.est, i, this.ahora()); }
  filtrar(evs, i) {
    return evs.map((e) => {
      if (!e.p) return e;
      const { p, pd, ...r } = e;
      return p.includes(i) ? { ...r, ...pd } : r;
    });
  }
  paquete(i, evs, extra) {
    const p = {
      seq: this.seq, v: this.vista(i), ev: this.filtrar(evs, i),
      lim: this.turnoHasta ? { ms: Math.max(0, this.turnoHasta - this.ahora()), total: this.turnoTotal } : null,
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
  iniciar() { this.tras(true); }
  tras(inicial) {
    const evs = this.est.ev.splice(0);
    for (const e of evs) for (let i = 0; i < this.as.length; i++) if (this.as[i].tipo === 'bot' || this.esBot(i)) observar(this.mem[i], e);
    for (const e of evs) if (e.t === 'fin') { this.alFin && this.alFin(this, e); this.reaccionBot(e); } else if (e.t === 'explota' || e.t === 'desactiva') this.reaccionBot(e);
    this.actualizarHum();
    this.programar();
    this.emitir(evs);
  }
  limpiar() { this.tm.forEach((k) => this.reloj.cancelar(k)); this.tm = []; this.turnoHasta = 0; }
  prog(fn, ms) { this.tm.push(this.reloj.prog(fn, Math.max(0, ms))); }
  programar() {
    this.limpiar();
    if (this.pausada) return;
    const est = this.est;
    if (est.fase === 'fin') { if (!est.fin.partida) this.prog(() => this.comando(-1, { t: 'siguiente' }), 10000 * this.escala); return; }
    if (est.fase === 'nope') {
      const ms = est.pend.cierra - this.ahora();
      this.prog(() => { if (R.cerrarNope(est, this.ahora())) this.tras(); }, ms + 15);
      for (let k = 0; k < est.n; k++) {
        if (!est.vivo[k] || !this.esBot(k)) continue;
        const nv = this.nivelDe(k);
        if (decidirNope(this.vista(k), this.mem[k], nv, () => this.azarBot())) {
          const d = Math.min(this.rango(NIVELES[nv].nope), Math.max(80, ms * 0.7));
          this.prog(() => this.nopeBot(k), d);
        }
      }
      return;
    }
    const i = est.fase === 'turno' ? est.turno : est.fase === 'favor' ? est.pend.a : est.pend.j;
    if (this.esBot(i)) this.prog(() => this.movBot(i), this.rango(NIVELES[this.nivelDe(i)].retardo));
    else {
      const lim = est.cfg.tiempo || (est.fase === 'turno' ? 0 : 45000);
      if (lim) { this.turnoTotal = lim; this.turnoHasta = this.ahora() + lim; this.prog(() => this.agotado(i), lim); }
    }
  }
  reaccionBot(e) {
    const quien = e.t === 'fin' ? e.ganador : e.j;
    if (quien == null || !this.as[quien] || this.as[quien].tipo !== 'bot' || this.azarBot() > 0.5) return;
    const k = e.t === 'explota' ? 1 : e.t === 'desactiva' ? 5 : e.t === 'fin' ? 6 : 0;
    this.reloj.prog(() => this.emitir([{ t: 'chat', j: quien, k: k === 1 ? 2 : k === 5 ? FRASES.length + 5 : FRASES.length + 1 }]), 600 * this.escala);
  }
  nopeBot(k) {
    const est = this.est;
    if (this.pausada || est.fase !== 'nope' || !est.vivo[k]) return;
    const r = R.aplicar(est, k, { t: 'nope' }, this.ahora());
    if (r.ok) this.tras();
  }
  agotado(i) {
    const est = this.est;
    if (est.fase === 'fin' || est.fase === 'nope') return;
    this.as[i].fallos++;
    if (this.as[i].fallos === 2) this.emitir([{ t: 'piloto', j: i }]);
    const c = R.autoJugada(est, i);
    if (c) this.aplicarYTras(i, c);
  }
  aplicarYTras(i, cmd) {
    const r = R.aplicar(this.est, i, cmd, this.ahora());
    if (r.ok) this.tras();
    return r;
  }
  movBot(i) {
    const est = this.est;
    if (this.pausada || est.fase === 'fin' || est.fase === 'nope') return;
    const activo = est.fase === 'turno' ? est.turno : est.fase === 'favor' ? est.pend.a : est.pend.j;
    if (activo !== i) return;
    const nv = this.nivelDe(i);
    let cmd = decidir(this.vista(i), this.mem[i], nv, () => this.azarBot());
    let r = cmd ? R.aplicar(est, i, cmd, this.ahora()) : { ok: false };
    if (!r.ok) {
      cmd = R.autoJugada(est, i);
      r = cmd ? R.aplicar(est, i, cmd, this.ahora()) : { ok: false };
    }
    if (r.ok) this.tras();
  }

  /* ----- ordenes de asientos ----- */
  comando(i, cmd) {
    if (!cmd || typeof cmd !== 'object') return { ok: false, err: 'orden' };
    const est = this.est;
    if (cmd.t === 'siguiente') {
      if (est.fase !== 'fin' || est.fin.partida) return { ok: false, err: 'no aplica' };
      R.siguienteRonda(est); this.as.forEach((a) => { a.fallos = 0; }); this.mem = this.as.map(() => nuevaMemoria());
      this.tras(); return { ok: true };
    }
    if (!Number.isInteger(i) || i < 0 || i >= this.as.length) return { ok: false, err: 'asiento' };
    if (cmd.t === 'chat') {
      const a = this.as[i], ahora = this.ahora();
      if (!Number.isInteger(cmd.k) || cmd.k < 0 || cmd.k >= N_CHAT || ahora - a.ultChat < 700) return { ok: false, err: 'chat' };
      a.ultChat = ahora; this.emitir([{ t: 'chat', j: i, k: cmd.k }]); return { ok: true };
    }
    if (this.pausada) return { ok: false, err: 'pausa' };
    const r = R.aplicar(est, i, cmd, this.ahora());
    if (r.ok) { this.as[i].fallos = 0; this.tras(); }
    return r;
  }

  /* ----- asientos humanos ----- */
  ponerAusente(i, b) {
    const a = this.as[i];
    if (!a || a.tipo !== 'humano' || a.ausente === b) return;
    a.ausente = b; if (!b) a.fallos = 0;
    this.actualizarHum(); this.programar();
    this.emitir([{ t: 'presencia', j: i, ausente: b }]);
  }
  pausar(b) {
    if (b === this.pausada) return;
    this.pausada = b;
    if (b) { this.tPausa = this.ahora(); this.limpiar(); return; }
    if (this.est.fase === 'nope' && this.tPausa != null) this.est.pend.cierra += this.ahora() - this.tPausa;
    this.programar();
  }
  destruir() { this.limpiar(); this.pausada = true; }

  /* ----- guardado ----- */
  guardar() { return { v: 1, id: this.id, est: this.est, as: this.as.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel, token: a.token })), rs: this.rs, seq: this.seq }; }
  static restaurar(d, deps) {
    if (!d || d.v !== 1 || !d.est || !Array.isArray(d.as) || d.est.n !== d.as.length || !Array.isArray(d.est.mazo)) return null;
    const m = new Mesa({ ...deps, asientos: d.as, est: d.est, id: d.id, semilla: 1, pausada: true });
    m.rs = d.rs | 0; m.seq = d.seq | 0;
    m.as.forEach((a) => { if (a.tipo === 'humano') a.ausente = true; });
    m.est.ev = [];
    if (m.est.fase === 'nope' && m.est.pend) m.est.pend.cierra = deps.reloj.ahora() + m.est.cfg.nopeMs;
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
        if (guarda > 200000) throw new Error('bucle de temporizadores sin avance');
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
