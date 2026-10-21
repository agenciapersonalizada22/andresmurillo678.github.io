// =============================================================
//  🚀  PRINCIPAL (aquí se junta todo)
//  Crea la escena 3D, el mundo, el jugador, el cielo y los menús,
//  y corre el "ciclo del juego": unas 60 veces por segundo mueve
//  al jugador, crea chunks, revisa a qué bloque apuntas y dibuja.
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
import { Animales } from './animales.js';
import { Ambiente } from './ambiente.js';
import { Vehiculos, TIPOS as TIPOS_VEH } from './vehiculos.js';
import { Mochila, botinDe, OBJETOS } from './botin.js';
import { Controles, detectarTactil } from './controles.js';
import { Interfaz } from './interfaz.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';
import { cargarPartida, guardarPartida, cargarOpciones, guardarOpciones } from './guardado.js';

const V = CONFIG.vista;
const J = CONFIG.jugador;
const $ = (id) => document.getElementById(id);
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);

// ----------------------------------------------------------- Pantalla y 3D
THREE.ColorManagement.enabled = false; // los colores se ven tal cual los escribimos

const lienzo = $('lienzo');
let tactil = detectarTactil();
const opciones = cargarOpciones();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !tactil && !/[?&]sinaa/.test(location.search), powerPreference: 'high-performance' });
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
const mochila = new Mochila();

// Cuadrito negro alrededor del bloque al que apuntas
const contorno = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
contorno.visible = false;
escena.add(contorno);

// ----------------------------------------------------------- Estado del juego
// 'titulo' | 'jugando' | 'pausa' | 'inventario'
let estado = 'titulo';
let esperandoMundo = false;   // se está creando el terreno bajo tus pies
let buscarSuelo = false;      // mundo nuevo: hay que pararte sobre el suelo
let partidaIniciada = false;  // ya hay algo que guardar
let hora = CONFIG.dia.horaInicio;
let barra = CONFIG.barraInicial.map((c) => POR_CLAVE[c] || B.PIEDRA);
let seleccion = 0;
let objetivo = null;
let verDepuracion = !!opciones.depuracion;
let radio = Number.isFinite(opciones.distancia) ? opciones.distancia : (tactil ? V.distanciaMovil : V.distancia);
radio = Math.max(V.distanciaMinima, Math.min(V.distanciaMaxima, radio | 0));
let lejos = 300;
let partida = cargarPartida();
let semillaVistaPrevia = partida ? partida.semilla : semillaAlAzar();
let anguloTitulo = 0;
const centroTitulo = new THREE.Vector3();
let alturaCamTitulo = 0;      // altura de la cámara que da vueltas en el título
const temporizador = { romper: 0, poner: 0 };
let tiempoGuardar = 0;
let tiempoDepuracion = 0;
let cuadrosFps = 0, tiempoFps = 0, fps = 0;

function semillaAlAzar() {
  return (Math.random() * 2147483647) | 0;
}

function aplicarRadio() {
  mundo.ponerRadio(radio);
  lejos = Math.max(220, (radio + 2) * 16 * 1.7);
  camara.far = lejos;
  camara.updateProjectionMatrix();
  $('valorDistancia').textContent = String(radio);
}

// ----------------------------------------------------------- Calidad gráfica
const calidadURL = (/[?&]calidad=(\w+)/.exec(location.search) || [])[1]; // ?calidad=ultra para probar
let nivelCalidad = NIVELES.includes(calidadURL) ? calidadURL : NIVELES.includes(opciones.calidad) ? opciones.calidad : nivelRecomendado(renderer, tactil);
let calidadElegida = NIVELES.includes(calidadURL) || NIVELES.includes(opciones.calidad); // si la elegiste tú, el juego no la baja solo
let Q = CALIDADES[nivelCalidad];

