// Construccion: paredes, pisos, rampas y techos en rejilla (4 x 3 m), cada pieza = 3x3 baldosas instanciadas (permite edicion rapida).
import * as THREE from '../lib/three.module.min.js';
export const CW = 4, CH = 3, TW = CW / 3, PEND = Math.atan2(3, 4), CAP = 4500;
export const MATS = { madera: { c: 0xb98a52, hp: 150, n: 'Madera' }, piedra: { c: 0x9a9aa0, hp: 300, n: 'Piedra' }, metal: { c: 0x7ea3c8, hp: 450, n: 'Metal' } };
export const NOMBRE_PIEZA = { p: 'Pared', s: 'Piso', r: 'Rampa', t: 'Techo' };
export const clave = (t, gx, gy, gz, d) => t + '|' + gx + '|' + gy + '|' + gz + '|' + d;
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ejeY = new THREE.Vector3(0, 1, 0), ejeX = new THREE.Vector3(1, 0, 0);

/* baldosa (i columna, j fila) de una pieza: centro, tamano y giro */
export function baldosa(p, i, j) {
  const { t, gx, gy, gz, d } = p, x0 = gx * CW, z0 = gz * CW, y0 = gy * CH;
  if (t === 'p') return d === 0 ? { x: x0 + (i + 0.5) * TW, y: y0 + j + 0.5, z: z0, sx: TW, sy: 1, sz: 0.3, yaw: 0, pit: 0 } : { x: x0, y: y0 + j + 0.5, z: z0 + (i + 0.5) * TW, sx: 0.3, sy: 1, sz: TW, yaw: 0, pit: 0 };
  if (t === 's' || t === 't') { const up = t === 't' && i === 1 && j === 1 ? 0.9 : 0; return { x: x0 + (i + 0.5) * TW, y: y0 - 0.15 + up, z: z0 + (j + 0.5) * TW, sx: TW, sy: 0.3, sz: TW, yaw: 0, pit: 0 }; }
  const a = (i + 0.5) * TW, s = (j + 0.5) * TW, y = y0 + s * 0.75;
  const [x, z] = d === 0 ? [x0 + a, z0 + s] : d === 1 ? [x0 + s, z0 + a] : d === 2 ? [x0 + a, z0 + CW - s] : [x0 + CW - s, z0 + a];
  return { x, y, z, sx: TW, sy: 0.3, sz: TW * 1.25, yaw: d * Math.PI / 2, pit: -PEND };
}
/* baldosa bajo un punto (indice j*3+i) o -1 y altura de su cara superior */
function enPieza(p, x, z) {
  const u = x - p.gx * CW, v = z - p.gz * CW;
  if (u < 0 || v < 0 || u > CW || v > CW) return null;
  const c3 = (q) => Math.min(2, Math.max(0, Math.floor(q / TW)));
  if (p.t === 'r') {
    const [s, a] = p.d === 0 ? [v, u] : p.d === 1 ? [u, v] : p.d === 2 ? [CW - v, u] : [CW - u, v];
    return { idx: c3(s) * 3 + c3(a), top: p.gy * CH + s * 0.75 };
  }
  const i = c3(u), j = c3(v);
  return { idx: j * 3 + i, top: p.gy * CH + (p.t === 't' && i === 1 && j === 1 ? 0.9 : 0) };
}

