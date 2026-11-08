// =============================================================
//  🪐  ESPACIO: dimensiones, cohetes, centro espacial y portal
//  Une todo lo del espacio con el juego. principal.js solo le pasa
//  un contexto (mundo, jugador, cielo…) y llama a unos cuantos
//  métodos: actualizar cada cuadro, usarBloque, usarObjeto,
//  exportar/importar para el guardado y alMensaje para el multi.
//  - Dimensiones: al viajar se descarga la anterior y se carga la
//    nueva por chunks (con barra de carga, sin congelar). En el
//    multijugador cada quien está en la suya y los cambios de bloques
//    de una dimensión se piden al anfitrión por paquetes.
//  - Cohete: plataforma por etapas, cuenta regresiva, ascenso,
//    separación y órbita. - Portal del Abismo con marco de obsidiana.
// =============================================================
import * as THREE from '../../lib/three.module.min.js';
import { B } from '../bloques.js';
import { ALTO } from '../medidas.js';
import { DIMENSIONES, CUERPOS, datosDim, esDimension, hayRuta, destinosDe, posicionDestino, DIM_DEFECTO, cicloDias, cuerposFuturos } from './cuerpos.js';
import * as Portal from './portal.js';
import { nuevoOxigeno, pasoOxigeno, TANQUE, segundosRestantes } from './oxigeno.js';
import { ETAPAS, ITEM_ETAPA, NOMBRE_ETAPA, T_CUENTA, T_ORBITA, fase, altura, velocidad, vibracion, textoCuenta, oscuridadCielo, siguienteEtapa, completo, etapasValidas, T_IGNICION } from './cohete.js';
import { solEspacial, TIERRA_EN_LUNA, estadoCielo, proximoEclipse, nombreFase, MES_LUNAR } from './astronomia.js';
import { Cohetes } from './coheteVisual.js';
import { leerProgreso, guardarProgreso } from './progresoEspacio.js';
import { centroPlataforma, claveDe } from './plataforma.js';

const R = () => window.Red;
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };
const PI2 = Math.PI * 2;
const COSTE_LUNA = 3;   // bidones de combustible

export class Espacio {
  constructor(c) {
    this.c = c;
    this.cohetes = new Cohetes(c.escena);
    this.pads = new Map();          // "x,y,z" -> { x, y, z, etapas, estado, t, t0, piloto }
    this.enCohete = null;           // { clave } si vas a bordo
    this.viaje = null;              // carga de dimensión en curso
    this.vehPorDim = {};            // vehículos de las dimensiones donde no estás
    this.ultimoPad = null;          // por dónde lanzaste (para volver)
    this.o2 = nuevoOxigeno();
    this.prog = leerProgreso();
    this.cool = 0;                  // segundos sin poder usar portales
    this.tPortal = 0; this.tLava = 0; this.tCarga = 0; this.tPortalFx = 0; this.tAvisoO2 = 0; this.tVibra = 0; this.tAviso = 0;
    this.sacudida = 0;
    this.paquetes = null;           // recepción de una dimensión (invitados)
    this.tvuelo = 0;
    this.hastaDimAviso = 0;
    this.ultimaFase = '';
    this.crearHud();
    c.mundo.escuchar((ev) => this.alCambiarBloque(ev));
  }

  get mundo() { return this.c.mundo; }
  get dim() { return this.c.mundo.dimension; }
  get datos() { return datosDim(this.c.mundo.dimension); }
  enMulti() { const r = R(); return !!(r && r.conectado); }
  nivelFx() {
    const v = this.c.Aj.get('efectosEspacio');
    if (v === 'bajo') return 0.35; if (v === 'medio') return 0.7; if (v === 'alto') return 1.25;
    return this.c.tactil() ? 0.45 : 1;
  }

  // ----------------------------------------------------------- HUD propio
  crearHud() {
    const hud = document.getElementById('hud');
    const raiz = el('div'); raiz.id = 'hudEspacio';
    this.hud = {
      raiz,
      dim: el('div', 'oculto', ''), o2: el('div', 'oculto'), cuenta: el('div', 'oculto'), vuelo: el('div', 'oculto'),
    };
    this.hud.dim.id = 'espDim';
    this.hud.o2.id = 'espO2'; this.hud.o2.innerHTML = '<i></i><em>OXÍGENO</em>';
    this.hud.cuenta.id = 'espCuenta';
    this.hud.cuentaNum = el('b', '', ''); this.hud.cuentaSub = el('small', '', '');
    this.hud.abortar = el('button', '', 'ABORTAR'); this.hud.abortar.type = 'button';
    this.hud.abortar.addEventListener('click', () => this.abortar());
    this.hud.cuenta.append(this.hud.cuentaNum, this.hud.cuentaSub, this.hud.abortar);
    this.hud.vuelo.id = 'espVuelo';
    raiz.append(this.hud.dim, this.hud.o2, this.hud.cuenta, this.hud.vuelo);
    (hud || document.body).appendChild(raiz);
  }

  // ----------------------------------------------------------- Guardado
  reiniciar() {
    this.cohetes.limpiar();
    this.pads.clear();
    this.enCohete = null;
    this.viaje = null;
    this.vehPorDim = {};
    this.ultimoPad = null;
    this.o2 = nuevoOxigeno();
    this.cool = 0;
    this.paquetes = null;
    this.hud.cuenta.classList.add('oculto');
    this.hud.vuelo.classList.add('oculto');
    this.aplicarReglas();
  }

  // Al volver al título: se cancela un vuelo a medias
  alSalir() {
    if (this.enCohete) {
      const p = this.pads.get(this.enCohete.clave);
      if (p) { p.estado = 'vacio'; p.t = 0; p.local = false; }
      this.enCohete = null;
    }
    if (this.motorSonando) { this.motorSonando = false; this.c.Sonido.motorParar(); }
    this.viaje = null;
    this.sacudida = 0;
    this.hud.cuenta.classList.add('oculto'); this.hud.vuelo.classList.add('oculto');
    document.body.style.setProperty('--portal', '0');
  }

  // datos = lo que guardó exportar() (o undefined en partidas viejas)
  importar(d) {
    this.reiniciar();
    if (d && typeof d === 'object') {
      if (d.pads && typeof d.pads === 'object') {
        for (const k of Object.keys(d.pads).slice(0, 12)) {
          const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(k);
          const e = d.pads[k] && d.pads[k].e;
          if (m && etapasValidas(e) && e.length) this.pads.set(k, { x: +m[1], y: +m[2], z: +m[3], etapas: e.slice(), estado: 'vacio', t: 0, t0: 0 });
        }
      }
      if (d.veh && typeof d.veh === 'object') for (const k of Object.keys(d.veh)) if (esDimension(k) && Array.isArray(d.veh[k])) this.vehPorDim[k] = d.veh[k].slice(0, 12);
      const p = d.pad;
      if (p && [p.x, p.y, p.z].every(Number.isFinite)) this.ultimoPad = { x: p.x | 0, y: p.y | 0, z: p.z | 0 };
      if (Number.isFinite(d.o2)) this.o2.o2 = Math.max(0, Math.min(TANQUE, d.o2));
    }
    this.aplicarReglas();
    this.sincronizarPads();
  }

