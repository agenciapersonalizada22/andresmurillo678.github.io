// =============================================================
//  🎨  TEXTURAS
//  Cada textura es un dibujito de 32x32 que se pinta con código
//  (no hay imágenes) usando ruido que se repite sin costuras.
//  Todas se juntan en UNA sola imagen grande: el "atlas". Cada
//  cuadrito mide 48x48: el dibujo de 32x32 en medio y alrededor un
//  borde de 8 pixeles que repite el mismo dibujo (evita rayitas
//  entre bloques y cuando el atlas se achica para lo lejano).
//  Además se crea un segundo atlas con "normales" falsas (relieve)
//  sacadas del brillo de cada pixel: con el sol se ve que las
//  piedras y las tablas tienen volumen.
// =============================================================
import { azarConSemilla, hash2 } from './ruido.js';

// El orden de esta lista es el orden dentro del atlas
export const LISTA_TEXTURAS = [
  'pasto_arriba', 'pasto_lado', 'tierra', 'piedra', 'adoquin', 'arena', 'grava', 'agua',
  'tronco_lado', 'tronco_arriba', 'hojas', 'tablas', 'vidrio', 'ladrillo', 'ladrillo_piedra', 'nieve',
  'carbon', 'hierro', 'oro', 'lecho', 'flor_roja', 'flor_amarilla', 'pasto_alto', 'lana_blanca',
  'lana_roja', 'lana_naranja', 'lana_amarilla', 'lana_verde', 'lana_azul', 'lana_morada', 'lana_rosa', 'calabaza',
  'arenisca_arriba', 'arenisca_lado', 'adoquin_musgoso', 'obsidiana', 'hielo', 'lana_negra', 'lana_gris', 'tablas_oscuras',
  // ---- nuevas
  'camino_arriba', 'camino_lado', 'cultivo_arriba', 'trigo', 'paja_arriba', 'paja_lado', 'estanteria', 'piedra_luminosa',
  'antorcha', 'cofre_arriba', 'cofre_lado', 'cofre_frente', 'puerta_abajo', 'puerta_arriba', 'cama_cabeza', 'cama_pie',
  'cama_lado', 'mesa_arriba', 'riel', 'cactus_arriba', 'cactus_lado', 'arbusto_muerto', 'abeto_lado', 'abeto_arriba',
  'hojas_abeto', 'abedul_lado', 'abedul_arriba', 'hojas_abedul', 'terracota_naranja', 'terracota_azul', 'terracota_blanca', 'ladrillo_musgoso',
  'ladrillo_agrietado', 'arenisca_cincelada', 'mesa_trabajo_arriba', 'mesa_trabajo_lado', 'mesa_trabajo_frente', 'horno_frente', 'horno_lado', 'tablas_abeto',
  'piedra_pulida', 'cristal_oscuro', 'tejas', 'esmeralda', 'diamante',
];

export const TAM = 32;          // pixeles por textura
export const BORDE = 8;         // pixeles de borde repetido alrededor
export const CELDA = TAM + BORDE * 2;
export const COLUMNAS = 16;
// filas redondeadas a 1, 2, 4, 8... (los mipmaps funcionan mejor con medidas así)
export const FILAS = 2 ** Math.ceil(Math.log2(Math.ceil(LISTA_TEXTURAS.length / COLUMNAS)));
export const ANCHO_ATLAS = COLUMNAS * CELDA;
export const ALTO_ATLAS = FILAS * CELDA;

export function indiceTextura(nombre) {
  const i = LISTA_TEXTURAS.indexOf(nombre);
  if (i < 0) throw new Error('Textura desconocida: ' + nombre);
  return i;
}

// Coordenadas UV (0 a 1) del dibujo dentro del atlas: [u0, v0, u1, v1]
// v0 es abajo y v1 arriba (la imagen se voltea al subirla a la tarjeta de video).
export function uvTextura(i) {
  const col = i % COLUMNAS;
  const fila = Math.floor(i / COLUMNAS);
  const x0 = col * CELDA + BORDE;
  const y0 = fila * CELDA + BORDE;
  return [
    x0 / ANCHO_ATLAS,
    1 - (y0 + TAM) / ALTO_ATLAS,
    (x0 + TAM) / ANCHO_ATLAS,
    1 - y0 / ALTO_ATLAS,
  ];
}

// Esquina de arriba a la izquierda del dibujo dentro del atlas grande
export function origenTextura(i) {
  return [(i % COLUMNAS) * CELDA + BORDE, Math.floor(i / COLUMNAS) * CELDA + BORDE];
}

// ----------------------------------------------------------- Ayudantes
const limitar = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const mezclar = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const escalar = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const sumar = (c, d) => [c[0] + d, c[1] + d, c[2] + d];
const suave = (t) => t * t * (3 - 2 * t);
const mod = (a, n) => ((a % n) + n) % n;

