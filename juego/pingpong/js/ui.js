// Interfaz: menu principal, modales, HUD, navegacion con mando (cruceta + A/B) y paneles de configuracion de modos.
import { h, $ } from './dom.js';
import { seg, panelAjustes, panelTienda, panelLogros, panelStats, panelAyuda } from './paneles.js';
import { DIFICULTADES, ESTILOS } from './bots.js';
import { rivalDe, rondaActual } from './torneo.js';
import * as CuentaPP from './cuenta-pp.js';

export class UI {
  constructor(App) {
    this.App = App; this.pila = []; this.hud = $('#hud'); this.menu = $('#menu'); this.raiz = $('#modales'); this.tNav = 0; this.msgT = 0;
    this.configs = { libre: { dif: 'normal', estilo: 'azar', mejorDe: 3, puntos: 11, dobles: false }, torneo: { tam: 8, nivel: 'normal' }, entreno: { cada: 2.4, velocidad: 0.5, efecto: 'ninguno', lugar: 'azar' } };
    try { Object.assign(this.configs.libre, JSON.parse(localStorage.getItem('pingpong_cfg_libre') || '{}')); } catch (e) { /* sin guardado */ }
    this.construirHud();
  }
  /* ---------- modales ---------- */
  modal(titulo, rellenar, op = {}) {
    const caja = h('div', { cls: 'modal-caja' + (op.ancho ? ' ancho' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    const cuerpo = h('div', { cls: 'modal-cuerpo' });
    const api = { cerrar: () => this.cerrar(api), cuerpo, caja, op };
    const cab = h('div', { cls: 'modal-cab' }, [h('h2', { txt: titulo }), op.sinCerrar ? null : h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-atras': 1, 'aria-label': 'Cerrar', txt: '×', on: { click: () => api.cerrar() } })]);
    caja.appendChild(cab); caja.appendChild(cuerpo);
    const fondo = h('div', { cls: 'modal' }, [caja]); api.el = fondo;
    fondo.addEventListener('pointerdown', (e) => { if (e.target === fondo && !op.sinCerrar) api.cerrar(); });
    this.raiz.appendChild(fondo); this.pila.push(api); document.body.classList.add('con-modal');
    rellenar(cuerpo, api); this.enfocar(caja);
    return api;
  }
  cerrar(api) {
    const i = this.pila.indexOf(api); if (i < 0) return;
    this.pila.splice(i, 1); api.el.remove();
    if (!this.pila.length) document.body.classList.remove('con-modal');
    if (api.op.alCerrar) api.op.alCerrar();
    const sig = this.pila[this.pila.length - 1]; if (sig) this.enfocar(sig.caja);
  }
  cerrarTodo() { while (this.pila.length) this.cerrar(this.pila[this.pila.length - 1]); }
  get hayModal() { return this.pila.length > 0; }
  toast(txt, ms = 2400) { const t = h('div', { cls: 'toast', txt }); $('#toasts').appendChild(t); setTimeout(() => t.remove(), ms); }

  /* ---------- navegacion con mando ---------- */
  contenedorNav() { const p = this.pila[this.pila.length - 1]; if (p) return p.caja; return this.menu.hidden ? null : this.menu; }
  enfocar(c) { const e = this.focables(c)[0]; if (e) e.focus({ preventScroll: true }); }
  focables(c) { return Array.from(c.querySelectorAll('[data-f]')).filter((e) => !e.disabled && e.offsetParent !== null); }
  navegar(M, dt) {
    const c = this.contenedorNav(); if (!c || !M.conectado) return;
    const ar = M.pulsado('ARRIBA'), ab = M.pulsado('ABAJO'), iz = M.pulsado('IZQ'), de = M.pulsado('DER');
    this.tNav -= dt; let sx = 0, sy = 0;
    if (this.tNav <= 0) { if (M.ejes.izq.y < -0.6) sy = -1; else if (M.ejes.izq.y > 0.6) sy = 1; if (M.ejes.izq.x < -0.6) sx = -1; else if (M.ejes.izq.x > 0.6) sx = 1; if (sx || sy) this.tNav = 0.22; }
    const dy = ar ? -1 : ab ? 1 : sy, dx = iz ? -1 : de ? 1 : sx;
    const act = document.activeElement, esRango = act && act.matches && act.matches('input[type=range]');
    if (esRango && dx) { act.value = String(+act.value + dx * (+act.step || 1)); act.dispatchEvent(new Event('input', { bubbles: true })); act.dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (dx || dy) this.mover(c, dx, dy);
    if (M.pulsado('A')) { const a = document.activeElement; if (a && c.contains(a) && a.click) { a.click(); } else this.enfocar(c); }
    if (M.pulsado('B')) { const b = c.querySelector('[data-atras]'); if (b) b.click(); else if (c === this.menu) { /* menu raiz: nada */ } }
  }
  mover(c, dx, dy) {
    const l = this.focables(c); if (!l.length) return;
    const a = document.activeElement; if (!a || !l.includes(a)) { l[0].focus(); return; }
    const r0 = a.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let mejor = null, ms = Infinity;
    l.forEach((e) => {
      if (e === a) return; const r = e.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const prin = dx ? x * dx : y * dy, lat = dx ? Math.abs(y) : Math.abs(x);
      if (prin <= 4) return; const s = prin + lat * 2.2; if (s < ms) { ms = s; mejor = e; }
    });
    if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest' }); }
  }

  /* ---------- HUD ---------- */
  construirHud() {
    const A = this.App, p = this.hud;
    p.appendChild(h('div', { id: 'marcador' }, [
      h('div', { cls: 'eq e0' }, [h('span', { cls: 'nom', id: 'n0', txt: 'Tú' }), h('b', { cls: 'pts', id: 'p0', txt: '0' }), h('i', { cls: 'pips', id: 'j0' })]),
      h('div', { cls: 'centro-m' }, [h('span', { id: 'jnum', txt: '' }), h('i', { id: 'saca', cls: 'saca' })]),
      h('div', { cls: 'eq e1' }, [h('i', { cls: 'pips', id: 'j1' }), h('b', { cls: 'pts', id: 'p1', txt: '0' }), h('span', { cls: 'nom', id: 'n1', txt: 'Rival' })])]));
    p.appendChild(h('div', { id: 'msg', 'aria-live': 'polite' }));
    p.appendChild(h('div', { id: 'info' }));
    p.appendChild(h('div', { id: 'hint' }));
    p.appendChild(h('div', { id: 'medidor', hidden: true }, [h('i')]));
    const bt = h('div', { cls: 'hud-btns', 'data-hud': 1 }, [
      h('button', { type: 'button', cls: 'icono', id: 'bPausa', 'aria-label': 'Pausa', title: 'Pausa (Esc)', txt: '❚❚', on: { click: () => A.pausar() } }),
      h('button', { type: 'button', cls: 'icono', id: 'bPantalla', 'aria-label': 'Pantalla completa', title: 'Pantalla completa', txt: '⛶', on: { click: () => A.pantallaCompleta() } })]);
    p.appendChild(bt);
    const chips = h('div', { id: 'chips', 'data-hud': 1, role: 'group', 'aria-label': 'Efecto del golpe' });
    [['auto', 'Auto'], ['top', 'Top'], ['plano', 'Plano'], ['corte', 'Corte']].forEach(([v, t]) => chips.appendChild(h('button', { type: 'button', cls: 'chip', 'data-v': v, txt: t, on: { click: () => { A.aj.ct.efecto = v; A.aplicarAjustes(true); } } })));
    p.appendChild(chips);
  }
  mostrarHud(s) { this.hud.hidden = !s; document.body.classList.toggle('jugando', !!s); }
  setNombres(a, b) { $('#n0').textContent = a; $('#n1').textContent = b; }
  setMarcador(e, texto) {
    $('#p0').textContent = e.puntos[0]; $('#p1').textContent = e.puntos[1];
    const pips = (n, para) => '●'.repeat(n) + '○'.repeat(Math.max(0, para - n));
    const para = this.App.motor && this.App.motor.partido ? this.App.motor.partido.juegosParaGanar : 2;
    $('#j0').textContent = pips(e.juegos[0], para); $('#j1').textContent = pips(e.juegos[1], para);
    $('#jnum').textContent = texto || ''; this.hud.classList.toggle('sin-juegos', para <= 1);
  }
  setSaca(lado) { const s = $('#saca'); s.dataset.l = String(lado); s.title = lado === 0 ? 'Sacas tú' : 'Saca el rival'; }
  mensaje(txt, tipo = '', ms = 1600) { const m = $('#msg'); m.className = tipo; m.textContent = txt; m.classList.add('ver'); clearTimeout(this.msgT); this.msgT = setTimeout(() => m.classList.remove('ver'), ms); }
  hint(txt) { $('#hint').textContent = txt || ''; }
  info(txt) { $('#info').textContent = txt || ''; }
  medidor(p) { const m = $('#medidor'); m.hidden = false; m.firstChild.style.width = Math.round(p * 100) + '%'; clearTimeout(this.medT); this.medT = setTimeout(() => { m.hidden = true; }, 900); }
  pintarChips() { const v = this.App.aj.ct.efecto; this.hud.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === v))); }

  /* ---------- menu principal ---------- */
  mostrarMenu() {
    const A = this.App; this.menu.hidden = false; document.body.classList.add('en-menu'); this.mostrarHud(false);
    const lista = $('#listaMenu'); lista.textContent = '';
    const b = (t, d, fn, cls = '') => lista.appendChild(h('button', { type: 'button', cls: 'tarj-menu ' + cls, 'data-f': 1, on: { click: () => { A.sonido.clic(); fn(); } } }, [h('b', { txt: t }), h('small', { txt: d })]));
    const guardada = A.partidaGuardada();
    if (guardada) b('Continuar partida', guardada.online ? 'Partida online guardada: reabre la sala' : `${guardada.modo === 'torneo' ? 'Torneo' : 'Partido libre'} · ${guardada.partido.puntos.join('-')} (juegos ${guardada.partido.juegos.join('-')})`, () => A.continuar(), 'dest');
    b('Partido libre', 'Contra un bot, individuales o dobles', () => this.panelLibre());
    b('Torneo', 'Cuartos, semifinal y final', () => this.panelTorneo());
    b('Entrenamiento', 'Máquina lanzapelotas', () => this.panelEntreno());
    b('Reto de rallies', 'Aguanta el rally más largo', () => this.panelReto());
    b('Online 1 vs 1', 'Con un amigo, sin servidor', () => A.abrirLobby());
    b('Tienda', 'Mesas, paletas y salas', () => this.abrirTienda());
    b('Ranking', 'Global y amigos', () => this.abrirRanking());
    b('Logros', 'Tus medallas', () => this.modal('Logros', (c) => panelLogros(c, A), { ancho: 1 }));
    b('Estadísticas', 'Tu historial', () => this.modal('Estadísticas', (c) => panelStats(c, A)));
    b('Ajustes', 'Gráficos, audio, controles', () => this.abrirAjustes());
    b('Ayuda', 'Controles y reglas', () => this.modal('Ayuda', (c) => panelAyuda(c, A), { ancho: 1 }));
    $('#monedas').textContent = A.prog.monedas + ' monedas';
    CuentaPP.pintarChip($('#cuentaLinea'), () => this.abrirCuenta());
    const f = lista.querySelector('[data-f]'); if (f && !this.hayModal) f.focus({ preventScroll: true });
  }
  ocultarMenu() { this.menu.hidden = true; document.body.classList.remove('en-menu'); }
  abrirAjustes() { return this.modal('Ajustes', (c, api) => panelAjustes(c, this.App, api), { ancho: 1 }); }
  abrirTienda() { return this.modal('Tienda', (c) => panelTienda(c, this.App), { ancho: 1, alCerrar: () => this.App.alEquipar() }); }
  abrirRanking(modo) { return this.modal('Ranking', (c) => CuentaPP.panelRanking(c, { modo }), { ancho: 1 }); }
  abrirCuenta() { return this.modal('Cuenta', (c, api) => CuentaPP.panelCuenta(c, api, { ranking: () => this.abrirRanking(), antesDeSalir: () => this.App.guardarProg() })); }

  /* ---------- configuracion de modos ---------- */
  grupo(etq, ctrl) { return h('div', { cls: 'fila-aj' }, [h('div', { cls: 'etq' }, [h('span', { txt: etq })]), ctrl]); }
  panelLibre() {
    const A = this.App, c = this.configs.libre;
    this.modal('Partido libre', (cu, api) => {
      cu.appendChild(this.grupo('Dificultad', seg(Object.keys(DIFICULTADES).map((k) => [k, DIFICULTADES[k].nombre]), c.dif, (v) => { c.dif = v; })));
      cu.appendChild(this.grupo('Estilo del rival', seg([['azar', 'Al azar'], ...Object.keys(ESTILOS).map((k) => [k, ESTILOS[k].nombre])], c.estilo, (v) => { c.estilo = v; })));
      cu.appendChild(this.grupo('Formato', seg([[1, 'Un juego'], [3, 'Mejor de 3'], [5, 'Mejor de 5']], c.mejorDe, (v) => { c.mejorDe = v; })));
      cu.appendChild(this.grupo('Puntos por juego', seg([[7, '7 (rápido)'], [11, '11 (oficial)']], c.puntos, (v) => { c.puntos = v; })));
      cu.appendChild(this.grupo('Modalidad', seg([[false, 'Individual'], [true, 'Dobles (con un bot)']], c.dobles, (v) => { c.dobles = v; })));
      cu.appendChild(h('p', { cls: 'nota', txt: 'Reglas oficiales: diferencia de 2 puntos, saque cada 2 puntos y let en la red.' }));
      cu.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Jugar', on: { click: () => { try { localStorage.setItem('pingpong_cfg_libre', JSON.stringify(c)); } catch (e) { /* sin guardado */ } api.cerrar(); A.iniciarLibre(Object.assign({}, c)); } } }));
    });
  }
  panelTorneo() {
    const A = this.App, c = this.configs.torneo, t = A.prog.torneo;
    this.modal('Torneo', (cu, api) => {
      if (t && t.estado === 'en_curso') {
        cu.appendChild(h('p', { cls: 'nota', txt: 'Tienes un torneo en curso.' })); cu.appendChild(this.cuadro(t));
        cu.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Jugar ' + rondaActual(t).nombre, on: { click: () => { api.cerrar(); A.jugarRondaTorneo(); } } }));
        cu.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Abandonar torneo', on: { click: () => { if (confirm('¿Abandonar el torneo actual?')) { A.prog.torneo = null; A.guardarProg(); api.cerrar(); this.panelTorneo(); } } } }));
        return;
      }
      if (t) { cu.appendChild(h('p', { cls: 'nota', txt: t.estado === 'campeon' ? '¡Fuiste campeón del último torneo!' : 'Quedaste eliminado en el último torneo.' })); cu.appendChild(this.cuadro(t)); }
      cu.appendChild(this.grupo('Tamaño', seg([[4, '4 jugadores'], [8, '8 jugadores']], c.tam, (v) => { c.tam = v; })));
      cu.appendChild(this.grupo('Nivel', seg(Object.keys(DIFICULTADES).map((k) => [k, DIFICULTADES[k].nombre]), c.nivel, (v) => { c.nivel = v; })));
      cu.appendChild(h('p', { cls: 'nota', txt: 'Rondas contra rivales con estilos distintos; la final es al mejor de 5. El campeón gana monedas extra.' }));
      cu.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Comenzar torneo', on: { click: () => { api.cerrar(); A.nuevoTorneo(c.tam, c.nivel); } } }));
    }, { ancho: 1 });
  }
  cuadro(t) {
    const l = h('div', { cls: 'cuadro' });
    t.rondas.forEach((r, i) => { const rv = rivalDe(r.rival); l.appendChild(h('div', { cls: 'ronda' + (i === t.idx && t.estado === 'en_curso' ? ' act' : '') + (r.resultado ? (r.resultado.gano ? ' gan' : ' per') : '') }, [h('b', { txt: r.nombre }), h('span', { txt: `${rv.nombre} · ${ESTILOS[rv.estilo].nombre} · ${DIFICULTADES[r.dif].nombre}` }), h('small', { txt: r.resultado ? (r.resultado.gano ? 'Ganada ' : 'Perdida ') + r.resultado.marcador : 'Al mejor de ' + r.mejorDe })])); });
    return l;
  }
  panelEntreno() {
    const A = this.App, c = this.configs.entreno;
    this.modal('Entrenamiento', (cu, api) => {
      cu.appendChild(this.grupo('Frecuencia', seg([[3.4, 'Lenta'], [2.4, 'Media'], [1.6, 'Rápida']], c.cada, (v) => { c.cada = v; })));
      cu.appendChild(this.grupo('Velocidad', seg([[0.25, 'Suave'], [0.5, 'Media'], [0.8, 'Fuerte']], c.velocidad, (v) => { c.velocidad = v; })));
      cu.appendChild(this.grupo('Efecto', seg([['ninguno', 'Sin efecto'], ['top', 'Topspin'], ['corte', 'Corte'], ['lateral', 'Lateral'], ['mixto', 'Mixto']], c.efecto, (v) => { c.efecto = v; })));
      cu.appendChild(this.grupo('Colocación', seg([['azar', 'Al azar'], ['izq', 'Izquierda'], ['centro', 'Centro'], ['der', 'Derecha']], c.lugar, (v) => { c.lugar = v; })));
      cu.appendChild(h('p', { cls: 'nota', txt: 'La máquina lanza sin parar. Devuelve cada pelota a la mesa rival; se cuentan aciertos y racha. Pausa para terminar.' }));
      cu.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Empezar', on: { click: () => { api.cerrar(); A.iniciarEntreno(Object.assign({}, c)); } } }));
    });
  }
  panelReto() {
    const A = this.App, s = A.prog.stats;
    this.modal('Reto de rallies', (cu, api) => {
      cu.appendChild(h('p', { txt: 'Un robot casi perfecto te devuelve cada pelota y acelera poco a poco. Cada vez que fallas pierdes una vida (tienes 3). Tu puntaje es el rally más largo, en golpes.' }));
      cu.appendChild(h('p', { cls: 'nota', txt: 'Tu récord en el reto: ' + (s.retoMax || 0) + ' golpes.' }));
      cu.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Empezar', on: { click: () => { api.cerrar(); A.iniciarReto(); } } }));
    });
  }

  /* ---------- pausa y resultados ---------- */
  pausa() {
    const A = this.App;
    return this.modal('Pausa', (cu, api) => {
      const b = (t, fn, cls = '') => cu.appendChild(h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt: t, on: { click: fn } }));
      b('Continuar', () => api.cerrar());
      if (A.motor && A.motor.modo === 'online') b('Reconectar / invitar rival', () => { api.cerrar(); A.abrirLobby(); }, 'sec');
      b('Ajustes', () => this.abrirAjustes(), 'sec');
      b('Ayuda', () => this.modal('Ayuda', (c) => panelAyuda(c, A), { ancho: 1 }), 'sec');
      b(A.motor && A.motor.modo === 'entreno' ? 'Terminar entrenamiento' : A.motor && A.motor.modo === 'reto' ? 'Terminar reto' : 'Abandonar partida', () => { api.cerrar(); A.terminarManual(); }, 'peligro');
    }, { sinCerrar: false, alCerrar: () => A.reanudar() });
  }
  resultado(r) {
    const A = this.App;
    return this.modal(r.titulo, (cu, api) => {
      if (r.sub) cu.appendChild(h('p', { cls: 'gran-sub', txt: r.sub }));
      const t = h('table', { cls: 'tabla' }); (r.filas || []).forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })]))); cu.appendChild(t);
      if (r.monedas) cu.appendChild(h('p', { cls: 'monedas-ganadas', txt: '+' + r.monedas + ' monedas' }));
      if (r.logros && r.logros.length) cu.appendChild(h('p', { cls: 'nota', txt: 'Logros: ' + r.logros.join(', ') }));
      (r.botones || []).forEach(([txt, fn, cls]) => cu.appendChild(h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: () => { api.cerrar(); fn(); } } })));
      cu.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-atras': 1, txt: 'Menú', on: { click: () => { api.cerrar(); A.salirAlMenu(); } } }));
    }, { sinCerrar: true });
  }
  tutorial(fin) {
    const pasos = [['Bienvenido al tenis de mesa', 'Desliza el dedo (o arrastra con el ratón) hacia ARRIBA para golpear. Hacia dónde deslizas, hacia allá va la pelota.'], ['Fuerza y efecto', 'Un gesto rápido da potencia y topspin; lento y corto da un corte suave. Si curvas el gesto, la pelota gira de lado.'], ['Saque y reglas', 'Para sacar, desliza hacia arriba cuando quieras. La pelota debe botar en tu lado y luego en el rival. 11 puntos con diferencia de 2.']];
    let i = 0;
    this.modal(pasos[0][0], (cu, api) => {
      const t = h('p', { txt: pasos[0][1] }), titulo = api.caja.querySelector('h2');
      const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Siguiente', on: { click: () => { i++; if (i >= pasos.length) { api.cerrar(); return; } titulo.textContent = pasos[i][0]; t.textContent = pasos[i][1]; if (i === pasos.length - 1) b.textContent = 'Entendido'; } } });
      cu.appendChild(t); cu.appendChild(b);
    }, { alCerrar: () => fin && fin() });
  }
}
