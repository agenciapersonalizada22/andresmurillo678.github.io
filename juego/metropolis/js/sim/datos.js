// Catálogo de edificios, niveles de ciudad, investigación, misiones y logros.
export const HORA_SEG = 1.5;        // segundos reales por hora de juego a x1
export const DIA_HORAS = 24;

export const NIVELES = [
  { id: 0, nombre: 'Aldea', pop: 0 },
  { id: 1, nombre: 'Pueblo', pop: 120 },
  { id: 2, nombre: 'Ciudad', pop: 1000 },
  { id: 3, nombre: 'Metrópolis', pop: 5000 },
  { id: 4, nombre: 'Megalópolis', pop: 15000 },
];

export const CATEGORIAS = [
  { id: 'vias', nombre: 'Vías' },
  { id: 'zonas', nombre: 'Zonas' },
  { id: 'energia', nombre: 'Energía' },
  { id: 'agua', nombre: 'Agua' },
  { id: 'servicios', nombre: 'Servicios' },
  { id: 'parques', nombre: 'Parques' },
  { id: 'deco', nombre: 'Adornos' },
  { id: 'monumentos', nombre: 'Monumentos' },
  { id: 'terreno', nombre: 'Terreno' },
];

const I = (o) => Object.assign({
  w: 1, h: 1, costo: 0, mant: 0, nivel: 0, tech: null, radio: 0, prod: 0, consE: 0, consA: 0,
  trabajos: 0, contam: 0, serv: null, tipo: 'edificio', mej: false, bono: null, desc: '',
}, o);

