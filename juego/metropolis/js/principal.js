// Metrópolis — orquestación: bucle, simulación, vista, guardado y menús.
import * as THREE from '../lib/three.module.min.js';
import * as C from './sim/ciudad.js';
import { HORA_SEG, CATEGORIAS, ITEM } from './sim/datos.js';
import { recalcular } from './sim/recalculo.js';
import { paso, chequearProgreso, calcOffline, diariaDisponible, premioDiaria } from './sim/simulacion.js';
import { ejecutar } from './sim/comandos.js';
import { estacion } from './sim/clima.js';
import { ORDEN_CALIDAD } from './vista/escena.js';
import { ClimaVista } from './vista/clima.js';
import { crearMulti } from './ui/multi.js';
import { serializar, deserializar } from './sim/guardado.js';
import { ciudadDemo } from './sim/demo.js';
import { dinero } from './sim/util.js';
import { Escena } from './vista/escena.js';
import { Camara } from './vista/camara.js';
import { Terreno } from './vista/terreno.js';
import { Edificios } from './vista/edificios.js';
import { Agentes } from './vista/agentes.js';
import { Particulas } from './vista/particulas.js';
import * as Audio from './ui/audio.js';
import * as Foco from './ui/foco.js';
import * as Almacen from './ui/almacen.js';
import * as CuentaJ from './ui/cuentaJuego.js';
import { generarIconos } from './ui/iconos.js';
import { crearHud } from './ui/hud.js';
import { crearPaneles } from './ui/paneles.js';
import { crearHerramientas } from './ui/herramientas.js';
import { crearControles } from './ui/controles.js';

const $ = (id) => document.getElementById(id);
const CAPAS = [null, 'trafico', 'energia', 'agua', 'seguridad', 'salud', 'educacion', 'contaminacion', 'ruido', 'crimen', 'valor', 'defensa'];
const NOM_CAPA = { trafico: 'TRÁF', energia: 'LUZ', agua: 'AGUA', seguridad: 'SEG', salud: 'SAL', educacion: 'EDU', contaminacion: 'CO2', ruido: 'RUIDO', crimen: 'CRIM', valor: 'SUELO', defensa: 'DEF' };
const PALETAS = { ninguno: { bien: 0x2fd27a, mal: 0xd9453d }, protanopia: { bien: 0x3a86ff, mal: 0xffa21c }, deuteranopia: { bien: 0x3a86ff, mal: 0xffa21c }, tritanopia: { bien: 0x2fd27a, mal: 0xff3b8a } };
const VELS = [0, 1, 2, 4];

const J = {
  canvas: $('lienzo'), c: null, slot: 0, vel: 1, velPrev: 1, pausaUI: false, enTitulo: true, ajustes: null,
  sel: null, selVia: null, infoCapa: false, capa: null, mandoActivo: false, ratonHover: false, foco: Foco,
  acum: 0, vistaSucia: true, arbolesSucios: false, shake: 0, guardarEn: 0, fps: 60, enFoto: false,
};
window.__metro = J;

function autoCalidad() {
  const q = new URLSearchParams(location.search).get('calidad');
  if (q && ['baja', 'media', 'alta'].includes(q)) return q;
  const tactil = matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 4, nuc = navigator.hardwareConcurrency || 4;
  if (tactil) return mem <= 3 || nuc <= 4 ? 'baja' : 'media';
  return 'alta';
}

