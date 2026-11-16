/* Recorte inteligente sin IA ni modelos: watershed por marcadores sobre el gradiente de color + GrabCut simplificado
   (histogramas de color de primer plano/fondo + suavizado de campo medio sensible a bordes). Sin DOM. UMD: window.StSegmentar.
   marcas: Uint8Array w*h con 0 = sin marca, 1 = primer plano, 2 = fondo. Devuelve probabilidad de primer plano (Float32 0..1). */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.StSegmentar = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S = {};
  S.gradiente = function (d, w, h) {
    const gr = new Float32Array(w * h), px = (x, y, c) => d[((y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)) * 4 + c];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let c = 0; c < 3; c++) { const gx = px(x + 1, y, c) - px(x - 1, y, c), gy = px(x, y + 1, c) - px(x, y - 1, c); s += gx * gx + gy * gy; } gr[y * w + x] = Math.sqrt(s); }
    return gr;
  };
  /* Watershed por inundacion con cubetas de prioridad. Devuelve Uint8Array de etiquetas (1/2) para todos los pixeles. */
  S.watershed = function (d, w, h, marcas) {
    const gr = S.gradiente(d, w, h), n = w * h, lab = new Uint8Array(n), cub = Array.from({ length: 1024 }, () => []);
    let max = 0; for (let i = 0; i < n; i++) if (gr[i] > max) max = gr[i]; const q = (v) => Math.min(1023, Math.floor(v / (max || 1) * 1023));
    const nb = (p) => { const x = p % w, r = []; if (x > 0) r.push(p - 1); if (x < w - 1) r.push(p + 1); if (p >= w) r.push(p - w); if (p < n - w) r.push(p + w); return r; };
    for (let p = 0; p < n; p++) if (marcas[p]) { lab[p] = marcas[p]; }
    for (let p = 0; p < n; p++) if (marcas[p]) for (const t of nb(p)) if (!lab[t]) cub[q(gr[t])].push(t * 4 + marcas[p]);
    for (let c = 0; c < 1024; c++) {
      const pila = cub[c];
      while (pila.length) {
        const v = pila.pop(), p = v >> 2, l = v & 3; if (lab[p]) continue; lab[p] = l;
        for (const t of nb(p)) if (!lab[t]) cub[Math.max(c, q(gr[t]))].push(t * 4 + l);
      }
    }
    return lab;
  };
  const bin = (d, i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
  S.segmentar = function (d, w, h, marcas, o) {
    o = Object.assign({ rondas: 3, iter: 10, lambda: 1.6 }, o || {});
    const n = w * h; let hayF = false, hayB = false; for (let i = 0; i < n; i++) { if (marcas[i] === 1) hayF = true; else if (marcas[i] === 2) hayB = true; }
    if (!hayF || !hayB) throw new Error('Pinta marcadores de primer plano (verde) y de fondo (rojo).');
    let lab = S.watershed(d, w, h, marcas);
    // pesos de bordes (sensibles al contraste de color)
    const dif = (a, b) => { const x = d[a * 4] - d[b * 4], y = d[a * 4 + 1] - d[b * 4 + 1], z = d[a * 4 + 2] - d[b * 4 + 2]; return x * x + y * y + z * z; };
    let sd = 0, cn = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) { sd += dif(y * w + x, y * w + x + 1); cn++; } const beta = 1 / (2 * (sd / Math.max(1, cn)) + 1e-6);
    const wd = new Float32Array(n * 2); // [derecha, abajo]
    for (let p = 0; p < n; p++) { const x = p % w; if (x < w - 1) wd[p * 2] = Math.exp(-beta * dif(p, p + 1)); if (p < n - w) wd[p * 2 + 1] = Math.exp(-beta * dif(p, p + w)); }
    const Q = new Float32Array(n), Q2 = new Float32Array(n), bins = new Uint16Array(n); for (let p = 0; p < n; p++) bins[p] = bin(d, p * 4);
    for (let p = 0; p < n; p++) Q[p] = lab[p] === 1 ? 0.9 : 0.1;
    for (let ronda = 0; ronda < o.rondas; ronda++) {
      const hf = new Float32Array(4096).fill(0.5), hb = new Float32Array(4096).fill(0.5); let tf = 4096 * .5, tb = 4096 * .5;
      for (let p = 0; p < n; p++) { const wgt = marcas[p] ? 6 : 1; if (Q[p] > 0.5) { hf[bins[p]] += wgt; tf += wgt; } else { hb[bins[p]] += wgt; tb += wgt; } }
      const U = new Float32Array(n); for (let p = 0; p < n; p++) U[p] = Math.log((hf[bins[p]] / tf) / (hb[bins[p]] / tb));   // >0 favorece primer plano
      for (let it = 0; it < o.iter; it++) {
        for (let p = 0; p < n; p++) {
          if (marcas[p]) { Q2[p] = marcas[p] === 1 ? 1 : 0; continue; }
          const x = p % w; let s = 0;
          if (x > 0) s += wd[(p - 1) * 2] * (Q[p - 1] - 0.5); if (x < w - 1) s += wd[p * 2] * (Q[p + 1] - 0.5);
          if (p >= w) s += wd[(p - w) * 2 + 1] * (Q[p - w] - 0.5); if (p < n - w) s += wd[p * 2 + 1] * (Q[p + w] - 0.5);
          Q2[p] = 1 / (1 + Math.exp(-(U[p] + o.lambda * 2 * s * 2)));
        }
        Q.set(Q2);
      }
    }
    return Q;
  };
  /* Reescala una probabilidad (w,h) a (W,H) con interpolacion bilineal y la devuelve como alfa 0..255 con rampa suave alrededor de 0.5. */
  S.aAlfa = function (Q, w, h, W, H, dureza) {
    dureza = dureza || 8; const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) { const fy = Math.min(h - 1, (y + 0.5) * h / H - 0.5), y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(h - 1, y0 + 1), ty = Math.max(0, fy - y0);
      for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, (x + 0.5) * w / W - 0.5), x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(w - 1, x0 + 1), tx = Math.max(0, fx - x0);
        const v = (Q[y0 * w + x0] * (1 - tx) + Q[y0 * w + x1] * tx) * (1 - ty) + (Q[y1 * w + x0] * (1 - tx) + Q[y1 * w + x1] * tx) * ty;
        out[y * W + x] = Math.round(255 / (1 + Math.exp(-(v - 0.5) * dureza))); } }
    return out;
  };
  return S;
});
