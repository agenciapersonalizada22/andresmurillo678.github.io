// Botin en el suelo y cofres: instanciado, con culling por distancia; ids estables para sincronizar en red.
import * as THREE from '../lib/three.module.min.js';
import { colorItem } from './armas.js';
import { contenidoCofre } from './terreno.js';
export function crearBotin(escena, T) {
  const CAP = 900, g = new THREE.BoxGeometry(1, 1, 1), items = new Map(), cofres = new Map();
  const mi = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP), mb = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }), CAP);
  const mc = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), 80);
  [mi, mb, mc].forEach((m) => { m.frustumCulled = false; m.count = 0; escena.add(m); });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), C = new THREE.Color(), v = new THREE.Vector3(), s = new THREE.Vector3(), ey = new THREE.Vector3(0, 1, 0);
  T.loot.forEach((l) => { l.vivo = true; items.set(l.id, l); });
  T.cofres.forEach((c) => { c.abierto = false; cofres.set(c.id, c); });
  let proximo = 0, listaCerca = [], t = 0, ultimo = -9, cofresCerca = [];
  const B = {
    items, cofres,
    soltar(item, x, y, z, id) { id = id || 'd' + (proximo++); if (items.has(id)) return items.get(id); const l = { id, x, y, z, item, vivo: true }; items.set(id, l); ultimo = -9; return l; },
    quitar(id) { const l = items.get(id); if (l) { l.vivo = false; items.delete(id); ultimo = -9; } return l; },
    /* mas cercano a un radio: {tipo:'item'|'cofre', obj} */
    cercano(x, y, z, r) {
      let best = null, bd = r;
      for (const l of listaCerca) { if (!l.vivo) continue; const d = Math.hypot(l.x - x, l.z - z); if (d < bd && Math.abs(l.y - y) < 3) { bd = d; best = { tipo: 'item', obj: l }; } }
      for (const c of cofresCerca) { if (c.abierto) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd && Math.abs(c.y - y) < 3) { bd = d; best = { tipo: 'cofre', obj: c }; } }
      return best;
    },
    abrirCofre(c) {
      if (c.abierto) return []; c.abierto = true; ultimo = -9; const lista = contenidoCofre(T, c);
      lista.forEach((it, n) => { const a = n * 2.1 + 0.4; B.soltar(it, c.x + Math.cos(a) * 1.2, c.y + 0.3, c.z + Math.sin(a) * 1.2, c.id + '_' + n); });
      return lista;
    },
    actualizar(cam, dt) {
      t += dt; const reconstruir = t - ultimo > 0.4; let n = 0, nb = 0;
      if (reconstruir) { ultimo = t; listaCerca = []; cofresCerca = []; for (const l of items.values()) if (Math.hypot(l.x - cam.x, l.z - cam.z) < 130) listaCerca.push(l); for (const c of cofres.values()) if (Math.hypot(c.x - cam.x, c.z - cam.z) < 160) cofresCerca.push(c); }
      for (const l of listaCerca) {
        if (!l.vivo) continue; const y = l.y + 0.45 + Math.sin(t * 2.5 + l.x) * 0.1;
        q.setFromAxisAngle(ey, t * 1.4 + l.z); M.compose(v.set(l.x, y, l.z), q, s.set(0.45, 0.45, 0.45)); mi.setMatrixAt(n, M); if (reconstruir) mi.setColorAt(n, C.set(colorItem(l.item))); n++;
        if (l.item.k === 'arma' && l.item.r >= 1 || l.item.k === 'cons' && l.item.t === 'botiquin') { M.compose(v.set(l.x, l.y + 1.6, l.z), q.identity(), s.set(0.12, 3.2, 0.12)); mb.setMatrixAt(nb, M); if (reconstruir) mb.setColorAt(nb, C.set(colorItem(l.item))); nb++; }
      }
      mi.count = n; mb.count = nb; mi.instanceMatrix.needsUpdate = mb.instanceMatrix.needsUpdate = true;
      if (reconstruir) { if (mi.instanceColor) mi.instanceColor.needsUpdate = true; if (mb.instanceColor) mb.instanceColor.needsUpdate = true; }
      let nc = 0;
      for (const c of cofresCerca) { M.compose(v.set(c.x, c.y + 0.3, c.z), q.identity(), s.set(1, c.abierto ? 0.3 : 0.6, 0.65)); mc.setMatrixAt(nc, M); mc.setColorAt(nc, C.set(c.abierto ? '#6b5320' : '#ffc12e')); nc++; }
      mc.count = nc; mc.instanceMatrix.needsUpdate = true; if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
    },
    dispose() { [mi, mb, mc].forEach((m) => { escena.remove(m); m.dispose(); }); g.dispose(); }
  };
  return B;
}