export const ITEMS = [
  I({ id: 'calle', nombre: 'Calle', cat: 'vias', tipo: 'via', costo: 8, mant: 0.3, desc: 'Conecta tus edificios. Arrastra para trazar.' }),
  I({ id: 'avenida', nombre: 'Avenida', cat: 'vias', tipo: 'via', costo: 22, mant: 0.8, tech: 'avenidas', desc: 'Triple capacidad de tráfico.' }),

  I({ id: 'zonaR', nombre: 'Residencial', cat: 'zonas', tipo: 'zona', zona: 'R', costo: 10, desc: 'Casas y edificios de vivienda. Arrastra para zonificar.' }),
  I({ id: 'zonaC', nombre: 'Comercial', cat: 'zonas', tipo: 'zona', zona: 'C', costo: 14, desc: 'Tiendas y oficinas: empleos e impuestos.' }),
  I({ id: 'zonaI', nombre: 'Industrial', cat: 'zonas', tipo: 'zona', zona: 'I', costo: 14, desc: 'Fábricas: muchos empleos, algo de humo.' }),

  I({ id: 'eolica', mej: true, nombre: 'Turbina eólica', cat: 'energia', serv: 'energia', costo: 450, mant: 4, prod: 30, radio: 7, trabajos: 1, desc: 'Energía limpia y barata. Alcance 7.' }),
  I({ id: 'carbon', mej: true, nombre: 'Planta de carbón', cat: 'energia', serv: 'energia', w: 3, h: 3, costo: 5500, mant: 55, prod: 450, radio: 16, contam: 4, trabajos: 20, nivel: 1, desc: 'Mucha energía, pero contamina.' }),
  I({ id: 'solar', mej: true, nombre: 'Campo solar', cat: 'energia', serv: 'energia', w: 2, h: 2, costo: 2600, mant: 8, prod: 140, radio: 11, trabajos: 3, nivel: 1, tech: 'solar', desc: 'Energía limpia sin humo.' }),
  I({ id: 'nuclear', mej: true, nombre: 'Planta nuclear', cat: 'energia', serv: 'energia', w: 3, h: 3, costo: 28000, mant: 260, prod: 2200, radio: 22, trabajos: 60, nivel: 3, tech: 'fision', desc: 'Energía enorme para una metrópolis.' }),

  I({ id: 'bomba', mej: true, nombre: 'Bomba de agua', cat: 'agua', serv: 'agua', costo: 450, mant: 4, prod: 50, consE: 2, radio: 7, trabajos: 1, desc: 'Agua para los vecinos. Alcance 7.' }),
  I({ id: 'torre', mej: true, nombre: 'Torre de agua', cat: 'agua', serv: 'agua', w: 2, h: 2, costo: 2400, mant: 20, prod: 260, consE: 6, radio: 12, trabajos: 4, nivel: 1, desc: 'Gran capacidad y alcance 12.' }),
  I({ id: 'depuradora', mej: true, nombre: 'Depuradora', cat: 'agua', serv: 'agua', w: 3, h: 3, costo: 11000, mant: 90, prod: 1500, consE: 40, radio: 20, trabajos: 25, nivel: 2, tech: 'depuradora', desc: 'Agua limpia para toda la ciudad.' }),

  I({ id: 'bomberos', nombre: 'Bomberos', cat: 'servicios', serv: 'bomberos', mej: true, w: 2, h: 2, costo: 1600, mant: 22, consE: 4, consA: 2, radio: 9, trabajos: 12, nivel: 1, desc: 'Previene y apaga incendios.' }),
  I({ id: 'policia', nombre: 'Comisaría', cat: 'servicios', serv: 'policia', mej: true, w: 2, h: 2, costo: 1800, mant: 25, consE: 4, consA: 2, radio: 9, trabajos: 12, nivel: 1, desc: 'Seguridad y felicidad.' }),
  I({ id: 'clinica', nombre: 'Clínica', cat: 'servicios', serv: 'salud', mej: true, w: 2, h: 2, costo: 2200, mant: 30, consE: 5, consA: 3, radio: 10, trabajos: 14, nivel: 1, desc: 'Salud para los vecinos.' }),
  I({ id: 'hospital', nombre: 'Hospital', cat: 'servicios', serv: 'salud', mej: true, w: 3, h: 3, costo: 9500, mant: 110, consE: 18, consA: 8, radio: 16, trabajos: 50, nivel: 2, tech: 'medicina', desc: 'Salud para barrios enteros.' }),
  I({ id: 'escuela', nombre: 'Escuela', cat: 'servicios', serv: 'educacion', mej: true, w: 2, h: 2, costo: 2000, mant: 26, consE: 5, consA: 2, radio: 10, trabajos: 14, nivel: 1, desc: 'Educación: edificios más altos.' }),
  I({ id: 'universidad', nombre: 'Universidad', cat: 'servicios', serv: 'educacion', mej: true, w: 3, h: 3, costo: 13000, mant: 150, consE: 18, consA: 8, radio: 18, trabajos: 60, nivel: 2, tech: 'educacion', bono: { puntos: 1 }, desc: 'Educación superior y +1 punto de mejora al día.' }),
  I({ id: 'bus', nombre: 'Parada de bus', cat: 'servicios', serv: 'transito', mej: true, costo: 350, mant: 5, radio: 6, trabajos: 2, nivel: 1, desc: 'Reduce el tráfico cercano.' }),
  I({ id: 'metro', nombre: 'Estación de metro', cat: 'servicios', serv: 'transito', mej: true, w: 2, h: 2, costo: 6500, mant: 70, consE: 20, radio: 12, trabajos: 20, nivel: 3, tech: 'metro', desc: 'Gran reducción de tráfico.' }),

  I({ id: 'jardin', nombre: 'Jardín', cat: 'parques', serv: 'parque', costo: 120, mant: 1, radio: 3, desc: 'Un toque de verde. Alcance 3.' }),
  I({ id: 'parque', nombre: 'Parque', cat: 'parques', serv: 'parque', w: 2, h: 2, costo: 700, mant: 6, radio: 6, desc: 'Felicidad y valor del suelo.' }),
  I({ id: 'plaza', nombre: 'Plaza con fuente', cat: 'parques', serv: 'parque', w: 2, h: 2, costo: 1100, mant: 8, radio: 7, nivel: 1, desc: 'Punto de encuentro vecinal.' }),
  I({ id: 'parquegrande', nombre: 'Gran parque', cat: 'parques', serv: 'parque', w: 3, h: 3, costo: 3200, mant: 20, radio: 10, nivel: 2, desc: 'Pulmón verde de la ciudad.' }),
  I({ id: 'estadio', nombre: 'Estadio', cat: 'parques', serv: 'parque', w: 3, h: 3, costo: 16000, mant: 120, consE: 20, radio: 14, trabajos: 30, nivel: 3, tech: 'deportes', bono: { ingreso: 150, felic: 3 }, desc: 'Fiestas inolvidables y turismo.' }),

  I({ id: 'arbol', nombre: 'Árbol', cat: 'deco', serv: 'deco', costo: 30, mant: 0, radio: 2, desc: 'Pequeño y barato.' }),
  I({ id: 'farola', nombre: 'Farola', cat: 'deco', serv: 'deco', costo: 60, mant: 0.5, radio: 2, desc: 'Alumbra las noches.' }),
  I({ id: 'fuente', nombre: 'Fuente', cat: 'deco', serv: 'deco', costo: 300, mant: 2, radio: 3, desc: 'Agua que brilla.' }),
  I({ id: 'estatua', nombre: 'Estatua', cat: 'deco', serv: 'deco', costo: 600, mant: 1, radio: 4, nivel: 1, desc: 'Orgullo ciudadano.' }),

  I({ id: 'obelisco', nombre: 'Obelisco', cat: 'monumentos', serv: 'monumento', w: 3, h: 3, costo: 14000, mant: 40, radio: 12, nivel: 2, bono: { ingreso: 120, felic: 6 }, desc: 'Símbolo de la ciudad. +felicidad.' }),
  I({ id: 'observatorio', nombre: 'Observatorio', cat: 'monumentos', serv: 'monumento', w: 3, h: 3, costo: 22000, mant: 60, radio: 10, nivel: 2, tech: 'astronomia', bono: { puntos: 2, felic: 2 }, desc: '+2 puntos de mejora al día.' }),
  I({ id: 'torreaguja', nombre: 'Torre Aguja', cat: 'monumentos', serv: 'monumento', w: 3, h: 3, costo: 60000, mant: 150, radio: 14, nivel: 3, bono: { ingreso: 900, felic: 4 }, desc: 'Turismo: +$900 al día.' }),
  I({ id: 'aeropuerto', nombre: 'Aeropuerto', cat: 'monumentos', serv: 'monumento', w: 4, h: 4, costo: 120000, mant: 400, radio: 10, consE: 60, nivel: 3, bono: { ingreso: 2200, demC: 0.25 }, desc: 'Comercio global: +$2.200 al día.' }),
  I({ id: 'megatorre', nombre: 'Megatorre', cat: 'monumentos', serv: 'monumento', w: 3, h: 3, costo: 300000, mant: 600, radio: 18, consE: 80, nivel: 4, bono: { ingreso: 5000, puntos: 4, felic: 8 }, desc: 'La joya de la Megalópolis.' }),

  I({ id: 'ayuntamiento', nombre: 'Ayuntamiento', cat: 'ninguna', serv: 'ayuntamiento', mej: true, w: 2, h: 2, costo: 0, mant: 0, radio: 5, consE: 3, consA: 2, trabajos: 15, desc: 'El corazón de tu ciudad.' }),
  I({ id: 'comprar', nombre: 'Comprar parcela', cat: 'terreno', tipo: 'comprar', desc: 'Amplía tu ciudad con un terreno vecino.' }),
];

