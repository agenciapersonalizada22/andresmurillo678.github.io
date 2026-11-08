// Paneles (hojas): casilla, jugador, destinos, pasaporte, rutas, subasta, registro, chat, carta y fin de partida.
import { X, dinero } from './contexto.js';
import { h, boton, abrirHoja, cerrarHojaId, refrescarHojas, hojaAbierta } from './dom.js';
import { CASILLAS, CONTINENTES, POR_CONT, DESTINOS, EVENTOS, NIVELES_EDIF, MODOS_RUTA, RENTA_TRANS, NOMBRE_MAZO, colorCont } from './datos.js';
import { propsDe, puedeConstruir, puedeVender, puedeHipotecar, puedeDeshipotecar, valorHipoteca, costoDeshipoteca, costoEdif, dominio, cuentaCont, rutasDe, calcularRenta, multEvento, tieneVisa, puntos } from './reglas.js';
import { A } from './ajustes.js';
import { usuario, panelRanking } from './nube.js';

const col = (j) => (X.E.jug[j] ? X.E.jug[j].color : '#888');
const nombre = (j) => (j === X.yo ? 'Tú' : X.E.jug[j].nombre);
const miTurno = () => X.E && X.E.turno === X.yo && X.E.fase !== 'fin_partida';
const punto = (c) => h('i', { cls: 'pt', style: 'background:' + c });
export function etiquetaCont(g) { return h('span', { cls: 'grp', style: 'background:' + colorCont(g) }, A.simbolos ? CONTINENTES[g].sim : ''); }
const nivelTxt = (c) => (c === 4 ? 'hotel resort' : c ? c + ' atracción(es)' : '');

/* ---------- casilla ---------- */
export function abrirCasilla(i) {
  X.cursor = i; if (X.tablero) X.tablero.cursor(i);
  abrirHoja({ id: 'casilla', titulo: CASILLAS[i].nombre, render: (c) => renderCasilla(c, i) });
}
function renderCasilla(c, i) {
  const E = X.E, cs = CASILLAS[i], q = E.prop[i];
  if (cs.tipo === 'dest') c.appendChild(h('div', { cls: 'banda', style: 'background:' + colorCont(cs.grupo) }, CONTINENTES[cs.grupo].nombre + (A.simbolos ? ' · ' + CONTINENTES[cs.grupo].sim : '') + ' · ' + cs.famoso));
  const info = h('div', { cls: 'info' });
  if (q) {
    info.appendChild(h('p', {}, 'Precio: ', h('b', {}, dinero(cs.precio)), ' · Hipoteca: ', h('b', {}, dinero(valorHipoteca(E, i)))));
    info.appendChild(h('p', {}, 'Dueño: ', q.o < 0 ? h('b', {}, 'Banco (libre)') : h('b', {}, punto(col(q.o)), nombre(q.o)), q.h ? h('span', { cls: 'tag mal' }, 'Hipotecado') : null));
  }
  if (cs.tipo === 'dest') {
    const t = h('table', { cls: 'renta' }), m = multEvento(E, i);
    const filas = [['Renta', cs.renta[0]], ['Dominio del continente (sin construir)', cs.renta[0] * 2], ['Museo', cs.renta[1]], ['Parque temático', cs.renta[2]], ['Estadio', cs.renta[3]], ['Hotel resort', cs.renta[4]]];
    filas.forEach((f, k) => t.appendChild(h('tr', { cls: q && ((k === 0 && q.c === 0) || (k >= 2 && q.c === k - 1)) ? 'act' : '' }, h('td', {}, f[0]), h('td', {}, dinero(f[1])))));
    info.appendChild(t);
    info.appendChild(h('p', { cls: 'peq' }, 'Cada atracción u hotel cuesta ' + dinero(costoEdif(i)) + '. Construye con ' + E.cfg.dominio + ' destinos del continente. Tienes ' + (X.yo >= 0 ? cuentaCont(E, cs.grupo, X.yo) : 0) + ' de 4. Ahora: ' + (nivelTxt(q.c) || 'sin construir') + '.'));
    if (m !== 1) info.appendChild(h('p', { cls: 'tag ' + (m > 1 ? '' : 'mal') }, m > 1 ? '☀ Temporada alta: rentas ×2' : '🌧 Temporada baja: rentas ×½'));
    if (E.cfg.visaDescuento) info.appendChild(h('p', { cls: 'peq' }, 'Con los 4 sellos del continente tienes visa: 25% menos de renta aquí.' + (X.yo >= 0 && tieneVisa(E, cs.grupo, X.yo) ? ' ¡Ya la tienes!' : '')));
    if (X.yo >= 0) info.appendChild(h('p', { cls: 'peq' }, E.jug[X.yo].sellos.includes(i) ? '🛂 Ya tienes el sello de este destino.' : 'Aún no tienes el sello de este destino (+' + dinero(E.cfg.bonoSello) + ' al visitarlo).'));
  } else if (cs.tipo === 'trans') {
    const M = MODOS_RUTA[cs.modo];
    info.appendChild(h('p', {}, h('b', {}, M.icono + ' ' + M.nombre), ': ' + M.desc));
    info.appendChild(h('p', { cls: 'peq' }, 'Pasaje ' + dinero(M.tarifa) + (M.dueno != null ? ' (' + (M.dueno ? dinero(M.dueno) : 'gratis') + ' para el dueño)' : '') + '. Renta según tus estaciones: ' + RENTA_TRANS.slice(1).map(dinero).join(', ') + '.'));
  } else {
    const d = { salida: 'Al pasar cobras tu sueldo (' + dinero(E.cfg.sueldo) + ').',
      retencion: 'Solo de visita, o retenido si te enviaron. Sales con dobles, pagando ' + dinero(E.cfg.fianza) + ' o con un pase.',
      libre: E.cfg.bote ? 'Te llevas el bote de tasas y multas: ' + dinero(E.bote) + '.' : 'Descanso sin efecto.',
      viaje: 'Roba una carta de Viaje: saltos, rutas y pases.', aduana: 'Roba una carta de Aduana: tasas, multas y retenciones.', suerte: 'Roba una carta de Suerte y eventos mundiales.',
      impuesto: 'Pagas ' + dinero(cs.monto || 0) + (E.cfg.bote ? ' (va al bote de la zona franca)' : '') + '.' };
    info.appendChild(h('p', {}, d[cs.tipo] || ''));
  }
  c.appendChild(info);
  if (q && q.o === X.yo) c.appendChild(filaPropiedad(i, true));
}

