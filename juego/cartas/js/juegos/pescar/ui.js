// Interfaz de Ve a pescar: elegir rival y numero (botones, cartas o mando), banners y vuelos de cartas; version familiar con mensajes y pistas grandes.
import { h, aviso, anunciar } from '../../ui/dom.js';
import { cfgUI } from '../../ui/mesaUI.js';
import { parse, nombreCarta } from '../../marco/barajas.js';

let selA = null, selR = null, llaveTurno = '', llaveMesa = '', visto = 0;
const refrescar = () => { const S = window.__cartas && window.__cartas.Sesion; if (S && S.vm && S.alVista) S.alVista(S.vm); };
const nombre = (vm, i) => (vm.asientos[i] && vm.asientos[i].nombre) || 'Jugador';
const palo = (vm) => (vm.j.cfg.baraja === 'fr52' ? 'S' : 'o');
const rNombre = (vm, r) => nombreCarta(r + palo(vm)).replace(/ de .*/, '');
const rCorto = (vm, r) => { const q = r + palo(vm); return nombreCarta(q).startsWith('As') ? 'A' : ({ 11: vm.j.cfg.baraja === 'fr52' ? 'J' : 'C', 12: vm.j.cfg.baraja === 'fr52' ? 'Q' : 'R', 13: 'K', 10: vm.j.cfg.baraja === 'fr52' ? '10' : 'S' })[r] || String(r); };
function ordenar(mano) { return mano.slice().sort((a, b) => { const x = parse(a), y = parse(b); return x.v - y.v || (x.p < y.p ? -1 : 1); }); }

