// =============================================================
//  PRINCIPAL: escena 3D, pantallas y el ciclo del juego.
//  Los modos (clásicos y batalla) son clases con iniciar(), actualizar(dt) y destruir().
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG, MAPAS, AVIONES } from './config.js';
import { TANQUES, CAMUFLAJES, CAMPANAS } from './catalogo.js';
import './modelos2.js';
import { Terreno } from './terreno.js';
import { Cielo } from './cielo.js';
import { Efectos } from './efectos.js';
import { Proyectiles } from './proyectiles.js';
import { Hud } from './hud.js';
import { Entrada, detectarTactil } from './entrada.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';
import { ModoAvion } from './modoAvion.js';
import { ModoTanque } from './modoTanque.js';
import { ModoBatalla } from './modoBatalla.js';
import { Multi, FRASES } from './multi.js';
import { cargarRecords, guardarRecord, claveRecord, cargarOpciones, guardarOpciones } from './guardado.js';
import { Ajustes, PanelAjustes, mapaTeclas, PALETAS } from './ajustes.js';
import { Calidad } from './calidad.js';
import { Camaras, NOMBRES_CAM, NOMBRES_CAM_TANQUE } from './camaras.js';
import { Progreso, perfil } from './progreso.js';
import { Vistas } from './vistas.js';
import { Hangar, pintarPerfil, el } from './hangar.js';
import { Menus } from './menus.js';
import { mover, enfocables, enfocar } from './navMando.js';
import { enviarPuntaje, reportarLogro, reportarPendientes, darXp, pintarRanking, alBajarDatos, borrarNube, hayCuenta } from './cuentaJuego.js';

const $ = (id) => document.getElementById(id);
THREE.ColorManagement.enabled = false;

const lienzo = $('lienzo');
const tactil = detectarTactil();
document.body.classList.toggle('tactil', tactil);
Ajustes.cargar(tactil);
const AJ = Ajustes.d();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !!AJ.grafico.antialias, powerPreference: 'high-performance' });
} catch (e) {
  $('sinWebgl').classList.remove('oculto');
  $('pantallaTitulo').classList.add('oculto');
  throw e;
}
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const escena = new THREE.Scene();
escena.background = new THREE.Color(0xc7dbed);
escena.fog = new THREE.FogExp2(0xc7dbed, CONFIG.vista.niebla);
const hemi = new THREE.HemisphereLight(0xdcebff, 0x7a8a60, 2.1);
escena.add(hemi);
const sol = new THREE.DirectionalLight(0xfff0d2, 2.4);
escena.add(sol);

const camera = new THREE.PerspectiveCamera(CONFIG.vista.fov, 1, 0.5, CONFIG.vista.lejos);
const opciones = cargarOpciones();
let terreno = null;
const cielo = new Cielo(escena);
const efectos = new Efectos(escena);
const proyectiles = new Proyectiles(escena, null, efectos);
const hud = new Hud();
const entrada = new Entrada(lienzo);
entrada.tactil = tactil;
entrada.vibracion = opciones.vibracion !== false;
const stats0 = () => ({ disparos: 0, aciertos: 0, danio: 0, misiles: 0, bombas: 0, bajas: 0, bajasAire: 0, bajasTanque: 0, bajasTierra: 0, capturas: 0, maxRacha: 0, engano: 0 });
const ctx = {
  camVar: 0, escena, camera, renderer, terreno: null, mapa: null, avionId: '', tanqueId: 'jugador', efectos, proyectiles, hud, entrada, opciones,
  ancho: 1, alto: 1, ajustes: AJ, camaras: null, perfil: perfil(), perfilColor: perfil().color, paleta: PALETAS.ninguno,
  estadisticas: stats0(), reducirEfectos: false, potencia: 1,
};
ctx.stats = ctx.estadisticas;
ctx.camaras = new Camaras(ctx);
ctx.defAvion = (id) => Progreso.defAvion(id);
ctx.opcionesTanque = (id) => Progreso.opcionesTanque(id);
ctx.alEngano = () => { ctx.estadisticas.engano++; Progreso.sumar('misilesEngañados'); hud.aviso('MISIL ENGAÑADO', 1.6); };
efectos.terreno = null;

// ----------------------------------------------------------- Calidad gráfica y ajustes
const calidad = new Calidad({
  renderer, camera, escena, sol, efectos, cielo, ctx, tactil,
  mapa: () => ctx.mapa, terrenoActual: () => terreno,
  activo: () => estado === 'jugando',
  recargarTerreno: () => { if (estado === 'jugando') { terrenoPendiente = true; } else { const id = ctx.mapa.id; cargarMapa(id, true); } },
  aviso: (t) => toast(t),
});
let terrenoPendiente = false;

function aplicarAjustes() {
  const C = AJ.controles, A = AJ.audio;
  entrada.mapaT = mapaTeclas(C.teclas);
  entrada.zona = C.zona;
  entrada.vibInt = C.vibInt;
  Sonido.volumenes({ maestro: A.maestro, efectos: A.efectos, musica: A.musica, silencio: A.silencio, pausaOculto: A.pausaOculto });
  Musica.volumen && Musica.volumen(A.musica);
  const st = document.documentElement.style;
  st.setProperty('--tact-esc', C.tactilEsc);
  st.setProperty('--tact-op', C.tactilOp);
  st.setProperty('--tact-sep', C.tactilSep + 'px');
  st.setProperty('--tact-alt', C.tactilAlt + 'px');
  document.body.classList.toggle('zurdo', !!C.zurdo);
  calidad.aplicar();
  hud.fijarPaleta(calidad.paleta);
  ctx.paleta = calidad.paleta;
}
Ajustes.alCambiar = (g, k) => {
  aplicarAjustes();
  if (g === 'grafico' && (k === 'resolucion' || k === 'preset')) ajustar();
};

