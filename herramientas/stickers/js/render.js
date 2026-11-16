/* Dibujo del documento: capas (imagen, texto, forma, emoji, pegatina), filtros por capa, efectos de sticker (contorno, sombra, holografico) y exportacion a canvas. window.StRender */
(function (g) {
  'use strict';
  const N = g.StNucleo, D = g.StDoc, R = g.StRender = {};
  R.FUENTES = [['Impact, Haettenschweiz, "Arial Narrow Bold", sans-serif', 'Impact (memes)'], ['"Arial Black", "Helvetica Neue", Arial, sans-serif', 'Arial Black'], ['"Comic Sans MS", "Comic Neue", cursive', 'Comic Sans'], ['Georgia, "Times New Roman", serif', 'Georgia'], ['"Courier New", Courier, monospace', 'Courier'], ['"Trebuchet MS", Verdana, sans-serif', 'Trebuchet'], ['Verdana, Geneva, sans-serif', 'Verdana'], ['"Brush Script MT", "Segoe Script", cursive', 'Cursiva'], ['"Times New Roman", Times, serif', 'Times'], ['system-ui, sans-serif', 'Sistema']];
  R.MEZCLAS = [['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Trama'], ['overlay', 'Superponer'], ['soft-light', 'Luz suave'], ['hard-light', 'Luz fuerte'], ['lighten', 'Aclarar'], ['darken', 'Oscurecer'], ['difference', 'Diferencia'], ['color-dodge', 'Sobreexponer'], ['hue', 'Tono'], ['luminosity', 'Luminosidad']];
  R.FORMAS = [['circulo', 'Círculo'], ['redondeado', 'Cuadrado'], ['estrella', 'Estrella'], ['corazon', 'Corazón'], ['burbuja', 'Globo'], ['flecha', 'Flecha'], ['rayo', 'Rayo'], ['hexagono', 'Hexágono'], ['nube', 'Nube'], ['luna', 'Luna'], ['insignia', 'Insignia']];
  R.PEGATINAS = [['brillos', 'Brillos'], ['estrellas', 'Estrellas'], ['corazones', 'Corazones'], ['confeti', 'Confeti'], ['burbujas', 'Burbujas'], ['sol', 'Sol'], ['flor', 'Flor'], ['ondas', 'Ondas'], ['arcoiris', 'Arcoíris'], ['puntos', 'Puntos']];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  const medida = document.createElement('canvas').getContext('2d');
  const rng = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  R.rng = rng;

  /* ---- formas ---- */
  function trazoForma(c, f, S, asp) {
    const w = S, h = S / (asp || 1), x = -w / 2, y = -h / 2; c.beginPath();
    switch (f) {
      case 'circulo': c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); break;
      case 'redondeado': { const r = Math.min(w, h) * 0.18; c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); break; }
      case 'estrella': for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * w / 2 * r, Math.sin(a) * h / 2 * r); } c.closePath(); break;
      case 'corazon': c.moveTo(0, h * 0.42); c.bezierCurveTo(-w * 0.62, h * 0.05, -w * 0.5, -h * 0.5, 0, -h * 0.2); c.bezierCurveTo(w * 0.5, -h * 0.5, w * 0.62, h * 0.05, 0, h * 0.42); c.closePath(); break;
      case 'burbuja': { const r = Math.min(w, h) * 0.2, bh = h * 0.8; c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + bh, r); c.arcTo(x + w, y + bh, x, y + bh, r); c.lineTo(-w * 0.1, y + bh); c.lineTo(-w * 0.32, y + h); c.lineTo(-w * 0.28, y + bh); c.arcTo(x, y + bh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); break; }
      case 'flecha': c.moveTo(x, -h * 0.18); c.lineTo(w * 0.1, -h * 0.18); c.lineTo(w * 0.1, -h * 0.45); c.lineTo(w / 2, 0); c.lineTo(w * 0.1, h * 0.45); c.lineTo(w * 0.1, h * 0.18); c.lineTo(x, h * 0.18); c.closePath(); break;
      case 'rayo': [[0.1, -0.5], [-0.35, 0.08], [-0.02, 0.08], [-0.15, 0.5], [0.38, -0.12], [0.04, -0.12], [0.3, -0.5]].forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0] * w, p[1] * h)); c.closePath(); break;
      case 'hexagono': for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * w / 2, Math.sin(a) * h / 2); } c.closePath(); break;
      case 'nube': c.moveTo(-w * 0.32, h * 0.25); c.arc(-w * 0.28, h * 0.02, h * 0.23, Math.PI * 0.5, Math.PI * 1.5); c.arc(-w * 0.05, -h * 0.2, h * 0.27, Math.PI, Math.PI * 1.9); c.arc(w * 0.22, -h * 0.02, h * 0.25, Math.PI * 1.5, Math.PI * 0.4); c.lineTo(-w * 0.28, h * 0.25); c.closePath(); break;
      case 'luna': c.arc(0, 0, w / 2, Math.PI * 0.35, Math.PI * 1.65, false); c.bezierCurveTo(w * 0.1, -h * 0.25, w * 0.1, h * 0.25, w * 0.5 * Math.cos(Math.PI * 0.35), h * 0.5 * Math.sin(Math.PI * 0.35)); c.closePath(); break;
      case 'insignia': for (let i = 0; i < 24; i++) { const r = i % 2 ? 0.88 : 1, a = i * Math.PI / 12; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * w / 2 * r, Math.sin(a) * h / 2 * r); } c.closePath(); break;
    }
  }
  /* ---- pegatinas decorativas generadas por codigo (caja 200x200 centrada) ---- */
  function estrella4(c, x, y, r) { c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.25 : r, a = -Math.PI / 2 + i * Math.PI / 4; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function pegatina(c, tipo, color, semilla) {
    const r = rng(semilla || 1), paleta = [color, '#ffffff', '#ffd43b', '#ff6b9d', '#4dabf7', '#69db7c'];
    c.save(); c.fillStyle = color; c.strokeStyle = color; c.lineCap = c.lineJoin = 'round';
    switch (tipo) {
      case 'brillos': for (let i = 0; i < 9; i++) { c.fillStyle = i % 3 ? color : '#ffffff'; estrella4(c, (r() - .5) * 170, (r() - .5) * 170, 8 + r() * 26); } break;
      case 'estrellas': for (let i = 0; i < 8; i++) { const x = (r() - .5) * 170, y = (r() - .5) * 170, s = 10 + r() * 22; c.fillStyle = paleta[i % 3 ? 0 : 2]; c.save(); c.translate(x, y); c.rotate(r()); trazoForma(c, 'estrella', s * 2, 1); c.fill(); c.restore(); } break;
      case 'corazones': for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? color : '#ff6b9d'; c.save(); c.translate((r() - .5) * 160, (r() - .5) * 160); c.rotate((r() - .5) * 0.8); trazoForma(c, 'corazon', 22 + r() * 30, 1); c.fill(); c.restore(); } break;
      case 'confeti': for (let i = 0; i < 40; i++) { c.fillStyle = paleta[Math.floor(r() * paleta.length)]; c.save(); c.translate((r() - .5) * 190, (r() - .5) * 190); c.rotate(r() * 6); c.fillRect(-3, -6, 6, 12); c.restore(); } break;
      case 'burbujas': for (let i = 0; i < 10; i++) { const x = (r() - .5) * 160, y = (r() - .5) * 160, rr = 8 + r() * 24; c.lineWidth = 3; c.strokeStyle = color; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - rr * .35, y - rr * .35, rr * .2, 0, 7); c.fill(); } break;
      case 'sol': c.lineWidth = 9; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(Math.cos(a) * 58, Math.sin(a) * 58); c.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); c.stroke(); } c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill(); break;
      case 'flor': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.fillStyle = color; c.beginPath(); c.ellipse(Math.cos(a) * 42, Math.sin(a) * 42, 30, 20, a, 0, 7); c.fill(); } c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); break;
      case 'ondas': c.lineWidth = 9; for (let k = -2; k <= 2; k++) { c.beginPath(); for (let x = -90; x <= 90; x += 6) { const y = k * 32 + Math.sin(x / 14) * 11; c[x === -90 ? 'moveTo' : 'lineTo'](x, y); } c.stroke(); } break;
      case 'arcoiris': ['#ff5252', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 14; c.beginPath(); c.arc(0, 40, 86 - i * 13, Math.PI, 0); c.stroke(); }); break;
      case 'puntos': for (let y = -80; y <= 80; y += 20) for (let x = -80; x <= 80; x += 20) { const d = Math.hypot(x, y) / 113; c.beginPath(); c.arc(x + ((y / 20) & 1 ? 10 : 0), y, 8 * (1 - d * .7), 0, 7); c.fill(); } break;
    }
    c.restore();
  }

  /* ---- texto ---- */
  R.fuenteCSS = (t) => (t.cursiva ? 'italic ' : '') + (t.negrita ? 'bold ' : '') + Math.round(t.tam) + 'px ' + t.fuente;
  R.medirTexto = function (t) {
    medida.font = R.fuenteCSS(t); const lineas = String(t.texto || ' ').split('\n'), lh = t.tam * 1.15; let w = 0; lineas.forEach((l) => { w = Math.max(w, medida.measureText(l || ' ').width); });
    const curva = Math.abs(t.curva || 0) / 100;
    return { w: w + (t.contorno || 0) * 2, h: lineas.length * lh + (t.contorno || 0) * 2 + (curva ? w * curva * 0.45 : 0), lineas, lh, ancho: w };
  };
  function dibujarTexto(c, t) {
    const m = R.medirTexto(t); c.font = R.fuenteCSS(t); c.textBaseline = 'middle'; c.textAlign = 'center'; c.lineJoin = 'round'; c.miterLimit = 2;
    let fill = t.color || '#fff'; if (t.degradado) { const gr = c.createLinearGradient(0, -m.h / 2, 0, m.h / 2); gr.addColorStop(0, t.color || '#fff'); gr.addColorStop(1, t.color2 || '#f06'); fill = gr; }
    const pasar = (txt, x, y, rot) => { c.save(); c.translate(x, y); c.rotate(rot || 0); if (t.contorno > 0) { c.lineWidth = t.contorno * 2; c.strokeStyle = t.cContorno || '#000'; c.strokeText(txt, 0, 0); } c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore(); };
    const y0 = -(m.lineas.length - 1) * m.lh / 2;
    if (t.curva && m.lineas.length === 1) {
      const txt = m.lineas[0], ang = Math.min(Math.abs(t.curva) / 100 * Math.PI * 1.6, Math.PI * 1.9), Rr = m.ancho / ang, signo = t.curva > 0 ? 1 : -1; let acc = 0;
      c.save(); c.translate(0, signo > 0 ? Rr * 0.5 : -Rr * 0.5);
      for (const ch of Array.from(txt)) { const cw = c.measureText(ch).width, a = (acc + cw / 2) / Rr - ang / 2; acc += cw; pasar(ch, signo * 0 + Math.sin(a) * Rr, signo > 0 ? -Math.cos(a) * Rr : Math.cos(a) * Rr, signo > 0 ? a : -a); }
      c.restore(); return;
    }
    m.lineas.forEach((l, i) => pasar(l, 0, y0 + i * m.lh));
  }

  /* ---- dimensiones locales de una capa ---- */
  R.dimensiones = function (capa) {
    switch (capa.tipo) {
      case 'raster': { const p = D.pix.get(capa.pix); return p ? { w: p.c.width, h: p.c.height } : { w: 10, h: 10 }; }
      case 'texto': { const m = R.medirTexto(capa); return { w: Math.max(m.w, 10), h: Math.max(m.h, 10) }; }
      case 'emoji': return { w: capa.tam * 1.25, h: capa.tam * 1.25 };
      case 'forma': return { w: capa.tam, h: capa.tam / (capa.asp || 1) };
      default: return { w: 200, h: 200 };
    }
  };
  const cacheF = new WeakMap();
  R.pixelCanvas = function (capa) {
    const p = D.pix.get(capa.pix); if (!p) return null; let base = p.c, ver = p.v;
    if (D.previa && D.previa.pix === capa.pix) { base = D.previa.canvas; ver = 'v' + D.previa.v; }
    if (!N.hayFiltros(capa.filtros)) return base;
    const clave = ver + '|' + JSON.stringify(capa.filtros), cc = cacheF.get(base);
    if (cc && cc.clave === clave) return cc.canvas;
    const o = D.crearCanvas(base.width, base.height), x = o.getContext('2d', { willReadFrequently: true });
    x.drawImage(base, 0, 0); const id = x.getImageData(0, 0, o.width, o.height); N.filtros(id.data, o.width, o.height, capa.filtros); x.putImageData(id, 0, 0);
    cacheF.set(base, { clave, canvas: o }); return o;
  };
  /* Dibuja una capa con su transformacion sobre ctx (escala s, desplazamiento ox,oy en px de salida). */
  R.dibujarCapa = function (c, capa, s, ox, oy) {
    if (!capa.vis) return;
    c.save(); c.globalAlpha = capa.op; c.globalCompositeOperation = capa.mezcla || 'source-over';
    c.translate((capa.x) * s + (ox || 0), (capa.y) * s + (oy || 0)); c.rotate(capa.rot * Math.PI / 180); c.scale(capa.esc * s * (capa.fx ? -1 : 1), capa.esc * s * (capa.fy ? -1 : 1));
    switch (capa.tipo) {
      case 'raster': { const cv = R.pixelCanvas(capa); if (cv) { c.imageSmoothingQuality = 'high'; c.drawImage(cv, -cv.width / 2, -cv.height / 2); } break; }
      case 'texto': dibujarTexto(c, capa); break;
      case 'emoji': c.font = Math.round(capa.tam) + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(capa.texto || '🙂', 0, capa.tam * 0.05); break;
      case 'forma': { trazoForma(c, capa.forma, capa.tam, capa.asp); if (capa.relleno !== 'ninguno') { c.fillStyle = capa.relleno || '#ff5c8a'; c.fill(); } if (capa.grosor > 0) { c.lineWidth = capa.grosor; c.strokeStyle = capa.trazo || '#fff'; c.lineJoin = 'round'; c.stroke(); } break; }
      case 'pegatina': { const k = (capa.tam || 200) / 200; c.scale(k, k); pegatina(c, capa.forma, capa.relleno || '#ffd43b', capa.semilla); break; }
    }
    c.restore();
  };

  /* ---- efectos ---- */
  const mascaraACanvas = (alfa, W, H, color) => {
    const o = D.crearCanvas(W, H), x = o.getContext('2d'), id = x.createImageData(W, H), rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)), d = id.data;
    for (let p = 0; p < W * H; p++) { d[p * 4] = rgb[0]; d[p * 4 + 1] = rgb[1]; d[p * 4 + 2] = rgb[2]; d[p * 4 + 3] = alfa[p]; } x.putImageData(id, 0, 0); return o;
  };
  const alfaDe = (cv) => { const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data, a = new Uint8Array(cv.width * cv.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; return a; };
  R.margenEfectos = function (st) { return Math.ceil((st.contorno.on ? st.contorno.grosor + (st.contorno.doble ? st.contorno.grosor2 : 0) : 0) + (st.sombra.on ? st.sombra.blur * 1.5 + Math.max(Math.abs(st.sombra.dx), Math.abs(st.sombra.dy)) : 0) + 4); };
  /* Compone el documento. o: {efectos, rapido}. Devuelve {canvas, pad} (pad = px de margen a cada lado, en px de salida). */
  R.componer = function (doc, s, o) {
    o = Object.assign({ efectos: true, rapido: false, fondo: null, soloCapas: null }, o || {});
    const st = doc.sticker, pad = o.efectos ? Math.round(R.margenEfectos(st) * s) : 0, W = Math.round(doc.w * s) + 2 * pad, H = Math.round(doc.h * s) + 2 * pad;
    const arte = D.crearCanvas(W, H), ax = arte.getContext('2d', { willReadFrequently: true });
    doc.capas.forEach((c) => { if (!o.soloCapas || o.soloCapas.indexOf(c.id) >= 0) R.dibujarCapa(ax, c, s, pad, pad); });
    if (!o.efectos || o.rapido) { if (o.fondo) { const f = D.crearCanvas(W, H), fx = f.getContext('2d'); fx.fillStyle = o.fondo; fx.fillRect(0, 0, W, H); fx.drawImage(arte, 0, 0); return { canvas: f, pad }; } return { canvas: arte, pad }; }
    const out = D.crearCanvas(W, H), c = out.getContext('2d'), a0 = alfaDe(arte);
    let sil = a0, capas = [];
    if (st.contorno.on) {
      const k = st.contorno, a1 = N.bordeExterior(a0, W, H, { grosor: k.grosor * s, suavidad: Math.max(1, k.suavidad * s), cierre: k.cierre * s, huecos: k.huecos });
      sil = a1;
      if (k.doble) { const bin = Uint8Array.from(a1, (v) => v > 127 ? 255 : 0), a2 = N.bordeExterior(bin, W, H, { grosor: k.grosor2 * s, suavidad: Math.max(1, k.suavidad * s), cierre: 0, huecos: true }); sil = a2; capas.push(mascaraACanvas(a2, W, H, k.color2)); }
      capas.push(mascaraACanvas(a1, W, H, k.color));
    }
    if (st.sombra.on) {
      const m = mascaraACanvas(sil, W, H, '#000000'), sh = st.sombra; c.save(); c.shadowColor = hexA(sh.color, sh.op); c.shadowBlur = sh.blur * s; c.shadowOffsetX = sh.dx * s + W + 50; c.shadowOffsetY = sh.dy * s; c.drawImage(m, -W - 50, 0); c.restore();
    }
    capas.forEach((m) => c.drawImage(m, 0, 0)); c.drawImage(arte, 0, 0);
    if (st.holo.on) holo(c, W, H, sil, st.holo, s);
    if (o.fondo) { const f = D.crearCanvas(W, H), fx = f.getContext('2d'); fx.fillStyle = o.fondo; fx.fillRect(0, 0, W, H); fx.drawImage(out, 0, 0); return { canvas: f, pad }; }
    return { canvas: out, pad };
  };
  function hexA(h, a) { return 'rgba(' + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',') + ',' + a + ')'; }
  function holo(c, W, H, sil, k, s) {
    const t = D.crearCanvas(W, H), x = t.getContext('2d'), a = k.angulo * Math.PI / 180, L = Math.hypot(W, H) / 2, cx = W / 2, cy = H / 2;
    const gr = x.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, 'hsl(' + (i * 50 + 300) % 360 + ',100%,62%)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'source-over'; x.save(); x.translate(cx, cy); x.rotate(a + Math.PI / 2);
    const bandas = x.createLinearGradient(-L, 0, L, 0); for (let i = 0; i < 12; i++) { const p = i / 12; bandas.addColorStop(p, 'rgba(255,255,255,0)'); bandas.addColorStop(p + 0.03, 'rgba(255,255,255,.55)'); bandas.addColorStop(p + 0.06, 'rgba(255,255,255,0)'); }
    x.fillStyle = bandas; x.fillRect(-L, -L, L * 2, L * 2); x.restore();
    const r = rng(k.semilla || 3); x.fillStyle = '#fff'; for (let i = 0; i < k.brillos; i++) estrella4(x, r() * W, r() * H, (4 + r() * 8) * s);
    const m = mascaraACanvas(sil, W, H, '#ffffff'); x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = Math.min(1, k.intensidad); c.drawImage(t, 0, 0); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = Math.min(1, k.intensidad * 0.6); c.drawImage(t, 0, 0); c.restore();
  }

  /* Recorte al contenido (alfa > umbral). Devuelve {x,y,w,h} o null. */
  R.caja = function (cv, umbral) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1; umbral = umbral == null ? 8 : umbral;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > umbral) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  /* Imagen final lista para exportar: contenido recortado y centrado en un cuadrado lado x lado con margen (px). */
  R.paraExportar = function (doc, o) {
    o = Object.assign({ lado: 512, margen: 0, ajustar: true, fondo: null, sobremuestreo: 2, ancho: null }, o || {});
    const s = o.sobremuestreo, { canvas } = R.componer(doc, s, { efectos: o.efectos !== false, fondo: null, soloCapas: o.soloCapas || null }), out = D.crearCanvas(o.lado, o.ancho || o.lado), x = out.getContext('2d');
    x.imageSmoothingQuality = 'high'; if (o.fondo) { x.fillStyle = o.fondo; x.fillRect(0, 0, out.width, out.height); }
    const cj = o.ajustar ? R.caja(canvas) : { x: 0, y: 0, w: canvas.width, h: canvas.height }; if (!cj) return out;
    const maxW = out.width - 2 * o.margen, maxH = out.height - 2 * o.margen, k = Math.min(maxW / cj.w, maxH / cj.h), w = cj.w * k, h = cj.h * k;
    x.drawImage(canvas, cj.x, cj.y, cj.w, cj.h, (out.width - w) / 2, (out.height - h) / 2, w, h); return out;
  };
  R.aBlob = (cv, tipo, q) => new Promise((ok) => cv.toBlob((b) => ok(b), tipo || 'image/png', q));
})(window);