function aplicarCalidad(nivel, guardar = false) {
  nivelCalidad = nivel;
  Q = CALIDADES[nivel];
  if (guardar) { opciones.calidad = nivel; calidadElegida = true; guardarOpciones(opciones); }
  sombras.configurar(Q.sombras, Q.tamSombra, Q.rangoSombra);
  uniformes.uBump.value = Q.relieve;
  uniformes.uAguaCalidad.value = Q.olas;
  uniformes.uViento.value = Q.viento;
  cielo.ponerCalidadNubes(Q.nubesCapas, Q.nubesOctavas);
  cielo.ponerEstrellas(Q.estrellas);
  const hojas = tactil ? V.hojasDetalladasMovil && Q.hojasDetalladas : Q.hojasDetalladas;
  if (mundo.hojasDetalladas !== hojas) { mundo.hojasDetalladas = hojas; mundo.redibujarTodo(); }
  ajustarTamano();
  if (!Number.isFinite(opciones.distancia)) {
    radio = Math.max(V.distanciaMinima, Math.min(V.distanciaMaxima, tactil ? Q.distanciaMovil : Q.distancia));
    aplicarRadio();
  }
  if ($('btnCalidad')) $('btnCalidad').textContent = 'GRÁFICOS: ' + Q.nombre;
}