/* ---------- jugador ---------- */
export function abrirJugador(j) {
  X.seleccion.jugador = j;
  abrirHoja({ id: 'jugador', titulo: () => X.E.jug[X.seleccion.jugador].nombre, render: renderJugador });
}
function desglose(E, j) {
  const p = E.jug[j]; let prop = 0, edif = 0;
  propsDe(E, j).forEach((i) => { const q = E.prop[i]; prop += q.h ? valorHipoteca(E, i) : CASILLAS[i].precio; if (CASILLAS[i].tipo === 'dest') edif += q.c * costoEdif(i); });
  return { din: p.din, prop, edif, total: p.din + prop + edif };
}
export function barraPatrimonio(E) {
  const filas = E.jug.map((p) => ({ p, d: p.quebrado ? { din: 0, prop: 0, edif: 0, total: 0 } : desglose(E, p.id) }));
  const max = Math.max(1, ...filas.map((f) => f.d.total));
  const box = h('div', { cls: 'patri' });
  filas.forEach(({ p, d }) => {
    box.appendChild(h('div', { cls: 'pfila' + (p.quebrado ? ' quebrado' : '') },
      h('span', { cls: 'pn' }, punto(p.color), p.id === X.yo ? 'Tú' : p.nombre),
      h('span', { cls: 'pb', title: 'Efectivo ' + d.din + ' · Destinos ' + d.prop + ' · Edificios ' + d.edif },
        h('i', { cls: 'e', style: 'width:' + (d.din / max * 100) + '%' }), h('i', { cls: 'p', style: 'width:' + (d.prop / max * 100) + '%' }), h('i', { cls: 'f', style: 'width:' + (d.edif / max * 100) + '%' })),
      h('b', {}, dinero(d.total) + ' · 🛂' + p.sellos.length)));
  });
  box.appendChild(h('p', { cls: 'peq' }, 'Barras: efectivo (dorado), destinos (azul), edificios (verde).'));
  return box;
}
function renderJugador(c) {
  const E = X.E, j = X.seleccion.jugador, p = E.jug[j], d = desglose(E, j);
  c.appendChild(h('p', {}, punto(p.color), h('b', {}, p.nombre), p.tipo === 'bot' ? h('span', { cls: 'tag' }, 'Bot ' + ['conservador', 'medio', 'agresivo'][p.nivel]) : null, p.quebrado ? h('span', { cls: 'tag mal' }, 'En bancarrota') : null, p.ret ? h('span', { cls: 'tag mal' }, 'Retenido en aduana') : null));
  c.appendChild(h('p', {}, 'Efectivo ', h('b', {}, dinero(p.din)), ' · Patrimonio ', h('b', {}, dinero(d.total)), ' · Sellos ', h('b', {}, p.sellos.length + '/24'), p.tarj.length ? ' · Pases: ' + p.tarj.length : '', ' · Puntos ', h('b', {}, puntos(E, j))));
  const l = propsDe(E, j);
  if (l.length) {
    const ul = h('div', { cls: 'chips' });
    l.forEach((i) => ul.appendChild(boton([CASILLAS[i].tipo === 'dest' ? etiquetaCont(CASILLAS[i].grupo) : h('i', { cls: 'grp neutro' }), CASILLAS[i].nombre, E.prop[i].c ? ' ' + (E.prop[i].c === 4 ? '🏨' : '🏛'.repeat(E.prop[i].c)) : '', E.prop[i].h ? ' (hip.)' : ''], () => abrirCasilla(i), 'chip')));
    c.appendChild(ul);
  } else c.appendChild(h('p', { cls: 'peq' }, 'Aún sin destinos.'));
  c.appendChild(h('div', { cls: 'fila' }, boton('🛂 Ver pasaporte', () => { cerrarHojaId('jugador'); abrirPasaporte(j); }, 'sec'),
    boton('◀', () => cambiarJugador(-1), 'sec', { 'aria-label': 'Jugador anterior' }), boton('▶', () => cambiarJugador(1), 'sec', { 'aria-label': 'Jugador siguiente' })));
  c.appendChild(h('h3', {}, 'Patrimonio en vivo')); c.appendChild(barraPatrimonio(E));
}
export function cambiarJugador(d) {
  const n = X.E.jug.length; X.seleccion.jugador = (X.seleccion.jugador + d + n) % n;
  const s = hojaAbierta('jugador'); if (s) refrescarHojas(['jugador']);
}

