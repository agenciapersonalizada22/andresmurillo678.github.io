// =============================================================
//  🚀  MODELO Y EFECTOS DEL COHETE
//  Se dibuja por etapas (estructura, motores, combustible, cabina)
//  sobre la plataforma. Al despegar sale una llama con luz, humo y
//  chispas; a los segundos se suelta la primera etapa (motores y
//  tanques), que cae girando. Todo con piezas simples.
// =============================================================
import * as THREE from '../../lib/three.module.min.js';
import { mat, caja, cilindro } from '../modelosVeh.js';
import { ETAPAS, altura, fase, T_SEPARACION } from './cohete.js';

const M = {
  blanco: () => mat(0xf1f4f8, { brillo: 90, espec: 0x889099, emisivo: 0x40444a }),
  rojo: () => mat(0xd23a2e, { brillo: 60, emisivo: 0x3a0a08 }),
  gris: () => mat(0x59606c, { brillo: 50, emisivo: 0x1c2026 }),
  negro: () => mat(0x15171b, { brillo: 20 }),
  naranja: () => mat(0xff8a2a, { brillo: 60, emisivo: 0x4a2208 }),
  cristal: () => mat(0x4ab4ff, { brillo: 140, emisivo: 0x0a3a66, intensidad: 0.8 }),
};

export const ALTO_MODELO = 15;     // para cámaras y efectos

