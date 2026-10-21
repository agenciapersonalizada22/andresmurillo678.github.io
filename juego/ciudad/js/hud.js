// =============================================================
//  📟  HUD: dinero, estrellas de "buscado", velocímetro, misión,
//  minimapa y el mapa grande. Todo se dibuja encima del juego.
// =============================================================
const HUD = (() => {
  const COL = CONFIG.colores;

  function texto(g, txt, x, y, tam, color, peso, alin, sombra) {
    g.font = `${peso || 800} ${Math.round(tam)}px ${FUENTE}`;
    g.textAlign = alin || 'left';
    g.textBaseline = 'middle';
    if (sombra !== false) {
      g.lineWidth = Math.max(2, tam * 0.22);
      g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.strokeText(txt, x, y);
    }
    g.fillStyle = color;
    g.fillText(txt, x, y);
  }

  function textoNormal(g, txt, x, y, tam, color, alin, peso) {
    g.font = `${peso || 600} ${Math.round(tam)}px ${FUENTE_TEXTO}`;
    g.textAlign = alin || 'left';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, tam * 0.25);
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    g.strokeText(txt, x, y);
    g.fillStyle = color;
    g.fillText(txt, x, y);
  }

  function panel(g, x, y, w, h, borde) {
    g.fillStyle = 'rgba(10,8,25,0.72)';
    Util.rectRedondo(g, x, y, w, h, 10);
    g.fill();
    if (borde) {
      g.strokeStyle = borde;
      g.lineWidth = 1.5;
      g.stroke();
    }
  }

  function estrellaHUD(g, x, y, r, llena, color) {
    estrella(g, x, y, r);
    if (llena) {
      g.fillStyle = color;
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 1.5;
      g.stroke();
    } else {
      g.fillStyle = 'rgba(10,8,25,0.7)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = 1.5;
      g.stroke();
    }
  }

  // A dónde apunta la flecha: la misión, o si no hay, el destino marcado en el mapa
  function destino() {
    const o = Misiones.objetivo();
    if (o) return o;
    return J.waypoint ? { x: J.waypoint.x, y: J.waypoint.y, color: '#3df5ff' } : null;
  }

  // ----------------------------------------------------------- Minimapa
  function iconoLetra(g, x, y, r, color, letra) {
    g.fillStyle = 'rgba(10,8,25,0.9)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = color;
    g.font = `800 ${Math.round(r * 1.2)}px ${FUENTE}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letra, x, y + 0.5);
  }

  function flechaJugador(g, x, y, ang, tam) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#0a0d18';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(tam, 0); g.lineTo(-tam * 0.7, -tam * 0.7); g.lineTo(-tam * 0.35, 0); g.lineTo(-tam * 0.7, tam * 0.7);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }

  function dibujarIconos(g, aPant, escalaIcono, t, dentro) {
    for (const m of Misiones.marcadores) {
      const p = aPant(m.x, m.y);
      if (!dentro(p)) continue;
      const info = Misiones.INFO[m.tipo];
      iconoLetra(g, p.x, p.y, 7 * escalaIcono, info.color, info.letra);
    }
    const pc = aPant(Mundo.lugares.comisaria.x, Mundo.lugares.comisaria.y);
    if (dentro(pc)) iconoLetra(g, pc.x, pc.y, 6 * escalaIcono, '#5c8dff', 'P');
    const fase = Math.floor(t * 6) % 2;
    for (const c of J.carros) {
      if (!c.esPolicia || !c.conductor || c.conductor === 'jugador') continue;
      const p = aPant(c.x, c.y);
      if (!dentro(p)) continue;
      const persigue = c.ia instanceof IAPolicia && c.ia.modo === 'perseguir';
      g.fillStyle = persigue ? (fase ? '#ff2a3d' : '#3d7bff') : '#7aa2ff';
      g.beginPath(); g.arc(p.x, p.y, (persigue ? 4 : 3) * escalaIcono, 0, Math.PI * 2); g.fill();
    }
    const a = Misiones.activa;
    if (a && a.tipo === 'carrera') {
      for (let k = a.k + 1; k < a.puntos.length; k++) {
        const p = aPant(a.puntos[k].x, a.puntos[k].y);
        if (!dentro(p)) continue;
        g.fillStyle = 'rgba(255,61,129,0.55)';
        g.beginPath(); g.arc(p.x, p.y, 3 * escalaIcono, 0, Math.PI * 2); g.fill();
      }
    }
  }

  function minimapa(g, cx, cy, R, t) {
    const j = J.jugador;
    const p = j.carro || j;
    const vel = j.carro ? j.carro.velocidad : 0;
    const rango = 950 + Math.min(700, vel * 0.9);
    J.rangoMini = J.rangoMini ? J.rangoMini + (rango - J.rangoMini) * 0.05 : rango;
    const k = R / J.rangoMini;
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fillStyle = '#1f4528';
    g.fill();
    g.clip();
    const esc = k * Mundo.T / Mundo.PX_MAPA;
    g.imageSmoothingEnabled = false;
    g.drawImage(Mundo.mapa, cx - p.x * k, cy - p.y * k, Mundo.mapa.width * esc, Mundo.mapa.height * esc);
    g.imageSmoothingEnabled = true;
    const aPant = (x, y) => ({ x: cx + (x - p.x) * k, y: cy + (y - p.y) * k });
    const dentro = (q) => Math.hypot(q.x - cx, q.y - cy) < R - 4;
    dibujarIconos(g, aPant, Util.limitar(R / 70, 0.8, 1.2), t, dentro);

    // Objetivo de la misión o destino (si está lejos, se pega a la orilla)
    const obj = destino();
    if (obj) {
      let q = aPant(obj.x, obj.y);
      const d = Math.hypot(q.x - cx, q.y - cy);
      const borde = d > R - 9;
      if (borde) {
        q = { x: cx + (q.x - cx) / d * (R - 9), y: cy + (q.y - cy) / d * (R - 9) };
      }
      const pul = 1 + Math.sin(t * 6) * 0.2;
      g.fillStyle = obj.color;
      g.strokeStyle = '#0a0d18';
      g.lineWidth = 2;
      g.beginPath(); g.arc(q.x, q.y, 6 * pul, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    flechaJugador(g, cx, cy, j.carro ? j.carro.ang : j.ang, 7);
    g.restore();
    g.strokeStyle = 'rgba(61,245,255,0.85)';
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(61,245,255,0.25)';
    g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy, R + 4, 0, Math.PI * 2); g.stroke();
  }

  // ----------------------------------------------------------- Partes del HUD
  function relojDia(g, x, y, u) {
    const h = J.hora;
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    const txt = `${String(hh).padStart(2, '0')}:${String(Math.floor(mm / 5) * 5).padStart(2, '0')}`;
    const noche = J.noche > 0.5;
    texto(g, txt, x + 7 * u, y, 13 * u, '#ffffff', 800, 'center');
    if (J.lluvia > 0.25) textoNormal(g, 'LLUVIA', x, y + 17 * u, 10 * u, '#9fc4ff', 'center', 800);
    const ix = x - 26 * u;
    if (noche) {
      g.fillStyle = '#e8ecff';
      g.beginPath(); g.arc(ix, y, 6 * u, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(10,8,25,1)';
      g.beginPath(); g.arc(ix + 3 * u, y - 2 * u, 5 * u, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#ffd23d';
      g.beginPath(); g.arc(ix, y, 5 * u, 0, Math.PI * 2); g.fill();
    }
  }

  function dineroYEstrellas(g, x, y, u, t) {
    const dz = J.efectoDinero;
    const escala = dz > 0 ? 1 + dz * 0.25 : 1;
    g.save();
    g.shadowColor = COL.dinero;
    g.shadowBlur = 10;
    texto(g, Util.dinero(J.mostrarDinero), x, y, 22 * u * escala, COL.dinero, 800, 'left');
    g.restore();
    if (J.deltaDinero && J.deltaDinero.t > 0) {
      const d = J.deltaDinero;
      g.globalAlpha = Math.min(1, d.t);
      const w = 22 * u * 6;
      texto(g, (d.v >= 0 ? '+' : '') + Util.dinero(d.v), x + w * 0.1, y + 26 * u, 14 * u, d.v >= 0 ? COL.dinero : '#ff6b6b', 800, 'left');
      g.globalAlpha = 1;
    }
    const b = J.buscado;
    const parpadeo = b.estrellas > 0 && b.sinVer > 1.5 && Math.floor(t * 4) % 2 === 0;
    const sy = y + (J.deltaDinero && J.deltaDinero.t > 0 ? 50 : 30) * u;
    for (let k = 0; k < 5; k++) {
      const llena = k < b.estrellas;
      g.globalAlpha = llena && parpadeo ? 0.35 : 1;
      if (llena) { g.shadowColor = COL.estrella; g.shadowBlur = 8; }
      estrellaHUD(g, x + 10 * u + k * 23 * u, sy, 10 * u, llena, COL.estrella);
      g.shadowBlur = 0;
    }
    g.globalAlpha = 1;
    return sy + 14 * u;
  }

  function panelCarro(g, x, y, w, u) {
    const c = J.jugador.carro;
    const kmh = Math.round(Math.abs(c.vf) * 0.225);
    const h = 74 * u;
    panel(g, x, y, w, h, 'rgba(61,245,255,0.35)');
    texto(g, String(kmh), x + 12 * u, y + 22 * u, 26 * u, '#ffffff', 800, 'left');
    g.font = `800 ${Math.round(26 * u)}px ${FUENTE}`;
    const ancho = g.measureText(String(kmh)).width;
    textoNormal(g, 'km/h', x + 16 * u + ancho, y + 26 * u, 11 * u, '#b9b2ff', 'left');
    textoNormal(g, c.t.nombre.toUpperCase(), x + w - 10 * u, y + 16 * u, 10 * u, '#b9b2ff', 'right', 700);
    // Barra de vida
    const f = c.vida / c.vidaMax;
    const bx = x + 12 * u, by = y + 42 * u, bw = w - 24 * u, bh = 7 * u;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = f > 0.6 ? '#7dff6b' : f > 0.3 ? '#ffd23d' : '#ff4b4b';
    g.fillRect(bx, by, bw * f, bh);
    const est = Radio.estacion;
    const txt = est ? '♪ ' + est.nombre : 'RADIO APAGADA';
    const destello = J.radioAviso > 0 && Math.floor(J.radioAviso * 6) % 2 === 0;
    textoNormal(g, c.averiado ? '¡MOTOR AVERIADO!' : txt, x + 12 * u, y + 60 * u, 11 * u,
      c.averiado ? '#ff6b6b' : (est ? (destello ? '#ffffff' : est.color) : '#8a84b0'), 'left', 800);
  }

  function panelArma(g, x, y, w, u) {
    const a = Armas.info();
    const h = 40 * u;
    panel(g, x, y, w, h, 'rgba(255,138,61,0.6)');
    textoNormal(g, a.nombre.toUpperCase(), x + 12 * u, y + 14 * u, 11 * u, '#ff8a3d', 'left', 800);
    const sin = a.balas <= 0;
    textoNormal(g, sin ? 'SIN MUNICIÓN' : `${a.balas} / ${a.max}`, x + 12 * u, y + 29 * u, 12 * u, sin ? '#ff6b6b' : '#ffffff', 'left', 800);
    const bw = 8 * u;
    for (let k = 0; k < Math.min(a.balas, 12); k++) {
      g.fillStyle = '#ffd23d';
      g.fillRect(x + w - 12 * u - (k + 1) * (bw / 2 + 2 * u), y + h - 16 * u, bw / 2, 11 * u);
    }
  }

  function panelMision(g, x, y, w, u, info, t) {
    const h = 56 * u;
    panel(g, x, y, w, h);
    g.fillStyle = info.color;
    Util.rectRedondo(g, x, y, 5 * u, h, 3);
    g.fill();
    texto(g, info.titulo, x + 14 * u, y + 15 * u, 12.5 * u, info.color, 800, 'left');
    // Si el panel es angosto, la letra se achica un poco para que quepa
    let tamLinea = 12 * u;
    g.font = `600 ${Math.round(tamLinea)}px ${FUENTE_TEXTO}`;
    const anchoLinea = g.measureText(info.linea).width, cabe = w - 24 * u;
    if (anchoLinea > cabe) tamLinea = Math.max(8, tamLinea * cabe / anchoLinea);
    textoNormal(g, info.linea, x + 14 * u, y + 34 * u, tamLinea, '#ffffff', 'left');
    const obj = Misiones.objetivo();
    const p = J.jugador.carro || J.jugador;
    if (obj) {
      const m = Math.round(Math.hypot(obj.x - p.x, obj.y - p.y) / 16);
      textoNormal(g, `${m} m`, x + 14 * u, y + 48 * u, 10 * u, '#b9b2ff', 'left', 700);
    }
    if (info.tiempo !== undefined) {
      const s = Math.max(0, Math.ceil(info.tiempo));
      const urgente = s <= 10 && Math.floor(t * 4) % 2 === 0;
      texto(g, `${s}s`, x + w - 12 * u, y + 17 * u, 17 * u, urgente ? '#ff4b4b' : '#ffffff', 800, 'right');
      const f = Util.limitar(info.tiempo / info.tiempoMax, 0, 1);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x + w * 0.62, y + h - 9 * u, w * 0.38 - 12 * u, 4 * u);
      g.fillStyle = s <= 10 ? '#ff4b4b' : info.color;
      g.fillRect(x + w * 0.62, y + h - 9 * u, (w * 0.38 - 12 * u) * f, 4 * u);
    }
  }

  function flechaObjetivo(g, W, H, u, t) {
    const obj = destino();
    if (!obj) return;
    const j = J.jugador;
    const p = j.carro || j;
    const ps = J.aPantalla(p.x, p.y);
    const os = J.aPantalla(obj.x, obj.y);
    const dx = os.x - ps.x, dy = os.y - ps.y;
    const d = Math.hypot(dx, dy);
    if (d < 90 * u) return;
    const ang = Math.atan2(dy, dx);
    const r = (j.carro ? 62 : 46) * u + Math.sin(t * 6) * 4;
    g.save();
    g.translate(ps.x + Math.cos(ang) * r, ps.y + Math.sin(ang) * r);
    g.rotate(ang);
    g.shadowColor = obj.color;
    g.shadowBlur = 12;
    g.fillStyle = obj.color;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    g.lineWidth = 2;
    const s = 14 * u;
    g.beginPath();
    g.moveTo(s, 0); g.lineTo(-s * 0.6, -s * 0.75); g.lineTo(-s * 0.2, 0); g.lineTo(-s * 0.6, s * 0.75);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;
    g.stroke();
    g.restore();
    textoNormal(g, `${Math.round(Math.hypot(obj.x - p.x, obj.y - p.y) / 16)} m`, ps.x + Math.cos(ang) * (r + 24 * u), ps.y + Math.sin(ang) * (r + 24 * u), 10 * u, '#ffffff', 'center', 700);
  }

  function avisoCentral(g, W, H, u) {
    const a = J.aviso;
    if (!a) return;
    const k = a.t / a.dur;
    const alfa = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
    const esc = k < 0.1 ? 0.8 + k * 2 : 1;
    g.save();
    g.globalAlpha = Util.limitar(alfa, 0, 1);
    const y = H * 0.32;
    const tam = Math.min(34 * u * esc, W / (a.titulo.length * 0.75 + 1));
    g.shadowColor = a.color;
    g.shadowBlur = 18;
    texto(g, a.titulo, W / 2, y, tam, a.color, 800, 'center');
    g.shadowBlur = 0;
    if (a.sub) {
      g.font = `700 ${Math.round(14 * u)}px ${FUENTE_TEXTO}`;
      const w = Math.min(W - 24, g.measureText(a.sub).width + 24 * u);
      panel(g, W / 2 - w / 2, y + 22 * u, w, 26 * u);
      textoNormal(g, a.sub, W / 2, y + 35 * u, Math.min(14 * u, (W - 40) / (a.sub.length * 0.52)), '#ffffff', 'center', 700);
    }
    g.restore();
  }

  function pista(g, W, H, u) {
    const p = J.pistaInfo;
    if (!p || p.t <= 0) return;
    const y = Entrada.tactil ? (H > W ? H - 230 * u : H * 0.6) : H - 70;
    g.save();
    g.globalAlpha = Math.min(1, p.t * 2);
    g.font = `700 ${Math.round(14 * u)}px ${FUENTE_TEXTO}`;
    const w = Math.min(W - 24, g.measureText(p.texto).width + 30 * u);
    panel(g, W / 2 - w / 2, y - 16 * u, w, 32 * u, 'rgba(255,210,61,0.6)');
    textoNormal(g, p.texto, W / 2, y, Math.min(14 * u, (W - 40) / (p.texto.length * 0.5)), '#ffd23d', 'center', 700);
    g.restore();
  }

  function etiquetaSubir(g, u) {
    const j = J.jugador;
    if (j.carro || j.caido > 0) return;
    const c = J.carroCerca;
    if (!c) return;
    const p = J.aPantalla(c.x, c.y);
    const txt = Entrada.tactil ? 'SUBIR' : 'E · SUBIR';
    g.font = `800 ${Math.round(12 * u)}px ${FUENTE}`;
    const w = g.measureText(txt).width + 16 * u;
    const y = p.y - 34 * u;
    panel(g, p.x - w / 2, y - 11 * u, w, 22 * u, '#3df5ff');
    texto(g, txt, p.x, y, 12 * u, '#3df5ff', 800, 'center', false);
  }

  function alertaPolicia(g, W, H, u, t) {
    const b = J.buscado;
    if (b.atrapar <= 0) return;
    const f = b.atrapar / CONFIG.policia.tiempoAtrapar;
    const y = H * 0.45;
    g.save();
    const fase = Math.floor(t * 8) % 2;
    texto(g, '¡ALTO! ¡POLICÍA!', W / 2, y, 22 * u, fase ? '#ff4b5c' : '#5c8dff', 800, 'center');
    const w = 180 * u;
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(W / 2 - w / 2, y + 18 * u, w, 8 * u);
    g.fillStyle = '#ff4b5c';
    g.fillRect(W / 2 - w / 2, y + 18 * u, w * f, 8 * u);
    textoNormal(g, '¡Muévete para escapar!', W / 2, y + 40 * u, 12 * u, '#ffffff', 'center', 700);
    g.restore();
  }

  // ----------------------------------------------------------- Pantallas
  function pantallaAtrapado(g, W, H, u, t) {
    const k = J.relojAtrapado;
    const fase = Math.floor(t * 5) % 2;
    g.fillStyle = fase ? 'rgba(255,40,60,0.18)' : 'rgba(40,90,255,0.18)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(5,3,15,0.55)';
    g.fillRect(0, 0, W, H);
    const tam = Math.min(46 * u, W / 8);
    g.save();
    g.shadowColor = '#ff4b5c';
    g.shadowBlur = 20;
    texto(g, '¡ATRAPADO!', W / 2, H * 0.4, tam, '#ff4b5c', 800, 'center');
    g.restore();
    textoNormal(g, `Multa: -${Util.dinero(J.multa || 0)}`, W / 2, H * 0.4 + 46 * u, 18 * u, '#ffffff', 'center', 800);
    textoNormal(g, 'Te llevan a la comisaría...', W / 2, H * 0.4 + 74 * u, 14 * u, '#b9b2ff', 'center', 700);
    g.globalAlpha = Math.max(0, Math.min(1, (0.6 - k) / 0.6));
    g.fillStyle = '#05030f';
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }

  function mapaCompleto(g, W, H, u, t, s) {
    g.fillStyle = 'rgba(5,3,15,0.92)';
    g.fillRect(0, 0, W, H);
    const angosto = W < 600;
    const arriba = 60 + Math.max(0, s.t - 10), abajo = (angosto ? 92 : 70) + s.b;
    const tam = Math.max(100, Math.min(W - 24, H - arriba - abajo));
    const x0 = (W - tam) / 2, y0 = arriba + (H - arriba - abajo - tam) / 2;
    const k = tam / Mundo.TAM;
    g.imageSmoothingEnabled = false;
    g.drawImage(Mundo.mapa, x0, y0, tam, tam);
    g.imageSmoothingEnabled = true;
    g.strokeStyle = 'rgba(61,245,255,0.8)';
    g.lineWidth = 2;
    g.strokeRect(x0 - 1, y0 - 1, tam + 2, tam + 2);
    const aPant = (x, y) => ({ x: x0 + x * k, y: y0 + y * k });
    const ei = Util.limitar(tam / 400, 0.9, 1.6);
    dibujarIconos(g, aPant, ei, t, () => true);
    J.zonaMapa = { x0, y0, tam };
    if (J.waypoint) {
      const q = aPant(J.waypoint.x, J.waypoint.y);
      g.fillStyle = '#3df5ff';
      g.strokeStyle = '#0a0d18';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + 6 * ei, q.y - 12 * ei); g.lineTo(q.x, q.y - 22 * ei); g.lineTo(q.x - 6 * ei, q.y - 12 * ei);
      g.closePath(); g.fill(); g.stroke();
    }
    const obj = Misiones.objetivo();
    if (obj) {
      const q = aPant(obj.x, obj.y);
      const pul = 1 + Math.sin(t * 6) * 0.25;
      g.fillStyle = obj.color;
      g.strokeStyle = '#0a0d18';
      g.lineWidth = 2;
      g.beginPath(); g.arc(q.x, q.y, 7 * ei * pul, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    const j = J.jugador;
    const p = aPant(j.x, j.y);
    flechaJugador(g, p.x, p.y, j.carro ? j.carro.ang : j.ang, 9 * ei);
    if (!angosto) texto(g, 'MAPA', W / 2, 30, 20 * u, '#3df5ff', 800, 'center');
    // Leyenda
    const items = [['T', 'Taxi', Misiones.INFO.taxi.color], ['E', 'Entregas', Misiones.INFO.entrega.color],
      ['C', 'Carrera', Misiones.INFO.carrera.color], ['R', 'Taller', Misiones.INFO.taller.color], ['A', 'Armería', Misiones.INFO.tienda.color], ['P', 'Policía', '#5c8dff']];
    const porFila = angosto ? 3 : 6;
    const paso = Math.min(110 * u, (W - 20) / porFila);
    items.forEach(([l, n, c], i) => {
      const fila = Math.floor(i / porFila), col = i % porFila;
      const enFila = Math.min(porFila, items.length - fila * porFila);
      const lx = W / 2 - paso * enFila / 2 + paso / 2 + col * paso;
      const ly = y0 + tam + 20 + fila * 22;
      iconoLetra(g, lx - 26 * u, ly, 8 * u, c, l);
      textoNormal(g, n, lx - 14 * u, ly, 11 * u, '#ffffff', 'left', 700);
    });
    textoNormal(g, Entrada.tactil ? 'Toca el mapa para marcar un destino · fuera del mapa para cerrar' : 'Clic en el mapa: marcar destino · M para cerrar',
      W / 2, H - 14, Math.min(12 * u, (W - 20) / 52), '#b9b2ff', 'center', 700);
  }

  // ----------------------------------------------------------- Todo junto
  // Dónde termina la barra de botones de arriba (← Menú, II, MAPA).
  // Se mide de vez en cuando (no en cada cuadro) para no gastar.
  let finBarra = 0, proximaMedida = 0;
  function medirBarra() {
    const ahora = performance.now();
    if (ahora >= proximaMedida) {
      proximaMedida = ahora + 1000;
      const b = document.getElementById('barra');
      if (b) finBarra = b.getBoundingClientRect().right;
    }
    return finBarra || 250;
  }

  function dibujar(g, W, H, t) {
    const u = Util.limitar(Math.min(W, H) / 520, 0.72, 1.2);
    J.hudEscala = u;
    // Márgenes que respetan la muesca / esquinas redondas del celular
    const s = J.seguro || { t: 0, r: 0, b: 0, l: 0 };
    const mIzq = 14 + s.l, mDer = 14 + s.r, mAbajo = 14 + s.b;
    const bajarArriba = Math.max(0, s.t - 10); // la barra baja lo mismo (top: max(10px, inset))
    if (J.modo === 'mapa') { mapaCompleto(g, W, H, u, t, s); return; }
    if (J.modo === 'atrapado') { pantallaAtrapado(g, W, H, u, t); return; }

    etiquetaSubir(g, u);

    const R = Math.round(Util.limitar(Math.min(W, H) * 0.14, 48, 92));
    const mmx = W - R - mDer, mmy = R + 14 + bajarArriba;
    minimapa(g, mmx, mmy, R, t);
    J.zonaMinimapa = { x: mmx, y: mmy, r: R };
    relojDia(g, mmx, mmy + R + 16 * u, u);

    const finIzq = dineroYEstrellas(g, mIzq, 64 + bajarArriba, u, t);

    const info = Misiones.info();
    if (info) {
      // Si cabe, el panel de misión va arriba al centro, entre la barra y el
      // minimapa (pantallas anchas y celulares acostados). Si no cabe
      // (celular parado), va a lo ancho debajo del minimapa.
      const a = medirBarra() + 10, b = mmx - R - 10;
      const w = Math.min(470 * u, b - a);
      if (w >= 190) {
        const x = Util.limitar(W / 2 - w / 2, a, b - w);
        panelMision(g, x, 12 + bajarArriba, w, u, info, t);
      } else {
        const y = Math.max(mmy + R + 32 * u, finIzq + 8);
        panelMision(g, mIzq - 4, y, W - mIzq - mDer + 8, u, info, t);
      }
    }

    if (J.jugador.carro) {
      const w = 170 * u;
      let x, y;
      if (Entrada.tactil) {
        // Parado: a la derecha, encima de los botones. Acostado: abajo al centro.
        if (H > W) { x = W - w - 12 - s.r; y = H - 172 - 82 * u - s.b; }
        else { x = W / 2 - w / 2; y = H - 74 * u - 12 - s.b; }
      } else {
        x = mIzq; y = H - 74 * u - mAbajo;
      }
      panelCarro(g, x, y, w, u);
    }

    if (!J.jugador.carro && Armas.info()) {
      const w = 150 * u;
      let x, y;
      if (Entrada.tactil) {
        if (H > W) { x = W - w - 12 - s.r; y = H - 172 - 56 * u - s.b; }
        else { x = W / 2 - w / 2; y = H - 40 * u - 12 - s.b; }
      } else {
        x = mIzq; y = H - 40 * u - mAbajo;
      }
      panelArma(g, x, y, w, u);
    }

    // La flecha va al final para que ningún panel la tape
    flechaObjetivo(g, W, H, u, t);

    if (J.modo === 'pausa') return;
    alertaPolicia(g, W, H, u, t);
    avisoCentral(g, W, H, u);
    pista(g, W, H, u);
  }

  return { dibujar };
})();
