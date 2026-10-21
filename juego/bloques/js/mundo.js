// =============================================================
//  🌍  EL MUNDO (chunks)
//  El mundo se parte en "chunks": columnas de 16 x 16 bloques.
//  Solo existen los chunks cerca de ti: se van creando poquito a
//  poquito (unos cuantos por cuadro, para que no se trabe) y los
//  que quedan muy lejos se borran de la memoria.
//  Lo que tú cambias (romper/poner) se anota aparte en "cambios":
//  así, si un chunk se borra y se vuelve a crear, tus cambios
//  siguen ahí, y es lo único que hay que guardar.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { crearGenerador, LADO, ALTO, CAPA } from './generador.js';
import { mallar, P, PCAPA } from './mallador.js';
import { B, SOLIDO, SOMBREA, EMISION } from './bloques.js';
import { buscarEmisores, calcularLuz } from './luz.js';

const clave = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
const claveX = (k) => Math.floor(k / 65536) - 32768;
const claveZ = (k) => (k % 65536) - 32768;

const VOL = new Uint8Array(PCAPA * (ALTO + 2));
const LUZ = new Uint8Array(PCAPA * (ALTO + 2));  // luz de antorchas de cada celda del volumen
const CIMA = new Int16Array(PCAPA); // por columna: el bloque más alto que da sombra
// Para copiar las orillas de los vecinos: [desde, hasta, corrimiento]
const RANGO = { '-1': [15, 15, -15], '0': [0, 15, 1], '1': [0, 0, 17] };

export class Mundo {
  constructor(escena, materiales) {
    this.escena = escena;
    this.materiales = materiales; // [sólido, con huecos, agua]
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.chunks = new Map();
    this.cambios = new Map();     // clave de chunk -> Map(índice -> bloque)
    this.originales = new Map();  // clave de chunk -> Map(índice -> bloque que generó el terreno)
    this.sucios = new Set();      // chunks que hay que volver a dibujar ya
    this.radio = 4;
    this.orden = [];
    this.hojasDetalladas = CONFIG.vista.hojasDetalladas;
    this.semilla = 0;
    this.gen = null;
    this.cuadros = 0;
    this.hayCambiosSinGuardar = false;
    this.version = 0;               // sube cada vez que cambia algo dibujado (para redibujar sombras)
    this.versionGen = 2;            // 1 = mundo viejo (sin biomas), 2 = con biomas
    this.puntosNuevos = [];         // lugares de vehículos de chunks recién creados
    this.abiertos = new Set();      // cofres que ya se abrieron ("x,y,z")
    this.vehiculosUsados = new Set(); // lugares de vehículos que ya se usaron
    this.bloqueados = null;
  }

  // Empieza un mundo nuevo (o uno guardado) con su semilla y sus cambios
  // opciones: { version (del generador), bloqueados (chunks viejos sin estructuras), abiertos, vehiculosUsados }
  reiniciar(semilla, cambiosGuardados, opciones = {}) {
    for (const ch of this.chunks.values()) this.quitarMallas(ch);
    this.chunks.clear();
    this.sucios.clear();
    this.cambios = new Map();
    this.originales = new Map();
    this.semilla = semilla | 0;
    this.versionGen = opciones.version || 2;
    this.abiertos = new Set(opciones.abiertos || []);
    this.vehiculosUsados = new Set(opciones.vehiculosUsados || []);
    this.puntosNuevos = [];
    this.bloqueados = opciones.bloqueados ? new Set(opciones.bloqueados) : null;
    this.gen = crearGenerador(this.semilla, this.versionGen, { bloqueados: this.bloqueados, estructuras: CONFIG.estructuras.activas });
    if (cambiosGuardados && typeof cambiosGuardados === 'object') {
      for (const texto of Object.keys(cambiosGuardados)) {
        const [cx, cz] = texto.split(',').map(Number);
        const lista = cambiosGuardados[texto];
        if (!Number.isFinite(cx) || !Number.isFinite(cz) || !Array.isArray(lista)) continue;
        const m = new Map();
        for (let i = 0; i + 1 < lista.length; i += 2) {
          const idx = lista[i] | 0, id = lista[i + 1] | 0;
          if (idx >= 0 && idx < CAPA * ALTO && id >= 0 && id < 256) m.set(idx, id);
        }
        if (m.size) this.cambios.set(clave(cx, cz), m);
      }
    }
    this.hayCambiosSinGuardar = false;
  }

