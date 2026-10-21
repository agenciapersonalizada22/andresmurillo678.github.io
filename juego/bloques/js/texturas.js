// =============================================================
//  🎨  TEXTURAS
//  Cada textura es un dibujito "pixel art" de 16x16 que se pinta
//  con código (no hay imágenes). Todas se juntan en UNA sola
//  imagen grande llamada "atlas".
//  Cada cuadrito del atlas mide 32x32: el dibujo de 16x16 en medio
//  y alrededor un borde de 8 pixeles que repite el mismo dibujo.
//  Ese borde evita que se vean rayitas de otros colores entre
//  bloques, también cuando el atlas se achica para lo lejano
//  (las versiones chiquitas se llaman "mipmaps" y evitan que lo
//  lejano se vea con puntitos que tiemblan).
//  Para cambiar un color, busca su función "pintar..." abajo.
// =============================================================
import { azarConSemilla } from './ruido.js';

// El orden de esta lista es el orden dentro del atlas
export const LISTA_TEXTURAS = [
  'pasto_arriba', 'pasto_lado', 'tierra', 'piedra', 'adoquin', 'arena', 'grava', 'agua',
  'tronco_lado', 'tronco_arriba', 'hojas', 'tablas', 'vidrio', 'ladrillo', 'ladrillo_piedra', 'nieve',
  'carbon', 'hierro', 'oro', 'lecho', 'flor_roja', 'flor_amarilla', 'pasto_alto', 'lana_blanca',
  'lana_roja', 'lana_naranja', 'lana_amarilla', 'lana_verde', 'lana_azul', 'lana_morada', 'lana_rosa', 'calabaza',
  'arenisca_arriba', 'arenisca_lado', 'adoquin_musgoso', 'obsidiana', 'hielo', 'lana_negra', 'lana_gris', 'tablas_oscuras',
];

export const TAM = 16;          // pixeles por textura
export const BORDE = 8;         // pixeles de borde repetido alrededor
export const CELDA = TAM + BORDE * 2;
export const COLUMNAS = 8;
// filas redondeadas a 1, 2, 4, 8... (los mipmaps funcionan mejor con medidas así)
export const FILAS = 2 ** Math.ceil(Math.log2(Math.ceil(LISTA_TEXTURAS.length / COLUMNAS)));
export const ANCHO_ATLAS = COLUMNAS * CELDA;
export const ALTO_ATLAS = FILAS * CELDA;

export function indiceTextura(nombre) {
  const i = LISTA_TEXTURAS.indexOf(nombre);
  if (i < 0) throw new Error('Textura desconocida: ' + nombre);
  return i;
}

// Coordenadas UV (0 a 1) del dibujo de 16x16 dentro del atlas: [u0, v0, u1, v1]
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

// Esquina de arriba a la izquierda del dibujo de 16x16 dentro del atlas grande
export function origenTextura(i) {
  return [(i % COLUMNAS) * CELDA + BORDE, Math.floor(i / COLUMNAS) * CELDA + BORDE];
}

// ----------------------------------------------------------- Ayudantes
const limitar = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

function variar(color, cantidad, azar) {
  const d = (azar() * 2 - 1) * cantidad;
  return [color[0] + d, color[1] + d, color[2] + d];
}

function mezclar(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Diagrama de "celdas" (para piedras redondas): devuelve para cada pixel
// a qué celda pertenece y si está en la orilla. Se repite sin costuras.
function celdas(azar, cuantas) {
  const puntos = [];
  for (let i = 0; i < cuantas; i++) puntos.push([azar() * TAM, azar() * TAM]);
  const res = [];
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let d1 = 1e9, d2 = 1e9, cual = 0;
      for (let i = 0; i < puntos.length; i++) {
        let dx = Math.abs(x + 0.5 - puntos[i][0]);
        let dy = Math.abs(y + 0.5 - puntos[i][1]);
        if (dx > TAM / 2) dx = TAM - dx;
        if (dy > TAM / 2) dy = TAM - dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; cual = i; } else if (d < d2) d2 = d;
      }
      res.push({ cual, orilla: d2 - d1 < 1.1, d1 });
    }
  }
  return res;
}

// ----------------------------------------------------------- Pintores
// Cada pintor recibe "p(x, y, [r,g,b], alfa)" para poner un pixel y "azar()".