  exportar() {
    const pads = {};
    for (const [k, p] of this.pads) if (p.etapas.length) pads[k] = { e: p.etapas.slice() };
    const veh = {};
    for (const k of Object.keys(this.vehPorDim)) if (this.vehPorDim[k] && this.vehPorDim[k].length && k !== this.dim) veh[k] = this.vehPorDim[k];
    return { dim: this.dim, pads, veh, pad: this.ultimoPad || undefined, o2: Math.round(this.o2.o2), centro: this.c.mundo.opcionesGen && this.c.mundo.opcionesGen.centroEspacial ? 1 : 0 };
  }

  // ----------------------------------------------------------- Reglas de la dimensión
  aplicarReglas() {
    const c = this.c, D = this.datos;
    c.cielo.ponerDimension(D);
    c.jugador.gravMul = D.gravedad;
    c.vehiculos.gravMul = D.gravedad;
    c.mobs.espejo = c.mobs.espejo && !this.dimPropia();
    c.animales.espejo = c.animales.espejo && !this.dimPropia();
  }
  // en el multijugador, un invitado en otra dimensión que el anfitrión simula sus propios bichos
  dimPropia() { return this.enMulti() && !R().esAnfitrion && this.c.multi.dimAnfitrion && this.c.multi.dimAnfitrion !== this.dim; }
  factorRadio() { return this.datos.radio || 1; }
  nieblaAjuste() {
    const D = this.datos;
    if (D.cielo === 'vacio') return { cerca: 3, lejos: 3.2, color: null };
    if (D.cielo === 'cueva') return { cerca: 0.12, lejos: 0.78, color: D.niebla };
    return null;
  }
  animoMusica() { const m = this.datos.musica; return m === 'espacio' ? 'noche' : m === 'cueva' ? 'cueva' : null; }
  mobsConfig() { const D = this.datos; return Array.isArray(D.mobs) ? { mobsDim: D.mobs, sinMobs: !D.mobs.length } : { mobsDim: null, sinMobs: false }; }

  // ----------------------------------------------------------- Viajar entre dimensiones
  // o: { pos: [x, y, z], portal: true, tipo: 'cohete' | 'consola' | 'portal' | 'reaparecer' }
  viajar(destino, o = {}) {
    const c = this.c;
    if (this.viaje || !esDimension(destino) || destino === this.dim) return false;
    const desde = this.dim;
    if (c.vehiculos.actual) { c.vehiculos.bajar(true, c.jugador); c.interfaz.tablero(null); }
    if (c.estado === 'jugando' && !this.enMulti()) c.guardar(true);
    this.vehPorDim[desde] = c.vehiculos.exportar();
    c.vehiculos.importar(this.vehPorDim[destino] || []);
    delete this.vehPorDim[destino];
    c.mobs.limpiar(); c.drops.limpiar(); c.animales.limpiar();
    this.cohetes.limpiar();
    c.mundo.cambiarDimension(destino);
    // posición provisional (sin esperar los chunks): el generador conoce la altura
    let x, y, z;
    if (o.pos) [x, y, z] = o.pos;
    else if (o.portal) {
      const [px, pz] = posicionDestino(c.jugador.x, c.jugador.z, desde, destino);
      x = px + 0.5; z = pz + 0.5; y = (c.mundo.gen.alturaEn ? c.mundo.gen.alturaEn(px, pz) : 60) + 2;
      if (destino === 'abismo') y = Math.max(y, 34);
    } else if (destino === 'superficie' && this.ultimoPad && desde === 'orbita') {
      x = this.ultimoPad.x + 0.5; z = this.ultimoPad.z + 9.5; y = this.ultimoPad.y + 3;
    } else if (destino === 'superficie' && c.spawn) { x = c.spawn.x; y = c.spawn.y; z = c.spawn.z; }
    else { const i = c.mundo.gen.buscarInicio(); x = i.x; y = i.y + 0.1; z = i.z; }
    c.jugador.ponerEn(x, y, z);
    c.jugador.volando = false;
    c.vitales.cima = null;   // al llegar no cuenta como caída
    c.jugador.yaw = o.yaw ?? c.jugador.yaw;
    this.viaje = { destino, desde, tipo: o.tipo || (o.portal ? 'portal' : ''), portal: !!o.portal, t: 0, red: null };
    this.aplicarReglas();
    c.aplicarRadio();
    this.cool = 6;
    this.tPortal = 0;
    // multijugador: un invitado pide los cambios de esa dimensión al anfitrión
    if (this.enMulti() && !R().esAnfitrion && destino !== DIM_DEFECTO) {
      this.viaje.red = { total: -1, recibidos: 0, listo: false, t: 0 };
      R().enviar('dimPedir', { dm: destino });
    }
    if (this.enMulti()) R().difundir('dimAviso', { dm: destino });
    c.setEsperando(true);
    c.interfaz.carga(true, 0, 'Viajando: ' + datosDim(destino).nombre.toUpperCase() + '…');
    // estadísticas y logros
    this.prog.dims[destino] = this.prog.dims[destino] || Date.now();
    guardarProgreso(this.prog);
    if (destino === 'luna') c.logros.sumar('visitaLuna');
    if (destino === 'abismo') c.logros.sumar('visitaAbismo');
    if (destino === 'superficie' && (desde === 'orbita' || desde === 'luna')) c.logros.sumar('idaVuelta');
    c.logros.revisar();
    return true;
  }

  // Cuánto falta para que la dimensión esté lista (0 a 1)
  progreso() {
    const c = this.c, j = c.jugador, v = this.viaje;
    const pc = c.mundo.progreso(j.x, j.z, v ? 2 : 1);
    if (!v) return pc;
    if (v.red && !v.red.listo) { v.t += 0; return 0.4 * (v.red.total > 0 ? v.red.recibidos / v.red.total : 0); }
    return (v.red ? 0.4 : 0) + (v.red ? 0.6 : 1) * pc;
  }
  esperandoRed() { return !!(this.viaje && this.viaje.red && !this.viaje.red.listo); }
  textoCarga() {
    const v = this.viaje;
    if (!v) return null;
    const n = datosDim(v.destino).nombre;
    if (v.red && !v.red.listo) return 'Recibiendo ' + n + ' del anfitrión…';
    return 'Cargando ' + n + '…';
  }

