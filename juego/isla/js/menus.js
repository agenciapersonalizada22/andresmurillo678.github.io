// Paneles de menu: modal base, preparar partida, tienda, logros/estadisticas, ayuda, ranking, pausa y resultados.
import { h, fmt } from './dom.js';
import { abrirCapa, cerrarCapa } from './nav.js';
import { G } from './estado.js';
import { SKINS, esMovil } from './almacen.js';
import { DIFICULTADES } from './bots.js';
import { LOGROS, comprar, equipar, aviso, monedasDe } from './progreso.js';
import * as CI from './cuenta-isla.js';
const abiertos = [];
export function hayModal() { return abiertos.length > 0; }
export function modal(titulo, kids, o = {}) {
  const cuerpo = h('div', { cls: 'cuerpo' }, kids), raiz = h('div', { cls: 'modal' + (o.cls ? ' ' + o.cls : ''), role: 'dialog', 'aria-label': titulo });
  const api = { el: raiz, cuerpo, cerrar() { if (!raiz.isConnected) return; removeEventListener('keydown', esc, true); raiz.remove(); cerrarCapa(raiz); const i = abiertos.indexOf(api); if (i >= 0) abiertos.splice(i, 1); o.alCerrar && o.alCerrar(); } };
  const esc = (e) => { if (e.key === 'Escape' && abiertos[abiertos.length - 1] === api && !o.sinEsc) { e.stopPropagation(); api.cerrar(); } };
  addEventListener('keydown', esc, true);
  raiz.appendChild(h('div', { cls: 'caja' }, [h('div', { cls: 'cab' }, [h('h2', { txt: titulo }), o.sinCerrar ? null : h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, 'data-back': 1, txt: 'Cerrar', on: { click: api.cerrar } })]), cuerpo]));
  document.body.appendChild(raiz); abiertos.push(api); abrirCapa(raiz, o.sinCerrar ? null : api.cerrar);
  return api;
}
export function cerrarTodos() { [...abiertos].reverse().forEach((a) => a.cerrar()); }
const seg = (op, val, fn) => h('div', { cls: 'seg', role: 'group' }, op.map(([v, n]) => h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, 'aria-pressed': String(v === val), txt: n, on: { click: (e) => { [...e.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', 'false')); e.target.setAttribute('aria-pressed', 'true'); fn(v); } } })));
export const figura = (s, color) => h('div', { cls: 'figura', style: `--c1:${s.c1 || color || '#3df5ff'};--c2:${s.c2};--c3:${s.c3}` }, [h('i', { cls: 'f-cab' + (s.robot ? ' robot' : '') }), h('i', { cls: 'f-tor' }), h('i', { cls: 'f-pie' }), s.acc ? h('i', { cls: 'f-acc ' + s.acc }) : null]);

export function panelSetup(modo, prefs, alComenzar, esMP) {
  const tit = { solitario: 'Solitario', duos: 'Dúos', creativo: 'Creativo / práctica de construcción' }[modo];
  const kids = [];
  if (modo !== 'creativo') {
    kids.push(h('p', { cls: 'nota', txt: modo === 'duos' ? 'Tu compañero será un bot (o un amigo en multijugador). Gana el último dúo en pie.' : 'Todos contra todos: gana el último en pie.' }));
    kids.push(h('div', { cls: 'fila col' }, [h('span', { txt: 'Dificultad de los bots' }), seg(Object.keys(DIFICULTADES).map((k) => [k, DIFICULTADES[k].n]), prefs.dif, (v) => { prefs.dif = v; })]));
    kids.push(h('div', { cls: 'fila col' }, [h('span', { txt: 'Participantes (con bots)' }), seg([[12, '12'], [20, '20'], [30, '30']], prefs.total, (v) => { prefs.total = v; })]));
  } else kids.push(h('p', { cls: 'nota', txt: 'Isla tranquila con materiales infinitos, todas las armas y maniquíes. Practica construcción y edición rápida.' }));
  kids.push(h('div', { cls: 'botones' }, [h('button', { type: 'button', cls: 'btn grande inicial', 'data-f': 1, txt: esMP ? 'Abrir sala' : 'Comenzar', on: { click: () => { m.cerrar(); alComenzar(); } } })]));
  const m = modal(tit, kids); return m;
}
export function panelTienda() {
  const p = G.prog, cab = h('p', { cls: 'monedas', txt: 'Monedas: ' + p.monedas }), grid = h('div', { cls: 'tienda' });
  const pintar = () => {
    cab.textContent = 'Monedas: ' + p.monedas; grid.textContent = '';
    SKINS.forEach((s) => {
      const tiene = p.skins.includes(s.id), eq = p.skin === s.id;
      grid.appendChild(h('div', { cls: 'skin' + (eq ? ' eq' : '') }, [figura(s, (JSON.parse(localStorage.getItem('juego_perfil') || '{}')).color), h('b', { txt: s.nombre }),
        h('button', { type: 'button', cls: 'btn peq' + (tiene ? '' : ' sec'), 'data-f': 1, disabled: eq || (!tiene && p.monedas < s.precio) ? 'disabled' : null, txt: eq ? 'Equipada' : tiene ? 'Equipar' : s.precio + ' monedas', on: { click: () => { if (tiene) equipar(s.id); else if (comprar(s.id)) aviso('Compraste ' + s.nombre); pintar(); } } })]));
    });
  };
  pintar(); return modal('Tienda de skins', [cab, h('p', { cls: 'nota', txt: 'Solo monedas virtuales que ganas jugando. Nunca dinero real.' }), grid]);
}
export function panelLogros() {
  const p = G.prog, s = p.stats, fila = (n, v) => h('div', { cls: 'fila' }, [h('span', { txt: n }), h('b', { txt: String(v) })]);
  const st = h('div', { cls: 'stats' }, [fila('Partidas', s.partidas), fila('Victorias', s.victorias), fila('Eliminaciones', s.elims), fila('Mejor partida (bajas)', s.mejorElim), fila('Top 5', s.top5), fila('Mejor puesto', s.mejorPuesto > 98 ? '-' : '#' + s.mejorPuesto), fila('Daño total', Math.round(s.dano)), fila('Piezas construidas', s.piezas), fila('Materiales recolectados', s.mats), fila('Tiempo jugado', fmt(s.tiempo))]);
  const lg = h('div', { cls: 'logros' }, LOGROS.map((l) => h('div', { cls: 'logro' + (p.logros[l.id] ? ' ok' : '') }, [h('b', { txt: (p.logros[l.id] ? '★ ' : '☆ ') + l.nombre }), h('small', { txt: l.desc })])));
  return modal('Logros y estadísticas', [st, h('h3', { txt: 'Logros' }), lg]);
}
export function panelAyuda() {
  const f = (a, b) => h('tr', {}, [h('td', { txt: a }), h('td', { txt: b })]);
  const t = (rows) => h('table', { cls: 'tabla' }, rows.map(([a, b]) => f(a, b)));
  return modal('Cómo jugar', [
    h('p', { txt: 'Salta del bus volador, aterriza, busca armas y cofres, recoge materiales con el pico y construye para sobrevivir. La tormenta se cierra por fases: quédate dentro del círculo blanco. El último en pie gana.' }),
    h('h3', { txt: 'Teclado y ratón' }), t([['WASD / ratón', 'Mover / apuntar'], ['Clic izq. / der.', 'Disparar o golpear / apuntar'], ['Espacio', 'Saltar, lanzarse del bus, abrir planeador'], ['Shift', 'Correr'], ['1-6', 'Pico y armas (R recargar)'], ['E', 'Recoger / abrir cofre'], ['H', 'Curarse o usar escudo'], ['Q / F / C / V', 'Pared / piso / rampa / techo (clic coloca)'], ['B o rueda', 'Cambiar material'], ['G (mantener)', 'Edición rápida: clic en las casillas y suelta G'], ['T + 1-6', 'Emotes'], ['M', 'Mapa grande'], ['Esc', 'Pausa']]),
    h('h3', { txt: 'Mando Xbox' }), t([['Stick izq. / der.', 'Mover / apuntar'], ['RT / LT', 'Disparar / apuntar'], ['A', 'Saltar / lanzarse / planeador'], ['X', 'Recargar'], ['Y', 'Recoger, abrir o curarse'], ['LB / RB', 'Arma anterior / siguiente'], ['Cruceta', 'Pared / piso / rampa / techo'], ['VISTA', 'Cambiar material'], ['R3 (pulsar dos veces)', 'Editar: stick der. y RT, R3 confirma'], ['B', 'Emotes'], ['L3', 'Correr'], ['MENU', 'Pausa']]),
    h('h3', { txt: 'Táctil' }), h('p', { txt: 'Joystick a la izquierda, arrastra a la derecha para mirar, botones Fuego, Salto, Mira, Recarga, Usar, Construir y Curar. Toca las ranuras de arriba para cambiar de arma. En Ajustes puedes cambiar tamaño, opacidad y modo zurdo.' })]);
}
export function panelRanking() {
  const c = h('div', { cls: 'ranking' }); const m = modal('Rankings', [c]); CI.panelRanking(c, { modo: 'victorias' }); return m;
}
export function panelResultados(res, o) {
  const gan = res.gano, ganado = monedasDe(res);
  const kids = [h('p', { cls: 'gran ' + (gan ? 'ok' : 'mal'), txt: gan ? '¡Victoria! Eres el último en pie' : 'Eliminado: puesto #' + res.puesto + ' de ' + res.total }),
    h('div', { cls: 'stats' }, [['Bajas', res.elims], ['Daño', res.dano], ['Tiempo', fmt(res.tiempo)], ['Monedas ganadas', '+' + (res.modo === 'creativo' ? 0 : ganado)]].map(([a, b]) => h('div', { cls: 'fila' }, [h('span', { txt: a }), h('b', { txt: String(b) })])))];
  const bs = [];
  if (o.espectar) bs.push(h('button', { type: 'button', cls: 'btn inicial', 'data-f': 1, txt: 'Seguir espectando', on: { click: () => { m.cerrar(); o.espectar(); } } }));
  if (o.repeticion) bs.push(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Ver repetición del final', on: { click: () => { m.cerrar(); o.repeticion(); } } }));
  if (o.otra) bs.push(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Jugar de nuevo', on: { click: () => { m.cerrar(); o.otra(); } } }));
  bs.push(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Menú principal', on: { click: () => { m.cerrar(); o.menu(); } } }));
  kids.push(h('div', { cls: 'botones' }, bs));
  const m = modal('Fin de la partida', kids, { sinCerrar: true, sinEsc: true }); return m;
}
export function ayudaTactil() { return esMovil(); }
