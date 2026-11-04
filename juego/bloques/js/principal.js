// =============================================================
//  🚀  PRINCIPAL (aquí se junta todo)
//  Crea la escena 3D, el mundo, el jugador, el cielo y los menús,
//  y corre el "ciclo del juego": unas 60 veces por segundo mueve
//  al jugador, los bichos y los objetos, crea chunks, revisa a qué
//  bloque apuntas y dibuja. Los modos de juego (supervivencia,
//  creativo, aventura), los mundos guardados y el multijugador se
//  conectan aquí; la lógica de cada cosa vive en su propio módulo.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { semillaDeTexto } from './ruido.js';
import { crearAtlas } from './texturas.js';
import {
  B, POR_CLAVE, DIBUJO, DIBUJO_AGUA, DIBUJO_PLANTA, SOLIDO, OPACO, TEXTURA_CARA, EN_MENU, USABLE, BASE, ORIENTADOS, DIRS,
  nombreBloque, sonidoBloque, esIrrompible, esValido, orientacionDeYaw, variante,
} from './bloques.js';
import { ALTO } from './generador.js';
import { Mundo } from './mundo.js';
import { Jugador } from './jugador.js';
import { lanzarRayo } from './rayo.js';
import { Cielo } from './cielo.js';
import { crearUniformes, crearMaterialesMundo } from './materiales.js';
import { Sombras } from './sombras.js';
import { CALIDADES, NIVELES, nivelRecomendado } from './calidad.js';
import { Particulas } from './particulas.js';
import { Animales, TIPOS_ANIMAL } from './animales.js';
import { Ambiente } from './ambiente.js';
import { Vehiculos, TIPOS as TIPOS_VEH } from './vehiculos.js';
import { botinDe } from './botin.js';
import { Controles, detectarTactil } from './controles.js';
import { Interfaz } from './interfaz.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';
import { Aj, TECLA_DEFECTO, perfil } from './ajustes.js';
import { MenuAjustes } from './menuAjustes.js';
import { Mundos } from './mundos.js';
import { Inventario, NUM_RANURAS, ranuraAArr, arrARanura, meterEn } from './inventario.js';
import { objetoPorId, esObjeto, nombreDe, idInventario, POR_CLAVE_OBJ, resolverId, combustible, colorDeObjeto } from './objetos.js';
import { tiempoRomper, botinDeBloque, desgasteAlRomper, Grietas } from './mineria.js';
import { RECETAS, fabricar, actualizarHorno, hornoNuevo, esFundible, esCombustible, resultadoDeFundir } from './recetas.js';
import { Drops } from './drops.js';
import { Vitales, ESCALA_DANO } from './vitales.js';
import { Mobs, TIPOS as TIPOS_MOB, OFICIOS, explosion, tintarMobs, rayoContraCaja } from './mobs.js';
import { Logros } from './logros.js';
import { Minimapa } from './minimapa.js';
import { Hud } from './hud.js';
import { pintarMochila, pintarRecetas, pintarCofre, pintarHorno, pintarComercio } from './paneles.js';
import { Remotos } from './remotos.js';
import { Multi } from './multi.js';

const V = CONFIG.vista;
const J = CONFIG.jugador;
const $ = (id) => document.getElementById(id);
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const DIST_MIN = 2, DIST_MAX = 16;

// ----------------------------------------------------------- Pantalla y 3D
THREE.ColorManagement.enabled = false; // los colores se ven tal cual los escribimos

const lienzo = $('lienzo');
let tactil = detectarTactil();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !tactil && Aj.get('antialias') && !/[?&]sinaa/.test(location.search), powerPreference: 'high-performance' });
} catch (e) {
  $('sinWebgl').classList.remove('oculto');
  $('pantallaTitulo').classList.add('oculto');
  throw e;
}
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const escena = new THREE.Scene();
escena.fog = new THREE.Fog(0xacd8ff, 40, 80);
const camara = new THREE.PerspectiveCamera(V.campoVision, 1, 0.05, 400);
camara.rotation.order = 'YXZ';

// Atlas de texturas con sus versiones chiquitas (mipmaps) para lo lejano
const { lienzo: lienzoAtlas, niveles, normales, promedios } = crearAtlas();
function crearTextura(lista) {
  const t = new THREE.Texture(lista[0]);
  t.mipmaps = lista;
  t.generateMipmaps = false;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.anisotropy = tactil ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
  return t;
}
const atlas = crearTextura(niveles);
const atlasNormal = crearTextura(normales);
atlasNormal.magFilter = THREE.LinearFilter;

const uniformes = crearUniformes(atlas, atlasNormal);
const materialesMundo = crearMaterialesMundo(uniformes);
const sombras = new Sombras(renderer, escena, uniformes);

Mundos.migrar();

const mundo = new Mundo(escena, materialesMundo);
mundo.hojasDetalladas = tactil ? V.hojasDetalladasMovil : V.hojasDetalladas;
const cielo = new Cielo(escena);
const particulas = new Particulas(escena);
const animales = new Animales(escena, mundo);
const jugador = new Jugador();
const ambiente = new Ambiente(escena, mundo, uniformes, promedios);
const vehiculos = new Vehiculos(escena, mundo, uniformes);
vehiculos.cielo = cielo;
vehiculos.particulas = ambiente;
const inv = new Inventario();          // también hace de "mochila" para los vehículos
const vitales = new Vitales();
const drops = new Drops(escena, mundo, promedios);
const mobs = new Mobs(escena, mundo);
const grietas = new Grietas(escena);
const logros = new Logros();
const hud = new Hud();
const colorHexDe = (id) => {
  if (esObjeto(id)) return colorDeObjeto(id);
  const p = promedios[TEXTURA_CARA[id * 6 + 2]] || [0.6, 0.6, 0.6];
  return '#' + p.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
};
const remotos = new Remotos(escena, colorHexDe);
const minimapa = new Minimapa($('minimapa'), mundo, promedios);

// Cuadrito negro alrededor del bloque al que apuntas
const contorno = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
contorno.visible = false;
escena.add(contorno);

// ----------------------------------------------------------- Estado del juego
// 'titulo' | 'mundos' | 'jugando' | 'pausa' | 'inventario' | 'ajustes' | 'logros' | 'contenedor' | 'muerte' | 'foto'
let estado = 'titulo';
let esperandoMundo = false;   // se está creando el terreno bajo tus pies
let buscarSuelo = false;      // mundo nuevo: hay que pararte sobre el suelo
let partidaIniciada = false;  // ya hay algo que guardar
let hora = CONFIG.dia.horaInicio;
let dias = 0;
let barra = CONFIG.barraInicial.map((c) => POR_CLAVE[c] || B.PIEDRA);   // barra del modo creativo
let seleccion = 0;
let objetivo = null;
let mundoMeta = null;         // la ranura del mundo que se juega
let modo = 'supervivencia';   // 'supervivencia' | 'creativo' | 'aventura'
let dificultad = 'normal';
let spawn = null;             // dónde apareces al empezar
let cama = null;              // dónde dormiste por última vez
let radio = 5;
let lejos = 300;
let anguloTitulo = 0;
const centroTitulo = new THREE.Vector3();
let alturaCamTitulo = 0;      // altura de la cámara que da vueltas en el título
const temporizador = { romper: 0, poner: 0 };
let tiempoGuardar = 0;
let tiempoDepuracion = 0;
let cuadrosFps = 0, tiempoFps = 0, fps = 0;
let ajustesDesde = 'titulo';  // a dónde se vuelve al cerrar los ajustes
let mundosDesde = 'titulo';
let verDepuracion = Aj.get('depuracion');
let verMinimapa = Aj.get('minimapa');
let chatAbierto = false;
let modoFotoSinHud = false;
let semillaVistaPrevia = (Math.random() * 2147483647) | 0;
let fondoId = null;
const nuevoMundoForm = { tipo: 'normal', modo: 'supervivencia', dificultad: Aj.get('dificultad') };

const esCreativo = () => modo === 'creativo';
const enMulti = () => !!(window.Red && window.Red.conectado);
const hayVida = () => !esCreativo();

function aplicarRadio() {
  mundo.ponerRadio(radio);
  lejos = Math.max(220, (radio + 2) * 16 * 1.7);
  camara.far = lejos;
  camara.updateProjectionMatrix();
}

// ----------------------------------------------------------- Calidad gráfica
const calidadURL = (/[?&]calidad=(\w+)/.exec(location.search) || [])[1]; // ?calidad=ultra para probar
let nivelCalidad = NIVELES.includes(calidadURL) ? calidadURL : NIVELES.includes(Aj.get('calidad')) ? Aj.get('calidad') : nivelRecomendado(renderer, tactil);
let calidadElegida = NIVELES.includes(calidadURL) || NIVELES.includes(Aj.get('calidad')); // si la elegiste tú, el juego no la baja solo
let Q = CALIDADES[nivelCalidad];

function aplicarCalidad(nivel) {
  nivelCalidad = nivel;
  Q = CALIDADES[nivel];
  const s = Aj.get('sombras');
  const nivelSombra = s === 'no' ? 0 : s === 'suave' ? 1 : s === 'alta' ? 2 : Q.sombras;
  sombras.configurar(nivelSombra, Q.tamSombra, Q.rangoSombra);
  uniformes.uBump.value = Q.relieve;
  uniformes.uAguaCalidad.value = Q.olas;
  uniformes.uViento.value = Aj.get('reducirMov') ? 0.2 : Q.viento;
  cielo.ponerCalidadNubes(Q.nubesCapas, Q.nubesOctavas);
  cielo.ponerEstrellas(Q.estrellas);
  const hojas = tactil ? V.hojasDetalladasMovil && Q.hojasDetalladas : Q.hojasDetalladas;
  if (mundo.hojasDetalladas !== hojas) { mundo.hojasDetalladas = hojas; mundo.redibujarTodo(); }
  ajustarTamano();
  const d = Aj.get('distancia');
  radio = lim(d > 0 ? d : tactil ? Q.distanciaMovil : Q.distancia, DIST_MIN, DIST_MAX);
  aplicarRadio();
}

function ajustarTamano() {
  const w = window.innerWidth, h = window.innerHeight;
  const r = Aj.get('resolucion');
  const maxPix = r === 'auto' || !Q ? (Q ? Q.pixeles : 1) : parseFloat(r);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPix));
  renderer.setSize(w, h);
  camara.aspect = w / Math.max(1, h);
  camara.updateProjectionMatrix();
}
window.addEventListener('resize', ajustarTamano);
if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarTamano);

// ----------------------------------------------------------- Interfaz
const interfaz = new Interfaz(lienzoAtlas, {
  alElegirRanura: (i) => elegirRanura(i),
  alElegirBloque: (id) => {
    // si ese bloque ya estaba en otra ranura, se intercambian (así no se repite)
    const ya = barra.indexOf(id);
    if (ya >= 0 && ya !== seleccion) barra[ya] = barra[seleccion];
    barra[seleccion] = id;
    refrescarBarra();
    interfaz.mostrarNombre(nombreBloque(id));
    Sonido.clic();
    cerrarInventario();
  },
  alElegirVehiculo: (tipo) => colocarVehiculo(tipo),
  alElegirObjeto: (obj) => {
    inv.agregar(obj, 1);
    interfaz.mochila(inv.resumen());
    interfaz.aviso('+1 ' + POR_CLAVE_OBJ[obj].nombre);
    Sonido.tesoro();
    mundo.hayCambiosSinGuardar = true;
  },
});
interfaz.modoTactil(tactil);
interfaz.crearTarjetasVehiculos([
  { tipo: 'jeep', nombre: 'Jeep', nota: 'Todoterreno: sube escalones de 1 bloque' },
  { tipo: 'bote', nombre: 'Bote', nota: 'Solo sobre el agua' },
  { tipo: 'avioneta', nombre: 'Avioneta', nota: 'Acelera, mueve el ratón arriba y despega' },
  { tipo: 'vagoneta', nombre: 'Vagoneta', nota: 'Solo sobre rieles (las minas tienen)' },
]);

// Lo que hay en las 9 ranuras de la barra (en creativo, bloques sin cantidad)
function itemsBarra() {
  if (esCreativo()) return barra.map((id) => ({ id, n: 0, d: 0 }));
  return inv.ranuras.slice(0, 9);
}
function ranuraActual() {
  return esCreativo() ? { id: barra[seleccion], n: 99, d: 0 } : inv.ranuras[seleccion];
}
function refrescarBarra() {
  interfaz.actualizarBarra(itemsBarra(), seleccion);
  interfaz.mochila(esCreativo() ? inv.resumen() : {});
}
function elegirRanura(i) {
  seleccion = ((i % 9) + 9) % 9;
  refrescarBarra();
  const r = ranuraActual();
  if (r) interfaz.mostrarNombre(nombreDe(r.id));
}
function objetoEnMano() {
  const r = ranuraActual();
  return r && esObjeto(r.id) ? objetoPorId(r.id) : null;
}

