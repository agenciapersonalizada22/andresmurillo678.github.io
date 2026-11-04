// =============================================================
//  🧰  HERRAMIENTAS: funciones pequeñas que usan todos los archivos.
// =============================================================
const Util = {
  limitar: (v, a, b) => (v < a ? a : v > b ? b : v),
  mezclar: (a, b, t) => a + (b - a) * t,
  azar: (a, b) => a + Math.random() * (b - a),
  azarEntero: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  elegir: (lista) => lista[Math.floor(Math.random() * lista.length)],

  elegirPorPeso(pesos) {
    let total = 0;
    for (const k in pesos) total += pesos[k];
    let r = Math.random() * total;
    for (const k in pesos) {
      r -= pesos[k];
      if (r <= 0) return k;
    }
    return Object.keys(pesos)[0];
  },

  // Diferencia entre dos ángulos, siempre entre -PI y PI
  difAngulo(a, b) {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  distancia: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),

  // Número "al azar" pero siempre igual para la misma casilla (para dibujar detalles)
  hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },

  // Generador de números al azar con semilla (la misma semilla = la misma ciudad)
  crearAleatorio(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // 1250 -> "$1,250"
  dinero(n) {
    const v = Math.round(n);
    const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '-$' : '$') + s;
  },

  // Aclara (f > 0) u oscurece (f < 0) un color '#rrggbb'
  tono(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) {
      r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
    } else {
      r *= 1 + f; g *= 1 + f; b *= 1 + f;
    }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  },

  // Guardar y cargar datos en el navegador (si no se puede, no pasa nada).
  // Ranura 1 usa las claves de siempre (ciudad_*); las ranuras 2 y 3 usan ciudad_s2_* / ciudad_s3_*.
  // Lo global (ajustes, ranura activa) va con ciudad_g_*.
  ranura: (() => {
    try { const n = parseInt(localStorage.getItem('ciudad_g_slot'), 10); return n >= 1 && n <= 3 ? n : 1; } catch (e) { return 1; }
  })(),
  prefijo(n) { return (n || Util.ranura) === 1 ? 'ciudad_' : 'ciudad_s' + (n || Util.ranura) + '_'; },
  guardar(clave, valor) {
    try { localStorage.setItem(Util.prefijo() + clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  },
  cargar(clave, defecto) {
    try {
      const v = localStorage.getItem(Util.prefijo() + clave);
      return v === null ? defecto : JSON.parse(v);
    } catch (e) {
      return defecto;
    }
  },
  guardarG(clave, valor) {
    try { localStorage.setItem('ciudad_g_' + clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  },
  cargarG(clave, defecto) {
    try {
      const v = localStorage.getItem('ciudad_g_' + clave);
      return v === null ? defecto : JSON.parse(v);
    } catch (e) {
      return defecto;
    }
  },

  lienzo(ancho, alto) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(ancho));
    c.height = Math.max(1, Math.ceil(alto));
    return c;
  },

  rectRedondo(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  },
};

// Direcciones: 0 = Este (derecha), 1 = Sur (abajo), 2 = Oeste, 3 = Norte
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const FUENTE = 'Orbitron, ui-monospace, Menlo, Consolas, monospace';
const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