function iniciar() {
  J.ajustes = Almacen.ajustes();
  const forzada = new URLSearchParams(location.search).get('calidad');
  if (forzada || !J.ajustes.calidad) J.ajustes.calidad = autoCalidad();
  Audio.configurar(J.ajustes.sfx, J.ajustes.musica);

  J.escena = new Escena(J.canvas, J.ajustes.calidad, J.ajustes);
  J.camara = new Camara();
  J.camara.tam(J.escena.w, J.escena.h);
  J.terreno = new Terreno(J.escena.scene, J.escena.q);
  J.edificios = new Edificios(J.escena.scene, J.escena);
  J.particulas = new Particulas(J.escena.scene, 600);
  J.climaVista = new ClimaVista(J.escena.scene);
  J.agentes = new Agentes(J.escena.scene, J.escena.q);

  J.cmd = (cmd) => J.multi && J.multi.activo && !J.multi.esAnfitrion ? J.multi.enviarComando(cmd) : J.ejecutarLocal(cmd);
  J.ejecutarLocal = (cmd, de) => {
    J.c.actor = de == null ? (J.multi && J.multi.activo ? J.multi.miId : 0) : de;
    const r = ejecutar(J.c, cmd);
    J.c.actor = 0;
    if (r.ok && J.alComando) J.alComando(cmd, r, de);
    return r;
  };
  J.hud = crearHud(J);
  J.paneles = crearPaneles(J);
  crearHerramientas(J);
  J.controles = crearControles(J);
  enlazarUI();

  J.serializar = serializar;
  J.deserializarTexto = (t) => deserializar(JSON.parse(t));
  J.bloqueado = () => J.enTitulo || Foco.hay() || !!(window.Lobby && window.Lobby.abierto);
  J.aviso = (m, t) => J.hud.nota(m, t);
  J.vibrar = vibrar;
  J.sacudir = () => { J.shake = 0.25; };
  J.cambioFuerte = cambioFuerte;
  J.setHerramienta = (x) => J.herr.poner(x);
  J.seleccionar = seleccionar;
  J.seleccionarVia = (x, y) => { J.sel = null; J.selVia = { x, y }; J.hud.refrescarInfo(); abrirInfoCapa(); Audio.tocar('click'); };
  J.deseleccionar = () => { J.sel = null; J.selVia = null; J.hud.ocultarInfo(); J.cerrarInfoCapa(); };
  J.cerrarInfoCapa = () => { if (J.infoCapa) { Foco.cerrar($('info')); J.infoCapa = false; } };
  J.accionInfo = accionInfo;
  J.deshacer = deshacer;
  J.pedirDeshacer = () => {
    if (!J.c.undo.length) return false;
    const ahora = performance.now();
    if (ahora < (J.undoHasta || 0)) { J.undoHasta = 0; deshacer(); return true; }
    J.undoHasta = ahora + 2200; J.aviso('Pulsa B otra vez para deshacer: ' + J.c.undo[J.c.undo.length - 1].nombre, 'info');
    return true;
  };
  J.fijarVel = fijarVel;
  J.cambiarVel = (d) => { const i = Math.max(0, Math.min(3, VELS.indexOf(J.vel) + d)); fijarVel(VELS[i]); };
  J.ciclarCapa = ciclarCapa;
  J.catRel = (d) => {
    const ids = CATEGORIAS.map((q) => q.id), act = J.herr.item ? J.herr.item.cat : J.paneles.ultimaCat;
    return ids[(ids.indexOf(act) + d + ids.length) % ids.length];
  };
  const _v = new THREE.Vector3();
  J.aPantalla = (x, y, z) => { _v.set(x, y, z).project(J.camara.cam); const r = J.canvas.getBoundingClientRect(); return [r.left + (_v.x * 0.5 + 0.5) * r.width, r.top + (-_v.y * 0.5 + 0.5) * r.height]; };
  J.guardar = guardar;
  J.aplicarCalidad = aplicarCalidad;
  J.aplicarAjustes = aplicarAjustes;
  J.fijarCapa = fijarCapa;
  J.modoFoto = modoFoto;
  J.paleta = PALETAS.ninguno;
  J.multi = crearMulti(J);
  J.alBajarNube = alBajarNube;
  CuentaJ.enlazar(J);
  J.comprarParcela = (px, py) => {
    const r = J.cmd({ k: 'parcela', px, py });
    if (r.ok) { J.vibrar('nivel'); cambioFuerte(); J.herr.poner(J.herr.item && J.herr.tipoPint === 'comprar' ? J.herr.item : null); }
    else { J.aviso(r.razon, 'mal'); Audio.tocar('error'); J.vibrar('error'); }
  };
  J.cargarCiudad = cargarCiudad; J.empezar = empezar; J.empezarMulti = empezarMulti; J.pasosRed = pasosRed;
  J.jugarRanura = jugarRanura;
  J.crearPartida = crearPartida;
  J.volverATitulo = volverATitulo;

  for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, () => Audio.iniciar(), { capture: true });
  aplicarAjustes('todo');
  document.addEventListener('visibilitychange', () => { Audio.pausar(document.hidden); if (!document.hidden) pedirWake(); });
  if (J.multi.hayEnlace()) setTimeout(() => J.multi.abrirLobby(), 400);
  iconoSonido();
  mostrarTitulo();
  if (window.Mando) window.Mando.alConectar(() => { mensajeMando('Mando conectado'); });
  window.addEventListener('resize', () => {});
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardar(); });
  window.addEventListener('pagehide', guardar);
  requestAnimationFrame(() => { generarIconos(J.escena.renderer); });
  setInterval(() => { if (!J.enTitulo && !document.hidden) guardar(); }, 20000);
  ultimo = performance.now();
  requestAnimationFrame(bucle);
  setTimeout(() => $('cargando').classList.add('fuera'), 250);
}

// ---------------------------------------------------------------- UI
function enlazarUI() {
  const on = (id, fn) => $(id).addEventListener('click', (e) => { Audio.iniciar(); Audio.tocar('click'); fn(e); });
  on('bMenu', () => J.paneles.pausa());
  on('chipPob', () => J.paneles.ciudad());
  on('objetivo', () => J.paneles.objetivos());
  on('bConstruir', () => J.paneles.construir());
  on('bDemoler', () => (J.herr.modo === 'demoler' ? J.herr.poner(null) : J.herr.poner('demoler')));
  on('bDeshacer', () => J.deshacer());
  on('bCiudad', () => J.paneles.ciudad());
  on('bFoto', () => modoFoto(true));
  on('bPantalla', () => pantallaCompleta());
  on('fotoSalir', () => modoFoto(false));
  on('fotoDisparo', () => disparoFoto());
  on('fotoFiltro', () => cambiarFiltro());
  on('bMejoras', () => J.paneles.mejoras());
  on('bRotar', () => J.camara.girar(1));
  on('bCapas', () => J.paneles.capasPanel());
  on('bSonido', () => { const on = !(J.ajustes.sfx || J.ajustes.musica); J.ajustes.sfx = J.ajustes.musica = on; Audio.configurar(on, on); Almacen.guardarAjustes(J.ajustes); iconoSonido(); if (on) Audio.tocar('ok'); });
  on('bCentrar', () => { const ay = C.ayuntamiento(J.c); if (ay) J.camara.centrar(ay.cx, ay.cy); });
  on('hOk', () => J.herr.confirmarEdificio());
  on('hCancelar', () => J.herr.poner(null));
  for (const b of document.querySelectorAll('#velocidad .vel')) b.addEventListener('click', () => { Audio.iniciar(); fijarVel(+b.dataset.vel); Audio.tocar('click'); });
}

