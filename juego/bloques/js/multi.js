// =============================================================
//  🌐  MULTIJUGADOR (mundo compartido, 2 a 4 jugadores)
//  Usa window.Red / window.Lobby (juego/comun). El anfitrión es la
//  fuente de verdad: tiene el mundo guardado, simula los bichos y
//  los animales y manda la hora. Cada jugador mueve su propio cuerpo
//  y avisa su posición ~16 veces por segundo; los demás lo ven
//  suavizado. Cada cambio de bloque se avisa a todos (los de los
//  invitados los revisa el anfitrión). El invitado recibe el mundo
//  comprimido y en pedacitos al empezar.
// =============================================================
import { esValido } from './bloques.js';
import { ranuraAArr, arrARanura } from './inventario.js';

const R = () => window.Red;
const TAM_PEDAZO = 11000;

function aBase64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
function deBase64(txt) {
  const s = atob(txt);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
async function comprimir(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return { z: 0, s: aBase64(bytes) };
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter();
  w.write(bytes); w.close();
  return { z: 1, s: aBase64(await new Response(cs.readable).arrayBuffer()) };
}
async function descomprimir(s, z) {
  const bytes = deBase64(s);
  if (!z) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('gzip');
  const w = ds.writable.getWriter();
  w.write(bytes); w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

export class Multi {
  constructor(c) {
    this.c = c;
    this.registrado = false;
    this.pos = {};              // id -> última posición cruda de cada amigo
    this.tPos = 0;
    this.tSnap = 0;
    this.tHora = 0;
    this.recibiendo = null;
    this.nombreAnfitrion = '';
    this.partidaEmpezada = false;
    this.opts = {
      juego: 'Mundo de Bloques', maxJugadores: 4,
      modos: [{ id: 'coop-super', nombre: 'Supervivencia cooperativa' }, { id: 'coop-creativo', nombre: 'Creativo cooperativo' }],
      alIniciar: (config, jugadores) => this.alIniciar(config, jugadores),
    };
    window.addEventListener('pagehide', () => { if (R() && R().conectado) R().salir(); });
    c.mundo.escuchar((ev) => this.alCambiarBloque(ev));
  }

  get activo() { return !!(R() && R().conectado); }
  get esAnfitrion() { return this.activo && R().esAnfitrion; }
  get esInvitado() { return this.activo && !R().esAnfitrion && this.partidaEmpezada; }

  abrirLobby() {
    if (!window.Lobby) { this.c.aviso('El multijugador no se pudo cargar'); return; }
    this.registrar();
    window.Lobby.abrir(this.opts);
  }

  // Desde el título: carga el último mundo (o crea uno) y abre el lobby encima
  desdeTitulo() {
    this.c.asegurarMundo();
    this.abrirLobby();
  }

  // ---------------------------------------------------------- eventos de la red
  registrar() {
    if (this.registrado || !R()) return;
    this.registrado = true;
    const red = R();
    red.on('mensaje', (t, d, de) => this.alMensaje(t, d, de));
    red.on('jugadorUnido', (id, j) => this.alUnirse(id, j));
    red.on('jugadorSalio', (id, j) => this.alSalir(id, j));
    red.on('cerrado', (motivo) => this.alCerrar(motivo));
    red.on('chat', (de, texto, j) => {
      const q = j || red.jugadores[de] || { nombre: '?', color: '#fff' };
      this.c.hud.chat(q.nombre, q.color, texto);
    });
  }

  listaJugadores() {
    const red = R();
    if (!red || !red.conectado) return [];
    return red.lista().map((j) => ({ id: j.id, nombre: j.nombre, color: j.color, ping: j.id === red.miId ? Math.round(red.rtt || 0) : j.ping, yo: j.id === red.miId }));
  }

  puntosMapa() {
    const r = [];
    if (!this.activo) return r;
    for (const id of Object.keys(this.pos)) {
      const j = R().jugadores[id];
      if (j) r.push({ x: this.pos[id].x, z: this.pos[id].z, color: j.color });
    }
    return r;
  }

  // Los bichos persiguen al más cercano de todos los jugadores
  objetivos(local) {
    const l = [local];
    if (this.esAnfitrion) for (const id of Object.keys(this.pos)) if (R().jugadores[id]) l.push({ x: this.pos[id].x, y: this.pos[id].y, z: this.pos[id].z, id: +id, remoto: true });
    return l;
  }

  alUnirse(id, j) {
    if (id === R().miId) return;
    this.c.remotos.agregar(id, j.nombre, j.color);
    this.c.hud.chat(null, null, j.nombre + ' se unió', true);
    this.c.logroMulti();
  }

  alSalir(id, j) {
    this.c.remotos.quitar(id);
    delete this.pos[id];
    this.c.hud.chat(null, null, (j && j.nombre ? j.nombre : 'Un jugador') + ' salió', true);
  }

  alCerrar() {
    const c = this.c;
    const eraInvitado = this.partidaEmpezada && !this.eraAnfitrion;
    this.limpiar();
    if (eraInvitado && c.estado !== 'titulo') {
      // el anfitrión se fue: nos quedamos con una copia de lo que recibimos
      let aviso = 'La sala se cerró';
      try {
        const m = c.guardarCopia(c.datosMundo(), 'Copia de ' + (this.nombreAnfitrion || 'mundo compartido'));
        aviso = 'El anfitrión cerró la sala. Se guardó una copia en Mis mundos: ' + m.nombre;
      } catch (e) { /* sin espacio */ }
      c.mostrarTitulo();
      c.hud.toast('Sala cerrada', aviso);
      c.aviso(aviso);
    } else if (c.estado !== 'titulo') c.hud.chat(null, null, 'La sala se cerró', true);
  }

  limpiar() {
    this.c.remotos.limpiar();
    this.pos = {};
    this.partidaEmpezada = false;
    this.recibiendo = null;
    this.c.mobs.espejo = false; this.c.animales.espejo = false;
  }

  salir() {
    if (R() && R().conectado) R().salir();
    this.limpiar();
  }

  // ---------------------------------------------------------- empezar
  alIniciar(config, jugadores) {
    const red = R(), c = this.c;
    this.registrar();
    this.eraAnfitrion = red.esAnfitrion;
    this.partidaEmpezada = true;
    for (const j of red.lista()) if (j.id !== red.miId && !c.remotos.mapa.has(j.id)) c.remotos.agregar(j.id, j.nombre, j.color);
    if (red.esAnfitrion) {
      c.asegurarMundo();
      c.empezarAnfitrion(config);
      c.hud.chat(null, null, 'Eres el anfitrión: los invitados reciben tu mundo', true);
    } else {
      c.interfaz.carga(true, 0);
      this.recibiendo = { partes: [], total: 0 };
      red.enviar('pedirMundo', { v: 1 });
    }
  }

  // El anfitrión manda el mundo a quien lo pida
  async enviarMundo(id) {
    const c = this.c, red = R();
    const datos = c.datosMundo();
    datos.jugador = { x: c.jugador.x + 1.5, y: c.jugador.y + 0.2, z: c.jugador.z, yaw: c.jugador.yaw, pitch: 0, volando: false };
    // lo personal de cada jugador no viaja
    delete datos.inventario; delete datos.vitales; delete datos.cama; delete datos.vehiculos; delete datos.vehiculosUsados;
    const { z, s } = await comprimir(JSON.stringify(datos));
    const total = Math.ceil(s.length / TAM_PEDAZO);
    red.enviar('mundoInicio', { total, z, nombre: red.jugadores[red.miId] ? red.jugadores[red.miId].nombre : 'Anfitrión', hora: c.hora, dias: c.dias, modo: c.modo, dificultad: c.dificultad }, { a: id });
    for (let i = 0; i < total; i++) red.enviar('mundoParte', { i, d: s.slice(i * TAM_PEDAZO, (i + 1) * TAM_PEDAZO) }, { a: id });
  }

  async terminarRecepcion() {
    const c = this.c, r = this.recibiendo;
    this.recibiendo = null;
    let datos;
    try { datos = JSON.parse(await descomprimir(r.partes.join(''), r.z)); } catch (e) { c.aviso('No se pudo leer el mundo del anfitrión'); c.interfaz.carga(false); return; }
    // lo personal de este jugador (si ya había jugado en este mundo)
    const personal = this.cargarPersonal(datos);
    datos.inventario = personal.inventario || { r: [], a: [] };
    datos.vitales = personal.vitales; datos.barra = personal.barra || datos.barra; datos.seleccion = personal.seleccion || 0;
    datos.modo = r.modo; datos.dificultad = r.dificultad; datos.hora = r.hora; datos.dias = r.dias;
    datos.spawn = null;
    this.nombreAnfitrion = r.nombre;
    const meta = { id: 'compartido', nombre: 'Mundo de ' + r.nombre, semilla: datos.semilla, tipo: datos.tipo, modo: r.modo, dificultad: r.dificultad };
    c.mobs.espejo = true; c.animales.espejo = true;
    c.empezarComoInvitado(meta, datos, { host: r.nombre });
  }

  alEmpezarInvitado() {
    this.c.mobs.espejo = true; this.c.animales.espejo = true;
    this.c.hud.chat(null, null, 'Entraste al mundo de ' + this.nombreAnfitrion, true);
  }

  // ---------------------------------------------------------- lo personal del invitado
  claveLocal(datos) { return 'bloques_pj_' + (datos ? datos.semilla : this.c.mundo.semilla) + '_' + (datos ? datos.tipo : this.c.mundo.tipo); }

  cargarPersonal(datos) {
    try { return JSON.parse(localStorage.getItem(this.claveLocal(datos)) || '{}') || {}; } catch (e) { return {}; }
  }

  guardarPersonal() {
    const c = this.c;
    try {
      localStorage.setItem(this.claveLocal(), JSON.stringify({ inventario: c.inv.exportar(), vitales: c.vitales.exportar(), barra: c.datosMundo().barra, seleccion: c.seleccion }));
      return true;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------- mensajes
  alMensaje(t, d, de) {
    const c = this.c, red = R();
    switch (t) {
      case 'pedirMundo': if (red.esAnfitrion) this.enviarMundo(de); break;
      case 'mundoInicio': if (this.recibiendo) { Object.assign(this.recibiendo, d, { partes: new Array(d.total).fill(''), vistos: 0 }); } break;
      case 'mundoParte':
        if (this.recibiendo && this.recibiendo.partes) {
          this.recibiendo.partes[d.i] = d.d; this.recibiendo.vistos++;
          c.interfaz.carga(true, this.recibiendo.vistos / this.recibiendo.total);
          if (this.recibiendo.vistos >= this.recibiendo.total) this.terminarRecepcion();
        }
        break;
      case 'pos': c.remotos.recibir(de, d); if (d.p) this.pos[de] = d.p; break;
      case 'bloqueReq': if (red.esAnfitrion) this.validarBloque(d, de); break;
      case 'bloque': c.ponerBloqueRemoto(d.x, d.y, d.z, d.id); break;
      case 'snap': if (!red.esAnfitrion) { c.animales.aplicarSnapshot(d.a || []); c.mobs.aplicarSnapshot(d.m || []); } break;
      case 'hora': if (!red.esAnfitrion) { c.hora = d.h; c.dias = d.d; } break;
      case 'golpe': if (red.esAnfitrion && d.d > 0 && d.d <= 25) c.aplicarGolpeRemoto(d.k, d.id, d.d, d.x, d.z); break;
      case 'botin': c.soltarBotin(d.x, d.y, d.z, d.l); break;
      case 'dano': c.herirJugador(d.n, d.dx, d.dz, d.causa, d.opc); break;
      case 'cofre': this.recibirCofre(d); break;
      default: break;
    }
  }

  // ---------------------------------------------------------- bloques
  alCambiarBloque(ev) {
    if (!this.activo || ev.origen === 'remoto' || !ev.registrar) return;
    const d = { x: ev.x, y: ev.y, z: ev.z, id: ev.id };
    if (R().esAnfitrion) R().difundir('bloque', d);
    else if (this.partidaEmpezada) R().enviar('bloqueReq', d);
  }

  validarBloque(d, de) {
    const p = this.pos[de];
    const ok = Number.isInteger(d.x) && Number.isInteger(d.y) && Number.isInteger(d.z) && d.y >= 0 && d.y < 128 && (d.id === 0 || esValido(d.id)) &&
      (!p || Math.hypot(d.x - p.x, d.y - p.y, d.z - p.z) < 14);
    if (ok) {
      this.c.ponerBloqueRemoto(d.x, d.y, d.z, d.id);
      R().difundir('bloque', d);
    } else R().enviar('bloque', { x: d.x, y: d.y, z: d.z, id: this.c.mundo.obtener(d.x, d.y, d.z) }, { a: de });
  }

  // ---------------------------------------------------------- bichos, botín, daño
  enviarGolpe(e, dano, x, z) {
    const k = this.c.animales.lista.includes(e) ? 'a' : 'm';
    R().enviar('golpe', { k, id: e.id, d: dano, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
  }

  difundirBotin(x, y, z, lista) { if (this.esAnfitrion) R().difundir('botin', { x: +x.toFixed(1), y: +y.toFixed(1), z: +z.toFixed(1), l: lista }); }

  enviarDano(id, n, dx, dz, causa, opc) { if (this.esAnfitrion) R().enviar('dano', { n, dx, dz, causa, opc }, { a: id }); }

  // ---------------------------------------------------------- cofres compartidos
  enviarCofre(clave, lista) {
    if (!this.activo) return;
    R().difundir('cofre', { k: clave, l: lista ? lista.map(ranuraAArr) : null });
  }

  recibirCofre(d) {
    const m = this.c.mundo;
    if (!d.l) { m.cofres.delete(d.k); return; }
    m.abiertos.add(d.k);
    m.cofres.set(d.k, d.l.map(arrARanura));
  }

  enviarChat(t) { R().chat(t); this.c.hud.chat(R().jugadores[R().miId].nombre, R().jugadores[R().miId].color, t); }

  // ---------------------------------------------------------- cada cuadro
  actualizar(dt) {
    if (!this.activo || !this.partidaEmpezada) return;
    const c = this.c, red = R();
    this.tPos -= dt;
    if (this.tPos <= 0 && c.estado !== 'titulo') {
      this.tPos = 0.06;
      const j = c.jugador;
      red.difundir('pos', { t: red.reloj(), p: red.compactar({ x: j.x, y: j.y, z: j.z, ry: j.yaw, pt: j.pitch }), sl: c.itemEnMano(), v: c.vehiculos.actual ? 1 : 0 }, { fiable: false });
    }
    if (red.esAnfitrion) {
      this.tSnap -= dt;
      if (this.tSnap <= 0) {
        this.tSnap = 0.1;
        red.difundir('snap', { a: c.animales.exportarSnapshot().slice(0, 40), m: c.mobs.exportarSnapshot().slice(0, 50) }, { fiable: false });
      }
      this.tHora -= dt;
      if (this.tHora <= 0) { this.tHora = 2; red.difundir('hora', { h: +c.hora.toFixed(4), d: c.dias }); }
    }
  }
}