  alTerminarCarga() {
    const c = this.c, v = this.viaje;
    this.viaje = null;
    if (!v) return;
    const m = c.mundo, j = c.jugador;
    if (v.portal) this.colocarEnPortal(v);
    else if (v.destino !== 'orbita') {
      const h = m.alturaSuelo(Math.floor(j.x), Math.floor(j.z));
      if (h >= 0 && v.tipo !== 'reaparecer') j.ponerEn(j.x, Math.max(h + 1.05, v.destino === 'luna' ? 0 : 0), j.z);
    }
    j.desatorar(m);
    c.vitales.cima = null;
    this.cool = 5;
    const D = datosDim(v.destino);
    let sub = 'Gravedad ' + D.gravedad.toFixed(2) + ' g';
    if (!D.respirable) sub += ' · SIN AIRE: usa el traje espacial';
    if (v.destino === 'abismo') sub = 'Calor y lava · cuidado con los bichos';
    c.hud.toast(D.nombre.toUpperCase(), sub, 'logro');
    if (v.destino === 'orbita' && v.tipo === 'cohete') c.interfaz.aviso('¡Estás en órbita! La consola de navegación te lleva a la Luna o de vuelta a casa', 6);
  }

  // Busca el portal de este lado (o construye uno) y pone al jugador frente a él
  colocarEnPortal(v) {
    const c = this.c, m = c.mundo, j = c.jugador;
    const tx = Math.floor(j.x), tz = Math.floor(j.z);
    const obt = (x, y, z) => m.obtener(x, y, z);
    let marco = null;
    for (let r = 0; r <= 9 && !marco; r += 3) {
      for (let dz = -r; dz <= r && !marco; dz++) for (let dx = -r; dx <= r && !marco; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const gx = tx + dx, gz = tz + dz;
        if (!m.estaListo(gx, gz)) continue;
        for (let y = ALTO - 2; y > 1; y--) {
          if (obt(gx, y, gz) === B.PORTAL) { marco = Portal.buscarMarco(obt, gx, y, gz); if (marco) break; }
        }
      }
    }
    if (!marco) {
      let h = m.alturaSuelo(tx, tz);
      const y = Math.max(h + 1, v.destino === 'abismo' ? 36 : CONFIGMAR() + 1);
      marco = { eje: 'x', x0: tx, y0: y, z0: tz, w: 2, h: 3 };
      for (const [x, yy, z, id] of Portal.planMarco('x', tx, y, tz, 2, 3)) m.poner(x, yy, z, id, true, 'mundo');
    }
    const dx = marco.eje === 'x' ? 1 : 0, dz = marco.eje === 'z' ? 1 : 0;
    const cx = marco.x0 + dx * marco.w / 2 + (dx ? 0 : 0.5), cz = marco.z0 + dz * marco.w / 2 + (dz ? 0 : 0.5);
    // delante del portal (perpendicular al marco), en el lado que esté libre
    for (const lado of [2.5, -2.5]) {
      const px = cx + dz * lado + (dx ? 0 : 0), pz = cz + dx * lado;
      if (!m.esSolido(Math.floor(px), marco.y0, Math.floor(pz)) && !m.esSolido(Math.floor(px), marco.y0 + 1, Math.floor(pz))) {
        j.ponerEn(px, marco.y0, pz);
        j.yaw = dx ? (lado > 0 ? 0 : Math.PI) : (lado > 0 ? Math.PI / 2 : -Math.PI / 2);
        return;
      }
    }
    j.ponerEn(cx, marco.y0, cz + 2.5);
  }

  // Volver a casa tras morir
  alReaparecer() { if (this.dim !== DIM_DEFECTO) this.viajar(DIM_DEFECTO, { tipo: 'reaparecer', pos: this.c.spawn ? [this.c.spawn.x, this.c.spawn.y, this.c.spawn.z] : null }); this.o2 = nuevoOxigeno(); }

  // ----------------------------------------------------------- Cada cuadro
  // antes de cielo.actualizar: fija lo que el cielo necesita
  preCielo(hora, dias) {
    const c = this.c, cielo = c.cielo, D = this.datos;
    cielo.dias = dias;
    cielo.eclipses = !!c.Aj.get('eclipses');
    let osc = 0;
    if (this.enCohete) {
      const p = this.pads.get(this.enCohete.clave);
      if (p) osc = oscuridadCielo(p.y + altura(p.t));
    }
    cielo.oscuridad = osc;
    if (cielo.dim && D.cielo === 'vacio') {
      const E = cielo.espacial;
      const s = solEspacial(hora, dias + hora, cicloDias(this.dim));
      E.sol.set(s.x, s.y, s.z);
      if (D.tierraVisible) { E.tierraDir.set(TIERRA_EN_LUNA.x, TIERRA_EN_LUNA.y, TIERRA_EN_LUNA.z); E.tierraR = c.Aj.get('tierraVisible') ? 0.11 : 0; }
      else if (D.tierraGrande) { E.tierraDir.set(0, -1, 0.12).normalize(); E.tierraR = c.Aj.get('tierraVisible') ? 1.0 : 0.0; }
      else E.tierraR = 0;
      E.tierraFase = Math.max(0, Math.min(1, (1 + E.sol.dot(E.tierraDir)) / 2));
    }
  }