// ----------------------------------------------------------- Controles
const lobbyAbierto = () => !!(window.Lobby && window.Lobby.abierto);
const controles = new Controles({
  lienzo,
  capaTactil: $('tactil'),
  tactil,
  puedeJugar: () => estado === 'jugando' && !esperandoMundo && !chatAbierto && !lobbyAbierto(),
  alMirar: (dx, dy) => {
    if (vehiculos.actual) { vehiculos.mirar(dx, dy); return; }
    jugador.yaw -= dx;
    jugador.pitch -= dy;
    const lim = Math.PI / 2 - 0.01;
    if (jugador.pitch > lim) jugador.pitch = lim;
    if (jugador.pitch < -lim) jugador.pitch = -lim;
  },
  // avioneta con el stick del mando: se pone la palanca directamente (el ratón la mueve de a poquito)
  alPalanca: (x, y, activa) => {
    const v = vehiculos.actual;
    if (!v || v.T.clase !== 'aire') return;
    if (activa) { v.stick.x = x; v.stick.y = y; } else { v.stick.x = 0; v.stick.y = 0; }
  },
  alEstadoMando: (tipo, dato) => {
    if (tipo === 'fuente') interfaz.modoMando(!!dato, controles.mandoConectado);
    else if (tipo === 'conectado') {
      interfaz.modoMando(controles.usandoMando, true);
      interfaz.avisoMando('Mando conectado');
    } else if (tipo === 'desconectado') {
      interfaz.modoMando(false, false);
      interfaz.avisoMando('Mando desconectado');
      // sin mando y sin ratón atrapado: se pausa para no dejarte a medias
      if (estado === 'jugando' && controles.usandoMando) pausar();
    }
  },
  alCambioBloqueo: (bloqueado) => {
    // se soltó el ratón (Esc, cambiar de ventana…): pausa. En modo táctil puro
    // nunca se atrapa el ratón, así que esto solo pasa si lo estabas usando.
    if (!bloqueado && estado === 'jugando' && !chatAbierto && !lobbyAbierto()) pausar();
  },
  alAccion: (accion, dato) => {
    switch (accion) {
      case 'ranura': if (estado === 'jugando' || estado === 'inventario') elegirRanura(dato); break;
      case 'rueda': if (estado === 'jugando') elegirRanura(seleccion + dato); break;
      case 'ranuraRel': if (estado === 'inventario') elegirRanura(seleccion + dato); break;
      case 'pestana': if (estado === 'inventario') cambiarPestana(dato); else if (estado === 'ajustes') menuAjustes.cambiarPestana(dato); break;
      case 'usar':
        if (estado !== 'jugando') break;
        if (vehiculos.actual) vehiculos.repostar(inv);
        else if (objetivo && USABLE[objetivo.id] && usarBloque(objetivo)) { /* cofre, puerta, cama, horno… */ }
        else tecleoVehiculo();
        break;
      case 'volar': if (estado === 'jugando' && !vehiculos.actual) alternarVuelo(); break;
      case 'teclaE':
        if (estado === 'jugando') { if (!tecleoVehiculo()) abrirInventario(); }
        else if (estado === 'inventario') cerrarInventario();
        break;
      case 'vehiculo': if (estado === 'jugando') tecleoVehiculo(); break;
      case 'camara': if (estado === 'jugando' && vehiculos.actual) vehiculos.alternarCamara(); break;
      case 'luces': if (estado === 'jugando' && vehiculos.actual) { vehiculos.actual.lucesManual = true; vehiculos.alternarLuces(); } break;
      case 'repostar': if (estado === 'jugando') vehiculos.repostar(inv); break;
      case 'inventario':
        if (estado === 'jugando') abrirInventario();
        else if (estado === 'inventario') cerrarInventario();
        break;
      case 'pausa':
        if (estado === 'jugando') pausar();
        else atras();
        break;
      case 'cancelarMenu': atras(); break;
      case 'depuracion': alternarDepuracion(); break;
      case 'musica': alternarMusica(); break;
      case 'minimapa': verMinimapa = !verMinimapa; Aj.set('minimapa', verMinimapa); break;
      case 'foto': if (estado === 'jugando') entrarFoto(); else if (estado === 'foto') salirFoto(); break;
      case 'chat': if (estado === 'jugando' || estado === 'pausa') abrirChat(); break;
      case 'jugadores': mostrarJugadores(!!dato); break;
      case 'elegir': elegirDeLaMira(); break;
      case 'modoTactil':
        tactil = !!dato;
        interfaz.modoTactil(tactil);
        ajustarTamano();
        break;
      default: break;
    }
  },
});

// El audio solo puede empezar después de que tocas algo
function despertarAudio() {
  Sonido.iniciar();
  Musica.iniciar();
}
['pointerdown', 'keydown', 'touchstart', 'click'].forEach((ev) =>
  window.addEventListener(ev, despertarAudio, { capture: true, passive: true }));

// ----------------------------------------------------------- Ajustes
const menuAjustes = new MenuAjustes($('ajustesPestanas'), $('ajustesCuerpo'), (id) => accionDatos(id));
const FILTROS_DALT = {
  protan: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
  deutan: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
  tritan: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
};
function aplicarAjustes() {
  const cl = document.documentElement.classList;
  cl.toggle('textoGrande', !!Aj.get('textoGrande'));
  cl.toggle('reducirMov', !!Aj.get('reducirMov'));
  document.body.classList.toggle('zurdo', !!Aj.get('zurdo'));
  const t = $('tactil');
  t.style.setProperty('--tam-tactil', String(Aj.get('tamTactil') / 100));
  t.style.setProperty('--op-tactil', String(Aj.get('opTactil') / 100));
  // daltonismo: un filtro de color sobre el lienzo
  const d = Aj.get('daltonismo');
  let f = $('filtroDalt');
  if (!f) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="filtroDalt" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>';
    document.body.appendChild(svg);
    f = svg.firstChild;
  }
  if (FILTROS_DALT[d]) {
    f.firstChild.setAttribute('values', FILTROS_DALT[d]);
    lienzo.style.filter = 'url(#filtroDalt)';
    $('hud').style.filter = 'url(#filtroDalt)';
  } else { lienzo.style.filter = ''; $('hud').style.filter = ''; }
  // sensibilidades
  const c = controles.ajustes;
  c.sensRaton = Math.pow(1.22, Aj.get('sensRaton') - 5);
  c.sensTactil = Math.pow(1.22, Aj.get('sensTactil') - 5);
  c.zonaMuerta = Aj.get('zonaMuerta');
  c.zurdo = Aj.get('zurdo');
  c.invertirY = Aj.get('invertirY');
  controles.ajustesMando.sens = Aj.get('sensMando');
  controles.ajustesMando.invertirY = Aj.get('invertirY');
  const mapa = {};
  for (const a of Object.keys(TECLA_DEFECTO)) mapa[a] = Aj.teclaDe(a);
  controles.aplicarTeclas(TECLA_DEFECTO, mapa);
  // audio
  Sonido.ponerVolumenes({ maestro: Aj.get('volMaestro') / 100, efectos: (Aj.get('volEfectos') / 100) * 0.75, silenciar: Aj.get('silencio'), pausarAlOcultar: Aj.get('pausaOculto') });
  Musica.ponerVolumen((Aj.get('volMusica') / 100) * 0.55);
  verDepuracion = Aj.get('depuracion');
  verMinimapa = Aj.get('minimapa');
  $('fpsContador').classList.toggle('oculto', !Aj.get('mostrarFps'));
  calidadElegida = NIVELES.includes(Aj.get('calidad'));
  camara.fov = Aj.get('fov');
  camara.updateProjectionMatrix();
}
Aj.bus.en('cambio', ({ clave }) => {
  aplicarAjustes();
  if (['calidad', 'distancia', 'sombras', 'resolucion', 'reducirMov'].includes(clave) || clave === '*') {
    const n = NIVELES.includes(Aj.get('calidad')) ? Aj.get('calidad') : (calidadElegida ? nivelCalidad : nivelRecomendado(renderer, tactil));
    aplicarCalidad(n);
  }
});

// Vibración suave del mando (solo si lo estás usando)
function vibrar(fuerte, suave, ms) {
  if (controles.usandoMando && Aj.get('vibrar') && window.Mando) {
    const k = Aj.get('vibracion') / 100;
    window.Mando.vibrar(fuerte * k, suave * k, ms);
  }
}

function alternarVuelo() {
  if (!esCreativo()) { interfaz.aviso('Solo se puede volar en modo creativo'); return; }
  jugador.volando = !jugador.volando;
  if (jugador.volando) jugador.vy = 0;
  interfaz.volando(jugador.volando);
  interfaz.aviso(jugador.volando ? 'Modo vuelo: SÍ' : 'Modo vuelo: NO');
  Sonido.volar(jugador.volando);
}

function alternarDepuracion() {
  Aj.set('depuracion', !verDepuracion);
}

function alternarMusica() {
  const si = Musica.alternar();
  interfaz.aviso(si ? 'Música: SÍ' : 'Música: NO');
}

function elegirDeLaMira() {
  if (!objetivo || !esCreativo()) return;
  const id = BASE[objetivo.id] || objetivo.id;
  if (!EN_MENU.includes(id)) return;
  const ya = barra.indexOf(id);
  if (ya >= 0) elegirRanura(ya);
  else {
    barra[seleccion] = id;
    elegirRanura(seleccion);
  }
}

function colorDe(id) {
  return promedios[TEXTURA_CARA[id * 6]] || [1, 1, 1];
}

// ----------------------------------------------------------- Bichos: apuntar, golpear, botín
const todosGolpeables = () => animales.lista.concat(mobs.lista);

function entidadApuntada(alcance) {
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camara.rotation);
  const o = camara.position;
  let mejor = null, mt = alcance;
  for (const e of todosGolpeables()) {
    if (e.muriendo) continue;
    const t = rayoContraCaja(o.x, o.y, o.z, dir.x, dir.y, dir.z, e.x, e.y, e.z, e.T.rad + 0.1, e.T.alto, mt);
    if (t >= 0 && t < mt) { mt = t; mejor = e; }
  }
  if (!mejor) return null;
  // si hay un bloque más cerca, el bichito está detrás de la pared
  if (objetivo) {
    const dx = objetivo.x + 0.5 - o.x, dy = objetivo.y + 0.5 - o.y, dz = objetivo.z + 0.5 - o.z;
    if (Math.hypot(dx, dy, dz) - 0.6 < mt) return null;
  }
  return mejor;
}

// Reparte el botín de una tabla [[clave|id, min, max]]. Si min está entre 0 y 1 es la probabilidad de soltar max.
function tirarBotin(tabla, x, y, z, compartir = true) {
  const lista = [];
  for (const [k, a, b] of tabla) {
    let n;
    if (a > 0 && a < 1) n = Math.random() < a ? b : 0;
    else n = a + Math.floor(Math.random() * (b - a + 1));
    if (n > 0) lista.push([typeof k === 'string' ? k : k, n]);
  }
  for (const [k, n] of lista) drops.soltar(resolverId(k), n, x, y + 0.5, z);
  if (compartir && multi.esAnfitrion) multi.difundirBotin(x, y, z, lista);
}

animales.alMorir = (a) => { tirarBotin(TIPOS_ANIMAL[a.tipo].botin, a.x, a.y, a.z); logros.sumar('animalesMatados'); };
mobs.alMorir = (e) => {
  tirarBotin(e.T.botin, e.x, e.y, e.z);
  if (e.T.hostil) { logros.sumar('malosMatados'); if (multi.esAnfitrion) logros.revisar(); }
};

let ataqueEspera = 0;
function aplicarGolpe(e, dano, x, z, conArco = false) {
  const esAnimal = animales.lista.includes(e);
  const murio = esAnimal ? animales.herir(e, dano, x, z) : mobs.herir(e, dano, x, z);
  if (conArco) logros.sumar('flechasAcertadas');
  return murio;
}

function atacar(e) {
  if (ataqueEspera > 0) return;
  ataqueEspera = 0.5;
  const o = objetoEnMano();
  const dano = o && o.tipo === 'herramienta' ? o.dano : 1;
  if (multi.esInvitado) { multi.enviarGolpe(e, dano, jugador.x, jugador.z); Sonido.golpeCuerpo(); }
  else aplicarGolpe(e, dano, jugador.x, jugador.z);
  if (hayVida() && o && o.tipo === 'herramienta') { if (inv.gastar(seleccion, o.herr === 'espada' ? 1 : 2)) { interfaz.aviso('Se rompió ' + o.nombre.toLowerCase()); refrescarBarra(); Sonido.romper('piedra'); } }
  vitales.cansar(0.1);
  vibrar(0.1, 0.4, 60);
}

// ----------------------------------------------------------- Dañar al jugador y morir
const ctxVitales = {
  get jugador() { return jugador; }, get modo() { return modo; }, get dificultad() { return dificultad; },
  get enVehiculo() { return !!vehiculos.actual; }, get armadura() { return inv.puntosArmadura(); },
  alDano: (n, causa) => {
    Sonido.dano();
    vibrar(0.6, 0.6, 160);
    if (Aj.get('flashDano') && !Aj.get('reducirMov')) $('danoPantalla').classList.add('golpe');
    setTimeout(() => $('danoPantalla').classList.remove('golpe'), 220);
  },
  alMuerte: (causa) => morir(causa),
};

function herirJugador(n, dx, dz, causa, opc, tgt) {
  if (tgt && tgt.remoto) { multi.enviarDano(tgt.id, n, dx, dz, causa, opc); return; }
  if (esCreativo() || vitales.muerto || estado === 'muerte') return;
  const esc = ESCALA_DANO[dificultad] ?? 1;
  if (causa === 'zombi' || causa === 'arana' || causa === 'flecha' || causa === 'creeper') n *= esc;
  if (n <= 0) return;
  const hecho = vitales.daniar(ctxVitales, n, causa);
  if (hecho <= 0) return;
  const d = Math.hypot(dx, dz) || 1;
  const e = (opc && opc.empuje) || 5;
  jugador.vx += (dx / d) * e; jugador.vz += (dz / d) * e; if (jugador.enSuelo) jugador.vy = 4.5;
  // la armadura se gasta
  const piezas = inv.armadura.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  if (piezas.length && causa !== 'caida' && causa !== 'ahogado' && causa !== 'hambre') {
    const i = piezas[Math.floor(Math.random() * piezas.length)];
    if (inv.gastar(inv.armadura[i], 1)) interfaz.aviso('Se rompió una pieza de tu armadura');
  }
  if (causa === 'creeper') logros.sumar('explosiones');
}

const CAUSAS = { caida: 'Te caíste desde muy alto', ahogado: 'Te ahogaste', hambre: 'Te moriste de hambre', zombi: 'Te mató un zombi', arana: 'Te mató una araña', flecha: 'Te mató un esqueleto', creeper: 'Un creeper explotó cerca de ti', pvp: 'Te derrotó otro jugador' };
function morir(causa) {
  if (estado === 'muerte') return;
  logros.sumar('muertes');
  Sonido.muerte();
  if (vehiculos.actual) { vehiculos.bajar(true, jugador); interfaz.tablero(null); }
  controles.soltarTodo();
  controles.soltarBloqueo();
  if (!Aj.get('conservarInv') && !enMulti()) {
    for (let i = 0; i < NUM_RANURAS; i++) { const r = inv.ranuras[i]; if (r) { drops.soltar(r.id, r.n, jugador.x, jugador.y + 0.6, jugador.z, r.d); inv.ranuras[i] = null; } }
    for (let i = 0; i < 4; i++) { const r = inv.armadura[i]; if (r) { drops.soltar(r.id, 1, jugador.x, jugador.y + 0.6, jugador.z, r.d); inv.armadura[i] = null; } }
    refrescarBarra();
  }
  $('causaMuerte').textContent = CAUSAS[causa] || 'Has muerto';
  estado = 'muerte';
  interfaz.pantalla('muerte');
  guardar(true);
}

function reaparecer() {
  vitales.reiniciar();
  jugador.vx = jugador.vy = jugador.vz = 0;
  let p = spawn;
  if (cama && OPACO[mundo.obtener(cama.x, cama.y - 1, cama.z)] !== undefined && USABLE[mundo.obtener(cama.x, cama.y, cama.z)]) p = { x: cama.x + 0.5, y: cama.y + 1, z: cama.z + 0.5 };
  else if (cama) { cama = null; interfaz.aviso('Tu cama ya no estaba: apareces en el inicio'); }
  if (!p) { const i = mundo.gen.buscarInicio(); p = { x: i.x, y: i.y, z: i.z }; }
  jugador.ponerEn(p.x, p.y + 0.1, p.z);
  mobs.limpiar();
  esperandoMundo = true; buscarSuelo = false;
  estado = 'jugando';
  interfaz.pantalla(null);
  interfaz.carga(true, 0);
  controles.pedirBloqueo();
}

// ----------------------------------------------------------- Romper bloques
function romper() {
  // clic suelto (también lo usan las pruebas): en creativo rompe ya; en supervivencia empieza a minar
  if (!objetivo || vehiculos.actual) return false;
  if (esCreativo()) return romperBloque(objetivo, false);
  return false;
}