// Devuelve { grupo, etapas: { estructura, motores, combustible, cabina }, base (Group de la primera etapa), llama }
export function crearModeloCohete() {
  const g = new THREE.Group();
  const e = { estructura: new THREE.Group(), motores: new THREE.Group(), combustible: new THREE.Group(), cabina: new THREE.Group() };
  // cuerpo central
  cilindro(e.estructura, 1.15, 1.15, 8.2, 0, 5.4, 0, M.blanco(), 0, 0, 0, 24);
  cilindro(e.estructura, 1.18, 1.18, 0.5, 0, 3.0, 0, M.negro(), 0, 0, 0, 24);
  cilindro(e.estructura, 1.18, 1.18, 0.5, 0, 7.2, 0, M.negro(), 0, 0, 0, 24);
  cilindro(e.estructura, 1.2, 1.2, 0.3, 0, 1.4, 0, M.gris(), 0, 0, 0, 24);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const aleta = caja(e.estructura, 0.12, 2.6, 1.6, Math.cos(a) * 1.55, 2.4, Math.sin(a) * 1.55, M.rojo());
    aleta.rotation.y = -a;
  }
  cilindro(e.estructura, 1.15, 1.15, 0.9, 0, 10.0, 0, M.blanco(), 0, 0, 0, 24);
  // motores: tobera central y 3 laterales
  cilindro(e.motores, 0.5, 0.95, 1.5, 0, 0.55, 0, M.gris(), 0, 0, 0, 20);
  cilindro(e.motores, 0.3, 0.3, 0.4, 0, 1.35, 0, M.negro());
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cilindro(e.motores, 0.28, 0.5, 1.1, Math.cos(a) * 1.0, 0.45, Math.sin(a) * 1.0, M.negro(), 0, 0, 0, 14);
  }
  // combustible: 4 tanques exteriores con punta
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.75;
    cilindro(e.combustible, 0.5, 0.5, 5.6, x, 4.1, z, M.naranja(), 0, 0, 0, 16);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 16), M.blanco());
    punta.position.set(x, 7.45, z); e.combustible.add(punta);
    cilindro(e.combustible, 0.52, 0.52, 0.25, x, 2.2, z, M.negro());
    caja(e.combustible, 0.25, 0.25, 0.7, x * 0.65, 5.2, z * 0.65, M.gris());
  }
  // cabina: ojiva, ventana y antena
  const ojiva = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.6, 24), M.blanco());
  ojiva.position.set(0, 12.25, 0); e.cabina.add(ojiva);
  const vent = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), M.cristal());
  vent.position.set(0, 10.7, 1.0); vent.scale.z = 0.5; e.cabina.add(vent);
  cilindro(e.cabina, 0.05, 0.05, 1.4, 0, 14.6, 0, M.gris());
  // llama (se enciende al despegar)
  const llama = new THREE.Group();
  const nucleo = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.2, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  nucleo.rotation.x = Math.PI; nucleo.position.y = -2.1;
  const halo = new THREE.Mesh(new THREE.ConeGeometry(1.3, 7.5, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = Math.PI; halo.position.y = -3.75;
  llama.add(nucleo, halo);
  llama.position.y = 0.2;
  llama.visible = false;
  // la primera etapa (motores + tanques + llama) se agrupa para soltarla
  const base = new THREE.Group();
  base.add(e.motores, e.combustible, llama);
  g.add(e.estructura, base, e.cabina);
  g.traverse((o) => { if (o.isMesh) o.layers.enable(1); });
  return { grupo: g, etapas: e, base, llama, nucleo, halo };
}

// Maneja los modelos de todas las plataformas y los restos que caen
export class Cohetes {
  constructor(escena) {
    this.escena = escena;
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.modelos = new Map();     // clave de plataforma -> { m, x, y, z, separado }
    this.restos = [];
    this.luzIdx = -1;
  }

  limpiar() {
    for (const k of [...this.modelos.keys()]) this.quitar(k);
    for (const r of this.restos) this.grupo.remove(r.grupo);
    this.restos.length = 0;
  }

  quitar(k) {
    const o = this.modelos.get(k);
    if (!o) return;
    this.grupo.remove(o.m.grupo);
    o.m.grupo.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
    this.modelos.delete(k);
  }

  // pad: { x, y, z (bloque central de la plataforma), etapas, estado, t }
  sincronizar(clave, pad) {
    if (!pad.etapas.length) { this.quitar(clave); return; }
    let o = this.modelos.get(clave);
    if (!o) {
      o = { m: crearModeloCohete(), separado: false };
      this.grupo.add(o.m.grupo);
      this.modelos.set(clave, o);
    }
    for (const n of ETAPAS) o.m.etapas[n].visible = pad.etapas.includes(n);
    // la base solo tiene sentido si hay estructura; si no se ve cada pieza suelta
    o.m.grupo.position.set(pad.x + 0.5, pad.y + 1, pad.z + 0.5);
    o.separado = false;
    o.m.base.visible = true;
  }

  // Actualiza el vuelo de una plataforma según t (segundos respecto al 0)
  volar(clave, pad, t, dt, efectos) {
    const o = this.modelos.get(clave);
    if (!o) return null;
    const f = fase(t);
    const h = altura(t);
    o.m.grupo.position.set(pad.x + 0.5, pad.y + 1 + h, pad.z + 0.5);
    const enciende = f !== 'cuenta' && f !== 'orbita';
    const sepa = o.separado;
    o.m.llama.visible = enciende && !sepa;
    if (enciende) {
      const k = 0.85 + 0.3 * Math.random();
      const potencia = f === 'ignicion' ? 0.4 + 0.5 * (1 + t / 3) : 1;
      o.m.llama.scale.set(potencia * (0.9 + 0.2 * Math.random()), potencia * k * 1.5, potencia * (0.9 + 0.2 * Math.random()));
    }
    // a partir de la separación, el cohete solo tiene motor pequeño y cabina
    if (f !== 'cuenta' && f !== 'ignicion' && f !== 'ascenso1' && !sepa) {
      o.separado = true;
      this.soltarBase(o, pad, h, t);
      efectos.chispas(o.m.grupo.position.x, o.m.grupo.position.y + 1, o.m.grupo.position.z, 40);
    }
    if (o.separado) {
      // llama chica de la segunda etapa
      o.m.llama.visible = f !== 'orbita';
      o.m.llama.scale.set(0.5, 0.7 + 0.2 * Math.random(), 0.5);
      o.m.llama.position.y = 0.6;
      o.m.base.visible = true;
    }
    return { x: o.m.grupo.position.x, y: o.m.grupo.position.y, z: o.m.grupo.position.z, h, fase: f, boquilla: o.m.grupo.position.y + (o.separado ? 1 : 0.2) };
  }

  soltarBase(o, pad, h, t) {
    const copia = new THREE.Group();
    const e = o.m.etapas;
    // se clonan motores y tanques como resto que cae
    for (const n of ['motores', 'combustible']) {
      if (!e[n].visible) continue;
      const c = e[n].clone();
      copia.add(c);
      e[n].visible = false;
    }
    copia.position.copy(o.m.grupo.position);
    this.grupo.add(copia);
    this.restos.push({ grupo: copia, vy: 6 + Math.max(0, h * 0.01), vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, gx: Math.random() * 1.2, gz: Math.random() * 1.2, vida: 9 });
  }

  actualizarRestos(dt) {
    for (let i = this.restos.length - 1; i >= 0; i--) {
      const r = this.restos[i];
      r.vida -= dt;
      r.vy -= 22 * dt;
      r.grupo.position.x += r.vx * dt; r.grupo.position.y += r.vy * dt; r.grupo.position.z += r.vz * dt;
      r.grupo.rotation.x += r.gx * dt; r.grupo.rotation.z += r.gz * dt;
      if (r.vida <= 0) {
        this.grupo.remove(r.grupo);
        r.grupo.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
        this.restos.splice(i, 1);
      }
    }
  }

  // Posición de la primera plataforma con modelo visible (para apuntar cámaras y luces)
  actualizar(dt) { this.actualizarRestos(dt); }
}

export const T_SEP = T_SEPARACION;
