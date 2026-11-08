// Partida: arbitro del anfitrion. Valida ordenes (reglas.js), juega por los bots y por los ausentes, controla el tiempo de turno y emite paquetes por asiento.
import { crear, orden, vista, territoriosDe } from './reglas.js';
import { decidir } from './bots.js';

export const relojReal = { ahora: () => Date.now(), tras: (f, ms) => setTimeout(f, ms), cancelar: (id) => clearTimeout(id) };
export const VELOCIDADES = { lenta: 1.7, normal: 1, rapida: 0.45, instantanea: 0.02 };

export class Partida {
  constructor({ est, salida, reloj, velocidad, alCambiar }) {
    this.est = est; this.salida = salida || (() => {}); this.reloj = reloj || relojReal; this.factor = VELOCIDADES[velocidad] || 1;
    this.alCambiar = alCambiar || null; this.seq = 0; this.tm = 0; this.tt = 0; this.limite = 0; this.auto = -1; this.pausada = false; this.escala = 1; this.vivo = true;
  }
  static nueva(cfg, jugadores, opts) { return new Partida({ est: crear(cfg, jugadores, (Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff), ...opts }); }
  static restaurar(o, opts) {
    if (!o || o.v !== 1 || !Array.isArray(o.o) || o.o.length !== 48 || !o.jug) return null;
    return new Partida({ est: o, ...opts });
  }
  guardar() { return JSON.parse(JSON.stringify(this.est)); }
  ajustarVelocidad(v) { this.factor = VELOCIDADES[v] || 1; }
  esAuto(j) { const p = this.est.jug[j]; return p.vivo && (p.tipo === 'bot' || p.ausente || this.auto === j); }
  restante() { return this.limite ? Math.max(0, this.limite - this.reloj.ahora()) : 0; }

  paquete(i, ev) { return { v: vista(this.est, i), ev: ev || [], seq: ++this.seq, tr: this.restante(), tmax: this.est.cfg.tiempo || 0 }; }
  emitir(ev) { this.est.jug.forEach((p, i) => { if (p.tipo === 'humano') this.salida(i, this.paquete(i, ev)); }); this.alCambiar && this.alCambiar(); }
  reenviar(i) { this.salida(i, { ...this.paquete(i, []), resync: true }); }
  iniciar() { this.emitir([{ t: 'inicio' }]); this.tras(); }
  pausar(b) { this.pausada = !!b; if (!b) this.tras(); else this.cancelar(); }
  ponerAusente(i, b) { const p = this.est.jug[i]; if (p) { p.ausente = !!b; if (this.est.turno === i) this.tras(); this.emitir([]); } }
  cancelar() { this.reloj.cancelar(this.tm); this.reloj.cancelar(this.tt); this.tm = 0; this.tt = 0; this.limite = 0; }
  destruir() { this.cancelar(); this.vivo = false; }

  comando(i, c) {
    if (!this.vivo || this.pausada) return { ok: false, error: 'Partida en pausa.' };
    const r = orden(this.est, i, c);
    if (r.ok) { if (this.auto === i && this.est.turno !== i) this.auto = -1; this.emitir(r.ev); this.tras(); }
    return r;
  }

  duracion(ev) {
    const nb = ev.filter((e) => e.t === 'bat').length;
    let ms = 380;
    if (nb) ms += Math.min(1500, 380 + 140 * nb);
    if (ev.some((e) => e.t === 'conq')) ms += 450;
    if (ev.some((e) => e.t === 'canje')) ms += 500;
    return ms * this.factor * this.escala;
  }
  tras(ev) {
    this.cancelar();
    const est = this.est;
    if (!this.vivo || this.pausada || est.fase === 'fin') return;
    if (est.turno !== this.auto) this.auto = -1;
    if (this.esAuto(est.turno)) { this.tm = this.reloj.tras(() => this.paso(), Math.max(10, this.duracion(ev || this.ultimo || []))); return; }
    if (est.cfg.tiempo > 0 && est.jug[est.turno].tipo === 'humano') {
      const ms = est.cfg.tiempo * this.escala; this.limite = this.reloj.ahora() + ms;
      this.tt = this.reloj.tras(() => { this.auto = est.turno; this.limite = 0; this.emitir([{ t: 'tiempo', j: est.turno }]); this.tras(); }, ms);
      if (!this.noReemitir) this.emitir([]);
    }
  }
  paso() {
    this.tm = 0;
    const est = this.est;
    if (!this.vivo || this.pausada || est.fase === 'fin') return;
    const j = est.turno;
    if (!this.esAuto(j)) return this.tras();
    const p = est.jug[j], nivel = p.tipo === 'bot' ? p.nivel : 1;
    let r = orden(est, j, decidir(est, j, nivel, Math.random));
    if (!r.ok) r = this.emergencia(j);
    this.ultimo = r.ev || [];
    if (r.ok) { this.emitir(r.ev); }
    this.tras(this.ultimo);
  }
  // si una orden del bot fuese rechazada, avanza de forma segura para no bloquear la partida
  emergencia(j) {
    const est = this.est;
    const opciones = [];
    if (est.conq) opciones.push({ t: 'mover', n: est.conq.min });
    else if (est.fase === 'colocar' || est.pool > 0) opciones.push({ t: 'colocar', a: territoriosDe(est, j)[0], n: est.pool });
    else opciones.push({ t: 'atacarFase' }, { t: 'terminar' });
    for (const o of opciones) { const r = orden(est, j, o); if (r.ok) return r; }
    return orden(est, j, { t: 'terminar' });
  }
}