function iconoSonido() {
  const on = J.ajustes.sfx || J.ajustes.musica;
  $('sndOn').classList.toggle('oculto', !on); $('sndOff').classList.toggle('oculto', on);
  $('bSonido').classList.toggle('on', !on);
}
function mensajeMando(t) {
  const e = $('toastMando'); e.textContent = t; e.classList.remove('oculto');
  clearTimeout(mensajeMando.t); mensajeMando.t = setTimeout(() => e.classList.add('oculto'), 2200);
}

function vibrar(tipo) {
  if (!J.ajustes.vibracion) return;
  const M = window.Mando;
  const P = { construir: [0.15, 0.35, 70], ok: [0, 0.5, 60], error: [0.8, 0.3, 150], nivel: [0.6, 0.6, 320], derribo: [0.7, 0.2, 130] }[tipo];
  if (M && M.conectado && P) { const k = J.ajustes.vibracionInt; M.vibrar(P[0] * k, P[1] * k, P[2]); }
  else if (navigator.vibrate && !(M && M.conectado)) { try { navigator.vibrate(tipo === 'error' ? [25, 30, 25] : tipo === 'nivel' ? [40, 40, 90] : 12); } catch (e) { /* nada */ } }
}

function fijarVel(v) {
  if (J.multi && J.multi.activo) { J.multi.pedirVel(v); return; }
  if (v === J.vel) return;
  if (J.vel > 0) J.velPrev = J.vel;
  J.vel = v;
}

function ciclarCapa() { fijarCapa(CAPAS[(CAPAS.indexOf(J.capa) + 1) % CAPAS.length]); }
function fijarCapa(capa) {
  J.capa = capa;
  J.terreno.colorear(J.c, J.capa);
  J.edificios.trafico(J.c, J.capa === 'trafico', J.paleta);
  $('capaTxt').textContent = J.capa ? NOM_CAPA[J.capa] : '';
  $('bCapas').classList.toggle('on', !!J.capa);
  J.capaVer = J.c.rVer;
  Audio.tocar('tecla');
  if (J.capa) J.aviso('Capa: ' + NOM_CAPA[J.capa].toLowerCase() + ' (verde = bien, rojo = mal)', 'info');
}

function abrirInfoCapa() {
  if (window.Mando && window.Mando.activo && !J.infoCapa) { Foco.abrir($('info'), { atras: () => J.deseleccionar() }); J.infoCapa = true; }
}
function seleccionar(id) {
  J.sel = id; J.selVia = null; J.hud.refrescarInfo(); abrirInfoCapa(); Audio.tocar('click');
}

function accionInfo(acc) {
  const c = J.c;
  if (acc === 'cerrar') { J.deseleccionar(); return; }
  if (acc === 'demolerVia' && J.selVia) { const r = J.cmd({ k: 'demoler', celdas: [[J.selVia.x, J.selVia.y]] }); J.deseleccionar(); if (r.ok) cambioFuerte(); return; }
  const b = c.edif.get(J.sel);
  if (!b) return;
  if (acc === 'demoler') { const r = J.cmd({ k: 'demoler', celdas: [[b.x, b.y]] }); J.deseleccionar(); if (r.ok) { J.vibrar('derribo'); cambioFuerte(); } return; }
  const k = { mejorar: 'mejorar', impulsar: 'impulsar', apagar: 'apagar' }[acc];
  const r = k ? J.cmd({ k, id: b.id }) : null;
  if (r && r.ok) { J.vibrar('construir'); cambioFuerte(); } else if (r) { J.aviso(r.razon, 'mal'); Audio.tocar('error'); J.vibrar('error'); }
}

function deshacer() {
  const r = J.cmd({ k: 'deshacer' });
  if (r.ok) { J.aviso('Deshecho: ' + r.nombre, 'info'); J.terreno.colorear(J.c, J.capa); J.terreno.bordesDe(J.c); J.arbolesSucios = true; cambioFuerte(); J.vibrar('ok'); }
  else { J.aviso(r.razon, 'info'); Audio.tocar('error'); }
}

function cambioFuerte() {
  const c = J.c;
  if (c.sucio) recalcular(c);
  chequearProgreso(c);
  J.vistaSucia = true;
  procesarFx();
  J.hud.refrescarInfo();
  J.guardarEn = performance.now() + 3500;
  if (c.s.viasConectadas === 0 && performance.now() > (J.avisoVia || 0)) {
    let n = 0; for (let i = 0; i < c.via.length; i++) if (c.via[i]) n++;
    if (n >= 3) { J.avisoVia = performance.now() + 30000; J.aviso('Las calles deben empezar pegadas al Ayuntamiento para funcionar', 'info'); }
  }
}