  // después de vehiculos.actualizar
  actualizar(dt, entrada) {
    const c = this.c, D = this.datos, j = c.jugador, m = c.mundo;
    const jugando = c.estado === 'jugando' && !this.viaje && !c.esperando();
    this.cool = Math.max(0, this.cool - dt);
    this.progresoViaje(dt);
    // rótulo de la dimensión
    this.hud.dim.textContent = D.nombre.toUpperCase() + (D.gravedad !== 1 ? ' · ' + D.gravedad.toFixed(2) + ' g' : '');
    this.hud.dim.classList.toggle('oculto', this.dim === DIM_DEFECTO || c.estado === 'titulo');
    document.body.dataset.dim = this.dim;
    this.sincronizarPads();
    this.volarCohetes(dt);
    this.cohetes.actualizar(dt);
    if (!jugando) { if (this.enCohete && c.estado === 'jugando') { /* sigue el vuelo */ } else return; }
    if (this.enCohete) return;
    const enVeh = !!c.vehiculos.actual;
    const creativo = c.esCreativo();
    // ---- oxígeno
    const traje = c.inv.cuenta('traje_espacial') > 0;
    const gen = this.generadorCerca(j.x, j.y, j.z, 6);
    const dano = pasoOxigeno(this.o2, dt, { respirable: D.respirable, traje, creativo, generador: gen });
    this.asfixiando = !D.respirable && !creativo && !gen && this.o2.o2 <= 0;   // sin aire no te curas
    if (dano > 0) c.danio(dano, 'asfixia');
    const mostrarO2 = !D.respirable || this.o2.o2 < TANQUE - 0.5;
    this.hud.o2.classList.toggle('oculto', !mostrarO2 || creativo);
    this.hud.o2.firstChild.style.width = Math.round(this.o2.o2) + '%';
    this.hud.o2.classList.toggle('bajo', this.o2.o2 < 25);
    this.hud.o2.lastChild.textContent = 'OXÍGENO ' + (traje ? '· TRAJE' : '· SIN TRAJE') + (gen ? ' · RECARGANDO' : '');
    if (!D.respirable && !traje && !creativo && !gen) {
      this.tAvisoO2 -= dt;
      if (this.tAvisoO2 <= 0) { this.tAvisoO2 = 12; c.interfaz.aviso('No hay aire aquí: fabrica un traje espacial o vuelve a un generador de oxígeno', 4); }
    }
    // ---- lava
    const bx = Math.floor(j.x), bz = Math.floor(j.z);
    if (!enVeh && (m.obtener(bx, Math.floor(j.y + 0.2), bz) === B.LAVA || m.obtener(bx, Math.floor(j.y + 1.0), bz) === B.LAVA)) {
      j.vy += (-1.6 - j.vy) * (1 - Math.exp(-5 * dt));
      j.vx *= Math.exp(-3 * dt); j.vz *= Math.exp(-3 * dt);
      if (entrada && entrada.saltar) j.vy = 4.2;
      this.tLava += dt;
      if (this.tLava >= 0.5) { this.tLava = 0; if (!creativo) { c.danio(2, "lava"); c.vibrar(0.7, 0.4, 150); } }
      c.hud.quemado && c.hud.quemado();
    } else this.tLava = 0;
    // ---- portal
    this.pasoPortal(dt, enVeh);
    // ---- baterías en estaciones de carga
    this.cargarVehiculos(dt);
    // ---- ambiente
    this.efectosDimension(dt);
    // ---- eclipse visto
    if (this.dim === DIM_DEFECTO && c.cielo.astro && c.cielo.astro.eclipseSolar > 0.8 && c.cielo.astro.sol.y > 0.1 && c.Aj.get('eclipses')) {
      if (!this.vioEclipse) { this.vioEclipse = true; c.logros.sumar('eclipses'); this.prog.eclipses++; guardarProgreso(this.prog); c.hud.toast('ECLIPSE', 'El Sol se cubre por completo', 'logro'); c.logros.revisar(); }
    } else if (!c.cielo.astro || c.cielo.astro.eclipseSolar < 0.3) this.vioEclipse = false;
    // ---- aeroauto en vuelo (logro)
    const v = c.vehiculos.actual;
    if (v && v.T.clase === 'volador' && v.modo === 'vuelo' && v.y - Math.max(0, c.vehiculos.suelo(v.x, v.z, v.y + 1)) > 3) {
      this.tvuelo += dt;
      if (this.tvuelo > 4) { this.tvuelo = -1e9; c.logros.sumar('vuelosAuto'); c.logros.revisar(); }
    }
  }

  progresoViaje(dt) {
    const v = this.viaje;
    if (!v) return;
    v.t += dt;
    if (v.red && !v.red.listo) { v.red.t += dt; if (v.red.t > 9) { v.red.listo = true; } }
  }

  generadorCerca(x, y, z, r) {
    const m = this.c.mundo;
    if (this.tGen === undefined || performance.now() - this.tGen > 400) {
      this.tGen = performance.now();
      this.cacheGen = false;
      const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4;
      for (let dz = -1; dz <= 1 && !this.cacheGen; dz++) for (let dx = -1; dx <= 1 && !this.cacheGen; dx++) {
        const ch = m.chunks.get((cx + dx + 32768) * 65536 + (cz + dz + 32768));
        if (!ch || !ch.generadores) {
          if (ch && !ch.generadores) ch.generadores = this.buscarBloques(ch, B.GENERADOR_O2);
          if (!ch) continue;
        }
        for (const g of ch.generadores) {
          const gx = ch.cx * 16 + g[0], gz = ch.cz * 16 + g[2];
          if ((gx + 0.5 - x) ** 2 + (g[1] - y) ** 2 + (gz + 0.5 - z) ** 2 < r * r) { this.cacheGen = true; break; }
        }
      }
    }
    return this.cacheGen;
  }
  buscarBloques(ch, id) {
    const r = [];
    const d = ch.datos, n = (ch.alturaMax + 2) * 256;
    for (let i = 0; i < Math.min(d.length, n); i++) if (d[i] === id) r.push([i & 15, (i / 256) | 0, (i >> 4) & 15]);
    return r;
  }

  // ----------------------------------------------------------- Portal
  pasoPortal(dt, enVeh) {
    const c = this.c, j = c.jugador, m = c.mundo;
    const bx = Math.floor(j.x), bz = Math.floor(j.z);
    const dentro = !enVeh && (m.obtener(bx, Math.floor(j.y + 0.1), bz) === B.PORTAL || m.obtener(bx, Math.floor(j.y + 1.1), bz) === B.PORTAL);
    if (dentro && this.cool <= 0) {
      this.tPortal += dt;
      document.body.style.setProperty('--portal', String(Math.min(1, this.tPortal / 1.6)));
      if (this.tPortal >= 1.6) {
        this.tPortal = 0;
        const destino = this.dim === DIM_DEFECTO ? 'abismo' : this.dim === 'abismo' ? DIM_DEFECTO : null;
        if (destino && hayRuta(this.dim, destino)) this.viajar(destino, { portal: true, tipo: 'portal' });
        else c.interfaz.aviso('El portal no responde en este lugar');
      }
    } else {
      this.tPortal = Math.max(0, this.tPortal - dt * 2);
      if (this.tPortal === 0) document.body.style.setProperty('--portal', '0');
    }
  }

  // Antorcha puesta dentro de un marco de obsidiana: se enciende el portal
  alPonerBloque(x, y, z, id) {
    if (id !== B.ANTORCHA) return false;
    const c = this.c;
    const obt = (a, b, d) => c.mundo.obtener(a, b, d);
    const marco = Portal.buscarMarco(obt, x, y, z);
    if (!marco) return false;
    Portal.llenarMarco(marco, (a, b, d, i) => c.mundo.poner(a, b, d, i, true, 'mundo'));
    c.Sonido.portal ? c.Sonido.portal() : c.Sonido.logro();
    c.interfaz.aviso(this.dim === DIM_DEFECTO || this.dim === 'abismo' ? 'Portal encendido: entra y espera' : 'Portal encendido, pero aquí no tiene energía', 3.5);
    c.logros.sumar('portales'); this.prog.portales++; guardarProgreso(this.prog); c.logros.revisar();
    return true;
  }