// Todo lo que necesita un pintor: p() pone un pixel, azar() da números,
// ruido(x, y, celdas) es ruido suave que se repite, mezcla() junta varias capas
// y celdas() parte la textura en "piedritas" (diagrama de Voronoi que se repite).
function crearUtiles(sem) {
  const azar = azarConSemilla(sem);
  const s = sem | 0;
  function ruido(x, y, per) {
    const f = TAM / per;
    const gx = x / f, gy = y / f;
    const i = Math.floor(gx), j = Math.floor(gy);
    const fx = suave(gx - i), fy = suave(gy - j);
    const v = (a, b) => hash2(mod(a, per), mod(b, per), s * 31 + per * 977);
    const a = v(i, j) + (v(i + 1, j) - v(i, j)) * fx;
    const b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * fx;
    return a + (b - a) * fy;
  }
  // varias capas de ruido (grande + detalle), de 0 a 1
  function mezcla(x, y, base = 2) {
    return (ruido(x, y, base) * 0.5 + ruido(x, y, base * 2) * 0.28 + ruido(x, y, base * 4) * 0.15 + ruido(x, y, base * 8) * 0.07);
  }
  function celdas(cuantas, estirar = 1) {
    const g = Math.max(1, Math.round(Math.sqrt(cuantas)));
    const gx = g, gy = Math.max(1, Math.round(g * estirar));
    const puntos = [];
    for (let j = 0; j < gy; j++) {
      for (let i = 0; i < gx; i++) puntos.push([(i + 0.15 + azar() * 0.7) * TAM / gx, (j + 0.15 + azar() * 0.7) * TAM / gy]);
    }
    const res = new Array(TAM * TAM);
    for (let y = 0; y < TAM; y++) {
      for (let x = 0; x < TAM; x++) {
        let d1 = 1e9, d2 = 1e9, cual = 0;
        for (let k = 0; k < puntos.length; k++) {
          let dx = Math.abs(x + 0.5 - puntos[k][0]), dy = Math.abs(y + 0.5 - puntos[k][1]);
          if (dx > TAM / 2) dx = TAM - dx;
          if (dy > TAM / 2) dy = TAM - dy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) { d2 = d1; d1 = d; cual = k; } else if (d < d2) d2 = d;
        }
        res[y * TAM + x] = { cual, borde: d2 - d1, d1 };
      }
    }
    return res;
  }
  return { azar, ruido, mezcla, celdas, s };
}

function variar(c, cantidad, azar) {
  const d = (azar() * 2 - 1) * cantidad;
  return [c[0] + d, c[1] + d, c[2] + d];
}

// ----------------------------------------------------------- Pintores
// Cada pintor recibe { p(x, y, [r,g,b], alfa), azar, ruido, mezcla, celdas }.

function pintarPasto({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 3);
      let c = mezclar([62, 124, 34], [118, 182, 62], n * 1.15 - 0.1);
      const r = azar();
      if (r < 0.1) c = escalar(c, 0.82);
      else if (r > 0.94) c = escalar(c, 1.16);
      if ((x * 7 + y * 3) % 11 === 0 && r > 0.5) c = sumar(c, 10);
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarTierra({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      let c = mezclar([104, 72, 48], [146, 106, 74], n);
      const r = azar();
      if (r < 0.07) c = [96, 66, 44];
      else if (r > 0.97) c = [128, 126, 122];
      else if (r > 0.93) c = [162, 124, 92];
      p(x, y, variar(c, 5, azar));
    }
  }
  // piedritas
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(azar() * TAM), y = Math.floor(azar() * TAM);
    p(x, y, [132, 130, 126]); p(x + 1, y, [112, 110, 106]); p(x, y + 1, [104, 100, 98]);
  }
}

function pintarPastoLado(u) {
  const { p, azar, ruido } = u;
  pintarTierra(u);
  for (let x = 0; x < TAM; x++) {
    const fondo = 6 + Math.floor(ruido(x, 0, 8) * 5) + (azar() < 0.3 ? 1 : 0);
    for (let y = 0; y < fondo; y++) {
      const t = y / fondo;
      let c = mezclar([100, 170, 56], [66, 128, 38], t * t);
      if (azar() < 0.15) c = escalar(c, 0.85);
      else if (azar() > 0.9) c = escalar(c, 1.12);
      p(x, y, variar(c, 5, azar));
    }
    p(x, fondo, [58, 104, 34]);
  }
}

function pintarPiedra({ p, azar, mezcla, celdas }, base = [128, 128, 130], grietas = true) {
  const mapa = celdas(6);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 3);
      let c = sumar(base, (n - 0.5) * 40);
      const r = azar();
      if (r < 0.1) c = sumar(c, -16);
      else if (r > 0.93) c = sumar(c, 14);
      if (grietas && mapa[y * TAM + x].borde < 0.9) c = sumar(c, -24);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarAdoquin({ p, azar, celdas }, tonoBase = 0) {
  const mapa = celdas(12);
  const tonos = [];
  for (let i = 0; i < 12; i++) tonos.push(96 + Math.floor(azar() * 56));
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const c = mapa[y * TAM + x];
      if (c.borde < 1.7) { p(x, y, variar([58 + tonoBase, 58 + tonoBase, 58 + tonoBase], 5, azar)); continue; }
      let t = tonos[c.cual] + tonoBase;
      if (c.borde < 3) t += 14 - c.borde * 3;       // borde claro: piedra redondeada
      t -= Math.min(10, c.d1) * 0.9;
      p(x, y, variar([t, t, t + 2], 5, azar));
    }
  }
}

function pintarArena({ p, azar, mezcla }, base = [224, 212, 154]) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      let c = sumar(base, (n - 0.5) * 22);
      const r = azar();
      if (r < 0.1) c = sumar(c, -16);
      else if (r > 0.92) c = sumar(c, 14);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarGrava({ p, azar, celdas }) {
  const mapa = celdas(36);
  const tonos = [[138, 130, 126], [106, 102, 100], [156, 148, 142], [122, 112, 102], [92, 90, 90], [140, 120, 100]];
  const cual = [];
  for (let i = 0; i < 36; i++) cual.push(tonos[Math.floor(azar() * tonos.length)]);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const c = mapa[y * TAM + x];
      let col = cual[c.cual];
      if (c.borde < 1.1) col = [70, 66, 64];
      else col = sumar(col, c.borde < 2.2 ? 8 : -c.d1 * 1.2);
      p(x, y, variar(col, 5, azar));
    }
  }
}

function pintarAgua({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      const ola = Math.sin((x + n * 8) * 0.39 + y * 0.2) * 0.5 + 0.5;
      let c = mezclar([34, 88, 190], [66, 130, 222], n * 0.7 + ola * 0.3);
      if (ola > 0.9) c = mezclar(c, [170, 210, 255], 0.35);
      p(x, y, variar(c, 3, azar), 215);
    }
  }
}

function pintarTroncoLado({ p, azar, ruido }, base = [104, 78, 48], hondo = 30) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = ruido(x * 2.2, y * 0.35, 8);
      const grieta = ruido(x * 1.1 + 5, y * 0.2, 16) > 0.7 ? -hondo : 0;
      const d = (n - 0.5) * 34 + grieta;
      p(x, y, variar([base[0] + d, base[1] + d * 0.8, base[2] + d * 0.55], 5, azar));
    }
  }
}