// ----------------------------------------------------------- Mapa elegido
function cargarMapa(id, forzar = false) {
  if (terreno && terreno.id === id && !forzar) return;
  const d = MAPAS[id];
  if (terreno) terreno.destruir();
  terreno = new Terreno(escena, id, calidad.terrenoOpc());
  ctx.terreno = terreno;
  ctx.mapa = d;
  efectos.terreno = terreno;
  proyectiles.terreno = terreno;
  cielo.aplicar(d.cielo);
  escena.background.set(d.cielo.horizonte);
  escena.fog.color.set(d.cielo.horizonte);
  escena.fog.density = d.niebla / (calidad.distancia || 1);
  hemi.color.set(d.luz.cielo);
  hemi.groundColor.set(d.luz.suelo);
  hemi.intensity = d.luz.hemi;
  sol.color.set(d.luz.sol);
  sol.intensity = d.luz.solInt;
  sol.position.copy(cielo.dirSol).multiplyScalar(500);
}

// ----------------------------------------------------------- Pantalla
function ajustar() {
  const w = innerWidth, h = innerHeight;
  const pr = calidad.pixelRatio();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  efectos.fijarEscala((h * pr) / (2 * Math.tan((CONFIG.vista.fov * Math.PI) / 360)));
  ctx.ancho = w;
  ctx.alto = h;
}
addEventListener('resize', ajustar);

// ----------------------------------------------------------- Mapa inicial y menús
const mapaInicial = MAPAS[opciones.mapa] ? opciones.mapa : CONFIG.predeterminado.mapa;
aplicarAjustes();
ajustar();
cargarMapa(mapaInicial);
ctx.avionId = Progreso.elegido('avion');
ctx.tanqueId = Progreso.elegido('tanque');
const vistas = new Vistas(renderer);
const imagen = (tipo, id) => {
  const p = Progreso.pintura(tipo, id), c = CAMUFLAJES[p.camo];
  return vistas.obtener(tipo, id, c && c.c ? c.c : null, p.marca, perfil().color);
};

const PANTALLAS = ['pantallaTitulo', 'pantallaJugar', 'pantallaHangar', 'pantallaMisiones', 'pantallaLogros', 'pantallaRanking', 'pantallaAjustes', 'pantallaEquipos', 'pantallaPausa', 'pantallaFin'];
const PREFERIDO = { pantallaTitulo: 'btnJugar', pantallaJugar: 'btnCombatir', pantallaPausa: 'btnSeguir', pantallaFin: 'btnReintentar', pantallaMisiones: null, pantallaEquipos: 'btnEqComenzar' };
let tPantalla = 0;
let actual = 'pantallaTitulo';
let pila = [];
function mostrar(id) {
  actual = id;
  for (const p of PANTALLAS) $(p).classList.toggle('oculto', p !== id);
  tPantalla = performance.now();
  if (!id && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (id && document.body.classList.contains('conMando')) enfocar(preferido(id));
}
function preferido(id) { return PREFERIDO[id] ? $(PREFERIDO[id]) : null; }
function ir(id) { pila.push(actual); mostrar(id); refrescarPantalla(id); }
function atras() {
  const id = pila.pop() || (estado === 'pausa' ? 'pantallaPausa' : 'pantallaTitulo');
  mostrar(id);
  refrescarPantalla(id);
}
function refrescarPantalla(id) {
  if (id === 'pantallaTitulo') menus.pintarTitulo();
  else if (id === 'pantallaJugar') menus.dibujarJugar();
  else if (id === 'pantallaMisiones') menus.dibujarMisiones();
  else if (id === 'pantallaLogros') menus.dibujarLogros();
  else if (id === 'pantallaRanking') pintarRanking($('contRanking'), { modo: 'aire', alcance: 'global' });
  else if (id === 'pantallaAjustes') panelAj.dibujar();
}

let estado = 'menu'; // menu | jugando | pausa | fin
let modo = null;
let multi = null;
let ultimaCfg = null;
let bloqueado = false;

const hangar = new Hangar({ vistas, alCambiar: () => { ctx.avionId = Progreso.elegido('avion'); ctx.tanqueId = Progreso.elegido('tanque'); pintarPerfil($('hangarCab')); } });
const menus = new Menus({
  cargarMapa: (id) => cargarMapa(id),
  imagen,
  abrirHangar: (tipo) => { pila.push(actual); hangar.abrir(tipo); mostrar('pantallaHangar'); },
  combatir: (cfg) => empezar(cfg),
  jugarMision: (m) => empezar({ modo: 'mision', unidad: m.unidad, mision: m, nivel: m.nivel, mapa: m.mapa }),
});
cargarMapa(menus.sel.mapa && MAPAS[menus.sel.mapa] ? menus.sel.mapa : mapaInicial);
menus.sel.mapa = ctx.mapa.id;

const panelAj = new PanelAjustes($('contAjustes'), {
  opciones, entrada,
  aplicarOpciones: () => { guardarOpciones({ ...cargarOpciones(), ...opciones }); entrada.vibracion = opciones.vibracion !== false; if (modo && modo.jugador) modo.jugador.invertido = opciones.invertido; if (modo && modo.jug && modo.jug.invertido !== undefined) modo.jug.invertido = opciones.invertido; },
  refrescarPerfil: () => { ctx.avionId = Progreso.elegido('avion'); ctx.tanqueId = Progreso.elegido('tanque'); menus.pintarTitulo(); },
  avisoRecarga: () => $('btnRecarga').classList.remove('oculto'),
  exportar: () => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('guerra_')) o[k] = localStorage.getItem(k); }
    return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  },
  importar: (t) => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(t))));
      for (const k in o) if (k.startsWith('guerra_')) localStorage.setItem(k, o[k]);
      setTimeout(() => location.reload(), 300);
      return true;
    } catch (e) { return false; }
  },
  borrar: () => {
    const quitar = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('guerra_')) quitar.push(k); }
    quitar.forEach((k) => localStorage.removeItem(k));
    borrarNube().then(() => location.reload());
  },
});
$('btnRecarga').addEventListener('click', () => location.reload());

