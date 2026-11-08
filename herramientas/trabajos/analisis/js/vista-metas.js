/* Vista Metas: KPIs configurables con comparador y alertas. window.AnaV.metas */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, D = g.AnaDatos, C = g.AnaCruces, V = g.AnaV = g.AnaV || {};
  var EST = { ok: ['Cumplida', 'ok'], cerca: ['Cerca', 'aviso'], falla: ['No cumplida', 'critico'], sinDatos: ['Sin datos', 'ok'] };
  async function refrescar() { A.est.metas = await D.metas(); A.recalcular(); A.emit('metas'); }
  V.metas = function (c) {
    var an = A.est.an; c.textContent = ''; if (!an) { c.appendChild(U.sinDatos('Leyendo datos…')); return; }
    var mon = an.dom.monetizacion && !an.dom.monetizacion.sinDatos ? an.dom.monetizacion.moneda : '';
    function unidad(k) { return k.unidad === 'moneda' ? mon : k.unidad === 'n' ? '' : k.unidad; }
    var lista = an.metas.length ? h('ul', { cls: 'an-metas', id: 'lista-metas' }, an.metas.map(function (e) {
      var es = EST[e.estado], nombre = e.kpi ? e.kpi.nombre : e.meta.kpi, b = U.btn('Quitar', async function () { await D.borrarMeta(e.meta.id); await refrescar(); V.metas(c); T.aviso('Meta quitada.'); }, 'tr-chico tr-peli'); b.setAttribute('aria-label', 'Quitar la meta ' + nombre);
      return h('li', { cls: 'an-meta an-e-' + e.estado }, [h('div', { cls: 'an-meta-t' }, [h('b', { txt: nombre }), U.chipEstado(es[0], es[1])]), h('p', { cls: 'an-sub', txt: e.estado === 'sinDatos' ? 'Todavía no hay datos para medir esta meta.' : 'Ahora: ' + U.n(e.valor) + ' ' + (unidad(e.kpi) || '') + ' · meta ' + (e.meta.comparador === '<=' ? '≤ ' : '≥ ') + U.n(e.objetivo) + ' ' + (unidad(e.kpi) || '') + (e.meta.alerta === false ? ' · sin alerta' : '') }), b]);
    })) : U.sinDatos('Aún no tienes metas. Añade una abajo o usa las sugeridas.');
    c.appendChild(U.panel('Mis metas', [lista, h('div', { cls: 'tr-acciones' }, [U.btn('Añadir metas sugeridas', async function () { var ya = {}; A.est.metas.forEach(function (m) { ya[m.kpi] = 1; }); var n = 0; for (var i = 0; i < C.METAS_SUGERIDAS.length; i++) { var s = C.METAS_SUGERIDAS[i]; if (ya[s.kpi]) continue; await D.guardarMeta(Object.assign({}, s)); n++; } await refrescar(); V.metas(c); T.aviso(n ? n + ' meta(s) añadida(s).' : 'Ya tienes las sugeridas.'); A.logro('analisis_metas'); }, '', 'btn-metas-sug')])]));
    var sk = h('select', { id: 'meta-kpi' }, C.KPIS.map(function (k) { return h('option', { value: k.id, txt: k.nombre + (unidad(k) ? ' (' + unidad(k) + ')' : '') }); })), sc = h('select', { id: 'meta-comp' }, [h('option', { value: '>=', txt: 'debe ser mayor o igual a' }), h('option', { value: '<=', txt: 'debe ser menor o igual a' })]), ob = h('input', { type: 'number', id: 'meta-obj', step: 'any', value: '0' }), al = h('input', { type: 'checkbox', id: 'meta-alerta' }); al.checked = true;
    sk.addEventListener('change', function () { var k = C.kpi(sk.value); sc.value = k.mejor === 'menor' ? '<=' : '>='; });
    c.appendChild(U.panel('Nueva meta', [h('label', { for: 'meta-kpi', txt: 'Indicador (KPI)' }), sk, h('label', { for: 'meta-comp', txt: 'Condición' }), sc, h('label', { for: 'meta-obj', txt: 'Valor objetivo' }), ob, h('label', { cls: 'tr-chk', for: 'meta-alerta' }, [al, 'Avisar en el tablero cuando no se cumpla']),
      h('div', { cls: 'tr-acciones' }, [U.btn('Añadir meta', async function () { var v = parseFloat(ob.value); if (!isFinite(v)) { T.aviso('Escribe un valor objetivo numérico.', 'error'); return; } await D.guardarMeta({ kpi: sk.value, comparador: sc.value, objetivo: v, alerta: al.checked }); await refrescar(); V.metas(c); T.aviso('Meta añadida.'); A.logro('analisis_metas'); }, 'tr-pri', 'btn-meta-add')]),
      h('p', { cls: 'tr-ayuda', txt: '«Cerca» significa a menos del 10 % del objetivo. Las metas se sincronizan con tu cuenta; los datos medidos nunca salen del dispositivo.' })]));
  };
})(window);
