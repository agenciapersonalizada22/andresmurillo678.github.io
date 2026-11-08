// Fisica pura de la pelota (sin DOM): gravedad, arrastre, efecto Magnus, rebote con friccion y giro, red, y resolutor de golpes.
// Unidades SI. Mesa: largo en z (red en z=0), ancho en x, cara superior en y=H. Lado +1 = z>0 (cerca de la camara), -1 = z<0.
export const C = {
  g: 9.81, R: 0.02, L: 2.74, W: 1.525, H: 0.76, redH: 0.1525, redExtra: 0.1525,
  kd: 0.126, km: 0.0028, decaeGiro: 0.25, eMesa: 0.9, muMesa: 0.35, eSuelo: 0.7, muSuelo: 0.4,
  dt: 1 / 240, giroMax: 330, zonaIni: -0.3, zonaFin: 1.2, zonaDulce: 0.35
};
const I_K = 2 / 5; // esfera maciza: I = 2/5 m R^2
export const nuevaBola = (x = 0, y = C.H + 0.2, z = 0) => ({ x, y, z, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
export const copiar = (b) => ({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, wx: b.wx, wy: b.wy, wz: b.wz });
export const rapidez = (b) => Math.hypot(b.vx, b.vy, b.vz);

/* Rebote contra un plano horizontal fijo (mesa o suelo). */
export function rebotar(b, e, mu) {
  const R = C.R, vyIn = -b.vy;
  if (vyIn <= 0) return;
  // velocidad del punto de contacto: v + w x (0,-R,0)
  const sx = b.vx + b.wz * R, sz = b.vz - b.wx * R, s = Math.hypot(sx, sz);
  const jn = (1 + e) * vyIn; // impulso normal / m
  b.vy = e * vyIn;
  if (s > 1e-6) {
    const jt = Math.min(mu * jn, (2 / 7) * s); // deslizamiento o adherencia
    const jx = -jt * sx / s, jz = -jt * sz / s;
    b.vx += jx; b.vz += jz;
    // w += (r x J) / (I/m) con r=(0,-R,0), J=(jx,0,jz)
    const k = 1 / (I_K * R * R);
    b.wx += (-R * jz) * k; b.wz += (R * jx) * k;
  }
}

/* Un paso de integracion. cb(tipo, datos) recibe 'rebote' {lado,x,z,vy}, 'red', 'cinta', 'suelo'. o.red=false ignora la red. */
export function paso(b, dt, cb, o) {
  const R = C.R, H = C.H;
  const v = Math.hypot(b.vx, b.vy, b.vz);
  let ax = -C.kd * v * b.vx, ay = -C.g - C.kd * v * b.vy, az = -C.kd * v * b.vz;
  ax += C.km * (b.wy * b.vz - b.wz * b.vy);
  ay += C.km * (b.wz * b.vx - b.wx * b.vz);
  az += C.km * (b.wx * b.vy - b.wy * b.vx);
  const py = b.y, pz = b.z;
  b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  const d = 1 - C.decaeGiro * dt; b.wx *= d; b.wy *= d; b.wz *= d;
  // red
  if (!o || o.red !== false) {
    if ((pz > 0) !== (b.z > 0) && pz !== b.z && Math.abs(b.x) <= C.W / 2 + C.redExtra) {
      const f = pz / (pz - b.z), yc = py + (b.y - py) * f, alt = yc - H;
      if (alt < C.redH + R && alt > -R * 2) {
        if (alt > C.redH - 0.004) { // cinta
          b.vz *= 0.6; b.vx *= 0.85; b.vy = Math.abs(b.vy) * 0.3 + 0.7; b.y = H + C.redH + R;
          if (cb) cb('cinta', { x: b.x });
        } else {
          b.z = pz > 0 ? 0.003 : -0.003; b.vz = -b.vz * 0.15; b.vx *= 0.6; b.vy *= 0.8; b.wx *= 0.3; b.wy *= 0.3; b.wz *= 0.3;
          if (cb) cb('red', { x: b.x });
        }
      }
    }
  }
  // mesa
  if (b.vy < 0 && b.y - R < H && py - R >= H && Math.abs(b.x) <= C.W / 2 && Math.abs(b.z) <= C.L / 2) {
    b.y = H + R;
    const vy = b.vy; rebotar(b, C.eMesa, C.muMesa);
    if (cb) cb('rebote', { lado: b.z > 0 ? 1 : -1, x: b.x, z: b.z, vy: -vy });
  } else if (b.y < R && b.vy < 0) {
    b.y = R; rebotar(b, C.eSuelo, C.muSuelo);
    if (cb) cb('suelo', { x: b.x, z: b.z });
  }
}

/* Aterrizaje: primer cruce de la altura de la mesa (aunque caiga fuera). Devuelve {x,z,t,libre,altRed,rebota}. */
export function aterrizaje(b0, opt) {
  const b = copiar(b0), dt = C.dt, red = !opt || opt.red !== false;
  let t = 0, altRed = Infinity, rebota = false;
  const cb = (tipo) => { if (tipo === 'rebote') rebota = true; };
  for (let i = 0; i < 1500; i++) {
    const py = b.y, pz = b.z;
    paso(b, dt, cb, { red: false });
    t += dt;
    if (red && (pz > 0) !== (b.z > 0) && pz !== b.z) { const f = pz / (pz - b.z); altRed = Math.min(altRed, py + (b.y - py) * f - C.H - C.redH - C.R); }
    if (rebota || (py - C.R >= C.H && b.y - C.R < C.H && b.vy < 0)) return { x: b.x, z: b.z, t, altRed, rebota, ok: true };
    if (b.y < 0) break;
  }
  return { x: b.x, z: b.z, t, altRed, rebota, ok: false };
}

/* Simulacion completa con eventos (sin controlar golpes): util para pruebas y prediccion. */
export function simular(b0, tMax, cb) {
  const b = copiar(b0); let t = 0;
  while (t < tMax) { paso(b, C.dt, (tp, d) => cb && cb(tp, d, t), null); t += C.dt; if (b.y <= C.R + 1e-6 && b.vy < 0.3 && Math.abs(b.vy) < 0.5) break; }
  return b;
}

/* Velocidad de giro (rad/s) de un golpe. top>0 topspin, top<0 backspin; lado>0 curva hacia la derecha del golpeador.
   hx,hz = direccion horizontal unitaria del tiro. */
export function giroDe(hx, hz, top, curva, mul = 1) {
  const m = C.giroMax * mul;
  return { wx: top * m * hz, wy: -curva * m, wz: -top * m * hx };
}

function construir(p, lado, phi, theta, v0, top, curva, mul) {
  const hx = Math.sin(phi), hz = -lado * Math.cos(phi), ct = Math.cos(theta);
  const g = giroDe(hx, hz, top, curva, mul);
  return { x: p.x, y: p.y, z: p.z, vx: v0 * ct * hx, vy: v0 * Math.sin(theta), vz: v0 * ct * hz, wx: g.wx, wy: g.wy, wz: g.wz };
}

/* Resuelve un golpe de rally: desde p (posicion de la pelota) hacia el objetivo (tx,tz) en la mesa rival.
   Devuelve la bola lanzada (copia con velocidad y giro). Garantiza pasar la red; si el objetivo es imposible a esa rapidez, reduce rapidez. */
export function resolverGolpe(p, lado, tx, tz, v0, top, curva, mul = 1) {
  let v = v0, best = null;
  for (let intento = 0; intento < 10; intento++) {
    let phi = Math.atan2(tx - p.x, Math.abs(tz - p.z)), theta = 0.1, aterr = null;
    for (let it = 0; it < 3; it++) {
      let lo = -0.7, hi = 0.95;
      for (let k = 0; k < 14; k++) {
        theta = (lo + hi) / 2;
        const a = aterrizaje(construir(p, lado, phi, theta, v, top, curva, mul), { red: false });
        const prof = -lado * a.z; // profundidad en el campo rival (positiva)
        if (prof < -lado * tz) lo = theta; else hi = theta;
      }
      aterr = aterrizaje(construir(p, lado, phi, theta, v, top, curva, mul), { red: true });
      phi -= (aterr.x - tx) / Math.max(0.5, Math.abs(tz - p.z)) * 1.0;
      phi = Math.max(-1.1, Math.min(1.1, phi));
    }
    // despeje de la red: subir el angulo hasta librarla
    let n = 0;
    while (aterr.altRed < 0.025 && n < 25) { theta += 0.02; aterr = aterrizaje(construir(p, lado, phi, theta, v, top, curva, mul), { red: true }); n++; }
    best = { bola: construir(p, lado, phi, theta, v, top, curva, mul), aterr, v, phi, theta };
    const prof = -lado * aterr.z;
    if (aterr.altRed >= 0.02 && prof < C.L / 2 - 0.03 && prof > 0.08) break;
    v *= prof < 0.3 || aterr.altRed < 0.02 ? 1.1 : 0.92;
  }
  return best;
}

/* Saque: la pelota sale de detras de la linea de fondo, bota en el campo propio y luego en el rival.
   Devuelve la bola lanzada o null. */
export function resolverSaque(p, lado, tx, tz, v0, top, curva, mul = 1) {
  let mejor = null, puntaje = Infinity;
  const prof2 = -lado * tz;
  for (const zb of [0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.22]) {
    for (const v of [v0, v0 * 0.85, v0 * 1.15, v0 * 0.7]) {
      let phi = Math.atan2(tx - p.x, Math.abs(tz - p.z)), theta = -0.2;
      for (let it = 0; it < 2; it++) {
        let lo = -0.9, hi = 0.35;
        for (let k = 0; k < 13; k++) {
          theta = (lo + hi) / 2;
          const a = aterrizaje(construir(p, lado, phi, theta, v, top, curva, mul), { red: false });
          if (lado * a.z > zb) lo = theta; else hi = theta; // mas inclinado hacia abajo (theta menor) -> bota antes
        }
        phi -= 0.0;
      }
      const b = construir(p, lado, phi, theta, v, top, curva, mul), r = segundoBote(b, lado);
      if (!r) continue;
      const err = Math.hypot(r.x - tx, (-lado * r.z) - prof2) + (r.altRed < 0.02 ? 5 : 0);
      if (err < puntaje) { puntaje = err; mejor = { bola: b, r }; }
    }
  }
  if (mejor) mejor.err = puntaje;
  if (mejor && mejor.r) {
    // correccion lateral fina
    const b = mejor.bola, ex = mejor.r.x - tx;
    if (Math.abs(ex) > 0.03) { const ang = Math.atan2(b.vx, -lado * b.vz) - ex / Math.max(0.8, Math.abs(tz - p.z)); const sp = Math.hypot(b.vx, b.vz); b.vx = Math.sin(ang) * sp; b.vz = -lado * Math.cos(ang) * sp; const r2 = segundoBote(b, lado); if (r2) mejor.r = r2; }
  }
  return mejor;
}

/* Simula un saque: devuelve el segundo bote (en la mesa rival) y el despeje de la red, o null si no bota en orden. */
export function segundoBote(b0, lado) {
  const b = copiar(b0); let botes = [], altRed = Infinity;
  for (let i = 0; i < 1600; i++) {
    const pz = b.z, py = b.y;
    paso(b, C.dt, (tp, d) => { if (tp === 'rebote') botes.push(d); }, { red: false });
    if ((pz > 0) !== (b.z > 0) && pz !== b.z) altRed = Math.min(altRed, py + (b.y - py) * (pz / (pz - b.z)) - C.H - C.redH - C.R);
    if (botes.length >= 2 || b.y < 0) break;
  }
  if (botes.length < 2 || botes[0].lado !== lado || botes[1].lado !== -lado) return null;
  return { x: botes[1].x, z: botes[1].z, altRed, primero: botes[0] };
}

/* Prediccion barata de donde estara (x,y) cuando la pelota cruce el plano z=zp (null si no lo cruza). */
export function predecirPlano(b0, zp, tMax = 2.5) {
  const b = copiar(b0), dir = Math.sign(zp - b.z);
  if (!dir || Math.sign(b.vz) !== dir) return null;
  for (let t = 0; t < tMax; t += C.dt) {
    const pz = b.z; paso(b, C.dt, null, null);
    if ((pz - zp) * (b.z - zp) <= 0) return { x: b.x, y: b.y, t };
    if (b.y < C.R) return null;
  }
  return null;
}

/* Giro entrante respecto a su direccion de llegada: top>0 topspin, side = giro vertical (wy). */
export function giroEntrante(b) {
  const v = Math.hypot(b.vx, b.vz) || 1, hx = b.vx / v, hz = b.vz / v;
  return { top: b.wx * hz - b.wz * hx, side: b.wy };
}
