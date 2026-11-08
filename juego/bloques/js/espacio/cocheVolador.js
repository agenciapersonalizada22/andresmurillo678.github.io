// =============================================================
//  🚘  AEROAUTO VOLTA: carretera y vuelo vertical (eléctrico)
//  Modo CARRETERA: se maneja como un coche normal (usa la física
//  del jeep). Modo VUELO: despega y aterriza en vertical con 4
//  turbinas, W/S adelante y atrás, A/D gira, Espacio sube y
//  Mayús baja; F (o Y en el mando) cambia de modo. La batería
//  (en v.combustible) se gasta más volando, se recarga en una
//  estación de carga o con baterías de iones (G).
// =============================================================
import { crearAeroauto } from './modeloAeroauto.js';
import { DIBUJO, DIBUJO_AGUA } from '../bloques.js';
import { ALTO } from '../medidas.js';

const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const aprox = (v, o, p) => (v < o ? Math.min(o, v + p) : Math.max(o, v - p));

export const TIPO_AEROAUTO = {
  nombre: 'Aeroauto Volta', crear: crearAeroauto, clase: 'volador', tanque: 100, consumo: 0.07, asiento: [-0.4, 1.3, 0.3],
  distCam: 8.5, altCam: 2.4, ancho: 1.0, largo: 2.1, base: 2.65, via: 1.96, alto: 1.7, vmax: 30, subir: 0.95,
  vmaxVuelo: 34, velVertical: 9,
};

export function alternarModo(self, v) {
  if (!v || v.T.clase !== 'volador') return false;
  if (v.modo === 'vuelo') {
    const agl = v.y - Math.max(self.suelo(v.x, v.z, v.y + 1.2), 0);
    if (agl > 2.2) { self.avisos.push('Baja más cerca del suelo para volver a modo carretera'); return false; }
    v.modo = 'carretera';
    self.avisos.push('Modo CARRETERA');
  } else {
    if (v.combustible < 2) { self.avisos.push('Batería agotada: recárgala antes de volar'); return false; }
    v.modo = 'vuelo';
    v.vy = Math.max(v.vy || 0, 1.5);
    self.avisos.push('Modo VUELO · Espacio sube · Mayús baja');
  }
  return true;
}

// ¿cabe el casco en esta posición? (puntos de las esquinas a tres alturas)
function libre(mundo, v, T, nx, ny, nz) {
  const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
  const f = [-s, -c], r = [c, -s];
  for (const [pf, pr] of [[T.largo, T.ancho], [T.largo, -T.ancho], [-T.largo, T.ancho], [-T.largo, -T.ancho], [0, 0], [T.largo, 0], [-T.largo, 0]]) {
    const px = nx + f[0] * pf + r[0] * pr, pz = nz + f[1] * pf + r[1] * pr;
    for (const dy of [0.25, 0.9, 1.5]) if (mundo.esSolido(Math.floor(px), Math.floor(ny + dy), Math.floor(pz))) return false;
  }
  return true;
}

