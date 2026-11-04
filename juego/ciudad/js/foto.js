// =============================================================
//  📷  MODO FOTO: cámara libre sin HUD, zoom, hora y guardar PNG.
// =============================================================
const Foto = (() => {
  let barra = null, destello = null, zoom = 1;
  const ocultarUI = () => { document.body.classList.add('modo-foto'); };

  function crearUI() {
    barra = document.createElement('div');
    barra.id = 'pie-foto';
    barra.className = 'oculto';
    barra.innerHTML = '<button data-a="foto">📷 FOTO</button><button data-a="mas">ZOOM +</button><button data-a="menos">ZOOM −</button><button data-a="hora">HORA +3</button><button data-a="salir">SALIR</button>';
    document.body.appendChild(barra);
    destello = document.createElement('div');
    destello.id = 'flash-foto';
    document.body.appendChild(destello);
    barra.addEventListener('pointerdown', (e) => e.stopPropagation());
    barra.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'foto') capturar();
      else if (a === 'mas') zoom = Math.min(2.2, zoom * 1.15);
      else if (a === 'menos') zoom = Math.max(0.45, zoom / 1.15);
      else if (a === 'hora') { J.hora = (J.hora + 3) % 24; J.noche = J.hora >= 20.5 || J.hora <= 5 ? 1 : (J.hora >= 7 && J.hora <= 18 ? 0 : J.noche); }
      else if (a === 'salir') salir();
    });
  }

  function capturar() {
    destello.classList.add('on');
    setTimeout(() => destello.classList.remove('on'), 60);
    Sonido.checkpoint();
    J.stats.fotos = (J.stats.fotos || 0) + 1;
    try {
      document.getElementById('lienzo').toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'ciudad-libre-' + Date.now() + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }, 'image/png');
    } catch (e) { /* sin descarga */ }
  }

  function entrar() {
    if (J.modo !== 'jugando' && !(J.modo === 'menu' && Panel.previo === 'jugando')) return;
    if (!barra) crearUI();
    Panel.cerrar(true);
    J.modo = 'foto';
    zoom = J.cam.zoom;
    ocultarUI();
    barra.classList.remove('oculto');
    J.pista('Modo foto: mueve la cámara con las flechas / stick, 📷 para guardar');
  }
  function salir() {
    if (J.modo !== 'foto') return;
    J.modo = 'jugando';
    document.body.classList.remove('modo-foto');
    barra.classList.add('oculto');
  }

  J.registrar({
    actualizarFoto(dt) {
      let x = 0, y = 0;
      const t = Entrada.teclado(), m = Entrada.mando;
      x = t.x + (m.usa ? m.x : 0) + (Entrada.joystick().x || 0);
      y = t.y + (m.usa ? m.y : 0) + (Entrada.joystick().y || 0);
      J.cam.x += x * 700 * dt / J.cam.zoom; J.cam.y += y * 700 * dt / J.cam.zoom;
      if (m.usa) zoom = Util.limitar(zoom * (1 + (m.gatillo - m.freno) * dt), 0.45, 2.2);
      J.cam.zoom += (zoom - J.cam.zoom) * Math.min(1, dt * 6);
      if (Entrada.pulso('KeyP', 'Escape', 'KeyM') || (window.Mando && (Mando.pulsado('B') || Mando.pulsado('MENU')))) salir();
      if (Entrada.pulso('Enter', 'KeyF') || (window.Mando && Mando.pulsado('A'))) capturar();
    },
  });
  return { entrar, salir };
})();
