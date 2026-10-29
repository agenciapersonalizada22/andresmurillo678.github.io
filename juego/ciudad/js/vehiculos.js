// =============================================================
//  🚗  VEHÍCULOS: cómo se ven, cómo se manejan (física de arcade)
//  y cómo piensan los carros del tráfico y las patrullas.
// =============================================================

// ----------------------------------------------------------- Dibujos de carros
// Cada combinación tipo+color se dibuja una sola vez y se reutiliza.
const SpritesCarro = (() => {
  const cache = new Map();
  const ESC = 2;   // se dibujan al doble para que se vean nítidos
  const M = 4;     // margen alrededor

  function cuerpo(g, L, A, color) {
    const gr = g.createLinearGradient(0, -A / 2, 0, A / 2);
    gr.addColorStop(0, Util.tono(color, -0.3));
    gr.addColorStop(0.5, Util.tono(color, 0.12));
    gr.addColorStop(1, Util.tono(color, -0.3));
    g.fillStyle = gr;
    Util.rectRedondo(g, -L / 2, -A / 2, L, A, 7);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 1.2;
    g.stroke();
  }

  function vidrio(g, x0, x1, a0, a1) {
    // trapecio de x0 (ancho a0) a x1 (ancho a1)
    g.fillStyle = '#1b2738';
    g.beginPath();
    g.moveTo(x0, -a0); g.lineTo(x1, -a1); g.lineTo(x1, a1); g.lineTo(x0, a0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(160,210,255,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0 + (x1 - x0) * 0.3, -a0 * 0.7);
    g.lineTo(x0 + (x1 - x0) * 0.7, -a1 * 0.2);
    g.stroke();
  }

  function moto(g, L, A, color) {
    g.fillStyle = '#15161a';
    Util.rectRedondo(g, L / 2 - 11, -2.3, 10, 4.6, 2); g.fill();
    Util.rectRedondo(g, -L / 2 + 1, -2.6, 10, 5.2, 2); g.fill();
    g.fillStyle = '#23262e';
    g.fillRect(L / 2 - 15, -A / 2, 3, A);                  // manubrio
    const gr = g.createLinearGradient(0, -5, 0, 5);
    gr.addColorStop(0, Util.tono(color, -0.3));
    gr.addColorStop(0.5, Util.tono(color, 0.2));
    gr.addColorStop(1, Util.tono(color, -0.3));
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(3, 0, 11, 4.6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = '#1b1c22';
    g.beginPath(); g.ellipse(-5, 0, 5.5, 3.4, 0, 0, Math.PI * 2); g.fill();   // asiento
    g.fillStyle = '#fff6c8';
    g.fillRect(L / 2 - 3, -2, 2.5, 4);
    g.fillStyle = '#b3122a';
    g.fillRect(-L / 2, -2, 2, 4);
  }

  function crear(tipo, color) {
    const t = CONFIG.carros[tipo];
    const L = t.largo, A = t.ancho;
    const lienzo = Util.lienzo((L + M * 2) * ESC, (A + M * 2) * ESC);
    const g = lienzo.getContext('2d');
    g.scale(ESC, ESC);
    g.translate(M + L / 2, M + A / 2);
    if (tipo === 'moto') {
      moto(g, L, A, color);
      return { lienzo, w: L + M * 2, h: A + M * 2 };
    }

    // Llantas
    g.fillStyle = '#15161a';
    for (const sx of [-0.3, 0.3]) {
      for (const sy of [-1, 1]) g.fillRect(L * sx - 6, sy * A / 2 - 2.5, 12, 5);
    }

    const base = tipo === 'policia' || tipo === 'ambulancia' ? '#f4f6fb' : color;
    cuerpo(g, L, A, base);
    const a = A / 2;

    if (tipo === 'camioneta') {
      // Batea atrás
      g.fillStyle = Util.tono(color, -0.45);
      g.fillRect(-L / 2 + 4, -a + 4, L * 0.42, A - 8);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let k = 1; k < 4; k++) g.fillRect(-L / 2 + 4 + k * L * 0.1, -a + 4, 1.5, A - 8);
      vidrio(g, L * 0.1, L * 0.24, a - 3, a - 5);
      g.fillStyle = Util.tono(color, 0.1);
      g.fillRect(-L * 0.06, -a + 3.5, L * 0.16, A - 7);
      vidrio(g, -L * 0.08, -L * 0.04, a - 4, a - 4);
    } else if (tipo === 'camion') {
      // Caja de carga atrás y cabina adelante
      g.fillStyle = '#e4e7ee';
      Util.rectRedondo(g, -L / 2 + 2, -a + 2, L * 0.64, A - 4, 3); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let k = 1; k < 7; k++) g.fillRect(-L / 2 + 2 + k * L * 0.09, -a + 2, 1.5, A - 4);
      g.fillStyle = Util.tono(color, 0.1);
      g.fillRect(-L / 2 + 6, -3, L * 0.22, 6);                // franja de color
      vidrio(g, L * 0.3, L * 0.4, a - 4, a - 6);
      g.fillStyle = Util.tono(color, 0.08);
      g.fillRect(L * 0.17, -a + 3.5, L * 0.12, A - 7);
    } else if (tipo === 'ambulancia') {
      g.fillStyle = '#d8283a';
      g.fillRect(-L / 2 + 4, -a + 2.5, L * 0.62, 2);
      g.fillRect(-L / 2 + 4, a - 4.5, L * 0.62, 2);
      g.fillStyle = '#e8ecf3';
      g.fillRect(-L * 0.36, -a + 4.5, L * 0.46, A - 9);
      g.fillStyle = '#d8283a';                                // cruz en el techo
      g.fillRect(-L * 0.2, -2, L * 0.24, 4);
      g.fillRect(-L * 0.1, -a * 0.55, L * 0.04 + 2, a * 1.1);
      vidrio(g, L * 0.2, L * 0.34, a - 3, a - 5.5);
      g.fillStyle = '#1d2c4f';
      Util.rectRedondo(g, L * 0.34, -a + 1, L * 0.16 - 1, A - 2, 5); g.fill();
    } else {
      const deportivo = tipo === 'deportivo';
      const fr0 = deportivo ? 0.02 : 0.08, fr1 = deportivo ? 0.2 : 0.22;
      vidrio(g, L * fr0, L * fr1, a - 3, a - 5.5);
      g.fillStyle = Util.tono(base, 0.08);
      g.fillRect(-L * 0.2, -a + 3.5, L * (fr0 + 0.2), A - 7);
      vidrio(g, -L * 0.2, -L * 0.33, a - 3.5, a - 5.5);
      if (deportivo) {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fillRect(-L / 2 + 2, -3.5, L - 4, 2.5);
        g.fillRect(-L / 2 + 2, 1, L - 4, 2.5);
        g.fillStyle = '#16171c';
        g.fillRect(-L / 2 - 1, -a + 2, 4, A - 4);
      }
      if (tipo === 'taxi') {
        g.fillStyle = '#ffffff';
        g.fillRect(-L * 0.12, -5, 9, 10);
        g.fillStyle = '#1a1a1a';
        g.fillRect(-L * 0.12 + 2, -3, 5, 6);
        // cuadritos a los lados
        for (let k = 0; k < 6; k++) {
          g.fillStyle = k % 2 ? '#1a1a1a' : '#ffffff';
          g.fillRect(-L * 0.18 + k * 4, -a + 0.5, 4, 2);
          g.fillRect(-L * 0.18 + k * 4, a - 2.5, 4, 2);
        }
      }
      if (tipo === 'policia') {
        // Cofre y cajuela oscuros
        g.fillStyle = '#1d2c4f';
        Util.rectRedondo(g, L * 0.24, -a + 1, L * 0.26 - 1, A - 2, 5); g.fill();
        Util.rectRedondo(g, -L / 2 + 1, -a + 1, L * 0.16, A - 2, 5); g.fill();
        // Base de la torreta
        g.fillStyle = '#22252c';
        g.fillRect(-L * 0.08, -a + 3, 6, A - 6);
        // Escudo en el techo
        g.fillStyle = '#ffd23d';
        g.beginPath(); g.arc(-L * 0.15, 0, 3, 0, Math.PI * 2); g.fill();
      }
    }

    // Faros y calaveras
    g.fillStyle = '#fff6c8';
    g.fillRect(L / 2 - 4, -a + 3, 3, 6);
    g.fillRect(L / 2 - 4, a - 9, 3, 6);
    g.fillStyle = '#b3122a';
    g.fillRect(-L / 2 + 1, -a + 3, 2.5, 6);
    g.fillRect(-L / 2 + 1, a - 9, 2.5, 6);
    // Espejos
    g.fillStyle = Util.tono(base, -0.35);
    g.fillRect(L * 0.1, -a - 2, 4, 2.5);
    g.fillRect(L * 0.1, a - 0.5, 4, 2.5);

    return { lienzo, w: L + M * 2, h: A + M * 2 };
  }

  return {
    obtener(tipo, color) {
      const clave = tipo + color;
      let s = cache.get(clave);
      if (!s) { s = crear(tipo, color); cache.set(clave, s); }
      return s;
    },
  };
})();

