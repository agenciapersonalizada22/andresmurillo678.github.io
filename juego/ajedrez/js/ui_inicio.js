// =============================================================
//  🏠  PANTALLA DE INICIO
//  Pestañas: Jugar (variantes, rival, reloj), Rompecabezas, Lecciones,
//  Biblioteca de partidas y Perfil (Elo, historial, logros).
// =============================================================
import { NIVELES, BOTS, VENTAJAS, PRACTICA } from './config.js';
import { htmlEditor, clicEditor, cambioEditor } from './relojedit.js';
import { MODOS, TIPOS } from './rompecabezas.js';
import { LECCIONES } from './lecciones.js';
import { LOGROS } from './perfil.js';
import { esc } from './interfaz.js';
import * as Guardado from './guardado.js';

const $ = (id) => document.getElementById(id);
const PEST = [['jugar', 'JUGAR'], ['puzzles', 'PUZZLES'], ['lecciones', 'LECCIONES'], ['biblioteca', 'BIBLIOTECA'], ['perfil', 'PERFIL']];
const DESC_NIVEL = { principiante: 'Juega rápido y se equivoca a menudo.', facil: 'Ve pocas jugadas adelante; comete errores.', medio: 'Juega con sensatez; castiga errores grandes.', dificil: 'Calcula varias jugadas; difícil de superar.', maestro: 'Todo su poder de cálculo (puede tardar hasta 5 s).' };

