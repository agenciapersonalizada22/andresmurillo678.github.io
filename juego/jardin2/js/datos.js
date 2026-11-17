// Datos puros: plantas, zombis, mundos y tienda de Jardin Zombi 2. Sin DOM.
export const FILAS = 5, COLS = 9;

/* ---------- plantas ---------- */
// pl(id, nombre, rol, k, coste, recarga, hp, params, vis, colores, energia[prim, params, nombre])
export const P = {};
export const IDS_P = [];
const pl = (id, n, rol, k, coste, rec, hp, a, vis, col, en, ex) => { P[id] = { id, n, rol, k, coste, rec, hp, ...a, vis, col, en: { k: en[0], ...en[1], nom: en[2] }, ...(ex || {}) }; IDS_P.push(id); };

pl('chispera', 'Chispera', 'Economía', 'prod', 50, 5, 150, { pr: 25, int: 7.5 }, 'flor', ['#ffd94a', '#ff9d2e'], ['prodburst', { n: 10, v: 25 }, 'Lluvia Dorada']);
pl('brote', 'Brote Disparador', 'Tirador', 'tira', 100, 5, 250, { d: 18, int: 1.4 }, 'bulbo', ['#6fdc4a', '#2f8f2a'], ['frenesi', { dur: 6, mult: 5, dano: 1.5 }, 'Furia de Semillas']);
pl('roble', 'Tronco Roble', 'Muro', 'muro', 50, 20, 900, {}, 'tronco', ['#a8743c', '#6d4521'], ['espinas', { dano: 60, dur: 8, rad: 1.3 }, 'Corteza Eterna']);
pl('petardo', 'Fruta Petardo', 'Explosivo', 'bomba', 150, 30, 100, { rad: 1.5, d: 600, fuse: 0.7 }, 'fruta', ['#ff4a4a', '#9c1d1d'], ['meteoros', { n: 5, d: 500, rad: 1.6 }, 'Lluvia Explosiva']);
pl('espina', 'Cactus Púa', 'Tirador', 'tira', 125, 6, 250, { d: 12, int: 1.1, perf: 1, aereo: 1 }, 'cactus', ['#3fbf6a', '#1d6b3a'], ['haz', { d: 260, filas: [-1, 0, 1] }, 'Barrido de Espinas']);
pl('mina', 'Bulbo Mina', 'Trampa', 'mina', 25, 20, 100, { arm: 6, rad: 0.8, d: 700 }, 'bulboTierra', ['#b9825a', '#ff5d5d'], ['trampas', { n: 6 }, 'Campo Minado']);
pl('escarcha', 'Flor Escarcha', 'Control', 'tira', 150, 6, 250, { d: 14, int: 1.4, ef: { fr: 3 } }, 'flor', ['#8fe3ff', '#3a9edc'], ['cong', { dur: 5 }, 'Era Glacial']);
pl('pinchos', 'Zarza Pinchos', 'Trampa', 'trampa', 100, 8, 300, { d: 20, int: 0.5 }, 'zarza', ['#78b04a', '#44662a'], ['alfombra', { d: 40, dur: 10 }, 'Tapiz Cortante']);
pl('luciernaga', 'Luciérnaga Doble', 'Economía', 'prod', 125, 6, 150, { pr: 50, int: 8 }, 'flor', ['#fff27a', '#ffb02e'], ['prodburst', { n: 16, v: 25 }, 'Constelación']);
pl('panal', 'Panal Pegajoso', 'Muro', 'muro', 75, 20, 600, { sticky: 1 }, 'panal', ['#ffc23d', '#c47d00'], ['tiempo', { dur: 7, f: 0.5 }, 'Néctar del Tiempo']);
pl('brasa', 'Chile Brasa', 'Explosivo', 'bomba', 125, 35, 100, { fila: 1, d: 400, fuse: 0.6, ef: { qm: 4 } }, 'fruta', ['#ff6a2b', '#a31a00'], ['ola', { d: 350, emp: 0, ef: { qm: 4 } }, 'Marea de Magma']);
pl('cometa', 'Flor Cometa', 'Artillería', 'lob', 175, 8, 250, { d: 40, int: 2.2, rad: 0.8, ef: { qm: 3 } }, 'flor', ['#ff9a4a', '#ff4a8a'], ['meteoros', { n: 3, d: 700, rad: 1.8 }, 'Cometa Gigante']);
pl('doblebrote', 'Doble Brote', 'Tirador', 'tira', 200, 6, 250, { d: 18, int: 1.4, nb: 2 }, 'bulbo2', ['#7be35a', '#2c8a26'], ['clones', { dur: 8 }, 'Eco Gemelo']);
pl('nenufar', 'Nenúfar Plataforma', 'Soporte', 'base', 25, 5, 150, {}, 'nenufar', ['#4fd1a5', '#1d7f63'], ['cura', { pct: 0.8, dur: 6 }, 'Burbuja Vital']);
pl('arpon', 'Arpón Marino', 'Tirador', 'tira', 150, 7, 250, { d: 22, int: 1.5, perf: 1, vsAgua: 2 }, 'cactus', ['#46b7d8', '#1a6b8a'], ['haz', { d: 400, filas: [0], ef: { fr: 3 } }, 'Lanza Abisal']);
pl('bumeran', 'Bumerán Verde', 'Tirador', 'tira', 175, 7, 250, { d: 20, int: 1.8, boom: 1 }, 'bulbo', ['#9be04a', '#4a8a1a'], ['ola', { d: 150, emp: 0, dos: 1 }, 'Ciclón Bumerán']);
pl('erizo', 'Erizo Guardián', 'Muro', 'muro', 100, 20, 800, { thorn: 20 }, 'erizo', ['#9a7a5a', '#5a3d27'], ['espinas', { dano: 120, dur: 10, rad: 1.5 }, 'Tormenta de Púas']);
pl('trebol', 'Trébol Trifila', 'Tirador', 'tira', 275, 8, 250, { d: 14, int: 1.5, carr: [-1, 0, 1] }, 'trebol', ['#3fd16a', '#1d8a3a'], ['haz', { d: 180, filas: [-2, -1, 0, 1, 2] }, 'Suerte Total']);
pl('faro', 'Faro Fulgor', 'Soporte', 'aura', 100, 12, 200, { rad: 1.5, rate: 1.25 }, 'faro', ['#fff59a', '#e8c43a'], ['inspira', { dur: 8, mult: 2, dano: 1 }, 'Amanecer']);
pl('amapola', 'Amapola Sueño', 'Control', 'sueno', 125, 14, 200, { int: 14, dur: 3, rad: 1.6 }, 'flor', ['#d87bff', '#7a2fb0'], ['sueno', { dur: 6 }, 'Nana Cósmica']);
pl('veneno', 'Hongo Toxina', 'Control', 'tira', 150, 8, 250, { d: 10, int: 1.4, ef: { ve: 6 } }, 'hongo', ['#b6e84a', '#6a8a1a'], ['peste', { dps: 30, dur: 8 }, 'Nube de Peste']);
pl('mortero', 'Melón Mortero', 'Artillería', 'lob', 225, 10, 300, { d: 90, int: 3.5, rad: 1.1 }, 'melon', ['#5fd16a', '#c4324a'], ['meteoros', { n: 8, d: 200, rad: 1.2 }, 'Granizada de Melones']);
pl('reloj', 'Flor Reloj', 'Control', 'aura', 150, 14, 200, { rad: 1.5, slow: 0.4 }, 'reloj', ['#9fd0ff', '#3a6bd8'], ['rebobinar', { cols: 4 }, 'Rebobinar']);
pl('ambar', 'Gota de Ámbar', 'Economía', 'prod', 125, 8, 150, { pr: 75, int: 22 }, 'gota', ['#ffb347', '#c46a00'], ['prodburst', { n: 8, v: 75 }, 'Cosecha de Ámbar']);
pl('tambor', 'Tambor de Raíz', 'Soporte', 'aura', 125, 12, 250, { rad: 1.1, dano: 1.3 }, 'tambor', ['#d98a4a', '#7a4a1f'], ['inspira', { dur: 8, mult: 1.5, dano: 2 }, 'Ritmo de Guerra']);
pl('cepo', 'Cepo Carnívoro', 'Trampa', 'cepo', 75, 25, 200, { chew: 25 }, 'cepo', ['#e0476a', '#8a1a3a'], ['nova', { rad: 1.1, d: 1500 }, 'Gran Bocado']);
pl('espejo', 'Espejo Pulido', 'Muro', 'muro', 100, 20, 700, { refl: 1 }, 'espejo', ['#cfe9ff', '#7aa6cc'], ['domo', { rad: 2, dur: 8, cura: 0.5, refl: 1 }, 'Domo Espejo']);
pl('rayo', 'Orquídea Rayo', 'Tirador', 'rayo', 225, 9, 250, { d: 35, int: 1.6, cad: 3 }, 'flor', ['#b98bff', '#ffe84a'], ['tormenta', { n: 12, d: 150, dur: 4, rad: 0.8 }, 'Tormenta Eléctrica']);
pl('tornado', 'Hoja Torbellino', 'Control', 'tornado', 150, 12, 250, { int: 9, emp: 1.5, d: 20 }, 'hoja', ['#a6f0c8', '#4aa87a'], ['rebobinar', { cols: 3, dano: 80 }, 'Gran Torbellino']);
pl('glacial', 'Brote Glacial', 'Explosivo', 'bomba', 200, 40, 100, { cong: 4, d: 20, rad: 99, fuse: 0.5 }, 'fruta', ['#bfefff', '#4a9ad8'], ['cong', { dur: 8, d: 150 }, 'Invierno Eterno']);
pl('bambu', 'Bambú Regenerante', 'Muro', 'muro', 75, 18, 700, { regen: 25 }, 'bambu', ['#9ad84a', '#4a8a1a'], ['muralla', { hp: 1200 }, 'Bosque de Bambú']);
pl('nube', 'Nube Trueno', 'Artillería', 'tormenta', 175, 10, 200, { int: 5, d: 80, rad: 0.9 }, 'nube', ['#9aa8c8', '#ffe84a'], ['tormenta', { n: 20, d: 120, dur: 6, rad: 0.9 }, 'Diluvio Eléctrico']);
pl('prisma', 'Cristal Prisma', 'Tirador', 'tira', 250, 9, 250, { d: 20, int: 1.5, split: 1 }, 'cristal', ['#ff8ad8', '#6ad8ff'], ['haz', { d: 220, filas: [-2, -1, 0, 1, 2] }, 'Espectro Total']);
pl('iman', 'Flor Imán', 'Soporte', 'iman', 100, 12, 200, { int: 8, alc: 4 }, 'iman', ['#ff6a6a', '#6a6aff'], ['imanazo', { d: 200 }, 'Polo Opuesto']);
pl('guardian', 'Guardián de Hojas', 'Soporte', 'aura', 150, 14, 300, { rad: 1.5, cura: 15 }, 'espantapajaros', ['#d8c07a', '#7a5a2a'], ['cura', { pct: 1, dur: 8 }, 'Bendición del Bosque']);
pl('farol', 'Farolillo Lunar', 'Soporte', 'luz', 75, 10, 150, { rad: 1.5, rate: 1.15 }, 'farol', ['#ffe6a0', '#ff9a4a'], ['nova', { rad: 9, d: 100 }, 'Destello Solar']);
pl('eco', 'Hoja Eco', 'Tirador', 'tira', 225, 8, 250, { d: 12, int: 1.9, rafaga: 3 }, 'hoja', ['#7ad8c4', '#2a8a7a'], ['frenesi', { dur: 5, mult: 6, dano: 1 }, 'Resonancia']);
pl('magma', 'Flor Magma', 'Tirador', 'tira', 200, 8, 400, { d: 28, int: 1.6, ef: { qm: 4 }, ignifugo: 1 }, 'flor', ['#ff7a2a', '#8a1a00'], ['ola', { d: 500, emp: 0, ef: { qm: 5 } }, 'Erupción']);
pl('ballesta', 'Ballesta Enredadera', 'Tirador', 'tira', 175, 8, 250, { d: 90, int: 3.2, perf: 1, penArm: 1 }, 'ballesta', ['#8fd860', '#4a6a2a'], ['haz', { d: 1200, filas: [0], perf: 1 }, 'Disparo Definitivo']);
pl('paradoja', 'Flor Paradoja', 'Control', 'paradoja', 200, 18, 200, { int: 14 }, 'reloj', ['#ff9aff', '#8a3ad8'], ['rebobinar', { cols: 9, stun: 3 }, 'Paradoja Total']);
pl('rafaga', 'Metralla Silvestre', 'Tirador', 'tira', 250, 9, 250, { d: 9, int: 2.2, rafaga: 5 }, 'bulbo', ['#c8e84a', '#6a8a1a'], ['frenesi', { dur: 5, mult: 8, dano: 1 }, 'Lluvia de Plomo Verde']);
// premium (gemas)
pl('roca', 'Roca Musgo', 'Muro', 'muro', 125, 30, 2400, {}, 'roca', ['#8a9a8a', '#4a6a4a'], ['gigante', { dur: 10 }, 'Titán de Piedra'], { g: 60 });
pl('coral', 'Muro Coral', 'Muro', 'muro', 75, 20, 700, { flota: 1 }, 'coral', ['#ff8a8a', '#d84a6a'], ['ola', { d: 200, emp: 1 }, 'Maremoto'], { g: 80 });
pl('fosil', 'Helecho Fósil', 'Muro', 'muro', 100, 20, 700, { revive: 15 }, 'helecho', ['#c8b88a', '#7a6a3a'], ['ola', { d: 300, emp: 0.5 }, 'Estampida Fósil'], { g: 100 });
pl('solar', 'Cristal Solar', 'Economía', 'prod', 150, 6, 150, { pr: 25, int: 3.5 }, 'cristal', ['#fff07a', '#ff9a1a'], ['prodburst', { n: 20, v: 25 }, 'Supernova de Chispas'], { g: 120 });
pl('dragon', 'Dragoncillo Ígneo', 'Tirador', 'tira', 300, 10, 350, { d: 45, int: 1.2, perf: 1, ef: { qm: 4 } }, 'dragon', ['#ff5a3a', '#ffc24a'], ['haz', { d: 800, filas: [-1, 0, 1], ef: { qm: 5 } }, 'Aliento de Dragón'], { g: 150 });
pl('singular', 'Flor Singular', 'Híbrida', 'prod', 175, 8, 250, { pr: 15, int: 5, d: 10, tiraInt: 1.4 }, 'flor', ['#9a8aff', '#4af0d0'], ['meteoros', { n: 10, d: 300, rad: 1.4 }, 'Singularidad'], { g: 130 });
const ORDEN_U = ['chispera', 'brote', 'roble', 'petardo', 'mina', 'nenufar', 'espina', 'escarcha', 'arpon', 'pinchos', 'luciernaga', 'panal', 'brasa', 'cometa', 'doblebrote', 'bumeran', 'erizo', 'faro', 'amapola', 'veneno', 'reloj', 'ambar', 'tambor', 'cepo', 'trebol', 'espejo', 'rayo', 'tornado', 'glacial', 'bambu', 'nube', 'prisma', 'iman', 'guardian', 'farol', 'mortero', 'eco', 'magma', 'ballesta', 'paradoja', 'rafaga'];
IDS_P.forEach((id, i) => { const p = P[id]; p.orden = i; const k = ORDEN_U.indexOf(id); p.u = p.g || k < 0 ? 0 : (k < 2 ? 0 : (k - 1) * 3 - (k > 7 ? 0 : 0)); });
export const PLANTAS_INICIALES = ['chispera', 'brote'];

