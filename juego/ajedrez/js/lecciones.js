// =============================================================
//  🎓  LECCIONES
//  Finales básicos y tácticas jugados de verdad contra el motor.
//  tipo 'final': hay una meta (mate / coronar) y un límite de jugadas.
//  tipo 'tactica': una o más jugadas únicas (sol), como un rompecabezas.
// =============================================================
export const LECCIONES = [
  {
    id: 'mate-dama', tipo: 'final', titulo: 'Mate con rey y dama', fen: '8/8/8/4k3/8/8/3Q4/4K3 w - - 0 1', meta: 'mate', max: 20,
    texto: ['La dama sola encierra al rey rival en una «caja» cada vez más pequeña.', 'Colócala a un salto de caballo del rey rival para recortar su espacio, acerca tu rey y da mate en el borde.', 'Cuidado: si dejas al rival sin jugadas y sin jaque, es ahogado (tablas).'],
    pista: 'Aleja al rey rival hacia un borde con la dama sin acercarte demasiado.',
  },
  {
    id: 'mate-torre', tipo: 'final', titulo: 'Mate con rey y torre', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', meta: 'mate', max: 40,
    texto: ['La torre corta al rey por filas o columnas; tu rey debe ayudar.', 'Método: corta, acerca tu rey a la oposición, da jaque con la torre y empuja al rival al borde. Repite hasta el mate.', 'No dejes la torre donde la capture el rey rival.'],
    pista: 'Corta al rey con la torre a distancia y avanza tu rey.',
  },
  {
    id: 'peon-rey', tipo: 'final', titulo: 'Rey y peón: casillas clave', fen: '3k4/8/3K4/3P4/8/8/8/8 w - - 0 1', meta: 'coronar', max: 15,
    texto: ['Si tu rey llega delante del peón, a una fila de distancia, las casillas clave le garantizan la coronación.', 'Usa la oposición: coloca tu rey frente al rival con una casilla entre los dos y deja que él ceda.', 'Primero el rey, luego el peón.'],
    pista: 'Avanza el rey a e6 antes de empujar el peón.',
  },
  {
    id: 'cuadrado', tipo: 'final', titulo: 'La regla del cuadrado', fen: '8/8/8/8/k7/8/7P/4K3 w - - 0 1', meta: 'coronar', max: 12,
    texto: ['¿Llega el rey rival a detener al peón? Traza un cuadrado desde el peón hasta su casilla de coronación: si el rey rival entra en él, lo alcanza.', 'Aquí el rey negro está lejos: empuja el peón sin parar.'],
    pista: 'Empuja el peón h cada turno; el rey negro llega tarde.',
  },
  {
    id: 'lucena', tipo: 'final', titulo: 'Final de torres: la posición de Lucena', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', meta: 'coronar', max: 25,
    texto: ['La posición más famosa de los finales de torres: tienes un peón en séptima, pero tu rey está bloqueado por la torre rival.', 'Solución: «construir el puente». Lleva tu torre a la cuarta fila (Tc4) y usa tu rey para protegerte de los jaques.'],
    pista: 'Juega Tf1 o Tc4 para preparar el puente.',
  },
  {
    id: 'pasillo', tipo: 'tactica', titulo: 'Mate del pasillo', fen: '6k1/5ppp/8/8/8/8/5PPP/R3K3 w - - 0 1', sol: ['a1a8'],
    texto: ['Si el rey rival está encerrado por sus propios peones en la última fila, una torre o dama en esa fila da mate.', 'Encuentra el mate.'],
    pista: 'La torre llega a la última fila.',
  },
  {
    id: 'horquilla', tipo: 'tactica', titulo: 'La horquilla del caballo', fen: '4k3/1q6/8/8/4N3/8/8/4K3 w - - 0 1', sol: ['e4d6', null, 'd6b7'],
    texto: ['El caballo ataca ocho casillas y puede amenazar dos piezas a la vez.', 'Busca un salto con jaque que también ataque la dama.'],
    pista: 'Salta con jaque al rey desde d6.',
  },
];
export const porId = (id) => LECCIONES.find((l) => l.id === id);
