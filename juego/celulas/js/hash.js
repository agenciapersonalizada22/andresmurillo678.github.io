/* Celulas: hash espacial. RejillaFija = cubetas con altas/bajas (comida). HashDin = lista enlazada reconstruida cada paso. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  function Rejilla(tam, celda, ranuras, cap) {
    this.celda = celda; this.n = Math.ceil(tam / celda); this.cap = cap || 48;
    this.cnt = new Uint8Array(this.n * this.n); this.ids = new Uint16Array(this.n * this.n * this.cap);
    this.cub = new Int32Array(ranuras).fill(-1);
  }
  Rejilla.prototype.indice = function (x, y) {
    var n = this.n, i = Math.floor(x / this.celda), j = Math.floor(y / this.celda);
    i = i < 0 ? 0 : i >= n ? n - 1 : i; j = j < 0 ? 0 : j >= n ? n - 1 : j;
    return j * n + i;
  };
  Rejilla.prototype.insertar = function (slot, x, y) {
    var b = this.indice(x, y), k = this.cnt[b];
    if (k >= this.cap) return false;
    this.ids[b * this.cap + k] = slot; this.cnt[b] = k + 1; this.cub[slot] = b; return true;
  };
  Rejilla.prototype.quitar = function (slot) {
    var b = this.cub[slot]; if (b < 0) return;
    var base = b * this.cap, k = this.cnt[b];
    for (var i = 0; i < k; i++) if (this.ids[base + i] === slot) { this.ids[base + i] = this.ids[base + k - 1]; this.cnt[b] = k - 1; break; }
    this.cub[slot] = -1;
  };
  Rejilla.prototype.limpiar = function () { this.cnt.fill(0); this.cub.fill(-1); };
  /* rellena out con las ranuras de las cubetas que tocan el rectangulo; devuelve cuantas */
  Rejilla.prototype.consultar = function (x0, y0, x1, y1, out) {
    var n = this.n, c = this.celda, cap = this.cap, m = 0, max = out.length;
    var i0 = Math.max(0, Math.floor(x0 / c)), i1 = Math.min(n - 1, Math.floor(x1 / c));
    var j0 = Math.max(0, Math.floor(y0 / c)), j1 = Math.min(n - 1, Math.floor(y1 / c));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var b = j * n + i, k = this.cnt[b], base = b * cap;
      for (var q = 0; q < k && m < max; q++) out[m++] = this.ids[base + q];
    }
    return m;
  };
  C.Rejilla = Rejilla;

  function HashDin(tam, celda, cap) {
    this.celda = celda; this.n = Math.ceil(tam / celda);
    this.cab = new Int32Array(this.n * this.n); this.sig = new Int32Array(cap);
  }
  HashDin.prototype.reconstruir = function (arr, cuantos) {
    var cab = this.cab, sig = this.sig, n = this.n, c = this.celda;
    cab.fill(-1);
    if (cuantos > sig.length) cuantos = sig.length;
    for (var k = 0; k < cuantos; k++) {
      var o = arr[k], i = Math.floor(o.x / c), j = Math.floor(o.y / c);
      i = i < 0 ? 0 : i >= n ? n - 1 : i; j = j < 0 ? 0 : j >= n ? n - 1 : j;
      var b = j * n + i; sig[k] = cab[b]; cab[b] = k;
    }
  };
  /* indices (en el arreglo de reconstruir) de lo que cae en cubetas que tocan el circulo; el llamador afina la distancia */
  HashDin.prototype.consultar = function (x, y, r, out) {
    var n = this.n, c = this.celda, m = 0, max = out.length, cab = this.cab, sig = this.sig;
    var i0 = Math.max(0, Math.floor((x - r) / c)), i1 = Math.min(n - 1, Math.floor((x + r) / c));
    var j0 = Math.max(0, Math.floor((y - r) / c)), j1 = Math.min(n - 1, Math.floor((y + r) / c));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++)
      for (var k = cab[j * n + i]; k >= 0 && m < max; k = sig[k]) out[m++] = k;
    return m;
  };
  C.HashDin = HashDin;
})(typeof globalThis !== 'undefined' ? globalThis : window);
