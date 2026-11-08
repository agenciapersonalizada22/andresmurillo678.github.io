// Particulas, explosiones y balas trazadoras (todo en mallas instanciadas con pooling).
import * as THREE from '../lib/three.module.min.js';
export function crearEfectos(escena) {
  const CAP = 320, g = new THREE.BoxGeometry(0.14, 0.14, 0.14), mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP);
  mesh.frustumCulled = false; mesh.count = CAP; escena.add(mesh);
  const P = Array.from({ length: CAP }, () => ({ v: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0 })), M = new THREE.Matrix4(), C = new THREE.Color(), cero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < CAP; i++) { mesh.setMatrixAt(i, cero); mesh.setColorAt(i, C.setHex(0xffffff)); }
  let cur = 0;
  const expl = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.8, depthWrite: false })); m.visible = false; m.userData.t = 0; escena.add(m); return m; });
  let ie = 0;
  const E = {
    reducir: false,
    emitir(x, y, z, color, n, vel = 4, vida = 0.6) {
      if (E.reducir) n = Math.ceil(n / 3);
      for (let k = 0; k < n; k++) { const p = P[cur]; cur = (cur + 1) % CAP; p.v = 1; p.x = x; p.y = y; p.z = z; p.vx = (Math.random() - 0.5) * vel; p.vy = Math.random() * vel * 0.8; p.vz = (Math.random() - 0.5) * vel; p.t = vida * (0.6 + Math.random() * 0.6); mesh.setColorAt(P.indexOf(p), C.setHex(color)); }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    explosion(x, y, z, radio) { const m = expl[ie]; ie = (ie + 1) % expl.length; m.position.set(x, y, z); m.userData.t = 0; m.userData.r = radio; m.visible = true; E.emitir(x, y, z, 0xffb040, 24, 12, 0.9); E.emitir(x, y, z, 0x444444, 14, 6, 1.2); },
    actualizar(dt) {
      for (let i = 0; i < CAP; i++) {
        const p = P[i]; if (!p.v) continue;
        p.t -= dt; if (p.t <= 0) { p.v = 0; mesh.setMatrixAt(i, cero); continue; }
        p.vy -= 12 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const s = Math.min(1, p.t * 2);
        M.makeScale(s, s, s).setPosition(p.x, p.y, p.z); mesh.setMatrixAt(i, M);
      }
      mesh.instanceMatrix.needsUpdate = true;
      for (const m of expl) if (m.visible) { m.userData.t += dt; const k = m.userData.t / 0.45; if (k >= 1) { m.visible = false; continue; } m.scale.setScalar(m.userData.r * (0.3 + k * 0.8)); m.material.opacity = 0.8 * (1 - k); }
    },
    dispose() { escena.remove(mesh); g.dispose(); mesh.dispose(); expl.forEach((m) => { escena.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
  };
  return E;
}