function romperBloque(o, conBotin) {
  const { x, y, z, id } = o;
  if (esIrrompible(id)) {
    interfaz.aviso('Esa roca no se puede romper');
    return false;
  }
  // si al lado hay agua del mar, el hueco se llena de agua del mar
  // (el agua que tú pones se queda quieta: no se riega)
  let nuevo = B.AIRE;
  const vecinos = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
  for (const [dx, dy, dz] of vecinos) {
    if (mundo.obtener(x + dx, y + dy, z + dz) === B.AGUA) { nuevo = B.AGUA; break; }
  }
  if (!mundo.poner(x, y, z, nuevo)) return false;
  quitarPareja(x, y, z, id, nuevo);
  // una flor sin suelo se cae
  const encima = mundo.obtener(x, y + 1, z);
  if (DIBUJO[encima] === DIBUJO_PLANTA) {
    mundo.poner(x, y + 1, z, B.AIRE);
    if (conBotin) for (const [k, n] of botinDeBloque(encima, null)) drops.soltar(resolverId(k), n, x + 0.5, y + 1.3, z + 0.5);
  }
  particulas.explotar(x, y, z, colorDe(id), DIBUJO[id] === DIBUJO_PLANTA ? 8 : 18);
  Sonido.romper(sonidoBloque(id));
  vibrar(0.05, 0.35, 70);
  logros.sumar('bloquesRotos');
  const clave = x + ',' + y + ',' + z;
  // cofres y hornos sueltan lo que tenían
  if (id >= B.COFRE && id < B.COFRE + 4) {
    const lista = mundo.cofres.get(clave);
    if (lista) { for (const r of lista) if (r) drops.soltar(r.id, r.n, x + 0.5, y + 0.6, z + 0.5, r.d); mundo.cofres.delete(clave); multi.enviarCofre(clave, null); }
  } else if (id === B.HORNO) {
    const h = mundo.hornos.get(clave);
    if (h) { for (const r of [h.ent, h.sal, h.comb]) if (r) drops.soltar(r.id, r.n, x + 0.5, y + 0.6, z + 0.5, r.d); mundo.hornos.delete(clave); }
  }
  if (conBotin) {
    const o2 = objetoEnMano();
    for (const [k, n] of botinDeBloque(id, o2)) drops.soltar(resolverId(k), n, x + 0.5, y + 0.4, z + 0.5);
    vitales.cansar(0.005);
    if (o2 && o2.tipo === 'herramienta' && inv.gastar(seleccion, desgasteAlRomper(o2))) { interfaz.aviso('Se rompió ' + o2.nombre.toLowerCase()); Sonido.romper('piedra'); refrescarBarra(); }
  }
  return true;
}

// Las puertas (2 bloques de alto) y las camas (2 de largo) se rompen completas
function quitarPareja(x, y, z, id, nuevo) {
  if (BASE[id] === B.PUERTA_X) {
    for (const dy of [-1, 1]) if (BASE[mundo.obtener(x, y + dy, z)] === B.PUERTA_X) mundo.poner(x, y + dy, z, B.AIRE);
  } else if (id >= B.CAMA_PIE && id < B.CAMA_PIE + 4) {
    const [dx, dz] = DIRS[id - B.CAMA_PIE];
    const o = mundo.obtener(x + dx, y, z + dz);
    if (o === B.CAMA_CABEZA + (id - B.CAMA_PIE)) mundo.poner(x + dx, y, z + dz, B.AIRE);
  } else if (id >= B.CAMA_CABEZA && id < B.CAMA_CABEZA + 4) {
    const f = id - B.CAMA_CABEZA;
    const [dx, dz] = DIRS[f];
    const o = mundo.obtener(x - dx, y, z - dz);
    if (o === B.CAMA_PIE + f) mundo.poner(x - dx, y, z - dz, B.AIRE);
  }
}


// Minado con tiempo (supervivencia y aventura sin bloques): se llama cada cuadro con el botón apretado
const mineria = { clave: '', t: 0, necesita: 0, sonido: 0 };
function minar(dt) {
  if (!objetivo || vehiculos.actual) { limpiarMineria(); return; }
  const { x, y, z, id } = objetivo;
  if (modo === 'aventura') { limpiarMineria(); return; }
  const clave = x + ',' + y + ',' + z + ',' + id;
  const o = objetoEnMano();
  if (mineria.clave !== clave) { mineria.clave = clave; mineria.t = 0; mineria.necesita = tiempoRomper(id, o); mineria.sonido = 0; }
  if (esIrrompible(id)) { if (mineria.t === 0) interfaz.aviso('Esa roca no se puede romper'); mineria.t = 0.001; return; }
  mineria.t += dt;
  mineria.sonido -= dt;
  if (mineria.sonido <= 0) { mineria.sonido = 0.25; Sonido.paso(sonidoBloque(id)); particulas.explotar(x, y, z, colorDe(id), 3); }
  grietas.mostrar(x, y, z, mineria.necesita > 0 ? mineria.t / mineria.necesita : 0);
  if (mineria.t >= mineria.necesita) {
    romperBloque(objetivo, true);
    limpiarMineria();
    temporizador.romper = 0.2;
  }
}
function limpiarMineria() {
  if (mineria.clave) { mineria.clave = ''; mineria.t = 0; }
  grietas.mostrar(0, 0, 0, null);
}

// ----------------------------------------------------------- Usar y poner
const libre = (x, y, z) => {
  const b = mundo.obtener(x, y, z);
  return b === B.AIRE || DIBUJO[b] === DIBUJO_AGUA || DIBUJO[b] === DIBUJO_PLANTA;
};

function cofreDe(x, y, z) {
  const clave = x + ',' + y + ',' + z;
  let lista = mundo.cofres.get(clave);
  if (!lista) {
    lista = new Array(27).fill(null);
    if (!mundo.abiertos.has(clave)) {
      // cofre de estructura: su botín depende de la semilla y de dónde está
      mundo.abiertos.add(clave);
      for (const [obj, n] of botinDe(x, y, z, mundo.semilla, CONFIG.mundo.nivelMar)) {
        let i;
        do { i = Math.floor(Math.random() * 27); } while (lista[i]);
        lista[i] = { id: POR_CLAVE_OBJ[obj].id, n, d: 0 };
      }
      Sonido.cofre();
    }
    mundo.cofres.set(clave, lista);
    mundo.hayCambiosSinGuardar = true;
  }
  return { clave, lista };
}

// Clic derecho sobre cofres, puertas, camas, mesas y hornos
function usarBloque(o) {
  const { x, y, z, id } = o;
  const tipo = USABLE[id] ? (id >= B.COFRE && id < B.COFRE + 4 ? 'cofre' : id === B.MESA_TRABAJO ? 'mesa' : id === B.HORNO ? 'horno' : BASE[id] === B.PUERTA_X ? 'puerta' : 'cama') : null;
  if (!tipo) return false;
  if (tipo === 'puerta') {
    const abierta = id === B.PUERTA_X_ABIERTA || id === B.PUERTA_Z_ABIERTA;
    const nuevoId = id === B.PUERTA_X ? B.PUERTA_X_ABIERTA : id === B.PUERTA_Z ? B.PUERTA_Z_ABIERTA : id === B.PUERTA_X_ABIERTA ? B.PUERTA_X : B.PUERTA_Z;
    mundo.poner(x, y, z, nuevoId);
    for (const dy of [-1, 1]) if (BASE[mundo.obtener(x, y + dy, z)] === B.PUERTA_X) mundo.poner(x, y + dy, z, nuevoId);
    Sonido.puerta();
    return abierta || true;
  }
  if (tipo === 'cofre') {
    const c = cofreDe(x, y, z);
    abrirContenedor({ tipo: 'cofre', clave: c.clave, lista: c.lista });
    return true;
  }
  if (tipo === 'mesa') { abrirInventario('recetas', true); return true; }
  if (tipo === 'horno') {
    const clave = x + ',' + y + ',' + z;
    let h = mundo.hornos.get(clave);
    if (!h) { h = hornoNuevo(); mundo.hornos.set(clave, h); }
    abrirContenedor({ tipo: 'horno', clave, h });
    return true;
  }
  if (tipo === 'cama') {
    // la cama es el punto de reaparición; dormir de noche salta a la mañana
    let px = x, pz = z;
    if (id >= B.CAMA_CABEZA) { const f = id - B.CAMA_CABEZA; const [dx, dz] = DIRS[f]; px = x - dx; pz = z - dz; }
    cama = { x: px, y, z: pz };
    mundo.hayCambiosSinGuardar = true;
    if (cielo.factorDia < 0.45) {
      if (!enMulti()) hora = 0.0;
      logros.sumar('dormidas');
      interfaz.aviso(enMulti() ? 'Cama guardada como tu punto de reaparición' : 'Dormiste hasta la mañana · cama guardada');
    } else interfaz.aviso('Solo puedes dormir de noche, pero tu cama es ahora tu punto de reaparición');
    Sonido.clic();
    return true;
  }
  return false;
}

function comer() {
  const r = ranuraActual();
  const o = r && esObjeto(r.id) ? objetoPorId(r.id) : null;
  if (!o || o.tipo !== 'comida') return false;
  if (esCreativo()) return false;
  if (vitales.hambre >= 20 && o.clave !== 'carne_podrida') { interfaz.aviso('No tienes hambre'); return false; }
  vitales.comer(o.hambre, o.sat);
  inv.quitarEn(seleccion, 1);
  Sonido.comer();
  logros.sumar('comidas');
  refrescarBarra();
  return true;
}

let arcoEspera = 0;
function disparar() {
  const o = objetoEnMano();
  if (!o || o.tipo !== 'arco' || arcoEspera > 0) return false;
  if (!inv.quitar('flecha', 1)) { interfaz.aviso('No tienes flechas'); arcoEspera = 0.4; return false; }
  arcoEspera = 0.7;
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camara.rotation);
  mobs.flechas.disparar(camara.position.x + dir.x * 0.5, camara.position.y - 0.1 + dir.y * 0.5, camara.position.z + dir.z * 0.5, dir.x, dir.y, dir.z, 30, 'jugador', 5);
  Sonido.arco();
  if (inv.gastar(seleccion, 1)) { interfaz.aviso('Se rompió el arco'); }
  refrescarBarra();
  return true;
}

// Bloques con orientación y de varias partes (copiado de siempre). Devuelve true si se puso.
function ponerBloqueEnMundo(id) {
  let { x, y, z } = objetivo;
  if (DIBUJO[objetivo.id] !== DIBUJO_PLANTA) {
    x += objetivo.nx; y += objetivo.ny; z += objetivo.nz;
  }
  if (y < 0 || y >= ALTO) return false;
  const actual = mundo.obtener(x, y, z);
  if (actual !== B.AIRE && DIBUJO[actual] !== DIBUJO_AGUA && DIBUJO[actual] !== DIBUJO_PLANTA) return false;
  const fv = orientacionDeYaw(jugador.yaw); // hacia dónde mira el jugador (0 sur, 1 oeste, 2 norte, 3 este)
  const base = BASE[id];
  if (base === B.COFRE) {
    id = variante(B.COFRE, (fv + 2) & 3);
    if (jugador.tocaBloque(x, y, z)) return false;
    if (!mundo.poner(x, y, z, id)) return false;
    const k = x + ',' + y + ',' + z;
    mundo.abiertos.add(k);
    mundo.cofres.set(k, new Array(27).fill(null));
    Sonido.poner(sonidoBloque(id));
    return true;
  } else if (base === B.PUERTA_X) {
    id = variante(B.PUERTA_X, fv);
    if (!libre(x, y + 1, z) || !SOLIDO[mundo.obtener(x, y - 1, z)]) return false;
    if (jugador.tocaBloque(x, y, z)) return false;
    mundo.poner(x, y, z, id);
    mundo.poner(x, y + 1, z, id);
    Sonido.poner(sonidoBloque(id));
    return true;
  } else if (base === B.CAMA_PIE) {
    const [dx, dz] = DIRS[fv];
    if (!libre(x + dx, y, z + dz) || !SOLIDO[mundo.obtener(x, y - 1, z)] || !SOLIDO[mundo.obtener(x + dx, y - 1, z + dz)]) return false;
    if (jugador.tocaBloque(x, y, z) || jugador.tocaBloque(x + dx, y, z + dz)) return false;
    mundo.poner(x, y, z, B.CAMA_PIE + fv);
    mundo.poner(x + dx, y, z + dz, B.CAMA_CABEZA + fv);
    Sonido.poner(sonidoBloque(id));
    return true;
  } else if (ORIENTADOS[base]) id = variante(base, fv);
  if (SOLIDO[id] && jugador.tocaBloque(x, y, z)) return false;          // no dentro de ti
  if (DIBUJO[id] === DIBUJO_PLANTA && !OPACO[mundo.obtener(x, y - 1, z)]) return false; // flores en el suelo
  if ((id === B.ANTORCHA || BASE[id] === B.RIEL_X) && !SOLIDO[mundo.obtener(x, y - 1, z)]) return false; // antorchas y rieles sobre el suelo
  if (!mundo.poner(x, y, z, id)) return false;
  Sonido.poner(sonidoBloque(id));
  return true;
}

function poner() {
  if (vehiculos.actual) return false;
  // un aldeano al que apuntas: comerciar
  const e = entidadApuntada(4.5);
  if (e && e.tipo === 'aldeano') { abrirComercio(e); return true; }
  if (objetivo && USABLE[objetivo.id] && usarBloque(objetivo)) return true;
  const r = ranuraActual();
  if (!r) return false;
  if (esObjeto(r.id)) {
    const o = objetoPorId(r.id);
    if (o.tipo === 'comida') return comer();
    if (o.tipo === 'arco') return disparar();
    if (o.tipo === 'armadura') { inv.equipar(seleccion); logros.puso(); refrescarBarra(); Sonido.clic(); return true; }
    return false;
  }
  if (!objetivo) return false;
  if (!esValido(r.id)) return false;
  if (modo === 'aventura') { interfaz.aviso('En modo aventura no se puede construir', 1.5); return false; }
  const ok = ponerBloqueEnMundo(r.id);
  if (ok && !esCreativo()) { inv.quitarEn(seleccion, 1); refrescarBarra(); }
  if (ok) logros.sumar('bloquesPuestos');
  return ok;
}

