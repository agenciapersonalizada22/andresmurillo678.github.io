// =============================================================
//  🌆  EL JUEGO: une todo. Cámara, tráfico, peatones, policía,
//  estrellas de "buscado", día y noche, pantallas y guardado.
// =============================================================

// "J" es todo lo que está pasando en la partida.
const J = {
  modo: 'titulo',          // titulo | jugando | pausa | mapa | atrapado | tienda
  tiempo: 0,
  carros: [],
  peatones: [],
  jugador: null,
  cam: { x: 0, y: 0, zoom: 1, sacudida: 0 },
  camDibujo: { x: 0, y: 0, s: 1, W: 1, H: 1 },
  vista: { x0: 0, y0: 0, x1: 1, y1: 1 },
  escala: 1,
  W: 1, H: 1, dpr: 1,
  dinero: Util.cargar('dinero', CONFIG.dinero.inicial),
  mostrarDinero: 0,
  efectoDinero: 0,
  deltaDinero: null,
  stats: Util.cargar('stats', {}),
  buscado: { calor: 0, estrellas: 0, sinVer: 0, atrapar: 0 },
  hora: CONFIG.dia.horaInicio,
  noche: 0,
  aviso: null,
  pistaInfo: null,
  radioAviso: 0,
  ultimoCarro: null,
  carroCerca: null,
  multa: 0,
  relojAtrapado: 0,
  lluvia: 0,               // 0 = cielo despejado, 1 = lluvia fuerte
  lluviaObj: 0,
  climaReloj: 35,
  waypoint: null,          // destino marcado en el mapa
};
if (typeof J.dinero !== 'number' || !isFinite(J.dinero)) J.dinero = CONFIG.dinero.inicial;
if (!J.stats || typeof J.stats !== 'object') J.stats = {};
J.mostrarDinero = J.dinero;

