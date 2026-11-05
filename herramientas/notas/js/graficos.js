/* Graficas SVG hechas a mano (sin librerias): barras, apiladas, anillo y mapa de calor. */
(function (G) {
  'use strict';
  var doc = G.document, Gf = G.Graficos = {}, NS = 'http://www.w3.org/2000/svg', U = G.Util;
  function nodo(html, ancho, alto, desc) {
    var s = doc.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + ancho + ' ' + alto); s.setAttribute('role', 'img'); s.setAttribute('class', 'g-svg'); s.setAttribute('aria-label', desc || ''); s.innerHTML = html; return s;
  }
  function bonito(max) { if (max <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(max))), f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  /* datos: [{etq, v, v2?}] ; opciones: {desc, unidad, color, color2} */
  Gf.barras = function (datos, o) {
    o = o || {}; var W = 560, H = 190, L = 34, B = 24, T = 8, n = datos.length, max = bonito(Math.max.apply(null, datos.map(function (d) { return (d.v || 0) + (d.v2 || 0); }).concat([1])));
    var bw = (W - L) / n, s = '';
    for (var i = 0; i <= 4; i++) { var y = T + (H - B - T) * (1 - i / 4); s += '<line class="eje" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(max * i / 4 * 10) / 10 + '</text>'; }
    datos.forEach(function (d, k) {
      var x = L + k * bw + bw * 0.15, w = bw * 0.7, h1 = (H - B - T) * (d.v || 0) / max, h2 = (H - B - T) * (d.v2 || 0) / max, y1 = H - B - h1;
      s += '<g><title>' + U.esc(d.etq + ': ' + (d.v || 0) + (d.v2 ? ' + ' + d.v2 : '') + (o.unidad ? ' ' + o.unidad : '')) + '</title>';
      s += '<rect x="' + x + '" y="' + y1 + '" width="' + w + '" height="' + Math.max(h1, d.v ? 1.5 : 0) + '" rx="3" style="fill:' + (o.color || 'var(--c6)') + '"/>';
      if (d.v2) s += '<rect x="' + x + '" y="' + (y1 - h2) + '" width="' + w + '" height="' + h2 + '" rx="3" style="fill:' + (o.color2 || 'var(--c4)') + '"/>';
      s += '</g>';
      if (n <= 16 || k % Math.ceil(n / 12) === 0) s += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.esc(d.etq) + '</text>';
    });
    return nodo(s, W, H, o.desc);
  };
  Gf.anillo = function (datos, o) {
    o = o || {}; var tot = datos.reduce(function (a, d) { return a + d.v; }, 0), R = 70, r = 44, cx = 90, cy = 90, a0 = -Math.PI / 2, s = '';
    if (!tot) return nodo('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="var(--linea)" stroke-width="' + (R - r) + '"/><text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">Sin datos</text>', 180, 180, o.desc);
    datos.forEach(function (d) {
      if (!d.v) return; var a1 = a0 + 2 * Math.PI * d.v / tot, grande = a1 - a0 > Math.PI ? 1 : 0;
      if (d.v === tot) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke-width="' + (R - r) + '" style="stroke:' + d.color + '"><title>' + U.esc(d.etq + ': ' + d.v) + '</title></circle>'; return; }
      var p = function (rad, a) { return (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2); };
      s += '<path d="M' + p(R, a0) + ' A' + R + ' ' + R + ' 0 ' + grande + ' 1 ' + p(R, a1) + ' L' + p(r, a1) + ' A' + r + ' ' + r + ' 0 ' + grande + ' 0 ' + p(r, a0) + 'Z" style="fill:' + d.color + '" stroke="var(--panel)" stroke-width="2"><title>' + U.esc(d.etq + ': ' + d.v) + '</title></path>'; a0 = a1;
    });
    s += '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" style="font-size:20px;font-weight:700;fill:var(--texto)">' + tot + '</text>';
    var n = nodo(s, 180, 180, o.desc); n.style.maxWidth = '210px'; n.style.margin = '0 auto'; return n;
  };
  /* valores: {fecha: n} ; devuelve un div .heat con celdas por semana (columnas) */
  Gf.mapaCalor = function (valores, semanas, hoy) {
    var F = G.Fechas, cont = doc.createElement('div'); cont.className = 'heat'; cont.setAttribute('role', 'img'); semanas = semanas || 14;
    var ini = F.sumDias(F.inicioSemana(hoy), -7 * (semanas - 1)), max = 1; Object.keys(valores).forEach(function (k) { max = Math.max(max, valores[k]); });
    for (var i = 0; i < semanas * 7; i++) {
      var f = F.sumDias(ini, i), v = valores[f] || 0, c = doc.createElement('i'); if (f > hoy) c.style.visibility = 'hidden';
      c.className = v ? 'l' + Math.min(3, Math.ceil(3 * v / max)) : ''; c.title = f + ': ' + v; cont.appendChild(c);
    }
    return cont;
  };
})(window);
