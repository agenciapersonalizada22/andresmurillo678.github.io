// =============================================================
//  🎮  CONTROLES
//  Compu:   clic para "atrapar" el ratón, mover el ratón para mirar,
//           WASD o flechas para caminar, Espacio saltar, Shift
//           correr (o bajar volando), W dos veces rápido = correr
//           (o volar rápido), F volar, E subir/bajar de vehículo (o bloques), I bloques, Esc pausa,
//           1-9 o la rueda para elegir bloque, F3 datos, M música.
//           (No usamos Ctrl: Ctrl+W cierra la pestaña del navegador.)
//  Mando (Xbox): ver leerMando(). Usa window.Mando (juego/comun/mando.js).
//  Celular: joystick a la izquierda para caminar, arrastrar el dedo
//           en el resto de la pantalla para mirar, tocar = poner,
//           dejar el dedo quieto = romper, y botones a la derecha.
// =============================================================
import { CONFIG } from './config.js';
import { MenuMando } from './menuMando.js';

const J = CONFIG.jugador;
const MOVIMIENTO = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight',
]);
const ADELANTE = ['KeyW', 'ArrowUp'];

export function detectarTactil() {
  try {
    if (/[?&]tactil=1/.test(location.search)) return true;
    if (/[?&]tactil=0/.test(location.search)) return false;
    const grueso = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const fino = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    return !!grueso || (('ontouchstart' in window) && !fino);
  } catch (e) {
    return false;
  }
}

export class Controles {
  constructor({ lienzo, capaTactil, alMirar, alAccion, alCambioBloqueo, puedeJugar, tactil, alPalanca, alEstadoMando }) {
    this.lienzo = lienzo;
    this.capa = capaTactil;
    this.alMirar = alMirar;
    this.alAccion = alAccion;
    this.alCambioBloqueo = alCambioBloqueo;
    this.alPalanca = alPalanca || (() => {});
    this.alEstadoMando = alEstadoMando || (() => {});
    this.puedeJugar = puedeJugar;
    this.tactil = !!tactil;
    // con ?tactil=1 o ?tactil=0 en la dirección el modo se queda fijo (para probar)
    this.modoFijo = /[?&]tactil=[01]/.test(location.search);

    this.entrada = { adelante: 0, derecha: 0, saltar: false, bajar: false, correr: false };
    this.mantener = { romper: false, poner: false };
    this.pulsos = { romper: false, poner: false };
    this.teclas = new Set();
    this.joy = { adelante: 0, derecha: 0, correr: false };
    this.botonSaltar = false;
    this.botonBajar = false;
    this.modoArrastre = false;
    this.erroresBloqueo = 0;
    this.arrastre = null;
    this.ultimoEspacio = 0;
    this.ultimoAdelante = 0;
    this.carrera = false;   // W dos veces rápido: corre (o vuela rápido) mientras la sigas apretando
    this.toques = new Map();
    this.joyId = null;

    // ---- mando
    this.usandoMando = false;        // el último control que usaste fue el mando
    this.mandoConectado = false;
    this.ajustesMando = { sens: 5, invertirY: false };   // los cambia el menú de pausa
    this.pad = { adelante: 0, derecha: 0, saltar: false, bajar: false, correr: false };
    this.padCarrera = false;         // L3: correr hasta soltar el stick
    this.padRomper = false;
    this.padPoner = false;
    this.padPalanca = false;
    this.padUltimoA = 0;
    this.padUltimoUso = -1e9;
    this.padMiraTiempo = 0;
    this.padEstadoPrevio = null;
    this.padEsperar = 0;             // cuadros que se ignoran al volver a la pestaña
    this.padIgnorar = new Set();     // botones que ya estaban apretados al cambiar de pantalla
    this.menuMando = new MenuMando();

    this.joystick = document.getElementById('joystick');
    this.palanca = document.getElementById('palanca');

    this.escucharTeclado();
    this.escucharRaton();
    this.escucharToques();
  }

