// Escalera adaptativa (staircase) n-arriba/1-abajo: subir tras `subir` aciertos seguidos, bajar tras un error.
// Con 2-arriba/1-abajo converge hacia ~71 % de aciertos. El nivel estimado es el promedio de los ultimos giros.
export const NMIN = 1, NMAX = 20;
const acotar = (n, e) => Math.max(e.min, Math.min(e.max, n));
export function crear(inicio = 1, o = {}) {
  const e = { min: o.min || NMIN, max: o.max || NMAX, subir: o.subir || 2, nivel: 1, racha: 0, dir: 0, giros: [], pasos: 0 };
  e.nivel = acotar(Math.round(inicio), e);
  return e;
}
export function registrar(e, acierto) {
  e.pasos++;
  let nuevo = e.nivel;
  if (acierto) { e.racha++; if (e.racha >= e.subir) { e.racha = 0; nuevo = e.nivel + 1; } }
  else { e.racha = 0; nuevo = e.nivel - 1; }
  nuevo = acotar(nuevo, e);
  if (nuevo !== e.nivel) {
    const d = nuevo > e.nivel ? 1 : -1;
    if (e.dir && d !== e.dir) e.giros.push(e.nivel);
    e.dir = d; e.nivel = nuevo;
  }
  return e.nivel;
}
export function estimado(e) {
  const g = e.giros.slice(-6);
  if (g.length >= 2) return Math.round((g.reduce((a, b) => a + b, 0) / g.length) * 10) / 10;
  return e.nivel;
}
// Lleva un valor 1..20 a un rango [a, b].
export const interpolar = (nivel, a, b) => a + (b - a) * (Math.max(1, Math.min(NMAX, nivel)) - 1) / (NMAX - 1);
