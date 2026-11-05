// Dibuja el tablero (40 casillas) en un canvas; se usa como textura de la cara superior.
import { CASILLAS, GRUPOS } from './datos.js';
import { rectCasilla, haciaCentro, lado, TAM, MITAD } from './geometria.js';

const FUENTE = '"Orbitron", "Segoe UI", system-ui, sans-serif';
function envolver(c, texto, ancho) {
  const pal = texto.split(' '), lin = [];
  let act = '';
  pal.forEach((p) => {
    const t = act ? act + ' ' + p : p;
    if (c.measureText(t).width > ancho && act) { lin.push(act); act = p; } else act = t;
  });
  if (act) lin.push(act);
  return lin;
}
function texto(c, s, x, y, tam, color, ancho, peso) {
  c.font = (peso || 'bold') + ' ' + tam + 'px ' + FUENTE; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lin = envolver(c, s, ancho), h = tam * 1.12;
  lin.forEach((l, k) => c.fillText(l, x, y + (k - (lin.length - 1) / 2) * h));
  return lin.length * h;
}
function polilinea(c, pts, cierra) { c.beginPath(); pts.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (cierra) c.closePath(); }
function icono(c, tipo, x, y, r, color) {
  c.save(); c.translate(x, y); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = r * 0.14; c.lineJoin = 'round'; c.lineCap = 'round';
  if (tipo === 'estacion') { // avion
    polilinea(c, [[0, -1], [0.18, -0.3], [1, 0.2], [1, 0.4], [0.18, 0.15], [0.12, 0.7], [0.45, 0.9], [0.45, 1], [0, 0.9], [-0.45, 1], [-0.45, 0.9], [-0.12, 0.7], [-0.18, 0.15], [-1, 0.4], [-1, 0.2], [-0.18, -0.3]].map((p) => [p[0] * r, p[1] * r]), true); c.fill();
  } else if (tipo === 'rayo') { polilinea(c, [[0.2, -1], [-0.6, 0.15], [-0.05, 0.15], [-0.25, 1], [0.6, -0.2], [0.05, -0.2]].map((p) => [p[0] * r, p[1] * r]), true); c.fill(); }
  else if (tipo === 'gota') { c.beginPath(); c.moveTo(0, -r); c.bezierCurveTo(r * 0.9, 0, r * 0.8, r * 0.9, 0, r * 0.9); c.bezierCurveTo(-r * 0.8, r * 0.9, -r * 0.9, 0, 0, -r); c.fill(); }
  else if (tipo === 'moneda') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); texto(c, '$', 0, r * 0.05, r * 1.3, color, r * 3); }
  else if (tipo === 'cofre') { c.strokeRect(-r, -r * 0.5, r * 2, r); c.fillRect(-r, -r * 0.5, r * 2, r * 0.35); c.fillRect(-r * 0.12, -r * 0.1, r * 0.24, r * 0.35); }
  else if (tipo === 'barras') { c.strokeRect(-r, -r, r * 2, r * 2); for (let k = -0.5; k <= 0.5; k += 0.5) { c.beginPath(); c.moveTo(r * k, -r); c.lineTo(r * k, r); c.stroke(); } }
  else if (tipo === 'flecha') { polilinea(c, [[-1, -0.3], [0.2, -0.3], [0.2, -0.8], [1, 0], [0.2, 0.8], [0.2, 0.3], [-1, 0.3]].map((p) => [p[0] * r, p[1] * r]), true); c.fill(); }
  else if (tipo === 'aparcar') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); texto(c, 'P', 0, r * 0.05, r * 1.4, color, r * 3); }
  c.restore();
}