function pintarTroncoArriba({ p, azar, ruido }, corteza = [104, 78, 48], madera = [182, 144, 90]) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const dx = Math.abs(x - 15.5), dy = Math.abs(y - 15.5);
      const d = Math.max(dx, dy);
      let c;
      if (d > 13.2) c = mezclar(corteza, sumar(corteza, -22), ruido(x, y, 8));
      else {
        const anillo = Math.sin((Math.hypot(dx, dy) + ruido(x, y, 4) * 3) * 1.15) * 0.5 + 0.5;
        c = mezclar(madera, sumar(madera, -34), anillo * 0.8);
      }
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarHojas({ p, azar, mezcla }, tono = 0, matiz = [0, 0, 0]) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 8);
      const r = azar();
      if (r < 0.04 + (n < 0.3 ? 0.07 : 0)) { p(x, y, [40, 100, 30], 0); continue; }
      let c = mezclar([34, 100, 30], [92, 172, 62], n);
      if (r > 0.9) c = escalar(c, 1.2);
      else if (r < 0.3) c = escalar(c, 0.82);
      c = sumar(c, tono);
      p(x, y, variar([c[0] + matiz[0], c[1] + matiz[1], c[2] + matiz[2]], 6, azar));
    }
  }
}

function pintarTablas({ p, azar, ruido }, tonos = [[190, 150, 92], [176, 136, 84], [184, 143, 88], [170, 131, 78]], junta = [112, 82, 48]) {
  const uniones = [9, 25, 14, 4];
  for (let y = 0; y < TAM; y++) {
    const tabla = Math.floor(y / 8);
    for (let x = 0; x < TAM; x++) {
      const gy = y % 8;
      if (gy === 7 || x === uniones[tabla]) { p(x, y, variar(junta, 4, azar)); continue; }
      const veta = (ruido(x * 0.5 + tabla * 5, y * 2.5, 8) - 0.5) * 22;
      let c = tonos[tabla];
      if (gy === 0) c = sumar(c, 10);
      p(x, y, variar([c[0] + veta, c[1] + veta, c[2] + veta * 0.7], 4, azar));
    }
  }
  // clavitos
  for (let t = 0; t < 4; t++) { p(uniones[t] + 2, t * 8 + 3, [96, 70, 44]); p(mod(uniones[t] - 2, TAM), t * 8 + 3, [96, 70, 44]); }
}

function pintarVidrio({ p }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const borde = x < 2 || y < 2 || x > 29 || y > 29;
      const diag = (x - y === 9 && x > 10 && x < 21) || (x - y === 13 && x > 14 && x < 24) || (x - y === -11 && x > 4 && x < 12);
      if (borde) p(x, y, [190, 226, 240]);
      else if (diag) p(x, y, [240, 250, 255]);
      else p(x, y, [200, 230, 240], 0);
    }
  }
}

function pintarLadrillo({ p, azar }) {
  const ladr = {};
  for (let y = 0; y < TAM; y++) {
    const fila = Math.floor(y / 8);
    const corrido = fila % 2 === 0 ? 0 : 8;
    for (let x = 0; x < TAM; x++) {
      const gy = y % 8;
      if (gy === 7 || (x + corrido) % 16 === 15) { p(x, y, variar([184, 178, 168], 7, azar)); continue; }
      const k = fila * 10 + Math.floor(((x + corrido) % 32) / 16);
      if (ladr[k] === undefined) ladr[k] = (azar() * 2 - 1) * 20;
      const d = ladr[k];
      let c = [160 + d, 72 + d * 0.5, 52 + d * 0.3];
      if (gy === 0) c = sumar(c, 14);
      if (gy === 6) c = sumar(c, -14);
      p(x, y, variar(c, 8, azar));
    }
  }
}

function pintarLadrilloPiedra({ p, azar, mezcla }, base = [126, 126, 128], musgo = 0, grieta = false) {
  for (let y = 0; y < TAM; y++) {
    const fila = Math.floor(y / 16);
    for (let x = 0; x < TAM; x++) {
      const union = fila === 0 ? x === 31 : x === 15;
      const gy = y % 16;
      if (gy === 15 || union) { p(x, y, variar([76, 76, 78], 5, azar)); continue; }
      let c = sumar(base, (mezcla(x, y, 4) - 0.5) * 28);
      if (gy === 0 || (fila === 0 ? x === 0 : x === 16)) c = sumar(c, 14);
      if (gy === 14) c = sumar(c, -12);
      if (azar() < 0.1) c = sumar(c, -14);
      if (grieta && mezcla(x * 1.3, y * 0.9, 8) > 0.72 && azar() < 0.8) c = sumar(c, -38);
      if (musgo && mezcla(x + 9, y + 3, 4) > 1 - musgo) c = mezclar(c, azar() < 0.5 ? [64, 116, 46] : [84, 142, 58], 0.85);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarNieve({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      let c = mezclar([234, 240, 250], [252, 253, 255], n);
      if (azar() < 0.08) c = [214, 228, 244];
      p(x, y, variar(c, 3, azar));
    }
  }
}

function pintarMineral(u, oscuro, claro) {
  const { p, azar, ruido } = u;
  pintarPiedra(u);
  for (let k = 0; k < 7; k++) {
    const mx = Math.floor(azar() * 28) + 2, my = Math.floor(azar() * 28) + 2;
    const rad = 1.8 + azar() * 2;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy) + (ruido(mx + dx + 3, my + dy, 8) - 0.5) * 2;
        if (d > rad) continue;
        p(mod(mx + dx, TAM), mod(my + dy, TAM), (dx + dy < 0) ? claro : (d > rad - 0.9 ? oscuro : mezclar(oscuro, claro, 0.5)));
      }
    }
  }
}

