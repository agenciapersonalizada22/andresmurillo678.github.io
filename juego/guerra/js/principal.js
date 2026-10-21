// =============================================================
//  PRINCIPAL: escena 3D, menús y el ciclo del juego.
//  Cada modo (avión / tanque) es una clase con iniciar(),
//  actualizar(dt) y destruir(); aquí solo se les da la hora.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { Terreno } from './terreno.js';
import { Cielo, DIR_SOL } from './cielo.js';
import { Efectos } from './efectos.js';
import { Proyectiles } from './proyectiles.js';
import { Hud } from './hud.js';
import { Entrada, detectarTactil } from './entrada.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';
import { ModoAvion } from './modoAvion.js';
import { ModoTanque } from './modoTanque.js';
import { cargarRecords, guardarRecord, cargarOpciones, guardarOpciones } from './guardado.js';

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
escena.add(new THREE.HemisphereLight(0xdcebff, 0x7a8a60, 2.1));
const sol = new THREE.DirectionalLight(0xfff0d2, 2.4);
sol.position.copy(DIR_SOL).multiplyScalar(500);
escena.add(sol);

const camera = new THREE.PerspectiveCamera(CONFIG.vista.fov, 1, 0.5, CONFIG.vista.lejos);
const opciones = cargarOpciones();
const terreno = new Terreno(escena, (Math.random() * 1e9) | 0);
const cielo = new Cielo(escena);
const efectos = new Efectos(escena);
const proyectiles = new Proyectiles(escena, terreno, efectos);
const hud = new Hud();
const entrada = new Entrada(lienzo);
entrada.tactil = tactil;
const ctx = { escena, camera, renderer, terreno, efectos, proyectiles, hud, entrada, opciones, ancho: 1, alto: 1 };

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
function mostrar(id) {
  for (const p of pantallas) $(p).classList.toggle('oculto', p !== id);
}

let estado = 'titulo';
let modo = null;
let bloqueado = false;

function textoRecords() {
  const r = cargarRecords();
  const f = (x) => (x ? `Récord: ${x.puntaje} (oleada ${x.oleada})` : 'Récord: 0');
  $('recAvion').textContent = f(r.avion);
  $('recTanque').textContent = f(r.tanque);
}

function actualizarBotones() {
  $('btnMusica').textContent = 'MÚSICA: ' + (Musica.activa() ? 'SÍ' : 'NO');
  $('btnEfectos').textContent = 'SONIDOS: ' + (Sonido.efectosActivos() ? 'SÍ' : 'NO');
  $('btnInvertir').textContent = 'CABECEO: ' + (opciones.invertido ? 'INVERTIDO' : 'NORMAL');
  $('btnInvertir').classList.toggle('oculto', !modo || modo.nombre !== 'avion');
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
}

function pausar() {
  if (estado !== 'jugando') return;
  estado = 'pausa';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
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
  mostrar('pantallaTitulo');
}

function terminar(r) {
  estado = 'fin';
  entrada.activa = false;
  entrada.soltarTodo();
  entrada.soltarRaton();
  Sonido.motor.parar();
  const nuevo = guardarRecord(modo.nombre, r.puntaje, r.oleada);
  $('finTitulo').textContent = r.victoria ? '¡VICTORIA!' : 'DERROTA';
  $('finDatos').textContent = `Puntaje: ${r.puntaje} · Oleada: ${r.oleada}/${CONFIG.oleadas}`;
  const rec = cargarRecords()[modo.nombre];
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
$('btnPausa').addEventListener('click', pausar);

entrada.alTecla = (codigo) => {
  if (codigo === 'Escape' || codigo === 'KeyP') {
    if (estado === 'jugando') pausar();
    else if (estado === 'pausa') reanudar();
  } else if (codigo === 'KeyM') {
    Musica.alternar();
    actualizarBotones();
  }
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
    camera.position.set(Math.cos(a) * 520, 190, Math.sin(a) * 520);
    camera.lookAt(0, 30, 0);
  }
  cielo.seguir(camera.position);
  entrada.finDeFrame();
  renderer.render(escena, camera);
}

textoRecords();
actualizarBotones();
requestAnimationFrame(bucle);

// Solo para pruebas automáticas
window.__guerra = { get estado() { return estado; }, get modo() { return modo; }, ctx };
