/* Modelo de datos: valores por defecto, plantillas y utilidades de dominio. */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), F = G.Fechas || require('./fechas.js');
  var Mo = {};
  Mo.PRIORIDADES = [{ n: 0, nombre: 'Ninguna', color: '#8a8f98' }, { n: 1, nombre: 'Baja', color: '#4f8cff' }, { n: 2, nombre: 'Media', color: '#e0a100' }, { n: 3, nombre: 'Alta', color: '#f0762d' }, { n: 4, nombre: 'Urgente', color: '#e5484d' }];
  Mo.COLORES = ['', '#e5484d', '#f0762d', '#e0a100', '#30a46c', '#12a594', '#3e63dd', '#8e4ec6', '#d6409f'];
  Mo.columnasPorDefecto = function () { return [{ id: 'c1', nombre: 'Por hacer' }, { id: 'c2', nombre: 'En curso' }, { id: 'c3', nombre: 'Hecho' }]; };
  Mo.nota = function (o) {
    var t = Date.now();
    return Object.assign({ id: U.id(), titulo: '', cuerpo: '', color: '', fijada: false, archivada: false, papelera: 0, libreta: '', etiquetas: [], creada: t, modificada: t, cif: null }, o);
  };
  Mo.tarea = function (o) {
    var t = Date.now();
    return Object.assign({ id: U.id(), titulo: '', notas: '', lista: '', padre: '', prioridad: 0, fecha: '', hora: '', inicio: '', rep: null, recordar: null, etiquetas: [],
      estado: 'pendiente', hecha: 0, columna: '', orden: t, estimado: 0, papelera: 0, creada: t, modificada: t }, o);
  };
  Mo.lista = function (o) { return Object.assign({ id: U.id(), nombre: 'Lista', color: '', tipo: 'lista', columnas: Mo.columnasPorDefecto(), archivada: false, orden: Date.now() }, o); };
  Mo.libreta = function (o) { return Object.assign({ id: U.id(), nombre: 'Libreta', color: '', padre: '', orden: Date.now() }, o); };
  Mo.habito = function (o) { return Object.assign({ id: U.id(), nombre: 'Hábito', color: '#30a46c', dias: [0, 1, 2, 3, 4, 5, 6], archivado: false, creada: Date.now() }, o); };

  Mo.etiquetasDe = function (store) {
    var m = {};
    ['notas', 'tareas'].forEach(function (c) { store.lista(c).forEach(function (r) { if (r.papelera) return; (r.etiquetas || []).forEach(function (e) { m[e] = (m[e] || 0) + 1; }); }); });
    return m;
  };
  Mo.arbolEtiquetas = function (conteos) {
    var raiz = { hijos: {}, n: 0 };
    Object.keys(conteos).sort().forEach(function (e) {
      var nodo = raiz, ruta = '';
      e.split('/').forEach(function (p) { ruta = ruta ? ruta + '/' + p : p; nodo.hijos[p] = nodo.hijos[p] || { nombre: p, ruta: ruta, hijos: {}, n: 0 }; nodo = nodo.hijos[p]; nodo.n += conteos[e]; });
    });
    return raiz;
  };
  Mo.plantillas = [
    { id: 'vacia', nombre: 'Nota en blanco', titulo: '', cuerpo: '' },
    { id: 'reunion', nombre: 'Reunión', titulo: 'Reunión {fecha}', etiquetas: ['reuniones'], cuerpo: '## Asistentes\n\n- \n\n## Agenda\n\n1. \n\n## Notas\n\n\n\n## Acuerdos\n\n- [ ] \n\n## Próximos pasos\n\n- [ ] ' },
    { id: 'diario', nombre: 'Diario', titulo: 'Diario {fecha}', etiquetas: ['diario'], cuerpo: '## Gratitud\n\n- \n\n## Lo más importante de hoy\n\n- [ ] \n\n## Reflexión\n\n\n\n## ¿Cómo me siento?\n\n' },
    { id: 'proyecto', nombre: 'Proyecto', titulo: 'Proyecto: ', etiquetas: ['proyectos'], cuerpo: '## Objetivo\n\n\n\n## Alcance\n\n- \n\n## Hitos\n\n| Hito | Fecha | Estado |\n| --- | --- | --- |\n|  |  |  |\n\n## Tareas\n\n- [ ] \n\n## Riesgos\n\n- \n\n## Enlaces\n\n- [[ ]]' },
    { id: 'compras', nombre: 'Lista de compras', titulo: 'Compras {fecha}', etiquetas: ['compras'], cuerpo: '## Frutas y verduras\n\n- [ ] \n\n## Despensa\n\n- [ ] \n\n## Lácteos y carnes\n\n- [ ] \n\n## Hogar\n\n- [ ] ' }
  ];
  Mo.aplicarPlantilla = function (p, hoy) {
    var f = F.etiqueta ? hoy || F.hoy() : hoy;
    return { titulo: (p.titulo || '').replace('{fecha}', f), cuerpo: (p.cuerpo || '').replace(/\{fecha\}/g, f), etiquetas: (p.etiquetas || []).slice() };
  };
  /* racha actual y mejor de un habito; solo cuentan los dias programados y hoy sin marcar no rompe la racha */
  Mo.rachas = function (h, marcas, hoy) {
    var set = marcas instanceof Set ? marcas : new Set(marcas), c = 0, mejor = 0, ini = hoy;
    if (h.creada) { var d = new Date(h.creada); ini = F.fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
    var min = Array.from(set).sort()[0]; if (min && min < ini) ini = min;
    for (var f = ini, n = 0; f <= hoy && n < 4000; f = F.sumDias(f, 1), n++) {
      if (h.dias && h.dias.indexOf(F.diaSemana(f)) < 0) continue;
      if (set.has(f)) { c++; if (c > mejor) mejor = c; } else if (f !== hoy) c = 0;
    }
    return { actual: c, mejor: mejor };
  };
  /* tarea vencida / de hoy / futura */
  Mo.vencida = function (t, hoy) { return t.estado !== 'hecha' && !!t.fecha && (t.fecha < hoy || (t.fecha === hoy && t.hora && t.hora < F.ahoraHM() && false)); };
  Mo.hijos = function (store, id) { return store.lista('tareas', function (t) { return t.padre === id && !t.papelera; }).sort(function (a, b) { return a.orden - b.orden; }); };
  Mo.progreso = function (store, t) { var h = Mo.hijos(store, t.id); return { total: h.length, hechas: h.filter(function (x) { return x.estado === 'hecha'; }).length }; };
  if (typeof module !== 'undefined' && module.exports) module.exports = Mo; else G.Modelo = Mo;
})(typeof window !== 'undefined' ? window : globalThis);