function pintarPasto(p, azar) {
  const base = [96, 160, 56];
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = base;
      if (v < 0.16) c = [74, 132, 42];
      else if (v > 0.86) c = [124, 186, 70];
      p(x, y, variar(c, 7, azar));
    }
  }
}

function pintarTierra(p, azar) {
  const base = [134, 96, 66];
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = base;
      if (v < 0.14) c = [106, 74, 50];
      else if (v > 0.9) c = [160, 120, 88];
      else if (v > 0.86) c = [120, 120, 118]; // piedritas
      p(x, y, variar(c, 6, azar));
    }
  }
}

function pintarPastoLado(p, azar) {
  pintarTierra(p, azar);
  for (let x = 0; x < TAM; x++) {
    const fondo = 3 + (azar() < 0.5 ? 1 : 0) + (azar() < 0.25 ? 1 : 0);
    for (let y = 0; y < fondo; y++) {
      const v = azar();
      let c = [96, 160, 56];
      if (v < 0.2) c = [74, 132, 42];
      else if (v > 0.85) c = [124, 186, 70];
      p(x, y, variar(c, 6, azar));
    }
    if (azar() < 0.35) p(x, fondo, [70, 124, 40]);
  }
}

function pintarPiedra(p, azar, base = [126, 126, 126]) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = base;
      if (v < 0.12) c = [base[0] - 24, base[1] - 24, base[2] - 24];
      else if (v > 0.9) c = [base[0] + 16, base[1] + 16, base[2] + 16];
      p(x, y, variar(c, 6, azar));
    }
  }
  // unas grietitas
  for (let i = 0; i < 3; i++) {
    let x = Math.floor(azar() * TAM), y = Math.floor(azar() * TAM);
    for (let k = 0; k < 4; k++) {
      p(x & 15, y & 15, [base[0] - 30, base[1] - 30, base[2] - 30]);
      x += azar() < 0.5 ? 1 : 0;
      y += 1;
    }
  }
}

function pintarAdoquin(p, azar) {
  const mapa = celdas(azar, 10);
  const tonos = [];
  for (let i = 0; i < 10; i++) tonos.push(96 + Math.floor(azar() * 56));
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const c = mapa[y * TAM + x];
      if (c.orilla) p(x, y, variar([66, 66, 66], 6, azar));
      else {
        const t = tonos[c.cual] + (c.d1 < 1.6 ? 12 : 0);
        p(x, y, variar([t, t, t], 6, azar));
      }
    }
  }
}

function pintarArena(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = [222, 210, 152];
      if (v < 0.12) c = [202, 188, 128];
      else if (v > 0.9) c = [238, 230, 182];
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarGrava(p, azar) {
  const mapa = celdas(azar, 16);
  const tonos = [[136, 128, 124], [104, 100, 98], [154, 146, 140], [120, 110, 100], [90, 88, 88]];
  const cual = [];
  for (let i = 0; i < 16; i++) cual.push(tonos[Math.floor(azar() * tonos.length)]);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const c = mapa[y * TAM + x];
      p(x, y, variar(c.orilla ? [80, 76, 74] : cual[c.cual], 6, azar));
    }
  }
}

function pintarAgua(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = [42, 100, 200];
      const ola = (x + Math.floor(y / 4) * 5) % 8;
      if (y % 4 === 1 && ola < 3) c = [62, 124, 216];
      else if (azar() < 0.1) c = [38, 94, 192];
      p(x, y, variar(c, 3, azar), 215);
    }
  }
}

function pintarTroncoLado(p, azar) {
  const columnas = [];
  for (let x = 0; x < TAM; x++) columnas.push((azar() * 2 - 1) * 12 + (azar() < 0.25 ? -26 : 0));
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const d = columnas[x];
      p(x, y, variar([104 + d, 78 + d, 48 + d * 0.6], 5, azar));
    }
  }
}

function pintarTroncoArriba(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      let c;
      if (d > 6.6) c = [104, 78, 48];
      else if (Math.floor(d) % 2 === 0) c = [178, 140, 88];
      else c = [156, 120, 72];
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarHojas(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      if (v < 0.13) { p(x, y, [40, 100, 30], 0); continue; }
      let c = [58, 140, 46];
      if (v < 0.35) c = [42, 112, 34];
      else if (v > 0.85) c = [86, 168, 62];
      p(x, y, variar(c, 6, azar));
    }
  }
}

