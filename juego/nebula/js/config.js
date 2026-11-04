// =============================================================
//  Configuración base de Nebula (números de equilibrio y mundo).
//  Los ajustes del jugador (gráficos, audio, controles) viven en datos.js.
// =============================================================
const CONFIG = {
  titulo: 'NEBULA',
  ancho: 480,
  alto: 800,
  jugador: { radio: 11, invulnerable: 2.0, vidasMax: 8 },
  combo: { ventana: 1.6, porNivel: 4, maximo: 8 },
  powerups: { probabilidad: 0.14, iman: 110, duracionRapido: 9 },
  oleadas: { descanso: 1.8, etapasPorMundo: 5 },
  audio: { volumen: 0.35 },
  musica: { activa: true, volumen: 0.25, tempo: 112 },
};