// ----------------------------------------------------------- Vehículos
function tecleoVehiculo() {
  if (vehiculos.actual) {
    if (vehiculos.bajar(false, jugador)) {
      jugador.desatorar(mundo);
      interfaz.tablero(null);
      camara.fov = V.campoVision;
      camara.updateProjectionMatrix();
      mundo.hayCambiosSinGuardar = true;
    } else mostrarAvisosVehiculo();
    return true;
  }
  const v = vehiculos.cercano(jugador.x, jugador.y + 0.9, jugador.z);
  if (!v) return false;
  vehiculos.camaraTercera = CONFIG.vehiculos.camaraTercera;
  vehiculos.subir(v, jugador);
  interfaz.volando(false);
  interfaz.ocultarAyuda();
  if (controles.usandoMando) {
    interfaz.aviso(v.T.nombre + (v.T.clase === 'aire' ? ' · RT/LT motor · stick izq. cabecear y girar' : v.T.clase === 'riel' ? ' · RT/LT mover' : ' · RT acelerar · LT frenar · stick izq. girar') + ' · A bajar', 3.4);
  } else interfaz.aviso(v.T.nombre + (v.T.clase === 'aire' ? ' · W/S motor · mueve el ratón para subir y girar' : v.T.clase === 'agua' ? ' · WASD navegar' : v.T.clase === 'riel' ? ' · W/S mover' : ' · WASD manejar'), 3);
  mundo.hayCambiosSinGuardar = true;
  return true;
}

function mostrarAvisosVehiculo() {
  while (vehiculos.avisos.length) interfaz.aviso(vehiculos.avisos.shift());
}

// Pone un vehículo nuevo frente al jugador
function colocarVehiculo(tipo) {
  cerrarInventario();
  if (vehiculos.actual) return;
  const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
  const largo = tipo === 'avioneta' ? 5 : 3;
  let lugar = null;
  for (let d = 5; d <= 12 && !lugar; d++) {
    const x = jugador.x + fx * d, z = jugador.z + fz * d;
    const sx = Math.floor(x), sz = Math.floor(z);
    if (!mundo.estaListo(x, z)) continue;
    if (tipo === 'bote') {
      const sup = vehiculos.superficieAgua(x, z, jugador.y);
      if (sup >= 0) lugar = { x, y: sup - 0.3, z, yaw: jugador.yaw };
      continue;
    }
    const h = mundo.alturaSuelo(sx, sz);
    if (h < 0) continue;
    const y = h + 1;
    if (DIBUJO[mundo.obtener(sx, y, sz)] === DIBUJO_AGUA) continue;
    if (tipo === 'vagoneta') {
      const r = mundo.obtener(sx, y, sz);
      if (r === B.RIEL_X || r === B.RIEL_Z) lugar = { x: sx + 0.5, y, z: sz + 0.5, yaw: r === B.RIEL_X ? -Math.PI / 2 : Math.PI };
      continue;
    }
    // espacio libre alrededor
    let ok = true;
    for (let k = -largo; k <= largo && ok; k += 2) {
      for (let j = -1; j <= 1 && ok; j++) {
        const cx = Math.floor(x - fz * j * 2 + fx * k), cz = Math.floor(z + fx * j * 2 + fz * k);
        for (let dy = 0; dy <= 2; dy++) if (mundo.esSolido(cx, y + dy, cz)) ok = false;
      }
    }
    if (ok) lugar = { x, y, z, yaw: jugador.yaw };
  }
  if (!lugar) {
    interfaz.aviso(tipo === 'bote' ? 'El bote va en el agua: acércate a un lago o al mar' : tipo === 'vagoneta' ? 'La vagoneta va sobre rieles: ponlos con el bloque Riel' : 'No hay espacio libre aquí');
    return;
  }
  // no pasa de 12 vehículos: se quita el más viejo que nadie esté usando
  if (vehiculos.lista.length >= 12) {
    const viejo = vehiculos.lista.find((v) => !v.ocupado);
    if (viejo) vehiculos.quitar(viejo);
  }
  vehiculos.crear(tipo, lugar.x, lugar.y, lugar.z, lugar.yaw);
  interfaz.aviso(TIPOS_VEH[tipo].nombre + ' listo: acércate y pulsa E');
  Sonido.poner('madera');
  mundo.hayCambiosSinGuardar = true;
}

function actualizarObjetivo() {
  if (estado !== 'jugando' || esperandoMundo || vehiculos.actual) { objetivo = null; contorno.visible = false; return; }
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camara.rotation);
  const o = camara.position;
  objetivo = lanzarRayo(mundo, o.x, o.y, o.z, dir.x, dir.y, dir.z, J.alcance);
  if (objetivo) {
    contorno.position.set(objetivo.x + 0.5, objetivo.y + 0.5, objetivo.z + 0.5);
    contorno.visible = true;
  } else {
    contorno.visible = false;
  }
}

// ----------------------------------------------------------- Inventario, recetas y contenedores
let mesaForzada = false;
let soloDisponibles = false;
let contenedor = null;       // { tipo: 'cofre' | 'horno' | 'comercio', … }

function hayMesaCerca() {
  if (mesaForzada) return true;
  const bx = Math.floor(jugador.x), by = Math.floor(jugador.y), bz = Math.floor(jugador.z);
  for (let y = by - 2; y <= by + 3; y++) for (let z = bz - 4; z <= bz + 4; z++) for (let x = bx - 4; x <= bx + 4; x++) {
    if (mundo.obtener(x, y, z) === B.MESA_TRABAJO) return true;
  }
  return false;
}

function repintarInventario() {
  const p = interfaz.pestanaActual;
  if (p === 'mochila') {
    pintarMochila($('panMochila'), inv, seleccion, interfaz, {
      clic: (i) => {
        const r = inv.ranuras[i];
        const o = r && esObjeto(r.id) ? objetoPorId(r.id) : null;
        if (o && o.tipo === 'armadura') { inv.equipar(i); logros.puso(); Sonido.clic(); }
        else if (o && o.tipo === 'comida' && !esCreativo() && (vitales.hambre < 20 || o.clave === 'carne_podrida')) { vitales.comer(o.hambre, o.sat); inv.quitarEn(i, 1); Sonido.comer(); logros.sumar('comidas'); }
        else if (i !== seleccion) { const t = inv.ranuras[i]; inv.ranuras[i] = inv.ranuras[seleccion]; inv.ranuras[seleccion] = t; }
        refrescarBarra(); repintarInventario();
      },
      armadura: (p2) => { if (!inv.desequipar(p2)) interfaz.aviso(inv.armadura[p2] ? 'No hay lugar en la mochila' : 'Aquí va ' + ['el casco', 'el peto', 'los pantalones', 'las botas'][p2]); refrescarBarra(); repintarInventario(); },
    });
  } else if (p === 'recetas') {
    pintarRecetas($('panRecetas'), inv, hayMesaCerca(), soloDisponibles, interfaz, {
      filtro: () => { soloDisponibles = !soloDisponibles; repintarInventario(); },
      fabricar: (rec) => {
        const id = fabricar(rec, inv, hayMesaCerca());
        if (id) {
          Sonido.craft();
          logros.fabrico(rec.salida === B.MESA_TRABAJO ? 'mesa_trabajo' : (objetoPorId(rec.salida) && objetoPorId(rec.salida).herr) || 'x');
          for (const k of ['hierro', 'diamante']) if (inv.cuenta(k)) logros.tuvo(k);
          refrescarBarra();
        } else interfaz.aviso('No cabe en la mochila');
        repintarInventario();
      },
    });
  }
}
interfaz.alCambiarPestana = () => { if (estado === 'inventario') repintarInventario(); };

function cambiarPestana(d) {
  const orden = esCreativo() ? ['bloques', 'vehiculos', 'mochila', 'recetas'] : ['mochila', 'recetas'];
  const i = orden.indexOf(interfaz.pestanaActual);
  interfaz.pestana(orden[(i + d + orden.length) % orden.length]);
}

function abrirInventario(pestana = null, conMesa = false) {
  estado = 'inventario';
  mesaForzada = conMesa;
  controles.soltarTodo();
  controles.soltarBloqueo();
  interfaz.pestanasDisponibles(esCreativo());
  interfaz.pantalla('inventario');
  interfaz.pestana(pestana || (esCreativo() ? 'bloques' : 'mochila'));
  repintarInventario();
}

function cerrarInventario(conEsc = false) {
  if (estado !== 'inventario') return;
  mesaForzada = false;
  estado = 'jugando';
  interfaz.pantalla(null);
  if (!conEsc) controles.pedirBloqueo();
}

function abrirContenedor(c) {
  contenedor = c;
  estado = 'contenedor';
  controles.soltarTodo();
  controles.soltarBloqueo();
  $('tituloContenedor').textContent = c.tipo === 'cofre' ? 'COFRE' : c.tipo === 'horno' ? 'HORNO' : c.titulo;
  $('avisoContenedor').textContent = '';
  interfaz.pantalla('contenedor');
  pintarContenedor();
}

function cerrarContenedor(conEsc = false) {
  if (estado !== 'contenedor') return;
  const c = contenedor;
  contenedor = null;
  if (c && c.tipo === 'cofre') multi.enviarCofre(c.clave, c.lista);
  mundo.hayCambiosSinGuardar = true;
  estado = 'jugando';
  interfaz.pantalla(null);
  if (!conEsc) controles.pedirBloqueo();
}

function pintarContenedor() {
  const c = contenedor;
  if (!c) return;
  const cuerpo = $('cuerpoContenedor');
  const refrescar = () => { refrescarBarra(); pintarContenedor(); };
  if (c.tipo === 'cofre') {
    pintarCofre(cuerpo, c.lista, inv, interfaz, {
      sacar: (i) => { const r = c.lista[i]; if (!r) return; const resto = inv.agregar(r.id, r.n, r.d); if (resto) r.n = resto; else c.lista[i] = null; Sonido.recoger(); refrescar(); },
      meter: (i) => { const r = inv.ranuras[i]; if (!r) return; const resto = meterEn(c.lista, r.id, r.n, r.d); if (resto) r.n = resto; else inv.ranuras[i] = null; Sonido.recoger(); refrescar(); },
    });
  } else if (c.tipo === 'horno') {
    const h = c.h;
    const devolver = (campo) => { const r = h[campo]; if (!r) return; const resto = inv.agregar(r.id, r.n, r.d); h[campo] = resto ? { ...r, n: resto } : null; refrescar(); };
    pintarHorno(cuerpo, h, inv, interfaz, {
      quitarEnt: () => devolver('ent'), quitarComb: () => devolver('comb'), sacarSal: () => devolver('sal'),
      meter: (i) => {
        const r = inv.ranuras[i];
        if (!r) return;
        const campo = esFundible(r.id) ? 'ent' : esCombustible(r.id) ? 'comb' : null;
        if (!campo) { $('avisoContenedor').textContent = 'Eso no se puede fundir ni quemar'; return; }
        if (h[campo] && h[campo].id !== r.id) { $('avisoContenedor').textContent = 'Primero saca lo que hay en esa ranura'; return; }
        const hay = h[campo] ? h[campo].n : 0, cabe = Math.min(r.n, 64 - hay);
        if (cabe <= 0) return;
        h[campo] = { id: r.id, n: hay + cabe, d: 0 };
        inv.quitarEn(i, cabe);
        refrescar();
      },
    });
  } else if (c.tipo === 'comercio') {
    pintarComercio(cuerpo, c.oficio, c.ofertas, inv, interfaz, {
      cambiar: (i) => {
        const o = c.ofertas[i];
        if (!o.dan.every(([k, n]) => inv.cuenta(resolverId(k)) >= n)) return;
        if (!inv.cabe(resolverId(o.da[0]), o.da[1])) { $('avisoContenedor').textContent = 'No cabe en tu mochila'; return; }
        for (const [k, n] of o.dan) inv.quitar(resolverId(k), n);
        inv.agregar(resolverId(o.da[0]), o.da[1]);
        Sonido.moneda();
        logros.sumar('tratos');
        if (inv.cuenta('esmeralda')) logros.tuvo('esmeralda');
        refrescar();
      },
    });
  }
}

function abrirComercio(e) {
  const O = OFICIOS[e.oficio] || OFICIOS.granjero;
  Sonido.en(e.x, e.y, e.z, () => Sonido.bicho('aldeano', 1));
  abrirContenedor({ tipo: 'comercio', titulo: O.nombre.toUpperCase(), oficio: O.nombre, ofertas: O.ofertas });
}

// Los hornos queman aunque no los mires
let tiempoPintarHorno = 0;
function actualizarHornos(dt) {
  for (const [clave, h] of mundo.hornos) {
    const antes = h.sal ? h.sal.n : 0;
    const cambio = actualizarHorno(h, dt);
    if ((h.sal ? h.sal.n : 0) > antes) { logros.sumar('fundidos'); if (h.sal && h.sal.id) { logros.tuvo(h.sal.id === POR_CLAVE_OBJ.hierro.id ? 'hierro' : 'x'); } }
    if (contenedor && contenedor.tipo === 'horno' && contenedor.h === h && (cambio || (tiempoPintarHorno -= dt) <= 0)) { tiempoPintarHorno = 0.5; pintarContenedor(); }
  }
}

// ----------------------------------------------------------- Guardar
// Una partida vieja (sin "gen") conserva el generador 1: mismo terreno de siempre, sin biomas.
function opcionesDePartida(p) {
  const version = p ? (p.gen >= 3 ? 3 : p.gen >= 2 ? 2 : 1) : 3;
  let bloqueados = null;
  if (version === 1) bloqueados = Array.isArray(p.bloqueados) ? p.bloqueados : Object.keys(p.cambios || {});
  return {
    version, bloqueados, tipo: p && p.tipo,
    abiertos: p && Array.isArray(p.abiertos) ? p.abiertos : [],
    vehiculosUsados: p && Array.isArray(p.vehiculosUsados) ? p.vehiculosUsados : [],
    cofres: p && p.cofres, hornos: p && p.hornos,
  };
}

function convertirContenedores() {
  for (const [k, v] of [...mundo.cofres]) {
    const lista = new Array(27).fill(null);
    if (Array.isArray(v)) v.slice(0, 27).forEach((e, i) => { lista[i] = e && e.id ? e : arrARanura(e); });
    mundo.cofres.set(k, lista);
  }
  for (const [k, v] of [...mundo.hornos]) {
    const h = hornoNuevo();
    if (v && typeof v === 'object') {
      h.ent = v.ent || arrARanura(v.e); h.comb = v.comb || arrARanura(v.c); h.sal = v.sal || arrARanura(v.s);
      h.quema = +v.q || 0; h.quemaMax = +v.qm || 0; h.prog = +v.p || 0;
    }
    mundo.hornos.set(k, h);
  }
}

function exportarContenedores() {
  const cofres = {}, hornos = {};
  for (const [k, l] of mundo.cofres) if (l.some(Boolean)) cofres[k] = l.map(ranuraAArr);
  for (const [k, h] of mundo.hornos) hornos[k] = { e: ranuraAArr(h.ent), c: ranuraAArr(h.comb), s: ranuraAArr(h.sal), q: +h.quema.toFixed(1), qm: h.quemaMax, p: +h.prog.toFixed(1) };
  return { cofres, hornos };
}