function pintarLecho({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      const v = azar();
      const t = 40 + n * 60 + (v < 0.2 ? -16 : v > 0.85 ? 22 : 0);
      p(x, y, [t, t, t + 2]);
    }
  }
}

function pintarFlor({ p, azar }, petalo, centro) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  for (let y = 15; y < TAM; y++) { p(15, y, [52, 118, 36]); p(16, y, [66, 140, 44]); }
  const hoja = (x0, y0, dir) => { for (let i = 0; i < 5; i++) { p(x0 + dir * i, y0 - (i >> 1), [66, 146, 46]); p(x0 + dir * i, y0 - (i >> 1) + 1, [50, 112, 34]); } };
  hoja(16, 26, 1); hoja(15, 23, -1);
  for (let y = 2; y < 17; y++) {
    for (let x = 7; x < 25; x++) {
      const dx = x - 15.5, dy = y - 9;
      const d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const pet = 6.8 + Math.sin(ang * 5) * 1.6;
      if (d < 2.6) p(x, y, centro);
      else if (d < pet) p(x, y, variar(mezclar(petalo, sumar(petalo, -50), d / pet * 0.6), 7, azar));
    }
  }
}

function pintarPastoAlto({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  for (let i = 0; i < 12; i++) {
    let x = 3 + Math.floor(azar() * 26);
    const alto = 10 + Math.floor(azar() * 20);
    const inclina = azar() < 0.5 ? -1 : 1;
    const verde = azar() < 0.5 ? [72, 144, 46] : [100, 174, 62];
    for (let k = 0; k < alto; k++) {
      const t = k / alto;
      p(mod(x, TAM), 31 - k, variar(mezclar(sumar(verde, -24), verde, t), 8, azar));
      if (k > 6 && azar() < 0.22) x += inclina;
    }
  }
}

function pintarLana({ p, azar }, color) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = color;
      const tej = (x + y) % 4;
      if (tej === 0) c = mezclar(color, [0, 0, 0], 0.12);
      else if (tej === 2) c = mezclar(color, [255, 255, 255], 0.07);
      if ((x * 3 + y * 5) % 13 === 0) c = mezclar(c, [255, 255, 255], 0.08);
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarCalabaza({ p, azar, ruido }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const gajo = Math.sin(x * Math.PI / 4);
      let c = mezclar([196, 100, 22], [240, 150, 40], gajo * 0.5 + 0.5);
      c = sumar(c, (ruido(x, y, 8) - 0.5) * 16);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarArenisca({ p, azar, mezcla }, lado) {
  for (let y = 0; y < TAM; y++) {
    const banda = lado ? (y % 10 === 9 ? -20 : y % 10 === 0 ? 8 : 0) : 0;
    for (let x = 0; x < TAM; x++) {
      let c = sumar([218, 202, 146], (mezcla(x, y * (lado ? 2.4 : 1), 4) - 0.5) * 24);
      if (azar() < 0.12) c = sumar(c, -16);
      else if (azar() > 0.93) c = sumar(c, 12);
      p(x, y, variar([c[0] + banda, c[1] + banda, c[2] + banda * 1.1], 4, azar));
    }
  }
}

function pintarAdoquinMusgoso(u) {
  const { p, azar, mezcla } = u;
  pintarAdoquin(u);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      if (mezcla(x + 11, y + 4, 4) < 0.58 || azar() < 0.25) continue;
      p(x, y, variar(azar() < 0.5 ? [62, 112, 44] : [86, 142, 58], 9, azar));
    }
  }
}

function pintarObsidiana({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      let c = mezclar([14, 8, 26], [40, 26, 66], n);
      const r = azar();
      if (r > 0.95) c = [100, 70, 150];
      else if ((x + y * 2) % 17 === 0) c = [58, 40, 92];
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarHielo({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = mezclar([138, 190, 238], [176, 216, 250], mezcla(x, y, 4));
      const diag = (x + y) % 16;
      if (diag < 2) c = [206, 234, 254];
      else if (azar() < 0.08) c = [120, 170, 224];
      const borde = x < 1 || y < 1 || x > 30 || y > 30;
      p(x, y, variar(borde ? [118, 172, 226] : c, 4, azar));
    }
  }
}

function pintarCamino({ p, azar, mezcla }, lado) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar([150, 118, 78], (mezcla(x, y, 4) - 0.5) * 34);
      const r = azar();
      if (r < 0.1) c = sumar(c, -16);
      else if (r > 0.93) c = sumar(c, 14);
      if (lado) {
        // borde de arriba más claro, abajo es tierra
        if (y < 4) c = mezclar(c, [170, 138, 92], 0.5);
        else c = mezclar(c, [112, 78, 52], Math.min(0.8, (y - 3) / 8));
      }
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarCultivo({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const surco = (x % 8) < 3;
      let c = sumar(surco ? [60, 38, 24] : [96, 64, 42], (mezcla(x, y, 4) - 0.5) * 20);
      if (!surco && (x % 8) === 3) c = sumar(c, 10);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarTrigo({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  for (let i = 0; i < 9; i++) {
    const x0 = 2 + i * 3 + (azar() < 0.5 ? 0 : 1);
    const alto = 22 + Math.floor(azar() * 8);
    for (let k = 0; k < alto; k++) {
      const y = 31 - k;
      const espiga = k > alto - 8;
      const c = espiga ? mezclar([200, 170, 60], [236, 206, 96], azar()) : mezclar([112, 150, 52], [150, 170, 66], k / alto);
      p(x0, y, variar(c, 8, azar));
      if (espiga && k % 2 === 0) { p(x0 + 1, y, variar([214, 182, 70], 8, azar)); p(x0 - 1, y, variar([190, 156, 56], 8, azar)); }
    }
  }
}

function pintarPaja({ p, azar, ruido }, lado) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = ruido(x * (lado ? 0.4 : 2.2), y * (lado ? 3 : 0.5), 16);
      let c = mezclar([176, 140, 48], [226, 190, 82], n);
      if (lado && (y === 8 || y === 9 || y === 22 || y === 23)) c = [150, 100, 40];
      p(x, y, variar(c, 8, azar));
    }
  }
}

function pintarEstanteria({ p, azar }) {
  const libros = [[160, 40, 40], [52, 96, 170], [64, 130, 64], [190, 150, 50], [110, 60, 140], [180, 90, 40]];
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const fila = y % 16;
      if (fila < 2 || fila > 13) { p(x, y, variar([124, 90, 54], 5, azar)); continue; }
      p(x, y, [44, 30, 20]);
    }
  }
  for (const f of [0, 1]) {
    let x = 1;
    while (x < 31) {
      const an = 2 + Math.floor(azar() * 3);
      const alto = 9 + Math.floor(azar() * 4);
      const col = libros[Math.floor(azar() * libros.length)];
      for (let i = 0; i < an && x + i < 31; i++) {
        for (let y = 0; y < alto; y++) p(x + i, f * 16 + 14 - y, variar(i === 0 ? sumar(col, 20) : col, 6, azar));
      }
      x += an;
      if (azar() < 0.12) x++;
    }
  }
}