menus.pintarTitulo();

// ----------------------------------------------------------- Avisos
let tToast = 0, tAyuda = 0;
function toast(texto) {
  const t = $('toastMando');
  t.textContent = texto;
  t.classList.remove('oculto');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.add('oculto'), 3200);
}

// ----------------------------------------------------------- Comenzar y terminar partidas
let wakeLock = null;
async function pedirWake() {
  try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function soltarWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* nada */ } wakeLock = null; }

function empezar(cfg) {
  Sonido.iniciar();
  Musica.iniciar();
  if (modo) modo.destruir();
  hud.limpiar();
  if (cfg.mapa) { menus.sel.mapa = cfg.mapa; cargarMapa(cfg.mapa); }
  if (terrenoPendiente) { terrenoPendiente = false; cargarMapa(ctx.mapa.id, true); }
  ultimaCfg = cfg;
  ctx.avionId = Progreso.elegido('avion');
  ctx.tanqueId = Progreso.elegido('tanque');
  ctx.perfil = perfil();
  ctx.perfilColor = ctx.perfil.color;
  ctx.estadisticas = stats0();
  ctx.stats = ctx.estadisticas;
  ctx.camVar = 0;
  ctx.potencia = 1;
  ctx.fragilidad = 1;
  efectos.limpiar();
  proyectiles.limpiar();
  multi = null;
  if (cfg.clasico) modo = cfg.clasico === 'avion' ? new ModoAvion(ctx) : new ModoTanque(ctx);
  else {
    if (cfg.red) { multi = cfg.red; }
    modo = new ModoBatalla(ctx, cfg);
  }
  ctx.alBaja = null;
  ctx.alMuerteJugador = () => { /* contadores en ModoBatalla */ };
  tPartida = 0;
  sesion = { t0: performance.now(), inicioXp: Progreso.xp() };
  modo.iniciar();
  if (cfg.clasico) { ctx.alBaja = (e) => { ctx.estadisticas.bajas++; if (e.tipo === 'aire') ctx.estadisticas.bajasAire++; else if (e.tipo === 'tanque') ctx.estadisticas.bajasTanque++; else ctx.estadisticas.bajasTierra++; }; }
  estado = 'jugando';
  pila = [];
  document.body.classList.remove('enTitulo');
  $('hud').classList.remove('oculto');
  mostrar(null);
  entrada.soltarTodo();
  entrada.activa = true;
  entrada.capturarRaton();
  efectos.camara = camera.position;
  mostrarAyuda();
  pedirWake();
  $('btnChat').classList.toggle('oculto', !multi);
  $('ping').classList.toggle('oculto', !multi);
  $('pausaMulti').classList.toggle('oculto', !multi);
  pistas = Ajustes.d().tutorial && Progreso.stats().partidas < 3 ? pistasPara(cfg) : [];
  calidad.malos = 0;
}
let tPartida = 0, sesion = null, pistas = [];

function pistasPara(cfg) {
  const aire = cfg.clasico ? cfg.clasico === 'avion' : (cfg.unidad || 'avion') === 'avion';
  const t = tactil;
  const conMando = () => document.body.classList.contains('conMando');
  if (aire) return [
    [2, () => (t ? 'Mueve el joystick izquierdo para virar y subir' : conMando() ? 'Stick izquierdo: cabeceo y alabeo · RT dispara' : 'Mueve el ratón: el círculo cian marca hacia dónde vuela el avión')],
    [9, () => (t ? 'Botón FUEGO para disparar · MISIL cuando el enemigo esté fijado' : 'Dispara en el cuadro naranja: es el punto de adelanto · Espacio / clic')],
    [17, () => 'Si suena la alarma de misil: bengalas (G / B del mando) y vira de golpe'],
    [26, () => 'Cuida la velocidad: viraje cerrado = pierdes energía. Empuje con Shift/Ctrl'],
    [34, () => 'Pulsa V para cambiar de cámara (cabina, lejos, cerca) y Tab para el marcador'],
  ];
  return [
    [2, () => (t ? 'Joystick izquierdo mueve el tanque · derecho apunta la torreta' : 'W/A/S/D mueven el casco · el ratón apunta la torreta · clic dispara')],
    [10, () => 'Apunta a los lados y la trasera: el frente es el más blindado'],
    [18, () => 'T cambia de munición (perforante / explosiva) · F ametralladora'],
    [26, () => 'V activa la mira del cañón con zoom · M abre el mapa'],
  ];
}

function pausar() {
  if (estado !== 'jugando') return;
  estado = 'pausa';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  entrada.vibrarParar();
  if (!multi) Sonido.motor.parar();
  $('btnPausaCamara').textContent = 'CÁMARA: ' + (modo.nombre === 'tanque' || (modo.unidad === 'tanque') ? NOMBRES_CAM_TANQUE : NOMBRES_CAM)[ctx.camVar | 0];
  pila = [];
  soltarWake();
  mostrar('pantallaPausa');
}