  // Si se rompe el marco de obsidiana, el portal se apaga
  alCambiarBloque(ev) {
    if (ev.antes !== B.OBSIDIANA || ev.id === B.OBSIDIANA) return;
    const m = this.c.mundo;
    const poner = (a, b, d, i) => m.poner(a, b, d, i, true, 'mundo');
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      if (m.obtener(ev.x + dx, ev.y + dy, ev.z + dz) === B.PORTAL) { Portal.apagarPortal((a, b, d) => m.obtener(a, b, d), poner, ev.x + dx, ev.y + dy, ev.z + dz); break; }
    }
  }

  // ----------------------------------------------------------- Aeroauto: carga de batería
  cargarVehiculos(dt) {
    const c = this.c;
    this.tCarga -= dt;
    if (this.tCarga <= 0) {
      this.tCarga = 0.5;
      for (const v of c.vehiculos.lista) {
        if (v.T.clase !== 'volador') { v.cargando = false; continue; }
        v.cargando = v.combustible < v.T.tanque && this.cargadorCerca(v.x, v.y, v.z, 6.5);
      }
    }
    for (const v of c.vehiculos.lista) {
      if (!v.cargando) continue;
      if (v === c.vehiculos.actual && v.modo === 'vuelo' && v.enSuelo === false) continue;
      v.combustible = Math.min(v.T.tanque, v.combustible + 9 * dt);
      if (v === c.vehiculos.actual && (c.vehiculos.tiempo % 3) < dt) c.interfaz.aviso('Cargando batería… ' + Math.round(v.combustible) + '%', 1.2);
    }
  }
  cargadorCerca(x, y, z, r) {
    const m = this.c.mundo;
    const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ch = m.chunks.get((cx + dx + 32768) * 65536 + (cz + dz + 32768));
      if (!ch) continue;
      if (!ch.cargadores) ch.cargadores = this.buscarBloques(ch, B.CARGADOR);
      for (const g of ch.cargadores) {
        const gx = ch.cx * 16 + g[0] + 0.5, gz = ch.cz * 16 + g[2] + 0.5;
        if ((gx - x) ** 2 + (g[1] - y) ** 2 * 0.3 + (gz - z) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  // ----------------------------------------------------------- Ambiente por dimensión
  efectosDimension(dt) {
    const c = this.c, amb = c.ambiente, cam = c.camara.position, fx = this.nivelFx();
    if (c.Aj.get('particulas') === false || c.Aj.get('reducirMov')) return;
    this.tPortalFx -= dt;
    if (this.tPortalFx > 0) return;
    this.tPortalFx = 0.09 / Math.max(0.3, fx);
    const m = c.mundo, cx = Math.floor(cam.x) >> 4, cz = Math.floor(cam.z) >> 4;
    // chispas moradas junto a los portales encendidos (son fuentes de luz 11)
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ch = m.chunks.get((cx + dx + 32768) * 65536 + (cz + dz + 32768));
      if (!ch || !ch.emisores) continue;
      for (const e of ch.emisores) {
        if (e[3] !== 11 || Math.random() > 0.12 * fx) continue;
        const x = ch.cx * 16 + e[0] + Math.random(), z = ch.cz * 16 + e[2] + Math.random();
        if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > 900) continue;
        amb.nueva(4, x, e[1] + Math.random(), z, (Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 1.1, (Math.random() - 0.5) * 0.8, 0.8, 0.35, 1.0, 1, 0.09, 0.02, 0.9 + Math.random(), -0.4, 0.5, 1);
      }
    }
    if (this.dim === 'abismo') {
      for (let i = 0; i < 2 * fx; i++) {
        const a = Math.random() * PI2, r = 2 + Math.random() * 16;
        amb.nueva(4, cam.x + Math.cos(a) * r, cam.y - 1 + Math.random() * 7, cam.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.7, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.7, 1, 0.5 + Math.random() * 0.3, 0.14, 1, 0.07, 0.02, 2.5 + Math.random() * 2, -0.2, 0.4, 1);
      }
    } else if (this.dim === 'luna' && c.jugador.enSuelo && Math.hypot(c.jugador.vx, c.jugador.vz) > 2.5) {
      amb.nueva(5, c.jugador.x, c.jugador.y + 0.1, c.jugador.z, -c.jugador.vx * 0.15, 0.7, -c.jugador.vz * 0.15, 0.62, 0.6, 0.57, 0.5, 0.15, 0.4, 1.8, 1.8, 0.1, 0);
    }
  }

  // ----------------------------------------------------------- Cohetes
  pad(clave) { return this.pads.get(clave); }
  nuevoPad(x, y, z) {
    if (![x, y, z].every(Number.isFinite)) return [null, null];
    const k = claveDe(x, y, z);
    let p = this.pads.get(k);
    if (!p) { p = { x, y, z, etapas: [], estado: 'vacio', t: 0, t0: 0, piloto: null }; this.pads.set(k, p); }
    return [k, p];
  }
  sincronizarPads() {
    const cam = this.c.camara.position;
    for (const [k, p] of this.pads) {
      const lejos = (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2 > 260 * 260 || this.dim !== DIM_DEFECTO;
      if (lejos || !p.etapas.length) { this.cohetes.quitar(k); continue; }
      if (p.estado === 'vacio' || !this.cohetes.modelos.has(k)) this.cohetes.sincronizar(k, p);
    }
  }
  tiempoPad(p) {
    if (p.piloto === null || p.piloto === undefined || p.local) return p.t;
    const r = R();
    return r && r.reloj ? (r.reloj() - p.t0) / 1000 - T_CUENTA : p.t;
  }
  volarCohetes(dt) {
    const c = this.c;
    for (const [k, p] of this.pads) {
      if (p.estado === 'vacio') continue;
      if (p.local) p.t += c.estado === 'jugando' ? dt : 0; else p.t = this.tiempoPad(p);
      if (this.dim !== DIM_DEFECTO) continue;
      if (!this.cohetes.modelos.has(k)) this.cohetes.sincronizar(k, p);
      const info = this.cohetes.volar(k, p, p.t, dt, { chispas: (x, y, z, n) => c.ambiente.chispas(x, y, z, n) });
      if (!info) continue;
      this.efectosVuelo(info, p, dt);
      if (p.local && this.enCohete && this.enCohete.clave === k) this.vueloPiloto(k, p, info, dt);
      else if (info.fase === 'orbita') this.finVuelo(k, p, false);
    }
  }
  efectosVuelo(info, p, dt) {
    const c = this.c, amb = c.ambiente, fx = this.nivelFx();
    const f = info.fase;
    if (f === 'cuenta') return;
    const base = p.y + 1;
    // humo grande en la plataforma y estela
    const n = Math.max(1, Math.round((f === 'ignicion' ? 6 : f === 'ascenso1' ? 5 : 3) * fx));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * PI2, v = f === 'ascenso2' ? 0.5 : 3 + Math.random() * 6;
      const enSuelo = info.h < 20;
      const y = enSuelo ? base + 0.3 + Math.random() * 0.8 : info.boquilla - 1;
      const g = 190 + Math.random() * 50;
      amb.nueva(3, p.x + 0.5 + Math.cos(a) * (enSuelo ? 2 : 0.4), y, p.z + 0.5 + Math.sin(a) * (enSuelo ? 2 : 0.4),
        Math.cos(a) * (enSuelo ? v : 0.8), enSuelo ? 0.6 : -3 - Math.random() * 3, Math.sin(a) * (enSuelo ? v : 0.8),
        g / 255, g / 255, g / 255, 0.7, 0.9, enSuelo ? 6 : 4.5, 3 + Math.random() * 2, 0.0, 0.5);
    }
    if (fx > 0.5) amb.chispas(p.x + 0.5, info.boquilla - 0.6, p.z + 0.5, 2);
    // luz de la llama sobre el terreno
    const u = c.uniformes && c.uniformes.uLuzDin;
    if (u && (f === 'ignicion' || f === 'ascenso1' || f === 'separacion')) {
      u.value[3].set(p.x + 0.5, info.boquilla, p.z + 0.5, 46);
      c.uniformes.uLuzDinC.value[3].set(1.0, 0.62, 0.25);
      c.uniformes.uHayLuces.value = 1;
    }
    if (f !== this.ultimaFase) {
      this.ultimaFase = f;
      if (f === 'separacion') { c.interfaz.aviso('Separación de la primera etapa', 3); c.Sonido.explosion && c.Sonido.explosion(); }
      if (f === 'ignicion') c.interfaz.aviso('Ignición', 2);
    }
  }
  vueloPiloto(k, p, info, dt) {
    const c = this.c, j = c.jugador;
    j.ponerEn(p.x + 0.5, p.y + 1, p.z + 0.5);
    c.vitales.invulnerable = 1;
    const t = p.t, f = info.fase;
    // HUD: cuenta o telemetría
    if (f === 'cuenta' || f === 'ignicion' && t < 0) {
      this.hud.cuenta.classList.remove('oculto'); this.hud.vuelo.classList.add('oculto');
      this.hud.cuentaNum.textContent = textoCuenta(t);
      this.hud.cuentaSub.textContent = f === 'ignicion' ? 'IGNICIÓN' : 'T MENOS';
      this.hud.abortar.classList.remove('oculto');
    } else {
      this.hud.cuenta.classList.toggle('oculto', t > 1.5);
      this.hud.cuentaNum.textContent = 'DESPEGUE'; this.hud.cuentaSub.textContent = '';
      this.hud.abortar.classList.add('oculto');
      this.hud.vuelo.classList.remove('oculto');
      this.hud.vuelo.textContent = `ALT ${Math.round(info.h)} m · VEL ${Math.round(velocidad(t))} m/s · ETAPA ${f === 'ascenso1' ? 1 : 2}`;
    }
    // vibración
    const v = vibracion(t);
    this.sacudida = v * (c.Aj.get('vibracionCohete') ? 1 : 0) * (c.Aj.get('reducirMov') ? 0.15 : 1);
    this.tVibra -= dt;
    if (this.tVibra <= 0 && v > 0) { this.tVibra = 0.12; c.vibrar(Math.min(1, v * 0.9), Math.min(1, v * 0.7), 140); }
    // sonido del motor
    if (f !== 'cuenta') {
      if (!this.motorSonando) { this.motorSonando = true; c.Sonido.motorIniciar('aire'); }
      c.Sonido.motorActualizar(0.35 + 0.65 * Math.min(1, v + 0.2), 1, true, true, 0);
    }
    if (f === 'orbita') this.finVuelo(k, p, true);
  }
  finVuelo(k, p, piloto) {
    const c = this.c;
    p.etapas = []; p.estado = 'vacio'; p.local = false; p.t = 0;
    this.cohetes.quitar(k);
    if (this.motorSonando) { this.motorSonando = false; c.Sonido.motorParar(); }
    if (piloto) {
      this.enCohete = null;
      this.sacudida = 0;
      this.hud.cuenta.classList.add('oculto'); this.hud.vuelo.classList.add('oculto');
      this.ultimoPad = { x: p.x, y: p.y, z: p.z };
      c.logros.sumar('orbitas'); this.prog.orbitas++; guardarProgreso(this.prog);
      this.difundirPad(k, p);
      this.viajar('orbita', { tipo: 'cohete' });
      c.logros.revisar();
    }
  }
  iniciarCuenta(k) {
    const c = this.c, p = this.pads.get(k);
    if (!p || !completo(p.etapas) || p.estado !== 'vacio' || this.enCohete) return false;
    if (this.dim !== DIM_DEFECTO) return false;
    p.estado = 'cuenta'; p.t = -T_CUENTA; p.local = true;
    p.t0 = R() && R().reloj ? R().reloj() : performance.now();
    p.piloto = this.enMulti() ? R().miId : 0;
    this.enCohete = { clave: k };
    this.ultimaFase = '';
    this.ultimoPad = { x: p.x, y: p.y, z: p.z };
    this.cohetes.sincronizar(k, p);
    c.jugador.ponerEn(p.x + 0.5, p.y + 1, p.z + 0.5);
    c.cerrarContenedor(true);
    c.logros.sumar('lanzamientos'); this.prog.lanzamientos++; guardarProgreso(this.prog);
    this.difundirPad(k, p);
    c.interfaz.aviso('A bordo · cuenta regresiva iniciada', 3);
    return true;
  }
  abortar() {
    if (!this.enCohete) return false;
    const k = this.enCohete.clave, p = this.pads.get(k);
    if (!p || p.t >= 0) return false;
    p.estado = 'vacio'; p.t = 0; p.local = false;
    this.enCohete = null;
    this.hud.cuenta.classList.add('oculto');
    if (this.motorSonando) { this.motorSonando = false; this.c.Sonido.motorParar(); }
    this.c.jugador.ponerEn(p.x + 0.5, p.y + 1, p.z + 4.5);
    this.c.interfaz.aviso('Lanzamiento abortado', 2.5);
    this.difundirPad(k, p);
    return true;
  }
  enCuenta() { return !!this.enCohete; }
  bloqueaJuego() { return !!this.enCohete; }

  // Cámara de seguimiento durante el vuelo. Devuelve true si se encargó de la cámara
  camara(camara, dt) {
    if (!this.enCohete) return false;
    const p = this.pads.get(this.enCohete.clave);
    const o = p && this.cohetes.modelos.get(this.enCohete.clave);
    if (!p || !o) return false;
    const pos = o.m.grupo.position;
    const t = p.t;
    const giro = Math.PI + 0.55 + Math.max(0, t) * 0.035;   // desde el lado norte, lejos de la torre y los edificios
    const dist = 21 + Math.max(0, Math.min(14, t * 0.4));
    const alto = Math.max(0, t) < 0 ? 5 : 3 - Math.min(10, t * 0.3);
    camara.position.set(pos.x + Math.sin(giro) * dist, pos.y + 6 + alto, pos.z + Math.cos(giro) * dist);
    if (this.sacudida > 0) {
      const s = this.sacudida;
      camara.position.x += (Math.random() - 0.5) * 0.35 * s; camara.position.y += (Math.random() - 0.5) * 0.35 * s; camara.position.z += (Math.random() - 0.5) * 0.35 * s;
    }
    camara.lookAt(pos.x, pos.y + 6, pos.z);
    return true;
  }

  // ----------------------------------------------------------- Interacción con bloques y objetos
  usarBloque(o) {
    const c = this.c, id = o.id;
    if (id === B.PLATAFORMA) { this.abrirPlataforma(o.x, o.y, o.z); return true; }
    if (id === B.PANEL_CONTROL) { this.abrirControl(o.x, o.y, o.z); return true; }
    if (id === B.CONSOLA_NAV) { this.abrirNavegacion(); return true; }
    if (id === B.FABRICA) { c.abrirInventario('recetas', true); return true; }
    if (id === B.CARGADOR) {
      const v = c.vehiculos.lista.filter((q) => q.T.clase === 'volador').sort((a, b) => (a.x - o.x) ** 2 + (a.z - o.z) ** 2 - (b.x - o.x) ** 2 - (b.z - o.z) ** 2)[0];
      c.interfaz.aviso(v ? 'Estación de carga · aeroauto a ' + Math.round(Math.hypot(v.x - o.x, v.z - o.z)) + ' bloques · batería ' + Math.round(v.combustible) + '% (se carga a menos de 6 bloques)' : 'Estaciona un aeroauto a menos de 6 bloques para cargarlo', 4);
      return true;
    }
    if (id === B.GENERADOR_O2) {
      this.o2.o2 = TANQUE; c.interfaz.aviso('Tanque de oxígeno lleno · el generador recarga a menos de 6 bloques', 3);
      return true;
    }
    return false;
  }

  // Objeto en la mano al hacer clic derecho: kit de aeroauto o etapa de cohete sobre una plataforma
  usarObjeto(ob, obj) {
    const c = this.c;
    if (ob.clave === 'kit_aeroauto') {
      if (c.colocarVehiculo('aeroauto')) { if (!c.esCreativo()) c.inv.quitar('kit_aeroauto', 1); c.refrescarBarra(); }
      return true;
    }
    const etapa = ETAPAS.find((e) => ITEM_ETAPA[e] === ob.clave);
    if (etapa && obj && obj.id === B.PLATAFORMA) { this.abrirPlataforma(obj.x, obj.y, obj.z); return true; }
    return false;
  }

  clavePlataforma(x, y, z) {
    const m = this.c.mundo;
    const cp = centroPlataforma((a, b, d) => m.obtener(a, b, d), x, y, z);
    return cp;
  }

  abrirPlataforma(x, y, z) {
    const cp = this.clavePlataforma(x, y, z);
    const [k, p] = this.nuevoPad(cp.x, cp.y, cp.z);
    const c = this.c;
    c.abrirContenedor({
      tipo: 'espacio', titulo: 'PLATAFORMA DE LANZAMIENTO',
      pintar: (cuerpo, repintar) => {
        cuerpo.textContent = '';
        const sig = siguienteEtapa(p.etapas);
        cuerpo.appendChild(el('p', 'info', `Cohete: ${p.etapas.length} de ${ETAPAS.length} etapas · se ensambla en orden. Plataforma ${cp.w}×${cp.d}${cp.w < 3 ? ' (usa una de 3×3 o más para que el cohete quepa bien)' : ''}.`));
        for (const e of ETAPAS) {
          const hecho = p.etapas.includes(e);
          const f = el('div', 'espFila' + (hecho ? ' hecha' : ''));
          f.append(el('b', '', (hecho ? '✔ ' : '○ ') + NOMBRE_ETAPA[e]), el('span', '', hecho ? 'instalada' : `necesita: ${c.nombreObjeto(ITEM_ETAPA[e])} (tienes ${c.inv.cuenta(ITEM_ETAPA[e])})`));
          cuerpo.appendChild(f);
        }
        const fila = el('div', 'fila');
        if (sig) {
          const tiene = c.esCreativo() || c.inv.cuenta(ITEM_ETAPA[sig]) > 0;
          const b = el('button', tiene ? 'principal' : '', 'AÑADIR: ' + NOMBRE_ETAPA[sig].toUpperCase());
          b.type = 'button'; b.disabled = !tiene;
          b.addEventListener('click', () => { this.anadirEtapa(k, p, sig); repintar(); });
          fila.appendChild(b);
        } else {
          const b = el('button', 'principal', 'INICIAR CUENTA REGRESIVA');
          b.type = 'button';
          b.addEventListener('click', () => { if (!this.iniciarCuenta(k)) c.interfaz.aviso('No se puede lanzar ahora'); });
          fila.appendChild(b);
        }
        const d = el('button', '', 'DESMONTAR'); d.type = 'button'; d.disabled = !p.etapas.length;
        d.addEventListener('click', () => { this.desmontar(k, p); repintar(); });
        fila.appendChild(d);
        cuerpo.appendChild(fila);
        cuerpo.appendChild(el('p', 'info', 'Consejo: el panel de control del centro espacial también inicia la cuenta regresiva. Durante la cuenta, ABORTAR (o E / A) cancela el lanzamiento.'));
      },
    });
  }
  anadirEtapa(k, p, etapa) {
    const c = this.c;
    if (siguienteEtapa(p.etapas) !== etapa) return false;
    if (!c.esCreativo()) { if (!c.inv.quitar(ITEM_ETAPA[etapa], 1)) return false; c.refrescarBarra(); }
    p.etapas.push(etapa);
    this.cohetes.sincronizar(k, p);
    c.Sonido.craft();
    c.mundo.hayCambiosSinGuardar = true;
    if (completo(p.etapas)) { c.logros.sumar('cohetes'); c.logros.revisar(); c.interfaz.aviso('¡Cohete completo! Ya puedes iniciar la cuenta regresiva', 4); }
    this.difundirPad(k, p);
    return true;
  }
  desmontar(k, p) {
    const c = this.c;
    if (p.estado !== 'vacio') return;
    for (const e of p.etapas) if (!c.esCreativo()) c.inv.agregar(c.resolverId(ITEM_ETAPA[e]), 1);
    p.etapas = [];
    this.cohetes.quitar(k);
    c.refrescarBarra();
    c.mundo.hayCambiosSinGuardar = true;
    this.difundirPad(k, p);
  }

  abrirControl(x, y, z) {
    const c = this.c, m = c.mundo;
    // la plataforma más cercana (hasta 48 bloques)
    let cp = null, md = 48 * 48;
    for (let dz = -48; dz <= 48 && !cp; dz += 2) for (let dx = -48; dx <= 48; dx += 2) {
      const gx = x + dx, gz = z + dz;
      if (dx * dx + dz * dz >= md) continue;
      for (let yy = y - 6; yy <= y + 2; yy++) if (m.obtener(gx, yy, gz) === B.PLATAFORMA) { cp = this.clavePlataforma(gx, yy, gz); break; }
      if (cp) break;
    }
    c.logros.sumar('centroMando'); c.logros.revisar();
    c.abrirContenedor({
      tipo: 'espacio', titulo: 'CENTRO DE CONTROL',
      pintar: (cuerpo, repintar) => {
        cuerpo.textContent = '';
        const ast = c.cielo.astro || estadoCielo(c.hora, c.dias + c.hora);
        const hoy = c.dias + c.hora;
        const es = proximoEclipse(hoy, 'solar', 140), el2 = proximoEclipse(hoy, 'lunar', 140);
        const dias = (e) => (e ? (e.dia - hoy <= 0.05 ? 'ahora' : 'en ' + (e.dia - hoy).toFixed(1) + ' días') : 'no en los próximos 140 días');
        const bloque = el('div', 'espInfo');
        bloque.append(el('div', '', `Fase lunar: ${nombreFase(ast.fase)} (${Math.round(ast.iluminacion * 100)}% iluminada, ciclo de ${MES_LUNAR} días)`), el('div', '', `Próximo eclipse solar: ${dias(es)}`), el('div', '', `Próximo eclipse lunar: ${dias(el2)}`));
        cuerpo.appendChild(bloque);
        if (!cp) { cuerpo.appendChild(el('p', 'info', 'No hay ninguna plataforma de lanzamiento cerca (a menos de 48 bloques).')); return; }
        const [k, p] = this.nuevoPad(cp.x, cp.y, cp.z);
        cuerpo.appendChild(el('p', 'info', `Plataforma en ${cp.x}, ${cp.z} · cohete: ${p.etapas.map((e) => NOMBRE_ETAPA[e]).join(' + ') || 'vacío'} (${p.etapas.length}/${ETAPAS.length})`));
        const fila = el('div', 'fila');
        const b = el('button', 'principal', completo(p.etapas) ? 'CUENTA REGRESIVA Y LANZAR' : 'COHETE INCOMPLETO'); b.type = 'button'; b.disabled = !completo(p.etapas);
        b.addEventListener('click', () => this.iniciarCuenta(k));
        fila.appendChild(b);
        const bp = el('button', '', 'IR A LA PLATAFORMA'); bp.type = 'button';
        bp.addEventListener('click', () => { c.cerrarContenedor(true); this.abrirPlataforma(cp.x, cp.y, cp.z); });
        fila.appendChild(bp);
        cuerpo.appendChild(fila);
        cuerpo.appendChild(el('p', 'info', 'Al iniciar la cuenta subes a bordo: ' + T_CUENTA + ' segundos, ignición, ascenso, separación de etapas y órbita.'));
      },
    });
  }

  abrirNavegacion() {
    const c = this.c, desde = this.dim;
    c.abrirContenedor({
      tipo: 'espacio', titulo: 'CONSOLA DE NAVEGACIÓN',
      pintar: (cuerpo, repintar, aviso) => {
        cuerpo.textContent = '';
        cuerpo.appendChild(el('p', 'info', 'Estás en: ' + datosDim(desde).nombre));
        const dests = destinosDe(desde).filter((d) => hayRuta(desde, d) && DIMENSIONES[d] && RUTAS_CONSOLA(desde, d));
        for (const d of dests) {
          const coste = desde === 'orbita' && d === 'luna' ? COSTE_LUNA : 0;
          const ok = c.esCreativo() || !coste || c.inv.cuenta('bidon') >= coste;
          const b = el('button', ok ? 'principal' : '', `IR A: ${datosDim(d).nombre.toUpperCase()}${coste ? ` (${coste} bidones, tienes ${c.inv.cuenta('bidon')})` : ' (gratis)'}`);
          b.type = 'button'; b.disabled = !ok;
          b.addEventListener('click', () => {
            if (coste && !c.esCreativo()) { c.inv.quitar('bidon', coste); c.refrescarBarra(); }
            c.cerrarContenedor(true);
            this.viajar(d, { tipo: 'consola' });
          });
          cuerpo.appendChild(b);
        }
        cuerpo.appendChild(el('p', 'info', 'Próximamente (sistema solar):'));
        const fut = cuerposFuturos().map((q) => CUERPOS[q].nombre).join(' · ');
        cuerpo.appendChild(el('p', 'info', fut));
      },
    });
  }

  // ----------------------------------------------------------- Multijugador
  difundirPad(k, p) {
    if (!this.enMulti()) return;
    R().difundir('cohPad', { k, e: p.etapas, s: p.estado, t0: p.t0, p: p.piloto });
  }
  alMensaje(t, d, de) {
    const c = this.c, red = R();
    switch (t) {
      case 'cohPad': {
        const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(String(d.k));
        if (!m || !etapasValidas(d.e)) return true;
        let p = this.pads.get(d.k);
        if (!p) { p = { x: +m[1], y: +m[2], z: +m[3], etapas: [], estado: 'vacio', t: 0, t0: 0, piloto: null }; this.pads.set(d.k, p); }
        const antes = p.estado;
        p.etapas = d.e.slice();
        if (!p.local) {
          p.estado = d.s === 'cuenta' ? 'cuenta' : 'vacio';
          p.t0 = +d.t0 || 0; p.piloto = d.p;
          if (p.estado === 'cuenta' && antes !== 'cuenta') p.t = -T_CUENTA;
        }
        if (!p.etapas.length) this.cohetes.quitar(d.k); else if (p.estado === 'vacio') this.cohetes.sincronizar(d.k, p);
        c.mundo.hayCambiosSinGuardar = true;
        return true;
      }
      case 'dimAviso': {
        const j = red && red.jugadores[de];
        if (j && esDimension(d.dm)) c.hud.chat(null, null, j.nombre + ' viajó a ' + datosDim(d.dm).nombre, true);
        return true;
      }
      case 'dimPedir': if (red.esAnfitrion && esDimension(d.dm)) this.enviarDimension(d.dm, de); return true;
      case 'dimInicio': if (this.viaje && this.viaje.red && this.viaje.destino === d.dm) { this.viaje.red.total = d.total; if (!d.total) this.viaje.red.listo = true; } return true;
      case 'dimPaq': {
        if (esDimension(d.dm) && Array.isArray(d.l)) for (const [ck, lista] of d.l) c.mundo.aplicarPaquete(d.dm, ck, lista);
        if (this.viaje && this.viaje.red && this.viaje.destino === d.dm) this.viaje.red.recibidos += Array.isArray(d.l) ? d.l.length : 0;
        return true;
      }
      case 'dimFin': if (this.viaje && this.viaje.red && this.viaje.destino === d.dm) this.viaje.red.listo = true; return true;
      default: return false;
    }
  }

  // El anfitrión manda los cambios de bloques de una dimensión, chunk por chunk (varios chunks por mensaje)
  enviarDimension(dm, a) {
    const red = R();
    const cambios = this.c.mundo.exportarCambiosDe(dm);
    const claves = Object.keys(cambios);
    red.enviar('dimInicio', { dm, total: claves.length }, { a });
    let i = 0;
    const paso = () => {
      if (!red.conectado) return;
      const lote = [];
      for (let n = 0; n < 4 && i < claves.length; n++, i++) lote.push([claves[i], cambios[claves[i]]]);
      if (lote.length) red.enviar('dimPaq', { dm, l: lote }, { a });
      if (i < claves.length) setTimeout(paso, 30); else red.enviar('dimFin', { dm }, { a });
    };
    paso();
  }
}

// Desde una dimensión solo se llega con consola a estos destinos (las otras rutas son cohete/portal)
function RUTAS_CONSOLA(desde, a) { return (desde === 'orbita' && (a === 'superficie' || a === 'luna')) || (desde === 'luna' && a === 'orbita'); }
function CONFIGMAR() { return 48; }
