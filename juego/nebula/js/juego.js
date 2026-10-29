// =============================================================
//  🚀  EL JUEGO: oleadas, choques, puntos, pantallas y dibujo.
// =============================================================
(() => {
  'use strict';

  const W = CONFIG.ancho;
  const H = CONFIG.alto;
  const COL = CONFIG.colores;
  const FUENTE = 'Orbitron, ui-monospace, Menlo, Consolas, monospace';
  const MAX_PARTICULAS = 700;

  const lienzo = document.getElementById('juego');
  const g = lienzo.getContext('2d');

  // ----------------------------------------------------------- Pantalla
  function redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const escala = Math.min(window.innerWidth / W, window.innerHeight / H);
    const cw = Math.floor(W * escala);
    const ch = Math.floor(H * escala);
    lienzo.style.width = cw + 'px';
    lienzo.style.height = ch + 'px';
    lienzo.width = Math.floor(cw * dpr);
    lienzo.height = Math.floor(ch * dpr);
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();
  Entrada.configurar(lienzo, W, H);

  try { document.fonts.load(`800 20px Orbitron`); } catch (e) { /* sin fuentes web */ }

  // El audio se activa con el primer toque o tecla
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) =>
    window.addEventListener(ev, Sonido.iniciar, { passive: true }));

  // ----------------------------------------------------------- Récord
  function cargarRecord() {
    try { return parseInt(localStorage.getItem('nebula_record'), 10) || 0; } catch (e) { return 0; }
  }
  function guardarRecord(valor) {
    try { localStorage.setItem('nebula_record', String(valor)); } catch (e) { /* nada */ }
  }

  // ----------------------------------------------------------- Estado
  // "J" es todo lo que está pasando en la partida. Las entidades lo reciben
  // para poder crear balas, partículas, etc.
  const J = {
    modo: 'menu',          // menu | jugando | pausa | fin
    puntos: 0,
    record: cargarRecord(),
    nuevoRecord: false,
    oleada: 0,
    porAparecer: 0,
    relojAparicion: 0,
    descanso: 0,
    racha: 0,
    relojCombo: 0,
    sacudida: 0,
    relojFin: 0,
    tiempoMenu: 0,
    jugador: null,
    jefe: null,
    jefesDerrotados: 0,
    aviso: null,
    foco: 0,               // mando: 0 = acción principal, 1 = botón MENÚ
    avisoMando: null,
    balas: [],
    balasEnemigas: [],
    enemigos: [],
    powerups: [],
    particulas: [],
    textos: [],
    estrellas: new Estrellas(CONFIG.efectos.estrellas),

    particula(x, y, vx, vy, vida, color, tam) {
      if (this.particulas.length < MAX_PARTICULAS) {
        this.particulas.push(new Particula(x, y, vx, vy, vida, color, tam));
      }
    },

    explosion(x, y, color, cantidad, fuerza) {
      const n = Math.round(cantidad * CONFIG.efectos.particulas);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = Util.azar(0.2, 1) * fuerza;
        this.particula(x, y, Math.cos(a) * v, Math.sin(a) * v, Util.azar(0.3, 0.9),
          Math.random() < 0.25 ? '#ffffff' : color, Util.azar(2, 4.5));
      }
    },

    texto(x, y, texto, color, tam) {
      this.textos.push(new TextoFlotante(x, y, texto, color, tam));
    },

    sacudir(fuerza) {
      if (CONFIG.efectos.sacudida) this.sacudida = Math.max(this.sacudida, fuerza);
    },

    avisar(texto, color) {
      this.aviso = { texto, color: color || COL.texto, t: 0 };
    },

    multiplicador() {
      return Math.min(CONFIG.combo.maximo, 1 + Math.floor(this.racha / CONFIG.combo.porNivel));
    },
  };

  // ----------------------------------------------------------- Partida
  function iniciarPartida() {
    J.modo = 'jugando';
    J.puntos = 0;
    J.nuevoRecord = false;
    J.oleada = 0;
    J.porAparecer = 0;
    J.relojAparicion = 0;
    J.descanso = 1.2;
    J.racha = 0;
    J.relojCombo = 0;
    J.sacudida = 0;
    J.jefe = null;
    J.jefesDerrotados = 0;
    J.aviso = null;
    J.jugador = new Jugador();
    for (const lista of [J.balas, J.balasEnemigas, J.enemigos, J.powerups, J.particulas, J.textos]) {
      lista.length = 0;
    }
    Entrada.tomarArrastre(); // olvida arrastres viejos del menú
    Sonido.inicio();
  }

  function siguienteOleada() {
    J.oleada++;
    const cada = CONFIG.jefe.cadaOleadas;
    if (cada > 0 && J.oleada % cada === 0) {
      J.jefe = new Jefe(J.oleada / cada);
      J.avisar('⚠ JEFE ⚠', COL.enemigos.jefe);
      Sonido.alarma();
    } else {
      const o = CONFIG.oleadas;
      J.porAparecer = o.enemigosBase + o.enemigosExtraPorOleada * (J.oleada - 1);
      J.relojAparicion = 0.3;
      J.avisar(`OLEADA ${J.oleada}`, COL.textoSuave);
      Sonido.oleada();
    }
  }

  function elegirTipoEnemigo() {
    const o = J.oleada;
    return Util.elegirPorPeso({
      normal: 6,
      tirador: o >= 2 ? 1.5 + o * 0.3 : 0,
      kamikaze: o >= 3 ? 1.5 + o * 0.3 : 0,
    });
  }

  function aparecerEnemigos() {
    // De vez en cuando llega una formación en "V"
    if (J.oleada >= 2 && J.porAparecer >= 5 && Math.random() < 0.15) {
      const cx = Util.azar(110, W - 110);
      for (let i = 0; i < 5; i++) {
        const lado = i - 2;
        const e = new Enemigo('normal', cx + lado * 38, -30 - Math.abs(lado) * 34, J.oleada);
        e.amplitud = 20;
        e.fase = 0;
        J.enemigos.push(e);
      }
      J.porAparecer -= 5;
      return;
    }
    const tipo = elegirTipoEnemigo();
    const r = CONFIG.enemigos[tipo].radio;
    J.enemigos.push(new Enemigo(tipo, Util.azar(r + 50, W - r - 50), -30, J.oleada));
    J.porAparecer--;
  }

  function sumarPuntos(cantidad, x, y, color) {
    const mult = J.multiplicador();
    const total = cantidad * mult;
    J.puntos += total;
    J.texto(x, y, mult > 1 ? `+${total} x${mult}` : `+${total}`, color, mult > 1 ? 15 : 13);
  }

  function soltarPowerUp(x, y, forzar) {
    if (!forzar && Math.random() >= CONFIG.powerups.probabilidad) return;
    J.powerups.push(new PowerUp(x, y, Util.elegirPorPeso(CONFIG.powerups.pesos)));
  }

  function destruirEnemigo(e) {
    e.vivo = false;
    J.racha++;
    J.relojCombo = CONFIG.combo.ventana;
    sumarPuntos(e.puntos, e.x, e.y, e.color);
    J.explosion(e.x, e.y, e.color, 22, 260);
    J.sacudir(4);
    Sonido.explosion(false);
    soltarPowerUp(e.x, e.y, false);
  }

  function destruirJefe() {
    const jf = J.jefe;
    J.racha += 5;
    J.relojCombo = CONFIG.combo.ventana;
    sumarPuntos(jf.puntos, jf.x, jf.y, COL.acento);
    for (let i = 0; i < 6; i++) {
      J.explosion(jf.x + Util.azar(-40, 40), jf.y + Util.azar(-40, 40),
        i % 2 ? jf.color : COL.acento, 30, 380);
    }
    J.sacudir(22);
    Sonido.explosion(true);
    Sonido.victoria();
    vibrar(1, 0.8, 600);
    soltarPowerUp(jf.x - 30, jf.y, true);
    soltarPowerUp(jf.x + 30, jf.y, true);
    // Las balas del jefe desaparecen
    for (const b of J.balasEnemigas) {
      b.vivo = false;
      J.particula(b.x, b.y, 0, 0, 0.4, b.color, 3);
    }
    J.jefe = null;
    J.jefesDerrotados++;
    J.avisar('¡JEFE DERROTADO!', COL.acento);
    J.descanso = CONFIG.oleadas.descanso + 1;
  }

  function tomarPowerUp(pu) {
    const p = J.jugador;
    pu.vivo = false;
    let texto = POWERUPS[pu.tipo].texto;
    if (pu.tipo === 'triple') {
      if (p.nivelDisparo < CONFIG.jugador.nivelDisparoMax) p.nivelDisparo++;
      else { J.puntos += 500; texto = '+500'; }
    } else if (pu.tipo === 'rapido') {
      p.rapido = CONFIG.powerups.duracionRapido;
    } else if (pu.tipo === 'escudo') {
      p.escudo = true;
    } else if (pu.tipo === 'vida') {
      if (p.vidas < CONFIG.jugador.vidasMax) p.vidas++;
      else { J.puntos += 1000; texto = '+1000'; }
    }
    J.texto(pu.x, pu.y - 20, texto, pu.color, 15);
    J.explosion(pu.x, pu.y, pu.color, 14, 160);
    Sonido.powerup();
  }

  function danarJugador() {
    const p = J.jugador;
    if (!p.vivo || p.invulnerable > 0) return;

    if (p.escudo) {
      p.escudo = false;
      p.invulnerable = 1;
      J.explosion(p.x, p.y, COL.escudo, 26, 240);
      J.sacudir(6);
      Sonido.escudoRoto();
      vibrar(0.3, 0.5, 120);
      return;
    }

    p.vidas--;
    p.nivelDisparo = Math.max(1, p.nivelDisparo - 1);
    p.rapido = 0;
    J.racha = 0;
    J.relojCombo = 0;
    J.explosion(p.x, p.y, COL.jugador, 40, 320);
    J.sacudir(14);
    Sonido.dano();
    vibrar(0.8, 0.6, 220);

    // Un respiro: todas las balas enemigas desaparecen
    for (const b of J.balasEnemigas) {
      b.vivo = false;
      J.particula(b.x, b.y, 0, 0, 0.4, b.color, 3);
    }

    if (p.vidas <= 0) {
      p.vivo = false;
      J.explosion(p.x, p.y, '#ffffff', 60, 450);
      J.sacudir(24);
      Sonido.explosion(true);
      J.relojFin = 1.6;
    } else {
      p.invulnerable = CONFIG.jugador.invulnerable;
    }
  }

  function terminarPartida() {
    J.modo = 'fin';
    J.tiempoMenu = 0;
    if (J.puntos > J.record) {
      J.record = J.puntos;
      J.nuevoRecord = true;
      guardarRecord(J.record);
    }
    Sonido.finJuego();
  }

  // Quita de la lista lo que ya no está vivo (sin crear listas nuevas)
  function limpiar(lista) {
    let k = 0;
    for (let i = 0; i < lista.length; i++) if (lista[i].vivo) lista[k++] = lista[i];
    lista.length = k;
  }

  // ----------------------------------------------------------- Botones (HUD)
  const BOTON_PAUSA = { x: W - 30, y: 30, r: 20 };
  const BOTON_SONIDO = { x: W - 76, y: 30, r: 20 };
  const BOTON_MUSICA = { x: W - 122, y: 30, r: 20 };
  const tocado = (t, b) => Math.hypot(t.x - b.x, t.y - b.y) < b.r + 6;

  // Botón "← MENÚ" para volver a la lista de juegos. No sale mientras
  // juegas (para no tapar los puntos): solo en el inicio, la pausa y el final.
  // En la pausa va arriba a la izquierda, lejos del centro: ahí es donde
  // tocas para continuar, y un toque sin querer te sacaría de la partida.
  const MENU_INICIO = { x: 14, y: 13, w: 104, h: 34 };
  const MENU_PAUSA = MENU_INICIO;
  const MENU_FIN = { x: W / 2 - 80, y: H * 0.8, w: 160, h: 42 };
  const tocadoRect = (t, b) =>
    t.x > b.x - 6 && t.x < b.x + b.w + 6 && t.y > b.y - 6 && t.y < b.y + b.h + 6;

  function botonMenu() {
    if (J.modo === 'menu') return MENU_INICIO;
    if (J.modo === 'pausa') return MENU_PAUSA;
    if (J.modo === 'fin' && J.tiempoMenu > 1) return MENU_FIN;
    return null;
  }

  // ----------------------------------------------------------- Mando
  const M = window.Mando || null;
  const vibrar = (f, s, ms) => { if (M) M.vibrar(f, s, ms); };
  const pad = (n) => !!M && M.pulsado(n);
  let conectadoAntes = false;

  function avisarMando(texto) { J.avisoMando = { texto, t: 0 }; }

  if (M) {
    // Si el jugador vuelve al ratón, teclado o toque, se ocultan las pistas
    const dejarMando = () => { M.activo = false; };
    window.addEventListener('pointerdown', dejarMando, true);
    window.addEventListener('keydown', dejarMando, true);
    let px = -1, py = -1;
    window.addEventListener('pointermove', (e) => {
      if (px >= 0 && Math.hypot(e.clientX - px, e.clientY - py) > 6) M.activo = false;
      px = e.clientX; py = e.clientY;
    }, true);
    window.addEventListener('gamepaddisconnected', () => { M.activo = false; });
  }

  // Lee el mando una vez por cuadro. Devuelve acciones ya con flanco.
  function leerMando() {
    if (!M) return;
    if (document.hidden) return;
    M.leer();
    if (M.conectado !== conectadoAntes) {
      conectadoAntes = M.conectado;
      avisarMando(M.conectado ? 'MANDO CONECTADO' : 'MANDO DESCONECTADO');
      if (!M.conectado) { M.activo = false; J.foco = 0; }
    }
  }

  function irAlMenu() {
    guardarAlSalir();
    window.location.href = '../';
  }

  // ----------------------------------------------------------- Actualizar
  function actualizar(dt) {
    const toques = Entrada.tomarToques();
    let tocoBoton = false;

    for (const t of toques) {
      const menu = botonMenu();
      if (tocado(t, BOTON_SONIDO)) { Sonido.alternar(); tocoBoton = true; }
      else if (tocado(t, BOTON_MUSICA)) { Musica.alternar(); tocoBoton = true; }
      else if (J.modo === 'jugando' && tocado(t, BOTON_PAUSA)) { J.modo = 'pausa'; tocoBoton = true; }
      else if (menu && tocadoRect(t, menu)) { irAlMenu(); tocoBoton = true; }
    }
    if (Entrada.pulso('KeyM') || pad('Y')) Sonido.alternar();
    if (Entrada.pulso('KeyN')) Musica.alternar();

    // Mando: foco entre la acción principal y el botón ← MENÚ
    let mandoAceptar = false;
    let mandoVolver = false;
    if (M && M.conectado) {
      const hayPildora = !!botonMenu();
      if (!hayPildora) J.foco = 0;
      else if (J.modo !== 'jugando') {
        if (pad('IZQ') || pad('ARRIBA')) J.foco = 1;
        else if (pad('DER') || pad('ABAJO')) J.foco = 0;
      }
      if (pad('A')) {
        if (J.foco === 1 && hayPildora) { irAlMenu(); mandoVolver = true; }
        else mandoAceptar = true;
      }
      if (pad('B')) {
        if (J.modo === 'jugando' || J.modo === 'pausa') Musica.alternar();
        else if (hayPildora) { irAlMenu(); mandoVolver = true; }
      }
    }
    if (J.modo === 'jugando' && !mandoVolver && pad('MENU')) {
      J.modo = 'pausa';
      J.foco = 0;
      Entrada.finDeCuadro();
      return;
    }

    const aceptar = ((!tocoBoton && toques.length > 0) || Entrada.pulso('Enter', 'Space') || mandoAceptar) && !mandoVolver;

    if (J.modo !== 'pausa') {
      J.estrellas.velocidad += ((J.jefe && J.jefe.entrando ? 5 : 1) - J.estrellas.velocidad) * Math.min(1, dt * 2);
      J.estrellas.actualizar(dt);
    }

    if (J.modo === 'menu') {
      J.tiempoMenu += dt;
      if (aceptar) { iniciarPartida(); J.foco = 0; }
      actualizarEfectos(dt);
      Entrada.finDeCuadro();
      return;
    }

    if (J.modo === 'pausa') {
      if (aceptar || Entrada.pulso('KeyP', 'Escape') || pad('MENU')) {
        J.modo = 'jugando';
        J.foco = 0;
        Entrada.tomarArrastre();
      }
      Entrada.finDeCuadro();
      return;
    }

    if (J.modo === 'fin') {
      J.tiempoMenu += dt;
      actualizarEfectos(dt);
      if (J.tiempoMenu > 1 && aceptar) { iniciarPartida(); J.foco = 0; }
      Entrada.finDeCuadro();
      return;
    }

    // ---- jugando ----
    if (Entrada.pulso('KeyP', 'Escape')) {
      J.modo = 'pausa';
      Entrada.finDeCuadro();
      return;
    }

    const p = J.jugador;
    if (p.vivo) p.actualizar(dt, J);
    else Entrada.tomarArrastre();

    // Oleadas
    if (J.porAparecer > 0) {
      J.relojAparicion -= dt;
      if (J.relojAparicion <= 0) {
        aparecerEnemigos();
        J.relojAparicion = Math.max(0.28, CONFIG.oleadas.intervaloAparicion * (1 - Math.min(J.oleada, 15) * 0.035));
      }
    } else if (!J.jefe && J.enemigos.length === 0 && p.vivo) {
      J.descanso -= dt;
      if (J.descanso <= 0) {
        siguienteOleada();
        J.descanso = CONFIG.oleadas.descanso;
      }
    }

    // Combo
    if (J.relojCombo > 0) {
      J.relojCombo -= dt;
      if (J.relojCombo <= 0) J.racha = 0;
    }

    for (const b of J.balas) b.actualizar(dt);
    for (const b of J.balasEnemigas) b.actualizar(dt);
    for (const e of J.enemigos) e.actualizar(dt, J);
    if (J.jefe) J.jefe.actualizar(dt, J);
    for (const pu of J.powerups) pu.actualizar(dt, J);

    // Choques: balas del jugador contra enemigos y jefe
    for (const b of J.balas) {
      if (!b.vivo) continue;
      for (const e of J.enemigos) {
        if (e.vivo && Util.chocaBarrido(b, e)) {
          b.vivo = false;
          e.vida -= b.dano;
          e.golpe = 0.07;
          J.particula(b.x, b.y, Util.azar(-60, 60), Util.azar(-120, -40), 0.2, e.color, 2.5);
          if (e.vida <= 0) destruirEnemigo(e);
          else Sonido.golpe();
          break;
        }
      }
      const jf = J.jefe;
      if (b.vivo && jf && !jf.entrando && Util.chocaBarrido(b, jf)) {
        b.vivo = false;
        jf.vida -= b.dano;
        jf.golpe = 0.05;
        J.puntos += 10;
        J.particula(b.x, b.y, Util.azar(-80, 80), Util.azar(-140, -40), 0.25, jf.color, 3);
        Sonido.golpe();
        if (jf.vida <= 0) destruirJefe();
      }
    }

    // Choques contra la nave
    if (p.vivo) {
      for (const b of J.balasEnemigas) {
        if (b.vivo && Util.choca(b, p, -3)) {
          b.vivo = false;
          danarJugador();
        }
      }
      for (const e of J.enemigos) {
        if (e.vivo && Util.choca(e, p, -4)) {
          e.vida = 0;
          danarJugador();
          destruirEnemigo(e);
        }
      }
      if (J.jefe && !J.jefe.entrando && Util.choca(J.jefe, p, -8)) danarJugador();
      for (const pu of J.powerups) {
        if (pu.vivo && Util.choca(pu, p, 10)) tomarPowerUp(pu);
      }
    }

    limpiar(J.balas);
    limpiar(J.balasEnemigas);
    limpiar(J.enemigos);
    limpiar(J.powerups);
    actualizarEfectos(dt);

    if (J.puntos > J.record && J.record > 0 && !J.nuevoRecord) {
      J.nuevoRecord = true;
      J.texto(W / 2, H * 0.45, '¡NUEVO RÉCORD!', COL.acento, 22);
    }

    if (!p.vivo) {
      J.relojFin -= dt;
      if (J.relojFin <= 0) terminarPartida();
    }

    Entrada.finDeCuadro();
  }

  function actualizarEfectos(dt) {
    for (const pa of J.particulas) pa.actualizar(dt);
    for (const t of J.textos) t.actualizar(dt);
    limpiar(J.particulas);
    limpiar(J.textos);
    if (J.aviso) {
      J.aviso.t += dt;
      if (J.aviso.t > 2.2) J.aviso = null;
    }

    J.sacudida = Math.max(0, J.sacudida - 40 * dt);
  }

  // ----------------------------------------------------------- Dibujar
  let tiempoFondo = 0;

  function dibujarFondo(dt) {
    tiempoFondo += dt;
    g.fillStyle = COL.fondo;
    g.fillRect(-30, -30, W + 60, H + 60);

    // Dos nubes de nebulosa que se mueven muy despacio
    const nubes = [
      [W * 0.25 + Math.sin(tiempoFondo * 0.07) * 60, H * 0.3 + Math.cos(tiempoFondo * 0.05) * 80, 320, COL.nebulosa1],
      [W * 0.8 + Math.cos(tiempoFondo * 0.06) * 50, H * 0.7 + Math.sin(tiempoFondo * 0.04) * 90, 280, COL.nebulosa2],
    ];
    for (const [x, y, r, c] of nubes) {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, c);
      grad.addColorStop(1, 'transparent');
      g.globalAlpha = 0.35;
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    J.estrellas.dibujar(g);
  }

  function texto(t, x, y, tam, color, peso, alinear) {
    g.font = `${peso || 800} ${tam}px ${FUENTE}`;
    g.textAlign = alinear || 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(t, x, y);
  }

  function textoBrillante(t, x, y, tam, color) {
    g.save();
    brillo(g, color, 20);
    texto(t, x, y, tam, color);
    g.restore();
  }

  function dibujarMundo() {
    for (const pu of J.powerups) pu.dibujar(g);

    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const b of J.balas) b.dibujar(g);
    g.restore();

    for (const e of J.enemigos) e.dibujar(g);
    if (J.jefe) J.jefe.dibujar(g);

    for (const b of J.balasEnemigas) b.dibujar(g);

    if (J.jugador && J.jugador.vivo && J.modo !== 'menu') J.jugador.dibujar(g);

    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const pa of J.particulas) pa.dibujar(g);
    g.restore();

    g.save();
    for (const t of J.textos) t.dibujar(g);
    g.restore();
  }

  // tachado = apagado (raya roja). tenue = se ve clarito porque ahora
  // no puede sonar (la música cuando todo está en silencio con M).
  function dibujarBoton(b, simbolo, tachado, tenue) {
    const base = tenue ? 0.45 : 1;
    g.save();
    g.globalAlpha = 0.85 * base;
    g.strokeStyle = COL.textoSuave;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.stroke();
    if (tachado) g.globalAlpha = 0.45 * base;
    texto(simbolo, b.x, b.y + 1, 14, COL.texto, 800);
    if (tachado) {
      // Una raya cruzada: "apagado"
      g.globalAlpha = 0.95;
      g.strokeStyle = COL.enemigos.normal;
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(b.x - b.r * 0.62, b.y + b.r * 0.62);
      g.lineTo(b.x + b.r * 0.62, b.y - b.r * 0.62);
      g.stroke();
    }
    g.restore();
  }

  function dibujarBotonesAudio() {
    dibujarBoton(BOTON_SONIDO, Sonido.silenciado ? '×' : '♪');
    // La raya dice si la música está prendida o apagada (N). Con todo en
    // silencio (M) el botón se ve clarito, pero la raya sigue diciendo
    // cómo quedará la música cuando quites el silencio.
    dibujarBoton(BOTON_MUSICA, '♫', !Musica.activa, Sonido.silenciado);
  }

  // Botón con forma de píldora y una flecha "←" dibujada a mano
  // (la letra Orbitron no trae flechas)
  function dibujarPildora(b, etiqueta) {
    const r = b.h / 2;
    g.save();
    g.beginPath();
    g.moveTo(b.x + r, b.y);
    g.lineTo(b.x + b.w - r, b.y);
    g.arc(b.x + b.w - r, b.y + r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(b.x + r, b.y + b.h);
    g.arc(b.x + r, b.y + r, r, Math.PI / 2, Math.PI * 1.5);
    g.closePath();
    g.fillStyle = 'rgba(154, 140, 255, 0.12)';
    g.fill();
    g.globalAlpha = 0.9;
    g.strokeStyle = COL.textoSuave;
    g.lineWidth = 2;
    g.stroke();

    g.font = `800 13px ${FUENTE}`;
    const flecha = 12;
    const hueco = 7;
    const inicio = b.x + (b.w - (flecha + hueco + g.measureText(etiqueta).width)) / 2;
    const cy = b.y + b.h / 2;
    g.globalAlpha = 1;
    g.strokeStyle = COL.texto;
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(inicio + flecha, cy);
    g.lineTo(inicio, cy);
    g.moveTo(inicio + 5, cy - 5);
    g.lineTo(inicio, cy);
    g.lineTo(inicio + 5, cy + 5);
    g.stroke();
    g.restore();
    texto(etiqueta, inicio + flecha + hueco, cy + 1, 13, COL.texto, 800, 'left');
  }

  function dibujarHUD() {
    const p = J.jugador;
    // En la pausa ahí va el botón "← MENÚ" (los puntos salen en el centro)
    if (J.modo !== 'pausa') {
      texto(String(J.puntos), 16, 26, 22, COL.texto, 800, 'left');
      texto(`RÉCORD ${Math.max(J.record, J.puntos)}`, 16, 50, 11, COL.textoSuave, 500, 'left');
    }

    const mult = J.multiplicador();
    if (mult > 1 && J.modo !== 'pausa') {
      const ancho = Math.max(0, J.relojCombo / CONFIG.combo.ventana);
      textoBrillante(`x${mult}`, 16 + 28, 76, 18, COL.acento);
      g.fillStyle = COL.acento;
      g.globalAlpha = 0.6;
      g.fillRect(16, 90, 56 * ancho, 3);
      g.globalAlpha = 1;
    }

    dibujarBoton(BOTON_PAUSA, 'II');
    dibujarBotonesAudio();

    if (J.oleada > 0) texto(`OLEADA ${J.oleada}`, W / 2, 26, 12, COL.textoSuave, 500);

    // Vidas (navecitas abajo a la izquierda)
    if (p) {
      for (let i = 0; i < p.vidas; i++) {
        const x = 22 + i * 24;
        const y = H - 24;
        g.save();
        g.strokeStyle = COL.jugador;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x + 7, y + 7);
        g.lineTo(x, y + 3);
        g.lineTo(x - 7, y + 7);
        g.closePath();
        g.stroke();
        g.restore();
      }
      // Indicadores de power-ups activos
      let ix = W - 20;
      if (p.rapido > 0) {
        texto(`R ${Math.ceil(p.rapido)}s`, ix, H - 24, 12, COL.powerups.rapido, 800, 'right');
        ix -= 70;
      }
      if (p.nivelDisparo > 1) {
        texto(`+${p.nivelDisparo - 1}`, ix, H - 24, 12, COL.powerups.triple, 800, 'right');
      }
    }

    // Barra de vida del jefe
    const jf = J.jefe;
    if (jf) {
      const ancho = W - 40;
      const k = Math.max(0, jf.vida / jf.vidaMax);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(20, 62, ancho, 8);
      g.save();
      brillo(g, jf.color, 10);
      g.fillStyle = jf.color;
      g.fillRect(20, 62, ancho * k, 8);
      g.restore();
      texto(`JEFE ${jf.numero}`, W / 2, 82, 11, jf.color, 800);
    }

    if (J.aviso) {
      const t = J.aviso.t;
      const alfa = t < 0.3 ? t / 0.3 : t > 1.7 ? Math.max(0, (2.2 - t) / 0.5) : 1;
      g.save();
      g.globalAlpha = alfa;
      textoBrillante(J.aviso.texto, W / 2, H * 0.38, 30, J.aviso.color);
      g.restore();
    }
  }

  // ---- Pistas del mando (solo con el mando en uso) ----
  const COLOR_BOTON = { A: '#3ddc84', B: '#ff4d4d', X: '#4da3ff', Y: '#ffd23d' };
  const mandoVisible = () => !!M && M.conectado && M.activo;

  // Dibuja "(A) etiqueta" empezando en x; devuelve el ancho usado
  function pista(btn, etiqueta, x, y) {
    g.font = `500 11px ${FUENTE}`;
    const w = 24 + g.measureText(etiqueta).width;
    g.save();
    g.beginPath();
    if (COLOR_BOTON[btn]) {
      g.arc(x + 8, y, 8, 0, Math.PI * 2);
      g.fillStyle = COLOR_BOTON[btn];
      g.fill();
      texto(btn, x + 8, y + 1, 10, '#05030f', 800);
    } else {
      g.roundRect(x, y - 7, 18, 14, 4);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fill();
      texto('≡', x + 9, y + 1, 11, '#05030f', 800);
    }
    g.restore();
    texto(etiqueta, x + 24, y + 1, 11, COL.texto, 500, 'left');
    return w + 14;
  }

  function dibujarPistasMando() {
    if (!mandoVisible()) return;
    let lista;
    if (J.modo === 'menu') lista = [['A', 'JUGAR'], ['B', 'VOLVER'], ['Y', 'SONIDO']];
    else if (J.modo === 'pausa') lista = [['MENU', 'SEGUIR'], ['B', 'MÚSICA'], ['Y', 'SONIDO']];
    else if (J.modo === 'fin') lista = J.tiempoMenu > 1 ? [['A', 'OTRA VEZ'], ['B', 'VOLVER'], ['Y', 'SONIDO']] : [];
    else lista = [['MENU', 'PAUSA'], ['B', 'MÚSICA'], ['Y', 'SONIDO']];
    if (!lista.length) return;
    g.save();
    g.font = `500 11px ${FUENTE}`;
    let total = 0;
    for (const [, e] of lista) total += 24 + g.measureText(e).width + 14;
    total -= 14;
    let x = (W - total) / 2;
    g.globalAlpha = 0.85;
    for (const [b, e] of lista) x += pista(b, e, x, H - 56);
    g.restore();
  }

  function resaltarFoco(b) {
    if (!mandoVisible() || J.foco !== 1) return;
    g.save();
    g.strokeStyle = COL.acento;
    g.lineWidth = 3;
    brillo(g, COL.acento, 12);
    g.beginPath();
    g.roundRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10, (b.h + 10) / 2);
    g.stroke();
    g.restore();
  }

  function dibujarAvisoMando() {
    const a = J.avisoMando;
    if (!a) return;
    const alfa = a.t < 0.25 ? a.t / 0.25 : a.t > 1.6 ? Math.max(0, (2 - a.t) / 0.4) : 1;
    g.save();
    g.globalAlpha = alfa;
    g.font = `800 12px ${FUENTE}`;
    const w = g.measureText(a.texto).width + 28;
    g.beginPath();
    g.roundRect(W / 2 - w / 2, 62, w, 28, 14);
    g.fillStyle = 'rgba(5,3,15,0.85)';
    g.fill();
    g.strokeStyle = COL.escudo;
    g.lineWidth = 1.5;
    g.stroke();
    texto(a.texto, W / 2, 77, 12, COL.escudo, 800);
    g.restore();
  }

  function velo() {
    g.fillStyle = 'rgba(5,3,15,0.65)';
    g.fillRect(0, 0, W, H);
  }

  function dibujarMenu() {
    const t = J.tiempoMenu;
    const flota = Math.sin(t * 2) * 6;
    textoBrillante(CONFIG.titulo, W / 2, H * 0.3 + flota, 64, COL.jugador);
    texto(CONFIG.subtitulo, W / 2, H * 0.3 + 52, 14, COL.textoSuave, 500);

    // Una nave de adorno
    const deco = { x: W / 2, y: H * 0.52 + Math.sin(t * 3) * 8 };
    g.save();
    g.translate(deco.x, deco.y);
    g.scale(2, 2);
    brillo(g, COL.jugador, 18);
    g.strokeStyle = COL.jugador;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(15, 14);
    g.lineTo(5, 9);
    g.lineTo(0, 13);
    g.lineTo(-5, 9);
    g.lineTo(-15, 14);
    g.closePath();
    g.stroke();
    g.restore();

    g.save();
    g.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    texto(mandoVisible() ? 'PULSA A PARA JUGAR' : 'TOCA PARA JUGAR', W / 2, H * 0.68, 20, COL.texto);
    g.restore();

    texto('Arrastra el dedo o usa flechas / WASD', W / 2, H * 0.75, 12, COL.textoSuave, 500);
    texto('La nave dispara sola', W / 2, H * 0.78, 12, COL.textoSuave, 500);
    texto('P pausa  ·  M sonido  ·  N música', W / 2, H * 0.81, 12, COL.textoSuave, 500);
    if (J.record > 0) texto(`RÉCORD  ${J.record}`, W / 2, H * 0.89, 16, COL.acento);

    dibujarPildora(MENU_INICIO, 'MENÚ');
    resaltarFoco(MENU_INICIO);
  }

  function dibujarPausa() {
    velo();
    textoBrillante('PAUSA', W / 2, H * 0.42, 44, COL.jugador);
    texto(mandoVisible() ? 'Pulsa A para continuar' : 'Toca para continuar', W / 2, H * 0.52, 16, COL.texto, 500);
    texto(`PUNTOS  ${J.puntos}`, W / 2, H * 0.6, 16, COL.acento);
    texto('M sonido  ·  N música', W / 2, H * 0.7, 12, COL.textoSuave, 500);
    dibujarPildora(MENU_PAUSA, 'MENÚ');
    resaltarFoco(MENU_PAUSA);
    dibujarBotonesAudio(); // encima del velo: se pueden tocar en la pausa
  }

  function dibujarFin() {
    velo();
    textoBrillante('FIN DEL JUEGO', W / 2, H * 0.3, 36, COL.enemigos.normal);
    texto('PUNTOS', W / 2, H * 0.4, 14, COL.textoSuave, 500);
    texto(String(J.puntos), W / 2, H * 0.45, 40, COL.texto);
    texto(`Llegaste a la oleada ${J.oleada}` + (J.jefesDerrotados ? `  ·  ${J.jefesDerrotados} jefe(s)` : ''),
      W / 2, H * 0.52, 13, COL.textoSuave, 500);
    if (J.nuevoRecord) textoBrillante('¡NUEVO RÉCORD!', W / 2, H * 0.6, 22, COL.acento);
    else texto(`RÉCORD  ${J.record}`, W / 2, H * 0.6, 16, COL.acento);
    if (J.tiempoMenu > 1) {
      g.save();
      g.globalAlpha = 0.6 + Math.sin(J.tiempoMenu * 4) * 0.4;
      texto(mandoVisible() ? 'PULSA A PARA JUGAR OTRA VEZ' : 'TOCA PARA JUGAR OTRA VEZ', W / 2, H * 0.72, 18, COL.texto);
      g.restore();
      dibujarPildora(MENU_FIN, 'MENÚ');
      resaltarFoco(MENU_FIN);
    }
    dibujarBotonesAudio(); // encima del velo: se pueden tocar aquí también
  }

  function dibujar(dt) {
    g.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.shadowBlur = 0;

    g.save();
    if (J.sacudida > 0 && J.modo !== 'pausa') {
      g.translate(Util.azar(-1, 1) * J.sacudida, Util.azar(-1, 1) * J.sacudida);
    }
    dibujarFondo(J.modo === 'pausa' ? 0 : dt);
    dibujarMundo();
    g.restore();

    if (J.modo === 'menu') {
      dibujarMenu();
      dibujarBotonesAudio();
    } else {
      dibujarHUD();
      if (J.modo === 'pausa') dibujarPausa();
      if (J.modo === 'fin') dibujarFin();
    }
    dibujarPistasMando();
    dibujarAvisoMando();
  }

  // ----------------------------------------------------------- Música
  // Elige la canción según lo que pasa: menú, partida, jefe o final.
  // (Musica cambia de canción al empezar el siguiente compás.)
  function sincronizarMusica() {
    let animo = 'menu';
    if (J.modo === 'fin' || (J.modo !== 'menu' && J.jugador && !J.jugador.vivo)) animo = 'fin';
    else if (J.modo !== 'menu') animo = J.jefe ? 'jefe' : 'juego';
    Musica.animo(animo);
    Musica.pausar(J.modo === 'pausa');
  }

  // ----------------------------------------------------------- Bucle
  // Guarda el récord aunque cierres la pestaña a media partida
  function guardarAlSalir() {
    if (J.puntos > J.record) guardarRecord(J.puntos);
  }

  // Si cambias de pestaña o de ventana, el juego se pausa solo
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (J.modo === 'jugando') J.modo = 'pausa';
    guardarAlSalir();
  });
  window.addEventListener('blur', () => {
    if (J.modo === 'jugando') J.modo = 'pausa';
  });
  window.addEventListener('pagehide', guardarAlSalir);

  let ultimo = null;
  function bucle(ahora) {
    if (ultimo === null) ultimo = ahora;
    let dt = (ahora - ultimo) / 1000;
    ultimo = ahora;
    if (dt < 0) dt = 0;
    if (dt > 1 / 30) dt = 1 / 30; // si el equipo se traba, no hay saltos raros
    leerMando();
    actualizar(dt);
    if (J.avisoMando && (J.avisoMando.t += dt) > 2) J.avisoMando = null;
    sincronizarMusica();
    dibujar(dt);
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  // Para probar desde la consola del navegador: window.NEBULA
  window.NEBULA = J;
})();
