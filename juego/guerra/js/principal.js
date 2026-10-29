// =============================================================
//  PRINCIPAL: escena 3D, menús y el ciclo del juego.
//  Cada modo (avión / tanque) es una clase con iniciar(),
//  actualizar(dt) y destruir(); aquí solo se les da la hora.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG, MAPAS, AVIONES } from './config.js';
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
import { cargarRecords, guardarRecord, claveRecord, mejorPuntaje, cargarOpciones, guardarOpciones } from './guardado.js';
import { Menu } from './menu.js';
import { mover, enfocables, enfocar } from './navMando.js';

const $ = (id) => document.getElementById(id);
THREE.ColorManagement.enabled = false;

const lienzo = $('lienzo');
const tactil = detectarTactil();
document.body.classList.toggle('tactil', tactil);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !tactil, powerPreference: 'high-performance' });
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
const ctx = { camVar: 0, escena, camera, renderer, terreno: null, mapa: null, avionId: '', efectos, proyectiles, hud, entrada, opciones, ancho: 1, alto: 1 };

// ----------------------------------------------------------- Mapa elegido
// Al cambiar de mapa se libera el terreno anterior y se genera el nuevo (semilla fija)
function cargarMapa(id) {
  if (terreno && terreno.id === id) return;
  const d = MAPAS[id];
  if (terreno) terreno.destruir();
  terreno = new Terreno(escena, id);
  ctx.terreno = terreno;
  ctx.mapa = d;
  proyectiles.terreno = terreno;
  cielo.aplicar(d.cielo);
  escena.background.set(d.cielo.horizonte);
  escena.fog.color.set(d.cielo.horizonte);
  escena.fog.density = d.niebla;
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
  const pr = Math.min(devicePixelRatio || 1, tactil ? 1.5 : CONFIG.vista.pixelRatioMax);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  efectos.fijarEscala((h * pr) / (2 * Math.tan((CONFIG.vista.fov * Math.PI) / 360)));
  ctx.ancho = w;
  ctx.alto = h;
}
addEventListener('resize', ajustar);
ajustar();

