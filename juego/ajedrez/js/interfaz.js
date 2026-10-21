// =============================================================
//  🧩  INTERFAZ (DOM)
//  Botones, lista de jugadas, jugadores y relojes, pantallas
//  (nueva partida, ajustes, coronación, fin, PGN/FEN, estadísticas).
//  No sabe de reglas ni de 3D: avisa a principal.js con callbacks.
// =============================================================
import { NIVELES, RELOJES, CALIDADES } from './config.js';
import { TEMAS, ORDEN_TEMAS } from './temas.js';
import { sanFigurada } from './reglas.js';
import { formatoTiempo } from './reloj.js';

const $ = (id) => document.getElementById(id);
const GLIFOS = [['', '♙', '♘', '♗', '♖', '♕', '♔'], ['', '♟', '♞', '♝', '♜', '♛', '♚']];
const NOMBRES_PIEZA = { 5: 'Dama', 4: 'Torre', 3: 'Alfil', 2: 'Caballo' };

export class Interfaz {
  constructor(al) {
    this.al = al;
    this.pantallas = ['Inicio', 'Ajustes', 'Coronar', 'Fin', 'Stats', 'Texto', 'Confirmar'];
    this.sel = { modo: 'ia', color: 'blancas', nivel: 'medio', reloj: 'sin' };
    this._toastT = 0;
    this._construir();
    this._enlazar();
  }

  // ---------------------------------------------------------- construcción
  _construir() {
    $('selReloj').innerHTML = RELOJES.map((r) => `<option value="${r.id}">${r.nombre}</option>`).join('');
    $('fichasNivel').innerHTML = NIVELES.map((n) => `<button type="button" data-v="${n.id}">${n.nombre.toUpperCase()}</button>`).join('');
    $('fichasTema').innerHTML = ORDEN_TEMAS.map((t) => `<button type="button" data-v="${t}">${TEMAS[t].nombre.toUpperCase()}</button>`).join('');
    $('fichasCalidad').innerHTML = CALIDADES.map((c) => `<button type="button" data-v="${c.id}">${c.nombre.toUpperCase()}</button>`).join('');
  }

