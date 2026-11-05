/* Diferencia por palabras (LCS) para comparar versiones. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Diff = m; })(typeof self !== 'undefined' ? self : this, function () {
  function diff(a, b) {
    var x = a.match(/\s+|\S+/g) || [], y = b.match(/\s+|\S+/g) || [], n = x.length, m = y.length, i, j;
    var t = []; for (i = 0; i <= n; i++) t.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) t[i][j] = x[i] === y[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    var out = []; i = 0; j = 0;
    function push(tp, s) { var u = out[out.length - 1]; if (u && u.t === tp) u.s += s; else out.push({ t: tp, s: s }); }
    while (i < n && j < m) {
      if (x[i] === y[j]) { push('=', x[i]); i++; j++; }
      else if (t[i + 1][j] >= t[i][j + 1]) push('-', x[i++]); else push('+', y[j++]);
    }
    while (i < n) push('-', x[i++]); while (j < m) push('+', y[j++]);
    return out;
  }
  return { diff: diff };
});
