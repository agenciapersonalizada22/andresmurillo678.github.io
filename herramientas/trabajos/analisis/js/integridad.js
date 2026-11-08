/* Verificador de integridad (esquemas, referencias rotas, duplicados) y plan de limpieza. Puro. window.AnaInteg
   verificar(datos) -> {issues, total, altas, porModulo}; plan(datos, issues, ids, ahora) -> operaciones por modulo sin tocar nada; aplicarOps(regs, ops) -> registros resultantes. */
(function (g, f) { var m = f(typeof require === 'function' && typeof module === 'object' ? require('./agregar.js') : g.AnaAgg); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaInteg = m; })(typeof self !== 'undefined' ? self : this, function (Agg) {
  'use strict';
  var I = {}, U = Agg.u, n = U.n, norm = U.norm, FECHA = /^\d{4}-\d{2}-\d{2}/;
  var TIPOS_DISP = ['serial', 'bluetooth', 'usb', 'hid', 'camara', 'microfono', 'mando', 'sensores', 'puente'];
  var ESTADOS_PIEZA = ['idea', 'guion', 'produccion', 'listo', 'programado', 'publicado'];
  /* req: campos obligatorios {campo: tipo}; opt: si existen deben tener el tipo; enm: valores permitidos; pat: expresion; tipos: string number array object boolean */
  var ESQ = {
    qr: { historial: { req: { texto: 'string', tipo: 'string' }, opt: { fav: 'boolean' } }, estilos: { req: { nombre: 'string' } } },
    dispositivos: { perfiles: { req: { nombre: 'string', tipo: 'string' }, enm: { tipo: TIPOS_DISP } }, sesiones: { req: { tipo: 'string', inicio: 'number' }, opt: { duracion: 'number' } } },
    drones: { proyectos: { req: { nombre: 'string', mision: 'object' }, sub: { mision: { wps: 'array' } } }, bitacora: { req: { fecha: 'string' }, opt: { minutos: 'number', baterias: 'number', viento: 'number' }, pat: { fecha: FECHA } }, equipo: { req: { nombre: 'string' } }, normas: { req: { nombre: 'string' } } },
    automatizaciones: { flujos: { req: { nombre: 'string', nodos: 'array', aristas: 'array' } }, almacen: { req: {} }, ejecuciones: { req: { flujo: 'string', estado: 'string' }, opt: { ini: 'number' } } },
    'video-ia': { proyectos: { req: { nombre: 'string' }, opt: { cfg: 'object' } }, reglas: { req: { nombre: 'string' } } },
    'reconstruccion-3d': { proyectos: { req: { nombre: 'string' }, opt: { capas: 'array', medidas: 'array' } } },
    'realidad-aumentada': { proyectos: { req: { nombre: 'string' }, opt: { capas: 'array', anclas: 'array', objetos: 'array' } } },
    'contenido-ia': { proyectos: { req: { nombre: 'string' } }, piezas: { req: { proyecto: 'string' }, enm: { estado: ESTADOS_PIEZA }, opt: { fecha: 'string' } }, series: { req: {} }, prompts: { req: {} }, metricas: { req: { fecha: 'string' }, pat: { fecha: FECHA } }, respuestas: { req: {} } },
    monetizacion: {
      config: { req: {} }, movimientos: { req: { tipo: 'string', fecha: 'string', monto: 'number' }, enm: { tipo: ['ingreso', 'gasto'] }, pat: { fecha: FECHA } }, proyectos: { req: { nombre: 'string' } }, clientes: { req: { nombre: 'string' } },
      recurrentes: { req: { tipo: 'string', monto: 'number' } }, facturas: { req: { tipo: 'string', lineas: 'array' }, enm: { tipo: ['factura', 'cotizacion'] }, opt: { pagos: 'array' } }, paquetes: { req: {} }, equipo: { req: { nombre: 'string', costo: 'number' } }, escenarios: { req: {} }, cifrado: { req: {} }
    }
  };
  /* colecciones que el modulo guarda solo en este dispositivo: se aceptan sin esquema estricto */
  var LOCALES = { drones: ['planos'], automatizaciones: ['config_dispositivo'], 'reconstruccion-3d': ['mallas'], 'realidad-aumentada': ['png', 'modelos', 'envios'] };

  function tipo(x) { return Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x; }
  function issue(m, c, r, t, g, d, acc, seguro, fix) { return { id: [m, c, r, t, d].join('|'), modulo: m, col: c, rid: r, tipo: t, gravedad: g, detalle: d, accion: acc, seguro: !!seguro, fix: fix || null }; }

  function esquema(m, def, out) {
    var spec = ESQ[def.id] || {}, locales = LOCALES[def.id] || [];
    m.regs.forEach(function (r) {
      var c = String(r.col), v = r.v, rid = String(r.id || v.id || ''), s = spec[c];
      if (v.id != null && String(v.id) !== rid) out.push(issue(def.id, c, rid, 'esquema', 'alta', 'El id guardado («' + v.id + '») no coincide con la clave del registro.', 'reparar', true, { set: { id: rid } }));
      if (!s) { if (locales.indexOf(c) < 0 && c !== '?') out.push(issue(def.id, c, rid, 'esquema', 'baja', 'Colección «' + c + '» no reconocida (¿otra versión del módulo?). No se toca.', 'revisar', false)); return; }
      Object.keys(s.req || {}).forEach(function (k) {
        if (v[k] === undefined || v[k] === null) out.push(issue(def.id, c, rid, 'esquema', 'alta', 'Falta el campo obligatorio «' + k + '».', 'revisar', false));
        else if (tipo(v[k]) !== s.req[k]) out.push(issue(def.id, c, rid, 'esquema', 'alta', 'El campo «' + k + '» debería ser ' + s.req[k] + ' y es ' + tipo(v[k]) + '.', 'revisar', false));
      });
      Object.keys(s.opt || {}).forEach(function (k) { if (v[k] !== undefined && v[k] !== null && v[k] !== '' && tipo(v[k]) !== s.opt[k]) out.push(issue(def.id, c, rid, 'esquema', 'media', 'El campo «' + k + '» debería ser ' + s.opt[k] + ' y es ' + tipo(v[k]) + '.', 'revisar', false)); });
      Object.keys(s.enm || {}).forEach(function (k) { if (v[k] !== undefined && v[k] !== '' && s.enm[k].indexOf(v[k]) < 0) out.push(issue(def.id, c, rid, 'esquema', 'media', 'Valor «' + v[k] + '» no válido en «' + k + '».', 'revisar', false)); });
      Object.keys(s.pat || {}).forEach(function (k) { if (typeof v[k] === 'string' && !s.pat[k].test(v[k])) out.push(issue(def.id, c, rid, 'esquema', 'media', 'El campo «' + k + '» («' + String(v[k]).slice(0, 20) + '») no tiene el formato esperado.', 'revisar', false)); });
      Object.keys(s.sub || {}).forEach(function (k) { if (v[k] && typeof v[k] === 'object') Object.keys(s.sub[k]).forEach(function (q) { if (v[k][q] !== undefined && tipo(v[k][q]) !== s.sub[k][q]) out.push(issue(def.id, c, rid, 'esquema', 'alta', 'El campo «' + k + '.' + q + '» debería ser ' + s.sub[k][q] + '.', 'revisar', false)); }); });
    });
  }

  function ids(m, c) { var o = {}; Agg.col(m, c).forEach(function (x) { if (x.id != null) o[x.id] = 1; }); return o; }
  function ref(out, m, def, c, campo, destino, etiquetaDestino, extra) {
    var ok = ids(extra || m, destino);
    m.regs.forEach(function (r) { if (String(r.col) !== c) return; var v = r.v, x = v[campo]; if (x === undefined || x === null || x === '') return; if (!ok[x]) out.push(issue(def.id, c, String(r.id || v.id), 'referencia', 'media', '«' + campo + '» apunta a ' + etiquetaDestino + ' «' + x + '» que ya no existe.', 'reparar', true, { unset: [campo] })); });
  }
  function referencias(m, def, out) {
    var id = def.id;
    if (id === 'monetizacion') {
      ref(out, m, def, 'movimientos', 'proyecto', 'proyectos', 'un proyecto'); ref(out, m, def, 'movimientos', 'cliente', 'clientes', 'un cliente'); ref(out, m, def, 'movimientos', 'factura', 'facturas', 'una factura'); ref(out, m, def, 'movimientos', 'recurrente', 'recurrentes', 'un recurrente');
      ref(out, m, def, 'facturas', 'cliente', 'clientes', 'un cliente'); ref(out, m, def, 'facturas', 'proyecto', 'proyectos', 'un proyecto'); ref(out, m, def, 'recurrentes', 'proyecto', 'proyectos', 'un proyecto'); ref(out, m, def, 'recurrentes', 'cliente', 'clientes', 'un cliente');
    } else if (id === 'drones') {
      ref(out, m, def, 'bitacora', 'proyecto', 'proyectos', 'un proyecto');
      var ps = ids(m, 'proyectos'); m.regs.forEach(function (r) { if (String(r.col) === 'planos' && !ps[r.id]) out.push(issue(id, 'planos', String(r.id), 'referencia', 'baja', 'Plano de fondo de un proyecto que ya no existe.', 'borrar', true)); });
    } else if (id === 'contenido-ia') {
      ['piezas', 'series', 'prompts', 'metricas'].forEach(function (c) { ref(out, m, def, c, 'proyecto', 'proyectos', 'un proyecto'); });
    } else if (id === 'automatizaciones') {
      m.regs.forEach(function (r) {
        var c = String(r.col), v = r.v;
        if (c === 'flujos' && Array.isArray(v.nodos) && Array.isArray(v.aristas)) {
          var nid = {}; v.nodos.forEach(function (x) { if (x && x.id != null) nid[x.id] = 1; });
          var buenas = v.aristas.filter(function (a) { return a && nid[a.de] && nid[a.a]; });
          if (buenas.length !== v.aristas.length) out.push(issue(id, c, String(r.id), 'referencia', 'media', (v.aristas.length - buenas.length) + ' conexión(es) apuntan a nodos que no existen.', 'reparar', true, { set: { aristas: buenas } }));
        }
      });
      var fl = ids(m, 'flujos'); m.regs.forEach(function (r) { if (String(r.col) === 'ejecuciones' && r.v.flujo && !fl[r.v.flujo]) out.push(issue(id, 'ejecuciones', String(r.id), 'referencia', 'baja', 'Ejecución de un flujo que ya no existe.', 'borrar', true)); });
    } else if (id === 'reconstruccion-3d') {
      var pr = Agg.col(m, 'proyectos'); m.regs.forEach(function (r) {
        if (String(r.col) !== 'mallas') return; var rid = String(r.id), p = pr.filter(function (x) { return rid.indexOf(x.id + '_') === 0; })[0];
        if (!p) out.push(issue(id, 'mallas', rid, 'referencia', 'baja', 'Malla local de un proyecto que ya no existe.', 'borrar', true));
      });
    }
  }

  function dupes(out, m, def, c, claveFn, opts) {
    opts = opts || {}; var grupos = {};
    m.regs.forEach(function (r) { if (String(r.col) !== c) return; var k = claveFn(r.v); if (!k) return; (grupos[k] = grupos[k] || []).push(r); });
    Object.keys(grupos).forEach(function (k) {
      var l = grupos[k]; if (l.length < 2) return;
      l.sort(function (a, b) { return (n(b.t) || n(b.v._t)) - (n(a.t) || n(a.v._t)) || (String(a.id) < String(b.id) ? -1 : 1); });
      l.slice(1).forEach(function (r) { out.push(issue(def.id, c, String(r.id), 'duplicado', opts.gravedad || 'baja', 'Duplicado de «' + String(l[0].id) + '» (' + (opts.etq || k.slice(0, 40)) + '). Se conserva el más reciente.', 'borrar', opts.seguro !== false)); });
    });
  }
  function duplicados(m, def, out) {
    var id = def.id;
    if (id === 'qr') dupes(out, m, def, 'historial', function (v) { return v.tipo && v.texto ? v.tipo + '\u0001' + v.texto : ''; }, { etq: 'mismo tipo y texto' });
    if (id === 'dispositivos') dupes(out, m, def, 'perfiles', function (v) { return v.nombre ? norm(v.nombre) + '|' + v.tipo : ''; }, { etq: 'mismo nombre y tipo', seguro: false });
    if (id === 'drones') dupes(out, m, def, 'bitacora', function (v) { return v.fecha ? [v.fecha, v.piloto, v.dron, v.minutos, v.lugar, v.despegue, v.aterrizaje, v.proyecto].join('|') : ''; }, { etq: 'mismo vuelo', seguro: false });
    if (id === 'automatizaciones') dupes(out, m, def, 'flujos', function (v) { try { return v.nombre ? norm(v.nombre) + '|' + JSON.stringify(v.nodos) + JSON.stringify(v.aristas) : ''; } catch (e) { return ''; } }, { etq: 'mismo nombre y mismos nodos' });
    if (id === 'contenido-ia') dupes(out, m, def, 'piezas', function (v) { return v.titulo ? norm(v.titulo) + '|' + v.canal + '|' + v.proyecto : ''; }, { etq: 'mismo título, canal y proyecto', seguro: false });
    if (id === 'monetizacion') {
      dupes(out, m, def, 'clientes', function (v) { return v.nombre ? norm(v.nombre) : ''; }, { etq: 'mismo nombre', seguro: false });
      dupes(out, m, def, 'proyectos', function (v) { return v.nombre ? norm(v.nombre) : ''; }, { etq: 'mismo nombre', seguro: false });
      dupes(out, m, def, 'movimientos', function (v) { return v.recurrente ? ['rec', v.recurrente, v.fecha].join('|') : ''; }, { etq: 'recurrente generado dos veces el mismo día', gravedad: 'media' });
      dupes(out, m, def, 'movimientos', function (v) { return !v.recurrente && v.fecha ? [v.fecha, v.tipo, v.monto, v.moneda, v.categoria, v.proyecto, v.cliente, v.nota].join('|') : ''; }, { etq: 'misma fecha, monto, categoría y nota', seguro: false });
    }
  }

  I.verificar = function (datos) {
    var out = [], porModulo = {};
    Agg.MODULOS.forEach(function (def) {
      var m = datos.modulos[def.id], antes = out.length; if (!m || !m.registros) { porModulo[def.id] = { n: 0, altas: 0, verificado: false }; return; }
      try { esquema(m, def, out); referencias(m, def, out); duplicados(m, def, out); } catch (e) { out.push(issue(def.id, '?', '', 'esquema', 'baja', 'No se pudo verificar este módulo: ' + (e && e.message), 'revisar', false)); }
      var mi = out.slice(antes); porModulo[def.id] = { n: mi.length, altas: mi.filter(function (x) { return x.gravedad === 'alta'; }).length, verificado: true, registros: m.registros };
    });
    var vistos = {}; out = out.filter(function (x) { if (vistos[x.id]) return false; vistos[x.id] = 1; return true; });
    return { issues: out, total: out.length, altas: out.filter(function (x) { return x.gravedad === 'alta'; }).length, porModulo: porModulo, seguros: out.filter(function (x) { return x.seguro; }).length };
  };

  /* operaciones por modulo para los problemas elegidos (ids). No modifica datos. */
  I.plan = function (datos, issues, ids, ahora) {
    var sel = {}; ids.forEach(function (x) { sel[x] = 1; }); ahora = ahora || Date.now();
    var por = {}; issues.forEach(function (it) { if (!sel[it.id] || it.accion === 'revisar') return; (por[it.modulo] = por[it.modulo] || []).push(it); });
    return Object.keys(por).map(function (mid) {
      var m = datos.modulos[mid], def = Agg.porId(mid), borrar = {}, poner = {}, detalle = [];
      var porK = {}; m.regs.forEach(function (r) { porK[r.col + '/' + r.id] = r; });
      por[mid].forEach(function (it) {
        var k = it.col + '/' + it.rid, r = porK[k]; if (!r) return;
        if (it.accion === 'borrar') { borrar[k] = 1; detalle.push({ accion: 'borrar', k: k, motivo: it.detalle }); return; }
        var v = poner[k] ? poner[k].v : JSON.parse(JSON.stringify(r.v));
        if (it.fix && it.fix.set) Object.keys(it.fix.set).forEach(function (f) { v[f] = it.fix.set[f]; });
        if (it.fix && it.fix.unset) it.fix.unset.forEach(function (f) { delete v[f]; });
        v._t = ahora; poner[k] = { k: k, col: r.col, id: r.id, t: ahora, v: v }; detalle.push({ accion: 'reparar', k: k, motivo: it.detalle, antes: r.v, despues: v });
      });
      Object.keys(borrar).forEach(function (k) { delete poner[k]; });
      return { modulo: mid, base: def.base, nombre: def.nombre, borrar: Object.keys(borrar), poner: Object.keys(poner).map(function (k) { return poner[k]; }), detalle: detalle, sync: def.sync };
    });
  };
  I.aplicarOps = function (regs, ops) {
    var del = {}; ops.borrar.forEach(function (k) { del[k] = 1; }); var m = {}; regs.forEach(function (r) { if (!del[r.k || r.col + '/' + r.id]) m[r.k || r.col + '/' + r.id] = r; });
    ops.poner.forEach(function (r) { m[r.k] = r; }); return Object.keys(m).map(function (k) { return m[k]; });
  };
  return I;
});