/* ---------- zombis ---------- */
export const Z = {}, IDS_Z = [];
// z(id, nombre, hp, v, dps, mundo, tier, peso, {h:[habilidades], arm:{hp,t,metal,frente}, vis:{...}})
const z = (id, n, hp, v, dps, mundo, tier, peso, o) => { Z[id] = { id, n, hp, v, dps, mundo, tier, peso, h: [], vis: {}, ...(o || {}) }; IDS_Z.push(id); };
const V = (piel, ropa, acc, ex, esc) => ({ piel, ropa, acc, ex, esc: esc || 1 });
// 0 Arenas Antiguas
z('momia', 'Momia Errante', 180, 0.2, 40, 0, 1, 1, { vis: V('#c9b98a', '#e8dcc0', 'venda') });
z('momia_c', 'Momia Vendada', 180, 0.2, 40, 0, 2, 2, { arm: { hp: 160, t: 'venda' }, vis: V('#c9b98a', '#e8dcc0', 'turbante') });
z('escarabajo', 'Enjambre Escarabajo', 70, 0.55, 30, 0, 2, 1, { h: ['rapido'], vis: V('#2a4a6a', '#1a2a4a', 'insecto', '', 0.7) });
z('sacerdote', 'Sacerdote de Arena', 160, 0.18, 30, 0, 3, 3, { h: ['cura'], vis: V('#b09a6a', '#2a8a8a', 'chacal') });
z('coloso', 'Coloso de Barro', 1000, 0.1, 120, 0, 4, 6, { h: ['gigante'], vis: V('#a8794a', '#8a5a34', 'estatua', '', 1.5) });
z('faraon', 'Faraón Cronos', 4200, 0.09, 90, 0, 5, 0, { jefe: 1, h: ['invoca', 'escudoT'], boss: 'momia_c', vis: V('#d4c070', '#2a6ad8', 'corona', 'capa', 1.7) });
// 1 Mares Piratas
z('grumete', 'Grumete Salado', 190, 0.2, 40, 1, 1, 1, { vis: V('#9ac0a0', '#c84a4a', 'pañuelo') });
z('barril', 'Marino del Barril', 190, 0.2, 40, 1, 2, 2, { arm: { hp: 170, t: 'barril' }, vis: V('#9ac0a0', '#4a6aa8', 'pañuelo') });
z('loro', 'Loro Bombardero', 90, 0.38, 30, 1, 2, 2, { h: ['vuelo'], vis: V('#e84a4a', '#3ad84a', 'alas', '', 0.8) });
z('canonero', 'Cañonero Bravo', 200, 0.17, 30, 1, 3, 3, { h: ['lanza'], lz: { r: 4, d: 45, t: 3.2 }, vis: V('#9ac0a0', '#2a2a3a', 'tricornio', 'cañon') });
z('pulpo', 'Kraken Menor', 1100, 0.1, 110, 1, 4, 6, { h: ['gigante'], vis: V('#a04ad8', '#7a2ab0', 'tentaculo', '', 1.5) });
z('capitan', 'Capitán Marea', 4500, 0.09, 95, 1, 5, 0, { jefe: 1, h: ['invoca', 'lanza', 'embiste'], boss: 'grumete', lz: { r: 5, d: 70, t: 2.6 }, vis: V('#9ac0a0', '#2a3a8a', 'tricornio', 'gancho', 1.7) });
// 2 Frontera del Oeste
z('vaquero', 'Vaquero Polvoriento', 190, 0.21, 40, 2, 1, 1, { vis: V('#d0a878', '#8a5a2a', 'sombrero') });
z('bandolero', 'Bandolero Veloz', 150, 0.45, 35, 2, 2, 2, { h: ['rapido'], vis: V('#d0a878', '#5a2a2a', 'pañuelo') });
z('dinamitero', 'Dinamitero Loco', 160, 0.3, 0, 2, 3, 3, { h: ['explota'], vis: V('#d0a878', '#aa3a2a', 'sombrero', 'dinamita') });
z('jinete', 'Jinete de Mula', 180, 0.5, 45, 2, 3, 3, { h: ['monta'], arm: { hp: 240, t: 'montura', mont: 1 }, vis: V('#d0a878', '#3a5a8a', 'sombrero', 'montura') });
z('sheriff', 'Sheriff de Hojalata', 200, 0.17, 45, 2, 4, 4, { h: ['escudo'], arm: { hp: 200, t: 'chapa', metal: 1 }, vis: V('#d0a878', '#5a5a6a', 'sombrero', 'escudo') });
z('locomotora', 'Bandido Locomotora', 4600, 0.1, 100, 2, 5, 0, { jefe: 1, h: ['invoca', 'embiste', 'lanza'], boss: 'bandolero', lz: { r: 4, d: 60, t: 2.8 }, arm: { hp: 900, t: 'chapa', metal: 1 }, vis: V('#d0a878', '#2a2a2a', 'sombrero', 'tren', 1.8) });
// 3 Edad de Hielo
z('cavernicola', 'Cavernícola Peludo', 200, 0.2, 40, 3, 1, 1, { vis: V('#e0b890', '#c8c0b0', 'piel') });
z('pinguino', 'Pingüino Patinador', 120, 0.5, 30, 3, 2, 2, { h: ['rapido'], vis: V('#2a2a3a', '#f0f0f8', 'pico', '', 0.8) });
z('yeti', 'Yeti Bolazo', 320, 0.15, 50, 3, 3, 4, { h: ['lanza'], lz: { r: 4, d: 55, t: 3.4 }, vis: V('#e8f0ff', '#cfe0ff', 'yeti', '', 1.2) });
z('mamut', 'Mamut Colosal', 1200, 0.1, 130, 3, 4, 6, { h: ['gigante'], vis: V('#8a6a4a', '#6a4a2a', 'colmillos', '', 1.6) });
z('reyglaciar', 'Rey Glaciar', 4800, 0.09, 95, 3, 5, 0, { jefe: 1, h: ['invoca', 'rugido', 'escudoT'], boss: 'pinguino', vis: V('#bfe8ff', '#4a8ad8', 'corona', 'hielo', 1.8) });
// 4 Era Medieval
z('escudero', 'Escudero Oxidado', 200, 0.2, 40, 4, 1, 1, { vis: V('#d0b090', '#6a6a8a', 'yelmo') });
z('caballero', 'Caballero Hueco', 220, 0.16, 50, 4, 3, 4, { arm: { hp: 420, t: 'armadura', metal: 1 }, vis: V('#d0b090', '#8a8a9a', 'casco') });
z('arquero', 'Arquero Fantasma', 170, 0.2, 30, 4, 2, 2, { h: ['lanza'], lz: { r: 5, d: 30, t: 2.0 }, vis: V('#c8d8c0', '#3a6a3a', 'capucha', 'arco') });
z('catapulta', 'Catapultero', 300, 0.13, 40, 4, 4, 5, { h: ['lanza'], lz: { r: 6, d: 110, t: 5 }, vis: V('#d0b090', '#7a4a2a', 'yelmo', 'catapulta', 1.2) });
z('mago', 'Mago Brumoso', 200, 0.18, 30, 4, 3, 3, { h: ['cura', 'teleporta'], vis: V('#c8b8e0', '#5a3aa8', 'gorromago') });
z('reyhueco', 'Rey Hueco', 5000, 0.09, 100, 4, 5, 0, { jefe: 1, h: ['invoca', 'embiste', 'lluvia'], boss: 'caballero', arm: { hp: 1200, t: 'armadura', metal: 1 }, vis: V('#d0b090', '#7a2a8a', 'corona', 'capa', 1.8) });
// 5 Futuro Lejano
z('robot', 'Robot Chatarra', 200, 0.2, 45, 5, 1, 1, { arm: { hp: 120, t: 'chapa', metal: 1 }, vis: V('#8aa8b8', '#4a6a8a', 'antena') });
z('dron', 'Dron Acechador', 100, 0.4, 30, 5, 2, 2, { h: ['vuelo'], vis: V('#9ac0d0', '#2a6a8a', 'helice', '', 0.8) });
z('androide', 'Androide Escudo', 220, 0.18, 45, 5, 3, 3, { h: ['escudo'], arm: { hp: 260, t: 'escudoE', metal: 1 }, vis: V('#c8d8e8', '#2a4a8a', 'visor', 'escudo') });
z('clon', 'Clon Fractal', 280, 0.2, 40, 5, 3, 4, { h: ['parte'], vis: V('#7af0c8', '#2a8a7a', 'visor') });
z('saltoportal', 'Saltaportales', 180, 0.22, 35, 5, 4, 3, { h: ['teleporta'], vis: V('#c8a8ff', '#6a3ad8', 'visor') });
z('automata', 'Autómata Prima', 5200, 0.09, 105, 5, 5, 0, { jefe: 1, h: ['invoca', 'lluvia', 'escudoT'], boss: 'robot', arm: { hp: 1400, t: 'chapa', metal: 1 }, vis: V('#8aa8b8', '#d84a8a', 'antena', 'reactor', 1.8) });
// 6 Selva Perdida
z('cazador', 'Cazador de Hojas', 210, 0.2, 40, 6, 1, 1, { vis: V('#b88a5a', '#4a7a3a', 'plumas') });
z('chaman', 'Chamán de Musgo', 180, 0.17, 30, 6, 3, 3, { h: ['cura'], vis: V('#b88a5a', '#7a3ab0', 'mascara') });
z('mono', 'Mono Acróbata', 130, 0.3, 30, 6, 2, 2, { h: ['salto'], vis: V('#7a5a3a', '#a8782a', 'cola', '', 0.85) });
z('gorila', 'Gorila Titán', 1100, 0.11, 125, 6, 4, 6, { h: ['gigante'], vis: V('#3a3a3a', '#2a2a2a', 'gorila', '', 1.6) });
z('liana', 'Cazalianas', 200, 0.2, 20, 6, 3, 3, { h: ['atrapa'], vis: V('#7ab04a', '#3a7a2a', 'liana') });
z('ceiba', 'Titán Ceiba', 5400, 0.08, 105, 6, 5, 0, { jefe: 1, h: ['invoca', 'rugido', 'atrapa'], boss: 'mono', vis: V('#6a8a3a', '#3a5a1a', 'corona', 'raices', 1.9) });
// 7 Era Jurasica
z('hombrecueva', 'Hombre de las Cuevas', 220, 0.2, 45, 7, 1, 1, { vis: V('#d0a078', '#8a6a3a', 'hueso') });
z('raptor', 'Raptor Fugaz', 150, 0.5, 40, 7, 2, 2, { h: ['rapido'], vis: V('#6ab04a', '#3a7a2a', 'dino', '', 0.9) });
z('ptero', 'Pterodáctilo', 110, 0.36, 30, 7, 2, 2, { h: ['vuelo'], vis: V('#c87a4a', '#a85a2a', 'alas', '', 0.9) });
z('trike', 'Tricerátops Acorazado', 500, 0.12, 80, 7, 4, 5, { arm: { hp: 600, t: 'cuerno', frente: 1 }, vis: V('#7ab05a', '#4a8a3a', 'cuernos', '', 1.4) });
z('bronto', 'Brontoide', 1300, 0.09, 140, 7, 4, 7, { h: ['gigante'], vis: V('#6a9a6a', '#4a7a4a', 'cuello', '', 1.7) });
z('rex', 'Rex Primordial', 5600, 0.1, 115, 7, 5, 0, { jefe: 1, h: ['invoca', 'embiste', 'rugido'], boss: 'raptor', vis: V('#5a9a3a', '#2a6a1a', 'dino', 'dientes', 2) });
// 8 Mundo Neon
z('raver', 'Raver Fluorescente', 190, 0.22, 40, 8, 1, 1, { vis: V('#ff8ad8', '#3ad8ff', 'neon') });
z('holograma', 'Holograma Titilante', 170, 0.2, 35, 8, 3, 3, { h: ['fase'], vis: V('#8affd8', '#4a8aff', 'neon') });
z('dj', 'DJ Bajo Profundo', 240, 0.17, 30, 8, 3, 4, { h: ['buff'], vis: V('#ff8ad8', '#8a3aff', 'auriculares', 'bafle') });
z('glitch', 'Glitch Errático', 170, 0.26, 35, 8, 3, 3, { h: ['teleporta'], vis: V('#ffff6a', '#ff3a8a', 'neon') });
z('robotluz', 'Robot de Luz', 250, 0.18, 50, 8, 4, 4, { h: ['escudo'], arm: { hp: 280, t: 'escudoE', metal: 1 }, vis: V('#6affff', '#2a8a8a', 'visor', 'escudo') });
z('amobajo', 'Amo del Bajo', 5800, 0.1, 105, 8, 5, 0, { jefe: 1, h: ['invoca', 'buff', 'fase', 'lluvia'], boss: 'raver', vis: V('#ff8ad8', '#5a1aff', 'auriculares', 'bafle', 1.8) });
// 9 Luna
z('astronauta', 'Astronauta Errante', 230, 0.2, 45, 9, 1, 1, { arm: { hp: 140, t: 'casco' }, vis: V('#d0c8c0', '#e8e8f0', 'astro') });
z('alien', 'Alien Planeador', 120, 0.36, 30, 9, 2, 2, { h: ['vuelo'], vis: V('#7af07a', '#3a9a3a', 'antenas', '', 0.85) });
z('gravedad', 'Saltarín Lunar', 160, 0.32, 35, 9, 3, 3, { h: ['salto'], vis: V('#d0c8c0', '#8a8aff', 'astro') });
z('meteorista', 'Meteorista', 260, 0.15, 40, 9, 3, 4, { h: ['lanza'], lz: { r: 5, d: 90, t: 4 }, vis: V('#d0c8c0', '#aa5a2a', 'astro', 'cañon') });
z('cosmopulpo', 'Pulpo Cósmico', 1400, 0.1, 130, 9, 4, 7, { h: ['gigante', 'atrapa'], vis: V('#8a4ad8', '#5a2a98', 'tentaculo', '', 1.7) });
z('emperador', 'Emperador Orbital', 6500, 0.1, 110, 9, 5, 0, { jefe: 1, h: ['invoca', 'lluvia', 'rugido', 'escudoT'], boss: 'astronauta', vis: V('#d0c8c0', '#6a1ad8', 'corona', 'capa', 2) });
// fiesta: pinata
z('pinata', 'Zombi Piñata', 260, 0.24, 20, -1, 9, 0, { pinata: 1, vis: V('#ff8ad8', '#ffd84a', 'fiesta') });
z('vagoneta', 'Vagoneta Minera', 700, 0, 0, -1, 9, 0, { vago: 1, vis: V('#7a5a3a', '#4a4a52', 'carro', '', 1) });
// minions de invocacion (sin mundo propio)
export const POOL_MUNDO = (m) => IDS_Z.filter((id) => Z[id].mundo === m && !Z[id].jefe);