// ----------------------------------------------------------- Menús
const pantallas = ['pantallaTitulo', 'pantallaPausa', 'pantallaFin'];
let tPantalla = 0;
function mostrar(id) {
  for (const p of pantallas) $(p).classList.toggle('oculto', p !== id);
  tPantalla = performance.now();
  // sin pantalla visible no debe quedar un botón con foco (Espacio/Enter lo pulsarían)
  if (!id && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  // con mando se arranca con el foco ya puesto en el botón principal
  if (id && document.body.classList.contains('conMando')) enfocar(preferido(id));
}
function preferido(id) {
  return $({ pantallaTitulo: 'btnAvion', pantallaPausa: 'btnSeguir', pantallaFin: 'btnReintentar' }[id]);
}

let estado = 'titulo';
let modo = null;
let bloqueado = false;

function textoRecords() {
  const r = cargarRecords();
  const f = (x) => (x ? `Récord: ${x.puntaje} (oleada ${x.oleada})` : 'Récord: 0');
  $('recAvion').textContent = f(r[claveRecord('avion', ctx.mapa.id)]);
  $('recTanque').textContent = f(r[claveRecord('tanque', ctx.mapa.id)]);
}

// ----------------------------------------------------------- Selección de mapa y avión
function elegir(mapa, avion) {
  if (mapa) cargarMapa(mapa);
  if (avion) ctx.avionId = avion;
  guardarOpciones({ ...cargarOpciones(), mapa: ctx.mapa.id, avion: ctx.avionId });
  textoRecords();
}
const disponible = (id) => mejorPuntaje('avion') >= AVIONES[id].desbloqueo;
const guardado = cargarOpciones();
const mapaInicial = MAPAS[guardado.mapa] ? guardado.mapa : CONFIG.predeterminado.mapa;
cargarMapa(mapaInicial);
ctx.avionId = AVIONES[guardado.avion] && disponible(guardado.avion) ? guardado.avion : CONFIG.predeterminado.avion;
const menu = new Menu(renderer, { mapa: ctx.mapa.id, avion: ctx.avionId }, {
  mapa: (id) => elegir(id, null),
  avion: (id) => elegir(null, id),
  disponible,
  mejor: () => mejorPuntaje('avion'),
});

function actualizarBotones() {
  $('btnMusica').textContent = 'MÚSICA: ' + (Musica.activa() ? 'SÍ' : 'NO');
  $('btnEfectos').textContent = 'SONIDOS: ' + (Sonido.efectosActivos() ? 'SÍ' : 'NO');
  $('btnInvertir').textContent = 'CABECEO: ' + (opciones.invertido ? 'INVERTIDO' : 'NORMAL');
  $('btnInvertir').classList.toggle('oculto', !modo);
  $('btnVibrar').textContent = 'VIBRACIÓN: ' + (entrada.vibracion ? 'SÍ' : 'NO');
  $('btnRaton').textContent = 'RATÓN: ' + (opciones.raton === 'joystick' ? 'JOYSTICK VIRTUAL' : 'APUNTAR');
  $('rangoSens').value = opciones.sens || 1;
  $('valSens').textContent = (opciones.sens || 1).toFixed(1);
}

function empezar(nombre) {
  Sonido.iniciar();
  Musica.iniciar();
  if (modo) modo.destruir();
  hud.limpiar();
  modo = nombre === 'avion' ? new ModoAvion(ctx) : new ModoTanque(ctx);
  modo.iniciar();
  estado = 'jugando';
  document.body.classList.remove('enTitulo');
  $('hud').classList.remove('oculto');
  mostrar(null);
  entrada.soltarTodo();
  entrada.activa = true;
  entrada.capturarRaton();
  ctx.efectos.camara = camera.position;
  mostrarAyuda();
}

function pausar() {
  if (estado !== 'jugando') return;
  estado = 'pausa';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  entrada.vibrarParar();
  Sonido.motor.parar();
  actualizarBotones();
  mostrar('pantallaPausa');
}

function reanudar() {
  if (estado !== 'pausa') return;
  estado = 'jugando';
  entrada.activa = true;
  entrada.capturarRaton();
  Sonido.iniciar();
  Sonido.motor.iniciar(modo.nombre);
  mostrar(null);
}

function volverTitulo() {
  if (modo) modo.destruir();
  modo = null;
  estado = 'titulo';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  hud.limpiar();
  document.body.classList.add('enTitulo');
  document.body.classList.remove('modoAvion', 'modoTanque');
  textoRecords();
  menu.refrescar();
  mostrar('pantallaTitulo');
}

function terminar(r) {
  estado = 'fin';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  entrada.vibrarParar();
  Sonido.motor.parar();
  const nuevo = guardarRecord(modo.nombre, ctx.mapa.id, r.puntaje, r.oleada);
  $('finTitulo').textContent = r.victoria ? '¡VICTORIA!' : 'DERROTA';
  $('finDatos').textContent = `Puntaje: ${r.puntaje} · Oleada: ${r.oleada}/${CONFIG.oleadas} · ${ctx.mapa.nombre}`;
  const rec = cargarRecords()[claveRecord(modo.nombre, ctx.mapa.id)];
  $('finRecord').textContent = nuevo ? '¡Nuevo récord!' : `Récord: ${rec ? rec.puntaje : 0}`;
  $('finTitulo').style.color = r.victoria ? '#3df58a' : '#ff4d6d';
  mostrar('pantallaFin');
}

$('btnAvion').addEventListener('click', () => empezar('avion'));
$('btnTanque').addEventListener('click', () => empezar('tanque'));
$('btnSeguir').addEventListener('click', reanudar);
$('btnReiniciar').addEventListener('click', () => empezar(modo.nombre));
$('btnTitulo').addEventListener('click', volverTitulo);
$('btnReintentar').addEventListener('click', () => empezar(modo.nombre));
$('btnFinTitulo').addEventListener('click', volverTitulo);
$('btnMusica').addEventListener('click', () => { Sonido.iniciar(); Musica.iniciar(); Musica.alternar(); actualizarBotones(); });
$('btnEfectos').addEventListener('click', () => { Sonido.iniciar(); Sonido.alternarEfectos(); actualizarBotones(); });
$('btnInvertir').addEventListener('click', () => {
  opciones.invertido = !opciones.invertido;
  guardarOpciones({ ...cargarOpciones(), invertido: opciones.invertido });
  if (modo && modo.jugador) modo.jugador.invertido = opciones.invertido;
  actualizarBotones();
});
$('btnVibrar').addEventListener('click', () => {
  entrada.vibracion = !entrada.vibracion;
  guardarOpciones({ ...cargarOpciones(), vibracion: entrada.vibracion });
  actualizarBotones();
  entrada.vibrar(0.6, 0.6, 200, 'prueba', 0);
});
$('btnRaton').addEventListener('click', () => {
  opciones.raton = opciones.raton === 'joystick' ? 'apuntar' : 'joystick';
  guardarOpciones({ ...cargarOpciones(), raton: opciones.raton });
  actualizarBotones();
});
$('rangoSens').addEventListener('input', (e) => {
  opciones.sens = parseFloat(e.target.value) || 1;
  guardarOpciones({ ...cargarOpciones(), sens: opciones.sens });
  actualizarBotones();
});
$('btnPausa').addEventListener('click', pausar);

// Mando: aviso al conectarlo y textos de ayuda (solo si el mando es lo que se está usando)
let tToast = 0, tAyuda = 0;
function actualizarFuente() {
  document.body.classList.toggle('conMando', !!entrada.mando && entrada.usoMando);
}
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
entrada.alMando = (conectado, nombre) => {
  actualizarFuente();
  const t = $('toastMando');
  t.textContent = conectado ? 'MANDO CONECTADO' : 'MANDO DESCONECTADO';
  t.classList.remove('oculto');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.add('oculto'), 3200);
  // sin mando no se sigue volando a ciegas
  if (!conectado) { $('ayudaMando').classList.remove('visible'); if (estado === 'jugando') pausar(); }
};

