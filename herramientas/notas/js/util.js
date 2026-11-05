/* Utilidades generales (UMD: navegador y Node). */
(function (G) {
  'use strict';
  var U = {};
  U.id = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var DE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n', 'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' };
  /* minusculas sin acentos conservando la longitud (para indices de texto) */
  U.norm = function (s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[áéíóúüñàèìòù]/g, function (c) { return DE[c]; });
  };
  U.clon = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  U.igual = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  U.debounce = function (fn, ms) {
    var t = 0;
    var f = function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { t = 0; fn.apply(s, a); }, ms); };
    f.ya = function () { if (t) { clearTimeout(t); t = 0; fn(); } };
    return f;
  };
  U.b64 = function (bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var s = '', i; for (i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  U.deB64 = function (t) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(t, 'base64'));
    var s = atob(t), o = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o;
  };
  U.utf8 = function (t) { return new TextEncoder().encode(t); };
  U.deUtf8 = function (b) { return new TextDecoder().decode(b); };
  if (typeof module !== 'undefined' && module.exports) module.exports = U; else G.Util = U;
})(typeof window !== 'undefined' ? window : globalThis);
