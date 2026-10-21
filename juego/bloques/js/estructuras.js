// =============================================================
//  🗺️  ESTRUCTURAS (dónde van y cuándo se construyen)
//  El mundo se divide en una cuadrícula por cada tipo de estructura
//  (aldeas, templos, torres...). En cada celda, la semilla decide si
//  hay una estructura y dónde. Si el terreno no sirve (agua, barranco)
//  o choca con otra más importante, no se pone.
//  Al crear un chunk se buscan las estructuras cercanas y se ejecuta
//  su plano: cada una escribe solo lo que cae dentro de ese chunk, por
//  eso salen completas aunque cruce varios chunks.
//  Es una capa extra: no cambia el terreno que ya está creado, y en
//  los mundos viejos no toca los chunks donde ya construiste algo.
// =============================================================
import { hash2 } from './ruido.js';
import { CONFIG } from './config.js';
import { planAldea } from './aldea.js';
import { planTemplo, planTorre, planRuinas, planPozo, planFortaleza, planNaufragio, planRuinasMar } from './varios.js';
import { planMazmorra, planMina } from './subterraneo.js';

const MAR = CONFIG.mundo.nivelMar;

const rango = (v) => Math.max(...v) - Math.min(...v);
function alturas(gen, x, z, r) {
  const v = [gen.alturaEn(x, z)];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) v.push(gen.alturaEn(x + dx * r, z + dz * r));
  return v;
}

const TIPOS = {
  aldea: {
    celda: 300, prob: 0.5, radio: 64, prio: 0, sal: 11, grupo: 'tierra', plan: planAldea, nombre: 'Aldea',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      if (h <= MAR + 2 || h > MAR + 45) return false;
      const m = [...alturas(gen, i.x, i.z, 14), ...alturas(gen, i.x, i.z, 28)];
      return m.filter((v) => v <= MAR).length <= 3 && rango(m) <= 20;
    },
  },
  templo: {
    celda: 256, prob: 0.75, radio: 20, prio: 1, sal: 12, grupo: 'tierra', plan: planTemplo, nombre: 'Templo del desierto',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      if (h <= MAR + 2) return false;
      for (const [dx, dz] of [[0, 0], [-12, -12], [12, 12], [-12, 12], [12, -12]]) if (gen.biomaEn(i.x + dx, i.z + dz) !== 'desierto') return false;
      return rango(alturas(gen, i.x, i.z, 12)) <= 5;
    },
  },
  fortaleza: {
    celda: 340, prob: 0.4, radio: 22, prio: 2, sal: 13, grupo: 'tierra', plan: planFortaleza, nombre: 'Fortaleza',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      return h > MAR + 3 && h < MAR + 60 && rango(alturas(gen, i.x, i.z, 12)) <= 5;
    },
  },
  torre: {
    celda: 128, prob: 0.45, radio: 7, prio: 3, sal: 14, grupo: 'tierra', plan: planTorre, nombre: 'Torre de vigía',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      return h > MAR + 2 && h < MAR + 70 && rango(alturas(gen, i.x, i.z, 3)) <= 2;
    },
  },
  ruinas: {
    celda: 112, prob: 0.5, radio: 10, prio: 4, sal: 15, grupo: 'tierra', plan: planRuinas, nombre: 'Ruinas',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      return h > MAR + 2 && h < MAR + 70 && rango(alturas(gen, i.x, i.z, 6)) <= 3;
    },
  },
  pozo: {
    celda: 96, prob: 0.4, radio: 6, prio: 5, sal: 16, grupo: 'tierra', plan: planPozo, nombre: 'Pozo',
    valida(i, gen) {
      const h = gen.alturaEn(i.x, i.z);
      return h > MAR + 2 && h < MAR + 40 && rango(alturas(gen, i.x, i.z, 3)) <= 1;
    },
  },
  naufragio: {
    celda: 160, prob: 0.55, radio: 14, prio: 6, sal: 17, grupo: 'mar', plan: planNaufragio, nombre: 'Barco naufragado',
    valida(i, gen) {
      const m = alturas(gen, i.x, i.z, 10);
      return Math.max(...m) <= MAR - 5 && rango(m) <= 3;
    },
  },
  ruinasMar: {
    celda: 144, prob: 0.5, radio: 8, prio: 7, sal: 18, grupo: 'mar', plan: planRuinasMar, nombre: 'Ruinas submarinas',
    valida(i, gen) {
      const m = alturas(gen, i.x, i.z, 4);
      return Math.max(...m) <= MAR - 3 && rango(m) <= 3;
    },
  },
  mazmorra: {
    celda: 56, prob: 0.6, radio: 7, prio: 8, sal: 19, grupo: 'bajo', plan: planMazmorra, nombre: 'Mazmorra',
    valida(i, gen) { return gen.alturaEn(i.x, i.z) >= 26; },
  },
  mina: {
    celda: 200, prob: 0.55, radio: 135, prio: 9, sal: 20, grupo: 'bajo', plan: planMina, nombre: 'Mina abandonada',
    valida(i, gen) { return gen.alturaEn(i.x, i.z) >= MAR + 8; },
  },
};
const NOMBRES = Object.keys(TIPOS);

export const NOMBRES_ESTRUCTURAS = NOMBRES;

