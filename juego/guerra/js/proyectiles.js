// =============================================================
//  PROYECTILES: balas, misiles, bombas, obuses y fuego antiaéreo.
//  Cada tipo tiene un grupo fijo de objetos que se reciclan.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { mat, geoTrazadora, geoMisil, geoCohete, geoBomba, geoObus, geoFlak } from './modelos.js';
import { Sonido } from './sonido.js';

const TIPOS = {
  bala: { n: 160, vel: 650, vida: 1.1, dano: 8, splash: 0, grav: 0 },
  misil: { n: 14, vel: 340, vida: 7, dano: 70, splash: 24, grav: 0, giro: 2.6, acel: 220 },
  cohete: { n: 40, vel: 380, vida: 3.4, dano: 44, splash: 15, grav: 2.5 },
  bomba: { n: 18, vel: 0, vida: 25, dano: 160, splash: 48, grav: 24 },
  obus: { n: 24, vel: 320, vida: 3.2, dano: 40, splash: 6, grav: 3 },
  flak: { n: 36, vel: 300, vida: 3.2, dano: 14, splash: 12, grav: 0, prox: 14 },
};

const A = new THREE.Vector3(), B = new THREE.Vector3(), PREV = new THREE.Vector3(), HIT = new THREE.Vector3();
const EJE = new THREE.Vector3();

function geometria(tipo) {
  if (tipo === 'bala') return geoTrazadora();
  if (tipo === 'misil') return geoMisil();
  if (tipo === 'cohete') return geoCohete();
  if (tipo === 'bomba') return geoBomba();
  if (tipo === 'obus') return geoObus();
  return geoFlak();
}

function material(tipo, equipo) {
  if (tipo === 'bala') return mat(equipo === 'jugador' ? 0xffe066 : 0xff5a4a, { basico: true, aditivo: true });
  if (tipo === 'misil') return mat(0xdedede);
  if (tipo === 'cohete') return mat(0xc9c2b0);
  if (tipo === 'bomba') return mat(0x4a5238);
  if (tipo === 'obus') return mat(equipo === 'jugador' ? 0xffd34d : 0xff7a4a, { basico: true, aditivo: true });
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

export class Proyectiles {
  constructor(escena, terreno, efectos) {
    this.terreno = terreno;
    this.efectos = efectos;
    this.blancos = () => [];
    this.pools = {};
    for (const [tipo, T] of Object.entries(TIPOS)) {
      const lista = [];
      for (let i = 0; i < T.n; i++) {
        const mesh = new THREE.Mesh(geometria(tipo), material(tipo, 'jugador'));
        mesh.visible = false;
        escena.add(mesh);
        lista.push({ activo: false, mesh, pos: mesh.position, vel: new THREE.Vector3(), vida: 0, tipo, equipo: '', dano: 0, objetivo: null, giro: 0 });
      }
      this.pools[tipo] = lista;
    }
  }

  disparar(tipo, equipo, pos, dir, velBase = null, opc = {}) {
    const T = TIPOS[tipo];
    const lista = this.pools[tipo];
    let p = lista.find((q) => !q.activo);
    if (!p) { p = lista[0]; this._fin(p); } // sin hueco: se recicla el primero
    p.activo = true;
    p.pos.copy(pos);
    p.vel.copy(dir).multiplyScalar(opc.vel || T.vel);
    if (velBase) p.vel.add(velBase);
    p.vida = opc.vida || T.vida;
    p.equipo = equipo;
    p.dano = opc.dano || T.dano;
    p.objetivo = opc.objetivo || null;
    p.giro = opc.giro || T.giro || 0;
    p.mesh.material = material(tipo, equipo);
    p.mesh.visible = true;
    p.mesh.lookAt(A.copy(pos).add(p.vel));
    return p;
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

  _fin(p) {
    p.activo = false;
    p.mesh.visible = false;
    p.objetivo = null;
  }

  limpiar() {
    for (const lista of Object.values(this.pools)) for (const p of lista) this._fin(p);
  }

  actualizar(dt) {
    const blancos = this.blancos();
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
        } else if (tipo === 'bomba' && Math.random() < 0.2) {
          this.efectos.estela(p.pos, false, 0.6);
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
    const obj = p.objetivo;
    let vel = p.vel.length();
    if (obj && obj.vivo) {
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
      p.objetivo = null;
      vel = Math.min(vel + T.acel * dt, T.vel);
      p.vel.setLength(vel);
    }
  }

  _impacto(p, punto, entidad, blancos, agua = false) {
    const T = TIPOS[p.tipo];
    const x = punto.x, y = punto.y, z = punto.z;
    if (entidad) {
      A.copy(p.vel);
      entidad.recibirDanio(p.dano, punto, p);
    }
    if (T.splash > 0) {
      const c = B.set(x, y, z);
      for (const e of blancos) {
        if (!e.vivo || e.equipo === p.equipo || e === entidad) continue;
        const d = e.centro.distanceTo(c);
        if (d < T.splash + e.radio) e.recibirDanio(p.dano * (1 - d / (T.splash + e.radio)) * 0.85, c, p);
      }
      if (!agua) this.efectos.explosion(c, T.splash / 16);
    } else if (!agua) {
      this.efectos.chispa(punto);
      if (entidad) Sonido.impacto(Sonido.porDistancia(this.efectos._distancia(punto)) * 0.7);
    }
    this._fin(p);
  }
}
