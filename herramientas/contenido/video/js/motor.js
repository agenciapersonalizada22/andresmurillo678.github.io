/* Motor de reproduccion en tiempo real (reloj de audio) y mezcla del proyecto. VE.Motor / VE.mezclaProyecto */
(function (g) {
  var M = g.VE.modelo, Z = g.VE.mezcla, F = g.VE.fuentes;
  var SR = 48000;
  const tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };

  /* Mezcla todo el audio del proyecto (clips de audio + audio de clips de video) por ventanas para no bloquear */
  g.VE.mezclaProyecto = async function (p, sr, alProgreso, cancelado) {
    sr = sr || SR; var dur = M.duracion(p), clips = [];
    p.pistas.forEach(function (pt) { if (pt.mute) return; pt.clips.forEach(function (c) { if ((c.tipo === 'audio' || c.tipo === 'video') && c.medio && !c.cong) clips.push(c); }); });
    for (var i = 0; i < clips.length; i++) { await F.audio(clips[i].medio); if (cancelado && cancelado()) return null; }
    var n = Math.round(dur * sr), L = new Float32Array(n), R = new Float32Array(n), cache = {}, V = 4;
    for (var t0 = 0; t0 < dur; t0 += V) {
      var d = Math.min(V, dur - t0), r = Z.mezclar({ clips: clips, obtener: function (id) { return F.audioSync(id); }, sr: sr, ini: t0, dur: d, cache: cache });
      var o = Math.round(t0 * sr); L.set(r[0].subarray(0, Math.min(r[0].length, n - o)), o); R.set(r[1].subarray(0, Math.min(r[1].length, n - o)), o);
      if (alProgreso) alProgreso(Math.min(1, (t0 + d) / dur)); await tick(); if (cancelado && cancelado()) return null;
    }
    return { sr: sr, L: L, R: R, dur: dur };
  };
  function claveAudio(p) {
    return JSON.stringify(M.todos(p).filter(function (c) { return c.tipo === 'audio' || c.tipo === 'video'; }).map(function (c) { return [M.buscar(p, c.id).pista.mute, c.id, c.medio, c.ini, c.dur, c.off, c.vel, c.inv, c.vol, c.mute, c.fi, c.fo, c.tono, c.cong]; }));
  }

  function Motor(app) { this.app = app; this.t = 0; this.jugando = false; this.base = 0; this.mezcla = null; this.claveMezcla = null; this.fuente = null; this.gan = null; this.raf = 0; this.vol = 1; this.bucle = false; }
  Motor.prototype.duracion = function () { return M.duracion(this.app.p); };
  Motor.prototype.ctx = function () {
    var ac = F.ctxAudio(); if (!this.gan) { this.gan = ac.createGain(); this.gan.connect(ac.destination); } this.gan.gain.value = this.vol; return ac;
  };
  Motor.prototype.prepararAudio = async function () {
    var k = claveAudio(this.app.p); if (this.claveMezcla === k && this.mezcla) return;
    this.app.estado('Preparando audio…');
    var m = await g.VE.mezclaProyecto(this.app.p, SR, null, null); this.claveMezcla = k;
    if (m && m.dur > 0) { var ac = this.ctx(), b = ac.createBuffer(2, m.L.length, SR); b.copyToChannel(m.L, 0); b.copyToChannel(m.R, 1); this.mezcla = b; } else this.mezcla = null;
    this.app.estado('');
  };
  Motor.prototype.invalidar = function () { this.claveMezcla = null; };
  Motor.prototype.iniciarAudio = function () {
    this.detenerAudio(); if (!this.mezcla) return;
    var ac = this.ctx(); if (ac.state === 'suspended') ac.resume();
    var s = ac.createBufferSource(); s.buffer = this.mezcla; s.connect(this.gan); this.base = ac.currentTime - this.t;
    if (this.t < this.mezcla.duration) s.start(0, this.t); this.fuente = s;
  };
  Motor.prototype.detenerAudio = function () { if (this.fuente) { try { this.fuente.stop(); } catch (e) {} try { this.fuente.disconnect(); } catch (e) {} this.fuente = null; } };
  Motor.prototype.reproducir = async function () {
    if (this.jugando) return; var dur = this.duracion(); if (dur <= 0) return;
    if (this.t >= dur - 0.05) this.t = 0;
    this.jugando = true; this.app.alCambiarReproduccion(true);
    await this.prepararAudio(); if (!this.jugando) return;
    var ac = this.ctx(); if (ac.state === 'suspended') await ac.resume();
    this.iniciarAudio(); this.base = ac.currentTime - this.t; var self = this;
    (function paso() {
      if (!self.jugando) return;
      var ac2 = F.ctxAudio(); self.t = ac2.currentTime - self.base; var d = self.duracion();
      if (self.t >= d) { if (self.bucle) { self.t = 0; self.iniciarAudio(); } else { self.t = d; self.pausar(); self.app.dibujar(); return; } }
      self.app.sincronizarVideo(self.t); self.app.dibujar(); self.app.alTiempo(self.t);
      self.raf = requestAnimationFrame(paso);
    })();
  };
  Motor.prototype.pausar = function () {
    this.jugando = false; cancelAnimationFrame(this.raf); this.detenerAudio(); F.pausarTodos(); this.app.alCambiarReproduccion(false);
  };
  Motor.prototype.alternar = function () { if (this.jugando) this.pausar(); else this.reproducir(); };
  Motor.prototype.ir = function (t) {
    this.t = Math.max(0, Math.min(Math.max(t, 0), Math.max(this.duracion(), 0.0001) + 0.0)); 
    if (this.jugando) { this.iniciarAudio(); this.base = F.ctxAudio().currentTime - this.t; }
    this.app.alTiempo(this.t); this.app.buscarYDibujar();
  };
  g.VE.Motor = Motor; g.VE.SR = SR;
})(window);