export const ITEM = {};
ITEMS.forEach((it, i) => { it.idx = i; ITEM[it.id] = it; });

// Zonas: capacidad por nivel (1..4)
export const ZONAS = {
  R: { nombre: 'Residencial', cap: [0, 6, 16, 40, 100], cE: [0, 1, 3, 8, 20], cA: [0, 1, 3, 8, 20], cont: [0, 0, 0, 0, 0] },
  C: { nombre: 'Comercial', cap: [0, 4, 12, 30, 70], cE: [0, 1, 3, 8, 18], cA: [0, 0.5, 2, 5, 12], cont: [0, 0, 0, 0, 0] },
  I: { nombre: 'Industrial', cap: [0, 6, 16, 36, 80], cE: [0, 2, 6, 14, 30], cA: [0, 1, 3, 6, 12], cont: [0, 1.2, 2.2, 3.2, 3.6] },
};
export const NOMBRES_ZONA = {
  R: ['Lote residencial', 'Casa', 'Casas adosadas', 'Edificio de pisos', 'Torre residencial'],
  C: ['Lote comercial', 'Tienda', 'Centro comercial', 'Oficinas', 'Rascacielos'],
  I: ['Lote industrial', 'Taller', 'Fábrica', 'Planta industrial', 'Complejo tecnológico'],
};

