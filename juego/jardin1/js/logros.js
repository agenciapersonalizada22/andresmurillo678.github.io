// Logros y evaluacion. Formato de las entradas: id:'..', nombre:'..', desc:'..'
export const LOGROS = [
  { id:'primer_sol', nombre:'Primer sol', desc:'Recoge tu primer sol del cielo.' },
  { id:'primera_victoria', nombre:'Primera victoria', desc:'Gana el nivel 1-1.' },
  { id:'mundo_1', nombre:'Jardín en paz', desc:'Completa el mundo 1.' },
  { id:'mundo_2', nombre:'Sin miedo a la noche', desc:'Completa el mundo 2.' },
  { id:'mundo_3', nombre:'Chapuzón', desc:'Completa el mundo 3.' },
  { id:'mundo_4', nombre:'Entre la bruma', desc:'Completa el mundo 4.' },
  { id:'mundo_5', nombre:'Rey del tejado', desc:'Completa el mundo 5.' },
  { id:'jefe_final', nombre:'Adiós, Doctor Moho', desc:'Derrota al jefe final.' },
  { id:'capataz', nombre:'Capataz derribado', desc:'Derrota al Capataz colosal.' },
  { id:'estrellas_25', nombre:'Coleccionista de estrellas', desc:'Reúne 25 estrellas.' },
  { id:'estrellas_75', nombre:'Constelación', desc:'Reúne 75 estrellas.' },
  { id:'estrellas_150', nombre:'Cielo despejado', desc:'Reúne 150 estrellas.' },
  { id:'sin_cortadoras', nombre:'Sin tocar el césped', desc:'Gana un nivel sin usar cortadoras.' },
  { id:'cien_zombis', nombre:'Cazador', desc:'Derrota 100 zombis en total.' },
  { id:'mil_zombis', nombre:'Exterminador', desc:'Derrota 1000 zombis en total.' },
  { id:'plantas_20', nombre:'Herbolario', desc:'Desbloquea 20 plantas.' },
  { id:'plantas_todas', nombre:'Botánico supremo', desc:'Desbloquea todas las plantas.' },
  { id:'rico', nombre:'Bolsillos llenos', desc:'Acumula 1000 monedas.' },
  { id:'cliente', nombre:'Cliente del vecino', desc:'Compra algo en la Tienda del vecino.' },
  { id:'ranura_max', nombre:'Cargador completo', desc:'Compra las tres ranuras extra.' },
  { id:'surv_10', nombre:'Resistente', desc:'Sobrevive 10 oleadas en supervivencia.' },
  { id:'surv_25', nombre:'Inquebrantable', desc:'Sobrevive 25 oleadas en supervivencia.' },
  { id:'surv_duro_10', nombre:'Duro de pelar', desc:'Sobrevive 10 oleadas en supervivencia dura.' },
  { id:'zen_primera', nombre:'Mano verde', desc:'Cultiva tu primera planta en el Jardín Zen.' },
  { id:'zen_venta', nombre:'Vendedor de plantas', desc:'Vende una planta del Jardín Zen.' },
  { id:'rompe_tumbas', nombre:'Rompe-tumbas', desc:'Gana el minijuego Rompe-tumbas.' },
  { id:'bolera', nombre:'Pleno de bolos', desc:'Gana una bolera de muros.' },
  { id:'cinta', nombre:'Línea de montaje', desc:'Gana un nivel de cinta transportadora.' },
  { id:'carrera', nombre:'Carrera solar', desc:'Gana la Carrera de energía.' },
  { id:'rompecabezas', nombre:'Mente brillante', desc:'Resuelve 4 rompecabezas.' },
  { id:'jarrones', nombre:'Alfarero furioso', desc:'Gana un nivel de Rompe-jarrones.' },
  { id:'versus_primera', nombre:'Duelo de jardines', desc:'Juega una partida de Jardín contra Jardín.' },
  { id:'hipnosis', nombre:'Mente maestra', desc:'Hipnotiza a un zombi.' },
  { id:'daltonico', nombre:'Para todos los ojos', desc:'Activa el modo daltónico.' },
];
export const MAPA = Object.fromEntries(LOGROS.map((l) => [l.id, l]));

// ctx: {PR, plantasN, plantasTotal} -> lista de ids cumplidos (idempotente)
export function evaluar(PR, ctx) {
  const ok = [], hechos = PR.hechos, st = PR.stats;
  const w = (m) => { for (let n = 1; n <= 10; n++) if (!hechos[m + '-' + n]) return false; return true; };
  const est = ctx.estrellas;
  const cond = {
    primera_victoria: () => !!hechos['1-1'], mundo_1: () => w(1), mundo_2: () => w(2), mundo_3: () => w(3), mundo_4: () => w(4), mundo_5: () => w(5), jefe_final: () => !!hechos['5-10'], capataz: () => !!hechos['3-10'],
    estrellas_25: () => est >= 25, estrellas_75: () => est >= 75, estrellas_150: () => est >= 150, sin_cortadoras: () => st.sinCort > 0, cien_zombis: () => st.matados >= 100, mil_zombis: () => st.matados >= 1000,
    plantas_20: () => ctx.plantasN >= 20, plantas_todas: () => ctx.plantasN >= ctx.plantasTotal, rico: () => PR.ganadas >= 1000, cliente: () => Object.keys(PR.tienda).length > 0, ranura_max: () => !!PR.tienda.ranura9,
    surv_10: () => (PR.surv.sv_dia ? PR.surv.sv_dia : 0) >= 10 || st.mejorSurv >= 10, surv_25: () => st.mejorSurv >= 25, surv_duro_10: () => (PR.mejorDuro | 0) >= 10,
    zen_primera: () => PR.zen.parcelas.some((p) => p), zen_venta: () => st.zenVentas > 0, rompe_tumbas: () => !!hechos['2-5'], bolera: () => !!hechos['2-10'] || !!hechos['4-10'], cinta: () => !!hechos['1-5'] || !!hechos['4-5'], carrera: () => !!hechos['3-8'],
    rompecabezas: () => Object.values(PR.puzzle).filter(Boolean).length >= 4, jarrones: () => !!hechos['5-5'] || Object.values(PR.jarros).some(Boolean), versus_primera: () => st.versus > 0, hipnosis: () => !!PR.tut.hipno, daltonico: () => !!ctx.dalt,
  };
  for (const id in cond) if (!PR.logros[id] && cond[id]()) ok.push(id);
  return ok;
}
