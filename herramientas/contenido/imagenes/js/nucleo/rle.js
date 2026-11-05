/* RLE de bytes: c<128 -> c+1 literales; c>=128 -> (c-128+3) copias del siguiente byte. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.RLE = f(); })(this, function () {
  var R = {};
  R.comprimir = function (a) {
    var out = [], n = a.length, i = 0, lit = [];
    function vaciar() { while (lit.length) { var t = lit.splice(0, 128); out.push(t.length - 1); for (var k = 0; k < t.length; k++) out.push(t[k]); } }
    while (i < n) {
      var j = i; while (j < n && a[j] === a[i] && j - i < 130) j++;
      if (j - i >= 3) { vaciar(); out.push(128 + (j - i - 3), a[i]); i = j; } else { lit.push(a[i]); i++; if (lit.length >= 128) vaciar(); }
    }
    vaciar();
    return Uint8Array.from(out);
  };
  R.descomprimir = function (c, largo) {
    var out = new Uint8Array(largo), o = 0, i = 0;
    while (i < c.length && o < largo) {
      var b = c[i++];
      if (b < 128) { for (var k = 0; k <= b; k++) out[o++] = c[i++]; } else { var n = b - 128 + 3, v = c[i++]; for (var q = 0; q < n; q++) out[o++] = v; }
    }
    return out;
  };
  R.xor = function (a, b) { var o = new Uint8Array(a.length); for (var i = 0; i < a.length; i++) o[i] = a[i] ^ b[i]; return o; };
  return R;
});
