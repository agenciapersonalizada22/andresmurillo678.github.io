// Datos del juego: plantas, zombis, mundos, tienda y misiones. Todo original.
export const FILAS = 5, COLS = 9;
export const DIF = {
  facil: { n: 'Fácil', hp: 0.8, vel: 0.9, sol: 1.25, rec: 0.8, cort: true },
  normal: { n: 'Normal', hp: 1, vel: 1, sol: 1, rec: 1, cort: true },
  desafiante: { n: 'Desafiante', hp: 1.35, vel: 1.12, sol: 0.9, rec: 1.1, cort: false },
};

// t: comportamiento; c coste; rec recarga (s); hp vida. Resto: parametros del comportamiento.
export const P = {
  giras: { n: 'Girasolito', c: 50, rec: 7.5, hp: 300, rol: 'Productora', t: 'sol', cada: 24, val: 25, cant: 1, ini: 7, d: 'Cultiva energía solar: suelta un sol cada 24 s.' },
  dosol: { n: 'Dosol', c: 150, rec: 10, hp: 300, rol: 'Mejora', t: 'sol', cada: 24, val: 25, cant: 2, ini: 7, mejora: 'giras', d: 'Mejora el Girasolito: dos soles por ciclo.' },
  luci: { n: 'Lucinaga', c: 25, rec: 7.5, hp: 200, rol: 'Productora', t: 'sol', cada: 14, val: 15, cant: 1, ini: 5, hongo: 1, d: 'Hongo luminoso: pocos soles, pero muy barato.' },
  bonsai: { n: 'Bonsái monedero', c: 100, rec: 20, hp: 300, rol: 'Productora', t: 'moneda', cada: 30, val: 10, ini: 12, d: 'Da monedas (no energía) cada 30 s.' },
  dispa: { n: 'Disparaina', c: 100, rec: 7.5, hp: 300, rol: 'Lanzadora', t: 'tiro', cada: 1.4, dano: 20, raf: 1, d: 'Dispara semillas rectas por su carril.' },
  bidispa: { n: 'Bidispara', c: 200, rec: 10, hp: 300, rol: 'Mejora', t: 'tiro', cada: 1.4, dano: 20, raf: 2, mejora: 'dispa', d: 'Mejora la Disparaina: dos semillas por disparo.' },
  hielo: { n: 'Escarchina', c: 175, rec: 7.5, hp: 300, rol: 'Lanzadora', t: 'tiro', cada: 1.4, dano: 20, raf: 1, ef: 'hielo', d: 'Sus copos ralentizan; tres seguidos congelan.' },
  arco: { n: 'Arcoflor', c: 125, rec: 7.5, hp: 300, rol: 'Lanzadora en arco', t: 'tiro', cada: 2, dano: 30, raf: 1, arco: 1, area: 0.7, d: 'Lanza en arco: pasa por encima de rejas.' },
  trip: { n: 'Tripleta', c: 325, rec: 7.5, hp: 300, rol: 'Lanzadora', t: 'tiro', cada: 1.4, dano: 20, raf: 1, carriles: 3, d: 'Dispara a tres carriles a la vez.' },
  cacto: { n: 'Cactolote', c: 125, rec: 7.5, hp: 300, rol: 'Lanzadora', t: 'tiro', cada: 1.4, dano: 20, raf: 1, alto: 1, d: 'Sus espinas altas revientan globos.' },
  melon: { n: 'Sandialanza', c: 300, rec: 7.5, hp: 300, rol: 'Lanzadora en arco', t: 'tiro', cada: 2.2, dano: 80, raf: 1, arco: 1, area: 1.2, filas: 1, splash: 0.5, d: 'Sandías pesadas con daño de área.' },
  antorcha: { n: 'Antorchón', c: 175, rec: 7.5, hp: 300, rol: 'Apoyo', t: 'antorcha', d: 'Enciende los disparos que lo cruzan: doble daño.' },
  mante: { n: 'Mantequero', c: 125, rec: 7.5, hp: 300, rol: 'Apoyo', t: 'tiro', cada: 2.5, dano: 15, raf: 1, arco: 1, area: 0.5, ef: 'mante', d: 'Sus bolas pegajosas aturden 3 s.' },
  estrella: { n: 'Estrellafugaz', c: 125, rec: 7.5, hp: 300, rol: 'Lanzadora', t: 'estrella', cada: 1.8, dano: 20, d: 'Lanza estrellas en cinco direcciones.' },
  cereza: { n: 'Cerecilla', c: 150, rec: 35, hp: 300, rol: 'Explosiva', t: 'explota', radio: 1.6, dano: 1800, fuse: 1, d: 'Explota en un área de 3x3.' },
  chile: { n: 'Ají volcán', c: 125, rec: 35, hp: 300, rol: 'Explosiva', t: 'explota', fila: 1, dano: 1800, fuse: 0.8, d: 'Quema todo el carril.' },
  mina: { n: 'Papamina', c: 25, rec: 25, hp: 200, rol: 'Explosiva', t: 'mina', arma: 12, radio: 1, dano: 1800, d: 'Se arma en 12 s y vuela a quien la pise.' },
  coco: { n: 'Cocobomba', c: 250, rec: 50, hp: 300, rol: 'Explosiva', t: 'explota', radio: 2.6, dano: 2400, fuse: 1.6, d: 'Explosión enorme, recarga larguísima.' },
  nogal: { n: 'Nogal', c: 50, rec: 25, hp: 4000, rol: 'Muro', t: 'muro', d: 'Muro resistente que detiene zombis.' },
  nogal2: { n: 'Gran Nogal', c: 125, rec: 25, hp: 9000, rol: 'Mejora', t: 'muro', mejora: 'nogal', d: 'Mejora el Nogal: más del doble de vida.' },
  calaba: { n: 'Calabazón', c: 125, rec: 25, hp: 4000, rol: 'Muro', t: 'escudo', d: 'Se coloca sobre otra planta y recibe los mordiscos.' },
  pincho: { n: 'Pinchazo', c: 100, rec: 7.5, hp: 300, rol: 'Trampa', t: 'pincho', dps: 40, d: 'Hiere a quien camine encima; revienta vehículos.' },
  pinchorr: { n: 'Pinchorrey', c: 125, rec: 10, hp: 600, rol: 'Mejora', t: 'pincho', dps: 100, mejora: 'pincho', d: 'Mejora el Pinchazo: daño x2.5.' },
  mordelon: { n: 'Mordelón', c: 150, rec: 30, hp: 300, rol: 'Trampa', t: 'tragar', mastica: 30, d: 'Se traga un zombi entero y luego mastica 30 s.' },
  enred: { n: 'Enredadera', c: 75, rec: 20, hp: 300, rol: 'Trampa', t: 'enred', hold: 8, dps: 30, d: 'Atrapa a un zombi 8 s mientras lo estruja.' },
  esporin: { n: 'Esporín', c: 0, rec: 7.5, hp: 200, rol: 'Área', t: 'tiro', cada: 1.5, dano: 20, raf: 1, rango: 3.2, hongo: 1, d: 'Hongo gratuito de corto alcance.' },
  nieblon: { n: 'Nieblón', c: 75, rec: 7.5, hp: 250, rol: 'Área', t: 'tiro', cada: 1.5, dano: 20, raf: 1, rango: 4, ign: 1, hongo: 1, d: 'Su niebla ignora armaduras y rejas.' },
  hipno: { n: 'Hipnoseta', c: 75, rec: 30, hp: 200, rol: 'Área', t: 'hipno', hongo: 1, d: 'El primer zombi que la muerda se pasa a tu bando.' },
  dormi: { n: 'Dormiseta', c: 100, rec: 30, hp: 200, rol: 'Área', t: 'sueno', radio: 3.2, dur: 12, hongo: 1, d: 'Duerme 12 s a los zombis cercanos.' },
  escarba: { n: 'Escarbatumbas', c: 75, rec: 7.5, hp: 200, rol: 'Área', t: 'escarba', hongo: 1, d: 'Se planta sobre una tumba y la devora.' },
  faro: { n: 'Farolillo', c: 75, rec: 15, hp: 300, rol: 'Apoyo', t: 'faro', radio: 2.6, d: 'Disipa la niebla a su alrededor.' },
  soplo: { n: 'Sopladora', c: 100, rec: 20, hp: 200, rol: 'Apoyo', t: 'soplo', d: 'Un soplido: aleja la niebla 40 s y pincha globos.' },
  iman: { n: 'Imán solar', c: 100, rec: 15, hp: 300, rol: 'Apoyo', t: 'iman', cada: 8, rango: 4, d: 'Arranca cascos, cubos y rejas metálicas.' },
  ritmo: { n: 'Tamborín', c: 100, rec: 15, hp: 300, rol: 'Apoyo', t: 'ritmo', d: 'Sus vecinas actúan un 25 % más rápido.' },
  despierta: { n: 'Grano despertador', c: 75, rec: 30, hp: 100, rol: 'Apoyo', t: 'despierta', d: 'Despierta a los hongos durante 45 s de día.' },
  lirio: { n: 'Lirio', c: 25, rec: 7.5, hp: 300, rol: 'Agua', t: 'base', base: 'agua', d: 'Flota: permite plantar sobre el agua.' },
  alga: { n: 'Algatrampa', c: 125, rec: 20, hp: 300, rol: 'Agua', t: 'tragar', agua: 1, mastica: 25, d: 'Arrastra al fondo al zombi que pasa por su casilla.' },
  maceta: { n: 'Maceta', c: 25, rec: 7.5, hp: 300, rol: 'Tejado', t: 'base', base: 'tejado', d: 'Imprescindible para plantar en el tejado.' },
  col: { n: 'Coltapulta', c: 75, rec: 7.5, hp: 300, rol: 'Tejado', t: 'tiro', cada: 1.6, dano: 30, raf: 1, arco: 1, area: 0.4, d: 'Catapulta barata: sus tiros en arco salvan la pendiente.' },
};
export const IDS_P = Object.keys(P);
export const MEJORAS = IDS_P.filter((k) => P[k].mejora);

