// Bots de Magnate: tres niveles (conservador, medio, agresivo) con heuristicas de valor esperado.
import { CASILLAS, GRUPOS, POR_GRUPO, ESTACIONES } from './datos.js';
import { validarTrato, propsDe, grupoCompleto, puedeConstruir, puedeVender, puedeHipotecar, puedeDeshipotecar, valorHipoteca, costoDeshipoteca } from './reglas.js';

const NIV = [
  { res: 260, comp: 0.8, puja: 0.8, tope: 3, umbral: 1.2, tratos: 0.25 },
  { res: 130, comp: 1.0, puja: 1.0, tope: 5, umbral: 1.0, tratos: 0.5 },
  { res: 40, comp: 1.2, puja: 1.3, tope: 5, umbral: 0.88, tratos: 0.8 }
];
const PRIORIDAD = [3, 4, 5, 2, 6, 1, 7, 0];
const azar = (e) => ((Math.imul(e.seq + 7, 2654435761) ^ Math.imul(e.turnoN + 13, 40503)) >>> 0) / 4294967296;
const nivelDe = (e, j) => NIV[Math.max(0, Math.min(2, e.jug[j].nivel))];

function poseeDelGrupo(e, g, j) { return POR_GRUPO[g].filter((i) => e.prop[i].o === j).length; }
function completaCon(e, i, j) {
  const g = CASILLAS[i].grupo;
  return g != null && POR_GRUPO[g].every((k) => k === i || e.prop[k].o === j);
}
function bloqueaA(e, i, j) {
  const g = CASILLAS[i].grupo; if (g == null) return false;
  const otros = POR_GRUPO[g].filter((k) => k !== i);
  const o = e.prop[otros[0]].o;
  return o >= 0 && o !== j && otros.every((k) => e.prop[k].o === o);
}
// Valor de una propiedad para el jugador j (no es dinero real: es una estimacion de utilidad)
export function valorProp(e, j, i) {
  const c = CASILLAS[i], q = e.prop[i];
  let v = c.precio * (q && q.h ? 0.6 : 1);
  if (c.tipo === 'prop') {
    if (completaCon(e, i, j)) v *= 1.9; else if (poseeDelGrupo(e, c.grupo, j) >= 1) v *= 1.15;
    if (bloqueaA(e, i, j)) v *= 1.35;
  } else if (c.tipo === 'estacion') v *= 1 + 0.2 * ESTACIONES.filter((k) => k !== i && e.prop[k].o === j).length;
  else v *= 0.8;
  return v;
}
// Costo para k de ceder la propiedad i a otro jugador (incluye ayudarle a completar un barrio)
function costoCeder(e, k, i, a) {
  let v = valorProp(e, k, i);
  const c = CASILLAS[i];
  if (c.tipo === 'prop' && completaCon(e, i, a)) v += c.precio * 1.2 * POR_GRUPO[c.grupo].length / 2;
  return v;
}
export function evaluarTrato(e, k, t) {
  const otro = t.de === k ? t.a : t.de;
  const rec = t.de === k ? t.pide : t.ofrece, ced = t.de === k ? t.ofrece : t.pide;
  let r = rec.din + rec.tarj * 40, d = ced.din + ced.tarj * 40;
  rec.props.forEach((i) => { r += valorProp(e, k, i); });
  ced.props.forEach((i) => { d += costoCeder(e, k, i, otro); });
  return { r, d };
}
export function aceptaTrato(e, k) {
  const t = e.trato; if (!t || t.a !== k) return null;
  const { r, d } = evaluarTrato(e, k, t);
  return r >= d * nivelDe(e, k).umbral && r > 0;
}

function afrontable(e, j, i) { return e.jug[j].din >= CASILLAS[i].precio; }

function ideaTrato(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  if (e.trato || e.turnoN - p.ultTrato < 8) return null;
  if (azar(e) > N.tratos) return null;
  for (const g of PRIORIDAD) {
    const lst = POR_GRUPO[g], mios = lst.filter((i) => e.prop[i].o === j);
    if (mios.length !== lst.length - 1) continue;
    const falta = lst.find((i) => e.prop[i].o !== j), dueno = e.prop[falta].o;
    if (dueno < 0 || e.jug[dueno].quebrado || lst.some((i) => e.prop[i].c > 0)) continue;
    const base = { de: j, a: dueno, id: 0, ofrece: { din: 0, props: [], tarj: 0 }, pide: { din: 0, props: [falta], tarj: 0 } };
    const suelta = (i) => e.prop[i].c === 0 && !e.prop[i].h && (CASILLAS[i].tipo !== 'prop' || (CASILLAS[i].grupo !== g && poseeDelGrupo(e, CASILLAS[i].grupo, j) <= 1));
    const otros = propsDe(e, j).filter(suelta);
    for (let paso = 0; paso <= 2; paso++) {
      const t = JSON.parse(JSON.stringify(base));
      if (paso > 0 && otros.length) t.ofrece.props = [otros[paso === 1 ? 0 : otros.length - 1]];
      if (paso === 2 && !otros.length) break;
      const maxD = Math.max(0, p.din - N.res);
      for (let m = 0; m <= maxD; m += 25) {
        t.ofrece.din = m;
        const { r, d } = evaluarTrato(e, dueno, t);
        if (r >= d * (e.jug[dueno].tipo === 'bot' ? nivelDe(e, dueno).umbral : 1.05) && r > 0) {
          if (!validarTrato(e, t)) return { t: 'tratoProponer', a: dueno, ofrece: t.ofrece, pide: t.pide };
        }
      }
    }
  }
  return null;
}

