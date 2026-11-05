/* Modelos: Poisson, Elo y regresion logistica. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, M = A.modelos, C = A.cuotas;
  var V = A.vistas = A.vistas || {};
  var sub = 'poisson', st = { txt: '', modo: 'manual', lamL: '1.6', lamV: '1.2', mL: '1.5', mV: '1.2', aL: '1.1', dV: '0.9', aV: '0.95', dL: '1.0', linea: '2.5', local: '', visit: '', ev: '', rho: '0', eloK: '20', eloV: '60', eloE: '26', eloTxt: '', logTxt: '', logX: '' };

  var LIM = U.aviso('Limitaciones: son modelos didácticos. Poisson asume goles independientes y ritmo constante, ignora lesiones, alineaciones, motivación y calendario. Elo ignora la forma reciente y las bajas. Con pocos datos las estimaciones son muy inestables. No son predicciones fiables y no garantizan resultados; el mercado (sobre todo cerrando) suele ser mejor predictor que tu modelo.', 'aviso');
  function ta(clave, ph, rows) { var t = h('textarea', { rows: rows || 8, placeholder: ph, 'aria-label': ph, spellcheck: 'false' }); t.value = st[clave]; t.addEventListener('input', function () { st[clave] = t.value; }); return t; }
  function archivo(clave, ta) { var f = h('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain', 'aria-label': 'Importar archivo CSV', onchange: function () { var fl = f.files[0]; if (!fl) return; fl.text().then(function (t) { st[clave] = t; ta.value = t; U.toast('Archivo cargado (' + t.split(/\r?\n/).length + ' líneas)'); }); } }); return f; }
  function num(k) { return U.leerNum(st[k]); }
  function ni(k, label, ayuda) { var i = U.inputNum({ valor: st[k], aria: label, onInput: function () { st[k] = i.value; if (i._cb) i._cb(); } }); return { campo: U.campo(label, i, ayuda), i: i }; }

  function eventosH2H() { return S.datos ? A.alertas.todosEventos(S.datos).filter(function (x) { return C.mercadosDeEvento(x.ev).some(function (m) { return m.clave === 'h2h' && m.sels.length === 3; }); }) : []; }
  function comparar(probs, evId) {
    var x = eventosH2H().filter(function (e) { return e.ev.id === evId; })[0]; if (!x) return null;
    var m = C.mercadosDeEvento(x.ev).filter(function (mm) { return mm.clave === 'h2h'; })[0], mj = C.mejores(m), cons = C.consenso(m, { metodo: S.cfg.metodo, referencia: S.cfg.referencia });
    return U.tabla(['Selección', { t: 'Modelo', clase: 'num' }, { t: 'Mercado (sin margen)', clase: 'num' }, { t: 'Mejor cuota', clase: 'num' }, { t: 'Edge según modelo', clase: 'num' }, ''], m.sels.map(function (s) {
      var e = probs[s] * mj[s].cuota - 1;
      return h('tr', null, h('th', { scope: 'row' }, U.etiquetaSel(x.ev, s)), h('td', { class: 'num' }, U.p(probs[s])), h('td', { class: 'num' }, U.p(cons.prob[s])), h('td', { class: 'num' }, U.cuota(mj[s].cuota) + ' (' + mj[s].casa + ')'), h('td', { class: 'num ' + U.clase(e) }, U.p(e, 1, true)),
        h('td', null, U.btn('→ Kelly', function () { S.prefillKelly = { prob: Math.round(probs[s] * 1000) / 10, cuota: mj[s].cuota }; location.hash = '#/banca'; }, 'pequeno')));
    }));
  }

  function tPoisson(c) {
    var out = h('div', { 'aria-live': 'polite' }), tabla = h('div'), resultados = ta('txt', 'Resultados históricos, uno por línea:\nReal Madrid 2-1 Barcelona\nSevilla,Real Madrid,0,3', 7), selL, selV;
    var fuerzas = null;
    function lambdas() {
      if (st.modo === 'manual') return { l: num('lamL'), v: num('lamV') };
      if (st.modo === 'fuerzas') return { l: num('mL') * num('aL') * num('dV'), v: num('mV') * num('aV') * num('dL') };
      if (!fuerzas) return null; var ge = M.golesEsperados(fuerzas, st.local, st.visit); return ge ? { l: ge.lamL, v: ge.lamV } : null;
    }
    function calc() {
      var lam = lambdas();
      if (!lam || !(lam.l > 0 && lam.v > 0) || lam.l > 8 || lam.v > 8) { U.montar(out, U.aviso(st.modo === 'hist' ? 'Pega resultados, pulsa «Calcular fuerzas» y elige dos equipos.' : 'Los goles esperados deben estar entre 0 y 8.', 'aviso')); return; }
      var r = M.poisson(lam.l, lam.v, { rho: num('rho') || 0 }), t = r.totales(num('linea') || 2.5), probs = { local: r.local, empate: r.empate, visitante: r.visitante };
      var mx = r.matriz;
      var heat = h('table', { class: 'tabla heat', 'aria-label': 'Probabilidad de cada marcador' }, h('thead', null, h('tr', null, h('th', null, 'Local \\ Visit.'), [0, 1, 2, 3, 4, 5].map(function (j) { return h('th', { scope: 'col' }, j); }))),
        h('tbody', null, [0, 1, 2, 3, 4, 5].map(function (i) { return h('tr', null, h('th', { scope: 'row' }, i), [0, 1, 2, 3, 4, 5].map(function (j) { return h('td', { class: 'num', style: 'background:rgba(var(--ac-rgb),' + Math.min(0.6, mx[i][j] * 4).toFixed(2) + ')' }, U.p(mx[i][j], 1)); })); })));
      U.montar(out, h('div', { class: 'kpis' }, U.kpi('Goles esperados', U.n(lam.l, 2) + ' – ' + U.n(lam.v, 2)), U.kpi('Local', U.p(probs.local, 1), 'cuota justa ' + U.cuota(1 / probs.local)), U.kpi('Empate', U.p(probs.empate, 1), 'cuota justa ' + U.cuota(1 / probs.empate)), U.kpi('Visitante', U.p(probs.visitante, 1), 'cuota justa ' + U.cuota(1 / probs.visitante)),
        U.kpi('Más de ' + (num('linea') || 2.5), U.p(t.mas, 1), 'cuota justa ' + U.cuota(1 / t.mas)), U.kpi('Menos de ' + (num('linea') || 2.5), U.p(t.menos, 1)), U.kpi('Ambos marcan', U.p(r.btts, 1))),
        h('p', null, h('b', null, 'Marcadores más probables: '), r.top.map(function (x) { return x.gl + '-' + x.gv + ' (' + U.p(x.p, 1) + ')'; }).join(' · ')), heat,
        h('h3', null, 'Comparar con el mercado'), U.campo('Evento', U.selector([{ v: '', t: '— elegir —' }].concat(eventosH2H().map(function (x) { return { v: x.ev.id, t: x.ev.local + ' - ' + x.ev.visitante }; })), st.ev, function (v) { st.ev = v; calc(); })),
        st.ev ? comparar(probs, st.ev) : h('small', { class: 'muted' }, eventosH2H().length ? 'Elige un evento con mercado 1X2 para ver el edge del modelo.' : 'No hay eventos con cuotas 1X2 cargados.'));
    }
    var camposManual = [ni('lamL', 'Goles esperados local'), ni('lamV', 'Goles esperados visitante')], camposF = [ni('mL', 'Media de goles de la liga (local)'), ni('mV', 'Media de goles de la liga (visitante)'), ni('aL', 'Ataque del local', '1 = media'), ni('dV', 'Defensa del visitante', '1 = media; >1 encaja más'), ni('aV', 'Ataque del visitante'), ni('dL', 'Defensa del local')];
    var linea = ni('linea', 'Línea de goles (total)'), rho = ni('rho', 'Corrección Dixon-Coles ρ', '0 = Poisson independiente; típico −0.05 a −0.15');
    [camposManual, camposF, [linea, rho]].forEach(function (g2) { g2.forEach(function (x) { x.i._cb = calc; }); });
    function panelModo() {
      var cont = h('div');
      if (st.modo === 'manual') U.montar(cont, h('div', { class: 'form-g' }, camposManual.map(function (x) { return x.campo; })));
      else if (st.modo === 'fuerzas') U.montar(cont, h('div', { class: 'form-g' }, camposF.map(function (x) { return x.campo; })));
      else {
        var f = archivo('txt', resultados);
        U.montar(cont, U.campo('Resultados (equipo local, marcador, visitante)', resultados), h('div', { class: 'fila' }, f, U.btn('Calcular fuerzas', function () {
          var p = M.parsearResultados(st.txt); if (p.partidos.length < 6) { U.toast('Necesito al menos 6 partidos', 'peligro'); return; }
          fuerzas = M.estimarFuerzas(p.partidos, { suavizado: 2 }); var eq = Object.keys(fuerzas.equipos).sort();
          st.local = eq.indexOf(st.local) >= 0 ? st.local : eq[0]; st.visit = eq.indexOf(st.visit) >= 0 ? st.visit : eq[1] || eq[0];
          U.montar(tabla, p.malas.length ? U.aviso('Líneas ignoradas: ' + p.malas.join(', '), 'aviso') : null,
            h('div', { class: 'form-g' }, U.campo('Local', U.selector(eq, st.local, function (v) { st.local = v; calc(); })), U.campo('Visitante', U.selector(eq, st.visit, function (v) { st.visit = v; calc(); }))),
            U.tabla(['Equipo', { t: 'PJ', clase: 'num' }, { t: 'Ataque', clase: 'num' }, { t: 'Defensa', clase: 'num' }], eq.map(function (e) { var q = fuerzas.equipos[e]; return h('tr', null, h('th', { scope: 'row' }, e), h('td', { class: 'num' }, q.pj), h('td', { class: 'num' }, U.n(q.ataque, 2)), h('td', { class: 'num' }, U.n(q.defensa, 2))); })),
            h('small', { class: 'muted' }, 'Medias: ' + U.n(fuerzas.mediaLocal, 2) + ' (local) y ' + U.n(fuerzas.mediaVisitante, 2) + ' (visitante). Fuerzas suavizadas hacia 1 con 2 partidos virtuales.'));
          calc();
        }, 'primario')), tabla);
      }
      return cont;
    }
    var modoC = h('div');
    function pintarModo() { U.montar(modoC, panelModo()); calc(); }
    c.appendChild(h('div', null, LIM, U.seg([{ v: 'manual', t: 'Goles esperados' }, { v: 'fuerzas', t: 'Ataque / defensa' }, { v: 'hist', t: 'Desde resultados' }], st.modo, function (v) { st.modo = v; pintarModo(); }, 'Modo de entrada'), modoC, h('div', { class: 'form-g' }, linea.campo, rho.campo), out));
    pintarModo();
  }

  function tElo(c) {
    var out = h('div', { 'aria-live': 'polite' }), area = ta('eloTxt', 'Partidos en orden cronológico, uno por línea:\nfecha,local,visitante,golesLocal,golesVisitante\n(o: Local 2-1 Visitante)', 9), res = null, selD = h('div');
    var K = ni('eloK', 'Factor K', 'Más alto = más reactivo (20 típico)'), V1 = ni('eloV', 'Ventaja de local (puntos Elo)', '≈60 en fútbol'), E = ni('eloE', 'Prob. base de empate (%)', 'Heurística: se reduce si hay mucha diferencia');
    function calc() {
      if (!res) { U.montar(out, U.vacio('Pega los partidos y pulsa «Calcular Elo»')); return; }
      var eq = Object.keys(res.ratings).sort(function (a, b) { return res.ratings[b] - res.ratings[a]; });
      var l = st.eloL && res.ratings[st.eloL] != null ? st.eloL : eq[0], v = st.eloV2 && res.ratings[st.eloV2] != null ? st.eloV2 : eq[1] || eq[0];
      var p = M.elo1x2(res.ratings[l], res.ratings[v], { ventaja: num('eloV'), empateBase: num('eloE') / 100 });
      U.montar(out, h('div', { class: 'form-g' }, U.campo('Local', U.selector(eq, l, function (x) { st.eloL = x; calc(); })), U.campo('Visitante', U.selector(eq, v, function (x) { st.eloV2 = x; calc(); }))),
        h('div', { class: 'kpis' }, U.kpi('Local', U.p(p.local, 1), 'cuota justa ' + U.cuota(1 / p.local)), U.kpi('Empate', U.p(p.empate, 1), 'cuota justa ' + U.cuota(1 / p.empate)), U.kpi('Visitante', U.p(p.visitante, 1), 'cuota justa ' + U.cuota(1 / p.visitante)), U.kpi('Puntuación esperada local', U.p(p.esperado, 1))),
        h('div', { class: 'fila' }, U.btn('→ Kelly (local)', function () { S.prefillKelly = { prob: Math.round(p.local * 1000) / 10, cuota: 2 }; location.hash = '#/banca'; }, 'pequeno')),
        U.tabla(['#', 'Equipo', { t: 'Elo', clase: 'num' }, { t: 'PJ', clase: 'num' }], eq.map(function (e, i) { return h('tr', null, h('td', null, i + 1), h('th', { scope: 'row' }, e), h('td', { class: 'num' }, U.n(res.ratings[e], 0)), h('td', { class: 'num' }, res.partidos[e])); })));
    }
    [K, V1, E].forEach(function (x) { x.i._cb = calc; });
    c.appendChild(h('div', null, LIM, U.campo('Partidos (CSV / texto)', area), h('div', { class: 'fila' }, archivo('eloTxt', area), U.btn('Calcular Elo', function () {
      var p = M.parsearResultados(st.eloTxt); if (p.partidos.length < 3) { U.toast('Pega al menos 3 partidos', 'peligro'); return; }
      res = M.eloCalcular(p.partidos, { K: num('eloK') || 20, ventaja: num('eloV'), usarGoles: true }); calc(); U.toast(p.partidos.length + ' partidos procesados' + (p.malas.length ? ', ' + p.malas.length + ' línea(s) ignorada(s)' : ''));
    }, 'primario')), h('div', { class: 'form-g' }, K.campo, V1.campo, E.campo), out));
    calc();
  }

  function tLog(c) {
    var out = h('div', { 'aria-live': 'polite' }), area = ta('logTxt', 'Una fila por partido: variables numéricas separadas por coma y, al final, 1 si ganó el local o 0 si no.\nEjemplo (dif. Elo, dif. forma, 1/0):\n120,0.5,1\n-80,-0.2,0', 9), modelo = null;
    var x = U.texto({ valor: st.logX, placeholder: 'Variables del partido a predecir, ej.: 90,0.3', onInput: function (v) { st.logX = v; pred(); } });
    function pred() {
      if (!modelo) return;
      var v = st.logX.split(/[,;\s]+/).filter(Boolean).map(Number);
      U.montar(out, h('div', { class: 'kpis' }, U.kpi('Filas usadas', modelo.n), U.kpi('Log-verosimilitud', U.n(modelo.logVerosimilitud, 2)), U.kpi('Pesos (estandarizados)', modelo.w.map(function (w) { return U.n(w, 2); }).join(' · '), 'intercepto ' + U.n(modelo.b, 2))),
        v.length === modelo.w.length && v.every(isFinite) ? h('div', { class: 'kpis' }, U.kpi('Probabilidad predicha', U.p(modelo.predecir(v), 1), 'cuota justa ' + U.cuota(1 / modelo.predecir(v)))) : h('small', { class: 'muted' }, 'Indica ' + modelo.w.length + ' valores separados por coma para predecir.'),
        modelo.n < 30 ? U.aviso('Con menos de 30 filas el modelo es muy poco fiable.', 'aviso') : null);
    }
    c.appendChild(h('div', null, LIM, U.campo('Datos de entrenamiento', area), h('div', { class: 'fila' }, archivo('logTxt', area), U.btn('Entrenar', function () {
      var filas = st.logTxt.split(/\r?\n/).map(function (l) { return l.split(/[,;\t]/).map(function (s) { return s.trim().replace(',', '.'); }); }).filter(function (r) { return r.length >= 2 && r.every(function (s) { return s !== '' && isFinite(Number(s)); }); }).map(function (r) { return r.map(Number); });
      if (filas.length < 8) { U.toast('Necesito al menos 8 filas numéricas', 'peligro'); return; }
      var d = filas[0].length; filas = filas.filter(function (r) { return r.length === d && (r[d - 1] === 0 || r[d - 1] === 1); });
      if (filas.length < 8) { U.toast('La última columna debe ser 0 o 1 y todas las filas el mismo nº de columnas', 'peligro'); return; }
      modelo = M.logistica(filas.map(function (r) { return r.slice(0, d - 1); }), filas.map(function (r) { return r[d - 1]; }), { iter: 3000 }); pred();
    }, 'primario')), U.campo('Predecir', x), out));
  }

  V.modelos = function (cont) {
    var cuerpo = h('div', { class: 'sub-cuerpo' });
    function ir(s) { sub = s; U.vaciar(cuerpo); ({ poisson: tPoisson, elo: tElo, log: tLog })[s](cuerpo); }
    U.montar(cont, U.seg([{ v: 'poisson', t: 'Poisson (fútbol)' }, { v: 'elo', t: 'Elo' }, { v: 'log', t: 'Logística' }], sub, ir, 'Modelos'), cuerpo); ir(sub);
  };
})(window);
