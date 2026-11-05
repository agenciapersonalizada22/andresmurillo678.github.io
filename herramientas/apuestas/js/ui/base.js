/* Utilidades de interfaz: DOM seguro (sin innerHTML), formato, avisos, dialogos. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var U = A.ui = {};
  var S = A.S = { cfg: {}, apuestas: [], datos: null, demo: false, estadoDatos: 'carga' };

  U.h = function (tag, attrs) {
    var el = document.createElement(tag), i, k, v;
    for (k in attrs) {
      v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') for (var d in v) el.dataset[d] = v[d];
      else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled' || k === 'hidden') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  };
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  var h = U.h;
  U.vaciar = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  U.montar = function (el) { U.vaciar(el); for (var i = 1; i < arguments.length; i++) add(el, arguments[i]); return el; };

  /* ---- formato ---- */
  var nf = {};
  function nfmt(dec) { return nf[dec] || (nf[dec] = new Intl.NumberFormat('es', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' })); }
  U.n = function (x, dec) { return x == null || !isFinite(x) ? '-' : nfmt(dec == null ? 2 : dec).format(x); };
  U.m = function (x, signo) {
    if (x == null || !isFinite(x)) return '-';
    var s = (S.cfg.moneda || '$'), t = nfmt(2).format(Math.abs(x));
    return (x < 0 ? '−' : signo && x > 0 ? '+' : '') + s + t;
  };
  U.p = function (x, dec, signo) { return x == null || !isFinite(x) ? '-' : (x < 0 ? '−' : signo && x > 0 ? '+' : '') + nfmt(dec == null ? 1 : dec).format(Math.abs(x) * 100) + '%'; };
  U.clase = function (x) { return x > 0 ? 'pos' : x < 0 ? 'neg' : ''; };
  U.cuota = function (dec) { return A.cuotas.texto(dec, S.cfg.formato || 'decimal'); };
  U.leerNum = function (v) {
    if (typeof v === 'object' && v) v = v.value;
    var s = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || s === '-' || s === '.') return NaN;
    return Number(s);
  };
  U.fechaHora = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  U.hace = function (ms) {
    if (ms == null) return '';
    var m = Math.round(ms / 60000);
    return m < 1 ? 'hace instantes' : m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d';
  };

  /* ---- controles ---- */
  var idc = 0;
  U.id = function () { return 'u' + (++idc); };
  U.campo = function (etiqueta, input, ayuda) {
    if (!input.id) input.id = U.id();
    return h('div', { class: 'campo' }, h('label', { for: input.id }, etiqueta), input, ayuda ? h('small', { class: 'muted' }, ayuda) : null);
  };
  U.inputNum = function (o) {
    o = o || {};
    var tactil = o.teclado !== false && g.matchMedia && matchMedia('(pointer:coarse)').matches && o.tecladoPropio;
    var i = h('input', { type: 'text', inputmode: tactil ? 'none' : 'decimal', autocomplete: 'off', placeholder: o.placeholder || '', value: o.valor == null ? '' : String(o.valor), 'aria-label': o.aria, id: o.id, class: 'num' });
    if (o.onInput) i.addEventListener('input', function () { o.onInput(U.leerNum(i)); });
    return i;
  };
  U.texto = function (o) {
    o = o || {};
    var i = h('input', { type: 'text', value: o.valor || '', placeholder: o.placeholder || '', autocomplete: 'off', list: o.lista, maxlength: o.max || 120, id: o.id });
    if (o.onInput) i.addEventListener('input', function () { o.onInput(i.value); });
    return i;
  };
  U.selector = function (opciones, valor, onCambio, id) {
    var s = h('select', { id: id }, opciones.map(function (o) {
      var v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o;
      return h('option', { value: v, selected: String(v) === String(valor) }, t);
    }));
    s.value = valor == null ? '' : valor;
    if (onCambio) s.addEventListener('change', function () { onCambio(s.value); });
    return s;
  };
  U.seg = function (opciones, valor, onCambio, aria) {
    var cont = h('div', { class: 'seg', role: 'tablist', 'aria-label': aria });
    function pintar() {
      U.montar(cont, opciones.map(function (o) {
        var v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o, act = String(v) === String(valor);
        return h('button', { type: 'button', role: 'tab', 'aria-selected': act ? 'true' : 'false', class: act ? 'act' : '', onclick: function () { valor = v; pintar(); onCambio(v); } }, t);
      }));
    }
    pintar();
    return cont;
  };
  U.btn = function (txt, fn, clase, extra) {
    var a = { type: 'button', class: 'btn ' + (clase || ''), onclick: fn }; for (var k in extra) a[k] = extra[k];
    return h('button', a, txt);
  };
  U.kpi = function (etiqueta, valor, sub, clase) {
    return h('div', { class: 'kpi' }, h('span', { class: 'kpi-e' }, etiqueta), h('b', { class: 'kpi-v ' + (clase || '') }, valor), sub ? h('small', { class: 'muted' }, sub) : null);
  };
  U.aviso = function (txt, tipo) { return h('div', { class: 'aviso ' + (tipo || 'info'), role: tipo === 'peligro' ? 'alert' : 'note' }, txt); };
  U.vacio = function (titulo, texto, accion) { return h('div', { class: 'vacio' }, h('b', null, titulo), texto ? h('p', { class: 'muted' }, texto) : null, accion || null); };
  U.tabla = function (cab, filas, clase) {
    return h('div', { class: 'scroll-x' }, h('table', { class: 'tabla ' + (clase || '') },
      h('thead', null, h('tr', null, cab.map(function (c) { return h('th', { scope: 'col', class: c.clase }, c.t || c); }))),
      h('tbody', null, filas)));
  };

  /* ---- avisos y dialogos ---- */
  U.toast = function (msg, tipo) {
    var cont = document.getElementById('toasts'); if (!cont) return;
    var t = h('div', { class: 'toast ' + (tipo || ''), role: 'status' }, msg);
    cont.appendChild(t);
    setTimeout(function () { t.classList.add('sale'); setTimeout(function () { t.remove(); }, 300); }, tipo === 'peligro' ? 6000 : 3200);
  };
  var pilaDlg = [];
  U.modal = function (o) {
    var previo = document.activeElement, cerrado = false;
    var fondo = h('div', { class: 'fondo' });
    var cuerpo = h('div', { class: 'dlg-cuerpo' }, o.contenido);
    var cab = h('div', { class: 'dlg-cab' }, h('h2', { id: 'dlgT' + idc }, o.titulo), o.sinCerrar ? null : h('button', { type: 'button', class: 'btn icono', 'aria-label': 'Cerrar', onclick: function () { cerrar(); } }, '✕'));
    var dlg = h('div', { class: 'dlg ' + (o.clase || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': cab.firstChild.id }, cab, cuerpo, o.pie ? h('div', { class: 'dlg-pie' }, o.pie) : null);
    fondo.appendChild(dlg);
    function cerrar(valor) {
      if (cerrado) return; cerrado = true;
      pilaDlg = pilaDlg.filter(function (x) { return x !== api; });
      fondo.remove(); document.body.classList.toggle('modal', pilaDlg.length > 0);
      if (previo && previo.focus) try { previo.focus(); } catch (e) {}
      if (o.alCerrar) o.alCerrar(valor);
    }
    var api = { cerrar: cerrar, el: dlg, cuerpo: cuerpo, sinCerrar: !!o.sinCerrar };
    if (!o.sinCerrar) fondo.addEventListener('mousedown', function (e) { if (e.target === fondo) cerrar(); });
    pilaDlg.push(api); document.body.classList.add('modal');
    document.body.appendChild(fondo);
    var f = dlg.querySelector('[autofocus],input,select,textarea,button.primario') || dlg.querySelector('button'); if (f) f.focus();
    return api;
  };
  g.addEventListener('keydown', function (e) {
    var top = pilaDlg[pilaDlg.length - 1];
    if (e.key === 'Escape' && top && !top.sinCerrar) { e.preventDefault(); top.cerrar(); }
    if (e.key === 'Tab' && top) {
      var f = [].slice.call(top.el.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href]')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  U.confirmar = function (msg, si, peligro) {
    return new Promise(function (ok) {
      var m = U.modal({ titulo: 'Confirmar', contenido: h('p', null, msg), alCerrar: function (v) { ok(v === true); },
        pie: [U.btn('Cancelar', function () { m.cerrar(false); }), U.btn(si || 'Aceptar', function () { m.cerrar(true); }, peligro ? 'peligro' : 'primario')] });
    });
  };
  U.descargar = function (nombre, texto, tipo) {
    var url = URL.createObjectURL(new Blob([texto], { type: tipo || 'text/csv;charset=utf-8' }));
    var a = h('a', { href: url, download: nombre }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  U.etiquetaSel = function (ev, sel, linea) {
    switch (sel) {
      case 'local': return ev.local + (linea != null ? ' ' + (linea > 0 ? '+' : '') + linea : '');
      case 'visitante': return ev.visitante + (linea != null ? ' ' + (-linea > 0 ? '+' : '') + (-linea) : '');
      case 'empate': return 'Empate';
      case 'mas': return 'Más de ' + linea;
      case 'menos': return 'Menos de ' + linea;
    }
    return sel;
  };
  U.nombreMercado = function (clave) {
    var p = clave.split('@');
    return p[0] === 'h2h' ? 'Ganador (1X2 / moneyline)' : p[0] === 'totales' ? 'Total (más/menos) ' + p[1] : 'Hándicap ' + p[1];
  };
  U.grupoDeporte = function (clave) {
    var m = { soccer: 'Fútbol', basketball: 'Baloncesto', tennis: 'Tenis', americanfootball: 'Fútbol americano', baseball: 'Béisbol', icehockey: 'Hockey', mma: 'MMA', boxing: 'Boxeo', rugbyunion: 'Rugby', cricket: 'Críquet', golf: 'Golf', aussierules: 'Fútbol australiano', handball: 'Balonmano', volleyball: 'Voleibol' };
    var k = String(clave).split('_')[0]; return m[k] || (k.charAt(0).toUpperCase() + k.slice(1));
  };
})(window);
