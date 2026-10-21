// =============================================================
//  🚶  PERSONAJES: la gente que camina por las banquetas y tú
//  cuando vas a pie. Si un carro los tumba, se caen de forma
//  caricaturesca ("¡Ay!") y se levantan al ratito.
// =============================================================
const ROPA = ['#e94b3c', '#3c8de9', '#f2a13c', '#49b35a', '#b06bff', '#ff7aa8', '#f2f2f2', '#2f3542', '#ffd23d', '#2ec4b6'];
const PIEL = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const PELO = ['#2a1a10', '#4a2c17', '#111111', '#d9b35f', '#a0522d', '#777777', '#e8e0d0'];
const RES_PERSONA = {};

// Dibuja a una persona vista desde arriba (mirando hacia "ang")
function dibujarPersona(g, x, y, ang, colores, fase, opciones) {
  const op = opciones || {};
  g.save();
  g.translate(x, y);
  if (op.caido) {
    // Acostada en el piso con estrellitas dando vueltas
    g.rotate(op.angCaido || 0);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(3, 3, 17, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2f3a';
    g.fillRect(-16, -6, 10, 4);
    g.fillRect(-16, 2, 10, 4);
    g.fillStyle = colores.ropa;
    Util.rectRedondo(g, -8, -8, 15, 16, 5); g.fill();
    g.fillStyle = colores.piel;
    g.beginPath(); g.arc(-2, -11, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(-2, 11, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = colores.pelo;
    g.beginPath(); g.arc(12, 0, 6, 0, Math.PI * 2); g.fill();
    g.rotate(-(op.angCaido || 0));
    const t = op.tiempo || 0;
    g.fillStyle = '#ffd23d';
    for (let k = 0; k < 3; k++) {
      const a = t * 5 + k * Math.PI * 2 / 3;
      estrella(g, Math.cos(a) * 12, -14 + Math.sin(a) * 5, 3.2);
      g.fill();
    }
    g.restore();
    return;
  }
  g.rotate(ang);
  const paso = Math.sin(fase) * (op.quieto ? 0 : 5);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(4, 4, 8, 11, 0, 0, Math.PI * 2); g.fill();
  // Pies
  g.fillStyle = '#23262e';
  g.beginPath(); g.ellipse(paso, -4.5, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-paso, 4.5, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
  // Brazos
  g.fillStyle = colores.piel;
  if (op.saludando) {
    const s = Math.sin((op.tiempo || 0) * 10) * 3;
    g.beginPath(); g.arc(7 + s, -11, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(-paso * 0.8, 10, 2.8, 0, Math.PI * 2); g.fill();
  } else {
    g.beginPath(); g.arc(-paso * 0.8, -10, 2.8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(paso * 0.8, 10, 2.8, 0, Math.PI * 2); g.fill();
  }
  if (op.arma) {
    // Arma extendida hacia el frente con la mano derecha
    const esc = op.arma === 'escopeta';
    const largo = esc ? 19 : 11;
    g.fillStyle = esc ? '#6b4a2b' : '#2b2f3a';
    g.fillRect(2, 4, esc ? 6 : 4, 3);
    g.fillStyle = '#1a1c22';
    g.fillRect(esc ? 8 : 5, esc ? 4.5 : 4, largo - (esc ? 6 : 1), esc ? 2 : 3);
    g.fillStyle = colores.piel;
    g.beginPath(); g.arc(4, 5.5, 2.6, 0, Math.PI * 2); g.fill();
    if (op.destello) {
      g.fillStyle = '#fff2a0';
      g.beginPath(); g.arc(largo + 6, 5.5, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff9a2a';
      g.beginPath(); g.arc(largo + 5, 5.5, 2.4, 0, Math.PI * 2); g.fill();
    }
  }
  // Cuerpo (hombros)
  g.fillStyle = colores.ropa;
  g.beginPath(); g.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 1;
  g.stroke();
  // Cabeza
  g.fillStyle = colores.piel;
  g.beginPath(); g.arc(1.5, 0, 5.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = colores.pelo;
  g.beginPath(); g.arc(0, 0, 5, Math.PI * 0.5, Math.PI * 1.5); g.fill();
  g.beginPath(); g.arc(0.5, 0, 4.2, 0, Math.PI * 2); g.fill();
  if (op.contorno) {
    g.strokeStyle = op.contorno;
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

function estrella(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + k * Math.PI / 5;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

// ----------------------------------------------------------- Peatón
class Peaton {
  constructor(tx, ty, op) {
    op = op || {};
    const T = Mundo.T;
    this.x = tx * T + T / 2 + Util.azar(-12, 12);
    this.y = ty * T + T / 2 + Util.azar(-12, 12);
    this.tx = tx;
    this.ty = ty;
    this.ptx = tx;
    this.pty = ty;
    this.dir = Util.azarEntero(0, 3);
    this.ang = this.dir * Math.PI / 2;
    this.vel = CONFIG.peatones.velocidad * Util.azar(0.8, 1.25);
    this.estado = op.estado || 'caminar'; // caminar | cruzar | esquivar | caido | huir | esperando
    this.reloj = 0;
    this.colores = { ropa: Util.elegir(ROPA), piel: Util.elegir(PIEL), pelo: Util.elegir(PELO) };
    this.fase = Math.random() * 10;
    this.desvio = Util.azar(-14, 14);
    this.vx = 0;
    this.vy = 0;
    this.relojEsquivar = 0;
    this.relojRevisar = Math.random() * 0.1;
    this.angCaido = 0;
    this.mision = !!op.mision;
    this.radio = 9;
    this.huirX = 0;
    this.huirY = 0;
    this.tiempo = 0;
    if (this.estado === 'caminar') this.elegirSiguiente();
  }

  elegirSiguiente() {
    const P = CONFIG.peatones;
    const opciones = {};
    const destinos = [];
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIRS[d];
      const nx = this.tx + dx, ny = this.ty + dy;
      if (Mundo.caminable(nx, ny) && !(nx === this.ptx && ny === this.pty)) {
        destinos.push({ x: nx, y: ny, d, cruzar: false });
        opciones[destinos.length - 1] = d === this.dir ? 4 : 1;
      }
      // ¿Hay un paso de cebra para cruzar la calle?
      if ((Mundo.viaEn(nx, ny) & 4) && Mundo.caminable(this.tx + dx * 3, this.ty + dy * 3) && Math.random() < P.probCruzar) {
        destinos.push({ x: this.tx + dx * 3, y: this.ty + dy * 3, d, cruzar: true });
        opciones[destinos.length - 1] = 2;
      }
    }
    let elegido;
    if (!destinos.length) elegido = { x: this.ptx, y: this.pty, d: (this.dir + 2) % 4, cruzar: false };
    else elegido = destinos[parseInt(Util.elegirPorPeso(opciones), 10)];
    this.ptx = this.tx; this.pty = this.ty;
    this.tx = elegido.x; this.ty = elegido.y;
    this.dir = elegido.d;
    this.estado = elegido.cruzar ? 'cruzar' : 'caminar';
    if (elegido.cruzar) {
      // Al cruzar, la casilla de "atrás" es la del otro lado
      this.ptx = this.tx - DIRS[this.dir][0];
      this.pty = this.ty - DIRS[this.dir][1];
    }
  }

  // Vuelve a la banqueta más cercana después de un susto
  reubicar() {
    const T = Mundo.T;
    const cx = Math.floor(this.x / T), cy = Math.floor(this.y / T);
    for (let r = 0; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (Mundo.caminable(cx + dx, cy + dy)) {
            this.tx = cx + dx; this.ty = cy + dy;
            this.ptx = this.tx; this.pty = this.ty;
            this.estado = 'cruzar';
            return true;
          }
        }
      }
    }
    return false;
  }

  tumbar(vx, vy) {
    if (this.estado === 'caido') return false;
    this.estado = 'caido';
    this.reloj = CONFIG.peatones.tiempoCaido * Util.azar(0.85, 1.2);
    this.vx = vx * 0.55;
    this.vy = vy * 0.55;
    this.angCaido = Math.atan2(vy, vx) + Util.azar(-0.6, 0.6);
    Efectos.texto(this.x, this.y - 22, Util.elegir(['¡Ay!', '¡Auch!', '¡Ay, ay!', '¡Uf!']), '#ffffff', 16);
    Sonido.ay();
    return true;
  }

  asustar(desdeX, desdeY) {
    if (this.estado === 'caido' || this.mision) return;
    this.estado = 'huir';
    this.reloj = Util.azar(2, 3.5);
    this.huirX = desdeX;
    this.huirY = desdeY;
  }

  revisarPeligro() {
    for (const c of J.carros) {
      const v = c.velocidad;
      if (v < 90) continue;
      const dx = this.x - c.x, dy = this.y - c.y;
      if (Math.abs(dx) > 240 || Math.abs(dy) > 240) continue;
      const ux = c.vx / v, uy = c.vy / v;
      const fw = dx * ux + dy * uy;
      if (fw <= 0 || fw > 50 + v * 0.5) continue;
      const lat = -dx * uy + dy * ux;
      if (Math.abs(lat) > c.ancho / 2 + 18) continue;
      // ¡Viene un carro!
      this.relojEsquivar = 1;
      if (Math.random() < CONFIG.peatones.reflejos) {
        const lado = lat === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(lat);
        this.vx = -uy * lado * 320;
        this.vy = ux * lado * 320;
        this.estado = 'esquivar';
        this.reloj = 0.32;
        if (Math.random() < 0.35) Efectos.texto(this.x, this.y - 20, Util.elegir(['¡Uy!', '¡Cuidado!', '¡Ey!']), '#ffffff', 13);
      }
      return;
    }
  }

  actualizar(dt) {
    this.tiempo += dt;
    const T = Mundo.T;
    this.relojEsquivar = Math.max(0, this.relojEsquivar - dt);

    if (this.estado === 'caido') {
      this.reloj -= dt;
      const fr = Math.exp(-4 * dt);
      this.vx *= fr; this.vy *= fr;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.chocarParedes();
      if (this.reloj <= 0) {
        // Se levanta: primero deja de estar 'caido' (si no, asustar() no hace nada)
        // y luego sale corriendo un ratito, asustado.
        this.estado = this.mision ? 'esperando' : 'caminar';
        this.asustar(this.x - this.vx, this.y - this.vy);
      }
      return;
    }
    if (this.estado === 'esperando') {
      // Pasajero de taxi: saluda mirando hacia la calle
      const j = J.jugador;
      const o = j.carro || j;
      this.ang = Math.atan2(o.y - this.y, o.x - this.x);
      this.fase += dt * 2;
      return;
    }

    this.relojRevisar -= dt;
    if (this.relojRevisar <= 0) {
      this.relojRevisar = 0.1;
      if (this.relojEsquivar <= 0 && this.estado !== 'esquivar') this.revisarPeligro();
    }

    if (this.estado === 'esquivar') {
      this.reloj -= dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.ang = Math.atan2(this.vy, this.vx);
      this.fase += dt * 18;
      this.chocarParedes();
      if (this.reloj <= 0) this.reubicar() || (this.estado = 'caminar');
      return;
    }

    if (this.estado === 'huir') {
      this.reloj -= dt;
      let dx = this.x - this.huirX, dy = this.y - this.huirY;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const v = CONFIG.jugador.correr * 0.8;
      this.x += dx * v * dt; this.y += dy * v * dt;
      this.ang = Math.atan2(dy, dx);
      this.fase += dt * 16;
      if (this.chocarParedes()) { this.huirX = this.x - dy * 50 - dx * 20; this.huirY = this.y + dx * 50 - dy * 20; }
      if (this.reloj <= 0) this.reubicar() || (this.estado = 'caminar');
      return;
    }

    // Caminar / cruzar hacia la casilla objetivo
    const dirX = DIRS[this.dir][0], dirY = DIRS[this.dir][1];
    const ox = this.estado === 'cruzar' ? 0 : -dirY * this.desvio;
    const oy = this.estado === 'cruzar' ? 0 : dirX * this.desvio;
    const objX = this.tx * T + T / 2 + ox, objY = this.ty * T + T / 2 + oy;
    const dx = objX - this.x, dy = objY - this.y;
    const d = Math.hypot(dx, dy);
    const vel = this.vel * (this.estado === 'cruzar' ? 1.5 : 1);
    if (d < 4) {
      if (!Mundo.caminable(this.tx, this.ty)) { if (!this.reubicar()) this.elegirSiguiente(); }
      else this.elegirSiguiente();
    } else {
      this.x += dx / d * vel * dt;
      this.y += dy / d * vel * dt;
      this.ang = Math.atan2(dy, dx);
      this.fase += dt * vel * 0.16;
    }
  }

  chocarParedes() {
    Mundo.resolverCirculo(this.x, this.y, this.radio, RES_PERSONA);
    this.x = RES_PERSONA.x;
    this.y = RES_PERSONA.y;
    return RES_PERSONA.hit;
  }

  dibujar(g) {
    dibujarPersona(g, this.x, this.y, this.ang, this.colores, this.fase, {
      caido: this.estado === 'caido',
      angCaido: this.angCaido,
      tiempo: this.tiempo,
      saludando: this.estado === 'esperando',
      quieto: this.estado === 'esperando',
    });
    if (this.estado === 'esperando') {
      g.save();
      g.font = `800 13px ${FUENTE_TEXTO}`;
      g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,0.6)';
      Util.rectRedondo(g, this.x - 26, this.y - 40, 52, 18, 9); g.fill();
      g.fillStyle = '#ffd23d';
      g.fillText('¡TAXI!', this.x, this.y - 27);
      g.restore();
    }
  }
}

// ----------------------------------------------------------- Tú (a pie)
class Jugador {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ang = -Math.PI / 2;
    this.carro = null;
    this.caido = 0;
    this.angCaido = 0;
    this.fase = 0;
    this.tiempo = 0;
    this.radio = CONFIG.jugador.radio;
    this.colores = { ropa: '#13d6e8', piel: '#e0ac69', pelo: '#1b120c' };
  }

  // eje: dirección {x, y} (largo 0 a 1); correr: true = correr, false = caminar
  actualizar(dt, eje, correr) {
    this.tiempo += dt;
    if (this.carro) {
      this.x = this.carro.x; this.y = this.carro.y;
      this.vx = this.carro.vx; this.vy = this.carro.vy;
      return;
    }
    if (this.caido > 0) {
      this.caido -= dt;
      const fr = Math.exp(-4 * dt);
      this.vx *= fr; this.vy *= fr;
      this.x += this.vx * dt; this.y += this.vy * dt;
    } else {
      const mag = Math.min(1, Math.hypot(eje.x, eje.y));
      const C = CONFIG.jugador;
      const vel = (correr ? C.correr : C.caminar) * Math.max(mag, 0.35);
      if (mag > 0.05) {
        const ux = eje.x / (Math.hypot(eje.x, eje.y) || 1), uy = eje.y / (Math.hypot(eje.x, eje.y) || 1);
        this.vx = ux * vel; this.vy = uy * vel;
        this.ang = Math.atan2(uy, ux);
        this.fase += dt * vel * 0.14;
      } else {
        this.vx = 0; this.vy = 0;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
    }
    Mundo.resolverCirculo(this.x, this.y, this.radio, RES_PERSONA);
    this.x = RES_PERSONA.x;
    this.y = RES_PERSONA.y;
  }

  tumbar(vx, vy) {
    if (this.caido > 0 || this.carro) return;
    this.caido = 1.3;
    this.vx = vx * 0.5;
    this.vy = vy * 0.5;
    this.angCaido = Math.atan2(vy, vx);
    Efectos.texto(this.x, this.y - 22, '¡Ay!', '#3df5ff', 16);
    Sonido.ay();
  }

  dibujar(g) {
    if (this.carro) return;
    dibujarPersona(g, this.x, this.y, this.ang, this.colores, this.fase, {
      caido: this.caido > 0,
      angCaido: this.angCaido,
      tiempo: this.tiempo,
      quieto: Math.hypot(this.vx, this.vy) < 5,
      arma: this.caido > 0 ? null : Armas.actual,
      destello: Armas.destello > 0,
      contorno: 'rgba(61,245,255,0.9)',
    });
  }
}
