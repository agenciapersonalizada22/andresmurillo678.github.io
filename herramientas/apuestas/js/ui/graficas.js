/* Graficas a mano en SVG (sin librerias). Colores por clases CSS (.g-linea, .g-area, .g-barra...). */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {}, U = A.ui;
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, at, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) if (at[k] != null) e.setAttribute(k, at[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function bonito(min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    var paso = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(paso))), r = paso / mag;
    var nice = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag, lo = Math.floor(min / nice) * nice, hi = Math.ceil(max / nice) * nice, t = [];
    for (var v = lo; v <= hi + nice / 2; v += nice) t.push(Math.round(v / nice) * nice);
    return t;
  }
  function etiq(v, fmt) { return fmt ? fmt(v) : String(Math.round(v * 100) / 100); }

  /* lineas: series [{nombre, pts:[y...], clase}] con etiquetas x opcionales. opts: {alto, fmtY, etiquetasX, area, base, titulo} */
  function lineas(series, o) {
    o = o || {}; var W = 640, H = o.alto || 240, m = { l: 54, r: 12, t: 12, b: 26 };
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica', role: 'img', 'aria-label': o.titulo || 'Gráfica', preserveAspectRatio: 'xMidYMid meet' });
    var mn = Infinity, mx = -Infinity, n = 0;
    series.forEach(function (se) { n = Math.max(n, se.pts.length); se.pts.forEach(function (v) { if (v < mn) mn = v; if (v > mx) mx = v; }); });
    if (o.base != null) { mn = Math.min(mn, o.base); mx = Math.max(mx, o.base); }
    if (!isFinite(mn)) return svg;
    var tk = bonito(mn, mx, 4), lo = tk[0], hi = tk[tk.length - 1];
    function X(i) { return m.l + (n <= 1 ? 0 : i / (n - 1)) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - lo) / (hi - lo || 1) * (H - m.t - m.b); }
    tk.forEach(function (v) {
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'g-rej' }));
      svg.appendChild(s('text', { x: m.l - 6, y: Y(v) + 4, class: 'g-txt', 'text-anchor': 'end' }, etiq(v, o.fmtY)));
    });
    if (o.base != null) svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: Y(o.base), y2: Y(o.base), class: 'g-base' }));
    if (o.etiquetasX) { var pasos = Math.min(5, o.etiquetasX.length); for (var q = 0; q < pasos; q++) { var ii = Math.round(q * (o.etiquetasX.length - 1) / Math.max(1, pasos - 1)); svg.appendChild(s('text', { x: X(ii), y: H - 8, class: 'g-txt', 'text-anchor': q === 0 ? 'start' : q === pasos - 1 ? 'end' : 'middle' }, o.etiquetasX[ii])); } }
    series.forEach(function (se, k) {
      var d = se.pts.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
      if (o.area && k === 0 && se.pts.length > 1) svg.appendChild(s('path', { d: d + 'L' + X(se.pts.length - 1) + ' ' + Y(lo) + 'L' + X(0) + ' ' + Y(lo) + 'Z', class: 'g-area' }));
      svg.appendChild(s('path', { d: d, class: 'g-linea ' + (se.clase || 'c' + (k % 4)) }));
    });
    var guia = s('line', { y1: m.t, y2: H - m.b, class: 'g-guia', visibility: 'hidden' }), punto = s('circle', { r: 4, class: 'g-punto', visibility: 'hidden' });
    svg.appendChild(guia); svg.appendChild(punto);
    var caja = U.h('div', { class: 'grafica-caja' }), tip = U.h('div', { class: 'tip', hidden: true, 'aria-hidden': 'true' });
    function mover(ev) {
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(n - 1, Math.round((x - m.l) / (W - m.l - m.r) * (n - 1)))), se = series[0];
      if (i >= se.pts.length) return;
      guia.setAttribute('x1', X(i)); guia.setAttribute('x2', X(i)); guia.setAttribute('visibility', 'visible');
      punto.setAttribute('cx', X(i)); punto.setAttribute('cy', Y(se.pts[i])); punto.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.textContent = (o.etiquetasX ? o.etiquetasX[i] + ' · ' : '#' + i + ' · ') + etiq(se.pts[i], o.fmtY);
      tip.style.left = Math.min(r.width - 120, Math.max(0, X(i) / W * r.width - 50)) + 'px';
    }
    svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover);
    svg.addEventListener('pointerleave', function () { guia.setAttribute('visibility', 'hidden'); punto.setAttribute('visibility', 'hidden'); tip.hidden = true; });
    caja.appendChild(svg); caja.appendChild(tip);
    if (series.length > 1 && series[0].nombre) caja.appendChild(U.h('div', { class: 'leyenda' }, series.map(function (se, k) { return U.h('span', null, U.h('i', { class: 'sw ' + (se.clase || 'c' + (k % 4)) }), se.nombre); })));
    return caja;
  }

  /* barras horizontales con valor (+/-). items [{clave, valor, texto}] */
  function barras(items, o) {
    o = o || {}; var fila = 26, W = 640, lab = 130, H = Math.max(40, items.length * fila + 8);
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica', role: 'img', 'aria-label': o.titulo || 'Barras' });
    var mx = Math.max.apply(null, items.map(function (i) { return Math.abs(i.valor); }).concat([1e-9]));
    var neg = items.some(function (i) { return i.valor < 0; }), cero = neg ? lab + (W - lab - 90) / 2 : lab, ancho = neg ? (W - lab - 90) / 2 : W - lab - 90;
    items.forEach(function (it, k) {
      var y = k * fila + 4, w = Math.abs(it.valor) / mx * ancho, x = it.valor >= 0 ? cero : cero - w;
      svg.appendChild(s('text', { x: lab - 6, y: y + 15, class: 'g-txt', 'text-anchor': 'end' }, it.clave.length > 18 ? it.clave.slice(0, 17) + '…' : it.clave));
      svg.appendChild(s('rect', { x: x, y: y + 2, width: Math.max(1, w), height: fila - 8, rx: 3, class: 'g-barra ' + (it.valor >= 0 ? 'pos' : 'neg') }));
      svg.appendChild(s('text', { x: it.valor >= 0 ? cero + w + 6 : cero + 6, y: y + 15, class: 'g-txt v' }, it.texto));
    });
    if (neg) svg.appendChild(s('line', { x1: cero, x2: cero, y1: 0, y2: H, class: 'g-base' }));
    return svg;
  }
  /* histograma: bins [n...], min,max */
  function histograma(bins, min, max, o) {
    o = o || {}; var W = 640, H = 200, m = { l: 12, r: 12, t: 10, b: 28 }, mx = Math.max.apply(null, bins), bw = (W - m.l - m.r) / bins.length;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica', role: 'img', 'aria-label': o.titulo || 'Histograma' });
    bins.forEach(function (b, i) {
      var hgt = b / mx * (H - m.t - m.b);
      var r = s('rect', { x: m.l + i * bw + 1, y: H - m.b - hgt, width: bw - 2, height: hgt, class: 'g-barra ' + (o.corte != null && min + (i + 0.5) / bins.length * (max - min) < o.corte ? 'neg' : 'pos') });
      r.appendChild(s('title', {}, (o.fmt ? o.fmt(min + i / bins.length * (max - min)) : '') + ': ' + b));
      svg.appendChild(r);
    });
    [0, 0.5, 1].forEach(function (f) { svg.appendChild(s('text', { x: m.l + f * (W - m.l - m.r), y: H - 8, class: 'g-txt', 'text-anchor': f === 0 ? 'start' : f === 1 ? 'end' : 'middle' }, o.fmt ? o.fmt(min + f * (max - min)) : String(Math.round(min + f * (max - min))))); });
    if (o.corte != null && o.corte > min && o.corte < max) { var cx = m.l + (o.corte - min) / (max - min) * (W - m.l - m.r); svg.appendChild(s('line', { x1: cx, x2: cx, y1: m.t, y2: H - m.b, class: 'g-base' })); }
    return svg;
  }
  U.graf = { lineas: lineas, barras: barras, histograma: histograma };
})(window);
