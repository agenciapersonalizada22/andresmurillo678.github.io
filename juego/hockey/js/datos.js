/* Datos estaticos del hockey: mesas, discos, retos, torneo, logros, presets graficos. window.HkDatos */
(function (G) {
  'use strict';
  var MESAS = [
    { id: 'clasica', nombre: 'Clásica', precio: 0, fondo: '#0c1d3a', fondo2: '#081226', linea: '#3df5ff', borde: '#2a6fb0', brillo: '#3df5ff', cfg: {} },
    { id: 'madera', nombre: 'Taberna', precio: 150, fondo: '#5a3a22', fondo2: '#3a2414', linea: '#f3d9a4', borde: '#8c5a2f', brillo: '#ffcf80', cfg: {} },
    { id: 'neon', nombre: 'Neón', precio: 250, fondo: '#1a0b33', fondo2: '#0d0620', linea: '#ff4fd8', borde: '#7a2fbf', brillo: '#ff4fd8', cfg: {} },
    { id: 'hielo', nombre: 'Hielo (resbala)', precio: 350, fondo: '#cfeaf7', fondo2: '#a8d2e6', linea: '#2b7fb3', borde: '#7fb7d4', brillo: '#ffffff', cfg: { friccion: 0.12 } },
    { id: 'espacio', nombre: 'Espacio', precio: 500, fondo: '#05060f', fondo2: '#000', linea: '#6dff6d', borde: '#2b4a2b', brillo: '#6dff6d', cfg: {} },
    { id: 'lava', nombre: 'Lava (rebota)', precio: 700, fondo: '#2a0c06', fondo2: '#160503', linea: '#ff8a3d', borde: '#b3361a', brillo: '#ff5a1f', cfg: { rebote: 0.97 } }
  ];
  var DISCOS = [
    { id: 'clasico', nombre: 'Clásico', precio: 0, color: '#ffd23d', borde: '#fff2b3', tipo: 'liso' },
    { id: 'brasa', nombre: 'Brasa', precio: 80, color: '#ff5a1f', borde: '#ffd23d', tipo: 'anillo' },
    { id: 'cristal', nombre: 'Cristal', precio: 150, color: '#bfefff', borde: '#ffffff', tipo: 'cristal' },
    { id: 'futbol', nombre: 'Balón', precio: 220, color: '#ffffff', borde: '#111111', tipo: 'futbol' },
    { id: 'plasma', nombre: 'Plasma', precio: 350, color: '#9a8cff', borde: '#ff4fd8', tipo: 'anillo' },
    { id: 'oro', nombre: 'Oro', precio: 600, color: '#ffc400', borde: '#fff6c8', tipo: 'cristal' }
  ];
  var DIFS = ['Fácil', 'Normal', 'Difícil', 'Experto'];
  var RETOS = [
    { nombre: 'Primer bumper', bot: 0, meta: 5, obst: [{ tipo: 'c', x: 200, y: 400, r: 34 }] },
    { nombre: 'Dos columnas', bot: 0, meta: 5, obst: [{ tipo: 'c', x: 120, y: 400, r: 28 }, { tipo: 'c', x: 280, y: 400, r: 28 }] },
    { nombre: 'La barrera', bot: 1, meta: 5, obst: [{ tipo: 'r', x: 200, y: 400, w: 130, h: 16 }] },
    { nombre: 'Pasillo', bot: 1, meta: 5, obst: [{ tipo: 'r', x: 70, y: 400, w: 120, h: 16 }, { tipo: 'r', x: 330, y: 400, w: 120, h: 16 }] },
    { nombre: 'Barrera móvil', bot: 1, meta: 5, obst: [{ tipo: 'r', x: 200, y: 400, w: 110, h: 16, ax: 110, per: 3.2 }] },
    { nombre: 'Triángulo', bot: 2, meta: 5, obst: [{ tipo: 'c', x: 200, y: 330, r: 24 }, { tipo: 'c', x: 140, y: 440, r: 24 }, { tipo: 'c', x: 260, y: 440, r: 24 }] },
    { nombre: 'Laberinto', bot: 2, meta: 6, obst: [{ tipo: 'r', x: 100, y: 330, w: 130, h: 14 }, { tipo: 'r', x: 300, y: 470, w: 130, h: 14 }, { tipo: 'c', x: 200, y: 400, r: 26, ax: 0, ay: 60, per: 4 }] },
    { nombre: 'Caos', bot: 3, meta: 7, obst: [{ tipo: 'c', x: 200, y: 400, r: 28, ax: 90, per: 3 }, { tipo: 'r', x: 90, y: 340, w: 90, h: 14, ay: 30, per: 2.5 }, { tipo: 'r', x: 310, y: 460, w: 90, h: 14, ay: 30, per: 2.5, fase: 0.5 }] }
  ];
  var RIVALES = [
    { nombre: 'Nova', nivel: 0 }, { nombre: 'Rayo', nivel: 0 }, { nombre: 'Pixel', nivel: 1 }, { nombre: 'Turbo', nivel: 1 },
    { nombre: 'Titán', nivel: 2 }, { nombre: 'Ámbar', nivel: 2 }, { nombre: 'Zeta', nivel: 3 }
  ];
  var LOGROS = [
    { id: 'primer_gol', nombre: 'Primer gol', desc: 'Marca tu primer gol.' },
    { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana un partido contra el bot o en línea.' },
    { id: 'victoria_experto', nombre: 'Rey de la mesa', desc: 'Gana al bot en dificultad Experto.' },
    { id: 'blanqueada', nombre: 'Blanqueada', desc: 'Gana sin recibir ningún gol.' },
    { id: 'remontada', nombre: 'Remontada', desc: 'Gana tras ir perdiendo por 3 o más goles.' },
    { id: 'racha_5', nombre: 'Ráfaga', desc: 'Marca 5 goles seguidos.' },
    { id: 'goles_100', nombre: 'Cien goles', desc: 'Acumula 100 goles.' },
    { id: 'victorias_25', nombre: 'Veterano', desc: 'Acumula 25 victorias.' },
    { id: 'torneo_campeon', nombre: 'Campeón del torneo', desc: 'Gana un torneo completo.' },
    { id: 'reto_4', nombre: 'Mitad del reto', desc: 'Supera 4 niveles del reto.' },
    { id: 'reto_completo', nombre: 'Maestro de obstáculos', desc: 'Supera los 8 niveles del reto.' },
    { id: 'online_victoria', nombre: 'Duelo en línea', desc: 'Gana un partido 1 contra 1 en línea.' },
    { id: 'poderes_10', nombre: 'Coleccionista de poderes', desc: 'Recoge 10 power-ups.' },
    { id: 'tienda_completa', nombre: 'Coleccionista', desc: 'Desbloquea todas las mesas y discos.' },
    { id: 'dos_jugadores', nombre: 'Mejor entre dos', desc: 'Juega un partido de 2 jugadores en el mismo teléfono.' }
  ];
  var PRESETS = {
    baja: { particulas: 1, estela: false, brillo: false, sombras: false, res: 0.75 },
    media: { particulas: 2, estela: true, brillo: false, sombras: true, res: 1 },
    alta: { particulas: 3, estela: true, brillo: true, sombras: true, res: 1 },
    ultra: { particulas: 4, estela: true, brillo: true, sombras: true, res: 1.5 }
  };
  G.HkDatos = { MESAS: MESAS, DISCOS: DISCOS, DIFS: DIFS, RETOS: RETOS, RIVALES: RIVALES, LOGROS: LOGROS, PRESETS: PRESETS };
})(window);