function pintarLuminosa({ p, azar, ruido, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const n = mezcla(x, y, 4);
      let c = mezclar([196, 140, 54], [255, 232, 140], n);
      if (ruido(x + 5, y + 9, 8) > 0.7) c = mezclar(c, [255, 252, 220], 0.6);
      const borde = x < 1 || y < 1 || x > 30 || y > 30;
      p(x, y, variar(borde ? [150, 96, 34] : c, 6, azar));
    }
  }
}

function pintarAntorcha({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  // palo en el centro: columnas 14..17 (7/16 a 9/16 del bloque), de abajo hasta 10/16
  for (let y = 12; y < 32; y++) {
    for (let x = 14; x < 18; x++) {
      const base = x < 16 ? [128, 92, 52] : [96, 68, 38];
      p(x, y, variar(y % 6 === 0 ? sumar(base, -14) : base, 5, azar));
    }
  }
  // brasa y llama
  for (let y = 8; y < 14; y++) {
    for (let x = 14; x < 18; x++) {
      const t = (y - 8) / 6;
      p(x, y, mezclar([255, 244, 150], [255, 150, 30], t));
    }
  }
  p(15, 7, [255, 200, 70]); p(16, 7, [255, 226, 110]);
}

function pintarCofre({ p, azar, mezcla }, parte) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const borde = x < 2 || x > 29 || y < 2 || y > 29;
      let c = sumar([158, 112, 56], (mezcla(x * 0.4, y * 2, 4) - 0.5) * 30);
      if (borde) c = [96, 62, 28];
      // tapa
      if (parte !== 'arriba' && y > 11 && y < 14) c = [88, 56, 26];
      if (parte !== 'arriba' && (y === 10)) c = sumar(c, 14);
      p(x, y, variar(c, 4, azar));
    }
  }
  if (parte === 'frente') {
    for (let y = 10; y < 19; y++) {
      for (let x = 13; x < 19; x++) p(x, y, x === 13 || x === 18 || y === 10 || y === 18 ? [60, 60, 66] : [190, 190, 200]);
    }
    p(15, 13, [40, 40, 44]); p(16, 13, [40, 40, 44]); p(15, 14, [40, 40, 44]); p(16, 14, [40, 40, 44]);
  }
  if (parte === 'arriba') {
    for (let x = 13; x < 19; x++) for (let y = 12; y < 16; y++) p(x, y, [190, 190, 200]);
  }
  // herrajes verticales en los lados
  if (parte !== 'arriba') for (let y = 2; y < 30; y++) { p(5, y, [70, 70, 76]); p(26, y, [70, 70, 76]); }
}

function pintarPuerta({ p, azar, ruido }, arriba) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const borde = x < 2 || x > 29 || (arriba ? y < 2 : y > 29);
      let c = sumar([150, 104, 56], (ruido(x * 0.4, y * 2.2, 8) - 0.5) * 30);
      if (borde) c = [96, 64, 32];
      // paneles
      const px = x > 5 && x < 26, py = arriba ? (y > 5 && y < 28) : (y > 3 && y < 26);
      if (px && py) c = (x === 6 || y === (arriba ? 6 : 4) || x === 25 || y === (arriba ? 27 : 25)) ? sumar(c, -30) : sumar(c, 8);
      p(x, y, variar(c, 4, azar));
    }
  }
  if (arriba) { for (let y = 12; y < 18; y++) for (let x = 6; x < 26; x++) if (x >= 8 && x <= 23) p(x, y, [190, 220, 230], 255); }
  if (!arriba) { for (let y = 12; y < 15; y++) for (let x = 24; x < 27; x++) p(x, y, [210, 200, 80]); }
}

