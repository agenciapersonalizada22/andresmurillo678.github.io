/* Almacen de orbes con pool y rejilla. Arrays tipados; indices estables mientras viven. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {};
  function Orbes(R, cap) {
    this.cap = cap; this.x = new Float32Array(cap); this.y = new Float32Array(cap); this.v = new Float32Array(cap);
    this.vivo = new Uint8Array(cap); this.libres = new Int32Array(cap); this.nLibres = cap; this.n = 0;
    for (var i = 0; i < cap; i++) this.libres[i] = cap - 1 - i;
    this.rej = new S.Rejilla(R, 100, cap);
  }
  Orbes.prototype.agregar = function (x, y, v) {
    if (this.nLibres === 0) return -1;
    var i = this.libres[--this.nLibres];
    this.x[i] = x; this.y[i] = y; this.v[i] = v; this.vivo[i] = 1; this.n++;
    this.rej.agregar(i, x, y); return i;
  };
  Orbes.prototype.quitar = function (i) {
    if (!this.vivo[i]) return;
    this.rej.quitar(i, this.x[i], this.y[i]); this.vivo[i] = 0; this.libres[this.nLibres++] = i; this.n--;
  };
  Orbes.prototype.limpiar = function () {
    this.rej.limpiar(); this.vivo.fill(0); this.n = 0; this.nLibres = this.cap;
    for (var i = 0; i < this.cap; i++) this.libres[i] = this.cap - 1 - i;
  };
  /* Rellena out.x/y/t/n con los orbes dentro del rectangulo (out con arrays preasignados). */
  Orbes.prototype.visibles = function (x0, y0, x1, y1, out) {
    var self = this, k = 0, mx = out.x.length;
    this.rej.cerca((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2 + 1, function (i) {
      var x = self.x[i], y = self.y[i];
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && k < mx) { out.x[k] = x; out.y[k] = y; out.t[k] = S.tipoOrbe(self.v[i]); k++; }
      return k >= mx;
    });
    out.n = k; return out;
  };
  S.Orbes = Orbes;
})(typeof window !== 'undefined' ? window : globalThis);
