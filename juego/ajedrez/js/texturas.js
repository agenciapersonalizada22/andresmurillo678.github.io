// =============================================================
//  🎨  TEXTURAS
//  Todas las texturas se dibujan con canvas al vuelo (madera, mármol,
//  neón, cielo con luces desenfocadas, marcas de casillas). No hay
//  imágenes externas. El ruido es determinista (misma semilla = misma
//  textura) para que el tablero no cambie entre partidas.
// =============================================================
import * as THREE from '../lib/three.module.min.js';

function crearRuido(semilla) {
  let a = semilla | 0;
  const sig = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const N = 256;
  const rej = new Float32Array(N * N);
  for (let i = 0; i < rej.length; i++) rej[i] = sig();
  const suave = (t) => t * t * (3 - 2 * t);
  const valor = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = suave(x - xi), fy = suave(y - yi);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = yi & 255, y1 = (yi + 1) & 255;
    const a0 = rej[y0 * N + x0] + (rej[y0 * N + x1] - rej[y0 * N + x0]) * fx;
    const a1 = rej[y1 * N + x0] + (rej[y1 * N + x1] - rej[y1 * N + x0]) * fx;
    return a0 + (a1 - a0) * fy;
  };
  const fbm = (x, y, oct = 4) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += valor(x * f, y * f) * amp; f *= 2; amp *= 0.5; }
    return s;
  };
  return { valor, fbm, azar: sig };
}

const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hexRgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h || w;
  return c;
}

export function hoja(tipo, tam, base, veta, semilla) {
  const c = lienzo(tam);
  const g = c.getContext('2d');
  const img = g.createImageData(tam, tam);
  const R = crearRuido(semilla);
  const cb = hexRgb(base), cv = hexRgb(veta);
  const d = img.data;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      let t;
      if (tipo === 'madera') {
        const aro = Math.sin(((y / tam) * 22 + R.fbm(x / tam * 2.5, y / tam * 1.5, 3) * 2.2) * Math.PI * 2);
        const fibra = R.fbm(x / tam * 2, y / tam * 150, 3);
        t = 0.28 * (aro * 0.5 + 0.5) + 0.72 * fibra;
        t = Math.min(1, Math.max(0, (t - 0.3) * 1.25)) * 0.85;
      } else {
        const turb = R.fbm(x / tam * 4, y / tam * 4, 5);
        const v = Math.abs(Math.sin((x / tam * 3 + y / tam * 1.7 + turb * 3.2) * Math.PI));
        const fino = Math.abs(Math.sin((x / tam * 6 - y / tam * 4 + turb * 5) * Math.PI));
        t = Math.pow(1 - v, 11) * 0.8 + Math.pow(1 - fino, 18) * 0.3 + turb * 0.22;
        t = Math.min(1, t);
      }
      const col = mezcla(cb, cv, t);
      const o = (y * tam + x) * 4;
      const ruido = (R.valor(x * 0.9, y * 0.9) - 0.5) * 8;
      d[o] = col[0] + ruido; d[o + 1] = col[1] + ruido; d[o + 2] = col[2] + ruido; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function aTextura(c, color = true, repetir = false, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Tablero completo: 8x8 casillas (a1 abajo a la izquierda; la imagen se pega al plano, ver tablero3d)
export function texturaTablero(tema, tam) {
  const c = lienzo(tam);
  const g = c.getContext('2d');
  const q = tam / 8;
  const t = tema.tablero;
  const hojaC = t.tipo !== 'neon' ? hoja(t.tipo, 512, t.claro, t.veta[0], 11) : null;
  const hojaO = t.tipo !== 'neon' ? hoja(t.tipo, 512, t.oscuro, t.veta[1], 29) : null;
  const R = crearRuido(5);
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const clara = (r + f) % 2 === 1; // a1 es oscura
      const x = f * q, y = (7 - r) * q;
      if (t.tipo === 'neon') {
        const gr = g.createLinearGradient(x, y, x + q, y + q);
        gr.addColorStop(0, '#' + (clara ? t.claro : t.oscuro).toString(16).padStart(6, '0'));
        gr.addColorStop(1, '#' + (clara ? t.oscuro : t.claro).toString(16).padStart(6, '0'));
        g.fillStyle = gr;
        g.fillRect(x, y, q, q);
      } else {
        const h = clara ? hojaC : hojaO;
        const sx = Math.floor(R.azar() * (512 - 128)), sy = Math.floor(R.azar() * (512 - 128));
        g.drawImage(h, sx, sy, 128, 128, x, y, q, q);
      }
    }
  }
  // juntas finas entre casillas
  g.strokeStyle = t.tipo === 'neon' ? 'rgba(61,245,255,0.55)' : 'rgba(0,0,0,0.22)';
  g.lineWidth = t.tipo === 'neon' ? Math.max(2, tam / 400) : Math.max(1, tam / 700);
  if (t.tipo === 'neon') { g.shadowColor = '#3df5ff'; g.shadowBlur = tam / 90; }
  for (let i = 0; i <= 8; i++) {
    g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, tam); g.stroke();
    g.beginPath(); g.moveTo(0, i * q); g.lineTo(tam, i * q); g.stroke();
  }
  return aTextura(c);
}