function narrar(vm, ev) {
  const fam = vm.j.cfg.familiar;
  if (ev.k === 'pide') return ev.n > 0 ? (fam ? `¡${nombre(vm, ev.a)} tenía ${ev.n} ${rNombre(vm, ev.r)}! 🎉` : `${nombre(vm, ev.por)} pide ${rNombre(vm, ev.r)} a ${nombre(vm, ev.a)}: recibe ${ev.n}`) : (fam ? `${nombre(vm, ev.a)} no tiene ${rNombre(vm, ev.r)}… ¡a pescar! 🎣` : `${nombre(vm, ev.por)} pide ${rNombre(vm, ev.r)} a ${nombre(vm, ev.a)}: ¡Ve a pescar!`);
  if (ev.k === 'pesca') return ev.vacio ? 'No quedan cartas en el mazo' : ev.ok ? `¡${nombre(vm, ev.por)} pescó ${rNombre(vm, ev.r)}! Juega otra vez 🐟` : `${nombre(vm, ev.por)} pescó una carta`;
  if (ev.k === 'libro') return `📚 ¡${nombre(vm, ev.por)} completó un libro de ${rNombre(vm, ev.r)}!`;
  if (ev.k === 'vacia') return `${nombre(vm, ev.por)} se quedó sin cartas y roba ${ev.n}`;
  return '';
}
function banner(texto, alerta, grande) {
  const f = document.getElementById('fieltro'); if (!f) return;
  const b = h('div', { cls: 'banner' + (alerta ? ' alerta' : '') + (grande ? ' grande' : ''), txt: texto, 'aria-hidden': 'true' });
  f.querySelectorAll('.banner').forEach((x) => x.remove()); f.appendChild(b); setTimeout(() => b.remove(), 2600);
}
function volar(texto, desde, hasta) {
  const a = document.querySelector(`#fieltro .asiento[data-i="${desde}"]`), b = document.querySelector(`#fieltro .asiento[data-i="${hasta}"]`);
  if (!a || !b) return;
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect(), el = h('div', { cls: 'vuelo', txt: texto, 'aria-hidden': 'true' }); document.body.appendChild(el);
  const an = el.animate([{ transform: `translate(${r1.left + r1.width / 2}px,${r1.top + r1.height / 2}px) scale(.6)` }, { transform: `translate(${r2.left + r2.width / 2}px,${r2.top + r2.height / 2}px) scale(1.5)` }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' });
  an.onfinish = () => el.remove();
}
function confeti(grande) {
  const f = document.getElementById('fieltro'); if (!f) return; const r = f.getBoundingClientRect();
  for (let k = 0; k < (grande ? 14 : 6); k++) {
    const e = h('div', { cls: 'vuelo', txt: ['🎉', '✨', '⭐', '🐟'][k % 4], 'aria-hidden': 'true' }); document.body.appendChild(e);
    const x = r.left + r.width * (0.2 + 0.6 * ((k * 37) % 10) / 10), y = r.top + r.height * 0.55;
    const an = e.animate([{ transform: `translate(${x}px,${y}px)`, opacity: 1 }, { transform: `translate(${x + ((k % 5) - 2) * 26}px,${y - 90 - (k % 4) * 30}px) rotate(${k * 40}deg)`, opacity: 0 }], { duration: 1100 + (k % 4) * 150, easing: 'ease-out', fill: 'forwards' });
    an.onfinish = () => e.remove();
  }
}
function efectos(vm) {
  const j = vm.j, k = vm.id + ':' + vm.mano;
  if (k !== llaveMesa) { llaveMesa = k; visto = j.seq; return; }
  const nuevos = j.hist.filter((e) => e.q > visto); visto = j.seq;
  if (!nuevos.length) return;
  const fam = j.cfg.familiar;
  nuevos.forEach((ev) => anunciar(narrar(vm, ev)));
  if (!cfgUI.animar) return;
  nuevos.slice(-3).forEach((ev, q) => setTimeout(() => {
    if (ev.k === 'pide' && ev.n > 0) volar('🃏', ev.a, ev.por);
    if (ev.k === 'pide' && ev.n === 0) banner('🎣 ¡Ve a pescar!', true, fam);
    if (ev.k === 'pesca' && ev.ok) banner('🐟 ¡Pescó lo que pedía!', false, fam);
    if (ev.k === 'libro') { banner('📚 ¡Libro de ' + rNombre(vm, ev.r) + '!', false, fam); confeti(fam); }
  }, q * 450));
}
export function layout(vm) {
  const j = vm.j, yo = vm.yo, legal = j.legal, res = j.res && j.fase === 'entre', mio = yo >= 0 ? j.jug[yo].c : [], orden = ordenar(mio);
  const lk = vm.mano + ':' + j.turno + ':' + j.sub; if (lk !== llaveTurno) { llaveTurno = lk; selA = null; selR = null; }
  if (legal && legal.sub === 'pedir') { if (selA != null && !legal.objetivos.includes(selA)) selA = null; if (selA == null && legal.objetivos.length === 1) selA = legal.objetivos[0]; if (selR != null && !legal.rangos.includes(selR)) selR = null; if (selR == null && legal.rangos.length === 1) selR = legal.rangos[0]; }
  efectos(vm);
  const asientos = j.jug.map((p, i) => {
    const badges = []; if (p.libros.length) badges.push({ txt: '📚 ' + p.libros.length, cls: 'dealer', tit: 'Libros: ' + p.libros.map((r) => rCorto(vm, r)).join(' ') });
    return { manos: i === yo || p.st === 'fuera' ? [] : [{ cartas: p.c, etiqueta: p.n + ' cartas', activa: false, cls: res && j.res.ganadores.includes(i) ? 'gana' : '' }], badges, apuesta: 0, fichas: p.f, estado: '', turno: j.fase === 'mano' && j.turno === i, gana: res && j.res.ganadores.includes(i), fuera: p.st === 'fuera', delta: res ? j.res.gan[i] : null };
  });
  const ult = j.hist.length ? j.hist[j.hist.length - 1] : null;
  let sub = '', extra = '';
  if (res) { sub = j.res.ganadores.map((g) => nombre(vm, g)).join(' y ') + (j.res.ganadores.length > 1 ? ' empatan' : ' gana') + ' · ' + j.res.texto; extra = 'Libros: ' + j.jug.map((p, i) => nombre(vm, i) + ' ' + p.libros.length).join(' · '); }
  else if (j.fase === 'mano') {
    sub = ult ? narrar(vm, ult) : '';
    extra = legal ? (legal.sub === 'pescar' ? '¡Toca el mazo o el botón para pescar!' : 'Tu turno · elige rival y número') : 'Turno de ' + nombre(vm, j.turno);
  }
  const barra = [];
  if (yo >= 0 && j.jug[yo].st === 'activo') {
    barra.push({ txt: '📚 Tus libros: ' + (j.jug[yo].libros.length ? j.jug[yo].libros.map((r) => rCorto(vm, r)).join(' ') : '—'), cls: j.jug[yo].libros.length ? 'ok' : '' });
    barra.push({ txt: 'Mazo: ' + j.mazo, cls: '' });
    if (legal && legal.sub === 'pedir' && j.cfg.familiar) barra.push({ txt: '🐟 Pide un número que tengas: ' + legal.rangos.map((r) => rCorto(vm, r)).join(' '), cls: 'cerca' });
  }
  const selIdx = []; if (selR != null) orden.forEach((c, i) => { if (parse(c).v === selR) selIdx.push(i); });
  return {
    disposicion: 'elipse', fin: !!res, asientos, cabecera: 'Ve a pescar · libros de ' + j.cfg.libro + (j.cfg.familiar ? ' · versión familiar' : '') + (j.cfg.ana ? ' · ana ' + j.cfg.ana : ''), info: '',
    barra, bandeja: yo >= 0 && mio.length ? { cartas: orden, clic: !!legal && legal.sub === 'pedir', sel: selIdx, etiqueta: selR != null ? 'Pedirás: ' + rNombre(vm, selR) : '', turno: !!legal } : null,
    centro: { cartas: [], huecos: 0, bote: j.bote, subtitulo: sub, extra, grupos: [], pilas: [{ id: 'mazo', cartas: j.mazo ? [null] : [], etiqueta: 'Mazo ' + j.mazo, clic: !!legal && legal.sub === 'pescar' }] },
  };
}
export function panel(vm) {
  const j = vm.j, L = j.legal;
  if (!L) return { espera: true };
  if (L.sub === 'pescar') return { titulo: '¡No lo tiene!', info: 'Nadie tenía ' + rNombre(vm, L.pend) + (j.cfg.repetirAlPescar ? ' · si pescas uno, juegas otra vez' : ''), botones: [{ id: 'pescar', txt: '🎣 ¡Ve a pescar!', cls: 'prim grande', accion: { t: 'pescar' }, tecla: 'p' }] };
  const b = [];
  const listo = selA != null && selR != null;
  b.push(listo ? { id: 'pedir', txt: `Pedir ${rNombre(vm, selR)} a ${nombre(vm, selA)}`, cls: 'prim grande', accion: { t: 'pedir', a: selA, r: selR }, tecla: 'a' }
    : { id: 'pedir', txt: selA == null ? 'Elige un jugador' : 'Elige un número', cls: 'sec grande', tecla: 'a', local: () => aviso(selA == null ? 'Toca el jugador al que le pedirás' : 'Toca el número que quieres pedir (uno que ya tengas)', '#ffd23d') });
  L.objetivos.forEach((s) => b.push({ id: 'j' + s, txt: nombre(vm, s).slice(0, 9) + ' (' + j.jug[s].n + ')', cls: (selA === s ? 'prim' : 'sec') + ' chico', local: () => { selA = selA === s ? null : s; refrescar(); } }));
  const cnt = {}; j.jug[vm.yo].c.forEach((c) => { const r = parse(c).v; cnt[r] = (cnt[r] || 0) + 1; });
  L.rangos.forEach((r) => b.push({ id: 'n' + r, txt: rCorto(vm, r) + (cnt[r] > 1 ? '×' + cnt[r] : ''), cls: (selR === r ? 'prim' : 'sec') + ' chico', local: () => { selR = selR === r ? null : r; refrescar(); } }));
  return { titulo: 'Tu turno', info: j.cfg.familiar ? 'Toca a quién le pides y qué número 🙂' : 'Elige rival y número (también puedes tocar una carta)', botones: b };
}
export function alCarta(vm, idx, code) {
  const j = vm.j; if (!j.legal || j.legal.sub !== 'pedir') return null;
  const r = parse(code).v; selR = selR === r ? null : r; refrescar(); return null;
}
export function alPila(vm, id) { const j = vm.j; return j.legal && j.legal.sub === 'pescar' ? { t: 'pescar' } : null; }
export const mandoCartas = true;
export const texto = {
  nombre: 'Ve a pescar',
  ayuda: [
    'En tu turno pide a un rival un número (As, 2…) que tú ya tengas. Si lo tiene, te da todas esas cartas y sigues pidiendo. Si no, ¡ve a pescar!: robas una carta del mazo y pasa el turno (si robas justo el número que pedías, juegas otra vez, según la mesa).',
    'Cuando juntas 4 cartas del mismo número formas un libro y se baja solo (3 con la baraja de 40 si la mesa lo elige: la cuarta carta queda fuera de juego). Gana quien junte más libros; si empatan, se reparte el bote.',
    'Si te quedas sin cartas, robas cartas nuevas en tu turno (o quedas fuera, según la mesa). Recuerda lo que pidieron los demás: quien pidió un número, lo tiene.',
  ],
  controles: ['<b>Táctil/ratón:</b> toca al rival y el número (o una carta de tu mano) y pulsa Pedir; con «¡Ve a pescar!» toca el mazo o el botón.', '<b>Teclado:</b> A pedir · P pescar · flechas mueven el foco, Enter elige · Esc menú.', '<b>Mando Xbox:</b> cruceta/stick mueve el foco entre jugadores, números y cartas · A elige/confirma · MENU pausa.'],
};
