// =============================================================
//  🛠️  RECETAS DEL SISTEMA SOLAR (3x3: mesa de trabajo o fábrica cerca)
//  Naves por tiers, escudo térmico, combustible y mejoras del traje.
//  La nave de salto y el nivel 3 de las mejoras piden minerales de
//  otros mundos (platino, mercurio líquido, hematita).
// =============================================================
import { B } from '../bloques.js';
import { R } from '../recetas.js';

R('celda_xenon', 1, ['.V.', 'BDB', '.V.'], { V: B.VIDRIO, B: 'bateria', D: 'diamante' });
R('motor_ionico', 1, ['HOH', 'MCM', 'HOH'], { H: 'hierro', O: 'oro', M: 'motor_electrico', C: 'celda_xenon' });
R('aislante_termico', 2, ['AAA', 'HCH', 'AAA'], { A: B.ARENA, H: 'hierro', C: 'carbon' });
R('blindaje_plomo', 2, ['HHH', 'HCH', 'HHH'], { H: 'hierro', C: 'carbon' });
R('sello_presion', 2, ['HVH', 'V.V', 'HVH'], { H: 'hierro', V: B.VIDRIO });
R('escudo_termico', 1, ['OAO', 'AHA', 'OAO'], { O: B.OBSIDIANA, A: 'aislante_termico', H: 'hierro' });
R('kit_lanzadera', 1, ['HVH', 'MBM', 'HDH'], { H: 'hierro', V: B.VIDRIO, M: 'motor_electrico', B: 'bateria', D: 'diamante' });
R('kit_nave_ionica', 1, ['HVH', 'IBI', 'HEH'], { H: 'hierro', V: B.VIDRIO, I: 'motor_ionico', B: 'bateria', E: 'escudo_termico' });
R('kit_nave_salto', 1, ['PIP', 'HEH', 'PCP'], { P: 'platino', I: 'motor_ionico', H: 'hierro', E: 'escudo_termico', C: 'celda_xenon' });
R('mejora_termica', 1, ['.A.', 'AHA', '.A.'], { A: 'aislante_termico', H: 'hierro' });
R('mejora_radiacion', 1, ['.B.', 'BHB', '.B.'], { B: 'blindaje_plomo', H: 'hierro' });
R('mejora_presion', 1, ['.S.', 'SHS', '.S.'], { S: 'sello_presion', H: 'hierro' });
R(B.SURTIDOR, 1, ['HBH', 'HOH', 'HHH'], { H: 'hierro', B: 'bidon', O: 'oro' });
