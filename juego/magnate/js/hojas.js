// Paneles (hojas): casilla, jugador, propiedades, tratos, subasta, registro, chat, carta y fin de partida.
import { X, dinero } from './contexto.js';
import { h, boton, abrirHoja, cerrarHojaId, refrescarHojas, hojaAbierta } from './dom.js';
import { CASILLAS, GRUPOS, POR_GRUPO } from './datos.js';
import { propsDe, puedeConstruir, puedeVender, puedeHipotecar, puedeDeshipotecar, valorHipoteca, costoDeshipoteca, grupoCompleto } from './reglas.js';
import { A } from './ajustes.js';

const col = (j) => (X.E.jug[j] ? X.E.jug[j].color : '#888');
const nombre = (j) => (j === X.yo ? 'Tú' : X.E.jug[j].nombre);
const miTurno = () => X.E && X.E.turno === X.yo && X.E.fase !== 'fin_partida';
const punto = (c) => h('i', { cls: 'pt', style: 'background:' + c });
export function etiquetaGrupo(g) { return h('span', { cls: 'grp', style: 'background:' + GRUPOS[g].color }, A.simbolos ? GRUPOS[g].sim : ''); }

/* ---------- casilla ---------- */
export function abrirCasilla(i) {
  X.cursor = i; if (X.tablero) X.tablero.cursor(i);
  abrirHoja({ id: 'casilla', titulo: CASILLAS[i].nombre, render: (c) => renderCasilla(c, i) });
}
function renderCasilla(c, i) {
  const E = X.E, cs = CASILLAS[i], q = E.prop[i];
  if (cs.grupo != null) c.appendChild(h('div', { cls: 'banda', style: 'background:' + GRUPOS[cs.grupo].color }, GRUPOS[cs.grupo].nombre + (A.simbolos ? ' · ' + GRUPOS[cs.grupo].sim : '')));
  const info = h('div', { cls: 'info' });
  if (q) {
    info.appendChild(h('p', {}, 'Precio: ', h('b', {}, dinero(cs.precio)), ' · Hipoteca: ', h('b', {}, dinero(valorHipoteca(E, i)))));
    info.appendChild(h('p', {}, 'Dueño: ', q.o < 0 ? h('b', {}, 'Banco (libre)') : h('b', {}, punto(col(q.o)), nombre(q.o)), q.h ? h('span', { cls: 'tag mal' }, 'Hipotecada') : null));
  }
  if (cs.tipo === 'prop') {
    const t = h('table', { cls: 'renta' });
    const filas = [['Renta', cs.renta[0]], ['Barrio completo (sin casas)', cs.renta[0] * 2], ['1 casa', cs.renta[1]], ['2 casas', cs.renta[2]], ['3 casas', cs.renta[3]], ['4 casas', cs.renta[4]], ['Hotel', cs.renta[5]]];
    filas.forEach((f, k) => t.appendChild(h('tr', { cls: q && ((k === 0 && q.c === 0) || (k >= 2 && q.c === k - 1)) ? 'act' : '' }, h('td', {}, f[0]), h('td', {}, dinero(f[1])))));
    info.appendChild(t);
    info.appendChild(h('p', { cls: 'peq' }, 'Cada casa u hotel cuesta ' + dinero(GRUPOS[cs.grupo].casa) + '. Edificios: ' + (q.c === 5 ? 'hotel' : q.c + ' casa(s)') + '.'));
  } else if (cs.tipo === 'estacion') info.appendChild(h('p', { cls: 'peq' }, 'Renta: 25 con una, 50 con dos, 100 con tres y 200 con las cuatro estaciones/aeropuertos.'));
  else if (cs.tipo === 'servicio') info.appendChild(h('p', { cls: 'peq' }, 'Renta: 4 veces los dados con un servicio, 10 veces con los dos.'));
  else {
    const d = { salida: 'Al pasar cobras tu sueldo (' + dinero(E.cfg.sueldo) + ')' + (E.cfg.bonoSalida ? '; si caes exacto, otro tanto.' : '.'),
      carcel: 'Solo de visita, o preso si te enviaron. Sales con dobles, pagando ' + dinero(E.cfg.multaCarcel) + ' o con una tarjeta.',
      libre: E.cfg.bote ? 'Te llevas el bote acumulado: ' + dinero(E.bote) + '.' : 'Descanso sin efecto.', ircarcel: 'Vas directo a la cárcel sin cobrar sueldo.',
      suerte: 'Roba una carta de Suerte.', comunidad: 'Roba una carta de Comunidad.', impuesto: 'Pagas ' + dinero(cs.monto || 0) + '.' };
    info.appendChild(h('p', {}, d[cs.tipo] || ''));
  }
  c.appendChild(info);
  if (q && q.o >= 0 && q.o !== X.yo) {
    c.appendChild(h('div', { cls: 'fila' }, boton('Proponer trato por esta', () => { cerrarHojaId('casilla'); abrirTratos({ con: q.o, pide: [i] }); }, 'sec')));
  }
  if (q && q.o === X.yo) c.appendChild(filaPropiedad(i, true));
}