/* ---------- destinos (construir / hipotecar) ---------- */
function filaPropiedad(i, aislada) {
  const E = X.E, cs = CASILLAS[i], q = E.prop[i], fila = h('div', { cls: 'prop' + (aislada ? ' sola' : '') });
  const mt = miTurno();
  fila.appendChild(h('div', { cls: 'pn' }, cs.tipo === 'dest' ? etiquetaCont(cs.grupo) : null, h('b', {}, cs.nombre), h('small', {}, q.c ? ' ' + nivelTxt(q.c) : '', q.h ? ' · hipotecado' : '')));
  const acc = h('div', { cls: 'pa' });
  const r = (t, fn, txt, cls) => { const m = mt ? fn() : 'No es tu turno'; acc.appendChild(boton(txt, () => X.accion({ t, i }), cls || 'sec', { disabled: !!m, title: m || '' })); return m; };
  if (cs.tipo === 'dest') {
    r('construir', () => puedeConstruir(E, X.yo, i), '+ ' + NIVELES_EDIF[Math.min(4, q.c + 1)] + ' ' + dinero(costoEdif(i)));
    if (q.c > 0) r('vender', () => puedeVender(E, X.yo, i), '− Vender ' + dinero(Math.floor(costoEdif(i) / 2)));
  }
  if (q.h) r('deshipotecar', () => puedeDeshipotecar(E, X.yo, i), 'Deshipotecar ' + dinero(costoDeshipoteca(E, i)));
  else r('hipotecar', () => puedeHipotecar(E, X.yo, i), 'Hipotecar +' + dinero(valorHipoteca(E, i)));
  fila.appendChild(acc); return fila;
}
export function abrirPropiedades() {
  abrirHoja({ id: 'props', titulo: 'Mis destinos', ancha: true, render: (c) => {
    const E = X.E, mis = propsDe(E, X.yo);
    c.appendChild(h('p', { cls: 'peq' }, 'Construir requiere ' + E.cfg.dominio + ' destinos del mismo continente' + (E.cfg.construccionPareja ? ' · construcción pareja' : '') + (miTurno() ? '' : ' · solo puedes construir e hipotecar en tu turno')));
    if (!mis.length) { c.appendChild(h('p', {}, 'Aún no tienes destinos. Compra al caer en uno libre o gana subastas.')); return; }
    CONTINENTES.forEach((g) => {
      const l = POR_CONT[g.id].filter((i) => E.prop[i].o === X.yo); if (!l.length) return;
      c.appendChild(h('h3', {}, etiquetaCont(g.id), ' ' + g.nombre + (dominio(E, g.id, X.yo) ? ' · dominio' : '') + ' · ' + l.length + '/4'));
      l.forEach((i) => c.appendChild(filaPropiedad(i)));
    });
    const otros = mis.filter((i) => CASILLAS[i].tipo === 'trans');
    if (otros.length) { c.appendChild(h('h3', {}, 'Aeropuertos, trenes y puertos')); otros.forEach((i) => c.appendChild(filaPropiedad(i))); }
  } });
}