export function crearEstructuras(semilla, gen, opciones = {}) {
  const s = semilla | 0;
  const bloqueados = opciones.bloqueados || null; // chunks ("cx,cz") donde no se puede construir
  const cache = new Map();

  function instancia(tipo, ix, iz) {
    const k = tipo + ':' + ix + ':' + iz;
    if (cache.has(k)) return cache.get(k);
    cache.set(k, null);
    const T = TIPOS[tipo];
    if (hash2(ix, iz, s + T.sal * 101) >= T.prob) return null;
    const margen = Math.min(14, T.celda / 4);
    const x = ix * T.celda + margen + Math.floor(hash2(ix, iz, s + T.sal * 103) * (T.celda - 2 * margen));
    const z = iz * T.celda + margen + Math.floor(hash2(ix, iz, s + T.sal * 107) * (T.celda - 2 * margen));
    const inst = { tipo, x, z, sal: (hash2(ix, iz, s + T.sal * 109) * 4294967296) | 0, plan: null };
    if (!T.valida(inst, gen)) return null;
    // choca con otra más importante del mismo grupo
    if (T.grupo !== 'bajo') {
      for (const otro of NOMBRES) {
        const O = TIPOS[otro];
        if (O.grupo !== T.grupo || O.prio >= T.prio) continue;
        const reach = T.radio + O.radio + 12;
        const a = Math.floor((x - reach) / O.celda), b = Math.floor((x + reach) / O.celda);
        const c = Math.floor((z - reach) / O.celda), d = Math.floor((z + reach) / O.celda);
        for (let jx = a; jx <= b; jx++) {
          for (let jz = c; jz <= d; jz++) {
            const o = instancia(otro, jx, jz);
            if (o && Math.hypot(o.x - x, o.z - z) < T.radio + O.radio + 6) return null;
          }
        }
      }
    }
    if (bloqueados && bloqueados.size) {
      const R = T.radio + 2;
      for (let cx = (x - R) >> 4; cx <= (x + R) >> 4; cx++) {
        for (let cz = (z - R) >> 4; cz <= (z + R) >> 4; cz++) if (bloqueados.has(cx + ',' + cz)) return null;
      }
    }
    cache.set(k, inst);
    return inst;
  }

  function cercanas(tipo, x0, z0, x1, z1) {
    const T = TIPOS[tipo];
    const R = T.radio + 4;
    const lista = [];
    for (let ix = Math.floor((x0 - R) / T.celda); ix <= Math.floor((x1 + R) / T.celda); ix++) {
      for (let iz = Math.floor((z0 - R) / T.celda); iz <= Math.floor((z1 + R) / T.celda); iz++) {
        const inst = instancia(tipo, ix, iz);
        if (inst && inst.x + R >= x0 && inst.x - R <= x1 && inst.z + R >= z0 && inst.z - R <= z1) lista.push(inst);
      }
    }
    return lista;
  }

  const planDe = (inst) => inst.plan || (inst.plan = TIPOS[inst.tipo].plan(inst, gen));

  // Escribe en "datos" lo que cae en el chunk. Devuelve lo más alto que escribió y los puntos especiales
  function aplicarChunk(datos, cx, cz) {
    const bx = cx * 16, bz = cz * 16;
    let tope = 0;
    const humos = [], puntos = [], cofres = [];
    for (const tipo of NOMBRES) {
      for (const inst of cercanas(tipo, bx, bz, bx + 15, bz + 15)) {
        const plan = planDe(inst);
        const t = plan.ejecutar(datos, cx, cz);
        if (t > tope) tope = t;
        if (t) {
          for (const h of plan.humos) if (h[0] >> 4 === cx && h[2] >> 4 === cz) humos.push(h);
          plan.puntos.forEach((p, i) => {
            if (Math.floor(p.x) >> 4 === cx && Math.floor(p.z) >> 4 === cz) puntos.push({ ...p, id: tipo + ':' + inst.x + ',' + inst.z + ':' + i });
          });
        }
      }
    }
    return { tope, humos, puntos, cofres };
  }

  // La estructura más cercana de un tipo (para teletransportarse en pruebas)
  function buscar(tipo, x, z, anillos = 8) {
    const T = TIPOS[tipo];
    if (!T) return null;
    const cx = Math.floor(x / T.celda), cz = Math.floor(z / T.celda);
    let mejor = null, md = Infinity;
    for (let r = 0; r <= anillos; r++) {
      for (let iz = cz - r; iz <= cz + r; iz++) {
        for (let ix = cx - r; ix <= cx + r; ix++) {
          if (Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== r) continue;
          const inst = instancia(tipo, ix, iz);
          if (!inst) continue;
          const d = Math.hypot(inst.x - x, inst.z - z);
          if (d < md) { md = d; mejor = inst; }
        }
      }
      if (mejor && r >= 1) break;
    }
    if (!mejor) return null;
    const plano = planDe(mejor);
    const grande = tipo === 'aldea' || tipo === 'mina';
    const mx = grande ? mejor.x : (plano.x0 + plano.x1) >> 1, mz = grande ? mejor.z : (plano.z0 + plano.z1) >> 1;
    return { tipo, x: mejor.x, z: mejor.z, cx: mx, cz: mz, y: gen.alturaEn(mx, mz), yMax: plano.y1, yMin: plano.y0, distancia: md, puntos: plano.puntos, cofres: plano.cofres };
  }

  return { aplicarChunk, buscar, instancia, planDe };
}
