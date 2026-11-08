// Personajes humanoides con mallas instanciadas (una por parte): barato aunque haya 30 en pantalla; LOD por distancia.
import * as THREE from '../lib/three.module.min.js';
import { ARMAS, RAREZAS } from './armas.js';
import { SKINS } from './almacen.js';
export const EMOTES = ['Baile', 'Saludo', 'Giro', 'Salto', 'Aplauso', 'Robot'];
export const DUR_EMOTE = 2.8;
export function crearPersonajes(escena, max = 64) {
  const box = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshLambertMaterial({ color: 0xffffff }), mats = [];
  const mk = (geo) => { const m = new THREE.InstancedMesh(geo || box, mat, max); m.frustumCulled = false; m.count = 0; m.castShadow = true; escena.add(m); mats.push(m); return m; };
  const cabeza = mk(), torso = mk(), brI = mk(), brD = mk(), pI = mk(), pD = mk(), arma = mk(), plan = mk(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 12));
  const gorro = mk(new THREE.ConeGeometry(0.22, 0.4, 6)), cuernos = mk(new THREE.ConeGeometry(0.06, 0.25, 5)), mochila = mk(), antena = mk(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5)), corona = mk(new THREE.CylinderGeometry(0.2, 0.17, 0.14, 6));
  const base = new THREE.Matrix4(), m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v1 = new THREE.Vector3(), v3 = new THREE.Vector3(), un = new THREE.Vector3(1, 1, 1), col = new THREE.Color(), qb = new THREE.Quaternion();
  const sk = {}; SKINS.forEach((s) => { sk[s.id] = s; });
  function parte(mesh, i, lx, ly, lz, w, h, d, rx, rz, color, pivot) {
    eu.set(rx || 0, 0, rz || 0); q.setFromEuler(eu); v1.set(lx, ly, lz); m1.compose(v1, q, un); m2.makeTranslation(0, pivot ? -h / 2 : 0, 0);
    mesh.setMatrixAt(i, m1.premultiply(base).multiply(m2).scale(v3.set(w, h, d))); mesh.setColorAt(i, col.set(color));
  }
  const C = {
    dibujar(lista, cam, distMax, tiempo) {
      const n = { c: 0, a: 0, p: 0, g: 0, cu: 0, m: 0, an: 0, co: 0 }; let i = 0;
      for (const e of lista) {
        if ((!e.vivo && !e.ver) || e.oculto) continue;
        const d = Math.hypot(e.x - cam.x, e.z - cam.z); if (d > distMax) continue;
        const lod = d > 110, s = sk[e.skin] || sk.base, c1 = s.c1 || e.color || '#3df5ff', est = e.est, em = e.emote >= 0 && est === 3;
        let y = e.y, ry = e.ry, ph = e.fase || 0, ba = 0, bz = 0, aI = 0, aD = 0, zI = 0.1, zD = -0.1, lI = 0, lD = 0, vel = e.velH || 0;
        const arm = e.arma && e.armaSel > 0 && est === 3;
        if (est === 3) { const sw = Math.min(1, vel / 6) * 0.9; lI = Math.sin(ph) * sw; lD = -lI; aI = -lI * 0.8; aD = lI * 0.8; }
        if (arm) { aD = -1.45 + (e.pitch || 0) * 0.6; aI = -1.25 + (e.pitch || 0) * 0.6; zI = -0.25; zD = 0.05; }
        if (est === 1) { ba = 1.2; aI = -2.4; aD = -2.4; zI = 0.9; zD = -0.9; lI = 0.3; lD = -0.3; y += 0.9; }
        if (est === 2) { aI = -2.9; aD = -2.9; zI = 0.2; zD = -0.2; lI = 0.25; lD = -0.25; }
        if (em) {
          const t = e.emT || 0, k = e.emote; zI = 0.1; zD = -0.1;
          if (k === 0) { aI = -2.6 + Math.sin(t * 9) * 0.6; aD = -2.6 + Math.cos(t * 9) * 0.6; y += Math.abs(Math.sin(t * 9)) * 0.12; bz = Math.sin(t * 9) * 0.12; lI = Math.sin(t * 9) * 0.5; lD = -lI; }
          else if (k === 1) { aD = -3.0; zD = -0.4 + Math.sin(t * 10) * 0.5; }
          else if (k === 2) { ry += t * 8; zI = 1.4; zD = -1.4; }
          else if (k === 3) { y += Math.abs(Math.sin(t * 6)) * 0.8; aI = aD = -2.8; zI = 0.5; zD = -0.5; }
          else if (k === 4) { aI = aD = -1.5; zI = -(0.1 + 0.3 * Math.abs(Math.sin(t * 14))); zD = -zI; }
          else { aI = Math.sign(Math.sin(t * 5)) * 1.4; aD = -aI; lI = Math.sign(Math.sin(t * 5)) * 0.4; lD = -lI; }
        }
        eu.set(0, ry, 0); qb.setFromEuler(eu); v1.set(e.x, y, e.z); base.compose(v1, qb, un);
        if (ba) { m1.makeRotationX(ba).setPosition(0, 0.9, 0); m2.makeTranslation(0, -0.9, 0); base.multiply(m1).multiply(m2); m1.identity(); }
        if (bz) { m1.makeRotationZ(bz); base.multiply(m1); }
        const rob = s.robot ? 1.35 : 1, cs = e.rcol || c1;
        parte(torso, n.c, 0, 1.1, 0, 0.5, 0.7, 0.28, 0, 0, cs); parte(cabeza, n.c, 0, 1.62, 0, 0.34 * rob, 0.34 * rob, 0.34 * rob, 0, 0, s.c3);
        if (!lod) {
          parte(brI, n.c, -0.34, 1.42, 0, 0.16, 0.6, 0.16, aI, zI, cs, true); parte(brD, n.c, 0.34, 1.42, 0, 0.16, 0.6, 0.16, aD, zD, cs, true);
          parte(pI, n.c, -0.13, 0.75, 0, 0.2, 0.75, 0.22, lI, 0, s.c2, true); parte(pD, n.c, 0.13, 0.75, 0, 0.2, 0.75, 0.22, lD, 0, s.c2, true);
        } else { brI.setMatrixAt(n.c, m2.makeScale(0, 0, 0)); brD.setMatrixAt(n.c, m2); pI.setMatrixAt(n.c, m2); pD.setMatrixAt(n.c, m2); }
        n.c++;
        if (!lod && e.arma && est === 3 && (arm || e.armaSel === 0)) { const lg = e.armaSel === 0 ? 0.7 : ARMAS[e.arma.w].largo; parte(arma, n.a, 0.34, 1.12, 0.3 + lg * 0.2, 0.08, 0.1, lg, -(e.pitch || 0) * 0.8, 0, e.armaSel === 0 ? '#9b7a4a' : RAREZAS[e.arma.r || 0].c); n.a++; }
        if (est === 2) { parte(plan, n.p, 0, 2.35, 0, 1, 1, 1, -0.15, 0, c1); n.p++; }
        if (!lod) {
          if (s.acc === 'gorro') { parte(gorro, n.g, 0, 1.98, 0, 1, 1, 1, 0, 0, s.c2 === '#111' ? '#333' : c1); n.g++; }
          else if (s.acc === 'cuernos') { parte(cuernos, n.cu, -0.12, 1.85, 0, 1, 1, 1, 0, 0.3, '#ffdd88'); n.cu++; parte(cuernos, n.cu, 0.12, 1.85, 0, 1, 1, 1, 0, -0.3, '#ffdd88'); n.cu++; }
          else if (s.acc === 'mochila') { parte(mochila, n.m, 0, 1.15, -0.24, 0.34, 0.5, 0.2, 0, 0, '#dfe6ee'); n.m++; }
          else if (s.acc === 'antena') { parte(antena, n.an, 0, 1.97, 0, 1, 1, 1, 0, 0, '#ff5555'); n.an++; }
          else if (s.acc === 'corona') { parte(corona, n.co, 0, 1.84, 0, 1, 1, 1, 0, 0, '#ffd23d'); n.co++; }
        }
        i++;
      }
      const set = (m, c) => { m.count = c; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };
      [cabeza, torso, brI, brD, pI, pD].forEach((m) => set(m, n.c)); set(arma, n.a); set(plan, n.p); set(gorro, n.g); set(cuernos, n.cu); set(mochila, n.m); set(antena, n.an); set(corona, n.co);
      return i;
    },
    dispose() { mats.forEach((m) => { escena.remove(m); m.dispose(); }); box.dispose(); mat.dispose(); }
  };
  return C;
}
