/* Skins procedurales: {p patron, h1, h2 tonos, o ojos, a accesorio, g brillo, v intensidad}. Se codifican como "p.h1.h2.o.a.g.v". */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, K = S.Skins = {};
  K.PATRONES = ['Liso', 'Rayas', 'Puntos', 'Arcoíris', 'Degradado', 'Neón', 'Escamas', 'Bandas'];
  K.OJOS = ['Clásicos', 'Grandes', 'Enojados', 'Visor', 'Cíclope', 'Soñolientos'];
  K.ACCESORIOS = ['Ninguno', 'Corona', 'Sombrero de mago', 'Gafas de sol', 'Antenas', 'Cuernos', 'Lazo', 'Aureola'];
  K.INTENSIDAD = ['Normal', 'Vívido', 'Pastel'];
  K.PRESETS = [
    { n: 'Esmeralda', s: { p: 6, h1: 140, h2: 95, o: 0, a: 0, g: 0, v: 0 } },
    { n: 'Cobra', s: { p: 1, h1: 42, h2: 25, o: 2, a: 0, g: 0, v: 0 } },
    { n: 'Neón cian', s: { p: 5, h1: 185, h2: 300, o: 3, a: 0, g: 1, v: 1 } },
    { n: 'Magma', s: { p: 4, h1: 8, h2: 48, o: 2, a: 5, g: 1, v: 1 } },
    { n: 'Hielo', s: { p: 7, h1: 195, h2: 215, o: 5, a: 7, g: 0, v: 2 } },
    { n: 'Arcoíris', s: { p: 3, h1: 0, h2: 0, o: 1, a: 0, g: 1, v: 1 } },
    { n: 'Oro real', s: { p: 6, h1: 46, h2: 36, o: 0, a: 1, g: 1, v: 0 } },
    { n: 'Cebra', s: { p: 1, h1: 220, h2: 220, o: 4, a: 0, g: 0, v: 2 } },
    { n: 'Sandía', s: { p: 1, h1: 120, h2: 350, o: 1, a: 0, g: 0, v: 1 } },
    { n: 'Galaxia', s: { p: 2, h1: 255, h2: 310, o: 3, a: 4, g: 1, v: 1 } },
    { n: 'Veneno', s: { p: 2, h1: 285, h2: 95, o: 2, a: 5, g: 1, v: 1 } },
    { n: 'Sakura', s: { p: 4, h1: 335, h2: 15, o: 5, a: 6, g: 0, v: 2 } },
    { n: 'Mago', s: { p: 7, h1: 265, h2: 45, o: 1, a: 2, g: 0, v: 0 } },
    { n: 'Radar', s: { p: 5, h1: 120, h2: 150, o: 3, a: 3, g: 1, v: 1 } },
    { n: 'Cobre', s: { p: 6, h1: 22, h2: 12, o: 0, a: 0, g: 0, v: 0 } },
    { n: 'Eclipse', s: { p: 5, h1: 40, h2: 40, o: 4, a: 7, g: 1, v: 0 } }
  ];
  function ent(v, a, b, d) { v = Math.floor(+v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  K.limpiar = function (s) {
    s = s || {};
    return { p: ent(s.p, 0, 7, 0), h1: ent(s.h1, 0, 359, 140), h2: ent(s.h2, 0, 359, 95), o: ent(s.o, 0, 5, 0), a: ent(s.a, 0, 7, 0), g: ent(s.g, 0, 1, 0), v: ent(s.v, 0, 2, 0) };
  };
  K.codificar = function (s) { s = K.limpiar(s); return [s.p, s.h1, s.h2, s.o, s.a, s.g, s.v].join('.'); };
  K.decodificar = function (t) {
    var a = String(t || '').split('.');
    return K.limpiar({ p: a[0], h1: a[1], h2: a[2], o: a[3], a: a[4], g: a[5], v: a[6] });
  };
  K.aleatoria = function (rnd) {
    rnd = rnd || Math.random;
    if (rnd() < 0.45) { var p = K.PRESETS[(rnd() * K.PRESETS.length) | 0].s; return K.limpiar({ p: p.p, h1: p.h1 + ((rnd() - .5) * 30) | 0, h2: p.h2, o: p.o, a: p.a, g: p.g, v: p.v }); }
    return K.limpiar({ p: (rnd() * 8) | 0, h1: (rnd() * 360) | 0, h2: (rnd() * 360) | 0, o: (rnd() * 6) | 0, a: rnd() < 0.5 ? 0 : (rnd() * 8) | 0, g: rnd() < 0.4 ? 1 : 0, v: (rnd() * 3) | 0 });
  };
  K.deEquipo = function (s, eq) { var t = K.limpiar(s); t.h1 = eq === 0 ? 205 : 355; t.h2 = eq === 0 ? 185 : 20; if (t.p === 3) t.p = 1; if (t.v === 2) t.v = 0; return t; };
  var cache = {};
  /* colores calculados (cacheados por codigo) */
  K.colores = function (s) {
    var k = K.codificar(s), c = cache[k];
    if (c) return c;
    var sat = [70, 95, 55][s.v] || 70, lum = [52, 56, 70][s.v] || 52;
    c = cache[k] = {
      c1: 'hsl(' + s.h1 + ',' + sat + '%,' + lum + '%)', c2: 'hsl(' + s.h2 + ',' + sat + '%,' + Math.min(78, lum + 6) + '%)',
      borde: 'hsl(' + s.h1 + ',' + sat + '%,' + Math.max(12, lum - 34) + '%)', luz: 'hsl(' + s.h1 + ',' + (sat - 10) + '%,' + Math.min(92, lum + 28) + '%)',
      neon: 'hsl(' + s.h1 + ',100%,62%)', fondo: 'hsl(' + s.h1 + ',45%,9%)', hue: s.h1
    };
    return c;
  };
  K.colorOrbe = function (i) { return 'hsl(' + (i * 45 + 10) + ',100%,62%)'; };
})(typeof window !== 'undefined' ? window : globalThis);