export const TECNOLOGIAS = [
  { id: 'avenidas', nombre: 'Avenidas', rama: 'Urbanismo', costo: 2, req: [], desc: 'Desbloquea avenidas de alta capacidad.' },
  { id: 'planificacion', nombre: 'Planificación', rama: 'Urbanismo', costo: 3, req: ['avenidas'], desc: 'Las parcelas cuestan 20% menos.' },
  { id: 'rascacielos', nombre: 'Rascacielos', rama: 'Urbanismo', costo: 5, req: ['avenidas'], desc: 'Permite edificios de nivel 4.' },
  { id: 'metro', nombre: 'Transporte masivo', rama: 'Urbanismo', costo: 5, req: ['avenidas'], desc: 'Desbloquea el metro.' },
  { id: 'solar', nombre: 'Energía solar', rama: 'Energía', costo: 2, req: [], desc: 'Desbloquea campos solares.' },
  { id: 'redes', nombre: 'Redes inteligentes', rama: 'Energía', costo: 3, req: ['solar'], desc: 'Mantenimiento de servicios -10%.' },
  { id: 'fision', nombre: 'Fisión nuclear', rama: 'Energía', costo: 6, req: ['redes'], desc: 'Desbloquea la planta nuclear.' },
  { id: 'depuradora', nombre: 'Tratamiento de agua', rama: 'Energía', costo: 3, req: ['solar'], desc: 'Desbloquea la depuradora.' },
  { id: 'educacion', nombre: 'Educación superior', rama: 'Servicios', costo: 2, req: [], desc: 'Desbloquea la universidad.' },
  { id: 'medicina', nombre: 'Medicina', rama: 'Servicios', costo: 3, req: ['educacion'], desc: 'Desbloquea el hospital.' },
  { id: 'deportes', nombre: 'Deportes', rama: 'Servicios', costo: 4, req: ['educacion'], desc: 'Desbloquea el estadio.' },
  { id: 'astronomia', nombre: 'Astronomía', rama: 'Servicios', costo: 4, req: ['educacion'], desc: 'Desbloquea el observatorio.' },
  { id: 'comercio', nombre: 'Libre comercio', rama: 'Economía', costo: 2, req: [], desc: 'Impuestos comerciales +10%.' },
  { id: 'industria', nombre: 'Industria 4.0', rama: 'Economía', costo: 4, req: ['comercio'], desc: 'Impuestos industriales +10%.' },
  { id: 'turismo', nombre: 'Turismo', rama: 'Economía', costo: 5, req: ['comercio'], desc: 'Ingresos de monumentos +50%.' },
  { id: 'offline', nombre: 'Gestión remota', rama: 'Economía', costo: 3, req: ['comercio'], desc: 'Ingresos sin conexión hasta 16 horas.' },
];
export const TECH = {};
TECNOLOGIAS.forEach((t) => { TECH[t.id] = t; });