function pintarTablas(p, azar) {
  const tonos = [[184, 144, 88], [172, 132, 80], [180, 138, 84], [168, 128, 76]];
  const uniones = [3, 11, 6, 14];
  for (let y = 0; y < TAM; y++) {
    const tabla = Math.floor(y / 4);
    const veta = (azar() * 2 - 1) * 8;
    for (let x = 0; x < TAM; x++) {
      let c = tonos[tabla];
      if (y % 4 === 3 || x === uniones[tabla]) c = [116, 86, 50];
      else c = [c[0] + veta, c[1] + veta, c[2] + veta * 0.7];
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarVidrio(p) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const borde = x === 0 || y === 0 || x === 15 || y === 15;
      const brillo = (x - y === 5 && x > 6 && x < 11) || (x - y === 7 && x > 8 && x < 12) ||
                     (x - y === -6 && x > 2 && x < 6);
      if (borde) p(x, y, [196, 228, 240]);
      else if (brillo) p(x, y, [236, 248, 255]);
      else p(x, y, [200, 230, 240], 0);
    }
  }
}

function pintarLadrillo(p, azar) {
  const ladrillos = {};
  for (let y = 0; y < TAM; y++) {
    const fila = Math.floor(y / 4);
    const corrido = fila % 2 === 0 ? 0 : 4;
    for (let x = 0; x < TAM; x++) {
      if (y % 4 === 3 || (x + corrido) % 8 === 7) {
        p(x, y, variar([186, 180, 170], 6, azar));
        continue;
      }
      const clave = fila * 10 + Math.floor(((x + corrido) % 16) / 8);
      if (ladrillos[clave] === undefined) ladrillos[clave] = (azar() * 2 - 1) * 16;
      const d = ladrillos[clave];
      p(x, y, variar([160 + d, 72 + d * 0.5, 52 + d * 0.3], 7, azar));
    }
  }
}

function pintarLadrilloPiedra(p, azar) {
  for (let y = 0; y < TAM; y++) {
    const fila = Math.floor(y / 8);
    for (let x = 0; x < TAM; x++) {
      const union = fila === 0 ? x === 15 : x === 7;
      if (y % 8 === 7 || union) { p(x, y, variar([84, 84, 84], 5, azar)); continue; }
      let c = [124, 124, 124];
      if (y % 8 === 0) c = [140, 140, 140];
      else if (azar() < 0.12) c = [108, 108, 108];
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarNieve(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = [242, 246, 252];
      if (v < 0.12) c = [222, 232, 244];
      p(x, y, variar(c, 3, azar));
    }
  }
}

function pintarMineral(p, azar, oscuro, claro) {
  pintarPiedra(p, azar);
  const manchas = [[3, 3], [10, 2], [6, 9], [12, 11], [2, 12]];
  for (const [mx, my] of manchas) {
    const forma = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
    for (const [dx, dy] of forma) {
      if (azar() < 0.2) continue;
      p(mx + dx, my + dy, (dx + dy) % 2 === 0 ? claro : oscuro);
    }
  }
}

function pintarLecho(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      const c = v < 0.33 ? [44, 44, 46] : v < 0.66 ? [74, 74, 76] : [100, 100, 102];
      p(x, y, c);
    }
  }
}

function pintarFlor(p, azar, petalo, centro) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  for (let y = 8; y < TAM; y++) p(7, y, [58, 130, 40]);
  p(6, 12, [70, 150, 48]); p(5, 11, [70, 150, 48]);
  p(8, 13, [70, 150, 48]); p(9, 12, [70, 150, 48]);
  for (let y = 2; y < 9; y++) {
    for (let x = 4; x < 11; x++) {
      const dx = x - 7, dy = y - 5;
      const d = dx * dx + dy * dy;
      if (d <= 1) p(x, y, centro);
      else if (d <= 8 && !(Math.abs(dx) === 2 && Math.abs(dy) === 2)) p(x, y, variar(petalo, 8, azar));
    }
  }
}

