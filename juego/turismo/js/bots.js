// Bots de Turismo Mundial: tres niveles (conservador, medio, agresivo) con heuristicas de valor esperado.
import { CASILLAS, POR_CONT, TRANSPORTES, SELLO_PUNTOS } from './datos.js';
import { propsDe, dominio, cuentaCont, puedeConstruir, puedeVender, puedeHipotecar, puedeDeshipotecar, valorHipoteca, costoDeshipoteca, costoEdif, rutasDe, calcularRenta } from './reglas.js';

const NIV = [
  { res: 260, comp: 0.8, puja: 0.8, tope: 3, viaje: 30 },
  { res: 130, comp: 1.0, puja: 1.0, tope: 4, viaje: 10 },
  { res: 40, comp: 1.2, puja: 1.3, tope: 4, viaje: -10 }
];
const PRIORIDAD = [3, 2, 4, 1, 5, 0];
const nivelDe = (e, j) => NIV[Math.max(0, Math.min(2, e.jug[j].nivel))];

function completaCon(e, i, j) {
  const g = CASILLAS[i].grupo;
  return g != null && CASILLAS[i].tipo === 'dest' && e.prop[i].o !== j && cuentaCont(e, g, j) + 1 >= e.cfg.dominio;
}
function bloqueaA(e, i, j) {
  const g = CASILLAS[i].grupo; if (g == null || CASILLAS[i].tipo !== 'dest') return false;
  return e.jug.some((p) => p.id !== j && !p.quebrado && cuentaCont(e, g, p.id) + 1 >= e.cfg.dominio);
}
// Valor de un destino para j (estimacion de utilidad, no dinero)
export function valorProp(e, j, i) {
  const c = CASILLAS[i], q = e.prop[i];
  let v = c.precio * (q && q.h ? 0.6 : 1);
  if (c.tipo === 'dest') {
    if (completaCon(e, i, j)) v *= 1.9; else if (cuentaCont(e, c.grupo, j) >= 1) v *= 1.15;
    if (bloqueaA(e, i, j)) v *= 1.35;
    if (!e.jug[j].sellos.includes(i)) v += SELLO_PUNTOS;
  } else v *= 1 + 0.18 * TRANSPORTES.filter((k) => k !== i && e.prop[k].o === j).length;
  return v;
}
const afrontable = (e, j, i) => e.jug[j].din >= CASILLAS[i].precio;

function construir(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  for (const g of PRIORIDAD) {
    if (!dominio(e, g, j)) continue;
    if (p.din - costoEdif(POR_CONT[g][0]) < N.res) continue;
    const lst = POR_CONT[g].filter((i) => e.prop[i].o === j && !puedeConstruir(e, j, i)).sort((a, b) => e.prop[a].c - e.prop[b].c);
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
  const suelto = sinEdif.filter((i) => !(CASILLAS[i].grupo != null && CASILLAS[i].tipo === 'dest' && dominio(e, CASILLAS[i].grupo, j))).sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio);
  if (suelto.length) return { t: 'hipotecar', i: suelto[0] };
  const conEdif = mias.filter((i) => e.prop[i].c > 0 && !puedeVender(e, j, i)).sort((a, b) => e.prop[b].c - e.prop[a].c);
  if (conEdif.length) return { t: 'vender', i: conEdif[0] };
  const resto = sinEdif.sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio);
  if (resto.length) return { t: 'hipotecar', i: resto[0] };
  return { t: 'quiebra' };
}

// Valora una ruta: ganancias (comprar, sello, bote, sueldo) menos riesgos (renta, tasas) y el costo del pasaje
function valorDestino(e, j, i, costo) {
  const p = e.jug[j], c = CASILLAS[i], q = e.prop[i];
  let v = -costo;
  if (c.tipo === 'dest' || c.tipo === 'trans') {
    if (q.o === -1) v += afrontable(e, j, i) ? valorProp(e, j, i) * 0.22 : 0;
    else if (q.o !== j && !q.h) v -= calcularRenta(e, i, j) * 1.4;
    if (c.tipo === 'dest' && !p.sellos.includes(i)) v += SELLO_PUNTOS * 0.8 + e.cfg.bonoSello;
  } else if (c.tipo === 'libre') v += e.bote * 0.4;
  else if (c.tipo === 'impuesto') v -= c.monto;
  else if (c.tipo === 'retencion') v -= 20;
  else if (c.tipo === 'salida') v += e.cfg.sueldo * 0.4;
  else v += 5;
  return v;
}
function elegirRuta(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  let mejor = null, mv = -Infinity;
  rutasDe(e, j).forEach((r) => {
    if (r.bloq || (r.costo > p.din - 20 && !(p.tarj.length && r.costo > 0))) return;
    const costoEf = p.tarj.length && r.costo > 0 ? r.costo * 0.3 : r.costo;
    const v = valorDestino(e, j, r.a, costoEf);
    if (v > mv) { mv = v; mejor = r; }
  });
  if (mejor && mv > N.viaje) return { t: 'viajar', a: mejor.a, pase: p.tarj.length > 0 && mejor.costo > 0 && (mejor.costo >= 75 || mejor.costo > p.din - 20) };
  return { t: 'noViajar' };
}

export function decidir(e, j) {
  const p = e.jug[j], N = nivelDe(e, j);
  switch (e.fase) {
    case 'deuda': return conseguirEfectivo(e, j);
    case 'viaje': return elegirRuta(e, j);
    case 'compra': {
      const i = p.pos, c = CASILLAS[i];
      if (!afrontable(e, j, i)) {
        const faltan = c.precio - p.din;
        if (completaCon(e, i, j) && faltan > 0) {
          const h = propsDe(e, j).filter((k) => !puedeHipotecar(e, j, k) && !(CASILLAS[k].tipo === 'dest' && dominio(e, CASILLAS[k].grupo, j)) && e.prop[k].c === 0).sort((a, b) => CASILLAS[a].precio - CASILLAS[b].precio)[0];
          if (h != null && faltan <= valorHipoteca(e, h)) return { t: 'hipotecar', i: h };
        }
        return { t: 'noComprar' };
      }
      const resto = p.din - c.precio, completa = completaCon(e, i, j) || bloqueaA(e, i, j);
      const quiere = completa || (c.tipo === 'trans' ? resto >= N.res * 0.6 : resto >= N.res * N.comp);
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
      if (p.ret) {
        if (p.tarj.length) return { t: 'usarPase' };
        const libres = e.prop.filter((q) => q && q.o === -1).length;
        if (libres >= 8 && p.din > N.res + e.cfg.fianza + 100) return { t: 'pagarRetencion' };
        return { t: 'tirar' };
      }
      return levantar(e, j) || construir(e, j) || { t: 'tirar' };
    }
    case 'fin': return construir(e, j) || levantar(e, j) || { t: 'terminar' };
    default: return null;
  }
}
