/* Respaldo completo de los modulos de Trabajos: JSON o ZIP (sin comprimir) y restauracion con vista previa. Puro salvo Blob. window.AnaResp
   Las claves de API (<id>_claves_dispositivo) viven en localStorage y nunca entran; ademas se descartan campos con nombre de clave/token. */
(function (g, f) { var m = f(typeof require === 'function' && typeof module === 'object' ? require('./agregar.js') : g.AnaAgg, typeof require === 'function' && typeof module === 'object' ? require('../../comun/util.js') : g.Tr); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaResp = m; })(typeof self !== 'undefined' ? self : this, function (Agg, Tr) {
  'use strict';
  var R = {}, U = Agg.u, n = U.n, PROHIBIDAS = /^(clave|claves|apikey|api_key|token|secret|password|contrasena|contraseña)$/i;
  R.FORMATO = 'trabajos_respaldo'; R.VERSION = 1;
  function limpiar(v) { return JSON.parse(JSON.stringify(v, function (k, x) { return PROHIBIDAS.test(k) ? undefined : x; })); }

  R.construir = function (datos, o) {
    o = o || {}; var sel = o.modulos, mods = {}, total = 0;
    Agg.MODULOS.forEach(function (d) {
      if (sel && sel.indexOf(d.id) < 0) return; var m = datos.modulos[d.id]; if (!m || !m.registros) return;
      mods[d.id] = { base: d.base, registros: m.regs.map(function (r) { return { k: r.k || r.col + '/' + r.id, col: r.col, id: r.id, t: n(r.t) || n(r.v._t), v: limpiar(r.v) }; }) }; total += m.registros;
    });
    return { formato: R.FORMATO, version: R.VERSION, creado: o.ahora || Date.now(), app: 'trabajos/analisis', total: total, modulos: mods };
  };
  R.aJSON = function (resp, bonito) { return JSON.stringify(resp, null, bonito ? 1 : 0); };
  R.aZip = function (resp) {
    var archivos = [{ nombre: 'manifiesto.json', datos: Tr.bytes(JSON.stringify({ formato: R.FORMATO, version: R.VERSION, creado: resp.creado, app: resp.app, total: resp.total, modulos: Object.keys(resp.modulos).map(function (k) { return { id: k, base: resp.modulos[k].base, registros: resp.modulos[k].registros.length }; }) }, null, 1)) }];
    Object.keys(resp.modulos).forEach(function (k) { archivos.push({ nombre: 'modulos/' + k + '.json', datos: Tr.bytes(JSON.stringify(resp.modulos[k])) }); });
    return Tr.zip(archivos);
  };
  /* lector de ZIP "store" (el que crea Tr.zip): usa el directorio central */
  R.leerZip = function (u8) {
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), i = u8.length - 22, td = new TextDecoder();
    while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error('El archivo no es un ZIP válido.');
    var cnt = dv.getUint16(i + 10, true), pos = dv.getUint32(i + 16, true), out = {};
    for (var k = 0; k < cnt; k++) {
      if (dv.getUint32(pos, true) !== 0x02014b50) throw new Error('ZIP dañado (directorio central).');
      var metodo = dv.getUint16(pos + 10, true), crc = dv.getUint32(pos + 16, true), tam = dv.getUint32(pos + 24, true), ln = dv.getUint16(pos + 28, true), le = dv.getUint16(pos + 30, true), lc = dv.getUint16(pos + 32, true), off = dv.getUint32(pos + 42, true);
      var nombre = td.decode(u8.subarray(pos + 46, pos + 46 + ln)); pos += 46 + ln + le + lc;
      if (metodo !== 0) throw new Error('El ZIP está comprimido; usa un respaldo creado por este módulo (sin compresión) o el JSON.');
      var lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), ini = off + 30 + lnl + lel, datos = u8.subarray(ini, ini + tam);
      if ((Tr.crc32(datos) >>> 0) !== crc) throw new Error('ZIP dañado: falla la suma de control de «' + nombre + '».');
      out[nombre] = datos;
    }
    return out;
  };
  function validar(r) {
    if (!r || typeof r !== 'object' || r.formato !== R.FORMATO) throw new Error('El archivo no es un respaldo de Trabajos.');
    if (n(r.version) > R.VERSION) throw new Error('El respaldo es de una versión más nueva (' + r.version + '); actualiza el módulo.');
    var mods = {}, avisos = [];
    Object.keys(r.modulos || {}).forEach(function (id) {
      var def = Agg.porId(id), m = r.modulos[id]; if (!def) { avisos.push('Módulo desconocido «' + id + '»: se ignora.'); return; }
      var regs = []; (m && Array.isArray(m.registros) ? m.registros : []).forEach(function (x) {
        if (!x || typeof x.k !== 'string' || typeof x.col !== 'string' || x.id == null || !x.v || typeof x.v !== 'object' || x.k !== x.col + '/' + x.id) { avisos.push('Registro inválido omitido en ' + id + '.'); return; }
        regs.push({ k: x.k, col: x.col, id: String(x.id), t: n(x.t) || n(x.v._t), v: limpiar(x.v) });
      });
      mods[id] = { base: def.base, registros: regs };
    });
    return { formato: R.FORMATO, version: r.version, creado: n(r.creado), app: r.app, total: Object.keys(mods).reduce(function (a, k) { return a + mods[k].registros.length; }, 0), modulos: mods, avisos: avisos };
  };
  /* acepta texto JSON, ArrayBuffer/Uint8Array de JSON o de ZIP */
  R.leer = function (entrada) {
    var u8 = typeof entrada === 'string' ? null : entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada), td = new TextDecoder();
    if (u8 && u8[0] === 0x50 && u8[1] === 0x4B) {
      var z = R.leerZip(u8), man = z['manifiesto.json']; if (!man) throw new Error('El ZIP no trae manifiesto.json.');
      var m0 = JSON.parse(td.decode(man)), mods = {}; (m0.modulos || []).forEach(function (e) { var f = z['modulos/' + e.id + '.json']; if (f) mods[e.id] = JSON.parse(td.decode(f)); });
      return validar({ formato: m0.formato, version: m0.version, creado: m0.creado, app: m0.app, modulos: mods });
    }
    var txt = u8 ? td.decode(u8) : entrada, j; try { j = JSON.parse(txt); } catch (e) { throw new Error('El archivo no es JSON ni ZIP válido.'); }
    return validar(j);
  };
  /* vista previa contra los datos locales: por modulo cuantos registros son nuevos, mas recientes en el respaldo o en este dispositivo */
  R.previsualizar = function (resp, datos) {
    return Object.keys(resp.modulos).map(function (id) {
      var def = Agg.porId(id), loc = {}; (datos.modulos[id].regs || []).forEach(function (r) { loc[r.k || r.col + '/' + r.id] = n(r.t) || n(r.v._t); });
      var o = { id: id, nombre: def.nombre, total: resp.modulos[id].registros.length, nuevos: 0, masRecienteRespaldo: 0, masRecienteLocal: 0, iguales: 0, soloLocal: 0 }, vistos = {};
      resp.modulos[id].registros.forEach(function (r) { vistos[r.k] = 1; if (loc[r.k] === undefined) o.nuevos++; else if (r.t > loc[r.k]) o.masRecienteRespaldo++; else if (r.t < loc[r.k]) o.masRecienteLocal++; else o.iguales++; });
      Object.keys(loc).forEach(function (k) { if (!vistos[k]) o.soloLocal++; });
      return o;
    });
  };
  /* modo 'fusionar': el registro mas reciente gana; 'reemplazar': el modulo queda igual al respaldo (borra lo que no esta) */
  R.planRestaurar = function (resp, datos, modo, ids) {
    return Object.keys(resp.modulos).filter(function (id) { return !ids || ids.indexOf(id) >= 0; }).map(function (id) {
      var def = Agg.porId(id), loc = {}; (datos.modulos[id].regs || []).forEach(function (r) { loc[r.k || r.col + '/' + r.id] = n(r.t) || n(r.v._t); });
      var poner = [], borrar = [], vistos = {};
      resp.modulos[id].registros.forEach(function (r) { vistos[r.k] = 1; if (modo === 'reemplazar' ? loc[r.k] !== r.t || loc[r.k] === undefined : (loc[r.k] === undefined || r.t > loc[r.k])) poner.push(r); });
      if (modo === 'reemplazar') Object.keys(loc).forEach(function (k) { if (!vistos[k]) borrar.push(k); });
      return { modulo: id, base: def.base, nombre: def.nombre, poner: poner, borrar: borrar, sync: def.sync };
    });
  };
  R.nombreArchivo = function (ahora, ext) { var d = new Date(ahora); return 'respaldo_trabajos_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '_' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2) + '.' + ext; };
  return R;
});
