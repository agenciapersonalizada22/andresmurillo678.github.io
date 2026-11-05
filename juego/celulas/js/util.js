/* Celulas: utilidades compartidas (navegador y Node). Espacio de nombres globalThis.CEL */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  C.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  C.hash2 = function (a, b) {
    var h = Math.imul(a ^ 0x9E3779B1, 0x85EBCA6B) ^ Math.imul((b + 0x7F4A7C15) | 0, 0xC2B2AE35);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return h >>> 0;
  };
  /* generador reproducible con estado serializable */
  function Rng(seed) { this.s = seed >>> 0; }
  Rng.prototype.next = function () {
    var t = this.s = (this.s + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.rango = function (a, b) { return a + (b - a) * this.next(); };
  Rng.prototype.entero = function (n) { return Math.floor(this.next() * n); };
  C.Rng = Rng;

  /* base64 sin dependencias del navegador */
  var T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', INV = new Int16Array(128).fill(-1);
  for (var i = 0; i < 64; i++) INV[T.charCodeAt(i)] = i;
  C.b64 = function (u8, n) {
    var s = '', i = 0;
    n = n == null ? u8.length : n;
    for (; i + 2 < n; i += 3) {
      var v = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
      s += T[v >> 18] + T[(v >> 12) & 63] + T[(v >> 6) & 63] + T[v & 63];
    }
    if (i < n) {
      var a = u8[i], b = i + 1 < n ? u8[i + 1] : 0, w = (a << 16) | (b << 8);
      s += T[w >> 18] + T[(w >> 12) & 63] + (i + 1 < n ? T[(w >> 6) & 63] : '');
    }
    return s;
  };
  C.deb64 = function (s, out) {
    var n = s.length, len = Math.floor(n * 3 / 4), o = 0, buf = 0, bits = 0;
    out = out || new Uint8Array(len);
    for (var i = 0; i < n; i++) {
      var d = INV[s.charCodeAt(i) & 127];
      if (d < 0) continue;
      buf = (buf << 6) | d; bits += 6;
      if (bits >= 8) { bits -= 8; if (o < out.length) out[o++] = (buf >> bits) & 255; buf &= (1 << bits) - 1; }
    }
    return out.subarray ? out.subarray(0, o) : out;
  };

  /* reserva circular de ids pequenos (los ids se reutilizan tarde para no confundir interpolaciones) */
  function Ids(n) {
    this.q = new Uint16Array(n); this.n = n; this.ini = 0; this.cnt = n;
    for (var i = 0; i < n; i++) this.q[i] = i;
  }
  Ids.prototype.sacar = function () {
    if (!this.cnt) return -1;
    var id = this.q[this.ini]; this.ini = (this.ini + 1) % this.n; this.cnt--; return id;
  };
  Ids.prototype.devolver = function (id) { this.q[(this.ini + this.cnt) % this.n] = id; this.cnt++; };
  C.Ids = Ids;
})(typeof globalThis !== 'undefined' ? globalThis : window);