/* ---------- mundos ---------- */
export const MUNDOS = [
  { id: 'arenas', n: 'Arenas Antiguas', col: '#e8b85a', fondo: ['#f4d88a', '#d9a752'], mec: 'tumbas', mecN: 'Tumbas', mecD: 'Las tumbas liberan momias cada cierto tiempo. Tócalas varias veces para romperlas o vuela una con una explosión.', estrellas: 0, musica: 'arenas', jefe: 'faraon', terr: 'arena' },
  { id: 'mares', n: 'Mares Piratas', col: '#3fb7d8', fondo: ['#7ad8ee', '#2a8ab8'], mec: 'agua', mecN: 'Tablones y agua', mecD: 'Los carriles 2 y 3 son agua: solo se planta sobre tablones, nenúfares o plantas flotantes. Los zombis nadan más rápido.', estrellas: 6, musica: 'mares', jefe: 'capitan', terr: 'mar' },
  { id: 'oeste', n: 'Frontera del Oeste', col: '#d9803a', fondo: ['#f0c088', '#b8743a'], mec: 'rieles', mecN: 'Rieles con vagonetas', mecD: 'Por los carriles con rieles ruedan vagonetas con zombis. Avisan antes de llegar: ponles un muro delante.', estrellas: 14, musica: 'oeste', jefe: 'locomotora', terr: 'oeste' },
  { id: 'hielo', n: 'Edad de Hielo', col: '#8ad8ff', fondo: ['#d8f0ff', '#8ab8d8'], mec: 'hielo', mecN: 'Hielo resbaloso', mecD: 'Los zombis ganan velocidad al pisar el hielo. Las plantas de fuego derriten las casillas heladas.', estrellas: 24, musica: 'hielo', jefe: 'reyglaciar', terr: 'hielo' },
  { id: 'medieval', n: 'Era Medieval', col: '#9a8ad8', fondo: ['#b8c8a8', '#7a8a6a'], mec: 'almenas', mecN: 'Almenas y puentes', mecD: 'Las almenas dan +40% de daño a la planta que las ocupa. El puente levadizo se cierra a ratos y frena a los zombis.', estrellas: 36, musica: 'medieval', jefe: 'reyhueco', terr: 'medieval' },
  { id: 'futuro', n: 'Futuro Lejano', col: '#6ad8c8', fondo: ['#1a2a4a', '#0a1a30'], mec: 'portales', mecN: 'Portales', mecD: 'Los portales conectan carriles: zombis y disparos que los cruzan reaparecen en el portal pareja.', estrellas: 50, musica: 'futuro', jefe: 'automata', terr: 'futuro', noche: 1 },
  { id: 'selva', n: 'Selva Perdida', col: '#4ab84a', fondo: ['#7ad86a', '#2a7a3a'], mec: 'viento', mecN: 'Ráfagas de viento', mecD: 'Ráfagas empujan zombis y frenan o aceleran los disparos. Se anuncian con una flecha.', estrellas: 66, musica: 'selva', jefe: 'ceiba', terr: 'selva' },
  { id: 'jurasico', n: 'Era Jurásica', col: '#e8683a', fondo: ['#d8a868', '#7a4a2a'], mec: 'lava', mecN: 'Lava y erupciones', mecD: 'Casillas de lava hacen erupción con aviso: queman todo lo que no sea ignífugo.', estrellas: 84, musica: 'jurasico', jefe: 'rex', terr: 'jurasico' },
  { id: 'neon', n: 'Mundo Neón', col: '#ff5ad8', fondo: ['#2a0a4a', '#14062a'], mec: 'apagon', mecN: 'Apagones', mecD: 'Las casillas oscuras desactivan a sus plantas. Los farolillos y faros las protegen.', estrellas: 104, musica: 'neon', jefe: 'amobajo', terr: 'neon', noche: 1 },
  { id: 'luna', n: 'Luna', col: '#aab8e8', fondo: ['#1a1a3a', '#0a0a22'], mec: 'pistas', mecN: 'Pistas de aterrizaje', mecD: 'Naves aterrizan en pistas señaladas: aplastan la casilla y sueltan zombis en medio del jardín.', estrellas: 126, musica: 'luna', jefe: 'emperador', terr: 'luna', noche: 1 },
];
export const NIV_POR_MUNDO = 12;

