// =============================================================
//  🪑  MODO MESA (dos jugadores en el mismo teléfono)
//  Un panel de reloj para cada jugador: el de arriba gira 180° hacia
//  él. Cada panel tiene zona grande para tocar (pasar turno), tiempo,
//  barra, piezas capturadas y botones de tablas, rendición y deshacer
//  con sus confirmaciones, todo dentro del panel del que decide.
//  No sabe de reglas: avisa a principal.js por callbacks.
// =============================================================
import { formatoTiempo } from './reloj.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GLIFOS = [['', '♙', '♘', '♗', '♖', '♕', '♔'], ['', '♟', '♞', '♝', '♜', '♛', '♚']];

const PLANTILLA = `<div class="mr">
  <div class="mrCab"><span class="mrFicha"></span><span class="mrNom"></span><span class="mrCapt"></span>
    <span class="mrAcc"><button type="button" data-a="deshacer" aria-label="Deshacer jugada" title="Deshacer jugada">↶</button><button type="button" data-a="tablas" aria-label="Ofrecer tablas" title="Ofrecer tablas">½</button><button type="button" data-a="rendir" aria-label="Rendirse" title="Rendirse">⚑</button></span></div>
  <button type="button" class="mrTiempo" data-a="toque"><span class="mrT">00:00</span><span class="mrEst"></span></button>
  <div class="mrBarra"><i></i></div>
  <div class="mrCapa oculto"></div>
</div>`;

export class Mesa {
  constructor(al) {
    this.al = al;
    this.activa = false;
    this.capas = [null, null];
    this.finVisto = false;
    this.ult = null;
    this.cfg = { decimas: 'minuto', alerta: 20, alertaVis: true };
    for (const id of ['mesaArriba', 'mesaAbajo']) {
      const el = $(id);
      el.innerHTML = PLANTILLA;
      el.addEventListener('click', (e) => this._clic(e, el));
    }
    this.p = { arriba: this._refs($('mesaArriba')), abajo: this._refs($('mesaAbajo')) };
    this._orient = () => document.body.classList.toggle('mesaH', innerWidth > innerHeight * 1.02);
    window.addEventListener('resize', this._orient);
    window.addEventListener('orientationchange', this._orient);
  }

  _refs(el) {
    const q = (s) => el.querySelector(s);
    return { el, mr: q('.mr'), ficha: q('.mrFicha'), nom: q('.mrNom'), capt: q('.mrCapt'), t: q('.mrT'), est: q('.mrEst'), barra: q('.mrBarra i'), capa: q('.mrCapa'), btn: q('.mrTiempo'), des: q('[data-a="deshacer"]'), tab: q('[data-a="tablas"]'), ren: q('[data-a="rendir"]') };
  }

  activar(on) {
    this.activa = !!on;
    document.body.classList.toggle('mesa', this.activa);
    $('mesaArriba').classList.toggle('oculto', !on);
    $('mesaAbajo').classList.toggle('oculto', !on);
    if (on) this._orient(); else { document.body.classList.remove('mesaH'); this.cerrarCapas(); }
  }

  cerrarCapas() { this.capas = [null, null]; this.finVisto = false; if (this.ult) this._capas(); }

  _lado(c) { return this.ult && this.ult.abajo === c ? this.p.abajo : this.p.arriba; }

  // info: { abajo, nombres, subs, capt, ventaja, turno, fin, pend, pausa, conReloj, puedeDeshacer, opts }
  pintar(info) {
    this.ult = info;
    const o = info.opts; this.cfg = { decimas: o.relojDecimas, alerta: o.relojAlertaSeg, alertaVis: o.relojAlertaVis };
    for (const c of [0, 1]) {
      const P = this._lado(c), dif = c === 0 ? info.ventaja : -info.ventaja;
      P.el.dataset.c = c;
      P.mr.className = `mr c${c} ${P === this.p.arriba ? 'arriba' : 'abajo'}${info.turno === c && !info.fin ? ' turno' : ''}${info.pausa ? ' pausa' : ''}${info.fin ? ' fin' : ''}${info.conReloj ? '' : ' sinReloj'}`;
      P.ficha.textContent = GLIFOS[c][6];
      P.nom.innerHTML = `${esc(info.nombres[c])}<small>${esc(info.subs[c] || '')}</small>`;
      P.capt.innerHTML = `${info.capt[c].map((t) => GLIFOS[c ^ 1][t]).join('')}${dif > 0 ? `<em>+${dif}</em>` : ''}`;
      P.des.classList.toggle('oculto', o.mesaDeshacer === 'no' || !(info.puedeDeshacer && info.turno !== c && !info.fin));
      P.tab.classList.toggle('oculto', !!info.fin);
      P.ren.classList.toggle('oculto', !!info.fin);
      P.est.textContent = info.fin ? 'FIN · TOCA PARA VER' : info.pausa ? 'PAUSA' : info.pend === c ? 'TOCA PARA PASAR EL TURNO' : info.turno === c ? 'TU TURNO' : '';
      P.btn.setAttribute('aria-label', `${info.nombres[c]}: ${info.pend === c ? 'pasar el turno' : 'reloj'}`);
    }
    this._capas();
    if (!info.conReloj) for (const c of [0, 1]) this._lado(c).t.textContent = 'SIN RELOJ';
  }