// Misiones encadenadas (la primera es el tutorial). pista = botón a resaltar.
export const MISIONES = [
  { id: 'via', item: 'calle', titulo: 'Traza tu primera calle', desc: 'Toca CONSTRUIR, elige Calle y arrastra 6 casillas pegadas al Ayuntamiento.', pista: 'construir', meta: 6, prog: (c) => c.s.viasConectadas, rec: { dinero: 400, xp: 30 } },
  { id: 'zonaR', item: 'zonaR', titulo: 'Zona residencial', desc: 'En CONSTRUIR > Zonas elige Residencial y pinta 6 casillas junto a la calle.', pista: 'construir', meta: 6, prog: (c) => c.s.lotes.R, rec: { dinero: 300, xp: 30 } },
  { id: 'energia', item: 'eolica', titulo: 'Electricidad', desc: 'Construye una Turbina eólica cerca de tus casas (Energía).', pista: 'construir', meta: 1, prog: (c) => c.s.cuenta.eolica || 0, rec: { dinero: 300, xp: 30 } },
  { id: 'agua', item: 'bomba', titulo: 'Agua potable', desc: 'Instala una Bomba de agua cerca de tus zonas.', pista: 'construir', meta: 1, prog: (c) => c.s.cuenta.bomba || 0, rec: { dinero: 300, xp: 30 } },
  { id: 'vecinos', titulo: 'Primeros vecinos', desc: 'Con luz y agua llegan los vecinos. Sube la velocidad y espera a tener 12 habitantes.', pista: 'velocidad', meta: 12, prog: (c) => c.s.pop, rec: { dinero: 500, xp: 40 } },
  { id: 'comercio', item: 'zonaC', titulo: 'Abre comercios', desc: 'Pinta 4 casillas de zona Comercial junto a la calle.', pista: 'construir', meta: 4, prog: (c) => c.s.lotes.C, rec: { dinero: 400, xp: 40 } },
  { id: 'industria', item: 'zonaI', titulo: 'Empleo industrial', desc: 'Pinta 4 casillas Industriales (mejor lejos de las casas).', pista: 'construir', meta: 4, prog: (c) => c.s.lotes.I, rec: { dinero: 400, xp: 40 } },
  { id: 'parque', item: 'parque', titulo: 'Un respiro verde', desc: 'Construye un Parque o un Jardín.', pista: 'construir', meta: 1, prog: (c) => (c.s.cuenta.parque || 0) + (c.s.cuenta.jardin || 0), rec: { dinero: 400, xp: 40 } },
  { id: 'pop60', titulo: 'Un barrio vivo', desc: 'Alcanza 60 habitantes. Amplía con más zonas.', meta: 60, prog: (c) => c.s.pop, rec: { dinero: 800, xp: 60 } },
  { id: 'parcela', item: 'comprar', titulo: 'Más terreno', desc: 'Compra una parcela: CONSTRUIR > Terreno y elige una parcela adyacente.', pista: 'construir', meta: 5, prog: (c) => c.s.parcelas, rec: { dinero: 600, xp: 60 } },
  { id: 'pueblo', titulo: 'Llega a Pueblo', desc: 'Alcanza 120 habitantes para ser un Pueblo y desbloquear servicios.', meta: 120, prog: (c) => c.s.pop, rec: { dinero: 2000, xp: 120, puntos: 2 } },
  { id: 'seguridad', item: ['bomberos', 'policia'], titulo: 'Seguridad ciudadana', desc: 'Construye Bomberos y una Comisaría.', pista: 'construir', meta: 2, prog: (c) => Math.min(1, c.s.cuenta.bomberos || 0) + Math.min(1, c.s.cuenta.policia || 0), rec: { dinero: 1000, xp: 80 } },
  { id: 'salud', item: ['clinica', 'escuela'], titulo: 'Salud y escuela', desc: 'Construye una Clínica y una Escuela.', pista: 'construir', meta: 2, prog: (c) => Math.min(1, c.s.cuenta.clinica || 0) + Math.min(1, c.s.cuenta.escuela || 0), rec: { dinero: 1200, xp: 80, puntos: 1 } },
  { id: 'mejora', titulo: 'Investiga', desc: 'Abre MEJORAS y estudia una tecnología con tus puntos.', pista: 'mejoras', meta: 1, prog: (c) => Object.keys(c.tech).length, rec: { dinero: 800, xp: 80 } },
  { id: 'pop500', titulo: 'Medio millar', desc: 'Alcanza 500 habitantes.', meta: 500, prog: (c) => c.s.pop, rec: { dinero: 2500, xp: 150 } },
  { id: 'feliz', titulo: 'Ciudadanos felices', desc: 'Lleva la felicidad a 65 o más.', meta: 65, prog: (c) => c.s.felicidad, rec: { dinero: 2000, xp: 150, puntos: 1 } },
  { id: 'ingreso', titulo: 'Finanzas sanas', desc: 'Logra un balance de +$300 por día.', meta: 300, prog: (c) => Math.max(0, c.s.neto), rec: { dinero: 3000, xp: 150 } },
  { id: 'ciudad', titulo: 'Llega a Ciudad', desc: 'Alcanza 1.000 habitantes.', meta: 1000, prog: (c) => c.s.pop, rec: { dinero: 8000, xp: 300, puntos: 3 } },
  { id: 'universidad', item: 'universidad', titulo: 'Capital del saber', desc: 'Investiga Educación superior y construye una Universidad.', pista: 'construir', meta: 1, prog: (c) => c.s.cuenta.universidad || 0, rec: { dinero: 5000, xp: 250, puntos: 2 } },
  { id: 'avenidas', item: 'avenida', titulo: 'Gran avenida', desc: 'Traza 20 casillas de avenida.', pista: 'construir', meta: 20, prog: (c) => c.s.avenidas, rec: { dinero: 4000, xp: 200 } },
  { id: 'monumento', item: 'obelisco', titulo: 'Orgullo de la ciudad', desc: 'Construye cualquier monumento.', pista: 'construir', meta: 1, prog: (c) => c.s.monumentos, rec: { dinero: 8000, xp: 400, puntos: 2 } },
  { id: 'pop3000', titulo: 'Gran urbe', desc: 'Alcanza 3.000 habitantes.', meta: 3000, prog: (c) => c.s.pop, rec: { dinero: 12000, xp: 500 } },
  { id: 'metropolis', titulo: 'Llega a Metrópolis', desc: 'Alcanza 5.000 habitantes.', meta: 5000, prog: (c) => c.s.pop, rec: { dinero: 30000, xp: 800, puntos: 4 } },
  { id: 'rasca', titulo: 'Cielo abierto', desc: 'Ten 5 edificios de nivel 4 (requiere Rascacielos).', meta: 5, prog: (c) => c.s.nivel4, rec: { dinero: 40000, xp: 800, puntos: 3 } },
  { id: 'pop10000', titulo: 'Diez mil almas', desc: 'Alcanza 10.000 habitantes.', meta: 10000, prog: (c) => c.s.pop, rec: { dinero: 60000, xp: 1200 } },
  { id: 'mega', titulo: 'Llega a Megalópolis', desc: 'Alcanza 15.000 habitantes.', meta: 15000, prog: (c) => c.s.pop, rec: { dinero: 150000, xp: 2000, puntos: 6 } },
];