function pintarCama({ p, azar }, parte) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = [196, 46, 46];
      if ((x + y) % 4 === 0) c = [176, 38, 38];
      if (parte === 'cabeza' && y < 11) c = [238, 238, 238];
      if (parte === 'cabeza' && y === 11) c = [150, 30, 30];
      if (parte === 'cabeza' && y < 11 && (x < 2 || x > 29 || y < 2)) c = [210, 210, 214];
      if (x < 1 || x > 30) c = [120, 28, 28];
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarCamaLado({ p, azar }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = y < 14 ? [176, 38, 38] : y < 18 ? [226, 226, 226] : [146, 104, 56];
      if (y > 18 && (x % 8) === 7) c = [112, 78, 42];
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarMesaArriba(u) {
  pintarTablas(u, [[176, 130, 78], [168, 124, 72], [172, 127, 75], [164, 120, 70]], [100, 72, 40]);
}

function pintarRiel({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  // traviesas (van de lado a lado en el eje X del dibujo)
  for (let y = 0; y < TAM; y += 8) {
    for (let yy = y + 1; yy < y + 5; yy++) for (let x = 3; x < 29; x++) p(x, yy, variar([122, 86, 48], 7, azar));
  }
  // rieles (dos líneas largas en Y)
  for (let y = 0; y < TAM; y++) {
    for (const x0 of [8, 22]) {
      p(x0, y, [178, 178, 186]); p(x0 + 1, y, [140, 140, 148]); p(x0 + 2, y, [100, 100, 108]);
    }
  }
}

function pintarCactus({ p, azar, ruido }, arriba) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c;
      if (arriba) {
        const d = Math.max(Math.abs(x - 15.5), Math.abs(y - 15.5));
        c = d > 13 ? [34, 100, 40] : mezclar([60, 140, 56], [86, 168, 70], ruido(x, y, 8));
        if (d < 2) c = [200, 224, 120];
      } else {
        const costilla = Math.abs(((x % 8) - 3.5)) / 3.5;
        c = mezclar([76, 158, 62], [30, 92, 38], costilla * costilla);
        if (x % 8 === 3 && y % 5 === 2) c = [236, 232, 186];
        if (x % 8 === 4 && y % 5 === 2) c = [212, 206, 160];
      }
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarArbustoMuerto({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  const rama = (x, y, dx, dy, largo) => {
    for (let i = 0; i < largo; i++) {
      p(x, y, variar([112, 78, 44], 12, azar));
      x += dx; y -= 1;
      if (azar() < 0.4) x += dx;
      if (i > 3 && azar() < 0.2) rama(x, y, -dx, dy, Math.floor(largo / 2));
    }
  };
  rama(15, 31, 0, -1, 8);
  rama(15, 24, -1, -1, 9);
  rama(16, 22, 1, -1, 10);
  rama(14, 26, 1, -1, 7);
}

function pintarCorteza(u, base) { pintarTroncoLado(u, base, 34); }

function pintarTerracota({ p, azar, mezcla }, color) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar(color, (mezcla(x, y, 4) - 0.5) * 18);
      if (azar() < 0.06) c = sumar(c, -10);
      p(x, y, variar(c, 3, azar));
    }
  }
}

function pintarArenicaCincelada({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar([218, 202, 146], (mezcla(x, y, 4) - 0.5) * 18);
      const dx = Math.abs(x - 15.5), dy = Math.abs(y - 15.5);
      const m = Math.max(dx, dy);
      if (m > 14) c = [184, 166, 108];
      else if (Math.abs(dx - dy) < 1.2 && m < 11) c = [196, 150, 60];
      else if (m > 9.5 && m < 11) c = [190, 172, 112];
      else if (m < 3.5) c = [60, 100, 150];
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarMesaTrabajo({ p, azar, ruido }, parte) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar([156, 112, 62], (ruido(x * 0.5, y * 2, 8) - 0.5) * 24);
      if (parte === 'arriba') {
        c = [168, 128, 76];
        if (x < 2 || x > 29 || y < 2 || y > 29) c = [96, 62, 32];
        if ((x % 11 === 5 || y % 11 === 5) && x > 2 && y > 2 && x < 29 && y < 29) c = [112, 80, 46];
      } else if (parte === 'frente') {
        if (y < 8) c = [120, 84, 48];
        if (y > 12 && y < 28 && x > 4 && x < 27) {
          if (x === 5 || x === 26 || y === 13 || y === 27) c = [90, 62, 34];
          else c = (x > 8 && x < 14 && y > 16 && y < 24) ? [190, 190, 200] : [136, 98, 56];
          if (x > 18 && x < 24 && y > 18 && y < 26) c = [180, 60, 60];
        }
      } else if (y > 8) c = sumar(c, -10);
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarHorno({ p, azar, mezcla, celdas }, parte) {
  const mapa = celdas(6);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar([124, 124, 126], (mezcla(x, y, 4) - 0.5) * 36);
      if (mapa[y * TAM + x].borde < 0.9) c = sumar(c, -22);
      if (parte === 'frente') {
        if (x > 7 && x < 24 && y > 14 && y < 26) c = (x === 8 || x === 23 || y === 15 || y === 25) ? [60, 60, 62] : [28, 22, 20];
        if (x > 9 && x < 22 && y > 20 && y < 25) c = (y < 22 ? [240, 130, 30] : [200, 70, 20]);
        if (x > 8 && x < 23 && y > 5 && y < 11) c = [40, 40, 44];
      }
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarPiedraPulida({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = sumar([146, 146, 148], (mezcla(x, y, 4) - 0.5) * 20);
      if (x < 1 || y < 1) c = sumar(c, 14);
      if (x > 30 || y > 30) c = sumar(c, -18);
      p(x, y, variar(c, 3, azar));
    }
  }
}

function pintarCristalOscuro({ p, azar }) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const borde = x < 2 || y < 2 || x > 29 || y > 29;
      p(x, y, variar(borde ? [40, 50, 64] : [60, 80, 110], 6, azar));
    }
  }
}

