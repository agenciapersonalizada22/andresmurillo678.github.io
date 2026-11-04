// =============================================================
//  ↗  FLECHAS
//  Capa transparente sobre el tablero: flechas y círculos dibujados
//  por el usuario (clic derecho / stick), flecha de la mejor jugada,
//  pista y premovimiento. Funciona igual con la vista 3D y 2D.
// =============================================================
export class Flechas {
  constructor(contenedor, vista) {
    this.vista = vista;
    this.cv = document.createElement('canvas');
    this.cv.id = 'capaFlechas';
    this.cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
    contenedor.appendChild(this.cv);
    this.contenedor = contenedor;
    this.usuario = [];   // { de, a, color }
    this.fijas = [];     // flechas del programa: { de, a, color, ancho }
    this.vista.alDibujar = () => this.dibujar();
  }

  usarVista(v) { this.vista = v; v.alDibujar = () => this.dibujar(); this.dibujar(); }

  // clic derecho: misma flecha otra vez la quita; de === a es un círculo
  alternar(de, a, color = '#3ddc84') {
    const i = this.usuario.findIndex((f) => f.de === de && f.a === a);
    if (i >= 0) this.usuario.splice(i, 1); else this.usuario.push({ de, a, color });
    this.dibujar(); this.vista.pedir();
  }
  limpiarUsuario() { if (this.usuario.length) { this.usuario = []; this.dibujar(); this.vista.pedir(); } }
  fijar(lista) { this.fijas = lista || []; this.dibujar(); this.vista.pedir(); }

  dibujar() {
    const cv = this.cv, w = this.contenedor.clientWidth, h = this.contenedor.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const g = cv.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, h);
    const todas = [...this.fijas, ...this.usuario];
    if (!todas.length) return;
    for (const f of todas) {
      const A = this.vista.pantallaDe(f.de), c1 = this.vista.pantallaDe(f.de + (f.de < 63 ? 1 : -1));
      const celda = Math.hypot(c1.x - A.x, c1.y - A.y) || 40;
      g.globalAlpha = f.alfa || 0.82; g.strokeStyle = g.fillStyle = f.color;
      if (f.de === f.a) { g.lineWidth = celda * 0.08; g.beginPath(); g.arc(A.x, A.y, celda * 0.46, 0, 7); g.stroke(); continue; }
      const B = this.vista.pantallaDe(f.a);
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const ancho = celda * (f.ancho || 0.17), cab = celda * 0.42;
      g.lineWidth = ancho; g.lineCap = 'round';
      g.beginPath(); g.moveTo(A.x + ux * celda * 0.25, A.y + uy * celda * 0.25); g.lineTo(B.x - ux * cab * 0.7, B.y - uy * cab * 0.7); g.stroke();
      g.beginPath(); g.moveTo(B.x, B.y); g.lineTo(B.x - ux * cab - uy * cab * 0.55, B.y - uy * cab + ux * cab * 0.55); g.lineTo(B.x - ux * cab + uy * cab * 0.55, B.y - uy * cab - ux * cab * 0.55); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }
}
