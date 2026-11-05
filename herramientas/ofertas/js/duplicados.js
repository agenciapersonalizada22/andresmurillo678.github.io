/* Agrupador de duplicados entre tiendas: tokens significativos + numeros (modelo/capacidad) que deben coincidir. UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab(function (n) { return require('./' + n + '.js'); });
  else { g.Of = g.Of || {}; g.Of.duplicados = fab(function (n) { return g.Of[n]; }); }
})(typeof self !== 'undefined' ? self : this, function (req) {
  var T = req('texto');
  var VACIAS = {};
  ('de la el los las para con y en un una por the and for with of new nuevo nueva envio gratis oferta pack set color negro blanco black white gris silver azul rojo plata ' +
    'version modelo original oficial garantia mas edicion').split(' ').forEach(function (w) { VACIAS[w] = 1; });
  function firma(it) {
    var tn = T.tokens(it.tienda || '', true).reduce(function (o, w) { o[w] = 1; return o; }, {});
    var set = {}, nums = {}, n = 0;
    T.tokens(it.titulo || '').forEach(function (t) {
      if (VACIAS[t] || tn[t] || t.length < 2) return;
      set[t] = 1;
      if (/\d/.test(t)) nums[t] = 1;
    });
    return { set: set, nums: nums, keys: Object.keys(set) };
  }
  function sim(a, b) {
    var i, inter = 0, ka = a.keys, kb = b.keys;
    if (!ka.length || !kb.length) return 0;
    for (i = 0; i < ka.length; i++) if (b.set[ka[i]]) inter++;
    var na = Object.keys(a.nums), nb = Object.keys(b.nums);
    if (na.length || nb.length) {
      if (na.length !== nb.length) return 0;
      for (i = 0; i < na.length; i++) if (!b.nums[na[i]]) return 0;
    }
    if (inter < 2 && !(ka.length === 1 && kb.length === 1 && inter === 1)) return 0;
    var jac = inter / (ka.length + kb.length - inter), cont = inter / Math.min(ka.length, kb.length);
    return 0.5 * jac + 0.5 * cont;
  }
  function urlClave(u) { try { var x = new URL(u); return x.host + x.pathname; } catch (e) { return ''; } }
  /* items -> {grupos:[[idx..]], grupoDe:Int32Array}. umbral 0.75 por defecto */
  function agrupar(items, umbral) {
    umbral = umbral || 0.75;
    var n = items.length, par = new Int32Array(n), i, j, k;
    for (i = 0; i < n; i++) par[i] = i;
    function raiz(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    function unir(a, b) { a = raiz(a); b = raiz(b); if (a !== b) par[b] = a; }
    var fs = items.map(firma), post = {}, ids = {};
    for (i = 0; i < n; i++) {
      var it = items[i], idc = it.ean || it.gtin || it.sku || '';
      if (idc) { if (ids['i' + idc] != null) unir(ids['i' + idc], i); else ids['i' + idc] = i; }
      var uc = urlClave(it.url); if (uc && it.url.indexOf('example') < 0) { if (ids['u' + uc] != null) unir(ids['u' + uc], i); else ids['u' + uc] = i; }
      fs[i].keys.forEach(function (t) { (post[t] = post[t] || []).push(i); });
    }
    var visto = new Int32Array(n).fill(-1);
    for (i = 0; i < n; i++) {
      var ks = fs[i].keys.slice().sort(function (x, y) { return post[x].length - post[y].length; }).slice(0, 3);
      for (j = 0; j < ks.length; j++) {
        var a = post[ks[j]]; if (a.length > 400) continue;
        for (k = 0; k < a.length; k++) {
          var o = a[k];
          if (o <= i || visto[o] === i) continue;
          visto[o] = i;
          if (raiz(i) !== raiz(o) && sim(fs[i], fs[o]) >= umbral) unir(i, o);
        }
      }
    }
    var mapa = {}, grupos = [], grupoDe = new Int32Array(n);
    for (i = 0; i < n; i++) {
      var r = raiz(i);
      if (mapa[r] == null) { mapa[r] = grupos.length; grupos.push([]); }
      grupos[mapa[r]].push(i); grupoDe[i] = mapa[r];
    }
    return { grupos: grupos, grupoDe: grupoDe };
  }
  return { agrupar: agrupar, firma: firma, sim: sim };
});