// ----------------------------------------------------------- El carro
const RES_CHOQUE = {};
let contadorCarros = 0;

class Carro {
  constructor(tipo, x, y, ang, op) {
    op = op || {};
    this.tipo = tipo;
    this.t = CONFIG.carros[tipo];
    this.x = x;
    this.y = y;
    this.ang = ang || 0;
    this.vx = 0;
    this.vy = 0;
    this.w = 0;
    this.vf = 0;
    this.largo = this.t.largo;
    this.ancho = this.t.ancho;
    this.masa = this.t.masa;
    this.vida = this.t.vida;
    this.conductor = op.conductor || null; // null (vacío) | 'ia' | 'jugador'
    this.ia = null;
    this.mando = { gas: 0, giro: 0, freno: true };
    this.averiado = false;
    this.sirena = false;
    this.estacionado = !!op.estacionado;
    this.espacio = op.espacio || null;
    this.id = ++contadorCarros;
    this.relojHumo = 0;
    this.derrape = 0;
    this.relojChoque = 0;
    this.relojMarca = 0;
    this.multVel = 1;
    this.frenando = false;
    this.pintar(op.color || Util.elegir(this.t.colores));
  }

  pintar(color) {
    this.color = color;
    this.sprite = SpritesCarro.obtener(this.tipo, color);
  }

