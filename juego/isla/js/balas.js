// Proyectiles con gravedad y trazadora; el juego resuelve los impactos en el callback de paso.
import * as THREE from '../lib/three.module.min.js';
export function crearBalas(escena, cap = 160) {
  const g = new THREE.BoxGeometry(0.05, 0.05, 1), mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }), cap);
  mesh.frustumCulled = false; mesh.count = 0; escena.add(mesh);
  const B = Array.from({ length: cap }, () => ({ act: false })), M = new THREE.Matrix4(), q = new THREE.Quaternion(), C = new THREE.Color(), z = new THREE.Vector3(0, 0, 1), d = new THREE.Vector3(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    B,
    nueva(o) { const b = B.find((x) => !x.act); if (!b) return null; Object.assign(b, o, { act: true, t: 0, dist: 0, o: [o.x, o.y, o.z] }); return b; },
    limpiar() { B.forEach((b) => { b.act = false; }); mesh.count = 0; },
    actualizar(dt, paso) {
      let n = 0;
      for (const b of B) {
        if (!b.act) continue;
        const ax = b.x, ay = b.y, az = b.z; b.vy -= b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.t += dt;
        b.dist += Math.hypot(b.vx, b.vy, b.vz) * dt;
        if (b.t > 4 || b.y < -8 || paso(b, ax, ay, az)) { b.act = false; continue; }
        d.set(b.vx, b.vy, b.vz); const sp = d.length(); d.divideScalar(sp); q.setFromUnitVectors(z, d); p.set(b.x - d.x * 0.5, b.y - d.y * 0.5, b.z - d.z * 0.5);
        s.set(b.grosor || 1, b.grosor || 1, Math.min(7, sp * 0.02 + 0.8)); M.compose(p, q, s); mesh.setMatrixAt(n, M); mesh.setColorAt(n, C.setHex(b.col || 0xffe08a)); n++;
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() { escena.remove(mesh); g.dispose(); mesh.dispose(); }
  };
}
