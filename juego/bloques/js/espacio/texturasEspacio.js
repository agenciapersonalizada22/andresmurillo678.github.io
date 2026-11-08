// =============================================================
//  🎨  TEXTURAS DEL ESPACIO (se añaden al atlas de texturas.js)
//  Regolito, rocas lunares, roca y lava del Abismo, portal,
//  hormigón, metal y las máquinas del centro espacial.
// =============================================================
const TAM = 32;
const mez = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const vr = (c, k, azar) => { const d = (azar() * 2 - 1) * k; return [c[0] + d, c[1] + d, c[2] + d]; };

function regolito({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez([112, 110, 106], [160, 157, 150], mezcla(x, y, 4));
    if (azar() < 0.07) c = [92, 90, 88];
    p(x, y, vr(c, 8, azar));
  }
}
function rocaLunar({ p, azar, mezcla, celdas }) {
  const cel = celdas(10);
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const k = cel[y * TAM + x];
    let c = mez([58, 58, 62], [96, 95, 98], mezcla(x, y, 4) * 0.7 + (k.cual % 3) * 0.1);
    if (k.borde < 1.2) c = [34, 34, 38];
    p(x, y, vr(c, 5, azar));
  }
}
function rocaAbismo({ p, azar, mezcla, celdas }) {
  const cel = celdas(9);
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const k = cel[y * TAM + x];
    let c = mez([96, 30, 26], [150, 52, 38], mezcla(x, y, 4) * 0.8 + (k.cual % 3) * 0.08);
    if (k.borde < 1.3) c = [46, 12, 12];
    else if (azar() < 0.03) c = [226, 98, 40];
    p(x, y, vr(c, 6, azar));
  }
}
function lava({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const n = mezcla(x, y, 4);
    let c = mez([226, 70, 8], [255, 190, 40], n * n * 1.6);
    if (n < 0.34) c = mez([140, 30, 6], [226, 70, 8], n * 3);
    if (azar() < 0.04) c = [255, 236, 130];
    p(x, y, vr(c, 6, azar));
  }
}
function rocaBrasa({ p, azar, mezcla, celdas }) {
  const cel = celdas(8);
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const k = cel[y * TAM + x];
    let c = mez([40, 16, 14], [78, 28, 20], mezcla(x, y, 4));
    if (k.borde < 2.2) c = mez([255, 120, 30], [255, 210, 90], Math.min(1, (2.2 - k.borde) / 2.2));
    p(x, y, vr(c, 6, azar));
  }
}
function portal({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const n = mezcla(x, y, 4), v = (Math.sin((x + y * 0.6) * 0.55 + n * 7) + 1) / 2;
    const borde = x < 2 || y < 2 || x > 29 || y > 29;
    if (v > 0.38 || borde) p(x, y, vr(mez([120, 40, 200], [236, 120, 255], v), 10, azar));
  }
}
function hormigon({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez([138, 141, 148], [166, 169, 176], mezcla(x, y, 4));
    if (x === 0 || y === 0) c = [104, 107, 114];
    p(x, y, vr(c, 4, azar));
  }
}
function metal({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = [196, 202, 212];
    if (x < 1 || y < 1 || x > 30 || y > 30) c = [104, 112, 126];
    else if (x === 16 || y === 16) c = [160, 168, 180];
    if ((x % 16 === 3 || x % 16 === 13) && (y % 16 === 3 || y % 16 === 13)) c = [110, 118, 130];
    p(x, y, vr(c, 3, azar));
  }
}
function plataformaArriba({ p, azar, mezcla }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez([58, 60, 66], [80, 82, 90], mezcla(x, y, 4));
    const franja = (x + y) % 16 < 8;
    if (x < 3 || y < 3 || x > 28 || y > 28) c = franja ? [244, 190, 30] : [30, 30, 34];
    p(x, y, vr(c, 4, azar));
  }
}
function plataformaLado({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = y < 5 ? ((x + y) % 16 < 8 ? [244, 190, 30] : [30, 30, 34]) : [82, 86, 94];
    if (x === 0 || x === 31) c = [50, 54, 60];
    p(x, y, vr(c, 4, azar));
  }
}
function consolaFrente({ p, azar }, tipo) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = [34, 40, 52];
    if (x < 2 || y < 2 || x > 29 || y > 29) c = [96, 104, 118];
    else if (y > 4 && y < 20 && x > 4 && x < 27) {
      c = [10, 24, 30];
      if (tipo === 'panel') { const barra = (x - 5) / 22; if (y > 14 && y < 18) c = barra < ((azar() * 0.2) + 0.6) ? [60, 230, 140] : [18, 60, 44]; else if (y % 4 === 0) c = [30, 120, 150]; }
      else if (tipo === 'nav') { const dx = x - 16, dy = y - 12; const r = Math.hypot(dx, dy); if (Math.abs(r - 6) < 0.9 || (Math.abs(dx) < 0.6 && r < 6) || (Math.abs(dy) < 0.6 && r < 6)) c = [80, 220, 255]; }
      else if (tipo === 'o2') { c = x > 12 && x < 20 ? [90, 200, 255] : [20, 50, 70]; }
    } else if (y > 21 && y < 29 && ((x + 2) % 6 < 3)) c = [200, 60, 60];
    p(x, y, vr(c, 3, azar));
  }
}
function maquinaLado({ p, azar }, acento) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = [208, 212, 220];
    if (x < 1 || y < 1 || x > 30 || y > 30) c = [110, 116, 128];
    else if (y > 25) c = acento;
    p(x, y, vr(c, 3, azar));
  }
}
function cargadorFrente({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = [236, 238, 242];
    if (x < 1 || y < 1 || x > 30 || y > 30) c = [150, 154, 162];
    if (y > 3 && y < 11 && x > 6 && x < 25) c = [14, 20, 28];
    // rayo
    const rx = x - 16, ry = y - 20;
    if (Math.abs(rx + (ry > 0 ? -1 : 1) * 0.0) < 3 - Math.abs(ry) * 0.25 && Math.abs(ry) < 8 && rx > -4 + ry * 0.3 && rx < 1 + ry * 0.3) c = [30, 220, 120];
    p(x, y, vr(c, 3, azar));
  }
}
function torreMetal({ p, azar }) {
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const diag = Math.abs(x - y) < 3 || Math.abs(x - (31 - y)) < 3, marco = x < 3 || y < 3 || x > 28 || y > 28;
    if (diag || marco) p(x, y, vr([200, 70, 50], 8, azar));
  }
}

