// Vibración del mando con interruptor e intensidad (ajustes)
export const cfgVib = { activa: true, k: 1 };
export function vibrar(fuerte, suave, ms) {
  const M = window.Mando;
  if (!M || !M.conectado || !cfgVib.activa) return;
  M.vibrar(fuerte * cfgVib.k, suave * cfgVib.k, ms);
}
