// Dibuja el tablero circular (40 casillas) y la textura del globo en canvas.
import { CASILLAS, CONTINENTES, colorCont, NUM } from './datos.js';
import { RB, RIN, ROUT, DT, TAM, angulo } from './geometria.js';

const FUENTE = '"Orbitron", "Segoe UI", system-ui, sans-serif';
function envolver(c, texto, ancho) {
  const lin = []; let act = '';
  texto.split(' ').forEach((p) => {
    const t = act ? act + ' ' + p : p;
    if (c.measureText(t).width > ancho && act) { lin.push(act); act = p; } else act = t;
  });
  if (act) lin.push(act);
  return lin;
}
function texto(c, s, x, y, tam, color, ancho, peso) {
  c.font = (peso || 'bold') + ' ' + tam + 'px ' + FUENTE; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lin = envolver(c, s, ancho), h = tam * 1.15;
  lin.forEach((l, k) => c.fillText(l, x, y + (k - (lin.length - 1) / 2) * h));
  return lin.length * h;
}
function poli(c, pts, r, cierra) { c.beginPath(); pts.forEach((p, k) => (k ? c.lineTo(p[0] * r, p[1] * r) : c.moveTo(p[0] * r, p[1] * r))); if (cierra) c.closePath(); }
// iconos centrados en (0,0) mirando hacia +x (afuera); r = radio
function icono(c, tipo, r, color) {
  c.save(); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = r * 0.14; c.lineJoin = 'round'; c.lineCap = 'round';
  if (tipo === 'aire') { c.rotate(-Math.PI / 2); poli(c, [[0, -1], [0.18, -0.3], [1, 0.2], [1, 0.4], [0.18, 0.15], [0.12, 0.7], [0.45, 0.9], [0.45, 1], [0, 0.9], [-0.45, 1], [-0.45, 0.9], [-0.12, 0.7], [-0.18, 0.15], [-1, 0.4], [-1, 0.2], [-0.18, -0.3]], r, true); c.fill(); }
  else if (tipo === 'tren') { c.fillRect(-r, -r * 0.5, r * 2, r); c.clearRect(-r * 0.7, -r * 0.3, r * 0.55, r * 0.3); c.clearRect(r * 0.1, -r * 0.3, r * 0.55, r * 0.3); c.beginPath(); c.arc(-r * 0.55, r * 0.62, r * 0.18, 0, 7); c.arc(r * 0.55, r * 0.62, r * 0.18, 0, 7); c.fill(); }
  else if (tipo === 'mar') { poli(c, [[-1, 0.1], [1, 0.1], [0.65, 0.65], [-0.65, 0.65]], r, true); c.fill(); c.fillRect(-r * 0.4, -r * 0.5, r * 0.8, r * 0.5); c.fillRect(-r * 0.12, -r * 0.9, r * 0.24, r * 0.4); }
  else if (tipo === 'moneda') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); texto(c, '$', 0, r * 0.05, r * 1.3, color, r * 3); }
  else if (tipo === 'sello') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.7, 0, 7); c.stroke(); poli(c, [[-0.35, 0], [-0.08, 0.3], [0.4, -0.3]], r, false); c.stroke(); }
  else if (tipo === 'brujula') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); poli(c, [[0, -0.8], [0.25, 0], [0, 0.8], [-0.25, 0]], r, true); c.fill(); }
  else if (tipo === 'barras') { c.strokeRect(-r, -r, r * 2, r * 2); for (let k = -0.5; k <= 0.5; k += 0.5) { c.beginPath(); c.moveTo(r * k, -r); c.lineTo(r * k, r); c.stroke(); } }
  else if (tipo === 'flecha') { poli(c, [[-1, -0.3], [0.2, -0.3], [0.2, -0.8], [1, 0], [0.2, 0.8], [0.2, 0.3], [-1, 0.3]], r, true); c.fill(); }
  else if (tipo === 'libre') { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); texto(c, '★', 0, r * 0.05, r * 1.3, color, r * 3); }
  else if (tipo === 'suerte') texto(c, '?', 0, r * 0.05, r * 2, color, r * 3);
  c.restore();
}

