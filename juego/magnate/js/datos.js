// Datos del tablero, barrios, cartas y reglas de la casa de Magnate (todo original).
export const NUM = 40;
export const BANCO = -1, BOTE = -2, TODOS = -3;

export const GRUPOS = [
  { id: 0, nombre: 'Puerto Viejo', color: '#8d5a3b', casa: 50, sim: 'A' },
  { id: 1, nombre: 'Mercado', color: '#7ad7f0', casa: 50, sim: 'B' },
  { id: 2, nombre: 'Jardines', color: '#d94fa8', casa: 100, sim: 'C' },
  { id: 3, nombre: 'Feria', color: '#f08a24', casa: 100, sim: 'D' },
  { id: 4, nombre: 'Arsenal', color: '#e0463c', casa: 150, sim: 'E' },
  { id: 5, nombre: 'Teatros', color: '#f2d03b', casa: 150, sim: 'F' },
  { id: 6, nombre: 'Bosque Alto', color: '#2fa65a', casa: 200, sim: 'G' },
  { id: 7, nombre: 'Cumbre', color: '#2c4fd0', casa: 200, sim: 'H' }
];

const MULT = [1, 5, 15, 45, 65, 90];
const P = (i, nombre, grupo, precio) => {
  const base = Math.max(2, Math.round(precio * 0.045 / 2) * 2);
  return { i, tipo: 'prop', nombre, grupo, precio, renta: MULT.map((m) => base * m) };
};
const T = (i, tipo, nombre, extra) => Object.assign({ i, tipo, nombre }, extra || {});
const EST = (i, nombre) => T(i, 'estacion', nombre, { precio: 200 });
const SRV = (i, nombre) => T(i, 'servicio', nombre, { precio: 150 });

export const CASILLAS = [
  T(0, 'salida', 'Salida'), P(1, 'Muelle Gris', 0, 50), T(2, 'comunidad', 'Comunidad'), P(3, 'Callejón del Faro', 0, 70),
  T(4, 'impuesto', 'Impuesto de Obras', { monto: 200 }), EST(5, 'Aeropuerto Aurora'), P(6, 'Plaza Naranja', 1, 90),
  T(7, 'suerte', 'Suerte'), P(8, 'Calle del Pan', 1, 100), P(9, 'Paseo del Trigo', 1, 120),
  T(10, 'carcel', 'Cárcel / Visita'), P(11, 'Jardín Rosa', 2, 140), SRV(12, 'Central Eléctrica'), P(13, 'Avenida Magnolia', 2, 140),
  P(14, 'Parque Orquídea', 2, 160), EST(15, 'Estación Central'), P(16, 'Feria Vieja', 3, 180), T(17, 'comunidad', 'Comunidad'),
  P(18, 'Calle del Circo', 3, 180), P(19, 'Noria Mayor', 3, 200), T(20, 'libre', 'Parada Libre'), P(21, 'Arsenal Norte', 4, 220),
  T(22, 'suerte', 'Suerte'), P(23, 'Fundición', 4, 220), P(24, 'Calle del Yunque', 4, 240), EST(25, 'Aeródromo Brisa'),
  P(26, 'Teatro Real', 5, 260), P(27, 'Calle del Telón', 5, 260), SRV(28, 'Acueducto'), P(29, 'Gran Ópera', 5, 280),
  T(30, 'ircarcel', 'Ir a la Cárcel'), P(31, 'Bosque Alto', 6, 300), P(32, 'Sendero del Pino', 6, 300), T(33, 'comunidad', 'Comunidad'),
  P(34, 'Mirador Verde', 6, 320), EST(35, 'Puerto Aéreo Ocaso'), T(36, 'suerte', 'Suerte'), P(37, 'Torre Cumbre', 7, 350),
  T(38, 'impuesto', 'Tasa de Lujo', { monto: 100 }), P(39, 'Palacio Magnate', 7, 400)
];
export const ESTACIONES = [5, 15, 25, 35];
export const SERVICIOS = [12, 28];
export const POR_GRUPO = GRUPOS.map((g) => CASILLAS.filter((c) => c.grupo === g.id).map((c) => c.i));
export const COMPRABLE = CASILLAS.map((c) => c.tipo === 'prop' || c.tipo === 'estacion' || c.tipo === 'servicio');
export const CARCEL = 10, IR_CARCEL = 30, LIBRE = 20;