export const LOGROS = [
  { id: 'primero', nombre: 'Primer edificio', desc: 'Construye tu primer edificio.', meta: 1, prog: (c) => c.s.edificios, rec: { xp: 20 } },
  { id: 'edif25', nombre: 'Constructor', desc: '25 edificios.', meta: 25, prog: (c) => c.s.edificios, rec: { dinero: 500 } },
  { id: 'edif150', nombre: 'Urbanista', desc: '150 edificios.', meta: 150, prog: (c) => c.s.edificios, rec: { dinero: 3000, puntos: 1 } },
  { id: 'edif600', nombre: 'Arquitecto maestro', desc: '600 edificios.', meta: 600, prog: (c) => c.s.edificios, rec: { dinero: 20000, puntos: 2 } },
  { id: 'pop100', nombre: 'Primer centenar', desc: '100 habitantes.', meta: 100, prog: (c) => c.s.pop, rec: { dinero: 500 } },
  { id: 'pop2000', nombre: 'Dos mil vecinos', desc: '2.000 habitantes.', meta: 2000, prog: (c) => c.s.pop, rec: { dinero: 5000, puntos: 1 } },
  { id: 'pop8000', nombre: 'Multitud', desc: '8.000 habitantes.', meta: 8000, prog: (c) => c.s.pop, rec: { dinero: 25000, puntos: 2 } },
  { id: 'pop30000', nombre: 'Hormiguero', desc: '30.000 habitantes.', meta: 30000, prog: (c) => c.s.pop, rec: { dinero: 100000, puntos: 4 } },
  { id: 'rico', nombre: 'Tesorería', desc: 'Ten $50.000 en caja.', meta: 50000, prog: (c) => c.dinero, rec: { puntos: 1 } },
  { id: 'millonario', nombre: 'Millonario', desc: 'Ten $1.000.000 en caja.', meta: 1000000, prog: (c) => c.dinero, rec: { puntos: 4 } },
  { id: 'parcelas10', nombre: 'Terrateniente', desc: 'Posee 10 parcelas.', meta: 10, prog: (c) => c.s.parcelas, rec: { dinero: 5000 } },
  { id: 'parcelas30', nombre: 'Latifundista', desc: 'Posee 30 parcelas.', meta: 30, prog: (c) => c.s.parcelas, rec: { dinero: 30000, puntos: 2 } },
  { id: 'servicios', nombre: 'Estado del bienestar', desc: 'Ten 6 tipos distintos de servicio.', meta: 6, prog: (c) => c.s.tiposServ, rec: { dinero: 3000, puntos: 1 } },
  { id: 'feliz90', nombre: 'Utopía', desc: 'Felicidad de 90 o más.', meta: 90, prog: (c) => c.s.felicidad, rec: { puntos: 2 } },
  { id: 'techs', nombre: 'Científicos', desc: 'Investiga 8 tecnologías.', meta: 8, prog: (c) => Object.keys(c.tech).length, rec: { dinero: 8000, puntos: 1 } },
  { id: 'apagafuegos', nombre: 'Héroe del fuego', desc: 'Apaga 3 incendios.', meta: 3, prog: (c) => c.cont.incendios, rec: { dinero: 2000 } },
  { id: 'festivo', nombre: 'Ciudad festiva', desc: 'Organiza 2 festivales.', meta: 2, prog: (c) => c.cont.festivales, rec: { dinero: 3000, puntos: 1 } },
  { id: 'dias100', nombre: 'Cien días', desc: 'Sobrevive 100 días.', meta: 100, prog: (c) => c.t.dia, rec: { dinero: 5000 } },
];

export const DIARIA = [500, 800, 1200, 1800, 2600, 3600, 5000];
