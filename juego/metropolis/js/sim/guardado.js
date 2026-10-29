// Serialización de la ciudad (texto) y exportar/importar.
import { N, NP, nuevaCiudad } from './ciudad.js';
import { ITEM } from './datos.js';
import { b64de, b64a } from './util.js';
import { recalcular } from './recalculo.js';

export const VERSION = 1;

export function serializar(c) {
  const vias = [];
  for (let i = 0; i < c.via.length; i++) if (c.via[i]) vias.push(i, c.via[i]);
  const quitados = [];
  for (let i = 0; i < c.arbol.length; i++) if (c.arbol0[i] && !c.arbol[i]) quitados.push(i);
  const ed = [...c.edif.values()].sort((a, b) => a.id - b.id).map((b) => [b.id, b.t, b.x, b.y, b.n, b.pop, b.edad, b.fuego, b.sinS]);
  return {
    v: VERSION, nombre: c.nombre, semilla: c.semilla, rs: c.rs,
    parc: b64de(c.parc), vias, quitados, edif: ed, sigId: c.sigId,
    dinero: Math.round(c.dinero * 100) / 100, xp: c.xp, nivelA: c.nivelA, puntos: c.puntos, tech: c.tech, tier: c.tier,
    misDone: c.misDone, logros: c.logros, cont: c.cont, impuesto: c.impuesto,
    t: { hora: c.t.hora, dia: c.t.dia },
    evt: { apagon: c.evt.apagon, festival: c.evt.festival, boom: c.evt.boom, boomTipo: c.evt.boomTipo, pend: c.evt.pend },
    hist: c.hist, neto: c.neto, ingresoDia: c.ingresoDia, gastoDia: c.gastoDia, diaria: c.diaria, ult: c.ult,
  };
}

export function deserializar(o) {
  if (!o || typeof o !== 'object' || o.v !== VERSION) throw new Error('Guardado no válido');
  const c = nuevaCiudad(o.semilla, o.nombre);
  c.edif.clear(); c.cB.fill(-1); c.via.fill(0);
  c.parc = b64a(o.parc);
  if (c.parc.length !== NP * NP) throw new Error('Guardado dañado');
  for (let k = 0; k < o.vias.length; k += 2) c.via[o.vias[k]] = o.vias[k + 1];
  for (const i of o.quitados) c.arbol[i] = 0;
  for (const e of o.edif) {
    if (!ITEM[e[1]]) continue;
    const it = ITEM[e[1]];
    for (let yy = e[3]; yy < e[3] + it.h; yy++) for (let xx = e[2]; xx < e[2] + it.w; xx++) c.cB[yy * N + xx] = e[0];
    c.edif.set(e[0], { id: e[0], t: e[1], x: e[2], y: e[3], n: e[4], pop: e[5], edad: e[6], fuego: e[7], sinS: e[8] });
  }
  c.sigId = o.sigId; c.rs = o.rs;
  for (const k of ['dinero', 'xp', 'nivelA', 'puntos', 'tech', 'tier', 'misDone', 'logros', 'cont', 'impuesto', 'hist', 'neto', 'ingresoDia', 'gastoDia', 'diaria', 'ult']) c[k] = o[k];
  c.cont = Object.assign({ incendios: 0, festivales: 0, apagones: 0 }, o.cont);
  c.t = { hora: o.t.hora, dia: o.t.dia, tickDia: 0 };
  c.evt = { apagon: o.evt.apagon, festival: o.evt.festival, boom: o.evt.boom, boomTipo: o.evt.boomTipo, pend: o.evt.pend };
  c.undo = []; c.fx = []; c.notas = [];
  c.sucio = true;
  recalcular(c);
  return c;
}

export function aTexto(c) {
  const j = JSON.stringify(serializar(c));
  const u = new TextEncoder().encode(j);
  return 'METRO1:' + b64de(u);
}

export function deTexto(t) {
  t = String(t || '').trim();
  if (!t.startsWith('METRO1:')) throw new Error('Texto no reconocido');
  const u = b64a(t.slice(7));
  return deserializar(JSON.parse(new TextDecoder().decode(u)));
}