// ---------------------------------------------------------------- efectos
function procesarFx() {
  const c = J.c, P = J.particulas, E = J.edificios;
  for (const n of c.notas.splice(0)) J.hud.nota(n.m, n.t);
  let crecidos = 0;
  for (const f of c.fx.splice(0)) {
    switch (f.k) {
      case 'construido':
        E.anim(f.id, 'crece'); P.polvo(f.x, f.y, f.w, f.h, 14); P.rafaga(f.x + f.w / 2, 0.3, f.y + f.h / 2, 0xffd54a, 10); J.arbolesSucios = true; break;
      case 'via': case 'zona':
        f.celdas.slice(0, 10).forEach((e) => P.rafaga(e.x + 0.5, 0.1, e.y + 0.5, f.k === 'via' ? 0xb8bcc6 : 0x7fd18a, 2, 1.2, 0.06)); J.arbolesSucios = true; break;
      case 'derribo': P.polvo(f.x, f.y, f.w, f.h, J.ajustes.reducirMov ? 6 : 20); break;
      case 'dinero':
        if (Math.abs(f.v) >= 1) J.hud.flotante(f.x, f.y, (f.v > 0 ? '+' : '-') + dinero(Math.abs(f.v)), f.dia ? (f.v < 0 ? 'neg' : 'xl') : f.v < 0 ? 'neg' : '');
        break;
      case 'nivelA': J.hud.flotante(J.camara.x, J.camara.z, 'Alcalde nivel ' + f.v, 'xl'); Audio.tocar('nivel'); break;
      case 'tier': CuentaJ.xp(J, 20); setTimeout(() => { J.paneles.tier(f); Audio.tocar('nivel'); J.vibrar('nivel'); }, 400); for (let i = 0; i < 4; i++) setTimeout(() => P.fuegos(J.camara.x + (Math.random() - 0.5) * 8, J.camara.z + (Math.random() - 0.5) * 8), i * 300); break;
      case 'mision': { CuentaJ.xp(J, 10); const ay = C.ayuntamiento(c); if (ay) J.hud.flotante(ay.cx, ay.cy, '¡Objetivo! ' + (f.rec.dinero ? '+' + dinero(f.rec.dinero) : ''), 'xl'); J.vibrar('ok'); break; }
      case 'logro': J.vibrar('ok'); if (f.id) CuentaJ.logro(J, f.id); CuentaJ.xp(J, 5); break;
      case 'mejora': E.anim(f.id, 'pulso'); P.rafaga(f.x + f.w / 2, 0.5, f.y + f.h / 2, 0x3df5ff, 16, 2.6); break;
      case 'crece': if (crecidos++ < 12) { E.anim(f.id, 'crece'); P.rafaga(f.x + 0.5, 0.2, f.y + 0.5, 0x9fffb0, 5, 1.6, 0.06); } break;
      case 'parcela':
        J.terreno.colorear(c, J.capa); J.terreno.bordesDe(c); J.arbolesSucios = true;
        for (let i = 0; i < 24; i++) P.rafaga(f.px * 8 + Math.random() * 8, 0.2, f.py * 8 + Math.random() * 8, 0xffd54a, 3, 2, 0.1);
        J.camara.centrar(f.px * 8 + 4, f.py * 8 + 4);
        break;
      case 'abandono': P.humo(f.x + 0.5, 0.5, f.y + 0.5, 0x6a6a72); break;
      case 'festival': if (J.ajustes.reducirMov) break; J.fuegosHasta = performance.now() + 9000; break;
      case 'sonido': Audio.tocar(f.n); break;
      case 'terremoto': J.shake = 1.2 * (J.ajustes.reducirMov ? 0 : 1); P.polvo(f.x - 3, f.y - 3, 6, 6, 30); J.camara.centrar(f.x, f.y); J.vibrar('derribo'); break;
      case 'danio': if (!J.ajustes.reducirMov) P.humo(f.x, 0.6, f.y, 0x6a6a72); break;
      case 'escenario': if (f.ok) { CuentaJ.xp(J, 50); CuentaJ.puntaje(J, c, true); } J.paneles.confeti(); J.paneles.modal({ titulo: f.ok ? '¡Escenario completado!' : 'Escenario fallido', pausa: true, html: `<div class="grande">${f.nombre}</div><p style="text-align:center">${f.ok ? 'Objetivo logrado. Recibes $20.000 y 5 puntos. Puedes seguir construyendo.' : 'No lograste el objetivo a tiempo, pero puedes seguir jugando en modo libre.'}</p>`, pie: '<button type="button" class="btn foco" data-acc="rank">Ranking</button><button type="button" class="btn dorado foco" data-acc="ok">Continuar</button>', acc: { ok: (b, a) => a.cerrar(), rank: () => CuentaJ.ranking(J) } }); break;
      default: break;
    }
  }
}

// ---------------------------------------------------------------- partidas
function cargarCiudad(c) {
  J.c = c;
  if (c.sucio || !c.s) recalcular(c);
  J.terreno.construir(c);
  J.edificios.anims.clear();
  J.agentes.a.length = 0; J.agentes.p.length = 0;
  J.sel = null; J.selVia = null; J.hud.ocultarInfo(); J.cerrarInfoCapa();
  J.herr.poner(null);
  J.vistaSucia = true;
  J.capa = null; $('capaTxt').textContent = ''; $('bCapas').classList.remove('on');
  J.edificios.sincronizar(c, 0);
  J.estVista = -1; J.trafVer = -1;
  J.paleta = PALETAS[J.ajustes.daltonismo] || PALETAS.ninguno; J.terreno.pal = J.paleta;
}

