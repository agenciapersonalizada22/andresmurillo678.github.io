/* Extraccion de paleta de una imagen (cuantizacion por corte de mediana). */
(function (IM) {
  IM.Paleta = {
    extraer: function (canvas, n) {
      n = n || 6; var k = Math.min(1, 96 / Math.max(canvas.width, canvas.height)), c = IM.lienzo(canvas.width * k, canvas.height * k), x = c.getContext('2d');
      x.drawImage(canvas, 0, 0, c.width, c.height);
      var d = x.getImageData(0, 0, c.width, c.height).data, px = [];
      for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
      if (!px.length) return [];
      var cajas = [px];
      while (cajas.length < n) {
        var mejor = 0, rango = -1, canal = 0;
        cajas.forEach(function (b, bi) {
          for (var ch = 0; ch < 3; ch++) { var mn = 255, mx = 0; b.forEach(function (p) { if (p[ch] < mn) mn = p[ch]; if (p[ch] > mx) mx = p[ch]; }); if ((mx - mn) * Math.sqrt(b.length) > rango && b.length > 1) { rango = (mx - mn) * Math.sqrt(b.length); mejor = bi; canal = ch; } }
        });
        if (rango < 0) break;
        var b = cajas[mejor].sort(function (p, q) { return p[canal] - q[canal]; }), m = b.length >> 1;
        cajas.splice(mejor, 1, b.slice(0, m), b.slice(m));
      }
      return cajas.map(function (b) { var s = [0, 0, 0]; b.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }); return { hex: window.Color.rgbAHex(s[0] / b.length, s[1] / b.length, s[2] / b.length), n: b.length }; })
        .sort(function (a, b) { return b.n - a.n; }).map(function (o) { return o.hex; });
    }
  };
})(window.IM);
