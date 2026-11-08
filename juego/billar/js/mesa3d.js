// Construccion de la escena 3D: mesa, bolas, taco, texturas por canvas. Mapeo fisica->3D: (x, y, z_arriba) -> (x, z, -y).
import * as THREE from '../lib/three.module.min.js';

export const COLORES_BOLA = { 1: '#f2c500', 2: '#1e4fc0', 3: '#d62c2c', 4: '#5b2a90', 5: '#ee7a14', 6: '#138a3c', 7: '#7b1f1f', 8: '#111111' };
export const COLORES_DALTO = { 1: '#F0E442', 2: '#0072B2', 3: '#D55E00', 4: '#CC79A7', 5: '#E69F00', 6: '#009E73', 7: '#6b3b1e', 8: '#111111' };
export const colorBola = (id, dalto) => (dalto ? COLORES_DALTO : COLORES_BOLA)[id > 8 ? id - 8 : id] || '#fff';
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function texturaBola(id, modo, dalto) {
  const c = lienzo(256, 128), g = c.getContext('2d');
  const carom = modo === 'carambola';
  let base = '#f4f1e8';
  if (carom) base = id === 0 ? '#f6f6f2' : id === 1 ? '#f3d21a' : '#d3252b';
  else if (id > 0 && id <= 8) base = colorBola(id, dalto);
  g.fillStyle = id > 8 ? '#f4f1e8' : base; g.fillRect(0, 0, 256, 128);
  if (id > 8) { g.fillStyle = colorBola(id, dalto); g.fillRect(0, 34, 256, 60); }
  const disco = (u, v, r, txt, col) => {
    g.fillStyle = '#fdfdf8'; g.beginPath(); g.arc(u * 256, v * 128, r, 0, 7); g.fill();
    if (txt) { g.fillStyle = col || '#111'; g.font = `800 ${Math.round(r * 1.25)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, u * 256, v * 128 + r * 0.06); }
  };
  if (!carom && id > 0) { const r = dalto ? 20 : 15; for (const u of [0.25, 0.75]) disco(u, 0.5, r, String(id)); }
  else if (!carom) { g.fillStyle = '#c0392b'; for (const [u, v] of [[0.25, 0.5], [0.75, 0.5], [0.5, 0.12], [0.5, 0.88]]) { g.beginPath(); g.arc(u * 256, v * 128, 5, 0, 7); g.fill(); } }
  else { g.fillStyle = id === 2 ? '#fff' : '#222'; for (const u of [0.25, 0.75]) { g.beginPath(); g.arc(u * 256, 64, 5, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function texturaTela(geo, tema) {
  const pxm = 360, pad = 0.12, W = Math.round((geo.L + pad) * pxm), H = Math.round((geo.W + pad) * pxm);
  const c = lienzo(W, H), g = c.getContext('2d');
  g.fillStyle = tema.tela; g.fillRect(0, 0, W, H);
  const n = g.getImageData(0, 0, W, H), d = n.data;
  let s = 12345;
  for (let i = 0; i < d.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const k = ((s >>> 24) - 128) * 0.1; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  g.putImageData(n, 0, 0);
  const X = (x) => (x + geo.L / 2 + pad / 2) * pxm, Y = (y) => (geo.W / 2 + pad / 2 - y) * pxm;
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.fillStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
  if (geo.conTroneras) {
    g.beginPath(); g.moveTo(X(-geo.L / 4), Y(-geo.hy)); g.lineTo(X(-geo.L / 4), Y(geo.hy)); g.stroke();
    for (const x of [-geo.L / 4, 0, geo.L / 4]) { g.beginPath(); g.arc(X(x), Y(0), 4, 0, 7); g.fill(); }
  } else for (const [x, y] of [[-geo.L / 4, 0], [geo.L / 4, 0], [0, 0]]) { g.beginPath(); g.arc(X(x), Y(y), 4, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { t, w: geo.L + pad, h: geo.W + pad };
}

const P = (x, y, z = 0) => new THREE.Vector3(x, z, -y);

export function construirMesa(geo, tema, cal) {
  const g = new THREE.Group(), liberar = [];
  const mat = (o) => { const m = cal.simple ? new THREE.MeshLambertMaterial({ color: o.color, map: o.map || null }) : new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o }); liberar.push(m); return m; };
  const caja = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = !cal.simple; b.receiveShadow = true; g.add(b); liberar.push(b.geometry); return b; };
  const tt = texturaTela(geo, tema);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(tt.w, tt.h), mat({ map: tt.t, color: 0xffffff, roughness: 1 }));
  tela.rotation.x = -Math.PI / 2; tela.receiveShadow = true; g.add(tela); liberar.push(tela.geometry, tt.t);
  const madera = mat({ color: tema.borde, roughness: 0.4, metalness: 0.05 }), cojin = mat({ color: tema.cojin, roughness: 0.9 });
  const cu = 0.052, ba = 0.11, alt = 0.045, hx = geo.hx, hy = geo.hy;
  const largo = hx + cu + ba, ancho = hy + cu + ba;
  // cojines siguiendo los segmentos de banda
  for (const s of geo.segs) {
    const horiz = Math.abs(s.ny) === 1, len = Math.hypot(s.bx - s.ax, s.by - s.ay);
    const mx = (s.ax + s.bx) / 2 - s.nx * cu / 2, my = (s.ay + s.by) / 2 - s.ny * cu / 2;
    const m = caja(horiz ? len : cu, 0.04, horiz ? cu : len, cojin, mx, 0.02, -my);
    m.position.y = 0.02;
  }
  if (geo.conTroneras) {
    const gap = 0.095;
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
      const l = largo - gap, cx = sx * (gap + l / 2);
      caja(l, alt, ba, madera, cx, alt / 2, -sy * (hy + cu + ba / 2));
    }
    for (const sx of [-1, 1]) caja(ba, alt, 2 * ancho, madera, sx * (hx + cu + ba / 2), alt / 2, 0);
    const negro = new THREE.MeshBasicMaterial({ color: 0x050505 }); liberar.push(negro);
    geo.tron.forEach((p, i) => {
      const lado = p[0] === 0;
      const d = new THREE.Mesh(new THREE.CircleGeometry(lado ? 0.056 : 0.064, 24), negro);
      d.rotation.x = -Math.PI / 2;
      const ox = lado ? 0 : Math.sign(p[0]) * 0.045, oy = Math.sign(p[1]) * (lado ? 0.075 : 0.045);
      d.position.copy(P(p[0] + ox, p[1] + oy, alt + 0.002)); g.add(d); liberar.push(d.geometry);
    });
  } else {
    for (const sy of [-1, 1]) caja(2 * largo, alt, ba, madera, 0, alt / 2, -sy * (hy + cu + ba / 2));
    for (const sx of [-1, 1]) caja(ba, alt, 2 * hy + 2 * cu, madera, sx * (hx + cu + ba / 2), alt / 2, 0);
  }
  // diamantes
  const perla = new THREE.MeshBasicMaterial({ color: tema.brillo || 0xf0e6c8 }); liberar.push(perla);
  const diam = (x, y) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 8), perla); d.rotation.x = -Math.PI / 2; d.position.copy(P(x, y, alt + 0.002)); g.add(d); liberar.push(d.geometry); };
  for (let k = -3; k <= 3; k++) { if (geo.conTroneras && k === 0) continue; for (const sy of [-1, 1]) diam(k * geo.L / 8, sy * (hy + cu + ba / 2)); }
  for (let k = -1; k <= 1; k++) for (const sx of [-1, 1]) diam(sx * (hx + cu + ba / 2), k * geo.W / 4);
  // patas, faldon y suelo
  const faldon = mat({ color: tema.borde, roughness: 0.5 });
  caja(2 * largo - 0.2, 0.14, 2 * ancho - 0.2, faldon, 0, -0.1, 0);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 12), faldon); p.position.set(sx * (largo - 0.2), -0.45, sy * (ancho - 0.2)); p.castShadow = !cal.simple; g.add(p); liberar.push(p.geometry); }
  const sueloTex = lienzo(64, 64), sg = sueloTex.getContext('2d'); sg.fillStyle = '#1b1612'; sg.fillRect(0, 0, 64, 64); sg.fillStyle = '#221b15'; for (let i = 0; i < 8; i++) sg.fillRect(0, i * 8, 64, 4);
  const st = new THREE.CanvasTexture(sueloTex); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(12, 12); st.colorSpace = THREE.SRGBColorSpace; liberar.push(st);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshLambertMaterial({ map: st })); liberar.push(suelo.material, suelo.geometry);
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.86; suelo.receiveShadow = true; g.add(suelo);
  return { group: g, liberar: () => liberar.forEach((x) => x.dispose && x.dispose()) };
}

export function construirTaco(tacoDef) {
  const grupo = new THREE.Group(), tilt = new THREE.Group(), L = 1.45;
  const parte = (r0, r1, l, x, color, rough = 0.4) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, l, 14), new THREE.MeshStandardMaterial({ color, roughness: rough }));
    m.rotation.z = Math.PI / 2; m.position.x = x + l / 2; tilt.add(m); return m;
  };
  parte(0.0065, 0.0065, 0.012, 0, tacoDef.punta, 0.9);
  parte(0.0067, 0.0072, 0.025, 0.012, '#f4f1e8');
  parte(0.0072, 0.0115, 0.62, 0.037, tacoDef.color);
  parte(0.0115, 0.0155, 0.33, 0.657, '#1a1a1a', 0.7);
  parte(0.0155, 0.0158, 0.46, 0.987, tacoDef.color);
  tilt.rotation.z = 0.06; grupo.add(tilt);
  grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return grupo;
}

export function entornoReflejos(renderer) {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x182030);
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshBasicMaterial({ color: 0x232a3a, side: THREE.BackSide })); sc.add(esfera);
  const lampara = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); lampara.position.set(0, 7, 0); lampara.rotation.x = Math.PI / 2; sc.add(lampara);
  const pm = new THREE.PMREMGenerator(renderer), r = pm.fromScene(sc, 0.04); pm.dispose();
  sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return r.texture;
}
export { THREE };
