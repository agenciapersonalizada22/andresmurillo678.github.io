// =============================================================
//  PROYECTILES: balas, misiles, cohetes, bombas de tres calibres, obuses
//  (perforante y explosivo), fuego antiaéreo y bengalas contra misiles.
//  Cada tipo tiene un grupo fijo de objetos que se reciclan.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { mat, geoTrazadora, geoMisil, geoCohete, geoBomba, geoObus, geoFlak } from './modelos.js';
import { Sonido } from './sonido.js';

const TIPOS = {
  bala: { n: 300, vel: 650, vida: 1.1, dano: 8, splash: 0, grav: 0 },
  misil: { n: 24, vel: 340, vida: 7, dano: 70, splash: 24, grav: 0, giro: 2.6, acel: 220 },
  cohete: { n: 60, vel: 380, vida: 3.4, dano: 44, splash: 15, grav: 2.5 },
  bomba: { n: 24, vel: 0, vida: 25, dano: 160, splash: 48, grav: 24, esc: 1 },
  bombaL: { n: 20, vel: 0, vida: 25, dano: 90, splash: 32, grav: 24, esc: 0.7, geo: 'bomba' },
  bombaP: { n: 10, vel: 0, vida: 25, dano: 300, splash: 70, grav: 24, esc: 1.5, geo: 'bomba' },
  obus: { n: 30, vel: 320, vida: 3.2, dano: 40, splash: 6, grav: 3 },
  obusHE: { n: 20, vel: 300, vida: 3.2, dano: 30, splash: 18, grav: 3, geo: 'obus' },
  flak: { n: 36, vel: 300, vida: 3.2, dano: 14, splash: 12, grav: 0, prox: 14 },
};

const A = new THREE.Vector3(), B = new THREE.Vector3(), PREV = new THREE.Vector3(), HIT = new THREE.Vector3();
const EJE = new THREE.Vector3();

function geometria(tipo) {
  const g = TIPOS[tipo].geo || tipo;
  if (g === 'bala') return geoTrazadora();
  if (g === 'misil') return geoMisil();
  if (g === 'cohete') return geoCohete();
  if (g === 'bomba') return geoBomba();
  if (g === 'obus') return geoObus();
  return geoFlak();
}

function material(tipo, equipo) {
  const aliado = equipo === 'jugador';
  const g = TIPOS[tipo].geo || tipo;
  if (g === 'bala') return mat(aliado ? 0xffe066 : 0xff5a4a, { basico: true, aditivo: true });
  if (g === 'misil') return mat(0xdedede);
  if (g === 'cohete') return mat(0xc9c2b0);
  if (g === 'bomba') return mat(tipo === 'bombaP' ? 0x30352a : 0x4a5238);
  if (g === 'obus') return mat(aliado ? 0xffd34d : 0xff7a4a, { basico: true, aditivo: true });
  return mat(0xff6a30, { basico: true, aditivo: true });
}

// Punto del segmento a-b más cercano al centro c, si queda dentro del radio
function tocaEsfera(a, b, c, radio) {
  A.subVectors(b, a);
  const l2 = A.lengthSq();
  const t = l2 > 0 ? Math.max(0, Math.min(1, B.subVectors(c, a).dot(A) / l2)) : 0;
  HIT.copy(a).addScaledVector(A, t);
  return HIT.distanceToSquared(c) <= radio * radio;
}

const GEO_BENGALA = new THREE.SphereGeometry(0.9, 6, 4);