export function dibujarTablero(canvas, S, opc) {
  canvas.width = canvas.height = S;
  const c = canvas.getContext('2d'), k = S / TAM, tx = (x) => (x + MITAD) * k, ty = (z) => (z + MITAD) * k;
  c.fillStyle = '#17352f'; c.fillRect(0, 0, S, S);
  // centro
  const g = c.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, '#24574a'); g.addColorStop(1, '#122a28'); c.fillStyle = g; c.fillRect(1.6 * k, 1.6 * k, S - 3.2 * k, S - 3.2 * k);
  c.save(); c.translate(S / 2, S / 2); c.rotate(-0.55);
  texto(c, 'MAGNATE', 0, 0, 1.25 * k, 'rgba(255,230,160,0.95)', 9 * k);
  texto(c, 'compra · construye · negocia', 0, 1.0 * k, 0.28 * k, 'rgba(255,255,255,0.65)', 9 * k, 'normal');
  c.restore();
  [['SUERTE', -2.2, -2.3, '#e8912c', '?'], ['COMUNIDAD', 2.2, 2.3, '#4a9ee0', '']].forEach(([n, x, z, col, s]) => {
    c.save(); c.translate(tx(x), ty(z)); c.rotate(x < 0 ? 0.35 : -0.35);
    c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 0.05 * k; c.fillRect(-1.1 * k, -0.75 * k, 2.2 * k, 1.5 * k); c.strokeRect(-1.1 * k, -0.75 * k, 2.2 * k, 1.5 * k);
    texto(c, n, 0, 0.35 * k, 0.28 * k, '#fff', 2 * k); if (s) texto(c, s, 0, -0.2 * k, 0.8 * k, '#fff', 2 * k); else icono(c, 'cofre', 0, -0.2 * k, 0.4 * k, '#fff');
    c.restore();
  });
  const papel = opc.contraste ? '#ffffff' : '#ece6d1', tinta = '#1a1a1a';
  CASILLAS.forEach((cs) => {
    const r = rectCasilla(cs.i), x = tx(r.x - r.w / 2), y = ty(r.z - r.d / 2), w = r.w * k, h = r.d * k, cx = x + w / 2, cy = y + h / 2;
    c.fillStyle = papel; c.fillRect(x, y, w, h);
    c.strokeStyle = '#111'; c.lineWidth = Math.max(2, 0.025 * k); c.strokeRect(x, y, w, h);
    const esq = lado(cs.i) < 0, dc = haciaCentro(cs.i);
    let ax = x, ay = y, aw = w, ah = h; // area libre de texto
    if (cs.tipo === 'prop') {
      const gr = GRUPOS[cs.grupo], b = 0.42 * k;
      c.fillStyle = gr.color;
      if (dc[1] === -1) { c.fillRect(x, y, w, b); ay += b; ah -= b; c.strokeRect(x, y, w, b); }
      else if (dc[1] === 1) { c.fillRect(x, y + h - b, w, b); ah -= b; c.strokeRect(x, y + h - b, w, b); }
      else if (dc[0] === 1) { c.fillRect(x + w - b, y, b, h); aw -= b; c.strokeRect(x + w - b, y, b, h); }
      else { c.fillRect(x, y, b, h); ax += b; aw -= b; c.strokeRect(x, y, b, h); }
      if (opc.simbolos) {
        const bx = dc[1] ? cx : (dc[0] === 1 ? x + w - b / 2 : x + b / 2), by = dc[0] ? cy : (dc[1] === -1 ? y + b / 2 : y + h - b / 2);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, b * 0.4, 0, 7); c.fill(); texto(c, gr.sim, bx, by + 1, b * 0.55, '#111', b);
      }
      const mx = ax + aw / 2, my = ay + ah / 2;
      texto(c, cs.nombre, mx, my - 0.1 * k, 0.17 * k, tinta, aw - 0.1 * k);
      texto(c, '$' + cs.precio, mx, ay + ah - 0.2 * k, 0.2 * k, tinta, aw, '800');
    } else if (!esq) {
      // bloque: icono + nombre + precio; en columnas (casilla ancha) el icono va a la izquierda
      const ancha = w > h, ancho = (ancha ? w * 0.58 : w) - 0.1 * k, tx0 = ancha ? x + w * 0.68 : cx;
      const ic = ancha ? [x + w * 0.2, cy] : [cx, cy - 0.38 * k], r = ancha ? 0.3 * k : 0.24 * k;
      const nombre = (n, tam) => texto(c, n, tx0, ancha ? cy - 0.1 * k : cy + 0.22 * k, tam, tinta, ancho);
      const precio = (t, col) => texto(c, t, tx0, ancha ? cy + 0.3 * k : y + h - 0.2 * k, 0.2 * k, col || tinta, ancho, '800');
      if (cs.tipo === 'estacion') { icono(c, 'estacion', ic[0], ic[1], r, '#1d3a5a'); nombre(cs.nombre, 0.14 * k); precio('$200'); }
      else if (cs.tipo === 'servicio') { icono(c, cs.i === 12 ? 'rayo' : 'gota', ic[0], ic[1], r, cs.i === 12 ? '#d9a100' : '#2a7fd0'); nombre(cs.nombre, 0.14 * k); precio('$150'); }
      else if (cs.tipo === 'suerte') { texto(c, '?', ic[0], ic[1] + 0.05 * k, ancha ? 0.75 * k : 0.9 * k, '#e8912c', k); nombre('SUERTE', 0.15 * k); }
      else if (cs.tipo === 'comunidad') { icono(c, 'cofre', ic[0], ic[1], r * 1.2, '#2d73b8'); nombre('COMUNIDAD', 0.13 * k); }
      else if (cs.tipo === 'impuesto') { icono(c, 'moneda', ic[0], ic[1], r, '#a02020'); nombre(cs.nombre, 0.14 * k); precio('-$' + cs.monto, '#a02020'); }
    } else {
      const m = 1.6 * k;
      if (cs.tipo === 'salida') { c.fillStyle = '#e6d9a8'; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); icono(c, 'flecha', cx, cy + 0.1 * k, 0.5 * k, '#c4372c'); texto(c, 'SALIDA', cx, y + 0.28 * k, 0.28 * k, tinta, m); texto(c, 'cobra $200', cx, y + h - 0.2 * k, 0.17 * k, tinta, m); }
      else if (cs.tipo === 'carcel') {
        c.fillStyle = '#f08a24'; c.fillRect(x + 0.05 * k, y + 0.05 * k, 1.05 * k, 1.05 * k); icono(c, 'barras', x + 0.58 * k, y + 0.58 * k, 0.4 * k, '#222');
        texto(c, 'CÁRCEL', cx + 0.1 * k, y + h - 0.2 * k, 0.2 * k, tinta, m);
        texto(c, 'visita', x + w - 0.3 * k, y + 0.9 * k, 0.15 * k, tinta, 0.5 * k, 'normal');
      } else if (cs.tipo === 'libre') { icono(c, 'aparcar', cx, cy - 0.15 * k, 0.45 * k, '#2a7fd0'); texto(c, 'PARADA LIBRE', cx, y + h - 0.22 * k, 0.17 * k, tinta, m); }
      else if (cs.tipo === 'ircarcel') { icono(c, 'barras', cx, cy - 0.1 * k, 0.4 * k, '#a02020'); texto(c, 'IR A LA CÁRCEL', cx, y + h - 0.25 * k, 0.17 * k, '#a02020', m); }
    }
  });
}
