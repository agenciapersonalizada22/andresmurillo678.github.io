// Interfaz: modales, avisos y dialogos (tienda, logros, estadisticas, torneo, reto, ayuda, ranking).
import { h } from './dom.js';
import { Nav } from './nav.js';
import { A, P, guardarProgreso } from './almacen.js';
import * as PR from './progreso.js';
import * as CH from './cuenta-hockey.js';
import { S } from './sonido.js';
const D = window.HkDatos;

const pila = [];
let cont;
export const UI = { app: null, modalAbierto: () => pila.length > 0 };

export function iniciarUI() { cont = document.getElementById('modales'); PR.aviso.fn = toast; }

export function toast(txt, ms) {
  const t = document.getElementById('toasts'); if (!t) return;
  const e = h('div', { cls: 'toast', txt }); t.appendChild(e); setTimeout(() => e.remove(), ms || 3000);
}

export function modal(titulo, construir, o) {
  o = o || {};
  const cuerpo = h('div', { cls: 'cuerpo' });
  const cerrar = () => { const i = pila.indexOf(api); if (i < 0) return; pila.splice(i, 1); el.remove(); if (pila.length) { pila[pila.length - 1].el.hidden = false; enfocar(); } else { cont.hidden = true; document.body.classList.remove('hay-modal'); } if (o.alCerrar) o.alCerrar(); Nav.refrescar && Nav.refrescar(); };
  const x = o.cerrable === false ? null : h('button', { type: 'button', cls: 'cerrar', 'data-f': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: () => { S.clic(); cerrar(); } } });
  const el = h('div', { cls: 'capa', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [h('div', { cls: 'tarjeta' + (o.ancha ? ' ancha' : '') }, [h('header', {}, [h('h2', { txt: titulo }), x]), cuerpo])]);
  const api = { el, cuerpo, cerrar, cerrable: o.cerrable !== false, titulo };
  if (pila.length) pila[pila.length - 1].el.hidden = true;
  pila.push(api); cont.appendChild(el); cont.hidden = false; document.body.classList.add('hay-modal');
  construir(cuerpo, api);
  enfocar();
  return api;
}
function enfocar() { setTimeout(() => { const l = Nav.lista(); const a = l.find((e) => !e.classList.contains('cerrar')) || l[0]; if (a && (window.Mando && window.Mando.activo)) a.focus(); }, 30); }
export const cerrarTodos = () => { while (pila.length) pila[pila.length - 1].cerrar(); };
export const cerrarTope = () => { const t = pila[pila.length - 1]; if (t && t.cerrable) { t.cerrar(); return true; } return !!t; };
export const capaTope = () => (pila.length ? pila[pila.length - 1].el : null);

/* ---------- componentes ---------- */
export const btn = (txt, fn, cls) => h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: (e) => { S.clic(); fn(e); } } });
export function seg(opciones, valor, alCambiar) {
  const g = h('div', { cls: 'seg', role: 'group' });
  const bs = opciones.map(([v, n]) => { const b = h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: n, 'aria-pressed': String(v === valor), on: { click: () => { S.clic(); bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); alCambiar(v); } } }); return b; });
  bs.forEach((b) => g.appendChild(b)); return g;
}

/* ---------- ayuda ---------- */
export function ayuda() {
  modal('Cómo jugar', (c) => {
    const tactil = navigator.maxTouchPoints > 0;
    [['Objetivo', 'Mete el disco en la portería rival. El primero en llegar a la meta de goles gana.'],
      [tactil ? 'Táctil' : 'Táctil (móvil)', 'Arrastra el dedo por tu mitad (la de abajo) para mover el mazo. En 2 jugadores, cada uno usa su mitad. Puedes ajustar el desplazamiento del dedo en Ajustes.'],
      ['Ratón y teclado', 'Mueve el ratón sobre la mesa, o usa WASD / flechas (remapeables). En 2 jugadores: WASD y flechas. P o Esc pausan.'],
      ['Mando Xbox', 'Stick izquierdo mueve el mazo (el derecho es el 2.º jugador en pantalla dividida). Menú pausa. En los menús: cruceta, A aceptar, B volver.'],
      ['Power-ups (Reto y modos con poderes)', 'Verde: mazo grande · Celeste: rival lento · Amarillo: 3 discos. Los gana quien tocó el disco por última vez.'],
      ['Monedas', 'Ganas monedas virtuales por goles y victorias. Úsalas en la tienda para desbloquear mesas y discos (no hay dinero real).'],
      ['En línea', '1 contra 1 por enlace de invitación: el anfitrión simula la partida y tu mazo responde al instante (predicción) mientras el disco se suaviza (interpolación).']
    ].forEach(([t, d]) => c.appendChild(h('div', { cls: 'bloque' }, [h('div', { cls: 'sub', txt: t }), h('p', { cls: 'nota', txt: d })])));
    P.tuto = true; guardarProgreso();
    c.appendChild(btn('Entendido', () => cerrarTope(), ''));
  });
}

