// =============================================================
//  🛠️  RECETAS DEL ESPACIO
//  Aeroauto Volta, cohete por etapas, traje espacial y las
//  máquinas del centro espacial. Todas son de 3x3 (mesa de
//  trabajo o fábrica de vehículos cerca).
// =============================================================
import { B } from '../bloques.js';
import { R } from '../recetas.js';

// piezas
R('bateria', 1, ['HOH', 'HCH', 'HOH'], { H: 'hierro', O: 'oro', C: 'carbon' });
R('motor_electrico', 1, ['HOH', 'OHO', 'HOH'], { H: 'hierro', O: 'oro' });
R('rotor', 2, ['.H.', 'HMH', '.H.'], { H: 'hierro', M: 'motor_electrico' });
// aeroauto
R('kit_aeroauto', 1, ['VVV', 'MBM', 'RHR'], { V: B.VIDRIO, M: 'motor_electrico', B: 'bateria', R: 'rotor', H: 'hierro' });
// cohete (en este orden se ensambla en la plataforma)
R('cohete_estructura', 1, ['HHH', 'H.H', 'HHH'], { H: 'hierro' });
R('cohete_motores', 1, ['H.H', 'MCM', 'OOO'], { H: 'hierro', M: 'motor_electrico', C: 'carbon', O: 'oro' });
R('cohete_combustible', 1, ['BCB', 'BCB', 'BCB'], { B: 'bidon', C: 'carbon' });
R('cohete_cabina', 1, ['.V.', 'VDV', 'HHH'], { V: B.VIDRIO, D: 'diamante', H: 'hierro' });
R('traje_espacial', 1, ['HVH', 'HBH', 'H.H'], { H: 'hierro', V: B.VIDRIO, B: 'bateria' });
// bloques
R(B.PLATAFORMA, 1, ['HHH', 'HOH', 'AAA'], { H: 'hierro', O: 'oro', A: B.PIEDRA_PULIDA });
R(B.PANEL_CONTROL, 1, ['HHH', 'VBV', 'HHH'], { H: 'hierro', V: B.VIDRIO, B: 'bateria' });
R(B.CARGADOR, 1, ['HBH', 'HOH', 'HHH'], { H: 'hierro', B: 'bateria', O: 'oro' });
R(B.FABRICA, 1, ['HHH', 'HMH', 'AAA'], { H: 'hierro', M: 'motor_electrico', A: B.PIEDRA_PULIDA });
R(B.CONSOLA_NAV, 1, ['HVH', 'HBH', 'HHH'], { H: 'hierro', V: B.VIDRIO, B: 'bateria' });
R(B.GENERADOR_O2, 1, ['HVH', 'VBV', 'HHH'], { H: 'hierro', V: B.VIDRIO, B: 'bateria' });
R(B.HORMIGON, 4, ['AA', 'AA'], { A: B.PIEDRA_PULIDA });
R(B.METAL, 4, ['HH', 'HH'], { H: 'hierro' });
R(B.OBSIDIANA, 2, ['AAA', 'ACA', 'AAA'], { A: '#adoquin', C: 'carbon' });
