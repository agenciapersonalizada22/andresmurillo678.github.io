/* Celulas: skins procedurales. Una skin es el texto "#rrggbb|patron|emoji". */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  var cache = {}, cuenta = 0;
  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mezcla(c, t, a) { var h = hex(c), r = [], i; for (i = 0; i < 3; i++) r[i] = Math.round(h[i] + (t[i] - h[i]) * a); return 'rgb(' + r[0] + ',' + r[1] + ',' + r[2] + ')'; }
  var S = C.Skins = {
    parse: function (s) {
      var p = String(s || '').split('|'), c = /^#[0-9a-fA-F]{6}$/.test(p[0]) ? p[0] : '#3df5ff';
      var pat = parseInt(p[1], 10); if (!(pat >= 0 && pat < C.PATRONES.length)) pat = 0;
      return { c: c, p: pat, e: (p[2] || '').slice(0, 4) };
    },
    texto: function (o) { return o.c + '|' + o.p + '|' + (o.e || ''); },
    color: function (s) { return S.parse(s).c; },
    dibujar: function (ctx, skin, S0) {
      var o = S.parse(skin), R = S0 / 2, clar = mezcla(o.c, [255, 255, 255], 0.38), osc = mezcla(o.c, [0, 0, 0], 0.38), i, j;
      ctx.clearRect(0, 0, S0, S0);
      ctx.save(); ctx.translate(R, R);
      var borde = R * 0.07;
      ctx.beginPath(); ctx.arc(0, 0, R - 0.5, 0, 6.2832); ctx.fillStyle = osc; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R - borde, 0, 6.2832); ctx.fillStyle = o.c; ctx.fill(); ctx.clip();
      var r = R - borde, p = o.p;
      ctx.lineWidth = r * 0.09; ctx.strokeStyle = osc; ctx.fillStyle = osc;
      if (p === 1) { ctx.globalAlpha = 0.45; for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * i / 3.6, 0, 6.2832); ctx.stroke(); } }
      else if (p === 2) { ctx.globalAlpha = 0.35; var s = (hex(o.c)[0] * 7 + hex(o.c)[2] * 13) >>> 0; for (i = 0; i < 9; i++) { s = (s * 1103515245 + 12345) >>> 0; var a = (s % 628) / 100, d = ((s >>> 8) % 70) / 100 * r, q = r * (0.1 + ((s >>> 16) % 16) / 100); ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, q, 0, 6.2832); ctx.fill(); } }
      else if (p === 3) { ctx.globalAlpha = 0.4; ctx.rotate(0.6); for (i = -4; i <= 4; i += 2) ctx.fillRect(-r, i * r * 0.2 - r * 0.1, 2 * r, r * 0.2); }
      else if (p === 4) { ctx.globalAlpha = 0.35; for (i = 0; i < 12; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 1.2, i * 0.5236, (i + 1) * 0.5236); ctx.closePath(); ctx.fill(); } }
      else if (p === 5) { ctx.globalAlpha = 0.4; ctx.fillStyle = clar; for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) { ctx.beginPath(); ctx.arc(i * r * 0.4, j * r * 0.4, r * 0.09, 0, 6.2832); ctx.fill(); } }
      else if (p === 6) { ctx.globalAlpha = 0.33; for (i = -3; i < 3; i++) for (j = -3; j < 3; j++) if ((i + j) & 1) ctx.fillRect(i * r / 3, j * r / 3, r / 3, r / 3); }
      else if (p === 7) { ctx.globalAlpha = 1; var g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r); g.addColorStop(0, clar); g.addColorStop(1, osc); ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); }
      ctx.globalAlpha = 1;
      var br = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
      br.addColorStop(0, 'rgba(255,255,255,0.28)'); br.addColorStop(0.5, 'rgba(255,255,255,0)'); br.addColorStop(1, 'rgba(0,0,0,0.16)');
      ctx.fillStyle = br; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      if (o.e) { ctx.font = Math.round(r * 1.1) + 'px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.e, 0, r * 0.06); }
      ctx.restore();
    },
    /* sprite en cache (canvas) */
    sprite: function (skin, tam) {
      var k = skin + '@' + tam, c = cache[k];
      if (c) return c;
      if (cuenta > 160) { cache = {}; cuenta = 0; }
      c = G.document.createElement('canvas'); c.width = c.height = tam;
      S.dibujar(c.getContext('2d'), skin, tam); cache[k] = c; cuenta++; return c;
    },
    vaciar: function () { cache = {}; cuenta = 0; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