function pintarPastoAlto(p, azar) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) p(x, y, [0, 0, 0], 0);
  for (let i = 0; i < 7; i++) {
    let x = 2 + Math.floor(azar() * 12);
    const alto = 6 + Math.floor(azar() * 9);
    const inclina = azar() < 0.5 ? -1 : 1;
    const verde = azar() < 0.5 ? [80, 150, 50] : [104, 176, 64];
    for (let k = 0; k < alto; k++) {
      p(Math.max(0, Math.min(15, x)), 15 - k, variar(verde, 10, azar));
      if (k > 3 && azar() < 0.25) x += inclina;
    }
  }
}

function pintarLana(p, azar, color) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = color;
      if ((x + y) % 4 === 0) c = mezclar(color, [0, 0, 0], 0.1);
      else if ((x - y + 16) % 4 === 0) c = mezclar(color, [255, 255, 255], 0.08);
      p(x, y, variar(c, 5, azar));
    }
  }
}

function pintarCalabaza(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = [226, 132, 32];
      if (x % 4 === 0) c = [196, 108, 24];
      p(x, y, variar(c, 6, azar));
    }
  }
}

// Capas de arenisca: bandas horizontales con granito
function pintarArenisca(p, azar, lado) {
  for (let y = 0; y < TAM; y++) {
    const banda = lado ? (y % 5 === 4 ? -16 : y % 5 === 0 ? 7 : 0) : 0;
    for (let x = 0; x < TAM; x++) {
      let c = [218, 202, 144];
      if (azar() < 0.14) c = [200, 182, 124];
      else if (azar() > 0.92) c = [232, 218, 164];
      p(x, y, variar([c[0] + banda, c[1] + banda, c[2] + banda * 1.1], 4, azar));
    }
  }
}

function pintarAdoquinMusgoso(p, azar) {
  pintarAdoquin(p, azar);
  const mapa = celdas(azar, 7);
  const musgo = [];
  for (let i = 0; i < 7; i++) musgo.push(azar() < 0.55);
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      if (!musgo[mapa[y * TAM + x].cual] || azar() < 0.3) continue;
      p(x, y, variar(azar() < 0.5 ? [62, 112, 44] : [84, 140, 56], 8, azar));
    }
  }
}

// Vidrio volcánico: casi negro con destellos morados
function pintarObsidiana(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const v = azar();
      let c = [24, 16, 38];
      if (v < 0.1) c = [14, 8, 24];
      else if (v > 0.93) c = [86, 56, 132];
      else if ((x + y * 2) % 11 === 0) c = [44, 30, 70];
      p(x, y, variar(c, 4, azar));
    }
  }
}

function pintarHielo(p, azar) {
  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      let c = [150, 200, 240];
      const diag = (x + y) % 8;
      if (diag === 0 || diag === 1) c = [196, 228, 252];
      else if (azar() < 0.12) c = [124, 176, 226];
      const borde = x === 0 || y === 0 || x === 15 || y === 15;
      p(x, y, variar(borde ? [128, 182, 230] : c, 4, azar));
    }
  }
}

function pintarTablasOscuras(p, azar) {
  const tonos = [[96, 66, 40], [88, 60, 36], [92, 63, 38], [82, 56, 34]];
  const uniones = [5, 12, 2, 9];
  for (let y = 0; y < TAM; y++) {
    const tabla = Math.floor(y / 4);
    const veta = (azar() * 2 - 1) * 7;
    for (let x = 0; x < TAM; x++) {
      let c = tonos[tabla];
      if (y % 4 === 3 || x === uniones[tabla]) c = [52, 34, 20];
      else c = [c[0] + veta, c[1] + veta, c[2] + veta * 0.7];
      p(x, y, variar(c, 4, azar));
    }
  }
}