const ROT_TEXTO = 0;
export function dibujarTablero(canvas, S, opc) {
  canvas.width = canvas.height = S;
  const c = canvas.getContext('2d'), k = S / TAM, cx = S / 2, cy = S / 2, R = (r) => r * k;
  // fondo: borde de madera y mar
  c.fillStyle = '#0d1a2a'; c.fillRect(0, 0, S, S);
  c.beginPath(); c.arc(cx, cy, R(RB), 0, 7); c.fillStyle = '#7a5a34'; c.fill();
  c.beginPath(); c.arc(cx, cy, R(RB - 0.12), 0, 7); c.fillStyle = '#16384f'; c.fill();
  const g = c.createRadialGradient(cx, cy, R(0.5), cx, cy, R(RIN)); g.addColorStop(0, '#2a8bb8'); g.addColorStop(1, '#10405e');
  c.beginPath(); c.arc(cx, cy, R(RIN - 0.04), 0, 7); c.fillStyle = g; c.fill();
  // rejilla de latitud/longitud sutil
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = Math.max(1, 0.012 * k);
  for (let r = 0.9; r < RIN - 0.2; r += 0.9) { c.beginPath(); c.arc(cx, cy, R(r), 0, 7); c.stroke(); }
  for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(cx + Math.cos(a * Math.PI / 6) * R(RIN - 0.2), cy + Math.sin(a * Math.PI / 6) * R(RIN - 0.2)); c.lineTo(cx - Math.cos(a * Math.PI / 6) * R(RIN - 0.2), cy - Math.sin(a * Math.PI / 6) * R(RIN - 0.2)); c.stroke(); }
  // mazos decorativos
  [['VIAJE', '#2f7fd0', 210], ['ADUANA', '#d98a2b', 330], ['SUERTE', '#35a86a', 90]].forEach(([n, col, deg]) => {
    const a = deg * Math.PI / 180, x = cx + Math.cos(a) * R(2.55), y = cy + Math.sin(a) * R(2.55);
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
    for (let q = 2; q >= 0; q--) { c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 0.03 * k; c.fillRect(-0.55 * k + q * 0.03 * k, -0.36 * k - q * 0.03 * k, 1.1 * k, 0.72 * k); c.strokeRect(-0.55 * k + q * 0.03 * k, -0.36 * k - q * 0.03 * k, 1.1 * k, 0.72 * k); }
    texto(c, n, 0, 0, 0.17 * k, '#fff', 1 * k); c.restore();
  });
  texto(c, 'TURISMO MUNDIAL', cx, cy - 2.75 * k, 0.34 * k, 'rgba(255,236,180,0.95)', 3.6 * k);

  const papel = opc.contraste ? '#ffffff' : '#efe8d4', tinta = '#14181f', L = ROUT - RIN;
  CASILLAS.forEach((cs) => {
    const phi = angulo(cs.i), th = Math.PI / 2 + phi;
    const sector = (r1, r2) => { c.beginPath(); c.arc(cx, cy, R(r2), th - DT / 2 + 0.002, th + DT / 2 - 0.002); c.arc(cx, cy, R(r1), th + DT / 2 - 0.002, th - DT / 2 + 0.002, true); c.closePath(); };
    sector(RIN, ROUT); c.fillStyle = papel; c.fill(); c.strokeStyle = '#111'; c.lineWidth = Math.max(2, 0.025 * k); c.stroke();
    let tonoBanda = null;
    if (cs.tipo === 'dest') { tonoBanda = colorCont(cs.grupo); sector(RIN, RIN + 0.42); c.fillStyle = tonoBanda; c.fill(); c.stroke(); }
    else if (cs.tipo === 'trans') { sector(RIN, RIN + 0.42); c.fillStyle = '#2b3a4d'; c.fill(); c.stroke(); }
    else if (cs.tipo === 'viaje' || cs.tipo === 'aduana' || cs.tipo === 'suerte') { sector(RIN, ROUT); c.fillStyle = { viaje: '#cfe3fa', aduana: '#f6ddb8', suerte: '#cdeedd' }[cs.tipo]; c.fill(); c.stroke(); }
    else if (cs.tipo === 'salida') { sector(RIN, ROUT); c.fillStyle = '#e8dca8'; c.fill(); c.stroke(); }
    else if (cs.tipo === 'retencion') { sector(RIN, ROUT); c.fillStyle = '#f2a45a'; c.fill(); c.stroke(); }
    else if (cs.tipo === 'libre') { sector(RIN, ROUT); c.fillStyle = '#bfe6f5'; c.fill(); c.stroke(); }
    else if (cs.tipo === 'impuesto') { sector(RIN, ROUT); c.fillStyle = '#f0c8c8'; c.fill(); c.stroke(); }
    // marco local: eje x hacia afuera; si apuntaria a la izquierda se gira 180 grados para leer de izquierda a derecha
    const vuelta = Math.cos(th) < 0, rot = th + (vuelta ? Math.PI : 0), sg = vuelta ? -1 : 1, rm = (RIN + ROUT) / 2;
    c.save(); c.translate(cx + Math.cos(th) * R(rm), cy + Math.sin(th) * R(rm)); c.rotate(rot);
    const U = (u) => sg * u * k, w = 0.66 * k;
    const T = (s, u, tam, col, anc, peso) => texto(c, s, U(u), 0, tam * k, col || tinta, anc || 1.5 * k, peso);
    if (cs.tipo === 'dest') {
      if (opc.simbolos) { c.fillStyle = '#fff'; c.beginPath(); c.arc(U(-L / 2 + 0.21), 0, 0.17 * k, 0, 7); c.fill(); texto(c, CONTINENTES[cs.grupo].sim, U(-L / 2 + 0.21), 0, 0.2 * k, '#111', 0.5 * k); }
      T(cs.nombre, -0.18, 0.2, tinta, 1.18 * k); T('$' + cs.precio, 0.86, 0.23, tinta, 0.9 * k, '800');
    } else if (cs.tipo === 'trans') {
      c.save(); c.translate(U(-L / 2 + 0.21), 0); c.rotate(sg < 0 ? Math.PI : 0); icono(c, cs.modo, 0.17 * k, '#fff'); c.restore();
      c.save(); c.translate(U(-0.12), 0); icono(c, cs.modo, 0.2 * k, { aire: '#1d5b94', tren: '#7a3a1a', mar: '#1d7a7a' }[cs.modo]); c.restore();
      T(cs.nombre, 0.5, 0.15, tinta, 0.8 * k); T('$200', 0.98, 0.2, tinta, 0.6 * k, '800');
    } else if (cs.tipo === 'viaje') { c.save(); c.translate(U(-0.3), 0); icono(c, 'brujula', 0.28 * k, '#1d5b94'); c.restore(); T('VIAJE', 0.62, 0.2, '#1d5b94'); }
    else if (cs.tipo === 'aduana') { c.save(); c.translate(U(-0.3), 0); icono(c, 'sello', 0.28 * k, '#b0641a'); c.restore(); T('ADUANA', 0.66, 0.18, '#8a4a10'); }
    else if (cs.tipo === 'suerte') { c.save(); c.translate(U(-0.28), 0); icono(c, 'suerte', 0.3 * k, '#1f8a55'); c.restore(); T('SUERTE', 0.62, 0.19, '#136b40'); }
    else if (cs.tipo === 'impuesto') { c.save(); c.translate(U(-0.35), 0); icono(c, 'moneda', 0.26 * k, '#a02020'); c.restore(); T('TASA TURÍSTICA', 0.45, 0.14, '#a02020', 1.1 * k); T('-$' + cs.monto, 0.95, 0.2, '#a02020', 0.7 * k, '800'); }
    else if (cs.tipo === 'salida') { c.save(); c.translate(U(-0.2), 0); c.rotate(Math.PI / 2 * (sg < 0 ? -1 : 1) + Math.PI); icono(c, 'flecha', 0.34 * k, '#c4372c'); c.restore(); T('SALIDA', 0.6, 0.2, tinta); T('cobra sueldo', 0.95, 0.11, tinta, 0.9 * k, 'normal'); }
    else if (cs.tipo === 'retencion') { c.save(); c.translate(U(-0.3), 0); icono(c, 'barras', 0.28 * k, '#222'); c.restore(); T('RETENCIÓN', 0.55, 0.14, tinta, 1 * k); T('aduanera', 0.85, 0.12, tinta, 0.7 * k, 'normal'); }
    else if (cs.tipo === 'libre') { c.save(); c.translate(U(-0.3), 0); icono(c, 'libre', 0.28 * k, '#2a7fd0'); c.restore(); T('ZONA FRANCA', 0.6, 0.14, tinta, 1 * k); }
    c.restore();
  });
  // aros dorados
  c.strokeStyle = '#d4af5a'; c.lineWidth = Math.max(2, 0.04 * k);
  c.beginPath(); c.arc(cx, cy, R(ROUT + 0.03), 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, R(RIN - 0.03), 0, 7); c.stroke();
  void ROT_TEXTO; void NUM;
}