function reanudar() {
  if (estado !== 'pausa') return;
  estado = 'jugando';
  entrada.activa = true;
  entrada.capturarRaton();
  Sonido.iniciar();
  Sonido.motor.iniciar(modo.unidad || modo.nombre === 'tanque' ? (modo.unidad || 'tanque') : 'avion');
  mostrar(null);
  pedirWake();
}

let recargaPendiente = false; // la nube trajo datos nuevos mientras jugabas: se recargan al volver al menú
function volverTitulo() {
  if (modo) modo.destruir();
  modo = null;
  multi = null;
  estado = 'menu';
  if (recargaPendiente) { location.reload(); return; }
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  hud.limpiar();
  soltarWake();
  document.body.classList.add('enTitulo');
  document.body.classList.remove('modoAvion', 'modoTanque', 'cabina', 'mira');
  pila = [];
  menus.pintarTitulo();
  mostrar('pantallaTitulo');
}

// Resumen del final, recompensas, logros y estadísticas globales
function terminar(r) {
  estado = 'fin';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  entrada.vibrarParar();
  Sonido.motor.parar();
  soltarWake();
  const E = ctx.estadisticas;
  let xp, cr, titulo, datos, recText = '';
  if (r.batalla) {
    xp = r.xp; cr = r.cr;
    titulo = r.victoria ? '¡VICTORIA!' : 'DERROTA';
    datos = `Bajas ${r.kills} · Muertes ${r.muertes} · Capturas ${r.capturas} · ${Math.floor(r.tiempo / 60)}:${String(r.tiempo % 60).padStart(2, '0')} · ${ctx.mapa.nombre}`;
  } else {
    xp = Math.round(r.puntaje * 0.22 + (r.victoria ? 150 : 40));
    cr = Math.round(r.puntaje * 0.3 + (r.victoria ? 120 : 20));
    titulo = r.victoria ? '¡VICTORIA!' : 'DERROTA';
    datos = `Puntaje: ${r.puntaje} · Oleada: ${r.oleada}/${CONFIG.oleadas} · ${ctx.mapa.nombre}`;
    const nuevo = guardarRecord(modo.nombre, ctx.mapa.id, r.puntaje, r.oleada);
    enviarPuntaje(modo.nombre === 'tanque' ? 'tanque' : 'aire', r.puntaje);
    const rec = cargarRecords()[claveRecord(modo.nombre, ctx.mapa.id)];
    $('finRecord').textContent = nuevo ? '¡Nuevo récord!' : `Récord: ${rec ? rec.puntaje : 0}`;
  }
  if (r.batalla) $('finRecord').textContent = '';
  // misión completada
  if (r.mision && r.victoria && !Progreso.misionHecha(r.mision)) { Progreso.completarMision(r.mision); recText += 'MISIÓN COMPLETADA · '; }
  else if (r.mision && r.victoria) Progreso.sumar('misiones', 0);
  const s = Progreso.datos().stats;
  Progreso.sumar('partidas'); if (r.victoria) Progreso.sumar('victorias');
  Progreso.sumar('tiempo', Math.round((performance.now() - sesion.t0) / 1000));
  Progreso.sumar('muertes', r.batalla ? r.muertes : 1);
  Progreso.sumar('bajas', r.batalla ? 0 : E.bajas);
  if (r.batalla) { Progreso.sumar('bajas', E.bajas); Progreso.sumar('bajasAire', E.bajasAire); Progreso.sumar('bajasTanque', E.bajasTanque); Progreso.sumar('bajasTierra', E.bajasTierra); Progreso.sumar('capturas', E.capturas); Progreso.maximo('mejorRacha', E.maxRacha); }
  else { Progreso.sumar('bajasAire', E.bajasAire); Progreso.sumar('bajasTanque', E.bajasTanque); Progreso.sumar('bajasTierra', E.bajasTierra); }
  for (const k of ['disparos', 'aciertos', 'bombas', 'misiles', 'danio']) Progreso.sumar(k, Math.round(E[k] || 0));
  void s;
  const subio = Progreso.recompensar(xp, cr);
  const logros = Progreso.revisarLogros();
  recText += `+${xp} XP · +${cr} créditos`;
  if (subio) recText += ` · ¡NIVEL ${subio}!`;
  $('finTitulo').textContent = titulo;
  $('finTitulo').style.color = r.victoria ? '#3df58a' : '#ff4d6d';
  $('finDatos').textContent = datos;
  $('finRecomp').textContent = recText;
  if (logros.length) $('finRecomp').appendChild(el('div', 'info', 'LOGRO: ' + logros.map((l) => l.nombre).join(', ')));
  // cuenta: logros nuevos y XP moderada (por hito de la partida, nunca por tiempo jugado)
  for (const l of logros) reportarLogro(l.id);
  const hitos = r.batalla ? (r.kills || 0) : (E.bajas || 0);
  if ((hitos > 0 || r.victoria) && !(ultimaCfg && ultimaCfg.modo === 'simulacro')) darXp(8 + (r.victoria ? 20 : 0) + Math.min(17, hitos * 2) + (recText.startsWith('MISIÓN') ? 5 : 0));
  const rk = $('finRanking');
  if (!r.batalla && hayCuenta()) { rk.classList.remove('oculto'); pintarRanking(rk, { modo: modo.nombre === 'tanque' ? 'tanque' : 'aire', alcance: 'global', selectorModo: false }); }
  else { rk.classList.add('oculto'); rk.textContent = ''; }
  const ft = $('finTabla');
  ft.textContent = '';
  if (modo.tablaFinal) {
    const cols = modo.tablaFinal();
    hud.tabla(cols);
    const tmp = $('tabla');
    while (tmp.firstChild) ft.appendChild(tmp.firstChild);
    hud.tabla(null);
  }
  $('btnReintentar').classList.toggle('oculto', !!multi);
  $('btnFinHangar').classList.remove('oculto');
  mostrar('pantallaFin');
}

