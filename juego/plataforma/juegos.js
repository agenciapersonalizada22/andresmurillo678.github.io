/* Tabla de juegos de la plataforma. Fuente unica para el portal, Cuenta y las reglas de Firestore (firestore.rules debe coincidir:
   lo comprueba plataforma/pruebas/tablas.test.mjs). Cada modo: id, nombre, mayorEsMejor, tope (valor maximo aceptado por las reglas), unidad.
   Para anadir un modo o juego: editar aqui Y el mapa topes() y la lista de juegos en firestore.rules, y volver a publicar las reglas.
   Los ids de logros son libres (las reglas solo limitan la cantidad); aqui se declaran para mostrar su nombre en el portal. */
(function (G) {
  var J = [
    { id: 'nebula', nombre: 'Nebula', ruta: 'nebula/', color: '#3df5ff', descripcion: 'Naves espaciales neon',
      modos: [{ id: 'puntos', nombre: 'Puntos', mayorEsMejor: true, tope: 100000000, unidad: 'pts' }, { id: 'oleada', nombre: 'Oleada alcanzada', mayorEsMejor: true, tope: 10000, unidad: '' }],
      logros: [{ id: 'primera_partida', nombre: 'Despegue', desc: 'Termina tu primera partida' }, { id: 'jefe', nombre: 'Cazajefes', desc: 'Derrota a un jefe' }, { id: 'oleada10', nombre: 'Superviviente', desc: 'Llega a la oleada 10' }] },
    { id: 'ciudad', nombre: 'Ciudad Libre', ruta: 'ciudad/', color: '#ffb13d', descripcion: 'Mundo abierto',
      modos: [{ id: 'dinero', nombre: 'Dinero', mayorEsMejor: true, tope: 1000000000, unidad: '$' }],
      logros: [{ id: 'primera_mision', nombre: 'Recadero', desc: 'Completa una mision' }, { id: 'millonario', nombre: 'Millonario', desc: 'Reune 1.000.000' }, { id: 'escapar', nombre: 'Intocable', desc: 'Escapa de la policia' }] },
    { id: 'bloques', nombre: 'Mundo de Bloques', ruta: 'bloques/', color: '#7dd957', descripcion: 'Construye y sobrevive',
      modos: [{ id: 'dias', nombre: 'Dias sobrevividos', mayorEsMejor: true, tope: 100000, unidad: 'dias' }],
      logros: [{ id: 'primer_bloque', nombre: 'Constructor', desc: 'Coloca tu primer bloque' }, { id: 'noche', nombre: 'Noctambulo', desc: 'Sobrevive una noche' }, { id: 'diamante', nombre: 'Brillante', desc: 'Consigue un diamante' }] },
    { id: 'guerra', nombre: 'Alas y Acero', ruta: 'guerra/', color: '#ff7a3d', descripcion: 'Combate aereo y de tanques',
      modos: [{ id: 'aire', nombre: 'Caza: puntos', mayorEsMejor: true, tope: 100000000, unidad: 'pts' }, { id: 'tanque', nombre: 'Tanque: puntos', mayorEsMejor: true, tope: 100000000, unidad: 'pts' }],
      logros: [{ id: 'primer_derribo', nombre: 'Primer derribo', desc: 'Derriba un avion enemigo' }, { id: 'as', nombre: 'As', desc: 'Derriba 10 aviones' }, { id: 'blindado', nombre: 'Blindado', desc: 'Destruye 10 tanques' }] },
    { id: 'ajedrez', nombre: 'Ajedrez', ruta: 'ajedrez/', color: '#c9a8ff', descripcion: 'Ajedrez 3D',
      modos: [{ id: 'rompecabezas', nombre: 'Rompecabezas resueltos', mayorEsMejor: true, tope: 100000, unidad: '' }, { id: 'racha', nombre: 'Mejor racha de victorias', mayorEsMejor: true, tope: 10000, unidad: '' }],
      logros: [{ id: 'primera_victoria', nombre: 'Jaque mate', desc: 'Gana tu primera partida' }, { id: 'nivel5', nombre: 'Gran reto', desc: 'Vence al nivel 5' }, { id: 'online', nombre: 'En linea', desc: 'Juega con un amigo' }] },
    { id: 'metropolis', nombre: 'Metropolis', ruta: 'metropolis/', color: '#3df5a8', descripcion: 'Construye tu ciudad',
      modos: [{ id: 'poblacion', nombre: 'Poblacion', mayorEsMejor: true, tope: 100000000, unidad: 'hab.' }],
      logros: [{ id: 'primera_casa', nombre: 'Urbanista', desc: 'Construye tu primera zona' }, { id: 'pueblo', nombre: 'Gran pueblo', desc: 'Llega a 1.000 habitantes' }, { id: 'metropoli', nombre: 'Metropoli', desc: 'Llega a 100.000 habitantes' }] }
  ];
  var T = {
    lista: J,
    juego: function (id) { for (var i = 0; i < J.length; i++) if (J[i].id === id) return J[i]; return null; },
    modo: function (juego, modo) { var j = T.juego(juego); if (!j) return null; for (var i = 0; i < j.modos.length; i++) if (j.modos[i].id === modo) return j.modos[i]; return null; },
    clave: function (juego, modo) { return juego + '__' + modo; },
    claves: function () { var r = []; J.forEach(function (j) { j.modos.forEach(function (m) { r.push(j.id + '__' + m.id); }); }); return r; },
    juegoDeRuta: function (ruta) { var m = /\/juego\/([a-z0-9_-]+)\//.exec(ruta); return m && T.juego(m[1]) ? m[1] : ''; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = T; else G.PlataformaJuegos = T;
})(typeof window !== 'undefined' ? window : globalThis);
