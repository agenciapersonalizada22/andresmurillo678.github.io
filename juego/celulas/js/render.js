/* Celulas: dibujo en canvas 2D (mundo, minimapa). Lee una "vista" (Mundo o Replica) ya preparada con rx, ry, rr. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, K = C.K;
  var R = C.Render = { dpr: 1, W: 0, H: 0, ctx: null, canvas: null, visibles: 0 };
  var orden = [], nOrd = 0, idxC = [], cnt = new Int32Array(8), porColor = [], i;
  for (i = 0; i < 8; i++) porColor.push(new Uint16Array(4096));
  var fuentes = {}, spikes = [];
  for (i = 0; i < 36; i++) { var a = i * Math.PI / 18, rr = i % 2 ? 0.88 : 1.04; spikes.push(Math.cos(a) * rr, Math.sin(a) * rr); }
  function fuente(px) { return fuentes[px] || (fuentes[px] = px + 'px Orbitron, "Segoe UI", sans-serif'); }

  R.iniciar = function (canvas) { R.canvas = canvas; R.ctx = canvas.getContext('2d', { alpha: false }); };
  R.ajustar = function (w, h, dpr) {
    R.W = w; R.H = h; R.dpr = dpr;
    R.canvas.width = Math.max(1, Math.round(w * dpr)); R.canvas.height = Math.max(1, Math.round(h * dpr));
  };

  R.dibujar = function (v, cam, op) {
    var ctx = R.ctx, W = R.W, H = R.H, z = cam.z, tam = v.tam, cal = op.cal, t = op.t;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.fillStyle = op.fondo; ctx.fillRect(0, 0, W, H);
    var hw = W / 2 / z, hh = H / 2 / z, x0 = cam.x - hw, x1 = cam.x + hw, y0 = cam.y - hh, y1 = cam.y + hh;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = op.mapa; ctx.fillRect(0, 0, tam, tam);
    // cuadricula
    if (op.cuadricula) {
      var paso = z < 0.18 ? 400 : z < 0.4 ? 200 : 100, gx0 = Math.max(0, Math.floor(x0 / paso) * paso), gx1 = Math.min(tam, x1), gy0 = Math.max(0, Math.floor(y0 / paso) * paso), gy1 = Math.min(tam, y1);
      ctx.beginPath();
      for (var gx = gx0; gx <= gx1; gx += paso) { ctx.moveTo(gx, Math.max(0, y0)); ctx.lineTo(gx, Math.min(tam, y1)); }
      for (var gy = gy0; gy <= gy1; gy += paso) { ctx.moveTo(Math.max(0, x0), gy); ctx.lineTo(Math.min(tam, x1), gy); }
      ctx.lineWidth = 1.3 / z; ctx.strokeStyle = op.rejilla; ctx.stroke();
    }
    // zona de batalla
    if (v.zonaActiva) {
      ctx.beginPath(); ctx.rect(-50, -50, tam + 100, tam + 100); ctx.moveTo(tam / 2 + v.zona, tam / 2); ctx.arc(tam / 2, tam / 2, v.zona, 0, 6.2832, true);
      ctx.fillStyle = 'rgba(255,40,70,0.22)'; ctx.fill('evenodd');
      ctx.beginPath(); ctx.arc(tam / 2, tam / 2, v.zona, 0, 6.2832); ctx.lineWidth = 6 / z + 4; ctx.strokeStyle = 'rgba(255,80,100,0.9)'; ctx.stroke();
    }
    // borde del mapa
    ctx.lineWidth = 12; ctx.strokeStyle = op.borde; ctx.strokeRect(-6, -6, tam + 12, tam + 12);
    // comida (por lotes de color)
    var n = v.hComida.consultar(x0 - 10, y0 - 10, x1 + 10, y1 + 10, v.bufF), k, s, col, fr = Math.max(C.R_COMIDA, 1.6 / z);
    for (k = 0; k < 8; k++) cnt[k] = 0;
    var gens = v.fgen, pal = op.paletaComida;
    for (k = 0; k < n; k++) {
      s = v.bufF[k]; col = (C.hash2((v.semilla ^ Math.imul(s, 0x9E3779B1)) | 0, gens[s]) >>> 0); col = (C.hash2(col, s + 17) >>> 3) & 7;
      porColor[col][cnt[col]++] = s;
    }
    var fx = v.fx, fy = v.fy;
    for (col = 0; col < 8; col++) {
      var m = cnt[col]; if (!m) continue;
      ctx.beginPath(); var arr = porColor[col];
      if (cal.circulos && fr * z > 3) { for (k = 0; k < m; k++) { s = arr[k]; ctx.moveTo(fx[s] + fr, fy[s]); ctx.arc(fx[s], fy[s], fr, 0, 6.2832); } }
      else { var d2 = fr * 2; for (k = 0; k < m; k++) { s = arr[k]; ctx.rect(fx[s] - fr, fy[s] - fr, d2, d2); } }
      ctx.fillStyle = pal[col]; ctx.fill();
    }
    // eyecciones
    var ej = v.ej, nE = v.nE, skins = v.jugs;
    for (k = 0; k < nE; k++) {
      var e = ej[k]; if (e.rx < x0 || e.rx > x1 || e.ry < y0 || e.ry > y1) continue;
      var jj = skins[e.jid]; ctx.beginPath(); ctx.arc(e.rx, e.ry, C.R_EYEC, 0, 6.2832);
      ctx.fillStyle = jj ? C.Skins.color(jj.skin) : '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    }
    // celulas y virus ordenados por tamano (grandes debajo)
    nOrd = 0; var cells = v.cells, nC = v.nC, vir = v.virus, nV = v.nV;
    for (k = 0; k < nC; k++) {
      var c = cells[k], r = c.rr; if (c.rx + r < x0 || c.rx - r > x1 || c.ry + r < y0 || c.ry - r > y1) continue;
      orden[nOrd++] = c;
    }
    for (k = 0; k < nV; k++) {
      var q = vir[k]; if (q.rx + 70 < x0 || q.rx - 70 > x1 || q.ry + 70 < y0 || q.ry - 70 > y1) continue;
      q.rr = K * Math.sqrt(q.rm || 100); orden[nOrd++] = q;
    }
    for (k = 1; k < nOrd; k++) { var o = orden[k], j2 = k - 1; while (j2 >= 0 && orden[j2].rr < o.rr) { orden[j2 + 1] = orden[j2]; j2--; } orden[j2 + 1] = o; }
    R.visibles = nOrd;
    var tamSprite = cal.sprite, equipos = op.equipos;
    for (k = 0; k < nOrd; k++) {
      var o2 = orden[k], rr = o2.rr;
      if (o2.feed !== undefined) { dibujarVirus(ctx, o2, rr, z, op); continue; }
      var pj = skins[o2.jid]; if (!pj) continue;
      if (cal.ondas) rr *= 1 + 0.012 * Math.sin(t * 3 + o2.id);
      var sp = C.Skins.sprite(pj.skin, rr * z > 80 ? tamSprite : Math.min(tamSprite, 96));
      ctx.drawImage(sp, o2.rx - rr, o2.ry - rr, rr * 2, rr * 2);
      if (equipos && pj.equipo >= 0) { ctx.beginPath(); ctx.arc(o2.rx, o2.ry, rr * 0.96, 0, 6.2832); ctx.lineWidth = Math.max(4, rr * 0.08); ctx.strokeStyle = C.EQUIPOS[pj.equipo].color; ctx.stroke(); }
      if (o2.jid === op.yo) { ctx.beginPath(); ctx.arc(o2.rx, o2.ry, rr + 2 / z, 0, 6.2832); ctx.lineWidth = 2.2 / z; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke(); }
      if (o2.prot > 0) { ctx.beginPath(); ctx.arc(o2.rx, o2.ry, rr + 6, 0, 6.2832); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(120,255,255,0.6)'; ctx.stroke(); }
    }
    // nombres y masa
    if (op.nombres || op.masa) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (k = nOrd - 1; k >= 0; k--) {
        var o3 = orden[k]; if (o3.feed !== undefined) continue;
        var pr = o3.rr * z; if (pr < 17) continue;
        var pj2 = skins[o3.jid]; if (!pj2) continue;
        var px = Math.max(10, Math.min(46, Math.round(pr * 0.34 / 2) * 2)) * op.textoK, ws = px / z;
        ctx.font = fuente(px); ctx.lineWidth = Math.max(2, px * 0.16) / z; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
        var yy = o3.ry;
        if (op.nombres) { var nm = pj2.nombre || ''; if (op.masa) yy -= ws * 0.35; ctx.strokeText(nm, o3.rx, yy); ctx.fillText(nm, o3.rx, yy); yy += ws * 0.95; }
        if (op.masa && pr > 28) { var px2 = Math.round(px * 0.7), ws2 = px2 / z; ctx.font = fuente(px2); ctx.lineWidth = Math.max(2, px2 * 0.16) / z; var ms = String(Math.round(o3.rm)); ctx.strokeText(ms, o3.rx, op.nombres ? yy - ws2 * 0.1 : o3.ry); ctx.fillText(ms, o3.rx, op.nombres ? yy - ws2 * 0.1 : o3.ry); }
      }
    }
    ctx.restore();
  };

  function dibujarVirus(ctx, v, r, z, op) {
    ctx.beginPath();
    for (var i = 0; i < 72; i += 2) { var x = v.rx + spikes[i] * r, y = v.ry + spikes[i + 1] * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fillStyle = op.virusRelleno; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = op.virusBorde; ctx.stroke();
    ctx.beginPath(); ctx.arc(v.rx, v.ry, r * 0.55, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
  }

  /* minimapa: dibuja en un canvas pequeno */
  R.minimapa = function (ctx, S, v, cam, yo, op) {
    var tam = v.tam, k = S / tam;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(8,6,28,0.72)'; ctx.fillRect(0, 0, S, S);
    if (v.zonaActiva) { ctx.beginPath(); ctx.arc(S / 2, S / 2, v.zona * k, 0, 6.2832); ctx.strokeStyle = 'rgba(255,80,100,0.9)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    var js = v.jugs;
    for (var i = 0; i < js.length; i++) {
      var j = js[i]; if (!j || !(j.masa > 0)) continue;
      var rad = Math.max(1.8, Math.min(6, Math.sqrt(j.masa) * k * 6 * 0.5));
      ctx.beginPath(); ctx.arc(j.cx * k, j.cy * k, rad, 0, 6.2832);
      ctx.fillStyle = op.equipos && j.equipo >= 0 ? C.EQUIPOS[j.equipo].color : C.Skins.color(j.skin); ctx.fill();
      if (j.id === yo) { ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect((cam.x - R.W / 2 / cam.z) * k, (cam.y - R.H / 2 / cam.z) * k, R.W / cam.z * k, R.H / cam.z * k);
    ctx.strokeStyle = 'rgba(154,140,255,0.6)'; ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
