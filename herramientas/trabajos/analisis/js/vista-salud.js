/* Vista Salud: verificador de integridad, limpieza guiada (vista previa + respaldo previo) y respaldo/restauracion completos. window.AnaV.salud */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, D = g.AnaDatos, I = g.AnaInteg, R = g.AnaResp, Agg = g.AnaAgg, L = g.AnaLector, V = g.AnaV = g.AnaV || {};
  var GRAV = { alta: 'critico', media: 'aviso', baja: 'ok' }, sel = {}, plan = null, respaldoPrevio = false, importado = null;
  function descargar(blob, nombre) { T.descargar(blob, nombre); }
  function exportar(datos, mods, fmt, nombre) {
    var resp = R.construir(datos, { ahora: Date.now(), modulos: mods }), ahora = Date.now();
    if (fmt === 'zip') descargar(R.aZip(resp), nombre || R.nombreArchivo(ahora, 'zip')); else descargar(new Blob([R.aJSON(resp)], { type: 'application/json' }), nombre || R.nombreArchivo(ahora, 'json'));
    return resp;
  }
  function resumenIssues(c, ei) {
    var det = Agg.MODULOS.filter(function (d) { return ei.porModulo[d.id] && ei.porModulo[d.id].verificado; });
    return [U.tiles([U.tile(ei.total, 'Problemas', ei.altas + ' graves', ei.altas ? 'critico' : ei.total ? 'aviso' : ''), U.tile(ei.seguros, 'Reparables con seguridad'), U.tile(det.length + ' / ' + Agg.MODULOS.length, 'Módulos verificados')]),
      det.length ? U.tabla(['Módulo', 'Registros', 'Problemas', 'Graves'], det.map(function (d) { var p = ei.porModulo[d.id]; return [d.nombre, p.registros, p.n ? U.chipEstado(String(p.n), p.altas ? 'critico' : 'aviso') : U.chipEstado('0', 'ok'), p.altas]; })) : U.sinDatos('Ningún módulo tiene datos que verificar.')];
  }
  V.salud = function (c) {
    var e = A.est, ei = e.integridad; c.textContent = ''; if (!ei) { c.appendChild(U.sinDatos('Leyendo datos…')); return; }
    var datos = e.datos, tieneDatos = Agg.MODULOS.filter(function (d) { return datos.modulos[d.id].registros; });
    /* verificador */
    c.appendChild(U.panel('Verificador de integridad', resumenIssues(c, ei).concat([h('div', { cls: 'tr-acciones' }, [U.btn('Verificar de nuevo', async function () { await A.cargar(); }, '', 'btn-verificar')]), h('p', { cls: 'tr-ayuda', txt: 'Comprueba esquemas (tipos y campos obligatorios), referencias rotas (un movimiento que apunta a un proyecto borrado, una conexión a un nodo inexistente…) y duplicados. Solo lee: no cambia nada hasta que tú lo apruebes abajo.' })])));
    /* limpieza */
    var acc = ei.issues.filter(function (x) { return x.accion !== 'revisar'; }), rev = ei.issues.filter(function (x) { return x.accion === 'revisar'; });
    var dest = h('div', { id: 'limpieza-previa' }), btnAplicar = U.btn('Aplicar limpieza', null, 'tr-pri', 'btn-aplicar-limpieza'), btnResp = U.btn('1. Descargar respaldo previo', null, '', 'btn-respaldo-previo'), btnPrev = U.btn('Ver vista previa', null, '', 'btn-vista-limpieza');
    btnAplicar.disabled = true;
    var lista = acc.length ? h('div', { cls: 'an-issues', id: 'lista-issues' }, Agg.MODULOS.map(function (d) {
      var l = acc.filter(function (x) { return x.modulo === d.id; }); if (!l.length) return null;
      return h('fieldset', { cls: 'an-fs' }, [h('legend', { txt: d.nombre + ' (' + l.length + ')' })].concat(l.slice(0, 60).map(function (it, i) {
        var id = 'is-' + d.id + '-' + i, cb = h('input', { type: 'checkbox', id: id }); cb.checked = !!sel[it.id]; cb.addEventListener('change', function () { if (cb.checked) sel[it.id] = 1; else delete sel[it.id]; plan = null; respaldoPrevio = false; btnAplicar.disabled = true; dest.textContent = ''; });
        return h('label', { cls: 'tr-chk an-iss', for: id }, [cb, h('span', {}, [U.chipEstado(it.accion === 'borrar' ? 'borrar' : 'reparar', it.seguro ? 'ok' : 'aviso'), ' ', it.col + '/' + it.rid + ': ' + it.detalle])]);
      })).concat(l.length > 60 ? [h('p', { cls: 'tr-ayuda', txt: '… y ' + (l.length - 60) + ' más (se muestran 60 por módulo).' })] : []));
    })) : U.nota('No hay problemas que se puedan limpiar automáticamente.', 'tr-ok');
    function ids() { return Object.keys(sel); }
    btnPrev.addEventListener('click', function () {
      if (!ids().length) { T.aviso('Marca al menos un problema.', 'error'); return; }
      plan = I.plan(datos, ei.issues, ids(), Date.now()); respaldoPrevio = false; btnAplicar.disabled = true; dest.textContent = '';
      var nb = plan.reduce(function (a, p) { return a + p.borrar.length; }, 0), np = plan.reduce(function (a, p) { return a + p.poner.length; }, 0);
      dest.appendChild(h('div', { cls: 'tr-panel an-envio' }, [h('h3', { txt: 'Vista previa: se borrarán ' + nb + ' registro(s) y se repararán ' + np }),
        h('ul', { cls: 'an-prev' }, plan.reduce(function (a, p) { return a.concat(p.detalle.slice(0, 40).map(function (x) { return h('li', {}, [h('b', { txt: p.nombre + ' · ' + x.accion + ' ' + x.k }), h('br'), x.motivo, x.accion === 'reparar' ? h('code', { txt: ' ' + Object.keys(x.despues).filter(function (k) { return JSON.stringify(x.despues[k]) !== JSON.stringify(x.antes[k]) && k !== '_t'; }).map(function (k) { return k + ': ' + JSON.stringify(x.antes[k]) + ' → ' + JSON.stringify(x.despues[k]); }).join('; ') }) : null]); })); }, [])),
        h('p', { cls: 'tr-ayuda', txt: 'Antes de aplicar es obligatorio guardar un respaldo de los módulos afectados (' + plan.map(function (p) { return p.nombre; }).join(', ') + ').' }), h('div', { cls: 'tr-acciones' }, [btnResp, btnAplicar])]));
    });
    btnResp.addEventListener('click', function () {
      if (!plan) return; exportar(datos, plan.map(function (p) { return p.modulo; }), 'zip', 'respaldo_previo_limpieza_' + Date.now() + '.zip'); D.marcarRespaldo(); respaldoPrevio = true; btnAplicar.disabled = false; T.aviso('Respaldo previo descargado. Ya puedes aplicar la limpieza.');
    });
    btnAplicar.addEventListener('click', async function () {
      if (!plan || !respaldoPrevio) return; if (!g.confirm('Se modificarán los datos de ' + plan.length + ' módulo(s). ¿Aplicar la limpieza? (tienes el respaldo previo)')) return;
      btnAplicar.disabled = true; try { var t = { b: 0, p: 0 }; for (var i = 0; i < plan.length; i++) { var r = await L.aplicar(plan[i]); t.b += r.borrados; t.p += r.puestos; } sel = {}; plan = null; await A.cargar(); T.aviso('Limpieza aplicada: ' + t.b + ' borrado(s), ' + t.p + ' reparado(s).'); A.logro('analisis_limpieza'); } catch (er) { T.aviso('No se pudo aplicar: ' + er.message, 'error'); }
    });
    c.appendChild(U.panel('Limpieza guiada', [h('p', { cls: 'tr-sub', txt: 'Elige qué corregir. Los marcados como «ok» son seguros (por ejemplo, referencias rotas que se vacían o duplicados exactos); los demás conviene revisarlos antes.' }), lista,
      acc.length ? h('div', { cls: 'tr-acciones' }, [U.btn('Marcar los seguros', function () { sel = {}; acc.forEach(function (x) { if (x.seguro) sel[x.id] = 1; }); V.salud(c); }, 'tr-chico', 'btn-sel-seguros'), U.btn('Quitar marcas', function () { sel = {}; V.salud(c); }, 'tr-chico'), btnPrev]) : null, dest,
      rev.length ? h('details', { cls: 'an-det' }, [h('summary', { txt: rev.length + ' problema(s) que debes revisar a mano en el módulo' }), h('ul', { cls: 'an-prev' }, rev.slice(0, 40).map(function (x) { return h('li', {}, [h('b', { txt: Agg.porId(x.modulo).nombre + ' · ' + x.col + '/' + x.rid }), h('br'), x.detalle]); }))]) : null]));
    /* respaldo completo */
    var checks = tieneDatos.map(function (d) { var i = h('input', { type: 'checkbox', id: 'rs-' + d.id, value: d.id }); i.checked = true; return h('label', { cls: 'tr-chk', for: 'rs-' + d.id }, [i, d.nombre + ' (' + datos.modulos[d.id].registros + ')']); });
    var fmtSel = h('select', { id: 'rs-fmt', 'aria-label': 'Formato' }, [h('option', { value: 'zip', txt: 'ZIP (un JSON por módulo)' }), h('option', { value: 'json', txt: 'JSON único' })]);
    c.appendChild(U.panel('Respaldo completo', tieneDatos.length ? [h('p', { cls: 'tr-sub', txt: 'Exporta los datos de los módulos de este dispositivo (incluye los datos que no se sincronizan, como ejecuciones o planos). No incluye claves de API. Último respaldo: ' + U.hace(D.ultimoRespaldo()) + '.' }), h('div', { cls: 'an-checks' }, checks), h('label', { for: 'rs-fmt', txt: 'Formato' }), fmtSel,
      h('div', { cls: 'tr-acciones' }, [U.btn('Exportar respaldo', function () { var m = checks.map(function (l) { return l.querySelector('input'); }).filter(function (i) { return i.checked; }).map(function (i) { return i.value; }); if (!m.length) { T.aviso('Elige al menos un módulo.', 'error'); return; } var r = exportar(datos, m, fmtSel.value); D.marcarRespaldo(); A.recalcular(); T.aviso('Respaldo exportado: ' + r.total + ' registros de ' + m.length + ' módulo(s).'); A.logro('analisis_respaldo'); }, 'tr-pri', 'btn-exportar')])] : [U.sinDatos('No hay datos que respaldar todavía.')]));
    /* importar */
    var out = h('div', { id: 'importar-previa' }), file = h('input', { type: 'file', id: 'rs-archivo', accept: '.json,.zip,application/json,application/zip' });
    file.addEventListener('change', async function () {
      out.textContent = ''; importado = null; var f = file.files[0]; if (!f) return;
      try { importado = R.leer(await f.arrayBuffer()); } catch (er) { out.appendChild(U.nota(er.message, 'tr-mal')); return; }
      var prev = R.previsualizar(importado, datos), modo = h('select', { id: 'rs-modo', 'aria-label': 'Modo de restauración' }, [h('option', { value: 'fusionar', txt: 'Fusionar: gana el registro más reciente' }), h('option', { value: 'reemplazar', txt: 'Reemplazar: el módulo queda igual al respaldo' })]);
      var cks = prev.map(function (p) { var i = h('input', { type: 'checkbox', id: 'im-' + p.id, value: p.id }); i.checked = true; return h('label', { cls: 'tr-chk', for: 'im-' + p.id }, [i, p.nombre]); });
      var bt = U.btn('Hacer respaldo previo y restaurar', async function () {
        var m = cks.map(function (l) { return l.querySelector('input'); }).filter(function (i) { return i.checked; }).map(function (i) { return i.value; }); if (!m.length) { T.aviso('Elige al menos un módulo.', 'error'); return; }
        var pl = R.planRestaurar(importado, datos, modo.value, m), n = pl.reduce(function (a, p) { return a + p.poner.length; }, 0), b = pl.reduce(function (a, p) { return a + p.borrar.length; }, 0);
        if (!g.confirm('Se escribirán ' + n + ' registro(s) y se borrarán ' + b + ' en ' + pl.length + ' módulo(s). Antes se descargará un respaldo de tus datos actuales. ¿Continuar?')) return;
        bt.disabled = true; try { exportar(datos, pl.map(function (p) { return p.modulo; }).filter(function (id) { return datos.modulos[id].registros; }), 'zip', 'respaldo_previo_restauracion_' + Date.now() + '.zip'); for (var i = 0; i < pl.length; i++) await L.aplicar(pl[i]); await A.cargar(); T.aviso('Restaurado: ' + n + ' escritos, ' + b + ' borrados. Abre cada módulo para ver los cambios.'); A.logro('analisis_restauro'); } catch (er) { T.aviso('No se pudo restaurar: ' + er.message, 'error'); bt.disabled = false; }
      }, 'tr-pri', 'btn-restaurar');
      out.appendChild(h('div', { cls: 'tr-panel an-envio' }, [h('h3', { txt: 'Respaldo del ' + U.fecha(importado.creado) + ' · ' + importado.total + ' registros' })].concat(importado.avisos.length ? [U.nota(importado.avisos.slice(0, 3).join(' '), 'tr-av')] : [], [U.tabla(['Módulo', 'Total', 'Nuevos', 'Más reciente en respaldo', 'Más reciente aquí', 'Solo aquí'], prev.map(function (p) { return [p.nombre, p.total, p.nuevos, p.masRecienteRespaldo, p.masRecienteLocal, p.soloLocal]; })), h('div', { cls: 'an-checks' }, cks), h('label', { for: 'rs-modo', txt: 'Modo' }), modo, h('div', { cls: 'tr-acciones' }, [bt])])));
    });
    c.appendChild(U.panel('Restaurar desde un respaldo', [h('p', { cls: 'tr-sub', txt: 'Elige un archivo .zip o .json creado aquí. Verás qué cambiaría antes de aplicar, y se guarda automáticamente un respaldo de lo que hay ahora.' }), h('label', { for: 'rs-archivo', txt: 'Archivo de respaldo' }), file, out]));
  };
})(window);