/* ---------- tienda ---------- */
export function tienda() {
  modal('Tienda', (c) => {
    const monedasEl = h('p', { cls: 'monedas' }), grid = h('div', { cls: 'grid-tienda' });
    let tipo = 'mesa';
    const pintar = () => {
      monedasEl.textContent = 'Monedas: ' + P.monedas; grid.textContent = '';
      (tipo === 'mesa' ? D.MESAS : D.DISCOS).forEach((it) => {
        const tiene = (tipo === 'mesa' ? P.mesas : P.discos).includes(it.id), eq = P.sel[tipo === 'mesa' ? 'mesa' : 'disco'] === it.id;
        const prev = tipo === 'mesa' ? h('i', { cls: 'prev-mesa', style: `background:linear-gradient(${it.fondo},${it.fondo2});border-color:${it.linea}` }) : h('i', { cls: 'prev-disco', style: `background:radial-gradient(circle at 35% 35%,${it.borde},${it.color} 45%,#222);border-color:${it.borde}` });
        const accion = tiene ? (eq ? h('span', { cls: 'etq', txt: 'Equipado' }) : btn('Equipar', () => { PR.equipar(tipo, it.id); pintar(); })) : btn('Comprar · ' + it.precio, () => { if (P.monedas < it.precio) { toast('Te faltan ' + (it.precio - P.monedas) + ' monedas'); return; } PR.comprar(tipo, it.id); S.moneda(); pintar(); }, P.monedas >= it.precio ? '' : 'sec');
        grid.appendChild(h('div', { cls: 'item' + (eq ? ' eq' : '') }, [prev, h('b', { txt: it.nombre }), accion]));
      });
    };
    c.appendChild(monedasEl);
    c.appendChild(seg([['mesa', 'Mesas'], ['disco', 'Discos']], tipo, (v) => { tipo = v; pintar(); }));
    c.appendChild(grid); pintar();
  });
}

/* ---------- logros y estadisticas ---------- */
export function logros() {
  modal('Logros', (c) => {
    const n = D.LOGROS.filter((l) => P.logros[l.id]).length;
    c.appendChild(h('p', { cls: 'nota', txt: n + ' de ' + D.LOGROS.length + ' desbloqueados' }));
    D.LOGROS.forEach((l) => c.appendChild(h('div', { cls: 'logro' + (P.logros[l.id] ? ' ok' : '') }, [h('i', { txt: P.logros[l.id] ? '★' : '☆' }), h('div', {}, [h('b', { txt: l.nombre }), h('small', { txt: l.desc })])])));
  });
}
export function estadisticas() {
  modal('Estadísticas', (c) => {
    const s = P.stats, f = (n) => String(n), tiempo = Math.round(s.segundos / 60) + ' min';
    const filas = [['Partidas', s.partidas], ['Victorias', s.victorias], ['Derrotas', s.derrotas], ['Goles a favor', s.goles], ['Goles en contra', s.contra], ['Mejor racha de goles', s.mejorRacha], ['Partidas en línea', s.onlinePart], ['Victorias en línea', s.onlineVic], ['Power-ups recogidos', s.poderes], ['Torneos ganados', s.torneos], ['Tiempo jugado', tiempo], ['Monedas', P.monedas]];
    const t = h('table', { cls: 'tabla' }); filas.forEach(([k, v]) => t.appendChild(h('tr', {}, [h('td', { txt: k }), h('td', { txt: f(v) })]))); c.appendChild(t);
    c.appendChild(h('div', { cls: 'sub', txt: 'Victorias por dificultad' }));
    const t2 = h('table', { cls: 'tabla' }); D.DIFS.forEach((d, i) => t2.appendChild(h('tr', {}, [h('td', { txt: d }), h('td', { txt: String(P.vic[i] || 0) })]))); c.appendChild(t2);
    c.appendChild(h('p', { cls: 'nota', txt: 'Reto: ' + P.reto.max + ' de ' + D.RETOS.length + ' niveles superados.' }));
  });
}
export function ranking() { modal('Ranking', (c) => CH.panelRanking(c), { ancha: true }); }

/* ---------- partida contra el bot ---------- */
export function configBot(iniciar) {
  modal('1 contra Bot', (c) => {
    let dif = P.sel.dif, meta = P.sel.meta;
    c.appendChild(h('div', { cls: 'sub', txt: 'Dificultad' }));
    c.appendChild(seg(D.DIFS.map((n, i) => [i, n]), dif, (v) => { dif = v; }));
    c.appendChild(h('div', { cls: 'sub', txt: 'Goles para ganar' }));
    c.appendChild(seg([[3, '3'], [5, '5'], [7, '7'], [10, '10']], meta, (v) => { meta = v; }));
    c.appendChild(h('div', { cls: 'sub', txt: 'Extras' }));
    let items = false; c.appendChild(seg([[0, 'Clásico'], [1, 'Con power-ups']], 0, (v) => { items = !!v; }));
    c.appendChild(btn('Jugar', () => { P.sel.dif = dif; P.sel.meta = meta; guardarProgreso(); cerrarTodos(); iniciar({ modo: 'bot', dif, meta, items, nombres: [CH.nombreJugador(), 'Bot ' + D.DIFS[dif]] }); }, 'grande'));
  });
}
export function config2P(iniciar) {
  modal('2 jugadores en este dispositivo', (c) => {
    let meta = P.sel.meta, items = false;
    c.appendChild(h('p', { cls: 'nota', txt: 'Pantalla dividida: cada jugador toca su mitad (abajo y arriba). Con mando: stick izquierdo y derecho. No suma monedas ni ranking.' }));
    c.appendChild(h('div', { cls: 'sub', txt: 'Goles para ganar' }));
    c.appendChild(seg([[3, '3'], [5, '5'], [7, '7'], [10, '10']], meta, (v) => { meta = v; }));
    c.appendChild(seg([[0, 'Clásico'], [1, 'Con power-ups']], 0, (v) => { items = !!v; }));
    c.appendChild(btn('Jugar', () => { cerrarTodos(); iniciar({ modo: 'local', meta, items, nombres: ['Jugador 1', 'Jugador 2'] }); }, 'grande'));
  });
}