  _enlazar() {
    const al = this.al;
    // fichas del panel de nueva partida
    document.querySelectorAll('#panelNueva .fichas').forEach((f) => f.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.sel[f.dataset.campo] = b.dataset.v;
      this._marcarFichas();
      al.alSonidoClic();
    }));
    $('selReloj').addEventListener('change', (e) => { this.sel.reloj = e.target.value; });
    $('btnEmpezar').addEventListener('click', () => {
      const err = al.alNueva({ ...this.sel, girarAuto: $('chkGirarAuto').checked, fen: $('campoFenInicio').value.trim() });
      $('errFenInicio').textContent = err || '';
      if (err) $('panelNueva').querySelector('details').open = true;
    });
    $('btnReanudar').addEventListener('click', () => al.alReanudar());
    $('btnStats').addEventListener('click', () => al.alStats());
    $('btnAjustes').addEventListener('click', () => this.mostrar('Ajustes'));
    $('btnAjustes2').addEventListener('click', () => this.mostrar('Ajustes'));
    $('btnCerrarAjustes').addEventListener('click', () => this.ocultar('Ajustes'));
    $('btnCerrarStats').addEventListener('click', () => this.ocultar('Stats'));
    $('btnBorrarStats').addEventListener('click', () => al.alBorrarStats());
    $('btnSonido').addEventListener('click', () => al.alAjuste('sonido', !this.opts.sonido));
    $('btnMusica').addEventListener('click', () => al.alAjuste('musica', !this.opts.musica));
    $('chkSonido').addEventListener('change', (e) => al.alAjuste('sonido', e.target.checked));
    $('chkMusica').addEventListener('change', (e) => al.alAjuste('musica', e.target.checked));
    $('chkAyuda').addEventListener('change', (e) => al.alAjuste('ayuda', e.target.checked));
    $('chkGirar').addEventListener('change', (e) => al.alAjuste('girarAuto', e.target.checked));
    $('rngVol').addEventListener('input', (e) => al.alAjuste('volumen', e.target.value / 100));
    $('fichasTema').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) al.alAjuste('tema', b.dataset.v); });
    $('fichasCalidad').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) al.alAjuste('calidad', b.dataset.v); });
    $('controles').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.acc === 'mas') { $('controles').classList.toggle('abierto'); return; }
      $('controles').classList.remove('abierto');
      al.alAccion(b.dataset.acc);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#controles')) $('controles').classList.remove('abierto');
    });
    $('navJug').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) al.alNavegar(b.dataset.nav); });
    $('jugadas').addEventListener('click', (e) => {
      const m = e.target.closest('.mov');
      if (m) al.alNavegar(+m.dataset.i);
    });
    $('btnContinuar2').addEventListener('click', () => al.alContinuarRevision());
    $('btnRevancha').addEventListener('click', () => al.alRevancha());
    $('btnFinNueva').addEventListener('click', () => { this.ocultar('Fin'); al.alAccion('nueva'); });
    $('btnFinVer').addEventListener('click', () => this.ocultar('Fin'));
    $('btnCancelarCoronar').addEventListener('click', () => this._resolverCoronar(0));
    $('btnTextoCerrar').addEventListener('click', () => this.ocultar('Texto'));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      for (const p of ['Coronar', 'Confirmar', 'Texto', 'Stats', 'Ajustes', 'Fin']) {
        if (!$('pantalla' + p).classList.contains('oculto')) {
          if (p === 'Coronar') this._resolverCoronar(0);
          else if (p === 'Confirmar') this._resolverConfirmar(false);
          else this.ocultar(p);
          return;
        }
      }
      $('controles').classList.remove('abierto');
    });
  }

  _marcarFichas() {
    document.querySelectorAll('#panelNueva .fichas').forEach((f) => {
      f.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.v === this.sel[f.dataset.campo]));
    });
    document.querySelectorAll('#panelNueva [data-solo]').forEach((c) => c.classList.toggle('oculto', c.dataset.solo !== this.sel.modo));
    const n = NIVELES.find((x) => x.id === this.sel.nivel);
    if (n) {
      const desc = { principiante: 'Juega rápido y se equivoca a menudo.', facil: 'Ve pocas jugadas adelante; comete errores.', medio: 'Juega con sensatez; castiga errores grandes.', dificil: 'Calcula varias jugadas; difícil de superar.', maestro: 'Todo su poder de cálculo (puede tardar hasta 5 s).' };
      $('descNivel').textContent = desc[n.id];
    }
    $('selReloj').value = this.sel.reloj;
  }

  // ---------------------------------------------------------- opciones y pantallas
  aplicarOpciones(o, reiniciarSel = false) {
    this.opts = o;
    if (reiniciarSel) { this.sel.modo = o.modo; this.sel.color = o.color; this.sel.nivel = o.nivel; this.sel.reloj = o.reloj; }
    this._marcarFichas();
    $('chkSonido').checked = o.sonido; $('chkMusica').checked = o.musica; $('chkAyuda').checked = o.ayuda;
    $('chkGirar').checked = o.girarAuto; $('chkGirarAuto').checked = o.girarAuto;
    $('rngVol').value = Math.round(o.volumen * 100);
    $('btnSonido').classList.toggle('apagado', !o.sonido);
    $('btnMusica').classList.toggle('encendido', o.musica);
    document.querySelectorAll('#fichasTema button').forEach((b) => b.classList.toggle('sel', b.dataset.v === o.tema));
    document.querySelectorAll('#fichasCalidad button').forEach((b) => b.classList.toggle('sel', b.dataset.v === o.calidad));
  }

  mostrar(nombre) {
    $('pantalla' + nombre).classList.remove('oculto');
    if (nombre === 'Inicio') document.body.classList.add('enInicio');
  }

  ocultar(nombre) {
    $('pantalla' + nombre).classList.add('oculto');
    if (nombre === 'Inicio') document.body.classList.remove('enInicio');
  }

  hayModal() {
    return this.pantallas.some((p) => !$('pantalla' + p).classList.contains('oculto'));
  }

  inicioConPartida(info, enCurso = false) {
    $('btnReanudar').classList.toggle('oculto', !info);
    $('btnReanudar').textContent = enCurso ? 'VOLVER A LA PARTIDA' : 'CONTINUAR PARTIDA';
    $('infoReanudar').classList.toggle('oculto', !info);
    if (info) $('infoReanudar').textContent = info;
  }

  toast(texto, ms = 2200) {
    const t = $('toast');
    t.textContent = texto;
    t.classList.add('visible');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('visible'), ms);
  }

  estado(texto, clase = '') {
    const e = $('estado');
    e.textContent = texto;
    e.className = clase;
  }

  // ---------------------------------------------------------- jugadores / reloj
  // info = { arriba: color, nombres: [b, n], subs: [b, n], capt: [[...], [...]], ventaja, turno, relojes, conReloj, corre }
  jugadores(info) {
    const arriba = info.arriba;
    const dibujar = (id, color) => {
      const el = $(id);
      const propias = info.capt[color];           // piezas que capturó este bando (son del rival)
      const g = propias.map((t) => GLIFOS[color ^ 1][t]).join('');
      const dif = color === 0 ? info.ventaja : -info.ventaja;
      el.className = 'jugador' + (info.turno === color && !info.fin ? ' turno' : '');
      el.innerHTML = `<span class="ficha ${color ? 'n' : 'b'}">${GLIFOS[color][6]}</span>`
        + `<div class="nombre">${info.nombres[color]}<small>${info.subs[color] || ''}</small></div>`
        + `<div class="capt">${g}${dif > 0 ? `<em>+${dif}</em>` : ''}</div>`
        + `<div class="reloj${info.conReloj ? '' : ' oculto'}" data-c="${color}">${formatoTiempo(info.relojes[color])}</div>`;
    };
    dibujar('jugArriba', arriba);
    dibujar('jugAbajo', arriba ^ 1);
    this.relojes(info.relojes, info.turno, info.corre);
    this._arriba = arriba;
  }

  relojes(r, turno, corre) {
    for (const c of [0, 1]) {
      const el = document.querySelector(`.reloj[data-c="${c}"]`);
      if (!el) continue;
      el.textContent = formatoTiempo(r[c]);
      el.classList.toggle('corre', !!corre && turno === c);
      el.classList.toggle('poco', r[c] < 20000);
    }
  }

  ventaja(pp) {
    // pp = ventaja en peones (positivo = blancas); barra con curva suave
    const p = 50 + 50 * Math.tanh(pp / 7);
    document.querySelector('#ventaja i').style.height = p.toFixed(1) + '%';
    $('ventajaTxt').textContent = pp === 0 ? '0' : (pp > 0 ? '+' : '') + pp;
  }

  // ---------------------------------------------------------- lista de jugadas
  jugadas(lista, cursor, primeraNegras) {
    const cont = $('jugadas');
    if (!lista.length) { cont.innerHTML = '<div class="vacio">Aún no hay jugadas</div>'; return; }
    let h = '';
    let i = 0;
    let num = 1;
    const celda = (k) => `<span class="mov${k + 1 === cursor ? ' actual' : ''}" data-i="${k + 1}" role="listitem">${sanFigurada(lista[k].san)}</span>`;
    if (primeraNegras) { h += `<div class="fila-j"><span class="num">1.</span><span class="mov" style="visibility:hidden">…</span>${celda(0)}</div>`; i = 1; num = 2; }
    for (; i < lista.length; i += 2, num++) {
      h += `<div class="fila-j"><span class="num">${num}.</span>${celda(i)}${i + 1 < lista.length ? celda(i + 1) : '<span></span>'}</div>`;
    }
    cont.innerHTML = h;
    const act = cont.querySelector('.actual');
    if (act) {
      if (cont.scrollWidth > cont.clientWidth + 4 && cont.scrollHeight <= cont.clientHeight + 4) cont.scrollLeft = act.offsetLeft - cont.clientWidth / 2;
      else act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else cont.scrollTop = 0;
  }

  botones({ deshacer, rehacer, pista, tablas, rendirse, girar }) {
    const set = (a, v) => { const b = document.querySelector(`[data-acc="${a}"]`); if (b) b.disabled = !v; };
    set('deshacer', deshacer); set('rehacer', rehacer); set('pista', pista); set('tablas', tablas); set('rendirse', rendirse); set('girar', girar);
  }

  revision(texto) {
    $('revision').classList.toggle('oculto', !texto);
    if (texto) $('revisionTxt').textContent = texto;
  }

  // ---------------------------------------------------------- diálogos
  elegirPromocion(color) {
    $('opcCoronar').innerHTML = [5, 4, 3, 2].map((t) => `<button type="button" data-t="${t}"><span>${GLIFOS[color][t]}</span>${NOMBRES_PIEZA[t].toUpperCase()}</button>`).join('');
    this.mostrar('Coronar');
    return new Promise((res) => {
      this._coronar = res;
      $('opcCoronar').onclick = (e) => { const b = e.target.closest('button'); if (b) this._resolverCoronar(+b.dataset.t); };
    });
  }

  _resolverCoronar(t) {
    this.ocultar('Coronar');
    if (this._coronar) { const r = this._coronar; this._coronar = null; r(t); }
  }

  confirmar(titulo, texto, si = 'SÍ', no = 'NO') {
    $('confTitulo').textContent = titulo;
    $('confTexto').textContent = texto;
    $('btnConfSi').textContent = si; $('btnConfNo').textContent = no;
    this.mostrar('Confirmar');
    return new Promise((res) => {
      this._conf = res;
      $('btnConfSi').onclick = () => this._resolverConfirmar(true);
      $('btnConfNo').onclick = () => this._resolverConfirmar(false);
    });
  }

  _resolverConfirmar(v) {
    this.ocultar('Confirmar');
    if (this._conf) { const r = this._conf; this._conf = null; r(v); }
  }

  fin(titulo, texto, mostrarRevancha = true) {
    $('finTitulo').textContent = titulo;
    $('finTexto').textContent = texto;
    $('btnRevancha').classList.toggle('oculto', !mostrarRevancha);
    this.mostrar('Fin');
  }

  texto({ titulo, texto, editable = false, info = '', acciones = [] }) {
    $('textoTitulo').textContent = titulo;
    const a = $('textoArea');
    a.value = texto;
    a.readOnly = !editable;
    $('textoInfo').textContent = info;
    const bs = [$('btnTextoAccion'), $('btnTextoDescargar')];
    bs.forEach((b, i) => {
      const ac = acciones[i];
      b.classList.toggle('oculto', !ac);
      if (ac) { b.textContent = ac.texto; b.onclick = () => ac.fn($('textoArea').value, (m) => { $('textoInfo').textContent = m; }); }
    });
    $('btnTextoDescargar').classList.toggle('principal', false);
    this.mostrar('Texto');
    if (!editable) setTimeout(() => { a.focus(); a.select(); }, 50);
  }

  stats(s) {
    let h = '<tr><th>NIVEL</th><th>GANADAS</th><th>TABLAS</th><th>PERDIDAS</th></tr>';
    for (const n of NIVELES) {
      const e = s[n.id] || { v: 0, t: 0, d: 0 };
      h += `<tr><td>${n.nombre}</td><td>${e.v}</td><td>${e.t}</td><td>${e.d}</td></tr>`;
    }
    $('tablaStats').innerHTML = h;
    this.mostrar('Stats');
  }
}
