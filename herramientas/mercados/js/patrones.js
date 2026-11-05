/* Deteccion simple de patrones de velas [t,o,h,l,c,v]. Heuristicas educativas, no senales de operacion. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Patrones = m; })(typeof self !== 'undefined' ? self : this, function () {
  var INFO = {
    doji: { nombre: 'Doji', sesgo: 'indecision', desc: 'Apertura y cierre casi iguales: compradores y vendedores se equilibran. Tras un movimiento fuerte puede anticipar un giro, pero sola no confirma nada.' },
    martillo: { nombre: 'Martillo', sesgo: 'alcista', desc: 'Cuerpo pequeno arriba y mecha inferior larga tras una caida: los vendedores empujaron el precio abajo pero los compradores lo recuperaron. Posible suelo; conviene confirmar con la vela siguiente.' },
    colgado: { nombre: 'Hombre colgado', sesgo: 'bajista', desc: 'Misma forma del martillo pero tras una subida. Sugiere que aparece presion vendedora; requiere confirmacion bajista.' },
    martilloInv: { nombre: 'Martillo invertido', sesgo: 'alcista', desc: 'Cuerpo pequeno abajo y mecha superior larga tras una caida. Indica un primer intento comprador; necesita confirmacion.' },
    fugaz: { nombre: 'Estrella fugaz', sesgo: 'bajista', desc: 'Mecha superior larga y cuerpo pequeno abajo tras una subida: los compradores no lograron sostener los maximos.' },
    marubozuAl: { nombre: 'Marubozu alcista', sesgo: 'alcista', desc: 'Vela alcista sin mechas (o casi): control comprador durante toda la sesion.' },
    marubozuBa: { nombre: 'Marubozu bajista', sesgo: 'bajista', desc: 'Vela bajista sin mechas: control vendedor durante toda la sesion.' },
    envAl: { nombre: 'Envolvente alcista', sesgo: 'alcista', desc: 'Una vela alcista cuyo cuerpo envuelve al de la vela bajista anterior: el control pasa a los compradores.' },
    envBa: { nombre: 'Envolvente bajista', sesgo: 'bajista', desc: 'Una vela bajista cuyo cuerpo envuelve al de la vela alcista anterior: el control pasa a los vendedores.' },
    haramiAl: { nombre: 'Harami alcista', sesgo: 'alcista', desc: 'Vela alcista pequena dentro del cuerpo de una vela bajista grande: se frena la caida.' },
    haramiBa: { nombre: 'Harami bajista', sesgo: 'bajista', desc: 'Vela bajista pequena dentro del cuerpo de una vela alcista grande: se frena la subida.' },
    perforante: { nombre: 'Linea perforante', sesgo: 'alcista', desc: 'Tras una vela bajista grande, una alcista abre por debajo y cierra por encima de la mitad de su cuerpo.' },
    nubeOscura: { nombre: 'Nube oscura', sesgo: 'bajista', desc: 'Tras una vela alcista grande, una bajista abre por encima y cierra por debajo de la mitad de su cuerpo.' },
    estrellaManana: { nombre: 'Estrella de la manana', sesgo: 'alcista', desc: 'Tres velas: bajista grande, una pequena de indecision y una alcista que recupera mas de la mitad de la primera. Posible giro al alza.' },
    estrellaTarde: { nombre: 'Estrella de la tarde', sesgo: 'bajista', desc: 'Tres velas: alcista grande, una pequena de indecision y una bajista que devuelve mas de la mitad de la primera. Posible giro a la baja.' },
    soldados: { nombre: 'Tres soldados blancos', sesgo: 'alcista', desc: 'Tres velas alcistas consecutivas con cierres crecientes y aperturas dentro del cuerpo anterior: impulso comprador sostenido.' },
    cuervos: { nombre: 'Tres cuervos negros', sesgo: 'bajista', desc: 'Tres velas bajistas consecutivas con cierres decrecientes: impulso vendedor sostenido.' }
  };
  function g(b) { var o = b[1], c = b[4], h = b[2], l = b[3]; return { o: o, c: c, h: h, l: l, cu: Math.abs(c - o), ra: h - l, sup: h - Math.max(o, c), inf: Math.min(o, c) - l, al: c > o, ba: c < o, mid: (o + c) / 2 }; }
  function tend(v, i) { if (i < 5) return 0; var a = v[i - 5][4], b = v[i - 1][4]; var r = (b - a) / a; return r > 0.01 ? 1 : r < -0.01 ? -1 : 0; }
  function en(v, i) {
    var r = [], k = g(v[i]); if (!(k.ra > 0)) return r;
    var t = tend(v, i), p = i >= 1 ? g(v[i - 1]) : null, pp = i >= 2 ? g(v[i - 2]) : null;
    if (k.cu <= 0.1 * k.ra) r.push('doji');
    var peq = k.cu <= 0.35 * k.ra && k.cu > 0.02 * k.ra;
    if (peq && k.inf >= 2 * k.cu && k.sup <= 0.15 * k.ra) { if (t < 0) r.push('martillo'); else if (t > 0) r.push('colgado'); }
    if (peq && k.sup >= 2 * k.cu && k.inf <= 0.15 * k.ra) { if (t < 0) r.push('martilloInv'); else if (t > 0) r.push('fugaz'); }
    if (k.cu >= 0.9 * k.ra) r.push(k.al ? 'marubozuAl' : 'marubozuBa');
    if (p && p.cu > 0 && k.cu > 0) {
      if (p.ba && k.al && k.o <= p.c && k.c >= p.o && k.cu > p.cu) r.push('envAl');
      if (p.al && k.ba && k.o >= p.c && k.c <= p.o && k.cu > p.cu) r.push('envBa');
      if (p.ba && k.al && k.o > p.c && k.c < p.o && p.cu > 2 * k.cu) r.push('haramiAl');
      if (p.al && k.ba && k.o < p.c && k.c > p.o && p.cu > 2 * k.cu) r.push('haramiBa');
      if (p.ba && p.cu >= 0.5 * p.ra && k.al && k.o < p.c && k.c > p.mid && k.c < p.o) r.push('perforante');
      if (p.al && p.cu >= 0.5 * p.ra && k.ba && k.o > p.c && k.c < p.mid && k.c > p.o) r.push('nubeOscura');
    }
    if (p && pp && pp.cu >= 0.5 * pp.ra && p.cu <= 0.3 * pp.cu) {
      if (pp.ba && k.al && k.c > pp.mid) r.push('estrellaManana');
      if (pp.al && k.ba && k.c < pp.mid) r.push('estrellaTarde');
    }
    if (p && pp) {
      var fuerte = function (x) { return x.cu >= 0.6 * x.ra; };
      if (pp.al && p.al && k.al && fuerte(pp) && fuerte(p) && fuerte(k) && p.c > pp.c && k.c > p.c && p.o > pp.o && p.o < pp.c && k.o > p.o && k.o < p.c) r.push('soldados');
      if (pp.ba && p.ba && k.ba && fuerte(pp) && fuerte(p) && fuerte(k) && p.c < pp.c && k.c < p.c && p.o < pp.o && p.o > pp.c && k.o < p.o && k.o > p.c) r.push('cuervos');
    }
    return r;
  }
  function detectar(v, ultimas) {
    var ini = ultimas ? Math.max(0, v.length - ultimas) : 0, out = [];
    for (var i = ini; i < v.length; i++) en(v, i).forEach(function (id) { out.push({ i: i, t: v[i][0], id: id, nombre: INFO[id].nombre, sesgo: INFO[id].sesgo, desc: INFO[id].desc }); });
    return out;
  }
  return { INFO: INFO, detectar: detectar, en: en };
});