function datosGuardado() {
  const cont = exportarContenedores();
  return {
    version: 3,
    gen: mundo.versionGen,          // 1 = terreno de mundos viejos, 2 = con biomas, 3 = con diamantes
    semilla: mundo.semilla,
    tipo: mundo.tipo,
    modo, dificultad,
    cambios: mundo.exportarCambios(),
    bloqueados: mundo.bloqueados ? [...mundo.bloqueados] : undefined, // chunks de mundos viejos donde no hay estructuras
    abiertos: [...mundo.abiertos],
    cofres: cont.cofres, hornos: cont.hornos,
    vehiculos: vehiculos.exportar(),
    vehiculosUsados: [...mundo.vehiculosUsados],
    inventario: inv.exportar(),
    vitales: vitales.exportar(),
    spawn, cama, dias,
    jugador: {
      x: +jugador.x.toFixed(3), y: +jugador.y.toFixed(3), z: +jugador.z.toFixed(3),
      yaw: +jugador.yaw.toFixed(4), pitch: +jugador.pitch.toFixed(4), volando: jugador.volando,
    },
    hora: +hora.toFixed(5),
    barra,
    seleccion,
    fecha: Date.now(),
  };
}

let avisoGuardadoDado = false;
function guardar(silencio = false) {
  if (!partidaIniciada || !mundoMeta) return false;
  if (multi.esInvitado) return multi.guardarPersonal();
  const datos = datosGuardado();
  const ok = Mundos.guardar(mundoMeta.id, datos, mundo.cuantosCambios());
  if (ok) {
    mundo.hayCambiosSinGuardar = false;
    avisoGuardadoDado = false;
  } else if (!silencio && !avisoGuardadoDado) {
    avisoGuardadoDado = true;
    interfaz.aviso('No se pudo guardar (¿poco espacio o modo incógnito?)');
  }
  return ok;
}

window.addEventListener('pagehide', () => guardar(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    guardar(true);
    if (estado === 'jugando' && controles.tactil && !enMulti()) pausar();
  }
});

// ----------------------------------------------------------- Pantallas
const ETIQ_MODO = { supervivencia: 'SUPERVIVENCIA', creativo: 'CREATIVO', aventura: 'AVENTURA' };
const ETIQ_DIF = { pacifico: 'PACÍFICO', facil: 'FÁCIL', normal: 'NORMAL', dificil: 'DIFÍCIL' };

function mostrar(est, pantalla) {
  estado = est;
  controles.soltarTodo();
  controles.soltarBloqueo();
  interfaz.pantalla(pantalla);
}

function actualizarTitulo() {
  const u = Mundos.ultimo();
  $('btnContinuar').classList.toggle('oculto', !u);
  $('infoGuardado').classList.toggle('oculto', !u);
  if (u) {
    let fecha = '';
    try { fecha = new Date(u.jugado).toLocaleDateString('es'); } catch (e) { fecha = ''; }
    $('infoGuardado').textContent = `${u.nombre} · ${ETIQ_MODO[u.modo] || ''} ${fecha ? '· ' + fecha : ''}`;
  }
  $('btnJugar').classList.toggle('principal', !u);
}

function mostrarTitulo() {
  if (partidaIniciada) guardar(true);
  partidaIniciada = false;
  estado = 'titulo';
  if (vehiculos.actual) { vehiculos.bajar(true); interfaz.tablero(null); }
  animales.limpiar(); mobs.limpiar(); drops.limpiar(); ambiente.limpiar();
  multi.salir();
  limpiarMineria();
  esperandoMundo = false;
  controles.soltarTodo();
  controles.soltarBloqueo();
  interfaz.pantalla('titulo');
  interfaz.carga(false);
  hud.mostrarVitales(false);
  $('minimapa').classList.add('oculto');
  actualizarTitulo();
  prepararCamaraTitulo();
}

// ----------------------------------------------------------- Cámara del título
// La cámara da vueltas despacito alrededor de donde estabas, siempre
// por encima de lo que haya cerca (colinas, montañas o árboles).

// Altura del suelo en (x, z): si el chunk ya existe se usa el de verdad
// (con árboles y lo que construiste); si no, lo que dice el generador
// más 7 por si ahí hay un árbol.
function sueloTitulo(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const h = mundo.alturaSuelo(xi, zi);
  return Math.max(CONFIG.mundo.nivelMar, h >= 0 ? h : mundo.gen.alturaEn(xi, zi) + 7);
}

function giroTitulo() {
  return Math.max(12, Math.min(30, radio * 16 * 0.38));
}

// Lo más alto que hay alrededor de la cámara (hasta 10 bloques) y un poquito
// más adelante en su vuelta: así no queda pegada a la pared de un cerro.
const ALREDEDOR_TITULO = [[0, 0]];
for (const d of [3, 6, 10]) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ALREDEDOR_TITULO.push([Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d)]);
  }
}
function sueloVueltaTitulo(angulo, giro) {
  let max = 0;
  for (let a = 0; a <= 0.121; a += 0.04) {
    const cx = centroTitulo.x + Math.cos(angulo + a) * giro;
    const cz = centroTitulo.z + Math.sin(angulo + a) * giro;
    for (const [ox, oz] of ALREDEDOR_TITULO) max = Math.max(max, sueloTitulo(cx + ox, cz + oz));
  }
  return max;
}

// Pone la cámara del título de una vez a buena altura (sin subir desde abajo de la tierra)
function prepararCamaraTitulo() {
  const giro = giroTitulo();
  centroTitulo.set(jugador.x, 0, jugador.z);
  centroTitulo.y = sueloTitulo(centroTitulo.x, centroTitulo.z) + giro * 0.45;
  alturaCamTitulo = Math.max(centroTitulo.y + giro * 0.25, sueloVueltaTitulo(anguloTitulo, giro) + 4);
}

function moverCamaraTitulo(dt) {
  anguloTitulo += dt * 0.04;
  const giro = giroTitulo();
  const objetivoY = sueloTitulo(centroTitulo.x, centroTitulo.z) + giro * 0.45;
  centroTitulo.y += (objetivoY - centroTitulo.y) * Math.min(1, dt * 2);
  const camX = centroTitulo.x + Math.cos(anguloTitulo) * giro;
  const camZ = centroTitulo.z + Math.sin(anguloTitulo) * giro;
  // sube rápido si adelante hay algo alto y baja despacito cuando ya pasó
  const deseada = Math.max(centroTitulo.y + giro * 0.25, sueloVueltaTitulo(anguloTitulo, giro) + 4);
  const rapidez = deseada > alturaCamTitulo ? 3 : 0.6;
  alturaCamTitulo += (deseada - alturaCamTitulo) * Math.min(1, dt * rapidez);
  // y por si acaso: nunca dentro de un bloque
  let cerca = 0;
  for (let oz = -1; oz <= 1; oz++) {
    for (let ox = -1; ox <= 1; ox++) cerca = Math.max(cerca, sueloTitulo(camX + ox, camZ + oz));
  }
  if (alturaCamTitulo < cerca + 2) alturaCamTitulo = cerca + 2;
  camara.position.set(camX, alturaCamTitulo, camZ);
  camara.lookAt(centroTitulo.x, centroTitulo.y - giro * 0.2, centroTitulo.z);
}


function pausar() {
  if (estado !== 'jugando') return;
  limpiarMineria();
  mostrar('pausa', 'pausa');
  guardar();
  actualizarPausa();
  if (multi.activo) hud.pintarLista(multi.listaJugadores(), (id) => irAJugador(id));
  $('listaJugadores').classList.toggle('oculto', !multi.activo);
}

function actualizarPausa() {
  $('textoSemilla').textContent = String(mundo.semilla);
  $('textoMundo').textContent = mundoMeta ? mundoMeta.nombre : '—';
  $('btnModo').textContent = 'MODO: ' + ETIQ_MODO[modo];
  $('btnModo').disabled = multi.esInvitado;
  $('btnMultiPausa').textContent = multi.activo ? 'SALA / INVITAR' : 'MULTIJUGADOR';
}

// Con Esc el navegador no deja atrapar el ratón (no cuenta como clic): ahí se pide con el siguiente clic
function seguir(conEsc = false) {
  estado = 'jugando';
  interfaz.pantalla(null);
  $('listaJugadores').classList.add('oculto');
  if (!conEsc) controles.pedirBloqueo();
}

// "Atrás" para cada pantalla (Esc, B del mando o el botón volver)
function atras() {
  switch (estado) {
    case 'pausa': seguir(true); break;
    case 'inventario': cerrarInventario(true); break;
    case 'contenedor': cerrarContenedor(true); break;
    case 'ajustes': cerrarAjustes(); break;
    case 'logros': cerrarLogros(); break;
    case 'mundos':
      if (!$('panelNuevo').classList.contains('oculto')) $('panelNuevo').classList.add('oculto');
      else if (!$('panelImportar').classList.contains('oculto')) $('panelImportar').classList.add('oculto');
      else volverDeMundos();
      break;
    case 'foto': salirFoto(); break;
    default: break;
  }
}

function abrirAjustes(desde) {
  ajustesDesde = desde;
  mostrar('ajustes', 'ajustes');
  menuAjustes.pintar();
  $('avisoAjustes').textContent = '';
}
function cerrarAjustes() {
  if (ajustesDesde === 'pausa') { estado = 'pausa'; interfaz.pantalla('pausa'); }
  else if (ajustesDesde === 'mundos') abrirMundos();
  else { estado = 'titulo'; interfaz.pantalla('titulo'); }
}

let logrosDesde = 'titulo';
function abrirLogros(desde) {
  logrosDesde = desde;
  mostrar('logros', 'logros');
  logros.pintar($('cuerpoLogros'));
}
function cerrarLogros() {
  estado = logrosDesde === 'pausa' ? 'pausa' : 'titulo';
  interfaz.pantalla(logrosDesde === 'pausa' ? 'pausa' : 'titulo');
}

// ----------------------------------------------------------- Lista de mundos
function descargar(nombre, texto) {
  try {
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { /* sin descarga */ }
}
function copiar(texto) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto).then(() => true, () => false); } catch (e) { /* nada */ }
  return Promise.resolve(false);
}

function abrirMundos(desde) {
  if (desde) mundosDesde = desde;
  mostrar('mundos', 'mundos');
  pintarMundos();
}
function volverDeMundos() {
  if (mundosDesde === 'ajustes') { abrirAjustes('titulo'); return; }
  estado = 'titulo';
  interfaz.pantalla('titulo');
  actualizarTitulo();
}

function pintarMundos() {
  const cont = $('listaMundos');
  cont.textContent = '';
  const lista = Mundos.listar();
  if (!lista.length) { const p = document.createElement('p'); p.className = 'info'; p.textContent = 'Todavía no tienes mundos. Crea uno nuevo.'; cont.appendChild(p); }
  for (const m of lista) {
    const f = document.createElement('div');
    f.className = 'mundoFila';
    const t = document.createElement('div');
    t.className = 'txt';
    let fecha = '';
    try { fecha = new Date(m.jugado).toLocaleDateString('es'); } catch (e) { fecha = ''; }
    const kb = Math.round(Mundos.tamano(m.id) / 1024);
    t.innerHTML = '<b></b><span></span>';
    t.firstChild.textContent = m.nombre;
    t.lastChild.textContent = `${ETIQ_MODO[m.modo] || ''} · ${m.tipo === 'plano' ? 'plano' : 'normal'} · semilla ${m.semilla} · ${fecha} · ${kb} KB`;
    f.appendChild(t);
    const bs = document.createElement('div');
    bs.className = 'bs';
    const boton = (txt, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; b.addEventListener('click', (e) => { e.preventDefault(); Sonido.clic(); fn(b); }); bs.appendChild(b); return b; };
    boton('JUGAR', () => jugarMundo(m.id), 'principal');
    boton('NOMBRE', () => {
      const n = window.prompt('Nuevo nombre del mundo', m.nombre);
      if (n) { Mundos.editar(m.id, { nombre: n }); pintarMundos(); }
    });
    boton('EXPORTAR', async () => {
      const txt = Mundos.exportar(m.id);
      if (!txt) { $('avisoMundos').textContent = 'No hay nada que exportar todavía (juega un poco y guarda).'; return; }
      descargar('mundo-' + m.nombre.replace(/[^\w-]+/g, '_') + '.json', txt);
      const ok = await copiar(txt);
      $('avisoMundos').textContent = ok ? 'Exportado: se descargó un archivo y el texto quedó copiado.' : 'Exportado: se descargó un archivo.';
    });
    boton('BORRAR', (b) => {
      if (b.dataset.seguro) { Mundos.borrar(m.id); pintarMundos(); actualizarTitulo(); return; }
      b.dataset.seguro = '1'; b.textContent = '¿SEGURO?';
      setTimeout(() => { b.dataset.seguro = ''; b.textContent = 'BORRAR'; }, 3500);
    }, 'peligro');
    f.appendChild(bs);
    cont.appendChild(f);
  }
  $('btnTipoMundo').textContent = 'TIPO: ' + (nuevoMundoForm.tipo === 'plano' ? 'PLANO' : 'NORMAL');
  $('btnModoMundo').textContent = 'MODO: ' + ETIQ_MODO[nuevoMundoForm.modo];
  $('btnDifMundo').textContent = 'DIFICULTAD: ' + ETIQ_DIF[nuevoMundoForm.dificultad];
}

function accionDatos(id) {
  const aviso = (t) => { $('avisoAjustes').textContent = t; interfaz.aviso(t); };
  if (id === 'mundos') abrirMundos('ajustes');
  else if (id === 'exportarMundo') {
    if (!mundoMeta || !partidaIniciada) { aviso('Entra a un mundo para exportarlo (o usa Mis mundos)'); return; }
    guardar(true);
    const txt = Mundos.exportar(mundoMeta.id);
    if (txt) { descargar('mundo-' + mundoMeta.nombre.replace(/[^\w-]+/g, '_') + '.json', txt); copiar(txt); aviso('Mundo exportado (archivo y texto copiado)'); }
  } else if (id === 'exportarAjustes') copiar(Aj.exportar()).then((ok) => aviso(ok ? 'Ajustes copiados' : 'No se pudo copiar'));
  else if (id === 'importarAjustes') {
    const t = window.prompt('Pega aquí los ajustes copiados');
    if (t) aviso(Aj.importar(t) ? 'Ajustes importados' : 'Ese texto no son ajustes');
    menuAjustes.pintar();
  } else if (id === 'borrarLogros') { logros.borrar(); aviso('Logros y estadísticas borrados'); }
  else if (id === 'borrarTodo') {
    Mundos.borrarTodo(); logros.borrar();
    try { localStorage.removeItem('bloques_ajustes_v2'); localStorage.removeItem('bloques_logros_v1'); } catch (e) { /* nada */ }
    Aj.restablecer();
    partidaIniciada = false;
    aviso('Todo borrado');
    actualizarTitulo();
  }
}

// ----------------------------------------------------------- Empezar a jugar
function jugarMundo(id) {
  const meta = Mundos.meta(id);
  if (!meta) return;
  comenzar(meta, Mundos.cargar(id));
}

