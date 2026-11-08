/* Almacen del modulo Drones (IndexedDB 'trabajos_drones'). Sincroniza proyectos, equipo propio, normas propias y bitacora; los planos (imagenes) se quedan en el dispositivo. */
(function (g) {
  'use strict';
  const ID = 'trabajos_drones', alm = g.Almacen.crear(ID), D = g.DronDatos = { ID, alm, COLS: ['proyectos', 'equipo', 'normas', 'bitacora'] }, Cat = g.DronCatalogo;
  D.proyectos = () => alm.lista('proyectos').then(l => l.sort((a, b) => (b._t || 0) - (a._t || 0)));
  D.guardarProyecto = p => alm.set('proyectos', p);
  D.borrarProyecto = id => Promise.all([alm.borrar('proyectos', id), alm.borrar('planos', id)]);
  D.equipo = tipo => alm.lista('equipo').then(u => {
    const base = { camara: Cat.CAMARAS, lente: Cat.LENTES, nd: Cat.ND, gimbal: Cat.GIMBALS, montura: Cat.MONTURAS }, todos = Cat.fusionar([].concat(Cat.CAMARAS, Cat.LENTES, Cat.ND, Cat.GIMBALS, Cat.MONTURAS), u);
    return (tipo ? todos.filter(x => x.tipo === tipo) : todos).sort((a, b) => a.nombre < b.nombre ? -1 : 1);
  });
  D.guardarEquipo = it => alm.set('equipo', it);
  D.borrarEquipo = it => it.base || it.editado ? (it.base ? alm.set('equipo', { id: it.id, tipo: it.tipo, nombre: it.nombre, oculto: true }) : alm.borrar('equipo', it.id)) : alm.borrar('equipo', it.id);
  D.restablecerEquipo = id => alm.borrar('equipo', id);
  D.normas = () => alm.lista('normas').then(u => Cat.fusionar(Cat.NORMAS, u));
  D.guardarNorma = n => alm.set('normas', n);
  D.borrarNorma = n => n.base ? alm.set('normas', { id: n.id, nombre: n.nombre, oculto: true }) : alm.borrar('normas', n.id);
  D.restablecerNorma = id => alm.borrar('normas', id);
  D.bitacora = () => alm.lista('bitacora').then(l => l.sort((a, b) => (b.fecha || '') < (a.fecha || '') ? -1 : 1));
  D.guardarVuelo = e => alm.set('bitacora', e);
  D.borrarVuelo = id => alm.borrar('bitacora', id);
  D.guardarPlano = (id, dataUrl, nombre) => alm.set('planos', { id, dataUrl, nombre });
  D.plano = id => alm.get('planos', id);
  D.quitarPlano = id => alm.borrar('planos', id);
})(window);
