// Fisica ligera y determinista (vista cenital 2D) de bola y pinos. Solo +,-,*,/ y sqrt dentro del bucle.
// x: lateral (derecha +), z: a lo largo de la pista desde la linea de falta. Unidades SI.
export const P = {
  ANCHO: 1.054, MEDIO: 0.527, Z1: 18.29, FILA: 0.264, SEP: 0.305, ZACEITE: 12.8, ZFOSO: 19.3, ZFIN: 19.9,
  RBOLA: 0.108, RPINO: 0.062, RCAIDO: 0.095, HOOK: 2.6, DT: 1 / 240, XCANAL: 0.66
};
export const TIPOS = {
  normal: { m: 1.5, vt: 0.9 },
  pesado: { m: 3.0, vt: 1.9 },
  ligero: { m: 0.9, vt: 0.45 },
  explosivo: { m: 1.5, vt: 0.9, boom: true }
};

/* Posicion nominal del pino i (0..9; 0 = pino 1 de la cabeza). */
export function posPino(i) {
  const fila = i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3;
  const ini = [0, 1, 3, 6][fila];
  return { x: (i - ini - fila / 2) * P.SEP, z: P.Z1 + fila * P.FILA };
}

export const layoutCompleto = (tipos) => Array.from({ length: 10 }, (_, i) => ({ i, tipo: (tipos && tipos[i]) || 'normal' }));

export function nuevaSim(layout, params, bola) {
  const b = bola || { m: 6.2, hook: 0.7 };
  const pinos = layout.map((l) => {
    const n = posPino(l.i), t = TIPOS[l.tipo || 'normal'] || TIPOS.normal;
    return { i: l.i, tipo: l.tipo || 'normal', x: l.x != null ? l.x : n.x, z: l.z != null ? l.z : n.z, vx: 0, vz: 0, est: 0, tc: 0, dx: 0, dz: 1, m: t.m, vt: t.vt, boom: !!t.boom, yaw: 0 };
  });
  const v = params.v, s = Math.sin(params.ang || 0), c = Math.cos(params.ang || 0);
  return {
    t: 0, fin: false, dt: params.dt || P.DT, eventos: [], pinos,
    bola: { x: params.x, z: 0, vx: v * s, vz: v * c, w: params.w || 0, m: b.m || 6.2, hook: b.hook != null ? b.hook : 0.7, est: 'rodando', lado: 0, giro: 0 }
  };
}

const sq = (x) => x * x;

function derribar(s, p, nx, nz, fuerza) {
  if (p.est !== 0) return;
  p.est = 1; p.tc = 0;
  const v = Math.sqrt(sq(p.vx) + sq(p.vz));
  if (v > 0.05) { p.dx = p.vx / v; p.dz = p.vz / v; } else { p.dx = nx; p.dz = nz; }
  s.eventos.push({ tipo: 'caida', i: p.i, fuerza });
  if (p.boom) {
    p.boom = false;
    for (const q of s.pinos) {
      if (q === p || q.est > 1) continue;
      const ex = q.x - p.x, ez = q.z - p.z, d = Math.sqrt(sq(ex) + sq(ez));
      if (d > 0.62 || d < 1e-6) continue;
      const k = 5.5 * (1 - d / 0.62) / q.m * 1.5;
      q.vx += ex / d * k; q.vz += ez / d * k;
      if (q.est === 0) derribar(s, q, ex / d, ez / d, 2);
    }
    s.eventos.push({ tipo: 'explosion', x: p.x, z: p.z });
  }
}

/* Choque entre circulos; devuelve la velocidad relativa de aproximacion (0 si no hubo). */
function choque(a, b, ra, rb, e) {
  const dx = b.x - a.x, dz = b.z - a.z, min = ra + rb, d2 = dx * dx + dz * dz;
  if (d2 >= min * min || d2 < 1e-12) return 0;
  const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ia = 1 / a.m, ib = 1 / b.m, sum = ia + ib;
  const pen = min - d;
  a.x -= nx * pen * ia / sum; a.z -= nz * pen * ia / sum; b.x += nx * pen * ib / sum; b.z += nz * pen * ib / sum;
  const vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (vn >= 0) return 0;
  const j = -(1 + e) * vn / sum;
  a.vx -= j * ia * nx; a.vz -= j * ia * nz; b.vx += j * ib * nx; b.vz += j * ib * nz;
  return -vn;
}

