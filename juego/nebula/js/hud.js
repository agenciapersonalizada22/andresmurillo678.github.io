// =============================================================
//  HUD: marcador, vidas, jefe, banners, avisos y botones táctiles.
// =============================================================
const Hud = (() => {
  const W = CONFIG.ancho, H = CONFIG.alto, TAU = Math.PI * 2;
  const aj = () => Datos.aj;
  const fuente = () => Dibujo.FUENTE;
  let banner = null, toasts = [], hint = null, fps = 0;
  const H_ = {};

  H_.banner = (txt, sub, color, dur) => { banner = { txt, sub: sub || '', color: color || '#ffffff', t: 0, dur: dur || 2.2 }; };
  H_.toast = (txt, color, sub) => { toasts.push({ txt, sub: sub || '', color: color || '#ffd23d', t: 0 }); if (toasts.length > 4) toasts.shift(); };
  H_.hint = (txt) => { hint = txt ? { txt, t: 0 } : null; };
  H_.fps = (v) => { fps = v; };
  H_.limpiar = () => { banner = null; hint = null; };
  H_.actualizar = (dt) => {
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    if (hint) hint.t += dt;
    for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t += dt; if (toasts[i].t > 3.4) toasts.splice(i, 1); }
  };

  function txt(g, s, x, y, tam, color, align, peso) {
    const k = aj().textoGrande ? 1.2 : 1;
    g.font = (peso || 800) + ' ' + Math.round(tam * k) + 'px ' + fuente(); g.fillStyle = color || '#fff'; g.textAlign = align || 'left'; g.textBaseline = 'middle';
    g.fillText(s, x, y);
  }
  H_.txt = txt;

  function corazon(g, x, y, s, lleno, c) {
    g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y, x, y + s * 0.9);
    if (lleno) { g.fillStyle = c; g.fill(); } else { g.strokeStyle = c; g.lineWidth = 1.5; g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1; }
  }

  H_.dibujar = function (g, S, t, info) {
    const n = S.naves[S.yo | 0]; if (!n) return;
    const ms = Dibujo.pal();
    txt(g, Util.fmt(S.puntos), 14, 24, 22, '#fff');
    // multiplicador
    const mult = n.mult;
    if (mult > 1 || n.racha > 1) {
      txt(g, 'x' + mult, 14, 76, 16, mult >= 8 ? '#ff6bd5' : '#ffd23d');
      const lleno = n.rel / CONFIG.combo.ventana;
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(48, 72, 70, 5); g.fillStyle = '#ffd23d'; g.fillRect(48, 72, 70 * Math.max(0, Math.min(1, lleno)), 5);
    }
    // vidas
    for (let i = 0; i < n.vidaMax; i++) corazon(g, 20 + i * 22, 52, 8, i < n.vida, '#ff5c8a');
    for (let i = 0; i < n.escudo; i++) { g.strokeStyle = '#7dffb3'; g.lineWidth = 2; g.beginPath(); g.arc(20 + (n.vidaMax) * 22 + i * 18, 52, 6, 0, TAU); g.stroke(); }
    // arma
    const nombre = { pulso: 'PULSO', disp: 'DISPERSIÓN', laser: 'LÁSER', misil: 'MISILES' }[n.arma];
    txt(g, nombre, W - 14, 80, 11, '#9a8cff', 'right');
    for (let i = 0; i < 5; i++) { g.fillStyle = i < n.nivel ? '#3df5ff' : 'rgba(255,255,255,.18)'; g.fillRect(W - 14 - (5 - i) * 11, 90, 8, 5); }
    let ty = 106;
    if (n.rapido > 0) { txt(g, 'RÁPIDO ' + Math.ceil(n.rapido), W - 14, ty, 10, '#ffd23d', 'right'); ty += 14; }
    if (n.iman > 0) { txt(g, 'IMÁN ' + Math.ceil(n.iman), W - 14, ty, 10, '#c4a1ff', 'right'); ty += 14; }
    if (S.lento > 0) { txt(g, 'TIEMPO ' + Math.ceil(S.lento), W - 14, ty, 10, '#8ab4ff', 'right'); }
    // mundo / oleada
    txt(g, MUNDOS[S.mundo].nombre.toUpperCase() + ' · ' + (S.esJefe ? 'JEFE' : 'OLEADA ' + S.oleada), W / 2, 22, 11, '#9a8cff', 'center');
    // monedas
    txt(g, '$ ' + n.monedas, W / 2 + 0, 40, 11, '#ffd23d', 'center');
    // jefe
    if (S.jefe && S.jefe.intro <= 0.3) {
      const e = S.jefe, w = 320, x = (W - w) / 2, y = 112;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, w, 9);
      g.fillStyle = e.jefe.color; g.fillRect(x, y, w * Math.max(0, e.vida / e.vidaMax), 9);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.strokeRect(x, y, w, 9);
      for (let i = 1; i < e.jefe.fases.length; i++) { const px = x + w * e.jefe.fases[i].hp; g.fillStyle = '#fff'; g.fillRect(px - 1, y - 2, 2, 13); }
      txt(g, e.jefe.nombre.toUpperCase(), W / 2, y + 22, 11, e.jefe.color, 'center');
    }
    // barra de habilidad abajo (teclado / mando)
    if (!Entrada.mostrarTactil()) {
      const listo = n.habCd <= 0, w = 150, x = (W - w) / 2, y = H - 18;
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, y, w, 6);
      g.fillStyle = listo ? n.color : '#6a5ac0'; g.fillRect(x, y, w * (listo ? 1 : 1 - n.habCd / n.habMax), 6);
      const tecla = Entrada.dispositivo() === 'mando' ? 'X' : Entrada.codigoNombre(aj().teclas.hab[0]).toUpperCase();
      txt(g, (listo ? '[' + tecla + '] ' : '') + n.def.habNombre.toUpperCase() + (listo ? ' LISTA' : ''), W / 2, y - 9, 10, listo ? '#fff' : '#9a8cff', 'center');
    }
    if (info && info.mostrarFps) txt(g, fps + ' FPS', 14, H - 12, 11, fps < 40 ? '#ff6b6b' : '#7dffb3', 'left');
    // botón de pausa
    const bp = Entrada.botones.pausa;
    g.globalAlpha = 0.6; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(bp.x, bp.y, bp.r - 6, 0, TAU); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(bp.x - 5, bp.y - 6, 3.5, 12); g.fillRect(bp.x + 1.5, bp.y - 6, 3.5, 12); g.globalAlpha = 1;
    H_.tactil(g, n);
    // banner y pistas
    if (banner) {
      const a = Math.min(1, banner.t * 4, (banner.dur - banner.t) * 3), k = 1 + (1 - Math.min(1, banner.t * 3)) * 0.3;
      g.save(); g.globalAlpha = a; g.translate(W / 2, 300); g.scale(k, k);
      txt(g, banner.txt, 0, 0, 34, banner.color, 'center');
      if (banner.sub) txt(g, banner.sub, 0, 36, 14, '#c9c2ff', 'center', 500);
      g.restore(); g.globalAlpha = 1;
    }
    if (hint && aj().ayudas) {
      const a = Math.min(1, hint.t * 3);
      g.globalAlpha = a; g.fillStyle = 'rgba(8,4,22,.7)'; g.fillRect(24, 390, W - 48, 54); g.strokeStyle = '#3df5ff'; g.lineWidth = 1.5; g.strokeRect(24, 390, W - 48, 54);
      txt(g, hint.txt, W / 2, 417, 13, '#fff', 'center', 500); g.globalAlpha = 1;
    }
  };

  // Botones táctiles (habilidad / disparo)
  H_.tactil = function (g, n) {
    const B = Entrada.botones; if (!B.hab.ver) return;
    const op = aj().tactilOp;
    const boton = (b, etiqueta, color, frac) => {
      g.globalAlpha = op; g.fillStyle = 'rgba(10,6,28,.7)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke();
      if (frac < 1) { g.lineWidth = 6; g.strokeStyle = 'rgba(154,140,255,.9)'; g.beginPath(); g.arc(b.x, b.y, b.r - 6, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); }
      g.globalAlpha = Math.min(1, op + 0.3); txt(g, etiqueta, b.x, b.y, Math.max(10, b.r * 0.3), '#fff', 'center');
      g.globalAlpha = 1;
    };
    boton(B.hab, n.def.habNombre.split(' ')[0].toUpperCase(), n.habCd <= 0 ? n.color : '#6a5ac0', n.habCd <= 0 ? 1 : 1 - n.habCd / n.habMax);
    if (B.fuego.ver) boton(B.fuego, 'FUEGO', '#ff6b9a', 1);
  };

  H_.dibujarAvisos = function (g) {
    for (let i = 0; i < toasts.length; i++) {
      const o = toasts[i], a = Math.min(1, o.t * 5, (3.4 - o.t) * 3), y = 56 + i * 56 - (1 - Math.min(1, o.t * 5)) * 20;
      g.globalAlpha = a; g.fillStyle = 'rgba(8,4,22,.88)'; g.fillRect(W / 2 - 170, y - 22, 340, o.sub ? 48 : 36); g.strokeStyle = o.color; g.lineWidth = 2; g.strokeRect(W / 2 - 170, y - 22, 340, o.sub ? 48 : 36);
      txt(g, o.txt, W / 2, y - 6 + (o.sub ? 0 : 4), 13, o.color, 'center');
      if (o.sub) txt(g, o.sub, W / 2, y + 14, 10, '#c9c2ff', 'center', 500);
      g.globalAlpha = 1;
    }
  };
  return H_;
})();