// meta: la ranura; datos: lo guardado (null = mundo nuevo); invitado: datos que manda el anfitrión
function comenzar(meta, datos, invitado = null) {
  if (partidaIniciada) guardar(true);
  mundoMeta = meta;
  const nuevo = !datos;
  mobs.limpiar(); drops.limpiar(); animales.limpiar();
  if (nuevo) {
    modo = meta.modo; dificultad = meta.dificultad;
    mundo.reiniciar(meta.semilla, null, { version: 3, tipo: meta.tipo });
    vehiculos.importar(null);
    inv.vaciar();
    vitales.reiniciar();
    spawn = null; cama = null; dias = 0;
    const inicio = mundo.gen.buscarInicio();
    jugador.ponerEn(inicio.x, inicio.y + 1, inicio.z);
    jugador.yaw = Math.PI * 0.25;
    jugador.pitch = -0.15;
    jugador.volando = false;
    barra = CONFIG.barraInicial.map((c) => POR_CLAVE[c] || B.PIEDRA);
    seleccion = 0;
    hora = CONFIG.dia.horaInicio;
    buscarSuelo = true;
  } else {
    modo = datos.modo || meta.modo; dificultad = datos.dificultad || meta.dificultad;
    const opc = opcionesDePartida(datos);
    if (fondoId === meta.id && !invitado) fondoId = null;       // ya está cargado de fondo en el título
    else { fondoId = null; mundo.reiniciar(datos.semilla, datos.cambios, opc); convertirContenedores(); }
    vehiculos.importar(datos.vehiculos);
    inv.vaciar();
    if (datos.inventario) inv.importar(datos.inventario);
    else if (datos.mochila) inv.importarMochilaVieja(datos.mochila);
    vitales.importar(datos.vitales);
    spawn = datos.spawn && Number.isFinite(datos.spawn.x) ? datos.spawn : null;
    cama = datos.cama && Number.isFinite(datos.cama.x) ? datos.cama : null;
    dias = Number.isFinite(datos.dias) ? datos.dias : 0;
    restaurarJugador(datos);
    buscarSuelo = false;
  }
  mobs.espejo = animales.espejo = !!invitado;
  aplicarModo(true);
  partidaIniciada = true;
  if (invitado) multi.alEmpezarInvitado(invitado);
  interfaz.volando(jugador.volando);
  refrescarBarra();
  esperandoMundo = true;
  estado = 'jugando';
  interfaz.pantalla(null);
  interfaz.carga(true, 0);
  controles.pedirBloqueo();
  if (nuevo && !invitado) guardar();
  if (Aj.get('ayudaControles')) {
    const textoAyuda = controles.usandoMando
      ? '<b>Stick izq.</b> caminar · <b>stick der.</b> mirar · <b>A</b> saltar · <b>L3</b> correr<br>' +
        '<b>RT</b> romper / atacar · <b>LT</b> poner / usar / comer · <b>Y</b> usar · <b>X</b> inventario · <b>LB/RB</b> elegir · <b>MENU</b> pausa'
      : controles.tactil
      ? '<b>Joystick</b> caminar · <b>arrastra</b> para mirar<br><b>toca</b> = poner o usar · <b>mantén el dedo</b> = romper o atacar · <b>▦</b> inventario'
      : '<b>WASD</b> caminar · <b>Espacio</b> saltar · <b>Shift</b> correr<br>' +
        '<b>Clic izq.</b> romper (mantén) o atacar · <b>Clic der.</b> poner / usar / comer · <b>1-9</b> elegir · <b>I</b> inventario y recetas · <b>Esc</b> pausa';
    interfaz.ayuda(textoAyuda + (modo === 'supervivencia' ? '<br>Consejo: rompe un árbol, haz tablas y una mesa de trabajo en <b>Recetas</b>. De noche salen monstruos.' : ''), 12);
  }
}

// Ajusta todo lo que depende del modo de juego
function aplicarModo(porComenzar = false) {
  if (!esCreativo()) { jugador.volando = false; interfaz.volando(false); }
  hud.mostrarVitales(hayVida() && estado !== 'titulo');
  interfaz.pestanasDisponibles(esCreativo());
  if (!porComenzar) refrescarBarra();
  if (mundoMeta && !porComenzar) Mundos.editar(mundoMeta.id, { modo, dificultad });
  mundo.hayCambiosSinGuardar = true;
}

function restaurarJugador(p) {
  const j = (p && p.jugador) || {};
  if ([j.x, j.y, j.z].every(Number.isFinite)) jugador.ponerEn(j.x, j.y, j.z);
  else {
    const inicio = mundo.gen.buscarInicio();
    jugador.ponerEn(inicio.x, inicio.y + 1, inicio.z);
  }
  jugador.yaw = Number.isFinite(j.yaw) ? j.yaw : 0;
  jugador.pitch = Number.isFinite(j.pitch) ? j.pitch : 0;
  jugador.volando = !!j.volando && (p.modo || 'creativo') === 'creativo';
  if (p && Array.isArray(p.barra) && p.barra.length === 9 && p.barra.every(esValido)) {
    // las partidas viejas tenían el agua del mar en la barra: ahora es el agua que se puede quitar
    barra = p.barra.map((id) => (id === B.AGUA ? B.AGUA_PUESTA : id));
  }
  seleccion = p && Number.isInteger(p.seleccion) ? Math.max(0, Math.min(8, p.seleccion)) : 0;
  if (p && Number.isFinite(p.hora)) hora = ((p.hora % 1) + 1) % 1;
}

// Busca dónde pararse: sobre pasto o arena, en un lugar parejito
// (sin paredes ni árboles pegados) y mirando hacia donde hay vista.
function pararseEnSuelo() {
  const bx = Math.floor(jugador.x), bz = Math.floor(jugador.z);
  const SUELOS = [B.PASTO, B.ARENA, B.NIEVE, B.TIERRA];
  let mejor = null, mejorPuntos = -1;
  for (let r = 0; r <= 12 && mejorPuntos < 24; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = bx + dx, z = bz + dz;
        if (!mundo.estaListo(x, z)) continue;
        const y = mundo.alturaSuelo(x, z);
        if (y < CONFIG.mundo.nivelMar || !SUELOS.includes(mundo.obtener(x, y, z))) continue;
        // puntos: cuántos vecinos (5x5) están a la misma altura y sin nada estorbando
        let puntos = 0;
        for (let tz = -2; tz <= 2; tz++) {
          for (let tx = -2; tx <= 2; tx++) {
            if (!tx && !tz) continue;
            const h = mundo.alturaSuelo(x + tx, z + tz);
            const arriba = mundo.obtener(x + tx, y + 1, z + tz);
            if (h >= y - 1 && h <= y && (arriba === B.AIRE || DIBUJO[arriba] === DIBUJO_PLANTA)) puntos++;
          }
        }
        if (mundo.obtener(x, y + 1, z) !== B.AIRE) puntos -= 4;
        if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = { x, y, z }; }
        if (mejorPuntos >= 24) break;
      }
      if (mejorPuntos >= 24) break;
    }
  }
  if (!mejor) {
    const y = mundo.alturaSuelo(bx, bz);
    if (y >= 0) jugador.y = y + 1;
    return;
  }
  // una flor o pasto alto donde aparecemos se quita (para no verla pegada a la cara)
  if (DIBUJO[mundo.obtener(mejor.x, mejor.y + 1, mejor.z)] === DIBUJO_PLANTA) {
    mundo.poner(mejor.x, mejor.y + 1, mejor.z, B.AIRE, false);
  }
  jugador.ponerEn(mejor.x + 0.5, mejor.y + 1, mejor.z + 0.5);
  jugador.yaw = direccionConVista(mejor.x, mejor.y, mejor.z);
}

// De 16 direcciones, elige la que tiene menos cosas enfrente
function direccionConVista(x, y, z) {
  let mejorYaw = 0, menor = Infinity;
  for (let i = 0; i < 16; i++) {
    const yaw = (i / 16) * Math.PI * 2;
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw); // hacia dónde ve la cámara con ese giro
    let estorbo = 0;
    for (let d = 1; d <= 14; d++) {
      const cx = Math.floor(x + 0.5 + dx * d), cz = Math.floor(z + 0.5 + dz * d);
      let h = mundo.alturaSuelo(cx, cz);
      if (h < 0) h = y;
      const sobra = h - y - 1;
      if (sobra > 0) estorbo += (sobra + 2) / d;
    }
    if (estorbo < menor - 0.01) { menor = estorbo; mejorYaw = yaw; }
  }
  return mejorYaw;
}

// ----------------------------------------------------------- Modo foto
let volabaAntes = false;
function entrarFoto() {
  if (estado !== 'jugando' || vehiculos.actual) return;
  estado = 'foto';
  volabaAntes = jugador.volando;
  jugador.volando = true;
  $('hud').classList.add('oculto');
  $('panelFoto').classList.remove('oculto');
  document.body.classList.add('enFoto');
  interfaz.aviso('Modo foto: muévete volando · clic o RT = capturar · F2 o SALIR');
}
function salirFoto() {
  if (estado !== 'foto') return;
  estado = 'jugando';
  jugador.volando = volabaAntes && esCreativo();
  $('hud').classList.remove('oculto');
  $('panelFoto').classList.add('oculto');
  document.body.classList.remove('enFoto');
}
function capturarFoto() {
  renderer.render(escena, camara);
  Sonido.camara();
  lienzo.toBlob((b) => {
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url; a.download = 'bloques-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, 'image/png');
  logros.sumar('fotos');
  const f = document.createElement('div');
  f.className = 'flashFoto'; document.body.appendChild(f); setTimeout(() => f.remove(), 400);
}

// ----------------------------------------------------------- Chat y jugadores
function abrirChat() {
  chatAbierto = true;
  controles.soltarTodo();
  controles.soltarBloqueo();
  $('chatCaja').classList.remove('oculto');
  const c = $('chatRapido');
  if (!c.childElementCount) {
    for (const f of ['¡Hola!', 'Sígueme', '¡Ayuda!', 'Voy para allá', '¡Cuidado!', 'Gracias', 'Buen trabajo']) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = f;
      b.addEventListener('click', () => { enviarChat(f); cerrarChat(); });
      c.appendChild(b);
    }
  }
  setTimeout(() => $('chatEntrada').focus(), 30);
}
function cerrarChat() {
  chatAbierto = false;
  $('chatCaja').classList.add('oculto');
  $('chatEntrada').value = '';
  $('chatEntrada').blur();
  if (estado === 'jugando') controles.pedirBloqueo();
}
function enviarChat(t) {
  t = String(t || '').trim().slice(0, 140);
  if (!t) return;
  if (multi.activo) multi.enviarChat(t);
  else hud.chat(null, null, 'Solo estás tú. Invita amigos desde Multijugador. (' + t + ')', true);
}
$('chatEntrada').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') { enviarChat($('chatEntrada').value); cerrarChat(); }
  else if (e.key === 'Escape') cerrarChat();
});
function mostrarJugadores(si) {
  if (estado === 'pausa') return;
  if (si && multi.activo) hud.pintarLista(multi.listaJugadores(), null);
  $('listaJugadores').classList.toggle('oculto', !(si && multi.activo));
}
function irAJugador(id) {
  const p = remotos.posicion(id);
  if (!p) { interfaz.aviso('Ese jugador todavía no tiene posición'); return; }
  jugador.ponerEn(p.x + 1, p.y + 0.2, p.z);
  esperandoMundo = true; buscarSuelo = false;
  seguir();
  interfaz.aviso('Teletransportado');
}

// ----------------------------------------------------------- Botones de los menús
function boton(id, fn) {
  $(id).addEventListener('click', (e) => {
    e.preventDefault();
    despertarAudio();
    Sonido.clic();
    fn();
  });
}
boton('btnContinuar', () => { const u = Mundos.ultimo(); if (u) jugarMundo(u.id); });
boton('btnJugar', () => abrirMundos('titulo'));
boton('btnMulti', () => multi.desdeTitulo());
boton('btnAjustesTitulo', () => abrirAjustes('titulo'));
boton('btnLogrosTitulo', () => abrirLogros('titulo'));
boton('btnNuevoMundo', () => {
  $('panelImportar').classList.add('oculto');
  const p = $('panelNuevo');
  p.classList.toggle('oculto');
  if (!p.classList.contains('oculto') && !controles.tactil && !controles.usandoMando) $('campoNombre').focus();
});
boton('btnTipoMundo', () => { nuevoMundoForm.tipo = nuevoMundoForm.tipo === 'normal' ? 'plano' : 'normal'; pintarMundos(); });
boton('btnModoMundo', () => { const l = ['supervivencia', 'creativo', 'aventura']; nuevoMundoForm.modo = l[(l.indexOf(nuevoMundoForm.modo) + 1) % 3]; pintarMundos(); });
boton('btnDifMundo', () => { const l = ['pacifico', 'facil', 'normal', 'dificil']; nuevoMundoForm.dificultad = l[(l.indexOf(nuevoMundoForm.dificultad) + 1) % 4]; pintarMundos(); });
boton('btnCrear', crearMundoDesdeForm);
function crearMundoDesdeForm() {
  const texto = $('campoSemilla').value.trim();
  const semilla = texto ? semillaDeTexto(texto) : (Math.random() * 2147483647) | 0;
  const meta = Mundos.crear({ nombre: $('campoNombre').value, semilla, ...nuevoMundoForm });
  $('campoNombre').value = ''; $('campoSemilla').value = '';
  $('panelNuevo').classList.add('oculto');
  jugarMundo(meta.id);
}
boton('btnCancelarNuevo', () => $('panelNuevo').classList.add('oculto'));
for (const id of ['campoNombre', 'campoSemilla']) $(id).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); despertarAudio(); crearMundoDesdeForm(); } });
boton('btnImportarMundo', () => { $('panelNuevo').classList.add('oculto'); $('panelImportar').classList.toggle('oculto'); });
boton('btnCancelarImportar', () => $('panelImportar').classList.add('oculto'));
$('archivoImportar').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('textoImportar').value = String(r.result || ''); };
  r.readAsText(f);
});
$('textoImportar').addEventListener('keydown', (e) => e.stopPropagation());
boton('btnHacerImportar', () => {
  const m = Mundos.importar($('textoImportar').value);
  $('avisoMundos').textContent = m ? 'Mundo importado: ' + m.nombre : 'Ese texto no es un mundo válido';
  if (m) { $('textoImportar').value = ''; $('panelImportar').classList.add('oculto'); pintarMundos(); }
});
boton('btnVolverMundos', () => volverDeMundos());
boton('btnVolverAjustes', () => cerrarAjustes());
boton('btnRestablecer', () => { Aj.restablecer(); menuAjustes.pintar(); $('avisoAjustes').textContent = 'Ajustes restablecidos'; });
boton('btnVolverLogros', () => cerrarLogros());
boton('btnCerrarContenedor', () => cerrarContenedor());
boton('btnReaparecer', () => reaparecer());
boton('btnMuerteTitulo', () => { mostrarTitulo(); });
boton('btnSeguir', () => seguir());
boton('btnAjustes', () => abrirAjustes('pausa'));
boton('btnLogros', () => abrirLogros('pausa'));
boton('btnGuardar', () => { interfaz.aviso(guardar(true) ? 'Mundo guardado ✓' : 'No se pudo guardar (¿poco espacio o modo incógnito?)'); });
boton('btnFoto', () => { seguir(true); entrarFoto(); });
boton('btnFotoCapturar', () => capturarFoto());
boton('btnFotoHud', () => { modoFotoSinHud = !modoFotoSinHud; $('hud').classList.toggle('oculto', !modoFotoSinHud); $('btnFotoHud').textContent = modoFotoSinHud ? 'OCULTAR HUD' : 'VER HUD'; });
boton('btnFotoSalir', () => salirFoto());
boton('btnModo', () => {
  if (multi.esInvitado) return;
  const l = ['supervivencia', 'creativo', 'aventura'];
  modo = l[(l.indexOf(modo) + 1) % 3];
  aplicarModo();
  actualizarPausa();
  interfaz.aviso('Modo: ' + ETIQ_MODO[modo]);
});
boton('btnPantallaCompleta', () => {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } catch (e) { /* no se puede */ }
});
boton('btnExportarMundo', () => accionDatos('exportarMundo'));
boton('btnMultiPausa', () => multi.abrirLobby());
boton('btnTitulo', () => { guardar(); mostrarTitulo(); });
boton('btnCerrarInventario', () => cerrarInventario());
$('btnChat').addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