export function crearConstruccion(escena) {
  const piezas = new Map(), celdas = new Map(), meshes = {}, libres = {}, alto = {}, tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), unit = new THREE.BoxGeometry(1, 1, 1);
  for (const m in MATS) {
    const im = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ color: 0xffffff }), CAP); im.count = 0; im.frustumCulled = false; im.castShadow = im.receiveShadow = true;
    escena.add(im); meshes[m] = im; libres[m] = []; alto[m] = 0;
  }
  const gm = new THREE.InstancedMesh(unit, new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.4, depthWrite: false }), 9); gm.visible = false; gm.frustumCulled = false; escena.add(gm);
  const cel = (gx, gz) => gx + ',' + gz;
  const compMat = (b, o) => { qa.setFromAxisAngle(ejeY, b.yaw); qb.setFromAxisAngle(ejeX, b.pit); qa.multiply(qb); return o.compose(new THREE.Vector3(b.x, b.y, b.z), qa, new THREE.Vector3(b.sx, b.sy, b.sz)); };
  const tinte = (p) => 0.5 + 0.5 * (p.hp / p.max);
  function ponerTile(p, n) {
    if (p.slots[n] >= 0) return true;
    const L = libres[p.mat], mesh = meshes[p.mat]; let s;
    if (L.length) s = L.pop(); else if (alto[p.mat] < CAP) s = alto[p.mat]++; else return false;
    compMat(baldosa(p, n % 3, (n / 3) | 0), tmpM); mesh.setMatrixAt(s, tmpM); mesh.setColorAt(s, tmpC.setHex(MATS[p.mat].c).multiplyScalar(tinte(p)));
    p.slots[n] = s; mesh.count = alto[p.mat]; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; return true;
  }
  function quitarTile(p, n) {
    const s = p.slots[n]; if (s < 0) return; const mesh = meshes[p.mat];
    mesh.setMatrixAt(s, tmpM.makeScale(0, 0, 0)); mesh.instanceMatrix.needsUpdate = true; libres[p.mat].push(s); p.slots[n] = -1;
  }
  function colorear(p) { const mesh = meshes[p.mat]; for (let n = 0; n < 9; n++) if (p.slots[n] >= 0) mesh.setColorAt(p.slots[n], tmpC.setHex(MATS[p.mat].c).multiplyScalar(tinte(p))); if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  const C = {
    piezas, meshes,
    get cantidad() { return piezas.size; },
    poner(t, gx, gy, gz, d, mat, dueno, hp, mask) {
      if (t !== 'r' && t !== 'p') d = 0; if (t === 'p') d = d ? 1 : 0;
      const k = clave(t, gx, gy, gz, d); if (piezas.has(k)) return null;
      const p = { k, t, gx, gy, gz, d, mat, max: MATS[mat].hp, hp: hp || MATS[mat].hp, mask: mask == null ? 511 : mask, slots: new Array(9).fill(-1), dueno };
      for (let n = 0; n < 9; n++) if (p.mask & (1 << n)) if (!ponerTile(p, n)) { for (let m = 0; m < n; m++) quitarTile(p, m); return null; }
      piezas.set(k, p); const ck = cel(gx, gz); let l = celdas.get(ck); if (!l) celdas.set(ck, l = []); l.push(p); return p;
    },
    quitar(p) { for (let n = 0; n < 9; n++) quitarTile(p, n); piezas.delete(p.k); const l = celdas.get(cel(p.gx, p.gz)); if (l) l.splice(l.indexOf(p), 1); },
    danar(k, dmg) { const p = piezas.get(k); if (!p) return null; p.hp -= dmg; if (p.hp <= 0) { C.quitar(p); return { p, destruida: true }; } colorear(p); return { p, destruida: false }; },
    editar(p, mask) { p.mask = mask; for (let n = 0; n < 9; n++) { if (mask & (1 << n)) ponerTile(p, n); else quitarTile(p, n); } if (!mask) C.quitar(p); },
    limpiar() { [...piezas.values()].forEach((p) => C.quitar(p)); },
    lista() { return [...piezas.values()].map((p) => [p.t, p.gx, p.gy, p.gz, p.d, p.mat, Math.round(p.hp), p.mask]); },
    suelo(x, z, yPrev) {
      let best = -1e9; const l = celdas.get(cel(Math.floor(x / CW), Math.floor(z / CW)));
      if (l) for (const p of l) { if (p.t === 'p') continue; const e = enPieza(p, x, z); if (e && (p.mask >> e.idx & 1) && e.top <= yPrev + 0.7 && e.top > best) best = e.top; }
      return best;
    },
    bloquea(x, y, z, r, h) {
      const cx = Math.floor(x / CW), cz = Math.floor(z / CW);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = celdas.get(cel(cx + a, cz + b)); if (!l) continue;
        for (const p of l) {
          if (p.t === 'p') {
            const top = (p.gy + 1) * CH, bot = p.gy * CH; if (!(top > y + 0.7 && bot < y + h)) continue;
            for (let n = 0; n < 9; n++) if (p.mask >> n & 1) { const t = baldosa(p, n % 3, (n / 3) | 0); if (Math.abs(x - t.x) < t.sx / 2 + r && Math.abs(z - t.z) < t.sz / 2 + r && t.y + 0.5 > y + 0.7 && t.y - 0.5 < y + h) return true; }
          } else if (a === 0 && b === 0) {
            const e = enPieza(p, Math.min(p.gx * CW + CW, Math.max(p.gx * CW, x)), Math.min(p.gz * CW + CW, Math.max(p.gz * CW, z)));
            if (e && (p.mask >> e.idx & 1) && e.top > y + 0.7 && e.top - (p.t === 'r' ? 0.5 : 0.3) < y + h) return true;
          }
        }
      }
      return false;
    },
    golpe(x, y, z) {
      const cx = Math.floor(x / CW), cz = Math.floor(z / CW);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = celdas.get(cel(cx + a, cz + b)); if (!l) continue;
        for (const p of l) {
          if (p.t === 'p') {
            if (y < p.gy * CH || y > (p.gy + 1) * CH) continue;
            for (let n = 0; n < 9; n++) if (p.mask >> n & 1) { const t = baldosa(p, n % 3, (n / 3) | 0); if (Math.abs(x - t.x) < t.sx / 2 && Math.abs(z - t.z) < t.sz / 2 && Math.abs(y - t.y) < 0.5) return p; }
          } else if (a === 0 && b === 0) { const e = enPieza(p, x, z); if (e && (p.mask >> e.idx & 1) && y <= e.top + 0.05 && y >= e.top - (p.t === 'r' ? 0.5 : 0.3)) return p; }
        }
      }
      return null;
    },
    piezasCerca(x, y, z, r) { const o = []; for (const p of piezas.values()) { const t = baldosa(p, 1, 1); if (Math.hypot(t.x - x, t.y - y, t.z - z) < r + 2.5) o.push(p); } return o; },
    /* donde se colocaria una pieza segun posicion y orientacion del jugador */
    colocacion(t, e, yaw) {
      const fx = Math.sin(yaw), fz = Math.cos(yaw), di = ((Math.round(Math.atan2(fx, fz) / (Math.PI / 2)) % 4) + 4) % 4, dx = [0, 1, 0, -1][di], dz = [1, 0, -1, 0][di];
      const gx = Math.floor(e.x / CW), gz = Math.floor(e.z / CW);
      let niv = Math.floor((e.y + 0.5) / CH);
      const l = celdas.get(cel(gx, gz));
      if (l) for (const p of l) if (p.t !== 'p') { const q = enPieza(p, e.x, e.z); if (q && (p.mask >> q.idx & 1) && q.top <= e.y + 0.7 && q.top >= e.y - 0.8) niv = p.t === 'r' ? p.gy + 1 : p.gy; }
      if (t === 'p') return di === 0 ? { t, gx, gy: niv, gz: gz + 1, d: 0 } : di === 1 ? { t, gx: gx + 1, gy: niv, gz, d: 1 } : di === 2 ? { t, gx, gy: niv, gz, d: 0 } : { t, gx, gy: niv, gz, d: 1 };
      if (t === 's') return { t, gx: gx + dx, gy: niv, gz: gz + dz, d: 0 };
      if (t === 'r') return { t, gx: gx + dx, gy: niv, gz: gz + dz, d: di };
      return { t, gx, gy: niv + 1, gz, d: 0 };
    },
    fantasma(desc, ok) {
      if (!desc) { gm.visible = false; return; }
      const p = { t: desc.t, gx: desc.gx, gy: desc.gy, gz: desc.gz, d: desc.d };
      for (let n = 0; n < 9; n++) { compMat(baldosa(p, n % 3, (n / 3) | 0), tmpM); gm.setMatrixAt(n, tmpM); }
      gm.instanceMatrix.needsUpdate = true; gm.material.color.setHex(ok ? 0x66ff88 : 0xff6666); gm.visible = true;
    },
    dispose() { for (const m in meshes) { escena.remove(meshes[m]); meshes[m].dispose(); meshes[m].material.dispose(); } escena.remove(gm); gm.material.dispose(); unit.dispose(); }
  };
  return C;
}