/* ---------- pasaporte ---------- */
let pasaporteDe = -1;
export function abrirPasaporte(j) {
  pasaporteDe = j != null ? j : (X.yo >= 0 ? X.yo : 0);
  abrirHoja({ id: 'pasaporte', titulo: () => 'Pasaporte de ' + (pasaporteDe === X.yo ? 'tu cuenta' : X.E.jug[pasaporteDe].nombre), ancha: true, render: (c) => {
    const E = X.E, p = E.jug[pasaporteDe];
    c.appendChild(h('p', {}, 'Sellos ', h('b', {}, p.sellos.length + ' / ' + DESTINOS.length), E.cfg.metaSellos ? ' · meta ' + E.cfg.metaSellos : '', ' · cada sello +' + dinero(E.cfg.bonoSello) + ', continente completo +' + dinero(E.cfg.bonoContinente) + ' y visa (−25% renta).'));
    CONTINENTES.forEach((g) => {
      const ok = tieneVisa(E, g.id, pasaporteDe);
      c.appendChild(h('h3', {}, etiquetaCont(g.id), ' ' + g.nombre, ok ? h('span', { cls: 'tag' }, 'Visa') : null));
      c.appendChild(h('div', { cls: 'sellos' }, POR_CONT[g.id].map((i) => { const tiene = p.sellos.includes(i);
        return h('div', { cls: 'sello' + (tiene ? ' on' : ''), style: '--c:' + colorCont(g.id) }, h('b', {}, tiene ? '🛂' : '○'), h('span', {}, CASILLAS[i].nombre), h('small', {}, tiene ? 'visitado' : CASILLAS[i].famoso)); })));
    });
    c.appendChild(h('div', { cls: 'fila' }, boton('◀', () => { pasaporteDe = (pasaporteDe + E.jug.length - 1) % E.jug.length; refrescarHojas(['pasaporte']); }, 'sec', { 'aria-label': 'Jugador anterior' }),
      boton('▶', () => { pasaporteDe = (pasaporteDe + 1) % E.jug.length; refrescarHojas(['pasaporte']); }, 'sec', { 'aria-label': 'Jugador siguiente' })));
  } });
}

export function cambiarPasaporte(d) { if (!hojaAbierta('pasaporte')) return; const n = X.E.jug.length; pasaporteDe = (pasaporteDe + d + n) % n; refrescarHojas(['pasaporte']); }