// Que no se apague la pantalla del celular mientras juegas
let bloqueoPantalla = null;
async function pedirWakeLock() {
  try {
    if (!('wakeLock' in navigator) || bloqueoPantalla) return;
    bloqueoPantalla = await navigator.wakeLock.request('screen');
    bloqueoPantalla.addEventListener('release', () => { bloqueoPantalla = null; });
  } catch (e) { bloqueoPantalla = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && partidaIniciada) pedirWakeLock(); });
window.addEventListener('pointerdown', () => { if (partidaIniciada) pedirWakeLock(); }, { passive: true });

// ----------------------------------------------------------- Ciclo del juego
const colorAgua = new THREE.Color('#123f7a');
let tiempoTotal = 0;

// Pasa a los shaders la hora, el sol, la niebla, etc.
function actualizarUniformes(bajoAgua) {
  const u = uniformes;
  u.uTiempo.value = tiempoTotal;
  u.uCamPos.value.copy(camara.position);
  u.uSolDir.value.copy(cielo.luzDir);
  u.uSolColor.value.copy(cielo.luzColor);
  u.uAmbCielo.value.copy(cielo.ambCielo);
  u.uAmbSuelo.value.copy(cielo.ambSuelo);
  u.uCieloArriba.value.copy(cielo.arriba);
  u.uCieloHoriz.value.copy(cielo.horizonte);
  u.uNiebla.value.copy(escena.fog.color);
  u.uNieblaCerca.value = escena.fog.near;
  u.uNieblaLejos.value = escena.fog.far;
  if (bajoAgua) {
    u.uAmbCielo.value.multiplyScalar(0.8);
    u.uSolColor.value.multiplyScalar(0.5);
  }
}
const dirTmp = new THREE.Vector3();
let ultimo = performance.now();
function vehiculosActivos() { return !!vehiculos.actual || animales.lista.length > 0 || mobs.lista.length > 0 || vehiculos.lista.some((v) => v.T.clase === 'agua'); }

function accionesRepetidas(dt) {
  ataqueEspera = Math.max(0, ataqueEspera - dt);
  arcoEspera = Math.max(0, arcoEspera - dt);
  const alcanceAtaque = esCreativo() ? 5 : 3.6;
  // ---- romper / atacar
  if (esCreativo()) {
    const golpe = () => {
      const e = entidadApuntada(alcanceAtaque);
      if (e) atacar(e);
      else if (objetivo) romperBloque(objetivo, false);
    };
    if (controles.pulsos.romper) {
      controles.pulsos.romper = false;
      golpe();
      temporizador.romper = J.tiempoEntreGolpes * 1.5;
    } else if (controles.mantener.romper) {
      temporizador.romper -= dt;
      if (temporizador.romper <= 0) { actualizarObjetivo(); golpe(); temporizador.romper = J.tiempoEntreGolpes; }
    }
  } else {
    controles.pulsos.romper = false;
    if (controles.mantener.romper) {
      const e = entidadApuntada(alcanceAtaque);
      if (e) { limpiarMineria(); atacar(e); } else { temporizador.romper -= dt; if (temporizador.romper <= 0) minar(dt); }
    } else { limpiarMineria(); temporizador.romper = 0; }
  }
  // ---- poner / usar
  if (controles.pulsos.poner) {
    controles.pulsos.poner = false;
    poner();
    temporizador.poner = J.tiempoEntreGolpes * 1.5;
  } else if (controles.mantener.poner) {
    temporizador.poner -= dt;
    const r = ranuraActual();
    if (temporizador.poner <= 0 && r && !esObjeto(r.id)) {
      actualizarObjetivo();
      if (!(objetivo && USABLE[objetivo.id])) poner();
      temporizador.poner = J.tiempoEntreGolpes;
    }
  }
}

function sonidosDelJugador() {
  for (const ev of jugador.eventos) {
    if (ev === 'paso') Sonido.paso(sonidoBloque(jugador.bloqueBajoPies(mundo)));
    else if (ev === 'salto') { Sonido.salto(); vitales.cansar(0.05); }
    else if (ev === 'aterrizaje') { Sonido.aterrizaje(sonidoBloque(jugador.bloqueBajoPies(mundo))); vibrar(0.55, 0.3, 150); }
    else if (ev === 'chapuzon') Sonido.chapuzon();
  }
}

// Los vehículos que esperan en garajes y minas aparecen cuando se crea su chunk; los aldeanos también
function nacenVehiculosDeEstructuras() {
  while (mundo.puntosNuevos.length) {
    const p = mundo.puntosNuevos.pop();
    if (p.tipo === 'aldeano') { if (!multi.esInvitado) mobs.crearAldeano(p); continue; }
    if (mundo.vehiculosUsados.has(p.id)) continue;
    mundo.vehiculosUsados.add(p.id);
    if (!TIPOS_VEH[p.tipo]) continue;
    vehiculos.crear(p.tipo, p.x, p.y, p.z, p.yaw, null, 'p:' + p.id);
    mundo.hayCambiosSinGuardar = true;
  }
}

let tiempoTablero = 0;
function actualizarTableroVehiculo(dt) {
  tiempoTablero -= dt;
  if (tiempoTablero > 0) return;
  tiempoTablero = 0.1;
  interfaz.tablero(vehiculos.info());
  if (!vehiculos.actual) {
    const v = estado === 'jugando' && !esperandoMundo ? vehiculos.cercano(jugador.x, jugador.y + 0.9, jugador.z) : null;
    interfaz.cercaVehiculo(!!v, v ? (controles.usandoMando ? 'Y' : 'E') + ' · subir al ' + v.T.nombre : '');
  } else interfaz.cercaVehiculo(true);
}

// Si el juego va lento y no elegiste la calidad tú, la baja un escalón
let lentos = 0, tiempoVigilar = 0;
function vigilarRendimiento(dt) {
  if (calidadElegida || !Aj.get('autoCalidad') || estado !== 'jugando' || esperandoMundo) { lentos = 0; return; }
  tiempoVigilar += dt;
  if (tiempoVigilar < 2) return;
  tiempoVigilar = 0;
  const idx = NIVELES.indexOf(nivelCalidad);
  if (fps > 0 && fps < 24 && idx > 0) {
    if (++lentos >= 3) {
      lentos = 0;
      aplicarCalidad(NIVELES[idx - 1]);
      interfaz.aviso('Gráficos: ' + Q.nombre + ' (para que vaya más fluido; cámbialo en Ajustes)', 4);
    }
  } else lentos = 0;
}

let lobbyPrevio = false, ultX = 0, ultZ = 0, tiempoGota = 10, tiempoCueva = 0, subterraneo = false;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  const limite = Aj.get('limiteFps');
  if (limite > 0 && ahora - ultimo < 1000 / limite - 3) return;
  let dt = (ahora - ultimo) / 1000;
  ultimo = ahora;
  if (!(dt > 0)) dt = 0;
  if (dt > 0.1) dt = 0.1;

  cuadrosFps++;
  tiempoFps += dt;
  if (tiempoFps >= 0.5) {
    fps = Math.round(cuadrosFps / tiempoFps); cuadrosFps = 0; tiempoFps = 0;
    if (Aj.get('mostrarFps')) $('fpsContador').textContent = fps + ' FPS';
    document.body.classList.toggle('enMulti', multi.activo);
    hud.mostrarVitales(hayVida() && estado !== 'titulo' && estado !== 'mundos' && !esperandoMundo);
  }

  // mientras está el menú de multijugador no se lee ni el mando ni el teclado del juego
  const enLobby = lobbyAbierto();
  if (enLobby && !lobbyPrevio) controles.soltarTodo();
  lobbyPrevio = enLobby;

  const enVeh = !!vehiculos.actual;
  if (!enLobby) controles.leerMando(dt, { estado, esperando: esperandoMundo, vehiculo: enVeh ? { clase: vehiculos.actual.T.clase } : null });
  controles.actualizar(jugador.volando, enVeh);

  // ¿ya está el terreno bajo tus pies?
  if (estado !== 'titulo' && esperandoMundo) {
    const p = mundo.progreso(jugador.x, jugador.z, 1);
    interfaz.carga(true, p);
    if (p >= 1) {
      esperandoMundo = false;
      if (buscarSuelo) { pararseEnSuelo(); spawn = { x: jugador.x, y: jugador.y, z: jugador.z }; }
      jugador.desatorar(mundo);
      if (!spawn) spawn = { x: jugador.x, y: jugador.y, z: jugador.z };
      interfaz.carga(false);
    }
  }

  const jugandoYa = (estado === 'jugando' || estado === 'foto') && !esperandoMundo;
  const multiViva = multi.activo && estado !== 'titulo' && estado !== 'mundos';
  const simula = (jugandoYa || (multiViva && !esperandoMundo)) && !chatAbiertoBloquea();

  if (jugandoYa && !enVeh && !vitales.muerto) {
    jugador.actualizar(dt, controles.entrada, mundo, controles.tactil && Aj.get('saltoAuto'));
    if (!jugador.volando) interfaz.volando(false);
    sonidosDelJugador();
    if (jugador.enSuelo && !jugador.volando) { const d = Math.hypot(jugador.x - ultX, jugador.z - ultZ); if (d < 3) logros.sumar('distancia', d); }
    ultX = jugador.x; ultZ = jugador.z;
  }

  // Vida, hambre y aire
  if (jugandoYa && estado === 'jugando') {
    logros.sumar('segundos', dt);
    if (hayVida()) vitales.actualizar(dt, ctxVitales);
    else if (vitales.vida < 20) vitales.reiniciar();
    hud.actualizar(vitales, inv.puntosArmadura());
    const dp = $('danoPantalla');
    dp.style.opacity = Aj.get('flashDano') ? String(Math.min(0.55, vitales.destello * 0.9 + (vitales.vida <= 4 && hayVida() ? 0.12 : 0))) : '0';
  }

  // Vehículos: los parados se asientan en el suelo y el que manejas se mueve (y pone la cámara)
  vehiculos.radioVista = (radio + 3) * 16;
  if (estado !== 'titulo') {
    nacenVehiculosDeEstructuras();
    vehiculos.actualizar(dt, controles.entrada, jugador, camara, esperandoMundo || !jugandoYa || vitales.muerto);
    mostrarAvisosVehiculo();
    actualizarTableroVehiculo(dt);
  }

  // Cámara
  const fovBase = Aj.get('fov');
  if (estado === 'titulo' || estado === 'mundos') {
    moverCamaraTitulo(dt);
  } else if (vehiculos.actual) {
    const fovObjetivo = fovBase + (Aj.get('reducirMov') ? 0 : Math.min(16, Math.abs(vehiculos.actual.vel) * 0.4));
    if (Math.abs(camara.fov - fovObjetivo) > 0.05) {
      camara.fov += (fovObjetivo - camara.fov) * Math.min(1, dt * 5);
      camara.updateProjectionMatrix();
    }
  } else {
    camara.position.set(jugador.x, jugador.y + J.ojos, jugador.z);
    camara.rotation.set(jugador.pitch, jugador.yaw, 0, 'YXZ');
    const rapido = jugador.corriendo || (jugador.volando && controles.entrada.correr);
    const fovObjetivo = fovBase + (rapido && estado === 'jugando' && !Aj.get('reducirMov') ? V.campoVisionCorriendo - V.campoVision : 0);
    if (Math.abs(camara.fov - fovObjetivo) > 0.05) {
      camara.fov += (fovObjetivo - camara.fov) * Math.min(1, dt * 8);
      camara.updateProjectionMatrix();
    }
  }
  Sonido.ponerOyente(camara.position.x, camara.position.y, camara.position.z, jugador.yaw);

  // Hora del día (se detiene en pausa, salvo en multijugador)
  if (estado === 'jugando' || estado === 'titulo' || estado === 'mundos' || estado === 'foto' || multiViva) {
    const antes = hora;
    hora = (hora + dt / CONFIG.dia.duracion) % 1;
    if (hora < antes && estado !== 'titulo' && estado !== 'mundos') { dias++; logros.maximo('diasMax', dias); }
  }

  // Cielo, luz y niebla
  tiempoTotal += dt;
  const luz = cielo.actualizar(hora, camara, lejos, dt, tiempoTotal);
  const dia = cielo.factorDia;
  const r = luz * (0.86 + 0.14 * dia), g = luz * (0.9 + 0.1 * dia), b = luz;
  particulas.material.color.setRGB(r, g, b);
  const mr = Math.max(r, 0.42), mg = Math.max(g, 0.44), mb = Math.max(b, 0.5);   // de noche se siguen viendo
  drops.tintar(mr, mg, mb);
  tintarMobs(mr, mg, mb);
  const bajoAgua = estado !== 'titulo' && (enVeh
    ? DIBUJO[mundo.obtener(Math.floor(camara.position.x), Math.floor(camara.position.y), Math.floor(camara.position.z))] === DIBUJO_AGUA
    : jugador.cabezaEnAgua);
  if (bajoAgua) {
    escena.fog.color.copy(colorAgua).multiplyScalar(0.4 + 0.6 * luz);
    escena.fog.near = 0.5;
    escena.fog.far = 18;
  } else {
    escena.fog.color.copy(cielo.colorNiebla);
    escena.fog.near = radio * 16 * 0.45;
    escena.fog.far = radio * 16 * 0.92;
  }
  renderer.setClearColor(escena.fog.color);
  actualizarUniformes(bajoAgua);
  interfaz.bajoAgua(bajoAgua);
  interfaz.clicContinuar(estado === 'jugando' && !esperandoMundo && !controles.tactil && !controles.usandoMando && !controles.bloqueado && !controles.modoArrastre && !chatAbierto && !enLobby);
  cielo.bajoAgua(bajoAgua); // bajo el agua no se ve el cielo, solo azul

  // Música según lo que pasa: monstruos cerca, bajo tierra, día o noche
  subterraneo = estado !== 'titulo' && !esperandoMundo && mundo.alturaSuelo(Math.floor(jugador.x), Math.floor(jugador.z)) > jugador.y + 4;
  Musica.ponerAnimo(mobs.peligro > 0.15 ? 'peligro' : subterraneo ? 'cueva' : dia > 0.4 ? 'dia' : 'noche');
  if (subterraneo && estado === 'jugando') { tiempoGota -= dt; if (tiempoGota <= 0) { tiempoGota = 6 + Math.random() * 14; Sonido.gota(); } }

  // Crear/dibujar chunks cerca de donde está la cámara
  const presupuesto = esperandoMundo ? 40 : (tactil ? Math.min(V.presupuestoMsMovil, Q.presupuesto) : Math.max(V.presupuestoMs - 2, Q.presupuesto));
  // al manejar, los chunks se crean un poco más adelante de hacia donde vas
  const va = vehiculos.actual;
  const centro = (estado === 'titulo' || estado === 'mundos') ? centroTitulo : va ? { x: jugador.x + lim(va.vx * 0.9, -45, 45), z: jugador.z + lim(va.vz * 0.9, -45, 45) } : jugador;
  mundo.actualizar(centro.x, centro.z, presupuesto);

  actualizarObjetivo();
  if (estado === 'foto') {
    if (controles.pulsos.romper || controles.pulsos.poner) { controles.pulsos.romper = controles.pulsos.poner = false; capturarFoto(); }
  } else if (estado === 'jugando' && !esperandoMundo && !vitales.muerto && !chatAbierto) accionesRepetidas(dt);
  particulas.actualizar(dt, mundo);

  // El mundo vivo: animales, bichos, objetos sueltos y hornos
  if (simula) {
    if (CONFIG.animales.activos) {
      animales.tintar(Math.max(r, 0.42), Math.max(g, 0.44), Math.max(b, 0.5));
      animales.actualizar(dt, jugador, dia, tactil ? CONFIG.animales.maximoMovil : CONFIG.animales.maximo);
    }
    const objetivosMobs = multi.objetivos(jugador);
    const activos = !esCreativo() && dificultad !== 'pacifico' && !multi.esInvitado;
    mobs.actualizar(dt, {
      jugador, objetivos: objetivosMobs, dia, activos, dificultad, max: tactil ? 5 : 8, jugadorVivo: !vitales.muerto && !esCreativo(),
      herirJugador,
      explotar: (x, y, z) => explosion(x, y, z, 3, {
        mundo, particulas, jugador, objetivos: objetivosMobs, jugadorVivo: !vitales.muerto && !esCreativo(), herirJugador,
        mobs: todosGolpeables(), herirEntidad: (e, n, ex, ez) => aplicarGolpe(e, n, ex, ez), escala: ESCALA_DANO[dificultad] ?? 1,
      }),
      golpeables: todosGolpeables,
      herirEntidad: (e, n, x, z, conArco) => { if (multi.esInvitado) multi.enviarGolpe(e, n, x, z); else aplicarGolpe(e, n, x, z, conArco); },
    });
    drops.actualizar(dt, jugador, (id, n, d) => {
      const resto = inv.agregar(id, n, d);
      if (resto < n) {
        Sonido.recoger();
        const o = esObjeto(id) ? objetoPorId(id) : null;
        if (o) { if (o.clave === 'hierro' || o.clave === 'diamante') logros.tuvo(o.clave); }
        else if (id === B.TRONCO || id === B.TRONCO_ABETO || id === B.TRONCO_ABEDUL) logros.tuvo('tronco');
        refrescarBarra();
      }
      return resto;
    }, jugandoYa && !vitales.muerto);
    if (!multi.esInvitado) actualizarHornos(dt);
  }
  if (estado === 'jugando') {
    // cada tanto se mira si ya se ganó algún logro
    logros.revisar();
  }

  ambiente.alturaPantalla = renderer.domElement.height;
  ambiente.actualizar(dt, camara, cielo, Aj.get('particulas') && !Aj.get('reducirMov') ? Q.particulas : 0.1, estado === 'jugando' && !esperandoMundo);
  const fuerzaSol = Math.max(cielo.luzColor.r, cielo.luzColor.g, cielo.luzColor.b);
  sombras.actualizar(camara, cielo.luzDir, mundo.version, vehiculosActivos(), fuerzaSol);
  multi.actualizar(dt);
  remotos.actualizar(dt, luz);
  renderer.render(escena, camara);
  vigilarRendimiento(dt);

  // Minimapa
  const verMapa = verMinimapa && (estado === 'jugando' || estado === 'pausa' || estado === 'inventario' || estado === 'contenedor') && !esperandoMundo;
  const cv = $('minimapa');
  cv.classList.toggle('oculto', !verMapa);
  if (verMapa) { minimapa.puntos = multi.puntosMapa(); minimapa.actualizar(dt, jugador, Aj.get('minimapaZoom')); minimapa.marcar(jugador.yaw); }

  // Brújula: 0 = norte (-Z), 90 = este (+X)
  if (estado !== 'titulo') {
    dirTmp.set(0, 0, -1).applyEuler(camara.rotation);
    interfaz.brujula((Math.atan2(dirTmp.x, -dirTmp.z) * 180 / Math.PI + 360) % 360);
  }

  // Datos (F3)
  tiempoDepuracion -= dt;
  if (tiempoDepuracion <= 0) {
    tiempoDepuracion = 0.25;
    if (verDepuracion && estado !== 'titulo') {
      const hh = Math.floor((hora * 24 + 6) % 24), mm = Math.floor(((hora * 24 + 6) % 1) * 60);
      dirTmp.set(0, 0, -1).applyEuler(camara.rotation);
      const rumbo = Math.abs(dirTmp.x) > Math.abs(dirTmp.z) ? (dirTmp.x > 0 ? 'este' : 'oeste') : (dirTmp.z > 0 ? 'sur' : 'norte');
      interfaz.depuracion(true,
        `${fps} FPS\n` +
        `X ${jugador.x.toFixed(1)}  Y ${jugador.y.toFixed(1)}  Z ${jugador.z.toFixed(1)}\n` +
        `chunk ${Math.floor(jugador.x) >> 4}, ${Math.floor(jugador.z) >> 4} · mirando al ${rumbo}\n` +
        `chunks ${mundo.contarMallados()} / ${mundo.chunks.size} · distancia ${radio}\n` +
        `semilla ${mundo.semilla} · día ${dias + 1} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${ETIQ_MODO[modo]}\n` +
        `bichos ${mobs.lista.length} · animales ${animales.lista.length}${multi.activo ? ' · jugadores ' + multi.listaJugadores().length : ''}\n` +
        (jugador.volando ? 'volando · ' : '') + (objetivo ? 'mira: ' + nombreBloque(objetivo.id) : ''));
    } else {
      interfaz.depuracion(false, '');
    }
  }

  // Guardado automático
  if (partidaIniciada && estado === 'jugando') {
    tiempoGuardar += dt;
    if (tiempoGuardar >= Aj.get('autoguardado')) {
      tiempoGuardar = 0;
      if (vehiculos.actual) mundo.hayCambiosSinGuardar = true;
      if (mundo.hayCambiosSinGuardar) guardar();
    }
  }
}
function chatAbiertoBloquea() { return false; }

