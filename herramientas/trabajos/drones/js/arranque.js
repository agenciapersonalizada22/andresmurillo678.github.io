/* Arranque del modulo Drones: tema, cuenta y nube, proyecto, pestañas y vistas. */
(function (g) {
  'use strict';
  const T = g.Tr, A = g.DronApp, CC = g.CuentaTrabajos, D = g.DronDatos, h = T.h;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: D.ID, alm: D.alm, cols: D.COLS, sync: true, etiqueta: 'proyectos, equipo, perfiles de normativa y bitácora (los planos de fondo se quedan en este dispositivo)',
    alAplicar: async n => { try { await A.cargarCatalogos(); await A.abrir(A.est.proy ? A.est.proy.id : null); A.emit('catalogos'); T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } catch (e) { console.warn(e); } } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  function barra() {
    const cont = document.getElementById('barra-proy'); let lista = [];
    async function pintar() {
      lista = await D.proyectos(); cont.textContent = ''; document.getElementById('proy-res').textContent = 'Proyecto: ' + A.est.proy.nombre + ' (cambiar, renombrar, duplicar)';
      const sel = h('select', { id: 'sel-proy', 'aria-label': 'Proyecto' }, lista.map(p => h('option', { value: p.id, txt: p.nombre, selected: p.id === A.est.proy.id })));
      sel.addEventListener('change', async () => { await D.guardarProyecto(A.est.proy); await A.abrir(sel.value); pintar(); });
      const nom = h('input', { type: 'text', id: 'nom-proy', value: A.est.proy.nombre, maxlength: '60', 'aria-label': 'Nombre del proyecto', autocomplete: 'off' });
      nom.addEventListener('input', () => { A.est.proy.nombre = nom.value.trim() || 'Proyecto sin nombre'; A.guardar(); document.getElementById('proy-res').textContent = 'Proyecto: ' + A.est.proy.nombre + ' (cambiar, renombrar, duplicar)'; const o = sel.selectedOptions[0]; if (o) o.textContent = A.est.proy.nombre; A.emit('guion'); });
      cont.appendChild(h('div', { cls: 'dr-proy-sel' }, [h('label', { for: 'sel-proy', txt: 'Proyecto' }), sel]));
      cont.appendChild(h('div', { cls: 'dr-proy-nom' }, [h('label', { for: 'nom-proy', txt: 'Nombre' }), nom]));
      const b = (t, f, c) => A.boton(t, f, 'tr-chico ' + (c || ''));
      cont.appendChild(h('div', { cls: 'dr-proy-bt' }, [
        b('Nuevo', async () => { await D.guardarProyecto(A.est.proy); const p = A.proyectoNuevo('Proyecto ' + (lista.length + 1)); await D.guardarProyecto(p); await A.abrir(p.id); pintar(); A.aviso('Proyecto creado.'); }),
        b('Duplicar', async () => { await D.guardarProyecto(A.est.proy); const c = JSON.parse(JSON.stringify(A.est.proy)); c.id = T.uid(); c.nombre += ' (copia)'; delete c._t; delete c._creado; await D.guardarProyecto(c); if (A.est.plano) await D.guardarPlano(c.id, A.est.plano.dataUrl, A.est.plano.nombre); await A.abrir(c.id); pintar(); }),
        b('Eliminar', async () => { if (!confirm('¿Eliminar el proyecto «' + A.est.proy.nombre + '»?')) return; const id = A.est.proy.id; await D.borrarProyecto(id); A.est.proy = null; await A.abrir(); pintar(); }, 'tr-peli')]));
    }
    A.on('proyecto', pintar); pintar();
  }
  (async function () {
    try {
      await A.cargarCatalogos(); await A.abrir(T.ls('trabajos_drones_proyecto_dispositivo'));
      A.iniciarMision(); A.iniciarSeguridad(); A.iniciarCamara(); A.iniciarTomas(); A.iniciarTelemetria(); barra();
      A.tabs = T.tabs(document.getElementById('pestanas'), v => { if (v === 'mision') A.vistas.mision.mostrar(); if (v === 'telemetria') A.vistas.telemetria.mostrar(); });
      A.vistas.mision.mostrar();
    } catch (e) { console.error(e); T.aviso('No se pudo iniciar el módulo: ' + e.message, 'error'); }
  })();
})(window);
