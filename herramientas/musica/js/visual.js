/* Visualizadores en canvas (espectro, ondas, barras, vectorscopio, particulas) con fps y resolucion ajustables.
   Se pausan en segundo plano, fuera de pantalla o sin musica (ahorro de bateria). window.MuVisual */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, V = g.MuVisual = { MODOS: [['espectro', 'Espectro'], ['ondas', 'Ondas'], ['barras', 'Barras'], ['vectorscopio', 'Vectorscopio'], ['particulas', 'Partículas']] };
  V.crear = function (cv, opc) {
    opc = opc || {}; const x = cv.getContext('2d'), S = { modo: opc.modo || D.ajuste('visual'), raf: 0, ult: 0, f: null, t: null, picos: new Float32Array(64), parts: [], idle: 0, w: 0, h: 0, col: '#3e63dd', col2: '#ff6b9d' };
    function medir() { const a = D.ajustes(), r = cv.getBoundingClientRect(), k = Math.min(2, g.devicePixelRatio || 1) * (a.bajoConsumo ? 0.5 : a.escala); const w = Math.max(60, Math.round(r.width * k)), h = Math.max(40, Math.round(r.height * k)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } S.w = w; S.h = h; const cs = getComputedStyle(cv); S.col = cs.getPropertyValue('--acento').trim() || S.col; S.col2 = cs.getPropertyValue('--viz2').trim() || S.col2; }
    function datos() { const an = g.MuMotor.analisadores(); return an; }
    const dibujo = {
      espectro(an) {
        if (!S.f || S.f.length !== an.mono.frequencyBinCount) S.f = new Uint8Array(an.mono.frequencyBinCount); an.mono.getByteFrequencyData(S.f);
        const n = 48, bw = S.w / n, nyq = an.ctx.sampleRate / 2; x.clearRect(0, 0, S.w, S.h); const gr = x.createLinearGradient(0, S.h, 0, 0); gr.addColorStop(0, S.col); gr.addColorStop(1, S.col2); x.fillStyle = gr;
        for (let i = 0; i < n; i++) { const f0 = 30 * Math.pow(16000 / 30, i / n), f1 = 30 * Math.pow(16000 / 30, (i + 1) / n), b0 = Math.floor(f0 / nyq * S.f.length), b1 = Math.max(b0 + 1, Math.ceil(f1 / nyq * S.f.length)); let m = 0; for (let k = b0; k < b1; k++) m = Math.max(m, S.f[k]); const v = m / 255, hh = v * S.h * 0.95; x.fillRect(i * bw + 1, S.h - hh, bw - 2, hh); S.picos[i] = Math.max(S.picos[i] - 0.012, v); x.fillRect(i * bw + 1, S.h - S.picos[i] * S.h * 0.95 - 3, bw - 2, 2); }
      },
      ondas(an) {
        if (!S.t || S.t.length !== an.mono.fftSize) S.t = new Uint8Array(an.mono.fftSize); an.mono.getByteTimeDomainData(S.t); x.clearRect(0, 0, S.w, S.h); x.lineWidth = Math.max(2, S.w / 300); x.strokeStyle = S.col; x.beginPath();
        for (let i = 0; i < S.t.length; i += 2) { const px = i / S.t.length * S.w, py = S.t[i] / 255 * S.h; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); x.globalAlpha = 0.35; x.strokeStyle = S.col2; x.beginPath(); for (let i = 0; i < S.t.length; i += 2) { const px = i / S.t.length * S.w, py = S.h - S.t[i] / 255 * S.h; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); x.globalAlpha = 1;
      },
      barras(an) {
        if (!S.f || S.f.length !== an.mono.frequencyBinCount) S.f = new Uint8Array(an.mono.frequencyBinCount); an.mono.getByteFrequencyData(S.f); x.clearRect(0, 0, S.w, S.h);
        const n = 24, bw = S.w / n, filas = 14, fh = S.h / filas; for (let i = 0; i < n; i++) { const b = Math.floor(Math.pow(i / n, 1.7) * S.f.length * 0.5) + 1, v = S.f[b] / 255, on = Math.round(v * filas); for (let j = 0; j < filas; j++) { x.fillStyle = j < on ? (j > filas * 0.78 ? S.col2 : S.col) : 'rgba(128,128,160,.16)'; x.fillRect(i * bw + 2, S.h - (j + 1) * fh + 2, bw - 4, fh - 3); } }
      },
      vectorscopio(an) {
        const n = an.izq.fftSize; if (!S.l || S.l.length !== n) { S.l = new Float32Array(n); S.r = new Float32Array(n); } an.izq.getFloatTimeDomainData(S.l); an.der.getFloatTimeDomainData(S.r);
        x.fillStyle = 'rgba(0,0,0,0.0)'; x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, S.w, S.h); x.globalCompositeOperation = 'source-over';
        const c = Math.min(S.w, S.h) * 0.45, cx = S.w / 2, cy = S.h / 2; x.strokeStyle = 'rgba(128,128,160,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - c, cy); x.lineTo(cx + c, cy); x.moveTo(cx, cy - c); x.lineTo(cx, cy + c); x.stroke();
        x.fillStyle = S.col; for (let i = 0; i < n; i += 2) { const l = S.l[i], r = S.r[i], mx = (l - r) * 0.7071, my = (l + r) * 0.7071; x.fillRect(cx + mx * c * 1.6, cy - my * c * 1.6, 2, 2); }
      },
      particulas(an) {
        if (!S.f || S.f.length !== an.mono.frequencyBinCount) S.f = new Uint8Array(an.mono.frequencyBinCount); an.mono.getByteFrequencyData(S.f);
        let bajo = 0, alto = 0; for (let i = 0; i < 12; i++) bajo += S.f[i]; for (let i = 60; i < 160; i++) alto += S.f[i]; bajo /= 12 * 255; alto /= 100 * 255;
        x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 0, S.w, S.h); x.globalCompositeOperation = 'source-over';
        const cx = S.w / 2, cy = S.h / 2, nuevas = Math.floor(bajo * 14); for (let i = 0; i < nuevas && S.parts.length < 400; i++) { const a = Math.random() * 6.283, v = (0.4 + Math.random() * 1.6 + bajo * 3) * S.h / 160; S.parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, hue: Math.random() < alto * 2 ? 1 : 0, r: 1 + Math.random() * 2.2 * (S.h / 160) }); }
        S.parts = S.parts.filter((p) => { p.x += p.vx; p.y += p.vy; p.vida -= 0.014; if (p.vida <= 0) return false; x.globalAlpha = Math.max(0, p.vida); x.fillStyle = p.hue ? S.col2 : S.col; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill(); return true; }); x.globalAlpha = 1;
        x.strokeStyle = S.col; x.globalAlpha = 0.5; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 8 + bajo * S.h * 0.14, 0, 6.283); x.stroke(); x.globalAlpha = 1;
      }
    };
    function cuadro(ts) {
      S.raf = requestAnimationFrame(cuadro); const a = D.ajustes(), fps = a.bajoConsumo ? Math.min(15, a.fps) : a.fps;
      if (ts - S.ult < 1000 / fps - 2) return; S.ult = ts;
      if (!a.vizOn || !Mu.soloVisible(cv) || (a.pausarEnSegundoPlano && document.hidden)) return;
      const an = datos(); if (!an) return; if (!g.MuMotor.estado.reproduciendo) { if (S.idle++ > 8) return; } else S.idle = 0;
      if (g.MuMotor.estado.sinProcesar) { x.clearRect(0, 0, S.w, S.h); x.fillStyle = S.col; x.font = (S.h / 12) + 'px system-ui'; x.textAlign = 'center'; x.fillText('Sin visualizador: el servidor no permite CORS', S.w / 2, S.h / 2); return; }
      if (S.w !== cv.clientWidth * 0 + S.w) medir(); (dibujo[S.modo] || dibujo.espectro)(an);
    }
    S.iniciar = () => { if (S.raf) return; medir(); S.raf = requestAnimationFrame(cuadro); };
    S.detener = () => { cancelAnimationFrame(S.raf); S.raf = 0; };
    S.fijar = (m) => { S.modo = m; S.parts = []; x.clearRect(0, 0, S.w, S.h); D.ajuste('visual', m); };
    if (g.ResizeObserver) new ResizeObserver(() => { if (S.raf) medir(); }).observe(cv);
    document.addEventListener('visibilitychange', () => { if (document.hidden && D.ajustes().pausarEnSegundoPlano) { S.detener(); } else if (!document.hidden && cv.isConnected) S.iniciar(); });
    return S;
  };
})(window);