  // Actualización rápida del reloj (cada ~100 ms): r = restante, inicial = tiempo de referencia de la barra
  tiempos(r, turno, corre, inicial) {
    if (!this.ult || !this.ult.conReloj) return;
    for (const c of [0, 1]) {
      const P = this._lado(c), ms = r[c];
      P.t.textContent = formatoTiempo(ms, this.cfg.decimas);
      const ref = Math.max(inicial[c] || 1, ms, 1);
      P.barra.style.width = Math.max(0, Math.min(100, (ms / ref) * 100)).toFixed(1) + '%';
      const corriendo = !!corre && turno === c;
      const bajo = this.cfg.alerta > 0 && ms < this.cfg.alerta * 1000 && !this.ult.fin;
      P.mr.classList.toggle('corre', corriendo);
      P.mr.classList.toggle('poco', bajo);
      P.mr.classList.toggle('alerta', bajo && corriendo && this.cfg.alertaVis);
      P.mr.classList.toggle('cero', ms <= 0);
    }
  }

  _clic(e, cont) {
    const b = e.target.closest('button'); if (!b) return;
    const c = +cont.dataset.c;
    this.al.clic && this.al.clic();
    const capa = b.closest('.mrCapa');
    if (capa) { const x = this.capas[c] && this.capas[c].botones[+b.dataset.i]; if (x) x[1](); return; }
    const a = b.dataset.a;
    if (a === 'toque') {
      if (this.ult && this.ult.fin && this.finVisto) { this.finVisto = false; this._capas(); return; }
      this.al.toque(c);
      return;
    }
    if (this.capas[0] || this.capas[1] || (this.ult && this.ult.fin)) return;
    if (a === 'tablas') this._tablas(c);
    else if (a === 'rendir') this._rendir(c);
    else if (a === 'deshacer') this._deshacer(c);
  }

  _capa(c, texto, botones) { this.capas[c] = { texto, botones }; this._capas(); }
  _quitar(...cs) { for (const c of cs) this.capas[c] = null; this._capas(); }
  _capas() {
    for (const c of [0, 1]) {
      const P = this._lado(c), x = this.capas[c];
      P.capa.classList.toggle('oculto', !x);
      P.mr.classList.toggle('conCapa', !!x);
      P.capa.innerHTML = x ? `<p>${esc(x.texto)}</p><div class="mrBots">${x.botones.map(([t, , clase], i) => `<button type="button" data-i="${i}" class="${clase || ''}">${esc(t)}</button>`).join('')}</div>` : '';
    }
  }

  _tablas(c) {
    const nom = this.ult.nombres[c];
    this._capa(c, '¿Ofrecer tablas?', [['SÍ, OFRECER', () => {
      this._capa(c, 'Esperando la respuesta de tu rival…', [['CANCELAR', () => this._quitar(0, 1)]]);
      this._capa(c ^ 1, `${nom} ofrece tablas`, [['ACEPTAR', () => { this._quitar(0, 1); this.al.tablas(); }, 'ok'], ['RECHAZAR', () => { this._quitar(0, 1); this.al.toast('Tablas rechazadas'); }]]);
    }, 'ok'], ['NO', () => this._quitar(c)]]);
  }

  _rendir(c) {
    this._capa(c, '¿Quieres rendirte?', [['SÍ', () => {
      this._capa(c, '¿Seguro? Perderás la partida y no se puede deshacer.', [['RENDIRME', () => { this._quitar(0, 1); this.al.rendir(c); }, 'mal'], ['VOLVER', () => this._quitar(c)]]);
    }, 'mal'], ['NO', () => this._quitar(c)]]);
  }

  _deshacer(c) {
    const modo = this.ult.opts.mesaDeshacer;
    if (modo === 'libre') { this.al.deshacer(); return; }
    this._capa(c, 'Esperando el permiso de tu rival…', [['CANCELAR', () => this._quitar(0, 1)]]);
    this._capa(c ^ 1, `${this.ult.nombres[c]} pide deshacer su última jugada`, [['PERMITIR', () => { this._quitar(0, 1); this.al.deshacer(); }, 'ok'], ['NO', () => { this._quitar(0, 1); this.al.toast('Deshacer rechazado'); }]]);
  }

  // Pide deshacer desde fuera (teclado, mando) en nombre del último que movió
  pedirDeshacer(c) { if (!this.capas[0] && !this.capas[1] && !(this.ult && this.ult.fin)) this._deshacer(c); }

  // Resultado: textos[c] es lo que lee el jugador de color c
  resultado(textos, acciones) {
    this.finVisto = false;
    for (const c of [0, 1]) this.capas[c] = { texto: textos[c], botones: [['REVANCHA', acciones.revancha, 'ok'], ['MENÚ', acciones.menu], ['VER TABLERO', () => { this.capas = [null, null]; this.finVisto = true; this._capas(); }]] };
    this._capas();
  }
}