// ----------------------------------------------------------- Arranque
const multi = new Multi({
  interfaz, hud, remotos, mundo, animales, mobs, drops, inv, vitales, jugador, vehiculos,
  Aj, Mundos, escena,
  get estado() { return estado; },
  get modo() { return modo; },
  get dificultad() { return dificultad; },
  get hora() { return hora; },
  set hora(h) { hora = h; },
  get dias() { return dias; },
  set dias(v) { dias = v; },
  get seleccion() { return seleccion; },
  get mundoMeta() { return mundoMeta; },
  itemEnMano: () => { const r = ranuraActual(); return r ? r.id : 0; },
  datosMundo: () => datosGuardado(),
  empezarComoInvitado: (meta, datos, extra) => comenzar(meta, datos, extra),
  empezarAnfitrion: (cfg) => { modo = cfg.modo === 'coop-creativo' ? 'creativo' : modo; aplicarModo(); },
  asegurarMundo: () => { if (!partidaIniciada) { const u = Mundos.ultimo(); if (u) jugarMundo(u.id); else { const m = Mundos.crear({ nombre: 'Mundo compartido', semilla: (Math.random() * 2147483647) | 0, tipo: 'normal', modo: 'supervivencia', dificultad: 'normal' }); jugarMundo(m.id); } } },
  mostrarTitulo: () => mostrarTitulo(),
  seguir: () => { if (estado === 'pausa') seguir(); },
  aviso: (t) => interfaz.aviso(t),
  herirJugador: (n, dx, dz, causa, opc) => herirJugador(n, dx, dz, causa, opc, null),
  soltarBotin: (x, y, z, lista) => { for (const [k, n] of lista) drops.soltar(resolverId(k), n, x, y + 0.5, z); },
  aplicarGolpeRemoto: (kind, id, dano, x, z) => { const e = (kind === 'a' ? animales.lista : mobs.lista).find((q) => q.id === id); if (e) aplicarGolpe(e, dano, x, z); },
  ponerBloqueRemoto: (x, y, z, id) => mundo.ponerRemoto(x, y, z, id),
  logroMulti: () => { logros.sumar('multi'); logros.revisar(); },
  guardarCopia: (datos, nombre) => { const m = Mundos.crear({ nombre, semilla: datos.semilla, tipo: datos.tipo, modo: datos.modo, dificultad: datos.dificultad }); Mundos.guardar(m.id, datos, 0); return m; },
  teclaChat: () => abrirChat(),
});

function iniciarJuego() {
  aplicarAjustes();
  aplicarCalidad(nivelCalidad);
  // el fondo del título: el último mundo que jugaste (o uno al azar)
  const u = Mundos.ultimo();
  const d = u ? Mundos.cargar(u.id) : null;
  if (d) {
    mundo.reiniciar(d.semilla, d.cambios, opcionesDePartida(d));
    convertirContenedores();
    restaurarJugador(d);
    fondoId = u.id;
  } else {
    mundo.reiniciar(semillaVistaPrevia, null, { version: 3 });
    const inicio = mundo.gen.buscarInicio();
    jugador.ponerEn(inicio.x, inicio.y + 1, inicio.z);
  }
  barra = barra.slice();
  refrescarBarra();
  mostrarTitulo();
  requestAnimationFrame(cuadro);
  logros.alLograr = (l) => { hud.toast('★ ' + l.nombre, l.desc, 'logro'); Sonido.logro(); };
  // la gente que llega con un enlace de sala entra directo al lobby
  if (window.Lobby && window.Lobby.hayEnlace && window.Lobby.hayEnlace()) multi.abrirLobby();
}
iniciarJuego();

// Para hacer pruebas desde la consola del navegador
window.BLOQUES = {
  mundo, jugador, camara, renderer, animales, mobs, vehiculos, ambiente, inv, vitales, drops, sombras, uniformes, cielo, remotos, multi, logros, Aj, Mundos,
  get calidad() { return nivelCalidad; },
  ponerCalidad: (n) => aplicarCalidad(n),
  colocarVehiculo, usarBloque, tecleoVehiculo,
  get estado() { return estado; },
  get modo() { return modo; },
  set modo(m) { modo = m; aplicarModo(); },
  get esperando() { return esperandoMundo; },
  get objetivo() { return objetivo; },
  get barra() { return barra.slice(); },
  get seleccion() { return seleccion; },
  get hora() { return hora; },
  set hora(h) { hora = ((h % 1) + 1) % 1; },
  get dias() { return dias; },
  get musica() { return { activa: Musica.activa, animo: Musica.animo, notas: Musica.notasTocadas }; },
  get entrada() { return { ...controles.entrada }; },
  controles,
  nuevoMundo: (texto, o = {}) => {
    const m = Mundos.crear({ nombre: o.nombre || 'Prueba', semilla: texto ? semillaDeTexto(String(texto)) : (Math.random() * 2147483647) | 0, tipo: o.tipo || 'normal', modo: o.modo || 'supervivencia', dificultad: o.dificultad || 'normal' });
    jugarMundo(m.id);
    return m;
  },
  jugarMundo,
  continuar: () => { const u = Mundos.ultimo(); if (u) jugarMundo(u.id); },
  mirar(yaw, pitch) { jugador.yaw = yaw; jugador.pitch = pitch; camara.rotation.set(pitch, yaw, 0, 'YXZ'); camara.position.set(jugador.x, jugador.y + J.ojos, jugador.z); actualizarObjetivo(); return objetivo; },
  romper() { actualizarObjetivo(); return objetivo ? romperBloque(objetivo, !esCreativo()) : false; },
  poner() { actualizarObjetivo(); return poner(); },
  minar: (dt) => { actualizarObjetivo(); minar(dt); return { ...mineria }; },
  elegirRanura,
  guardar,
  pausar,
  seguir,
  abrirInventario,
  cerrarInventario,
  abrirAjustes, abrirMundos, abrirLogros,
  alternarVuelo,
  moverCamaraTitulo,
  herirJugador: (n, causa = 'zombi') => herirJugador(n, 0, 1, causa, null, null),
  morir,
  reaparecer,
  fabricar: (clave) => { const rec = RECETAS.find((r) => r.salida === resolverId(clave)); return rec ? fabricar(rec, inv, true) : null; },
  crearMob: (tipo, dx = 5, dz = 0) => mobs.crear(tipo, jugador.x + dx, jugador.y, jugador.z + dz),
  entrarFoto, salirFoto, capturarFoto,
  // Para pruebas: lleva al jugador junto a la estructura más cercana de ese tipo
  irA(tipo, o = {}) {
    const r = mundo.gen.estructuras.buscar(tipo, o.desdeX ?? jugador.x, o.desdeZ ?? jugador.z, 12);
    if (!r) return null;
    const d = o.dist ?? 30, alto = o.alto ?? 14;
    const yaw = o.yaw ?? Math.PI;
    const ox = Math.sin(yaw) * d, oz = Math.cos(yaw) * d;
    jugador.ponerEn(r.cx + 0.5 + ox + (o.dx ?? 0), r.y + alto, r.cz + 0.5 + oz + (o.dz ?? 0));
    jugador.yaw = yaw;
    jugador.pitch = o.pitch ?? -Math.atan2(alto - 4, d);
    jugador.volando = o.volando ?? true;
    interfaz.volando(jugador.volando);
    esperandoMundo = true; buscarSuelo = false;
    return r;
  },
  distancia(n) { Aj.set('distancia', Math.max(DIST_MIN, Math.min(DIST_MAX, n))); },
  teletransportar(x, y, z, yaw = 0, pitch = 0, volando = true) {
    jugador.ponerEn(x, y, z); jugador.yaw = yaw; jugador.pitch = pitch; jugador.volando = volando;
    interfaz.volando(volando); esperandoMundo = true; buscarSuelo = false;
  },
};
