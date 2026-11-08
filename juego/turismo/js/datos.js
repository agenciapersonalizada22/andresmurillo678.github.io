// Datos de Turismo Mundial: tablero circular de 40 casillas, continentes, cartas, eventos y reglas por defecto.
export const NUM = 40;
export const BANCO = -1, BOTE = -2, TODOS = -3;

export const CONTINENTES = [
  { id: 0, nombre: 'Oceanía', color: '#1fb5c9', alt: '#56b4e9', build: 50, sim: 'O' },
  { id: 1, nombre: 'África', color: '#d9822b', alt: '#e69f00', build: 50, sim: 'F' },
  { id: 2, nombre: 'Asia', color: '#e0463c', alt: '#d55e00', build: 100, sim: 'A' },
  { id: 3, nombre: 'Europa', color: '#3b6fd8', alt: '#0072b2', build: 150, sim: 'E' },
  { id: 4, nombre: 'América del Norte', color: '#3aa65a', alt: '#009e73', build: 150, sim: 'N' },
  { id: 5, nombre: 'América del Sur', color: '#a05bd6', alt: '#cc79a7', build: 200, sim: 'S' }
];
let daltonico = false;
export const usarDaltonico = (v) => { daltonico = !!v; };
export const colorCont = (g) => (daltonico ? CONTINENTES[g].alt : CONTINENTES[g].color);

export const NIVELES_EDIF = ['Sin construir', 'Museo', 'Parque temático', 'Estadio', 'Hotel resort'];
const MULT = [1, 7, 22, 65, 120];
const D = (i, nombre, cont, precio, famoso) => {
  const base = Math.max(2, Math.round(precio * 0.045 / 2) * 2);
  return { i, tipo: 'dest', nombre, grupo: cont, precio, famoso, renta: MULT.map((m) => base * m) };
};
const T = (i, tipo, nombre, extra) => Object.assign({ i, tipo, nombre }, extra || {});
const TR = (i, modo, nombre) => T(i, 'trans', nombre, { modo, precio: 200 });

export const CASILLAS = [
  T(0, 'salida', 'Salida'),
  D(1, 'Auckland', 0, 60, 'Sky Tower'), T(2, 'suerte', 'Suerte'), D(3, 'Melbourne', 0, 60, 'Federation Square'),
  T(4, 'impuesto', 'Tasa turística', { monto: 120 }), TR(5, 'aire', 'Aeropuerto Pacífico'),
  D(6, 'Sídney', 0, 100, 'Ópera de Sídney'), T(7, 'viaje', 'Viaje'), D(8, 'Bora Bora', 0, 120, 'Laguna azul'),
  D(9, 'Marrakech', 1, 120, 'Plaza Jemaa el-Fna'), T(10, 'retencion', 'Retención aduanera'), D(11, 'Nairobi', 1, 140, 'Parque Nacional'),
  TR(12, 'tren', 'Expreso Oriente'), D(13, 'El Cairo', 1, 140, 'Pirámides de Guiza'), D(14, 'Ciudad del Cabo', 1, 160, 'Montaña de la Mesa'),
  TR(15, 'mar', 'Crucero Índico'), D(16, 'Bangkok', 2, 180, 'Gran Palacio'), T(17, 'aduana', 'Aduana'),
  D(18, 'Seúl', 2, 180, 'Palacio Gyeongbokgung'), D(19, 'Dubái', 2, 200, 'Burj Khalifa'), T(20, 'libre', 'Zona franca'),
  D(21, 'Tokio', 2, 220, 'Torre de Tokio'), T(22, 'viaje', 'Viaje'), D(23, 'Madrid', 3, 240, 'Palacio Real'),
  D(24, 'Roma', 3, 240, 'Coliseo'), TR(25, 'aire', 'Aeropuerto Atlántico'), D(26, 'París', 3, 280, 'Torre Eiffel'),
  D(27, 'Londres', 3, 300, 'Big Ben'), T(28, 'aduana', 'Aduana'), TR(29, 'tren', 'Tren Bala'),
  D(30, 'Ciudad de México', 4, 280, 'Templo Mayor'), D(31, 'Los Ángeles', 4, 300, 'Hollywood'), T(32, 'suerte', 'Suerte'),
  D(33, 'Toronto', 4, 320, 'Torre CN'), D(34, 'Nueva York', 4, 340, 'Estatua de la Libertad'), TR(35, 'mar', 'Crucero Caribe'),
  D(36, 'Bogotá', 5, 340, 'Monserrate'), D(37, 'Lima', 5, 360, 'Machu Picchu'), D(38, 'Buenos Aires', 5, 380, 'Obelisco'),
  D(39, 'Río de Janeiro', 5, 400, 'Cristo Redentor')
];
export const TRANSPORTES = CASILLAS.filter((c) => c.tipo === 'trans').map((c) => c.i);
export const POR_CONT = CONTINENTES.map((g) => CASILLAS.filter((c) => c.grupo === g.id).map((c) => c.i));
export const DESTINOS = CASILLAS.filter((c) => c.tipo === 'dest').map((c) => c.i);
export const COMPRABLE = CASILLAS.map((c) => c.tipo === 'dest' || c.tipo === 'trans');
export const RETENCION = 10, LIBRE = 20;
export const RENTA_TRANS = [0, 25, 50, 100, 150, 200, 300];
export const MODOS_RUTA = {
  aire: { nombre: 'Vuelo', icono: '✈', tarifa: 150, dueno: 75, desc: 'Vuela a cualquier destino o estación.' },
  tren: { nombre: 'Tren', icono: '🚆', tarifa: 40, dueno: 0, desc: 'Avanza hasta 12 casillas por riel.' },
  mar: { nombre: 'Crucero', icono: '🚢', tarifa: 30, dueno: 0, desc: 'Navega hasta el otro puerto.' }
};

