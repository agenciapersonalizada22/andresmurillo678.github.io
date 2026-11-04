// =============================================================
//  📍  LUGARES: marcadores de la ciudad (tiendas, cajeros, casas...),
//  barrios con nombre, puerto con lanchas y aeropuerto con helicópteros.
// =============================================================
const Lugares = (() => {
  const T = Mundo.T;
  const lista = [];
  const L = Mundo.lugares;

  function agregar(l) {
    l.r = l.r || 52;
    l.armado = true;
    l.color = l.color || '#ffffff';
    lista.push(l);
    return l;
  }

  // ----------------------------------------------------------- Barrios
  const NOMBRES = [
    ['Villa Norte', 'Centro Norte', 'Las Terrazas'],
    ['Colonia Vieja', 'Centro', 'Distrito Neón'],
    ['Barrio Sur', 'Zona Industrial', 'Costa Sur'],
  ];
  function distrito(x, y) {
    const p = L.puerto, a = L.aeropuerto;
    if (a && x >= a.x0 - 30 && x <= a.x1 + 30 && y >= a.y0 - 30 && y <= a.y1 + 30) return 'Aeropuerto';
    if (p && x >= p.x0 - 30 && x <= p.x1 + 30 && y >= p.y0 - 30 && y <= p.y1 + 30) return 'Puerto';
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    const t = Mundo.tipoEn(tx, ty);
    if (t === TIPO.ARENA || tx > Mundo.xCosta + 2) return 'Playa';
    if (ty >= Mundo.filaRio0 && ty <= Mundo.filaRio1) return 'El Río';
    const c = Math.min(2, Math.floor(x / Mundo.TAM * 3)), f = Math.min(2, Math.floor(y / Mundo.TAM * 3));
    return NOMBRES[f][c];
  }
  let ultimoDistrito = '';
  let relojDistrito = 0;

  // ----------------------------------------------------------- Dibujo de marcadores
  function dibujarMarcador(g, l, t) {
    const pulso = 1 + Math.sin(t * 4 + l.x) * 0.06;
    g.save();
    g.fillStyle = l.color;
    g.globalAlpha = 0.2;
    g.beginPath(); g.arc(l.x, l.y, 40 * pulso, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = l.color;
    g.lineWidth = 3;
    g.beginPath(); g.arc(l.x, l.y, 29 * pulso, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(10,8,25,0.9)';
    g.beginPath(); g.arc(l.x, l.y, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = l.color;
    g.font = `800 ${l.letra.length > 1 ? 13 : 18}px ${FUENTE}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(l.letra, l.x, l.y + 1);
    if (l.etiqueta) {
      g.font = `800 11px ${FUENTE}`;
      const w = g.measureText(l.etiqueta).width + 12;
      g.fillStyle = 'rgba(10,8,25,0.75)';
      Util.rectRedondo(g, l.x - w / 2, l.y - 62, w, 18, 9); g.fill();
      g.fillStyle = l.color;
      g.fillText(l.etiqueta, l.x, l.y - 52);
    }
    g.restore();
  }

  // Pista del aeropuerto, helipuertos, contenedores y muelle (se pinta bajo los carros)
  function dibujarSuelo(g, t, v) {
    const a = L.aeropuerto;
    if (a && a.x1 > v.x0 && a.x0 < v.x1 && a.y1 > v.y0 && a.y0 < v.y1) {
      const w = a.x1 - a.x0, h = a.y1 - a.y0;
      const horiz = w >= h;
      g.save();
      g.fillStyle = '#2f3138';
      if (horiz) g.fillRect(a.x0 + 8, a.y0 + h * 0.55, w - 16, h * 0.3); else g.fillRect(a.x0 + w * 0.55, a.y0 + 8, w * 0.3, h - 16);
      g.strokeStyle = '#f2f2f2'; g.lineWidth = 3; g.setLineDash([26, 22]);
      g.beginPath();
      if (horiz) { g.moveTo(a.x0 + 24, a.y0 + h * 0.7); g.lineTo(a.x1 - 24, a.y0 + h * 0.7); } else { g.moveTo(a.x0 + w * 0.7, a.y0 + 24); g.lineTo(a.x0 + w * 0.7, a.y1 - 24); }
      g.stroke();
      g.setLineDash([]);
      for (const p of helipuertos) {
        g.fillStyle = '#d6a21f'; g.beginPath(); g.arc(p.x, p.y, 36, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#23262e'; g.beginPath(); g.arc(p.x, p.y, 31, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f2f2f2'; g.font = `800 36px ${FUENTE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', p.x, p.y + 2);
      }
      g.restore();
    }
    const p = L.puerto;
    if (p && p.x1 > v.x0 && p.x0 < v.x1 && p.y1 > v.y0 && p.y0 < v.y1) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
      if (muelle && muelle.x > v.x0 - 200 && muelle.x < v.x1 + 200) {
        g.fillStyle = '#7a5a3a';
        g.fillRect(muelle.x - 70, muelle.y - 20, 140, 90 * muelle.sentido);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
        for (let k = -60; k <= 60; k += 20) { g.beginPath(); g.moveTo(muelle.x + k, muelle.y - 20); g.lineTo(muelle.x + k, muelle.y + 70 * muelle.sentido); g.stroke(); }
      }
      g.restore();
    }
  }

  // ----------------------------------------------------------- Vehículos fijos (lanchas y helicópteros)
  const helipuertos = [];
  let muelle = null;
  const puntos = [];       // { tipo, x, y, ang, carro }
  (function preparar() {
    const a = L.aeropuerto;
    if (a) {
      const w = a.x1 - a.x0, h = a.y1 - a.y0;
      const horiz = w >= h;
      for (let k = 0; k < 2; k++) {
        const x = horiz ? a.x0 + w * (0.3 + 0.35 * k) : a.x0 + w * 0.25;
        const y = horiz ? a.y0 + h * 0.28 : a.y0 + h * (0.3 + 0.35 * k);
        if (!Mundo.solidoCasilla(Math.floor(x / T), Math.floor(y / T))) { helipuertos.push({ x, y }); puntos.push({ tipo: 'helicoptero', x, y, ang: -Math.PI / 2, carro: null }); }
      }
    }
    const p = L.puerto;
    if (p) {
      const orillaY = (p.alRio === 1 ? Mundo.filaRio0 : Mundo.filaRio1) * T + T / 2;
      muelle = { x: p.x, y: orillaY, sentido: p.alRio };
      for (let k = 0; k < 2; k++) {
        const x = p.x - 70 + k * 140, y = orillaY + p.alRio * T * (2 + k * 0.6);
        puntos.push({ tipo: 'lancha', x, y, ang: k ? Math.PI : 0, carro: null });
      }
    }
  })();

  let relojPuntos = 0;
  function gestionarPuntos(dt) {
    relojPuntos -= dt;
    if (relojPuntos > 0) return;
    relojPuntos = 1.5;
    const foco = J.jugador.carro || J.jugador;
    for (const q of puntos) {
      if (q.carro && !J.carros.includes(q.carro)) q.carro = null;
      if (q.carro) continue;
      if (Math.hypot(q.x - foco.x, q.y - foco.y) > 1500) continue;
      if (J.carros.some((c) => Math.hypot(c.x - q.x, c.y - q.y) < 70)) continue;
      const c = q.tipo === 'lancha' ? new Lancha(q.x, q.y, q.ang, {}) : new Helicoptero(q.x, q.y, q.ang, {});
      c.punto = q;
      c.propio = false;
      J.carros.push(c);
      q.carro = c;
    }
  }

  // ----------------------------------------------------------- Módulo
  const mod = {
    actualizar(dt) {
      const p = J.jugador.carro || J.jugador;
      const aPie = !J.jugador.carro;
      for (const l of lista) {
        if (l.visible && l.visible() === false) continue;
        const d = Math.hypot(p.x - l.x, p.y - l.y);
        if (d < l.r) {
          if (!l.armado || !l.alEntrar) continue;
          if (l.aPie === true && !aPie) { if (J.tiempo - (l.avisoT || -9) > 5) { l.avisoT = J.tiempo; J.pista(l.nombre + ': hazlo a pie'); } continue; }
          if (l.aPie === false && aPie) continue;
          if (Misiones.activa && l.bloqueaMision) continue;
          l.armado = false;
          l.alEntrar(l);
        } else if (d > 105) l.armado = true;
      }
      relojDistrito -= dt;
      if (relojDistrito <= 0) {
        relojDistrito = 1;
        const dn = distrito(p.x, p.y);
        if (dn !== ultimoDistrito) {
          if (ultimoDistrito) J.pista('Zona: ' + dn);
          ultimoDistrito = dn;
          J.distrito = dn;
        }
      }
      gestionarPuntos(dt);
    },
    dibujarSuelo,
    dibujarMundo(g, t, v) {
      for (const l of lista) {
        if (l.visible && l.visible() === false) continue;
        if (l.x < v.x0 - 80 || l.x > v.x1 + 80 || l.y < v.y0 - 80 || l.y > v.y1 + 80) continue;
        dibujarMarcador(g, l, t);
      }
    },
  };
  J.registrar(mod);

  return {
    agregar, lista: () => lista.filter((l) => !l.visible || l.visible() !== false),
    distrito, NOMBRES,
    puntos, helipuertos,
    // Para el mapa grande: etiquetas de barrios
    dibujarBarrios(g, aPant, tam) {
      g.save();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.font = `700 ${Math.max(8, Math.min(13, tam / 44))}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let f = 0; f < 3; f++) {
        for (let c = 0; c < 3; c++) {
          const q = aPant((c + 0.5) / 3 * Mundo.TAM, (f + 0.5) / 3 * Mundo.TAM);
          g.fillText(NOMBRES[f][c].toUpperCase(), q.x, q.y);
        }
      }
      if (L.puerto) { const q = aPant(L.puerto.x, L.puerto.y); g.fillText('PUERTO', q.x, q.y - 8); }
      if (L.aeropuerto) { const q = aPant(L.aeropuerto.x, L.aeropuerto.y); g.fillText('AEROPUERTO', q.x, q.y - 8); }
      g.restore();
    },
  };
})();
