// Reparto de la pantalla en zonas por jugador (rot = pi para quien se sienta enfrente). Puro: sin DOM.
export function repartir(n, W, H, modo = 'auto') {
  const R = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot, cx: x + w / 2, cy: y + h / 2 });
  const vert = modo === 'enfrentados' || (modo === 'auto' && H >= W);
  if (n <= 1) return [R(0, 0, W, H)];
  if (n === 2) return vert ? [R(0, H / 2, W, H / 2), R(0, 0, W, H / 2, Math.PI)] : [R(0, 0, W / 2, H), R(W / 2, 0, W / 2, H)];
  if (vert) {
    if (n === 3) return [R(0, H / 2, W / 2, H / 2), R(W / 2, H / 2, W / 2, H / 2), R(0, 0, W, H / 2, Math.PI)];
    return [R(0, H / 2, W / 2, H / 2), R(W / 2, H / 2, W / 2, H / 2), R(W / 2, 0, W / 2, H / 2, Math.PI), R(0, 0, W / 2, H / 2, Math.PI)];
  }
  return Array.from({ length: n }, (_, i) => R(i * W / n, 0, W / n, H));
}
export const zonaEn = (zs, x, y) => {
  let mejor = -1, md = 1e18;
  zs.forEach((z, i) => { const dx = Math.max(z.x - x, 0, x - (z.x + z.w)), dy = Math.max(z.y - y, 0, y - (z.y + z.h)); const d = dx * dx + dy * dy; if (d < md) { md = d; mejor = i; } });
  return mejor;
};