/* ---------- jugador ---------- */
export function abrirJugador(j) {
  X.seleccion.jugador = j;
  abrirHoja({ id: 'jugador', titulo: () => X.E.jug[X.seleccion.jugador].nombre, render: renderJugador });
}
function desglose(E, j) {
  const p = E.jug[j]; let prop = 0, edif = 0;
  propsDe(E, j).forEach((i) => { const q = E.prop[i]; prop += q.h ? valorHipoteca(E, i) : CASILLAS[i].precio; if (CASILLAS[i].grupo != null) edif += q.c * GRUPOS[CASILLAS[i].grupo].casa; });
  return { din: p.din, prop, edif, total: p.din + prop + edif };
}
export function barraPatrimonio(E) {
  const filas = E.jug.map((p) => ({ p, d: p.quebrado ? { din: 0, prop: 0, edif: 0, total: 0 } : desglose(E, p.id) }));
  const max = Math.max(1, ...filas.map((f) => f.d.total));
  const box = h('div', { cls: 'patri' });
  filas.forEach(({ p, d }) => {
    box.appendChild(h('div', { cls: 'pfila' + (p.quebrado ? ' quebrado' : '') },
      h('span', { cls: 'pn' }, punto(p.color), p.id === X.yo ? 'Tú' : p.nombre),
      h('span', { cls: 'pb', title: 'Efectivo ' + d.din + ' · Propiedades ' + d.prop + ' · Edificios ' + d.edif },
        h('i', { cls: 'e', style: 'width:' + (d.din / max * 100) + '%' }), h('i', { cls: 'p', style: 'width:' + (d.prop / max * 100) + '%' }), h('i', { cls: 'f', style: 'width:' + (d.edif / max * 100) + '%' })),
      h('b', {}, dinero(d.total))));
  });
  box.appendChild(h('p', { cls: 'peq' }, 'Barras: efectivo (dorado), propiedades (azul), edificios (verde).'));
  return box;
}
function renderJugador(c) {
  const E = X.E, j = X.seleccion.jugador, p = E.jug[j], d = desglose(E, j);
  c.appendChild(h('p', {}, punto(p.color), h('b', {}, p.nombre), p.tipo === 'bot' ? h('span', { cls: 'tag' }, 'Bot ' + ['conservador', 'medio', 'agresivo'][p.nivel]) : null, p.quebrado ? h('span', { cls: 'tag mal' }, 'En bancarrota') : null, p.carcel ? h('span', { cls: 'tag mal' }, 'En la cárcel') : null));
  c.appendChild(h('p', {}, 'Efectivo ', h('b', {}, dinero(p.din)), ' · Patrimonio ', h('b', {}, dinero(d.total)), p.tarj.length ? ' · Tarjetas de cárcel: ' + p.tarj.length : ''));
  const l = propsDe(E, j);
  if (l.length) {
    const ul = h('div', { cls: 'chips' });
    l.forEach((i) => ul.appendChild(boton([CASILLAS[i].grupo != null ? etiquetaGrupo(CASILLAS[i].grupo) : h('i', { cls: 'grp neutro' }), CASILLAS[i].nombre, E.prop[i].c ? ' ' + (E.prop[i].c === 5 ? '🏨' : '🏠'.repeat(E.prop[i].c)) : '', E.prop[i].h ? ' (hip.)' : ''], () => abrirCasilla(i), 'chip')));
    c.appendChild(ul);
  } else c.appendChild(h('p', { cls: 'peq' }, 'Aún sin propiedades.'));
  c.appendChild(h('div', { cls: 'fila' }, j !== X.yo && !p.quebrado && X.yo >= 0 && !E.jug[X.yo].quebrado ? boton('Proponer trato', () => { cerrarHojaId('jugador'); abrirTratos({ con: j }); }, 'prim') : null,
    boton('◀', () => cambiarJugador(-1), 'sec', { 'aria-label': 'Jugador anterior' }), boton('▶', () => cambiarJugador(1), 'sec', { 'aria-label': 'Jugador siguiente' })));
  c.appendChild(h('h3', {}, 'Patrimonio en vivo')); c.appendChild(barraPatrimonio(E));
}
export function cambiarJugador(d) {
  const n = X.E.jug.length; X.seleccion.jugador = (X.seleccion.jugador + d + n) % n;
  const s = hojaAbierta('jugador'); if (s) refrescarHojas(['jugador']);
}

