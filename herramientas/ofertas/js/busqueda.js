/* Busqueda: parser de consulta con operadores, indice invertido, fuzzy (sin acentos, sinonimos es/en). UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab(function (n) { return require('./' + n + '.js'); });
  else { g.Of = g.Of || {}; g.Of.busqueda = fab(function (n) { return g.Of[n]; }); }
})(typeof self !== 'undefined' ? self : this, function (req) {
  var T = req('texto');
  var CLAVES = { precio: 'precio', price: 'precio', p: 'precio', descuento: 'desc', desc: 'desc', dto: 'desc', discount: 'desc',
    tienda: 'tienda', store: 'tienda', t: 'tienda', cat: 'cat', categoria: 'cat', c: 'cat', cupon: 'cupon', coupon: 'cupon',
    moneda: 'moneda', pais: 'pais' };

  function num(s) {
    var m = String(s).replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }
  function vacio() {
    return { terminos: [], frases: [], excluir: [], excluirFrases: [],
      f: { pMin: null, pMax: null, dMin: null, dMax: null, tiendas: [], noTiendas: [], cats: [], noCats: [], cupon: null, moneda: null, pais: null } };
  }
  function parse(q) {
    var r = vacio(), re = /(-)?(?:([a-zA-Z]+)(<=|>=|:|<|>|=))?(?:"([^"]*)"|(\S+))/g, m;
    q = String(q || '');
    while ((m = re.exec(q))) {
      var neg = !!m[1], key = m[2] ? CLAVES[T.norm(m[2])] : null, op = m[3], val = m[4] != null ? m[4] : m[5], quoted = m[4] != null;
      if (m[2] && !key) { val = m[2] + op + val; op = null; key = null; quoted = false; }
      if (key) {
        var v = T.norm(val), f = r.f, n;
        if (key === 'precio' || key === 'desc') {
          var rg = v.match(/^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);
          var lo = key === 'precio' ? 'pMin' : 'dMin', hi = key === 'precio' ? 'pMax' : 'dMax';
          if (rg && op === ':') { f[lo] = num(rg[1]); f[hi] = num(rg[2]); continue; }
          n = num(v); if (isNaN(n)) continue;
          if (op === '<' || op === '<=') f[hi] = n;
          else if (op === '>' || op === '>=') f[lo] = n;
          else if (key === 'desc') f[lo] = n; else { f[lo] = n; f[hi] = n; }
        } else if (key === 'tienda') (neg ? f.noTiendas : f.tiendas).push(v);
        else if (key === 'cat') (neg ? f.noCats : f.cats).push(v);
        else if (key === 'cupon') f.cupon = /^(si|s|yes|y|1|true|con)$/.test(v) !== neg;
        else if (key === 'moneda') f.moneda = val.toUpperCase();
        else if (key === 'pais') f.pais = val.toUpperCase();
        continue;
      }
      if (quoted || /\s/.test(val)) { var fr = T.norm(val).trim(); if (fr) (neg ? r.excluirFrases : r.frases).push(fr); continue; }
      var tk = T.tokens(val);
      tk.forEach(function (t) { (neg ? r.excluir : r.terminos).push({ t: t, crudo: T.norm(val) }); });
    }
    if (r.terminos.length) r.terminos[r.terminos.length - 1].prefijo = !/\s$/.test(q) && !/"$/.test(q);
    return r;
  }

  /* candidatos de un termino sobre una lista de palabras: Map(palabra -> peso) */
  function candidatos(term, vocab, sinFuzzy) {
    var out = new Map(), t = term.t, len = t.length, sins = T.sinonimos(t), me = sinFuzzy ? 0 : T.maxErr(len), i, v, d;
    var pref = term.prefijo && len >= 2;
    for (i = 0; i < vocab.length; i++) {
      v = vocab[i];
      if (v === t) { out.set(v, 3); continue; }
      if (pref && v.length > len && v.lastIndexOf(t, 0) === 0) { out.set(v, 2); continue; }
      if (sins.length && sins.indexOf(v) >= 0) { out.set(v, 2.5); continue; }
      if (me && Math.abs(v.length - len) <= me) { d = T.dist(t, v, me); if (d <= me) out.set(v, 1.5 / d); }
    }
    return out;
  }

  function filtrosOk(f, d) {
    if (f.pMin != null && d.precio < f.pMin) return false;
    if (f.pMax != null && d.precio > f.pMax) return false;
    if (f.dMin != null && (d.desc || 0) < f.dMin) return false;
    if (f.dMax != null && (d.desc || 0) > f.dMax) return false;
    var i, tn = d.ntienda || T.norm(d.tienda), cn = d.ncat || T.norm(d.cat);
    if (f.tiendas.length) { for (i = 0; i < f.tiendas.length; i++) if (tn.indexOf(f.tiendas[i]) >= 0) break; if (i === f.tiendas.length) return false; }
    for (i = 0; i < f.noTiendas.length; i++) if (tn.indexOf(f.noTiendas[i]) >= 0) return false;
    if (f.cats.length) { for (i = 0; i < f.cats.length; i++) if (cn.indexOf(f.cats[i]) >= 0) break; if (i === f.cats.length) return false; }
    for (i = 0; i < f.noCats.length; i++) if (cn.indexOf(f.noCats[i]) >= 0) return false;
    if (f.cupon != null && !!d.cupon !== f.cupon) return false;
    if (f.moneda && d.moneda !== f.moneda) return false;
    if (f.pais && d.pais !== f.pais) return false;
    return true;
  }

  /* Coincidencia de un solo documento (alertas, pruebas). doc: {titulo,tienda,cat,precio,desc,cupon,moneda,pais} */
  function coincide(p, d) {
    if (!filtrosOk(p.f, d)) return false;
    var tit = T.norm(d.titulo + ' ' + (d.tienda || '') + ' ' + (d.cat || '')), toks = T.tokens(tit), i, k;
    for (i = 0; i < p.terminos.length; i++) if (!candidatos(p.terminos[i], toks).size) return false;
    for (i = 0; i < p.frases.length; i++) if (tit.indexOf(p.frases[i]) < 0) return false;
    for (i = 0; i < p.excluir.length; i++) { var ex = candidatos({ t: p.excluir[i].t }, toks, true); if (ex.size) return false; }
    for (i = 0; i < p.excluirFrases.length; i++) if (tit.indexOf(p.excluirFrases[i]) >= 0) return false;
    return true;
  }

  function Indice(docs) {
    this.docs = docs; this.n = docs.length; this.post = new Map(); this.tit = new Array(docs.length);
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i]; d.ntienda = T.norm(d.tienda); d.ncat = T.norm(d.cat);
      var txt = T.norm(d.titulo + ' ' + (d.tienda || '') + ' ' + (d.cat || '') + ' ' + (d.extra || ''));
      this.tit[i] = txt;
      var seen = {}, tk = T.tokens(txt);
      for (var j = 0; j < tk.length; j++) {
        var t = tk[j]; if (seen[t]) continue; seen[t] = 1;
        var a = this.post.get(t); if (!a) this.post.set(t, a = []); a.push(i);
      }
    }
    this.vocab = Array.from(this.post.keys());
  }
  /* devuelve {idx:[indices ordenados por relevancia], puntaje:[..], parsed} */
  Indice.prototype.buscar = function (q) {
    var p = typeof q === 'string' ? parse(q) : q, n = this.n, score = new Float32Array(n), ok = new Uint8Array(n).fill(1), i, k;
    for (i = 0; i < p.terminos.length; i++) {
      var cand = candidatos(p.terminos[i], this.vocab), tmp = new Float32Array(n);
      cand.forEach(function (w, v) { var a = this.post.get(v); for (var j = 0; j < a.length; j++) if (w > tmp[a[j]]) tmp[a[j]] = w; }, this);
      for (k = 0; k < n; k++) { if (tmp[k] > 0) score[k] += tmp[k]; else ok[k] = 0; }
    }
    for (i = 0; i < p.excluir.length; i++) {
      var ce = candidatos({ t: p.excluir[i].t }, this.vocab, true);
      ce.forEach(function (w, v) { var a = this.post.get(v); for (var j = 0; j < a.length; j++) ok[a[j]] = 0; }, this);
    }
    var res = [];
    for (k = 0; k < n; k++) {
      if (!ok[k]) continue;
      var t = this.tit[k], bad = false;
      for (i = 0; i < p.frases.length && !bad; i++) if (t.indexOf(p.frases[i]) < 0) bad = true;
      for (i = 0; i < p.excluirFrases.length && !bad; i++) if (t.indexOf(p.excluirFrases[i]) >= 0) bad = true;
      if (bad || !filtrosOk(p.f, this.docs[k])) continue;
      res.push(k);
    }
    if (p.terminos.length) res.sort(function (a, b) { return score[b] - score[a] || a - b; });
    return { idx: res, puntaje: res.map(function (k2) { return score[k2]; }), parsed: p };
  };
  return { parse: parse, Indice: Indice, coincide: coincide, candidatos: candidatos, filtrosOk: filtrosOk };
});