function pintarTejas({ p, azar }) {
  for (let y = 0; y < TAM; y++) {
    const fila = Math.floor(y / 8);
    const corr = fila % 2 ? 8 : 0;
    for (let x = 0; x < TAM; x++) {
      const gy = y % 8;
      const gx = (x + corr) % 16;
      let c = [150, 62, 48];
      c = sumar(c, -gy * 3);
      if (gx === 15 || gy === 7) c = [96, 38, 30];
      if (gx < 2) c = sumar(c, 8);
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarGema({ p, azar, celdas }, color, brillo) {
  const mapa = celdas(5);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const c = mapa[y * TAM + x];
      p(x, y, c.borde < 1 ? sumar(color, -60) : mezclar(color, brillo, ((c.cual * 37) % 10) / 14));
    }
  }
}

const PINTORES = {
  pasto_arriba: pintarPasto,
  pasto_lado: pintarPastoLado,
  tierra: pintarTierra,
  piedra: (u) => pintarPiedra(u),
  adoquin: (u) => pintarAdoquin(u),
  arena: (u) => pintarArena(u),
  grava: pintarGrava,
  agua: pintarAgua,
  tronco_lado: (u) => pintarTroncoLado(u),
  tronco_arriba: (u) => pintarTroncoArriba(u),
  hojas: (u) => pintarHojas(u),
  tablas: (u) => pintarTablas(u),
  vidrio: pintarVidrio,
  ladrillo: pintarLadrillo,
  ladrillo_piedra: (u) => pintarLadrilloPiedra(u),
  nieve: pintarNieve,
  carbon: (u) => pintarMineral(u, [26, 26, 28], [66, 66, 70]),
  hierro: (u) => pintarMineral(u, [190, 140, 100], [230, 196, 158]),
  oro: (u) => pintarMineral(u, [226, 176, 30], [255, 236, 120]),
  lecho: pintarLecho,
  flor_roja: (u) => pintarFlor(u, [222, 44, 44], [250, 222, 70]),
  flor_amarilla: (u) => pintarFlor(u, [250, 212, 44], [222, 130, 30]),
  pasto_alto: pintarPastoAlto,
  lana_blanca: (u) => pintarLana(u, [234, 234, 234]),
  lana_roja: (u) => pintarLana(u, [200, 52, 52]),
  lana_naranja: (u) => pintarLana(u, [236, 132, 40]),
  lana_amarilla: (u) => pintarLana(u, [246, 214, 52]),
  lana_verde: (u) => pintarLana(u, [104, 190, 52]),
  lana_azul: (u) => pintarLana(u, [52, 112, 212]),
  lana_morada: (u) => pintarLana(u, [132, 64, 192]),
  lana_rosa: (u) => pintarLana(u, [242, 142, 184]),
  calabaza: pintarCalabaza,
  arenisca_arriba: (u) => pintarArenisca(u, false),
  arenisca_lado: (u) => pintarArenisca(u, true),
  adoquin_musgoso: pintarAdoquinMusgoso,
  obsidiana: pintarObsidiana,
  hielo: pintarHielo,
  lana_negra: (u) => pintarLana(u, [34, 34, 40]),
  lana_gris: (u) => pintarLana(u, [128, 130, 136]),
  tablas_oscuras: (u) => pintarTablas(u, [[98, 68, 42], [90, 62, 38], [94, 65, 40], [84, 58, 36]], [48, 32, 18]),
  camino_arriba: (u) => pintarCamino(u, false),
  camino_lado: (u) => pintarCamino(u, true),
  cultivo_arriba: pintarCultivo,
  trigo: pintarTrigo,
  paja_arriba: (u) => pintarPaja(u, false),
  paja_lado: (u) => pintarPaja(u, true),
  estanteria: pintarEstanteria,
  piedra_luminosa: pintarLuminosa,
  antorcha: pintarAntorcha,
  cofre_arriba: (u) => pintarCofre(u, 'arriba'),
  cofre_lado: (u) => pintarCofre(u, 'lado'),
  cofre_frente: (u) => pintarCofre(u, 'frente'),
  puerta_abajo: (u) => pintarPuerta(u, false),
  puerta_arriba: (u) => pintarPuerta(u, true),
  cama_cabeza: (u) => pintarCama(u, 'cabeza'),
  cama_pie: (u) => pintarCama(u, 'pie'),
  cama_lado: pintarCamaLado,
  mesa_arriba: pintarMesaArriba,
  riel: pintarRiel,
  cactus_arriba: (u) => pintarCactus(u, true),
  cactus_lado: (u) => pintarCactus(u, false),
  arbusto_muerto: pintarArbustoMuerto,
  abeto_lado: (u) => pintarCorteza(u, [66, 46, 30]),
  abeto_arriba: (u) => pintarTroncoArriba(u, [66, 46, 30], [140, 104, 64]),
  hojas_abeto: (u) => pintarHojas(u, -14, [-4, 4, 12]),
  abedul_lado: (u) => {
    pintarTroncoLado(u, [222, 220, 210], 8);
    for (let i = 0; i < 9; i++) { const x = Math.floor(u.azar() * 30), y = Math.floor(u.azar() * 30); for (let k = 0; k < 3; k++) u.p(x + k, y, [40, 38, 36]); }
  },
  abedul_arriba: (u) => pintarTroncoArriba(u, [214, 212, 202], [196, 176, 120]),
  hojas_abedul: (u) => pintarHojas(u, 16, [14, 10, -12]),
  terracota_naranja: (u) => pintarTerracota(u, [200, 100, 50]),
  terracota_azul: (u) => pintarTerracota(u, [48, 92, 160]),
  terracota_blanca: (u) => pintarTerracota(u, [214, 194, 180]),
  ladrillo_musgoso: (u) => pintarLadrilloPiedra(u, [126, 126, 128], 0.45),
  ladrillo_agrietado: (u) => pintarLadrilloPiedra(u, [120, 120, 122], 0, true),
  arenisca_cincelada: pintarArenicaCincelada,
  mesa_trabajo_arriba: (u) => pintarMesaTrabajo(u, 'arriba'),
  mesa_trabajo_lado: (u) => pintarMesaTrabajo(u, 'lado'),
  mesa_trabajo_frente: (u) => pintarMesaTrabajo(u, 'frente'),
  horno_frente: (u) => pintarHorno(u, 'frente'),
  horno_lado: (u) => pintarHorno(u, 'lado'),
  tablas_abeto: (u) => pintarTablas(u, [[120, 88, 54], [110, 80, 48], [116, 84, 50], [106, 76, 46]], [64, 44, 26]),
  piedra_pulida: pintarPiedraPulida,
  cristal_oscuro: pintarCristalOscuro,
  tejas: pintarTejas,
  esmeralda: (u) => pintarGema(u, [40, 190, 90], [150, 255, 190]),
  diamante: (u) => pintarGema(u, [60, 200, 210], [190, 255, 255]),
};

// Cuánto relieve tiene cada textura (1 = normal, 0 = lisa)
const RELIEVE = {
  agua: 0, vidrio: 0.2, cristal_oscuro: 0.2, nieve: 0.3, hielo: 0.4, lana_blanca: 0.5, lana_roja: 0.5, lana_naranja: 0.5,
  lana_amarilla: 0.5, lana_verde: 0.5, lana_azul: 0.5, lana_morada: 0.5, lana_rosa: 0.5, lana_negra: 0.5, lana_gris: 0.5,
  piedra_luminosa: 0.3, obsidiana: 0.5, cofre_frente: 0.6, antorcha: 0.8, riel: 0.8, arbusto_muerto: 0.5, flor_roja: 0.6,
  flor_amarilla: 0.6, pasto_alto: 0.5, trigo: 0.6,
};

// Achica una imagen a la mitad promediando cuadritos de 2x2.
// Los pixeles transparentes no cuentan para el color (si no, las hojas se verían negras).
function achicar(origen, ancho, alto) {
  const an = Math.max(1, ancho >> 1), al = Math.max(1, alto >> 1);
  const res = new Uint8ClampedArray(an * al * 4);
  for (let y = 0; y < al; y++) {
    for (let x = 0; x < an; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(ancho - 1, x * 2 + dx), sy = Math.min(alto - 1, y * 2 + dy);
          const k = (sy * ancho + sx) * 4;
          const al2 = origen[k + 3];
          r += origen[k] * al2; g += origen[k + 1] * al2; b += origen[k + 2] * al2;
          a += al2;
          n++;
        }
      }
      const k = (y * an + x) * 4;
      if (a > 0) { res[k] = r / a; res[k + 1] = g / a; res[k + 2] = b / a; }
      res[k + 3] = a / n;
    }
  }
  return { datos: res, ancho: an, alto: al };
}