/* ---------- tienda y progresion ---------- */
export const PODERES = [
  { id: 'pellizcar', n: 'Pellizcar', ic: '🤏', coste: 15, d: 'Pellizca a un zombi: 150 de daño y lo aturde 1,5 s.' },
  { id: 'sacudir', n: 'Sacudir', ic: '🫨', coste: 25, d: 'Sacude a un zombi: pierde la armadura y queda aturdido 2,5 s.' },
  { id: 'lanzar', n: 'Lanzar', ic: '🖐', coste: 30, d: 'Agarra a un zombi y arrástralo a otro carril o lánzalo hacia atrás.' },
];
export const POTENCIAR_MAX = 5;
export const costePotenciar = (p, lv) => Math.round((P[p].coste * 1.6 + 100) * lv * (1 + lv * 0.35) / 5) * 5; // lv = nivel actual (1..4) -> sube a lv+1
export const SLOTS_BASE = 6, SLOTS_MAX = 10;
export const costeRanura = (n) => 40 + (n - SLOTS_BASE - 1) * 40; // gemas: 40, 80, 120, 160
export const PACKS = [
  { id: 'energia1', n: 'Energía inicial +1', d: 'Empiezas cada nivel con una carga extra de Energía Verde (máx. 3).', g: 50, max: 2 },
  { id: 'chispas', n: 'Chispas iniciales +50', d: 'Empiezas cada nivel con 50 chispas más.', m: 600, max: 1 },
  { id: 'recarga', n: 'Semillas rápidas', d: 'Las semillas recargan un 15% más rápido.', g: 70, max: 1 },
  { id: 'pulso', n: 'Pulso temporal doble', d: 'Cada carril tiene dos usos de su último recurso.', g: 90, max: 1 },
  { id: 'poder10', n: 'Pack de dedo x10', d: 'Diez usos gratis de poderes de dedo (se gastan antes que las monedas).', m: 250 },
];
export const REQ_MUNDO = (m) => ({ estrellas: MUNDOS[m].estrellas, llave: m > 0 ? m - 1 : -1 });

export const MUNDO_ZOMBIS = (m) => IDS_Z.filter((id) => Z[id].mundo === m && !Z[id].jefe);
export const desbloqueada = (id, hechosN, tienda) => { const p = P[id]; return !!p && (p.g ? !!(tienda && tienda['p_' + id]) : hechosN >= p.u); };
