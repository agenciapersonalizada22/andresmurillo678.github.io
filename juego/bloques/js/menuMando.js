// =============================================================
//  🎮  MENÚS CON MANDO
//  Mueve un "foco" por los botones de la pantalla abierta (título,
//  pausa, inventario) con la cruceta o el stick izquierdo.
//  A = pulsar el botón con foco · B = volver · LB/RB = pestañas.
//  Navega por posición: elige el botón más cercano en esa dirección.
// =============================================================
const PANTALLAS = ['sinWebgl', 'pantallaTitulo', 'pantallaPausa', 'pantallaInventario'];
const CLASE = 'foco-mando';
const PRIMERA = 0.38;    // segundos hasta que empieza a repetir
const REPETIR = 0.11;    // y luego cada tanto

export class MenuMando {
  constructor() {
    this.pantalla = null;
    this.foco = null;
    this.dir = null;
    this.espera = 0;
  }

  // La pantalla abierta (o null si estás jugando)
  pantallaAbierta() {
    for (const id of PANTALLAS) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('oculto')) return el;
    }
    return null;
  }

  botones(pantalla) {
    const lista = [];
    for (const b of pantalla.querySelectorAll('button')) {
      if (b.disabled || !b.getClientRects().length) continue;
      lista.push(b);
    }
    return lista;
  }

  quitarFoco() {
    if (this.foco) this.foco.classList.remove(CLASE);
    this.foco = null;
  }

  ponerFoco(el, suave = true) {
    if (this.foco && this.foco !== el) this.foco.classList.remove(CLASE);
    this.foco = el;
    if (!el) return;
    el.classList.add(CLASE);
    try { el.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: suave ? 'auto' : 'auto' }); } catch (e) { /* nada */ }
  }

  // Botón con el que empieza cada pantalla
  inicial(pantalla) {
    const lista = this.botones(pantalla);
    if (!lista.length) return null;
    if (pantalla.id === 'pantallaInventario') {
      const rejilla = pantalla.querySelector('#rejillaInventario:not(.oculto) button, #rejillaVehiculos:not(.oculto) button');
      if (rejilla && lista.includes(rejilla)) return rejilla;
    }
    return lista.find((b) => b.classList.contains('principal')) || lista[0];
  }

  // Mueve el foco hacia (dx, dy): el botón más cercano en esa dirección
  mover(pantalla, dx, dy) {
    const lista = this.botones(pantalla);
    if (!lista.length) return;
    if (!this.foco || !lista.includes(this.foco)) { this.ponerFoco(this.inicial(pantalla)); return; }
    const r0 = this.foco.getBoundingClientRect();
    const x0 = r0.left + r0.width / 2, y0 = r0.top + r0.height / 2;
    let mejor = null, puntos = Infinity;
    for (const b of lista) {
      if (b === this.foco) continue;
      const r = b.getBoundingClientRect();
      const ox = r.left + r.width / 2 - x0, oy = r.top + r.height / 2 - y0;
      const along = dx ? ox * dx : oy * dy;
      if (along < 2) continue;
      // si se solapan a lo ancho (o a lo alto) cuenta como "justo enfrente"; si no, penaliza el hueco
      const hueco = dx
        ? Math.max(0, r.top - r0.bottom, r0.top - r.bottom)
        : Math.max(0, r.left - r0.right, r0.left - r.right);
      const centro = Math.abs(dx ? oy : ox);
      const p = along + hueco * 3 + centro * 0.15;
      if (p < puntos) { puntos = p; mejor = b; }
    }
    if (mejor) this.ponerFoco(mejor);
  }

  // M: el lector de mando; a: callbacks { cancelar(), pestana(delta), cerrar() }
  // Devuelve true si este cuadro se usó el mando en los menús.
  actualizar(M, dt, ignorar, a) {
    const pantalla = this.pantallaAbierta();
    if (!pantalla) { this.quitarFoco(); this.pantalla = null; this.dir = null; return false; }
    const nueva = this.pantalla !== pantalla.id;
    if (nueva) { this.pantalla = pantalla.id; this.dir = null; this.quitarFoco(); }
    const pul = (n) => M.pulsado(n) && !ignorar.has(n);

    // dirección: cruceta o stick izquierdo
    let dx = 0, dy = 0;
    if (M.sostenido('IZQ') && !ignorar.has('IZQ')) dx = -1;
    else if (M.sostenido('DER') && !ignorar.has('DER')) dx = 1;
    else if (M.ejes.izq.x < -0.6) dx = -1;
    else if (M.ejes.izq.x > 0.6) dx = 1;
    if (M.sostenido('ARRIBA') && !ignorar.has('ARRIBA')) dy = -1;
    else if (M.sostenido('ABAJO') && !ignorar.has('ABAJO')) dy = 1;
    else if (M.ejes.izq.y < -0.6) dy = -1;
    else if (M.ejes.izq.y > 0.6) dy = 1;
    if (dx && dy) { if (Math.abs(M.ejes.izq.x) > Math.abs(M.ejes.izq.y)) dy = 0; else dx = 0; }
    const clave = dx || dy ? dx + ',' + dy : null;

    if (!this.foco || !this.foco.isConnected || !this.foco.getClientRects().length) this.foco = null;
    const sinFoco = !this.foco;

    if (clave !== this.dir) {
      this.dir = clave;
      this.espera = PRIMERA;
      if (clave) this.mover(pantalla, dx, dy);
    } else if (clave) {
      this.espera -= dt;
      if (this.espera <= 0) { this.espera = REPETIR; this.mover(pantalla, dx, dy); }
    }

    // el primer botón que se aprieta solo muestra el foco (no pulsa nada a ciegas)
    if (sinFoco && !this.foco) {
      this.ponerFoco(this.inicial(pantalla));
      return true;
    }

    if (pul('A') && this.foco) {
      const f = this.foco;
      f.click();
      if (f.isConnected && f.getClientRects().length) f.classList.add(CLASE);
    }
    if (pul('B')) a.cancelar(pantalla.id);
    if (pul('MENU')) a.cerrar(pantalla.id);
    if (pantalla.id === 'pantallaInventario') {
      if (pul('X')) a.cerrar(pantalla.id);
      if (pul('LB')) { a.pestana(-1); this.quitarFoco(); this.ponerFoco(this.inicial(pantalla)); }
      if (pul('RB')) { a.pestana(1); this.quitarFoco(); this.ponerFoco(this.inicial(pantalla)); }
      if (pul('LT')) a.ranura(-1);
      if (pul('RT')) a.ranura(1);
    }
    return true;
  }
}