export const NUEVAS_TEXTURAS = [
  'regolito', 'roca_lunar', 'roca_abismo', 'lava', 'roca_brasa', 'portal', 'hormigon', 'metal',
  'plataforma_arriba', 'plataforma_lado', 'panel_frente', 'nav_frente', 'o2_frente', 'cargador_frente', 'cargador_lado', 'fabrica_frente', 'fabrica_lado', 'torre_metal',
];

export const PINTORES_ESPACIO = {
  regolito, roca_lunar: rocaLunar, roca_abismo: rocaAbismo, lava, roca_brasa: rocaBrasa, portal, hormigon, metal,
  plataforma_arriba: plataformaArriba, plataforma_lado: plataformaLado,
  panel_frente: (u) => consolaFrente(u, 'panel'), nav_frente: (u) => consolaFrente(u, 'nav'), o2_frente: (u) => consolaFrente(u, 'o2'),
  cargador_frente: cargadorFrente, cargador_lado: (u) => maquinaLado(u, [30, 200, 110]),
  fabrica_frente: (u) => consolaFrente(u, 'panel'), fabrica_lado: (u) => maquinaLado(u, [240, 150, 30]),
  torre_metal: torreMetal,
};
export const RELIEVE_ESPACIO = { lava: 0.2, portal: 0.2, metal: 0.5, hormigon: 0.5 };
