// Arranque con cuenta: exige sesion, hace la primera sincronizacion con la nube (sin bloquear mas de unos segundos) y carga el juego.
const C = window.Cuenta;
async function main() {
  let N = null;
  if (C) {
    try { await C.requerir(); await C.iniciar(); } catch (e) { console.warn(e); }
    try { N = await import('./nube.js'); await N.iniciarNube(); } catch (e) { console.warn(e); }
  }
  await import('./principal.js');
  if (N) N.alJuegoListo();
}
main().catch((e) => { console.error(e); });