// ----------------------------------------------------------- Botones
$('btnJugar').addEventListener('click', () => ir('pantallaJugar'));
$('btnHangar').addEventListener('click', () => { hangar.abrir(); ir('pantallaHangar'); });
$('btnMisiones').addEventListener('click', () => ir('pantallaMisiones'));
$('btnLogros').addEventListener('click', () => ir('pantallaLogros'));
$('btnRanking').addEventListener('click', () => ir('pantallaRanking'));
$('btnAjustes').addEventListener('click', () => ir('pantallaAjustes'));
$('btnPausaAjustes').addEventListener('click', () => ir('pantallaAjustes'));
$('btnCombatir').addEventListener('click', () => {
  const c = menus.configuracion();
  empezar(c);
});
for (const b of document.querySelectorAll('[data-atras]')) b.addEventListener('click', atras);
$('btnSeguir').addEventListener('click', reanudar);
$('btnReiniciar').addEventListener('click', () => { if (multi) return; empezar(ultimaCfg); });
$('btnTitulo').addEventListener('click', volverTitulo);
$('btnReintentar').addEventListener('click', () => empezar(ultimaCfg));
$('btnFinTitulo').addEventListener('click', volverTitulo);
$('btnFinHangar').addEventListener('click', () => { volverTitulo(); hangar.abrir(); ir('pantallaHangar'); });
$('btnPausa').addEventListener('click', pausar);
$('btnPausaCamara').addEventListener('click', () => { cambiarCamara(); $('btnPausaCamara').textContent = 'CÁMARA: ' + ((modo.unidad === 'tanque' || modo.nombre === 'tanque') ? NOMBRES_CAM_TANQUE : NOMBRES_CAM)[ctx.camVar | 0]; });
$('btnChat').addEventListener('click', () => chatRapido(true));
$('resAvion').addEventListener('click', () => modo.elegirRespawn && modo.elegirRespawn('avion'));
$('resTanque').addEventListener('click', () => modo.elegirRespawn && modo.elegirRespawn('tanque'));
$('resAhora').addEventListener('click', () => modo.elegirRespawn && modo.elegirRespawn(modo.unidad));
$('radar').addEventListener('click', () => hud.mapaGrande(!hud.verMapa));
$('btnPantalla').addEventListener('click', pantallaCompleta);
function pantallaCompleta() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch (e) { /* no disponible */ }
}

function cambiarCamara() {
  const tanque = modo && (modo.unidad === 'tanque' || modo.nombre === 'tanque');
  ctx.camVar = ((ctx.camVar | 0) + 1) % 4;
  ctx.camaras.especial = null;
  hud.aviso('CÁMARA: ' + (tanque ? NOMBRES_CAM_TANQUE : NOMBRES_CAM)[ctx.camVar], 1);
}

// Chat rápido (teclado: Y y número, táctil: botón CHAT, mando: LB+RB)
function chatRapido(abrir) {
  const p = $('chatRapido');
  if (!multi) return;
  if (!abrir) { p.classList.add('oculto'); return; }
  p.textContent = '';
  FRASES.forEach((f, i) => {
    const b = el('button', '', `${i + 1}. ${f}`);
    b.type = 'button';
    b.addEventListener('click', () => { multi.chat(f); p.classList.add('oculto'); });
    p.appendChild(b);
  });
  p.classList.remove('oculto');
  if (document.body.classList.contains('conMando')) enfocar(p.firstChild);
}

// ----------------------------------------------------------- Mando y teclado
function actualizarFuente() { document.body.classList.toggle('conMando', !!entrada.mando && entrada.usoMando); }
function mostrarAyuda() {
  const h = $('ayudaMando');
  h.classList.add('visible');
  clearTimeout(tAyuda);
  tAyuda = setTimeout(() => h.classList.remove('visible'), 9000);
}
entrada.alFuente = () => {
  actualizarFuente();
  if (!entrada.usoMando) document.body.classList.remove('navMando');
  else if (estado === 'jugando') mostrarAyuda();
};
entrada.alMando = (conectado) => {
  actualizarFuente();
  toast(conectado ? 'MANDO CONECTADO' : 'MANDO DESCONECTADO');
  if (!conectado) { $('ayudaMando').classList.remove('visible'); if (estado === 'jugando') pausar(); }
};