/* ---------- propiedades (construir / hipotecar) ---------- */
function filaPropiedad(i, aislada) {
  const E = X.E, cs = CASILLAS[i], q = E.prop[i], fila = h('div', { cls: 'prop' + (aislada ? ' sola' : '') });
  const mt = miTurno();
  fila.appendChild(h('div', { cls: 'pn' }, cs.grupo != null ? etiquetaGrupo(cs.grupo) : null, h('b', {}, cs.nombre), h('small', {}, q.c ? (q.c === 5 ? ' hotel' : ' ' + q.c + ' casa(s)') : '', q.h ? ' · hipotecada' : '')));
  const acc = h('div', { cls: 'pa' });
  const r = (t, fn, txt, cls) => { const m = mt ? fn() : 'No es tu turno'; acc.appendChild(boton(txt, () => X.accion({ t, i }), cls || 'sec', { disabled: !!m, title: m || '' })); return m; };
  if (cs.tipo === 'prop') {
    r('construir', () => puedeConstruir(E, X.yo, i), '+ ' + (q.c === 4 ? 'Hotel' : 'Casa') + ' ' + dinero(GRUPOS[cs.grupo].casa));
    if (q.c > 0) r('vender', () => puedeVender(E, X.yo, i), '− Vender ' + dinero(Math.floor(GRUPOS[cs.grupo].casa / 2)));
  }
  if (q.h) r('deshipotecar', () => puedeDeshipotecar(E, X.yo, i), 'Deshipotecar ' + dinero(costoDeshipoteca(E, i)));
  else r('hipotecar', () => puedeHipotecar(E, X.yo, i), 'Hipotecar +' + dinero(valorHipoteca(E, i)));
  fila.appendChild(acc); return fila;
}
export function abrirPropiedades() {
  abrirHoja({ id: 'props', titulo: 'Mis propiedades', ancha: true, render: (c) => {
    const E = X.E, mis = propsDe(E, X.yo);
    c.appendChild(h('p', { cls: 'peq' }, 'Casas libres: ' + E.casasBanco + ' · Hoteles libres: ' + E.hotelesBanco + (E.cfg.construccionPareja ? ' · Construcción pareja activa' : '') + (miTurno() ? '' : ' · Solo puedes construir e hipotecar en tu turno')));
    if (!mis.length) { c.appendChild(h('p', {}, 'Aún no tienes propiedades. Compra al caer en una casilla libre o gana subastas.')); return; }
    GRUPOS.forEach((g) => {
      const l = POR_GRUPO[g.id].filter((i) => E.prop[i].o === X.yo); if (!l.length) return;
      c.appendChild(h('h3', {}, etiquetaGrupo(g.id), ' ' + g.nombre + (grupoCompleto(E, g.id, X.yo) ? ' · barrio completo' : ' · ' + l.length + '/' + POR_GRUPO[g.id].length)));
      l.forEach((i) => c.appendChild(filaPropiedad(i)));
    });
    const otros = mis.filter((i) => CASILLAS[i].grupo == null);
    if (otros.length) { c.appendChild(h('h3', {}, 'Estaciones y servicios')); otros.forEach((i) => c.appendChild(filaPropiedad(i))); }
  } });
}