  // Lista de cambios lista para guardarse como texto
  exportarCambios() {
    const res = {};
    for (const [k, m] of this.cambios) {
      if (!m.size) continue;
      const lista = [];
      for (const [idx, id] of m) lista.push(idx, id);
      res[claveX(k) + ',' + claveZ(k)] = lista;
    }
    return res;
  }

  cuantosCambios() {
    let n = 0;
    for (const m of this.cambios.values()) n += m.size;
    return n;
  }

  ponerRadio(r) {
    if (r === this.radio && this.orden.length) return;
    this.radio = r;
    const lista = [];
    const lim = (r + 0.5) * (r + 0.5);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = dx * dx + dz * dz;
        if (d <= lim) lista.push([dx, dz, d]);
      }
    }
    lista.sort((a, b) => a[2] - b[2]);
    this.orden = lista;
  }

  // ----------------------------------------------------------- Leer y escribir bloques
  obtener(x, y, z) {
    if (y < 0) return B.LECHO;
    if (y >= ALTO) return B.AIRE;
    const ch = this.chunks.get(clave(x >> 4, z >> 4));
    if (!ch) return B.AIRE;
    return ch.datos[y * CAPA + (z & 15) * LADO + (x & 15)];
  }

  // Para chocar: si el chunk todavía no existe, cuenta como pared
  esSolido(x, y, z) {
    if (y < 0) return true;
    if (y >= ALTO) return false;
    const ch = this.chunks.get(clave(x >> 4, z >> 4));
    if (!ch) return true;
    return SOLIDO[ch.datos[y * CAPA + (z & 15) * LADO + (x & 15)]] === 1;
  }

  hayChunk(x, z) {
    return this.chunks.has(clave(Math.floor(x) >> 4, Math.floor(z) >> 4));
  }

  // ¿Ya se ve el chunk de esta posición?
  estaListo(x, z) {
    const ch = this.chunks.get(clave(Math.floor(x) >> 4, Math.floor(z) >> 4));
    return !!(ch && ch.mallado);
  }

  // El bloque más alto (que no sea aire ni agua) de una columna
  alturaSuelo(x, z) {
    const ch = this.chunks.get(clave(x >> 4, z >> 4));
    if (!ch) return -1;
    const col = (z & 15) * LADO + (x & 15);
    for (let y = ALTO - 1; y >= 0; y--) {
      const id = ch.datos[y * CAPA + col];
      if (SOLIDO[id]) return y;
    }
    return -1;
  }

  // registrar = false: el cambio se ve pero no se guarda (lo hace el juego, no el jugador)
  poner(x, y, z, id, registrar = true) {
    if (y < 0 || y >= ALTO) return false;
    const cx = x >> 4, cz = z >> 4;
    const k = clave(cx, cz);
    const ch = this.chunks.get(k);
    if (!ch) return false;
    const lx = x & 15, lz = z & 15;
    const i = y * CAPA + lz * LADO + lx;
    if (ch.datos[i] === id) return false;
    const antes = ch.datos[i];
    ch.datos[i] = id;
    this.version++;
    if (id !== B.AIRE && y > ch.alturaMax) ch.alturaMax = Math.min(ALTO - 1, y);
    const luces = EMISION[antes] > 0 || EMISION[id] > 0;
    if (luces) {
      ch.emisores = ch.emisores.filter((e) => !(e[0] === lx && e[1] === y && e[2] === lz));
      if (EMISION[id] > 0) ch.emisores.push([lx, y, lz, EMISION[id]]);
    }
    if (registrar) {
      let m = this.cambios.get(k);
      if (!m) { m = new Map(); this.cambios.set(k, m); }
      let o = this.originales.get(k);
      if (!o) { o = new Map(); this.originales.set(k, o); }
      if (!o.has(i)) o.set(i, antes);
      // si vuelve a ser lo que generó el terreno, ya no es un cambio
      if (o.get(i) === id) { m.delete(i); o.delete(i); } else m.set(i, id);
      this.hayCambiosSinGuardar = true;
    }

    // hay que redibujar este chunk y, si el bloque está en la orilla, también al vecino
    const dxs = [0], dzs = [0];
    if (luces) { dxs.push(-1, 1); dzs.push(-1, 1); } // la luz llega lejos: se redibujan los 8 vecinos
    else {
      if (lx === 0) dxs.push(-1); else if (lx === 15) dxs.push(1);
      if (lz === 0) dzs.push(-1); else if (lz === 15) dzs.push(1);
    }
    for (const dx of dxs) for (const dz of dzs) this.sucios.add(clave(cx + dx, cz + dz));
    return true;
  }

  // ----------------------------------------------------------- Crear chunks
  generar(cx, cz) {
    const k = clave(cx, cz);
    const { datos, alturaMax, humos, puntos } = this.gen.generarChunk(cx, cz);
    const ch = { cx, cz, datos, alturaMax, mallas: [null, null, null], mallado: false, emisores: null, humos };
    for (const p of puntos) if (!this.vehiculosUsados.has(p.id)) this.puntosNuevos.push(p);
    const m = this.cambios.get(k);
    if (m) {
      let o = this.originales.get(k);
      if (!o) { o = new Map(); this.originales.set(k, o); }
      for (const [idx, id] of m) {
        if (!o.has(idx)) o.set(idx, datos[idx]);
        datos[idx] = id;
        const y = Math.floor(idx / CAPA);
        if (id !== B.AIRE && y > ch.alturaMax) ch.alturaMax = Math.min(ALTO - 1, y);
      }
    }
    ch.emisores = buscarEmisores(datos, ch.alturaMax);
    this.chunks.set(k, ch);
    return ch;
  }

  vecinosListos(cx, cz) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!this.chunks.has(clave(cx + dx, cz + dz))) return false;
      }
    }
    return true;
  }

  // Copia el chunk y una orillita de sus 8 vecinos al volumen de trabajo
  llenarVolumen(ch) {
    let yMax = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const v = this.chunks.get(clave(ch.cx + dx, ch.cz + dz));
        if (v && v.alturaMax > yMax) yMax = v.alturaMax;
      }
    }
    yMax = Math.min(ALTO - 1, yMax);
    VOL.fill(B.LECHO, 0, PCAPA);                  // debajo del mundo: roca
    VOL.fill(B.AIRE, PCAPA, Math.min(VOL.length, (yMax + 3) * PCAPA));
    for (let dz = -1; dz <= 1; dz++) {
      const [az, bz, oz] = RANGO[dz];
      for (let dx = -1; dx <= 1; dx++) {
        const v = this.chunks.get(clave(ch.cx + dx, ch.cz + dz));
        if (!v) continue;
        const [ax, , ox] = RANGO[dx];
        const tope = Math.min(yMax, v.alturaMax);
        const d = v.datos;
        for (let y = 0; y <= tope; y++) {
          for (let z = az; z <= bz; z++) {
            const src = y * CAPA + z * LADO;
            const dst = (y + 1) * PCAPA + (z + oz) * P + ox;
            if (dx === 0) VOL.set(d.subarray(src, src + LADO), dst);
            else VOL[dst + ax] = d[src + ax];
          }
        }
      }
    }
    for (let c = 0; c < PCAPA; c++) {
      let y = yMax;
      while (y >= 0 && !SOMBREA[VOL[(y + 1) * PCAPA + c]]) y--;
      CIMA[c] = y;
    }
  }

  construirMalla(ch) {
    this.llenarVolumen(ch);
    const conLuz = calcularLuz(this.chunks, clave, ch, LUZ, ch.alturaMax);
    const datos = mallar(VOL, CIMA, ch.alturaMax, this.hojasDetalladas, conLuz ? LUZ : null);
    this.quitarMallas(ch);
    this.version++;
    for (let i = 0; i < 3; i++) {
      const d = datos[i];
      if (!d) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
      g.setAttribute('color', new THREE.BufferAttribute(d.col, 3, true));
      g.setIndex(new THREE.BufferAttribute(d.ind, 1));
      g.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(8, (ch.alturaMax + 1) / 2, 8),
        Math.sqrt(128 + ((ch.alturaMax + 1) / 2) ** 2) + 1);
      const malla = new THREE.Mesh(g, this.materiales[i]);
      malla.position.set(ch.cx * LADO, 0, ch.cz * LADO);
      malla.matrixAutoUpdate = false;
      malla.updateMatrix();
      if (i < 2) malla.layers.enable(1); // la capa 1 es la que ve el sol para hacer sombras (el agua no)
      this.grupo.add(malla);
      ch.mallas[i] = malla;
    }
    ch.mallado = true;
  }

  quitarMallas(ch) {
    for (let i = 0; i < 3; i++) {
      const m = ch.mallas[i];
      if (!m) continue;
      this.grupo.remove(m);
      m.geometry.dispose();
      ch.mallas[i] = null;
    }
    ch.mallado = false;
  }

  // ----------------------------------------------------------- Cada cuadro
  // Crea y dibuja los chunks que faltan cerca de (px, pz) sin pasarse del tiempo
  actualizar(px, pz, presupuestoMs) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    const inicio = performance.now();
    const fin = inicio + presupuestoMs;

    // 1) lo que el jugador cambió se redibuja de inmediato
    if (this.sucios.size) {
      for (const k of this.sucios) {
        const ch = this.chunks.get(k);
        if (!ch) continue;
        if (this.vecinosListos(ch.cx, ch.cz)) this.construirMalla(ch);
        else ch.mallado = false; // se rehace cuando estén sus vecinos
      }
      this.sucios.clear();
    }

    // 2) del más cercano al más lejano
    for (const [dx, dz] of this.orden) {
      if (performance.now() > fin) break;
      const cx = pcx + dx, cz = pcz + dz;
      const ch = this.chunks.get(clave(cx, cz));
      if (ch && ch.mallado) continue;
      let faltan = false;
      for (let vz = -1; vz <= 1 && !faltan; vz++) {
        for (let vx = -1; vx <= 1; vx++) {
          if (!this.chunks.has(clave(cx + vx, cz + vz))) {
            this.generar(cx + vx, cz + vz);
            if (performance.now() > fin) { faltan = true; break; }
          }
        }
      }
      if (faltan || !this.vecinosListos(cx, cz)) continue;
      this.construirMalla(this.chunks.get(clave(cx, cz)));
    }

    // 3) de vez en cuando se borran los chunks lejanos
    if (++this.cuadros % 30 === 0) this.descargarLejanos(pcx, pcz);
  }

  descargarLejanos(pcx, pcz) {
    const lim = this.radio + 2;
    for (const [k, ch] of this.chunks) {
      if (Math.abs(ch.cx - pcx) > lim || Math.abs(ch.cz - pcz) > lim) {
        this.quitarMallas(ch);
        this.chunks.delete(k);
      }
    }
  }

  // Cuántos de los chunks cercanos ya se ven (0 a 1)
  progreso(px, pz, radio) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    let total = 0, listos = 0;
    for (const [dx, dz] of this.orden) {
      if (Math.abs(dx) > radio || Math.abs(dz) > radio) continue;
      total++;
      const ch = this.chunks.get(clave(pcx + dx, pcz + dz));
      if (ch && ch.mallado) listos++;
    }
    return total ? listos / total : 1;
  }

  contarMallados() {
    let n = 0;
    for (const ch of this.chunks.values()) if (ch.mallado) n++;
    return n;
  }

  // Vuelve a dibujar todo (por ejemplo, al cambiar la calidad de las hojas)
  redibujarTodo() {
    for (const ch of this.chunks.values()) if (ch.mallado) this.quitarMallas(ch);
  }
}