// Desbloqueo: al completar el nivel N (1..50) se gana la planta.
export const DESBLOQUEO = {
  1: 'giras', 2: 'nogal', 3: 'cereza', 4: 'hielo', 5: 'mina', 6: 'pincho', 7: 'chile', 8: 'arco', 9: 'antorcha', 10: 'luci',
  11: 'esporin', 12: 'trip', 13: 'nieblon', 14: 'hipno', 15: 'escarba', 16: 'dormi', 17: 'despierta', 18: 'mordelon', 19: 'cacto', 20: 'lirio',
  21: 'alga', 22: 'melon', 23: 'mante', 24: 'calaba', 25: 'estrella', 26: 'enred', 27: 'coco', 28: 'iman', 29: 'ritmo', 30: 'faro',
  31: 'soplo', 32: 'bonsai', 33: 'dosol', 34: 'bidispa', 35: 'pinchorr', 36: 'nogal2', 40: 'maceta', 41: 'col',
};
export function plantasDe(completados) { // completados: Set o array de indices 1..50
  const set = new Set(['dispa']); (completados.has ? [...completados] : completados).forEach((i) => { if (DESBLOQUEO[i]) set.add(DESBLOQUEO[i]); });
  return IDS_P.filter((k) => set.has(k));
}

// Zombis. v: velocidad (casillas/s); dps: dano a plantas por segundo; vl: valor para presupuestos de oleada.
export const Z = {
  paseante: { n: 'Paseante', hp: 200, v: 0.2, dps: 100, vl: 1, d: 'El clásico: camina y muerde.' },
  baliza: { n: 'Zombi baliza', hp: 200, v: 0.2, dps: 100, vl: 2, arm: { k: 'cono', hp: 370, metal: 1 }, d: 'Lleva una baliza naranja en la cabeza.' },
  cubero: { n: 'Cubero', hp: 200, v: 0.2, dps: 100, vl: 4, arm: { k: 'cubo', hp: 1100, metal: 1 }, d: 'Un cubo de hojalata lo protege.' },
  reja: { n: 'Zombi reja', hp: 200, v: 0.2, dps: 100, vl: 3, arm: { k: 'reja', hp: 600, metal: 1, frente: 1 }, d: 'Su reja frena disparos rectos; los arcos pasan por encima.' },
  corredor: { n: 'Raudo', hp: 180, v: 0.55, v2: 0.2, dps: 100, vl: 2, d: 'Corre hasta tropezar con la primera planta.' },
  pertiguista: { n: 'Pertiguista', hp: 200, v: 0.5, v2: 0.2, dps: 100, vl: 3, salta: 1, d: 'Salta por encima de la primera planta.' },
  vallista: { n: 'Vallista', hp: 220, v: 0.45, v2: 0.22, dps: 100, vl: 3, salta: 2, d: 'Salta sobre las dos primeras plantas.' },
  rumbero: { n: 'Rumbero', hp: 450, v: 0.18, dps: 100, vl: 5, baila: 1, d: 'Baila e invoca a cuatro coristas cada 9 s.' },
  coro: { n: 'Corista', hp: 200, v: 0.22, dps: 100, vl: 1, d: 'Acompañante del Rumbero.' },
  topo: { n: 'Topo zombi', hp: 280, v: 0.4, dps: 100, vl: 3, cava: 1, d: 'Cava bajo las plantas y ataca por detrás.' },
  globero: { n: 'Globero', hp: 200, v: 0.25, dps: 100, vl: 3, vuelo: 1, d: 'Vuela con un globo: solo espinas altas lo alcanzan.' },
  coloso: { n: 'Coloso', hp: 3000, v: 0.14, dps: 0, aplasta: 1800, cada: 1.2, vl: 12, grande: 1, lanza: 'enano', d: 'Aplasta plantas de un golpe y lanza un enano.' },
  honda: { n: 'Zombi honda', hp: 600, v: 0.17, dps: 100, vl: 6, tira: 6, d: 'Dispara rocas a tus plantas desde lejos.' },
  nadador: { n: 'Nadador', hp: 200, v: 0.25, dps: 100, vl: 2, agua: 1, d: 'Va sumergido en el agua: solo lo ven de cerca.' },
  flotador: { n: 'Flotador', hp: 200, v: 0.2, dps: 100, vl: 2, arm: { k: 'aro', hp: 150 }, d: 'Un aro de goma lo protege.' },
  pulidora: { n: 'Pulidora de hielo', hp: 1100, v: 0.3, dps: 0, vl: 6, vehiculo: 1, d: 'Vehículo: aplasta plantas y deja hielo.' },
  lector: { n: 'Lector', hp: 200, v: 0.2, dps: 100, vl: 3, arm: { k: 'diario', hp: 150 }, rabia: 1, d: 'Se enfurece si pierde el periódico.' },
  perrillo: { n: 'Perrillo', hp: 110, v: 0.6, dps: 60, vl: 1, d: 'Rápido y frágil.' },
  gargola: { n: 'Gárgola', hp: 450, v: 0.22, dps: 100, vl: 4, piedra: 1, d: 'De piedra: resiste disparos y el hielo.' },
  paracaidas: { n: 'Paracaidista', hp: 200, v: 0.2, dps: 100, vl: 2, cae: 1, d: 'Aterriza en medio de tu jardín.' },
  armadura: { n: 'Armadura', hp: 270, v: 0.15, dps: 120, vl: 6, arm: { k: 'armadura', hp: 1000, metal: 1 }, d: 'Coraza metálica muy pesada.' },
  espectro: { n: 'Espectro', hp: 220, v: 0.28, dps: 100, vl: 3, fase: 1, d: 'Se vuelve intangible en fases.' },
  yeti: { n: 'Yeti', hp: 420, v: 0.22, dps: 100, vl: 4, inmuneHielo: 1, d: 'Inmune al hielo.' },
  tambor: { n: 'Tamborilero', hp: 300, v: 0.2, dps: 100, vl: 3, arm: { k: 'tambor', hp: 100 }, aura: 1, d: 'Los zombis cercanos andan un 30 % más rápido.' },
  pocero: { n: 'Pocero', hp: 300, v: 0.2, dps: 100, vl: 3, pozo: 1, d: 'Abre un pozo bajo la primera planta que toca.' },
  escalero: { n: 'Escalero', hp: 200, v: 0.2, dps: 100, vl: 3, arm: { k: 'escalera', hp: 400 }, escala: 1, d: 'Apoya una escalera para pasar sobre muros.' },
  enano: { n: 'Enano', hp: 130, v: 0.35, dps: 60, vl: 1, d: 'Pequeño y veloz; lo lanza el Coloso.' },
  capataz: { n: 'Capataz colosal', hp: 6000, v: 0.12, dps: 0, aplasta: 1500, cada: 1.5, vl: 25, grande: 1, jefe: 1, arm: { k: 'casco', hp: 3000, metal: 1 }, invoca: 'baliza', d: 'Jefe de mundo: pisotea y llama refuerzos.' },
  moho: { n: 'Doctor Moho', hp: 14000, v: 0, dps: 0, vl: 50, grande: 1, jefe: 1, final: 1, d: 'Jefe final: invoca, aplasta y apaga tus plantas.' },
};
export const IDS_Z = Object.keys(Z);

