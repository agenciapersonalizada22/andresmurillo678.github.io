// =============================================================
//  🎵  MÚSICA DE FONDO
//  Toda la música se toca con código (WebAudio): no hay archivos.
//  Hay 4 "ánimos" que cambian solos según lo que pase en el juego:
//    menu  → tranquila: colchón de acordes y un arpegio suave
//    juego → synthwave: batería, bajo, arpegio, acordes y melodía
//    jefe  → más rápida y más oscura
//    fin   → lenta y calmada (cuando pierdes)
//  Los cambios esperan al inicio del siguiente compás, así la
//  canción nunca se corta a la mitad.
//
//  ¿Cómo se lleva el ritmo? Cada 25 milésimas de segundo se mira el
//  reloj del audio y se dejan "apuntadas" las notas de los próximos
//  0.12 segundos. El audio las toca justo a tiempo aunque el juego
//  se trabe un poquito.
//
//  Las notas usan números MIDI: 60 = Do, 62 = Re, 64 = Mi, 65 = Fa,
//  67 = Sol, 69 = La, 71 = Si, 72 = Do (una octava arriba)...
//  Cambia los números de las melodías para inventar las tuyas.
// =============================================================
const Musica = (() => {
  const ADELANTO = 0.12;   // segundos que se programan por adelantado
  const INTERVALO = 25;    // cada cuántos milisegundos se revisa el reloj
  const PASOS = 16;        // un compás tiene 16 pasos (semicorcheas)
  // Todos los instrumentos juntos suenan mucho más fuerte que un disparo.
  // Este número baja la música para que CONFIG.musica.volumen y
  // CONFIG.audio.volumen se puedan comparar: con el mismo número, música y
  // efectos suenan parecido; con 0.25 contra 0.35 la música queda debajo
  // de los efectos (y los disparos y explosiones se oyen bien).
  const NIVEL = 0.18;

  let activa = CONFIG.musica.activa !== false;
  try {
    const guardado = localStorage.getItem('nebula_musica');
    if (guardado !== null) activa = guardado === '1';
  } catch (e) { /* sin almacenamiento */ }

  let ctx = null;
  let nodos = null;          // mezcla, eco y volumen (se crean una sola vez)
  let voces = new Set();     // lo que está sonando (para poder cortarlo al pausar)

  let reloj = null;          // el setInterval del programador
  let enMarcha = false;      // ¿ya se están programando notas?
  let pausada = false;
  let oculta = document.hidden;

  let actual = 'menu';       // ánimo que suena ahora
  let pendiente = null;      // ánimo que entra al empezar el siguiente compás
  let paso = 0;              // 0..15 dentro del compás
  let compas = 0;            // compases desde que empezó este ánimo
  let proximaNota = 0;       // segundo (del reloj de audio) del siguiente paso
  let pasosProgramados = 0;  // contador para las pruebas
  let variacion = 0;         // cambia el arpegio en cada vuelta de la canción

  let transp = 0;       // semitonos que se sube/baja la canción según el mundo
  let tempoMul = 1;
  const frec = (midi) => 440 * Math.pow(2, (midi + transp - 69) / 12);
  const tempoBase = () => (CONFIG.musica.tempo || 112) * tempoMul;

  // ----------------------------------------------------------- Acordes
  // "bajo" es la nota grave y "notas" las del colchón (todo en La menor)
  const ACORDES = {
    Am:    { bajo: 45, notas: [57, 60, 64] },
    F:     { bajo: 41, notas: [57, 60, 65] },
    C:     { bajo: 48, notas: [55, 60, 64] },
    G:     { bajo: 43, notas: [55, 59, 62] },
    Em:    { bajo: 40, notas: [55, 59, 64] },
    Dm:    { bajo: 38, notas: [57, 62, 65] },
    E:     { bajo: 40, notas: [56, 59, 64] },
    Bb:    { bajo: 46, notas: [58, 62, 65] },
    Am7:   { bajo: 45, notas: [57, 60, 64, 67] },
    Fmaj7: { bajo: 41, notas: [53, 57, 60, 64] },
    Em7:   { bajo: 40, notas: [52, 55, 59, 62] },
    Dm7:   { bajo: 38, notas: [50, 53, 57, 60] },
  };

  // La nota número i del acorde, subiendo de octava cuando se acaban
  function tono(ac, i) {
    const n = ac.notas;
    return n[i % n.length] + 12 * (1 + Math.floor(i / n.length));
  }

  // Formas de arpegio: qué nota del acorde suena en cada paso (-1 = silencio)
  const ARPEGIOS = [
    [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],        // sube
    [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 1, 3, 2, 1, 2],        // sube y baja
    [3, 2, 1, 0, 2, 1, 0, 1, 3, 2, 1, 0, 2, 1, 0, 1],        // baja
    [0, -1, 2, -1, 1, -1, 3, -1, 0, -1, 2, -1, 1, 3, 2, 1],  // con huecos
  ];

  // Melodías: [paso, nota, cuántos pasos dura]. Una lista por compás.
  const MELODIA_A = [
    [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 76, 4]], // Am
    [[0, 72, 4], [4, 69, 2], [6, 72, 2], [8, 76, 4], [12, 74, 4]],              // F
    [[0, 76, 4], [4, 79, 4], [8, 76, 2], [10, 74, 2], [12, 72, 4]],             // C
    [[0, 74, 6], [6, 71, 2], [8, 74, 2], [10, 67, 2], [12, 71, 4]],             // G
  ];
  const MELODIA_B = [
    [[0, 72, 2], [2, 77, 2], [4, 81, 4], [8, 79, 4], [12, 77, 2], [14, 76, 2]], // F
    [[0, 74, 4], [4, 79, 4], [8, 74, 2], [10, 76, 2], [12, 79, 4]],             // G
    [[0, 76, 6], [6, 79, 2], [8, 71, 4], [12, 76, 2], [14, 74, 2]],             // Em
    [[0, 72, 4], [4, 71, 2], [6, 72, 2], [8, 69, 8]],                           // Am
  ];
  const MELODIA_JEFE = [
    [[0, 69, 2], [2, 64, 2], [4, 69, 2], [6, 71, 2], [8, 72, 4], [12, 71, 2], [14, 69, 2]], // Am
    [[0, 70, 4], [4, 74, 2], [6, 77, 2], [8, 74, 4], [12, 70, 2], [14, 69, 2]],             // Bb
    [[0, 69, 2], [2, 74, 2], [4, 77, 4], [8, 76, 2], [10, 74, 2], [12, 72, 2], [14, 74, 2]], // Dm
    [[0, 71, 4], [4, 68, 4], [8, 64, 2], [10, 68, 2], [12, 71, 2], [14, 74, 2]],            // E
  ];
  const MELODIA_MENU = [ // campanitas
    [[0, 76, 6], [6, 74, 2], [8, 72, 8]],  // Am7
    [[0, 69, 6], [6, 72, 2], [8, 76, 8]],  // Fmaj7
    [[0, 79, 6], [6, 76, 2], [8, 72, 8]],  // C
    [[0, 74, 6], [6, 71, 2], [8, 67, 8]],  // G
  ];

  function tocarMelodia(lista, p, t, d, instrumento) {
    for (const [cuando, nota, largo] of lista) {
      if (cuando === p) instrumento(t, nota, largo * d);
    }
  }

  // ----------------------------------------------------------- Instrumentos
  // Cada nota tiene su "envolvente" (sube y baja suave) para que no truene.

  function arrancar(fuente, t, fin, desde) {
    fuente.start(t, desde || 0);
    fuente.stop(fin);
    voces.add(fuente);
    fuente.onended = () => voces.delete(fuente);
  }

  // Un control de volumen que empieza en 0. (Si empezara en 1, la primera
  // muestra de cada nota podría colarse a todo volumen y sonar "tic".)
  function ganancia() {
    const g = ctx.createGain();
    g.gain.value = 0;
    return g;
  }

  function filtro(tipo, frecuencia, q) {
    const f = ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = frecuencia;
    f.Q.value = q || 0.7;
    return f;
  }

  // Ganancia con golpe rápido y caída suave (para sonidos cortos)
  function golpeSuave(t, vol, caida) {
    const g = ganancia();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + caida);
    return g;
  }

  function bombo(t, vol) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    const g = golpeSuave(t, vol, 0.36);
    o.connect(g);
    g.connect(nodos.mezcla);
    arrancar(o, t, t + 0.38);
  }

  function ruidoFiltrado(t, vol, caida, tipo, frecuencia, q) {
    const r = ctx.createBufferSource();
    r.buffer = Sonido.ruidoBuffer();
    const f = filtro(tipo, frecuencia, q);
    const g = golpeSuave(t, vol, caida);
    r.connect(f);
    f.connect(g);
    g.connect(nodos.mezcla);
    arrancar(r, t, t + caida + 0.02, Math.random() * 0.5);
  }

  // Caja (tarola): ruido filtrado + un "cuerpo" grave cortito
  function caja(t, vol) {
    ruidoFiltrado(t, vol, 0.2, 'bandpass', 2000, 0.7);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const g = golpeSuave(t, vol * 0.7, 0.1);
    o.connect(g);
    g.connect(nodos.mezcla);
    arrancar(o, t, t + 0.12);
  }

  function platillo(t, vol, abierto) {
    ruidoFiltrado(t, vol * 1.3, abierto ? 0.22 : 0.045, 'highpass', 6500, 0.7);
  }

  function crash(t, vol) {
    ruidoFiltrado(t, vol, 1.3, 'highpass', 4500, 0.5);
  }

  // Bajo: onda de sierra con un filtro que se abre al golpe y se cierra
  function bajo(t, midi, dur, vol, brillo) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = frec(midi);
    const f = filtro('lowpass', 200, 3);
    f.frequency.setValueAtTime(220, t);
    f.frequency.exponentialRampToValueAtTime(550 + brillo, t + 0.012);
    f.frequency.exponentialRampToValueAtTime(220, t + Math.max(0.06, dur));
    const g = ganancia();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + Math.max(0.03, dur * 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    o.connect(f);
    f.connect(g);
    g.connect(nodos.mezcla);
    arrancar(o, t, t + dur + 0.06);
  }

  // Bajo suave y redondo (para el menú y el final)
  function bajoSuave(t, midi, dur, vol) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = frec(midi);
    const g = ganancia();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.15);
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.3);
    o.connect(g);
    g.connect(nodos.mezcla);
    arrancar(o, t, t + dur + 0.32);
  }

  // Arpegio: notitas cortas (onda cuadrada o triangular) con eco
  function pulso(t, midi, dur, vol, tipo, corte) {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.value = frec(midi);
    const f = filtro('lowpass', corte, 1);
    const fin = dur * 1.6;
    const g = golpeSuave(t, vol, fin);
    o.connect(f);
    f.connect(g);
    g.connect(nodos.mezcla);
    g.connect(nodos.eco);
    arrancar(o, t, t + fin + 0.02);
  }

  // Colchón: el acorde completo, suave y largo (dos sierras desafinadas por nota)
  function colchon(t, notas, dur, vol, corte) {
    const f = filtro('lowpass', corte * 0.6, 0.8);
    f.frequency.setValueAtTime(corte * 0.6, t);
    f.frequency.linearRampToValueAtTime(corte, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(corte * 0.7, t + dur);
    const g = ganancia();
    const ataque = Math.min(0.5, dur * 0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    f.connect(g);
    g.connect(nodos.mezcla);
    for (const n of notas) {
      for (const desafino of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = frec(n);
        o.detune.value = desafino;
        o.connect(f);
        arrancar(o, t, t + dur + 0.65);
      }
    }
  }

  // Melodía: sierra + triangular con un vibrato suave
  function voz(t, midi, dur, vol, corte) {
    const f = filtro('lowpass', corte, 1.2);
    const g = ganancia();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.linearRampToValueAtTime(vol * 0.7, t + 0.15);
    g.gain.setValueAtTime(vol * 0.7, t + Math.max(0.15, dur));
    g.gain.linearRampToValueAtTime(0, t + Math.max(0.15, dur) + 0.12);
    const fin = t + Math.max(0.15, dur) + 0.14;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const profundidad = ctx.createGain();
    profundidad.gain.setValueAtTime(0, t);
    profundidad.gain.linearRampToValueAtTime(10, t + 0.3);
    lfo.connect(profundidad);
    arrancar(lfo, t, fin);

    for (const [tipo, mezcla] of [['sawtooth', 0.5], ['triangle', 1]]) {
      const o = ctx.createOscillator();
      o.type = tipo;
      o.frequency.value = frec(midi);
      profundidad.connect(o.detune);
      const m = ctx.createGain();
      m.gain.value = mezcla;
      o.connect(m);
      m.connect(f);
      arrancar(o, t, fin);
    }
    f.connect(g);
    g.connect(nodos.mezcla);
    g.connect(nodos.eco);
  }

  // Campanita: una onda que "mueve" a otra (FM) y se apaga despacio
  function campana(t, midi, dur, vol) {
    const f0 = frec(midi);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f0;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = f0 * 3.5;
    const indice = ctx.createGain();
    indice.gain.setValueAtTime(f0 * 1.2, t);
    indice.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
    mod.connect(indice);
    indice.connect(o.frequency);
    const g = golpeSuave(t, vol, dur);
    o.connect(g);
    g.connect(nodos.mezcla);
    g.connect(nodos.eco);
    arrancar(o, t, t + dur + 0.02);
    arrancar(mod, t, t + dur + 0.02);
  }

  // Redoble de caja que anuncia un cambio de canción
  function redoble(t, p) {
    caja(t, 0.1 + (p - 12) * 0.05);
  }

  // ----------------------------------------------------------- Ánimos
  // Cada ánimo dice su tempo y qué tocar en cada paso del compás.
  const ANIMOS = {
    menu: {
      tempo: () => tempoBase() * 0.8,
      tocar(p, c, t, d) {
        const vuelta = c % 8;
        const ac = ACORDES[['Am7', 'Fmaj7', 'C', 'G'][vuelta % 4]];
        if (p === 0) {
          colchon(t, ac.notas, d * PASOS, 0.03, 1300);
          bajoSuave(t, ac.bajo, d * PASOS, 0.07);
        }
        if (p % 2 === 0) {
          const arp = [0, 1, 2, 3, 4, 3, 2, 1][p / 2];
          pulso(t, tono(ac, arp), d * 3, 0.07, 'triangle', 3500);
        }
        if (p % 4 === 2) platillo(t, 0.015, false);
        if (vuelta >= 4) tocarMelodia(MELODIA_MENU[vuelta % 4], p, t, d, (tt, n, l) => campana(tt, n, l + 0.6, 0.06));
      },
    },

    // Synthwave en La menor. La canción da vueltas de 16 compases:
    //   A (4) → A con melodía (4) → B (4) → respiro y subida (4)
    juego: {
      tempo: () => tempoBase(),
      tocar(p, c, t, d) {
        const vuelta = c % 16;
        const seccion = Math.floor(vuelta / 4);    // 0 A, 1 A+melodía, 2 B, 3 respiro
        const k = vuelta % 4;
        const ac = ACORDES[(seccion === 2 ? ['F', 'G', 'Em', 'Am'] : ['Am', 'F', 'C', 'G'])[k]];
        const respiro = seccion === 3 && k < 2;    // sin bombo ni caja
        const cuatro = seccion >= 2;               // bombo en cada tiempo
        const final = k === 3 && p >= 12 && (seccion === 1 || seccion === 3);

        if (vuelta === 0 && p === 0) variacion = Math.floor(Math.random() * ARPEGIOS.length);
        if (p === 0 && (k === 0 || (seccion === 3 && k === 2))) crash(t, 0.06);

        // Batería
        if (!respiro) {
          if (p % 4 === 0 && (cuatro || p % 8 === 0)) bombo(t, 0.6);
          if (!cuatro && p === 10 && k % 2 === 1) bombo(t, 0.4);
          if (final) redoble(t, p);
          else if (p === 4 || p === 12) caja(t, 0.3);
        }
        if (seccion === 2) platillo(t, p % 4 === 2 ? 0.06 : 0.03, p === 6 || p === 14);
        else if (p % 2 === 0) platillo(t, (p % 4 === 2 ? 0.055 : 0.03) * (respiro ? 0.6 : 1), false);

        // Bajo
        if (respiro) {
          if (p === 0 || p === 8) bajo(t, ac.bajo, d * 7.5, 0.15, 150);
        } else if (seccion === 2) {
          const q = p % 4; // galope: ta-tata
          if (q !== 1) bajo(t, ac.bajo + (q === 2 ? 12 : 0), d * 0.9, 0.16, 500);
        } else if (p % 2 === 0) {
          bajo(t, ac.bajo + (p % 4 === 2 ? 12 : 0), d * 1.8, 0.16, 400);
        }

        // Arpegio
        const forma = ARPEGIOS[seccion === 2 ? 1 : (variacion + seccion) % ARPEGIOS.length];
        if (forma[p] >= 0) pulso(t, tono(ac, forma[p]), d * 0.9, 0.055, 'square', respiro ? 1600 : 3000);

        // Acordes y melodía
        if (p === 0) colchon(t, ac.notas, d * PASOS, seccion === 3 ? 0.045 : 0.032, seccion === 3 ? 1900 : 1500);
        if (seccion === 1) tocarMelodia(MELODIA_A[k], p, t, d, (tt, n, l) => voz(tt, n, l, 0.085, 2600));
        if (seccion === 2) tocarMelodia(MELODIA_B[k], p, t, d, (tt, n, l) => voz(tt, n, l, 0.085, 2800));
      },
    },

    // Jefe: más rápido, oscuro (Am - Am - F - E - Am - Sib - Rem - E)
    jefe: {
      tempo: () => tempoBase() * 1.18,
      tocar(p, c, t, d) {
        const vuelta = c % 8;
        const ac = ACORDES[['Am', 'Am', 'F', 'E', 'Am', 'Bb', 'Dm', 'E'][vuelta]];
        const segunda = vuelta >= 4;

        if (p === 0 && vuelta % 4 === 0) crash(t, 0.06);
        if (p % 4 === 0) bombo(t, 0.65);
        if (p === 14 && vuelta % 2 === 1) bombo(t, 0.4);
        if (vuelta === 7 && p >= 12) redoble(t, p);
        else if (p === 4 || p === 12) caja(t, 0.3);
        platillo(t, p % 4 === 2 ? 0.06 : 0.025, segunda && p % 4 === 2);

        bajo(t, ac.bajo + (p % 8 === 6 ? 12 : 0), d * 0.8, 0.15, 650);
        pulso(t, tono(ac, ARPEGIOS[segunda ? 2 : 0][p]), d * 0.8, 0.045, 'square', 2200);
        if (p === 0) colchon(t, ac.notas, d * PASOS, 0.032, 1000);
        if (segunda) tocarMelodia(MELODIA_JEFE[vuelta - 4], p, t, d, (tt, n, l) => voz(tt, n, l, 0.085, 2300));
      },
    },

    // Fin: lenta, Fa - Mim - Rem - Lam, con campanitas
    fin: {
      tempo: () => tempoBase() * 0.62,
      tocar(p, c, t, d) {
        const ac = ACORDES[['Fmaj7', 'Em7', 'Dm7', 'Am7'][c % 4]];
        if (p === 0) {
          colchon(t, ac.notas, d * PASOS, 0.028, 1100);
          bajoSuave(t, ac.bajo, d * PASOS, 0.06);
        }
        if (p % 4 === 0) campana(t, tono(ac, [3, 2, 1, 2][p / 4]), d * 6, 0.05);
      },
    },
  };

  // ----------------------------------------------------------- Mezcla
  function crearNodos() {
    const mezcla = ctx.createGain();
    // Un compresor suave evita que se sature cuando todo suena junto
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -14;
    compresor.knee.value = 12;
    compresor.ratio.value = 3;
    compresor.attack.value = 0.006;
    compresor.release.value = 0.2;
    const volumen = ctx.createGain();
    volumen.gain.value = 0;
    mezcla.connect(compresor);
    compresor.connect(volumen);
    volumen.connect(Sonido.salidaMusica() || ctx.destination);

    // Eco (delay) que se repite y se va apagando: da el toque "synthwave"
    const eco = ctx.createGain();
    eco.gain.value = 0.35;
    const retardo = ctx.createDelay(1.5);
    retardo.delayTime.value = 0.4;
    const filtroEco = filtro('lowpass', 2200, 0.7);
    const repeticion = ctx.createGain();
    repeticion.gain.value = 0.3;
    eco.connect(retardo);
    retardo.connect(filtroEco);
    filtroEco.connect(repeticion);
    repeticion.connect(retardo);
    filtroEco.connect(mezcla);

    nodos = { mezcla, volumen, eco, retardo };
  }

  const nivelMusica = () => CONFIG.musica.volumen * NIVEL * Sonido.volMusica();

  function duracionPaso() {
    return 60 / ANIMOS[actual].tempo() / 4;
  }

  function cambiarYa(nombre) {
    actual = nombre;
    pendiente = null;
    compas = 0;
    paso = 0;
    variacion = Math.floor(Math.random() * ARPEGIOS.length);
    if (nodos) {
      // El eco se repite cada 3 pasos (corchea con puntillo)
      nodos.retardo.delayTime.setTargetAtTime(Math.min(1.4, duracionPaso() * 3), ctx.currentTime, 0.05);
    }
  }

  function fundir(valor, segundos) {
    const v = nodos.volumen.gain;
    const t = ctx.currentTime;
    v.cancelScheduledValues(t);
    v.setValueAtTime(v.value, t);
    v.linearRampToValueAtTime(valor, t + segundos);
  }

  // ----------------------------------------------------------- Programador
  function programar() {
    ctx = Sonido.contexto();
    if (!ctx || ctx.state !== 'running') {
      // (en iPhone el audio se "interrumpe" con llamadas o al cambiar de app)
      // Se retoma desde el inicio del compás cuando vuelva.
      if (enMarcha) apagar();
      return;
    }
    if (!nodos) crearNodos();
    if (!enMarcha) {
      enMarcha = true;
      if (pendiente) cambiarYa(pendiente);
      else nodos.retardo.delayTime.setValueAtTime(Math.min(1.4, duracionPaso() * 3), ctx.currentTime);
      paso = 0; // al volver de una pausa se repite el compás desde el principio
      proximaNota = ctx.currentTime + 0.06;
      fundir(nivelMusica(), 0.3);
    }
    // Si la compu se trabó mucho, no intentamos tocar todo lo atrasado de golpe
    if (proximaNota < ctx.currentTime) proximaNota = ctx.currentTime + 0.02;

    while (proximaNota < ctx.currentTime + ADELANTO) {
      if (paso === 0 && pendiente) cambiarYa(pendiente);
      const d = duracionPaso();
      ANIMOS[actual].tocar(paso, compas, proximaNota, d);
      // Si viene la canción de juego o del jefe, un redoble la anuncia
      if (pendiente && pendiente !== 'fin' && pendiente !== 'menu' && actual !== 'jefe' && paso >= 12) {
        redoble(proximaNota, paso);
      }
      pasosProgramados++;
      proximaNota += d;
      paso++;
      if (paso === PASOS) {
        paso = 0;
        compas++;
      }
    }
  }

  // Corta todo con un fundido rapidito
  function apagar() {
    if (!nodos || !ctx) {
      enMarcha = false;
      return;
    }
    if (enMarcha) fundir(0, 0.1);
    enMarcha = false;
    const t = ctx.currentTime;
    for (const f of voces) {
      try { f.stop(t + 0.12); } catch (e) { /* ya estaba parada */ }
    }
    voces = new Set();
  }

  function debeSonar() {
    return activa && !pausada && !oculta && !Sonido.silenciado && !!Sonido.contexto();
  }

  // Prende o apaga el programador según cómo esté todo
  function revisar() {
    const debe = debeSonar();
    if (debe && reloj === null) {
      reloj = setInterval(programar, INTERVALO);
      programar();
    } else if (!debe && reloj !== null) {
      clearInterval(reloj);
      reloj = null;
      apagar();
    }
  }

  // Pestaña escondida: no programamos nada (el navegador frena los relojes)
  document.addEventListener('visibilitychange', () => {
    oculta = document.hidden;
    revisar();
  });

  // ----------------------------------------------------------- Lo que usa el juego
  return {
    get activa() { return activa; },

    // Cada mundo suena con otra tonalidad y velocidad
    mundo(transposicion, tempo) { transp = transposicion || 0; tempoMul = tempo || 1; },
    aplicarVolumen() { if (nodos && enMarcha) fundir(nivelMusica(), 0.1); },


    // Pide un ánimo: 'menu', 'juego', 'jefe' o 'fin'.
    // Se puede llamar en cada cuadro: solo hace algo cuando cambia.
    animo(nombre) {
      if (!ANIMOS[nombre]) return;
      if (nombre === actual) pendiente = null;
      else if (!enMarcha) cambiarYa(nombre); // si no está sonando, cambia de una vez
      else pendiente = nombre;
      revisar();
    },

    pausar(si) {
      pausada = !!si;
      revisar();
    },

    alternar() {
      activa = !activa;
      try { localStorage.setItem('nebula_musica', activa ? '1' : '0'); } catch (e) { /* nada */ }
      revisar();
      return activa;
    },

    // Para pruebas desde la consola: Musica.estado()
    estado() {
      return {
        activa,
        pausada,
        oculta,
        silenciada: Sonido.silenciado,
        programando: reloj !== null,
        enMarcha,
        animo: actual,
        pendiente,
        compas,
        paso,
        tempo: Math.round(ANIMOS[actual].tempo()),
        pasosProgramados,
        voces: voces.size,
        audio: ctx ? ctx.state : 'sin iniciar',
      };
    },
  };
})();