function mostrarTitulo() {
  J.enTitulo = true;
  document.body.classList.add('enTitulo');
  $('juego').classList.add('oculto');
  cargarCiudad(ciudadDemo(1234));
  J.camara.fijarZoom(13); J.camara.xObj = J.camara.x = 32; J.camara.zObj = J.camara.z = 32;
  J.horaTitulo = 9;
  J.paneles.titulo();
}

function volverATitulo() {
  if (J.c && !J.enTitulo) CuentaJ.puntaje(J, J.c, true);
  J.multi.salir();
  J.paneles.cerrarTodos();
  J.fijarVelSilencio = true;
  mostrarTitulo();
}

function jugarRanura(n) {
  const t = Almacen.leerRanura(n);
  if (!t) return;
  let c;
  try { c = deserializar(JSON.parse(t)); } catch (e) { J.aviso('La ranura está dañada', 'mal'); J.paneles.titulo(); return; }
  empezar(c, n, false);
}
function crearPartida(n, nombre, semilla, opc) {
  const c = C.nuevaCiudad(semilla, nombre, opc);
  c.ult = Date.now();
  empezar(c, n, true);
}
function empezar(c, n, nueva) {
  J.slot = n;
  J.enTitulo = false;
  document.body.classList.remove('enTitulo');
  $('juego').classList.remove('oculto');
  cargarCiudad(c);
  const ay = C.ayuntamiento(c);
  J.camara.fijarZoom(8.5); J.camara.centrar(ay.cx + 1, ay.cy + 2); J.camara.x = J.camara.xObj; J.camara.z = J.camara.zObj;
  J.vel = 1; J.velPrev = 1; J.acum = 0;
  J.ajustes.ultima = n; Almacen.guardarAjustes(J.ajustes);
  chequearProgreso(c);
  procesarFx();
  CuentaJ.barrerLogros(J, c); CuentaJ.puntaje(J, c);
  if (nueva) { guardar(); J.paneles.bienvenida(); return; }
  const o = calcOffline(c, Date.now());
  const diaria = () => { if (diariaDisponible(c, Date.now())) J.paneles.diaria(premioDiaria(c, Date.now())); };
  if (o && o.dinero > 0) { const m = J.paneles.offline(o); m.o.alCerrar = diaria; } else diaria();
  guardar();
}

function trasPaso() {
  const c = J.c;
  J.vistaSucia = true; procesarFx(); J.hud.refrescarInfo(); actualizarHumos();
  if (J.capa && c.rVer !== J.capaVer) { J.capaVer = c.rVer; J.terreno.colorear(c, J.capa); }
}
// pasos recibidos del anfitrión (clientes)
function pasosRed(n) { for (let i = 0; i < n; i++) paso(J.c); J.acum = 0; trasPaso(); }
function empezarMulti(c, slot) {
  J.slot = slot; J.enTitulo = false;
  document.body.classList.remove('enTitulo'); $('juego').classList.remove('oculto');
  cargarCiudad(c);
  const ay = C.ayuntamiento(c);
  J.camara.fijarZoom(8.5); J.camara.centrar(ay.cx + 1, ay.cy + 2); J.camara.x = J.camara.xObj; J.camara.z = J.camara.zObj;
  J.vel = 1; J.velPrev = 1; J.acum = 0;
  chequearProgreso(c); procesarFx();
  if (slot) guardar();
}

function guardar() {
  const c = J.c;
  if (!c || J.enTitulo || !J.slot) return;
  c.ult = Date.now();
  try {
    Almacen.guardarRanura(J.slot, JSON.stringify(serializar(c)), { nombre: c.nombre, pop: Math.round(c.s ? c.s.pop : 0), tier: c.tier, dia: c.t.dia, t: c.ult });
  } catch (e) { /* sin espacio */ }
  J.guardarEn = 0;
  CuentaJ.puntaje(J, c);
}

// Llegó una versión más nueva desde la nube (otro dispositivo).
function alBajarNube() {
  if (J.enTitulo) {
    J.ajustes = Almacen.ajustes(); aplicarAjustes('todo');
    if (J.paneles.titulo) J.paneles.titulo();
    J.aviso('Ciudades actualizadas desde la nube', 'ok');
    return;
  }
  J.paneles.modal({ titulo: 'Datos de la nube', pausa: true, cerrable: false, html: '<p>Se descargó una versión más reciente de tus ciudades desde otro dispositivo. Recarga para usarla, o sigue con esta partida (se guardará encima).</p>', pie: '<button type="button" class="btn primario foco" data-acc="rec">Recargar</button><button type="button" class="btn foco" data-acc="seguir">Seguir aquí</button>', acc: { rec: () => location.reload(), seguir: (b, a) => a.cerrar() }, atras: (a) => a.cerrar() });
}

function aplicarCalidad() {
  J.escena.aplicarCalidad(J.ajustes.calidad, J.ajustes);
  J.camara.tam(J.escena.w, J.escena.h);
  J.agentes.q = J.escena.q;
  J.terreno.q = J.escena.q;
  J.arbolesSucios = true; J.vistaSucia = true;
  J.edificios.entradas.forEach((e) => { if (e.cuerpo) { e.cuerpo.castShadow = e.cuerpo.receiveShadow = J.escena.q.sombras; } });
  if (J.edificios.sombras) J.edificios.sombras.visible = !J.escena.q.sombras;
}

