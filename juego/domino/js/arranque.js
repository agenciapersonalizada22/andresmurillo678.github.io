// Punto de entrada: exige sesion de la plataforma (redirige al portal y vuelve) antes de cargar el juego,
// asi los guardados se leen ya con la cuenta activa. Si la plataforma no carga, el juego arranca igual.
(async () => {
  const C = window.Cuenta;
  if (C && C.requerir) {
    try { await C.requerir(); } catch (e) { /* sin plataforma: seguimos como invitado */ }
  }
  await import('./principal.js');
})().catch((e) => { console.error(e); const n = document.createElement('p'); n.style.cssText = 'color:#fff;padding:1rem'; n.textContent = 'No se pudo iniciar el juego. Recarga la página.'; document.body.appendChild(n); });
