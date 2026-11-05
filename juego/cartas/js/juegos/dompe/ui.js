// Interfaz del Dompe: mano en bandeja, progreso hacia cada combinacion ganadora, avisos de «¿puedo dompear?» y de ultima vuelta.
import { h, aviso, dialogo } from '../../ui/dom.js';
import { perfil, evaluar, distancia, salidas, NOMBRES, CORTOS } from './combos.js';
import { noVistas } from './bot.js';
import { mejorDescarte } from './reglas.js';
import { nombreCarta } from '../../marco/barajas.js';

let sel = null, armado = false, memo = { k: '', v: null }, avisado = '';
const refrescar = () => { const S = window.__cartas && window.__cartas.Sesion; if (S && S.vm && S.alVista) S.alVista(S.vm); };
const nombre = (vm, i) => (vm.asientos[i] && vm.asientos[i].nombre) || 'Jugador';
const quitar = (c, carta) => { const k = c.indexOf(carta); const o = c.slice(); if (k >= 0) o.splice(k, 1); return o; };

function ordenar(mano, P) {
  const r = (c) => { if (P.wild.has(c)) return [99, 9]; const m = /^(\d+)(.)$/.exec(c); const v = +m[1]; return [v === 1 ? (P.asAlto === 'bajo' ? 0 : P.len) : P.pos[v], P.palos.indexOf(m[2])]; };
  return mano.slice().sort((a, b) => { const x = r(a), y = r(b); return x[0] - y[0] || x[1] - y[1]; });
}
function progreso(j, mano6, mano7, P) {
  const k = mano6.join() + '|' + mano7.join() + '|' + j.vistos.length;
  if (memo.k === k) return memo.v;
  const des = noVistas(j, mano7), sal = salidas(mano6, P, j.cfg.gana, [...new Set(des)]);
  const lista = j.cfg.orden.filter((id) => j.cfg.gana.includes(id)).map((id) => {
    const d = distancia(mano6, id, P), set = sal[id];
    return { id, d, outs: d === 1 && set ? des.filter((c) => set.has(c)).length : 0 };
  });
  memo = { k, v: lista }; return lista;
}
function manoVigente(j, P) { // las 6 cartas sobre las que se muestra el progreso
  const m = j.jug[j.yo].c;
  if (m.length <= 6) return { m6: m, m7: m, sug: null };
  const mj = sel && m.includes(sel.c) ? sel.c : null;
  const b = mejorDescarte(m, P, j.cfg.gana, j.tomada);
  return { m6: quitar(m, mj || (b && b.c)), m7: m, sug: b && b.c, usaSel: !!mj };
}
export function layout(vm) {
  const j = vm.j, yo = vm.yo, P = perfil(j.cfg), res = j.res && j.fase === 'entre';
  const mio = yo >= 0 ? j.jug[yo].c : [], orden = ordenar(mio, P);
  const llave = vm.mano + ':' + j.sub + ':' + j.turno;
  if (!sel || sel.k !== llave || orden[sel.i] !== sel.c) { if (!sel || sel.k !== llave) armado = false; sel = null; }
  const legal = j.legal, desc = legal && legal.sub === 'descartar';
  const asientos = j.jug.map((p, i) => {
    const badges = [];
    if (j.dealer === i && j.fase === 'mano') badges.push({ txt: 'REPARTE', cls: 'dealer' });
    if (j.dompe && j.dompe.por === i) badges.push({ txt: 'DOMPE', cls: 'allin' });
    else if (j.dompe && j.dompe.pend.includes(i)) badges.push({ txt: 'última', cls: 'nivel' });
    const gan = res ? j.res.gan[i] : 0;
    const et = res && j.res.manos[i] ? j.res.manos[i].nombre : '';
    return {
      manos: i === yo || p.st === 'fuera' ? [] : [{ cartas: p.c, etiqueta: et, activa: false, cls: res && j.res.ganadores.includes(i) ? 'gana' : '' }],
      badges, apuesta: 0, fichas: p.f, estado: '', turno: j.fase === 'mano' && j.turno === i, gana: res && j.res.ganadores.includes(i), fuera: p.st === 'fuera', delta: res ? gan : null,
    };
  });
  const quienTurno = j.turno >= 0 ? nombre(vm, j.turno) : '';
  let sub = '', extra = '';
  if (res) {
    sub = j.res.ganadores.map((g) => nombre(vm, g)).join(' y ') + ' gana' + (j.res.ganadores.length > 1 ? 'n' : '') + ' · ' + j.res.texto;
    extra = (j.res.dompeador >= 0 ? nombre(vm, j.res.dompeador) + ' dijo dompe' : '') + (j.res.penal ? ' · penalización ' + j.res.penal : '');
  } else if (j.dompe) {
    sub = '¡DOMPE de ' + nombre(vm, j.dompe.por) + '! Última vuelta'; extra = 'Falta jugar: ' + j.dompe.pend.map((s) => nombre(vm, s)).join(', ');
  } else if (j.fase === 'mano') {
    sub = (legal ? 'Tu turno · ' + (legal.sub === 'robar' ? 'roba una carta' : 'descarta una carta') : 'Turno de ' + quienTurno);
    extra = 'Vuelta ' + j.vuelta + (j.vuelta < j.cfg.dompeDesde ? ' · aún no se puede dompear (desde la vuelta ' + j.cfg.dompeDesde + ')' : ' · ya se puede dompear');
  }
  if (j.dompe && avisado !== vm.mano + ':' + j.dompe.por) { avisado = vm.mano + ':' + j.dompe.por; aviso('¡' + nombre(vm, j.dompe.por) + ' dijo DOMPE! Todos juegan una última vuelta', '#ff4fd8', 3800); }
  const barra = [];
  let etiquetaMano = '';
  if (yo >= 0 && mio.length && j.jug[yo].st === 'activo') {
    const v = manoVigente(j, P), ev = evaluar(v.m6, P);
    etiquetaMano = NOMBRES[ev.cat] + (v.m6 !== v.m7 ? '' : '');
    if (j.dompe && j.dompe.pend.includes(yo)) barra.push({ txt: '⚠ ÚLTIMA VUELTA: mejora tu mano o pierdes', cls: 'alerta' });
    else if (j.dompe && j.dompe.por === yo) barra.push({ txt: 'Dijiste dompe: espera el resultado', cls: 'cerca' });
    else if (legal && legal.sub === 'descartar') barra.push(legal.dompe ? { txt: '¿Dompear? SÍ puedes (vuelta ' + j.vuelta + ')', cls: 'ok' } : { txt: '¿Dompear? Aún no: desde la vuelta ' + j.cfg.dompeDesde, cls: 'lejos' });
    else if (j.fase === 'mano' && !j.dompe) barra.push({ txt: j.vuelta >= j.cfg.dompeDesde ? 'Ya se puede dompear' : 'Dompe desde la vuelta ' + j.cfg.dompeDesde, cls: j.vuelta >= j.cfg.dompeDesde ? 'ok' : 'lejos' });
    barra.push({ txt: 'Mano: ' + NOMBRES[ev.cat] + (v.sug && !v.usaSel ? ' (con el mejor descarte)' : ''), cls: '' });
    progreso(j, v.m6, v.m7, P).forEach((x) => barra.push({ txt: x.d === 0 ? '✔ ' + CORTOS[x.id] : x.d === 1 ? CORTOS[x.id] + ': 1 carta' + (x.outs ? ' (' + x.outs + ')' : '') : CORTOS[x.id] + ': faltan ' + x.d, cls: x.d === 0 ? 'ok' : x.d === 1 ? 'cerca' : 'lejos', tit: NOMBRES[x.id] }));
  }
  const pilas = [{ id: 'mazo', cartas: j.mazo ? [null] : [], etiqueta: 'Mazo ' + j.mazo, clic: !!legal && legal.sub === 'robar' }];
  if (j.descarte) pilas.push({ id: 'descarte', cartas: [j.descarte], etiqueta: 'Descarte (' + j.nDesc + ')', clic: !!legal && legal.sub === 'robar' });
  return {
    disposicion: 'elipse', fin: !!res, asientos, cabecera: 'Dompe · ' + j.jug.filter((p) => p.st === 'activo').length + ' en la mano' + (j.cfg.ana ? ' · ana ' + j.cfg.ana : ''), info: yo >= 0 && mio.length ? 'Tu mano: ' + (etiquetaMano || '') : '',
    barra, bandeja: yo >= 0 && mio.length && j.jug[yo].st === 'activo' ? { cartas: orden, clic: !!desc, sel: sel ? [sel.i] : [], etiqueta: sel ? nombreCarta(sel.c) : '', turno: !!legal } : null,
    centro: { cartas: [], huecos: 0, bote: j.bote, subtitulo: sub, extra, grupos: [], pilas },
  };
}
export function panel(vm) {
  const j = vm.j, L = j.legal;
  if (!L) return { espera: true };
  const comb = { id: 'comb', txt: 'Combinaciones', cls: 'sec', tecla: 'k', b: true, local: () => combinacionesDialogo(vm) };
  if (L.sub === 'robar') {
    const b = [{ id: 'robar_mazo', txt: 'Robar del mazo', cls: 'prim', accion: { t: 'robar', de: 'mazo' }, tecla: 'm' }];
    if (j.descarte) b.push({ id: 'robar_desc', txt: 'Tomar descarte', cls: 'sec', accion: { t: 'robar', de: 'descarte' }, tecla: 'd' });
    b.push(comb);
    return { botones: b, titulo: 'Tu turno · vuelta ' + j.vuelta, info: j.descarte ? 'Descarte: ' + nombreCarta(j.descarte) : '' };
  }
  const P = perfil(j.cfg), mano = j.jug[j.yo].c, orden = ordenar(mano, P);
  const b = [];
  b.push(sel ? { id: 'descartar', txt: 'Descartar', cls: 'prim', accion: { t: 'descartar', c: sel.c, dompe: armado && L.dompe }, tecla: 'x' }
    : { id: 'descartar', txt: 'Descartar', cls: 'prim', local: () => aviso('Toca primero la carta que quieres descartar', '#ffd23d'), tecla: 'x' });
  if (L.dompe) b.push({ id: 'dompe', txt: armado ? '✔ DOMPE al descartar' : 'Decir ¡DOMPE!', cls: armado ? 'allin' : 'peligro', tecla: 'p', local: () => { armado = !armado; refrescar(); } });
  b.push({ id: 'sugerir', txt: 'Sugerir', cls: 'sec', tecla: 's', local: () => { const m = mejorDescarte(mano, P, j.cfg.gana, j.tomada); if (m) { sel = { i: orden.indexOf(m.c), c: m.c, k: vm.mano + ':' + j.sub + ':' + j.turno }; refrescar(); } } });
  b.push(comb);
  return { botones: b, titulo: sel ? 'Descartar ' + nombreCarta(sel.c) : 'Elige la carta a descartar', info: armado ? 'Dirás ¡DOMPE! al descartar' : (L.dompe ? 'Puedes dompear' : 'Aún no se puede dompear') };
}
export function alCarta(vm, idx, code) {
  const j = vm.j; if (!j.legal || j.legal.sub !== 'descartar') return null;
  const k = vm.mano + ':' + j.sub + ':' + j.turno;
  if (sel && sel.i === idx && sel.c === code) return { t: 'descartar', c: code, dompe: armado && j.legal.dompe };
  sel = { i: idx, c: code, k }; refrescar(); return null;
}
export function alPila(vm, id) {
  const j = vm.j; if (!j.legal || j.legal.sub !== 'robar') return null;
  return { t: 'robar', de: id === 'descarte' ? 'descarte' : 'mazo' };
}
export const mandoCartas = true;