  get velocidad() { return Math.hypot(this.vx, this.vy); }
  get esPolicia() { return this.tipo === 'policia'; }
  get emergencia() { return this.tipo === 'policia' || this.tipo === 'ambulancia'; }
  get vidaMax() { return this.t.vida; }

  reparar() {
    this.vida = this.t.vida;
    this.averiado = false;
  }

  // Física de arcade vista desde arriba
  fisica(dt) {
    const t = this.t;
    const F = CONFIG.fisica;
    const m = this.mando;
    const mojado = (J.lluvia || 0) * CONFIG.clima.agarreMojado;
    const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
    let vf = this.vx * fx + this.vy * fy;
    let vl = -this.vx * fy + this.vy * fx;

    const sup = Mundo.superficie(this.x, this.y);
    const TE = CONFIG.terreno;
    let factor = 1;
    if (sup === TIPO.PASTO) factor = TE.pasto;
    else if (sup === TIPO.ARENA) factor = TE.arena;
    else if (sup === TIPO.ACERA) factor = TE.acera;
    else if (sup === TIPO.PLAZA) factor = TE.plaza;
    else if (sup === TIPO.PARKING) factor = TE.estacionamiento;
    const velMax = t.velMax * factor * this.multVel;

    let gas = m.gas;
    if (this.averiado && (gas > 0 || vf <= 15)) gas = 0;
    this.frenando = false;
    if (gas > 0) {
      if (vf < -15) { vf += t.freno * (1 - mojado * 0.5) * gas * dt; this.frenando = true; }
      else if (vf < velMax) vf += t.acel * factor * gas * dt * (1 - 0.5 * Math.max(0, vf) / velMax);
    } else if (gas < 0) {
      if (vf > 15) { vf += t.freno * (1 - mojado * 0.5) * gas * dt; this.frenando = true; }
      else if (vf > -velMax * 0.38) vf += t.acel * 0.65 * gas * dt;
    } else {
      const fb = F.frenoMotor * dt;
      vf = Math.abs(vf) <= fb ? 0 : vf - Math.sign(vf) * fb;
    }
    vf -= vf * F.rozamiento * dt;
    if (vf > velMax) vf -= (vf - velMax) * 2.5 * dt;

    let agarre = t.agarre * (1 - mojado);
    if (m.freno) {
      agarre *= F.agarreFrenoMano;
      const fb = 430 * dt;
      vf = Math.abs(vf) <= fb ? 0 : vf - Math.sign(vf) * fb;
      if (Math.abs(vf) > 30) this.frenando = true;
    }
    vl *= Math.exp(-agarre * dt);
    this.derrape = Math.abs(vl);

    const absV = Math.abs(vf);
    let giro = m.giro * Math.min(t.giroMax * (1 - 0.3 * Math.min(1, absV / t.velMax)), absV / t.radioGiro);
    if (m.freno && absV > 60) giro *= 1.4;
    giro *= Math.sign(vf);

    this.vx = fx * vf - fy * vl;
    this.vy = fy * vf + fx * vl;
    this.ang += (giro + this.w) * dt;
    this.w *= Math.exp(-5 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vf = vf;
  }

  colisionMundo() {
    const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
    const r = this.ancho / 2;
    const off = this.largo / 2 - r;
    let golpe = 0, gx = 0, gy = 0;
    for (let k = -1; k <= 1; k++) {
      const ox = fx * off * k, oy = fy * off * k;
      const cx = this.x + ox, cy = this.y + oy;
      Mundo.resolverCirculo(cx, cy, r, RES_CHOQUE);
      if (!RES_CHOQUE.hit) continue;
      this.x += RES_CHOQUE.x - cx;
      this.y += RES_CHOQUE.y - cy;
      const nx = RES_CHOQUE.nx, ny = RES_CHOQUE.ny;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) {
        const e = CONFIG.fisica.rebote;
        this.vx -= (1 + e) * vn * nx;
        this.vy -= (1 + e) * vn * ny;
        const tx = -ny, ty = nx;
        const vt = this.vx * tx + this.vy * ty;
        this.vx -= tx * vt * 0.15;
        this.vy -= ty * vt * 0.15;
        const rxn = ox * ny - oy * nx;
        this.w = Util.limitar(this.w - rxn * vn * 0.0016, -6, 6);
        if (-vn > golpe) { golpe = -vn; gx = cx - nx * r; gy = cy - ny * r; }
      }
    }
    if (golpe > 0) this.golpe(golpe, gx, gy, null);
  }

  golpe(fuerza, x, y, otro) {
    const F = CONFIG.fisica;
    if (fuerza > 80) {
      if (J.cercaDeCamara(x, y, 900)) {
        Sonido.choque(Util.limitar(fuerza / 700, 0.15, 1));
        if (fuerza > 200) Efectos.chispas(x, y, Math.min(14, Math.round(fuerza / 60)));
      }
      if (this.conductor === 'jugador') {
        J.sacudir(Math.min(14, fuerza / 60));
        Entrada.vibrar(Math.min(1, fuerza / 450), Math.min(1, fuerza / 700), Math.min(400, 90 + fuerza * 0.4));
      }
    }
    if (fuerza <= F.danoUmbral) return;
    const dano = (fuerza - F.danoUmbral) * F.danoFactor;
    this.danar(dano);
  }

