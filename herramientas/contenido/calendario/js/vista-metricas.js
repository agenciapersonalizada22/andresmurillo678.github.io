/* Metricas manuales y graficas SVG hechas a mano. */
(function () {
  var $ = U.$, esc = U.esc, A = App, M = Modelo, V = $('#v-metricas'), S = { metrica: 'vistas', dim: 'red', ver: 'barras' };
  var NOMBRES = { vistas: 'Vistas', likes: 'Likes', comentarios: 'Comentarios', compartidos: 'Compartidos', clics: 'Clics', engagement: 'Interacción %', interacciones: 'Interacciones' };
  function fmt(n, m) { return n == null ? '—' : m === 'engagement' ? n.toFixed(2) + '%' : n >= 1000 ? (n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : (n / 1000).toFixed(1) + ' k') : (Math.round(n * 10) / 10) + ''; }
  function colorDe(k, dim) { return dim === 'red' && M.REDES[k] ? M.REDES[k].color : 'var(--acento)'; }
  function etiqueta(k, dim) { return dim === 'red' && M.REDES[k] ? M.REDES[k].nombre : k; }
  function barras(datos, dim, m) {
    if (!datos.length) return '';
    var W = 520, fila = 34, izq = 120, h = datos.length * fila + 10, max = Math.max.apply(null, datos.map(function (d) { return d.promedio; })) || 1;
    return '<svg class="graf" viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="Promedio de ' + NOMBRES[m] + ' por ' + dim + '">' + datos.map(function (d, i) {
      var y = 5 + i * fila, w = Math.max(2, (W - izq - 70) * d.promedio / max);
      return '<text x="' + (izq - 8) + '" y="' + (y + 19) + '" text-anchor="end">' + esc(etiqueta(d.clave, dim)).slice(0, 22) + '</text><rect x="' + izq + '" y="' + y + '" width="' + w + '" height="24" rx="4" fill="' + colorDe(d.clave, dim) + '"><title>' + esc(etiqueta(d.clave, dim)) + ': promedio ' + fmt(d.promedio, m) + ' en ' + d.n + ' publicaciones</title></rect><text class="v" x="' + (izq + w + 6) + '" y="' + (y + 17) + '">' + fmt(d.promedio, m) + ' (' + d.n + ')</text>';
    }).join('') + '</svg>';
  }
  function linea(serie, m) {
    if (serie.length < 2) return '<p class="suave">Se necesitan al menos 2 publicaciones con datos para la línea de tiempo.</p>';
    var W = 560, H = 230, L = 46, R = 14, T = 12, B = 44, max = Math.max.apply(null, serie.map(function (s) { return s.valor; })) || 1;
    var paso = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / paso) * paso; if (top / paso < 3) { paso /= 2; top = Math.ceil(max / paso) * paso; }
    var x = function (i) { return L + (W - L - R) * i / (serie.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - v / top); }, g = '';
    for (var v = 0; v <= top + 1e-9; v += paso) g += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v, m) + '</text>';
    var pts = serie.map(function (s, i) { return x(i) + ',' + y(s.valor); }).join(' ');
    var cada = Math.ceil(serie.length / 7);
    return '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución de ' + NOMBRES[m] + ' por publicación">' + g + '<polyline fill="none" stroke="var(--acento)" stroke-width="2.5" points="' + pts + '"/>' + serie.map(function (s, i) {
      return '<circle cx="' + x(i) + '" cy="' + y(s.valor) + '" r="5" fill="' + (M.REDES[s.red] ? M.REDES[s.red].color : 'var(--acento)') + '" stroke="var(--panel)" stroke-width="2"><title>' + esc(s.titulo) + ' (' + s.fecha + '): ' + fmt(s.valor, m) + '</title></circle>' + (i % cada === 0 ? '<text x="' + x(i) + '" y="' + (H - 22) + '" text-anchor="middle">' + s.fecha.slice(5) + '</text>' : '');
    }).join('') + '</svg>';
  }
  function render() {
    var pub = A.est.pubs.filter(function (p) { return p.estado === 'publicado'; }), t = Metricas.totales(pub), m = S.metrica;
    var sel = function (id, op, v) { return '<select id="' + id + '">' + op.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    var ag = Metricas.agrupar(pub, S.dim, m), se = Metricas.serie(pub, m);
    V.innerHTML = '<div class="cab-cal"><h2>Rendimiento</h2></div><p class="suave">Cifras escritas a mano para las publicaciones en estado «Publicado». Sirven para comparar tus propios resultados, no para predecir.</p>' +
      '<div class="kpis">' + ['vistas', 'likes', 'comentarios', 'compartidos', 'clics'].map(function (k) { return '<div class="kpi"><b>' + fmt(t[k]) + '</b><span>' + NOMBRES[k] + '</span></div>'; }).join('') + '<div class="kpi"><b>' + fmt(t.engagement, 'engagement') + '</b><span>Interacción media</span></div><div class="kpi"><b>' + pub.length + '</b><span>Publicadas</span></div></div>' +
      (pub.length ? '<div class="cols iguales"><div class="panel"><div class="fila"><h3 class="grow">Comparar por</h3><label class="solo-lectores" for="mt-dim">Dimensión</label>' + sel('mt-dim', [['red', 'Red'], ['formato', 'Formato'], ['tema', 'Tema'], ['hora', 'Hora']], S.dim) + '<label class="solo-lectores" for="mt-met">Métrica</label>' + sel('mt-met', Object.keys(NOMBRES).map(function (k) { return [k, NOMBRES[k]]; }), m) + '</div>' + barras(ag, S.dim, m) + '</div>' +
        '<div class="panel"><h3>Evolución de ' + NOMBRES[m] + '</h3>' + linea(se, m) + '</div></div>' +
        '<div class="panel scroll-x" style="margin-top:1rem"><h3>Detalle y captura</h3><table class="tabla-met"><thead><tr><th>Publicación</th><th>Red</th><th>Vistas</th><th>Likes</th><th>Coment.</th><th>Compart.</th><th>Clics</th><th>Inter.</th></tr></thead><tbody>' + pub.slice().sort(function (a, b) { return (b.fecha || '') < (a.fecha || '') ? -1 : 1; }).map(function (p) {
          var mt = p.metricas || {}, e = Metricas.engagement(p); return '<tr><td><button class="btn peq" data-id="' + p.id + '">' + esc(p.titulo) + '</button><div class="suave">' + (p.fecha || '') + '</div></td><td>' + M.REDES[p.red].nombre + '</td>' + Metricas.CLAVES.map(function (k) { return '<td><input type="number" min="0" data-p="' + p.id + '" data-k="' + k + '" value="' + (mt[k] || 0) + '" aria-label="' + k + ' de ' + esc(p.titulo) + '"></td>'; }).join('') + '<td>' + fmt(e, 'engagement') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="panel"><p>Todavía no hay publicaciones en estado «Publicado». Cambia el estado de alguna (tablero o editor) y captura sus cifras aquí o en la pestaña Métricas del editor.</p></div>');
  }
  function iniciar() {
    V.addEventListener('change', function (e) {
      var t = e.target; if (t.id === 'mt-dim') S.dim = t.value; else if (t.id === 'mt-met') S.metrica = t.value;
      else if (t.dataset.p) { var p = A.pub(t.dataset.p); p.metricas = p.metricas || {}; p.metricas[t.dataset.k] = Math.max(0, +t.value || 0); A.guardar('pubs', p).then(render); return; } else return; render();
    });
    V.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) Editor.abrir(A.pub(b.dataset.id)); });
  }
  A.vistas.metricas = render; A.metricasVista = { iniciar: iniciar };
})();