export class InicioUI {
  constructor(al) {
    this.al = al;
    this.tab = 'jugar';
    this.sel = { modo: 'ia', color: 'blancas', nivel: 'medio', reloj: 'sin', variante: 'estandar', num960: -1, ventaja: 'dama', ventajaLado: 'tu', practica: 0, girarAuto: false, fen: '' };
    this.rival = 'niveles';
    this.o = {};
    $('pestanasInicio').innerHTML = PEST.map(([id, n]) => `<button type="button" data-t="${id}">${n}</button>`).join('');
    $('pestanasInicio').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { this.tab = b.dataset.t; this.pintar(); } });
    $('panelesInicio').addEventListener('click', (e) => this._clic(e));
    $('panelesInicio').addEventListener('change', (e) => this._cambio(e));
  }

  actualizarOpciones(o) {
    const s = this.sel;
    this.o = o;
    for (const k of ['modo', 'color', 'nivel', 'reloj', 'variante', 'ventaja', 'ventajaLado', 'practica', 'girarAuto']) if (o[k] !== undefined) s[k] = o[k];
    if (this.tab === 'jugar') this.rival = String(s.nivel).startsWith('bot:') ? 'bots' : 'niveles';
    this.pintar();
  }

  pintar() {
    document.querySelectorAll('#pestanasInicio button').forEach((b) => b.classList.toggle('sel', b.dataset.t === this.tab));
    const f = { jugar: () => this._jugar(), puzzles: () => this._puzzles(), lecciones: () => this._lecciones(), biblioteca: () => this._biblioteca(), perfil: () => this._perfil() }[this.tab];
    $('panelesInicio').innerHTML = f();
    if (this.tab === 'perfil') this._graficoPerfil();
    const sec = $('panelesInicio').querySelector('.sel[data-v], .sel');
    void sec;
  }

  _fichas(campo, lista, actual) {
    return `<div class="fichas" data-campo="${campo}">${lista.map(([v, n]) => `<button type="button" data-v="${esc(v)}" class="${String(actual) === String(v) ? 'sel' : ''}">${n}</button>`).join('')}</div>`;
  }

  _jugar() {
    const s = this.sel, ia = s.modo === 'ia';
    if (!['ia', 'dos', 'mesa'].includes(s.modo)) s.modo = 'ia';
    let h = `<div class="campo"><label>Modo</label>${this._fichas('modo', [['ia', 'VS COMPUTADORA'], ['dos', '2 JUGADORES'], ['mesa', 'MISMO TELÉFONO · RELOJ']], s.modo)}`;
    if (s.modo === 'mesa') h += '<p class="info">Pensado para dejar el móvil o la tablet entre dos personas: un reloj completo para cada jugador, el de arriba girado hacia él.</p>';
    h += '</div>';
    h += `<div class="campo"><label>Variante</label>${this._fichas('variante', [['estandar', 'ESTÁNDAR'], ['960', 'CHESS960'], ['handicap', 'HANDICAP'], ['practica', 'PRÁCTICA']], s.variante)}`;
    if (s.variante === '960') h += `<div class="fila-in"><input type="number" id="in960" min="0" max="959" placeholder="Posición 0-959 (vacío = al azar)" value="${s.num960 >= 0 ? s.num960 : ''}"><button type="button" data-acc="azar960" class="chico">AL AZAR</button></div><p class="info">Las piezas de la fila trasera se colocan al azar; el enroque funciona igual (rey a g/c, torre a f/d).</p>`;
    if (s.variante === 'handicap') h += `<div class="fila-in"><select id="selVentaja">${VENTAJAS.map((v) => `<option value="${v.id}" ${s.ventaja === v.id ? 'selected' : ''}>${v.nombre}</option>`).join('')}</select></div>${this._fichas('ventajaLado', [['tu', 'TÚ RECIBES LA VENTAJA'], ['rival', 'EL RIVAL LA RECIBE']], s.ventajaLado)}<p class="info">La partida con ventaja no puntúa en tu Elo.</p>`;
    if (s.variante === 'practica') h += `<div class="fila-in"><select id="selPractica">${PRACTICA.map((p, i) => `<option value="${i}" ${s.practica === i ? 'selected' : ''}>${esc(p[0])}</option>`).join('')}</select></div><p class="info">${esc(PRACTICA[s.practica][3])}</p>`;
    h += '</div>';
    if (ia && s.variante !== 'practica') h += `<div class="campo"><label>Juegas con</label>${this._fichas('color', [['blancas', 'BLANCAS'], ['negras', 'NEGRAS'], ['azar', 'AL AZAR']], s.color)}</div>`;
    if (ia) {
      h += `<div class="campo"><label>Rival</label>${this._fichas('rival', [['niveles', 'NIVELES'], ['bots', 'PERSONALIDADES']], this.rival)}`;
      if (this.rival === 'niveles') h += this._fichas('nivel', NIVELES.map((n) => [n.id, `${n.nombre.toUpperCase()} <small>~${n.elo}</small>`]), s.nivel) + `<p class="info">${DESC_NIVEL[s.nivel] || ''}</p>`;
      else h += `<div class="bots">${BOTS.map((b) => `<button type="button" data-bot="${b.id}" class="${s.nivel === 'bot:' + b.id ? 'sel' : ''}"><span>${b.icono}</span><b>${esc(b.nombre)}</b><small>${b.elo} · ${b.estilo}</small></button>`).join('')}</div><p class="info">${s.nivel.startsWith('bot:') ? esc((BOTS.find((b) => 'bot:' + b.id === s.nivel) || {}).frase || '') : 'Elige un rival.'}</p>`;
      h += '</div>';
    }
    const kRel = ia ? 'relojIa' : 'relojDos', rOn = this.o[kRel] !== false;
    h += `<div class="campo"><label>Reloj</label><label class="check"><input type="checkbox" data-modoreloj="${kRel}" ${rOn ? 'checked' : ''}> Usar reloj en este modo</label>${rOn ? htmlEditor(s.reloj, this.o.relojFavs || []) : '<p class="info">El reloj está desactivado para este modo (se activa aquí o en Ajustes › Reloj).</p>'}</div>`;
    if (s.modo === 'dos') h += `<div class="campo"><label class="check"><input type="checkbox" id="chkGirarAuto" ${s.girarAuto ? 'checked' : ''}> Girar el tablero en cada turno</label></div>`;
    h += `<details class="avanzado"><summary>Cargar posición (FEN)</summary><input id="campoFenInicio" type="text" placeholder="vacío = posición inicial" autocomplete="off" spellcheck="false" value="${esc(s.fen)}"><p class="info" id="errFenInicio"></p></details>`;
    h += '<button type="button" data-acc="empezar" class="principal">EMPEZAR</button>';
    return h;
  }

  _puzzles() {
    const r = Guardado.cargarRompe();
    return `<p class="sub">Tu nivel: <b class="gr">${r.elo}</b> · resueltos ${r.aciertos}/${r.total} · mejor racha ${r.mejorRacha}</p>
      <div class="modos">${MODOS.map((m) => `<button type="button" data-puzzle="${m.id}"><b>${m.nombre.toUpperCase()}</b><small>${m.desc}</small></button>`).join('')}</div>
      <p class="info">Más de 300 posiciones con solución verificada por el motor: ${Object.values(TIPOS).join(', ')}.</p>
      ${window.Cuenta ? '<div class="fila"><button type="button" data-acc="ranking">RANKING</button></div>' : ''}`;
  }

  _lecciones() {
    const L = Guardado.cargarLecciones();
    return `<div class="lista">${LECCIONES.map((l) => `<button type="button" data-leccion="${l.id}" class="${L[l.id] ? 'hecha' : ''}"><span>${L[l.id] ? '✔' : l.tipo === 'final' ? '♚' : '♞'}</span><b>${esc(l.titulo)}</b></button>`).join('')}</div>`;
  }

  _biblioteca() {
    const B = Guardado.cargarBiblioteca().slice().reverse();
    let h = `<div class="lista bib">${B.length ? B.map((g) => `<div class="item" data-id="${g.id}"><button type="button" data-abrir="${g.id}"><b>${esc(g.titulo)}</b><small>${new Date(g.t).toLocaleDateString()} · ${esc(g.res)} · ${esc(g.apertura || '')}</small></button><button type="button" class="chico" data-borrar="${g.id}" aria-label="Borrar">✖</button></div>`).join('') : '<p class="info">Aún no hay partidas guardadas. Usa «Guardar» durante o al terminar una partida.</p>'}</div>`;
    h += `<details class="avanzado"><summary>Importar PGN</summary><textarea id="pgnImport" rows="5" placeholder="Pega aquí uno o varios juegos en PGN" spellcheck="false"></textarea><p class="info" id="pgnInfo"></p><button type="button" data-acc="importarPgn" class="chico">IMPORTAR</button></details>`;
    h += '<div class="fila"><button type="button" data-acc="exportarBib">EXPORTAR TODO (PGN)</button></div>';
    return h;
  }

  _perfil() {
    const p = Guardado.cargarPerfil(), r = Guardado.cargarRompe();
    const aperts = Object.entries(p.aperturas).sort((a, b) => (b[1].v + b[1].t + b[1].d) - (a[1].v + a[1].t + a[1].d)).slice(0, 6);
    return `<p class="sub">Elo: <b class="gr">${p.elo}</b> · partidas puntuadas ${p.partidas} · rompecabezas ${r.elo}</p>
      <canvas id="graficoElo" width="360" height="110"></canvas>
      <h4>Por apertura</h4><table class="tab">${aperts.length ? aperts.map(([eco, a]) => `<tr><td>${eco} ${esc(a.n || '')}</td><td>${a.v}G ${a.t}T ${a.d}P</td></tr>`).join('') : '<tr><td>Sin datos todavía</td></tr>'}</table>
      <h4>Logros (${Object.keys(p.logros).length}/${LOGROS.length})</h4>
      <div class="logros">${LOGROS.map((l) => `<div class="${p.logros[l.id] ? 'ok' : ''}" title="${esc(l.desc)}"><b>${esc(l.nombre)}</b><small>${esc(l.desc)}</small></div>`).join('')}</div>
      <div class="fila"><button type="button" data-acc="stats">POR RIVAL</button>${window.Cuenta ? '<button type="button" data-acc="ranking">RANKING</button>' : ''}</div>`;
  }

  _graficoPerfil() {
    const cv = $('graficoElo'); if (!cv) return;
    const p = Guardado.cargarPerfil(), g = cv.getContext('2d');
    const pts = [1200]; let e = 1200;
    const h = p.historial.filter((x) => x.p);
    for (let i = h.length - 1, a = []; i >= 0; i--) a.unshift(h[i].d);
    let tot = h.reduce((s, x) => s + x.d, 0); e = p.elo - tot; pts[0] = e;
    for (const x of h) { e += x.d; pts.push(e); }
    g.clearRect(0, 0, cv.width, cv.height);
    const mn = Math.min(...pts) - 20, mx = Math.max(...pts) + 20;
    g.strokeStyle = '#3df5ff'; g.lineWidth = 2; g.beginPath();
    pts.forEach((v, i) => { const x = 10 + (cv.width - 20) * (pts.length > 1 ? i / (pts.length - 1) : 0.5), y = cv.height - 10 - (cv.height - 20) * (v - mn) / (mx - mn); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    g.fillStyle = '#b9b0ff'; g.font = '11px sans-serif'; g.fillText(String(Math.round(mx)), 4, 12); g.fillText(String(Math.round(mn)), 4, cv.height - 2);
  }

  _clic(e) {
    const b = e.target.closest('button'); if (!b) return;
    const s = this.sel, al = this.al;
    if (clicEditor(e, this._ctxReloj())) { al.alClic(); return; }
    const f = b.closest('.fichas[data-campo]');
    if (f) {
      const c = f.dataset.campo;
      if (c === 'rival') { this.rival = b.dataset.v; if (this.rival === 'niveles' && s.nivel.startsWith('bot:')) s.nivel = 'medio'; if (this.rival === 'bots' && !s.nivel.startsWith('bot:')) s.nivel = 'bot:nico'; } else s[c] = b.dataset.v;
      if (c === 'variante' && b.dataset.v === 'practica') s.color = 'blancas';
      if (c === 'modo' && b.dataset.v === 'mesa' && s.reloj === 'sin') { s.reloj = '10+0'; al.alReloj && al.alReloj('10+0'); }
      al.alClic(); this.pintar(); return;
    }
    if (b.dataset.bot) { s.nivel = 'bot:' + b.dataset.bot; al.alClic(); this.pintar(); return; }
    if (b.dataset.puzzle) return al.alPuzzle(b.dataset.puzzle);
    if (b.dataset.leccion) return al.alLeccion(b.dataset.leccion);
    if (b.dataset.abrir) return al.alAbrirBiblioteca(b.dataset.abrir);
    if (b.dataset.borrar) { al.alBorrarBiblioteca(b.dataset.borrar); this.pintar(); return; }
    switch (b.dataset.acc) {
      case 'azar960': s.num960 = Math.floor(Math.random() * 960); this.pintar(); break;
      case 'empezar': {
        this._leerCampos();
        const err = al.alNueva({ ...s });
        const el = $('errFenInicio'); if (el) el.textContent = err || '';
        if (err) { const d = $('panelesInicio').querySelector('details'); if (d) d.open = true; }
        break;
      }
      case 'importarPgn': { const msg = al.alImportarPGN($('pgnImport').value); $('pgnInfo').textContent = msg; this.pintar(); const i = $('pgnInfo'); if (i) i.textContent = msg; break; }
      case 'exportarBib': al.alExportarBiblioteca(); break;
      case 'stats': al.alStats(); break;
      case 'ranking': al.alRanking && al.alRanking(); break;
      default: break;
    }
  }

  _ctxReloj() {
    const o = this.o, s = this.sel;
    return { id: s.reloj, favs: o.relojFavs || [], poner: (id) => { s.reloj = id; if (this.al.alReloj) this.al.alReloj(id); this.pintar(); }, ponerFavs: (f) => { o.relojFavs = f; if (this.al.alAjuste) this.al.alAjuste('relojFavs', f); this.pintar(); } };
  }

  _leerCampos() {
    const s = this.sel;
    const v = $('campoFenInicio'); if (v) s.fen = v.value.trim();
    const n = $('in960'); if (n) s.num960 = n.value === '' ? -1 : Math.max(0, Math.min(959, +n.value));
    const c = $('chkGirarAuto'); if (c) s.girarAuto = c.checked;
  }

  _cambio(e) {
    const t = e.target, s = this.sel;
    if (cambioEditor(e, this._ctxReloj())) return;
    if (t.dataset && t.dataset.modoreloj) { this.al.alAjuste && this.al.alAjuste(t.dataset.modoreloj, t.checked); this.o[t.dataset.modoreloj] = t.checked; this.pintar(); }
    else if (t.id === 'selVentaja') s.ventaja = t.value;
    else if (t.id === 'selPractica') { s.practica = +t.value; this.pintar(); }
    else if (t.id === 'chkGirarAuto') s.girarAuto = t.checked;
  }
}
