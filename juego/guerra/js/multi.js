// =============================================================
//  MULTIJUGADOR (fase 2): conecta ModoBatalla con window.Red.
//  - Cada jugador simula su vehículo y difunde su estado (~20 Hz, canal rápido).
//  - El anfitrión controla bots, objetivos, zonas, tickets y fin; reparte snapshots (~10 Hz).
//  - El tirador difunde cada disparo (fiable, en lotes); el DUEÑO del blanco decide el impacto
//    porque los proyectiles se simulan en todas las máquinas y solo dañan lo que es propio.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { AVIONES } from './config.js';
import { AvionRemoto } from './avion.js';
import { Tanque } from './tanque.js';
import { ObjetivoTierra } from './objetivos.js';
import { Sonido } from './sonido.js';

const Red = () => window.Red;
const V = new THREE.Vector3(), Qt = new THREE.Quaternion();
const r2 = (n) => Math.round(n * 100) / 100;
const FRASES = ['¡Sígueme!', 'Cúbreme', 'Ataquen la base', 'Defiendan la zona', 'Bien hecho', 'Gracias', 'Necesito ayuda', 'Enemigo detrás'];
export { FRASES };

export class Multi {
  // cfg = { modo: 'ffa'|'equipos'|'coop'|'combinado', equipos: {id: eq}, vehiculos: {id: {u, v, col, mk}}, jugadores }
  constructor(ctx, cfg) {
    this.ctx = ctx;
    this.cfg = cfg;
    this.proxies = {}; // id de jugador -> entidad remota
    this.vistos = {}; // id de bot remoto -> {ent, t}
    this.interp = {}; // id entidad -> Interpolador
    this.tEst = 0;
    this.tBots = 0;
    this.tMeta = 0;
    this.colaTiros = [];
    this.tTiros = 0;
    this.cuotaTiros = {};
    this.ultimas = {};
    this.limpiar = [];
    this.activo = true;
  }

  get anfitrion() { return Red().esAnfitrion; }
  get miId() { return Red().miId; }
  get miEquipo() { return this.cfg.equipos[this.miId] || 'jugador'; }
  cuantos() { return Red().cuantos(); }

  humanosPorEquipo() {
    const h = { jugador: 0, enemigo: 0 };
    for (const id in this.cfg.equipos) if (h[this.cfg.equipos[id]] !== undefined) h[this.cfg.equipos[id]]++;
    return h;
  }

  iniciar(modo) {
    this.modo = modo;
    const c = this.ctx;
    c.proyectiles.alDisparo = (tipo, equipo, pos, dir, velBase, opc) => this._tiro(tipo, pos, dir, velBase, opc);
    c.proyectiles.alBengala = (ent, n) => { if (this._esMio(ent)) Red().difundir('beng', { i: ent.id, n }); };
    this.desuscribir = [
      Red().on('mensaje', (t, d, de) => this._mensaje(t, d, de)),
      Red().on('jugadorSalio', (id, j) => this._salio(id, j)),
    ];
    // jugadores remotos
    for (const j of Red().lista()) if (j.id !== this.miId) this._crearProxyJugador(j.id);
    if (this.cfg.modo === 'ffa') modo.jug.equipo = 'jugador';
    Red().difundir('aparece', this._miVehiculo());
  }

  detener() {
    this.activo = false;
    for (const f of this.desuscribir || []) f();
    const c = this.ctx;
    c.proyectiles.alDisparo = null;
    c.proyectiles.alBengala = null;
  }

  _miVehiculo() {
    const m = this.modo, j = m.jug;
    return { u: m.unidad, v: m.unidad === 'avion' ? j.def.id : j.clase, col: m.unidad === 'avion' ? j.def.colores : [j.grupo.userData.color || 0], mk: j.def ? j.def.marca : '' };
  }

  _esMio(e) { return e && (e === this.modo.jug || (this.anfitrion && e.esBot && !e.remoto)); }

  // ---------------------------------------------------------- Jugadores remotos
  _equipoRemoto(id) {
    if (this.cfg.modo === 'ffa') return 'ffa_p' + id;
    return this.cfg.equipos[id] || 'enemigo';
  }