// Efectos: cobrar/pagar (banco), ir (casilla, cobra Salida si pasa), irTrans (transporte mas cercano; modo opcional), atras, retencion, pase (se guarda),
// reparar, deTodos (cobra a cada uno), aTodos (paga a cada uno), sello (sello gratis), evento (tipo)
export const VIAJE = [
  { x: 'Vuelo a Tokio: avanza hasta Tokio.', ef: { t: 'ir', a: 21 } },
  { x: 'Crucero de lujo: avanza hasta el puerto más cercano.', ef: { t: 'irTrans', k: 'mar' } },
  { x: 'Tren panorámico: avanza hasta la estación de tren más cercana.', ef: { t: 'irTrans', k: 'tren' } },
  { x: 'Retraso de vuelo: retrocede 3 casillas.', ef: { t: 'atras', n: 3 } },
  { x: 'Escapada a Roma: avanza hasta Roma.', ef: { t: 'ir', a: 24 } },
  { x: 'Pase de vuelo gratis. Úsalo en una ruta o para salir de la retención.', ef: { t: 'pase' } },
  { x: 'Conexión inmediata: avanza hasta el aeropuerto más cercano.', ef: { t: 'irTrans', k: 'aire' } },
  { x: 'Vuelta al mundo: avanza hasta la Salida y cobra.', ef: { t: 'ir', a: 0 } },
  { x: 'Carnaval: viaja a Río de Janeiro.', ef: { t: 'ir', a: 39 } },
  { x: 'Sorteo de pasaporte: recibes un sello de un destino que aún no visitaste.', ef: { t: 'sello' } },
  { x: 'Excursión a Sídney: avanza hasta Sídney.', ef: { t: 'ir', a: 6 } },
  { x: 'Descanso en Bora Bora: avanza hasta Bora Bora.', ef: { t: 'ir', a: 8 } }
];
export const ADUANA = [
  { x: 'Equipaje excedido: paga 50.', ef: { t: 'pagar', n: 50 } },
  { x: 'Declaración incompleta: multa de 100.', ef: { t: 'pagar', n: 100 } },
  { x: 'Control sorpresa: la aduana te retiene. Ve a la retención.', ef: { t: 'retencion' } },
  { x: 'Devolución de impuestos al turista: cobra 80.', ef: { t: 'cobrar', n: 80 } },
  { x: 'Souvenirs de más: paga 30.', ef: { t: 'pagar', n: 30 } },
  { x: 'Pase de aduana rápido. Úsalo en una ruta o para salir de la retención.', ef: { t: 'pase' } },
  { x: 'Reparaciones: paga 25 por cada edificio y 100 por hotel.', ef: { t: 'reparar', casa: 25, hotel: 100 } },
  { x: 'Seguro de viaje: cobra 100.', ef: { t: 'cobrar', n: 100 } },
  { x: 'Cambio de divisas desfavorable: paga 60.', ef: { t: 'pagar', n: 60 } },
  { x: 'Visa exprés para tus compañeros: paga 20 a cada jugador.', ef: { t: 'aTodos', n: 20 } },
  { x: 'Descuento por pasar rápido: cobra 40.', ef: { t: 'cobrar', n: 40 } },
  { x: 'Inspección en el aeropuerto: retrocede 2 casillas.', ef: { t: 'atras', n: 2 } }
];
export const SUERTE = [
  { x: 'Ganas una rifa de viaje: cobra 150.', ef: { t: 'cobrar', n: 150 } },
  { x: 'Te roban la billetera: paga 75.', ef: { t: 'pagar', n: 75 } },
  { x: 'Tu blog de viajes se vuelve viral: cada jugador te paga 25.', ef: { t: 'deTodos', n: 25 } },
  { x: 'Premio de fotografía: cobra 200.', ef: { t: 'cobrar', n: 200 } },
  { x: 'Regreso a casa: avanza hasta la Salida.', ef: { t: 'ir', a: 0 } },
  { x: 'Festival mundial: todos cobran 50 del banco.', ef: { t: 'evento', k: 'festival' } },
  { x: 'Hotel con sobreventa: paga 120.', ef: { t: 'pagar', n: 120 } },
  { x: 'Vendes fotos a una revista: cobra 50.', ef: { t: 'cobrar', n: 50 } },
  { x: 'Temporada alta en el continente donde estás.', ef: { t: 'evento', k: 'alta' } },
  { x: 'Huelga de transportes: las rutas de aire y tren se cierran.', ef: { t: 'evento', k: 'huelga' } },
  { x: 'Retrocede 3 casillas.', ef: { t: 'atras', n: 3 } },
  { x: 'Sello de cortesía: recibes un sello de un destino que aún no visitaste.', ef: { t: 'sello' } }
];
export const MAZOS = { v: VIAJE, a: ADUANA, s: SUERTE };
export const NOMBRE_MAZO = { v: 'VIAJE', a: 'ADUANA', s: 'SUERTE' };

