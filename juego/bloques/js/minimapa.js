// =============================================================
//  🗺️  MINIMAPA (vista desde arriba alrededor del jugador, norte arriba)
// =============================================================
import { TEXTURA_CARA, DIBUJO, DIBUJO_AGUA, DIBUJO_PLANTA, B } from './bloques.js';
import { LADO, CAPA, ALTO } from './medidas.js';

export class Minimapa {
  constructor(canvas, mundo, promedios) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.mundo = mundo;
    this.prom = promedios;
    this.t = 0;
    this.off = document.createElement('canvas');
    this.off.width = canvas.width; this.off.height = canvas.height;
    this.xo = this.off.getContext('2d');
    this.lleno = this.xo.createImageData(canvas.width, canvas.height);
    this.puntos = [];       // otros jugadores { x, z, color }
  }

  // zoom: bloques por píxel (1 = detallado, 2 = más amplio)
  actualizar(dt, jugador, zoom) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.45;
    const W = this.c.width, H = this.c.height;
    const d = this.lleno.data;
    const m = this.mundo;
    const cx = Math.floor(jugador.x), cz = Math.floor(jugador.z);
    const z0 = zoom || 2;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const wx = cx + Math.round((px - W / 2) * z0), wz = cz + Math.round((py - H / 2) * z0);
        const ch = m.chunks.get(((wx >> 4) + 32768) * 65536 + ((wz >> 4) + 32768));
        const i = (py * W + px) * 4;
        if (!ch) { d[i] = 20; d[i + 1] = 24; d[i + 2] = 22; d[i + 3] = 200; continue; }
        const col = (wz & 15) * LADO + (wx & 15);
        let y = Math.min(ALTO - 1, ch.alturaMax + 1), id = 0, agua = false;
        for (; y >= 0; y--) {
          id = ch.datos[y * CAPA + col];
          if (!id) continue;
          if (DIBUJO[id] === DIBUJO_AGUA) { agua = true; continue; }
          if (DIBUJO[id] === DIBUJO_PLANTA) continue;
          break;
        }
        let r, g, b;
        if (agua) { r = 40; g = 90; b = 170; }
        else {
          const p = this.prom[TEXTURA_CARA[id * 6 + 2]] || [0.3, 0.3, 0.3];
          const sombra = 0.72 + Math.max(-0.25, Math.min(0.3, (y - jugador.y) * 0.012));
          r = p[0] * 255 * sombra; g = p[1] * 255 * sombra; b = p[2] * 255 * sombra;
        }
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 235;
      }
    }
    this.xo.putImageData(this.lleno, 0, 0);
    this.cuerpo = true;
    this.z0 = z0; this.cx = jugador.x; this.cz = jugador.z;
  }

  // Marcas de encima (se llama cada cuadro, barato)
  marcar(yaw) {
    const x = this.x, W = this.c.width, H = this.c.height;
    if (!this.cuerpo) return;
    x.clearRect(0, 0, W, H);
    x.drawImage(this.off, 0, 0);
    for (const p of this.puntos) {
      const px = W / 2 + (p.x - this.cx) / this.z0, py = H / 2 + (p.z - this.cz) / this.z0;
      if (px < 2 || py < 2 || px > W - 2 || py > H - 2) continue;
      x.fillStyle = p.color; x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill();
    }
    x.save();
    x.translate(W / 2, H / 2);
    x.rotate(-yaw);
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, -6); x.lineTo(4, 5); x.lineTo(0, 2); x.lineTo(-4, 5); x.closePath(); x.fill(); x.stroke();
    x.restore();
  }
}
