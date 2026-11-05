/* Mas: guia de indicadores, ajustes y acerca de. */
(function () {
  var h = UI.h, F = window.Fmt;
  var SUBS = [{ id: 'guia', titulo: 'Guia' }, { id: 'ajustes', titulo: 'Ajustes' }, { id: 'acerca', titulo: 'Aviso y fuentes' }];
  function guia(c) {
    c.appendChild(h('div.banner', { style: 'margin-bottom:10px' }, window.Guia.AVISO));
    var g = h('div.tarjeta.guia'); window.Guia.IND.forEach(function (i) { g.appendChild(h('h3', i.n)); g.appendChild(h('p', h('code.f', i.f))); g.appendChild(h('p', i.t)); g.appendChild(h('p.muted.peq', 'Limitaciones: ' + i.l)); });
    g.appendChild(h('h3', 'Patrones de velas')); var dl = h('dl.kv'); Object.keys(Patrones.INFO).forEach(function (k) { var p = Patrones.INFO[k]; dl.appendChild(h('dt', p.nombre + ' (' + p.sesgo + ')')); dl.appendChild(h('dd.peq', { style: 'text-align:left' }, p.desc)); }); g.appendChild(dl); c.appendChild(g);
  }
  function ajustes(c) {
    var aj = App.ajustes(), mons = ['USD'].concat(Object.keys(Mercado.tasas()).sort()), g = h('div.rejilla.g2');
    var tema = UI.selector([{ id: 'auto', titulo: 'Automatico (sistema)' }, { id: 'oscuro', titulo: 'Oscuro' }, { id: 'claro', titulo: 'Claro' }], aj.tema, { class: 'in', onchange: function () { App.setAjuste('tema', this.value); } }),
      mon = UI.selector(mons, aj.moneda, { class: 'in', onchange: function () { App.setAjuste('moneda', this.value); } }),
      ben = UI.selector([{ id: 'c:bitcoin', titulo: 'Bitcoin' }, { id: 'i:^GSPC', titulo: 'S&P 500' }], aj.benchmark, { class: 'in', onchange: function () { App.setAjuste('benchmark', this.value); } }),
      com = h('input.in', { type: 'number', step: 0.01, min: 0, value: aj.comisionSim, onchange: function () { App.setAjuste('comisionSim', +this.value); } });
    g.appendChild(h('div.tarjeta', h('h2', 'Preferencias'), h('div.form-g', UI.campo('Tema', tema), UI.campo('Moneda base', mon), UI.campo('Benchmark de la cartera simulada', ben), UI.campo('Comision simulada % (al reiniciar la cartera)', com))));
    var demo = h('input', { type: 'checkbox', checked: Mercado.ajustes.forzarDemo }), dir = h('input', { type: 'checkbox', checked: !Mercado.ajustes.sinDirecto });
    g.appendChild(h('div.tarjeta', h('h2', 'Origen de datos'), h('label.fila-flex', demo, 'Forzar modo demo (datos de ejemplo)'), h('label.fila-flex', dir, 'Respaldo directo desde el navegador (CoinGecko / Frankfurter) si falla el proceso de datos'),
      h('button.btn.pri', { type: 'button', style: 'margin-top:8px', onclick: function () { Mercado.ajustes.forzarDemo = demo.checked; Mercado.ajustes.sinDirecto = !dir.checked; Almacen.set('forzarDemo', demo.checked); Mercado.hist = {}; App.recargar(true); } }, 'Aplicar y recargar'), h('p.peq.muted', 'Base de datos en vivo: ' + Datos.base + ' (cambia con ?datos=URL/). No se necesitan claves de API: las APIs publicas usadas no las requieren. Si algun dia las anades, se guardarian solo en este dispositivo.')));
    if (window.CuentaNube) { var cn = h('div.tarjeta'); cn.appendChild(CuentaNube.bloque({ claseBtn: 'btn' })); g.appendChild(cn); }
    var notif = h('span.muted.peq'); notif.textContent = 'Notificaciones: ' + ('Notification' in window ? Notification.permission : 'no soportadas');
    g.appendChild(h('div.tarjeta', h('h2', 'Datos guardados'), h('p.peq.muted', 'Almacenamiento: ' + Almacen.backend + '. Listas, alertas, carteras, dibujos y ajustes viven solo en este navegador.'),
      h('div.fila-flex', h('button.btn', { type: 'button', onclick: function () { UI.descargar('mercados-respaldo.json', JSON.stringify(Almacen.exportar())); } }, 'Exportar respaldo'),
        h('button.btn', { type: 'button', onclick: function () { var f = h('input', { type: 'file', accept: 'application/json', onchange: function () { var r = new FileReader(); r.onload = function () { try { Almacen.importar(JSON.parse(r.result)); UI.toast('Respaldo importado'); App.ir('mas', 'ajustes'); } catch (e) { UI.toast(e.message, 'error'); } }; r.readAsText(f.files[0]); } }); f.click(); } }, 'Importar'),
        h('button.btn', { type: 'button', onclick: function () { if (confirm('Borrar listas, alertas, carteras y ajustes de este navegador?')) { Almacen.lista('').forEach(function (x) { if (x.clave.indexOf('claves_dispositivo') !== 0) Almacen.borrar(x.clave); }); location.reload(); } } }, 'Borrar todo')), notif));
    var ids = [], syms = []; App.listas().forEach(function (l) { l.keys.forEach(function (k) { var a = Mercado.porKey[k]; if (!a) return; if (a.tipo === 'cripto' && ids.indexOf(a.id) < 0) ids.push(a.id); else if (a.tipo === 'accion' && syms.indexOf(a.id) < 0) syms.push(a.id); }); });
    var frag = JSON.stringify({ mercados: { cripto_hist: ids, acciones: syms } }, null, 2);
    g.appendChild(h('div.tarjeta', h('h2', 'Fragmento de configuracion'), h('p.peq.muted', 'Propuesta para scripts/datos/config.json con los activos de tus listas (ajusta las claves a la estructura real de ese archivo):'), h('textarea.in', { readonly: true, rows: 6, style: 'font-family:monospace;font-size:12px' }, frag), h('button.btn.peq', { type: 'button', style: 'margin-top:6px', onclick: function () { try { navigator.clipboard.writeText(frag); UI.toast('Copiado'); } catch (e) { UI.toast('No se pudo copiar', 'error'); } } }, 'Copiar')));
    c.appendChild(g);
  }
  function acerca(c) {
    var t = h('table.t', h('thead', h('tr', h('th', 'Seccion'), h('th', 'Origen'), h('th', 'Edad'), h('th', 'Fuente')))), tb = h('tbody');
    Object.keys(Mercado.sec).forEach(function (k) { var e = Mercado.sec[k]; tb.appendChild(h('tr', h('td', k), h('td', e.origen + (Mercado.obsoleto(k) ? ' · OBSOLETO' : '')), h('td', F.edad(Mercado.edad(k))), h('td', e.obj.fuente || '-'))); }); t.appendChild(tb);
    c.appendChild(h('div.tarjeta', h('h2', 'Aviso legal'), h('p', window.Guia.AVISO_LARGO), h('h2', { style: 'margin-top:14px' }, 'Estado de los datos'), h('div.scroll-x', t),
      h('p.peq.muted', 'Umbrales de "obsoleto": cripto 1 h, noticias y NFT 6 h, acciones 26 h, divisas 31 h. Los modos: vivo (rama de datos), cache (ultima copia), directo (API publica desde tu navegador, con posibles limites de peticiones) y demo (datos inventados).'),
      h('h2', { style: 'margin-top:14px' }, 'Limites conocidos'), h('ul', [
        'Sin servidor propio: las alertas solo se evaluan con la pagina abierta; las ordenes limite/stop simuladas, solo al abrir la app.', 'El historial del contrato es diario (cripto: 365 dias, top 50); VWAP requiere velas intradia y no aplica con datos diarios.',
        'El respaldo directo de divisas (Frankfurter/BCE) no incluye DOP, COP, ARS, CLP ni PEN; CoinGecko limita las peticiones sin clave (error 429).', 'Los patrones de velas y el indice de miedo/codicia son heuristicas educativas.'].map(function (x) { return h('li', x); }))));
  }
  App.registrar('mas', function (cont, r) {
    var sub = SUBS.some(function (s) { return s.id === r.sub; }) ? r.sub : 'guia', raiz = h('div'); cont.appendChild(raiz);
    raiz.appendChild(h('h1', 'Mas')); raiz.appendChild(UI.pestanas(SUBS, sub, function (id) { App.ir('mas', id); }, 'Mas'));
    ({ guia: guia, ajustes: ajustes, acerca: acerca })[sub](raiz); raiz.appendChild(h('p.legal-pie', window.Guia.AVISO)); return {};
  });
})();