entrada.alNav = (a) => {
  if (Lobby_abierto()) return;
  if (estado === 'jugando') {
    if (!$('chatRapido').classList.contains('oculto')) {
      document.body.classList.add('navMando');
      if (a === 'arriba' || a === 'abajo') mover([$('chatRapido')], a, $('chatRapido').firstChild);
      else if (a === 'ok') { const f = document.activeElement; if (f && f.closest && f.closest('#chatRapido')) f.click(); }
      else if (a === 'atras') chatRapido(false);
      return;
    }
    if (!$('reaparecer').classList.contains('oculto')) {
      document.body.classList.add('navMando');
      if (a === 'lb' || a === 'x') modo.elegirRespawn && modo.elegirRespawn('avion');
      else if (a === 'rb' || a === 'y') modo.elegirRespawn && modo.elegirRespawn('tanque');
      else if (a === 'ok') modo.elegirRespawn && modo.elegirRespawn(modo.unidad);
    }
    return;
  }
  document.body.classList.add('navMando');
  const id = actual;
  if (!id) return;
  const raices = id === 'pantallaTitulo' ? [$('volverMenu'), $(id)] : [$(id)];
  if (a === 'arriba' || a === 'abajo' || a === 'izq' || a === 'der') { mover(raices, a, preferido(id)); return; }
  if (performance.now() - tPantalla < (estado === 'fin' ? 900 : 250)) return;
  if (a === 'ok') {
    const f = document.activeElement;
    if (f && enfocables(raices).includes(f)) f.click();
    else enfocar(preferido(id));
  } else if (a === 'atras') {
    if (id === 'pantallaTitulo') location.href = '../';
    else if (id === 'pantallaPausa') reanudar();
    else if (id === 'pantallaFin') volverTitulo();
    else if (id === 'pantallaEquipos') $('btnEqSalir').click();
    else atras();
  } else if (id === 'pantallaJugar' && (a === 'lt' || a === 'rt')) enfocar(menus.ciclarMapa(a === 'rt' ? 1 : -1));
  else if (id === 'pantallaAjustes' && (a === 'lb' || a === 'rb')) { panelAj.ciclar(a === 'rb' ? 1 : -1); enfocar(panelAj.botonesTab[panelAj.tab]); }
  else if (id === 'pantallaHangar' && (a === 'lb' || a === 'rb')) { hangar.ciclarTab(); enfocar(hangar.tabs.firstChild); }
};

entrada.alTecla = (codigo) => {
  if (Lobby_abierto()) return;
  if (codigo === 'Escape' || codigo === 'KeyP' || codigo === 'PadStart') {
    if (estado === 'jugando') { if (!$('chatRapido').classList.contains('oculto')) chatRapido(false); else pausar(); }
    else if (estado === 'pausa' && actual === 'pantallaPausa') reanudar();
    else if (estado === 'pausa' && pila.length) atras();
  } else if (estado !== 'jugando') return;
  else if (codigo === 'PadView' || codigo === 'KeyH') hud.raiz.classList.toggle('limpio');
  else if (codigo === 'PadY' || codigo === 'KeyV') cambiarCamara();
  else if (codigo === 'KeyM') hud.mapaGrande(!hud.verMapa);
  else if (codigo === 'KeyY') chatRapido($('chatRapido').classList.contains('oculto'));
  else if (codigo === 'Digit1' || codigo === 'Digit2') {
    if (!$('chatRapido').classList.contains('oculto') || (multi && codigo === 'Digit1' && false)) return;
    if (modo.elegirRespawn && !$('reaparecer').classList.contains('oculto')) modo.elegirRespawn(codigo === 'Digit1' ? 'avion' : 'tanque');
  }
  if (!$('chatRapido').classList.contains('oculto') && /^Digit[1-8]$/.test(codigo)) {
    const f = FRASES[parseInt(codigo.slice(5), 10) - 1];
    if (f) { multi.chat(f); chatRapido(false); }
  }
};

efectos.alExplosion = (f) => {
  if (f > 0.12 && estado === 'jugando') entrada.vibrar(Math.min(1, f), Math.min(1, f * 0.7), 120 + Math.min(1, f) * 220, 'explosion', 90);
};
proyectiles.alAcierto = null;

document.addEventListener('pointerlockchange', () => {
  const ahora = document.pointerLockElement === lienzo;
  if (bloqueado && !ahora && estado === 'jugando' && !Lobby_abierto()) pausar();
  bloqueado = ahora;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pausar();
  else if (estado === 'jugando') pedirWake();
});
document.addEventListener('fullscreenchange', () => { ajustar(); });

function desbloquear() {
  Sonido.iniciar();
  Musica.iniciar();
  const c = Sonido.contexto();
  if (c && c.state === 'running') {
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) removeEventListener(ev, desbloquear, true);
  }
}
for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) addEventListener(ev, desbloquear, true);

// ----------------------------------------------------------- Multijugador
const MODOS_MULTI = [
  { id: 'ffa', nombre: 'Duelo libre (todos contra todos)' },
  { id: 'equipos', nombre: 'Batalla por equipos' },
  { id: 'coop', nombre: 'Cooperativo contra bots' },
  { id: 'combinado', nombre: 'Combate combinado aire + tierra' },
];
const OPTS_LOBBY = { juego: 'Alas y Acero', maxJugadores: 4, minJugadores: 1, modos: MODOS_MULTI, alIniciar: (config, jugadores) => prepararMulti(config, jugadores) };
// true mientras el lobby o un cuadro de la plataforma (conflicto de nube, cuenta) tapan el juego: la entrada se pausa
const Lobby_abierto = () => !!(window.Lobby && window.Lobby.abierto) || !!document.querySelector('.cu-fondo');
let mp = null;
if (window.Lobby && window.Lobby.registrar) window.Lobby.registrar(OPTS_LOBBY);

$('btnMulti').addEventListener('click', () => { if (window.Lobby) window.Lobby.abrir(OPTS_LOBBY); });

function miInfoMulti() {
  const modoM = mp.modo;
  const unidad = modoM === 'ffa' ? 'avion' : mp.unidad[window.Red.miId] || (modoM === 'combinado' ? 'avion' : menus.sel.unidad);
  const id = Progreso.elegido(unidad);
  const d = unidad === 'avion' ? Progreso.defAvion(id) : TANQUES[id];
  const p = Progreso.pintura(unidad, id), camo = CAMUFLAJES[p.camo];
  return { eq: mp.equipos[window.Red.miId], u: unidad, v: id, col: unidad === 'avion' ? d.colores : [camo && camo.c ? camo.c[0] : d.color], mk: p.marca };
}