export function pasoVolador(self, v, T, dt, ent, manejando) {
  if (!v.modo) v.modo = 'carretera';
  v.rotor = aprox(v.rotor || 0, v.modo === 'vuelo' ? 1 : 0, dt * 1.3);
  if (v.modo === 'carretera') { self.pasoTierra(v, T, dt, ent, manejando); return; }

  const mundo = self.mundo;
  const tiene = v.combustible > 0;
  const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
  const turbo = manejando && ent.correr && tiene;
  let vf = v.vx * -s + v.vz * -c, vl = v.vx * c + v.vz * -s;
  const vmax = T.vmaxVuelo * (turbo ? 1.35 : 1);
  const adelante = manejando && tiene ? ent.adelante : 0;
  const vert = manejando && tiene ? ((ent.saltar ? 1 : 0) - (ent.bajar ? 1 : 0)) : 0;
  vf += (adelante * vmax - vf) * (1 - Math.exp(-1.7 * dt));
  vl *= Math.exp(-2.6 * dt);
  const giro = (manejando ? -ent.derecha : 0) * 1.5 * (0.45 + 0.55 * (1 - Math.min(1, Math.abs(vf) / vmax)));
  v.yaw += giro * dt;
  const s2 = Math.sin(v.yaw), c2 = Math.cos(v.yaw);
  v.vx = -s2 * vf + c2 * vl; v.vz = -c2 * vf - s2 * vl;
  const techo = ALTO - 5;
  let vyObj = vert * T.velVertical;
  if (!tiene) vyObj = -4.5;               // sin batería baja planeando despacio
  if (v.y >= techo && vyObj > 0) vyObj = 0;
  v.vy += (vyObj - v.vy) * (1 - Math.exp(-3.4 * dt));
  v.vel = vf;
  v.acelerador = Math.max(Math.abs(adelante), Math.abs(vert));
  v.slip = Math.abs(vl);
  v.giro += (giro * 0.5 - v.giro) * Math.min(1, 6 * dt);
  if (manejando && tiene) v.combustible = Math.max(0, v.combustible - (0.5 + 0.45 * Math.abs(adelante) + 0.35 * Math.abs(vert) + (turbo ? 0.4 : 0)) * dt);

  // mover por ejes con choques
  const nx = v.x + v.vx * dt;
  if (libre(mundo, v, T, nx, v.y, v.z)) v.x = nx; else { v.choque = Math.max(v.choque, Math.abs(v.vx)); v.vx *= -0.2; }
  const nz = v.z + v.vz * dt;
  if (libre(mundo, v, T, v.x, v.y, nz)) v.z = nz; else { v.choque = Math.max(v.choque, Math.abs(v.vz)); v.vz *= -0.2; }
  const ny = v.y + v.vy * dt;
  const suelo = Math.max(self.suelo(v.x, v.z, ny + 1.2), 0);
  if (ny <= suelo) {
    if (v.vy < -6) v.choque = Math.max(v.choque, -v.vy * 0.6);
    v.y = suelo; v.vy = 0; v.enSuelo = true;
  } else if (!libre(mundo, v, T, v.x, ny, v.z)) {
    if (v.vy > 0) v.vy = 0; else v.y = Math.max(suelo, v.y);
  } else { v.y = ny; v.enSuelo = ny <= suelo + 0.05; }
  v.enAgua = DIBUJO[mundo.obtener(Math.floor(v.x), Math.floor(v.y + 0.3), Math.floor(v.z))] === DIBUJO_AGUA;

  const pitchObj = lim(-(vf / vmax) * 0.2 + (vert > 0 ? 0.03 : vert < 0 ? -0.03 : 0), -0.3, 0.3);
  const rollObj = lim(giro * 0.28 - vl * 0.03, -0.4, 0.4);
  v.pitch += (pitchObj - v.pitch) * Math.min(1, 5 * dt);
  v.roll += (rollObj - v.roll) * Math.min(1, 5 * dt);
  v.giroRueda -= vf * dt / (v.partes.radioRueda || 0.4) * (v.enSuelo ? 1 : 0.2);
  v.rpm = lim(0.35 + 0.65 * v.acelerador, 0, 1.2);
  v.motor = tiene && manejando;
  v.throttle = v.acelerador;
}

// Turbinas: se despliegan, giran y brillan; la tira azul de batería respira
export function actualizarModeloVolador(v, tiempo) {
  const p = v.partes;
  if (!p.rotores) return;
  const d = v.rotor || 0;
  const potencia = v.modo === 'vuelo' ? (v.combustible > 0 ? 0.6 + 0.4 * (v.acelerador || 0) : 0.15) : 0;
  v.helice = (v.helice || 0) + (v.modo === 'vuelo' ? 0.9 + potencia * 1.6 : 0.15 * d);
  for (const r of p.rotores) {
    const e = d * d * (3 - 2 * d);
    r.pod.scale.setScalar(0.12 + 0.88 * e);
    r.pod.position.set(r.lado * 0.55 * e, 0.06 * (1 - e), 0);
    r.brazo.visible = d > 0.02;
    r.helice.rotation.y = v.helice * (r.lado > 0 ? 1 : -1);
    r.brillo.material.opacity = d > 0.9 ? 0.25 + 0.3 * potencia + 0.08 * Math.sin(tiempo * 30) : 0;
    r.brillo.scale.setScalar(0.7 + 0.5 * potencia);
  }
  if (p.bateria) p.bateria.material.emissiveIntensity = 0.35 + 0.35 * Math.sin(tiempo * 2) + (v.modo === 'vuelo' ? 0.4 : 0);
}

export function efectosVolador(amb, self, v) {
  if (!amb) return;
  if (v.modo === 'vuelo' && v.motor) {
    const h = Math.max(self.suelo(v.x, v.z, v.y + 1), 0);
    if (v.y - h < 7) amb.polvo(v.x + (Math.random() - 0.5) * 3, h + 0.2, v.z + (Math.random() - 0.5) * 3, 2, 0, 0);
  }
}