function construir(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  for (const g of PRIORIDAD) {
    if (!grupoCompleto(e, g, j)) continue;
    const costo = GRUPOS[g].casa;
    if (p.din - costo < N.res) continue;
    const lst = POR_GRUPO[g].filter((i) => !puedeConstruir(e, j, i)).sort((a, b) => e.prop[a].c - e.prop[b].c);
    if (!lst.length) continue;
    const c = e.prop[lst[0]].c, tope = N.tope === 3 && p.din > 900 ? 4 : N.tope;
    if (c >= tope) continue;
    return { t: 'construir', i: lst[0] };
  }
  return null;
}
function levantar(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  const lst = propsDe(e, j).filter((i) => e.prop[i].h && !puedeDeshipotecar(e, j, i) && p.din - costoDeshipoteca(e, i) >= N.res + 60);
  if (!lst.length) return null;
  lst.sort((a, b) => (completaCon(e, b, j) - completaCon(e, a, j)) || CASILLAS[b].precio - CASILLAS[a].precio);
  return { t: 'deshipotecar', i: lst[0] };
}
function conseguirEfectivo(e, j) {
  const d = e.deuda;
  if (e.jug[j].din >= d.monto) return { t: 'pagarDeuda' };
  const mias = propsDe(e, j);
  const sinEdif = mias.filter((i) => !e.prop[i].h && e.prop[i].c === 0 && !puedeHipotecar(e, j, i));
  const suelto = sinEdif.filter((i) => !(CASILLAS[i].grupo != null && grupoCompleto(e, CASILLAS[i].grupo, j))).sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio);
  if (suelto.length) return { t: 'hipotecar', i: suelto[0] };
  const conEdif = mias.filter((i) => e.prop[i].c > 0 && !puedeVender(e, j, i)).sort((a, b) => e.prop[b].c - e.prop[a].c);
  if (conEdif.length) return { t: 'vender', i: conEdif[0] };
  const resto = sinEdif.sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio);
  if (resto.length) return { t: 'hipotecar', i: resto[0] };
  return { t: 'quiebra' };
}

export function decidir(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  switch (e.fase) {
    case 'deuda': return conseguirEfectivo(e, j);
    case 'compra': {
      const i = p.pos, c = CASILLAS[i];
      if (!afrontable(e, j, i)) {
        const faltan = c.precio - p.din; // intenta hipotecar si completa un barrio
        if (completaCon(e, i, j) && faltan > 0) {
          const h = propsDe(e, j).filter((k) => !puedeHipotecar(e, j, k) && !(CASILLAS[k].grupo != null && grupoCompleto(e, CASILLAS[k].grupo, j)) && e.prop[k].c === 0).sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio)[0];
          if (h != null && faltan <= valorHipoteca(e, h)) return { t: 'hipotecar', i: h };
        }
        return { t: 'noComprar' };
      }
      const resto = p.din - c.precio, completa = completaCon(e, i, j) || bloqueaA(e, i, j);
      const quiere = completa || c.tipo === 'estacion' || (c.tipo === 'servicio' ? resto >= N.res * 1.2 : resto >= N.res * N.comp);
      return { t: quiere ? 'comprar' : 'noComprar' };
    }
    case 'subasta': {
      const s = e.subasta, i = s.i, c = CASILLAS[i];
      const inc = Math.max(10, Math.round(c.precio * 0.08 / 10) * 10);
      const maxB = Math.min(p.din - (completaCon(e, i, j) ? 0 : N.res * 0.4), valorProp(e, j, i) * N.puja);
      const m = s.monto + inc;
      return m <= maxB && m <= p.din ? { t: 'pujar', m } : { t: 'pasarPuja' };
    }
    case 'tirar': {
      if (p.carcel) {
        const libres = e.prop.filter((q) => q && q.o === -1).length;
        if (p.tarj.length) return { t: 'tarjetaCarcel' };
        if (libres >= 8 && p.din > N.res + e.cfg.multaCarcel + 100) return { t: 'pagarCarcel' };
        return { t: 'tirar' };
      }
      return levantar(e, j) || construir(e, j) || ideaTrato(e, j) || { t: 'tirar' };
    }
    case 'fin': return construir(e, j) || levantar(e, j) || { t: 'terminar' };
    default: return null;
  }
}
