/* Vista Informes: semanal/mensual imprimible, CSV/JSON, resumen con IA (consentimiento) y flujos sugeridos. window.AnaV.informes */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, D = g.AnaDatos, Inf = g.AnaInforme, V = g.AnaV = g.AnaV || {}, ultimaIA = 0;
  function descargar(txt, nombre, tipo) { T.descargar(new Blob([txt], { type: tipo }), nombre); }
  function dibujo(modelo) { var pag = Inf.paginar(modelo, 186, 273); return { pag: pag, f: function (i, ce) { return Inf.dibujarPagina(pag, i, ce, modelo); } }; }
  function config(modelo) { var d = dibujo(modelo), L = g.Impresion.calcular({ papel: 'A4', orient: 'vertical', modo: 'cuadricula', cols: 1, filas: 1, mt: 12, md: 12, mb: 12, mi: 12, total: d.pag.length }); return { L: L, f: d.f }; }

  V.informes = function (c) {
    var e = A.est, an = e.an; c.textContent = ''; if (!an) { c.appendChild(U.sinDatos('Leyendo datos…')); return; }
    var aj = D.ajustes(), tipo = aj.periodo, cuerpo = h('div', {}), vista = h('div', { cls: 'an-vistaprev', id: 'vista-previa', hidden: true });
    var radios = h('div', { cls: 'tr-fila an-per', role: 'radiogroup', 'aria-label': 'Periodo del informe' }, [['semanal', 'Semanal (7 días)'], ['mensual', 'Mensual (30 días)']].map(function (p) {
      var i = h('input', { type: 'radio', name: 'periodo', value: p[0], id: 'per-' + p[0] }); i.checked = p[0] === tipo; i.addEventListener('change', function () { tipo = p[0]; aj.periodo = tipo; D.guardarAjustes(aj); pintar(); }); return h('label', { cls: 'tr-chk', for: 'per-' + p[0] }, [i, p[1]]);
    }));
    c.appendChild(U.panel('Periodo', [radios]));
    c.appendChild(cuerpo); var iaBox = h('div', {}), flujos = h('div', {});
    function pintar() {
      cuerpo.textContent = ''; var m = A.modelo(tipo); vista.hidden = true; vista.textContent = '';
      cuerpo.appendChild(U.panel(m.periodo.etiqueta, [U.tiles(m.kpis.map(function (k) { var mejor = k.delta === 0 ? '' : (k.delta > 0) === (k.bueno > 0) ? 'ok' : 'aviso'; return U.tile(U.n(k.valor) + (k.unidad ? ' ' + k.unidad : ''), k.etq, (k.delta > 0 ? '+' : '') + U.n(k.delta) + ' vs. anterior', mejor === 'aviso' ? 'aviso' : ''); })),
        m.alertas.length ? h('div', {}, m.alertas.map(function (a) { return U.nota(a.texto, a.nivel === 'alta' ? 'tr-mal' : 'tr-av'); })) : null,
        m.recomendaciones.length ? h('details', { cls: 'an-det' }, [h('summary', { txt: m.recomendaciones.length + ' recomendación(es) incluidas en el informe' }), h('ul', { cls: 'an-recs' }, m.recomendaciones.map(V.tarjetaRec))]) : null,
        h('div', { cls: 'tr-acciones' }, [
          U.btn('Imprimir informe', function () { var k = config(m); g.Impresion.imprimir(k.L, k.f, {}); A.logro('analisis_informe'); }, 'tr-pri', 'btn-imprimir'),
          U.btn('Vista previa de hojas', function () { var k = config(m); vista.hidden = false; g.Impresion.vistaPrevia(vista, k.L, k.f, { zoom: 'ajustar' }); A.logro('analisis_informe'); }, '', 'btn-previa'),
          U.btn('CSV', function () { descargar(Inf.aCSV(an, m), 'informe_' + m.periodo.tipo + '.csv', 'text/csv;charset=utf-8'); A.logro('analisis_exporto_tablero'); }, '', 'btn-inf-csv'),
          U.btn('JSON', function () { descargar(Inf.aJSON(an, m), 'informe_' + m.periodo.tipo + '.json', 'application/json'); A.logro('analisis_exporto_tablero'); }, '', 'btn-inf-json')]), vista]));
      pintarIA(m);
    }
    function pintarIA(m) {
      iaBox.textContent = ''; var a = D.ajustes(), res = h('div', { cls: 'an-ia-res', role: 'status', 'aria-live': 'polite' }), prev = h('div', {});
      var sel = h('select', { id: 'ia-prov', 'aria-label': 'Proveedor' }, Object.keys(g.VIA.PROVEEDORES).map(function (k) { return h('option', { value: k, txt: g.VIA.PROVEEDORES[k].nombre }); })); sel.value = a.proveedor;
      var base = h('input', { type: 'url', id: 'ia-base', value: a.base, autocomplete: 'off' }), modelo = h('input', { type: 'text', id: 'ia-modelo', value: a.modelo, autocomplete: 'off' }), clave = h('input', { type: 'password', id: 'ia-clave', autocomplete: 'off', placeholder: D.clave() ? '•••••••• (guardada en este dispositivo)' : 'Pega tu clave de API' });
      var anon = h('input', { type: 'checkbox', id: 'ia-anon' }); anon.checked = a.anonimo;
      sel.addEventListener('change', function () { var p = g.VIA.PROVEEDORES[sel.value]; base.value = p.base; modelo.value = p.modelo; });
      function guardarCfg() { var x = D.ajustes(); x.proveedor = sel.value; x.base = base.value.trim(); x.modelo = modelo.value.trim(); x.anonimo = anon.checked; D.guardarAjustes(x); return x; }
      var bPrep = U.btn('Preparar y revisar el envío', function () { guardarCfg(); armar(); }, '', 'btn-ia-preparar');
      function armar() {
        prev.textContent = ''; res.textContent = ''; var x = guardarCfg(), env = g.AnaIA.construir(an, m, e.datos, x.anonimo), host = ''; try { host = new URL(x.base).host; } catch (er) { host = x.base; }
        var ok = h('input', { type: 'checkbox', id: 'ia-ok' }), enviar = U.btn('Enviar a la IA', async function () {
          if (Date.now() - ultimaIA < 5000) { T.aviso('Espera unos segundos entre envíos.', 'error'); return; } var k = clave.value.trim() || D.clave(); if (!k) { T.aviso('Falta tu clave de API.', 'error'); return; }
          if (clave.value.trim()) { D.guardarClave(clave.value.trim()); clave.value = ''; clave.placeholder = '•••••••• (guardada en este dispositivo)'; }
          ultimaIA = Date.now(); enviar.disabled = true; res.textContent = 'Enviando…';
          try { var r = await g.VIA.consultar({ proveedor: x.proveedor, base: x.base, modelo: x.modelo }, k, { sistema: env.sistema, texto: env.mensaje, maxTokens: x.maxTokens }); var txt = g.AnaIA.desanonimizar(r.texto || '', env.mapa); res.textContent = ''; res.appendChild(h('h3', { txt: 'Resumen y plan de mejora (generado por IA)' })); res.appendChild(h('pre', { cls: 'an-pre an-narr', txt: txt || '(respuesta vacía)' })); res.appendChild(h('div', { cls: 'tr-acciones' }, [U.btn('Descargar como texto', function () { descargar(txt, 'resumen_ia.txt', 'text/plain;charset=utf-8'); }, 'tr-chico')])); A.logro('analisis_resumen_ia'); }
          catch (er) { res.textContent = ''; res.appendChild(U.nota(er.message, 'tr-mal')); } enviar.disabled = !ok.checked;
        }, 'tr-pri', 'btn-ia-enviar'); enviar.disabled = true;
        ok.addEventListener('change', function () { enviar.disabled = !ok.checked; });
        prev.appendChild(h('div', { cls: 'tr-panel an-envio' }, [h('h3', { txt: 'Esto es EXACTAMENTE lo que se enviaría' }), h('p', { cls: 'tr-ayuda', txt: 'Destino: ' + host + ' · ' + env.bytes + ' caracteres · secciones: ' + env.secciones.join(', ') + (x.anonimo ? ' · nombres sustituidos por Nombre-N' : ' · incluye los nombres reales de tus proyectos') + '. Nunca se envían notas, textos libres, URLs ni claves.' }),
          h('details', { open: '' }, [h('summary', { txt: 'Instrucciones al modelo' }), h('pre', { cls: 'an-pre', id: 'ia-sistema', txt: env.sistema })]), h('details', { open: '' }, [h('summary', { txt: 'Mensaje con tus métricas' }), h('pre', { cls: 'an-pre', id: 'ia-mensaje', txt: env.mensaje })]),
          h('label', { cls: 'tr-chk', for: 'ia-ok' }, [ok, 'Entiendo y acepto enviar este texto a ' + host + ' con mi propia clave.']), h('div', { cls: 'tr-acciones' }, [enviar])]));
      }
      iaBox.appendChild(U.panel('Resumen narrativo con IA (opcional)', [h('p', { cls: 'tr-sub', txt: 'Usa TU clave de API. Nada se envía hasta que revises el texto exacto y aceptes. La clave se guarda solo en este dispositivo (trabajos_analisis_claves_dispositivo): no se sincroniza ni entra en los respaldos.' }),
        h('label', { for: 'ia-prov', txt: 'Proveedor' }), sel, h('label', { for: 'ia-base', txt: 'URL base' }), base, h('label', { for: 'ia-modelo', txt: 'Modelo' }), modelo, h('label', { for: 'ia-clave', txt: 'Clave de API' }), clave,
        h('div', { cls: 'tr-acciones' }, [D.clave() ? U.btn('Borrar clave guardada', function () { D.guardarClave(null); clave.placeholder = 'Pega tu clave de API'; T.aviso('Clave borrada de este dispositivo.'); }, 'tr-chico tr-peli') : null]),
        h('label', { cls: 'tr-chk', for: 'ia-anon' }, [anon, 'Anonimizar nombres (proyectos, clientes, flujos, equipo, lugares)']), h('div', { cls: 'tr-acciones' }, [bPrep]), prev, res]));
    }
    c.appendChild(iaBox);
    /* flujos sugeridos */
    var base = location.origin + location.pathname.replace(/[^/]*$/, ''), fl = g.AnaFlujos.sugeridos(base);
    c.appendChild(U.panel('Flujos sugeridos para Automatizaciones', [h('p', { cls: 'tr-sub', txt: 'Descarga el JSON e impórtalo en Automatizaciones (botón «Importar»). Son recordatorios que abren Análisis; el cálculo lo hace este módulo.' }), h('ul', { cls: 'an-recs' }, fl.map(function (f) {
      return h('li', { cls: 'an-rec' }, [h('div', { cls: 'an-rec-t' }, [h('b', { txt: f.nombre })]), h('p', { txt: f.desc }), h('p', { cls: 'tr-ayuda', txt: 'Límite: ' + f.limite }), h('div', { cls: 'tr-acciones' }, [U.btn('Descargar JSON', function () { descargar(JSON.stringify(f.flujo, null, 1), 'flujo_' + f.id + '.json', 'application/json'); A.logro('analisis_flujo_sugerido'); }, 'tr-chico', 'btn-flujo-' + f.id)])]);
    }))]));
    pintar();
  };
})(window);