function aplicarAjustes(k) {
  const a = J.ajustes, b = document.body.classList;
  if (k === 'todo' || ['calidad', 'sombras', 'resolucion', 'detalle'].includes(k)) aplicarCalidad();
  Audio.configurar(a.sfx, a.musica);
  Audio.volumenes({ maestro: a.volMaestro, musica: a.volMusica, sfx: a.volSfx, ambiente: a.volAmbiente, silencio: a.silencio });
  b.toggle('txtGrande', !!a.textoGrande); b.toggle('reducir', !!a.reducirMov); b.toggle('zurdo', !!a.zurdo);
  for (const d of ['protanopia', 'deuteranopia', 'tritanopia']) b.toggle('dalt-' + d, a.daltonismo === d);
  document.documentElement.style.setProperty('--tam', a.tamTactil);
  document.documentElement.style.setProperty('--opac', a.opacTactil);
  $('fps').classList.toggle('oculto', !a.verFps);
  const pal = PALETAS[a.daltonismo] || PALETAS.ninguno;
  if (pal !== J.paleta) { J.paleta = pal; J.terreno.pal = pal; if (J.c && J.capa) J.terreno.colorear(J.c, J.capa); J.trafVer = -1; }
  iconoSonido();
  Almacen.guardarAjustes(a);
}

// ---------------------------------------------------------------- pantalla completa, wake lock y modo foto
let wake = null;
async function pedirWake() { try { if (navigator.wakeLock && !document.hidden && !J.enTitulo) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* nada */ } }
function pantallaCompleta() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().then(pedirWake, () => {});
  } catch (e) { /* nada */ }
}
const FILTROS = ['', 'saturate(1.35) contrast(1.05)', 'sepia(0.7) contrast(1.05)', 'grayscale(1) contrast(1.15)', 'hue-rotate(-18deg) saturate(1.2)'];
let filtroFoto = 0;
function cambiarFiltro() { filtroFoto = (filtroFoto + 1) % FILTROS.length; J.canvas.style.filter = FILTROS[filtroFoto]; $('fotoFiltro').textContent = ['Sin filtro', 'Vivo', 'Sepia', 'Blanco y negro', 'Cálido'][filtroFoto]; }
function modoFoto(on) {
  J.enFoto = on;
  document.body.classList.toggle('foto', on);
  if (!on) { J.canvas.style.filter = ''; filtroFoto = 0; $('fotoFiltro').textContent = 'Sin filtro'; }
  else { J.herr.poner(null); J.aviso('Modo foto: mueve la cámara, cambia el filtro y dispara', 'info'); }
}
function disparoFoto() { J.pedirFoto = true; }
function guardarFoto() {
  J.pedirFoto = false;
  J.canvas.toBlob((bl) => {
    if (!bl) return;
    const url = URL.createObjectURL(bl), a = document.createElement('a');
    a.href = url; a.download = 'metropolis-' + J.c.nombre.replace(/\W+/g, '_') + '-dia' + J.c.t.dia + '.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (!(J.multi && J.multi.activo)) J.c.cont.fotos++;
    J.aviso('Foto guardada', 'ok'); Audio.tocar('ok'); chequearProgreso(J.c);
    $('flash').classList.add('on'); setTimeout(() => $('flash').classList.remove('on'), 160);
  }, 'image/png');
}

// ---------------------------------------------------------------- humo y vida
let humos = [];
function actualizarHumos() {
  humos = [];
  for (const b of J.c.edif.values()) {
    if (b.t === 'zonaI' && b.n > 0) humos.push([b.x + 0.5, [0, 0.7, 1.1, 1.5, 0.9][b.n], b.y + 0.5, 0.5 + b.n * 0.3, 0xcfd3da]);
    else if (b.t === 'carbon') humos.push([b.cx - 0.7, 1.9, b.cy - 0.55, 1.4, 0xb8bcc6], [b.cx + 0.2, 1.9, b.cy - 0.55, 1.4, 0xb8bcc6]);
    else if (b.t === 'nuclear') humos.push([b.cx - 0.8, 1.4, b.cy - 0.65, 1, 0xffffff]);
    else if (b.fuego > 0) humos.push([b.cx, 0.6, b.cy, 6, 0xff7a2a]);
  }
}

