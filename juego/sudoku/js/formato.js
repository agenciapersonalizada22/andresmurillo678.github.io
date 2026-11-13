// Fechas locales, semanas ISO, semillas del reto diario/semanal y formato de tiempo.
const dos = (n) => (n < 10 ? '0' : '') + n;
export const fechaLocal = (d = new Date()) => d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
export const aFecha = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
export function semanaISO(fecha) {
  const d = aFecha(fecha), dia = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dia + 3);
  const y = d.getFullYear(), p = new Date(y, 0, 4, 12), n = 1 + Math.round(((d - p) / 86400000 - 3 + ((p.getDay() + 6) % 7)) / 7);
  return y + '-W' + dos(n);
}
export function fmtTiempo(seg) {
  seg = Math.max(0, Math.round(seg));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return (h ? h + ':' + dos(m) : m) + ':' + dos(s);
}
const DIARIO_NIVEL = [1, 1, 2, 2, 3, 3, 4, 5]; // por dia de la semana (0 = domingo): dom demonio, lun/mar facil...
const NIVEL_SEMANA = [5, 1, 2, 2, 3, 3, 4];
export function retoDiario(fecha = fechaLocal()) {
  const dia = aFecha(fecha).getDay();
  return { fecha, variante: 'clasico', nivel: NIVEL_SEMANA[dia], semilla: 'diario-' + fecha };
}
const ROTA = ['diagonal', 'killer', 'irregular', 'hipercubo'];
export function desafiosSemana(sem = semanaISO(fechaLocal())) {
  const [y, w] = sem.split('-W').map(Number), k = y * 53 + w;
  return [2, 3, 4].map((nivel, i) => ({ id: i, semana: sem, variante: ROTA[(k + i) % ROTA.length], nivel, semilla: 'semanal-' + sem + '-' + i }));
}
