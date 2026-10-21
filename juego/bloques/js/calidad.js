// =============================================================
//  🎚️  CALIDAD GRÁFICA
//  Cuatro niveles: Baja (celulares y compus sin tarjeta de video),
//  Media, Alta y Ultra. Cada uno decide cuántas sombras, qué tan
//  nítida es la imagen, qué tan lejos se ve y cuántos detalles
//  (nubes, partículas, relieve de las texturas, olas) se dibujan.
//  Se guarda en las opciones. Si no eliges ninguno, el juego mira tu
//  tarjeta de video: Alta en una compu normal, Baja en celular.
// =============================================================
export const NIVELES = ['baja', 'media', 'alta', 'ultra'];

export const CALIDADES = {
  baja: {
    nombre: 'BAJA',
    sombras: 0, tamSombra: 1024, rangoSombra: [40, 90],
    pixeles: 1, distancia: 4, distanciaMovil: 3,
    nubesCapas: 1, nubesOctavas: 3, relieve: 0, olas: 0, particulas: 0.25, hojasDetalladas: false,
    estrellas: true, viento: 0.6, presupuesto: 5,
  },
  media: {
    nombre: 'MEDIA',
    sombras: 1, tamSombra: 1536, rangoSombra: [58, 120],
    pixeles: 1.25, distancia: 6, distanciaMovil: 4,
    nubesCapas: 2, nubesOctavas: 4, relieve: 1, olas: 1, particulas: 0.6, hojasDetalladas: true,
    estrellas: true, viento: 1, presupuesto: 7,
  },
  alta: {
    nombre: 'ALTA',
    sombras: 2, tamSombra: 2048, rangoSombra: [28, 105],
    pixeles: 1.5, distancia: 8, distanciaMovil: 4,
    nubesCapas: 3, nubesOctavas: 5, relieve: 1, olas: 1, particulas: 1, hojasDetalladas: true,
    estrellas: true, viento: 1, presupuesto: 9,
  },
  ultra: {
    nombre: 'ULTRA',
    sombras: 2, tamSombra: 4096, rangoSombra: [26, 130],
    pixeles: 2, distancia: 11, distanciaMovil: 5,
    nubesCapas: 4, nubesOctavas: 5, relieve: 1, olas: 1, particulas: 1.6, hojasDetalladas: true,
    estrellas: true, viento: 1, presupuesto: 11,
  },
};

// Mira el nombre de la tarjeta de video para saber si es de verdad o por software
export function nivelRecomendado(renderer, tactil) {
  if (tactil) return 'baja';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nombre = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render|softpipe/i.test(nombre)) return 'baja';
  } catch (e) { /* sin información */ }
  return 'alta';
}