function prepararMulti(config) {
  const Red = window.Red;
  if (modo) { modo.destruir(); modo = null; estado = 'menu'; }
  hud.limpiar();
  mp = { modo: config.modo, equipos: {}, unidad: {}, pre: {}, nivel: menus.sel.nivel, mapa: menus.sel.mapa, unidadHost: menus.sel.unidad, tam: 4 };
  Red.lista().forEach((j) => { mp.equipos[j.id] = config.modo === 'ffa' ? 'ffa' : config.modo === 'coop' ? 'jugador' : j.id % 2 === 0 ? 'jugador' : 'enemigo'; });
  mp.equipos[Red.miId] = mp.equipos[Red.miId] || 'jugador';
  if (Red.esAnfitrion) { mp.mapa = menus.sel.mapa; }
  document.body.classList.add('enTitulo');
  mostrar('pantallaEquipos');
  estado = 'menu';
  dibujarEquipos();
  difundirPre();
}

function difundirPre() {
  const Red = window.Red;
  const info = miInfoMulti();
  mp.pre[Red.miId] = info;
  Red.difundir('pre', info);
}

function dibujarEquipos() {
  const Red = window.Red, cont = $('eqLista');
  cont.textContent = '';
  const modoM = mp.modo;
  $('eqInfo').textContent = { ffa: 'Duelo libre: cada piloto por su cuenta, con bots de relleno.', equipos: 'Elige tu equipo. Los bots rellenan los huecos.', coop: 'Cooperativo: todos juntos contra oleadas de bots.', combinado: 'Combinado: elige tu equipo y si empiezas en avión o tanque.' }[modoM] + (Red.esAnfitrion ? ' Tú eliges mapa y nivel en COMBATE antes de crear la sala.' : ' Espera a que el anfitrión comience.');
  for (const j of Red.lista()) {
    const f = el('div', 'eqFila');
    const dot = el('i', 'pDot');
    dot.style.background = j.color;
    const nom = el('span', '', j.nombre + (j.id === Red.miId ? ' (tú)' : '') + (j.id === 0 ? ' · anfitrión' : ''));
    f.append(dot, nom);
    const pre = mp.pre[j.id];
    if (pre) f.appendChild(el('small', '', `${pre.u === 'avion' ? 'AVIÓN' : 'TANQUE'} ${(pre.u === 'avion' ? AVIONES : TANQUES)[pre.v] ? (pre.u === 'avion' ? AVIONES : TANQUES)[pre.v].nombre : ''}`));
    if (modoM === 'equipos' || modoM === 'combinado') {
      const b = el('button', '', 'EQUIPO ' + (mp.equipos[j.id] === 'jugador' ? 'A' : 'B'));
      b.type = 'button';
      b.disabled = !(j.id === Red.miId || Red.esAnfitrion);
      b.addEventListener('click', () => { mp.equipos[j.id] = mp.equipos[j.id] === 'jugador' ? 'enemigo' : 'jugador'; Red.difundir('preeq', { id: j.id, eq: mp.equipos[j.id] }); dibujarEquipos(); });
      f.appendChild(b);
    }
    cont.appendChild(f);
  }
  const op = $('eqOpc');
  op.textContent = '';
  if (modoM === 'combinado') {
    const b = el('button', '', 'EMPIEZO EN: ' + ((mp.unidad[Red.miId] || 'avion') === 'avion' ? 'AVIÓN' : 'TANQUE'));
    b.type = 'button';
    b.addEventListener('click', () => { mp.unidad[Red.miId] = (mp.unidad[Red.miId] || 'avion') === 'avion' ? 'tanque' : 'avion'; difundirPre(); dibujarEquipos(); });
    op.appendChild(b);
  }
  $('btnEqComenzar').classList.toggle('oculto', !Red.esAnfitrion);
}

$('btnEqComenzar').addEventListener('click', () => {
  const Red = window.Red;
  if (!Red.esAnfitrion) return;
  const veh = {};
  for (const j of Red.lista()) veh[j.id] = mp.pre[j.id] || { u: 'avion', v: 'halcon' };
  const cfg = { modo: mp.modo, mapa: mp.mapa, nivel: mp.nivel, tam: mp.tam, unidad: mp.unidadHost, equipos: mp.equipos, vehiculos: veh };
  Red.difundir('cfgjuego', cfg);
  arrancarMulti(cfg);
});
$('btnEqSalir').addEventListener('click', () => { try { window.Red.salir(); } catch (e) { /* nada */ } mp = null; volverTitulo(); });

function arrancarMulti(c) {
  const Red = window.Red;
  const modoM = c.modo;
  const eqs = {};
  for (const id in c.equipos) eqs[id] = c.equipos[id];
  const m = new Multi(ctx, { modo: modoM, equipos: eqs, vehiculos: c.vehiculos });
  const mi = c.vehiculos[Red.miId] || { u: 'avion' };
  const cfg = { red: m, nivel: c.nivel, tam: modoM === 'ffa' ? 8 : c.tam, unidad: mi.u, mapa: c.mapa };
  if (modoM === 'ffa') { cfg.modo = 'duelo'; cfg.unidad = 'avion'; }
  else if (modoM === 'coop') { cfg.modo = 'mision'; cfg.coop = true; cfg.mision = { id: 'coop', nombre: 'Cooperativo', tipo: 'supervivencia', tiempo: 420, nivel: c.nivel, cr: 400, xp: 250, desc: 'Sobrevivan juntos a las oleadas.' }; }
  else if (modoM === 'combinado') { cfg.modo = 'arcade'; cfg.combinado = true; }
  else { cfg.modo = 'arcade'; cfg.unidad = c.unidad === 'tanque' ? 'tanque' : 'avion'; cfg.unidad = mi.u; }
  mp.equipo = eqs[Red.miId];
  m.miEquipo_ = eqs[Red.miId];
  empezar(cfg);
}

