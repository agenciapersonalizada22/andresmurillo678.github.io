// =============================================================
//  🚓  POLICÍA AVANZADA
//   3+ estrellas: helicóptero con reflector (te mantiene "visto")
//   4+ estrellas: bloqueos de carretera por delante
//   5 estrellas : camionetas SWAT, pesadas y resistentes
// =============================================================
const Policia2 = (() => {
  const T = Mundo.T;
  let heli = null;
  let relojBloqueo = 8;
  let relojSwat = 4;
  const barreras = [];     // { x, y, ang, t }

  class HeliPolicia {
    constructor(foco) {
      const a = Math.random() * Math.PI * 2;
      this.x = foco.x + Math.cos(a) * 1500;
      this.y = foco.y + Math.sin(a) * 1500;
      this.vx = 0; this.vy = 0;
      this.ang = a + Math.PI;
      this.rotor = 0;
      this.luz = { x: this.x, y: this.y };
      this.perdido = 0;
      this.saliendo = false;
    }

    actualizar(dt, p, estrellas) {
      this.saliendo = estrellas < 3;
      let tx, ty, vmax = 540;
      if (this.saliendo) {
        const a = Math.atan2(this.y - p.y, this.x - p.x);
        tx = this.x + Math.cos(a) * 900; ty = this.y + Math.sin(a) * 900;
      } else {
        tx = p.x + (p.vx || 0) * 0.5; ty = p.y + (p.vy || 0) * 0.5;
      }
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = Math.min(vmax, d * 1.6);
      this.vx += (dx / d * v - this.vx) * Math.min(1, dt * 1.4);
      this.vy += (dy / d * v - this.vy) * Math.min(1, dt * 1.4);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.hypot(this.vx, this.vy) > 30) {
        const o = Math.atan2(this.vy, this.vx);
        this.ang += Util.difAngulo(o, this.ang) * Math.min(1, dt * 3);
      }
      this.rotor += dt * 45;
      this.luz.x += (p.x - this.luz.x) * Math.min(1, dt * 2.2);
      this.luz.y += (p.y - this.luz.y) * Math.min(1, dt * 2.2);
      const dp = Math.hypot(this.x - p.x, this.y - p.y);
      this.perdido = dp > 1300 ? this.perdido + dt : 0;
    }

    ilumina(p) { return !this.saliendo && Math.hypot(this.luz.x - p.x, this.luz.y - p.y) < 105; }

    dibujarSombra(g) {
      g.save();
      g.translate(this.x + 18, this.y + 26);
      g.rotate(this.ang);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.beginPath(); g.ellipse(0, 0, 36, 13, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    dibujar(g, t) {
      g.save();
      g.translate(this.x, this.y);
      g.rotate(this.ang);
      g.scale(1.15, 1.15);
      g.fillStyle = '#1b2440';
      g.fillRect(-38, -2, 26, 4);
      g.fillRect(-38, -5, 5, 10);
      g.beginPath(); g.ellipse(4, 0, 22, 12, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#0a0f20'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = 'rgba(120,190,255,0.7)';
      g.beginPath(); g.ellipse(14, 0, 8, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = Math.floor(t * 6) % 2 ? '#ff2a3d' : '#3d7bff';
      g.beginPath(); g.arc(-2, 0, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(210,220,235,0.16)';
      g.beginPath(); g.arc(4, 0, 40, 0, Math.PI * 2); g.fill();
      g.rotate(this.rotor);
      g.strokeStyle = 'rgba(30,30,40,0.9)'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-40, 0); g.lineTo(40, 0); g.moveTo(0, -40); g.lineTo(0, 40); g.stroke();
      g.restore();
    }
  }

  // ----------------------------------------------------------- Bloqueos
  function crearBloqueo(p) {
    const vel = Math.hypot(p.vx || 0, p.vy || 0);
    let ux, uy;
    if (vel > 120) { ux = p.vx / vel; uy = p.vy / vel; } else { const a = Math.random() * Math.PI * 2; ux = Math.cos(a); uy = Math.sin(a); }
    const dist = Util.azar(750, 1050);
    const c = Mundo.carrilAzar(p.x + ux * dist, p.y + uy * dist, 0, 260, (q) => Math.hypot(q.x - p.x, q.y - p.y) > 600);
    if (!c) return false;
    const ang = c.dir * Math.PI / 2;
    const px = -Math.sin(ang), py = Math.cos(ang);
    const cars = [];
    for (const lado of [-1, 1]) {
      const car = new Carro('policia', c.x + px * lado * 34, c.y + py * lado * 34, ang + Math.PI / 2 + lado * 0.25, { conductor: 'ia' });
      car.bloqueo = true;
      car.sirena = true;
      car.mando.gas = 0; car.mando.giro = 0; car.mando.freno = true;
      car.dirBloqueo = { x: ux, y: uy };
      car.tBloqueo = J.tiempo;
      J.carros.push(car);
      cars.push(car);
    }
    barreras.push({ x: c.x, y: c.y, ang: ang + Math.PI / 2, t: J.tiempo });
    return true;
  }

  let heliR = null;
  const mod = {
    actualizar(dt) {
      if (J.multiCliente) return;
      const b = J.buscado;
      const p = J.jugador.carro || J.jugador;
      // Helicóptero
      if (b.estrellas >= 3 && !heli) {
        heli = new HeliPolicia(p);
        J.pista('Apoyo aéreo en camino: ¡escóndete bajo un puente o pierde al helicóptero!');
        Sonido.estrella();
      }
      if (heli) {
        heli.actualizar(dt, p, b.estrellas);
        if (heli.ilumina(p)) { b.sinVer = 0; b.visto = true; }
        if ((heli.saliendo && Math.hypot(heli.x - p.x, heli.y - p.y) > 1700) || heli.perdido > 8) heli = null;
      }
      // Bloqueos
      if (b.estrellas >= 4) {
        relojBloqueo -= dt;
        if (relojBloqueo <= 0) {
          relojBloqueo = Util.azar(18, 30);
          if (J.carros.filter((c) => c.bloqueo).length < 4) crearBloqueo(p);
        }
      } else relojBloqueo = Math.min(relojBloqueo, 8);
      for (const c of J.carros) {
        if (!c.bloqueo) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        const pasado = (p.x - c.x) * c.dirBloqueo.x + (p.y - c.y) * c.dirBloqueo.y < -60;
        if (b.estrellas > 0 && (pasado && d < 750 || J.tiempo - c.tBloqueo > 75)) {
          c.bloqueo = false;
          c.ia = new IAPolicia(c);
        } else if (b.estrellas === 0) { c.bloqueo = false; c.ia = new IAPolicia(c); c.ia.retirarse(); }
      }
      for (let k = barreras.length - 1; k >= 0; k--) if (J.tiempo - barreras[k].t > 80 || b.estrellas === 0) barreras.splice(k, 1);
      // SWAT
      if (b.estrellas >= 5) {
        relojSwat -= dt;
        const n = J.carros.filter((c) => c.tipo === 'swat' && c.ia instanceof IAPolicia && !c.averiado).length;
        if (relojSwat <= 0 && n < 2) { relojSwat = 7; const s = J.crearPatrulla(p, 'swat'); if (s && n === 0) J.pista('¡Unidad SWAT en camino!'); }
      }
    },

    alLimpiarBuscado(inmediato) {
      for (let k = J.carros.length - 1; k >= 0; k--) {
        const c = J.carros[k];
        if (c.tipo !== 'swat' && !c.bloqueo) continue;
        if (inmediato) J.carros.splice(k, 1);
        else if (c.ia instanceof IAPolicia) c.ia.retirarse();
      }
      if (inmediato) barreras.length = 0;
      if (heli) heli.saliendo = true;
    },

    dibujarSuelo(g, t, v) {
      for (const b of barreras) {
        if (b.x < v.x0 - 80 || b.x > v.x1 + 80 || b.y < v.y0 - 80 || b.y > v.y1 + 80) continue;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.ang);
        g.fillStyle = '#f2f2f2';
        g.fillRect(-36, -4, 72, 8);
        g.fillStyle = '#e8352b';
        for (let k = -36; k < 36; k += 16) g.fillRect(k, -4, 8, 8);
        g.restore();
      }
    },

    dibujarMundo(g, t, v) {
      if (J.multiCliente && heliR) { const h = heliR; h.rotor += 0.7; h.luz.x += (J.jugador.x - h.luz.x) * 0.05; h.luz.y += (J.jugador.y - h.luz.y) * 0.05; h.dibujarSombra(g); h.dibujar(g, t); return; }
      if (!heli) return;
      if (heli.x < v.x0 - 80 || heli.x > v.x1 + 80 || heli.y < v.y0 - 80 || heli.y > v.y1 + 80) {
        if (!(heli.luz.x > v.x0 - 120 && heli.luz.x < v.x1 + 120 && heli.luz.y > v.y0 - 120 && heli.luz.y < v.y1 + 120)) return;
      }
      heli.dibujarSombra(g);
      // Reflector sobre el piso
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(heli.luz.x, heli.luz.y, 5, heli.luz.x, heli.luz.y, 110);
      gr.addColorStop(0, `rgba(255,255,230,${0.38 + J.noche * 0.3})`);
      gr.addColorStop(1, 'rgba(255,255,230,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(heli.luz.x, heli.luz.y, 110, 0, Math.PI * 2); g.fill();
      g.restore();
      heli.dibujar(g, t);
    },
  };
  J.registrar(mod);

  return {
    get heli() { return heli; },
    // Para el minimapa
    posHeli() { return heli ? { x: heli.x, y: heli.y, ang: heli.ang } : null; },
    fijarRemoto(d) {
      if (!d) { heliR = null; return; }
      if (!heliR) heliR = new HeliPolicia(d);
      heliR.x = d.x; heliR.y = d.y; heliR.ang = d.ang;
    },
  };
})();
