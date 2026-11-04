// =============================================================
//  🧩  INTERFAZ (DOM)
//  Botones, lista de jugadas, jugadores y relojes, barra de
//  evaluación y pantallas (ajustes, pausa, ayuda, coronación, fin,
//  PGN/FEN, estadísticas). No sabe de reglas ni de 3D: avisa a
//  principal.js con callbacks.
// =============================================================
import { NIVELES, BOTS } from './config.js';
import { sanFigurada } from './reglas.js';
import { formatoTiempo } from './reloj.js';
import { Ajustes } from './ajustes.js';
import { CLASE_POR_ID, textoEval, probGanar } from './analisis.js';

const $ = (id) => document.getElementById(id);
const GLIFOS = [['', '♙', '♘', '♗', '♖', '♕', '♔'], ['', '♟', '♞', '♝', '♜', '♛', '♚']];
const NOMBRES_PIEZA = { 5: 'Dama', 4: 'Torre', 3: 'Alfil', 2: 'Caballo' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { esc };

export class Interfaz {
  constructor(al) {
    this.al = al;
    this.pantallas = ['Inicio', 'Ajustes', 'Coronar', 'Fin', 'Stats', 'Texto', 'Confirmar', 'Pausa', 'Ayuda', 'Revision', 'Online'];
    this._toastT = 0;
    this.modoEval = false;
    this.ajustes = new Ajustes($('pantallaAjustes'), al);
    this._enlazar();
  }

  _enlazar() {
    const al = this.al;
    $('btnReanudar').addEventListener('click', () => al.alReanudar());
    $('btnAjustes').addEventListener('click', () => this.mostrar('Ajustes'));
    $('btnAjustes2').addEventListener('click', () => this.mostrar('Ajustes'));
    $('btnAyuda').addEventListener('click', () => al.alAyuda());
    $('btnAyuda2').addEventListener('click', () => al.alAyuda());
    $('btnAyudaCerrar').addEventListener('click', () => this.ocultar('Ayuda'));
    $('btnPausa').addEventListener('click', () => al.alPausa());
    $('btnPantalla').addEventListener('click', () => al.alPantallaCompleta());
    $('btnOnline').addEventListener('click', () => al.alOnline());
    $('btnCerrarAjustes').addEventListener('click', () => this.ocultar('Ajustes'));
    $('btnCerrarStats').addEventListener('click', () => this.ocultar('Stats'));
    $('btnBorrarStats').addEventListener('click', () => al.alBorrarStats());
    $('btnRevCerrar').addEventListener('click', () => this.ocultar('Revision'));
    $('btnPausaSeguir').addEventListener('click', () => al.alPausaSeguir());
    $('btnPausaAjustes').addEventListener('click', () => this.mostrar('Ajustes'));
    $('btnPausaAyuda').addEventListener('click', () => al.alAyuda());
    $('btnPausaMenu').addEventListener('click', () => { this.ocultar('Pausa'); al.alAccion('nueva'); });
    $('btnSonido').addEventListener('click', () => al.alAjuste('sonido', !this.opts.sonido));
    $('btnMusica').addEventListener('click', () => al.alAjuste('musica', !this.opts.musica));
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
    $('notaTxt').addEventListener('change', (e) => al.alNota(e.target.value));
    $('btnContinuar2').addEventListener('click', () => al.alContinuarRevision());
    $('btnRevancha').addEventListener('click', () => al.alRevancha());
    $('btnFinNueva').addEventListener('click', () => { this.ocultar('Fin'); al.alAccion('nueva'); });
    $('btnFinVer').addEventListener('click', () => this.ocultar('Fin'));
    $('btnFinRevisar').addEventListener('click', () => { this.ocultar('Fin'); al.alAccion('revisar'); });
    $('btnFinGuardar').addEventListener('click', () => al.alAccion('guardar'));
    $('btnCancelarCoronar').addEventListener('click', () => this._resolverCoronar(0));
    $('btnTextoCerrar').addEventListener('click', () => this.ocultar('Texto'));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      for (const p of ['Coronar', 'Confirmar', 'Texto', 'Stats', 'Revision', 'Ayuda', 'Ajustes', 'Pausa', 'Fin']) {
        if (!$('pantalla' + p).classList.contains('oculto')) {
          if (p === 'Coronar') this._resolverCoronar(0);
          else if (p === 'Confirmar') this._resolverConfirmar(false);
          else if (p === 'Pausa') al.alPausaSeguir();
          else this.ocultar(p);
          return;
        }
      }
      $('controles').classList.remove('abierto');
    });
  }

  // ---------------------------------------------------------- opciones y pantallas
  aplicarOpciones(o) {
    this.opts = o;
    this.ajustes.actualizar(o);
    $('btnSonido').classList.toggle('apagado', !o.sonido);
    $('btnMusica').classList.toggle('encendido', o.musica);
    const b = document.body.classList;
    b.toggle('textoGrande', !!o.textoGrande); b.toggle('altoContraste', !!o.altoContraste); b.toggle('zurdo', !!o.zurdo);
    b.toggle('botonesArriba', o.posBotones === 'arriba'); b.toggle('sinMovimiento', !!o.reducirMovimiento);
    const st = document.documentElement.style;
    st.setProperty('--tam-botones', o.tamBotones); st.setProperty('--op-botones', o.opBotones);
  }

  mostrar(nombre) {
    $('pantalla' + nombre).classList.remove('oculto');
    if (nombre === 'Inicio') document.body.classList.add('enInicio');
    if (nombre === 'Ajustes') this.ajustes.pintar();
  }

  ocultar(nombre) {
    $('pantalla' + nombre).classList.add('oculto');
    if (nombre === 'Inicio') document.body.classList.remove('enInicio');
    if (nombre === 'Ajustes' && this.al.alCerrarAjustes) this.al.alCerrarAjustes();
  }

  visible(nombre) { return !$('pantalla' + nombre).classList.contains('oculto'); }

  hayModal() {
    return this.pantallas.some((p) => !$('pantalla' + p).classList.contains('oculto')) || !!(window.Lobby && window.Lobby.abierto);
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
  // info = { arriba, nombres, subs, capt, ventaja, turno, relojes, conReloj, corre, fin, extra: [txt, txt] }
  jugadores(info) {
    const arriba = info.arriba;
    const dibujar = (id, color) => {
      const el = $(id);
      const propias = info.capt[color];
      const g = propias.map((t) => GLIFOS[color ^ 1][t]).join('');
      const dif = color === 0 ? info.ventaja : -info.ventaja;
      el.className = 'jugador' + (info.turno === color && !info.fin ? ' turno' : '');
      const dot = info.colores && info.colores[color] ? `<i class="punto" style="background:${info.colores[color]}"></i>` : '';
      el.innerHTML = `<span class="ficha ${color ? 'n' : 'b'}">${GLIFOS[color][6]}</span>`
        + `<div class="nombre">${dot}${esc(info.nombres[color])}<small>${esc(info.subs[color] || '')}${info.extra && info.extra[color] ? ' · ' + esc(info.extra[color]) : ''}</small></div>`
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

  // Material (peones) o, con análisis, evaluación del motor en centipeones (blancas)
  ventaja(pp) {
    const p = 50 + 50 * Math.tanh(pp / 7);
    document.querySelector('#ventaja i').style.height = p.toFixed(1) + '%';
    $('ventajaTxt').textContent = pp === 0 ? '0' : (pp > 0 ? '+' : '') + pp;
    $('ventaja').classList.remove('motor');
  }

  evaluacion(cpBlancas, fin = null) {
    const p = fin === 'b' ? 100 : fin === 'n' ? 0 : probGanar(cpBlancas);
    document.querySelector('#ventaja i').style.height = p.toFixed(1) + '%';
    $('ventajaTxt').textContent = fin ? (fin === 'b' ? '1-0' : fin === 'n' ? '0-1' : '½') : textoEval(cpBlancas);
    $('ventaja').classList.add('motor');
  }

  aperturaTxt(txt) {
    $('aperturaTxt').textContent = txt || '';
    this._infoLat();
  }

  _infoLat() {
    const v = ['aperturaTxt', 'panelTarea', 'panelAnalisis', 'notaCaja'].some((i) => { const e = $(i); return e.classList.contains('oculto') ? false : e.textContent.trim() || e.children.length; });
    $('infoLat').classList.toggle('vacio', !v);
  }

  // líneas del análisis: [{ txt, eval, cls }]
  panelAnalisis(info) {
    const el = $('panelAnalisis');
    el.classList.toggle('oculto', !info);
    if (info) el.innerHTML = info.map((l) => `<div class="lin"><b class="${l.cls || ''}">${esc(l.eval)}</b><span>${esc(l.txt)}</span></div>`).join('') || '<div class="lin"><span>Calculando…</span></div>';
    this._infoLat();
  }

  nota(visible, texto = '') {
    $('notaCaja').classList.toggle('oculto', !visible);
    if (document.activeElement !== $('notaTxt')) $('notaTxt').value = texto;
    this._infoLat();
  }

  // Panel de rompecabezas / lección: { titulo, texto, botones: [{id, txt}], puntos }
  panelTarea(info, alBoton) {
    const el = $('panelTarea');
    el.classList.toggle('oculto', !info);
    if (info) {
      el.innerHTML = `<div class="tt">${esc(info.titulo)}</div><div class="tx ${info.clase || ''}">${esc(info.texto || '')}</div>`
        + (info.puntos ? `<div class="pts">${info.puntos}</div>` : '')
        + `<div class="bt">${(info.botones || []).map((b) => `<button type="button" data-b="${b.id}" ${b.off ? 'disabled' : ''}>${esc(b.txt)}</button>`).join('')}</div>`;
      el.onclick = (e) => { const b = e.target.closest('button'); if (b && alBoton) alBoton(b.dataset.b); };
    }
    this._infoLat();
  }

  // ---------------------------------------------------------- lista de jugadas
  jugadas(lista, cursor, primeraNegras, clasif = null) {
    const cont = $('jugadas');
    if (!lista.length) { cont.innerHTML = '<div class="vacio">Aún no hay jugadas</div>'; return; }
    let h = '';
    let i = 0;
    let num = 1;
    const celda = (k) => {
      const c = clasif && clasif[k] && clasif[k].id !== 'mejor' && clasif[k].id !== 'excelente' && clasif[k].id !== 'bueno' ? CLASE_POR_ID[clasif[k].id] : null;
      return `<span class="mov${k + 1 === cursor ? ' actual' : ''}" data-i="${k + 1}" role="listitem">${sanFigurada(lista[k].san)}${c ? `<i class="cl" style="background:${c.color}" title="${c.nombre}">${c.simbolo.length < 3 ? c.simbolo : ''}</i>` : ''}</span>`;
    };
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

  botones(estado) {
    for (const [a, v] of Object.entries(estado)) {
      const b = document.querySelector(`[data-acc="${a}"]`);
      if (b) { if (a === 'analisis') b.classList.toggle('activo', !!v.activo), b.disabled = !v.permitido; else b.disabled = !v; }
    }
  }

  revision(texto) {
    $('revision').classList.toggle('oculto', !texto);
    if (texto) $('revisionTxt').textContent = texto;
  }

  fps(txt) { const e = $('fps'); e.classList.toggle('oculto', !txt); if (txt) e.textContent = txt; }

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

  // Confirmación de jugada (móvil): devuelve true/false
  confirmarJugada(san) {
    $('confirmaTxt').textContent = sanFigurada(san);
    $('confirmaMov').classList.remove('oculto');
    return new Promise((res) => {
      const fin = (v) => { $('confirmaMov').classList.add('oculto'); res(v); };
      $('btnConfOk').onclick = () => fin(true);
      $('btnConfNo2').onclick = () => fin(false);
      this._cancelaConf = () => fin(false);
    });
  }
  cancelarConfirmarJugada() { if (!$('confirmaMov').classList.contains('oculto') && this._cancelaConf) this._cancelaConf(); }

  fin(titulo, texto, { revancha = true, elo = '', guardar = true } = {}) {
    $('finTitulo').textContent = titulo;
    $('finTexto').textContent = texto;
    $('finElo').textContent = elo;
    $('btnRevancha').classList.toggle('oculto', !revancha);
    $('btnFinGuardar').classList.toggle('oculto', !guardar);
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

  stats(s, perfil) {
    let h = '<tr><th>RIVAL</th><th>GANADAS</th><th>TABLAS</th><th>PERDIDAS</th></tr>';
    const filas = [...NIVELES.map((n) => [n.id, n.nombre]), ...BOTS.map((b) => ['bot:' + b.id, `${b.icono} ${b.nombre} (${b.elo})`])];
    for (const [id, nombre] of filas) {
      const e = s[id];
      if (!e && id.startsWith('bot:')) continue;
      const x = e || { v: 0, t: 0, d: 0 };
      h += `<tr><td>${esc(nombre)}</td><td>${x.v}</td><td>${x.t}</td><td>${x.d}</td></tr>`;
    }
    $('tablaStats').innerHTML = h;
    this.mostrar('Stats');
  }

  anunciar(texto) { // lectores de pantalla
    let e = $('anuncio');
    if (!e) { e = document.createElement('div'); e.id = 'anuncio'; e.setAttribute('aria-live', 'assertive'); e.className = 'solo-lector'; document.body.appendChild(e); }
    e.textContent = texto;
  }
}