if (window.Red) {
  window.Red.on('mensaje', (t, d, de) => {
    if (t === 'pre' && mp) { mp.pre[de] = d; if (estado === 'menu' && actual === 'pantallaEquipos') dibujarEquipos(); }
    else if (t === 'preeq' && mp) { mp.equipos[d.id] = d.eq; if (actual === 'pantallaEquipos') dibujarEquipos(); }
    else if (t === 'cfgjuego' && mp && !window.Red.esAnfitrion) arrancarMulti(d);
  });
  window.Red.on('jugadorUnido', () => { if (mp && actual === 'pantallaEquipos') { const R = window.Red; mp.equipos[R.lista().slice(-1)[0].id] = mp.modo === 'ffa' ? 'ffa' : 'jugador'; dibujarEquipos(); } });
  window.Red.on('jugadorSalio', () => { if (mp && actual === 'pantallaEquipos') dibujarEquipos(); });
  window.Red.on('cerrado', () => {
    if (!mp) return;
    toast('LA SALA SE HA CERRADO');
    mp = null;
    if (estado !== 'menu') volverTitulo();
    else mostrar('pantallaTitulo');
  });
  window.Red.on('chat', (de, texto, j) => {
    const l = $('chatLog');
    const d = el('div', '', `${j ? j.nombre : 'Jugador'}: ${texto}`);
    if (j) d.style.color = j.color;
    l.appendChild(d);
    setTimeout(() => d.remove(), 7000);
    while (l.children.length > 5) l.firstChild.remove();
  });
  if (window.Lobby && window.Lobby.hayEnlace && window.Lobby.hayEnlace()) window.Lobby.abrir(OPTS_LOBBY);
}

// ----------------------------------------------------------- Nube
alBajarDatos(() => { if (estado === 'menu') location.reload(); else { recargaPendiente = true; toast('DATOS NUEVOS EN LA NUBE: SE APLICAN AL VOLVER AL MENÚ'); } });
reportarPendientes(Object.keys(Progreso.datos().logros || {}));

// ----------------------------------------------------------- Ciclo
let ultimo = performance.now();
let tiempo = 0;
let ultimoDibujo = 0;
let tPausaRed = 0;

function bucle(ahora) {
  requestAnimationFrame(bucle);
  const lim = calidad.limiteMs;
  if (lim && ahora - ultimoDibujo < lim) return;
  ultimoDibujo = ahora;
  const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimo) / 1000));
  ultimo = ahora;
  tiempo += dt;
  entrada.bloqueada = Lobby_abierto();
  if (!entrada.bloqueada) entrada.leerMando();
  calidad.cuadro(ahora, dt);
  terreno.actualizar(tiempo);
  cielo.actualizar(dt);
  const enRed = !!multi && modo && (estado === 'jugando' || estado === 'pausa');
  if (estado === 'jugando' || enRed) {
    modo.actualizar(dt);
    efectos.actualizar(dt);
    hud.tick(dt);
    tPartida += dt;
    const s = efectos.sacudida * 0.35;
    if (s > 0.01 && estado === 'jugando') {
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    if (pistas.length && tPartida > pistas[0][0]) { const p = pistas.shift(); hud.pista(p[1]()); setTimeout(() => hud.pista(''), 6500); }
    if (multi && window.Red) {
      tPausaRed -= dt;
      if (tPausaRed <= 0) { tPausaRed = 1; $('ping').textContent = 'PING ' + Math.round(window.Red.rtt || 0) + ' ms'; }
      if (estado === 'jugando' && entrada.k('PadLB') && entrada.k('PadRB') && $('chatRapido').classList.contains('oculto')) chatRapido(true);
    }
    if (modo.resultado && estado === 'jugando') terminar(modo.resultado);
    else if (modo.resultado && enRed) terminar(modo.resultado);
    if (calidad && terrenoPendiente === false) { /* nada */ }
    if (ctx.jugador && ctx.jugador.pos) calidad.sombra(ctx.jugador.pos, ctx.jugador.tipo === 'aire' ? 380 : 190);
    else if (modo.jugador) calidad.sombra(modo.jugador.pos, modo.nombre === 'tanque' ? 190 : 380);
  } else if (estado === 'fin') {
    efectos.actualizar(dt);
  } else if (estado === 'menu' || estado === 'pausa') {
    const a = tiempo * 0.06;
    const cx = Math.cos(a) * 520, cz = Math.sin(a) * 520;
    if (estado === 'menu') {
      camera.position.set(cx, Math.max(190, terreno.techo(cx, cz) + 60), cz);
      camera.lookAt(0, 30, 0);
      calidad.sombra(camera.position, 600);
    }
  }
  cielo.seguir(camera.position);
  entrada.finDeFrame();
  renderer.render(escena, camera);
}

requestAnimationFrame(bucle);

// Solo para pruebas automáticas: abre la página con ?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.__guerra = { vistas, get estado() { return estado; }, get modo() { return modo; }, ctx, empezar, menus, volverTitulo, Progreso, Ajustes, calidad, hangar, ir, atras, pausar, reanudar, get multi() { return multi; }, prepararMulti, arrancarMulti, get mp() { return mp; } };
}
void MAPAS; void AVIONES; void CAMPANAS; void THREE;