// ---- reglas y combinaciones ----
function listaCombos(cfg) {
  return h('ol', { cls: 'lista-orden' }, cfg.orden.map((id, k) => h('li', { cls: cfg.gana.includes(id) ? 'gana' : '' }, [h('b', { txt: (k + 1) + '.' }), h('span', { txt: NOMBRES[id] }), h('small', { txt: cfg.gana.includes(id) ? 'gana al instante' : '' })])));
}
export function ayudaExtra(vm) {
  const cfg = vm.j.cfg;
  return [h('h3', { txt: 'Orden de fuerza (de mayor a menor)' }), listaCombos(cfg),
    h('p', { cls: 'nota', txt: 'Las combinaciones marcadas ganan al instante. Si alguien dice dompe y nadie gana en la última vuelta, gana la mejor mano según este orden (desempate por cartas altas). El orden y las combinaciones se eligen al crear la mesa.' }),
    h('p', { cls: 'nota', txt: 'Comodines: ' + (cfg.comodin ? (cfg.baraja === 'fr52' ? 'los 2 jokers' : 'el 2 de oros') : 'ninguno') + ' (sustituyen a cualquier carta; nunca forman más de 4 iguales). ' + (cfg.asAlto === 'ambos' ? 'El As vale bajo o alto en las escaleras.' : cfg.asAlto === 'bajo' ? 'El As solo vale bajo.' : 'El As solo vale alto.') + (cfg.baraja === 'es40' && cfg.puente ? ' En la baraja de 40 el 7 va seguido de la sota (10).' : '')
      + (cfg.ana ? ' Ana ' + cfg.ana + ' por ronda' : '') + (cfg.penal ? ', penalización por dompear sin ganar: ' + cfg.penal : '') + '.' })];
}
function combinacionesDialogo(vm) {
  const j = vm.j, P = perfil(j.cfg);
  const cuerpo = [];
  if (j.yo >= 0 && j.jug[j.yo].c.length && j.jug[j.yo].st === 'activo') {
    const v = manoVigente(j, P), prog = progreso(j, v.m6, v.m7, P);
    cuerpo.push(h('h3', { txt: 'Tu progreso' }), h('table', { cls: 'tabla-prog' }, prog.map((x) => h('tr', {}, [h('td', { txt: NOMBRES[x.id] }), h('td', { cls: x.d === 0 ? 'mas' : '', txt: x.d === 0 ? '¡La tienes!' : x.d === 1 ? 'Te falta 1 carta' + (x.outs ? ' · ' + x.outs + ' salidas' : '') : 'Te faltan ' + x.d + ' cartas' })]))));
  }
  cuerpo.push(...ayudaExtra(vm));
  return dialogo({ titulo: 'Combinaciones', cuerpo, botones: [{ txt: 'Cerrar', cls: 'prim' }] });
}
export const texto = {
  nombre: 'Dompe',
  ayuda: [
    'Cada jugador tiene 6 cartas. En tu turno robas una carta (del mazo o la última del descarte) y descartas otra. Con 6 cartas gana al instante quien forma una combinación ganadora (por defecto: tres pares, dos tercias, escalera de 6, escalera de color o cuarteto + par).',
    'Desde la segunda vuelta puedes decir «¡DOMPE!» al descartar: todos los demás juegan una última vuelta para mejorar su mano o ganar. Si nadie gana al instante, gana la mejor mano según el orden de fuerza. Si dompeas y no ganas pagas la penalización de la mesa (si la hay).',
    'Toca una carta para elegirla y de nuevo (o pulsa Descartar) para descartarla. «Sugerir» marca el mejor descarte. Las etiquetas de abajo muestran cuánto te falta para cada combinación ganadora.',
  ],
  controles: ['<b>Táctil/ratón:</b> toca una carta para elegirla, tócala otra vez o pulsa Descartar. Toca el mazo o el descarte para robar.', '<b>Teclado:</b> M mazo · D descarte · X descartar · P dompe · S sugerir · K combinaciones · flechas mueven el foco · Esc menú.', '<b>Mando Xbox:</b> cruceta/stick mueve el foco entre cartas y botones · A confirma · B abre las combinaciones · MENU pausa.'],
};