// Efectos: cobrar/pagar (banco), ir (casilla), cercano (estacion|servicio), atras, carcel, tarjeta, reparar, deTodos (cobra a cada uno), aTodos (paga a cada uno)
export const SUERTE = [
  { x: 'Avanza hasta la Salida y cobra tu sueldo.', ef: { t: 'ir', a: 0 } },
  { x: 'Avanza hasta Torre Cumbre.', ef: { t: 'ir', a: 37 } },
  { x: 'Avanza hasta Jardín Rosa. Si pasas por la Salida, cobras.', ef: { t: 'ir', a: 11 } },
  { x: 'Avanza a la estación o aeropuerto más cercano. Si tiene dueño, paga el doble.', ef: { t: 'cercano', k: 'estacion' } },
  { x: 'Avanza a la estación o aeropuerto más cercano. Si tiene dueño, paga el doble.', ef: { t: 'cercano', k: 'estacion' } },
  { x: 'Avanza al servicio más cercano. Si tiene dueño, paga 10 veces los dados.', ef: { t: 'cercano', k: 'servicio' } },
  { x: 'El banco te paga dividendos: cobra 50.', ef: { t: 'cobrar', n: 50 } },
  { x: 'Sal de la cárcel gratis. Conserva esta tarjeta.', ef: { t: 'tarjeta' } },
  { x: 'Retrocede 3 casillas.', ef: { t: 'atras', n: 3 } },
  { x: 'Ve directo a la cárcel. No pasas por la Salida.', ef: { t: 'carcel' } },
  { x: 'Reparaciones generales: paga 25 por casa y 100 por hotel.', ef: { t: 'reparar', casa: 25, hotel: 100 } },
  { x: 'Multa por exceso de velocidad: paga 15.', ef: { t: 'pagar', n: 15 } },
  { x: 'Viaje al Aeropuerto Aurora. Si pasas por la Salida, cobras.', ef: { t: 'ir', a: 5 } },
  { x: 'Te eligen presidente de la junta: paga 50 a cada jugador.', ef: { t: 'aTodos', n: 50 } },
  { x: 'Tus edificios se revalorizan: cobra 150.', ef: { t: 'cobrar', n: 150 } },
  { x: 'Ganas el concurso de repostería: cobra 100.', ef: { t: 'cobrar', n: 100 } }
];
export const COMUNIDAD = [
  { x: 'Avanza hasta la Salida y cobra tu sueldo.', ef: { t: 'ir', a: 0 } },
  { x: 'Error del banco a tu favor: cobra 200.', ef: { t: 'cobrar', n: 200 } },
  { x: 'Honorarios del médico: paga 50.', ef: { t: 'pagar', n: 50 } },
  { x: 'Vendes entradas del teatro: cobra 50.', ef: { t: 'cobrar', n: 50 } },
  { x: 'Sal de la cárcel gratis. Conserva esta tarjeta.', ef: { t: 'tarjeta' } },
  { x: 'Ve directo a la cárcel. No pasas por la Salida.', ef: { t: 'carcel' } },
  { x: 'Es tu cumpleaños: cada jugador te da 10.', ef: { t: 'deTodos', n: 10 } },
  { x: 'Devolución de impuestos: cobra 20.', ef: { t: 'cobrar', n: 20 } },
  { x: 'Vence tu seguro de vida: cobra 100.', ef: { t: 'cobrar', n: 100 } },
  { x: 'Gastos de hospital: paga 100.', ef: { t: 'pagar', n: 100 } },
  { x: 'Matrícula de la escuela: paga 50.', ef: { t: 'pagar', n: 50 } },
  { x: 'Recibes una herencia: cobra 100.', ef: { t: 'cobrar', n: 100 } },
  { x: 'Arreglo de calles: paga 40 por casa y 115 por hotel.', ef: { t: 'reparar', casa: 40, hotel: 115 } },
  { x: 'Ganas un premio de fotografía: cobra 10.', ef: { t: 'cobrar', n: 10 } },
  { x: 'Retrocede hasta el Muelle Gris.', ef: { t: 'irAtras', a: 1 } },
  { x: 'Vendes acciones: cobra 45.', ef: { t: 'cobrar', n: 45 } }
];

export const REGLAS_BASE = {
  dineroInicial: 1500, sueldo: 200, multaCarcel: 50,
  bote: false, subastaObligatoria: true, sinRentaCarcel: false, bonoSalida: false,
  construccionPareja: true, limiteMin: 0, hipotecaMitad: true, temporizador: 0, limiteTurnos: 0
};
export const OPC_REGLAS = {
  dineroInicial: [1000, 1500, 2000, 2500], limiteMin: [0, 30, 60, 90, 120], temporizador: [0, 30, 60, 90]
};
export const NIVELES = ['Conservador', 'Medio', 'Agresivo'];
export const MAX_CASAS = 32, MAX_HOTELES = 12;
