// Formulario "Crear mesa": juego, baraja, asientos y bots, economia de fichas y opciones propias del juego.
import { h, fmt, boton, aviso } from './dom.js';
import { lista, CATALOGO } from '../juegos/registro.js';
import { Cartera } from '../marco/cartera.js';
import * as A from '../marco/almacen.js';
import { crearMesa, CFG_BASE, semilla8 } from '../marco/mesa.js';

export function pantallaCrear(cont, alCrear, alVolver) {
  const ajMesa = A.ajustes.obtener().mesa;
  const estado = { juego: 'poker', n: 4, asientos: [], privada: false };
  const raiz = h('div', { cls: 'tarjeta crear' });
  cont.replaceChildren(raiz);

  function pintar() {
    const cat = CATALOGO[estado.juego], J = cat.J, saldo = Cartera.saldo();
    const f = (etq, ctl, nota) => h('label', { cls: 'a-fila' }, [h('span', { txt: etq }), ctl, nota ? h('small', { txt: nota }) : null]);
    const num = (v, min, max, paso, fn) => { const c = h('input', { type: 'number', cls: 'campo num', value: v, min, max, step: paso || 1, 'data-f': 1, inputmode: 'numeric' }); c.addEventListener('change', () => fn(Math.max(min, Math.min(max, Math.floor(+c.value || min))))); return c; };
    const sel = (v, ops, fn) => { const s = h('select', { cls: 'campo', 'data-f': 1 }, ops.map(([a, b]) => h('option', { value: a, txt: b }))); s.value = String(v); s.addEventListener('change', () => fn(s.value)); return s; };
    const chk = (v, fn) => { const c = h('input', { type: 'checkbox', 'data-f': 1, role: 'switch' }); c.checked = !!v; c.addEventListener('change', () => fn(c.checked)); return c; };

    const e = estado;
    e.cfg = e.cfg && e.cfgJuego === e.juego ? e.cfg : null;
    if (!e.cfg) {
      e.cfgJuego = e.juego;
      const op = {}; J.opciones.forEach((o) => { op[o.id] = o.def; });
      const bj = e.juego !== 'poker';
      e.cfg = { baraja: J.barajas[0][0], fichasIni: 1000, compraMin: bj ? 100 : 200, compraMax: 5000, compra: 1000, recompra: true, tope: 0, torneo: false, turnoSeg: ajMesa.turnoSeg, pausaMs: 2600, op };
      e.n = Math.min(Math.max(J.min, bj ? 3 : 4), J.max);
      e.asientos = [];
    }
    while (e.asientos.length < 8) e.asientos.push(e.asientos.length % 3 === 0 ? 'medio' : e.asientos.length % 3 === 1 ? 'novato' : 'experto');
    const c = e.cfg;
    const juegos = h('div', { cls: 'juegos' }, lista().map((g) => h('button', { type: 'button', cls: 'juego-op' + (g.id === e.juego ? ' on' : ''), 'data-f': 1, 'aria-pressed': String(g.id === e.juego), on: { click: () => { e.juego = g.id; pintar(); } } }, [h('b', { txt: g.emoji }), h('span', { txt: g.corto }), h('small', { txt: g.desc })])));
    const grupos = {};
    J.opciones.forEach((o) => { (grupos[o.grupo || 'Opciones'] = grupos[o.grupo || 'Opciones'] || []).push(o); });
    const opcionesUI = Object.keys(grupos).map((g) => h('details', { cls: 'grupo', open: g === Object.keys(grupos)[0] ? '' : null }, [h('summary', { txt: g }), ...grupos[g].map((o) => {
      const v = c.op[o.id];
      if (o.tipo === 'num') return f(o.etiqueta, num(v, o.min, o.max, o.paso, (x) => { c.op[o.id] = x; }));
      if (o.tipo === 'bool') return f(o.etiqueta, chk(v, (x) => { c.op[o.id] = x; }));
      return f(o.etiqueta, sel(v, o.opciones, (x) => { c.op[o.id] = typeof o.def === 'number' ? +x : x; }));
    })]));
    const asientosUI = [];
    for (let i = 1; i < e.n; i++) asientosUI.push(f('Asiento ' + (i + 1), sel(e.asientos[i], [['novato', 'Bot novato'], ['medio', 'Bot medio'], ['experto', 'Bot experto'], ['abierto', 'Jugador humano (invitar)']], (x) => { e.asientos[i] = x; })));
    const jugadores = f(J.min === 1 ? 'Asientos (jugadores)' : 'Jugadores (con bots)', num(e.n, J.min, J.max, 1, (x) => { e.n = x; pintar(); }));
    const torneo = J.torneo ? f('Modo torneo (sin recompra, ciegas crecientes)', chk(c.torneo, (x) => { c.torneo = x; if (x && c.op.escTipo === '') c.op.escTipo = 'manos'; pintar(); })) : null;
    const eco = [
      f(c.torneo ? 'Inscripción (se descuenta de tu monedero)' : 'Tu entrada a la mesa', num(Math.min(c.compra, saldo), 1, 100000000, 50, (x) => { c.compra = x; }), 'Tu monedero: ' + fmt(saldo) + ' fichas'),
      f(c.torneo ? 'Fichas de torneo para cada jugador' : 'Fichas de los bots', num(c.fichasIni, 10, 100000000, 100, (x) => { c.fichasIni = x; })),
      c.torneo ? null : f('Entrada mínima (otros jugadores)', num(c.compraMin, 1, 100000000, 50, (x) => { c.compraMin = x; })),
      c.torneo ? null : f('Entrada máxima', num(c.compraMax, 1, 100000000, 50, (x) => { c.compraMax = x; })),
      c.torneo ? null : f('Permitir recompra', chk(c.recompra, (x) => { c.recompra = x; })),
      f('Tope de fichas por jugador en la mesa (0 = sin tope)', num(c.tope, 0, 100000000, 100, (x) => { c.tope = x; })),
    ];
    raiz.replaceChildren(
      h('h2', { txt: 'Crear mesa' }), h('p', { cls: 'nota', txt: 'Solo fichas virtuales, sin valor real.' }), juegos,
      f('Baraja', sel(c.baraja, J.barajas, (x) => { c.baraja = x; })), jugadores, ...asientosUI,
      f('Privacidad', sel(e.privada ? 'privada' : 'abierta', [['abierta', 'Abierta: entra quien tenga el enlace'], ['privada', 'Privada: apruebo cada asiento']], (x) => { e.privada = x === 'privada'; })),
      h('details', { cls: 'grupo', open: '' }, [h('summary', { txt: 'Economía' }), torneo, ...eco].filter(Boolean)),
      f('Tiempo por turno (s, 0 = sin límite)', num(c.turnoSeg, 0, 300, 5, (x) => { c.turnoSeg = x; })),
      ...opcionesUI,
      h('div', { cls: 'fila fin' }, [boton('Volver', alVolver, 'sec'), boton('Crear mesa y sentarme', () => crear(J), 'prim grande')]));
  }
  function crear(J) {
    const c = estado.cfg, saldo = Cartera.saldo(), cat = CATALOGO[estado.juego];
    const op = Object.assign({}, c.op);
    if (op.minApuesta != null && op.maxApuesta != null && op.maxApuesta < op.minApuesta) { aviso('La apuesta máxima debe ser mayor que la mínima', '#ff6b6b'); return; }
    if (op.sb != null && op.bb != null && op.bb < op.sb) { aviso('La ciega grande debe ser mayor que la pequeña', '#ff6b6b'); return; }
    let compra = Math.min(c.compra, c.torneo ? c.compra : c.compraMax);
    if (c.tope > 0 && !c.torneo) compra = Math.min(compra, c.tope);
    if (!c.torneo && compra < c.compraMin) compra = c.compraMin;
    if (compra > saldo) { aviso(`Tu monedero (${fmt(saldo)}) no alcanza para la entrada de ${fmt(compra)}.${Cartera.puedeRegalo() ? ' Reclama el regalo diario.' : ''}`, '#ffd23d', 4500); return; }
    if (!Cartera.debitar(compra, c.torneo ? 'Inscripción de torneo' : 'Entrada a mesa')) { aviso('No se pudo descontar la entrada', '#ff6b6b'); return; }
    const perfil = window.Red.perfil.obtener();
    const m = crearMesa(J, {
      id: 'm' + semilla8(), juego: cat.id, ahora: Date.now(), host: { nombre: perfil.nombre, color: perfil.color, avatar: ajMesa.avatar, tok: semilla8(), compra: c.torneo ? c.fichasIni : compra },
      bots: estado.asientos.slice(1, estado.n), cfg: Object.assign({}, CFG_BASE, { nAsientos: estado.n, privada: estado.privada, fichasIni: c.fichasIni, compraMin: c.torneo ? c.compra : c.compraMin, compraMax: c.torneo ? c.compra : c.compraMax, compraDef: c.torneo ? c.compra : compra, recompra: c.recompra, tope: c.tope, torneo: c.torneo, turnoSeg: c.turnoSeg, pausaMs: c.pausaMs, baraja: c.baraja, reverso: A.ajustes.obtener().mesa.reverso, op }),
    });
    A.ajustes.guardar(Object.assign(A.ajustes.obtener(), { mesa: Object.assign(A.ajustes.obtener().mesa, { turnoSeg: c.turnoSeg }) }));
    alCrear(m, J);
  }
  pintar();
  return raiz;
}