// ---------------------------------------------------------------- bucle
let ultimoRender = 0, accFps = 0, nFps = 0, bajos = 0, enfriar = 0, ultAmb = 0, ultTraf = 0;
let ultimo = 0, frame = 0, tReloj = 0, ultHud = 0, ultSync = 0, ultPistas = 0, ultSonda = 0, ultFuegos = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  let dt = (ahora - ultimo) / 1000; ultimo = ahora;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) return;
  tReloj += dt; frame++;
  const E = J.escena;
  if (E.redim()) J.camara.tam(E.w, E.h);
  J.controles.mando(dt);
  J.controles.teclado(dt);

  const c = J.c;
  let horaF;
  if (J.enTitulo) {
    J.horaTitulo = (J.horaTitulo + dt * 0.6) % 24; horaF = J.horaTitulo;
    J.camara.yawObj += dt * 0.05; J.camara.yaw = J.camara.yawObj;
  } else {
    const pausado = J.pausaUI && !(J.multi && J.multi.activo) || (J.multi && J.multi.activo && !J.multi.esAnfitrion);
    if (J.vel > 0 && !pausado) {
      J.acum += dt * J.vel;
      let n = 0;
      while (J.acum >= HORA_SEG && n < 6) { paso(c); J.acum -= HORA_SEG; n++; }
      if (n >= 6) J.acum = 0;
      if (n) { trasPaso(); J.multi.pasosHechos(n); }
    }
    if (c.sucio) { recalcular(c); J.vistaSucia = true; }
    if (J.multi.activo && !J.multi.esAnfitrion && J.vel > 0) J.acum = Math.min(HORA_SEG * 0.98, J.acum + dt * J.vel);
    horaF = c.t.hora + (J.vel > 0 && (!pausado || J.multi.activo) ? J.acum / HORA_SEG : 0);
    if (J.guardarEn && ahora > J.guardarEn) guardar();
    if (c.notas.length || c.fx.length) procesarFx();
  }

  if (J.arbolesSucios) { J.arbolesSucios = false; J.terreno.arboles(c); }
  if ((J.vistaSucia && ahora - ultSync > 45) || J.edificios.anims.size) {
    J.vistaSucia = false; ultSync = ahora; J.edificios.sincronizar(c, tReloj);
    if (!J.enTitulo) actualizarHumos();
  }
  J.camara.actualizar(dt);
  if (J.shake > 0) { J.shake = Math.max(0, J.shake - dt); const k = J.shake * 0.5; J.camara.cam.position.x += (Math.random() - 0.5) * k; J.camara.cam.position.z += (Math.random() - 0.5) * k; J.camara.cam.updateMatrixWorld(); }
  E.hora(horaF, { x: J.camara.x, z: J.camara.z });
  const A = J.ajustes;
  if (!J.enTitulo) {
    const nub = J.climaVista.actualizar(dt, c.clima.tipo, J.camara, E.q, A.reducirMov, c);
    E.nubes(Math.min(1, nub * 0.9));
    const est = estacion(c);
    if (est !== J.estVista) { J.estVista = est; J.terreno.fijarEstacion(est, c, J.capa); }
    if (c.rVer !== J.trafVer && ahora - ultTraf > 400) { J.trafVer = c.rVer; ultTraf = ahora; J.edificios.trafico(c, J.capa === 'trafico', J.paleta); }
    if (ahora - ultAmb > 500) { ultAmb = ahora; ambiente(c, E.noche, nub); }
  }
  Audio.fijarNoche(E.noche);
  J.terreno.animar(dt, E.q.agua);
  J.edificios.animarMarcas(tReloj);
  J.herr.vista(tReloj);
  J.edificios.marcoSeleccion(J.sel != null ? c.edif.get(J.sel) : J.selVia ? { t: 'calle', x: J.selVia.x, y: J.selVia.y } : null, tReloj);
  J.agentes.actualizar(c, dt, E.noche, { reducirMov: A.reducirMov });
  if (J.multi) J.multi.actualizar(dt, ahora);

  // partículas de humo
  if (humos.length) {
    const presupuesto = Math.min(humos.length, 40);
    for (let k = 0; k < presupuesto; k++) {
      const h = humos[(Math.random() * humos.length) | 0];
      if (Math.random() < dt * h[3] * 0.8) {
        if (h[4] === 0xff7a2a) J.particulas.llama(h[0], h[1], h[2]); else J.particulas.humo(h[0] + (Math.random() - 0.5) * 0.1, h[1], h[2], h[4]);
      }
    }
  }
  if (J.fuegosHasta && ahora < J.fuegosHasta && ahora - ultFuegos > 500) {
    ultFuegos = ahora; const ay = C.ayuntamiento(c);
    if (ay) { J.particulas.fuegos(ay.cx + (Math.random() - 0.5) * 6, ay.cy + (Math.random() - 0.5) * 6); Audio.tocar('fuegos'); }
  }
  J.particulas.actualizar(dt);

  if (!J.enTitulo) {
    if (ahora - ultHud > 160) { ultHud = ahora; J.hud.actualizar(c); }
    J.hud.posiciones();
    if (ahora - ultPistas > 300) { ultPistas = ahora; pistasMando(); sonda(); }
  } else if (ahora - ultPistas > 400) { ultPistas = ahora; pistasMando(); }

  // límite de FPS, contador y bajada automática de calidad
  const lim = A.limiteFps > 0 ? A.limiteFps : A.limiteFps < 0 ? 0 : (E.q.fps30 ? 30 : 0);
  if (!lim || ahora - ultimoRender >= 1000 / lim - 2) {
    ultimoRender = ahora; E.dibujar(J.camara.cam);
    if (J.pedirFoto) guardarFoto();
    accFps += dt; nFps++;
    if (accFps >= 1) {
      J.fps = Math.round(nFps / accFps); accFps = 0; nFps = 0;
      if (A.verFps) $('fps').textContent = J.fps + ' FPS · ' + E.q.nombre;
      enfriar -= 1;
      if (A.autoCalidad && !J.enTitulo && !document.hidden && enfriar <= 0) {
        bajos = J.fps < Math.min(22, (lim || 60) * 0.6) ? bajos + 1 : 0;
        if (bajos >= 4) {
          const i = ORDEN_CALIDAD.indexOf(A.calidad);
          if (i > 0) { A.calidad = ORDEN_CALIDAD[i - 1]; A.sombras = A.resolucion = A.detalle = null; aplicarAjustes('calidad'); J.aviso('Rendimiento bajo: calidad ' + A.calidad, 'info'); }
          bajos = 0; enfriar = 20;
        }
      }
    }
  }
}