  get bloqueado() {
    return document.pointerLockElement === this.lienzo;
  }

  // ----------------------------------------------------------- Ratón atrapado
  pedirBloqueo(forzar = false) {
    if (this.tactil) return;
    if (this.usandoMando && !forzar) return;   // con mando no hace falta atrapar el ratón
    const el = this.lienzo;
    if (!el.requestPointerLock) { this.modoArrastre = true; return; }
    try {
      const r = el.requestPointerLock();
      if (r && typeof r.catch === 'function') r.catch(() => { if (++this.erroresBloqueo >= 2) this.modoArrastre = true; });
    } catch (e) {
      this.modoArrastre = true;
    }
  }

  soltarBloqueo() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }

  soltarTodo() {
    this.teclas.clear();
    this.carrera = false;
    this.mantener.romper = this.mantener.poner = false;
    this.pulsos.romper = this.pulsos.poner = false;
    this.botonSaltar = this.botonBajar = false;
    this.joy.adelante = this.joy.derecha = 0;
    this.joy.correr = false;
    this.arrastre = null;
    this.soltarMando();
    for (const t of this.toques.values()) {
      if (t.temporizador) clearTimeout(t.temporizador);
      if (t.el) t.el.classList.remove('activo');
    }
    this.toques.clear();
    this.soltarJoystick();
  }

  // Suelta todo lo que venía del mando (desconexión, pestaña oculta, pausa…)
  soltarMando() {
    const p = this.pad;
    p.adelante = p.derecha = 0;
    p.saltar = p.bajar = p.correr = false;
    this.padCarrera = false;
    this.padRomper = this.padPoner = false;
    if (this.padPalanca) { this.alPalanca(0, 0, false); this.padPalanca = false; }
  }

  // Calcula la entrada de este cuadro (teclado + joystick + botones)
  actualizar(volando, enVehiculo = false) {
    const t = this.teclas;
    let ad = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0);
    let de = (t.has('KeyD') || t.has('ArrowRight') ? 1 : 0) - (t.has('KeyA') || t.has('ArrowLeft') ? 1 : 0);
    ad += this.joy.adelante + this.pad.adelante;
    de += this.joy.derecha + this.pad.derecha;
    this.entrada.adelante = Math.max(-1, Math.min(1, ad));
    this.entrada.derecha = Math.max(-1, Math.min(1, de));
    const shift = t.has('ShiftLeft') || t.has('ShiftRight');
    this.entrada.saltar = t.has('Space') || this.botonSaltar || this.pad.saltar;
    this.entrada.bajar = (volando && shift) || this.botonBajar || this.pad.bajar;
    this.entrada.correr = (this.carrera && !enVehiculo) || (!volando && shift) || this.joy.correr || this.pad.correr;
  }

  // ----------------------------------------------------------- Teclado
  escucharTeclado() {
    window.addEventListener('keydown', (e) => {
      this.usoTecladoRaton();
      if (e.ctrlKey || e.metaKey || e.altKey) return; // atajos del navegador (Ctrl+W, Alt+←…)
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const c = e.code;
      if (MOVIMIENTO.has(c)) {
        if (this.puedeJugar()) {
          e.preventDefault();
          // la hora del evento (no la de ahora) para que un cuadro lento no lo arruine
          const ahora = e.timeStamp || performance.now();
          if (c === 'Space' && !e.repeat && !this.teclas.has('Space') && J.dobleEspacioVuela) {
            if (ahora - this.ultimoEspacio < 300) {
              this.alAccion('volar');
              this.ultimoEspacio = 0;
            } else {
              this.ultimoEspacio = ahora;
            }
          }
          if (ADELANTE.includes(c) && !e.repeat && !ADELANTE.some((k) => this.teclas.has(k))) {
            if (ahora - this.ultimoAdelante < 300) {
              this.carrera = true;
              this.ultimoAdelante = 0;
            } else {
              this.ultimoAdelante = ahora;
            }
          }
          this.teclas.add(c);
        }
        return;
      }
      if (e.repeat) return;
      if (/^Digit[1-9]$/.test(c)) { this.alAccion('ranura', Number(c.slice(5)) - 1); return; }
      if (/^Numpad[1-9]$/.test(c)) { this.alAccion('ranura', Number(c.slice(6)) - 1); return; }
      switch (c) {
        case 'KeyF': this.alAccion('volar'); break;
        case 'KeyE': this.alAccion('teclaE'); break;
        case 'KeyI': this.alAccion('inventario'); break;
        case 'KeyC': this.alAccion('camara'); break;
        case 'KeyT': this.alAccion('repostar'); break;
        case 'KeyL': this.alAccion('luces'); break;
        case 'Escape': this.alAccion('pausa', 'esc'); break;
        case 'F3': case 'KeyG': e.preventDefault(); this.alAccion('depuracion'); break;
        case 'KeyM': this.alAccion('musica'); break;
        case 'KeyQ': this.alAccion('rueda', -1); break;
        case 'KeyR': this.alAccion('rueda', 1); break;
        default: break;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.teclas.delete(e.code);
      if (ADELANTE.includes(e.code) && !ADELANTE.some((k) => this.teclas.has(k))) this.carrera = false;
    });
    window.addEventListener('blur', () => this.soltarTodo());
    // pestaña oculta: se suelta todo y, al volver, se ignoran los botones que cambiaron mientras tanto
    document.addEventListener('visibilitychange', () => {
      this.soltarTodo();
      this.padEsperar = 3;
    });
  }

  // Un control "de verdad" de compu: el mando deja de ser el que manda
  usoTecladoRaton() {
    if (!this.usandoMando) return;
    if (performance.now() - this.padUltimoUso < 400) return;   // los dos a la vez: manda el mando
    this.usandoMando = false;
    this.alEstadoMando('fuente', false);
  }

  // ----------------------------------------------------------- Ratón
  escucharRaton() {
    const l = this.lienzo;
    document.addEventListener('pointerlockchange', () => {
      if (this.bloqueado) {
        this.modoArrastre = false;
        this.erroresBloqueo = 0;
        this.arrastre = null;
      }
      this.alCambioBloqueo(this.bloqueado);
    });
    document.addEventListener('pointerlockerror', () => {
      // un error suelto es normal (el navegador pide esperar un poco tras Esc); si se repite, se mira arrastrando
      if (++this.erroresBloqueo >= 2) this.modoArrastre = true;
    });

    l.addEventListener('contextmenu', (e) => e.preventDefault());
    l.addEventListener('mousedown', (e) => {
      this.usoTecladoRaton();
      if (this.tactil || !this.puedeJugar()) return;
      e.preventDefault();
      // este clic solo atrapa el ratón: no rompe ni pone nada
      if (!this.bloqueado && !this.modoArrastre) { this.pedirBloqueo(true); return; }
      if (this.bloqueado) {
        if (e.button === 0) { this.pulsos.romper = true; this.mantener.romper = true; }
        else if (e.button === 2) { this.pulsos.poner = true; this.mantener.poner = true; }
        else if (e.button === 1) this.alAccion('elegir');
      } else {
        this.arrastre = { x: e.clientX, y: e.clientY, boton: e.button, movido: 0 };
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (e.movementX || e.movementY) this.usoTecladoRaton();
      if (this.tactil) return;
      if (this.bloqueado) {
        if (!this.puedeJugar()) return;
        const dx = e.movementX || 0, dy = e.movementY || 0;
        if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return; // saltos raros de algunos navegadores
        this.alMirar(dx * J.sensibilidadRaton, dy * J.sensibilidadRaton);
      } else if (this.arrastre && this.puedeJugar()) {
        const dx = e.clientX - this.arrastre.x, dy = e.clientY - this.arrastre.y;
        this.arrastre.x = e.clientX;
        this.arrastre.y = e.clientY;
        this.arrastre.movido += Math.abs(dx) + Math.abs(dy);
        if (this.arrastre.movido > 4) this.alMirar(dx * J.sensibilidadRaton * 1.6, dy * J.sensibilidadRaton * 1.6);
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mantener.romper = false;
      if (e.button === 2) this.mantener.poner = false;
      if (this.arrastre) {
        if (this.arrastre.movido <= 4 && this.puedeJugar()) {
          if (this.arrastre.boton === 0) this.pulsos.romper = true;
          else if (this.arrastre.boton === 2) this.pulsos.poner = true;
          else if (this.arrastre.boton === 1) this.alAccion('elegir');
        }
        this.arrastre = null;
      }
    });
    l.addEventListener('wheel', (e) => {
      if (!this.puedeJugar()) return;
      e.preventDefault();
      if (e.deltaY) this.alAccion('rueda', e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }


  // ----------------------------------------------------------- Mando Xbox
  // Se llama una vez por cuadro. ctx: { estado, esperando, vehiculo: null | { clase } }
  // El mando alimenta las mismas acciones que el teclado, el ratón y el táctil.
  leerMando(dt, ctx) {
    const M = window.Mando;
    if (!M) return;
    M.leer();
    const ahora = performance.now();

    // conectado / desconectado
    if (M.conectado !== this.mandoConectado) {
      this.mandoConectado = M.conectado;
      this.soltarMando();
      this.padIgnorar.clear();
      this.alEstadoMando(M.conectado ? 'conectado' : 'desconectado', M.nombre);
      if (!M.conectado && this.usandoMando) { this.usandoMando = false; this.alEstadoMando('fuente', false); }
    }
    if (!M.conectado) return;

    // al volver a la pestaña no se disparan los botones que se movieron mientras estaba oculta
    if (this.padEsperar > 0) {
      this.padEsperar--;
      this.soltarMando();
      for (const n of ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VISTA', 'MENU', 'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQ', 'DER']) {
        if (M.sostenido(n)) this.padIgnorar.add(n);
      }
      return;
    }

    // ¿lo estás usando de verdad?
    let uso = Math.hypot(M.ejes.izq.x, M.ejes.izq.y, M.ejes.der.x, M.ejes.der.y) > 0.3 || M.gatillo.izq > 0.3 || M.gatillo.der > 0.3;
    for (const n of ['A', 'B', 'X', 'Y', 'LB', 'RB', 'VISTA', 'MENU', 'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQ', 'DER']) if (M.sostenido(n)) uso = true;
    if (uso) {
      this.padUltimoUso = ahora;
      if (!this.usandoMando) {
        this.usandoMando = true;
        this.alEstadoMando('fuente', true);
      }
    }

    // cuando cambia la pantalla (menú <-> juego) lo que ya estaba apretado no cuenta hasta soltarlo
    const jugando = ctx.estado === 'jugando' && !ctx.esperando;
    const clave = jugando ? 'juego' : this.menuMando.pantallaAbierta() ? 'menu:' + this.menuMando.pantallaAbierta().id : 'otro';
    if (clave !== this.padEstadoPrevio) {
      if (this.padEstadoPrevio !== null) {
        for (const n of ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VISTA', 'MENU', 'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQ', 'DER']) {
          if (M.sostenido(n)) this.padIgnorar.add(n);
        }
        this.soltarMando();
      }
      this.padEstadoPrevio = clave;
    }
    for (const n of [...this.padIgnorar]) if (!M.sostenido(n)) this.padIgnorar.delete(n);
    const ign = this.padIgnorar;
    const pul = (n) => M.pulsado(n) && !ign.has(n);
    const sost = (n) => M.sostenido(n) && !ign.has(n);

    if (!jugando) {
      this.soltarMando();
      if (ctx.estado === 'titulo' || ctx.estado === 'pausa' || ctx.estado === 'inventario') {
        this.menuMando.actualizar(M, dt, ign, {
          cancelar: (id) => {
            if (id === 'pantallaPausa') this.alAccion('pausa', 'esc');
            else if (id === 'pantallaInventario') this.alAccion('inventario');
            else if (id === 'pantallaTitulo') {
              const panel = document.getElementById('panelNuevo');
              if (panel && !panel.classList.contains('oculto')) panel.classList.add('oculto');
            }
          },
          cerrar: (id) => {
            if (id === 'pantallaPausa') this.alAccion('pausa', 'esc');
            else if (id === 'pantallaInventario') this.alAccion('inventario');
          },
          pestana: (d) => this.alAccion('pestana', d),
          ranura: (d) => this.alAccion('ranuraRel', d),
        });
      }
      return;
    }

    // ---- jugando
    this.menuMando.quitarFoco();
    const veh = ctx.vehiculo;
    const aire = !!veh && veh.clase === 'aire';
    const izq = M.ejes.izq, der = M.ejes.der;
    const rt = ign.has('RT') ? 0 : M.gatillo.der, lt = ign.has('LT') ? 0 : M.gatillo.izq;
    const p = this.pad;
    const aj = this.ajustesMando;

    if (pul('MENU')) { this.alAccion('pausa'); return; }

    if (veh) {
      // vehículo: stick izq. dirige, RT acelera, LT frena / reversa
      const gatillos = rt - lt;
      p.adelante = aire ? gatillos : (Math.abs(gatillos) > 0.02 ? gatillos : -izq.y);
      p.derecha = aire ? 0 : izq.x;
      p.saltar = sost('B');           // freno de mano (en la avioneta: más motor)
      p.bajar = false;
      p.correr = sost('L3');          // turbo
      this.padCarrera = false;
      if (aire) {
        // palanca: atrás = nariz arriba (como en un avión); "invertir Y" lo cambia
        const sy = aj.invertirY ? izq.y : -izq.y;
        const activa = Math.abs(izq.x) + Math.abs(izq.y) > 0;
        if (activa || this.padPalanca) this.alPalanca(izq.x, sy, true);
        this.padPalanca = activa;
      } else if (this.padPalanca) { this.alPalanca(0, 0, false); this.padPalanca = false; }
      if (pul('A')) this.alAccion('vehiculo');
      if (pul('X')) this.alAccion('luces');
      if (pul('Y')) this.alAccion('repostar');
      if (pul('R3') || pul('VISTA')) this.alAccion('camara');
      this.padRomper = this.padPoner = false;
      this.mantener.romper = this.mantener.poner = false;
    } else {
      if (this.padPalanca) { this.alPalanca(0, 0, false); this.padPalanca = false; }
      p.adelante = -izq.y;
      p.derecha = izq.x;
      // A: saltar (dos toques = volar); B: bajar al volar
      p.saltar = sost('A');
      p.bajar = sost('B');
      if (pul('A') && J.dobleEspacioVuela) {
        if (ahora - this.padUltimoA < 300) { this.alAccion('volar'); this.padUltimoA = 0; }
        else this.padUltimoA = ahora;
      }
      // L3: correr hasta que sueltes el stick
      if (pul('L3')) this.padCarrera = !this.padCarrera;
      if (Math.hypot(izq.x, izq.y) < 0.12 || izq.y > 0.2) this.padCarrera = false;
      p.correr = this.padCarrera;
      // RT romper (mantener), LT poner (mantener)
      if (M.pulsado('RT') && !ign.has('RT')) { this.pulsos.romper = true; this.mantener.romper = true; this.padRomper = true; }
      if (M.soltado('RT') || (this.padRomper && rt < 0.3)) { if (this.padRomper) this.mantener.romper = false; this.padRomper = false; }
      if (M.pulsado('LT') && !ign.has('LT')) { this.pulsos.poner = true; this.mantener.poner = true; this.padPoner = true; }
      if (M.soltado('LT') || (this.padPoner && lt < 0.3)) { if (this.padPoner) this.mantener.poner = false; this.padPoner = false; }
      if (pul('Y')) this.alAccion('usar');
      if (pul('X')) this.alAccion('inventario');
      if (pul('LB')) this.alAccion('rueda', -1);
      if (pul('RB')) this.alAccion('rueda', 1);
      if (pul('ARRIBA')) this.alAccion('rueda', -1);
      if (pul('ABAJO')) this.alAccion('rueda', 1);
      if (pul('IZQ')) this.alAccion('elegir');
      if (pul('DER')) this.alAccion('volar');
      if (pul('VISTA')) this.alAccion('depuracion');
    }

    // stick derecho: mirar, con curva suave (poco movimiento = fino, a fondo = rápido y acelera)
    if (!aire) {
      const m = Math.hypot(der.x, der.y);
      if (m > 0) {
        this.padMiraTiempo = Math.min(1.2, this.padMiraTiempo + dt);
        const sens = Math.pow(1.22, aj.sens - 5);
        const curva = Math.pow(m, 1.8);
        const impulso = 1 + 0.55 * Math.min(1, Math.max(0, this.padMiraTiempo - 0.25)) * (m > 0.85 ? 1 : 0);
        const rapidez = 3.1 * sens * impulso * curva / m;     // radianes por segundo
        const dy = der.y * (aj.invertirY ? -1 : 1);
        this.alMirar(der.x * rapidez * dt, dy * rapidez * dt);
      } else this.padMiraTiempo = 0;
    }
  }

  // ----------------------------------------------------------- Pantalla táctil
  escucharToques() {
    const c = this.capa;
    c.addEventListener('touchstart', (e) => this.toqueInicio(e), { passive: false });
    c.addEventListener('touchmove', (e) => this.toqueMovimiento(e), { passive: false });
    c.addEventListener('touchend', (e) => this.toqueFin(e), { passive: false });
    c.addEventListener('touchcancel', (e) => this.toqueFin(e), { passive: false });
    // Compu con pantalla táctil: si tocas la pantalla salen los botones táctiles,
    // y si vuelves a usar el ratón (de verdad, no un toque) regresa el modo ratón.
    window.addEventListener('touchstart', () => { this.usoTecladoRaton(); this.cambiarModo(true); }, { passive: true });
    const ratonDeVerdad = (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.type === 'pointermove' && !e.movementX && !e.movementY) return;
      this.cambiarModo(false);
    };
    window.addEventListener('pointerdown', ratonDeVerdad, { capture: true, passive: true });
    window.addEventListener('pointermove', ratonDeVerdad, { capture: true, passive: true });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  cambiarModo(tactil) {
    if (this.tactil === tactil || this.modoFijo) return;
    this.tactil = tactil;
    // se sueltan los dedos y botones táctiles que hubiera (las teclas no)
    this.mantener.romper = this.mantener.poner = false;
    this.botonSaltar = this.botonBajar = false;
    for (const t of this.toques.values()) {
      if (t.temporizador) clearTimeout(t.temporizador);
      if (t.el) t.el.classList.remove('activo');
    }
    this.toques.clear();
    this.soltarJoystick();
    this.arrastre = null;
    this.alAccion('modoTactil', tactil);
  }

  botonAbajo(accion) {
    switch (accion) {
      case 'saltar': this.botonSaltar = true; break;
      case 'bajar': this.botonBajar = true; break;
      case 'romper': this.pulsos.romper = true; this.mantener.romper = true; break;
      case 'poner': this.pulsos.poner = true; this.mantener.poner = true; break;
      default: this.alAccion(accion); break;
    }
  }

  botonArriba(accion) {
    switch (accion) {
      case 'saltar': this.botonSaltar = false; break;
      case 'bajar': this.botonBajar = false; break;
      case 'romper': this.mantener.romper = false; break;
      case 'poner': this.mantener.poner = false; break;
      default: break;
    }
  }

  toqueInicio(e) {
    e.preventDefault();
    const ancho = window.innerWidth, alto = window.innerHeight;
    for (const t of e.changedTouches) {
      const el = t.target && t.target.closest ? t.target.closest('[data-accion]') : null;
      if (el) {
        const accion = el.dataset.accion;
        el.classList.add('activo');
        this.toques.set(t.identifier, { tipo: 'boton', accion, el });
        this.botonAbajo(accion);
        continue;
      }
      if (!this.puedeJugar()) continue;
      if (this.joyId === null && t.clientX < ancho * 0.42 && t.clientY > alto * 0.3) {
        this.joyId = t.identifier;
        this.toques.set(t.identifier, { tipo: 'joy', x0: t.clientX, y0: t.clientY });
        this.joystick.classList.add('activo');
        this.joystick.style.left = t.clientX + 'px';
        this.joystick.style.top = t.clientY + 'px';
        this.palanca.style.transform = 'translate(-50%, -50%)';
        continue;
      }
      const toque = { tipo: 'mirar', x: t.clientX, y: t.clientY, t0: performance.now(), movido: 0, mantenido: false };
      toque.temporizador = setTimeout(() => {
        if (this.toques.get(t.identifier) === toque && toque.movido < 14 && this.puedeJugar()) {
          toque.mantenido = true;
          this.pulsos.romper = true;
          this.mantener.romper = true;
        }
      }, 380);
      this.toques.set(t.identifier, toque);
    }
  }

  toqueMovimiento(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const toque = this.toques.get(t.identifier);
      if (!toque) continue;
      if (toque.tipo === 'joy') {
        const R = 52;
        let dx = t.clientX - toque.x0, dy = t.clientY - toque.y0;
        const d = Math.hypot(dx, dy);
        this.joy.correr = d > R * 1.35;
        if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
        this.joy.derecha = dx / R;
        this.joy.adelante = -dy / R;
        // zona muerta pequeñita
        if (Math.abs(this.joy.derecha) < 0.12) this.joy.derecha = 0;
        if (Math.abs(this.joy.adelante) < 0.12) this.joy.adelante = 0;
        this.palanca.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (toque.tipo === 'mirar') {
        const dx = t.clientX - toque.x, dy = t.clientY - toque.y;
        toque.x = t.clientX;
        toque.y = t.clientY;
        toque.movido += Math.abs(dx) + Math.abs(dy);
        if (this.puedeJugar()) this.alMirar(dx * J.sensibilidadTactil, dy * J.sensibilidadTactil);
      }
    }
  }

  toqueFin(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const toque = this.toques.get(t.identifier);
      if (!toque) continue;
      this.toques.delete(t.identifier);
      if (toque.tipo === 'boton') {
        toque.el.classList.remove('activo');
        this.botonArriba(toque.accion);
      } else if (toque.tipo === 'joy') {
        this.joyId = null;
        this.soltarJoystick();
      } else {
        clearTimeout(toque.temporizador);
        if (toque.mantenido) this.mantener.romper = false;
        else if (e.type === 'touchend' && toque.movido < 14 && performance.now() - toque.t0 < 300 && this.puedeJugar()) {
          this.pulsos.poner = true;
        }
      }
    }
  }

  soltarJoystick() {
    this.joyId = null;
    this.joy.adelante = this.joy.derecha = 0;
    this.joy.correr = false;
    if (this.joystick) {
      this.joystick.classList.remove('activo');
      this.joystick.style.left = '';
      this.joystick.style.top = '';
    }
    if (this.palanca) this.palanca.style.transform = 'translate(-50%, -50%)';
  }
}