export const EVENTOS = {
  alta: { nombre: 'Temporada alta', icono: '☀', dur: 3, desc: 'Las rentas del continente se duplican.' },
  baja: { nombre: 'Temporada baja', icono: '🌧', dur: 3, desc: 'Las rentas del continente bajan a la mitad.' },
  huelga: { nombre: 'Huelga de transportes', icono: '✊', dur: 2, desc: 'Vuelos y trenes cerrados.' },
  tormenta: { nombre: 'Tormenta en alta mar', icono: '⛈', dur: 2, desc: 'Cruceros cancelados.' },
  oferta: { nombre: 'Ofertón de vuelos', icono: '🎫', dur: 2, desc: 'Los vuelos son gratis.' },
  festival: { nombre: 'Festival mundial', icono: '🎉', dur: 0, desc: 'Todos cobran 50 del banco.' }
};
export const TIPOS_EVENTO = ['alta', 'baja', 'huelga', 'tormenta', 'oferta', 'festival'];

export const REGLAS_BASE = {
  modo: 'completo', dineroInicial: 1500, sueldo: 100, fianza: 50, bote: true, subastaObligatoria: true,
  construccionPareja: true, dominio: 3, hipotecaMitad: true, eventos: 4, bonoSello: 10, bonoContinente: 80, visaDescuento: true,
  metaSellos: 0, limiteMin: 0, limiteRondas: 0, temporizador: 0
};
export const MODOS_JUEGO = {
  completo: { nombre: 'Completo', desc: 'Gana el último viajero en pie.', reglas: { dineroInicial: 1500, sueldo: 100, eventos: 4, metaSellos: 0, limiteMin: 0 } },
  rapido: { nombre: 'Rápido', desc: 'Gana quien reúna 10 sellos en el pasaporte (o el último en pie).', reglas: { dineroInicial: 1000, sueldo: 200, eventos: 3, metaSellos: 10, limiteMin: 0 } },
  tiempo: { nombre: 'Por tiempo', desc: 'Al acabar el tiempo gana el mayor patrimonio con sellos.', reglas: { dineroInicial: 1500, sueldo: 100, eventos: 3, metaSellos: 0, limiteMin: 20 } }
};
export function reglasDeModo(modo, previas) {
  const m = MODOS_JUEGO[modo] || MODOS_JUEGO.completo;
  return Object.assign({}, REGLAS_BASE, previas || {}, m.reglas, { modo: MODOS_JUEGO[modo] ? modo : 'completo' });
}
export const OPC_REGLAS = {
  dineroInicial: [1000, 1500, 2000, 2500], limiteMin: [10, 20, 30, 45, 60], temporizador: [0, 30, 60, 90], eventos: [0, 5, 4, 3, 2], dominio: [2, 3, 4], metaSellos: [0, 6, 10, 15, 24]
};
export const NIVELES = ['Conservador', 'Medio', 'Agresivo'];
export const SELLO_PUNTOS = 30;