  danar(dano) {
    if (this.averiado) return;
    this.vida -= dano;
    if (this.conductor === 'jugador') Misiones.alDanarCarro(dano);
    if (this.vida <= 0) {
      this.vida = 0;
      this.averiado = true;
      this.sirena = false;
      if (J.cercaDeCamara(this.x, this.y, 900)) Efectos.explosion(this.x, this.y, this.largo);
      if (this.conductor === 'jugador') {
        J.avisar('¡MOTOR AVERIADO!', 'Bájate y busca otro carro', '#ff8a3d');
        Sonido.averia();
      }
    }
  }

  actualizar(dt) {
    if (this.ia && this.conductor === 'ia') this.ia.actualizar(dt);
    else if (!this.conductor) { this.mando.gas = 0; this.mando.giro = 0; this.mando.freno = true; }
    const pasos = dt > 0.018 ? 2 : 1;
    for (let k = 0; k < pasos; k++) {
      this.fisica(dt / pasos);
      this.colisionMundo();
    }
    this.relojChoque = Math.max(0, this.relojChoque - dt);

    // Humo cuando está dañado
    const fraccion = this.vida / this.t.vida;
    if (fraccion < CONFIG.fisica.humoDesde && CONFIG.efectos.humo > 0 && J.cercaDeCamara(this.x, this.y, 700)) {
      this.relojHumo -= dt;
      if (this.relojHumo <= 0) {
        this.relojHumo = (0.05 + fraccion * 0.35) / CONFIG.efectos.humo;
        const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
        Efectos.humo(this.x + fx * this.largo * 0.32, this.y + fy * this.largo * 0.32,
          this.averiado ? 0.85 : 0.35 + (1 - fraccion) * 0.4, this.averiado ? 1.3 : 1);
      }
    }

    // Marcas de llantas al derrapar o frenar fuerte
    const v = Math.abs(this.vf);
    if (CONFIG.efectos.marcasLlantas && (this.derrape > 110 || (this.frenando && this.mando.freno && v > 120)) &&
        J.cercaDeCamara(this.x, this.y, 800)) {
      const fx = Math.cos(this.ang), fy = Math.sin(this.ang);
      const bx = this.x - fx * this.largo * 0.3, by = this.y - fy * this.largo * 0.3;
      const px = -fy * this.ancho * 0.38, py = fx * this.ancho * 0.38;
      const u = this.ultimaMarca;
      if (!u) {
        this.ultimaMarca = { x: bx, y: by, px, py };
      } else {
        const d = Math.hypot(bx - u.x, by - u.y);
        if (d >= 60) {
          this.ultimaMarca = { x: bx, y: by, px, py };
        } else if (d >= 8) {
          Efectos.marca(u.x + u.px, u.y + u.py, bx + px, by + py);
          Efectos.marca(u.x - u.px, u.y - u.py, bx - px, by - py);
          u.x = bx; u.y = by; u.px = px; u.py = py;
        }
      }
      if (Math.random() < dt * 12) Efectos.polvo(bx, by);
    } else {
      this.ultimaMarca = null;
    }
  }

  dibujarSombra(g) {
    g.save();
    g.translate(this.x + 5, this.y + 6);
    g.rotate(this.ang);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    Util.rectRedondo(g, -this.largo / 2, -this.ancho / 2, this.largo, this.ancho, 7);
    g.fill();
    g.restore();
  }

