// =============================================================
//  🔊  SONIDO: motor, claxon, sirena, choques y avisos.
//  Todo se genera con código (no hay archivos de audio).
//  Cambia las frecuencias (números grandes) para que suene distinto.
// =============================================================
const Sonido = (() => {
  let ctx = null;
  let maestro = null;
  let efectos = null;   // volumen de los efectos
  let musica = null;    // a dónde se conecta el radio
  let bufferRuido = null;
  let silenciado = Util.cargar('silencio', false);
  const ultimaVez = {};

  // Sonidos que suenan todo el tiempo (se suben y bajan de volumen)
  let motor = null;
  let sirena = null;
  let claxon = null;
  let chirrido = null;
  let lluvia = null;

  // El navegador solo deja sonar audio después de que el jugador toca algo.
  function iniciar() {
    if (ctx) {
      if (ctx.state !== 'running' && ctx.state !== 'closed') {
        const pr = ctx.resume();
        if (pr && pr.catch) pr.catch(() => {});
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return;
    }
    maestro = ctx.createGain();
    maestro.gain.value = silenciado ? 0 : CONFIG.audio.volumen;
    maestro.connect(ctx.destination);
    efectos = ctx.createGain();
    efectos.gain.value = 1;
    efectos.connect(maestro);
    musica = ctx.createGain();
    musica.gain.value = CONFIG.audio.radio;
    musica.connect(maestro);
    crearContinuos();
  }

  function ruidoBuffer() {
    if (!bufferRuido) {
      bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = bufferRuido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return bufferRuido;
  }

  function crearContinuos() {
    // Motor: dos ondas graves pasando por un filtro
    const m1 = ctx.createOscillator(); m1.type = 'sawtooth'; m1.frequency.value = 50;
    const m2 = ctx.createOscillator(); m2.type = 'square'; m2.frequency.value = 25;
    const mf = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 400; mf.Q.value = 2;
    const mg = ctx.createGain(); mg.gain.value = 0;
    const m2g = ctx.createGain(); m2g.gain.value = 0.6;
    m1.connect(mf); m2.connect(m2g); m2g.connect(mf); mf.connect(mg); mg.connect(efectos);
    m1.start(); m2.start();
    motor = { o1: m1, o2: m2, filtro: mf, gan: mg };

    // Sirena: una onda que sube y baja (wiu-wiu)
    const so = ctx.createOscillator(); so.type = 'square'; so.frequency.value = 800;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.55;
    const lfoG = ctx.createGain(); lfoG.gain.value = 260;
    lfo.connect(lfoG); lfoG.connect(so.frequency);
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1100; sf.Q.value = 0.8;
    const sg = ctx.createGain(); sg.gain.value = 0;
    so.connect(sf); sf.connect(sg); sg.connect(efectos);
    so.start(); lfo.start();
    sirena = { gan: sg };

    // Claxon: dos tonos a la vez
    const c1 = ctx.createOscillator(); c1.type = 'square'; c1.frequency.value = 370;
    const c2 = ctx.createOscillator(); c2.type = 'square'; c2.frequency.value = 466;
    const cf = ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 1800;
    const cg = ctx.createGain(); cg.gain.value = 0;
    c1.connect(cf); c2.connect(cf); cf.connect(cg); cg.connect(efectos);
    c1.start(); c2.start();
    claxon = { gan: cg };

    // Chirrido de llantas: ruido filtrado
    const rs = ctx.createBufferSource(); rs.buffer = ruidoBuffer(); rs.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2200; rf.Q.value = 6;
    const rg = ctx.createGain(); rg.gain.value = 0;
    rs.connect(rf); rf.connect(rg); rg.connect(efectos);
    rs.start();
    chirrido = { gan: rg, filtro: rf };

    // Lluvia: ruido suave y agudo
    const ls = ctx.createBufferSource(); ls.buffer = ruidoBuffer(); ls.loop = true;
    const lf = ctx.createBiquadFilter(); lf.type = 'bandpass'; lf.frequency.value = 3200; lf.Q.value = 0.5;
    const lg = ctx.createGain(); lg.gain.value = 0;
    ls.connect(lf); lf.connect(lg); lg.connect(efectos);
    ls.start();
    lluvia = { gan: lg };
  }

  function listo() { return ctx && ctx.state === 'running'; }

  function permitido(nombre, espera) {
    if (!listo() || silenciado) return false;
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
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(efectos);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function ruido(dur, vol, filtro, tipoFiltro, retraso) {
    const t = ctx.currentTime + (retraso || 0);
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruidoBuffer();
    const f = ctx.createBiquadFilter();
    f.type = tipoFiltro || 'lowpass';
    f.frequency.setValueAtTime(filtro, t);
    if (!tipoFiltro || tipoFiltro === 'lowpass') f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(f);
    f.connect(g);
    g.connect(efectos);
    fuente.start(t, Math.random() * 0.5, Math.min(dur + 0.05, 0.5));
  }

  function suave(param, valor, tiempo) {
    param.setTargetAtTime(valor, ctx.currentTime, tiempo || 0.05);
  }

  return {
    iniciar,
    get ctx() { return ctx; },
    get salidaMusica() { return musica; },
    get listo() { return listo(); },
    get silenciado() { return silenciado; },

    // Cuando la pestaña se esconde (otra pestaña u otra app en el celular)
    // el audio se congela por completo; al volver se reanuda (o con el
    // siguiente toque, si el navegador no deja).
    dormir() {
      if (ctx && ctx.state === 'running') {
        const pr = ctx.suspend();
        if (pr && pr.catch) pr.catch(() => {});
      }
    },
    despertar() {
      if (ctx) iniciar();
    },

    alternarSilencio() {
      silenciado = !silenciado;
      Util.guardar('silencio', silenciado);
      if (maestro) suave(maestro.gain, silenciado ? 0 : CONFIG.audio.volumen, 0.05);
      return silenciado;
    },

    // ---- Sonidos continuos (se llaman cada cuadro)
    // vel01: velocidad de 0 a 1, gas: acelerador de -1 a 1
    actualizarMotor(activo, vel01, gas) {
      if (!motor) return;
      if (!activo) { suave(motor.gan.gain, 0, 0.08); return; }
      // Cambios de "velocidad" (marchas): el tono sube y baja
      const marchas = 4;
      const v = Math.min(0.999, Math.max(0, vel01));
      const marcha = Math.floor(v * marchas);
      const rpm = marcha === 0 ? v * marchas : 0.35 + (v * marchas - marcha) * 0.65;
      const f = 38 + rpm * 70 + marcha * 6;
      suave(motor.o1.frequency, f, 0.04);
      suave(motor.o2.frequency, f / 2, 0.04);
      suave(motor.filtro.frequency, 260 + rpm * 900 + Math.max(0, gas) * 400, 0.05);
      suave(motor.gan.gain, (0.05 + Math.abs(gas) * 0.05 + rpm * 0.03) * CONFIG.audio.motor, 0.06);
    },
    actualizarSirena(volumen) {
      if (sirena) suave(sirena.gan.gain, Util.limitar(volumen, 0, 1) * 0.06, 0.1);
    },
    actualizarClaxon(sonando) {
      if (claxon) suave(claxon.gan.gain, sonando ? 0.07 : 0, 0.015);
    },
    actualizarChirrido(intensidad) {
      if (!chirrido) return;
      const i = Util.limitar(intensidad, 0, 1);
      suave(chirrido.gan.gain, i * 0.05, 0.05);
      suave(chirrido.filtro.frequency, 1800 + i * 900, 0.1);
    },
    actualizarLluvia(intensidad) {
      if (lluvia) suave(lluvia.gan.gain, Util.limitar(intensidad, 0, 1) * 0.07, 0.4);
    },
    callarContinuos() {
      if (!ctx) return;
      this.actualizarLluvia(0);
      this.actualizarMotor(false, 0, 0);
      this.actualizarSirena(0);
      this.actualizarClaxon(false);
      this.actualizarChirrido(0);
    },

    // ---- Efectos cortos
    choque(fuerza) {
      if (!permitido('choque', 0.08)) return;
      ruido(0.25 + fuerza * 0.4, 0.25 + fuerza * 0.45, 900 + fuerza * 2400);
      tono(120, 0.18 + fuerza * 0.2, 'sine', 0.2 + fuerza * 0.25, 45);
      if (fuerza > 0.5) tono(1800, 0.12, 'triangle', 0.05, 900, 0.02);
    },
    disparo(fuerte) {
      if (!permitido('disparo', 0.07)) return;
      ruido(fuerte ? 0.35 : 0.2, fuerte ? 0.6 : 0.45, fuerte ? 2200 : 3200);
      tono(fuerte ? 90 : 140, fuerte ? 0.3 : 0.18, 'square', fuerte ? 0.2 : 0.14, 40);
    },
    vacia() {
      if (permitido('vacia', 0.25)) ruido(0.04, 0.2, 2500, 'bandpass');
    },
    comprar() {
      if (!permitido('comprar', 0.1)) return;
      tono(988, 0.07, 'square', 0.06);
      tono(1319, 0.14, 'square', 0.06, null, 0.07);
    },
    puerta() {
      if (!permitido('puerta', 0.15)) return;
      ruido(0.06, 0.25, 1500, 'bandpass');
      tono(160, 0.08, 'square', 0.08, 90, 0.04);
    },
    ay() {
      if (!permitido('ay', 0.2)) return;
      const base = Util.azar(480, 720);
      tono(base, 0.12, 'triangle', 0.12, base * 1.3);
      tono(base * 1.3, 0.25, 'triangle', 0.12, base * 0.7, 0.1);
    },
    pitoLejano(x, y) {
      const d = J.distanciaACamara(x, y);
      if (d > 800 || !permitido('pito', 0.6)) return;
      const v = 0.06 * (1 - d / 800) + 0.01;
      tono(392, 0.3, 'square', v, null);
      tono(494, 0.3, 'square', v * 0.8, null);
    },
    dinero() {
      if (!permitido('dinero', 0.1)) return;
      tono(1319, 0.08, 'square', 0.06);
      tono(1760, 0.25, 'square', 0.06, null, 0.08);
    },
    mision() {
      if (!permitido('mision', 0.3)) return;
      [523, 659, 784].forEach((f, i) => tono(f, 0.14, 'square', 0.07, null, i * 0.09));
    },
    exito() {
      if (!permitido('exito', 0.5)) return;
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(f, 0.16, 'square', 0.07, null, i * 0.1));
    },
    fallo() {
      if (!permitido('fallo', 0.5)) return;
      [440, 392, 349, 262].forEach((f, i) => tono(f, 0.28, 'triangle', 0.12, null, i * 0.2));
    },
    atrapado() {
      if (!permitido('atrapado', 1)) return;
      [392, 370, 349, 330].forEach((f, i) => tono(f, i === 3 ? 0.8 : 0.3, 'sawtooth', 0.07, i === 3 ? 300 : null, i * 0.3));
    },
    checkpoint() {
      if (permitido('check', 0.1)) tono(880, 0.12, 'square', 0.07, 1320);
    },
    cuenta(final) {
      if (permitido('cuenta' + final, 0.3)) tono(final ? 1046 : 523, final ? 0.4 : 0.15, 'square', 0.08);
    },
    estatica() {
      if (permitido('estatica', 0.05)) ruido(0.18, 0.12, 4000, 'highpass');
    },
    estrella() {
      if (!permitido('estrella', 0.4)) return;
      tono(660, 0.12, 'square', 0.06);
      tono(880, 0.18, 'square', 0.06, null, 0.12);
    },
    averia() {
      if (!permitido('averia', 1)) return;
      tono(220, 0.6, 'sawtooth', 0.12, 50);
      ruido(0.5, 0.25, 1200);
    },
    reparar() {
      if (!permitido('reparar', 0.5)) return;
      for (let i = 0; i < 4; i++) ruido(0.05, 0.2, 3000, 'bandpass', i * 0.12);
      [659, 880, 1175].forEach((f, i) => tono(f, 0.15, 'square', 0.06, null, 0.5 + i * 0.1));
    },
  };
})();
