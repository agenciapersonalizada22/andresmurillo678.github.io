// =============================================================
//  🌦️  CLIMA: despejado, nublado, lluvia, tormenta (con rayos) y niebla.
//  J.lluvia (0 a 1) sigue siendo lo que usan la física y el sonido.
// =============================================================
const Clima = (() => {
  const C = CONFIG.clima;
  const ESTADOS = {
    despejado: { nombre: '', lluvia: 0, nubes: 0, niebla: 0 },
    nublado: { nombre: 'NUBLADO', lluvia: 0, nubes: 0.55, niebla: 0.1 },
    lluvia: { nombre: 'LLUVIA', lluvia: 0.65, nubes: 0.75, niebla: 0.15 },
    tormenta: { nombre: 'TORMENTA', lluvia: 1, nubes: 1, niebla: 0.2 },
    niebla: { nombre: 'NIEBLA', lluvia: 0, nubes: 0.35, niebla: 0.85 },
  };
  let tipo = 'despejado';
  let nubes = 0, niebla = 0;
  let rayo = 0, proximoRayo = 6, trueno = -1;

  function elegir() {
    const r = Math.random();
    const llueve = C.probLluvia;
    if (r < llueve * 0.55) return 'lluvia';
    if (r < llueve * 0.8) return 'tormenta';
    if (r < llueve * 0.8 + 0.12) return 'niebla';
    if (r < llueve * 0.8 + 0.3) return 'nublado';
    return 'despejado';
  }

  function fijar(nuevo) {
    tipo = nuevo;
    const e = ESTADOS[tipo];
    J.lluviaObj = e.lluvia > 0 ? Math.min(1, e.lluvia * Util.azar(0.85, 1.05)) : 0;
    if (tipo === 'lluvia' && J.modo === 'jugando') J.pista('Empieza a llover: el piso estará resbaloso');
    if (tipo === 'tormenta' && J.modo === 'jugando') J.pista('¡Tormenta! Cuidado con los rayos y el piso mojado');
    if (tipo === 'niebla' && J.modo === 'jugando') J.pista('Hay niebla: se ve menos, la policía también');
  }

  const brillo = (() => {
    const c = Util.lienzo(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();

  const mod = {
    // Reflejos de faroles y faros sobre el piso mojado (coordenadas del mundo)
    dibujarAntesNoche(g, cd, v) {
      if (!Ajustes.v.reflejos || J.lluvia < 0.2 || J.noche < 0.15) return;
      const a = Math.min(1, J.lluvia * 1.4) * J.noche;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.28 * a;
      for (const l of Mundo.lamparas) {
        if (l.x < v.x0 - 60 || l.x > v.x1 + 60 || l.y < v.y0 - 80 || l.y > v.y1 + 80) continue;
        g.drawImage(brillo, l.x - 18, l.y - 6, 36, 90);
      }
      g.globalAlpha = 0.4 * a;
      for (const c of J.carros) {
        if (!c.lucesPrendidas || c.aereo || c.x < v.x0 - 120 || c.x > v.x1 + 120 || c.y < v.y0 - 120 || c.y > v.y1 + 120) continue;
        g.save();
        g.translate(c.x, c.y);
        g.rotate(c.ang);
        g.drawImage(brillo, c.largo / 2, -c.ancho * 0.9, c.largo * 2.2, c.ancho * 1.8);
        g.restore();
      }
      g.restore();
    },
  };
  J.registrar(mod);

  return {
    get tipo() { return tipo; },
    get nombre() { return ESTADOS[tipo].nombre; },
    get nubes() { return nubes; },
    get niebla() { return niebla; },
    forzar(t) { if (ESTADOS[t]) { fijar(t); J.climaReloj = 120; } },
    estados: Object.keys(ESTADOS),

    actualizar(dt) {
      J.climaReloj -= dt;
      if (J.climaReloj <= 0) {
        J.climaReloj = Util.azar(C.duracionMin, C.duracionMax);
        fijar(elegir());
      }
      const e = ESTADOS[tipo];
      J.lluvia += (J.lluviaObj - J.lluvia) * Math.min(1, dt * 0.3);
      if (J.lluvia < 0.005 && J.lluviaObj === 0) J.lluvia = 0;
      nubes += (e.nubes - nubes) * Math.min(1, dt * 0.25);
      niebla += (e.niebla - niebla) * Math.min(1, dt * 0.2);
      J.niebla = niebla;
      if (tipo === 'tormenta' && !Ajustes.v.sinMovimiento) {
        proximoRayo -= dt;
        if (proximoRayo <= 0) { proximoRayo = Util.azar(4, 13); rayo = 1; trueno = Util.azar(0.3, 1.4); }
      }
      if (rayo > 0) rayo = Math.max(0, rayo - dt * 3.2);
      if (trueno >= 0) { trueno -= dt; if (trueno < 0) { Sonido.trueno(); J.sacudir(2); } }
    },

    // Coordenadas de pantalla (CSS px)
    dibujarPantalla(g, W, H, t) {
      if (nubes > 0.02) {
        g.fillStyle = `rgba(22,28,46,${0.3 * nubes})`;
        g.fillRect(0, 0, W, H);
      }
      if (niebla > 0.03) {
        const r = Math.hypot(W, H) / 2;
        const gr = g.createRadialGradient(W / 2, H / 2, r * 0.12, W / 2, H / 2, r * 0.95);
        const base = J.noche > 0.5 ? '40,48,70' : '205,212,225';
        gr.addColorStop(0, `rgba(${base},${0.12 * niebla})`);
        gr.addColorStop(1, `rgba(${base},${0.88 * niebla})`);
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      }
      if (rayo > 0.02) {
        g.fillStyle = `rgba(235,240,255,${Math.min(0.75, rayo * 0.8)})`;
        g.fillRect(0, 0, W, H);
      }
    },
  };
})();