  _crearProxyJugador(id, veh) {
    const m = this.modo, c = this.ctx;
    const info = Red().jugadores[id] || { nombre: 'Jugador', color: '#fff' };
    veh = veh || this.cfg.vehiculos[id] || { u: 'avion', v: 'halcon' };
    const antes = this.proxies[id];
    if (antes) { antes.quitar(); this._quitarDeListas(antes); }
    let e;
    const eq = this._equipoRemoto(id);
    if (veh.u === 'tanque') {
      e = new Tanque(c, veh.v in AVIONES ? 'jugador' : veh.v, 1, { equipo: eq, color: veh.col && veh.col[0] ? veh.col[0] : undefined, nombre: info.nombre });
      m.tanques.push(e);
    } else {
      const base = AVIONES[veh.v] || AVIONES.halcon;
      e = new AvionRemoto(c, { ...base, colores: veh.col && veh.col.length === 2 ? veh.col : base.colores, marca: veh.mk }, eq);
      m.aviones.push(e);
    }
    e.remoto = true;
    e.id = 'p' + id;
    e.idJ = id;
    e.nombre = info.nombre;
    e.colorNombre = info.color;
    e.kills = antes ? antes.kills : 0;
    e.muertes = antes ? antes.muertes : 0;
    e.puntosM = antes ? antes.puntosM : 0;
    e.vivo = true;
    this.proxies[id] = e;
    this.interp[e.id] = new (Red().Interpolador)({ retardo: 110, angulos: ['ry', 'ty'] });
    return e;
  }

  _quitarDeListas(e) {
    for (const l of [this.modo.aviones, this.modo.tanques, this.modo.objetivos]) { const i = l.indexOf(e); if (i >= 0) l.splice(i, 1); }
  }

  _salio(id) {
    const e = this.proxies[id];
    if (!e) return;
    this.ctx.hud.kill(e.nombre, 'salió de la partida', e.colorNombre, '#aaa', '⏏');
    e.quitar();
    this._quitarDeListas(e);
    delete this.proxies[id];
    delete this.interp[e.id];
    if (this.modo.net && this.modo.autoridad) this._comprobarCoop();
  }

  // ---------------------------------------------------------- Envío
  tick(dt) {
    if (!this.activo) return;
    const m = this.modo, now = Red().reloj();
    this.tEst += dt;
    if (this.tEst >= 0.05) {
      this.tEst = 0;
      Red().difundir('est', this._estadoPropio(now), { fiable: false });
    }
    if (this.colaTiros.length) {
      this.tTiros += dt;
      if (this.tTiros >= 0.06) { this.tTiros = 0; this._volcarTiros(); }
    }
    if (this.anfitrion) {
      this.tBots += dt;
      if (this.tBots >= 0.1) { this.tBots = 0; this._enviarBots(now); }
      this.tMeta += dt;
      if (this.tMeta >= 0.5) { this.tMeta = 0; this._enviarMeta(); }
    } else this._limpiarBotsViejos(dt);
    this._moverProxies(dt);
    void m;
  }

  _estadoPropio(t) {
    const j = this.modo.jug;
    if (this.modo.unidad === 'avion') {
      const q = j.q, p = j.pos, v = j.vel;
      return { t, u: 'a', v: j.vivo ? 1 : 0, p: [r2(p.x), r2(p.y), r2(p.z), r2(q.x * 1000) / 1000, r2(q.y * 1000) / 1000, r2(q.z * 1000) / 1000, r2(q.w * 1000) / 1000, r2(v.x), r2(v.y), r2(v.z)], h: Math.round(j.vida), m: [r2(j.mod.alaI), r2(j.mod.alaD), r2(j.mod.motor), r2(j.mod.piloto)], f: j.fuego ? 1 : 0, e: r2(j.empuje) };
    }
    return { t, u: 't', v: j.vivo ? 1 : 0, p: { x: r2(j.pos.x), y: r2(j.pos.y), z: r2(j.pos.z), ry: r2(j.rumbo * 100) / 100, ty: r2(j.torretaYaw * 100) / 100, el: r2(j.elev * 100) / 100, vx: r2(j.vel.x), vz: r2(j.vel.z) }, h: Math.round(j.vida), m: [r2(j.modulos.orugas), r2(j.modulos.torreta), r2(j.modulos.motor)] };
  }