(() => {
  'use strict';

  const lienzo = document.getElementById('lienzo');
  const g = lienzo.getContext('2d');
  const T = Mundo.T;

  // ----------------------------------------------------------- Pantalla
  // Zonas seguras (muesca y esquinas redondas de algunos celulares).
  // Un div invisible con padding: env(safe-area-inset-*) nos dice cuánto miden.
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
  document.body.appendChild(sonda);
  J.seguro = { t: 0, r: 0, b: 0, l: 0 };
  function medirZonaSegura() {
    try {
      const cs = getComputedStyle(sonda);
      const n = (v) => parseFloat(v) || 0;
      J.seguro = { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
    } catch (e) {
      J.seguro = { t: 0, r: 0, b: 0, l: 0 };
    }
  }

  function redimensionar() {
    medirZonaSegura();
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.pantalla.resolucionMax);
    const w = window.innerWidth, h = window.innerHeight;
    lienzo.style.width = w + 'px';
    lienzo.style.height = h + 'px';
    lienzo.width = Math.max(1, Math.floor(w * dpr));
    lienzo.height = Math.max(1, Math.floor(h * dpr));
    J.W = w;
    J.H = h;
    J.dpr = lienzo.width / w;
  }
  window.addEventListener('resize', redimensionar);
  window.addEventListener('orientationchange', () => setTimeout(redimensionar, 200));
  redimensionar();
  Entrada.configurar();
  try { document.fonts.load('800 20px Orbitron'); } catch (e) { /* sin fuentes web */ }

  ['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) =>
    window.addEventListener(ev, () => { Sonido.iniciar(); Radio.revisar(); }, { passive: true }));

  lienzo.addEventListener('pointerdown', (e) => Entrada.agregarToque(e.clientX, e.clientY));

  // ----------------------------------------------------------- Ayudas que usan los demás archivos
  J.cercaDeCamara = (x, y, r) => Math.hypot(x - J.cam.x, y - J.cam.y) < r;
  J.distanciaACamara = (x, y) => Math.hypot(x - J.cam.x, y - J.cam.y);
  J.sacudir = (f) => { if (CONFIG.efectos.sacudida) J.cam.sacudida = Math.max(J.cam.sacudida, f); };
  J.aPantalla = (x, y) => ({
    x: ((x - J.camDibujo.x) * J.camDibujo.s + J.camDibujo.W / 2) / J.dpr,
    y: ((y - J.camDibujo.y) * J.camDibujo.s + J.camDibujo.H / 2) / J.dpr,
  });
  J.avisar = (titulo, sub, color, dur) => { J.aviso = { titulo, sub, color: color || '#fff', t: 0, dur: dur || 2.8 }; };
  J.pista = (texto) => { J.pistaInfo = { texto, t: 2.6 }; };
  J.ganar = (n) => {
    J.dinero += n;
    J.deltaDinero = { v: n, t: 2 };
    J.efectoDinero = 1;
    Sonido.dinero();
    J.guardarPartida();
  };
  J.gastar = (n) => {
    J.dinero = Math.max(0, J.dinero - n);
    J.deltaDinero = { v: -n, t: 2 };
    J.guardarPartida();
  };
  J.guardarPartida = () => {
    Util.guardar('dinero', Math.round(J.dinero));
    Util.guardar('stats', J.stats);
  };

  function visible(x, y, margen) {
    const v = J.vista;
    return x > v.x0 - margen && x < v.x1 + margen && y > v.y0 - margen && y < v.y1 + margen;
  }

  function libre(x, y, r) {
    for (const c of J.carros) if (Math.abs(c.x - x) < r && Math.abs(c.y - y) < r) return false;
    return true;
  }

  // ----------------------------------------------------------- Estrellas de buscado
  function actualizarEstrellas() {
    const b = J.buscado;
    b.calor = Util.limitar(b.calor, 0, 5);
    const antes = b.estrellas;
    b.estrellas = Math.max(0, Math.min(5, Math.ceil(b.calor - 0.001)));
    if (b.estrellas > antes) {
      Sonido.estrella();
      if (antes === 0) J.pista('¡La policía te busca! Escóndete o ve al taller (R)');
      J.stats.maxEstrellas = Math.max(J.stats.maxEstrellas || 0, b.estrellas);
    }
  }

  function testigoPolicia(x, y) {
    const r = CONFIG.policia.vision * 0.75;
    return J.carros.some((c) => c.esPolicia && c.conductor === 'ia' && !c.averiado && Math.hypot(c.x - x, c.y - y) < r);
  }

  J.delito = (tipo, x, y) => {
    const B = CONFIG.buscado;
    let cantidad = B[tipo] || 0;
    const testigo = testigoPolicia(x, y);
    if (tipo === 'atropello' && testigo) cantidad = B.atropelloVisto;
    if (tipo === 'robo' || tipo === 'disparo') {
      if (!testigo) return;
      cantidad = tipo === 'robo' ? B.robarVisto : B.disparo;
    }
    if (!cantidad) return;
    J.buscado.calor += cantidad;
    if (testigo) J.buscado.sinVer = 0;
    actualizarEstrellas();
  };

  J.limpiarBuscado = (inmediato) => {
    const b = J.buscado;
    b.calor = 0; b.estrellas = 0; b.sinVer = 0; b.atrapar = 0;
    for (let k = J.carros.length - 1; k >= 0; k--) {
      const c = J.carros[k];
      if (!(c.ia instanceof IAPolicia)) continue;
      if (inmediato) J.carros.splice(k, 1);
      else c.ia.retirarse();
    }
  };

  J.alChocarCarros = (a, b, fuerza) => {
    const jc = J.jugador && J.jugador.carro;
    if (!jc || (a !== jc && b !== jc) || fuerza < 120) return;
    const otro = a === jc ? b : a;
    // ¿Quién chocó a quién? Solo cuenta si tú ibas hacia el otro carro
    const dx = otro.x - jc.x, dy = otro.y - jc.y;
    const d = Math.hypot(dx, dy) || 1;
    const tuyo = (jc.vx * dx + jc.vy * dy) / d;
    const suyo = -(otro.vx * dx + otro.vy * dy) / d;
    if (tuyo < 100 || tuyo < suyo) return;
    if (otro.esPolicia && otro.conductor === 'ia') {
      if (J.tiempo - (J.ultimoChoquePolicia || -9) > 1.5) {
        J.ultimoChoquePolicia = J.tiempo;
        J.delito('chocarPolicia', otro.x, otro.y);
        if (!(otro.ia instanceof IAPolicia)) otro.ia = new IAPolicia(otro);
        else if (J.buscado.estrellas > 0) otro.ia.reanudar();
      }
    } else if (otro.conductor === 'ia' && fuerza > 170) {
      J.delito('choqueCivil', otro.x, otro.y);
      if (Math.random() < 0.5) Efectos.texto(otro.x, otro.y - 30, Util.elegir(['¡Oye!', '¡Mi carro!', '¡Fíjate!', '¡Ay, no!']), '#ffffff', 14);
      Sonido.pitoLejano(otro.x, otro.y);
    }
  };

  // ----------------------------------------------------------- Población
  function crearTrafico(foco, puedeVerse) {
    const c = Mundo.carrilAzar(foco.x, foco.y, puedeVerse ? 120 : 650, 1350,
      (q) => (puedeVerse || !visible(q.x, q.y, 90)) && libre(q.x, q.y, 120) &&
        Math.hypot(q.x - J.jugador.x, q.y - J.jugador.y) > 90);
    if (!c) return;
    const tipo = Math.random() < CONFIG.trafico.probPolicia ? 'policia' : Util.elegirPorPeso(CONFIG.trafico.mezcla);
    const car = new Carro(tipo, c.x, c.y, c.dir * Math.PI / 2, { conductor: 'ia' });
    car.ia = new IATrafico(car, c);
    if (tipo === 'ambulancia') car.sirena = Math.random() < 0.4;
    const v = car.ia.velBase * 0.7;
    car.vx = Math.cos(car.ang) * v;
    car.vy = Math.sin(car.ang) * v;
    J.carros.push(car);
  }

  function crearPatrulla(foco) {
    const filtroBase = (q) => !visible(q.x, q.y, 90) && libre(q.x, q.y, 120);
    const haciaTi = (q) => filtroBase(q) && ((foco.x - q.x) * DIRS[q.dir][0] + (foco.y - q.y) * DIRS[q.dir][1]) > 0;
    const c = Mundo.carrilAzar(foco.x, foco.y, 650, 1150, haciaTi) || Mundo.carrilAzar(foco.x, foco.y, 650, 1200, filtroBase);
    if (!c) return;
    const car = new Carro('policia', c.x, c.y, c.dir * Math.PI / 2, { conductor: 'ia' });
    car.ia = new IAPolicia(car);
    car.vx = Math.cos(car.ang) * 220;
    car.vy = Math.sin(car.ang) * 220;
    J.carros.push(car);
  }

  function crearPeaton(foco, puedeVerse) {
    const p = Mundo.aceraAzar(foco.x, foco.y, puedeVerse ? 80 : 420, 1000,
      (q) => puedeVerse || !visible(q.x, q.y, 40));
    if (p) J.peatones.push(new Peaton(p.tx, p.ty));
  }

  function gestionarEstacionados(foco, inicial) {
    let n = 0;
    for (const c of J.carros) if (c.estacionado) n++;
    let creados = 0;
    for (const e of Mundo.espacios) {
      const d = Math.hypot(e.x - foco.x, e.y - foco.y);
      if (d > 1400 && e.decidido && !e.carro) e.decidido = false;
      if (n >= CONFIG.trafico.estacionados || creados >= 2) continue;
      if (e.carro || e.decidido || d > 1100) continue;
      if (!inicial && visible(e.x, e.y, 60)) continue;
      e.decidido = true;
      const prob = e.tipo === 'deportivo' ? 1 : e.tipo === 'policia' ? 0.4 : e.tipo === 'taxi' ? 0.7 : 0.45;
      if (Math.random() > prob || !libre(e.x, e.y, 46)) continue;
      const tipo = e.tipo || Util.elegirPorPeso({ compacto: 5, camioneta: 2, deportivo: 1, moto: 2 });
      const car = new Carro(tipo, e.x, e.y, e.ang, { estacionado: true, espacio: e });
      e.carro = car;
      J.carros.push(car);
      n++;
      if (!inicial) creados++;
    }
  }

  function quitarCarro(k) {
    const c = J.carros[k];
    if (c.espacio) { c.espacio.carro = null; c.espacio.decidido = false; }
    J.carros.splice(k, 1);
  }

  function enfoque() {
    if (J.modo === 'titulo') return J.cam;
    const j = J.jugador;
    return j.carro || j;
  }

  let relojPoblacion = 0;
  function gestionarPoblacion(dt) {
    relojPoblacion -= dt;
    if (relojPoblacion > 0) return;
    relojPoblacion = 0.25;
    const foco = enfoque();
    for (let k = J.carros.length - 1; k >= 0; k--) {
      const c = J.carros[k];
      if (c.conductor === 'jugador' || c === J.camSigue) continue;
      const d = Math.hypot(c.x - foco.x, c.y - foco.y);
      const ve = visible(c.x, c.y, 120);
      if (c === J.ultimoCarro && d < 2500) continue;
      const policia = c.ia instanceof IAPolicia;
      let limite = c.estacionado ? 1450 : 1550;
      if (policia) limite = c.ia.modo === 'retirada' ? 800 : 2200;
      if (c.averiado) limite = Math.min(limite, 1000);
      if ((d > limite && !ve) || (c.ia && c.ia.perdido > 6 && !ve)) quitarCarro(k);
    }
    for (let k = J.peatones.length - 1; k >= 0; k--) {
      const p = J.peatones[k];
      if (p.mision) continue;
      const d = Math.hypot(p.x - foco.x, p.y - foco.y);
      if (d > 1200 && !visible(p.x, p.y, 60)) J.peatones.splice(k, 1);
    }
    let trafico = 0;
    for (const c of J.carros) if (c.ia instanceof IATrafico && c.conductor === 'ia') trafico++;
    if (trafico < CONFIG.trafico.cantidad) crearTrafico(foco, false);
    let gente = 0;
    for (const p of J.peatones) if (!p.mision) gente++;
    if (gente < CONFIG.peatones.cantidad) { crearPeaton(foco, false); crearPeaton(foco, false); }
    gestionarEstacionados(foco, false);
  }

  function poblarInicial() {
    const foco = enfoque();
    for (let k = 0; k < CONFIG.trafico.cantidad; k++) crearTrafico(foco, true);
    for (let k = 0; k < CONFIG.peatones.cantidad; k++) crearPeaton(foco, true);
    gestionarEstacionados(foco, true);
  }

  function vaciarCiudad() {
    J.carros.length = 0;
    J.peatones.length = 0;
    for (const e of Mundo.espacios) { e.carro = null; e.decidido = false; }
    Efectos.limpiar();
  }

  // ----------------------------------------------------------- Policía
  let relojPolicia = 0;
  function gestionarPolicia(dt) {
    const b = J.buscado;
    const j = J.jugador;
    const p = j.carro || j;
    const P = CONFIG.policia;
    relojPolicia -= dt;
    let persiguiendo = 0;
    let visto = false;
    let sirenaCerca = Infinity;
    for (const c of J.carros) {
      if (!c.esPolicia || c.conductor !== 'ia' || c.averiado) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (c.ia instanceof IAPolicia) {
        if (c.ia.modo === 'retirada' && b.estrellas > 0 && d < P.vision * 0.8) c.ia.reanudar();
        if (c.ia.modo === 'perseguir') {
          persiguiendo++;
          if (c.ia.ve) visto = true;
          if (c.sirena) sirenaCerca = Math.min(sirenaCerca, d);
        }
      } else if (b.estrellas > 0 && d < P.vision * 0.8) {
        c.ia = new IAPolicia(c);
        persiguiendo++;
      }
    }
    Sonido.actualizarSirena(sirenaCerca < 1000 ? (1 - sirenaCerca / 1000) * (0.4 + b.estrellas * 0.12) : 0);

    if (b.estrellas > 0) {
      if (visto) b.sinVer = 0; else b.sinVer += dt;
      const olvido = P.tiempoOlvido + b.estrellas * 2;
      if (b.sinVer > olvido) {
        b.calor = b.estrellas - 1;
        b.sinVer = 0;
        actualizarEstrellas();
        if (b.estrellas === 0) {
          J.avisar('¡ESCAPASTE!', 'La policía te perdió la pista', '#7dff6b');
          for (const c of J.carros) if (c.ia instanceof IAPolicia) c.ia.retirarse();
        } else {
          J.pista('La policía te está perdiendo la pista...');
        }
      }
      const quiere = P.porEstrella[b.estrellas] || 0;
      if (persiguiendo < quiere && relojPolicia <= 0) {
        relojPolicia = 1.4;
        crearPatrulla(p);
      }
      revisarAtrapado(dt);
    } else {
      b.sinVer = 0;
      b.atrapar = 0;
      for (const c of J.carros) if (c.ia instanceof IAPolicia && c.ia.modo === 'perseguir') c.ia.retirarse();
    }
  }

  function revisarAtrapado(dt) {
    const b = J.buscado;
    const j = J.jugador;
    const p = j.carro || j;
    const quieto = !j.carro || j.carro.velocidad < 45 || j.carro.averiado;
    let cerca = false;
    for (const c of J.carros) {
      if (!(c.ia instanceof IAPolicia) || c.ia.modo !== 'perseguir' || c.averiado) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < CONFIG.policia.distanciaAtrapar && c.velocidad < 230) { cerca = true; break; }
    }
    if (quieto && cerca) b.atrapar += dt;
    else b.atrapar = Math.max(0, b.atrapar - dt * 1.5);
    if (b.atrapar >= CONFIG.policia.tiempoAtrapar) atrapar();
  }

  function atrapar() {
    const P = CONFIG.policia;
    J.modo = 'atrapado';
    J.relojAtrapado = 3.4;
    const jc = J.jugador.carro;
    if (jc) { jc.mando.gas = 0; jc.mando.giro = 0; jc.mando.freno = true; }
    J.multa = Math.min(J.dinero, Math.max(P.multaMin, Math.round(J.dinero * P.multa)));
    J.dinero -= J.multa;
    J.stats.atrapado = (J.stats.atrapado || 0) + 1;
    Misiones.alSerAtrapado();
    J.aviso = null;
    Sonido.atrapado();
    Sonido.callarContinuos();
    Radio.apagar();
    J.guardarPartida();
  }

  function reaparecer() {
    const j = J.jugador;
    if (j.carro) {
      j.carro.conductor = null;
      j.carro = null;
    }
    const pc = Mundo.lugares.comisaria;
    j.x = pc.x; j.y = pc.y; j.vx = 0; j.vy = 0; j.caido = 0;
    j.ang = -Math.PI / 2;
    J.limpiarBuscado(true);
    J.cam.x = j.x; J.cam.y = j.y;
    prepararVista();
    Mundo.precargar(j.x, j.y, 900);
    J.modo = 'jugando';
    J.avisar('COMISARÍA', `Pagaste una multa de ${Util.dinero(J.multa)}`, '#5c8dff');
  }

  // ----------------------------------------------------------- Subir y bajar
  function buscarCarroCerca() {
    const j = J.jugador;
    let mejor = null, dm = CONFIG.jugador.distanciaSubir;
    for (const c of J.carros) {
      if (c.conductor === 'jugador') continue;
      const d = Math.hypot(c.x - j.x, c.y - j.y) - c.ancho / 2;
      if (d < dm) { dm = d; mejor = c; }
    }
    return mejor;
  }

  function subirOBajar() {
    const j = J.jugador;
    if (j.caido > 0) return;
    if (j.carro) {
      const c = j.carro;
      if (c.velocidad > CONFIG.jugador.velocidadBajar) { J.pista('¡Frena para bajarte!'); return; }
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const lados = [[fy, -fx, c.ancho / 2 + 13], [-fy, fx, c.ancho / 2 + 13], [-fx, -fy, c.largo / 2 + 13], [fx, fy, c.largo / 2 + 13]];
      let salio = false;
      for (const [ox, oy, d] of lados) {
        const x = c.x + ox * d, y = c.y + oy * d;
        if (!Mundo.solidoCasilla(Math.floor(x / T), Math.floor(y / T))) { j.x = x; j.y = y; salio = true; break; }
      }
      if (!salio) { j.x = c.x; j.y = c.y; }
      j.ang = c.ang;
      c.conductor = null;
      c.mando.gas = 0;
      c.mando.freno = true;
      j.carro = null;
      J.ultimoCarro = c;
      Radio.apagar();
      Sonido.puerta();
      Sonido.actualizarMotor(false, 0, 0);
      Sonido.actualizarClaxon(false);
      return;
    }
    const c = buscarCarroCerca();
    if (!c) { J.pista('No hay ningún carro cerca'); return; }
    if (c.conductor === 'ia') {
      if (c.velocidad > 160) { J.pista('¡Ese carro va muy rápido!'); return; }
      // El conductor se baja asustado (sin violencia: solo sale corriendo)
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const px = c.x + fy * (c.ancho / 2 + 14), py = c.y - fx * (c.ancho / 2 + 14);
      const ped = new Peaton(Math.floor(px / T), Math.floor(py / T));
      ped.x = px; ped.y = py;
      ped.asustar(j.x, j.y);
      J.peatones.push(ped);
      Efectos.texto(px, py - 24, Util.elegir(['¡Mi carro!', '¡Oiga!', '¡Ey, es mío!']), '#ffffff', 14);
      if (c.esPolicia) J.delito('robarPatrulla', c.x, c.y);
      else J.delito('robo', c.x, c.y);
      c.ia = null;
      J.stats.carrosTomados = (J.stats.carrosTomados || 0) + 1;
    } else if (c.esPolicia) {
      J.delito('robarPatrulla', c.x, c.y);
    }
    if (c.espacio) { c.espacio.carro = null; c.espacio = null; }
    c.estacionado = false;
    c.conductor = 'jugador';
    c.sirena = false;
    c.multVel = 1;
    j.carro = c;
    j.vx = 0; j.vy = 0;
    Sonido.puerta();
    Radio.encender();
    J.radioAviso = 2.5;
    if (c.averiado) J.pista('Este carro está averiado. Busca otro.');
  }

  function cambiarRadio() {
    const est = Radio.siguiente();
    J.radioAviso = 2.5;
    if (!J.jugador.carro) J.pista(est ? `Radio: ${est.nombre} (suena en el carro)` : 'Radio apagado');
    else J.pista(est ? `♪ ${est.nombre} · ${est.frecuencia}` : 'Radio apagado');
  }

  // ----------------------------------------------------------- Controles del jugador
  let relojClaxon = 0;
  function controlarJugador(dt) {
    const j = J.jugador;
    const tecl = Entrada.teclado();
    const joy = Entrada.joystick();
    if (j.carro) {
      const c = j.carro;
      const m = c.mando;
      if (joy.fuerza > 0.18) {
        // Joystick: empuja hacia donde quieres ir y el carro gira solo
        const angObj = Math.atan2(joy.y, joy.x);
        const dif = Util.difAngulo(angObj, c.ang);
        const fuerza = Util.limitar((joy.fuerza - 0.18) / 0.7, 0.25, 1);
        if (Math.abs(dif) > 2.35) {
          if (c.vf > 40) { m.gas = -1; m.giro = 0; }
          else {
            const difAtras = Util.difAngulo(angObj, c.ang + Math.PI);
            m.gas = -fuerza;
            m.giro = -Util.limitar(difAtras * 2, -1, 1);
          }
        } else {
          m.gas = fuerza * (Math.abs(dif) > 1.3 ? 0.55 : 1);
          m.giro = Util.limitar(dif * 2.2, -1, 1);
        }
      } else {
        m.gas = -tecl.y;
        m.giro = tecl.x;
      }
      m.freno = Entrada.mantenida('Space');
      if (c.tipo === 'ambulancia') c.sirena = Entrada.mantenida('KeyH');
      if (Misiones.retener) { m.gas = 0; m.freno = true; }
      const kmPorPx = 1 / 16000;
      J.stats.km = (J.stats.km || 0) + c.velocidad * dt * kmPorPx;
    } else {
      let eje = { x: tecl.x, y: tecl.y };
      if (eje.x && eje.y) { eje.x *= Math.SQRT1_2; eje.y *= Math.SQRT1_2; }
      let correr = Entrada.mantenida('ShiftLeft') || Entrada.mantenida('ShiftRight') || Entrada.mantenida('Space');
      if (joy.fuerza > 0.12) {
        const f = Math.max(1, Math.hypot(joy.x, joy.y));
        eje = { x: joy.x / f, y: joy.y / f };
        if (joy.fuerza > 0.92) correr = true;
      }
      j.actualizar(dt, eje, correr);
    }

    // Claxon: asusta a los peatones cercanos
    const pitando = !!j.carro && Entrada.mantenida('KeyH');
    Sonido.actualizarClaxon(pitando);
    relojClaxon -= dt;
    if (pitando && relojClaxon <= 0) {
      relojClaxon = 0.4;
      for (const p of J.peatones) {
        if (Math.hypot(p.x - j.x, p.y - j.y) < 170 && Math.random() < 0.5) p.asustar(j.x, j.y);
      }
    }
  }

  // ----------------------------------------------------------- Atropellos (cartoon, sin sangre)
  function atropellos() {
    const j = J.jugador;
    const enJuego = J.modo !== 'titulo';
    for (const c of J.carros) {
      const v = c.velocidad;
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const r = c.ancho / 2;
      const off = c.largo / 2 - r;
      const tocar = (o, radio) => {
        const dx = o.x - c.x, dy = o.y - c.y;
        if (Math.abs(dx) > c.largo || Math.abs(dy) > c.largo) return null;
        for (let k = -1; k <= 1; k++) {
          const ex = o.x - (c.x + fx * off * k), ey = o.y - (c.y + fy * off * k);
          const d = Math.hypot(ex, ey);
          if (d < r + radio) return { nx: d > 0 ? ex / d : 1, ny: d > 0 ? ey / d : 0, pen: r + radio - d };
        }
        return null;
      };
      for (const p of J.peatones) {
        if (p.estado === 'caido') continue;
        const t = tocar(p, p.radio);
        if (!t) continue;
        if (v > 75 && p.estado !== 'esperando') {
          if (p.tumbar(c.vx, c.vy)) {
            c.vx *= 0.93; c.vy *= 0.93;
            if (c.conductor === 'jugador') {
              J.stats.sustos = (J.stats.sustos || 0) + 1;
              J.delito('atropello', p.x, p.y);
            }
          }
        } else {
          p.x += t.nx * t.pen;
          p.y += t.ny * t.pen;
        }
      }
      if (enJuego && !j.carro && c.conductor !== 'jugador') {
        const t = tocar(j, j.radio);
        if (t) {
          if (v > 90 && j.caido <= 0) j.tumbar(c.vx, c.vy);
          j.x += t.nx * t.pen;
          j.y += t.ny * t.pen;
        }
      }
    }
  }

  // ----------------------------------------------------------- Cámara
  function actualizarCamara(dt) {
    const C = CONFIG.camara;
    const cam = J.cam;
    let objetivo, vel = 0;
    if (J.modo === 'titulo') {
      objetivo = J.camSigue || { x: cam.x, y: cam.y, vx: 0, vy: 0 };
      vel = 0;
    } else {
      const j = J.jugador;
      objetivo = j.carro || j;
      vel = j.carro ? j.carro.velocidad : 0;
    }
    let ax = (objetivo.vx || 0) * C.adelanto, ay = (objetivo.vy || 0) * C.adelanto;
    const la = Math.hypot(ax, ay);
    if (la > 260) { ax *= 260 / la; ay *= 260 / la; }
    const k = 1 - Math.exp(-C.suavidad * dt);
    cam.x += (objetivo.x + ax - cam.x) * k;
    cam.y += (objetivo.y + ay - cam.y) * k;
    let zoomObj;
    if (J.modo === 'titulo') zoomObj = 0.95;
    else if (J.jugador.carro) zoomObj = Util.mezclar(1, C.alejarConVelocidad, Math.min(1, vel / 700));
    else zoomObj = C.acercarAPie;
    cam.zoom += (zoomObj - cam.zoom) * (1 - Math.exp(-1.6 * dt));
    cam.sacudida = Math.max(0, cam.sacudida - dt * 30);
  }

  function prepararVista() {
    const cam = J.cam;
    const Wd = lienzo.width, Hd = lienzo.height;
    const s = Math.sqrt(Wd * Hd) / CONFIG.camara.vista * cam.zoom;
    const mw = Wd / 2 / s, mh = Hd / 2 / s;
    const TAM = Mundo.TAM;
    if (TAM > mw * 2) cam.x = Util.limitar(cam.x, mw, TAM - mw);
    if (TAM > mh * 2) cam.y = Util.limitar(cam.y, mh, TAM - mh);
    const sx = cam.sacudida > 0 ? (Math.random() - 0.5) * cam.sacudida : 0;
    const sy = cam.sacudida > 0 ? (Math.random() - 0.5) * cam.sacudida : 0;
    J.camDibujo = { x: cam.x + sx, y: cam.y + sy, s, W: Wd, H: Hd };
    J.escala = s;
    J.vista = { x0: cam.x - mw, y0: cam.y - mh, x1: cam.x + mw, y1: cam.y + mh };
  }

  // ----------------------------------------------------------- Día y noche
  function nocheDe(h) {
    if (h >= 7 && h <= 18) return 0;
    if (h >= 20.5 || h <= 5) return 1;
    if (h > 18) return (h - 18) / 2.5;
    return 1 - (h - 5) / 2;
  }

  // ----------------------------------------------------------- Clima
  function actualizarClima(dt) {
    const C = CONFIG.clima;
    J.climaReloj -= dt;
    if (J.climaReloj <= 0) {
      J.climaReloj = Util.azar(C.duracionMin, C.duracionMax);
      const llueve = Math.random() < C.probLluvia;
      J.lluviaObj = llueve ? Util.azar(0.5, 1) : 0;
      if (llueve && J.modo === 'jugando') J.pista('Empieza a llover: el piso estará resbaloso');
    }
    J.lluvia += (J.lluviaObj - J.lluvia) * Math.min(1, dt * 0.3);
    if (J.lluvia < 0.005 && J.lluviaObj === 0) J.lluvia = 0;
    Sonido.actualizarLluvia(J.lluvia);
  }

  // ----------------------------------------------------------- Destino del mapa
  function dibujarDestino(g, t) {
    const w = J.waypoint;
    if (!w || !visible(w.x, w.y, 80)) return;
    const pul = 1 + Math.sin(t * 5) * 0.1;
    g.save();
    g.strokeStyle = '#3df5ff';
    g.fillStyle = 'rgba(61,245,255,0.2)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(w.x, w.y, 34 * pul, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#3df5ff';
    g.beginPath(); g.moveTo(w.x, w.y - 8); g.lineTo(w.x + 9, w.y - 24); g.lineTo(w.x, w.y - 40 - Math.abs(Math.sin(t * 4)) * 6); g.lineTo(w.x - 9, w.y - 24); g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  function tocarMapa(t) {
    const z = J.zonaMapa;
    if (!z || t.x < z.x0 || t.x > z.x0 + z.tam || t.y < z.y0 || t.y > z.y0 + z.tam) return false;
    const x = (t.x - z.x0) / z.tam * Mundo.TAM, y = (t.y - z.y0) / z.tam * Mundo.TAM;
    if (J.waypoint && Math.hypot(J.waypoint.x - x, J.waypoint.y - y) < 260) {
      J.waypoint = null;
      J.pista('Destino quitado');
    } else {
      J.waypoint = { x, y };
      Sonido.checkpoint();
      J.pista('Destino marcado: sigue la flecha');
    }
    return true;
  }

  // ----------------------------------------------------------- Pantallas (HTML)
  const capaPortada = document.getElementById('portada');
  const capaPausa = document.getElementById('pausa');
  const bSubir = document.getElementById('bSubir');
  const bFreno = document.getElementById('bFreno');
  const bSonido = document.getElementById('bSonido');
  const bAbandonar = document.getElementById('bAbandonar');
  const datosPausa = document.getElementById('datosPausa');
  const datosPortada = document.getElementById('datosPortada');

  function textoSonido() { bSonido.textContent = Sonido.silenciado ? 'SONIDO: NO' : 'SONIDO: SÍ'; }

  function mostrarDatos(el) {
    const s = J.stats;
    const filas = [
      ['Dinero', Util.dinero(J.dinero)],
      ['Misiones completadas', s.misiones || 0],
      ['Viajes de taxi', s.viajesTaxi || 0],
      ['Mejor carrera', s.mejorCarrera ? s.mejorCarrera + ' s' : '—'],
      ['Kilómetros manejados', (s.km || 0).toFixed(1)],
      ['Sustos a peatones', s.sustos || 0],
      ['Veces atrapado', s.atrapado || 0],
      ['Máximo de estrellas', s.maxEstrellas || 0],
    ];
    el.innerHTML = filas.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  }

  function pausar() {
    if (J.modo !== 'jugando' && J.modo !== 'mapa') return;
    J.modo = 'pausa';
    Entrada.soltarTodo();
    document.body.classList.remove('en-mapa');
    capaPausa.classList.remove('oculto');
    bAbandonar.style.display = Misiones.activa ? '' : 'none';
    textoSonido();
    mostrarDatos(datosPausa);
    Sonido.callarContinuos();
    Radio.amortiguar(true);
  }

  function seguir() {
    if (J.modo !== 'pausa') return;
    J.modo = 'jugando';
    capaPausa.classList.add('oculto');
    Radio.amortiguar(false);
  }

  function abrirMapa() {
    if (J.modo !== 'jugando') return;
    J.modo = 'mapa';
    Entrada.soltarTodo();
    document.body.classList.add('en-mapa');
    Sonido.callarContinuos();
    Radio.amortiguar(true);
  }

  function cerrarMapa() {
    if (J.modo !== 'mapa') return;
    J.modo = 'jugando';
    document.body.classList.remove('en-mapa');
    Radio.amortiguar(false);
  }

  document.getElementById('bPausa').addEventListener('click', () => (J.modo === 'pausa' ? seguir() : pausar()));
  document.getElementById('bMapa').addEventListener('click', () => (J.modo === 'mapa' ? cerrarMapa() : abrirMapa()));
  document.getElementById('bSeguir').addEventListener('click', seguir);
  bAbandonar.addEventListener('click', () => { Misiones.abandonar(); seguir(); });
  bSonido.addEventListener('click', () => { Sonido.iniciar(); Sonido.alternarSilencio(); textoSonido(); });
  ['bPausa', 'bMapa'].forEach((id) => document.getElementById(id).addEventListener('pointerdown', (e) => e.stopPropagation()));
  // Después de usar un botón con el mouse, se le quita el foco. Si no, al
  // pulsar Enter (que también sirve para subir/bajar) el navegador volvería
  // a "picar" ese botón (abriría otra vez el mapa o la pausa).
  ['barra', 'pausa'].forEach((id) => document.getElementById(id).addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (b) b.blur();
  }));

  function iniciarPartida() {
    if (J.modo !== 'titulo') return;
    Sonido.iniciar();
    J.modo = 'jugando';
    document.body.classList.remove('en-titulo');
    document.body.classList.add('jugando');
    capaPortada.classList.add('oculto');
    const L = Mundo.lugares;
    const j = J.jugador;
    j.x = L.inicio.x; j.y = L.inicio.y; j.carro = null; j.ang = -Math.PI / 2;
    J.camSigue = null;
    vaciarCiudad();
    J.cam.x = j.x; J.cam.y = j.y - 60; J.cam.zoom = CONFIG.camara.acercarAPie;
    prepararVista();
    Mundo.precargar(j.x, j.y, 900);
    poblarInicial();
    Sonido.mision();
    J.avisar(CONFIG.titulo, Entrada.tactil ? 'Acércate a un carro y toca SUBIR' : 'Acércate a un carro y pulsa E para subir', '#ffb13d', 3.5);
  }

  capaPortada.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    iniciarPartida();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (J.modo === 'jugando' || J.modo === 'mapa') pausar();
      J.guardarPartida();
      Sonido.dormir(); // que la radio no siga sonando con el juego escondido
    } else {
      Sonido.despertar();
    }
  });

  // ----------------------------------------------------------- Actualizar
  let relojGuardar = 10;
  function procesarTeclas() {
    if (J.modo === 'titulo') {
      Entrada.tomarToques();
      if (Entrada.pulso('Enter', 'Space', 'KeyE')) iniciarPartida();
      return;
    }
    if (J.modo === 'tienda') {
      Entrada.tomarToques();
      if (Entrada.pulso('KeyP', 'Escape', 'KeyE', 'Enter')) Armas.cerrarTienda();
      return;
    }
    if (Entrada.pulso('KeyP', 'Escape')) {
      if (J.modo === 'mapa') cerrarMapa();
      else if (J.modo === 'pausa') seguir();
      else pausar();
      return;
    }
    if (Entrada.pulso('KeyM')) {
      if (J.modo === 'mapa') cerrarMapa();
      else abrirMapa();
    }
    const toques = Entrada.tomarToques();
    if (J.modo === 'mapa' && toques.length) {
      if (!toques.every(tocarMapa)) cerrarMapa();
      return;
    }
    if (J.modo === 'jugando') {
      const z = J.zonaMinimapa;
      if (z && toques.some((t) => Math.hypot(t.x - z.x, t.y - z.y) < z.r + 8)) abrirMapa();
      if (Entrada.pulso('KeyE', 'Enter')) subirOBajar();
      if (Entrada.pulso('KeyR')) cambiarRadio();
    }
  }

  function actualizarMundo(dt) {
    for (const c of J.carros) c.actualizar(dt);
    const n = J.carros.length;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) chocarCarros(J.carros[a], J.carros[b]);
    }
    for (const p of J.peatones) p.actualizar(dt);
    atropellos();
    Efectos.actualizar(dt);
    gestionarPoblacion(dt);
    J.hora = (J.hora + dt * 24 / CONFIG.dia.duracion) % 24;
    J.noche = nocheDe(J.hora);
    actualizarClima(dt);
  }

  function actualizarTitulo(dt) {
    J.relojTitulo = (J.relojTitulo || 0) - dt;
    if (!J.camSigue || !J.carros.includes(J.camSigue) || J.relojTitulo <= 0) {
      const ops = J.carros.filter((c) => c.conductor === 'ia' && c.ia instanceof IATrafico &&
        Math.hypot(c.x - J.cam.x, c.y - J.cam.y) < 900);
      if (ops.length) J.camSigue = Util.elegir(ops);
      J.relojTitulo = 9;
    }
  }

  function actualizar(dt) {
    J.tiempo += dt;
    procesarTeclas();
    if (J.aviso) { J.aviso.t += dt; if (J.aviso.t >= J.aviso.dur) J.aviso = null; }
    if (J.pistaInfo) J.pistaInfo.t -= dt;
    if (J.deltaDinero) J.deltaDinero.t -= dt;
    J.radioAviso = Math.max(0, J.radioAviso - dt);
    J.efectoDinero = Math.max(0, J.efectoDinero - dt * 2);
    J.mostrarDinero += (J.dinero - J.mostrarDinero) * Math.min(1, dt * 6);
    if (Math.abs(J.dinero - J.mostrarDinero) < 1) J.mostrarDinero = J.dinero;

    if (J.modo === 'pausa' || J.modo === 'mapa' || J.modo === 'tienda') return;
    if (J.modo === 'atrapado') {
      J.relojAtrapado -= dt;
      actualizarMundo(dt * 0.25);
      actualizarCamara(dt);
      prepararVista();
      if (J.relojAtrapado <= 0) reaparecer();
      return;
    }
    if (J.modo === 'titulo') {
      actualizarTitulo(dt);
      actualizarMundo(dt);
      actualizarCamara(dt);
      return;
    }

    controlarJugador(dt);
    actualizarMundo(dt);
    const j = J.jugador;
    if (j.carro) j.actualizar(dt);
    Armas.actualizar(dt);
    if (J.waypoint && Math.hypot(J.waypoint.x - (j.carro || j).x, J.waypoint.y - (j.carro || j).y) < 75) {
      J.waypoint = null;
      J.avisar('¡LLEGASTE!', 'Destino alcanzado', '#3df5ff', 2);
      Sonido.checkpoint();
    }
    J.carroCerca = j.carro ? null : buscarCarroCerca();
    Misiones.actualizar(dt);
    gestionarPolicia(dt);
    actualizarCamara(dt);

    // Sonidos del carro
    if (j.carro) {
      const c = j.carro;
      Sonido.actualizarMotor(!c.averiado, Math.abs(c.vf) / c.t.velMax, c.mando.gas);
      const chirr = Util.limitar((c.derrape - 90) / 260, 0, 1) + (c.mando.freno && Math.abs(c.vf) > 120 ? 0.4 : 0);
      Sonido.actualizarChirrido(chirr);
    } else {
      Sonido.actualizarMotor(false, 0, 0);
      Sonido.actualizarChirrido(0);
    }

    relojGuardar -= dt;
    if (relojGuardar <= 0) { relojGuardar = 10; J.guardarPartida(); }
  }

  // ----------------------------------------------------------- Dibujar
  function dibujar() {
    prepararVista();
    const cd = J.camDibujo;
    const v = J.vista;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#1c4224';
    g.fillRect(0, 0, cd.W, cd.H);
    Mundo.dibujar(g, cd);

    const s = cd.s;
    const enMundo = () => g.setTransform(s, 0, 0, s, -cd.x * s + cd.W / 2, -cd.y * s + cd.H / 2);
    enMundo();
    Efectos.dibujarMarcas(g, v);

    const ve = (o, m) => o.x > v.x0 - m && o.x < v.x1 + m && o.y > v.y0 - m && o.y < v.y1 + m;
    for (const p of J.peatones) if (p.estado === 'caido' && ve(p, 30)) p.dibujar(g);
    for (const p of J.peatones) if (p.estado !== 'caido' && ve(p, 30)) p.dibujar(g);
    if (J.modo !== 'titulo') J.jugador.dibujar(g);
    for (const c of J.carros) if (ve(c, 60)) c.dibujarSombra(g);
    for (const c of J.carros) if (ve(c, 60)) c.dibujar(g, J.tiempo);
    Efectos.dibujarParticulas(g);

    // Atardecer y amanecer: un toque naranja
    const h = J.hora;
    let tinte = 0;
    if (h > 16.5 && h < 20.5) tinte = Math.sin((h - 16.5) / 4 * Math.PI);
    else if (h > 5 && h < 7.5) tinte = Math.sin((h - 5) / 2.5 * Math.PI) * 0.6;
    if (tinte > 0.01) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(255,110,50,${0.13 * tinte})`;
      g.fillRect(0, 0, cd.W, cd.H);
      g.restore();
    }
    Efectos.dibujarNoche(g, cd, J.noche, v, J.tiempo);

    enMundo();
    Misiones.dibujarSuelo(g, J.tiempo, v);
    dibujarDestino(g, J.tiempo);
    Efectos.dibujarTextos(g, s / J.dpr);

    g.setTransform(J.dpr, 0, 0, J.dpr, 0, 0);
    Efectos.dibujarLluvia(g, J.W, J.H, J.lluvia, J.tiempo);
    if (J.modo !== 'titulo') HUD.dibujar(g, J.W, J.H, J.tiempo);

    // Botones táctiles que cambian de nombre
    if (J.modo !== 'titulo') {
      const enCarro = !!J.jugador.carro;
      const ts = enCarro ? 'BAJAR' : 'SUBIR';
      if (bSubir.textContent !== ts) bSubir.textContent = ts;
      bSubir.classList.toggle('listo', !enCarro && !!J.carroCerca);
      const tf = enCarro ? 'FRENO' : 'CORRER';
      if (bFreno.textContent !== tf) bFreno.textContent = tf;
      document.body.classList.toggle('a-pie', !enCarro);
      document.body.classList.toggle('armado', Armas.alguna);
    }
  }

  // ----------------------------------------------------------- Bucle
  let ultimo = performance.now();
  function bucle(ahora) {
    const dt = Math.min(0.05, Math.max(0, (ahora - ultimo) / 1000));
    ultimo = ahora;
    try {
      const t0 = performance.now();
      actualizar(dt);
      dibujar();
      J.msCuadro = (J.msCuadro || 0) * 0.95 + (performance.now() - t0) * 0.05;
    } catch (e) {
      console.error(e);
    }
    Entrada.finDeCuadro();
    requestAnimationFrame(bucle);
  }

  // ----------------------------------------------------------- Arranque
  J.jugador = new Jugador(Mundo.lugares.inicio.x, Mundo.lugares.inicio.y);
  Armas.aplicarRopa();
  J.cam.x = Mundo.lugares.inicio.x;
  J.cam.y = Mundo.lugares.inicio.y;
  J.cam.zoom = 0.95;
  prepararVista();
  poblarInicial();
  mostrarDatos(datosPortada);
  document.body.classList.add('en-titulo');
  requestAnimationFrame(bucle);

  // Para pruebas y para curiosos (abre la consola del navegador y escribe CIUDAD)
  window.CIUDAD = {
    J, Mundo, Misiones, Radio, Sonido, Entrada, CONFIG,
    empezar: iniciarPartida,
    subirBajar: subirOBajar,
    pausar, seguir, abrirMapa, cerrarMapa,
    teletransportar(x, y) {
      const j = J.jugador;
      const o = j.carro || j;
      o.x = x; o.y = y;
      j.x = x; j.y = y;
      J.cam.x = x; J.cam.y = y;
    },
    lluvia(v) { J.lluvia = J.lluviaObj = v; J.climaReloj = 9999; },
    armas: Armas,
    estrellas(n) { J.buscado.calor = n; actualizarEstrellas(); },
    hora(h) { J.hora = h; J.noche = nocheDe(h); },
    carroNuevo(tipo) {
      const j = J.jugador;
      const c = new Carro(tipo || 'deportivo', j.x + 40, j.y, -Math.PI / 2, {});
      J.carros.push(c);
      return c;
    },
  };
})();