function aLienzo(datos, ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  // "willReadFrequently": el lienzo vive en memoria normal (así subirlo a la tarjeta de video es directo)
  c.getContext('2d', { willReadFrequently: true }).putImageData(new ImageData(datos, ancho, alto), 0, 0);
  return c;
}

// Repite el dibujo hacia los lados (el borde del atlas)
function rellenarBorde(d, ox, oy) {
  for (let y = -BORDE; y < TAM + BORDE; y++) {
    for (let x = -BORDE; x < TAM + BORDE; x++) {
      if (x >= 0 && y >= 0 && x < TAM && y < TAM) continue;
      const sx = mod(x, TAM), sy = mod(y, TAM);
      const de = ((oy + sy) * ANCHO_ATLAS + (ox + sx)) * 4;
      const a = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
      d[a] = d[de]; d[a + 1] = d[de + 1]; d[a + 2] = d[de + 2]; d[a + 3] = d[de + 3];
    }
  }
}

function cadenaDeNiveles(datos) {
  const niveles = [aLienzo(datos, ANCHO_ATLAS, ALTO_ATLAS)];
  let actual = { datos, ancho: ANCHO_ATLAS, alto: ALTO_ATLAS };
  while (actual.ancho > 1 || actual.alto > 1) {
    actual = achicar(actual.datos, actual.ancho, actual.alto);
    niveles.push(aLienzo(actual.datos, actual.ancho, actual.alto));
  }
  return niveles;
}

// Pinta todas las texturas en un <canvas>.
// Devuelve los "niveles" (el atlas grande y sus versiones achicadas), lo mismo
// para el atlas de relieve ("niveles normales") y el color promedio de cada
// textura (para las chispitas).
export function crearAtlas() {
  const d = new Uint8ClampedArray(ANCHO_ATLAS * ALTO_ATLAS * 4);
  const n = new Uint8ClampedArray(ANCHO_ATLAS * ALTO_ATLAS * 4);
  const promedios = [];

  LISTA_TEXTURAS.forEach((nombre, i) => {
    const util = crearUtiles(1000 + i * 7919);
    const [ox, oy] = origenTextura(i);
    util.p = (x, y, c, alfa = 255) => {
      if (x < 0 || y < 0 || x >= TAM || y >= TAM) return;
      const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
      d[k] = limitar(c[0]); d[k + 1] = limitar(c[1]); d[k + 2] = limitar(c[2]); d[k + 3] = alfa;
    };
    PINTORES[nombre](util);
    rellenarBorde(d, ox, oy);

    // relieve: el brillo de cada pixel hace de "altura"
    const alt = new Float32Array(TAM * TAM);
    for (let y = 0; y < TAM; y++) {
      for (let x = 0; x < TAM; x++) {
        const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
        alt[y * TAM + x] = (d[k] * 0.3 + d[k + 1] * 0.55 + d[k + 2] * 0.15) / 255 * (d[k + 3] > 0 ? 1 : 0);
      }
    }
    const fuerza = (RELIEVE[nombre] ?? 1) * 3.2;
    for (let y = -BORDE; y < TAM + BORDE; y++) {
      for (let x = -BORDE; x < TAM + BORDE; x++) {
        const sx = mod(x, TAM), sy = mod(y, TAM);
        const hx = alt[sy * TAM + mod(sx + 1, TAM)] - alt[sy * TAM + mod(sx - 1, TAM)];
        const hy = alt[mod(sy + 1, TAM) * TAM + sx] - alt[mod(sy - 1, TAM) * TAM + sx];
        let nx = -hx * fuerza, ny = hy * fuerza;
        const nz = 1;
        const l = Math.hypot(nx, ny, nz);
        nx /= l; ny /= l;
        const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
        n[k] = limitar((nx * 0.5 + 0.5) * 255); n[k + 1] = limitar((ny * 0.5 + 0.5) * 255);
        n[k + 2] = limitar((nz / l * 0.5 + 0.5) * 255); n[k + 3] = 255;
      }
    }

    let sr = 0, sg = 0, sb = 0, cuenta = 0;
    for (let y = 0; y < TAM; y++) {
      for (let x = 0; x < TAM; x++) {
        const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
        if (d[k + 3] > 0) { sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; cuenta++; }
      }
    }
    promedios.push(cuenta ? [sr / cuenta / 255, sg / cuenta / 255, sb / cuenta / 255] : [1, 1, 1]);
  });

  const niveles = cadenaDeNiveles(d);
  const normales = cadenaDeNiveles(n);
  return { lienzo: niveles[0], niveles, normales, promedios };
}
