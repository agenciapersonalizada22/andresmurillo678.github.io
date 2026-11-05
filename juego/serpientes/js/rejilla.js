/* Rejilla espacial (hash de celdas) con listas enlazadas por indices. Sin asignaciones por consulta. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {};
  function Rejilla(R, celda, cap) {
    this.celda = celda; this.off = R; this.n = Math.ceil(2 * R / celda) + 1;
    this.cab = new Int32Array(this.n * this.n).fill(-1); this.sig = new Int32Array(cap);
  }
  Rejilla.prototype.celdaDe = function (v) { var c = ((v + this.off) / this.celda) | 0; return c < 0 ? 0 : c >= this.n ? this.n - 1 : c; };
  Rejilla.prototype.agregar = function (i, x, y) { var c = this.celdaDe(y) * this.n + this.celdaDe(x); this.sig[i] = this.cab[c]; this.cab[c] = i; };
  Rejilla.prototype.quitar = function (i, x, y) {
    var c = this.celdaDe(y) * this.n + this.celdaDe(x), p = this.cab[c];
    if (p === i) { this.cab[c] = this.sig[i]; return; }
    while (p >= 0 && this.sig[p] !== i) p = this.sig[p];
    if (p >= 0) this.sig[p] = this.sig[i];
  };
  Rejilla.prototype.limpiar = function () { this.cab.fill(-1); };
  /* Llama fn(i) para cada elemento en celdas que tocan el cuadrado (x,y,r); si fn devuelve true se detiene (y devuelve true). */
  Rejilla.prototype.cerca = function (x, y, r, fn) {
    var x0 = this.celdaDe(x - r), x1 = this.celdaDe(x + r), y0 = this.celdaDe(y - r), y1 = this.celdaDe(y + r), n = this.n, cab = this.cab, sig = this.sig;
    for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) {
      for (var i = cab[cy * n + cx]; i >= 0; i = sig[i]) if (fn(i)) return true;
    }
    return false;
  };
  S.Rejilla = Rejilla;
})(typeof window !== 'undefined' ? window : globalThis);
