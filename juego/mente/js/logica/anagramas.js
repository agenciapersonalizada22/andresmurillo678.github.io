// Anagramas en espanol con un diccionario pequeno propio (sin tildes ni enie; las letras se muestran en mayusculas).
export const PALABRAS = `casa mesa pato gato lobo rosa flor mano pelo ojos boca dedo pies luna sol mar rio lago isla cielo nube lluvia viento fuego tierra agua
arbol hoja rama raiz fruta pera uva limon mango melon sandia naranja cereza fresa platano banana tomate cebolla ajo papa maiz arroz frijol pan queso leche
huevo carne pollo pescado sopa torta dulce miel sal azucar cafe te jugo vaso plato taza cuchara tenedor cuchillo silla sofa cama mueble puerta ventana pared techo
piso cocina sala jardin calle plaza parque puente carro bus tren avion barco bicicleta moto camino ciudad pueblo campo monte valle playa arena roca piedra
libro lapiz papel cuaderno regla goma tinta pluma carta letra palabra frase cuento poema musica cancion baile juego pelota gol equipo carrera salto trampa
reloj tiempo hora minuto dia noche tarde semana mes verano invierno calor frio brisa tormenta trueno rayo sombra luz color verde azul rojo negro blanco
gris rosado morado dorado plata cobre hierro vidrio madera tela lana seda cuero barro ladrillo cemento amigo familia padre madre hermano abuelo primo vecino
maestro doctor pintor poeta chef piloto marinero pastor cantante bailarin escritor lector viajero caballo vaca oveja cabra cerdo conejo raton tigre leon oso zorro
lobo loro aguila paloma pajaro pez ballena delfin tiburon pulpo cangrejo tortuga rana culebra hormiga abeja mosca arana mariposa grillo gusano`.split(/\s+/).filter((w, i, a) => w.length >= 3 && a.indexOf(w) === i);
export const SET = new Set(PALABRAS);
const ordenar = (s) => s.split('').sort().join('');
const porFirma = new Map();
PALABRAS.forEach((w) => { const k = ordenar(w); (porFirma.get(k) || porFirma.set(k, []).get(k)).push(w); });
export const largoPara = (nivel) => Math.max(4, Math.min(9, 3 + Math.ceil(nivel / 3.2)));
export function generar(rng, nivel) {
  const L = largoPara(nivel);
  let pool = PALABRAS.filter((w) => w.length === L);
  if (!pool.length) pool = PALABRAS.filter((w) => w.length >= 4);
  const palabra = rng.pick(pool);
  let letras = palabra.split('');
  for (let i = 0; i < 20; i++) { letras = rng.barajar(palabra.split('')); if (letras.join('') !== palabra && (new Set(palabra).size === 1 || true)) break; }
  return { palabra, letras, soluciones: porFirma.get(ordenar(palabra)) };
}
// Valido si es una permutacion exacta de las letras y esta en el diccionario.
export function validar(letras, intento) {
  const t = String(intento).toLowerCase();
  return t.length === letras.length && ordenar(t) === ordenar(letras.join('')) && SET.has(t);
}
