/* Lista virtualizada con filas de altura fija (rejilla o lista). Of.Virtual(contenedor, {render(el,item,i), alto(cols,ancho), minCol, gap})
   API: .datos(array), .modo('rejilla'|'lista'), .irA(i), .refrescar(), .visibles() */
(function (g) {
  g.Of = g.Of || {};
  function Virtual(cont, o) {
    var self = this, datos = [], cols = 1, altoFila = 200, ancho = 0, modo = 'rejilla', pool = [], raf = 0, gap = o.gap || 10, padL = 0;
    cont.classList.add('virtual');
    var espacio = document.createElement('div'); espacio.className = 'virtual-espacio'; cont.appendChild(espacio);
    function medir() {
      var cs = getComputedStyle(cont); padL = parseFloat(cs.paddingLeft) || 0; ancho = cont.clientWidth - padL - (parseFloat(cs.paddingRight) || 0);
      if (modo === 'lista') { cols = 1; altoFila = o.altoLista || 104; }
      else { cols = Math.max(1, Math.floor((ancho + gap) / ((o.minCol || 170) + gap))); var w = (ancho - gap * (cols - 1)) / cols; altoFila = o.alto(w); }
      espacio.style.height = (Math.ceil(datos.length / cols) * (altoFila + gap) + (o.pie || 0)) + 'px';
    }
    function pintar() {
      raf = 0;
      var top = cont.scrollTop, h = cont.clientHeight, filas = Math.ceil(datos.length / cols), paso = altoFila + gap;
      var f0 = Math.max(0, Math.floor(top / paso) - 1), f1 = Math.min(filas - 1, Math.ceil((top + h) / paso) + 1), usados = {}, i, k;
      var w = (ancho - gap * (cols - 1)) / cols;
      for (var f = f0; f <= f1; f++) for (var c = 0; c < cols; c++) {
        i = f * cols + c; if (i >= datos.length) break;
        var el = pool.find(function (p) { return p.i === i && p.dato === datos[i] && !p.ocupado; });
        if (!el) {
          el = pool.find(function (p) { return !p.vivo; });
          if (!el) { el = { nodo: document.createElement('div'), vivo: false }; el.nodo.className = 'virtual-celda'; cont.appendChild(el.nodo); pool.push(el); }
          el.nodo.innerHTML = ''; o.render(el.nodo, datos[i], i); el.i = i; el.dato = datos[i];
        }
        el.vivo = true; el.ocupado = true; usados[pool.indexOf(el)] = 1;
        var s = el.nodo.style; s.display = ''; s.transform = 'translate(' + (padL + c * (w + gap)) + 'px,' + (f * paso) + 'px)'; s.width = w + 'px'; s.height = altoFila + 'px';
        el.nodo.setAttribute('data-i', i);
      }
      pool.forEach(function (p, idx) { p.ocupado = false; if (!usados[idx] && p.vivo) { p.vivo = false; p.i = -1; p.dato = null; p.nodo.style.display = 'none'; } });
      if (o.alPintar) o.alPintar();
    }
    function pedir() { if (!raf) raf = requestAnimationFrame(pintar); }
    cont.addEventListener('scroll', pedir, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(function () { if (!cont.clientWidth) return; medir(); invalidar(); pedir(); }).observe(cont);
    function invalidar() { pool.forEach(function (p) { p.i = -1; p.dato = null; p.vivo = false; p.nodo.style.display = 'none'; }); }
    this.datos = function (a, conservar) { datos = a; if (!conservar) cont.scrollTop = 0; medir(); invalidar(); pintar(); };
    this.modo = function (m) { modo = m; medir(); invalidar(); pintar(); };
    this.refrescar = function () { medir(); invalidar(); pintar(); };
    this.irA = function (i) {
      var paso = altoFila + gap, y = Math.floor(i / cols) * paso;
      if (y < cont.scrollTop) cont.scrollTop = y - 8; else if (y + altoFila > cont.scrollTop + cont.clientHeight) cont.scrollTop = y + altoFila - cont.clientHeight + 8;
      pintar();
    };
    this.nodo = function (i) { return cont.querySelector('.virtual-celda[data-i="' + i + '"]'); };
    this.columnas = function () { return cols; };
    this.dato = function (i) { return datos[i]; };
    this.largo = function () { return datos.length; };
  }
  g.Of.Virtual = Virtual;
})(typeof self !== 'undefined' ? self : this);
