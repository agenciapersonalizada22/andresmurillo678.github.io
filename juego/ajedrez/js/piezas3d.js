// =============================================================
//  ♟  PIEZAS 3D
//  Crea las mallas de las piezas con los materiales del tema y las
//  anima: movimiento con arco (el caballo salta), captura con
//  desvanecido y chispas, enroque con la torre, coronación con
//  destello. También levanta la pieza seleccionada y la arrastra.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { crearPieza } from './modelos.js';
import { aMundo } from './tablero3d.js';
import { texturaMaterial } from './texturas.js';
import { movDesde, movHasta, movBanderas, movPromo, PASO, ENR_C, ENR_L, CABALLO } from './reglas.js';
import { CONFIG } from './config.js';

const suave = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const salida = (t) => 1 - Math.pow(1 - t, 3);

export class Piezas3D {
  constructor(chispas) {
    this.grupo = new THREE.Group();
    this.mallas = new Array(64).fill(null);
    this.saliendo = new Set();
    this.anims = [];
    this.mats = null;
    this.tema = null;
    this.chispas = chispas;
    this.velocidad = 1;
    this.levantada = -1;
    this.arrastrada = -1;
    this.vivos = [];
  }

  aplicarTema(tema, calidad, envIntensidad) {
    this.tema = tema;
    for (const o of this.vivos) o.dispose();
    this.vivos = [];
    const g = (o) => { this.vivos.push(o); return o; };
    const mats = [];
    for (let c = 0; c < 2; c++) {
      const p = tema.piezas[c ? 'negras' : 'blancas'];
      const map = p.tipo === 'liso' ? null : g(texturaMaterial(p.tipo, Math.min(512, calidad.textura), p.base, p.veta, 31 + c * 17, 1));
      const cuerpo = g(new THREE.MeshPhysicalMaterial({
        color: map ? 0xffffff : p.base, map, roughness: p.rugosidad, metalness: p.metal,
        clearcoat: p.clearcoat, clearcoatRoughness: 0.12, emissive: p.emisivo, emissiveIntensity: p.tipo === 'liso' ? 0.55 : 0,
        envMapIntensity: envIntensidad,
      }));
      const acento = g(new THREE.MeshPhysicalMaterial({
        color: p.acento, roughness: 0.28, metalness: p.tipo === 'liso' ? 0 : 0.85, clearcoat: 0.3,
        emissive: p.tipo === 'liso' ? p.emisivo : 0, emissiveIntensity: 0.6, envMapIntensity: envIntensidad,
      }));
      const oscuro = g(new THREE.MeshStandardMaterial({ color: p.oscuro, roughness: 0.45, metalness: 0.1, envMapIntensity: envIntensidad }));
      mats.push({ cuerpo, acento, oscuro });
    }
    this.mats = mats;
    // reconstruir las piezas existentes con los materiales nuevos
    for (let sq = 0; sq < 64; sq++) {
      const m = this.mallas[sq];
      if (!m) continue;
      const nueva = this._crear(m.userData.codigo, sq);
      nueva.position.copy(m.position);
      nueva.userData.sq = sq;
      this.grupo.remove(m);
      this.grupo.add(nueva);
      this.mallas[sq] = nueva;
    }
  }

  _crear(codigo, sq = 0) {
    // los caballos miran un poco hacia el centro para que se reconozca su perfil
    const giro = (sq & 7) < 4 ? -1.35 : 1.35;
    const g = crearPieza(codigo & 7, codigo >> 3, this.mats[codigo >> 3], (codigo >> 3) ? -giro : giro);
    g.userData.codigo = codigo;
    return g;
  }

  _poner(sq, codigo, pop = false) {
    const g = this._crear(codigo, sq);
    const { x, z } = aMundo(sq);
    g.position.set(x, 0, z);
    g.userData.sq = sq;
    this.grupo.add(g);
    this.mallas[sq] = g;
    if (pop) this._pop(g);
    return g;
  }

  _pop(g, dur = 0.3) {
    g.scale.setScalar(0.01);
    this._anim(dur, (k) => g.scale.setScalar(Math.max(0.01, 1 + Math.sin(k * Math.PI) * 0.12) * salida(Math.min(1, k * 1.1))), 0, () => g.scale.setScalar(1));
  }

  _anim(dur, paso, retraso = 0, fin = null) {
    return new Promise((res) => {
      this.anims.push({ t: -retraso, dur: dur / this.velocidad, paso, fin: () => { if (fin) fin(); res(); } });
    });
  }

  get animando() { return this.anims.length > 0 || this.saliendo.size > 0; }

  cancelar() {
    const a = this.anims;
    this.anims = [];
    for (const x of a) { try { x.paso(1); x.fin(); } catch (e) { /* nada */ } }
    this.anims = [];
    for (const m of this.saliendo) this.grupo.remove(m);
    this.saliendo.clear();
  }

  // Deja las piezas exactamente como pide el tablero b (array de 64 códigos)
  sincronizar(b, pop = true) {
    this.cancelar();
    this.levantada = this.arrastrada = -1;
    for (let sq = 0; sq < 64; sq++) {
      const codigo = b[sq], m = this.mallas[sq];
      if (m && m.userData.codigo === codigo) {
        const { x, z } = aMundo(sq);
        m.position.set(x, 0, z); m.scale.setScalar(1);
        continue;
      }
      if (m) { this.grupo.remove(m); this.mallas[sq] = null; }
      if (codigo) this._poner(sq, codigo, pop);
    }
  }

