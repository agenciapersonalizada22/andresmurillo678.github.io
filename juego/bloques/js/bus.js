// Mensajero muy sencillo: un módulo avisa ("emitir") y otros escuchan ("en").
export class Bus {
  constructor() { this.mapa = new Map(); }
  en(evento, fn) {
    let l = this.mapa.get(evento);
    if (!l) { l = []; this.mapa.set(evento, l); }
    l.push(fn);
    return () => { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  }
  emitir(evento, datos) {
    const l = this.mapa.get(evento);
    if (!l) return;
    for (const f of l.slice()) { try { f(datos); } catch (e) { console.error(e); } }
  }
}
