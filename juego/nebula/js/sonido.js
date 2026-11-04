// =============================================================
//  🔊  SONIDO
//  Todos los sonidos se generan con código (no hay archivos de audio).
//  Cambia las frecuencias (números grandes) para que suenen distinto.
//  La música de fondo vive en musica.js y usa este mismo "aparato"
//  de audio, pero con su propio volumen (salidaMusica).
// =============================================================
const Sonido = (() => {
  let ctx = null;
  let maestro = null;      // volumen de los efectos
  let busMusica = null;    // por aquí sale la música (el silencio M también la apaga)
  let bufferRuido = null;
  let silenciado = false;
  let inicioPendiente = false;
  const ultimaVez = {};

  const aj = () => (typeof Datos !== 'undefined' ? Datos.aj : { volMaestro: 1, volEfectos: 1, volMusica: 1 });
  const nivelEfectos = () => CONFIG.audio.volumen * aj().volEfectos * aj().volMaestro;

  try { silenciado = localStorage.getItem('nebula_silencio') === '1'; } catch (e) { /* sin almacenamiento */ }

  // El navegador solo deja sonar audio después de que el jugador toca algo.
  function iniciar() {
    if (ctx) {
      // 'suspended' o 'interrupted' (iOS tras una llamada o cambiar de app)
      if (ctx.state !== 'running' && ctx.state !== 'closed') {
        const pr = ctx.resume();
        if (pr && pr.catch) pr.catch(() => {});
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = nivelEfectos();
    maestro.connect(ctx.destination);
    busMusica = ctx.createGain();
    busMusica.gain.value = silenciado ? 0 : 1;
    busMusica.connect(ctx.destination);
    // El audio tarda un instante en arrancar: si la melodía de inicio
    // se pidió antes, suena en cuanto esté listo.
    ctx.onstatechange = () => {
      if (ctx.state === 'running' && inicioPendiente) {
        inicioPendiente = false;
        melodiaInicio();
      }
    };
  }

  function melodiaInicio() {
    if (!permitido('inicio', 0.3)) return;
    [392, 523, 659, 784].forEach((f, i) => tono(f, 0.12, 'square', 0.06, null, i * 0.08));
  }

  // Evita que un mismo sonido se repita demasiado seguido
  function permitido(nombre, espera) {
    if (!ctx || silenciado || ctx.state !== 'running') return false;
    const t = ctx.currentTime;
    if (ultimaVez[nombre] !== undefined && t - ultimaVez[nombre] < espera) return false;
    ultimaVez[nombre] = t;
    return true;
  }

  function tono(freq, dur, tipo, vol, freqFin, retraso) {
    const t = ctx.currentTime + (retraso || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t + dur);
    g.gain.value = 0; // así no se cuela un "tic" antes de que empiece
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Un segundo de "shhhh" (ruido blanco) que sirve para explosiones y tambores
  function ruidoBuffer() {
    if (!bufferRuido && ctx) {
      bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const datos = bufferRuido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    return bufferRuido;
  }

  function ruido(dur, vol, filtro) {
    const t = ctx.currentTime;
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruidoBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filtro, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(f);
    f.connect(g);
    g.connect(maestro);
    fuente.start(t, 0, Math.min(dur, 1));
  }

  return {
    iniciar,
    // Aplica volúmenes de ajustes (maestro, efectos) y avisa a la música
    aplicarVolumenes() {
      if (ctx && maestro) maestro.gain.setTargetAtTime(nivelEfectos(), ctx.currentTime, 0.03);
      if (typeof Musica !== 'undefined' && Musica.aplicarVolumen) Musica.aplicarVolumen();
    },
    volMusica: () => aj().volMusica * aj().volMaestro,
    suspender(si) {
      if (!ctx) return;
      try { if (si) ctx.suspend(); else if (ctx.state !== 'running') ctx.resume(); } catch (e) { /* nada */ }
    },
    get silenciado() { return silenciado; },

    // Lo que necesita musica.js para sonar con el mismo audio
    contexto: () => ctx,
    salidaMusica: () => busMusica,
    ruidoBuffer,

    alternar() {
      silenciado = !silenciado;
      try { localStorage.setItem('nebula_silencio', silenciado ? '1' : '0'); } catch (e) { /* nada */ }
      // La música también se calla (con un fundido cortito para que no truene)
      if (busMusica) {
        const t = ctx.currentTime;
        busMusica.gain.cancelScheduledValues(t);
        busMusica.gain.setValueAtTime(busMusica.gain.value, t);
        busMusica.gain.linearRampToValueAtTime(silenciado ? 0 : 1, t + 0.08);
      }
      return silenciado;
    },


    clic() { if (permitido('clic', 0.04)) tono(660, 0.05, 'square', 0.04, 880); },
    atras() { if (permitido('atras', 0.04)) tono(440, 0.07, 'square', 0.04, 300); },
    compra() {
      if (!permitido('compra', 0.1)) return;
      [660, 880, 1320].forEach((f, i) => tono(f, 0.1, 'triangle', 0.08, null, i * 0.06));
    },
    logro() {
      if (!permitido('logro', 0.5)) return;
      [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.2, 'triangle', 0.08, null, i * 0.09));
    },
    moneda() { if (permitido('moneda', 0.03)) tono(1320, 0.07, 'square', 0.04, 1760); },
    dash() { if (permitido('dash', 0.1)) tono(300, 0.2, 'sawtooth', 0.06, 1200); },
    escudoOn() { if (permitido('escudoOn', 0.2)) { tono(300, 0.5, 'sine', 0.12, 700); tono(600, 0.5, 'triangle', 0.05, 900); } },
    bomba() {
      if (!permitido('bomba', 0.3)) return;
      ruido(1.1, 0.7, 2600); tono(70, 0.9, 'sine', 0.4, 28);
    },
    rayo() { if (permitido('rayo', 0.3)) { tono(180, 1.4, 'sawtooth', 0.09, 420); tono(360, 1.4, 'square', 0.04, 840); } },
    drones() { if (permitido('drones', 0.3)) [500, 700, 900].forEach((f, i) => tono(f, 0.12, 'triangle', 0.07, null, i * 0.05)); },
    jefe() { if (permitido('jefe', 1)) { tono(110, 1.2, 'sawtooth', 0.14, 55); tono(165, 1.2, 'square', 0.06, 80); } },
    fase() { if (permitido('fase', 0.5)) { ruido(0.6, 0.4, 1800); tono(220, 0.6, 'sawtooth', 0.12, 80); } },
    aviso() { if (permitido('aviso', 0.3)) tono(520, 0.08, 'square', 0.05, 780); },
    graze() { if (permitido('graze', 0.06)) tono(1800, 0.03, 'square', 0.02); },
    carga() { if (permitido('carga', 0.2)) tono(400, 0.5, 'sine', 0.04, 1500); },

    disparo() {
      if (permitido('disparo', 0.05)) tono(880, 0.06, 'square', 0.035, 440);
    },
    disparoEnemigo() {
      if (permitido('disparoEnemigo', 0.08)) tono(320, 0.12, 'sawtooth', 0.04, 140);
    },
    golpe() {
      if (permitido('golpe', 0.04)) tono(180, 0.05, 'square', 0.04, 120);
    },
    explosion(grande) {
      if (!permitido(grande ? 'explosionG' : 'explosion', grande ? 0.1 : 0.03)) return;
      ruido(grande ? 0.9 : 0.3, grande ? 0.6 : 0.25, grande ? 2200 : 1500);
      tono(grande ? 90 : 140, grande ? 0.6 : 0.25, 'sine', grande ? 0.35 : 0.18, 35);
    },
    powerup() {
      if (!permitido('powerup', 0.05)) return;
      tono(523, 0.08, 'square', 0.07);
      tono(659, 0.08, 'square', 0.07, null, 0.07);
      tono(1047, 0.16, 'square', 0.07, null, 0.14);
    },
    escudoRoto() {
      if (permitido('escudo', 0.1)) tono(900, 0.3, 'triangle', 0.15, 200);
    },
    dano() {
      if (!permitido('dano', 0.2)) return;
      tono(240, 0.45, 'sawtooth', 0.15, 50);
      ruido(0.35, 0.3, 1200);
    },
    alarma() {
      if (!permitido('alarma', 1)) return;
      for (let i = 0; i < 3; i++) {
        tono(440, 0.18, 'square', 0.08, null, i * 0.4);
        tono(330, 0.18, 'square', 0.08, null, i * 0.4 + 0.2);
      }
    },
    inicio() {
      if (ctx && ctx.state !== 'running' && !silenciado) {
        inicioPendiente = true;
        return;
      }
      melodiaInicio();
    },
    oleada() {
      if (permitido('oleada', 0.5)) tono(600, 0.25, 'triangle', 0.08, 900);
    },
    finJuego() {
      if (!permitido('fin', 1)) return;
      [523, 440, 349, 262].forEach((f, i) => tono(f, 0.3, 'triangle', 0.1, null, i * 0.22));
    },
    victoria() {
      if (!permitido('victoria', 1)) return;
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(f, 0.15, 'square', 0.07, null, i * 0.1));
    },
  };
})();
