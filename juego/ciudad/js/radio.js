// =============================================================
//  📻  RADIO DEL CARRO: música generada con código, en vivo.
//  Cada estación tiene su estilo. Un "programador" va dejando
//  listas las notas un poquito antes de que suenen, para que el
//  ritmo nunca se atrase.
//  Para cambiar una estación: mueve el bpm (velocidad), los
//  acordes (numeros MIDI: 45 = La, 48 = Do...) o los volúmenes.
// =============================================================
const Radio = (() => {
  const estaciones = [
    { nombre: 'RADIO NEÓN', frecuencia: '88.5 FM', color: '#ff3d81', estilo: 'neon', bpm: 100 },
    { nombre: 'RITMO LATINO', frecuencia: '101.3 FM', color: '#ffb13d', estilo: 'latino', bpm: 96 },
    { nombre: 'CHIP FM', frecuencia: '106.9 FM', color: '#3df5ff', estilo: 'chip', bpm: 132 },
    { nombre: 'LO-FI NOCHE', frecuencia: '90.1 FM', color: '#9a8cff', estilo: 'neon', bpm: 78, prog: [{ r: 50, m: true }, { r: 46 }, { r: 48 }, { r: 45, m: true }] },
    { nombre: 'ROCK CITY', frecuencia: '97.7 FM', color: '#ff4b4b', estilo: 'chip', bpm: 124, prog: [{ r: 45, m: true }, { r: 43 }, { r: 41 }, { r: 43 }] },
    { nombre: 'SALSA 24', frecuencia: '103.1 FM', color: '#7dff6b', estilo: 'latino', bpm: 108, prog: [{ r: 50, m: true }, { r: 43 }, { r: 48 }, { r: 45 }] },
  ];
  // Acordes de cada estación: r = nota raíz (MIDI), m = menor
  const PROGRESIONES = {
    neon: [{ r: 45, m: true }, { r: 41 }, { r: 48 }, { r: 43 }],    // Lam  Fa  Do  Sol
    latino: [{ r: 45, m: true }, { r: 41 }, { r: 43 }, { r: 40 }],  // Lam  Fa  Sol Mi
    chip: [{ r: 48 }, { r: 43 }, { r: 45, m: true }, { r: 41 }],    // Do   Sol Lam Fa
  };

  let actual = Util.cargar('radio', 0); // -1 = apagado
  if (typeof actual !== 'number' || actual < -1 || actual >= estaciones.length) actual = 0;
  let encendido = false;   // ¿debe sonar? (estás en un carro)
  let temporizador = null;
  let paso = 0;
  let tSiguiente = 0;
  let ctx = null;
  let salida = null, filtro = null, envioEco = null, ruidoBuf = null, pulso = null;
  const motivos = {};
  const PROG_BASE = {};
  for (const k in PROGRESIONES) PROG_BASE[k] = PROGRESIONES[k];

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function preparar() {
    ctx = Sonido.ctx;
    if (!ctx || !Sonido.salidaMusica) return false;
    if (salida) return true;
    salida = ctx.createGain();
    salida.gain.value = 0;
    filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 18000;
    salida.connect(filtro);
    filtro.connect(Sonido.salidaMusica);
    // Eco (delay con retroalimentación)
    envioEco = ctx.createGain();
    envioEco.gain.value = 1;
    const eco = ctx.createDelay(1.5);
    eco.delayTime.value = 0.42;
    const vuelta = ctx.createGain();
    vuelta.gain.value = 0.3;
    envioEco.connect(eco);
    eco.connect(vuelta);
    vuelta.connect(eco);
    vuelta.connect(salida);
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Onda de "pulso" estilo consola de 8 bits
    const n = 32;
    const real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      real[k] = Math.sin(2 * Math.PI * k * 0.25) / (Math.PI * k);
      imag[k] = (1 - Math.cos(2 * Math.PI * k * 0.25)) / (Math.PI * k);
    }
    pulso = ctx.createPeriodicWave(real, imag);
    return true;
  }

  // ----------------------------------------------------------- Instrumentos
  function nota(t, f, dur, op) {
    const o = ctx.createOscillator();
    if (op.tipo === 'pulso') o.setPeriodicWave(pulso);
    else o.type = op.tipo || 'square';
    o.frequency.setValueAtTime(f, t);
    if (op.desliza) o.frequency.exponentialRampToValueAtTime(op.desliza, t + dur * 0.6);
    if (op.desafina) o.detune.value = op.desafina;
    const g = ctx.createGain();
    const vol = op.vol || 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (op.ataque || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let ultimo = o;
    if (op.filtro) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = op.filtro;
      fl.Q.value = op.q || 1;
      o.connect(fl);
      ultimo = fl;
    }
    ultimo.connect(g);
    g.connect(salida);
    if (op.eco) {
      const ge = ctx.createGain();
      ge.gain.value = op.eco;
      g.connect(ge);
      ge.connect(envioEco);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function pad(t, frecuencias, dur, vol, corte) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = corte;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.35);
    g.gain.setValueAtTime(vol, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    fl.connect(g);
    g.connect(salida);
    for (const f of frecuencias) {
      for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(fl);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }

  function ruido(t, dur, vol, tipoFiltro, frec, q) {
    const s = ctx.createBufferSource();
    s.buffer = ruidoBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = tipoFiltro;
    fl.frequency.value = frec;
    fl.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(salida);
    s.start(t, Math.random() * 0.8, dur + 0.05);
  }

  function bombo(t, vol, tipo) {
    const o = ctx.createOscillator();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(tipo ? 220 : 150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g);
    g.connect(salida);
    o.start(t);
    o.stop(t + 0.35);
  }

  function tarola(t, vol, frec) {
    ruido(t, 0.16, vol, 'bandpass', frec || 1800, 0.7);
    nota(t, 190, 0.09, { tipo: 'triangle', vol: vol * 0.5 });
  }

  // Melodía que cambia cada 8 compases (pero siempre igual para la misma frase)
  function motivo(estilo, frase) {
    const clave = estilo + frase;
    if (motivos[clave]) return motivos[clave];
    const r = Util.crearAleatorio(frase * 7919 + estilo.length * 31 + 5);
    const pasos = [];
    for (let s = 0; s < 32; s++) {
      const p = s % 4 === 0 ? 0.75 : (s % 2 === 0 ? 0.4 : 0.14);
      pasos.push(r() < p ? { grado: Math.floor(r() * 5), largo: r() < 0.3 ? 3 : 1.4 } : null);
    }
    motivos[clave] = pasos;
    return pasos;
  }

  function tonosAcorde(a) { return a.m ? [0, 3, 7] : [0, 4, 7]; }
  function notaDeGrado(a, grado) {
    const tri = tonosAcorde(a);
    return [tri[0], tri[1], tri[2], 12, 12 + tri[1]][grado];
  }

  // ----------------------------------------------------------- Estilos
  function tocarNeon(n, t, dp) {
    const compas = Math.floor(n / 16), s = n % 16;
    const a = PROGRESIONES.neon[compas % 4];
    const tri = tonosAcorde(a);
    if (s % 4 === 0) bombo(t, 0.85);
    if (s === 4 || s === 12) tarola(t, 0.4);
    if (s % 2 === 1) ruido(t, 0.04, 0.1, 'highpass', 7500);
    if (s === 14) ruido(t, 0.25, 0.06, 'highpass', 6500);
    if (s % 2 === 0) nota(t, mtof(a.r + 12 + (s % 4 === 2 ? 12 : 0)), dp * 1.8, { tipo: 'sawtooth', vol: 0.13, filtro: 900, q: 3 });
    if (s === 0) pad(t, tri.map((i) => mtof(a.r + 24 + i)), dp * 16, 0.028, 1500);
    const arp = [0, tri[1], tri[2], 12][s % 4];
    nota(t, mtof(a.r + 36 + arp), dp * 0.9, { tipo: 'square', vol: 0.022, filtro: 2400, eco: 0.5 });
    if (compas % 8 >= 4) {
      const m = motivo('neon', Math.floor(compas / 8))[(compas % 2) * 16 + s];
      if (m) nota(t, mtof(a.r + 48 + notaDeGrado(a, m.grado)), dp * m.largo, { tipo: 'sawtooth', vol: 0.05, filtro: 2800, eco: 0.45, ataque: 0.02 });
    }
  }

  function tocarLatino(n, t, dp) {
    const compas = Math.floor(n / 16), s = n % 16;
    const a = PROGRESIONES.latino[compas % 4];
    const tri = tonosAcorde(a);
    if (s % 4 === 0) bombo(t, 0.8);
    if (s === 3 || s === 6 || s === 11 || s === 14) tarola(t, 0.32, 2600);
    ruido(t, 0.05, s % 2 ? 0.035 : 0.07, 'highpass', 6000);
    if (s % 4 === 2) ruido(t, 0.12, 0.05, 'bandpass', 3200, 4);
    const bajo = { 0: 0, 6: 0, 8: 7, 14: 12 };
    if (bajo[s] !== undefined) {
      const f = mtof(a.r + 12 + bajo[s]);
      nota(t, f * 1.03, s === 0 ? dp * 3 : dp * 1.6, { tipo: 'square', vol: 0.11, filtro: 650, desliza: f });
    }
    if ([2, 5, 7, 10, 13, 15].includes(s)) {
      for (const i of tri) nota(t, mtof(a.r + 36 + i), dp * 0.8, { tipo: 'triangle', vol: 0.045 });
    }
    if (compas % 8 >= 2) {
      const m = motivo('latino', Math.floor(compas / 8))[(compas % 2) * 16 + s];
      if (m) {
        const f = mtof(a.r + 48 + notaDeGrado(a, m.grado));
        nota(t, f, dp * 1.6, { tipo: 'triangle', vol: 0.09, eco: 0.3 });
        nota(t, f * 4, dp * 0.5, { tipo: 'sine', vol: 0.02 });
      }
    }
  }

  function tocarChip(n, t, dp) {
    const compas = Math.floor(n / 16), s = n % 16;
    const a = PROGRESIONES.chip[compas % 4];
    const tri = tonosAcorde(a);
    if (s % 8 === 0 || s === 10) bombo(t, 0.6, 'triangle');
    if (s === 4 || s === 12) ruido(t, 0.1, 0.18, 'highpass', 1500);
    if (s % 2 === 0) ruido(t, 0.02, 0.05, 'highpass', 8000);
    if (s % 2 === 0) nota(t, mtof(a.r + 12 + (s % 4 === 0 ? 0 : 12)), dp * 1.7, { tipo: 'triangle', vol: 0.16 });
    nota(t, mtof(a.r + 48 + tri[s % 3]), dp * 0.7, { tipo: 'pulso', vol: 0.025 });
    const m = motivo('chip', Math.floor(compas / 8))[(compas % 2) * 16 + s];
    if (m && compas % 8 !== 0) nota(t, mtof(a.r + 48 + notaDeGrado(a, m.grado)), dp * m.largo, { tipo: 'square', vol: 0.045, filtro: 3500 });
  }

  const TOCAR = { neon: tocarNeon, latino: tocarLatino, chip: tocarChip };

  // ----------------------------------------------------------- Programador
  function programar() {
    if (!ctx || actual < 0) return;
    const e = estaciones[actual];
    const dp = 60 / e.bpm / 4;
    if (tSiguiente < ctx.currentTime - 0.2) tSiguiente = ctx.currentTime + 0.05;
    PROGRESIONES[e.estilo] = e.prog || PROG_BASE[e.estilo];
    while (tSiguiente < ctx.currentTime + 0.12) {
      TOCAR[e.estilo](paso, tSiguiente, dp);
      paso++;
      tSiguiente += dp;
    }
  }

  function arrancar() {
    if (!preparar() || actual < 0) return;
    if (!temporizador) {
      paso = 0;
      tSiguiente = ctx.currentTime + 0.08;
      temporizador = setInterval(programar, 25);
    }
    salida.gain.cancelScheduledValues(ctx.currentTime);
    salida.gain.setTargetAtTime(1, ctx.currentTime, 0.15);
  }

  function detener() {
    if (!salida) return;
    salida.gain.cancelScheduledValues(ctx.currentTime);
    salida.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  return {
    estaciones,
    get estacion() { return actual >= 0 ? estaciones[actual] : null; },
    get encendido() { return encendido; },
    get sonando() { return !!temporizador; },

    // Se llama al subir al carro
    encender() {
      encendido = true;
      arrancar();
    },
    // Se llama al bajar del carro
    apagar() {
      encendido = false;
      detener();
    },
    // Cambia de estación: NEÓN → LATINO → CHIP → apagado → NEÓN...
    // Elige una estación por número (-1 = apagado)
    elegir(i) {
      actual = i < 0 || i >= estaciones.length ? -1 : i;
      Util.guardar('radio', actual);
      if (temporizador) { clearInterval(temporizador); temporizador = null; }
      if (encendido && actual >= 0) arrancar(); else detener();
      return this.estacion;
    },
    get indice() { return actual; },
    siguiente() {
      actual = actual + 1 >= estaciones.length ? -1 : actual + 1;
      Util.guardar('radio', actual);
      Sonido.estatica();
      if (temporizador) { clearInterval(temporizador); temporizador = null; }
      if (encendido && actual >= 0) arrancar();
      else detener();
      return this.estacion;
    },
    // Sonido "apagado" (como escuchar desde afuera) en pausa o en el mapa
    amortiguar(si) {
      if (!filtro) return;
      filtro.frequency.setTargetAtTime(si ? 500 : 18000, ctx.currentTime, 0.1);
    },
    // Por si el audio se activó después de subir al carro
    revisar() {
      if (encendido && actual >= 0 && !temporizador && Sonido.listo) arrancar();
    },
  };
})();