// Continentes simplificados (lon, lat) para el globo del centro
const TIERRAS = [
  [4, [[-168, 66], [-140, 70], [-95, 72], [-80, 68], [-62, 58], [-55, 50], [-67, 44], [-76, 38], [-81, 30], [-97, 26], [-97, 18], [-87, 15], [-78, 8], [-83, 9], [-92, 15], [-105, 20], [-115, 30], [-124, 40], [-125, 50], [-140, 60], [-165, 58]]],
  [4, [[-55, 60], [-20, 70], [-30, 83], [-60, 80], [-70, 72]]],
  [5, [[-78, 8], [-60, 10], [-50, 0], [-35, -6], [-39, -18], [-48, -27], [-58, -38], [-66, -46], [-72, -52], [-75, -45], [-71, -30], [-70, -18], [-81, -6], [-80, 0]]],
  [2, [[-10, 36], [-9, 43], [0, 50], [5, 54], [10, 58], [20, 70], [40, 68], [70, 73], [110, 76], [140, 72], [170, 68], [180, 65], [160, 58], [142, 52], [135, 43], [122, 38], [122, 30], [110, 20], [105, 10], [100, 2], [98, 8], [90, 22], [80, 15], [73, 20], [66, 25], [55, 26], [48, 30], [35, 33], [28, 36], [20, 40], [12, 44], [3, 43], [-5, 36]]],
  [3, [[-10, 36], [-9, 43], [0, 50], [5, 54], [10, 58], [20, 70], [40, 68], [40, 45], [28, 36], [20, 40], [12, 44], [3, 43], [-5, 36]]],
  [1, [[-17, 21], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -5], [40, -15], [33, -26], [20, -35], [12, -18], [9, -1], [-9, 5], [-17, 14]]],
  [0, [[114, -22], [130, -12], [142, -11], [153, -26], [146, -39], [135, -34], [115, -34]]],
  [0, [[166, -46], [174, -41], [178, -38], [173, -35], [168, -44]]]
];
export function dibujarGlobo(canvas) {
  canvas.width = 1024; canvas.height = 512;
  const c = canvas.getContext('2d'), px = (lon) => (lon + 180) / 360 * 1024, py = (lat) => (90 - lat) / 180 * 512;
  const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2f7fb8'); g.addColorStop(0.5, '#1b5f9a'); g.addColorStop(1, '#2f7fb8'); c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { c.beginPath(); c.moveTo(px(lon), 0); c.lineTo(px(lon), 512); c.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { c.beginPath(); c.moveTo(0, py(lat)); c.lineTo(1024, py(lat)); c.stroke(); }
  TIERRAS.forEach(([g2, pts]) => {
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(px(p[0]), py(p[1])) : c.moveTo(px(p[0]), py(p[1])))); c.closePath();
    c.fillStyle = colorCont(g2); c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2; c.stroke();
  });
}
