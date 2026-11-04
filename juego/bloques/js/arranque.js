// =============================================================
//  🚪  ARRANQUE
//  1) exige sesión (sin sesión te lleva al portal y vuelves aquí)
//  2) sincroniza con la nube ANTES de que el juego lea sus guardados
//  3) carga el juego. Un fallo de red o de la nube nunca lo bloquea.
// =============================================================
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const listo = () => document.body.classList.remove('esperaCuenta');

async function arrancar() {
  const C = window.Cuenta;
  if (C) {
    try {
      if (C.ui) C.ui.mandoPropio = true;                 // los diálogos de la plataforma se manejan con mando
      await C.requerir();                                // sin sesión: redirige al portal y no resuelve
      const nube = await import('./nube.js');
      const primera = nube.iniciar().catch(() => {});
      await Promise.race([primera, espera(6000)]);
      // si hay un diálogo de conflicto abierto, se espera a que lo resuelvas
      if (document.querySelector('.cu-fondo')) await primera;
    } catch (e) { console.warn('Cuenta:', e); }
  }
  await import('./principal.js');
  listo();
}

arrancar().catch((e) => { console.error(e); listo(); });
