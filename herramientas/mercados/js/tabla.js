/* Tabla virtualizada: solo se pintan las filas visibles. Columnas: {id, titulo, ancho, alinear, num, valor(fila), html(fila)->string seguro, ocultarMovil}.
   TablaVirtual(contenedor, {columnas, alto, alAbrir(fila), clave(fila), vacio}) ; .setFilas(rows) ; .ordenar(id, dir) ; .setFiltro(fn) ; .mover(d) ; .abrirSeleccion() */
(function () {
  function TablaVirtual(cont, o) {
    var T = this, alto = o.alto || 40, cols = o.columnas.filter(function (c) { return !(c.ocultarMovil && window.innerWidth < 640); }), filas = [], vista = [], orden = o.orden || null, filtro = null, sel = 0, buf = 6;
    T.el = cont; cont.classList.add('tabla'); cont.setAttribute('role', 'grid'); cont.tabIndex = 0;
    var mov = window.innerWidth < 640, ancho = function (c) { return (mov && c.anchoMovil) || c.ancho || 90; };
    var tpl = cols.map(function (c) { return ancho(c) + 'px'; }).join(' ');
    var total = cols.reduce(function (s, c) { return s + ancho(c); }, 0);
    var cab = document.createElement('div'); cab.className = 'tabla-cab'; cab.setAttribute('role', 'row'); cab.style.gridTemplateColumns = tpl; cab.style.minWidth = total + 'px';
    var cuerpo = document.createElement('div'); cuerpo.className = 'tabla-cuerpo';
    var esp = document.createElement('div'); esp.className = 'tabla-esp'; esp.style.minWidth = total + 'px';
    var ven = document.createElement('div'); ven.className = 'tabla-ven'; ven.style.minWidth = total + 'px';
    esp.appendChild(ven); cuerpo.appendChild(esp); cont.appendChild(cab); cont.appendChild(cuerpo);
    var vacio = document.createElement('div'); vacio.className = 'tabla-vacio'; vacio.hidden = true; vacio.textContent = o.vacio || 'Sin resultados'; cont.appendChild(vacio);
    cols.forEach(function (c) {
      var d = document.createElement('button'); d.type = 'button'; d.className = 'th' + (c.alinear === 'der' ? ' der' : '') + (c.ocultarMovil ? ' no-movil' : ''); d.setAttribute('role', 'columnheader'); d.dataset.col = c.id; d.textContent = c.titulo;
      d.addEventListener('click', function () { T.ordenar(c.id, orden && orden.id === c.id ? -orden.dir : (c.num ? -1 : 1)); }); cab.appendChild(d);
    });
    function cmp(c, dir) {
      return function (a, b) {
        var x = c.valor(a), y = c.valor(b), nx = x == null || (c.num && !isFinite(x)), ny = y == null || (c.num && !isFinite(y));
        if (nx || ny) return nx && ny ? 0 : nx ? 1 : -1;
        return (c.num ? x - y : String(x).localeCompare(String(y), 'es')) * dir;
      };
    }
    function recalcular() {
      vista = filtro ? filas.filter(filtro) : filas.slice();
      if (orden) { var c = cols.filter(function (q) { return q.id === orden.id; })[0]; if (c) vista.sort(cmp(c, orden.dir)); }
      esp.style.height = vista.length * alto + 'px'; vacio.hidden = vista.length > 0; sel = Math.min(sel, Math.max(0, vista.length - 1));
      Array.prototype.forEach.call(cab.children, function (d) { var a = orden && orden.id === d.dataset.col; d.classList.toggle('ord', !!a); d.setAttribute('aria-sort', a ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'); d.dataset.dir = a ? (orden.dir > 0 ? '▲' : '▼') : ''; });
      pintar();
    }
    function pintar() {
      var top = cuerpo.scrollTop, vh = cuerpo.clientHeight || 600, i0 = Math.max(0, Math.floor(top / alto) - buf), i1 = Math.min(vista.length, Math.ceil((top + vh) / alto) + buf), h = [];
      for (var i = i0; i < i1; i++) {
        var f = vista[i], celdas = cols.map(function (c) { return '<div class="td' + (c.alinear === 'der' ? ' der' : '') + (c.ocultarMovil ? ' no-movil' : '') + '" role="gridcell">' + c.html(f) + '</div>'; }).join('');
        h.push('<div class="fila' + (i === sel ? ' sel' : '') + '" role="row" data-i="' + i + '" style="grid-template-columns:' + tpl + ';height:' + alto + 'px">' + celdas + '</div>');
      }
      ven.style.transform = 'translateY(' + i0 * alto + 'px)'; ven.innerHTML = h.join('');
    }
    var raf = 0;
    cuerpo.addEventListener('scroll', function () { cab.style.transform = 'translateX(' + -cuerpo.scrollLeft + 'px)'; if (!raf) raf = requestAnimationFrame(function () { raf = 0; pintar(); }); });
    ven.addEventListener('click', function (e) { var f = e.target.closest('.fila'); if (!f) return; sel = +f.dataset.i; if (o.alAbrir) o.alAbrir(vista[sel], e); });
    cont.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { T.mover(1); e.preventDefault(); } else if (e.key === 'ArrowUp') { T.mover(-1); e.preventDefault(); }
      else if (e.key === 'PageDown') { T.mover(10); e.preventDefault(); } else if (e.key === 'PageUp') { T.mover(-10); e.preventDefault(); }
      else if (e.key === 'Enter') T.abrirSeleccion();
    });
    T.mover = function (d) {
      if (!vista.length) return; sel = Math.max(0, Math.min(vista.length - 1, sel + d));
      var y = sel * alto, top = cuerpo.scrollTop, vh = cuerpo.clientHeight;
      if (y < top) cuerpo.scrollTop = y; else if (y + alto > top + vh) cuerpo.scrollTop = y + alto - vh; pintar();
    };
    T.abrirSeleccion = function () { if (vista[sel] && o.alAbrir) o.alAbrir(vista[sel]); };
    T.setFilas = function (f) { filas = f; recalcular(); };
    T.setFiltro = function (fn) { filtro = fn; cuerpo.scrollTop = 0; recalcular(); };
    T.ordenar = function (id, dir) { orden = { id: id, dir: dir }; recalcular(); };
    T.refrescar = pintar; T.cuenta = function () { return vista.length; }; T.visibles = function () { return vista; };
    T.filasPintadas = function () { return ven.children.length; };
    if (window.ResizeObserver) new ResizeObserver(function () { pintar(); }).observe(cuerpo);
    recalcular();
  }
  window.TablaVirtual = TablaVirtual;
})();