/* ---------- tratos ---------- */
const nuevo = () => ({ din: 0, props: [], tarj: 0 });
let borrador = null;
export function abrirTratos(pre) {
  if (X.yo < 0 || X.E.jug[X.yo].quebrado) return;
  if (!borrador || pre) borrador = { con: pre && pre.con != null ? pre.con : -1, ofrece: nuevo(), pide: Object.assign(nuevo(), { props: (pre && pre.pide) || [] }) };
  abrirHoja({ id: 'tratos', titulo: 'Intercambios', ancha: true, render: renderTratos });
}
function renderTratos(c) {
  const E = X.E, t = E.trato;
  if (t) {
    const resumen = (o) => [o.din ? dinero(o.din) : null, ...o.props.map((i) => CASILLAS[i].nombre), o.tarj ? o.tarj + ' tarjeta(s) de cárcel' : null].filter(Boolean).join(', ') || 'nada';
    c.appendChild(h('div', { cls: 'trato' }, h('p', {}, h('b', {}, nombre(t.de)), ' ofrece: ', resumen(t.ofrece)), h('p', {}, 'a cambio de lo que tiene ', h('b', {}, nombre(t.a)), ': ', resumen(t.pide))));
    if (t.a === X.yo) c.appendChild(h('div', { cls: 'fila' }, boton('Aceptar', () => X.accion({ t: 'tratoResponder', ok: true }), 'prim', { 'data-pref': 1 }), boton('Rechazar', () => X.accion({ t: 'tratoResponder', ok: false }), 'mal')));
    else if (t.de === X.yo) c.appendChild(h('div', { cls: 'fila' }, h('span', { cls: 'peq' }, 'Esperando respuesta de ' + nombre(t.a) + '…'), boton('Retirar', () => X.accion({ t: 'tratoCancelar' }), 'sec')));
    else c.appendChild(h('p', { cls: 'peq' }, 'Trato entre otros jugadores.'));
    return;
  }
  const b = borrador || (borrador = { con: -1, ofrece: nuevo(), pide: nuevo() });
  c.appendChild(h('p', { cls: 'peq' }, 'Elige con quién negociar. Puedes intercambiar dinero, propiedades (sin edificios en su barrio) y tarjetas de cárcel. La otra persona debe aceptar.'));
  const con = h('div', { cls: 'chips' });
  E.jug.forEach((p) => { if (p.id === X.yo || p.quebrado) return; con.appendChild(boton([punto(p.color), p.nombre], () => { b.con = p.id; b.pide = nuevo(); refrescarHojas(['tratos']); }, 'chip' + (b.con === p.id ? ' on' : ''), { 'data-k': 'c' + p.id })); });
  c.appendChild(con);
  if (b.con < 0) return;
  const lado = (tit, j, o) => {
    const P = E.jug[j], box = h('div', { cls: 'lado' }, h('h3', {}, tit));
    const inp = h('input', { type: 'number', min: 0, max: P.din, step: 10, value: o.din, 'data-f': 1, 'data-k': 'in' + j, 'aria-label': 'Dinero de ' + P.nombre });
    inp.addEventListener('input', () => { o.din = Math.max(0, Math.min(P.din, Math.floor(+inp.value || 0))); });
    const paso = (d) => boton((d > 0 ? '+' : '') + d, () => { o.din = Math.max(0, Math.min(P.din, o.din + d)); refrescarHojas(['tratos']); }, 'sec peq');
    box.appendChild(h('div', { cls: 'din' }, 'Dinero (máx ' + dinero(P.din) + ') ', inp, paso(-100), paso(-10), paso(10), paso(100)));
    const ls = propsDe(E, j);
    if (ls.length) { const g = h('div', { cls: 'chips' }); ls.forEach((i) => { const on = o.props.includes(i); g.appendChild(boton([CASILLAS[i].grupo != null ? etiquetaGrupo(CASILLAS[i].grupo) : h('i', { cls: 'grp neutro' }), CASILLAS[i].nombre + (E.prop[i].h ? ' (hip.)' : '')], () => { o.props = on ? o.props.filter((k) => k !== i) : o.props.concat(i); refrescarHojas(['tratos']); }, 'chip' + (on ? ' on' : ''), { 'data-k': 'p' + i, 'aria-pressed': on })); }); box.appendChild(g); } else box.appendChild(h('p', { cls: 'peq' }, 'Sin propiedades.'));
    if (P.tarj.length) box.appendChild(h('div', { cls: 'din' }, 'Tarjetas de cárcel: ', boton('−', () => { o.tarj = Math.max(0, o.tarj - 1); refrescarHojas(['tratos']); }, 'sec peq'), h('b', {}, o.tarj), boton('+', () => { o.tarj = Math.min(P.tarj.length, o.tarj + 1); refrescarHojas(['tratos']); }, 'sec peq')));
    return box;
  };
  c.appendChild(h('div', { cls: 'lados' }, lado('Tú ofreces', X.yo, b.ofrece), lado('Pides a ' + E.jug[b.con].nombre, b.con, b.pide)));
  c.appendChild(h('div', { cls: 'fila' }, boton('Enviar propuesta', () => { X.accion({ t: 'tratoProponer', a: b.con, ofrece: b.ofrece, pide: b.pide }); borrador = { con: b.con, ofrece: nuevo(), pide: nuevo() }; }, 'prim'), boton('Limpiar', () => { borrador = { con: b.con, ofrece: nuevo(), pide: nuevo() }; refrescarHojas(['tratos']); }, 'sec')));
}