// Madera o mármol repetible (marco, mesa, piezas)
export function texturaMaterial(tipo, tam, base, veta, semilla, repeticion = 1) {
  const t = aTextura(hoja(tipo, tam, base, veta, semilla), true, true);
  t.repeat.set(repeticion, repeticion);
  return t;
}

// Letras a-h y 1-8 sobre el marco (capa transparente del tamaño del tablero + marco)
export function texturaEtiquetas(tema, total, lado, tam) {
  const c = lienzo(tam);
  const g = c.getContext('2d');
  const px = tam / total;
  g.clearRect(0, 0, tam, tam);
  g.fillStyle = tema.marco.letras;
  if (tema.tablero.tipo === 'neon') { g.shadowColor = tema.marco.letras; g.shadowBlur = tam / 80; }
  g.font = `700 ${px * 0.42}px Orbitron, "Segoe UI", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const marco = (total - lado) / 2;
  for (let i = 0; i < 8; i++) {
    const p = (marco + i + 0.5) * px;
    const letra = 'abcdefgh'[i], num = String(i + 1);
    g.fillText(letra, p, (marco * 0.5) * px);
    g.fillText(letra, p, tam - (marco * 0.5) * px);
    g.fillText(num, (marco * 0.5) * px, tam - p);
    g.fillText(num, tam - (marco * 0.5) * px, tam - p);
  }
  return aTextura(c);
}

// Cielo (equirectangular): degradado, luces desenfocadas y paneles de luz que se reflejan en las piezas
export function texturaCielo(tema, w = 1024) {
  const h = w / 2;
  const c = lienzo(w, h);
  const g = c.getContext('2d');
  const s = tema.cielo;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, s.arriba); gr.addColorStop(0.5, s.horizonte); gr.addColorStop(1, s.abajo);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = crearRuido(77);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < s.luces; i++) {
    const x = R.azar() * w, y = (0.25 + R.azar() * 0.45) * h, r = (0.012 + R.azar() * 0.035) * w;
    const col = s.paleta[Math.floor(R.azar() * s.paleta.length)];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col + 'cc'); rg.addColorStop(0.55, col + '55'); rg.addColorStop(1, col + '00');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // paneles de luz (para reflejos brillantes)
  for (const [px, py, pw, ph, a] of s.paneles) {
    const x = px * w, y = py * h, ww = pw * w, hh = ph * h;
    const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(ww, hh));
    rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.6, `rgba(255,255,255,${a * 0.6})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(x, y); g.scale(ww / Math.max(ww, hh), hh / Math.max(ww, hh)); g.translate(-x, -y);
    g.fillStyle = rg; g.fillRect(x - Math.max(ww, hh), y - Math.max(ww, hh), Math.max(ww, hh) * 2, Math.max(ww, hh) * 2);
    g.restore();
  }
  const t = aTextura(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// Marcas de casilla: círculo suave, anillo y punto
export function texturaMarca(tipo, color) {
  const n = 128;
  const c = lienzo(n);
  const g = c.getContext('2d');
  const cx = n / 2;
  if (tipo === 'suave') {
    const rg = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
    rg.addColorStop(0, color + 'ff'); rg.addColorStop(0.45, color + 'cc'); rg.addColorStop(0.75, color + '55'); rg.addColorStop(1, color + '00');
    g.fillStyle = rg; g.fillRect(0, 0, n, n);
  } else if (tipo === 'cursor') { // esquinas gruesas + velo suave: cursor del mando
    g.fillStyle = color + '33'; g.fillRect(4, 4, n - 8, n - 8);
    g.strokeStyle = color; g.lineWidth = 11; g.lineCap = 'square';
    g.shadowColor = color; g.shadowBlur = 8;
    const a = 6, l = 40, b = n - 6;
    g.beginPath();
    g.moveTo(a, a + l); g.lineTo(a, a); g.lineTo(a + l, a);
    g.moveTo(b - l, a); g.lineTo(b, a); g.lineTo(b, a + l);
    g.moveTo(b, b - l); g.lineTo(b, b); g.lineTo(b - l, b);
    g.moveTo(a + l, b); g.lineTo(a, b); g.lineTo(a, b - l);
    g.stroke();
  } else if (tipo === 'cuadro') {
    g.fillStyle = color + 'cc'; g.fillRect(4, 4, n - 8, n - 8);
    g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(5, 5, n - 10, n - 10);
  } else if (tipo === 'punto') {
    const rg = g.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.9);
    rg.addColorStop(0, color + 'ff'); rg.addColorStop(0.7, color + 'ee'); rg.addColorStop(1, color + '00');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cx, cx * 0.9, 0, Math.PI * 2); g.fill();
  } else {
    g.strokeStyle = color; g.lineWidth = 11; g.shadowColor = color; g.shadowBlur = 10;
    g.beginPath(); g.arc(cx, cx, cx * 0.78, 0, Math.PI * 2); g.stroke();
  }
  return aTextura(c);
}

export function texturaChispa() {
  const n = 64;
  const c = lienzo(n);
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, n, n);
  return aTextura(c);
}

// Suelo con una poza de luz en el centro
export function texturaSuelo(colorCentro, colorBorde) {
  const n = 512;
  const c = lienzo(n);
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  rg.addColorStop(0, colorCentro); rg.addColorStop(0.55, colorBorde); rg.addColorStop(1, '#000000');
  g.fillStyle = rg; g.fillRect(0, 0, n, n);
  return aTextura(c);
}

export { hexRgb };