  _enviarBots(t) {
    const m = this.modo, arr = [];
    const sq = (n) => Math.round(n * 1000) / 1000;
    for (const e of m.aviones) {
      if (e.remoto || !e.vivo) continue;
      const q = e.q;
      arr.push({ i: e.id, k: 'a|' + (e.def ? e.def.id : 'halcon') + '|' + (e.def ? e.def.colores.join(',') : ''), e: e.equipo, n: e.nombre, p: [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), sq(q.x), sq(q.y), sq(q.z), sq(q.w), r2(e.vel.x), r2(e.vel.y), r2(e.vel.z)], h: Math.round(e.vida), hm: e.vidaMax });
    }
    for (const e of m.tanques) {
      if (e.remoto || !e.vivo) continue;
      arr.push({ i: e.id, k: 't|' + e.clase + '|' + (e.grupo.userData.col || ''), e: e.equipo, n: e.nombre, p: { x: r2(e.pos.x), y: r2(e.pos.y), z: r2(e.pos.z), ry: r2(e.rumbo * 100) / 100, ty: r2(e.torretaYaw * 100) / 100, el: r2(e.elev * 100) / 100, vx: r2(e.vel.x), vz: r2(e.vel.z) }, h: Math.round(e.vida), hm: e.vidaMax });
    }
    for (const e of m.objetivos) {
      if (e.remoto || !e.vivo) continue;
      arr.push({ i: e.id, k: 'o|' + e.clase, e: e.equipo, n: e.nombre, p: { x: r2(e.pos.x), y: r2(e.pos.y), z: r2(e.pos.z) }, h: Math.round(e.vida), hm: e.vidaMax, b: e.base ? 1 : 0 });
    }
    // lotes de menos de 15 KB
    let lote = [], tam = 0;
    const volcar = () => { if (lote.length) Red().difundir('bots', { t, l: lote }, { fiable: false }); lote = []; tam = 0; };
    for (const x of arr) {
      const l = JSON.stringify(x).length;
      if (tam + l > 14000) volcar();
      lote.push(x); tam += l;
    }
    volcar();
  }

  _enviarMeta() {
    const m = this.modo;
    const pl = {};
    for (const e of m.todas()) if (e.id) pl[e.id] = [e.kills || 0, e.muertes || 0, Math.round(e.puntosM || 0)];
    const meta = { tj: Math.round(m.tk.jugador * 10) / 10, te: Math.round(m.tk.enemigo * 10) / 10, t: Math.round(m.t), z: m.zonas.map((z) => [z.dueno, Math.round(z.prog * 100) / 100]), pl, ms: m.mState ? { m: m.mState.mantener, req: m.mState.requeridos } : null };
    Red().difundir('meta', meta, { fiable: false });
  }

  _tiro(tipo, pos, dir, velBase, opc) {
    if (opc.red || !this.activo) return;
    const d = opc.dueno;
    if (!this._esMio(d)) return;
    this.colaTiros.push([d.id, tipo, r2(pos.x), r2(pos.y), r2(pos.z), r2(dir.x * 1000) / 1000, r2(dir.y * 1000) / 1000, r2(dir.z * 1000) / 1000, velBase ? r2(velBase.x) : 0, velBase ? r2(velBase.y) : 0, velBase ? r2(velBase.z) : 0, opc.vel || 0, opc.vida || 0, opc.dano ? r2(opc.dano) : 0, opc.giro || 0, opc.objetivo ? opc.objetivo.id || '' : '']);
    if (this.colaTiros.length > 40) this._volcarTiros();
  }

  _volcarTiros() {
    if (!this.colaTiros.length) return;
    Red().difundir('tiros', this.colaTiros);
    this.colaTiros = [];
  }

  muerte(e, killer) {
    if (!this._esMio(e)) return;
    Red().difundir('muerte', { i: e.id, por: killer ? killer.id : '' });
    if (e === this.modo.jug && this.modo.cfg.coop) this._comprobarCoop();
  }

  _comprobarCoop() {
    if (!this.modo.cfg.coop) return;
    this.modo.coopRevisar = 1.5;
  }

  reaparecio() { Red().difundir('aparece', this._miVehiculo()); }
  zona() { /* el estado de las zonas viaja en 'meta' */ }
  fin(victoria, equipoGana) {
    if (!this.anfitrion) return;
    const m = this.modo;
    const top = m.ffa ? (m.ganador ? m.ganador.id : '') : '';
    Red().difundir('fin', { eq: equipoGana || '', top });
  }

  // ---------------------------------------------------------- Recepción
  _mensaje(t, d, de) {
    if (!this.activo) return;
    const m = this.modo;
    if (t === 'est') {
      const e = this.proxies[de];
      if (!e) return;
      // anti-trampas básico: velocidad imposible = se ignora el salto
      const ant = this.ultimas[de];
      const px = Array.isArray(d.p) ? d.p[0] : d.p.x, pz = Array.isArray(d.p) ? d.p[2] : d.p.z;
      if (ant && this.anfitrion) {
        const dt = Math.max(0.02, (d.t - ant.t) / 1000);
        if (Math.hypot(px - ant.x, pz - ant.z) / dt > 700 && dt < 1.5) return;
      }
      this.ultimas[de] = { t: d.t, x: px, z: pz };
      e.ultimoEst = d;
      this.interp[e.id].agregar(d.t, d.u === 'a' ? { p: d.p } : { p: d.p });
      if (d.h !== undefined) e.vida = d.h;
      if (d.m) e.modsRem = d.m;
      e.fuego = d.f || 0;
      e.empujeRem = d.e;
    } else if (t === 'bots' && !this.anfitrion) {
      for (const b of d.l) this._aplicarBot(b, d.t);
    } else if (t === 'tiros') {
      let n = 0;
      for (const s of d) {
        if (de !== 0 && this.anfitrion) { // cadencia máxima por cliente
          const q = this.cuotaTiros[de] || (this.cuotaTiros[de] = { t: 0, n: 0 });
          const ahora = performance.now();
          if (ahora - q.t > 1000) { q.t = ahora; q.n = 0; }
          if (++q.n > 90) continue;
        }
        this._crearTiro(s);
        if (++n > 60) break;
      }
    } else if (t === 'beng') {
      const e = m._buscar(d.i);
      if (e && e.remoto !== undefined) this.ctx.proyectiles.bengala(e, d.n);
    } else if (t === 'muerte') {
      const e = m._buscar(d.i);
      if (!e || e === m.jug) return;
      if (e.vivo) {
        e.ultimo = m._buscar(d.por);
        if (e.clase && e.tipo === 'tierra') e.recibirDanio(1e6, e.centro, null); else e.morir();
      }
      m.muerteRemota(d.i, d.por);
    } else if (t === 'aparece') {
      if (de === Red().miId) return;
      this.cfg.vehiculos[de] = d;
      const e = this._crearProxyJugador(de, d);
      e.ultimaVida = 1;
    } else if (t === 'meta' && !this.anfitrion) {
      m.tk.jugador = d.tj; m.tk.enemigo = d.te;
      if (!m.cuentaFijada || Math.abs(m.t - d.t) > 3) m.t = d.t;
      d.z.forEach((z, i) => { if (m.zonas[i]) { m.zonas[i].dueno = z[0]; m.zonas[i].prog = z[1]; } });
      for (const id in d.pl) { const e = m._buscar(id); if (e && e !== m.jug) { e.kills = d.pl[id][0]; e.muertes = d.pl[id][1]; e.puntosM = d.pl[id][2]; } else if (e === m.jug) { e.kills = Math.max(e.kills, d.pl[id][0]); } }
      if (d.ms) { m.mState = m.mState || {}; m.mState.mantener = d.ms.m; }
    } else if (t === 'fin' && !this.anfitrion) {
      const gana = m.ffa ? d.top === m.jug.id : d.eq === m.miEquipo;
      m.ganador = m._buscar(d.top);
      m._fin(gana, m.ganador, d.eq);
    }
  }

  _crearTiro(s) {
    const m = this.modo, c = this.ctx;
    const dueno = m._buscar(s[0]);
    if (!dueno || dueno === m.jug) return;
    PIEZA_POS.set(s[2], s[3], s[4]);
    PIEZA_DIR.set(s[5], s[6], s[7]);
    PIEZA_VEL.set(s[8], s[9], s[10]);
    const opc = { red: true, dueno };
    if (s[11]) opc.vel = s[11];
    if (s[12]) opc.vida = s[12];
    if (s[13]) opc.dano = s[13];
    if (s[14]) opc.giro = s[14];
    if (s[15]) opc.objetivo = m._buscar(s[15]);
    c.proyectiles.disparar(s[1], dueno.equipo, PIEZA_POS, PIEZA_DIR, PIEZA_VEL, opc);
  }

  _aplicarBot(b, t) {
    const m = this.modo, c = this.ctx;
    let e = m._buscar(b.i);
    if (!e) {
      const [tipo, id, col] = b.k.split('|');
      if (tipo === 'a') {
        const base = AVIONES[id] || AVIONES.halcon;
        const cl = col ? col.split(',').map(Number) : base.colores;
        e = new AvionRemoto(c, { ...base, colores: cl }, b.e);
        m.aviones.push(e);
      } else if (tipo === 't') {
        e = new Tanque(c, id, 1, { equipo: b.e, color: col ? Number(col) : undefined });
        m.tanques.push(e);
      } else {
        e = new ObjetivoTierra(c, id, b.p.x, b.p.z, 2, b.e);
        e.alMorir = null;
        m.objetivos.push(e);
      }
      e.remoto = true; e.esBot = true; e.id = b.i; e.nombre = b.n || ''; e.vidaMax = b.hm || e.vidaMax;
      e.kills = 0; e.muertes = 0; e.puntosM = 0;
      if (b.b) { e.base = true; }
      this.interp[e.id] = new (Red().Interpolador)({ retardo: 130, angulos: ['ry', 'ty'] });
      this.vistos[e.id] = { e, t: 0 };
    }
    if (!e.vivo) return;
    this.vistos[e.id].t = 0;
    e.vida = b.h;
    this.interp[e.id].agregar(t, { p: b.p });
  }

  _limpiarBotsViejos(dt) {
    for (const id in this.vistos) {
      const o = this.vistos[id];
      o.t += dt;
      if (o.t > (o.e.vivo ? 3 : 6)) {
        o.e.quitar();
        this._quitarDeListas(o.e);
        delete this.vistos[id];
        delete this.interp[id];
      }
    }
  }

  // Coloca cada entidad remota en su posición interpolada
  _moverProxies(dt) {
    const m = this.modo;
    const todos = m.aviones.concat(m.tanques, m.objetivos);
    for (const e of todos) {
      if (!e.remoto || !e.vivo) continue;
      const it = this.interp[e.id];
      const s = it ? it.obtener() : null;
      if (!s) continue;
      const p = s.p;
      if (e.tipo === 'aire') {
        e.pos.set(p[0], p[1], p[2]);
        Qt.set(p[3], p[4], p[5], p[6]).normalize();
        e.q.slerp(Qt, 0.55);
        e.vel.set(p[7], p[8], p[9]);
        e.fwd.set(0, 0, -1).applyQuaternion(e.q);
        e.velocidad = e.vel.length();
        const ud = e.grupo.userData;
        if (ud.helice) ud.helice.rotation.z += 40 * dt;
        if (ud.helices) for (const h of ud.helices) h.rotation.z += 40 * dt;
        if (ud.rotor) ud.rotor.rotation.y += 60 * dt;
        if (ud.llama && ud.llama.scale) ud.llama.scale.set(1, 1, 0.5 + (e.empujeRem == null ? 0.7 : e.empujeRem) * 1.2);
        if (e.modsRem) { e.mod.alaI = e.modsRem[0]; e.mod.alaD = e.modsRem[1]; e.mod.motor = e.modsRem[2]; e.mod.piloto = e.modsRem[3] || 0; }
        e._humoDanio(dt);
      } else if (e.tipo === 'tanque') {
        e.pos.set(p.x, p.y, p.z);
        e.rumbo = p.ry; e.torretaYaw = p.ty; e.elev = p.el;
        e.vel.set(p.vx || 0, 0, p.vz || 0);
        e.v = Math.hypot(e.vel.x, e.vel.z);
        e._aspecto(dt);
        if (e.modsRem) { e.modulos.orugas = e.modsRem[0]; e.modulos.torreta = e.modsRem[1]; e.modulos.motor = e.modsRem[2]; }
        e._humo(dt);
      } else if (e.tipo === 'tierra') {
        e.vida = Math.max(1, e.vida);
        if (e.clase === 'radar' && e.cabeza) e.cabeza.rotation.y += dt;
      }
    }
  }

  // ---------------------------------------------------------- Chat rápido
  chat(texto) { Red().chat(texto); }
}

const PIEZA_POS = new THREE.Vector3(), PIEZA_DIR = new THREE.Vector3(), PIEZA_VEL = new THREE.Vector3();
void V; void Sonido;
