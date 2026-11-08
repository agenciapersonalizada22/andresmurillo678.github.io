/* IA del bot de hockey. UMD: window.HkBot o require(). Decide el objetivo del mazo del bot cada cuadro. */
(function (G) {
  'use strict';
  var NIVELES = [
    { id: 'facil', nombre: 'Fácil', vmax: 900, reaccion: 0.34, error: 48, ataque: 0.2, rebote: false, defensa: 0.6 },
    { id: 'normal', nombre: 'Normal', vmax: 1450, reaccion: 0.2, error: 26, ataque: 0.5, rebote: true, defensa: 0.8 },
    { id: 'dificil', nombre: 'Difícil', vmax: 1950, reaccion: 0.11, error: 12, ataque: 0.75, rebote: true, defensa: 0.92 },
    { id: 'experto', nombre: 'Experto', vmax: 2400, reaccion: 0.05, error: 4, ataque: 0.95, rebote: true, defensa: 1 }
  ];
  var W = 400, H = 800;

  function crear(nivel, lado, rnd) {
    var n = NIVELES[Math.max(0, Math.min(3, nivel))];
    return { n: n, lado: lado, rnd: rnd || Math.random, vx: 0, vy: 0, px: W / 2, py: H / 2, pvx: 0, pvy: 0, t: 0, prox: 0, ex: 0, ey: 0, golpe: 0 };
  }

  // x donde llegara el disco a la linea y (con rebotes en paredes laterales), o null si no se acerca
  function prediccion(px, py, vx, vy, y, rebote, r) {
    if (Math.abs(vy) < 1) return null;
    var t = (y - py) / vy; if (t < 0 || t > 3) return null;
    var x = px + vx * t;
    if (!rebote) return Math.max(r, Math.min(W - r, x));
    var lo = r, ancho = W - 2 * r; x = (x - lo) % (2 * ancho); if (x < 0) x += 2 * ancho; if (x > ancho) x = 2 * ancho - x;
    return x + lo;
  }

  function decidir(bot, s, dt) {
    var n = bot.n, m = s.mallets[bot.lado], sg = bot.lado ? 1 : -1; // sg: hacia el arco rival = +1 si el bot esta arriba
    bot.t += dt; m.vmax = n.vmax;
    var pk = s.pucks[0];
    // el disco mas peligroso: el que mas se acerca a mi porteria
    s.pucks.forEach(function (p) { if (!pk || (bot.lado ? p.y < pk.y : p.y > pk.y)) pk = p; });
    if (bot.t >= bot.prox) {
      bot.prox = bot.t + n.reaccion * (0.7 + bot.rnd() * 0.6);
      if (pk) { bot.px = pk.x; bot.py = pk.y; bot.pvx = pk.vx; bot.pvy = pk.vy; }
      bot.pasivo = bot.rnd() > 0.35 + n.ataque * 0.65; bot.ex = (bot.rnd() - 0.5) * 2 * n.error; bot.ey = (bot.rnd() - 0.5) * 2 * n.error;
    }
    var home = bot.lado ? 80 : H - 80, tx = W / 2, ty = home;
    if (!pk || s.espera > 0) { m.tx = W / 2; m.ty = home; return; }
    var propia = bot.lado ? bot.py < H / 2 : bot.py > H / 2;
    var vel = Math.hypot(bot.pvx, bot.pvy), haciaMi = (bot.pvy * -sg) > 40;
    var linea = bot.lado ? 70 + 40 * (1 - n.defensa) : H - 70 - 40 * (1 - n.defensa);
    if (propia && (vel < 260 || !haciaMi)) {
      // ataque: ponerse detras del disco y empujarlo hacia el arco rival
      var gx = W / 2 + (n.rebote ? (bot.rnd() - 0.5) * 110 : 0), gy = bot.lado ? H : 0;
      var dx = gx - bot.px, dy = gy - bot.py, d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      var detras = (m.x - bot.px) * dx + (m.y - bot.py) * dy; // <0: estoy detras del disco
      var al = Math.abs((m.x - bot.px) * dy - (m.y - bot.py) * dx); // distancia lateral a la linea de tiro
      if (bot.pasivo && vel < 40) { tx = bot.px; ty = home + (bot.lado ? 40 : -40); }
      else if (detras < -14 && al < 30 + n.error) { tx = bot.px + dx * 90; ty = bot.py + dy * 90; }
      else { tx = bot.px - dx * 70; ty = bot.py - dy * 70; }
    } else {
      var x = prediccion(bot.px, bot.py, bot.pvx, bot.pvy, linea, n.rebote, 20);
      if (x != null && haciaMi) { tx = x; ty = linea; }
      else { tx = W / 2 + (bot.px - W / 2) * 0.45; ty = home; }
    }
    m.tx = tx + bot.ex; m.ty = ty + bot.ey;
  }

  var B = { NIVELES: NIVELES, crear: crear, decidir: decidir, prediccion: prediccion };
  if (typeof module !== 'undefined' && module.exports) module.exports = B; else G.HkBot = B;
})(typeof window !== 'undefined' ? window : globalThis);