  // Anima la jugada m jugada sobre el tablero bAntes (copia antes de jugar). Devuelve una promesa.
  jugar(m, bAntes) {
    const d = movDesde(m), h = movHasta(m), fl = movBanderas(m), pr = movPromo(m);
    const codigo = bAntes[d], color = codigo >> 3;
    const mov = this.mallas[d] || this._poner(d, codigo);
    const promesas = [];
    mov.userData.enAnim = true;
    this.mallas[d] = null;
    let capSq = -1;
    if (fl & PASO) capSq = color ? h + 8 : h - 8;
    else if (bAntes[h]) capSq = h;
    const dist = Math.hypot((d & 7) - (h & 7), (d >> 3) - (h >> 3));
    const dur = (0.3 + Math.min(dist, 6) * 0.045) * (CONFIG.animacion.mover / 0.38);
    const esCab = (codigo & 7) === CABALLO;
    const origen = mov.position.clone();
    const dest = aMundo(h);
    const alto = esCab ? 1.05 : (capSq >= 0 ? 0.34 : 0.14);
    this.levantada = -1;
    this.arrastrada = -1;

    if (capSq >= 0) {
      const victima = this.mallas[capSq];
      this.mallas[capSq] = null;
      if (victima) {
        this.saliendo.add(victima);
        const px = victima.position.x, pz = victima.position.z;
        const col = this.tema.piezas[(bAntes[capSq] >> 3) ? 'negras' : 'blancas'];
        const chispa = new THREE.Color(col.tipo === 'liso' ? col.base : (bAntes[capSq] >> 3 ? col.veta : col.base)).lerp(new THREE.Color(0xffffff), 0.25);
        let lanzado = false;
        promesas.push(this._anim(0.34, (k) => {
          if (!lanzado) { lanzado = true; this.chispas.emitir(px, 0.5, pz, chispa, 44, 2.6); }
          const s = Math.max(0.001, 1 - suave(k));
          victima.scale.set(s, Math.max(0.001, s * (1 + k * 0.5)), s);
          victima.rotation.y += 0.25;
          victima.position.y = k * 0.5;
        }, dur * 0.72, () => { this.grupo.remove(victima); this.saliendo.delete(victima); }));
      }
    }
    this.mallas[h] = mov;
    mov.userData.sq = h;
    promesas.push(this._anim(dur, (k) => {
      const e = suave(k);
      mov.position.x = origen.x + (dest.x - origen.x) * e;
      mov.position.z = origen.z + (dest.z - origen.z) * e;
      mov.position.y = origen.y * (1 - e) + Math.sin(k * Math.PI) * alto;
    }, 0, () => {
      mov.position.set(dest.x, 0, dest.z);
      mov.userData.enAnim = false;
      if (pr) {
        this.grupo.remove(mov);
        const nueva = this._poner(h, pr | (color << 3), true);
        const c = new THREE.Color(this.tema.resalte.ultima);
        this.chispas.emitir(dest.x, 0.9, dest.z, c, 36, 2);
        this.mallas[h] = nueva;
      }
    }));

    if (fl & (ENR_C | ENR_L)) {
      const rd = (fl & ENR_C) ? h + 1 : h - 2, rh = (fl & ENR_C) ? h - 1 : h + 1;
      const torre = this.mallas[rd] || this._poner(rd, bAntes[rd]);
      this.mallas[rd] = null; this.mallas[rh] = torre; torre.userData.sq = rh; torre.userData.enAnim = true;
      const o = torre.position.clone(), t = aMundo(rh);
      promesas.push(this._anim(dur * 0.9, (k) => {
        const e = suave(k);
        torre.position.x = o.x + (t.x - o.x) * e; torre.position.z = o.z + (t.z - o.z) * e;
        torre.position.y = Math.sin(k * Math.PI) * 0.3;
      }, dur * 0.25, () => { torre.position.set(t.x, 0, t.z); torre.userData.enAnim = false; }));
    }
    return Promise.all(promesas);
  }

  elevar(sq) {
    this.levantada = sq;
  }

  mover(sq, x, z) {
    const m = this.mallas[sq];
    if (!m) return;
    this.arrastrada = sq;
    m.position.x = x; m.position.z = z;
  }

  // Suelta la pieza arrastrada: vuelve a su casilla
  devolver(sq) {
    const m = this.mallas[sq];
    this.arrastrada = -1;
    if (!m) return Promise.resolve();
    const o = m.position.clone(), t = aMundo(sq);
    m.userData.enAnim = true;
    return this._anim(0.16, (k) => {
      const e = salida(k);
      m.position.set(o.x + (t.x - o.x) * e, o.y * (1 - e), o.z + (t.z - o.z) * e);
    }, 0, () => { m.userData.enAnim = false; });
  }

  // Avanza animaciones; true si hace falta seguir dibujando
  actualizar(dt) {
    let activo = false;
    if (this.anims.length) {
      activo = true;
      const lista = this.anims;
      const restantes = [];
      for (const a of lista) {
        a.t += dt;
        if (a.t < 0) { restantes.push(a); continue; }
        const k = Math.min(1, a.t / a.dur);
        a.paso(k);
        if (k >= 1) a.fin(); else restantes.push(a);
      }
      // las animaciones nuevas que se añadieron durante fin() se conservan
      this.anims = restantes.concat(this.anims.filter((x) => !lista.includes(x)));
    }
    // piezas levantadas / arrastradas
    for (let sq = 0; sq < 64; sq++) {
      const m = this.mallas[sq];
      if (!m || m.userData.enAnim) continue;
      const q = sq === this.arrastrada ? 0.5 : sq === this.levantada ? 0.14 : 0;
      if (Math.abs(m.position.y - q) > 0.002) { m.position.y += (q - m.position.y) * Math.min(1, dt * 14); activo = true; }
    }
    return activo;
  }
}
