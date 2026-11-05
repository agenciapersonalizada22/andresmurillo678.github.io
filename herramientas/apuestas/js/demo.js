/* Datos DEMO (ficticios, generados con semilla). Solo para probar la herramienta sin el proceso de datos. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var CASAS = [['Pinnacle', 0.025], ['Casa Norte', 0.055], ['Casa Sur', 0.065], ['Casa Este', 0.05], ['Casa Oeste', 0.07], ['Casa Costa', 0.06]];
  var LIGAS = [
    { clave: 'soccer_epl', nombre: 'Fútbol · Premier League', eq: ['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Tottenham', 'Newcastle', 'Aston Villa', 'Brighton', 'West Ham', 'Everton'], f: [2300, 2150, 2200, 1950, 1900, 1900, 1850, 1800, 1750, 1700], tipo: 'f' },
    { clave: 'soccer_spain_la_liga', nombre: 'Fútbol · La Liga', eq: ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Sevilla', 'Real Sociedad', 'Villarreal', 'Athletic Club', 'Valencia'], f: [2250, 2200, 2050, 1800, 1850, 1800, 1850, 1700], tipo: 'f' },
    { clave: 'basketball_nba', nombre: 'Baloncesto · NBA', eq: ['Boston Celtics', 'Denver Nuggets', 'Milwaukee Bucks', 'Phoenix Suns', 'Lakers', 'Warriors', 'Miami Heat', 'Dallas Mavericks'], f: [2250, 2150, 2100, 2000, 1950, 1950, 1900, 2000], tipo: 'b' },
    { clave: 'tennis_atp', nombre: 'Tenis · ATP', eq: ['C. Alcaraz', 'J. Sinner', 'N. Djokovic', 'D. Medvedev', 'A. Zverev', 'C. Ruud', 'H. Rune', 'T. Fritz'], f: [2300, 2300, 2200, 2050, 2000, 1900, 1900, 1850], tipo: 't' }
  ];
  function rng(s) { var a = s >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function red(x) { return Math.round(x * 100) / 100; }
  function cuotasCasa(probs, mg, R, ruido) {
    var s = probs.map(function (p) { return Math.max(0.02, p * (1 + (R() - 0.5) * ruido)); });
    var t = s.reduce(function (a, b) { return a + b; }, 0);
    return s.map(function (p) { return red(Math.max(1.02, 1 / (p / t * (1 + mg)))); });
  }
  function generar(ahora, semillaRuido) {
    var R = rng(20260101), RN = rng(semillaRuido == null ? 7 : semillaRuido), n = 0;
    var deportes = LIGAS.map(function (L) {
      var eventos = [], usados = L.eq.map(function (_, i) { return i; }), k = L.tipo === 't' ? 4 : 4, i;
      for (i = usados.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), tmp = usados[i]; usados[i] = usados[j]; usados[j] = tmp; }
      for (i = 0; i < k; i++) {
        var a = usados[2 * i], b = usados[2 * i + 1]; if (b === undefined) break;
        var dif = L.f[a] - L.f[b] + (L.tipo === 'f' ? 60 : 0), e = 1 / (1 + Math.pow(10, -dif / 400)), probs;
        if (L.tipo === 'f') { var pd = 0.27 * 4 * e * (1 - e); probs = [e - pd / 2, pd, 1 - e - pd / 2]; } else probs = [e, 1 - e];
        var inicio = new Date(ahora + (3 + Math.floor(R() * 120)) * 3600000); inicio.setMinutes(Math.round(inicio.getMinutes() / 15) * 15, 0, 0);
        var casas = CASAS.map(function (c) {
          var q = cuotasCasa(probs, c[1], RN, c[0] === 'Pinnacle' ? 0.01 : 0.07), m = {};
          if (L.tipo === 'f') m.h2h = { local: q[0], empate: q[1], visitante: q[2] }; else m.h2h = { local: q[0], visitante: q[1] };
          if (L.tipo !== 't') {
            var linea = L.tipo === 'f' ? 2.5 : 221.5, po = L.tipo === 'f' ? 0.5 : 0.5, qt = cuotasCasa([po, 1 - po], c[1], RN, 0.06);
            m.totales = { linea: linea, mas: qt[0], menos: qt[1] };
          }
          return { casa: c[0], mercados: m };
        });
        eventos.push({ id: 'demo-' + (++n), inicio: inicio.toISOString(), local: L.eq[a], visitante: L.eq[b], casas: casas });
      }
      return { clave: L.clave, nombre: L.nombre, eventos: eventos };
    });
    /* casos de ejemplo: un surebet, un valor claro y un middle */
    var e0 = deportes[0].eventos[0];     var ph = e0.casas[0].mercados.h2h, pr = [1 / ph.local, 1 / ph.empate, 1 / ph.visitante], ps = pr[0] + pr[1] + pr[2];
    e0.casas[3].mercados.h2h.local = red(1 / (pr[0] / ps) * 1.07);
    var e1 = deportes[1].eventos[0];
    e1.casas[2].mercados.h2h.visitante = red(e1.casas[0].mercados.h2h.visitante * 1.12);
    var e2 = deportes[2].eventos[0];
    e2.casas[1].mercados.totales = { linea: 218.5, mas: 1.95, menos: 1.87 }; e2.casas[3].mercados.totales = { linea: 224.5, mas: 1.85, menos: 1.96 };
    return { generado: new Date(ahora).toISOString(), fuente: 'DEMO: datos ficticios generados localmente', demo: true, deportes: deportes };
  }
  A.demo = { generar: generar };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.demo;
})(typeof window !== 'undefined' ? window : globalThis);
