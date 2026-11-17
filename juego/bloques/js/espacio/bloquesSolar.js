// =============================================================
//  🧱  BLOQUES Y MINERALES DEL SISTEMA SOLAR (solo datos)
//  Cada fila: [clave, nombre, tipo de dibujo, color A, color B, extras].
//  Los ids se asignan en orden desde 129 (los de siempre no cambian).
//  extras: { vena, item, itemNombre, color, dur, herr, tier, emision, liquido, sonido }
//  Las menas sueltan un objeto exclusivo de su cuerpo celeste.
// =============================================================
export const ID0_SOLAR = 129;

const m = (clave, nombre, a, b, vena, item, itemNombre, color, tier = 1) =>
  [clave, nombre, 'mena', a, b, { vena, item, itemNombre, color, dur: 3, herr: 'pico', tier, pide: true, sonido: 'piedra' }];
const roca = (clave, nombre, a, b) => [clave, nombre, 'roca', a, b, { dur: 1.8, herr: 'pico', pide: true, sonido: 'piedra' }];
const polvo = (clave, nombre, a, b) => [clave, nombre, 'polvo', a, b, { dur: 0.6, herr: 'pala', sonido: 'arena' }];
const hielo = (clave, nombre, a, b, vena) => [clave, nombre, 'hielo', a, b, { vena, dur: 0.6, herr: 'pico', sonido: 'vidrio' }];
const nube = (clave, nombre, a, b) => [clave, nombre, 'nube', a, b, { dur: 0.5, herr: 'ninguna', sonido: 'lana' }];

