// Mesa: arbitro del anfitrion. Une reglas + bots + temporizadores y emite paquetes filtrados por asiento.
// El reloj es inyectable ({ahora, prog, cancelar}) para simular partidas completas en Node.
import * as R from './reglas.js';
import { geo } from './geometria.js';
import { decidir, nuevaMemoria, NIVELES, responderTrato } from './bots.js';

export const FRASES = ['¡Buena jugada!', '¡Qué mala suerte!', 'Date prisa…', '¿Cambiamos?', 'Gracias', 'Revancha', '¡Ojo con el bandido!', 'Jaja'];
export const EMOJIS = ['😀', '😂', '😎', '😱', '😡', '👏', '🔥', '🤔'];
export const N_CHAT = FRASES.length + EMOJIS.length;

export class Mesa {
  constructor(o) {
    this.reloj = o.reloj;
    this.salida = o.salida || (() => {});
    this.escala = o.escala == null ? 1 : o.escala;
    this.as = o.asientos.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel | 0, token: a.token || '', ausente: !!a.ausente, fallos: 0, ultChat: -1e9 }));
    this.est = o.est || R.nuevaPartida(o.cfg, this.as.length, o.semilla == null ? 1 : o.semilla);
    this.seq = 0; this.pausada = !!o.pausada; this.turnoHasta = 0; this.turnoTotal = 0; this.dl = '';
    this.t = { bot: 0, turno: 0 };
    this.mem = this.as.map(() => nuevaMemoria());
    this.rs = ((o.semilla == null ? 7 : o.semilla) ^ 0x9e3779b9) | 0;
    this.id = o.id || '';
    this.alCambiar = o.alCambiar || null; this.alFin = o.alFin || null;
  }
  azarBot() { let t = (this.rs = (this.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  rango(r) { return (r[0] + this.azarBot() * (r[1] - r[0])) * this.escala; }
  esBot(i) { const a = this.as[i]; return a.tipo === 'bot' || a.ausente || a.fallos >= 2; }
  nivelDe(i) { return this.as[i].tipo === 'bot' ? this.as[i].nivel : 1; }
  ahora() { return this.reloj.ahora(); }

  /* ----- paquetes ----- */
  vista(i) { return R.vista(this.est, i); }
  filtrar(evs, i) {
    return evs.map((e) => {
      if (e.t === 'robo' && e.de !== i && e.a !== i) { const c = { ...e }; delete c.res; return c; }
      if (e.t === 'carta' && e.j !== i) { const c = { ...e }; delete c.k; return c; }
      return e;
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
    if (inicial) evs.push({ t: 'inicio' });
    if (evs.some((e) => e.t === 'fin')) { this.alFin && this.alFin(this, evs.find((e) => e.t === 'fin')); this.limpiar(); this.emitir(evs); return; }
    this.programar();
    this.emitir(evs);
  }
  limpiar() { this.reloj.cancelar(this.t.bot); this.reloj.cancelar(this.t.turno); this.t.bot = this.t.turno = 0; this.turnoHasta = 0; }
  pendientes() {
    const est = this.est, p = [];
    if (est.fase === 'fin') return p;
    if (est.fase === 'descartar') { for (const k of Object.keys(est.desc)) if (this.esBot(+k)) p.push({ j: +k, k: 'desc' }); return p; }
    if (est.trato && est.fase === 'accion') for (const j of est.trato.a) if (this.esBot(j) && est.trato.resp[j] == null) p.push({ j, k: 'resp' });
    if (this.esBot(est.turno)) p.push({ j: est.turno, k: 'turno' });
    return p;
  }
  programar() {
    this.limpiar();
    if (this.pausada) return;
    const est = this.est;
    if (est.fase === 'fin') return;
    const p = this.pendientes();
    if (p.length) {
      const x = p[0], nv = this.nivelDe(x.j);
      this.t.bot = this.reloj.prog(() => this.movBot(x.j, x.k), this.rango(x.k === 'resp' ? [500, 1200] : NIVELES[nv].retardo));
    }
    // limite de tiempo para humanos
    const humanoPend = est.fase === 'descartar' ? Object.keys(est.desc).some((k) => !this.esBot(+k)) : !this.esBot(est.turno);
    if (est.cfg.tiempo && humanoPend) {
      const clave = est.numTurno + ':' + est.fase + ':' + est.turno + ':' + (est.fund ? est.fund.paso + est.fund.pend : '');
      const total = est.fase === 'accion' ? est.cfg.tiempo : Math.max(20000, Math.min(est.cfg.tiempo, 45000));
      if (clave !== this.dl) { this.dl = clave; this.dlHasta = this.ahora() + total; this.dlTotal = total; }
      this.turnoHasta = this.dlHasta; this.turnoTotal = this.dlTotal;
      this.t.turno = this.reloj.prog(() => this.agotado(), Math.max(0, this.dlHasta - this.ahora()));
    } else this.dl = '';
  }
  agotado() {
    const est = this.est;
    if (est.fin) return;
    if (est.fase === 'descartar') {
      for (const k of Object.keys(est.desc)) {
        const i = +k; if (this.esBot(i)) continue;
        this.as[i].fallos++;
        const c = decidir(this.vista(i), this.mem[i], 1, () => this.azarBot());
        if (c) this.aplicarYTras(i, c);
      }
      return;
    }
    const i = est.turno;
    this.as[i].fallos++;
    if (this.as[i].fallos === 2) this.emitir([{ t: 'piloto', j: i }]);
    this.dl = '';
    this.movBot(i, 'turno', true);
  }
  aplicarYTras(i, cmd) {
    const r = R.aplicar(this.est, i, cmd);
    if (r.ok) this.tras();
    return r;
  }
  movBot(i, k, forzado) {
    const est = this.est;
    if (this.pausada || est.fin) return;
    const nv = this.nivelDe(i), v = this.vista(i);
    if (k === 'resp') {
      if (!est.trato || est.trato.resp[i] != null) { this.programar(); return; }
      const okk = responderTrato(v, this.mem[i], nv, () => this.azarBot());
      const r = R.aplicar(est, i, { t: 'responder', ok: okk, id: est.trato.id });
      if (!r.ok) est.trato.resp[i] = 'no';
      this.tras(); return;
    }
    if (k === 'turno' && est.turno !== i) { this.programar(); return; }
    let cmd = decidir(v, this.mem[i], nv, () => this.azarBot());
    if (!cmd) { return; }
    if (cmd.t === 'esperar') { this.t.bot = this.reloj.prog(() => this.movBot(i, 'turno'), 1500 * this.escala); return; }
    if (forzado && est.fase === 'accion' && !(est.camGratis > 0)) cmd = { t: 'terminar' };
    let r = R.aplicar(est, i, cmd);
    if (!r.ok) r = this.reparar(i);
    if (!r.ok) { console.error && console.error('bot sin salida', i, est.fase, cmd, r); }
    this.tras();
  }
  // orden de emergencia legal cuando una decision no valia
  reparar(i) {
    const est = this.est, v = this.vista(i), G = geo(est.cfg.radio);
    const azar = () => this.azarBot();
    const prueba = (c) => R.aplicar(est, i, c);
    let r = { ok: false };
    if (est.fase === 'fundacion') {
      if (est.fund.pend === 'pob') { const ls = R.lugaresPoblado(est, i, true); return prueba({ t: 'poblado', v: ls[Math.floor(azar() * ls.length)] }); }
      const ls = R.lugaresCamino(est, i, est.fund.ult); return prueba({ t: 'camino', e: ls[Math.floor(azar() * ls.length)] });
    }
    if (est.fase === 'ladron') {
      for (let h = 0; h < G.hexes.length && !r.ok; h++) if (h !== est.ladron) { const vic = R.victimas(est, h, i, est.mano); r = prueba({ t: 'ladron', h, victima: vic[0] }); }
      return r;
    }
    if (est.fase === 'descartar') { const d = {}; let k = est.desc[i]; for (const x of R.RES) { const q = Math.min(k, est.mano[i][x]); if (q) { d[x] = q; k -= q; } } return prueba({ t: 'descartar', r: d }); }
    if (est.fase === 'accion' && est.camGratis > 0) { const ls = R.lugaresCamino(est, i); if (ls.length) return prueba({ t: 'camino', e: ls[0] }); est.camGratis = 0; }
    if (est.fase === 'tirada') return prueba({ t: 'tirar' });
    void v;
    return prueba({ t: 'terminar' });
  }

  /* ----- ordenes de asientos ----- */
  comando(i, cmd) {
    if (!cmd || typeof cmd !== 'object') return { ok: false, err: 'orden' };
    if (!Number.isInteger(i) || i < 0 || i >= this.as.length) return { ok: false, err: 'asiento' };
    if (cmd.t === 'chat') {
      const a = this.as[i], ahora = this.ahora();
      if (!Number.isInteger(cmd.k) || cmd.k < 0 || cmd.k >= N_CHAT || ahora - a.ultChat < 700) return { ok: false, err: 'chat' };
      a.ultChat = ahora; this.emitir([{ t: 'chat', j: i, k: cmd.k }]); return { ok: true };
    }
    if (this.pausada) return { ok: false, err: 'pausa' };
    const r = R.aplicar(this.est, i, cmd);
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
    if (!d || d.v !== 1 || !d.est || !Array.isArray(d.as) || d.est.n !== d.as.length || !d.est.vj || !d.est.hex) return null;
    const m = new Mesa({ ...deps, asientos: d.as, est: d.est, id: d.id, semilla: 1, pausada: true });
    m.rs = d.rs | 0; m.seq = d.seq | 0;
    m.as.forEach((a) => { if (a.tipo === 'humano') a.ausente = true; });
    m.est.ev = [];
    return m;
  }
}

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
export const relojReal = { ahora: () => Date.now(), prog: (fn, ms) => setTimeout(fn, ms), cancelar: (k) => clearTimeout(k) };
