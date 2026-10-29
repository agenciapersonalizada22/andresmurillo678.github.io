// Edificios, calles y marcadores con InstancedMesh; fantasma de construcción y selección.
import * as THREE from '../../lib/three.module.min.js';
import { N, idx, dentro } from '../sim/ciudad.js';
import { ITEM } from '../sim/datos.js';
import { modelo, TIENE_MODELO } from './modelos.js';
import { geoVia, geoLoseta } from './modelosVia.js';
import { hash2 } from '../sim/util.js';

const COL_LOTE = { R: 0x7fd18a, C: 0x6fb6ee, I: 0xe8c25a };

function texturaSombra() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

export class Edificios {
  constructor(scene, escena) {
    this.scene = scene; this.escena = escena;
    this.grupo = new THREE.Group(); scene.add(this.grupo);
    this.entradas = new Map();
    this.matCuerpo = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.anims = new Map();
    this.t = 0;
    this.sombras = null;
    if (!escena.q.sombras) {
      const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.sombras = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }), 3000);
      this.sombras.frustumCulled = false; this.sombras.renderOrder = 1; this.sombras.count = 0;
      this.grupo.add(this.sombras);
    }
    // marcadores de problemas
    this.marcas = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 300);
    this.marcas.frustumCulled = false; this.marcas.count = 0;
    this.marcas.setColorAt(0, new THREE.Color(1, 1, 1));
    this.grupo.add(this.marcas);
    this.marcasLista = [];
    // fantasma
    this.fant = new THREE.Group(); this.fant.visible = false; scene.add(this.fant);
    this.fantMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
    this.fantMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.fantMat); this.fant.add(this.fantMesh);
    this.fantClave = '';
    this.anillo = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3df5ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    this.anilloRelleno = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3df5ff, transparent: true, opacity: 0.12, depthWrite: false }));
    this.anillo.visible = this.anilloRelleno.visible = false; this.anillo.renderOrder = this.anilloRelleno.renderOrder = 4;
    scene.add(this.anillo, this.anilloRelleno);
    this.celdas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }), 1500);
    this.celdas.frustumCulled = false; this.celdas.count = 0; this.celdas.renderOrder = 5;
    this.celdas.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.celdas);
    // cursor / selección
    const mk = (col) => {
      const pts = [];
      const L = 0.3;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push(sx, 0, sz, sx - sx * L * 2, 0, sz, sx, 0, sz, sx, 0, sz - sz * L * 2);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, depthTest: false, transparent: true }));
      l.renderOrder = 10; l.visible = false; l.frustumCulled = false; scene.add(l); return l;
    };
    this.cursor = mk(0xffe14a); this.seleccion = mk(0x3df5ff);
  }

  entrada(clave, geos) {
    let e = this.entradas.get(clave);
    if (e) return e;
    e = { clave, cap: 0, cnt: 0, cuerpo: null, vent: null, geos };
    geos.cuerpo.computeBoundingBox();
    e.alto = geos.cuerpo.boundingBox.max.y;
    this.entradas.set(clave, e);
    return e;
  }
  asegurar(e, n) {
    if (n <= e.cap) return;
    const cap = Math.max(32, e.cap * 2, n + 16);
    if (e.cuerpo) { this.grupo.remove(e.cuerpo); e.cuerpo.dispose(); }
    if (e.vent) { this.grupo.remove(e.vent); e.vent.dispose(); }
    e.cuerpo = new THREE.InstancedMesh(e.geos.cuerpo, this.matCuerpo, cap);
    e.cuerpo.frustumCulled = false;
    e.cuerpo.castShadow = this.escena.q.sombras; e.cuerpo.receiveShadow = this.escena.q.sombras;
    e.cuerpo.setColorAt(0, new THREE.Color(1, 1, 1));
    e.cuerpo.count = 0;
    this.grupo.add(e.cuerpo);
    if (e.geos.vent) {
      e.vent = new THREE.InstancedMesh(e.geos.vent, this.escena.matVent, cap);
      e.vent.instanceMatrix = e.cuerpo.instanceMatrix;
      e.vent.frustumCulled = false; e.vent.count = 0;
      this.grupo.add(e.vent);
    }
    e.cap = cap;
  }

  rotacion(c, b, it) {
    const cuenta = [0, 0, 0, 0]; // sur, este, norte, oeste
    for (let i = 0; i < it.w; i++) {
      const xx = b.x + i;
      if (dentro(xx, b.y + it.h) && c.via[idx(xx, b.y + it.h)]) cuenta[0]++;
      if (dentro(xx, b.y - 1) && c.via[idx(xx, b.y - 1)]) cuenta[2]++;
    }
    for (let j = 0; j < it.h; j++) {
      const yy = b.y + j;
      if (dentro(b.x + it.w, yy) && c.via[idx(b.x + it.w, yy)]) cuenta[1]++;
      if (dentro(b.x - 1, yy) && c.via[idx(b.x - 1, yy)]) cuenta[3]++;
    }
    let mejor = 0, v = cuenta[0];
    for (let k = 1; k < 4; k++) if (cuenta[k] > v) { v = cuenta[k]; mejor = k; }
    if (!v) return b.rotBase || 0;
    return [0, Math.PI / 2, Math.PI, -Math.PI / 2][mejor];
  }

  anim(id, tipo) { this.anims.set(id, { t0: this.t, tipo }); }

  sincronizar(c, t) {
    this.t = t;
    const usados = new Map();
    const tmpC = new THREE.Color();
    const add = (clave, geos, x, y, z, rot, sx, sy, sz, tinte) => {
      const e = this.entrada(clave, geos);
      let u = usados.get(e);
      if (!u) { u = { n: 0, lista: [] }; usados.set(e, u); }
      u.lista.push(x, y, z, rot, sx, sy, sz, tinte || 0xffffff);
    };
    this.marcasLista.length = 0;
    let nSombras = 0;
    const sombras = this.sombras, sm = sombras ? sombras.instanceMatrix.array : null;
    const pushSombra = (x, z, w, d) => {
      if (!sm || nSombras >= 3000) return;
      const o = nSombras * 16;
      sm[o] = w; sm[o + 1] = 0; sm[o + 2] = 0; sm[o + 3] = 0; sm[o + 4] = 0; sm[o + 5] = 1; sm[o + 6] = 0; sm[o + 7] = 0;
      sm[o + 8] = 0; sm[o + 9] = 0; sm[o + 10] = d; sm[o + 11] = 0; sm[o + 12] = x + 0.12; sm[o + 13] = 0.015; sm[o + 14] = z + 0.1; sm[o + 15] = 1;
      nSombras++;
    };
    for (const b of c.edif.values()) {
      const it = ITEM[b.t];
      const x = b.x + it.w / 2, z = b.y + it.h / 2;
      let a = 1, ay = 1, tinte = 0xffffff;
      const an = this.anims.get(b.id);
      if (an) {
        const k = (t - an.t0) / (an.tipo === 'crece' ? 0.5 : 0.55);
        if (k >= 1) this.anims.delete(b.id);
        else if (an.tipo === 'crece') { const e = 1 - Math.pow(1 - k, 3); a = 0.75 + 0.25 * e; ay = 0.2 + 0.8 * (e + Math.sin(k * Math.PI) * 0.12); }
        else { const e = Math.sin(k * Math.PI); a = 1 + e * 0.12; ay = 1 + e * 0.18; }
      }
      if (it.tipo === 'zona') {
        if (b.n === 0) {
          add('lote:' + it.zona, { cuerpo: this.geoLote(it.zona) }, x, 0, z, 0, 1, 1, 1, b.cobE && b.cobA && b.cn ? 0xffffff : 0xbbbbbb);
          continue;
        }
        const clave = b.t + ':' + b.n;
        const m = modelo(b.t, b.n);
        const rot = this.rotacion(c, b, it);
        if (b.fuego > 0) tinte = 0xff7a50; else if (b.falta) tinte = 0x8a8a95;
        else tinte = 0xffffff;
        const v = 0.92 + hash2(b.x, b.y, 3) * 0.14;
        if (tinte === 0xffffff) { tmpC.setRGB(v, v, v); tinte = tmpC.getHex(); }
        add(clave, this.geosDe(clave, m), x, 0, z, rot, a, ay, a, tinte);
        pushSombra(x, z, 1.1 + b.n * 0.08, 1.1 + b.n * 0.08);
        if (b.fuego > 0) this.marcasLista.push(x, (this.entradas.get(clave).alto || 1) + 0.35, z, 0xff3b30);
        else if (b.falta) {
          const h = (this.entradas.get(clave).alto || 1) + 0.35;
          if (b.sE) this.marcasLista.push(x, h, z, 0xffd54a);
          else if (b.sA) this.marcasLista.push(x, h, z, 0x3aa6ff);
          else if (b.sV) this.marcasLista.push(x, h, z, 0xff7a3a);
        }
      } else {
        const n = it.mej ? b.n : 1;
        const clave = b.t + ':' + n;
        if (!TIENE_MODELO(b.t)) continue;
        const rot = this.rotacion(c, b, it);
        if (b.fuego > 0) tinte = 0xff7a50;
        add(clave, this.geosDe(clave, modelo(b.t, n), b.t), x, 0, z, ['jardin', 'parque', 'plaza', 'parquegrande', 'arbol', 'fuente', 'estatua', 'farola', 'obelisco', 'eolica', 'solar', 'estadio', 'observatorio'].includes(b.t) ? 0 : rot, a, ay, a, tinte);
        if (!['jardin', 'parque', 'plaza', 'parquegrande', 'solar', 'aeropuerto'].includes(b.t)) pushSombra(x, z, it.w * 1.1, it.h * 1.1);
        const alto = this.entradas.get(clave).alto;
        if (b.fuego > 0) this.marcasLista.push(x, alto + 0.35, z, 0xff3b30);
        else if (b.sE) this.marcasLista.push(x, alto + 0.35, z, 0xffd54a);
        else if (b.sA) this.marcasLista.push(x, alto + 0.35, z, 0x3aa6ff);
        else if (b.sV) this.marcasLista.push(x, alto + 0.35, z, 0xff7a3a);
      }
    }
    // calles
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, v = c.via[i];
      if (!v) continue;
      let mask = 0;
      if (y > 0 && c.via[i - N]) mask |= 1;
      if (x < N - 1 && c.via[i + 1]) mask |= 2;
      if (y < N - 1 && c.via[i + N]) mask |= 4;
      if (x > 0 && c.via[i - 1]) mask |= 8;
      add('via:' + mask + ':' + v, geoVia(mask, v), x + 0.5, 0, y + 0.5, 0, 1, 1, 1, c.r && c.r.con[i] ? 0xffffff : 0xb0a6a0);
    }
    // volcar
    for (const e of this.entradas.values()) {
      const u = usados.get(e);
      const n = u ? u.lista.length / 8 : 0;
      if (n === 0) { if (e.cuerpo) { e.cuerpo.count = 0; if (e.vent) e.vent.count = 0; e.cuerpo.visible = false; if (e.vent) e.vent.visible = false; } continue; }
      this.asegurar(e, n);
      e.cuerpo.visible = true; if (e.vent) e.vent.visible = true;
      const arr = e.cuerpo.instanceMatrix.array, L = u.lista;
      for (let k = 0; k < n; k++) {
        const o = k * 16, s = k * 8, c0 = Math.cos(L[s + 3]), s0 = Math.sin(L[s + 3]);
        arr[o] = c0 * L[s + 4]; arr[o + 1] = 0; arr[o + 2] = -s0 * L[s + 4]; arr[o + 3] = 0;
        arr[o + 4] = 0; arr[o + 5] = L[s + 5]; arr[o + 6] = 0; arr[o + 7] = 0;
        arr[o + 8] = s0 * L[s + 6]; arr[o + 9] = 0; arr[o + 10] = c0 * L[s + 6]; arr[o + 11] = 0;
        arr[o + 12] = L[s]; arr[o + 13] = L[s + 1]; arr[o + 14] = L[s + 2]; arr[o + 15] = 1;
        tmpC.setHex(L[s + 7]); e.cuerpo.setColorAt(k, tmpC);
      }
      e.cuerpo.count = n; if (e.vent) e.vent.count = n;
      e.cuerpo.instanceMatrix.needsUpdate = true;
      if (e.cuerpo.instanceColor) e.cuerpo.instanceColor.needsUpdate = true;
    }
    if (sombras) { sombras.count = nSombras; sombras.instanceMatrix.needsUpdate = true; }
  }

  geoLote(z) {
    this._lotes = this._lotes || {};
    return this._lotes[z] || (this._lotes[z] = geoLoseta(COL_LOTE[z]));
  }
  geosDe(clave, m) {
    this._geos = this._geos || {};
    return this._geos[clave] || (this._geos[clave] = m.geos());
  }

  // marcadores flotantes (se animan cada cuadro)
  animarMarcas(t) {
    const L = this.marcasLista, n = Math.min(300, L.length / 4);
    const arr = this.marcas.instanceMatrix.array, col = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const x = L[k * 4], y = L[k * 4 + 1] + Math.sin(t * 3 + k) * 0.06, z = L[k * 4 + 2], a = t * 2 + k, cs = Math.cos(a), sn = Math.sin(a), o = k * 16;
      arr[o] = cs; arr[o + 1] = 0; arr[o + 2] = -sn; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = 1; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = sn; arr[o + 9] = 0; arr[o + 10] = cs; arr[o + 11] = 0; arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
      col.setHex(L[k * 4 + 3]); this.marcas.setColorAt(k, col);
    }
    this.marcas.count = n;
    this.marcas.instanceMatrix.needsUpdate = true;
    if (this.marcas.instanceColor) this.marcas.instanceColor.needsUpdate = true;
  }

  // ---------------------------------------------------------------- fantasma
  ocultarFantasma() { this.fant.visible = false; this.anillo.visible = this.anilloRelleno.visible = false; this.celdas.count = 0; }
  fantasmaEdificio(it, x, y, ok, n = 1) {
    const clave = it.id + ':' + n;
    if (this.fantClave !== clave) {
      this.fantClave = clave;
      this.fantMesh.geometry = this.geosDe(clave, modelo(it.id, it.mej ? n : 1)).cuerpo;
    }
    this.fantMat.color.setHex(ok ? 0xbfffd0 : 0xff9a9a);
    this.fant.visible = true;
    this.fant.position.set(x + it.w / 2, 0.0, y + it.h / 2);
    this.fant.rotation.y = 0;
    if (it.radio) {
      const r = it.radio * (it.mej ? 1 : 1);
      this.anillo.visible = this.anilloRelleno.visible = true;
      for (const m of [this.anillo, this.anilloRelleno]) { m.position.set(x + it.w / 2, 0.07, y + it.h / 2); m.scale.set(r, 1, r); }
      this.anillo.material.color.setHex(ok ? 0x3df5ff : 0xff6b6b); this.anilloRelleno.material.color.setHex(ok ? 0x3df5ff : 0xff6b6b);
    } else this.anillo.visible = this.anilloRelleno.visible = false;
  }
  fantasmaCeldas(lista, demoler) {
    // lista: [{x,y,ok,nada}]
    const n = Math.min(1500, lista.length), arr = this.celdas.instanceMatrix.array, col = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const e = lista[k], o = k * 16;
      arr.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, e.x + 0.5, 0.075, e.y + 0.5, 1], o);
      col.setHex(demoler ? (e.ok ? 0xff7a2a : 0x6a7080) : !e.ok ? 0xff4d4d : e.nada ? 0x8a93a0 : 0x44ff88); this.celdas.setColorAt(k, col);
    }
    this.celdas.count = n; this.celdas.instanceMatrix.needsUpdate = true; if (this.celdas.instanceColor) this.celdas.instanceColor.needsUpdate = true;
    this.fant.visible = false; this.anillo.visible = this.anilloRelleno.visible = false;
  }
  celdasMasFantasma(lista) { this.fantasmaCeldas(lista); }

  marcoCursor(x, y, w, h, t) {
    const m = this.cursor; m.visible = true;
    const p = 1 + Math.sin(t * 6) * 0.03;
    m.position.set(x + w / 2, 0.1, y + h / 2); m.scale.set(w / 2 * p, 1, h / 2 * p);
  }
  ocultarCursor() { this.cursor.visible = false; }
  marcoSeleccion(b, t) {
    const m = this.seleccion;
    if (!b) { m.visible = false; return; }
    const it = ITEM[b.t]; m.visible = true;
    const p = 1.06 + Math.sin(t * 5) * 0.03;
    m.position.set(b.x + it.w / 2, 0.1, b.y + it.h / 2); m.scale.set(it.w / 2 * p, 1, it.h / 2 * p);
  }
  altoDe(b) {
    const it = ITEM[b.t];
    if (it.tipo === 'zona' && b.n === 0) return 0.1;
    const n = it.tipo === 'zona' ? b.n : (it.mej ? b.n : 1);
    const e = this.entradas.get(b.t + ':' + n);
    return e ? e.alto : 1;
  }
  caja(id) { const e = [...this.entradas.values()].find((q) => q.clave.startsWith(id + ':')); return e ? e.alto : 1; }
}
