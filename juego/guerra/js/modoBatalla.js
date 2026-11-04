// =============================================================
//  MODO BATALLA: batalla arcade por equipos con bots (aire, tierra o combinada), duelo libre,
//  simulacro y misiones. Una sola clase para todo; la red (multi.js) solo añade jugadores
//  remotos y reparte el estado: el anfitrión controla bots, objetivos, zonas y puntaje.
//  Equipos: 'jugador' (A), 'enemigo' (B) o 'ffa_x' (duelo libre).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG, AVIONES, ORDEN_AVIONES } from './config.js';
import { TANQUES, TANQUES_BOT } from './catalogo.js';
import { AvionJugador, AvionEnemigo } from './avion.js';
import { Tanque } from './tanque.js';
import { ObjetivoTierra } from './objetivos.js';
import { aplicarMarca } from './modelos.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';

const V = new THREE.Vector3(), DIR = new THREE.Vector3(), ORG = new THREE.Vector3(), PTO = new THREE.Vector3(), BOC = new THREE.Vector3(), OC = new THREE.Vector3();
const NOMBRES = ['Cóndor', 'Halcón', 'Víbora', 'Lobo', 'Fénix', 'Trueno', 'Jaguar', 'Águila', 'Tigre', 'Pantera', 'Búho', 'Rayo', 'Colibrí', 'Zorro', 'Cobra', 'Dragón', 'Sable', 'Tormenta'];
const COLOR_EQ = { jugador: 0x3b78c4, enemigo: 0xc4503b };
const mezcla = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const ahora = () => performance.now() / 1000;

export class ModoBatalla {
  // cfg = { modo: 'arcade'|'duelo'|'simulacro'|'mision', unidad: 'avion'|'tanque', combinado, nivel 1..3, tam, mision, red }
  constructor(ctx, cfg) {
    this.ctx = ctx;
    this.cfg = cfg;
    this.nombre = cfg.modo === 'mision' ? 'mision' : 'batalla';
    this.net = cfg.red || null;
    this.autoridad = !this.net || this.net.anfitrion;
    this.unidad = cfg.unidad || 'avion';
    this.mision = cfg.mision || null;
    this.ffa = cfg.modo === 'duelo';
    this.practica = cfg.modo === 'simulacro';
  }

  get miEquipo() { return this.jug ? this.jug.equipo : 'jugador'; }

  iniciar() {
    const c = this.ctx, cfg = this.cfg;
    this.aviones = [];
    this.tanques = [];
    this.objetivos = [];
    this.marcas = [];
    this.radarLista = [];
    this.blancosL = [];
    this.zonas = [];
    this.resultado = null;
    this.t = 0;
    this.siguienteId = 1;
    this.tFin = 0;
    this.muertoT = 0;
    this.respawns = [];
    this.estado = 'cuenta';
    this.cuenta = 3.2;
    this.racha = 0;
    this.eventos = { capturas: 0, objetivos: 0 };
    this.kills = { aire: 0, tanque: 0, tierra: 0 };
    this.tiempoMax = this.mision && this.mision.tiempo ? this.mision.tiempo : cfg.modo === 'duelo' ? 300 : cfg.modo === 'arcade' ? 600 : 0;
    this.tkIni = Math.round((cfg.tam || 8) * 10 + 20);
    this.tk = { jugador: this.tkIni, enemigo: this.tkIni };
    this.killsMeta = 12;
    c.proyectiles.blancos = () => this._blancos();
    c.proyectiles.alAcierto = (e, d, p) => this._acierto(e, d, p);
    c.proyectiles.alEngano = (d) => { if (d === this.jug) c.alEngano && c.alEngano(); };
    this._plano();
    this.perfil = c.perfil;
    this._crearJugador(this.unidad, true);
    if (this.net) this.net.iniciar(this);
    if (this.autoridad) this._poblar();
    c.hud.modo(this.unidad, this.unidad === 'avion' ? this.jug.def : null);
    Sonido.motor.iniciar(this.unidad);
    c.hud.aviso(this._titulo(), 3);
    c.hud.mision(this.mision ? this.mision.desc : '');
  }

  _titulo() {
    if (this.mision) return this.mision.nombre.toUpperCase();
    return { arcade: 'BATALLA ARCADE', duelo: 'DUELO LIBRE', simulacro: 'SIMULACRO' }[this.cfg.modo] || 'BATALLA';
  }

