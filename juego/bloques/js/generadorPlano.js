// =============================================================
//  🟩  GENERADOR PLANO
//  Un mundo llano como una mesa: roca del fondo, piedra, tierra y
//  pasto. Sirve para construir tranquilo. Usa las mismas estructuras
//  (aldeas, torres…) que el mundo normal.
// =============================================================
import { B } from './bloques.js';
import { CAPA, ALTO, LADO } from './medidas.js';
import { crearEstructuras } from './estructuras.js';
import { hash2 } from './ruido.js';

const SUELO = 52;

export function crearGeneradorPlano(semilla, opciones = {}) {
  const s = semilla | 0;
  const alturaEn = () => SUELO;
  const biomaEn = () => 'llanura';
  const est = crearEstructuras(s, { alturaEn, biomaEn }, { bloqueados: opciones.bloqueados });

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const col = z * LADO + x;
        datos[col] = B.LECHO;
        for (let y = 1; y < SUELO - 3; y++) datos[y * CAPA + col] = B.PIEDRA;
        for (let y = SUELO - 3; y < SUELO; y++) datos[y * CAPA + col] = B.TIERRA;
        datos[SUELO * CAPA + col] = B.PASTO;
        const h = hash2(cx * 16 + x, cz * 16 + z, s + 42);
        if (h < 0.07) datos[(SUELO + 1) * CAPA + col] = B.PASTO_ALTO;
        else if (h > 0.992) datos[(SUELO + 1) * CAPA + col] = h > 0.996 ? B.FLOR_ROJA : B.FLOR_AMARILLA;
      }
    }
    let alturaMax = SUELO + 2;
    let humos = [], puntos = [];
    if (opciones.estructuras !== false) {
      const r = est.aplicarChunk(datos, cx, cz);
      if (r.tope > alturaMax) alturaMax = r.tope;
      humos = r.humos;
      puntos = r.puntos;
    }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos, puntos };
  }

  function buscarInicio() { return { x: 0.5, z: 0.5, y: SUELO + 1 }; }

  return { generarChunk, alturaEn, buscarInicio, biomaEn, version: 2, estructuras: est };
}
