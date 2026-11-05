/* Formateadores (es). UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Fmt = m; })(typeof self !== 'undefined' ? self : this, function () {
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function ok(n) { return n != null && isFinite(n); }
  function num(n, d) { return ok(n) ? Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-'; }
  function precio(n) {
    if (!ok(n)) return '-'; var a = Math.abs(n);
    if (a >= 1000) return num(n, 2); if (a >= 1) return num(n, a >= 100 ? 2 : 3); if (a >= 0.01) return num(n, 4);
    if (a === 0) return '0'; return Number(n).toPrecision(3).replace('.', ',').replace(/e-(\d+)/, 'e-$1');
  }
  function grande(n) {
    if (!ok(n)) return '-'; var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e12) return s + num(a / 1e12, 2) + ' B'; if (a >= 1e9) return s + num(a / 1e9, 2) + ' MM'; if (a >= 1e6) return s + num(a / 1e6, 2) + ' M'; if (a >= 1e3) return s + num(a / 1e3, 1) + ' K';
    return s + num(a, a < 10 ? 2 : 0);
  }
  function pct(n, d) { return ok(n) ? (n > 0 ? '+' : '') + num(n, d == null ? 2 : d) + '%' : '-'; }
  function edad(ms) {
    if (!ok(ms)) return 'sin fecha'; var s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return 'hace ' + s + ' s'; if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; return 'hace ' + Math.round(s / 86400) + ' d';
  }
  function fecha(t, conAnio) { var d = new Date(t); return d.getUTCDate() + ' ' + MESES[d.getUTCMonth()] + (conAnio ? ' ' + d.getUTCFullYear() : ''); }
  function fechaHora(t) { var d = new Date(t); return fecha(t) + ' ' + ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function urlSegura(u) { return /^https?:\/\//i.test(String(u || '')) ? u : '#'; }
  return { num: num, precio: precio, grande: grande, pct: pct, edad: edad, fecha: fecha, fechaHora: fechaHora, esc: esc, urlSegura: urlSegura, ok: ok };
});
