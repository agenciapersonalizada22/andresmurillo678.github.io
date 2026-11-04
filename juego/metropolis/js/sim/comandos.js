// Único punto de entrada para las acciones del jugador. Cada comando es JSON serializable
// ({k:'via', celdas:[[x,y]], tipo:'calle'}, ...) para poder difundirlos por red más adelante.
import * as C from './ciudad.js';
import { ITEM, ORD, ESPEC } from './datos.js';
import { impulsar, investigar, resolverEvento, repararTodo } from './simulacion.js';
import { recalcular } from './recalculo.js';

const NO = (razon) => ({ ok: false, razon });
const tieneTipo = (c, tipo, id) => c.evt.pend.findIndex((p) => p.tipo === tipo && (id == null || p.id === id));

const MANEJADORES = {
  via: (c, m) => C.trazarVia(c, m.celdas, m.tipo),
  zona: (c, m) => C.zonificar(c, m.celdas, m.zona),
  construir: (c, m) => C.construir(c, m.item, m.x, m.y),
  demoler: (c, m) => C.demoler(c, m.celdas),
  parcela: (c, m) => C.comprarParcela(c, m.px, m.py),
  mejorar: (c, m) => C.mejorar(c, m.id),
  impulsar: (c, m) => impulsar(c, m.id),
  deshacer: (c) => C.deshacer(c),
  investigar: (c, m) => investigar(c, m.id),
  reparar: (c) => repararTodo(c),
  impuesto: (c, m) => { C.fijarImpuesto(c, m.v, m.zona); c.sucio = true; return { ok: true }; },
  ordenanza: (c, m) => {
    const o = ORD[m.id];
    if (!o) return NO('No existe');
    if (m.on) {
      if (o.tier && c.tier < o.tier && c.modo !== 'sandbox') return NO('Requiere ciudad más grande');
      if (o.tech && !c.tech[o.tech] && c.modo !== 'sandbox') return NO('Investiga ' + o.tech);
      c.ord[m.id] = true;
    } else delete c.ord[m.id];
    c.sucio = true; return { ok: true };
  },
  espec: (c, m) => {
    const e = ESPEC.find((q) => q.id === m.id);
    if (!e) return NO('No existe');
    if (e.tech && !c.tech[e.tech] && c.modo !== 'sandbox') return NO('Investiga ' + e.tech);
    c.espec = e.id; c.sucio = true; return { ok: true };
  },
  comercio: (c, m) => {
    if (!(m.clave in c.com)) return NO('Opción desconocida');
    if (m.clave !== 'exp' && !c.tech.comext && c.modo !== 'sandbox') return NO('Investiga Comercio exterior');
    c.com[m.clave] = !!m.v; c.sucio = true; return { ok: true };
  },
  apagar: (c, m) => {
    const b = c.edif.get(m.id);
    if (!b) return NO('No existe');
    const i = tieneTipo(c, 'incendio', b.id);
    if (i >= 0) return resolverEvento(c, i, 'apagar');
    if (c.dinero < 150 && c.modo !== 'sandbox') return NO('Dinero insuficiente');
    c.dinero -= 150; b.fuego = 0; c.cont.incendios++; c.sucio = true; return { ok: true };
  },
  evento: (c, m) => {
    const i = tieneTipo(c, m.tipo, m.id);
    if (i < 0) return NO('Ya pasó');
    return resolverEvento(c, i, m.op);
  },
};

export const COMANDOS = Object.keys(MANEJADORES);

export function ejecutar(c, cmd) {
  const f = cmd && MANEJADORES[cmd.k];
  if (!f) return NO('Comando desconocido');
  const r = f(c, cmd) || { ok: false };
  if (r.ok && c.sucio) recalcular(c);
  return r;
}