export class Proyectiles {
  constructor(escena, terreno, efectos) {
    this.terreno = terreno;
    this.efectos = efectos;
    this.blancos = () => [];
    this.alAcierto = null; // (entidad, dano, proyectil) para el indicador de impacto
    this.alEngano = null; // (dueño de la bengala)
    this.alDisparo = null; // red: (tipo, equipo, pos, dir, velBase, opc)
    this.alBengala = null;
    this.pools = {};
    for (const [tipo, T] of Object.entries(TIPOS)) {
      const lista = [];
      for (let i = 0; i < T.n; i++) {
        const mesh = new THREE.Mesh(geometria(tipo), material(tipo, 'jugador'));
        mesh.visible = false;
        if (T.esc) mesh.scale.setScalar(T.esc);
        escena.add(mesh);
        lista.push({ activo: false, mesh, pos: mesh.position, vel: new THREE.Vector3(), vida: 0, tipo, equipo: '', dano: 0, objetivo: null, giro: 0, dueno: null });
      }
      this.pools[tipo] = lista;
    }
    // bengalas: señuelos térmicos que atraen misiles
    this.bengalas = [];
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(GEO_BENGALA, mat(0xfff0b0, { basico: true, aditivo: true }));
      mesh.visible = false;
      escena.add(mesh);
      this.bengalas.push({ vivo: false, mesh, pos: mesh.position, centro: mesh.position, vel: new THREE.Vector3(), vida: 0, equipo: '', dueno: null, radio: 2, tipo: 'bengala' });
    }
    this.sig = 0;
  }

  disparar(tipo, equipo, pos, dir, velBase = null, opc = {}) {
    const T = TIPOS[tipo];
    const lista = this.pools[tipo];
    let p = lista.find((q) => !q.activo);
    if (!p) { p = lista[0]; this._fin(p); lista.push(lista.shift()); } // sin hueco: se recicla el más antiguo
    p.activo = true;
    p.pos.copy(pos);
    p.vel.copy(dir).multiplyScalar(opc.vel || T.vel);
    if (velBase) p.vel.add(velBase);
    p.vida = opc.vida || T.vida;
    p.equipo = equipo;
    p.dano = opc.dano || T.dano;
    p.objetivo = opc.objetivo || null;
    p.giro = opc.giro || T.giro || 0;
    p.dueno = opc.dueno || null;
    p.mesh.material = material(tipo, equipo);
    p.mesh.visible = true;
    p.mesh.lookAt(A.copy(pos).add(p.vel));
    if (this.alDisparo && !opc.red) this.alDisparo(tipo, equipo, pos, dir, velBase, opc);
    return p;
  }

  // Suelta n bengalas por detrás de la entidad
  bengala(ent, n = 2) {
    if (this.alBengala && !ent.remoto) this.alBengala(ent, n);
    for (let i = 0; i < n; i++) {
      const f = this.bengalas[this.sig];
      this.sig = (this.sig + 1) % this.bengalas.length;
      f.vivo = true;
      f.vida = 5 + Math.random() * 1.5;
      f.equipo = ent.equipo;
      f.dueno = ent;
      f.pos.copy(ent.pos);
      f.pos.y -= 1.5;
      f.vel.copy(ent.vel).multiplyScalar(0.35);
      f.vel.x += (Math.random() - 0.5) * 24;
      f.vel.y += -4 - Math.random() * 6;
      f.vel.z += (Math.random() - 0.5) * 24;
      f.mesh.visible = true;
    }
  }

  // Distancia al misil enemigo más cercano que persigue a esta entidad (o -1)
  misilContra(ent) {
    let d = -1;
    for (const p of this.pools.misil) {
      if (p.activo && p.objetivo === ent) {
        const x = p.pos.distanceTo(ent.pos);
        if (d < 0 || x < d) d = x;
      }
    }
    return d;
  }

  // Último proyectil activo del dueño (para la cámara de misil/bomba)
  ultimoDe(dueno, tipos = ['misil', 'cohete', 'bomba', 'bombaL', 'bombaP']) {
    let mejor = null;
    for (const t of tipos) for (const p of this.pools[t]) if (p.activo && p.dueno === dueno && (!mejor || p.vida > mejor.vida)) mejor = p;
    return mejor;
  }

  _fin(p) {
    p.activo = false;
    p.mesh.visible = false;
    p.objetivo = null;
    p.dueno = null;
  }

  limpiar() {
    for (const lista of Object.values(this.pools)) for (const p of lista) this._fin(p);
    for (const f of this.bengalas) { f.vivo = false; f.mesh.visible = false; }
  }

  actualizar(dt) {
    const blancos = this.blancos();
    for (const f of this.bengalas) {
      if (!f.vivo) continue;
      f.vida -= dt;
      f.vel.y -= 5 * dt;
      f.pos.addScaledVector(f.vel, dt);
      if (Math.random() < 0.7) this.efectos.llama(f.pos, 0.7);
      if (Math.random() < 0.4) this.efectos.estela(f.pos, true, 0.5);
      if (f.vida <= 0) { f.vivo = false; f.mesh.visible = false; }
    }
    for (const tipo in this.pools) {
      const T = TIPOS[tipo];
      for (const p of this.pools[tipo]) {
        if (!p.activo) continue;
        p.vida -= dt;
        if (p.vida <= 0) { if (T.splash > 12) this._impacto(p, p.pos, null, blancos); else this._fin(p); continue; }
        PREV.copy(p.pos);
        this._guiar(p, T, dt);
        p.vel.y -= T.grav * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.mesh.lookAt(A.copy(p.pos).add(p.vel));
        if (tipo === 'misil' || tipo === 'cohete') {
          this.efectos.estela(p.pos, true, tipo === 'misil' ? 1 : 0.6);
          this.efectos.llama(p.pos, 0.4);
        } else if (p.tipo.startsWith('bomba') && Math.random() < 0.2) {
          this.efectos.estela(p.pos, false, 0.6);
        }
        // misil engañado por una bengala: explota en ella
        if (p.objetivo && p.objetivo.tipo === 'bengala' && p.objetivo.centro.distanceTo(p.pos) < 9) {
          if (this.alEngano && p.objetivo.dueno) this.alEngano(p.objetivo.dueno);
          this.efectos.explosion(p.pos, 0.6);
          this._fin(p);
          continue;
        }
        let golpeo = false;
        for (const e of blancos) {
          if (!e.vivo || e.equipo === p.equipo) continue;
          if (T.prox && e.centro.distanceTo(p.pos) < T.prox) { this._impacto(p, p.pos, null, blancos); golpeo = true; break; }
          if (tocaEsfera(PREV, p.pos, e.centro, e.radio)) { this._impacto(p, HIT, e, blancos); golpeo = true; break; }
        }
        if (golpeo) continue;
        const x = p.pos.x, y = p.pos.y, z = p.pos.z;
        const h = this.terreno.altura(x, z);
        if (y < Math.max(h, 0) || this.terreno.colision(x, y, z)) {
          B.set(x, Math.max(h, 0), z);
          if (h < 0) this.efectos.salpicadura(B, tipo === 'bala' ? 0.5 : 1.5);
          else if (T.splash === 0) this.efectos.polvo(B, 0.5);
          this._impacto(p, B, null, blancos, h < 0);
        }
      }
    }
  }

  _guiar(p, T, dt) {
    if (!T.giro) return;
    let obj = p.objetivo;
    let vel = p.vel.length();
    // una bengala cercana y delante puede robarle el misil al blanco
    if (obj && obj.vivo && obj.tipo !== 'bengala') {
      B.copy(p.vel).normalize();
      for (const f of this.bengalas) {
        if (!f.vivo || f.equipo !== obj.equipo) continue;
        A.copy(f.pos).sub(p.pos);
        const d = A.length();
        if (d < 420 && d > 3 && A.divideScalar(d).dot(B) > 0.6 && Math.random() < dt * 1.7) { p.objetivo = obj = f; break; }
      }
    }
    if (!(obj && obj.vivo)) { p.objetivo = null; obj = null; }
    if (obj) {
      A.copy(obj.centro).sub(p.pos).normalize();
      B.copy(p.vel).normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, A.dot(B))));
      if (ang > 1e-4) {
        EJE.crossVectors(B, A).normalize();
        B.applyAxisAngle(EJE, Math.min(ang, p.giro * dt));
      }
      vel = Math.min(vel + T.acel * dt, p.equipo === 'jugador' ? T.vel + 80 : 250);
      p.vel.copy(B).multiplyScalar(vel);
    } else {
      vel = Math.min(vel + T.acel * dt, T.vel);
      p.vel.setLength(vel);
    }
  }

  _impacto(p, punto, entidad, blancos, agua = false) {
    const T = TIPOS[p.tipo];
    const x = punto.x, y = punto.y, z = punto.z;
    if (entidad) {
      A.copy(p.vel);
      if (!entidad.remoto) entidad.recibirDanio(p.dano, punto, p);
      if (this.alAcierto && p.dueno) this.alAcierto(entidad, p.dano, p);
    }
    if (T.splash > 0) {
      const c = B.set(x, y, z);
      for (const e of blancos) {
        if (!e.vivo || e.equipo === p.equipo || e === entidad || e.remoto) continue;
        const d = e.centro.distanceTo(c);
        if (d < T.splash + e.radio) {
          const dm = p.dano * (1 - d / (T.splash + e.radio)) * 0.85;
          e.recibirDanio(dm, c, p);
          if (this.alAcierto && p.dueno) this.alAcierto(e, dm, p);
        }
      }
      if (!agua) this.efectos.explosion(c, T.splash / 16);
    } else if (!agua) {
      this.efectos.chispa(punto);
      if (entidad) Sonido.impacto(Sonido.porDistancia(this.efectos._distancia(punto)) * 0.7);
    }
    this._fin(p);
  }
}
