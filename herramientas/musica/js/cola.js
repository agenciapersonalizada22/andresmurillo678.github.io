/* Cola de reproduccion: orden, aleatorio inteligente, repetir, siguiente/anterior, estadisticas, Media Session y persistencia. window.MuCola */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, M = g.MuMotor, C = g.MuCalc, Q = g.MuCola = { items: [], idx: -1, original: null, errores: 0 };
  const GUARDAR = () => { try { Mu.ls('musica_cola_dispositivo', JSON.stringify({ q: Q.items.map((x) => (x.remoto ? x : x.id)), i: Q.idx })); } catch (e) {} };
  const resolver = (x) => (typeof x === 'string' ? D.pistas.get(x) : x);
  Q.actual = () => Q.items[Q.idx] || null;
  Q.cambio = () => { GUARDAR(); Mu.emit('cola'); };
  Q.restaurar = function () {
    try { const o = JSON.parse(Mu.ls('musica_cola_dispositivo') || 'null'); if (!o) return; Q.items = o.q.map(resolver).filter(Boolean); Q.idx = Math.min(o.i, Q.items.length - 1); } catch (e) {}
    const a = D.ajustes(); if (a.aleatorio) Q.original = Q.items.slice();
  };
  Q.proximoIdx = function () { if (!Q.items.length) return -1; const a = D.ajustes(); if (a.repetir === 'one') return Q.idx; if (Q.idx + 1 < Q.items.length) return Q.idx + 1; return a.repetir === 'all' ? 0 : -1; };
  Q.proximo = () => Q.items[Q.proximoIdx()] || null;
  /* lista: pistas; i: indice inicial. Con aleatorio activo se mezcla dejando la elegida primero. */
  Q.poner = function (lista, i, o) {
    o = o || {}; const a = D.ajustes(); Q.items = lista.slice(); Q.idx = Mu.clamp(i || 0, 0, Q.items.length - 1); Q.original = null;
    if (a.aleatorio && Q.items.length > 1 && !o.sinMezclar) { Q.original = Q.items.slice(); const cur = Q.items[Q.idx], resto = Q.items.filter((x, k) => k !== Q.idx); Q.items = [cur].concat(mezclar(resto)); Q.idx = 0; }
    Q.cambio(); if (o.reproducir !== false) return Q.reproducirIdx(Q.idx, 0);
  };
  function mezclar(l) { return D.ajustes().aleatorioInteligente ? C.aleatorio(l, {}) : l.slice().sort(() => Math.random() - 0.5); }
  Q.anadir = function (lista, siguiente) { const ls = Array.isArray(lista) ? lista : [lista]; if (!Q.items.length) { Q.items = ls.slice(); Q.idx = -1; } else if (siguiente) Q.items.splice(Q.idx + 1, 0, ...ls); else Q.items.push(...ls); Q.cambio(); Mu.aviso(siguiente ? 'Se reproducirá a continuación.' : 'Añadido a la cola.'); };
  Q.quitar = function (i) { if (i < 0 || i >= Q.items.length) return; Q.items.splice(i, 1); if (i < Q.idx) Q.idx--; else if (i === Q.idx) Q.idx = Math.min(Q.idx, Q.items.length - 1); Q.cambio(); };
  Q.mover = function (i, j) { if (j < 0 || j >= Q.items.length) return; const [x] = Q.items.splice(i, 1); Q.items.splice(j, 0, x); if (Q.idx === i) Q.idx = j; else if (i < Q.idx && j >= Q.idx) Q.idx--; else if (i > Q.idx && j <= Q.idx) Q.idx++; Q.cambio(); };
  Q.vaciar = function () { Q.items = []; Q.idx = -1; Q.original = null; M.detener(); Q.cambio(); };
  Q.aleatorio = function (v) {
    D.ajuste('aleatorio', v);
    if (v && Q.items.length > 1) { Q.original = Q.items.slice(); const cur = Q.actual(), resto = Q.items.filter((x) => x !== cur); Q.items = (cur ? [cur] : []).concat(mezclar(resto)); Q.idx = cur ? 0 : -1; if (cur) Mu.logro('aleatorio'); }
    else if (!v && Q.original) { const cur = Q.actual(); Q.items = Q.original.filter((x) => Q.items.includes(x)); Q.idx = cur ? Q.items.indexOf(cur) : -1; Q.original = null; }
    Q.cambio(); Mu.emit('modo');
  };
  Q.repetir = function (m) { D.ajuste('repetir', m); Mu.emit('modo'); };
  Q.reproducirIdx = async function (i, fade, auto) {
    const it = Q.items[i]; if (!it) return false; Q.idx = i; Q.cambio();
    const ok = await M.reproducir(it, { fade: fade || 0 });
    if (!ok) { if (auto || Q.errores > 0) { if (++Q.errores < 5) return Q.siguiente(true, 0, true); } if (!/^Falta/.test(M.estado.error || '')) Mu.aviso(M.estado.error || 'No se pudo reproducir.', 'error'); Q.errores = 0; return false; }
    Q.errores = 0; return true;
  };
  Q.siguiente = function (manual, fade, auto) {
    if (!Q.items.length) return false; const a = D.ajustes(); let n = Q.idx + 1;
    if (n >= Q.items.length) { if (a.repetir === 'all' || manual) { if (a.aleatorio && Q.items.length > 2) { const cur = Q.actual(); Q.items = mezclar(Q.items.filter((x) => x !== cur)).concat(cur ? [] : []); if (cur) Q.items.unshift(cur); } n = 0; } else { M.detener(); return false; } }
    return Q.reproducirIdx(n, manual ? 0 : fade, auto);
  };
  Q.anterior = function () {
    if (!Q.items.length) return; if (M.tiempo() > 3 || Q.idx <= 0) { if (Q.idx <= 0 && M.tiempo() <= 3 && D.ajustes().repetir === 'all') return Q.reproducirIdx(Q.items.length - 1, 0); M.buscar(0); return; } return Q.reproducirIdx(Q.idx - 1, 0);
  };
  Q.reproducirActual = () => (M.estado.item ? M.alternar() : (Q.items.length ? Q.reproducirIdx(Math.max(0, Q.idx), 0) : Mu.aviso('Añade música a la cola desde la biblioteca.')));
  /* ---- eventos del motor ---- */
  M.on('casiFin', (fade) => { const a = D.ajustes(); if (M.estado.temp && M.estado.temp.fin === 'pista') return; if (a.repetir === 'one') { if (fade === 0) { M.buscar(0); } return; } if (Q.proximoIdx() >= 0 || a.repetir === 'all') Q.siguiente(false, fade, true); });
  M.on('fin', () => { if (M.apagarAlFinDePista()) return; const a = D.ajustes(); if (a.repetir === 'one') { M.buscar(0); M.reanudar(); return; } if (Q.idx + 1 < Q.items.length || a.repetir === 'all') Q.siguiente(false, 0, true); else { M.estado.reproduciendo = false; Mu.emit('estado'); } });
  M.on('precargar', () => { const n = Q.proximo(); if (n) M.precargar(n); });
  M.on('contada', (it) => { if (it.remoto) return; const p = D.pistas.get(it.id); if (!p) return; p.reproducciones = (p.reproducciones || 0) + 1; p.ultima = Date.now(); D.guardarPista(p); Mu.emit('estadisticas'); Mu.xp(1); Q.contadas = (Q.contadas || 0) + 1; if (Q.contadas >= 10) Mu.logro('diez_pistas'); });
  M.on('error', () => { if (Q.errores++ < 4) Mu.aviso(M.estado.error || 'Error de reproducción.', 'error'); });
  M.on('sinArchivo', (it) => { Mu.aviso('Falta el archivo de «' + (it.titulo || '') + '». Vuelve a importarlo (los archivos no se guardan en la nube).', 'error'); });
  /* ---- Media Session: pantalla de bloqueo y auriculares ---- */
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null; let ult = 0;
  if (ms) {
    const set = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) {} };
    set('play', () => M.reanudar()); set('pause', () => M.pausar()); set('previoustrack', () => Q.anterior()); set('nexttrack', () => Q.siguiente(true)); set('stop', () => M.detener());
    set('seekbackward', (d) => M.salto(-(d && d.seekOffset || 10))); set('seekforward', (d) => M.salto(d && d.seekOffset || 10)); set('seekto', (d) => { if (d && d.seekTime != null) M.buscar(d.seekTime); });
    M.on('pista', async (it) => {
      let art = []; try { const u = it.remoto ? null : await g.MuBib.portada(it); if (u) art = [{ src: u, sizes: '256x256', type: 'image/jpeg' }]; } catch (e) {}
      try { ms.metadata = new MediaMetadata({ title: it.titulo || 'Sin título', artist: it.artista || it.estacion || '', album: it.album || '', artwork: art }); } catch (e) {}
    });
    M.on('estado', () => { ms.playbackState = M.estado.reproduciendo ? 'playing' : 'paused'; });
    M.on('tiempo', (t, d) => { const n = Date.now(); if (n - ult < 1000 || !d || !isFinite(d)) return; ult = n; try { ms.setPositionState({ duration: d, position: Math.min(t, d), playbackRate: M.estado.vel || 1 }); } catch (e) {} });
  }
})(window);
