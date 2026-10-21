// =============================================================
//  ⚙️  CONFIGURACIÓN DE "MUNDO DE BLOQUES"
//  Todo lo que está aquí lo puedes cambiar a tu gusto.
//  Guarda el archivo, recarga la página y verás el cambio.
//  (No hay forma de "romperlo" para siempre: si algo sale raro,
//   regresa el número a como estaba.)
//
//  Ojo: si cambias cosas del TERRENO (la sección "mundo"), los
//  mundos que ya tenías guardados se van a ver distintos, porque
//  la misma semilla ahora dibuja otro paisaje.
//  (La calidad gráfica —sombras, nitidez, distancia— no está aquí:
//   se elige en el menú de pausa y vive en calidad.js.)
// =============================================================
export const CONFIG = {
  titulo: 'MUNDO DE BLOQUES',
  subtitulo: 'explora · rompe · construye',

  // ----------------------------------------------------- El terreno
  mundo: {
    alto: 128,              // altura máxima del mundo (en bloques). No subir de 250.
    nivelMar: 48,           // hasta esta altura llega el agua del mar
    escalaTerreno: 1,       // más grande = colinas anchas y suaves; más chico = más apretadas
    alturaColinas: 12,      // qué tan altas son las colinas normales
    alturaMontanas: 56,     // qué tan altas pueden llegar las montañas
    lineaNieve: 90,         // arriba de esta altura las montañas tienen nieve
    densidadArboles: 0.022, // 0 = sin árboles, 0.06 = bosque tupido
    densidadPlantas: 0.09,  // flores y pasto alto sobre el pasto (0 = nada)
    cuevas: true,           // huecos bajo tierra para explorar
    minerales: true,        // carbón, hierro y oro dentro de la piedra
  },

  // ----------------------------------------------------- Lo que se ve
  vista: {
    distancia: 5,           // radio de chunks (pedazos de 16x16) al empezar (la calidad gráfica lo cambia: Baja 4, Media 6, Alta 8, Ultra 11)
    distanciaMovil: 3,      // lo mismo en el celular
    distanciaMinima: 2,     // límites del botón de "distancia" del menú de pausa
    distanciaMaxima: 12,
    campoVision: 75,        // ángulo de visión en grados
    campoVisionCorriendo: 83, // se abre un poquito al correr
    presupuestoMs: 7,       // milisegundos por cuadro para crear chunks en compu
    presupuestoMsMovil: 4,  // lo mismo en celular
    hojasDetalladas: true,  // hojas con "relleno" (más bonito, un poco más pesado)
    hojasDetalladasMovil: true,  // lo mismo en el celular (ponlo en false si se traba)
    nubes: true,
    alturaNubes: 116,
  },

  // ----------------------------------------------------- El jugador
  jugador: {
    gravedad: 30,           // qué tan rápido caes (bloques por segundo²)
    salto: 9,               // fuerza del salto (9 ≈ salta poco más de 1 bloque)
    velocidad: 4.5,         // caminando (bloques por segundo)
    velocidadCorrer: 7,     // con Shift, W dos veces rápido, o el joystick hasta el fondo
    velocidadVuelo: 11,     // volando
    velocidadVueloRapido: 22, // volando con W dos veces rápido (o el joystick hasta el fondo)
    velocidadAgua: 2.6,     // nadando
    caidaMaxima: 55,        // velocidad máxima al caer
    ancho: 0.6,             // tamaño de la "caja" del jugador
    alto: 1.8,
    ojos: 1.62,             // a qué altura están los ojos (la cámara)
    alcance: 6,             // a cuántos bloques puedes romper o poner
    tiempoEntreGolpes: 0.22, // segundos entre bloque y bloque si dejas presionado
    sensibilidadRaton: 0.0022,
    sensibilidadTactil: 0.0055,
    saltoAutomaticoMovil: true, // en celular salta solo al chocar con un escalón de 1 bloque
    dobleEspacioVuela: true,    // tocar Espacio dos veces rápido activa/desactiva el vuelo
  },

  // ----------------------------------------------------- Animales
  animales: {
    activos: true,          // false = sin animales
    maximo: 7,              // cuántos puede haber cerca de ti en compu
    maximoMovil: 4,         // lo mismo en el celular
  },

  // ----------------------------------------------------- Estructuras
  // Aldeas, templos, torres, mazmorras, minas, barcos hundidos... (se agregan encima del
  // terreno, no lo cambian). En mundos viejos no tocan los chunks donde ya construiste.
  estructuras: {
    activas: true,
  },

  // ----------------------------------------------------- Vehículos
  vehiculos: {
    combustible: true,      // false = nunca se acaba la gasolina
    camaraTercera: true,    // empiezas viendo el vehículo desde atrás (C cambia a primera persona)
  },

  // ----------------------------------------------------- Día y noche
  dia: {
    duracion: 600,          // segundos que dura un día completo (con su noche)
    horaInicio: 0.08,       // 0 = amanecer, 0.25 = mediodía, 0.5 = atardecer, 0.75 = medianoche
    luzNoche: 0.36,         // qué tan oscura es la noche (0 = negro total, 1 = como de día)
  },

  // ----------------------------------------------------- Sonido
  audio: {
    volumen: 0.6,           // volumen de los efectos (0 a 1)
    volumenMusica: 0.32,    // volumen de la música (0 a 1)
    musica: true,           // ¿empieza con música?
    tempoDia: 72,           // velocidad de la música de día (pulsos por minuto)
    tempoNoche: 58,         // velocidad de la música de noche
  },

  // ----------------------------------------------------- Guardado
  guardado: {
    clave: 'bloques_mundo_v1',  // nombre con el que se guarda en el navegador
    cadaSegundos: 15,           // cada cuánto se guarda solo
  },

  // Bloques con los que empieza la barra de abajo (teclas 1 a 9)
  barraInicial: ['pasto', 'tierra', 'piedra', 'adoquin', 'tablas', 'tronco', 'vidrio', 'ladrillo', 'lana_roja'],
};