/* ---------- reto ---------- */
export function reto(iniciar) {
  modal('Reto: obstáculos y power-ups', (c) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Supera cada nivel ganando al bot. Cada nivel nuevo da monedas la primera vez.' }));
    const g = h('div', { cls: 'grid-retos' });
    D.RETOS.forEach((r, i) => {
      const abierto = i <= P.reto.max, hecho = i < P.reto.max;
      g.appendChild(h('button', { type: 'button', cls: 'reto' + (hecho ? ' hecho' : ''), 'data-f': 1, disabled: abierto ? null : true, on: { click: () => { S.clic(); cerrarTodos(); iniciar({ modo: 'reto', dif: r.bot, meta: r.meta, obst: r.obst, items: true, retoIdx: i, nombres: [CH.nombreJugador(), 'Bot ' + D.DIFS[r.bot]] }); } } }, [h('b', { txt: String(i + 1) }), h('span', { txt: r.nombre }), h('small', { txt: abierto ? (hecho ? '✓ ' : '') + D.DIFS[r.bot] + ' · ' + r.meta + ' goles' : 'Bloqueado' })]));
    });
    c.appendChild(g);
  }, { ancha: true });
}

/* ---------- torneo ---------- */
export function torneo(iniciar) {
  modal('Torneo', (c) => {
    const pintar = () => {
      c.textContent = '';
      let T = P.torneo;
      if (!T) {
        c.appendChild(h('p', { cls: 'nota', txt: 'Ocho jugadores, tres rondas (cuartos, semifinal y final) contra bots de dificultad creciente. El campeón gana 150 monedas.' }));
        c.appendChild(btn('Nuevo torneo', () => { PR.nuevoTorneo(); pintar(); }, 'grande')); return;
      }
      const nom = ['Cuartos', 'Semifinal', 'Final'];
      for (let r = 0; r < 3; r++) {
        if (!T.l[r] || !T.l[r].length) continue;
        c.appendChild(h('div', { cls: 'sub', txt: nom[r] }));
        const col = h('div', { cls: 'llave' });
        for (let i = 0; i < T.l[r].length; i += 2) {
          const a = T.l[r][i], b = T.l[r][i + 1], sig = T.l[r + 1] || [], gan = sig.length ? sig[i / 2] : undefined;
          const pa = (id) => h('span', { cls: (gan === id ? 'gana ' : gan !== undefined ? 'pierde ' : '') + (id === -1 ? 'yo' : ''), txt: PR.nombreTorneo(id) });
          col.appendChild(h('div', { cls: 'cruce' }, [pa(a), h('i', { txt: 'vs' }), pa(b)]));
        }
        c.appendChild(col);
      }
      if (T.campeon) { c.appendChild(h('p', { cls: 'gran-msg', txt: '¡Campeón del torneo! +150 monedas' })); c.appendChild(btn('Terminar y empezar otro', () => { P.torneo = null; guardarProgreso(); pintar(); })); return; }
      if (!T.vivo) { c.appendChild(h('p', { cls: 'gran-msg', txt: 'Quedaste eliminado. ¡Inténtalo otra vez!' })); c.appendChild(btn('Nuevo torneo', () => { P.torneo = null; guardarProgreso(); PR.nuevoTorneo(); pintar(); })); return; }
      const rv = PR.rivalActual(), ri = D.RIVALES[rv];
      c.appendChild(btn('Jugar ' + nom[T.ronda].toLowerCase() + ' contra ' + ri.nombre, () => { cerrarTodos(); iniciar({ modo: 'torneo', dif: ri.nivel, meta: PR.metaRonda(T.ronda), items: false, ronda: T.ronda, nombres: [CH.nombreJugador(), ri.nombre + ' (' + D.DIFS[ri.nivel] + ')'] }); }, 'grande'));
      c.appendChild(btn('Abandonar torneo', () => { if (confirm('¿Abandonar el torneo actual?')) { P.torneo = null; guardarProgreso(); pintar(); } }, 'sec peligro'));
    };
    pintar();
  }, { ancha: true });
}