  // ---------------------------------------------------------- Preparación del campo
  _plano() {
    const T = this.ctx.terreno;
    const zs = T.zonas.filter((z) => z.tipo !== 'pista');
    let a = null, b = null, mejor = -1;
    for (const p of zs) for (const q of zs) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d > mejor) { mejor = d; a = p; b = q; }
    }
    if (!a || a === b || mejor < 300) { a = { x: -520, z: -380, r: 90 }; b = { x: 520, z: 380, r: 90 }; }
    this.spawnA = a; this.spawnB = b;
    if (this.mision && this.mision.tipo === 'captura') { this.spawnA = a; this.spawnB = b; }
    this.spawn = { jugador: a, enemigo: b };
    // puntos de captura: el resto de zonas, o el punto medio
    this.zonas.length = 0;
    const usar = this.cfg.modo === 'arcade' && (this.unidad === 'tanque' || this.cfg.combinado) || (this.mision && this.mision.tipo === 'captura');
    if (usar) {
      const otras = T.zonas.filter((z) => z !== a && z !== b);
      for (const z of otras.slice(0, 3)) this.zonas.push({ x: z.x, z: z.z, r: Math.max(55, Math.min(80, z.r * 0.8)), y: z.y, prog: 0, dueno: 'n' });
      if (this.zonas.length < 2) {
        const p = T.puntoLibre({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, 0, 160, 10);
        this.zonas.push({ x: p.x, z: p.z, r: 70, y: p.y, prog: 0, dueno: 'n' });
      }
      this._columnas();
    }
  }

  // Columnas de luz sobre las zonas de captura
  _columnas() {
    const { escena } = this.ctx;
    this.luces = [];
    for (const z of this.zonas) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(z.r, z.r, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      g.position.set(z.x, z.y + 45, z.z);
      escena.add(g);
      this.luces.push(g);
    }
  }

  // ---------------------------------------------------------- Jugador
  _crearJugador(unidad, primera = false) {
    const c = this.ctx;
    if (this.jug) { this.jug.quitar(); }
    this.unidad = unidad;
    const eq = this.net ? this.net.miEquipo : 'jugador';
    let e;
    if (unidad === 'avion') {
      const def = c.defAvion(c.avionId);
      e = new AvionJugador(c, def);
      e.invertido = c.opciones.invertido === true;
      e.reiniciar(this._puntoAire(eq));
    } else {
      const id = c.tanqueId || 'jugador';
      const op = c.opcionesTanque(id);
      e = new Tanque(c, id, 1, op);
      aplicarMarca(e.grupo, op.marca, c.perfilColor || '#fff', true);
      const p = this._puntoTierra(eq);
      e.colocar(p.x, p.z, p.rumbo);
      this.cmd = { av: 0, gi: 0 };
    }
    e.equipo = eq;
    e.esJugador = true;
    e.id = this.net ? 'p' + this.net.miId : 'p0';
    e.nombre = c.perfil.nombre;
    e.colorNombre = c.perfil.color;
    e.kills = this.jug ? this.jug.kills : 0;
    e.muertes = this.jug ? this.jug.muertes : 0;
    e.puntosM = this.jug ? this.jug.puntosM : 0;
    e.ilimitado = this.practica;
    e.alMorir = () => this._muereJugador();
    this.jug = e;
    c.jugador = e;
    c.camaras.reiniciar();
    c.hud.modo(unidad, unidad === 'avion' ? e.def : null);
    Sonido.motor.parar();
    Sonido.motor.iniciar(unidad);
    document.body.classList.remove('cabina', 'mira');
    c.camVar = Math.min(c.camVar | 0, 3);
    if (!primera) this.estado = 'jugando';
    return e;
  }

  _puntoAire(eq) {
    const s = this.spawn[eq] || this.spawn.jugador;
    const o = eq === 'enemigo' ? this.spawn.jugador : this.spawn.enemigo;
    const a = Math.random() * 6.28, r = 60 + Math.random() * 120;
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    const y = Math.max(230, this.ctx.terreno.techo(x, z) + 150);
    const rumbo = Math.atan2(-(o.x - x), -(o.z - z));
    return { x, y, z, rumbo };
  }

  _puntoTierra(eq) {
    const s = this.spawn[eq] || this.spawn.jugador;
    const o = eq === 'enemigo' ? this.spawn.jugador : this.spawn.enemigo;
    const p = this.ctx.terreno.puntoLibre({ x: s.x, z: s.z }, 15, Math.max(60, (s.r || 90) * 0.8), 9);
    return { x: p.x, z: p.z, rumbo: Math.atan2(-(o.x - p.x), -(o.z - p.z)) };
  }

  _muereJugador() {
    const c = this.ctx, j = this.jug;
    j.muertes++;
    this.racha = 0;
    c.estadisticasMuerte && c.estadisticasMuerte();
    c.camaras.kill(j.ultimo, j.pos);
    this.muertoT = this.practica ? 2 : 6;
    this.estado = 'muerto';
    this._anunciarMuerte(j);
    if (this.autoridad) this._restar(j);
    if (this.mision && !this.cfg.coop) this.tFin = 2.5;
    c.hud.aviso(this.unidad === 'avion' ? 'AVIÓN DESTRUIDO' : 'TANQUE DESTRUIDO', 2.4, true);
    if (c.alMuerteJugador) c.alMuerteJugador();
  }

  // Elegir qué reaparece (en combinado se puede cambiar de unidad)
  elegirRespawn(unidad) {
    if (this.estado !== 'muerto' || this.muertoT > 0.2) return;
    if (this.mision && !this.cfg.coop) return;
    if (unidad !== this.unidad && !this.cfg.combinado) return;
    this._reaparecer(unidad);
  }

  _reaparecer(unidad) {
    const c = this.ctx;
    this.ctx.hud.el.reaparecer.classList.add('oculto');
    if (this.unidad !== unidad || this.unidad === 'tanque') {
      this._crearJugador(unidad);
    } else {
      const j = this.jug;
      j.reiniciar(this._puntoAire(j.equipo));
      j.ilimitado = this.practica;
      c.camaras.reiniciar();
    }
    this.estado = 'jugando';
    this.muertoT = 0;
    this.jug.invulnerable = 2.5;
    if (this.net) this.net.reaparecio(this.jug);
  }

  // ---------------------------------------------------------- Entidades
  _id(p) { return p + (this.siguienteId++); }

  _defAvionBot(nivel) {
    const maxR = 3 + nivel * 3;
    const lista = ORDEN_AVIONES.filter((k) => AVIONES[k].rango <= maxR);
    let k;
    for (let i = 0; i < 20; i++) {
      k = lista[Math.floor(Math.random() * lista.length)];
      const rol = AVIONES[k].rol;
      if ((rol === 'bombardero' || rol === 'heli') && Math.random() < 0.65) continue;
      if (rol === 'ataque' && Math.random() < 0.4) continue;
      break;
    }
    return AVIONES[k];
  }

  _crearBotAvion(eq, nivel) {
    const c = this.ctx;
    const def0 = this._defAvionBot(nivel);
    const col = this.ffa ? new THREE.Color().setHSL(Math.random(), 0.5, 0.45).getHex() : COLOR_EQ[eq];
    const def = { ...def0, colores: [mezcla(def0.colores[0], col, 0.5), mezcla(def0.colores[1], col, 0.35)] };
    const e = new AvionEnemigo(c, nivel * 2, 'caza', { equipo: eq, def, nivel, nombre: NOMBRES[Math.floor(Math.random() * NOMBRES.length)] });
    this._ficha(e, 'b');
    const p = this._puntoAire(eq);
    V.set(p.x - Math.sin(p.rumbo), 0, p.z - Math.cos(p.rumbo)).add(V.set(0, 0, 0));
    e.colocar(p.x, p.y, p.z, DIR.set(p.x - Math.sin(p.rumbo) * 100, 0, p.z - Math.cos(p.rumbo) * 100));
    e.alMorir = () => this._muerteBot(e);
    this.aviones.push(e);
    return e;
  }

  _crearBotTanque(eq, nivel) {
    const c = this.ctx;
    const pool = TANQUES_BOT[nivel - 1];
    const tipo = pool[Math.floor(Math.random() * pool.length)];
    const col = this.ffa ? new THREE.Color().setHSL(Math.random(), 0.4, 0.4).getHex() : mezcla(TANQUES[tipo].color, COLOR_EQ[eq], 0.45);
    const e = new Tanque(c, tipo, nivel * 2, { equipo: eq, nivel, color: col, nombre: NOMBRES[Math.floor(Math.random() * NOMBRES.length)], mult: { vida: 0.9 + nivel * 0.1 } });
    this._ficha(e, 'b');
    e.grupo.userData.col = col;
    const p = this._puntoTierra(eq);
    e.colocar(p.x, p.z, p.rumbo);
    e.alMorir = () => this._muerteBot(e);
    this.tanques.push(e);
    return e;
  }

  _ficha(e, pref) {
    e.id = this._id(pref);
    e.kills = 0; e.muertes = 0; e.puntosM = 0;
    e.esBot = true;
  }

  _crearObjetivo(tipo, x, z, eq, vida) {
    const o = new ObjetivoTierra(this.ctx, tipo, x, z, 2, eq);
    if (vida) o.vida = o.vidaMax = vida;
    this._ficha(o, 'o');
    o.nombre = tipo.toUpperCase();
    o.alMorir = () => this._muerteBot(o);
    this.objetivos.push(o);
    return o;
  }

  // Bots y objetivos iniciales según el modo (solo el anfitrión o partida individual)
  _poblar() {
    const c = this.ctx, cfg = this.cfg, n = cfg.nivel || 2;
    const tam = cfg.tam || 8;
    if (this.mision) { this._poblarMision(); return; }
    if (this.practica) { this._poblarSimulacro(); return; }
    if (this.ffa) {
      const total = Math.min(8, tam);
      const humanos = this.net ? this.net.cuantos() : 1;
      for (let i = humanos; i < total; i++) this._crearBotAvion('ffa_' + i, n);
      return;
    }
    // equipos
    const hum = this.net ? this.net.humanosPorEquipo() : { jugador: 1, enemigo: 0 };
    for (const eq of ['jugador', 'enemigo']) {
      const faltan = Math.max(0, tam - (hum[eq] || 0));
      for (let i = 0; i < faltan; i++) {
        const tierra = this.unidad === 'tanque' && !cfg.combinado ? true : cfg.combinado ? i % 2 === 1 : false;
        if (tierra) this._crearBotTanque(eq, n); else this._crearBotAvion(eq, n);
      }
    }
    // objetivos de tierra de cada bando (cuentan para los tickets)
    if (this.unidad === 'avion' || cfg.combinado) {
      for (const eq of ['jugador', 'enemigo']) {
        for (let i = 0; i < 3; i++) {
          const p = c.terreno.puntoLibre(this.spawn[eq], 20, Math.max(70, this.spawn[eq].r || 90), 8);
          this._crearObjetivo(i === 0 ? 'antiaerea' : i === 1 ? 'deposito' : 'antiaerea', p.x, p.z, eq);
        }
      }
    }
  }

  _poblarSimulacro() {
    const c = this.ctx;
    for (let i = 0; i < 6; i++) {
      const p = c.terreno.puntoLibre(this.spawn.jugador, 120, 420, 8);
      const o = this._crearObjetivo(['camion', 'deposito', 'radar'][i % 3], p.x, p.z, 'enemigo');
      o.practica = true;
    }
    if (this.unidad === 'avion') for (let i = 0; i < 3; i++) {
      const e = this._crearBotAvion('enemigo', 1);
      e.practica = true;
    } else for (let i = 0; i < 3; i++) { const t = this._crearBotTanque('enemigo', 1); t.practica = true; }
  }

  _poblarMision() {
    const c = this.ctx, m = this.mision, n = m.nivel || 1;
    const A = this.spawn.jugador, B = this.spawn.enemigo;
    this.mState = { fase: 0, t: 0, tOla: 20, mantener: 0 };
    if (m.tipo === 'bombardeo') {
      const otros = c.mapa.objetivos;
      const zonas = c.terreno.zonas.filter((z) => z.tipo !== 'pista');
      for (let i = 0; i < m.n; i++) {
        const zo = zonas[i % zonas.length] || B;
        let tipo = i < 2 ? 'antiaerea' : otros[i % otros.length];
        let p = null;
        if (tipo === 'barco') p = c.terreno.puntoMar(zo, 60, 380);
        if (!p) { if (tipo === 'barco') tipo = 'camion'; p = c.terreno.puntoLibre(zo, 8, (zo.r || 90) * 0.8, 6); }
        this._crearObjetivo(tipo, p.x, p.z, 'enemigo');
      }
      for (let i = 0; i < 1 + n; i++) this._crearBotAvion('enemigo', n);
    } else if (m.tipo === 'escolta') {
      const meta = c.terreno.puntoLibre(B, 0, 120, 8);
      this.ruta = { x: meta.x, z: meta.z };
      const defB = AVIONES.martillo;
      for (let i = 0; i < m.n; i++) {
        const e = new AvionEnemigo(c, 2, 'caza', { equipo: 'jugador', def: { ...defB, colores: [0x6a9ad0, 0x2a3f60] }, nivel: 1, nombre: 'Bombardero ' + (i + 1) });
        this._ficha(e, 'b');
        e.ataca = false; e.bombasN = 0; e.misilesN = 0; e.rafaga = 0; e.cdRafaga = 9999; e.escoltado = true;
        e.base = 62; e.giro = 0.55;
        e.ruta = this.ruta;
        const p = this._puntoAire('jugador');
        e.colocar(p.x + (i - m.n / 2) * 60, 280, p.z + i * 30, DIR.set(meta.x, 0, meta.z));
        e.alMorir = () => this._muerteBot(e);
        this.aviones.push(e);
      }
      this.mState.requeridos = Math.ceil(m.n * 2 / 3);
      this.mState.olas = 3;
      this.mState.tOla = 15;
      this._ola(n, 2);
    } else if (m.tipo === 'defensa') {
      const o = this._crearObjetivo('deposito', A.x, A.z, 'jugador', 900 + 150 * n);
      o.nombre = 'BASE'; o.base = true;
      this.base = o;
      for (let i = 0; i < 2; i++) { const p = c.terreno.puntoLibre(A, 25, 90, 8); this._crearObjetivo('antiaerea', p.x, p.z, 'jugador'); }
      this._ola(n, 3);
    } else if (m.tipo === 'captura') {
      for (let i = 0; i < 4; i++) this._crearBotTanque('jugador', 1 + (n > 2 ? 1 : 0));
      for (let i = 0; i < 5; i++) this._crearBotTanque('enemigo', n);
    } else if (m.tipo === 'supervivencia') {
      this._ola(n, 4);
    }
  }

  // Oleada de enemigos de la misión
  _ola(nivel, cuantos) {
    const tierra = this.unidad === 'tanque';
    for (let i = 0; i < cuantos; i++) {
      const eq = 'enemigo';
      if (tierra) this._crearBotTanque(eq, Math.min(3, nivel)); else this._crearBotAvion(eq, Math.min(3, nivel));
    }
  }

  // ---------------------------------------------------------- Muertes y puntaje
  _anunciarMuerte(e) {
    const c = this.ctx;
    const k = e.ultimo && e.ultimo !== e ? e.ultimo : null;
    const col = (x) => (x.colorNombre ? x.colorNombre : x.equipo === this.miEquipo && !this.ffa ? this.ctx.paleta.aliado : this.ctx.paleta.enemigo);
    if (k) c.hud.kill(k.nombre || '?', e.nombre || '?', col(k), col(e), k.tipo === 'aire' && e.tipo === 'tanque' ? '✈' : '▸');
    else c.hud.kill('', e.nombre || '?', '#fff', col(e), '✖');
    if (this.net) this.net.muerte(e, k);
  }

  _otorgar(k, e) {
    if (!k || k === e) return;
    const pts = e.tipo === 'aire' ? 100 : e.tipo === 'tanque' ? 100 : 60;
    k.kills = (k.kills || 0) + 1;
    k.puntosM = (k.puntosM || 0) + pts;
    if (k === this.jug) {
      const c = this.ctx;
      this.racha++;
      const s = c.stats;
      if (s) { s.bajas++; s.maxRacha = Math.max(s.maxRacha || 0, this.racha); if (e.tipo === 'aire') s.bajasAire++; else if (e.tipo === 'tanque') s.bajasTanque++; else s.bajasTierra++; }
      this.kills[e.tipo === 'aire' ? 'aire' : e.tipo === 'tanque' ? 'tanque' : 'tierra']++;
      c.hud.aviso('+' + pts + '  ' + (e.nombre || 'BLANCO'), 1.2);
      if (e.tipo === 'tierra') this.eventos.objetivos++;
    }
  }

  _muerteBot(e) {
    this._anunciarMuerte(e);
    e.muertes = (e.muertes || 0) + 1;
    this._otorgar(e.ultimo, e);
    if (!this.autoridad) return;
    this._restar(e);
    if (e.tipo !== 'tierra' && !this.mision && !this.practica) this.respawns.push({ eq: e.equipo, tipo: e.tipo, t: 7 + Math.random() * 3, nivel: e.nivel || this.cfg.nivel || 2 });
    if (this.mision && this.mision.tipo === 'supervivencia') { /* las oleadas las reponen */ }
    if (this.practica) this.respawns.push({ eq: e.equipo, tipo: e.tipo, t: 4, nivel: 1, practica: true, tierra: e.tipo === 'tierra', clase: e.clase, x: e.pos.x, z: e.pos.z });
  }

  _restar(e) {
    if (this.practica || this.mision) return;
    if (this.ffa) return;
    const eq = e.equipo;
    if (this.tk[eq] === undefined) return;
    this.tk[eq] -= e.tipo === 'tierra' ? 5 : 1;
  }

  _acierto(e, d, p) {
    if (p.dueno === this.jug) {
      this.ctx.hud.acierto(!e.vivo);
      if (this.ctx.stats) { this.ctx.stats.aciertos++; this.ctx.stats.danio += d; }
    }
  }

  // Se llama desde la red cuando muere alguien remoto (el dueño de la unidad lo anuncia)
  muerteRemota(id, porId) {
    const e = this._buscar(id), k = this._buscar(porId);
    if (!e) return;
    e.ultimo = k;
    e.muertes = (e.muertes || 0) + 1;
    this._anunciarMuerteLocal(e, k);
    this._otorgar(k, e);
    if (this.autoridad) this._restar(e);
  }

  _anunciarMuerteLocal(e, k) {
    const c = this.ctx;
    const col = (x) => (x.colorNombre ? x.colorNombre : x.equipo === this.miEquipo && !this.ffa ? c.paleta.aliado : c.paleta.enemigo);
    if (k) c.hud.kill(k.nombre || '?', e.nombre || '?', col(k), col(e), '▸'); else c.hud.kill('', e.nombre || '?', '#fff', col(e), '✖');
  }

  _buscar(id) {
    if (this.jug && this.jug.id === id) return this.jug;
    for (const l of [this.aviones, this.tanques, this.objetivos]) for (const e of l) if (e.id === id) return e;
    return null;
  }

  todas() {
    const l = [];
    if (this.jug) l.push(this.jug);
    for (const e of this.aviones) l.push(e);
    for (const e of this.tanques) l.push(e);
    return l;
  }

  _blancos() {
    const b = this.blancosL;
    b.length = 0;
    if (this.jug && this.jug.vivo && !(this.jug.invulnerable > 0)) b.push(this.jug);
    for (const e of this.aviones) if (e.vivo) b.push(e);
    for (const e of this.tanques) if (e.vivo) b.push(e);
    for (const e of this.objetivos) if (e.vivo) b.push(e);
    return b;
  }

  // ---------------------------------------------------------- IA de equipos
  _enemigos(de) {
    const l = [];
    const hostil = (e) => e.vivo && e.equipo !== de.equipo && !(e === this.jug && e.invulnerable > 0);
    for (const e of this.todas()) if (hostil(e)) l.push(e);
    for (const e of this.objetivos) if (hostil(e)) l.push(e);
    return l;
  }

  _elegir(bot, esAire) {
    const l = this._enemigos(bot);
    let mejor = null, ms = Infinity;
    const aa = bot.datos && bot.datos.aa;
    for (const e of l) {
      const aire = e.tipo === 'aire';
      if (!esAire) {
        if (aire !== !!aa) continue;
        if (e.practica && bot.practica) continue;
      }
      let d = Math.hypot(e.pos.x - bot.pos.x, e.pos.z - bot.pos.z);
      if (esAire) {
        const prefAire = !bot.ataca;
        if (aire !== prefAire) d += 700;
        if (e.tipo === 'tierra' && e.clase === 'antiaerea' && bot.ataca) d += 150;
      }
      if (d < ms) { ms = d; mejor = e; }
    }
    return mejor;
  }

  _destinoTanque(t) {
    if (this.zonas.length) {
      let z = null, md = Infinity;
      for (const q of this.zonas) {
        const mio = q.dueno === t.equipo;
        const d = Math.hypot(q.x - t.pos.x, q.z - t.pos.z) + (mio ? 500 : 0);
        if (d < md) { md = d; z = q; }
      }
      if (z) return z;
    }
    const o = this.spawn[t.equipo === 'jugador' ? 'enemigo' : 'jugador'] || this.spawn.enemigo;
    return o;
  }

  _actualizarBots(dt) {
    const c = this.ctx;
    const todosAv = this.aviones;
    for (const e of todosAv) {
      if (!e.vivo || e.remoto) continue;
      e.tObjetivo -= dt;
      if (e.tObjetivo <= 0) { e.tObjetivo = 1 + Math.random(); e.objetivo = e.escoltado ? null : this._elegir(e, true); }
      if (e.objetivo && !e.objetivo.vivo) e.objetivo = null;
      let obj = e.objetivo;
      if (this.practica && e.practica) obj = null;
      e.actualizar(dt, obj, todosAv);
    }
    for (const t of this.tanques) {
      if (!t.vivo || t.remoto) continue;
      t.tObjetivo = (t.tObjetivo === undefined ? 0 : t.tObjetivo) - dt;
      if (t.tObjetivo <= 0) { t.tObjetivo = 1.2 + Math.random(); t.objetivoIA = this._elegir(t, false); }
      if (t.objetivoIA && !t.objetivoIA.vivo) t.objetivoIA = null;
      t.pensar(dt, this.practica && t.practica ? null : t.objetivoIA, this._destinoTanque(t));
    }
    for (const o of this.objetivos) {
      if (!o.vivo || o.remoto) continue;
      if (o.clase === 'antiaerea' || o.clase === 'barco') {
        let a = null, md = 1000;
        for (const e of this.todas()) {
          if (!e.vivo || e.tipo !== 'aire' || e.equipo === o.equipo) continue;
          const d = e.pos.distanceTo(o.centro);
          if (d < md) { md = d; a = e; }
        }
        o.actualizar(dt, this.practica ? null : a);
      } else o.actualizar(dt, null);
    }
    // los tanques no se atraviesan
    const ts = this.tanques.filter((t) => t.vivo);
    if (this.unidad === 'tanque' && this.jug.vivo) ts.push(this.jug);
    for (let i = 0; i < ts.length; i++) for (let k = i + 1; k < ts.length; k++) {
      const a = ts[i], b = ts[k];
      if (a.remoto || b.remoto) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = 7;
      if (d < min && d > 0.01) {
        const f = (min - d) / 2 / d;
        a.pos.x -= dx * f; a.pos.z -= dz * f; b.pos.x += dx * f; b.pos.z += dz * f;
      }
    }
  }

  _respawnBots(dt) {
    if (!this.autoridad || !this.respawns.length) return;
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.t -= dt;
      if (r.t > 0) continue;
      this.respawns.splice(i, 1);
      if (r.practica && r.tierra) { this._crearObjetivo(r.clase, r.x, r.z, 'enemigo').practica = true; continue; }
      if (this.tk[r.eq] !== undefined && this.tk[r.eq] <= 0) continue;
      const e = r.tipo === 'aire' ? this._crearBotAvion(r.eq, r.nivel) : this._crearBotTanque(r.eq, r.nivel);
      if (r.practica) e.practica = true;
    }
    // limpiar restos viejos
    const limpia = (l) => { for (let i = l.length - 1; i >= 0; i--) { const e = l[i]; if (!e.vivo && !e.remoto) { e.muertoT = (e.muertoT || 0) + dt; if (e.muertoT > 4) { e.quitar(); l.splice(i, 1); } } } };
    limpia(this.aviones); limpia(this.tanques); limpia(this.objetivos);
  }

  // ---------------------------------------------------------- Zonas de captura
  _actualizarZonas(dt) {
    if (!this.zonas.length || !this.autoridad) return;
    const cuerpo = this.todas().filter((e) => e.vivo && (e.tipo === 'tanque' || (e.esHeli && e.pos.y < this.ctx.terreno.altura(e.pos.x, e.pos.z) + 40)));
    let nJ = 0, nE = 0;
    for (const z of this.zonas) {
      let a = 0, b = 0;
      for (const e of cuerpo) if (Math.hypot(e.pos.x - z.x, e.pos.z - z.z) < z.r) { if (e.equipo === 'jugador') a++; else if (e.equipo === 'enemigo') b++; }
      if (a !== b && !(a && b)) {
        z.prog = Math.max(-1, Math.min(1, z.prog + (a > b ? 1 : -1) * Math.min(3, Math.max(a, b)) * 0.12 * dt));
        if (z.prog >= 1 && z.dueno !== 'jugador') { z.dueno = 'jugador'; this._capturada(z, 'jugador'); }
        if (z.prog <= -1 && z.dueno !== 'enemigo') { z.dueno = 'enemigo'; this._capturada(z, 'enemigo'); }
      }
      if (z.dueno === 'jugador') nJ++; else if (z.dueno === 'enemigo') nE++;
    }
    if (!this.practica && !this.ffa && !this.mision) {
      if (nJ > nE) this.tk.enemigo -= (nJ - nE) * 0.35 * dt;
      if (nE > nJ) this.tk.jugador -= (nE - nJ) * 0.35 * dt;
    }
    if (this.mision && this.mision.tipo === 'captura' && nJ === this.zonas.length) this.mState.mantener += dt;
  }

  _capturada(z, eq) {
    const mio = eq === this.miEquipo;
    this.ctx.hud.aviso(mio ? 'ZONA CAPTURADA' : 'ZONA PERDIDA', 2, !mio);
    if (this.net) this.net.zona(this.zonas.indexOf(z), eq);
    if (mio) { this.eventos.capturas++; if (this.ctx.stats) this.ctx.stats.capturas++; if (this.jug) this.jug.puntosM += 150; }
  }

  // ---------------------------------------------------------- Misiones
  _actualizarMision(dt) {
    if (this.mision && !this.autoridad && this.mision.tipo === 'supervivencia') this.ctx.hud.mision(`${this.mision.nombre.toUpperCase()}: ${this._fmt(this.tiempoMax - this.t)}`);
    if (!this.mision || !this.autoridad) return;
    const m = this.mision, S = this.mState, c = this.ctx;
    S.t += dt;
    const vivosEn = () => this.todas().concat(this.objetivos).filter((e) => e.vivo && e.equipo === 'enemigo' && !e.esJugador).length;
    if (m.tipo === 'bombardeo') {
      const restantes = this.objetivos.filter((o) => o.vivo && o.equipo === 'enemigo').length;
      c.hud.mision(`${m.nombre.toUpperCase()}: blancos restantes ${restantes} · ${this._fmt(this.tiempoMax - this.t)}`);
      if (restantes === 0) this._terminarMision(true);
    } else if (m.tipo === 'escolta') {
      const vivos = this.aviones.filter((e) => e.escoltado && e.vivo);
      const llegaron = vivos.filter((e) => Math.hypot(e.pos.x - this.ruta.x, e.pos.z - this.ruta.z) < 220).length;
      c.hud.mision(`ESCOLTA: bombarderos ${vivos.length}/${m.n} · llegaron ${llegaron}/${S.requeridos}`);
      S.tOla -= dt;
      if (S.tOla <= 0 && S.olas > 0) { S.olas--; S.tOla = 55; this._ola(m.nivel, 2 + (m.nivel > 2 ? 1 : 0)); c.hud.aviso('¡CAZAS ENEMIGOS!', 2, true); }
      if (llegaron >= S.requeridos) this._terminarMision(true);
      else if (vivos.length < S.requeridos) this._terminarMision(false);
    } else if (m.tipo === 'defensa') {
      c.hud.mision(`DEFENSA: base ${Math.max(0, Math.round(this.base.vida))}/${this.base.vidaMax} · quedan ${this._fmt(this.tiempoMax - this.t)}`);
      S.tOla -= dt;
      if (S.tOla <= 0) { S.tOla = 38; this._ola(m.nivel, 2 + Math.floor(S.t / 70)); c.hud.aviso('OLEADA ENEMIGA', 2, true); }
      if (!this.base.vivo) this._terminarMision(false);
      else if (this.t >= this.tiempoMax) this._terminarMision(true);
    } else if (m.tipo === 'captura') {
      c.hud.mision(`CAPTURA: mantén las 3 zonas ${Math.round(S.mantener)}/45 s · ${this._fmt(this.tiempoMax - this.t)}`);
      if (S.mantener >= 45) this._terminarMision(true);
    } else if (m.tipo === 'supervivencia') {
      c.hud.mision(`SUPERVIVENCIA: ${this._fmt(this.tiempoMax - this.t)} · bajas ${this.jug.kills}`);
      S.tOla -= dt;
      if (S.tOla <= 0) { S.tOla = 28; if (vivosEn() < 8) this._ola(Math.min(3, m.nivel + Math.floor(S.t / 100)), 2); }
      if (this.t >= this.tiempoMax) this._terminarMision(true);
    }
    if (this.t >= this.tiempoMax && this.tiempoMax && m.tipo !== 'defensa' && m.tipo !== 'supervivencia') this._terminarMision(false);
  }

  _terminarMision(ok) {
    if (this.fin) return;
    this._fin(ok);
  }

  _fmt(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // ---------------------------------------------------------- Fin de la partida
  _comprobarFin() {
    if (this.fin || this.mision || this.practica || !this.autoridad) return;
    if (this.ffa) {
      const top = this.todas().reduce((m, e) => (e.kills > (m ? m.kills : -1) ? e : m), null);
      if (top && top.kills >= this.killsMeta) this._fin(top === this.jug, top);
      else if (this.t >= this.tiempoMax) this._fin(top === this.jug, top);
      return;
    }
    if (this.tk.jugador <= 0 || this.tk.enemigo <= 0 || this.t >= this.tiempoMax) {
      const gana = this.tk.jugador === this.tk.enemigo ? null : this.tk.jugador > this.tk.enemigo ? 'jugador' : 'enemigo';
      this._fin(gana === this.miEquipo, null, gana);
    }
  }

  _fin(victoria, ganador = null, equipoGana = null) {
    if (this.fin) return;
    this.fin = true;
    this.tFin = 2.5;
    this.vicFin = victoria;
    this.ganador = ganador;
    this.ctx.hud.aviso(victoria ? '¡VICTORIA!' : 'DERROTA', 2.5, !victoria);
    if (this.net) this.net.fin(victoria, equipoGana);
  }

  // Resultado con puntaje, recompensa y estadísticas para la pantalla final
  _resultado(victoria) {
    const j = this.jug;
    const kills = j.kills, muertes = j.muertes;
    let xp = kills * 24 + this.eventos.objetivos * 20 + this.eventos.capturas * 60 + Math.round(this.t / 12);
    xp += victoria ? 220 : 70;
    let cr = Math.round(xp * 0.85);
    if (this.mision) { xp += victoria ? this.mision.xp : Math.round(this.mision.xp * 0.15); cr += victoria ? this.mision.cr : Math.round(this.mision.cr * 0.15); }
    if (this.practica) { xp = Math.round(xp * 0.2); cr = Math.round(cr * 0.2); }
    return { victoria, puntaje: j.puntosM, oleada: 0, batalla: true, kills, muertes, capturas: this.eventos.capturas, tiempo: Math.round(this.t), xp, cr, modo: this.cfg.modo, mision: this.mision ? this.mision.id : null };
  }

  // ---------------------------------------------------------- Ciclo
  actualizar(dt) {
    const c = this.ctx, j = this.jug, ent = c.entrada;
    // en red la partida no se detiene al pausar; el bucle general llama igual
    this.t += dt;
    if (j.invulnerable > 0) j.invulnerable -= dt;
    if (this.cuenta > 0) {
      this.cuenta -= dt;
      c.hud.cuenta(this.cuenta > 0.6 ? String(Math.ceil(this.cuenta - 0.6)) : '¡YA!');
      if (this.cuenta <= 0) { c.hud.cuenta(''); this.estado = 'jugando'; }
    }
    this._controlJugador(dt);
    if (this.net) this.net.tick(dt);
    if (this.cuenta <= 0 || this.net) {
      if (this.autoridad) this._actualizarBots(dt);
      else this._actualizarProxies(dt);
    }
    c.proyectiles.actualizar(dt);
    this._respawnBots(dt);
    this._actualizarZonas(dt);
    this._actualizarMision(dt);
    if (this.autoridad) this._comprobarFin();
    // jugador muerto: cuenta atrás para reaparecer
    if (this.estado === 'muerto' && (!this.mision || this.cfg.coop)) {
      this.muertoT -= dt;
      this._panelRespawn();
      if (this.muertoT <= 0 && !this.cfg.combinado) this._reaparecer(this.unidad);
      else if (this.muertoT <= -8) this._reaparecer(this.unidad);
    }
    if (this.tFin > 0) {
      this.tFin -= dt;
      if (this.tFin <= 0) {
        if (this.fin) this.resultado = this._resultado(this.vicFin);
        else if (this.mision) this.resultado = this._resultado(false);
      }
    }
    if (this.coopRevisar > 0) {
      this.coopRevisar -= dt;
      if (this.coopRevisar <= 0 && this.autoridad && !this.fin) {
        const humanos = this.todas().filter((e) => !e.esBot);
        if (humanos.length && humanos.every((e) => !e.vivo)) this._fin(false, null, 'enemigo');
      }
    }
    if (this.mision && !this.cfg.coop && !this.jug.vivo && !this.fin) { this.fin = true; this.tFin = 2.4; this.vicFin = this.mision.tipo === 'supervivencia' && this.t > this.tiempoMax * 0.8; }
    this._hud(dt);
    this._camara(dt);
    void ent;
  }

  _controlJugador(dt) {
    const c = this.ctx, j = this.jug, ent = c.entrada;
    if (!j.vivo) {
      if (this.unidad === 'avion') this._camara(dt);
      return;
    }
    if (this.estado === 'cuenta') {
      // congelado en la cuenta atrás de inicio
      if (this.unidad === 'avion') { j.pos.addScaledVector(j.fwd.set(0, 0, -1).applyQuaternion(j.q), (j.velocidad || 60) * dt); }
      return;
    }
    if (this.unidad === 'avion') {
      this.blancosL;
      const cand = [];
      for (const e of this.todas()) if (e.vivo && e !== j && e.equipo !== j.equipo) cand.push(e);
      for (const e of this.objetivos) if (e.vivo && e.equipo !== j.equipo) cand.push(e);
      j.actualizar(dt, ent, cand);
      if (ent.pulso('KeyN', 'PadRight')) c.camaras.alternarArma(j);
      if (c.opcionesJuego && j.ultimoDisparo && j.ultimoDisparo !== this._ud) { this._ud = j.ultimoDisparo; c.camaras.armaAuto(j); }
      this._avisosAvion();
    } else {
      const fw = (ent.k('KeyW') ? 1 : 0) - (ent.k('KeyS') ? 1 : 0) - ent.izq.y - ent.mIzq.y;
      const gi = (ent.k('KeyA') ? 1 : 0) - (ent.k('KeyD') ? 1 : 0) - ent.izq.x - ent.mIzq.x;
      this.cmd.av = Math.max(-1, Math.min(1, fw));
      this.cmd.gi = Math.max(-1, Math.min(1, gi));
      j.actualizar(dt, this.cmd);
      const r = ent.consumirRaton();
      const sens = 0.0024 * (c.opciones.sens || 1) * (c.camVar === 3 ? 0.4 : 1);
      const dYaw = -r.dx * sens + ((ent.k('ArrowLeft') ? 1 : 0) - (ent.k('ArrowRight') ? 1 : 0) - ent.der.x - ent.mDer.x) * 1.9 * dt;
      const dEl = -r.dy * sens * (c.opciones.invertido ? -1 : 1) + ((ent.k('ArrowUp') ? 1 : 0) - (ent.k('ArrowDown') ? 1 : 0) - ent.der.y - (c.opciones.invertido ? -ent.mDer.y : ent.mDer.y)) * 1.2 * dt;
      j.rotarTorreta(dYaw, dEl, dt);
      if (ent.k('PadX')) j.apuntarA(j.rumbo, 0.08, dt);
      if (ent.pulso('KeyT', 'PadB')) { j.alternarMunicion(); c.hud.aviso('MUNICIÓN: ' + (j.municion === 'AP' ? 'PERFORANTE' : 'EXPLOSIVA'), 1.2); }
      if (ent.k('Space', 'Mouse0', 'PadRT') && j.cdRecarga <= 0) this._dispararTanque();
      if (ent.k('KeyF', 'Mouse2', 'PadLT') && j.cdMg <= 0) { j.dirTorreta(DIR); j.ametrallar(DIR); }
    }
  }

  _avisosAvion() {
    const c = this.ctx, j = this.jug;
    const m = c.proyectiles.misilContra(j);
    if (m >= 0) { c.hud.aviso('¡MISIL! BENGALAS (G) Y ROMPE A UN LADO', 0.4, true); Sonido.alarma(); c.entrada.vibrar(0.1, 0.9, 140, 'alerta', 420); }
    else if (j.fuego) c.hud.aviso('¡INCENDIO! (R) EXTINTOR', 0.4, true);
    else if (j.perdida > 0.3) { c.hud.aviso('PÉRDIDA: BAJA EL MORRO', 0.4, true); Sonido.alarma(); }
    else if (j.cercaSuelo && j.pos.y < c.terreno.altura(j.pos.x, j.pos.z) + 40 && j.fwd.y < -0.1) { c.hud.aviso('¡ALTITUD!', 0.4, true); Sonido.alarma(); }
    else if (j.fuera) c.hud.aviso('REGRESA A LA ZONA DE COMBATE', 0.4, true);
  }

  _dispararTanque() {
    const { camera, terreno } = this.ctx;
    const j = this.jug;
    camera.getWorldDirection(DIR);
    ORG.copy(camera.position);
    let dist = 520;
    for (let d = 16; d < 520; d += 6) {
      PTO.copy(ORG).addScaledVector(DIR, d);
      if (PTO.y < terreno.altura(PTO.x, PTO.z) || terreno.colision(PTO.x, PTO.y, PTO.z)) { dist = d; break; }
    }
    for (const e of this.todas().concat(this.objetivos)) {
      if (!e.vivo || e === j || e.equipo === j.equipo) continue;
      OC.copy(e.centro).sub(ORG);
      const tca = OC.dot(DIR);
      if (tca <= 0) continue;
      const d2 = OC.lengthSq() - tca * tca;
      if (d2 < e.radio * e.radio) dist = Math.min(dist, tca - Math.sqrt(e.radio * e.radio - d2));
    }
    j.grupo.updateMatrixWorld(true);
    j.boca.getWorldPosition(BOC);
    PTO.copy(ORG).addScaledVector(DIR, dist);
    DIR.copy(PTO).sub(BOC);
    if (dist < 25 || DIR.lengthSq() < 1) j.dirTorreta(DIR);
    DIR.normalize();
    j.disparar(DIR);
  }

  _actualizarProxies(dt) {
    // clientes: solo el aspecto de los objetos que la red mueve (lo hace multi.js); los objetivos giran sus radares
    for (const o of this.objetivos) if (o.vivo && o.remoto && o.clase === 'radar' && o.cabeza) o.cabeza.rotation.y += dt;
  }

  _panelRespawn() {
    const c = this.ctx, p = c.hud.el.reaparecer;
    p.classList.remove('oculto');
    const s = Math.max(0, Math.ceil(this.muertoT));
    const txt = this.muertoT > 0 ? `REAPARECES EN ${s}` : 'ELIGE CÓMO VOLVER';
    if (p._t !== txt) { p._t = txt; p.firstChild.textContent = txt; }
    p.classList.toggle('combinado', !!this.cfg.combinado);
  }

  _camara(dt) {
    const c = this.ctx;
    if (this.unidad === 'avion') c.camaras.avion(this.jug, this.jug.def, dt || 1 / 60, false);
    else c.camaras.tanque(this.jug);
  }

  // ---------------------------------------------------------- HUD
  _hud(dt) {
    const c = this.ctx, j = this.jug, hud = c.hud;
    const me = this.miEquipo;
    const enem = [];
    let nE = 0;
    this.marcas.length = 0;
    this.radarLista.length = 0;
    const aire = j.tipo === 'aire';
    for (const e of this.todas()) {
      if (!e.vivo || e === j) continue;
      const aliado = !this.ffa && e.equipo === me;
      const clase = e.tipo === 'aire' ? 'aire' : 'tanque';
      if (!aliado) nE++;
      this.radarLista.push({ x: e.pos.x, z: e.pos.z, clase: e.tipo === 'aire' ? 'aire' : 'tanque', eq: aliado ? 'a' : 'e', color: e.remoto && !this.ffa && aliado ? e.colorNombre : undefined });
      if (aire && e.tipo !== 'aire' && !aliado && e.pos.distanceTo(j.pos) > 1400) continue;
      this.marcas.push({ pos: e.centro, clase, eq: aliado ? 'a' : 'e', nombre: aliado || e.remoto ? e.nombre : '', color: aliado || e.remoto ? e.colorNombre : undefined, apuntado: j.apuntado === e, fijado: j.bloqueado === e });
      enem.push(e);
    }
    for (const o of this.objetivos) {
      if (!o.vivo) continue;
      const aliado = o.equipo === me;
      if (!aliado) nE++;
      this.radarLista.push({ x: o.pos.x, z: o.pos.z, clase: 'tierra', eq: aliado ? 'a' : 'e' });
      this.marcas.push({ pos: o.centro, clase: 'tierra', eq: aliado ? 'a' : 'e', nombre: o.base ? 'BASE' : '', apuntado: j.apuntado === o, fijado: j.bloqueado === o });
    }
    const zonas = this.zonas.map((z) => ({ x: z.x, z: z.z, r: z.r, eq: z.dueno === 'n' ? 'n' : z.dueno === me ? 'a' : 'e' }));
    const datos = {
      puntaje: j.puntosM | 0, oleada: 0, enemigos: nE, vida: j.vida, vidaMax: j.vidaMax,
      etiquetas: ['B / M', 'ENEMIGOS'], textoOleada: `${j.kills || 0} / ${j.muertes || 0}`,
    };
    if (aire) {
      const D = j.def;
      datos.estado = `VEL ${Math.round(j.velocidad * 3.6)} km/h · ALT ${Math.round(j.pos.y)} m · ${j.esHeli ? 'VERT ' + Math.round(j.vy) + ' m/s' : 'EMPUJE ' + Math.round(j.empuje * 100) + '%'} · ${j.g.toFixed(1)} G${D.sec.n ? ' · ' + D.sec.nombre + ' ' + j.misiles : ''}${D.bombas ? ' · BOMBAS ' + j.bombas : ''} · BENGALAS ${j.bengalas}`;
      datos.modulos = [Math.max(j.mod.alaI, j.mod.alaD), j.mod.motor + (j.fuego ? 1 : 0), j.mod.piloto];
      datos.herido = j.mod.piloto;
    } else {
      datos.estado = `RUMBO ${Math.round((((-j.torretaYaw * 180 / Math.PI) % 360) + 360) % 360)}° · ${j.datos.auto ? 'CAÑÓN AUTOMÁTICO' : (j.municion === 'AP' ? 'PERFORANTE' : 'EXPLOSIVA') + ' · ' + (j.cdRecarga <= 0 ? 'LISTO' : 'RECARGANDO')}`;
      datos.recarga = j.recargaFrac;
      datos.modulos = [j.modulos.orugas, j.modulos.torreta, j.modulos.motor];
    }
    hud.datos(datos);
    hud.marcadoresEnemigos(c.camera, this.marcas, c.ancho, c.alto);
    if (aire) hud.indicadores(c.camera, c.ancho, c.alto, j.vivo && j.aimVisible && !c.camaras.especial ? j.aim : null, j.vivo ? j.lead : null);
    else hud.indicadores(c.camera, c.ancho, c.alto, null, null);
    if (aire) hud.instrumentos(j, j.def);
    const rumbo = aire ? Math.atan2(-j.fwd.x, -j.fwd.z) : j.torretaYaw;
    const rd = { alcance: aire ? 900 : 450, rumbo, x: j.pos.x, z: j.pos.z, mapa: c.terreno.minimapa, entidades: this.radarLista, zonas };
    hud.radar(dt, rd);
    hud.dibujarMapaGrande(rd);
    // marcador de tickets y tiempo
    if (this.ffa) hud.tickets({ a: j.kills || 0, e: this._maxKills(), tiempo: this._fmt(this.tiempoMax - this.t), nombreA: 'TUS BAJAS', nombreE: 'LÍDER', zonas: [] });
    else if (!this.mision && !this.practica) {
      const enA = this.miEquipo === 'jugador';
      hud.tickets({ a: Math.max(0, Math.round(enA ? this.tk.jugador : this.tk.enemigo)), e: Math.max(0, Math.round(enA ? this.tk.enemigo : this.tk.jugador)), tiempo: this._fmt(this.tiempoMax - this.t), zonas: zonas.map((z) => z.eq) });
    } else if (this.practica) { hud.tickets(null); hud.mision(`SIMULACRO · aciertos ${c.stats ? c.stats.aciertos : 0} · disparos ${c.stats ? c.stats.disparos : 0} · sin daño ni límite de munición`); }
    else hud.tickets(zonas.length ? { a: 0, e: 0, tiempo: this._fmt(this.tiempoMax - this.t), zonas: zonas.map((z) => z.eq), nombreA: '', nombreE: '' } : null);
    if (c.entrada.k('Tab', 'PadR3')) hud.tabla(this._tabla()); else hud.tabla(null);
    Musica.intensidad(j.vivo ? (nE > 0 && enem.some((e) => e.pos.distanceTo(j.pos) < 700) ? 0.85 : 0.4) : 0.1);
    if (aire) Sonido.motor.ajustar(j.vivo ? (j.esHeli ? 0.3 + Math.min(0.7, j.velocidad / 60) : j.empuje) : 0);
    else Sonido.motor.ajustar(j.vivo ? Math.min(1, Math.abs(j.v) / 12 + 0.15) : 0);
  }

  _maxKills() { return this.todas().reduce((m, e) => Math.max(m, e.kills || 0), 0); }

  _tabla() {
    const me = this.miEquipo;
    const fila = (e) => [e.nombre || '?', e.kills || 0, e.muertes || 0, Math.round(e.puntosM || 0), !e.vivo, e === this.jug];
    const todas = this.todas();
    if (this.ffa) return [{ titulo: 'TODOS CONTRA TODOS', color: '#fff', filas: todas.sort((a, b) => (b.kills || 0) - (a.kills || 0)).map(fila) }];
    const pal = this.ctx.paleta;
    const A = todas.filter((e) => e.equipo === me).sort((a, b) => b.puntosM - a.puntosM);
    const B = todas.filter((e) => e.equipo !== me).sort((a, b) => b.puntosM - a.puntosM);
    return [{ titulo: 'TU EQUIPO', color: pal.aliado, filas: A.map(fila) }, { titulo: 'ENEMIGOS', color: pal.enemigo, filas: B.map(fila) }];
  }

  // Lista ordenada para la pantalla final
  tablaFinal() { return this._tabla(); }

  destruir() {
    const c = this.ctx;
    if (this.net) this.net.detener();
    this.jug.quitar();
    for (const l of [this.aviones, this.tanques, this.objetivos]) for (const e of l) e.quitar();
    for (const g of this.luces || []) { c.escena.remove(g); g.geometry.dispose(); g.material.dispose(); }
    c.proyectiles.limpiar();
    c.proyectiles.blancos = () => [];
    c.proyectiles.alAcierto = null;
    c.efectos.limpiar();
    c.hud.indicadores(c.camera, c.ancho, c.alto, null, null);
    c.hud.limpiar();
    Sonido.motor.parar();
    c.camera.fov = CONFIG.vista.fov;
    c.camera.updateProjectionMatrix();
    c.camaras.reiniciar();
    c.jugador = null;
    document.body.classList.remove('cabina', 'mira');
  }
}