export function paso(s) {
  const dt = s.dt, b = s.bola;
  s.t += dt;
  if (b.est === 'rodando') {
    const aceite = b.z < P.ZACEITE ? 0.1 : 1;
    b.vx += b.w * P.HOOK * b.hook * aceite * dt;
    b.w -= b.w * 0.03 * dt;
    const v = Math.sqrt(sq(b.vx) + sq(b.vz)), dr = (b.z < P.ZACEITE ? 0.1 : 0.3) * dt;
    if (v > dr) { const k = (v - dr) / v; b.vx *= k; b.vz *= k; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.giro += Math.sqrt(sq(b.vx) + sq(b.vz)) * dt;
    if (Math.abs(b.x) > P.MEDIO + 0.045 && b.z < P.Z1 - 0.6) {
      b.est = 'canal'; b.lado = b.x < 0 ? -1 : 1; b.vx = 0; s.eventos.push({ tipo: 'canal' });
    } else if (b.z > P.ZFIN) { b.est = 'fin'; s.eventos.push({ tipo: 'foso' }); }
  } else if (b.est === 'canal') {
    b.x += (b.lado * P.XCANAL - b.x) * Math.min(1, 10 * dt);
    b.z += b.vz * dt; b.giro += Math.abs(b.vz) * dt;
    b.vz -= b.vz * 0.04 * dt;
    if (b.z > P.ZFIN) b.est = 'fin';
  }
  const ps = s.pinos;
  for (let k = 0; k < ps.length; k++) {
    const p = ps[k];
    if (p.est > 1) continue;
    p.x += p.vx * dt; p.z += p.vz * dt;
    const v = Math.sqrt(sq(p.vx) + sq(p.vz));
    if (v > 0) {
      const dec = (p.est === 0 ? 5 : 2.4) * dt;
      if (v <= dec) { p.vx = 0; p.vz = 0; } else { const q = (v - dec) / v; p.vx *= q; p.vz *= q; }
    }
    if (p.est === 1) {
      p.tc += dt;
      if (p.tc > 0.45 && v < 0.12) { p.est = 2; p.vx = 0; p.vz = 0; s.eventos.push({ tipo: 'quieto', i: p.i }); }
    }
    if (p.z > P.ZFOSO || Math.abs(p.x) > P.MEDIO + 0.07) {
      if (p.est === 0) { p.est = 1; p.tc = 0; s.eventos.push({ tipo: 'caida', i: p.i, fuerza: 1 }); }
      p.est = 3;
    }
  }
  if (b.est === 'rodando') {
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k];
      if (p.est > 1) continue;
      const f = choque(b, p, P.RBOLA, p.est === 0 ? P.RPINO : P.RCAIDO, 0.55);
      if (f > 0) {
        if (p.est === 0 && f > p.vt) derribar(s, p, p.x - b.x, p.z - b.z, f);
        s.eventos.push({ tipo: 'golpe', fuerza: f, bola: true, x: p.x, z: p.z });
      }
    }
  }
  for (let a = 0; a < ps.length; a++) {
    const p = ps[a];
    if (p.est > 1) continue;
    for (let c = a + 1; c < ps.length; c++) {
      const q = ps[c];
      if (q.est > 1) continue;
      if (p.est === 0 && q.est === 0 && p.vx === 0 && p.vz === 0 && q.vx === 0 && q.vz === 0) continue;
      const f = choque(p, q, p.est === 0 ? P.RPINO : P.RCAIDO, q.est === 0 ? P.RPINO : P.RCAIDO, 0.6);
      if (f > 0) {
        if (p.est === 0 && f > p.vt) derribar(s, p, q.x - p.x, q.z - p.z, f);
        if (q.est === 0 && f > q.vt) derribar(s, q, q.x - p.x, q.z - p.z, f);
        if (f > 0.5) s.eventos.push({ tipo: 'golpe', fuerza: f, bola: false, x: p.x, z: p.z });
      }
    }
  }
  if (!s.fin && (b.est === 'fin' || b.est === 'canal' && b.z > P.Z1 + 1.5 || s.t > 9)) {
    let quieto = true;
    for (const p of ps) if (p.est < 2 && (p.vx !== 0 || p.vz !== 0 || (p.est === 1))) quieto = false;
    if (b.est === 'rodando') quieto = false;
    if (quieto || s.t > 11) {
      for (const p of ps) if (p.est === 1) p.est = 2;
      s.fin = true;
    }
  }
}

export function correr(s, max) {
  let n = max || 4000;
  while (!s.fin && n-- > 0) paso(s);
  s.fin = true;
  return s;
}

export const mascara = (s) => s.pinos.reduce((m, p) => (p.est !== 0 ? m | (1 << p.i) : m), 0);
export const contar = (m) => { let n = 0; for (let i = 0; i < 10; i++) if (m & (1 << i)) n++; return n; };

/* Layout de los pinos que siguen en pie tras la simulacion (conservan su posicion). */
export const supervivientes = (s) => s.pinos.filter((p) => p.est === 0).map((p) => ({ i: p.i, tipo: p.tipo, x: p.x, z: p.z }));

/* Trayectoria de la bola sin pinos (para la guia de punteria): puntos cada ~0.6 m. */
export function trayectoria(params, bola, n) {
  const s = nuevaSim([], { ...params, dt: 1 / 90 }, bola), pts = [];
  let ult = 0;
  while (s.bola.est === 'rodando' && s.bola.z < P.Z1 + 0.2 && pts.length < (n || 40)) {
    paso(s);
    if (s.bola.z - ult >= 0.6) { ult = s.bola.z; pts.push({ x: s.bola.x, z: s.bola.z }); }
  }
  return pts;
}
