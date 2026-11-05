/* Fuentes de medios: elementos de video por demanda, imagenes (proxy), audio decodificado, miniaturas, ondas, analisis. VE.fuentes */
(function (g) {
  var M = g.VE.modelo, Z = g.VE.mezcla, SN = g.VE.sonidos;
  var F = { medios: {}, els: {}, proxy: true, limiteMB: 1500, ac: null };

  function tipoDe(blob, nombre) {
    var t = blob.type || '', n = (nombre || '').toLowerCase();
    if (/^video\//.test(t) || /\.(mp4|webm|mov|mkv|m4v|ogv)$/.test(n)) return 'video';
    if (/^image\//.test(t) || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/.test(n)) return 'imagen';
    if (/^audio\//.test(t) || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(n)) return 'audio';
    return null;
  }
  F.tipoDe = tipoDe;
  function esperar(el, ev) { return new Promise(function (res, rej) { var ok = function () { clean(); res(); }, mal = function () { clean(); rej(new Error('No se pudo leer el archivo')); }; function clean() { el.removeEventListener(ev, ok); el.removeEventListener('error', mal); } el.addEventListener(ev, ok); el.addEventListener('error', mal); }); }
  function buscar(v, t) {
    return new Promise(function (res) {
      if (v.readyState >= 2 && Math.abs(v.currentTime - t) < 0.0005 && !v.seeking) return res();
      var done = false, f = function () { if (done) return; done = true; v.removeEventListener('seeked', f); res(); };
      v.addEventListener('seeked', f); setTimeout(f, 2000); v.currentTime = t;
    });
  }
  F.buscar = buscar;
  F.ctxAudio = function () { if (!F.ac) { var A = g.AudioContext || g.webkitAudioContext; F.ac = new A(); } return F.ac; };

  async function leerVideo(url) {
    var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await esperar(v, 'loadedmetadata');
    if (!isFinite(v.duration)) { v.currentTime = 1e7; await new Promise(function (r) { v.addEventListener('timeupdate', function f() { v.removeEventListener('timeupdate', f); r(); }); setTimeout(r, 3000); }); v.currentTime = 0; }
    return v;
  }
  /* Registra un blob y devuelve la ficha del medio para el proyecto */
  F.agregar = async function (blob, nombre, id) {
    var tipo = tipoDe(blob, nombre); if (!tipo) throw new Error('Formato no admitido: ' + nombre);
    var m = { id: id || M.uid('m'), tipo: tipo, nombre: nombre || 'medio', mime: blob.type, size: blob.size, dur: 5, w: 0, h: 0 };
    await F.registrar(m, blob); return m;
  };
  F.registrar = async function (m, blob) {
    var e = F.medios[m.id] = { blob: blob, url: URL.createObjectURL(blob), m: m };
    if (m.tipo === 'video') {
      var v = await leerVideo(e.url); m.dur = v.duration; m.w = v.videoWidth; m.h = v.videoHeight; e.meta = v;
      if (!m.w) { m.tipo = 'audio'; }
    } else if (m.tipo === 'imagen') {
      var bmp = await createImageBitmap(blob); m.w = bmp.width; m.h = bmp.height; e.bmp = bmp; m.dur = 5;
      if (Math.max(m.w, m.h) > 1600) { try { e.bmpP = await createImageBitmap(blob, m.w >= m.h ? { resizeWidth: 1280, resizeQuality: 'medium' } : { resizeHeight: 1280, resizeQuality: 'medium' }); } catch (x) {} }
    } else {
      var a = await F.audio(m.id); m.dur = a ? a.ch[0].length / a.sr : 0;
    }
    return m;
  };
  F.registrarGenerado = function (m) { F.medios[m.id] = { m: m, gen: true }; };
  F.liberarMedio = function (id) { var e = F.medios[id]; if (!e) return; if (e.url) URL.revokeObjectURL(e.url); delete F.medios[id]; };
  F.memoriaMB = function () { var t = 0; for (var k in F.medios) if (F.medios[k].blob) t += F.medios[k].blob.size; return t / 1048576; };
  F.estimaAudioMB = function () { var t = 0; for (var k in F.medios) { var a = F.medios[k].aud; if (a) t += a.ch.length * a.ch[0].length * 4; } return t / 1048576; };

  /* Audio decodificado (48 kHz) o generado */
  F.audioSync = function (id) { var e = F.medios[id]; return e && e.aud || null; };
  F.audio = async function (id) {
    var e = F.medios[id]; if (!e) return null; if (e.aud) return e.aud; if (e.audNo) return null;
    if (e.gen) {
      var g0 = e.m.gen, ch = g0.tipo === 'musica' ? SN.musica(g0.id, g0.dur, 44100) : SN.efecto(g0.id, 44100);
      return (e.aud = { sr: 44100, ch: ch });
    }
    if (e.m.tipo === 'imagen') return null;
    if (!e.pend) e.pend = (async function () {
      try {
        var O = g.OfflineAudioContext || g.webkitOfflineAudioContext, oc = new O(2, 1, 48000);
        var buf = await oc.decodeAudioData(await e.blob.arrayBuffer());
        e.aud = { sr: buf.sampleRate, ch: [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)] };
      } catch (x) { e.audNo = true; }
      e.pend = null; return e.aud || null;
    })();
    return e.pend;
  };
  F.picos = async function (id, n) {
    var e = F.medios[id]; if (!e) return null; if (e.picos) return e.picos;
    var a = await F.audio(id); if (!a) return null;
    return (e.picos = Z.picos(a.ch[0], n || 1200));
  };

  /* Miniaturas en tira: devuelve dataURL (jpeg) y numero de teselas */
  F.tira = async function (id) {
    var e = F.medios[id]; if (!e || e.tira !== undefined) return e && e.tira; if (e.gen || e.m.tipo === 'audio') return null;
    e.tira = null; var h = 56, m = e.m, asp = (m.w || 16) / (m.h || 9), tw = Math.max(20, Math.round(h * Math.min(2, Math.max(0.5, asp))));
    var K = m.tipo === 'imagen' ? 1 : Math.max(2, Math.min(24, Math.ceil(m.dur / 1.5)));
    var cv = document.createElement('canvas'); cv.width = tw * K; cv.height = h; var cx = cv.getContext('2d');
    try {
      if (m.tipo === 'imagen') cx.drawImage(e.bmp, 0, 0, tw, h);
      else {
        var v = await leerVideo(e.url);
        for (var i = 0; i < K; i++) { await buscar(v, Math.min(m.dur - 0.05, (i + 0.5) * m.dur / K)); cx.drawImage(v, i * tw, 0, tw, h); }
      }
      e.tira = { url: cv.toDataURL('image/jpeg', 0.6), k: K, w: cv.width, h: h };
    } catch (x) { e.tira = null; }
    return e.tira;
  };
  F.fotograma = async function (id, t, ancho) {
    var e = F.medios[id]; if (!e) return null; var cv = document.createElement('canvas'), m = e.m;
    ancho = ancho || 160; cv.width = ancho; cv.height = Math.round(ancho * (m.h || 9) / (m.w || 16));
    if (m.tipo === 'imagen') cv.getContext('2d').drawImage(e.bmp, 0, 0, cv.width, cv.height);
    else if (m.tipo === 'video') { var v = await leerVideo(e.url); await buscar(v, Math.min(t || 0, m.dur - 0.05)); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); }
    else return null;
    return cv.toDataURL('image/jpeg', 0.6);
  };

  /* Elemento de video por clip, con liberacion bajo demanda */
  F.elemento = function (c) {
    var el = F.els[c.id]; if (el) return el;
    var e = F.medios[c.medio]; if (!e || !e.url) return null;
    el = document.createElement('video'); el.muted = true; el.playsInline = true; el.preload = 'auto'; el.src = e.url; el.dataset.medio = c.medio;
    el.addEventListener('error', function () { el._error = true; });
    F.els[c.id] = el; return el;
  };
  F.liberar = function (conservar) {
    Object.keys(F.els).forEach(function (id) { if (!conservar[id]) { var v = F.els[id]; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} delete F.els[id]; } });
  };
  F.pausarTodos = function () { Object.keys(F.els).forEach(function (id) { try { F.els[id].pause(); } catch (e) {} }); };
  F.fuente = function (c) {
    var e = F.medios[c.medio]; if (!e) return null;
    if (c.tipo === 'imagen') return (F.proxy && !F.modoExport && e.bmpP) || e.bmp || null;
    var v = F.els[c.id]; return v && v.readyState >= 2 ? v : null;
  };
  /* Prepara (y espera) los fotogramas de los clips activos en t, para exportar o saltar */
  F.preparar = async function (clips, t) {
    var ps = [];
    clips.forEach(function (c) {
      if (c.tipo !== 'video') return;
      var el = F.elemento(c); if (!el) return;
      var ts = Math.max(0, Math.min((F.medios[c.medio].m.dur || 1e9) - 0.001, M.tiempoFuente(c, t)));
      try { el.pause(); } catch (e) {}
      ps.push((el.readyState >= 1 ? Promise.resolve() : esperar(el, 'loadedmetadata').catch(function () {})).then(function () { return buscar(el, ts); }));
    });
    await Promise.all(ps);
  };
  /* Sincroniza los elementos durante la reproduccion en tiempo real */
  F.sincronizar = function (clips, t, proximos) {
    var uso = {};
    clips.concat(proximos || []).forEach(function (c) {
      if (c.tipo !== 'video') return;
      uso[c.id] = 1; var el = F.elemento(c); if (!el || el.readyState < 1) return;
      var activo = t >= c.ini && t < M.fin(c), ts = Math.max(0, Math.min(el.duration || 1e9, M.tiempoFuente(c, Math.max(t, c.ini))));
      var directo = !c.inv && !c.cong && c.vel >= 0.25 && c.vel <= 4;
      if (!activo || !directo) {
        if (!el.paused) el.pause();
        if (!el.seeking && Math.abs(el.currentTime - ts) > (activo ? 0.03 : 0.2)) el.currentTime = ts;
        return;
      }
      if (el.playbackRate !== c.vel) el.playbackRate = c.vel;
      if (el.paused) { if (Math.abs(el.currentTime - ts) > 0.05) el.currentTime = ts; var p = el.play(); if (p && p.catch) p.catch(function () {}); }
      else if (Math.abs(el.currentTime - ts) > 0.3 && !el.seeking) el.currentTime = ts;
    });
    Object.keys(F.els).forEach(function (id) { if (!uso[id]) { var v = F.els[id]; if (!v.paused) v.pause(); } });
  };

  /* Analisis simples sobre fotogramas pequenos */
  async function muestras(clip, n, w, h) {
    var e = F.medios[clip.medio], out = [], cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cx = cv.getContext('2d', { willReadFrequently: true });
    if (clip.tipo === 'imagen') { cx.drawImage(e.bmp, 0, 0, w, h); return [cx.getImageData(0, 0, w, h)]; }
    var v = await leerVideo(e.url);
    for (var i = 0; i < n; i++) { await buscar(v, Math.max(0, Math.min(e.m.dur - 0.05, clip.off + (n === 1 ? 0 : i * clip.dur * clip.vel / (n - 1))))); cx.drawImage(v, 0, 0, w, h); out.push(cx.getImageData(0, 0, w, h)); }
    return out;
  }
  F.analizarFoco = async function (clip) {
    var ms = await muestras(clip, 5, 48, 48), sx = 0, sy = 0, s = 0;
    ms.forEach(function (im) { var d = im.data; for (var y = 1; y < 47; y++) for (var x = 1; x < 47; x++) { var i = (y * 48 + x) * 4, gx = Math.abs(d[i] - d[i + 4]) + Math.abs(d[i + 1] - d[i + 5]), gy = Math.abs(d[i] - d[i + 192]) + Math.abs(d[i + 1] - d[i + 193]), e = gx + gy; e = e * e; sx += x * e; sy += y * e; s += e; } });
    return s ? { x: Math.max(0.1, Math.min(0.9, sx / s / 48)), y: Math.max(0.1, Math.min(0.9, sy / s / 48)) } : { x: 0.5, y: 0.5 };
  };
  F.estabilizar = async function (clip, alProgreso) {
    var e = F.medios[clip.medio], v = await leerVideo(e.url), W = 64, H = 36, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d', { willReadFrequently: true }), paso = 0.125, n = Math.max(2, Math.floor(clip.dur * clip.vel / paso)), prev = null, ruta = [], ax = 0, ay = 0;
    for (var i = 0; i < n; i++) {
      await buscar(v, Math.min(e.m.dur - 0.02, clip.off + i * paso)); cx.drawImage(v, 0, 0, W, H);
      var d = cx.getImageData(0, 0, W, H).data, gris = new Float32Array(W * H); for (var k = 0; k < W * H; k++) gris[k] = d[k * 4] * 0.3 + d[k * 4 + 1] * 0.59 + d[k * 4 + 2] * 0.11;
      if (prev) {
        var best = 1e12, bx = 0, by = 0;
        for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var sad = 0; for (var y = 5; y < H - 5; y++) for (var x = 5; x < W - 5; x++) sad += Math.abs(gris[y * W + x] - prev[(y + dy) * W + x + dx]); if (sad < best) { best = sad; bx = dx; by = dy; } }
        ax += bx; ay += by;
      }
      ruta.push([i * paso / clip.vel, ax / W, ay / H]); prev = gris; if (alProgreso) alProgreso(i / n);
    }
    var R = 4, out = ruta.map(function (p, i) { var sx = 0, sy = 0, c = 0; for (var j = Math.max(0, i - R); j <= Math.min(ruta.length - 1, i + R); j++) { sx += ruta[j][1]; sy += ruta[j][2]; c++; } return [p[0], sx / c - p[1], sy / c - p[2]]; });
    return out;
  };
  g.VE.fuentes = F;
})(window);