export const FILAS_SOLAR = [
  roca('roca_mercurio', 'Roca de Mercurio', [74, 70, 68], [124, 116, 110]),
  polvo('polvo_mercurio', 'Polvo de Mercurio', [118, 110, 102], [168, 158, 148]),
  m('mena_mercurio', 'Cinabrio de Mercurio', [74, 70, 68], [124, 116, 110], [196, 214, 230], 'mercurio_liquido', 'Mercurio líquido', '#c4d6e6'),
  roca('roca_venus', 'Basalto de Venus', [96, 58, 36], [156, 96, 56]),
  polvo('azufre', 'Azufre', [214, 192, 44], [252, 236, 112]),
  m('mena_venus', 'Venusita', [96, 58, 36], [156, 96, 56], [255, 150, 30], 'venusita', 'Venusita', '#ff9620', 2),
  nube('nube_acida', 'Nube ácida', [214, 184, 84], [246, 226, 140]),
  polvo('polvo_marte', 'Polvo rojo de Marte', [168, 78, 42], [214, 112, 62]),
  roca('roca_marte', 'Roca de Marte', [118, 50, 34], [164, 80, 52]),
  m('mena_marte', 'Hematita marciana', [118, 50, 34], [164, 80, 52], [200, 70, 60], 'hematita', 'Hematita', '#b8382c'),
  hielo('hielo_seco', 'Hielo seco', [228, 224, 232], [250, 248, 252]),
  roca('roca_asteroide', 'Roca de asteroide', [68, 64, 60], [108, 102, 94]),
  m('mena_platino', 'Platino de asteroide', [68, 64, 60], [108, 102, 94], [226, 236, 246], 'platino', 'Platino', '#e6eef6', 2),
  m('mena_espinela', 'Espinela de Fobos', [78, 66, 60], [122, 106, 96], [230, 60, 120], 'espinela', 'Espinela', '#e63c78'),
  m('mena_olivino', 'Olivino de Deimos', [86, 80, 70], [130, 122, 106], [150, 220, 70], 'olivino', 'Olivino', '#96dc46'),
  nube('nube_ambar', 'Nube ámbar', [196, 128, 68], [230, 172, 104]),
  nube('nube_crema', 'Nube crema', [232, 214, 180], [252, 240, 212]),
  nube('nube_roja', 'Nube de la Gran Mancha', [172, 66, 40], [204, 100, 62]),
  m('mena_amoniaco', 'Cristal de amoníaco', [196, 128, 68], [230, 172, 104], [190, 240, 230], 'amoniaco', 'Cristal de amoníaco', '#bef0e6'),
  roca('roca_io', 'Roca volcánica de Ío', [150, 128, 48], [206, 176, 64]),
  hielo('hielo_europa', 'Hielo de Europa', [206, 222, 236], [240, 248, 255]),
  hielo('hielo_agrietado', 'Hielo agrietado', [200, 214, 226], [232, 240, 250], [150, 100, 70]),
  m('mena_sal', 'Sal de Europa', [200, 214, 226], [232, 240, 250], [214, 150, 100], 'sal_europa', 'Sal de Europa', '#d69664'),
  roca('roca_ganimedes', 'Roca de Ganímedes', [84, 78, 74], [138, 130, 122]),
  hielo('hielo_ganimedes', 'Hielo de Ganímedes', [140, 150, 160], [190, 198, 208]),
  m('mena_magnetita', 'Magnetita de Ganímedes', [84, 78, 74], [138, 130, 122], [40, 40, 56], 'magnetita', 'Magnetita', '#383848'),
  roca('roca_calisto', 'Roca de Calisto', [46, 42, 40], [82, 76, 72]),
  m('mena_carbono', 'Carbono de Calisto', [46, 42, 40], [82, 76, 72], [200, 200, 210], 'carbono_calisto', 'Carbono cristalino', '#c8c8d2'),
  hielo('anillo_hielo', 'Hielo de los anillos', [238, 240, 246], [214, 220, 232]),
  roca('anillo_roca', 'Roca de los anillos', [152, 134, 110], [196, 176, 148]),
  polvo('arena_titan', 'Arena de Titán', [196, 128, 40], [230, 164, 72]),
  hielo('hielo_titan', 'Hielo de Titán', [168, 146, 112], [204, 184, 150]),
  ['metano', 'Metano líquido', 'liquido', [206, 116, 28], [246, 160, 60], { dur: 0, herr: 'ninguna', liquido: true, sonido: 'agua' }],
  m('mena_tolina', 'Tolina', [168, 146, 112], [204, 184, 150], [112, 48, 20], 'tolina', 'Tolina', '#703014'),
  nube('nube_urano', 'Nube de Urano', [136, 214, 222], [184, 242, 244]),
  nube('nube_neptuno', 'Nube de Neptuno', [46, 84, 196], [96, 136, 236]),
  hielo('hielo_azul', 'Hielo azul', [120, 180, 232], [170, 214, 250]),
  m('mena_deuterio', 'Hielo de deuterio', [120, 180, 232], [170, 214, 250], [236, 250, 255], 'deuterio', 'Deuterio', '#ecfaff'),
  m('mena_diamante_helado', 'Diamante helado', [46, 84, 196], [96, 136, 236], [120, 240, 255], 'diamante_helado', 'Diamante helado', '#78f0ff', 2),
  hielo('nitrogeno_pluton', 'Nitrógeno helado', [235, 210, 200], [250, 232, 222]),
  roca('roca_pluton', 'Roca de Plutón', [120, 80, 66], [160, 112, 92]),
  m('mena_nitrogeno', 'Cristal de nitrógeno', [235, 210, 200], [250, 232, 222], [255, 150, 170], 'nitrogeno_solido', 'Nitrógeno sólido', '#ff96aa'),
  roca('roca_kuiper', 'Roca de Kuiper', [100, 70, 70], [140, 100, 98]),
  m('mena_cometa', 'Polvo cometario', [100, 70, 70], [140, 100, 98], [180, 230, 255], 'polvo_cometario', 'Polvo cometario', '#b4e6ff'),
  ['ruina', 'Piedra misteriosa', 'ruina', [60, 64, 76], [96, 102, 120], { dur: 4, herr: 'pico', pide: true, tier: 2, sonido: 'piedra' }],
  ['runa', 'Runa luminosa', 'runa', [60, 64, 76], [90, 240, 220], { dur: 4, herr: 'pico', pide: true, tier: 2, emision: 10, sonido: 'vidrio' }],
  ['surtidor', 'Estación de reabastecimiento', 'surtidor', [200, 204, 212], [255, 150, 30], { dur: 2.5, herr: 'pico', usable: 'surtidor', emision: 8, sonido: 'piedra' }],
  ['cabina_nave', 'Casco de nave', 'cabina', [150, 158, 172], [60, 80, 110], { dur: 2.5, herr: 'pico', pide: true, sonido: 'piedra' }],
];

export const B_SOLAR = {};
FILAS_SOLAR.forEach((f, i) => { B_SOLAR[f[0].toUpperCase()] = ID0_SOLAR + i; });
export const ULTIMO_ID_SOLAR = ID0_SOLAR + FILAS_SOLAR.length - 1;

// id de bloque -> objeto exclusivo que suelta
export const ITEM_DE_MENA = {};
export const ITEMS_MENA = [];
for (const f of FILAS_SOLAR) if (f[5].item) { ITEM_DE_MENA[B_SOLAR[f[0].toUpperCase()]] = f[5].item; ITEMS_MENA.push({ clave: f[5].item, nombre: f[5].itemNombre, color: f[5].color }); }
