// =============================================================
//  🌠  SISTEMA SOLAR EN EL JUEGO
//  Une las piezas puras (sistemaSolar, naves, supervivencia) con el
//  mundo: estado de la nave y del traje (se guarda con la partida),
//  supervivencia por cuerpo, cielo con los demás planetas, HUD del
//  viaje, eventos en ruta, entrada atmosférica y diario.
//  La dimensión "transito" es la cabina de la nave: el viaje es
//  "en vivo" mientras caminas por ella.
// =============================================================
import { B } from '../bloques.js';
import { DIMENSIONES, datosDim, esDimension } from './cuerpos.js';
import { ATERRIZAJES, NOMBRE_ATERRIZAJE } from './cuerposSolares.js';
import * as SS from './sistemaSolar.js';
import * as N from './naves.js';
import * as V from './supervivencia.js';
import { CieloSolar } from './cieloSolar.js';
import { leerProgreso, guardarProgreso } from './progresoEspacio.js';
import { ITEM_DE_MENA, ITEMS_MENA } from './bloquesSolar.js';
import { abrirPanel } from './panelesSolar.js';
import { CABINA } from './generadoresSolar.js';

const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };
export const REABASTECE = new Set(['orbita', 'orbita_luna', 'orbita_marte', 'orbita_jupiter', 'marte', 'mercurio']);
export const ACELERACIONES = [1, 2, 5, 10, 25, 50];
export const GRAN_TOUR = ['mercurio', 'venus', 'luna', 'marte', 'cinturon', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton'];
const GIGANTES = new Set(['jupiter', 'saturno', 'urano', 'neptuno']);
const A_LA_DERIVA = new Set(['cinturon', 'kuiper', 'fobos', 'deimos', 'orbita_luna', 'orbita_marte', 'orbita_jupiter', 'saturno']);
const FUENTE = { mercurio_liquido: 'mercurio', venusita: 'venus', hematita: 'marte', platino: 'cinturon', espinela: 'fobos', olivino: 'deimos', amoniaco: 'jupiter', sal_europa: 'europa', magnetita: 'ganimedes', carbono_calisto: 'calisto', tolina: 'titan', deuterio: 'urano', diamante_helado: 'neptuno', nitrogeno_solido: 'pluton', polvo_cometario: 'kuiper' };
export const MINERALES = [...ITEMS_MENA.map((m) => ({ ...m, cuerpo: FUENTE[m.clave] })), { clave: 'azufre', nombre: 'Azufre', color: '#e6d04a', cuerpo: 'venus' }, { clave: 'hielo_anillo', nombre: 'Hielo de los anillos', color: '#eef0f6', cuerpo: 'saturno' }, { clave: 'hielo_seco', nombre: 'Hielo seco', color: '#e6e2ea', cuerpo: 'marte' }];
export const cuerpoDeDim = (dim) => { const d = DIMENSIONES[dim]; return d ? (d.cuerpo === 'abismo' || d.cuerpo === 'transito' ? null : d.cuerpo) : null; };

export class Solar {
  static get MINERALES() { return MINERALES; }
  constructor(esp) {
    this.esp = esp; this.c = esp.c;
    this.nave = null;
    this.traje = V.nuevoTraje(); this.en = V.nuevaEnergia();
    this.viaje = null;          // viaje en vivo
    this.sec = null;            // secuencia corta: despegue / entrada
    this.pendiente = null;      // evento en ruta esperando respuesta
    this.rescatar = false;
    this.cieloS = new CieloSolar(esp.c.escena, esp.c.camara);
    this.tVenus = 0; this.tRad = 0; this.tTormenta = 0; this.tAviso = 0; this.tRayo = 0; this.tPolvo = 0; this.tComp = 0; this.diasAcum = 0; this.tSync = 0;
    this.sinCielo = 0;
    this.crearHud();
  }
  get prog() { return this.esp.prog; }
  get dim() { return this.esp.dim; }

  // ----------------------------------------------------------- Estado y guardado
  reiniciar() { this.nave = null; this.traje = V.nuevoTraje(); this.en = V.nuevaEnergia(); this.viaje = null; this.sec = null; this.pendiente = null; this.rescatar = false; this.ocultarHud(); }
  importar(d) {
    this.reiniciar();
    const s = d && d.sol;
    if (s && typeof s === 'object') {
      this.traje = V.trajeValido(s.traje);
      if (Number.isFinite(s.e)) this.en.e = Math.max(0, Math.min(V.ENERGIA_MAX, s.e));
      this.nave = N.naveValida(s.nave);
      const v = s.viaje;
      if (this.nave && v && typeof v === 'object' && SS.CUERPOS_MAPA.concat(['sol']).includes(v.destino) && SS.CUERPOS_MAPA.includes(v.origen)) {
        this.viaje = { origen: v.origen, destino: v.destino, prog: Math.max(0, Math.min(1, +v.prog || 0)), dur: Math.max(5, +v.dur || 60), diasTot: Math.max(0, +v.diasTot || 1), diaIni: +v.diaIni || 0, eventos: Array.isArray(v.eventos) ? v.eventos.filter((e) => e && N.ELECCIONES[e.tipo]).slice(0, 8).map((e) => ({ tipo: e.tipo, pos: +e.pos || 0.5, resuelto: !!e.resuelto, fuerza: +e.fuerza || 0.6 })) : [], dist: +v.dist || 50, desvios: 0 };
      }
    }
    if (this.dim === 'transito' && !this.nave) this.rescatar = true;
  }
  exportar() {
    const v = this.viaje;
    return {
      traje: { ...this.traje }, e: Math.round(this.en.e), nave: this.nave ? { ...this.nave, mejoras: { ...this.nave.mejoras }, comb: Math.round(this.nave.comb * 10) / 10 } : undefined,
      viaje: v ? { origen: v.origen, destino: v.destino, prog: +v.prog.toFixed(4), dur: v.dur, diasTot: v.diasTot, diaIni: v.diaIni, dist: v.dist, eventos: v.eventos } : undefined,
    };
  }

  // ----------------------------------------------------------- HUD
  crearHud() {
    const raiz = this.esp.hud.raiz;
    const h = this.h = {};
    h.btn = el('button', 'espBtnMapa', 'MAPA'); h.btn.type = 'button'; h.btn.title = 'Mapa del sistema solar (J)';
    h.btn.addEventListener('click', () => this.abrirMapa());
    h.traje = el('div', 'oculto'); h.traje.id = 'espTraje'; h.traje.innerHTML = '<span></span><i></i>';
    h.viaje = el('div', 'oculto'); h.viaje.id = 'espViaje';
    h.vTitulo = el('b'); h.vBarra = el('div', 'barra'); h.vBarra.innerHTML = '<i></i>'; h.vInfo = el('span');
    h.vVel = el('div', 'vel');
    h.vMapa = el('button', '', 'MAPA'); h.vMapa.type = 'button'; h.vMapa.addEventListener('click', () => this.abrirMapa());
    h.viaje.append(h.vTitulo, h.vBarra, h.vInfo, h.vVel, h.vMapa);
    h.evento = el('div', 'oculto'); h.evento.id = 'espEvento';
    h.fx = el('div', 'oculto'); h.fx.id = 'espFx'; h.fxTxt = el('b'); h.fxBarra = el('div', 'barra'); h.fxBarra.innerHTML = '<i></i>'; h.fx.append(h.fxTxt, h.fxBarra);
    h.rayo = el('div', 'oculto'); h.rayo.id = 'espRayo';
    raiz.append(h.btn, h.traje, h.viaje, h.evento, h.fx, h.rayo);
  }
  alSalir() { this.sec = null; this.pendiente = null; this.ocultarHud(); this.cieloS.ocultar(); this.h.traje.classList.add('oculto'); this.h.btn.classList.add('oculto'); }
  ocultarHud() { for (const k of ['viaje', 'evento', 'fx', 'rayo']) this.h[k].classList.add('oculto'); document.body.classList.remove('entrando', 'despegando'); }

  // ----------------------------------------------------------- Dimensión nueva / carga terminada
  alViajar(destino, tipo) {
    const D = datosDim(destino), p = this.prog;
    if (destino !== 'transito' && tipo !== 'aterrizaje' && this.nave && this.nave.enVuelo) { this.nave = null; this.viaje = null; this.pendiente = null; this.ocultarHud(); this.c.interfaz.aviso('Abandonaste la nave en el espacio: tendrás que fabricar otra', 6); }
    p.aterrizajes[destino] = (p.aterrizajes[destino] || 0) + 1;
    this.tVenus = 0; this.tRad = 0; this.tTormenta = 0;
    this.cieloS.ocultar();
    if (destino !== 'transito') this.hito('visita_' + destino);
    guardarProgreso(p);
    if (D.estacion || destino === 'orbita') { if (destino !== 'orbita' || this.nave) this.logro('sistema_estacion'); }
  }
  alTerminarCarga(v) {
    const D = datosDim(v.destino), c = this.c;
    if (v.destino === 'transito') {
      if (this.nave && this.viaje) c.interfaz.aviso('A bordo · el viaje sigue en marcha: usa el panel o la consola para ajustar el tiempo', 5);
      return;
    }
    // la nave aterriza con el jugador
    if (this.nave && this.nave.enVuelo && v.tipo === 'aterrizaje') {
      this.nave.enVuelo = false; this.nave.cuerpo = null;
      this.colocarNaveCerca();
      const base = { mercurio: 'mercurio', venus: 'venus', marte: 'marte', fobos: 'fobos', deimos: 'deimos', cinturon: 'cinturon', jupiter: 'jupiter', io: 'io', europa: 'europa', ganimedes: 'ganimedes', calisto: 'calisto', saturno: 'saturno', titan: 'titan', urano: 'urano', neptuno: 'neptuno', pluton: 'pluton', kuiper: 'kuiper' }[v.destino];
      if (base) this.logro('sistema_pisa_' + base);
      if (D.entrada > 0) this.logro('sistema_entrada');
      this.revisarTour();
    }
    if (D.amb && D.amb.nota) c.interfaz.aviso(D.nombre + ': ' + D.amb.nota, 5);
    if (!c.inv.cuenta('traje_espacial') && D.amb && (D.amb.req.t + D.amb.req.r + D.amb.req.p) > 0) c.interfaz.aviso('Sin traje espacial no sobrevivirás aquí', 5);
  }
  // Coloca el vehículo de la nave delante del jugador probando los cuatro lados
  intentarColocar(tipo, comb) {
    const c = this.c, j = c.jugador, y0 = j.yaw;
    let hecho = false;
    for (let i = 0; i < 4 && !hecho; i++) {
      j.yaw = y0 + i * Math.PI / 2;
      const n0 = c.vehiculos.lista.length;
      if (c.colocarVehiculo(tipo) && c.vehiculos.lista.length > n0) { const v = c.vehiculos.lista[c.vehiculos.lista.length - 1]; if (comb !== undefined) v.combustible = comb; hecho = true; }
    }
    j.yaw = y0;
    return hecho;
  }
  colocarNaveCerca() { if (this.nave && !this.intentarColocar(this.nave.tipo, this.nave.comb)) this.c.interfaz.aviso('No hay espacio para posar la nave: despeja un poco el terreno', 4); }
  naveVehiculo() { return this.c.vehiculos.lista.find((v) => N.esNave(v.tipo)) || null; }
  naveCerca(r = 30) {
    const v = this.naveVehiculo(), j = this.c.jugador;
    return v && Math.hypot(v.x - j.x, v.z - j.z) <= r ? v : null;
  }

  // ----------------------------------------------------------- Logros, hitos y diario
  logro(id) { const l = this.c.logros; if (!l.s.tiene[id]) { l.tuvo(id); l.revisar(); } }
  hito(clave) { const p = this.prog; if (!p.hitos[clave]) { p.hitos[clave] = Date.now(); guardarProgreso(p); return true; } return false; }
  revisarTour() {
    const d = this.prog.dims, vistos = Object.keys(d).filter((k) => !k.startsWith('orbita') && k !== 'superficie' && k !== 'abismo' && k !== 'transito').length;
    if (vistos >= 10) this.logro('sistema_cuerpos_10');
    if (GRAN_TOUR.every((k) => d[k])) this.logro('sistema_gran_tour');
  }
  catalogar(clave) {
    const p = this.prog;
    if (!p.minerales[clave]) { p.minerales[clave] = 0; const m = MINERALES.find((q) => q.clave === clave); if (m) this.c.hud.toast('DIARIO: ' + m.nombre.toUpperCase(), 'Nuevo mineral catalogado', 'logro'); }
    p.minerales[clave]++;
    guardarProgreso(p);
    const n = Object.keys(p.minerales).length;
    if (n >= 5) this.logro('sistema_diario_5');
    if (n >= MINERALES.length) this.logro('sistema_diario_todo');
  }
  // Un bloque se rompió: ¿es un mineral del sistema solar?
  alCambiarBloque(ev) {
    if (ev.id !== B.AIRE || ev.origen === 'mundo' || ev.origen === 'remoto') return;
    const it = ITEM_DE_MENA[ev.antes];
    if (it) this.catalogar(it);
    else if (ev.antes === B.AZUFRE) this.catalogar('azufre');
    else if (ev.antes === B.ANILLO_HIELO) this.catalogar('hielo_anillo');
    else if (ev.antes === B.HIELO_SECO) this.catalogar('hielo_seco');
  }

  // ----------------------------------------------------------- Cada cuadro
  // gen: ¿hay un generador de oxígeno cerca? (refugio)
  actualizar(dt, jugando, enVeh, creativo, gen) {
    const c = this.c, D = this.esp.datos, j = c.jugador;
    if (this.rescatar && c.estado === 'jugando' && !this.esp.viaje) { this.rescatar = false; this.esp.viajar('superficie', { tipo: 'reaparecer', pos: c.spawn ? [c.spawn.x, c.spawn.y, c.spawn.z] : null }); return; }
    this.tSync -= dt;
    if (this.tSync <= 0) { this.tSync = 1; this.sincronizarNave(); }
    this.pasoSecuencia(dt);
    this.pasoViaje(dt);
    const visible = c.estado === 'jugando' || c.estado === 'contenedor';
    this.h.btn.classList.toggle('oculto', !visible || c.estado === 'contenedor' || !(this.prog.orbitas > 0 || this.dim !== 'superficie' || this.nave));
    if (!jugando) return;
    this.supervivencia(dt, D, creativo, gen, enVeh);
    this.entorno(dt, D, enVeh, creativo, gen);
    this.revisarExploracion(D, j, dt);
  }

  supervivencia(dt, D, creativo, gen, enVeh) {
    const c = this.c, amb = D.amb;
    const tieneTraje = c.inv.cuenta('traje_espacial') > 0;
    const solY = c.cielo.espacial ? c.cielo.espacial.sol.y : 1;
    const tor = D.tormenta ? V.intensidadTormenta(D.tormenta, c.dias + c.hora, c.mundo.semilla) : 0;
    this.tormenta = D.tormenta === 'polvo' && c.Aj.get('tormentasEspacio') !== false ? tor : 0;
    const r = V.paso(this.en, dt, amb, this.traje, { creativo, refugio: !!gen, traje: tieneTraje, solY, tormenta: tor });
    this.res = r;
    if (r.danio > 0) c.danio(r.danio, r.causa);
    // batería de iones: recarga automática de la energía del traje
    if (amb && !creativo && this.en.e < 8 && tieneTraje && c.inv.cuenta('bateria') > 0) { c.inv.quitar('bateria', 1); c.refrescarBarra(); this.en.e = Math.min(V.ENERGIA_MAX, this.en.e + V.PILA_ENERGIA); c.interfaz.aviso('Batería usada: +' + V.PILA_ENERGIA + ' de energía del traje', 3); }
    // HUD del traje
    const mostrar = !!amb && (amb.req.t + amb.req.r + amb.req.p) > 0 && !creativo;
    this.h.traje.classList.toggle('oculto', !mostrar);
    if (mostrar) {
      const q = r.req, f = r.falta;
      const marca = (k, n) => (q[k] ? `${n} ${tieneTraje ? Math.min(this.traje[k], 3) : 0}/${q[k]}${f[k] ? '!' : ''}` : '');
      this.h.traje.firstChild.textContent = ['ENERGÍA ' + Math.round(this.en.e) + '%', marca('t', 'TÉRM'), marca('r', 'RAD'), marca('p', 'PRES'), Math.round(r.temp) + '°C'].filter(Boolean).join(' · ');
      this.h.traje.lastChild.style.width = Math.round(this.en.e) + '%';
      this.h.traje.classList.toggle('mal', !r.protegido);
      if (!r.protegido) { this.tAviso -= dt; if (this.tAviso <= 0) { this.tAviso = 8; c.interfaz.aviso(this.textoFalta(r), 4); } }
    }
    // logros por aguantar
    if (!creativo && r.protegido && tieneTraje && !gen) {
      if (this.dim === 'venus') { this.tVenus += dt; if (this.tVenus > 60) this.logro('sistema_venus_vivo'); }
      if ((this.dim === 'io' || this.dim === 'jupiter') && this.traje.r >= 3) { this.tRad += dt; if (this.tRad > 60) this.logro('sistema_radiacion'); }
      if (this.tormenta > 0.5 && this.dim === 'marte') { this.tTormenta += dt; if (this.tTormenta > 20) this.logro('sistema_tormenta_polvo'); }
    }
  }
  textoFalta(r) {
    const o = [];
    if (r.falta.t) o.push(r.temp > 0 ? 'calor extremo: mejora térmica' : 'frío extremo: mejora térmica');
    if (r.falta.r) o.push('radiación: mejora anti-radiación');
    if (r.falta.p) o.push('presión/ácido: mejora anti-presión');
    return 'Sin protección suficiente · ' + o.join(' · ') + ' · o energía agotada (vuelve a una base)';
  }

  // viento, tormentas, rayos, caídas al vacío
  entorno(dt, D, enVeh, creativo, gen) {
    const c = this.c, j = c.jugador, fx = this.esp.nivelFx();
    const tormentas = c.Aj.get('tormentasEspacio') !== false;
    if (D.viento && !enVeh && !gen && j.y > 5) {
      const a = c.dias * 0.7 + c.hora * 2.2, w = D.viento * (0.5 + 0.5 * Math.sin(a * 3.1));
      if (!j.enSuelo || w > 2.2) { j.moverEje(0, Math.cos(a) * w * dt * (j.enSuelo ? 0.5 : 1), c.mundo); j.moverEje(2, Math.sin(a) * w * dt * (j.enSuelo ? 0.5 : 1), c.mundo); }
    }
    // tormenta de rayos (Júpiter)
    if (D.tormenta === 'rayos' && tormentas) {
      const it = V.intensidadTormenta('rayos', c.dias + c.hora, c.mundo.semilla);
      this.tormenta = it;
      const expuesto = !gen && !c.mundo.esSolido(Math.floor(j.x), Math.floor(j.y) + 4, Math.floor(j.z));
      this.tRayo -= dt;
      if (this.tRayo <= 0) {
        this.tRayo = 0.5;
        if (Math.random() < V.probRayo(it, expuesto) && !creativo) { this.rayo(); c.danio(V.DANO_RAYO, 'rayo'); }
        else if (it > 0.4 && Math.random() < 0.12) this.rayo(true);
      }
    }
    // polvo de la tormenta marciana
    if (this.tormenta > 0.1 && fx > 0.3 && c.Aj.get('particulas') !== false && !c.Aj.get('reducirMov')) {
      this.tPolvo -= dt;
      if (this.tPolvo <= 0) {
        this.tPolvo = 0.06 / (fx * (0.4 + this.tormenta));
        const cam = c.camara.position, a = Math.random() * 6.283, r = 3 + Math.random() * 18;
        c.ambiente.nueva(5, cam.x + Math.cos(a) * r, cam.y + Math.random() * 4 - 1, cam.z + Math.sin(a) * r, 7 + Math.random() * 6, 0.1, (Math.random() - 0.5) * 3, 0.82, 0.45, 0.25, 0.5, 0.2, 0.4, 1.6, 1.2, 0.1, 0);
      }
    }
    // caer al vacío: gigantes -> aplastamiento y rescate; el resto -> rescate sin daño
    if (j.y < 12 && (GIGANTES.has(this.dim) || A_LA_DERIVA.has(this.dim)) && !creativo && c.estado === 'jugando') {
      const i = c.mundo.gen.buscarInicio();
      j.ponerEn(i.x, i.y + 0.2, i.z); j.vx = j.vy = j.vz = 0; c.vitales.cima = null;
      if (GIGANTES.has(this.dim) && this.dim !== 'saturno') { c.danio(6, 'presion'); c.interfaz.aviso('Caíste a las capas profundas: la presión casi te aplasta. Vuelves a la base', 5); } else c.interfaz.aviso('Te alejaste a la deriva: un dron te devuelve a la base', 4);
    }
  }
  rayo(solo) {
    const h = this.h.rayo; h.classList.remove('oculto'); h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash');
    this.c.Sonido.explosion && !solo && this.c.Sonido.explosion();
    setTimeout(() => h.classList.add('oculto'), 260);
  }
  // exploración: hitos por lugar
  revisarExploracion(D, j, dt) {
    this.tComp -= dt;
    if (this.tComp > 0) return;
    this.tComp = 0.5;
    const d = this.dim, m = this.c.mundo, x = Math.floor(j.x), z = Math.floor(j.z), y = Math.floor(j.y);
    if (d === 'marte') {
      if (j.y > 88 && Math.hypot(j.x + 240, j.z + 170) < 40) this.logro('sistema_volcan_marte');
      if (j.y < 36 && Math.abs(j.z - 150) < 50) this.logro('sistema_canon_marte');
      if (Math.abs(j.z) > 285) this.logro('sistema_casquete');
    }
    if (d === 'europa' && m.obtener(x, y + 1, z) === B.AGUA) this.logro('sistema_oceano_europa');
    if (d === 'titan' && (m.obtener(x, y, z) === B.METANO || m.obtener(x, y + 1, z) === B.METANO)) this.logro('sistema_metano');
    if (D.generador && ['marte', 'ganimedes', 'calisto', 'pluton'].includes(d)) {
      const ch = m.chunks.get(((x >> 4) + 32768) * 65536 + ((z >> 4) + 32768));
      if (ch && ch.datos) { const y0 = Math.max(1, y - 2); for (let yy = y0; yy < y0 + 6; yy++) { if (ch.datos[yy * 256 + (z & 15) * 16 + (x & 15)] === B.RUNA) { this.logro('sistema_ruinas'); break; } } }
      // las runas son raras: se busca alrededor
      for (let dz = -4; dz <= 4 && !this.c.logros.s.tiene.sistema_ruinas; dz += 2) for (let dx = -4; dx <= 4; dx += 2) for (let dy = -1; dy <= 6; dy += 1) if (m.obtener(x + dx, y + dy, z + dz) === B.RUNA) { this.logro('sistema_ruinas'); dz = 9; dx = 9; break; }
    }
  }

  // ----------------------------------------------------------- Niebla y cielo
  nieblaAjuste(D) {
    if (D.cielo !== 'color') return null;
    const n = D.cieloColor.niebla, t = this.tormenta || 0;
    return { cerca: n[0] * (1 - 0.8 * t), lejos: n[1] * (1 - 0.72 * t), color: null };
  }
  preCielo(hora, dias, D) {
    const c = this.c, E = c.cielo.espacial;
    E.solR = undefined; E.brillo = 1;
    c.cielo.tormenta = this.tormenta || 0;
    const cuerpo = cuerpoDeDim(this.dim);
    const lejos = (c.cielo.domo.scale.x / 0.9) || 300;
    if (this.dim === 'transito') { this.transitoCielo(hora, dias, D, lejos); return; }
    const propio = D.generador === 'luna' || D.generador === 'orbita';
    if (cuerpo && !propio) { const info = CieloSolar.sol(cuerpo, dias + hora); E.solR = info.radio; E.brillo = info.brillo; E.tierraR = 0; }
    const hayPlanetas = cuerpo && c.Aj.get('planetasCielo') !== false && (D.cielo === 'vacio' || (D.cielo === 'color' && D.cieloColor.estrellas !== false));
    if (!hayPlanetas) { this.cieloS.ocultar(); return; }
    this.cieloS.actualizar({ cuerpo, dim: D, diaAbs: dias, hora, ciclo: D.cicloDias || 1, lejos, transito: null });
    if (D.cielo === 'color') { const k = Math.max(0.05, 1 - 0.95 * c.cielo.factorDia); for (const d of this.cieloS.discos) if (d.visible) d.material.uniforms.alfa.value *= k; }
  }
  transitoCielo(hora, dias, D, lejos) {
    const c = this.c, v = this.viaje, n = this.nave;
    const E = c.cielo.espacial;
    const origen = (v && v.origen) || (n && n.cuerpo) || 'tierra', destino = (v && v.destino) || origen, prog = v ? v.prog : 1;
    const dia = dias + hora;
    const a = SS.posicion(origen, dia), b = destino === 'sol' ? { x: 0, y: 0 } : SS.posicion(destino, dia);
    const pos = { x: a.x + (b.x - a.x) * prog, y: a.y + (b.y - a.y) * prog };
    const r = Math.hypot(pos.x, pos.y) || 1, ua = Math.pow(r / 100, 1 / 0.45);
    E.solR = Math.max(0.0045, Math.min(0.1, 0.0265 / ua)) * (destino === 'sol' ? 1 + 6 * Math.pow(prog, 3) : 1); E.brillo = Math.max(0.3, Math.min(1.5, 1 / (ua * ua)));
    E.tierraR = 0;
    this.cieloS.actualizar({ cuerpo: null, dim: D, diaAbs: dias, hora, ciclo: D.cicloDias || 1, lejos, solOut: E.sol, transito: { origen, destino: destino === 'sol' ? 'mercurio' : destino, prog, pos, destPos: b, orbitando: !v } });
    this.pos = pos;
  }

  // ----------------------------------------------------------- Naves
  // Clic derecho con un kit de nave: la coloca (una sola nave por jugador)
  usarKit(clave) {
    const tipo = { kit_lanzadera: 'lanzadera', kit_nave_ionica: 'nave_ionica', kit_nave_salto: 'nave_salto' }[clave];
    const c = this.c;
    if (!tipo) return false;
    if (this.nave) { c.interfaz.aviso('Ya tienes una nave: desguázala en la pestaña NAVE para poner otra', 4); return true; }
    if (this.intentarColocar(tipo)) {
      if (!c.esCreativo()) c.inv.quitar(clave, 1);
      c.refrescarBarra();
      this.nave = N.nuevaNave(tipo);
      const v = this.naveVehiculo(); if (v) v.combustible = this.nave.comb;
      this.logro('sistema_primera_nave'); if (tipo === 'nave_ionica') this.logro('sistema_nave_ionica'); if (tipo === 'nave_salto') this.logro('sistema_nave_salto');
      c.interfaz.aviso(N.TIERS[tipo].nombre + ' lista · acércate y pulsa E para abrir la consola · fabrica bidones para el combustible', 5);
    } else c.interfaz.aviso('No hay espacio libre para la nave: busca un lugar despejado y plano', 4);
    return true;
  }
  // E sobre la nave: consola
  alSubirNave(v) {
    if (!this.nave) { this.nave = N.naveValida({ tipo: v.tipo, comb: v.combustible }) || N.nuevaNave(v.tipo); }
    this.abrirMapa('nave');
    return true;
  }
  // mantiene el vehículo y el estado de la nave de acuerdo (combustible visible, nave "perdida")
  sincronizarNave() {
    const n = this.nave, v = this.naveVehiculo();
    if (n && !n.enVuelo && v) v.combustible = n.comb;
    else if (!n && v) this.nave = N.naveValida({ tipo: v.tipo, comb: v.combustible });
  }
  desguazar() {
    const c = this.c, n = this.nave;
    if (!n || n.enVuelo) return false;
    const v = this.naveCerca(12);
    if (!v) { c.interfaz.aviso('Acércate a la nave para desguazarla', 3); return false; }
    c.vehiculos.quitar(v);
    c.inv.agregar(c.resolverId(N.TIERS[n.tipo].kit), 1);
    c.refrescarBarra();
    this.nave = null;
    return true;
  }
  repostarNave(item) {
    const c = this.c, n = this.nave;
    if (!n || n.enVuelo) return false;
    if (!c.esCreativo() && c.inv.cuenta(item) < 1) { c.interfaz.aviso('No tienes ' + c.nombreObjeto(item), 3); return false; }
    const r = N.repostar(n, item);
    if (!r) { c.interfaz.aviso('El tanque está lleno', 2.5); return false; }
    if (!c.esCreativo()) c.inv.quitar(item, 1);
    c.refrescarBarra(); c.Sonido.clic();
    return true;
  }
  repararNave() {
    const c = this.c, n = this.nave;
    if (!n) return false;
    if (n.casco >= 100) { c.interfaz.aviso('El casco está intacto', 2); return false; }
    if (!c.esCreativo() && !c.inv.quitar('hierro', 2)) { c.interfaz.aviso('Necesitas 2 lingotes de hierro', 3); return false; }
    n.casco = Math.min(100, n.casco + 25); c.refrescarBarra(); c.Sonido.craft();
    return true;
  }
  instalarEscudo() {
    const c = this.c, n = this.nave;
    if (!n || n.mejoras.escudo) return false;
    if (!c.esCreativo() && !c.inv.quitar('escudo_termico', 1)) { c.interfaz.aviso('Necesitas un escudo térmico (fábrica)', 3); return false; }
    n.mejoras.escudo = true; c.refrescarBarra(); c.Sonido.craft(); this.logro('sistema_escudo');
    return true;
  }
  // Surtidor de una estación o base
  usarSurtidor() {
    const c = this.c, n = this.nave;
    if (!n) { c.interfaz.aviso('Estación de reabastecimiento: necesitas una nave', 3.5); return true; }
    const T = N.TIERS[n.tipo];
    if (n.enVuelo || this.dim === 'transito') { n.comb = REABASTECE.has(this.dim) ? T.tanque : n.comb; }
    if (REABASTECE.has(this.dim)) {
      if (n.comb >= T.tanque - 1) c.interfaz.aviso('Tanque lleno', 2);
      else { n.comb = T.tanque; c.interfaz.aviso('Nave reabastecida por la estación', 3.5); c.Sonido.craft(); this.logro('sistema_reabastece'); }
    } else if (n.comb < T.tanque - 1) {
      const v = this.naveCerca(40);
      if (!v && !n.enVuelo) { c.interfaz.aviso('Acerca la nave (menos de 40 bloques) al surtidor', 3); return true; }
      if (this.repostarNave('bidon')) c.interfaz.aviso('Puesto de reabastecimiento: +' + N.COMB_BIDON + ' (usa 1 bidón)', 3);
      else c.interfaz.aviso('Este puesto no tiene reservas: necesitas bidones de combustible', 3.5);
    } else c.interfaz.aviso('Tanque lleno', 2);
    return true;
  }
  // Mejora del traje
  instalarMejora(clave) {
    const c = this.c, tipo = { mejora_termica: 't', mejora_radiacion: 'r', mejora_presion: 'p' }[clave];
    if (!tipo) return false;
    const m = V.mejorar(this.traje, tipo);
    if (!m.ok) { c.interfaz.aviso('Esa mejora ya está al máximo', 3); return true; }
    const extra = m.nuevo === 3 ? { t: 'mercurio_liquido', r: 'hematita', p: 'platino' }[tipo] : null;
    if (!c.esCreativo()) {
      if (c.inv.cuenta(clave) < m.costo) { c.interfaz.aviso(`Nivel ${m.nuevo}: necesitas ${m.costo} mejoras (tienes ${c.inv.cuenta(clave)})`, 4); return true; }
      if (extra && c.inv.cuenta(extra) < 1) { c.interfaz.aviso(`Nivel 3: además necesitas 1 ${c.nombreObjeto(extra)} (se encuentra en el sistema solar)`, 5); return true; }
      c.inv.quitar(clave, m.costo); if (extra) c.inv.quitar(extra, 1); c.refrescarBarra();
    }
    this.traje[tipo] = m.nuevo; c.Sonido.craft();
    c.interfaz.aviso('Traje mejorado: ' + { t: 'térmico', r: 'anti-radiación', p: 'anti-presión' }[tipo] + ' nivel ' + m.nuevo, 4);
    this.logro('sistema_mejora');
    if (this.traje.t >= 3 && this.traje.r >= 3 && this.traje.p >= 3) this.logro('sistema_traje_max');
    return true;
  }
  recargarTraje() {
    const c = this.c;
    if (this.en.e > 90) { c.interfaz.aviso('La energía del traje está llena', 2.5); return; }
    if (!c.esCreativo() && !c.inv.quitar('bateria', 1)) { c.interfaz.aviso('Necesitas una batería de iones', 3); return; }
    this.en.e = Math.min(V.ENERGIA_MAX, this.en.e + V.PILA_ENERGIA); c.refrescarBarra(); c.Sonido.clic();
  }

  // ----------------------------------------------------------- Mapa y planificación
  origenActual() {
    if (this.dim === 'transito' && this.nave) return this.viaje ? null : this.nave.cuerpo;
    return cuerpoDeDim(this.dim);
  }
  gravedadActual() { return this.dim === 'transito' ? 0 : datosDim(this.dim).gravedad; }
  abrirMapa(tab = 'mapa') { abrirPanel(this, tab); }
  plan(destino) {
    const n = this.nave, o = this.origenActual();
    if (!n) return { posible: false, razon: 'Necesitas una nave: fabrica un kit y colócalo' };
    if (!o) return { posible: false, razon: this.viaje ? 'Ya estás en ruta' : 'Aquí no puedes iniciar un viaje' };
    const dia = this.c.dias + this.c.hora;
    const p = N.planViaje(n, o, destino, dia, this.dim === 'transito' ? 0 : this.gravedadActual());
    if (p.posible && this.dim !== 'transito') {
      const d = N.puedeDespegar(n, this.dim, this.gravedadActual());
      if (!d.ok) { p.posible = false; p.razon = d.razon; }
      else if (!this.naveCerca(30)) { p.posible = false; p.razon = 'Acércate a la nave (menos de 30 bloques)'; }
    }
    if (p.posible && n.casco < N.CASCO_MIN) { p.posible = false; p.razon = 'Casco dañado: repáralo antes'; }
    p.ventana = SS.proximaVentana(o, destino, dia);
    return p;
  }
  // ¿en multijugador un invitado no manda el reloj del mundo?
  puedeEsperar() { return !this.esp.enMulti() || window.Red.esAnfitrion; }
  esperarVentana(destino) {
    const c = this.c, o = this.origenActual();
    if (!o || !this.puedeEsperar()) { c.interfaz.aviso('Solo el anfitrión puede adelantar el tiempo', 3); return false; }
    const dia = c.dias + c.hora, w = SS.proximaVentana(o, destino, dia);
    if (!w) return false;
    const salto = Math.max(0, Math.ceil(w.mejor - dia));
    if (salto > 0) { c.saltarDias(salto); c.interfaz.aviso('Esperas ' + salto + ' días hasta la ventana de lanzamiento', 4); }
    return true;
  }

  // ----------------------------------------------------------- Despegue y viaje en vivo
  despegar(destino) {
    const c = this.c, n = this.nave, p = this.plan(destino);
    if (!p.posible) { c.interfaz.aviso(p.razon, 4); return false; }
    if (this.sec || this.viaje) return false;
    const o = this.origenActual();
    if (!c.esCreativo()) n.comb = Math.max(0, n.comb - p.comb);
    c.cerrarContenedor(true);
    this.logro('sistema_despegue');
    if (p.err < 5 && !p.local) this.logro('sistema_ventana');
    this.prog.viajes++; guardarProgreso(this.prog);
    const dia = c.dias + c.hora;
    const ev = N.eventosRuta(o, destino, c.mundo.semilla, dia);
    const viaje = { origen: o, destino, prog: 0, dur: Math.max(20, p.seg), diasTot: p.dias, diaIni: dia, eventos: ev, dist: p.dist, desvios: 0 };
    const sale = () => {
      const v = this.naveVehiculo(); if (v) c.vehiculos.quitar(v);
      n.enVuelo = true; n.cuerpo = null; this.viaje = viaje; this.diasAcum = 0;
      if (this.dim === 'transito') { this.hito('viaje'); c.interfaz.aviso('Rumbo a ' + (SS.FISICA[destino] || { nombre: destino }).nombre, 4); }
      else this.esp.viajar('transito', { tipo: 'nave', pos: [CABINA.X + 0.5, CABINA.Y, CABINA.Z - 5.5] });
    };
    if (this.dim === 'transito') sale();
    else this.iniciarSecuencia({ tipo: 'despegue', dur: 3.2, texto: 'DESPEGUE · ' + n.comb.toFixed(0) + ' de combustible', fin: sale });
    return true;
  }
  iniciarSecuencia(s) { this.sec = { t: 0, ...s }; document.body.classList.add(s.tipo === 'entrada' ? 'entrando' : 'despegando'); this.h.fx.classList.remove('oculto'); }
  pasoSecuencia(dt) {
    const s = this.sec;
    if (!s) return;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    this.h.fxTxt.textContent = s.texto;
    this.h.fxBarra.firstChild.style.width = Math.round(k * 100) + '%';
    document.body.style.setProperty('--fxk', k.toFixed(3));
    this.esp.sacudida = Math.max(this.esp.sacudida, (s.tipo === 'entrada' ? 0.6 : 0.3) * Math.sin(Math.PI * k));
    if (s.t >= s.dur) {
      this.sec = null; this.esp.sacudida = 0;
      document.body.classList.remove('entrando', 'despegando'); this.h.fx.classList.add('oculto');
      s.fin();
    }
  }
  setAceleracion(a) { try { this.c.Aj.set('aceleracionViaje', a); } catch (e) { /* el sonido aún no arrancó: el valor ya quedó guardado */ } }
  aceleracion() { const a = Number(this.c.Aj.get('aceleracionViaje')); return ACELERACIONES.includes(a) ? a : 5; }
  pasoViaje(dt) {
    const v = this.viaje, n = this.nave, h = this.h;
    const en = this.dim === 'transito' && n && n.enVuelo;
    h.viaje.classList.toggle('oculto', !(en && (v || n.cuerpo)) || this.c.estado === 'titulo' || this.c.estado === 'contenedor');
    if (!en || !v || this.esp.viaje) return;
    const c = this.c;
    if (!this.pendiente && c.estado !== 'pausa' && !(this.sec)) {
      const acel = this.aceleracion();
      const dp = dt * acel / v.dur;
      v.prog = Math.min(1, v.prog + dp);
      this.diasAcum += dp * v.diasTot;
      if (this.diasAcum >= 1 && this.puedeEsperar()) { const k = Math.floor(this.diasAcum); this.diasAcum -= k; c.saltarDias(k); }
      const ev = v.eventos.find((e) => !e.resuelto && v.prog >= e.pos);
      if (ev) { this.pendiente = { ev, t: 14 }; this.mostrarEvento(); }
      if (v.destino === 'sol') n.casco = Math.max(1, n.casco - 0.4 * dt * V_CALOR(v.prog));
      if (v.prog >= 1) this.llegar();
    } else if (this.pendiente) {
      this.pendiente.t -= dt;
      this.h.evento.querySelector('small') && (this.h.evento.querySelector('small').textContent = 'Decide en ' + Math.max(0, Math.ceil(this.pendiente.t)) + ' s');
      if (this.pendiente.t <= 0) this.resolver('ignorar');
    }
    this.pintarViaje();
  }
  pintarViaje() {
    const h = this.h, v = this.viaje, n = this.nave;
    if (!n) return;
    if (v) {
      const nom = (SS.FISICA[v.destino] || { nombre: v.destino }).nombre, acel = this.aceleracion();
      const resta = Math.max(0, (1 - v.prog) * v.dur / acel);
      h.vTitulo.textContent = 'RUMBO A ' + nom.toUpperCase();
      h.vBarra.firstChild.style.width = Math.round(v.prog * 100) + '%';
      h.vInfo.textContent = `${Math.round(v.prog * 100)}% · llegada en ${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')} · casco ${Math.round(n.casco)}% · comb. ${Math.round(n.comb)}`;
      if (!h.vVel.firstChild) for (const a of ACELERACIONES) { const b = el('button', '', 'x' + a); b.type = 'button'; b.addEventListener('click', () => { this.setAceleracion(a); this.pintarViaje(); }); h.vVel.appendChild(b); }
      [...h.vVel.children].forEach((b, i) => b.classList.toggle('on', ACELERACIONES[i] === acel));
      h.vVel.classList.remove('oculto');
    } else {
      h.vTitulo.textContent = 'EN ÓRBITA · ' + (SS.FISICA[n.cuerpo] || { nombre: n.cuerpo }).nombre.toUpperCase();
      h.vBarra.firstChild.style.width = '100%';
      h.vInfo.textContent = `casco ${Math.round(n.casco)}% · comb. ${Math.round(n.comb)} · usa la consola (E) para descender o viajar`;
      h.vVel.classList.add('oculto');
    }
  }
  mostrarEvento() {
    const h = this.h.evento, ev = this.pendiente.ev;
    h.textContent = '';
    h.append(el('b', '', '⚠ ' + N.TEXTO_EVENTO[ev.tipo]), el('small', '', 'Decide en 14 s'));
    for (const [id, txt] of N.ELECCIONES[ev.tipo]) { const b = el('button', '', txt); b.type = 'button'; b.addEventListener('click', () => this.resolver(id)); h.appendChild(b); }
    h.classList.remove('oculto');
    this.c.Sonido.dano && this.c.Sonido.clic();
  }
  resolver(eleccion) {
    const p = this.pendiente, c = this.c, n = this.nave;
    if (!p) return;
    this.pendiente = null; this.h.evento.classList.add('oculto');
    const ev = p.ev; ev.resuelto = true;
    const items = { hierro: c.inv.cuenta('hierro'), blindaje_plomo: c.inv.cuenta('blindaje_plomo') };
    const r = N.resolverEvento(ev, eleccion, { nave: n, radiacion: this.traje.r, items });
    n.casco = Math.max(0, Math.min(100, n.casco + r.casco)); n.comb = Math.max(0, n.comb + r.comb);
    for (const [k, q] of Object.entries(r.gasta)) if (!c.esCreativo()) c.inv.quitar(k, q);
    if (Object.keys(r.gasta).length) c.refrescarBarra();
    if (r.danio > 0 && !c.esCreativo()) c.danio(r.danio, 'radiacion');
    c.interfaz.aviso((r.ok ? '✔ ' : '✖ ') + r.texto + (r.casco ? ` (casco ${r.casco > 0 ? '+' : ''}${r.casco})` : ''), 4);
    this.logro('sistema_evento');
    if (ev.tipo === 'averia' && eleccion === 'reparar' && r.ok) this.logro('sistema_averia');
    if (ev.tipo === 'tormenta_solar' && r.ok) this.logro('sistema_tormenta_solar');
    if (ev.tipo === 'asteroides' && this.viaje && N.cruzaCinturon(this.viaje.origen, this.viaje.destino, c.dias + c.hora)) this.logro('sistema_cinturon');
  }
  llegar() {
    const v = this.viaje, n = this.nave, c = this.c;
    this.viaje = null; this.diasAcum = 0;
    n.cuerpo = v.destino;
    if (v.destino === 'marte') this.logro('sistema_a_marte');
    if (v.eventos.length === 0 || true) { if (N.cruzaCinturon(v.origen, v.destino, c.dias + c.hora)) this.logro('sistema_cinturon'); }
    if (v.destino === 'sol') this.logro('sistema_sol');
    c.hud.toast('EN ÓRBITA: ' + (SS.FISICA[v.destino] || { nombre: v.destino }).nombre.toUpperCase(), v.destino === 'sol' ? 'Zona letal: no hay dónde aterrizar' : 'Usa la consola para descender', 'logro');
    c.Sonido.logro();
    if (this.prog.hitos) { this.hito('orbita_' + v.destino); }
    this.abrirMapa('mapa');
  }

  // ----------------------------------------------------------- Descender
  aterrizajes(cuerpo) { return (ATERRIZAJES[cuerpo] || []).filter((d) => esDimension(d)); }
  puedeDescender(dimId) {
    const n = this.nave, D = datosDim(dimId);
    if (!n) return { ok: false, razon: 'Sin nave' };
    const e = N.entradaAtmosferica(n, D.entrada || 0);
    if (!e.ok) return { ok: false, razon: `Entrada imposible: necesitas escudo térmico nivel ${D.entrada} (tienes ${N.nivelEscudo(n)}). Fabrica un escudo térmico o usa una nave mayor`, falta: e.falta };
    const coste = N.costeAterrizaje(D.gravedad);
    if (n.comb < coste && !this.c.esCreativo()) return { ok: false, razon: `Combustible insuficiente para aterrizar (${coste})` };
    return { ok: true, coste, calor: e.calor, atm: (D.entrada || 0) > 0 };
  }
  descender(dimId) {
    const c = this.c, n = this.nave, r = this.puedeDescender(dimId);
    if (!r.ok) { c.interfaz.aviso(r.razon, 5); return false; }
    if (this.sec) return false;
    c.cerrarContenedor(true);
    if (!c.esCreativo()) n.comb -= r.coste;
    const D = datosDim(dimId);
    this.iniciarSecuencia({ tipo: r.atm ? 'entrada' : 'despegando', dur: r.atm ? 6 : 3, texto: r.atm ? `ENTRADA ATMOSFÉRICA · ${D.nombre.toUpperCase()} · escudo ${N.nivelEscudo(n)}` : 'DESCENSO · ' + D.nombre.toUpperCase(), fin: () => this.esp.viajar(dimId, { tipo: 'aterrizaje' }) });
    document.body.classList.toggle('despegando', !r.atm); document.body.classList.toggle('entrando', r.atm);
    return true;
  }
}
const V_CALOR = (p) => Math.max(0, (p - 0.3) / 0.7);
