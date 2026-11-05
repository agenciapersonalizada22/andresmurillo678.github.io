/* Azar determinista: hash de texto, PRNG mulberry32 y clave de fecha para el diario. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  function hash(s) {
    s = String(s); var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function crear(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function fechaClave(d) { d = d || new Date(); return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
  BM.azar = { hash: hash, crear: crear, fechaClave: fechaClave };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
