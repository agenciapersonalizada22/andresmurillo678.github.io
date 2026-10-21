// =============================================================
//  ⚙️  CONFIGURACIÓN DE CIUDAD LIBRE
//  Todo lo que está aquí lo puedes cambiar a tu gusto.
//  Guarda el archivo, recarga la página y verás el cambio.
//  (No hay forma de "romperlo" para siempre: si algo sale raro,
//   regresa el número a como estaba.)
//
//  Medidas: el mundo se mide en "pixeles de mundo".
//  Una casilla mide 64 y equivale a un carril (unos 4 metros).
//  Velocidades en pixeles por segundo: 300 ≈ 67 km/h.
// =============================================================
const CONFIG = {
  titulo: 'CIUDAD LIBRE',
  subtitulo: 'maneja, explora, haz misiones y escapa de la policía',

  // Cambia este número y la ciudad sale distinta (calles, edificios, parques...)
  semilla: 2025,

  mundo: {
    tamano: 72,            // casillas por lado (más = ciudad más grande, pero más lenta; mínimo 56)
    casilla: 64,           // tamaño de una casilla (no lo cambies si no sabes qué hace)
    manzanaMin: 7,         // tamaño mínimo de una manzana, en casillas
    manzanaMax: 10,        // tamaño máximo de una manzana
    probParque: 0.16,      // 0.16 = 16% de las manzanas son parques
    probEstacionamiento: 0.07,
    probPlaza: 0.07,
    puentes: 0.6,          // fracción de calles que cruzan el río con puente
    probArbol: 0.35,       // qué tan llenos de árboles están los parques
  },

  camara: {
    vista: 1050,           // cuánto mundo se ve (más = ves más lejos y todo más chico)
    alejarConVelocidad: 0.72, // a toda velocidad la cámara se aleja hasta este factor
    acercarAPie: 1.18,     // caminando la cámara se acerca un poco
    suavidad: 5,           // qué tan rápido te sigue la cámara (más = más pegada)
    adelanto: 0.35,        // la cámara mira hacia donde vas (segundos de adelanto)
  },

  pantalla: {
    resolucionMax: 1.5,    // nitidez máxima (bájalo a 1 si tu celular va lento)
  },

  jugador: {
    caminar: 110,          // velocidad caminando
    correr: 200,           // velocidad corriendo (Shift o joystick a fondo)
    radio: 10,             // tamaño de la persona para los choques
    distanciaSubir: 85,    // qué tan cerca debes estar de un carro para subirte
    velocidadBajar: 230,   // si vas más rápido que esto, no te puedes bajar
  },

  // ----------------------------------------------------------- Carros
  // velMax: velocidad máxima · acel: aceleración · freno: fuerza de frenado
  // giroMax: qué tan rápido gira (radianes/seg) · radioGiro: curva más cerrada
  // agarre: qué tan pegado al piso va (menos = derrapa más)
  // masa: más pesado = empuja más en los choques · vida: aguante antes de averiarse
  carros: {
    compacto: {
      nombre: 'Compacto', largo: 50, ancho: 26,
      velMax: 540, acel: 380, freno: 950, giroMax: 3.0, radioGiro: 30, agarre: 9, masa: 1.0, vida: 100,
      colores: ['#e94b3c', '#3c8de9', '#f2f2f2', '#49b35a', '#f2a13c', '#8a5ad6', '#3a3a44', '#6fd3e0'],
    },
    deportivo: {
      nombre: 'Deportivo', largo: 54, ancho: 28,
      velMax: 800, acel: 600, freno: 1200, giroMax: 3.3, radioGiro: 32, agarre: 10.5, masa: 0.95, vida: 85,
      colores: ['#ff2a55', '#ffd23d', '#3df5ff', '#ff8a00', '#b06bff', '#7dff6b'],
    },
    camioneta: {
      nombre: 'Camioneta', largo: 64, ancho: 31,
      velMax: 470, acel: 290, freno: 850, giroMax: 2.5, radioGiro: 38, agarre: 8, masa: 1.7, vida: 170,
      colores: ['#2f6d8a', '#8a3a2f', '#5b6b3a', '#d8d8d8', '#2e2e36', '#c98a2e'],
    },
    taxi: {
      nombre: 'Taxi', largo: 52, ancho: 27,
      velMax: 580, acel: 410, freno: 1000, giroMax: 3.0, radioGiro: 31, agarre: 9.5, masa: 1.1, vida: 115,
      colores: ['#ffc400'],
    },
    policia: {
      nombre: 'Patrulla', largo: 54, ancho: 28,
      velMax: 740, acel: 540, freno: 1150, giroMax: 3.2, radioGiro: 32, agarre: 10.5, masa: 1.25, vida: 150,
      colores: ['#f4f6fb'],
    },
    // Moto: ágil, rápida y frágil. Camión: pesado y lento. Ambulancia: grande y estable.
    moto: {
      nombre: 'Moto', largo: 34, ancho: 15,
      velMax: 720, acel: 780, freno: 1100, giroMax: 4.3, radioGiro: 20, agarre: 14, masa: 0.4, vida: 55,
      colores: ['#e94b3c', '#3df5ff', '#ffd23d', '#2e2e36', '#7dff6b', '#ff8a00'],
    },
    camion: {
      nombre: 'Camión', largo: 92, ancho: 36,
      velMax: 380, acel: 190, freno: 700, giroMax: 1.9, radioGiro: 56, agarre: 6.5, masa: 3.4, vida: 280,
      colores: ['#d8d8d8', '#2f6d8a', '#c98a2e', '#8a3a2f', '#5b6b3a'],
    },
    ambulancia: {
      nombre: 'Ambulancia', largo: 66, ancho: 31,
      velMax: 620, acel: 380, freno: 950, giroMax: 2.7, radioGiro: 38, agarre: 8.5, masa: 1.9, vida: 190,
      colores: ['#f4f6fb'],
    },
  },

  fisica: {
    rozamiento: 0.32,      // el carro se frena solo poco a poco (resistencia del aire)
    frenoMotor: 140,       // cuánto frena al soltar el acelerador
    agarreFrenoMano: 0.16, // con freno de mano el agarre baja a esta fracción (¡derrapes!)
    rebote: 0.3,           // qué tanto rebota al chocar contra paredes (0 a 1)
    danoUmbral: 150,       // choques más suaves que esto no hacen daño
    danoFactor: 0.085,     // cuánto daño hacen los choques fuertes
    humoDesde: 0.4,        // con menos de 40% de vida el carro echa humo
  },

  // Qué tan rápido puedes ir según el piso (1 = normal)
  terreno: { acera: 0.95, pasto: 0.62, arena: 0.5, plaza: 0.9, estacionamiento: 0.9 },

  // ----------------------------------------------------------- Ciudad viva
  trafico: {
    cantidad: 16,          // carros manejando solos alrededor tuyo
    estacionados: 10,      // carros estacionados cerca (para que tomes uno)
    velocidad: 230,        // velocidad normal del tráfico
    probPolicia: 0.07,     // probabilidad de que un carro del tráfico sea patrulla
    // Qué tan común es cada tipo de carro (más número = más común)
    mezcla: { compacto: 6, camioneta: 2, taxi: 2, deportivo: 1, moto: 2, camion: 1, ambulancia: 0.6 },
    pitar: true,           // los carros pitan si les estorbas
  },

  peatones: {
    cantidad: 34,          // personas caminando cerca de ti
    velocidad: 55,
    probCruzar: 0.3,       // probabilidad de cruzar la calle en una esquina
    reflejos: 0.8,         // probabilidad de esquivar un carro (1 = nunca los atropellas)
    tiempoCaido: 2.6,      // segundos que se quedan en el piso al caerse
  },

  // ----------------------------------------------------------- Policía
  policia: {
    porEstrella: [0, 2, 3, 4, 6, 7], // patrullas persiguiéndote según las estrellas (0 a 5)
    velocidad: 1.0,        // 1 = normal, 1.2 = más rápidas
    agresividad: 0.8,      // 0 a 1: qué tanto intentan cerrarte el paso
    vision: 650,           // qué tan lejos te ven
    tiempoOlvido: 12,      // segundos sin verte para bajar una estrella (+2 por estrella)
    tiempoAtrapar: 2,      // segundos con una patrulla pegada para que te atrapen
    distanciaAtrapar: 115,
    multa: 0.1,            // pierdes este porcentaje de tu dinero (0.1 = 10%) al ser atrapado
    multaMin: 50,
  },

  // Cuánto "calor" sube cada travesura (1 = una estrella)
  buscado: {
    atropello: 0.6,        // tumbar a un peatón
    atropelloVisto: 1.2,   // tumbarlo con la policía mirando
    chocarPolicia: 1.0,    // chocar una patrulla
    robarVisto: 1.0,       // robar un carro con la policía mirando
    robarPatrulla: 1.6,    // ¡robar una patrulla!
    choqueCivil: 0.18,     // chocar carros (muchos choques = estrellas)
    disparo: 0.12,         // cada disparo que ve la policía
  },

  // ----------------------------------------------------------- Misiones
  misiones: {
    taxi: { pagoBase: 90, pagoPorMetro: 0.55, viajes: 3, bonoFinal: 150, propinaTaxi: 1.3, velocidadRef: 270 },
    entrega: { pagoBase: 260, bonoFragil: 180, danoMaxFragil: 45, velocidadRef: 280 },
    carrera: { puntos: 8, pagoBase: 450, pagoPorSegundo: 25, velocidadRef: 370, tiempoExtra: 10 },
    taller: { precio: 100 }, // reparar, pintar el carro y despistar a la policía
  },

  dinero: { inicial: 250 },

  // ----------------------------------------------------------- Armas (a pie)
  // alcance en pixeles · cadencia en segundos entre disparos · balas por compra
  armas: {
    pistola: { nombre: 'Pistola', precio: 150, alcance: 560, cadencia: 0.28, perdigones: 1, dispersion: 0.03, municionMax: 60, paquete: 24, precioPaquete: 60 },
    escopeta: { nombre: 'Escopeta', precio: 450, alcance: 300, cadencia: 0.85, perdigones: 6, dispersion: 0.2, municionMax: 24, paquete: 8, precioPaquete: 80 },
    ropa: { precio: 40 },   // cambiar de ropa en la tienda
  },

  // ----------------------------------------------------------- Clima
  clima: {
    probLluvia: 0.35,      // probabilidad de que el próximo cambio de clima sea lluvia
    duracionMin: 50,       // segundos que dura cada clima (mínimo)
    duracionMax: 110,
    agarreMojado: 0.4,     // cuánto agarre pierden los carros con lluvia fuerte (0 a 1)
  },

  // ----------------------------------------------------------- Día y noche
  dia: {
    duracion: 480,         // segundos que dura un día completo (480 = 8 minutos)
    horaInicio: 16.5,      // hora del reloj al empezar (16.5 = 4:30 de la tarde)
    oscuridad: 0.66,       // qué tan oscura es la noche (0 a 1)
  },

  audio: {
    volumen: 0.5,          // volumen general (0 a 1)
    radio: 0.5,            // volumen de la música del radio
    motor: 0.6,            // volumen del motor
  },

  efectos: {
    humo: 1.0,             // 0 = sin humo, 2 = el doble
    marcasLlantas: true,   // marcas negras al derrapar
    sacudida: true,        // la pantalla tiembla en los choques
  },

  colores: {
    asfalto: '#3a3d45',
    cruce: '#3e414a',
    acera: '#a3a8b1',
    bordillo: '#6c717a',
    pasto: '#4b9a4f',
    agua: '#2275b9',
    arena: '#e8d6a0',
    plaza: '#c8b99c',
    estacionamiento: '#464952',
    callejon: '#2a2c33',
    linea: '#f5d23d',
    neon: ['#ff3d81', '#3df5ff', '#ffd23d', '#7dff6b', '#c86bff', '#ff8a3d'],
    edificios: ['#c96b5a', '#d9a05b', '#7a9cc6', '#8fb87a', '#b07ac9', '#e0c36b', '#6bb3b0',
      '#d98aa5', '#9a8f80', '#5f7d9c', '#c4a484', '#e07a5f', '#81b29a', '#f2cc8f', '#8d7bb5', '#a3b2c2'],
    dinero: '#7dff9a',
    estrella: '#ffd23d',
    texto: '#ffffff',
    suave: '#b9b2ff',
  },
};