/* ---------- rutas ---------- */
let usarPase = false;
export function abrirRutas() {
  abrirHoja({ id: 'rutas', titulo: 'Rutas de viaje', ancha: true, render: (c) => {
    const E = X.E; if (E.fase !== 'viaje' || E.turno !== X.yo) { c.appendChild(h('p', { cls: 'peq' }, 'Ahora no hay rutas disponibles.')); return; }
    const me = E.jug[X.yo], cs = CASILLAS[me.pos], M = MODOS_RUTA[cs.modo], rs = rutasDe(E, X.yo);
    c.appendChild(h('p', {}, h('b', {}, M.icono + ' ' + cs.nombre), ': ' + M.desc));
    if (me.tarj.length) c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, 'Usar pase de viaje (' + me.tarj.length + ')'), h('div', { cls: 'ctl' }, boton(usarPase ? 'Sí' : 'No', () => { usarPase = !usarPase; refrescarHojas(['rutas']); }, usarPase ? 'on' : '', { 'aria-pressed': usarPase, 'data-k': 'pase' }))));
    if (rs.some((r) => r.bloq)) c.appendChild(h('p', { cls: 'tag mal' }, 'Esta ruta está cerrada por un evento mundial.'));
    const lista = h('div', { cls: 'rutas' });
    rs.forEach((r) => {
      const t = CASILLAS[r.a], q = E.prop[r.a];
      let est = '';
      if (q) est = q.o < 0 ? 'libre ' + dinero(t.precio) : (q.o === X.yo ? 'tuyo' : 'de ' + nombre(q.o) + ' · renta ' + dinero(calcularRenta(E, r.a, X.yo))); else est = ({ salida: 'cobras sueldo', libre: 'bote ' + dinero(E.bote), retencion: 'solo visita', impuesto: 'tasa ' + dinero(t.monto || 0) }[t.tipo]) || 'carta';
      const sello = t.tipo === 'dest' && !me.sellos.includes(r.a) ? ' 🛂' : '';
      const costo = usarPase && me.tarj.length && r.costo > 0 ? 0 : r.costo, no = r.bloq ? 'Ruta cerrada' : (costo > me.din ? 'No te alcanza' : '');
      lista.appendChild(boton([t.tipo === 'dest' ? etiquetaCont(t.grupo) : h('i', { cls: 'grp neutro' }), h('b', {}, t.nombre + sello), h('small', {}, est), h('em', {}, costo ? dinero(costo) : 'gratis')],
        () => X.accion({ t: 'viajar', a: r.a, pase: usarPase && me.tarj.length > 0 }), 'ruta', { disabled: !!no, title: no, 'data-k': 'r' + r.a }));
    });
    c.appendChild(lista);
    c.appendChild(h('div', { cls: 'fila' }, boton('Quedarme aquí', () => { X.accion({ t: 'noViajar' }); cerrarHojaId('rutas'); }, 'sec', { 'data-pref': 1 })));
  } });
}

/* ---------- subasta ---------- */
export function abrirSubasta() {
  abrirHoja({ id: 'subasta', titulo: 'Subasta', sinCerrar: false, render: (c) => {
    const E = X.E, s = E.subasta; if (!s) { cerrarHojaId('subasta'); return; }
    const cs = CASILLAS[s.i], mi = s.turnoPuja === X.yo;
    if (cs.tipo === 'dest') c.appendChild(h('div', { cls: 'banda', style: 'background:' + colorCont(cs.grupo) }, cs.nombre));
    else c.appendChild(h('div', { cls: 'banda neutro' }, cs.nombre));
    c.appendChild(h('p', {}, 'Precio de lista ', h('b', {}, dinero(cs.precio)), ' · Puja actual: ', h('b', {}, s.lider >= 0 ? dinero(s.monto) + ' (' + nombre(s.lider) + ')' : 'ninguna')));
    c.appendChild(h('p', { cls: 'peq' }, 'Pasaron: ' + (s.pasaron.map((k) => nombre(k)).join(', ') || 'nadie') + '. Turno de: ' + nombre(s.turnoPuja) + '.'));
    if (mi) {
      const din = E.jug[X.yo].din, min = s.monto + 1, f = h('div', { cls: 'fila' });
      [10, 50, 100].forEach((d) => { const m = s.monto + d; f.appendChild(boton('+' + d + ' → ' + dinero(m), () => X.accion({ t: 'pujar', m }), 'prim', { disabled: m > din })); });
      c.appendChild(f);
      const inp = h('input', { type: 'number', min, max: din, value: Math.min(din, Math.max(min, Math.round(cs.precio * 0.6))), 'data-f': 1, 'aria-label': 'Tu puja' });
      c.appendChild(h('div', { cls: 'fila' }, inp, boton('Pujar', () => X.accion({ t: 'pujar', m: Math.floor(+inp.value) }), 'prim'), boton('Pasar', () => X.accion({ t: 'pasarPuja' }), 'mal')));
      c.appendChild(h('p', { cls: 'peq' }, 'Tu efectivo: ' + dinero(din)));
    } else c.appendChild(h('p', {}, 'Esperando a ' + nombre(s.turnoPuja) + '…'));
  } });
}

