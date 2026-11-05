'use strict';
// Validador de esquemas minimo y propio. validar(valor, esquema) -> lista de errores en espanol.

const S = {
  cad: (o = {}) => ({ k: 'cad', ...o }),
  num: (o = {}) => ({ k: 'num', ...o }),
  bool: (o = {}) => ({ k: 'bool', ...o }),
  url: (o = {}) => ({ k: 'url', ...o }),
  iso: (o = {}) => ({ k: 'iso', ...o }),
  arr: (item, o = {}) => ({ k: 'arr', item, ...o }),
  tupla: (items, o = {}) => ({ k: 'tupla', items, ...o }),
  obj: (req = {}, opt = {}, o = {}) => ({ k: 'obj', req, opt, extra: true, ...o }),
  mapa: (valor, o = {}) => ({ k: 'mapa', valor, ...o }),
  cualquiera: () => ({ k: 'any' }),
  nulo: (esq) => ({ ...esq, nulo: true })
};

const tipoDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'arreglo' : typeof v === 'object' ? 'objeto' : typeof v === 'string' ? 'texto' : typeof v === 'number' ? 'numero' : typeof v === 'boolean' ? 'booleano' : typeof v);
const mostrar = (v) => { const s = JSON.stringify(v); return s === undefined ? String(v) : s.length > 40 ? s.slice(0, 37) + '...' : s; };

function validar(v, e, ruta = '$', errs = []) {
  const err = (m) => { if (errs.length < 200) errs.push(`${ruta}: ${m}`); };
  if (v === null || v === undefined) {
    if (!e.nulo && e.k !== 'any') err(v === null ? 'no puede ser null' : 'falta el valor');
    return errs;
  }
  switch (e.k) {
    case 'any': break;
    case 'cad':
      if (typeof v !== 'string') { err(`debe ser texto, es ${tipoDe(v)}`); break; }
      if (e.min !== undefined && v.length < e.min) err(`debe tener al menos ${e.min} caracteres`);
      if (e.max !== undefined && v.length > e.max) err(`debe tener como maximo ${e.max} caracteres (tiene ${v.length})`);
      if (e.enum && !e.enum.includes(v)) err(`debe ser uno de: ${e.enum.join(', ')} (es ${mostrar(v)})`);
      if (e.patron && !e.patron.test(v)) err(`formato invalido ${mostrar(v)}${e.ayuda ? ' (' + e.ayuda + ')' : ''}`);
      break;
    case 'num':
      if (typeof v !== 'number' || !Number.isFinite(v)) { err(`debe ser un numero finito, es ${mostrar(v)}`); break; }
      if (e.entero && !Number.isInteger(v)) err(`debe ser entero (es ${v})`);
      if (e.min !== undefined && v < e.min) err(`debe ser >= ${e.min} (es ${v})`);
      if (e.max !== undefined && v > e.max) err(`debe ser <= ${e.max} (es ${v})`);
      break;
    case 'bool':
      if (typeof v !== 'boolean') err(`debe ser verdadero/falso, es ${tipoDe(v)}`);
      break;
    case 'url':
      if (typeof v !== 'string') { err(`debe ser una URL (texto), es ${tipoDe(v)}`); break; }
      try { const u = new URL(v); if (!/^https?:$/.test(u.protocol)) err(`la URL debe ser http(s): ${mostrar(v)}`); }
      catch { err(`no es una URL valida: ${mostrar(v)}`); }
      break;
    case 'iso':
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(v) || !Number.isFinite(Date.parse(v))) err(`debe ser fecha ISO-8601, es ${mostrar(v)}`);
      break;
    case 'arr':
      if (!Array.isArray(v)) { err(`debe ser un arreglo, es ${tipoDe(v)}`); break; }
      if (e.min !== undefined && v.length < e.min) err(`debe tener al menos ${e.min} elementos (tiene ${v.length})`);
      if (e.max !== undefined && v.length > e.max) err(`debe tener como maximo ${e.max} elementos (tiene ${v.length})`);
      for (let i = 0; i < v.length && errs.length < 200; i++) validar(v[i], e.item, `${ruta}[${i}]`, errs);
      if (e.unico) {
        const vistos = new Set();
        v.forEach((x, i) => { const k = x && typeof x === 'object' ? x[e.unico] : x; if (vistos.has(k)) err(`[${i}] repite ${e.unico} ${mostrar(k)}`); vistos.add(k); });
      }
      break;
    case 'tupla':
      if (!Array.isArray(v)) { err(`debe ser un arreglo, es ${tipoDe(v)}`); break; }
      if (v.length !== e.items.length) err(`debe tener ${e.items.length} elementos (tiene ${v.length})`);
      e.items.forEach((it, i) => validar(v[i], it, `${ruta}[${i}]`, errs));
      break;
    case 'obj': {
      if (tipoDe(v) !== 'objeto') { err(`debe ser un objeto, es ${tipoDe(v)}`); break; }
      for (const [k, s] of Object.entries(e.req)) {
        if (!(k in v)) err(`falta el campo obligatorio "${k}"`);
        else validar(v[k], s, `${ruta}.${k}`, errs);
      }
      for (const [k, s] of Object.entries(e.opt)) if (k in v && v[k] !== undefined) validar(v[k], s, `${ruta}.${k}`, errs);
      if (e.extra === false) {
        for (const k of Object.keys(v)) if (!(k in e.req) && !(k in e.opt)) err(`campo desconocido "${k}"${e.sugerir ? ' (campos validos: ' + [...Object.keys(e.req), ...Object.keys(e.opt)].join(', ') + ')' : ''}`);
      }
      break;
    }
    case 'mapa':
      if (tipoDe(v) !== 'objeto') { err(`debe ser un objeto, es ${tipoDe(v)}`); break; }
      for (const [k, x] of Object.entries(v)) {
        if (e.clave && !e.clave.test(k)) err(`clave invalida ${mostrar(k)}`);
        validar(x, e.valor, `${ruta}.${k}`, errs);
      }
      break;
    default: err(`esquema desconocido ${e.k}`);
  }
  return errs;
}

module.exports = { S, validar };
