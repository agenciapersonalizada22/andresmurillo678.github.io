/* Estado compartido, emisor de eventos y dialogos de Automatizaciones. window.AutoApp */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.AutoApp = { est: { flujo: null, ultimas: {} }, escuchas: {} };
  A.on = function (ev, fn) { (A.escuchas[ev] = A.escuchas[ev] || []).push(fn); };
  A.emitir = function (ev, d) { (A.escuchas[ev] || []).forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); };
  A.aviso = T.aviso;
  A.ir = function (v) { if (A.tabs) A.tabs.ir(v); };
  A.boton = function (txt, fn, cls, extra) { return h('button', Object.assign({ type: 'button', cls: 'tr-btn ' + (cls || ''), txt: txt, on: { click: fn } }, extra || {})); };
  A.fmt = function (ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); };
  A.tipoNodo = function (t) { return g.AutoCatalogo.TIPOS[t]; };
  A.color = function (cat) { return g.AutoCatalogo.categorias[cat].color; };
  /* dialogo modal accesible: botones = [{txt, valor, pri}] -> Promise<valor> (Esc = null) */
  A.dialogo = function (titulo, cuerpo, botones) {
    return new Promise(function (ok) {
      var dlg = h('dialog', { cls: 'au-dlg', 'aria-labelledby': 'au-dlg-t' }), fin = function (v) { dlg.close(); dlg.remove(); ok(v); };
      var cont = h('div', { cls: 'au-dlg-c' }, [h('h2', { id: 'au-dlg-t', txt: titulo }), typeof cuerpo === 'string' ? h('p', { txt: cuerpo }) : cuerpo,
        h('div', { cls: 'tr-acciones' }, botones.map(function (b, i) { return h('button', { type: 'button', cls: 'tr-btn' + (b.pri ? ' tr-pri' : ''), txt: b.txt, 'data-valor': String(b.valor), on: { click: function () { fin(b.valor); } } }); }))]);
      dlg.appendChild(cont); dlg.addEventListener('cancel', function (e) { e.preventDefault(); fin(null); }); document.body.appendChild(dlg);
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      var p = dlg.querySelector('.tr-pri') || dlg.querySelector('button'); if (p) p.focus();
    });
  };
  A.confirmar = function (titulo, texto, si, no) { return A.dialogo(titulo, texto, [{ txt: no || 'Cancelar', valor: false }, { txt: si || 'Aceptar', valor: true, pri: true }]).then(function (v) { return v === true; }); };
  A.json = function (v) { try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); } };
})(window);