/* ---------- registro y chat ---------- */
export function abrirRegistro() {
  abrirHoja({ id: 'registro', titulo: 'Historial y eventos', ancha: true, render: (c) => {
    const ev = X.E.eventos;
    c.appendChild(h('p', { cls: 'peq' }, ev.length ? 'Eventos activos: ' + ev.map((v) => EVENTOS[v.tipo].icono + ' ' + EVENTOS[v.tipo].nombre + (v.cont >= 0 ? ' (' + CONTINENTES[v.cont].nombre + ')' : '') + ' ' + Math.max(1, v.hasta - X.E.ronda) + ' ronda(s)').join(' · ') : 'Sin eventos mundiales activos. Ronda ' + X.E.ronda + '.'));
    const l = h('ol', { cls: 'registro' });
    X.E.log.slice().reverse().forEach((x) => l.appendChild(h('li', {}, x)));
    c.appendChild(l);
  } });
}
export const mensajes = [];
export function abrirChat() {
  X.noLeidos = 0;
  abrirHoja({ id: 'chat', titulo: 'Chat', render: (c) => {
    const log = h('div', { cls: 'chatlog', role: 'log' });
    mensajes.slice(-40).forEach((m) => log.appendChild(h('div', {}, h('b', { style: 'color:' + m.color }, m.nombre + ': '), m.texto)));
    c.appendChild(log); setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
    const frases = ['¡Buen viaje!', '¡Qué suerte!', 'Hmm…', '¡Vamos!', 'Tu turno', 'GG'], emojis = ['😀', '😅', '😭', '😡', '🤝', '💰', '✈', '🎲', '👏', '🔥'];
    c.appendChild(h('div', { cls: 'chips' }, frases.map((f) => boton(f, () => X.enviarChat(f), 'chip'))));
    c.appendChild(h('div', { cls: 'chips' }, emojis.map((f) => boton(f, () => X.enviarChat(f), 'chip emoji', { 'aria-label': 'Emoji ' + f }))));
    const inp = h('input', { type: 'text', maxlength: 120, placeholder: 'Escribe un mensaje', 'data-f': 1, 'aria-label': 'Mensaje' });
    const enviar = () => { if (inp.value.trim()) { X.enviarChat(inp.value.trim()); inp.value = ''; } };
    inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') enviar(); });
    c.appendChild(h('div', { cls: 'fila' }, inp, boton('Enviar', enviar, 'prim')));
  } });
}

/* ---------- carta y fin ---------- */
let tCarta = 0;
export function mostrarCarta(k, texto, j) {
  const el = document.getElementById('carta'); if (!el) return;
  el.className = 'v ' + ({ v: 'viaje', a: 'aduana', s: 'suerte' }[k] || 'suerte'); el.textContent = '';
  el.append(h('small', {}, NOMBRE_MAZO[k] + ' · ' + nombre(j)), h('p', {}, texto));
  clearTimeout(tCarta); tCarta = setTimeout(() => { el.className = ''; }, 2600);
  el.onclick = () => { el.className = ''; };
}
export function abrirFin() {
  abrirHoja({ id: 'fin', titulo: 'Fin de la partida', ancha: true, sinCerrar: true, render: (c) => {
    const E = X.E;
    c.appendChild(h('p', { cls: 'grande' }, E.ganador === X.yo ? '🏆 ¡Ganaste!' : 'Gana ' + E.jug[E.ganador].nombre, E.motivoFin === 'tiempo' ? ' (por patrimonio y sellos al acabar el tiempo)' : E.motivoFin === 'sellos' ? ' (pasaporte completo)' : ''));
    const ol = h('ol', { cls: 'ranking' });
    E.ranking.forEach((r) => ol.appendChild(h('li', {}, punto(col(r.id)), h('b', {}, E.jug[r.id].nombre), ' ', dinero(r.pat), ' · 🛂' + r.sellos, r.quebrado ? ' · bancarrota' : '')));
    c.appendChild(ol);
    c.appendChild(h('div', { cls: 'fila' }, boton('Volver al menú', () => X.alMenu(), 'prim', { 'data-pref': 1 }), X.modo === 'solo' ? boton('Revancha', () => X.revancha(), 'sec') : null));
    if (usuario()) { c.appendChild(h('h3', {}, '🥇 Ranking')); panelRanking(c); }
  } });
}