// sonido ambiente según lo que hay bajo la cámara
function ambiente(c, noche, nub) {
  const r = c.r; if (!r || !c.s) return;
  const cx = Math.floor(J.camara.x), cz = Math.floor(J.camara.z);
  let tr = 0, ind = 0, par = 0, agua = 0, gente = 0;
  const R = Math.max(5, Math.round(J.camara.escala * 0.9));
  for (let y = Math.max(0, cz - R); y <= Math.min(71, cz + R); y += 2) for (let x = Math.max(0, cx - R); x <= Math.min(71, cx + R); x += 2) {
    const i = y * 72 + x;
    if (c.terr[i] === 1) agua++;
    if (r.flujo[i] > 0) tr += Math.min(1, r.flujo[i] / 6);
    if (r.contam[i] > 15) ind += r.contam[i] / 100;
    if (r.parq[i] > 25) par += 1;
    const b = C.edifEn(c, x, y); if (b && b.t === 'zonaC' && b.n) gente += b.n * 0.25;
  }
  const n = ((R * 2) / 2 + 1) ** 2, z = 8 / Math.max(8, J.camara.escala);
  Audio.ambiente({ trafico: Math.min(1, tr / n * 2.5) * z, industria: Math.min(1, ind / n * 3) * z, parque: Math.min(1, par / n * 1.5), agua: Math.min(1, agua / n * 1.5), gente: Math.min(1, gente / n * 1.5) * z, lluvia: ['lluvia', 'tormenta'].includes(c.clima.tipo) ? 0.8 : 0, viento: c.clima.tipo === 'tormenta' ? 0.8 : 0.15, dia: noche < 0.5 });
}

// ---------------------------------------------------------------- pistas de mando y sonda
const BM = (cls, t, txt) => `<span class="bm"><i class="${cls}">${t}</i>${txt}</span>`;
function pistasMando() {
  const el = $('pistasMando');
  const activo = !!(window.Mando && window.Mando.conectado && window.Mando.activo);
  if (!activo) { if (!el.classList.contains('oculto')) el.classList.add('oculto'); return; }
  let h;
  if (Foco.hay()) {
    const l = Foco.capa();
    h = BM('a', 'A', 'Elegir') + BM('b', 'B', 'Atrás') + (l && l.tabs ? BM('g', 'LB RB', 'Pestaña') : '') + BM('g', '✥', 'Mover');
  } else if (J.enTitulo) h = '';
  else {
    const H = J.herr, tp = H.tipoPint;
    if (H.modo === 'ver') h = BM('a', 'A', 'Elegir') + BM('y', 'Y', 'Construir') + BM('x', 'X', 'Demoler') + BM('g', 'LT RT', 'Zoom') + BM('g', 'MENÚ', 'Pausa') + BM('g', '↑↓', 'Velocidad') + BM('b', 'B B', 'Deshacer');
    else if (tp === 'edificio') h = BM('a', 'A', 'Construir') + BM('b', 'B', 'Cancelar') + BM('g', '←→', 'Cambiar') + BM('y', 'Y', 'Menú') + BM('g', 'LT RT', 'Zoom');
    else if (tp === 'comprar') h = BM('a', 'A', 'Comprar') + BM('b', 'B', 'Salir') + BM('y', 'Y', 'Menú');
    else h = BM('a', 'A', 'Mantén y suelta') + BM('b', 'B', 'Cancelar') + BM('g', '←→', 'Cambiar') + BM('y', 'Y', 'Menú');
  }
  if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  el.classList.toggle('oculto', !h);
}

function sonda() {
  const el = $('sonda'), H = J.herr, c = J.c;
  if (!(J.mandoActivo || J.ratonHover) || !H.sobre || H.modo !== 'ver' || Foco.hay() || J.enTitulo) { el.classList.add('oculto'); return; }
  const { x, y } = H.sobre; let t = '';
  if (!C.dentro(x, y)) t = '';
  else {
    const px = Math.floor(x / 8), py = Math.floor(y / 8), mia = c.parc[py * C.NP + px] > 0;
    const b = C.edifEn(c, x, y), tt = c.terr[y * C.N + x];
    if (b) { const it = ITEM[b.t]; t = it.nombre + (it.tipo === 'zona' && b.n ? ' · Nv ' + b.n : ''); }
    else if (c.via[y * C.N + x]) t = c.via[y * C.N + x] === 2 ? 'Avenida' : 'Calle';
    else if (!mia) t = C.parcelaComprable(c, px, py) ? 'Parcela en venta ' + dinero(C.precioParcela(c)) : 'Terreno sin dueño';
    else t = tt === 1 ? 'Agua' : tt === 3 ? 'Roca' : tt === 2 ? 'Arena' : c.arbol[y * C.N + x] ? 'Bosque' : 'Terreno libre';
  }
  el.textContent = t; el.classList.toggle('oculto', !t);
}

(async () => {
  try { await CuentaJ.preparar(); } catch (e) { console.warn('Cuenta', e); }
  try { iniciar(); } catch (e) { falloGraficos(e); }
})();
function falloGraficos(e) {
  const c = $('cargando'); c.classList.remove('fuera');
  c.innerHTML = '<div><b>METRÓPOLIS</b><span>No se pudieron iniciar los gráficos 3D (WebGL).<br>Prueba con otro navegador o actualiza el sistema.</span></div>';
  console.error(e);
}