export const MUNDOS = [
  { id: 1, n: 'Jardín soleado', cielo: 1, noche: 0, agua: [], niebla: 0, tejado: 0, tumbas: 0, col: '#7cd35a', musica: 'dia' },
  { id: 2, n: 'Bosque de medianoche', cielo: 0, noche: 1, agua: [], niebla: 0, tejado: 0, tumbas: 1, col: '#5b6bd6', musica: 'noche' },
  { id: 3, n: 'Piscina del vecino', cielo: 1, noche: 0, agua: [2, 3], niebla: 0, tejado: 0, tumbas: 0, col: '#4ec3e8', musica: 'piscina' },
  { id: 4, n: 'Pantano brumoso', cielo: 0, noche: 1, agua: [], niebla: 1, tejado: 0, tumbas: 0, col: '#8aa89a', musica: 'niebla' },
  { id: 5, n: 'Tejados del barrio', cielo: 1, noche: 0, agua: [], niebla: 0, tejado: 1, tumbas: 0, col: '#d9895a', musica: 'tejado' },
];

export const TIENDA = [
  { id: 'ranura7', n: 'Ranura de semilla 7', d: 'Una semilla más en el cargador.', p: 400, req: null },
  { id: 'ranura8', n: 'Ranura de semilla 8', d: 'Otra semilla más.', p: 1200, req: 'ranura7' },
  { id: 'ranura9', n: 'Ranura de semilla 9', d: 'La novena ranura.', p: 3000, req: 'ranura8' },
  { id: 'solini', n: 'Energía inicial +50', d: 'Empiezas cada nivel con 50 de energía extra.', p: 600, req: null },
  { id: 'rec1', n: 'Recarga rápida I', d: 'Semillas recargan 10 % más rápido.', p: 500, req: null },
  { id: 'rec2', n: 'Recarga rápida II', d: 'Otro 10 % más rápido.', p: 1500, req: 'rec1' },
  { id: 'palaoro', n: 'Pala de oro', d: 'Al quitar una planta recuperas la mitad de su coste.', p: 800, req: null },
  { id: 'cortTurbo', n: 'Cortadoras turbo', d: 'Más veloces y pasan dos veces.', p: 1000, req: null },
  { id: 'cortFuego', n: 'Cortadoras de fuego', d: 'Además de segar, queman todo el carril.', p: 2000, req: 'cortTurbo' },
  { id: 'cortHielo', n: 'Cortadoras de hielo', d: 'Siegan y congelan el resto del carril.', p: 2000, req: 'cortTurbo' },
  { id: 'solgrande', n: 'Soles brillantes', d: 'Los soles del cielo valen 30 en vez de 25.', p: 900, req: null },
  { id: 'abono', n: 'Paquete de abono x5', d: 'Cinco abonos para el Jardín Zen.', p: 150, req: null, consumible: 1 },
  { id: 'zenSlot', n: 'Parcela zen extra', d: 'Una parcela más en el Jardín Zen (máx. 4 extra).', p: 500, req: null, multi: 4 },
];