// Menús con mando: cruceta / stick izq. mueven el foco, A acepta, B vuelve, LB/RB avión, LT/RT mapa
entrada.alNav = (a) => {
  if (estado === 'jugando') return;
  document.body.classList.add('navMando');
  const id = { titulo: 'pantallaTitulo', pausa: 'pantallaPausa', fin: 'pantallaFin' }[estado];
  if (!id) return;
  const raices = estado === 'titulo' ? [$('volverMenu'), $(id)] : [$(id)];
  if (a === 'arriba' || a === 'abajo' || a === 'izq' || a === 'der') { mover(raices, a, preferido(id)); return; }
  // un margen tras abrir la pantalla evita aceptar sin querer (p. ej. soltar la bomba al morir)
  if (performance.now() - tPantalla < (estado === 'fin' ? 900 : 250)) return;
  if (a === 'ok') {
    const f = document.activeElement;
    if (f && enfocables(raices).includes(f)) f.click();
    else enfocar(preferido(id));
  } else if (a === 'atras') {
    if (estado === 'titulo') location.href = '../';
    else if (estado === 'pausa') reanudar();
    else volverTitulo();
  } else if (estado === 'titulo') {
    if (a === 'lb' || a === 'rb') enfocar(menu.ciclarAvion(a === 'rb' ? 1 : -1));
    else if (a === 'lt' || a === 'rt') enfocar(menu.ciclarMapa(a === 'rt' ? 1 : -1));
    else if (a === 'menu') empezar('avion');
  }
};

entrada.alTecla = (codigo) => {
  if (codigo === 'Escape' || codigo === 'KeyP' || codigo === 'PadStart') {
    if (estado === 'jugando') pausar();
    else if (estado === 'pausa') reanudar();
  } else if (codigo === 'KeyM') {
    Musica.alternar();
    actualizarBotones();
  } else if (codigo === 'PadView' && estado === 'jugando') {
    hud.raiz.classList.toggle('limpio');
  } else if (codigo === 'PadY' && estado === 'jugando') {
    ctx.camVar = (ctx.camVar + 1) % 3;
    hud.aviso('CÁMARA: ' + ['NORMAL', 'LEJOS', 'CERCA'][ctx.camVar], 1);
  }
};

// Vibración de las explosiones cercanas
efectos.alExplosion = (f) => {
  if (f > 0.12 && estado === 'jugando') entrada.vibrar(Math.min(1, f), Math.min(1, f * 0.7), 120 + Math.min(1, f) * 220, 'explosion', 90);
};

// Al soltar el ratón con Esc el navegador no avisa por teclado: se pausa solo
document.addEventListener('pointerlockchange', () => {
  const ahora = document.pointerLockElement === lienzo;
  if (bloqueado && !ahora && estado === 'jugando') pausar();
  bloqueado = ahora;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

// El audio solo arranca tras el primer gesto (iOS)
function desbloquear() {
  Sonido.iniciar();
  Musica.iniciar();
  const c = Sonido.contexto();
  if (c && c.state === 'running') {
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) removeEventListener(ev, desbloquear, true);
  }
}
for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) addEventListener(ev, desbloquear, true);

// ----------------------------------------------------------- Ciclo
let ultimo = performance.now();
let tiempo = 0;

function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimo) / 1000));
  ultimo = ahora;
  tiempo += dt;
  entrada.leerMando();
  terreno.actualizar(tiempo);
  if (estado === 'jugando') {
    modo.actualizar(dt);
    efectos.actualizar(dt);
    hud.tick(dt);
    const s = efectos.sacudida * 0.35;
    if (s > 0.01) {
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    if (modo.resultado) terminar(modo.resultado);
  } else if (estado === 'fin') {
    efectos.actualizar(dt);
  } else if (estado === 'titulo') {
    const a = tiempo * 0.06;
    const cx = Math.cos(a) * 520, cz = Math.sin(a) * 520;
    camera.position.set(cx, Math.max(190, terreno.techo(cx, cz) + 60), cz);
    camera.lookAt(0, 30, 0);
  }
  cielo.seguir(camera.position);
  entrada.finDeFrame();
  renderer.render(escena, camera);
}

textoRecords();
actualizarBotones();
requestAnimationFrame(bucle);

// Solo para pruebas automáticas: abre la página con ?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.__guerra = { get estado() { return estado; }, get modo() { return modo; }, ctx, empezar, elegir, menu, volverTitulo };
}