export function cambiarSocio(d) {
  if (!borrador) return;
  const l = X.E.jug.filter((p) => p.id !== X.yo && !p.quebrado).map((p) => p.id); if (!l.length) return;
  const k = l.indexOf(borrador.con); borrador = { con: l[(k + d + l.length * 2) % l.length], ofrece: nuevo(), pide: nuevo() }; refrescarHojas(['tratos']);
}

/* ---------- subasta ---------- */
export function abrirSubasta() {
  abrirHoja({ id: 'subasta', titulo: 'Subasta', sinCerrar: false, render: (c) => {
    const E = X.E, s = E.subasta; if (!s) { cerrarHojaId('subasta'); return; }
    const cs = CASILLAS[s.i], mi = s.turnoPuja === X.yo;
    if (cs.grupo != null) c.appendChild(h('div', { cls: 'banda', style: 'background:' + GRUPOS[cs.grupo].color }, cs.nombre));
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
  abrirHoja({ id: 'registro', titulo: 'Historial', ancha: true, render: (c) => {
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
    const frases = ['¡Buen trato!', '¡Qué suerte!', 'Hmm…', '¡Vamos!', 'Tu turno', 'GG'], emojis = ['😀', '😅', '😭', '😡', '🤝', '💰', '🏠', '🎲', '👏', '🔥'];
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
  el.className = 'v ' + (k === 's' ? 'suerte' : 'comunidad'); el.textContent = '';
  el.append(h('small', {}, (k === 's' ? 'SUERTE' : 'COMUNIDAD') + ' · ' + nombre(j)), h('p', {}, texto));
  clearTimeout(tCarta); tCarta = setTimeout(() => { el.className = ''; }, 2600);
  el.onclick = () => { el.className = ''; };
}
export function abrirFin() {
  abrirHoja({ id: 'fin', titulo: 'Fin de la partida', ancha: true, sinCerrar: true, render: (c) => {
    const E = X.E;
    c.appendChild(h('p', { cls: 'grande' }, E.ganador === X.yo ? '🏆 ¡Ganaste!' : 'Gana ' + E.jug[E.ganador].nombre, E.motivoFin === 'tiempo' ? ' (por patrimonio al acabar el tiempo)' : ''));
    const ol = h('ol', { cls: 'ranking' });
    E.ranking.forEach((r) => ol.appendChild(h('li', {}, punto(col(r.id)), h('b', {}, E.jug[r.id].nombre), ' ', dinero(r.pat), r.quebrado ? ' · bancarrota' : '')));
    c.appendChild(ol);
    c.appendChild(h('div', { cls: 'fila' }, boton('Volver al menú', () => X.alMenu(), 'prim'), X.modo === 'solo' ? boton('Revancha', () => X.revancha(), 'sec') : null));
  } });
}