function ajustarTamano() {
  const w = window.innerWidth, h = window.innerHeight;
  const maxPix = Q ? Q.pixeles : 1;
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
    interfaz.actualizarBarra(barra, seleccion);
    interfaz.mostrarNombre(nombreBloque(id));
    Sonido.clic();
    cerrarInventario();
  },
  alElegirVehiculo: (tipo) => colocarVehiculo(tipo),
  alElegirObjeto: (obj) => {
    mochila.agregar(obj, 1);
    interfaz.mochila(mochila.exportar());
    interfaz.aviso('+1 ' + OBJETOS[obj].nombre);
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

function elegirRanura(i) {
  seleccion = ((i % 9) + 9) % 9;
  interfaz.actualizarBarra(barra, seleccion);
  interfaz.mostrarNombre(nombreBloque(barra[seleccion]));
}

// ----------------------------------------------------------- Controles
const controles = new Controles({
  lienzo,
  capaTactil: $('tactil'),
  tactil,
  puedeJugar: () => estado === 'jugando' && !esperandoMundo,
  alMirar: (dx, dy) => {
    if (vehiculos.actual) { vehiculos.mirar(dx, dy); return; }
    jugador.yaw -= dx;
    jugador.pitch -= dy;
    const lim = Math.PI / 2 - 0.01;
    if (jugador.pitch > lim) jugador.pitch = lim;
    if (jugador.pitch < -lim) jugador.pitch = -lim;
  },
  alCambioBloqueo: (bloqueado) => {
    // se soltó el ratón (Esc, cambiar de ventana…): pausa. En modo táctil puro
    // nunca se atrapa el ratón, así que esto solo pasa si lo estabas usando.
    if (!bloqueado && estado === 'jugando') pausar();
  },
  alAccion: (accion, dato) => {
    switch (accion) {
      case 'ranura': if (estado === 'jugando' || estado === 'inventario') elegirRanura(dato); break;
      case 'rueda': if (estado === 'jugando') elegirRanura(seleccion + dato); break;
      case 'volar': if (estado === 'jugando' && !vehiculos.actual) alternarVuelo(); break;
      case 'teclaE':
        if (estado === 'jugando') { if (!tecleoVehiculo()) abrirInventario(); }
        else if (estado === 'inventario') cerrarInventario();
        break;
      case 'vehiculo': if (estado === 'jugando') tecleoVehiculo(); break;
      case 'camara': if (estado === 'jugando' && vehiculos.actual) vehiculos.alternarCamara(); break;
      case 'luces': if (estado === 'jugando' && vehiculos.actual) { vehiculos.actual.lucesManual = true; vehiculos.alternarLuces(); } break;
      case 'repostar': if (estado === 'jugando') vehiculos.repostar(mochila); break;
      case 'inventario':
        if (estado === 'jugando') abrirInventario();
        else if (estado === 'inventario') cerrarInventario();
        break;
      case 'pausa':
        if (estado === 'jugando') pausar();
        else if (estado === 'inventario') cerrarInventario(dato === 'esc');
        else if (estado === 'pausa') seguir(dato === 'esc');
        break;
      case 'depuracion': alternarDepuracion(); break;
      case 'musica': alternarMusica(); break;
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

// ----------------------------------------------------------- Acciones del juego
function alternarVuelo() {
  jugador.volando = !jugador.volando;
  if (jugador.volando) jugador.vy = 0;
  interfaz.volando(jugador.volando);
  interfaz.aviso(jugador.volando ? 'Modo vuelo: SÍ' : 'Modo vuelo: NO');
  Sonido.volar(jugador.volando);
}

function alternarDepuracion() {
  verDepuracion = !verDepuracion;
  opciones.depuracion = verDepuracion;
  guardarOpciones(opciones);
  actualizarBotonesPausa();
}

function alternarMusica() {
  const si = Musica.alternar();
  interfaz.aviso(si ? 'Música: SÍ' : 'Música: NO');
  actualizarBotonesPausa();
}

function elegirDeLaMira() {
  if (!objetivo) return;
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

function romper() {
  if (!objetivo || vehiculos.actual) return false;
  const { x, y, z, id } = objetivo;
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
  if (DIBUJO[mundo.obtener(x, y + 1, z)] === DIBUJO_PLANTA) mundo.poner(x, y + 1, z, B.AIRE);
  particulas.explotar(x, y, z, colorDe(id), DIBUJO[id] === DIBUJO_PLANTA ? 8 : 18);
  Sonido.romper(sonidoBloque(id));
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

const libre = (x, y, z) => {
  const b = mundo.obtener(x, y, z);
  return b === B.AIRE || DIBUJO[b] === DIBUJO_AGUA || DIBUJO[b] === DIBUJO_PLANTA;
};

// Clic derecho sobre cofres, puertas y camas
function usarBloque(o) {
  const { x, y, z, id } = o;
  const tipo = USABLE[id];
  if (!tipo) return false;
  if (BASE[id] === B.PUERTA_X) {
    const abierta = id === B.PUERTA_X_ABIERTA || id === B.PUERTA_Z_ABIERTA;
    const nuevoId = id === B.PUERTA_X ? B.PUERTA_X_ABIERTA : id === B.PUERTA_Z ? B.PUERTA_Z_ABIERTA : id === B.PUERTA_X_ABIERTA ? B.PUERTA_X : B.PUERTA_Z;
    mundo.poner(x, y, z, nuevoId);
    for (const dy of [-1, 1]) if (BASE[mundo.obtener(x, y + dy, z)] === B.PUERTA_X) mundo.poner(x, y + dy, z, nuevoId);
    Sonido.puerta();
    return abierta || true;
  }
  if (id >= B.COFRE && id < B.COFRE + 4) {
    const clave = x + ',' + y + ',' + z;
    if (mundo.abiertos.has(clave)) { interfaz.aviso('El cofre está vacío'); Sonido.clic(); return true; }
    mundo.abiertos.add(clave);
    const loot = botinDe(x, y, z, mundo.semilla, CONFIG.mundo.nivelMar);
    for (const [obj, n] of loot) mochila.agregar(obj, n);
    interfaz.mochila(mochila.exportar());
    interfaz.aviso('Cofre: ' + loot.map(([obj, n]) => '+' + n + ' ' + OBJETOS[obj].nombre).join(' · '), 3.6);
    Sonido.cofre();
    if (loot.some(([obj]) => obj === 'diamante' || obj === 'esmeralda')) Sonido.tesoro();
    mundo.hayCambiosSinGuardar = true;
    return true;
  }
  if (tipo === 'cama') {
    if (cielo.factorDia < 0.45) { hora = 0.0; interfaz.aviso('Dormiste hasta la mañana'); mundo.hayCambiosSinGuardar = true; }
    else interfaz.aviso('Solo puedes dormir de noche');
    Sonido.clic();
    return true;
  }
  return false;
}

function poner() {
  if (!objetivo || vehiculos.actual) return false;
  if (USABLE[objetivo.id] && usarBloque(objetivo)) return true;
  let id = barra[seleccion];
  if (!esValido(id)) return false;
  let { x, y, z } = objetivo;
  if (DIBUJO[objetivo.id] !== DIBUJO_PLANTA) {
    x += objetivo.nx; y += objetivo.ny; z += objetivo.nz;
  }
  if (y < 0 || y >= ALTO) return false;
  const actual = mundo.obtener(x, y, z);
  if (actual !== B.AIRE && DIBUJO[actual] !== DIBUJO_AGUA && DIBUJO[actual] !== DIBUJO_PLANTA) return false;
  const fv = orientacionDeYaw(jugador.yaw); // hacia dónde mira el jugador (0 sur, 1 oeste, 2 norte, 3 este)
  const base = BASE[id];
  // bloques con orientación y de varias partes
  if (base === B.COFRE) id = variante(B.COFRE, (fv + 2) & 3);
  else if (base === B.PUERTA_X) {
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
  interfaz.aviso(v.T.nombre + (v.T.clase === 'aire' ? ' · W/S motor · mueve el ratón para subir y girar' : v.T.clase === 'agua' ? ' · WASD navegar' : v.T.clase === 'riel' ? ' · W/S mover' : ' · WASD manejar'), 3);
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

// ----------------------------------------------------------- Guardar
// Una partida vieja (sin "gen") conserva el generador 1: mismo terreno de siempre, sin biomas.
function opcionesDePartida(p) {
  const version = p ? (p.gen >= 2 ? 2 : 1) : 2;
  let bloqueados = null;
  if (version === 1) bloqueados = Array.isArray(p.bloqueados) ? p.bloqueados : Object.keys(p.cambios || {});
  return {
    version, bloqueados,
    abiertos: p && Array.isArray(p.abiertos) ? p.abiertos : [],
    vehiculosUsados: p && Array.isArray(p.vehiculosUsados) ? p.vehiculosUsados : [],
  };
}

function aplicarExtrasDePartida(p) {
  vehiculos.importar(p && p.vehiculos);
  mochila.importar(p && p.mochila);
  interfaz.mochila(mochila.exportar());
}

let avisoGuardadoDado = false;
function guardar(silencio = false) {
  if (!partidaIniciada) return false;
  const datos = {
    version: 2,
    gen: mundo.versionGen,          // 1 = terreno de mundos viejos, 2 = con biomas
    semilla: mundo.semilla,
    cambios: mundo.exportarCambios(),
    bloqueados: mundo.bloqueados ? [...mundo.bloqueados] : undefined, // chunks de mundos viejos donde no hay estructuras
    abiertos: [...mundo.abiertos],
    vehiculos: vehiculos.exportar(),
    vehiculosUsados: [...mundo.vehiculosUsados],
    mochila: mochila.exportar(),
    jugador: {
      x: +jugador.x.toFixed(3), y: +jugador.y.toFixed(3), z: +jugador.z.toFixed(3),
      yaw: +jugador.yaw.toFixed(4), pitch: +jugador.pitch.toFixed(4), volando: jugador.volando,
    },
    hora: +hora.toFixed(5),
    barra,
    seleccion,
    fecha: Date.now(),
  };
  const ok = guardarPartida(datos);
  if (ok) {
    partida = datos;
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
    if (estado === 'jugando' && controles.tactil) pausar();
  }
});

// ----------------------------------------------------------- Pantallas
function actualizarTitulo() {
  const hay = !!partida;
  $('btnContinuar').classList.toggle('oculto', !hay);
  $('infoGuardado').classList.toggle('oculto', !hay);
  $('avisoNuevo').classList.toggle('oculto', !hay);
  if (hay) {
    const n = Object.values(partida.cambios || {}).reduce((s, l) => s + (Array.isArray(l) ? l.length / 2 : 0), 0);
    let fecha = '';
    try { fecha = new Date(partida.fecha).toLocaleDateString('es'); } catch (e) { fecha = ''; }
    $('infoGuardado').textContent = `Semilla ${partida.semilla} · ${n} bloque${n === 1 ? '' : 's'} cambiado${n === 1 ? '' : 's'}${fecha ? ' · ' + fecha : ''}`;
  }
  $('btnNuevo').classList.toggle('principal', !hay);
}

function mostrarTitulo() {
  estado = 'titulo';
  if (vehiculos.actual) { vehiculos.bajar(true); interfaz.tablero(null); }
  animales.limpiar();
  ambiente.limpiar();
  esperandoMundo = false;
  controles.soltarTodo();
  controles.soltarBloqueo();
  interfaz.pantalla('titulo');
  interfaz.carga(false);
  $('panelNuevo').classList.add('oculto');
  $('campoSemilla').value = '';
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

function actualizarBotonesPausa() {
  $('btnMusica').textContent = 'MÚSICA: ' + (Musica.activa ? 'SÍ' : 'NO');
  $('btnEfectos').textContent = 'SONIDOS: ' + (Sonido.efectosActivos ? 'SÍ' : 'NO');
  $('btnDepuracion').textContent = 'DATOS: ' + (verDepuracion ? 'SÍ' : 'NO');
  $('textoSemilla').textContent = String(mundo.semilla);
}

function pausar() {
  if (estado !== 'jugando') return;
  estado = 'pausa';
  controles.soltarTodo();
  controles.soltarBloqueo();
  guardar();
  actualizarBotonesPausa();
  interfaz.pantalla('pausa');
}

// Con Esc el navegador no deja atrapar el ratón (no cuenta como clic): ahí se pide con el siguiente clic
function seguir(conEsc = false) {
  estado = 'jugando';
  interfaz.pantalla(null);
  if (!conEsc) controles.pedirBloqueo();
}

function abrirInventario() {
  estado = 'inventario';
  controles.soltarTodo();
  controles.soltarBloqueo();
  interfaz.pantalla('inventario');
}

function cerrarInventario(conEsc = false) {
  if (estado !== 'inventario') return;
  estado = 'jugando';
  interfaz.pantalla(null);
  if (!conEsc) controles.pedirBloqueo();
}

// Empieza a jugar: un mundo nuevo o el guardado
function comenzar(nuevo, textoSemilla) {
  if (nuevo) {
    let semilla;
    const texto = (textoSemilla || '').trim();
    if (texto) semilla = semillaDeTexto(texto);
    else if (!partida && mundo.semilla === semillaVistaPrevia && mundo.cuantosCambios() === 0) semilla = semillaVistaPrevia;
    else semilla = semillaAlAzar();
    if (semilla !== mundo.semilla || mundo.cuantosCambios() > 0 || mundo.versionGen !== 2) mundo.reiniciar(semilla, null, { version: 2 });
    mundo.abiertos.clear();
    mundo.vehiculosUsados.clear();
    aplicarExtrasDePartida(null);
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
    const opc = opcionesDePartida(partida);
    if ((partida.semilla | 0) !== mundo.semilla || mundo.versionGen !== opc.version) mundo.reiniciar(partida.semilla, partida.cambios, opc);
    restaurarJugador(partida);
    aplicarExtrasDePartida(partida);
    buscarSuelo = false;
  }
  partidaIniciada = true;
  animales.limpiar();
  interfaz.volando(jugador.volando);
  interfaz.actualizarBarra(barra, seleccion);
  esperandoMundo = true;
  estado = 'jugando';
  interfaz.pantalla(null);
  interfaz.carga(true, 0);
  controles.pedirBloqueo();
  if (nuevo) guardar();
  const textoAyuda = controles.tactil
    ? '<b>Joystick</b> caminar · <b>arrastra</b> para mirar<br><b>toca</b> = poner o usar · <b>mantén el dedo</b> = romper · <b>SUBIR</b> cerca de un vehículo'
    : '<b>WASD</b> caminar · <b>Espacio</b> saltar · <b>Shift</b> o <b>W W</b> correr · <b>F</b> volar<br>' +
      '<b>Clic izq.</b> romper · <b>Clic der.</b> poner / abrir cofres y puertas · <b>1-9 / rueda</b> elegir · <b>E</b> vehículo o bloques · <b>I</b> inventario · <b>Esc</b> pausa';
  interfaz.ayuda(textoAyuda, 12);
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
  jugador.volando = !!j.volando;
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

// ----------------------------------------------------------- Botones de los menús
function boton(id, fn) {
  $(id).addEventListener('click', (e) => {
    e.preventDefault();
    despertarAudio();
    Sonido.clic();
    fn();
  });
}
boton('btnContinuar', () => comenzar(false));
boton('btnNuevo', () => {
  const panel = $('panelNuevo');
  panel.classList.toggle('oculto');
  if (!panel.classList.contains('oculto') && !controles.tactil) $('campoSemilla').focus();
});
boton('btnCrear', () => comenzar(true, $('campoSemilla').value));
boton('btnCancelarNuevo', () => $('panelNuevo').classList.add('oculto'));
$('campoSemilla').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); despertarAudio(); comenzar(true, e.target.value); }
});
boton('btnSeguir', () => seguir());
boton('btnMusica', () => alternarMusica());
boton('btnEfectos', () => { Sonido.alternarEfectos(); actualizarBotonesPausa(); });
boton('btnDepuracion', () => alternarDepuracion());
boton('btnGuardar', () => {
  interfaz.aviso(guardar(true) ? 'Mundo guardado ✓' : 'No se pudo guardar (¿poco espacio o modo incógnito?)');
});
boton('btnTitulo', () => { guardar(); mostrarTitulo(); });
boton('btnCalidad', () => {
  const i = NIVELES.indexOf(nivelCalidad);
  aplicarCalidad(NIVELES[(i + 1) % NIVELES.length], true);
  interfaz.aviso('Gráficos: ' + Q.nombre + (nivelCalidad === 'ultra' ? ' (necesita buena tarjeta de video)' : ''));
});
boton('btnMochila', () => {
  const items = mochila.exportar();
  const texto = Object.keys(items).map((k) => items[k] + ' ' + OBJETOS[k].nombre).join(' · ');
  interfaz.aviso(texto ? 'Mochila: ' + texto : 'Mochila vacía: abre cofres de aldeas, minas y templos', 4);
});
boton('btnMenosDistancia', () => cambiarDistancia(-1));
boton('btnMasDistancia', () => cambiarDistancia(1));
boton('btnCerrarInventario', () => cerrarInventario());

function cambiarDistancia(d) {
  radio = Math.max(V.distanciaMinima, Math.min(V.distanciaMaxima, radio + d));
  opciones.distancia = radio;
  guardarOpciones(opciones);
  aplicarRadio();
}

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
function vehiculosActivos() { return !!vehiculos.actual || animales.lista.length > 0 || vehiculos.lista.some((v) => v.T.clase === 'agua'); }

function accionesRepetidas(dt) {
  for (const accion of ['romper', 'poner']) {
    const hacer = accion === 'romper' ? romper : poner;
    if (controles.pulsos[accion]) {
      controles.pulsos[accion] = false;
      hacer();
      temporizador[accion] = J.tiempoEntreGolpes * 1.5;
    } else if (controles.mantener[accion]) {
      temporizador[accion] -= dt;
      if (temporizador[accion] <= 0) {
        actualizarObjetivo();
        hacer();
        temporizador[accion] = J.tiempoEntreGolpes;
      }
    }
  }
}

function sonidosDelJugador() {
  for (const ev of jugador.eventos) {
    if (ev === 'paso') Sonido.paso(sonidoBloque(jugador.bloqueBajoPies(mundo)));
    else if (ev === 'salto') Sonido.salto();
    else if (ev === 'aterrizaje') Sonido.aterrizaje(sonidoBloque(jugador.bloqueBajoPies(mundo)));
    else if (ev === 'chapuzon') Sonido.chapuzon();
  }
}

// Los vehículos que esperan en garajes y minas aparecen cuando se crea su chunk
function nacenVehiculosDeEstructuras() {
  while (mundo.puntosNuevos.length) {
    const p = mundo.puntosNuevos.pop();
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
  if (!vehiculos.actual) interfaz.cercaVehiculo(estado === 'jugando' && !esperandoMundo && !!vehiculos.cercano(jugador.x, jugador.y + 0.9, jugador.z));
  else interfaz.cercaVehiculo(true);
}

// Si el juego va lento y no elegiste la calidad tú, la baja un escalón
let lentos = 0, tiempoVigilar = 0;
function vigilarRendimiento(dt) {
  if (calidadElegida || estado !== 'jugando' || esperandoMundo) { lentos = 0; return; }
  tiempoVigilar += dt;
  if (tiempoVigilar < 2) return;
  tiempoVigilar = 0;
  const idx = NIVELES.indexOf(nivelCalidad);
  if (fps > 0 && fps < 24 && idx > 0) {
    if (++lentos >= 3) {
      lentos = 0;
      aplicarCalidad(NIVELES[idx - 1]);
      interfaz.aviso('Gráficos: ' + Q.nombre + ' (para que vaya más fluido; cámbialo en Pausa)', 4);
    }
  } else lentos = 0;
}

function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  let dt = (ahora - ultimo) / 1000;
  ultimo = ahora;
  if (!(dt > 0)) dt = 0;
  if (dt > 0.1) dt = 0.1;

  cuadrosFps++;
  tiempoFps += dt;
  if (tiempoFps >= 0.5) { fps = Math.round(cuadrosFps / tiempoFps); cuadrosFps = 0; tiempoFps = 0; }

  const enVeh = !!vehiculos.actual;
  controles.actualizar(jugador.volando, enVeh);

  // ¿ya está el terreno bajo tus pies?
  if (estado === 'jugando' && esperandoMundo) {
    const p = mundo.progreso(jugador.x, jugador.z, 1);
    interfaz.carga(true, p);
    if (p >= 1) {
      esperandoMundo = false;
      if (buscarSuelo) pararseEnSuelo();
      jugador.desatorar(mundo);
      interfaz.carga(false);
    }
  }

  if (estado === 'jugando' && !esperandoMundo && !enVeh) {
    jugador.actualizar(dt, controles.entrada, mundo, controles.tactil);
    if (!jugador.volando) interfaz.volando(false);
    sonidosDelJugador();
  }

  // Vehículos: los parados se asientan en el suelo y el que manejas se mueve (y pone la cámara)
  vehiculos.radioVista = (radio + 3) * 16;
  if (estado !== 'titulo') {
    nacenVehiculosDeEstructuras();
    vehiculos.actualizar(dt, controles.entrada, jugador, camara, esperandoMundo || estado !== 'jugando');
    mostrarAvisosVehiculo();
    actualizarTableroVehiculo(dt);
  }

  // Cámara
  if (estado === 'titulo') {
    moverCamaraTitulo(dt);
  } else if (vehiculos.actual) {
    const fovObjetivo = V.campoVision + Math.min(16, Math.abs(vehiculos.actual.vel) * 0.4);
    if (Math.abs(camara.fov - fovObjetivo) > 0.05) {
      camara.fov += (fovObjetivo - camara.fov) * Math.min(1, dt * 5);
      camara.updateProjectionMatrix();
    }
  } else {
    camara.position.set(jugador.x, jugador.y + J.ojos, jugador.z);
    camara.rotation.set(jugador.pitch, jugador.yaw, 0, 'YXZ');
    const rapido = jugador.corriendo || (jugador.volando && controles.entrada.correr);
    const fovObjetivo = rapido && estado === 'jugando' ? V.campoVisionCorriendo : V.campoVision;
    if (Math.abs(camara.fov - fovObjetivo) > 0.05) {
      camara.fov += (fovObjetivo - camara.fov) * Math.min(1, dt * 8);
      camara.updateProjectionMatrix();
    }
  }

  // Hora del día (se detiene en pausa)
  if (estado === 'jugando' || estado === 'titulo') hora = (hora + dt / CONFIG.dia.duracion) % 1;

  // Cielo, luz y niebla
  tiempoTotal += dt;
  const luz = cielo.actualizar(hora, camara, lejos, dt, tiempoTotal);
  const dia = cielo.factorDia;
  const r = luz * (0.86 + 0.14 * dia), g = luz * (0.9 + 0.1 * dia), b = luz;
  particulas.material.color.setRGB(r, g, b);
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
  interfaz.clicContinuar(estado === 'jugando' && !esperandoMundo && !controles.tactil && !controles.bloqueado && !controles.modoArrastre);
  cielo.bajoAgua(bajoAgua); // bajo el agua no se ve el cielo, solo azul
  Musica.ponerAnimo(dia > 0.4 ? 'dia' : 'noche');

  // Crear/dibujar chunks cerca de donde está la cámara
  const presupuesto = esperandoMundo ? 40 : (tactil ? Math.min(V.presupuestoMsMovil, Q.presupuesto) : Math.max(V.presupuestoMs - 2, Q.presupuesto));
  // al manejar, los chunks se crean un poco más adelante de hacia donde vas
  const va = vehiculos.actual;
  const centro = estado === 'titulo' ? centroTitulo : va ? { x: jugador.x + lim(va.vx * 0.9, -45, 45), z: jugador.z + lim(va.vz * 0.9, -45, 45) } : jugador;
  mundo.actualizar(centro.x, centro.z, presupuesto);

  actualizarObjetivo();
  if (estado === 'jugando') accionesRepetidas(dt);
  particulas.actualizar(dt, mundo);
  if (CONFIG.animales.activos && estado === 'jugando' && !esperandoMundo) {
    animales.tintar(r, g, b);
    animales.actualizar(dt, jugador, dia, tactil ? CONFIG.animales.maximoMovil : CONFIG.animales.maximo);
  }

  ambiente.alturaPantalla = renderer.domElement.height;
  ambiente.actualizar(dt, camara, cielo, Q.particulas, estado === 'jugando' && !esperandoMundo);
  const fuerzaSol = Math.max(cielo.luzColor.r, cielo.luzColor.g, cielo.luzColor.b);
  sombras.actualizar(camara, cielo.luzDir, mundo.version, vehiculosActivos(), fuerzaSol);
  renderer.render(escena, camara);
  vigilarRendimiento(dt);

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
        `semilla ${mundo.semilla} · hora ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}\n` +
        (jugador.volando ? 'volando · ' : '') + (objetivo ? 'mira: ' + nombreBloque(objetivo.id) : ''));
    } else {
      interfaz.depuracion(false, '');
    }
  }

  // Guardado automático
  if (partidaIniciada && estado === 'jugando') {
    tiempoGuardar += dt;
    if (tiempoGuardar >= CONFIG.guardado.cadaSegundos) {
      tiempoGuardar = 0;
      if (vehiculos.actual) mundo.hayCambiosSinGuardar = true;
      if (mundo.hayCambiosSinGuardar) guardar();
    }
  }
}

// ----------------------------------------------------------- Arranque
aplicarRadio();
mundo.reiniciar(semillaVistaPrevia, partida ? partida.cambios : null, opcionesDePartida(partida));
if (partida) { restaurarJugador(partida); aplicarExtrasDePartida(partida); }
else {
  const inicio = mundo.gen.buscarInicio();
  jugador.ponerEn(inicio.x, inicio.y + 1, inicio.z);
}
interfaz.actualizarBarra(barra, seleccion);
aplicarCalidad(nivelCalidad);
mostrarTitulo();
requestAnimationFrame(cuadro);

// Para hacer pruebas desde la consola del navegador
window.BLOQUES = {
  mundo, jugador, camara, renderer, animales, vehiculos, ambiente, mochila, sombras, uniformes, cielo,
  get calidad() { return nivelCalidad; },
  ponerCalidad: (n) => aplicarCalidad(n),
  colocarVehiculo, usarBloque, tecleoVehiculo,
  get opcionesPartida() { return partida; },
  get estado() { return estado; },
  get esperando() { return esperandoMundo; },
  get objetivo() { return objetivo; },
  get barra() { return barra.slice(); },
  get seleccion() { return seleccion; },
  get hora() { return hora; },
  set hora(h) { hora = ((h % 1) + 1) % 1; },
  get musica() { return { activa: Musica.activa, notas: Musica.notasTocadas }; },
  get entrada() { return { ...controles.entrada }; },
  nuevoMundo: (texto) => comenzar(true, texto || ''),
  continuar: () => comenzar(false),
  mirar(yaw, pitch) { jugador.yaw = yaw; jugador.pitch = pitch; camara.rotation.set(pitch, yaw, 0, 'YXZ'); camara.position.set(jugador.x, jugador.y + J.ojos, jugador.z); actualizarObjetivo(); return objetivo; },
  romper() { actualizarObjetivo(); return romper(); },
  poner() { actualizarObjetivo(); return poner(); },
  elegirRanura,
  guardar,
  pausar,
  seguir,
  abrirInventario,
  cerrarInventario,
  alternarVuelo,
  moverCamaraTitulo,
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
  distancia(n) { radio = Math.max(V.distanciaMinima, Math.min(V.distanciaMaxima, n)); aplicarRadio(); },
  teletransportar(x, y, z, yaw = 0, pitch = 0, volando = true) {
    jugador.ponerEn(x, y, z); jugador.yaw = yaw; jugador.pitch = pitch; jugador.volando = volando;
    interfaz.volando(volando); esperandoMundo = true; buscarSuelo = false;
  },
};