export const MISIONES = [
  { id: 'm_plantas', n: 'Jardinero', d: 'Planta 100 plantas', meta: 100, cnt: 'plantadas', rec: 100 },
  { id: 'm_zombis', n: 'Cazador', d: 'Derrota 200 zombis', meta: 200, cnt: 'matados', rec: 150 },
  { id: 'm_soles', n: 'Recolector', d: 'Recoge 1000 de energía solar', meta: 1000, cnt: 'soles', rec: 100 },
  { id: 'm_niveles', n: 'Aventurero', d: 'Gana 5 niveles', meta: 5, cnt: 'victorias', rec: 200 },
  { id: 'm_cort', n: 'Sin cortadoras', d: 'Gana 3 niveles sin gastar cortadoras', meta: 3, cnt: 'sinCort', rec: 250 },
  { id: 'm_surv', n: 'Superviviente', d: 'Sobrevive 10 oleadas en un modo supervivencia', meta: 10, cnt: 'mejorSurv', rec: 300, max: 1 },
  { id: 'm_zen', n: 'Zen', d: 'Vende 5 plantas del Jardín Zen', meta: 5, cnt: 'zenVentas', rec: 200 },
  { id: 'm_mini', n: 'Jugador de feria', d: 'Gana 3 minijuegos', meta: 3, cnt: 'minis', rec: 250 },
  { id: 'm_versus', n: 'Duelo de jardines', d: 'Juega 2 partidas Jardín contra Jardín', meta: 2, cnt: 'versus', rec: 150 },
  { id: 'm_jarr', n: 'Rompe-jarrones', d: 'Rompe 20 jarrones', meta: 20, cnt: 'jarrones', rec: 150 },
];
