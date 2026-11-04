// =============================================================
//  🚤🚁  MÁS VEHÍCULOS: SUV, superdeportivo, SWAT, lancha y helicóptero,
//  además de daño visible, neón y mejoras (tuning) para cualquier carro.
//  Se engancha a Carro y SpritesCarro (vehiculos.js) sin tocar su código.
// =============================================================
(() => {
  const SP = SpritesCarro.personalizados;
  const T = Mundo.T;

  // ----------------------------------------------------------- Dibujos
  SP.suv = (g, L, A, color, h) => {
    g.fillStyle = '#15161a';
    for (const sx of [-0.3, 0.3]) for (const sy of [-1, 1]) g.fillRect(L * sx - 6, sy * A / 2 - 2.5, 12, 5);
    h.cuerpo(g, L, A, color);
    const a = A / 2;
    g.fillStyle = Util.tono(color, 0.12);
    g.fillRect(-L * 0.3, -a + 3, L * 0.5, A - 6);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    for (const y of [-a * 0.55, a * 0.55]) { g.beginPath(); g.moveTo(-L * 0.28, y); g.lineTo(L * 0.18, y); g.stroke(); }
    h.vidrio(g, L * 0.2, L * 0.33, a - 3, a - 5.5);
    h.vidrio(g, -L * 0.3, -L * 0.4, a - 3.5, a - 5);
    g.fillStyle = '#fff6c8'; g.fillRect(L / 2 - 4, -a + 3, 3, 6); g.fillRect(L / 2 - 4, a - 9, 3, 6);
    g.fillStyle = '#b3122a'; g.fillRect(-L / 2 + 1, -a + 3, 2.5, 6); g.fillRect(-L / 2 + 1, a - 9, 2.5, 6);
  };

  SP.superdeportivo = (g, L, A, color, h) => {
    g.fillStyle = '#15161a';
    for (const sx of [-0.3, 0.3]) for (const sy of [-1, 1]) g.fillRect(L * sx - 6.5, sy * A / 2 - 3, 13, 6);
    // Carrocería en cuña
    const gr = g.createLinearGradient(0, -A / 2, 0, A / 2);
    gr.addColorStop(0, Util.tono(color, -0.35)); gr.addColorStop(0.5, Util.tono(color, 0.18)); gr.addColorStop(1, Util.tono(color, -0.35));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(L / 2, -A * 0.28); g.quadraticCurveTo(L / 2 - 4, -A / 2, L * 0.25, -A / 2);
    g.lineTo(-L / 2 + 6, -A / 2); g.quadraticCurveTo(-L / 2, -A / 2, -L / 2, -A * 0.35);
    g.lineTo(-L / 2, A * 0.35); g.quadraticCurveTo(-L / 2, A / 2, -L / 2 + 6, A / 2);
    g.lineTo(L * 0.25, A / 2); g.quadraticCurveTo(L / 2 - 4, A / 2, L / 2, A * 0.28);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.fillRect(-L / 2 + 6, -2.8, L - 12, 2); g.fillRect(-L / 2 + 6, 0.8, L - 12, 2);
    h.vidrio(g, L * 0.05, L * 0.22, A / 2 - 3.5, A / 2 - 6);
    h.vidrio(g, -L * 0.18, -L * 0.3, A / 2 - 4, A / 2 - 5.5);
    g.fillStyle = '#101116'; g.fillRect(-L / 2 - 1, -A / 2 + 1, 5, A - 2);              // alerón
    g.fillStyle = '#fff6c8'; g.fillRect(L / 2 - 5, -A / 2 + 4, 3, 4); g.fillRect(L / 2 - 5, A / 2 - 8, 3, 4);
  };

  SP.swat = (g, L, A, color, h) => {
    g.fillStyle = '#15161a';
    for (const sx of [-0.32, 0.32]) for (const sy of [-1, 1]) g.fillRect(L * sx - 6, sy * A / 2 - 2.5, 12, 5);
    h.cuerpo(g, L, A, '#262c3d');
    const a = A / 2;
    g.fillStyle = '#323a52';
    g.fillRect(-L * 0.42, -a + 3, L * 0.55, A - 6);
    g.fillStyle = '#e8ecf3';
    g.font = '800 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(-L * 0.12, 0); g.rotate(Math.PI / 2); g.fillText('SWAT', 0, 0); g.restore();
    h.vidrio(g, L * 0.3, L * 0.42, a - 4, a - 6);
    g.fillStyle = '#10131c'; g.fillRect(L * 0.18, -a + 3.5, L * 0.12, A - 7);
    g.fillStyle = '#fff6c8'; g.fillRect(L / 2 - 4, -a + 3, 3, 6); g.fillRect(L / 2 - 4, a - 9, 3, 6);
    g.fillStyle = '#b3122a'; g.fillRect(-L / 2 + 1, -a + 3, 2.5, 6); g.fillRect(-L / 2 + 1, a - 9, 2.5, 6);
  };

  SP.lancha = (g, L, A, color) => {
    const a = A / 2;
    g.fillStyle = Util.tono(color, -0.2);
    g.beginPath();
    g.moveTo(L / 2, 0); g.quadraticCurveTo(L * 0.2, -a - 1, -L * 0.2, -a); g.lineTo(-L / 2, -a * 0.8); g.lineTo(-L / 2, a * 0.8); g.lineTo(-L * 0.2, a);
    g.quadraticCurveTo(L * 0.2, a + 1, L / 2, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = color;
    g.beginPath(); g.moveTo(L * 0.42, 0); g.quadraticCurveTo(L * 0.15, -a * 0.75, -L * 0.18, -a * 0.7); g.lineTo(-L * 0.4, -a * 0.6); g.lineTo(-L * 0.4, a * 0.6); g.lineTo(-L * 0.18, a * 0.7);
    g.quadraticCurveTo(L * 0.15, a * 0.75, L * 0.42, 0); g.closePath(); g.fill();
    g.fillStyle = '#c9a77a'; g.fillRect(-L * 0.38, -a * 0.5, L * 0.2, a);                 // cubierta de madera
    g.fillStyle = '#1b2738'; g.beginPath(); g.moveTo(L * 0.16, -a * 0.5); g.lineTo(L * 0.05, -a * 0.38); g.lineTo(L * 0.05, a * 0.38); g.lineTo(L * 0.16, a * 0.5); g.closePath(); g.fill();
    g.fillStyle = '#23262e'; g.fillRect(-L / 2 - 3, -3, 6, 6);                           // motor fuera de borda
  };

  SP.helicoptero = (g, L, A, color) => {
    const a = A / 2;
    g.fillStyle = 'rgba(30,30,36,1)';
    g.fillRect(-L * 0.2, -a, L * 0.5, 3); g.fillRect(-L * 0.2, a - 3, L * 0.5, 3);       // patines
    g.fillStyle = Util.tono(color, -0.1);
    g.fillRect(-L / 2, -2, L * 0.5, 4);                                                   // cola
    g.fillStyle = Util.tono(color, -0.3); g.fillRect(-L / 2, -5, 5, 10);
    const gr = g.createLinearGradient(0, -a, 0, a);
    gr.addColorStop(0, Util.tono(color, -0.3)); gr.addColorStop(0.5, Util.tono(color, 0.15)); gr.addColorStop(1, Util.tono(color, -0.3));
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(L * 0.1, 0, L * 0.3, a * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(120,190,255,0.65)';
    g.beginPath(); g.ellipse(L * 0.26, 0, L * 0.12, a * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#23262e'; g.beginPath(); g.arc(L * 0.05, 0, 4, 0, Math.PI * 2); g.fill();
  };

  // ----------------------------------------------------------- Mejoras (tuning)
  Carro.prototype.aplicarMods = function () {
    const b = CONFIG.carros[this.tipo];
    const m = this.mods || {};
    const f = this.t.vida ? this.vida / this.t.vida : 1;
    const t = Object.assign({}, b);
    t.velMax = b.velMax * (1 + 0.06 * (m.motor || 0));
    t.acel = b.acel * (1 + 0.13 * (m.motor || 0));
    t.freno = b.freno * (1 + 0.16 * (m.frenos || 0));
    t.agarre = b.agarre * (1 + 0.09 * (m.llantas || 0));
    t.giroMax = b.giroMax * (1 + 0.04 * (m.llantas || 0));
    t.vida = b.vida * (1 + 0.22 * (m.blindaje || 0));
    this.t = t;
    this.masa = b.masa * (1 + 0.08 * (m.blindaje || 0));
    this.vida = Math.min(t.vida, f * t.vida);
    this.neon = m.neon || null;
  };

  // ----------------------------------------------------------- Dibujo extra: daño, mejoras, neón
  const brillos = new Map();
  function brilloNeon(color) {
    let c = brillos.get(color);
    if (!c) {
      c = Util.lienzo(64, 64);
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      gr.addColorStop(0, color); gr.addColorStop(0.55, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      brillos.set(color, c);
    }
    return c;
  }

  const sombraBase = Carro.prototype.dibujarSombra;
  Carro.prototype.dibujarSombra = function (g) {
    if (this.neon) {
      g.save();
      g.translate(this.x, this.y);
      g.rotate(this.ang);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55 + 0.1 * Math.sin(J.tiempo * 3 + this.id);
      g.drawImage(brilloNeon(this.neon), -this.largo * 0.85, -this.ancho * 1.05, this.largo * 1.7, this.ancho * 2.1);
      g.restore();
    }
    if (this.aereo) {
      const alt = this.alt || 0;
      g.save();
      g.translate(this.x + 14 * alt, this.y + 22 * alt);
      g.rotate(this.ang);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath(); g.ellipse(0, 0, this.largo * 0.5, this.ancho * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      return;
    }
    if (window.Ajustes && !Ajustes.v.sombras) return;
    sombraBase.call(this, g);
  };

  const dibujarBase = Carro.prototype.dibujar;
  Carro.prototype.dibujar = function (g, tiempo) {
    dibujarBase.call(this, g, tiempo);
    const L = this.largo, A = this.ancho;
    const f = this.vida / this.t.vida;
    const m = this.mods;
    const raro = f < 0.55 || (m && (m.motor >= 3 || m.blindaje >= 2)) || this.tipo === 'helicoptero';
    if (!raro) return;
    g.save();
    g.translate(this.x, this.y);
    g.rotate(this.ang);
    if (m && m.motor >= 3 && !this.aereo && this.tipo !== 'moto') {
      g.fillStyle = '#0d0e12';
      g.fillRect(-L / 2 - 2, -A / 2 + 1, 3, A - 2);
    }
    if (m && m.blindaje >= 2 && !this.aereo) {
      g.fillStyle = 'rgba(190,200,220,0.4)';
      g.fillRect(L / 2 - 6, -A / 2 + 1, 4, A - 2);
    }
    if (f < 0.55 && this.tipo !== 'moto' && !this.aereo) {
      // Parabrisas roto y capó doblado
      g.strokeStyle = 'rgba(220,235,255,0.8)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(L * 0.1, -A * 0.1); g.lineTo(L * 0.18, -A * 0.3); g.moveTo(L * 0.1, -A * 0.1); g.lineTo(L * 0.2, A * 0.1);
      g.moveTo(L * 0.1, -A * 0.1); g.lineTo(L * 0.04, A * 0.28);
      g.stroke();
      if (f < 0.3) {
        g.fillStyle = 'rgba(25,20,18,0.55)';
        g.beginPath(); g.moveTo(L * 0.5, -A * 0.4); g.lineTo(L * 0.28, -A * 0.1); g.lineTo(L * 0.32, A * 0.2); g.lineTo(L * 0.5, A * 0.42); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(L * 0.46, -A * 0.42, 3, 5);       // faro roto
      }
    }
    if (this.averiado && Math.floor(tiempo * 9) % 2 === 0 && !this.aereo) {
      g.fillStyle = 'rgba(255,140,40,0.55)';
      g.beginPath(); g.arc(L * 0.28, 0, 5 + Math.random() * 2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  };

  // ----------------------------------------------------------- Lancha
  class Lancha extends Carro {
    constructor(x, y, ang, op) {
      super('lancha', x, y, ang, op);
      this.acuatico = true;
      this.px = x; this.py = y;
    }

    aguaEn(x, y) {
      const t = Mundo.tipoEn(Math.floor(x / T), Math.floor(y / T));
      return t === TIPO.AGUA || t === TIPO.PUENTE;
    }

    colisionMundo() {
      const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
      const r = this.ancho / 2 + 2, off = this.largo / 2 - 6;
      const pts = [[off, 0], [-off, 0], [0, r], [0, -r], [off, r * 0.5], [off, -r * 0.5]];
      let libre = true;
      for (const [lx, ly] of pts) {
        if (!this.aguaEn(this.x + fx * lx - fy * ly, this.y + fy * lx + fx * ly)) { libre = false; break; }
      }
      if (libre) { this.px = this.x; this.py = this.y; return; }
      const v = this.velocidad;
      this.x = this.px; this.y = this.py;
      this.vx *= -0.35; this.vy *= -0.35;
      this.w += (Math.random() - 0.5) * 2;
      if (v > 90) this.golpe(v * 0.8, this.x, this.y, null);
      this.px = this.x; this.py = this.y;
    }

    actualizar(dt) {
      super.actualizar(dt);
      if (this.conductor && this.velocidad > 120 && J.cercaDeCamara(this.x, this.y, 800) && Math.random() < dt * 25) {
        const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
        Efectos.polvo(this.x - fx * this.largo * 0.45 + (Math.random() - 0.5) * 14, this.y - fy * this.largo * 0.45 + (Math.random() - 0.5) * 14);
      }
    }
  }

  // ----------------------------------------------------------- Helicóptero
  class Helicoptero extends Carro {
    constructor(x, y, ang, op) {
      super('helicoptero', x, y, ang, op);
      this.aereo = true;
      this.alt = 0;
      this.rotor = 0;
      this.turbo = 0;
    }

    fisica(dt) {
      const t = this.t, m = this.mando;
      const activo = !!this.conductor && !this.averiado;
      this.alt += ((activo ? 1 : 0) - this.alt) * Math.min(1, dt * 1.6);
      this.rotor += dt * (8 + this.alt * 38);
      if (!activo) { this.vx *= Math.exp(-2 * dt); this.vy *= Math.exp(-2 * dt); this.x += this.vx * dt; this.y += this.vy * dt; this.vf = 0; return; }
      const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
      let vf = this.vx * fx + this.vy * fy;
      let vl = -this.vx * fy + this.vy * fx;
      const k = this.alt;
      if (m.gas > 0) vf += t.acel * m.gas * dt * k;
      else if (m.gas < 0) vf += (vf > 0 ? t.freno : t.acel * 0.7) * m.gas * dt * k;
      else vf -= vf * 0.55 * dt;
      vf = Util.limitar(vf, -t.velMax * 0.4, t.velMax);
      if (m.freno) { vf *= Math.exp(-2.8 * dt); vl *= Math.exp(-2.8 * dt); }
      vl *= Math.exp(-t.agarre * dt);
      this.derrape = 0;
      const giro = m.giro * t.giroMax * (0.45 + 0.55 * Math.min(1, Math.abs(vf) / 220));
      this.vx = fx * vf - fy * vl;
      this.vy = fy * vf + fx * vl;
      this.ang += giro * k * dt;
      this.w = 0;
      this.x = Util.limitar(this.x + this.vx * dt, 40, Mundo.TAM - 40);
      this.y = Util.limitar(this.y + this.vy * dt, 40, Mundo.TAM - 40);
      this.vf = vf;
      this.frenando = false;
    }

    colisionMundo() { /* vuela por encima de todo */ }

    danar(d) { super.danar(d * 0.4); }

    sobreSuelo() {
      const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T);
      return !Mundo.solidoCasilla(tx, ty);
    }

    dibujar(g, tiempo) {
      g.save();
      g.translate(this.x, this.y);
      g.rotate(this.ang);
      const e = 1 + this.alt * 0.12;
      g.scale(e, e);
      g.drawImage(this.sprite.lienzo, -this.sprite.w / 2, -this.sprite.h / 2, this.sprite.w, this.sprite.h);
      const L = this.largo;
      // Rotor principal: aspas giratorias con borrón
      g.translate(L * 0.1, 0);
      if (this.alt > 0.15) {
        g.fillStyle = `rgba(210,220,235,${0.1 + this.alt * 0.14})`;
        g.beginPath(); g.arc(0, 0, L * 0.52, 0, Math.PI * 2); g.fill();
      }
      g.rotate(this.rotor);
      g.strokeStyle = 'rgba(40,40,48,0.9)';
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-L * 0.52, 0); g.lineTo(L * 0.52, 0); g.moveTo(0, -L * 0.52); g.lineTo(0, L * 0.52); g.stroke();
      g.restore();
      g.save();
      g.translate(this.x, this.y); g.rotate(this.ang);
      g.translate(-L * 0.5, 0); g.rotate(-this.rotor * 1.4);
      g.strokeStyle = 'rgba(40,40,48,0.9)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
      g.restore();
      if (this.vida / this.t.vida < 0.45 && Math.random() < 0.3) Efectos.humo(this.x - Math.cos(this.ang) * 20, this.y - Math.sin(this.ang) * 20, 0.8, 1);
    }
  }

  window.Lancha = Lancha;
  window.Helicoptero = Helicoptero;
})();