const PINTORES = {
  pasto_arriba: pintarPasto,
  pasto_lado: pintarPastoLado,
  tierra: pintarTierra,
  piedra: (p, a) => pintarPiedra(p, a),
  adoquin: pintarAdoquin,
  arena: pintarArena,
  grava: pintarGrava,
  agua: pintarAgua,
  tronco_lado: pintarTroncoLado,
  tronco_arriba: pintarTroncoArriba,
  hojas: pintarHojas,
  tablas: pintarTablas,
  vidrio: pintarVidrio,
  ladrillo: pintarLadrillo,
  ladrillo_piedra: pintarLadrilloPiedra,
  nieve: pintarNieve,
  carbon: (p, a) => pintarMineral(p, a, [30, 30, 30], [62, 62, 62]),
  hierro: (p, a) => pintarMineral(p, a, [196, 150, 112], [226, 190, 150]),
  oro: (p, a) => pintarMineral(p, a, [232, 186, 40], [252, 232, 110]),
  lecho: pintarLecho,
  flor_roja: (p, a) => pintarFlor(p, a, [222, 44, 44], [250, 222, 70]),
  flor_amarilla: (p, a) => pintarFlor(p, a, [250, 212, 44], [222, 130, 30]),
  pasto_alto: pintarPastoAlto,
  lana_blanca: (p, a) => pintarLana(p, a, [234, 234, 234]),
  lana_roja: (p, a) => pintarLana(p, a, [200, 52, 52]),
  lana_naranja: (p, a) => pintarLana(p, a, [236, 132, 40]),
  lana_amarilla: (p, a) => pintarLana(p, a, [246, 214, 52]),
  lana_verde: (p, a) => pintarLana(p, a, [104, 190, 52]),
  lana_azul: (p, a) => pintarLana(p, a, [52, 112, 212]),
  lana_morada: (p, a) => pintarLana(p, a, [132, 64, 192]),
  lana_rosa: (p, a) => pintarLana(p, a, [242, 142, 184]),
  calabaza: pintarCalabaza,
  arenisca_arriba: (p, a) => pintarArenisca(p, a, false),
  arenisca_lado: (p, a) => pintarArenisca(p, a, true),
  adoquin_musgoso: pintarAdoquinMusgoso,
  obsidiana: pintarObsidiana,
  hielo: pintarHielo,
  lana_negra: (p, a) => pintarLana(p, a, [34, 34, 40]),
  lana_gris: (p, a) => pintarLana(p, a, [128, 130, 136]),
  tablas_oscuras: pintarTablasOscuras,
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

// Pinta todas las texturas en un <canvas>.
// Devuelve los "niveles" (el atlas grande y sus versiones achicadas)
// y el color promedio de cada textura (para las chispitas).
export function crearAtlas() {
  const d = new Uint8ClampedArray(ANCHO_ATLAS * ALTO_ATLAS * 4);
  const promedios = [];

  LISTA_TEXTURAS.forEach((nombre, i) => {
    const azar = azarConSemilla(1000 + i * 7919);
    const [ox, oy] = origenTextura(i);
    const p = (x, y, c, alfa = 255) => {
      if (x < 0 || y < 0 || x >= TAM || y >= TAM) return;
      const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
      d[k] = limitar(c[0]); d[k + 1] = limitar(c[1]); d[k + 2] = limitar(c[2]); d[k + 3] = alfa;
    };
    PINTORES[nombre](p, azar);

    // borde: se repite el dibujo hacia los lados
    for (let y = -BORDE; y < TAM + BORDE; y++) {
      for (let x = -BORDE; x < TAM + BORDE; x++) {
        if (x >= 0 && y >= 0 && x < TAM && y < TAM) continue;
        const sx = (x + TAM) % TAM, sy = (y + TAM) % TAM;
        const de = ((oy + sy) * ANCHO_ATLAS + (ox + sx)) * 4;
        const a = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
        d[a] = d[de]; d[a + 1] = d[de + 1]; d[a + 2] = d[de + 2]; d[a + 3] = d[de + 3];
      }
    }

    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = 0; y < TAM; y++) {
      for (let x = 0; x < TAM; x++) {
        const k = ((oy + y) * ANCHO_ATLAS + (ox + x)) * 4;
        if (d[k + 3] > 0) { sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; n++; }
      }
    }
    promedios.push(n ? [sr / n / 255, sg / n / 255, sb / n / 255] : [1, 1, 1]);
  });

  const niveles = [aLienzo(d, ANCHO_ATLAS, ALTO_ATLAS)];
  let actual = { datos: d, ancho: ANCHO_ATLAS, alto: ALTO_ATLAS };
  while (actual.ancho > 1 || actual.alto > 1) {
    actual = achicar(actual.datos, actual.ancho, actual.alto);
    niveles.push(aLienzo(actual.datos, actual.ancho, actual.alto));
  }
  return { lienzo: niveles[0], niveles, promedios };
}
