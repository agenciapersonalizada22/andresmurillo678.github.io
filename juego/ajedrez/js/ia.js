// =============================================================
//  🧠  IA (puente con el motor)
//  El motor corre en un Web Worker para no congelar la interfaz. Si
//  el worker no se puede crear o falla, se usa el mismo motor en el
//  hilo principal con tiempo y profundidad reducidos (plan B).
// =============================================================
const RUTA = new URL('./motor.js', import.meta.url);

export class IA {
  constructor() {
    this.worker = null;
    this.directo = false;
    this.pendiente = null;   // { id, msg, resolver, rechazar, temporizador }
    this.siguienteId = 1;
    this.listo = false;
    this.motorDirecto = null;
    this._crear();
  }

  _crear() {
    if (this.directo) return;
    try {
      const w = new Worker(RUTA, { type: 'module' });
      w.onmessage = (e) => this._mensaje(e.data);
      w.onerror = (e) => { if (e.preventDefault) e.preventDefault(); this._fallar('error del worker'); };
      w.onmessageerror = () => this._fallar('mensaje ilegible');
      this.worker = w;
      this.listo = false;
      this.espera = setTimeout(() => { if (!this.listo) this._fallar('el worker no arrancó'); }, 15000);
    } catch (e) {
      this._pasarADirecto('no se pudo crear el worker');
    }
  }

  _pasarADirecto(motivo) {
    this.directo = true;
    this.motivo = motivo;
    if (this.worker) { try { this.worker.terminate(); } catch (e) { /* nada */ } this.worker = null; }
    clearTimeout(this.espera);
    console.warn('Motor de ajedrez en el hilo principal:', motivo);
    const p = this.pendiente;
    if (p) { this.pendiente = null; clearTimeout(p.temporizador); this._pedirDirecto(p.msg).then(p.resolver, p.rechazar); }
  }

  _fallar(motivo) {
    this._pasarADirecto(motivo);
  }

  _mensaje(d) {
    if (d.tipo === 'listo') { this.listo = true; clearTimeout(this.espera); return; }
    const p = this.pendiente;
    if (!p || d.id !== p.id) return;
    clearTimeout(p.temporizador);
    this.pendiente = null;
    if (d.tipo === 'error') p.rechazar(new Error(d.texto)); else p.resolver(d);
  }

  // msg: { fen, movs, nivel: {prof,tiempo,ruido,azar,apertura}, ply }
  pedir(msg) {
    this.cancelar();
    const id = this.siguienteId++;
    const m = { tipo: 'pensar', id, ...msg };
    if (this.directo) return this._pedirDirecto(m);
    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => this._fallar('el worker tardó demasiado'), (msg.nivel.tiempo || 1000) + 10000);
      this.pendiente = { id, msg: m, resolver, rechazar, temporizador };
      this.worker.postMessage(m);
    });
  }

  async _pedirDirecto(m) {
    if (!this.motorDirecto) {
      const mod = await import('./motor.js');
      this.motorDirecto = { pensar: mod.pensar, Motor: mod.Motor, motor: new mod.Motor(17) };
    }
    const id = m.id;
    this.idDirecto = id;
    await new Promise((r) => setTimeout(r, 40)); // deja respirar a la interfaz antes de calcular
    if (this.idDirecto !== id) return { cancelado: true, id };
    const nivel = { ...m.nivel, tiempo: Math.min(m.nivel.tiempo || 800, 900), prof: Math.min(m.nivel.prof || 6, 6) };
    return this.motorDirecto.pensar({ ...m, nivel }, this.motorDirecto.motor);
  }

  // Descarta la búsqueda en curso (reinicia el worker porque no se puede interrumpir)
  cancelar() {
    this.idDirecto = -1;
    const p = this.pendiente;
    if (p) {
      clearTimeout(p.temporizador);
      this.pendiente = null;
      p.resolver({ cancelado: true, id: p.id });
      if (this.worker) {
        try { this.worker.terminate(); } catch (e) { /* nada */ }
        this.worker = null;
        this._crear();
      }
    }
  }

  nuevaPartida() {
    if (this.worker && this.listo) this.worker.postMessage({ tipo: 'nueva' });
    else if (this.motorDirecto) this.motorDirecto.motor.nuevoJuego();
  }
}
