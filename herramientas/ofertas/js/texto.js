/* Texto: normalizacion, tokens, sinonimos es/en y distancia de edicion (Damerau). Modulo UMD: navegador (Of.texto) y Node. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else { g.Of = g.Of || {}; g.Of.texto = fab(); }
})(typeof self !== 'undefined' ? self : this, function () {
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function raiz(t) {
    if (t.length > 5 && /[^aeiou]es$/.test(t)) return t.slice(0, -2);
    if (t.length > 3 && /s$/.test(t) && !/ss$/.test(t)) return t.slice(0, -1);
    return t;
  }
  function tokens(s, sinRaiz) {
    var n = norm(s).replace(/(\d)\s+(gb|tb|mb|ml|l|kg|g|w|hz|mah|mp|cm|mm|pulgadas|in)\b/g, '$1$2').replace(/(\d)[.,](\d)/g, '$1$2');
    var m = n.match(/[a-z0-9]+/g) || [];
    return sinRaiz ? m : m.map(raiz);
  }
  var GRUPOS = [
    'laptop portatil notebook ordenador computadora computador macbook chromebook',
    'movil celular telefono smartphone phone iphone',
    'televisor tv television tele televisión',
    'auricular audifono headphone cascos earbud casco',
    'zapatilla tenis sneaker zapato calzado',
    'nevera refrigerador frigorifico fridge heladera',
    'lavadora washer lavarropas',
    'aspiradora vacuum robot',
    'reloj watch smartwatch',
    'juego videojuego game',
    'consola console',
    'monitor pantalla screen display',
    'teclado keyboard',
    'raton mouse',
    'cargador charger',
    'camara camera',
    'bateria battery powerbank',
    'altavoz parlante speaker bocina',
    'mochila backpack',
    'cafetera coffee espresso',
    'barato cheap economico',
    'oferta deal chollo promocion descuento sale',
    'ropa clothes vestido camiseta shirt',
    'libro book',
    'viaje travel vuelo flight hotel',
    'tablet ipad',
    'impresora printer',
    'bicicleta bike bici',
    'sofa couch',
    'colchon mattress'
  ];
  var SIN = {};
  GRUPOS.forEach(function (gr, i) {
    gr.split(' ').forEach(function (w) { w = norm(w); [w, w + 's', w + 'es'].forEach(function (v) { var r = raiz(v); (SIN[r] = SIN[r] || []).push(i); }); });
  });
  var GRUPO_TERM = GRUPOS.map(function (gr) { var o = {}; gr.split(' ').forEach(function (w) { w = norm(w); [w, w + 's', w + 'es'].forEach(function (v) { o[raiz(v)] = 1; }); }); return Object.keys(o); });
  function sinonimos(t) {
    var gs = SIN[t]; if (!gs) return [];
    var out = {};
    gs.forEach(function (i) { GRUPO_TERM[i].forEach(function (w) { if (w !== t) out[w] = 1; }); });
    return Object.keys(out);
  }
  function dist(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var p2 = null, p1 = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) p1[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i]; var mn = i;
      for (j = 1; j <= lb; j++) {
        var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + c);
        if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, p2[j - 2] + 1);
        cur[j] = v; if (v < mn) mn = v;
      }
      if (mn > max) return max + 1;
      p2 = p1; p1 = cur;
    }
    return p1[lb];
  }
  function maxErr(len) { return len < 4 ? 0 : len < 8 ? 1 : 2; }
  return { norm: norm, tokens: tokens, raiz: raiz, sinonimos: sinonimos, dist: dist, maxErr: maxErr };
});
