/* Datos sinteticos de los 9 modulos con resultados conocidos (ver analisis.test.js). fixture(ahora) -> entradas {id:{existe,regs}} y ls/sync/estimate.
   Las fechas son relativas a `ahora`; el IDB de cada modulo guarda registros {k,col,id,t,v}. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaFixture = m; })(typeof self !== 'undefined' ? self : this, function () {
  function d2(ahora, atras) { var d = new Date(ahora - atras * 864e5); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fixture(ahora) {
    var DIA = 864e5, E = {};
    function reg(col, v, t, creado) { v._t = t; v._creado = creado || t; return { k: col + '/' + v.id, col: col, id: v.id, t: t, v: v }; }
    function base(id, regs) { E[id] = { existe: true, regs: regs }; }
    base('drones', [
      reg('proyectos', { id: 'dp1', nombre: 'Tomas aéreas', mision: { wps: [{ x: 30, y: 40 }], retorno: true } }, ahora - 2 * DIA, ahora - 10 * DIA),
      reg('proyectos', { id: 'dp2', nombre: 'Canal de viajes', mision: { wps: [] } }, ahora - 3 * DIA),
      reg('bitacora', { id: 'b1', fecha: d2(ahora, 3), minutos: 90, baterias: 2, viento: 10, dron: 'Mavic', proyecto: 'dp1', incidencias: '' }, ahora - 3 * DIA),
      reg('bitacora', { id: 'b2', fecha: d2(ahora, 1), minutos: 30, baterias: 1, viento: 20, dron: 'Mavic', proyecto: 'dp1', incidencias: 'viento fuerte' }, ahora - 1 * DIA),
      reg('bitacora', { id: 'b3', fecha: d2(ahora, 40), minutos: 60, baterias: 1, viento: 0, dron: 'Mini', incidencias: '' }, ahora - 40 * DIA)
    ]);
    base('monetizacion', [
      reg('config', { id: 'cfg', moneda: 'USD', tasas: { EUR: 0.9 } }, ahora - 30 * DIA),
      reg('proyectos', { id: 'm1', nombre: 'Tomas aereas' }, ahora - 30 * DIA), reg('proyectos', { id: 'm2', nombre: 'Canal de viajes' }, ahora - 30 * DIA),
      reg('clientes', { id: 'c1', nombre: 'Sol' }, ahora - 30 * DIA), reg('clientes', { id: 'c2', nombre: 'Sol' }, ahora - 29 * DIA),
      reg('movimientos', { id: 'x1', tipo: 'ingreso', fecha: d2(ahora, 5), monto: 1000, moneda: 'USD', proyecto: 'm1', cliente: 'c1', categoria: 'Servicios' }, ahora - 5 * DIA),
      reg('movimientos', { id: 'x2', tipo: 'gasto', fecha: d2(ahora, 4), monto: 200, moneda: 'USD', proyecto: 'm1', categoria: 'Equipo' }, ahora - 4 * DIA),
      reg('movimientos', { id: 'x3', tipo: 'ingreso', fecha: d2(ahora, 6), monto: 900, moneda: 'EUR', proyecto: 'm2', cliente: 'c2', categoria: 'Servicios' }, ahora - 6 * DIA),
      reg('movimientos', { id: 'x4', tipo: 'gasto', fecha: d2(ahora, 6), monto: 100, moneda: 'USD', proyecto: 'm2', categoria: 'Software' }, ahora - 6 * DIA),
      reg('movimientos', { id: 'x5', tipo: 'ingreso', fecha: d2(ahora, 45), monto: 500, moneda: 'USD', cliente: 'c1', categoria: 'Servicios' }, ahora - 45 * DIA),
      reg('facturas', { id: 'f1', tipo: 'factura', numero: 'FAC-1', estado: 'enviada', fecha: d2(ahora, 20), vence: d2(ahora, 7), moneda: 'USD', cliente: 'c1', proyecto: 'm1', lineas: [{ cant: 2, precio: 100 }], pagos: [{ monto: 50 }] }, ahora - 20 * DIA),
      reg('facturas', { id: 'f2', tipo: 'factura', numero: 'FAC-2', estado: 'enviada', fecha: d2(ahora, 2), vence: d2(ahora, -23), moneda: 'USD', cliente: 'c1', lineas: [{ cant: 1, precio: 300 }], pagos: [] }, ahora - 2 * DIA),
      reg('facturas', { id: 'f3', tipo: 'factura', numero: 'FAC-3', estado: 'enviada', fecha: d2(ahora, 3), vence: d2(ahora, -10), moneda: 'USD', cliente: 'c1', lineas: [{ cant: 1, precio: 100 }], pagos: [{ monto: 100 }] }, ahora - 3 * DIA),
      reg('equipo', { id: 'e1', nombre: 'Dron', tipo: 'dron', costo: 3600, residual: 0, vidaMeses: 36, usoHorasMes: 10 }, ahora - 30 * DIA),
      reg('equipo', { id: 'e2', nombre: 'Cámara', tipo: 'camara', costo: 1200, residual: 200, vidaMeses: 20, usoHorasMes: 5 }, ahora - 30 * DIA)
    ]);
    function ej(id, flujo, estado, atras, sim) { return reg('ejecuciones', { id: id, flujo: flujo, nombre: flujo, estado: estado, ini: ahora - atras * DIA, fin: ahora - atras * DIA + 2000, simulacion: !!sim, disparo: { tipo: 'manual' } }, ahora - atras * DIA); }
    base('automatizaciones', [
      reg('flujos', { id: 'fa', nombre: 'Flujo A', activo: true, nodos: [{ id: 'n1', tipo: 'manual' }, { id: 'n2', tipo: 'notificacion' }], aristas: [{ de: 'n1', sal: 'sal', a: 'n2' }] }, ahora - 8 * DIA),
      reg('flujos', { id: 'fb', nombre: 'Flujo B', activo: false, nodos: [{ id: 'n1', tipo: 'manual' }], aristas: [] }, ahora - 8 * DIA),
      ej('e1', 'fa', 'ok', 1), ej('e2', 'fa', 'ok', 2), ej('e3', 'fa', 'ok', 3), ej('e4', 'fa', 'error', 4), ej('e5', 'fb', 'ok', 1), ej('e6', 'fb', 'error', 2), ej('e7', 'fb', 'error', 3), ej('e8', 'fa', 'ok', 1, true)
    ]);
    var pz = [];
    for (var i = 1; i <= 3; i++) pz.push(reg('piezas', { id: 'p' + i, proyecto: 'cp1', titulo: 'Idea ' + i, estado: i === 3 ? 'guion' : 'idea', canal: 'youtube', formato: 'corto' }, ahora - 20 * DIA));
    pz.push(reg('piezas', { id: 'p4', proyecto: 'cp1', titulo: 'Publicada', estado: 'publicado', canal: 'youtube', formato: 'largo', fecha: d2(ahora, 2) }, ahora - 1 * DIA));
    pz.push(reg('piezas', { id: 'p5', proyecto: 'cp1', titulo: 'Lista', estado: 'listo', canal: 'tiktok', formato: 'corto', fecha: '' }, ahora));
    base('contenido-ia', [reg('proyectos', { id: 'cp1', nombre: 'Canal de viajes' }, ahora - 30 * DIA)].concat(pz, [
      reg('metricas', { id: 'mt1', proyecto: 'cp1', fecha: d2(ahora, 20), canal: 'youtube', seguidores: '100', vistas: '1000', ingresos: '5' }, ahora - 20 * DIA),
      reg('metricas', { id: 'mt2', proyecto: 'cp1', fecha: d2(ahora, 2), canal: 'youtube', seguidores: '150', vistas: '500', ingresos: '2.5' }, ahora - 2 * DIA)
    ]));
    base('video-ia', [reg('proyectos', { id: 'vp1', nombre: 'Entrada', cfg: { zonas: [1, 2], lineas: [1] } }, ahora - 5 * DIA), reg('reglas', { id: 'vr1', nombre: 'Aviso', activo: true }, ahora - 5 * DIA), reg('reglas', { id: 'vr2', nombre: 'Otra', activo: false }, ahora - 5 * DIA)]);
    base('reconstruccion-3d', [reg('proyectos', { id: 'rp1', nombre: 'Estatua', capas: [{ id: 'c1', tri: 5000 }, { id: 'c2', tri: 50000, calidad: 80 }, { id: 'c3', tri: 500000, calidad: 60 }], medidas: [{}, {}], notas: 'ok' }, ahora - 6 * DIA)]);
    base('realidad-aumentada', [reg('proyectos', { id: 'ar1', nombre: 'Cartel', capas: [{}, {}], anclas: [{}], objetos: [{}, {}, {}] }, ahora - 1 * DIA, ahora - 9 * DIA)]);
    base('dispositivos', [reg('perfiles', { id: 'dv1', nombre: 'Arduino', tipo: 'serial' }, ahora - 4 * DIA), reg('sesiones', { id: 's1', tipo: 'serial', nombre: 'COM3', inicio: ahora - 1 * DIA, duracion: 120000, bytesRx: 1000, bytesTx: 200 }, ahora - 1 * DIA), reg('sesiones', { id: 's2', tipo: 'camara', nombre: 'cam', inicio: ahora - 2 * DIA, duracion: 60000, error: 'permiso' }, ahora - 2 * DIA)]);
    base('qr', [reg('historial', { id: 'q1', tipo: 'url', texto: 'https://a.com', titulo: 'a', origen: 'crear', fav: true }, ahora - 1 * DIA), reg('historial', { id: 'q2', tipo: 'texto', texto: 'hola', titulo: 'h', origen: 'lectura' }, ahora - 2 * DIA), reg('estilos', { id: 'q3', nombre: 'Azul' }, ahora - 3 * DIA)]);
    return {
      entradas: E,
      ls: { 'contenido-ia': { limites: { llamadas: [1, 2, 3], gasto: (function () { var o = {}; o[d2(ahora, 1)] = 0.6; return o; })() } }, 'video-ia': { limites: { llamadas: [1], gasto: (function () { var o = {}; o[d2(ahora, 0)] = 0.4; return o; })() } } },
      sync: { drones: { ultima: ahora - 2.5 * DIA, lapidas: { 'proyectos/dp2': ahora - 1 * DIA } } },
      estimate: { usage: 80, quota: 100 }
    };
  }
  return fixture;
});