  dibujar(g, tiempo) {
    const L = this.largo, A = this.ancho;
    g.save();
    g.translate(this.x, this.y);
    g.rotate(this.ang);
    g.drawImage(this.sprite.lienzo, -this.sprite.w / 2, -this.sprite.h / 2, this.sprite.w, this.sprite.h);

    const fraccion = this.vida / this.t.vida;
    if (fraccion < 0.65) {
      // Abolladuras
      g.fillStyle = 'rgba(30,25,25,0.35)';
      const n = fraccion < 0.3 ? 5 : 3;
      for (let k = 0; k < n; k++) {
        const hx = Util.hash(this.id, k, 1), hy = Util.hash(this.id, k, 2);
        g.beginPath();
        g.arc((hx - 0.5) * L * 0.85, (hy - 0.5) * A * 0.8, 3 + hx * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (this.averiado) {
      g.fillStyle = 'rgba(20,20,20,0.35)';
      Util.rectRedondo(g, -L / 2, -A / 2, L, A, 7);
      g.fill();
    }
    // Luces de freno y reversa
    const moto = this.tipo === 'moto';
    if (this.frenando && this.conductor) {
      g.fillStyle = '#ff2a3d';
      if (moto) g.fillRect(-L / 2 - 1, -3, 3, 6);
      else {
        g.fillRect(-L / 2 - 1, -A / 2 + 2, 4, 8);
        g.fillRect(-L / 2 - 1, A / 2 - 10, 4, 8);
      }
    } else if (this.vf < -10 && this.conductor && !moto) {
      g.fillStyle = '#ffffff';
      g.fillRect(-L / 2 - 1, -A / 2 + 4, 3, 5);
      g.fillRect(-L / 2 - 1, A / 2 - 9, 3, 5);
    }
    if (moto && this.conductor) {
      // Piloto con casco, inclinado al girar
      const inc = Util.limitar(this.mando.giro * Math.min(1, Math.abs(this.vf) / 300), -1, 1) * 2.5;
      g.fillStyle = this.conductor === 'jugador' ? '#13d6e8' : '#8a8f9c';
      g.beginPath(); g.ellipse(-2, inc, 4.5, 6.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = this.conductor === 'jugador' ? '#e8f7ff' : '#d33a3a';
      g.beginPath(); g.arc(1, inc, 4.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(20,30,50,0.8)';
      g.fillRect(2.5, inc - 2.6, 2.4, 5.2);
    }
    // Torreta de la patrulla / ambulancia
    if (this.emergencia) {
      const prendida = this.sirena;
      const fase = prendida ? Math.floor(tiempo * 8) % 2 : -1;
      const amb = this.tipo === 'ambulancia';
      g.fillStyle = fase === 0 ? '#ff2a2a' : (prendida ? '#7a1010' : '#8a2020');
      g.fillRect(-L * 0.08, -A / 2 + 3, 6, A / 2 - 3);
      if (amb) g.fillStyle = fase === 1 ? '#ffffff' : (prendida ? '#9aa0b0' : '#c9ceda');
      else g.fillStyle = fase === 1 ? '#2a6bff' : (prendida ? '#10237a' : '#20308a');
      g.fillRect(-L * 0.08, 0, 6, A / 2 - 3);
    }
    g.restore();
  }

  // Lo que necesita el sistema de luces de noche
  get lucesPrendidas() { return !!this.conductor && !this.averiado; }
}

// Choque entre dos carros (cada carro son 3 círculos en fila)
function chocarCarros(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const rmax = (a.largo + b.largo) / 2 + 2;
  if (dx * dx + dy * dy > rmax * rmax) return;
  const afx = Math.cos(a.ang), afy = Math.sin(a.ang);
  const bfx = Math.cos(b.ang), bfy = Math.sin(b.ang);
  const ra = a.ancho / 2, rb = b.ancho / 2;
  const oa = a.largo / 2 - ra, ob = b.largo / 2 - rb;
  let pen = 0, nx = 0, ny = 0, cax = 0, cay = 0, cbx = 0, cby = 0;
  for (let i = -1; i <= 1; i++) {
    const pax = a.x + afx * oa * i, pay = a.y + afy * oa * i;
    for (let k = -1; k <= 1; k++) {
      const pbx = b.x + bfx * ob * k, pby = b.y + bfy * ob * k;
      const ddx = pbx - pax, ddy = pby - pay;
      const d = Math.hypot(ddx, ddy);
      const p = ra + rb - d;
      if (p > pen) {
        pen = p;
        nx = d > 0.01 ? ddx / d : 1; ny = d > 0.01 ? ddy / d : 0;
        cax = afx * oa * i; cay = afy * oa * i;
        cbx = bfx * ob * k; cby = bfy * ob * k;
      }
    }
  }
  if (pen <= 0) return;
  const ma = a.masa * (a.conductor ? 1 : 2.2), mb = b.masa * (b.conductor ? 1 : 2.2);
  const ima = 1 / ma, imb = 1 / mb, suma = ima + imb;
  a.x -= nx * pen * ima / suma; a.y -= ny * pen * ima / suma;
  b.x += nx * pen * imb / suma; b.y += ny * pen * imb / suma;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  J.alChocarCarros(a, b, -vn); // antes del rebote, para saber quién chocó a quién
  const e = 0.35;
  const j = -(1 + e) * vn / suma;
  a.vx -= j * ima * nx; a.vy -= j * ima * ny;
  b.vx += j * imb * nx; b.vy += j * imb * ny;
  a.w = Util.limitar(a.w - (cax * ny - cay * nx) * j * ima * 0.0018, -6, 6);
  b.w = Util.limitar(b.w + (cbx * ny - cby * nx) * j * imb * 0.0018, -6, 6);
  const fuerza = -vn;
  const px = a.x + cax + nx * ra, py = a.y + cay + ny * ra;
  a.golpe(fuerza * 2 * ima / suma, px, py, b);
  b.golpe(fuerza * 2 * imb / suma, px, py, a);
}

// ----------------------------------------------------------- IA del tráfico
// Sigue su carril, da vuelta en los cruces y frena si hay algo enfrente.
class IATrafico {
  constructor(carro, carril) {
    this.carro = carro;
    this.ruta = [{ x: carro.x, y: carro.y }];
    this.idx = 0;
    this.nodo = { i: carril.i, j: carril.j };
    this.dir = carril.dir;
    this.velBase = CONFIG.trafico.velocidad * Util.azar(0.85, 1.12);
    this.impaciencia = 0;
    this.bloqueado = 0;
    this.atascado = 0;
    this.reversa = 0;
    this.perdido = 0;
    this.relojPito = Util.azar(1, 2);
    while (this.ruta.length < 8) this.planificar();
  }

  planificar() {
    const T = Mundo.T;
    const { i, j } = this.nodo;
    const d = this.dir;
    const c = Mundo.centroNodo(i, j);
    let opciones = Mundo.salidas(i, j).filter((s) => s !== (d + 2) % 4);
    if (!opciones.length) opciones = [(d + 2) % 4];
    const pesos = {};
    for (const s of opciones) pesos[s] = s === d ? 2.2 : 1;
    const d2 = parseInt(Util.elegirPorPeso(pesos), 10);
    const [dx, dy] = DIRS[d];
    const rx = -dy, ry = dx;
    const entrada = { x: c.x - dx * T + rx * T / 2, y: c.y - dy * T + ry * T / 2 };
    const [ex, ey] = DIRS[d2];
    const r2x = -ey, r2y = ex;
    const salida = { x: c.x + ex * T + r2x * T / 2, y: c.y + ey * T + r2y * T / 2 };
    if (d2 !== d && d2 !== (d + 2) % 4) {
      const derecha = d2 === (d + 1) % 4;
      entrada.v = derecha ? 85 : 130;
      this.ruta.push(entrada);
      const R = derecha ? T / 2 : T * 1.5;
      const nx = derecha ? rx : -rx, ny = derecha ? ry : -ry;
      const ccx = entrada.x + nx * R, ccy = entrada.y + ny * R;
      const a0 = Math.atan2(entrada.y - ccy, entrada.x - ccx);
      const a1 = Math.atan2(salida.y - ccy, salida.x - ccx);
      const da = Util.difAngulo(a1, a0);
      for (let k = 1; k < 4; k++) {
        const a = a0 + da * k / 4;
        this.ruta.push({ x: ccx + Math.cos(a) * R, y: ccy + Math.sin(a) * R, v: entrada.v });
      }
    } else if (d2 === (d + 2) % 4) {
      // Vuelta en U (solo si no hay de otra)
      entrada.v = 60;
      this.ruta.push(entrada);
      this.ruta.push({ x: c.x + rx * T / 2, y: c.y + ry * T / 2, v: 60 });
      this.ruta.push({ x: c.x - rx * T / 2, y: c.y - ry * T / 2, v: 60 });
    } else {
      this.ruta.push(entrada);
    }
    this.ruta.push(salida);
    this.nodo = { i: i + ex, j: j + ey };
    this.dir = d2;
  }

  // Velocidad permitida por lo que hay enfrente
  obstaculo() {
    const c = this.carro;
    const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
    const alcance = 45 + Math.max(0, c.vf) * 0.6;
    let vMin = Infinity;
    let quien = null;
    const revisar = (o, ancho, largo) => {
      const dx = o.x - c.x, dy = o.y - c.y;
      if (Math.abs(dx) > alcance + 90 || Math.abs(dy) > alcance + 90) return;
      const fw = dx * fx + dy * fy;
      if (fw <= 0) return;
      const lat = -dx * fy + dy * fx;
      if (Math.abs(lat) > c.ancho / 2 + ancho / 2 + 4) return;
      const hueco = fw - c.largo / 2 - largo / 2 - 10;
      if (hueco > alcance) return;
      const v = Math.max(0, hueco) * 2.2;
      if (v < vMin) { vMin = v; quien = o; }
    };
    for (const o of J.carros) {
      if (o === c) continue;
      if (this.impaciencia > 0 && o.conductor !== 'jugador') continue;
      const m = (o.largo + o.ancho) / 2;
      revisar(o, m, m);
    }
    for (const p of J.peatones) if (p.estado !== 'caido') revisar(p, 16, 14);
    const jug = J.jugador;
    if (jug && !jug.carro && J.modo !== 'titulo') revisar(jug, 16, 14);
    return { v: vMin, quien };
  }

  actualizar(dt) {
    const c = this.carro;
    const m = c.mando;
    if (c.averiado) { m.gas = 0; m.freno = true; return; }

    // Avanza por la ruta
    let A, B, t;
    for (;;) {
      A = this.ruta[this.idx];
      B = this.ruta[this.idx + 1];
      const abx = B.x - A.x, aby = B.y - A.y;
      const l2 = abx * abx + aby * aby || 1;
      t = ((c.x - A.x) * abx + (c.y - A.y) * aby) / l2;
      if (t >= 1 && this.idx < this.ruta.length - 2) { this.idx++; continue; }
      break;
    }
    if (this.ruta.length - this.idx < 8) this.planificar();
    if (this.idx > 14) { this.ruta.splice(0, this.idx); this.idx = 0; }

    const tc = Util.limitar(t, 0, 1);
    const px = A.x + (B.x - A.x) * tc, py = A.y + (B.y - A.y) * tc;
    const error = Math.hypot(c.x - px, c.y - py);

    // Punto al que apunta (un poco adelante en la ruta)
    let mira = 30 + Math.abs(c.vf) * 0.2;
    let qx = px, qy = py, k = this.idx;
    let vLim = this.velBase, recorrido = 0;
    let encontrado = false;
    while (k < this.ruta.length - 1) {
      const P = this.ruta[k + 1];
      const seg = Math.hypot(P.x - qx, P.y - qy);
      if (P.v && recorrido + seg < 170) vLim = Math.min(vLim, P.v + (recorrido + seg) * 0.9);
      if (!encontrado) {
        if (seg >= mira) {
          const nqx = qx + (P.x - qx) * mira / seg, nqy = qy + (P.y - qy) * mira / seg;
          recorrido += mira;
          mira = 0;
          encontrado = true;
          this.mx = nqx; this.my = nqy;
          // sigue revisando curvas más adelante desde este punto
          qx = nqx; qy = nqy;
          continue;
        }
        mira -= seg;
      }
      recorrido += seg;
      qx = P.x; qy = P.y;
      k++;
      if (recorrido > 200 && encontrado) break;
    }
    if (!encontrado) { this.mx = qx; this.my = qy; }

    const angObj = Math.atan2(this.my - c.y, this.mx - c.x);
    const dif = Util.difAngulo(angObj, c.ang);
    const giro = Util.limitar(dif * 2.6, -1, 1);

    let vDeseada = vLim * (1 - 0.15 * (J.lluvia || 0));
    if (Math.abs(dif) > 0.6) vDeseada = Math.min(vDeseada, 110);
    const obs = this.obstaculo();
    if (obs.v < vDeseada) vDeseada = obs.v;

    this.impaciencia = Math.max(0, this.impaciencia - dt);
    if (obs.v < 15) {
      this.bloqueado += dt;
      const esJugador = obs.quien === J.jugador || obs.quien === J.jugador.carro;
      if (esJugador) {
        this.relojPito -= dt;
        if (this.relojPito <= 0 && CONFIG.trafico.pitar) {
          this.relojPito = Util.azar(2, 4);
          Sonido.pitoLejano(c.x, c.y);
          if (Math.random() < 0.35) Efectos.texto(c.x, c.y - 30, Util.elegir(['¡Muévete!', '¡PIII!', '¡Oye!']), '#ffffff', 14);
        }
      } else if (this.bloqueado > 3) {
        this.impaciencia = 1.4;
        this.bloqueado = 0;
      }
    } else {
      this.bloqueado = 0;
    }

    if (error > 120) this.perdido += dt;
    else this.perdido = Math.max(0, this.perdido - dt);

    if (this.reversa > 0) {
      this.reversa -= dt;
      m.gas = -0.7; m.giro = -giro; m.freno = false;
      return;
    }
    if (vDeseada > 40 && Math.abs(c.vf) < 12) {
      this.atascado += dt;
      if (this.atascado > 1.6) { this.reversa = 0.9; this.atascado = 0; }
    } else {
      this.atascado = 0;
    }

    if (vDeseada < 8) {
      m.gas = c.vf > 20 ? -1 : 0;
      m.freno = c.vf <= 20;
    } else {
      m.gas = Util.limitar((vDeseada - c.vf) / 50, -1, 1);
      m.freno = false;
    }
    m.giro = giro;
  }
}

// ----------------------------------------------------------- IA de la patrulla
// Te persigue: si te ve, maneja directo hacia ti (y un poco adelante);
// si hay edificios en medio, usa las calles para llegar.
class IAPolicia {
  constructor(carro) {
    this.carro = carro;
    carro.sirena = true;
    carro.multVel = CONFIG.policia.velocidad;
    this.modo = 'perseguir';
    this.relojRuta = 0;
    this.nodoObj = null;
    this.directo = false;
    this.ve = false;
    this.relojVista = 0;
    this.atascado = 0;
    this.reversa = 0;
    this.giroReversa = 1;
    this.destino = null;
    // Algunas patrullas embisten y otras intentan cerrarte el paso
    this.estilo = Math.random() < 0.5 ? 'cerrar' : 'embestir';
    this.lado = Math.random() < 0.5 ? -1 : 1;
  }

  retirarse() {
    if (this.modo === 'retirada') return;
    this.modo = 'retirada';
    this.carro.sirena = false;
    const jx = J.jugador.x, jy = J.jugador.y;
    const lejos = Mundo.carrilAzar(this.carro.x, this.carro.y, 900, 1800,
      (c) => Math.hypot(c.x - jx, c.y - jy) > 1300);
    this.destino = lejos ? { x: lejos.x, y: lejos.y } : { x: Mundo.TAM / 2, y: Mundo.TAM / 2 };
    this.nodoObj = null;
  }

  // Vuelve a perseguir (si hay estrellas otra vez)
  reanudar() {
    if (this.modo === 'perseguir') return;
    this.modo = 'perseguir';
    this.carro.sirena = true;
    this.nodoObj = null;
    this.relojRuta = 0;
    this.perdido = 0;
  }

  // Elige el siguiente cruce para llegar a (tx, ty) por las calles
  siguienteNodo(tx, ty) {
    const c = this.carro;
    let a = Mundo.nodoCercano(c.x, c.y);
    const ca = Mundo.centroNodo(a.i, a.j);
    const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
    const b = Mundo.nodoCercano(tx, ty);
    // Si el cruce más cercano quedó atrás, empieza desde el de adelante
    if ((ca.x - c.x) * fx + (ca.y - c.y) * fy < -40) {
      let mejor = -1, md = -Infinity;
      for (let d = 0; d < 4; d++) {
        const dot = DIRS[d][0] * fx + DIRS[d][1] * fy;
        if (dot > md) { md = dot; mejor = d; }
      }
      if (Mundo.existeArista(a.i, a.j, mejor)) a = { i: a.i + DIRS[mejor][0], j: a.j + DIRS[mejor][1] };
    }
    const cA = Mundo.centroNodo(a.i, a.j);
    if (Math.hypot(cA.x - c.x, cA.y - c.y) > 80) return a;
    const ruta = Mundo.rutaNodos(a, b);
    return ruta && ruta.length > 1 ? ruta[1] : b;
  }

  actualizar(dt) {
    const c = this.carro;
    const m = c.mando;
    if (c.averiado) { m.gas = 0; m.freno = true; c.sirena = false; return; }

    let tx, ty, objVel = 0, dist;
    const P = CONFIG.policia;
    if (this.modo === 'retirada') {
      tx = this.destino.x; ty = this.destino.y;
      dist = Math.hypot(tx - c.x, ty - c.y);
      this.directo = false;
    } else {
      const jug = J.jugador;
      const obj = jug.carro || jug;
      const ovx = obj.vx || 0, ovy = obj.vy || 0;
      objVel = Math.hypot(ovx, ovy);
      dist = Math.hypot(obj.x - c.x, obj.y - c.y);
      const adelanto = Math.min(0.9, dist / 600) * P.agresividad;
      tx = obj.x + ovx * adelanto;
      ty = obj.y + ovy * adelanto;
      this.relojVista -= dt;
      if (this.relojVista <= 0) {
        this.relojVista = 0.25;
        this.directo = dist < 900 && Mundo.lineaLibre(c.x, c.y, tx, ty, 12);
        this.ve = dist < P.vision && Mundo.lineaLibre(c.x, c.y, obj.x, obj.y, 0);
      }
    }

    if (!this.directo) {
      this.relojRuta -= dt;
      if (this.relojRuta <= 0 || !this.nodoObj) {
        this.relojRuta = 0.5;
        this.nodoObj = this.siguienteNodo(tx, ty);
      }
      const p = Mundo.centroNodo(this.nodoObj.i, this.nodoObj.j);
      if (Math.hypot(p.x - c.x, p.y - c.y) < 70) this.relojRuta = 0;
      tx = p.x; ty = p.y;
    }

    const angObj = Math.atan2(ty - c.y, tx - c.x);
    const dif = Util.difAngulo(angObj, c.ang);
    let giro = Util.limitar(dif * 2.4, -1, 1);
    let gas = this.modo === 'retirada' ? 0.6 : 1;
    if (this.modo !== 'retirada') c.multVel = P.velocidad * (0.94 + 0.04 * J.buscado.estrellas);
    if (this.modo !== 'retirada' && this.directo && dist < 260 && objVel < 90) gas = Util.limitar((dist - 80) / 120, -1, 1);
    // Cerrar el paso: si va delante de ti, se atraviesa en la calle
    if (this.modo !== 'retirada' && this.estilo === 'cerrar' && objVel > 150 && P.agresividad > 0) {
      const obj = J.jugador.carro || J.jugador;
      const ux = obj.vx / objVel, uy = obj.vy / objVel;
      const rx = c.x - obj.x, ry = c.y - obj.y;
      const delante = rx * ux + ry * uy;
      const lateral = Math.abs(-rx * uy + ry * ux);
      if (delante > 90 && delante < 420 * P.agresividad + 60 && lateral < 110) {
        const cruzado = Math.atan2(uy, ux) + Math.PI / 2 * this.lado;
        const d2 = Util.difAngulo(cruzado, c.ang);
        m.gas = c.vf > 80 ? -1 : 0.25;
        m.giro = Util.limitar(d2 * 2.5, -1, 1);
        m.freno = c.vf > 160;
        return;
      }
    }
    if (Math.abs(dif) > 0.9 && c.vf > 280) gas = -0.6;
    if (!this.directo && Math.hypot(tx - c.x, ty - c.y) < 170 && c.vf > 320) gas = -0.4;
    if (Math.abs(dif) > 2.2 && c.vf < 140) {
      gas = -0.8;
      giro = c.vf > 0 ? Math.sign(dif) : -Math.sign(dif);
    }

    if (this.reversa > 0) {
      this.reversa -= dt;
      m.gas = -0.9; m.giro = this.giroReversa; m.freno = false;
      return;
    }
    if (gas > 0.3 && Math.abs(c.vf) < 20) {
      this.atascado += dt;
      if (this.atascado > 1.1) {
        this.reversa = 0.8;
        this.giroReversa = -giro || 1;
        this.atascado = 0;
      }
    } else {
      this.atascado = Math.max(0, this.atascado - dt);
    }

    m.gas = gas;
    m.giro = giro;
    m.freno = Math.abs(dif) > 1.3 && c.vf > 240;
  }
}
