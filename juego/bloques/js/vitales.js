// =============================================================
//  ❤️  VIDA, HAMBRE Y AIRE
//  Como en el juego de verdad: 20 de vida (10 corazones), 20 de
//  hambre, 10 burbujas de aire. Te haces daño al caer de alto, al
//  ahogarte, con hambre y con los bichos. Con la barriga llena te
//  curas solo. En modo creativo nada de esto te afecta.
// =============================================================
export const ESCALA_DANO = { pacifico: 0, facil: 0.5, normal: 1, dificil: 1.5 };

export class Vitales {
  constructor() { this.reiniciar(); }

  reiniciar() {
    this.vida = 20; this.hambre = 20; this.saturacion = 5; this.aire = 10;
    this.cansancio = 0; this.invulnerable = 3; this.muerto = false; this.causa = '';
    this.cima = null; this.tCura = 0; this.tHambre = 0; this.tAire = 0; this.tAhogo = 0;
    this.destello = 0;     // para el parpadeo rojo de la pantalla
  }

  exportar() { return { v: this.vida, h: this.hambre, s: +this.saturacion.toFixed(1) }; }

  importar(o) {
    this.reiniciar();
    if (!o || typeof o !== 'object') return;
    if (Number.isFinite(o.v)) this.vida = Math.max(1, Math.min(20, o.v));
    if (Number.isFinite(o.h)) this.hambre = Math.max(0, Math.min(20, o.h));
    if (Number.isFinite(o.s)) this.saturacion = Math.max(0, Math.min(20, o.s));
  }

  cansar(n) { this.cansancio += n; }

  curar(n) { this.vida = Math.min(20, this.vida + n); }

  comer(hambre, sat) {
    this.hambre = Math.min(20, this.hambre + hambre);
    this.saturacion = Math.min(this.hambre, this.saturacion + sat);
  }

  // Aplica daño. c: { armadura (puntos), alDano(n, causa), alMuerte(causa) }. Devuelve el daño real.
  daniar(c, n, causa, { sinArmadura = false, sinInvulnerable = false } = {}) {
    if (this.muerto || n <= 0) return 0;
    if (this.invulnerable > 0 && !sinInvulnerable) return 0;
    if (!sinArmadura) n *= 1 - Math.min(20, c.armadura || 0) * 0.04;
    n = Math.max(0.5, Math.round(n * 2) / 2);
    this.vida -= n;
    this.destello = 0.5;
    if (!sinInvulnerable) this.invulnerable = 0.5;
    if (c.alDano) c.alDano(n, causa);
    if (this.vida <= 0) {
      this.vida = 0;
      this.muerto = true;
      this.causa = causa;
      if (c.alMuerte) c.alMuerte(causa);
    }
    return n;
  }

  // c: { jugador, modo, dificultad, enVehiculo, armadura, alDano, alMuerte }
  actualizar(dt, c) {
    this.destello = Math.max(0, this.destello - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.muerto || c.modo === 'creativo') { this.cima = null; this.aire = 10; return; }
    const j = c.jugador;
    const dif = c.dificultad;

    // ---- caídas
    if (j.enSuelo || j.enAgua || j.volando || c.enVehiculo) {
      if (j.enSuelo && !j.enAgua && !j.volando && !c.enVehiculo && this.cima !== null) {
        const caida = this.cima - j.y;
        if (caida > 3) this.daniar(c, Math.ceil(caida - 3), 'caida', { sinArmadura: true, sinInvulnerable: true });
      }
      this.cima = j.y;
    } else this.cima = this.cima === null ? j.y : Math.max(this.cima, j.y);

    // ---- cansancio → hambre
    if (j.enSuelo && j.corriendo && !c.enVehiculo) this.cansancio += Math.hypot(j.vx, j.vz) * dt * 0.1;
    if (j.enAgua && !c.enVehiculo) this.cansancio += Math.hypot(j.vx, j.vz) * dt * 0.01;
    while (this.cansancio >= 4) {
      this.cansancio -= 4;
      if (this.saturacion > 0) this.saturacion = Math.max(0, this.saturacion - 1);
      else if (dif !== 'pacifico') this.hambre = Math.max(0, this.hambre - 1);
    }

    // ---- curarse con la barriga llena
    if (this.hambre >= 18 && this.vida < 20) {
      this.tCura += dt;
      const lleno = this.hambre >= 20 && this.saturacion > 0;
      if (this.tCura >= (lleno ? 0.5 : 4)) { this.tCura = 0; this.curar(1); this.cansancio += lleno ? 1.5 : 6; }
    } else this.tCura = 0;
    if (dif === 'pacifico') { this.hambre = Math.min(20, this.hambre + dt); if (this.vida < 20) this.curar(dt * 0.5); }

    // ---- hambre total
    if (this.hambre <= 0) {
      this.tHambre += dt;
      if (this.tHambre >= 4) {
        this.tHambre = 0;
        const piso = dif === 'dificil' ? 0 : dif === 'normal' ? 1 : 10;
        if (this.vida > piso) this.daniar(c, 1, 'hambre', { sinArmadura: true, sinInvulnerable: true });
      }
    } else this.tHambre = 0;

    // ---- aire
    if (j.cabezaEnAgua && !c.enVehiculo) {
      this.tAire += dt;
      if (this.tAire >= 1.5) { this.tAire = 0; if (this.aire > 0) this.aire--; }
      if (this.aire <= 0) {
        this.tAhogo += dt;
        if (this.tAhogo >= 1) { this.tAhogo = 0; this.daniar(c, 2, 'ahogado', { sinArmadura: true, sinInvulnerable: true }); }
      }
    } else {
      this.tAire = 0; this.tAhogo = 0;
      if (this.aire < 10) this.aire = Math.min(10, this.aire + dt * 4);
    }
  }
}
