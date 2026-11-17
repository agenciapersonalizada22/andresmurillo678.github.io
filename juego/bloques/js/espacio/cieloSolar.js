// =============================================================
//  🔭  CIELO DEL SISTEMA SOLAR
//  Dibuja los demás cuerpos como discos con fase (un quad con un
//  shader pequeño por cuerpo, materiales reutilizados) en su
//  posición astronómica aproximada vista desde el cuerpo donde estás.
//  Los planetas quedan sobre el mismo círculo que recorre el Sol, a
//  su ángulo real (elongación). También calcula el tamaño y el brillo
//  del Sol según la distancia. Nada se crea cada cuadro.
// =============================================================
import * as THREE from '../../lib/three.module.min.js';
import { posicionReal, diaSolar, posicion, FISICA, LUNAS, ELEMENTOS, sistemaDe, norm180 } from './sistemaSolar.js';
import { solEspacial } from './astronomia.js';
import { RADIO_SOL } from './astronomia.js';

const KM_UA = 1.496e8;
const RAD = Math.PI / 180;
const LUNAS_KM = { luna: 384400, fobos: 9376, deimos: 23463, io: 421700, europa: 671100, ganimedes: 1070400, calisto: 1882700, titan: 1221870 };
export const hex = (c) => new THREE.Color(c);
const MIN_ANG = 0.0042;     // tamaño mínimo (rad): un punto brillante
const MAX_DISCOS = 14;

const VERT = `varying vec2 vUv; uniform float escala; void main(){ vUv = position.xy * 2.0 * escala; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
varying vec2 vUv;
uniform vec3 col; uniform vec3 col2; uniform vec3 luz; uniform float bandas; uniform float anillos; uniform float alfa; uniform float ptr;
void main(){
  vec2 p = vUv; float r = length(p);
  vec4 c = vec4(0.0);
  if (anillos > 0.5) {
    float rr = length(vec2(p.x, p.y / 0.3));
    float ring = smoothstep(1.28, 1.34, rr) * (1.0 - smoothstep(2.05, 2.1, rr)) * (0.55 + 0.45 * step(0.0, sin(rr * 46.0)));
    c = vec4(vec3(0.86, 0.78, 0.6) * ring * 0.9, ring * 0.85);
  }
  if (r < 1.0) {
    vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
    float l = clamp(dot(n, luz) * 1.5 + 0.08, 0.0, 1.0);
    float b = bandas > 0.5 ? 0.5 + 0.5 * sin(p.y * 10.0 + sin(p.x * 3.0) * 0.7) : 0.5 + 0.12 * sin(p.x * 13.0 + p.y * 7.0);
    vec3 base = mix(col, col2, b);
    float limbo = 0.75 + 0.25 * n.z;
    c = vec4(base * (0.06 + 1.0 * l) * limbo, 1.0);
    if (r > 0.94) c.a = 1.0 - smoothstep(0.94, 1.0, r);
  }
  if (ptr > 0.5 && r >= 1.0) { float g = exp(-(r - 1.0) * 5.0); c = vec4(col * g, g * 0.9); }
  if (c.a < 0.01) discard;
  gl_FragColor = vec4(c.rgb, c.a * alfa);
}`;

export class CieloSolar {
  constructor(escena, camara) {
    this.camara = camara;
    this.grupo = new THREE.Group();
    this.grupo.visible = false;
    escena.add(this.grupo);
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.discos = [];
    for (let i = 0; i < MAX_DISCOS; i++) {
      const m = new THREE.ShaderMaterial({
        uniforms: { escala: { value: 1.05 }, col: { value: new THREE.Color() }, col2: { value: new THREE.Color() }, luz: { value: new THREE.Vector3(0, 0, 1) }, bandas: { value: 0 }, anillos: { value: 0 }, alfa: { value: 1 }, ptr: { value: 0 } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
      });
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.visible = false; mesh.renderOrder = 2; mesh.frustumCulled = false;
      this.grupo.add(mesh);
      this.discos.push(mesh);
    }
    this.v = new THREE.Vector3(); this.q = new THREE.Vector3(); this.polo = new THREE.Vector3(); this.sol = new THREE.Vector3(); this.luzV = new THREE.Vector3();
    this.cache = { t: -1e9, pos: null };
    this.lista = [];     // lo último dibujado (para pruebas y para el diario)
    this.solInfo = { radio: RADIO_SOL, brillo: 1, dist: 1 };
  }
  dispose() { for (const d of this.discos) d.material.dispose(); this.geo.dispose(); this.grupo.parent && this.grupo.parent.remove(this.grupo); }
  ocultar() { this.grupo.visible = false; }

  // rota v alrededor de eje unitario por ang (Rodrigues), resultado en out
  rotar(out, v, eje, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), d = eje.dot(v);
    this.q.copy(eje).cross(v);
    out.set(v.x * c + this.q.x * s + eje.x * d * (1 - c), v.y * c + this.q.y * s + eje.y * d * (1 - c), v.z * c + this.q.z * s + eje.z * d * (1 - c));
    return out.normalize();
  }

  // Tamaño y brillo del Sol visto desde un cuerpo (distancia real al Sol en UA)
  static sol(cuerpo, diaAbs) {
    const ua = Math.max(0.25, posicionReal(sistemaDe(cuerpo) === 'luna' ? 'tierra' : sistemaDe(cuerpo), diaSolar(diaAbs)).r);
    return { ua, radio: Math.max(0.0045, Math.min(0.1, RADIO_SOL / ua)), brillo: Math.max(0.28, Math.min(1.45, 1 / (ua * ua))) };
  }

  // o: { cuerpo, dim (datos), diaAbs, hora, ciclo, lejos, estacion (cuerpoGrande), transito: {origen, destino, prog, pos:{x,y}} | null, nivel (0..1 cantidad de cuerpos) }
  actualizar(o) {
    const cam = this.camara;
    this.grupo.visible = true;
    this.grupo.position.copy(cam.position);
    const D = o.lejos * 0.78;
    const s = solEspacial(o.hora, o.diaAbs + o.hora, o.ciclo), s2 = solEspacial(o.hora, o.diaAbs + o.hora + 0.02, o.ciclo);
    this.sol.set(s.x, s.y, s.z);
    this.polo.set(s.x, s.y, s.z).cross(this.q.set(s2.x, s2.y, s2.z));
    if (this.polo.lengthSq() < 1e-9) this.polo.set(0, 0, 1);
    this.polo.normalize();
    this.luzV.copy(this.sol).transformDirection(cam.matrixWorldInverse);
    let n = 0;
    const poner = (id, dirV, ang, extra = {}) => {
      if (n >= MAX_DISCOS) return;
      const F = FISICA[id] || { color: '#cccccc' };
      const m = this.discos[n++];
      const punto = ang < MIN_ANG;
      const a = Math.max(ang, MIN_ANG);
      m.visible = true;
      m.position.copy(dirV).multiplyScalar(D);
      m.quaternion.copy(cam.quaternion);
      const sc = extra.anillos || F.anillos ? 2.15 : 1.1;
      const half = D * Math.tan(Math.min(a, 1.3)) * sc;
      m.scale.set(half * 2, half * 2, 1);
      const u = m.material.uniforms;
      u.escala.value = sc;
      u.col.value.set(F.color); u.col2.value.set(extra.col2 || F.color);
      if (F.bandas || extra.bandas) u.col2.value.multiplyScalar(0.75);
      u.luz.value.copy(this.luzV);
      u.bandas.value = F.bandas ? 1 : 0; u.anillos.value = F.anillos ? 1 : 0;
      u.ptr.value = punto ? 1 : 0;
      u.alfa.value = extra.alfa ?? 1;
      if (punto) { u.luz.value.set(0, 0, 1); }
      this.lista[n - 1] = { id, ang: a, dir: dirV.clone ? dirV.clone() : dirV };
    };
    this.lista.length = 0;
    if (o.transito) this.transito(o, poner);
    else this.desdeCuerpo(o, poner);
    for (let i = n; i < MAX_DISCOS; i++) this.discos[i].visible = false;
    this.lista.length = n;
  }

  posiciones(diaAbs) {
    if (Math.abs(diaAbs - this.cache.t) < 0.02 && this.cache.pos) return this.cache.pos;
    const pos = {};
    for (const id of Object.keys(ELEMENTOS)) pos[id] = posicionReal(id, diaSolar(diaAbs));
    this.cache = { t: diaAbs, pos };
    return pos;
  }

  desdeCuerpo(o, poner) {
    const cuerpo = o.cuerpo, P = this.posiciones(o.diaAbs), sis = sistemaDe(cuerpo);
    if (!P[sis]) return;
    const me = P[sis];
    const aSol = Math.atan2(-me.y, -me.x);
    const d = diaSolar(o.diaAbs);
    // cuerpo padre (visto desde una luna) o el cuerpo grande bajo las estaciones y anillos
    const lu = LUNAS[cuerpo], dim = o.dim || {};
    const conTierra = dim.tierraVisible || dim.tierraGrande;       // la Tierra de la Luna y la órbita la dibuja el shader del domo
    const abajo = dim.estacion || dim.cuerpoGrande === cuerpo;
    if (abajo && !conTierra) {
      const F = FISICA[cuerpo], km = 1.2e6 * (cuerpo === 'saturno' ? 1 : 1);
      poner(cuerpo, this.q.set(0, -0.8, 0.45).normalize(), cuerpo === 'luna' ? 0.7 : 0.95, { bandas: !!F.bandas });
    }
    const padre = lu && !conTierra && !abajo ? lu.de : null;
    if (lu && !conTierra) {
      const km = LUNAS_KM[cuerpo];
      if (padre) poner(padre, this.v.set(0.45, 0.62, -0.3).normalize(), Math.min(1.1, FISICA[padre].radioKm / km));
      else if (abajo) { this.rotar(this.v, this.sol, this.polo, 0.9); poner(lu.de, this.v, Math.max(MIN_ANG, FISICA[lu.de].radioKm / km * 0.2)); }
      for (const hermana of Object.keys(LUNAS)) {
        if (hermana === cuerpo || LUNAS[hermana].de !== lu.de) continue;
        const dl = (d / LUNAS[hermana].periodo - d / lu.periodo) * Math.PI * 2;
        this.rotar(this.v, this.sol, this.polo, dl);
        poner(hermana, this.v, Math.min(0.03, FISICA[hermana].radioKm / Math.abs(LUNAS_KM[hermana] - km) * 0.5));
      }
    } else if (!lu && !abajo) {
      // un planeta con lunas: se ven en su órbita
      for (const m of Object.keys(LUNAS)) {
        if (LUNAS[m].de !== sis) continue;
        const dl = (d / LUNAS[m].periodo) * Math.PI * 2;
        this.rotar(this.v, this.sol, this.polo, dl);
        poner(m, this.v, Math.max(MIN_ANG, FISICA[m].radioKm / LUNAS_KM[m]));
      }
    }
    if (cuerpo === 'tierra') { this.rotar(this.v, this.sol, this.polo, (d / LUNAS.luna.periodo) * Math.PI * 2); poner('luna', this.v, 0.012); }
    for (const id of ['mercurio', 'venus', 'tierra', 'marte', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton']) {
      if (id === sis || (padre && sistemaDe(padre) === id) || (lu && lu.de === id) || (abajo && sistemaDe(cuerpo) === id)) continue;
      const t = P[id];
      const dx = t.x - me.x, dy = t.y - me.y, dz = t.z - me.z, dist = Math.hypot(dx, dy, dz);
      const delta = norm180((Math.atan2(dy, dx) - aSol) / RAD) * RAD;
      this.rotar(this.v, this.sol, this.polo, delta);
      let ang = FISICA[id].radioKm / (dist * KM_UA);
      const elon = Math.abs(delta);
      // el brillo (disco o punto) y la fase por la posición del cuerpo respecto al Sol
      poner(id, this.v, ang, { alfa: 1 });
      if (id === 'tierra' && cuerpo !== 'luna' && !conTierra) {
        const dl = (d / LUNAS.luna.periodo) * Math.PI * 2;
        const sep = Math.max(0.014, LUNAS_KM.luna * 6 / (dist * KM_UA));
        this.rotar(this.q, this.v, this.polo, sep * Math.sin(dl) * 1.0);
        this.q.addScaledVector(this.sol, 0); this.q.normalize();
        poner('luna', this.q, Math.max(MIN_ANG, 1737 / (dist * KM_UA)));
      }
      void elon;
    }
  }

  // En tránsito: marco de la nave (proa = -Z). El destino crece al frente, el origen queda atrás a la izquierda,
  // el resto en su ángulo real respecto al rumbo. El Sol también se coloca en ese marco (o.solOut).
  transito(o, poner) {
    const T = o.transito, cam = this.camara;
    const pos = T.pos, dx0 = T.destPos.x - pos.x, dy0 = T.destPos.y - pos.y;
    const aH = T.orbitando ? Math.atan2(-pos.y, -pos.x) + 1.2 : Math.atan2(dy0, dx0);
    const dirDe = (az, el) => this.v.set(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    const azSol = Math.atan2(-pos.y, -pos.x) - aH;
    this.sol.copy(dirDe(azSol, 0.16));
    if (o.solOut) o.solOut.copy(this.sol);
    this.luzV.copy(this.sol).transformDirection(cam.matrixWorldInverse);
    let k = 0;
    for (const id of ['mercurio', 'venus', 'tierra', 'marte', 'jupiter', 'saturno', 'urano', 'neptuno']) {
      k++;
      const t = posicion(id, o.diaAbs);
      const dx = t.x - pos.x, dy = t.y - pos.y, dist = Math.hypot(dx, dy) || 1;
      let az = Math.atan2(dy, dx) - aH, ang = Math.min(0.03, FISICA[id].radioKm / (dist * 1.2e6)), el = 0.1 + 0.09 * Math.sin(k * 2.3);
      if (id === T.destino) { az = T.orbitando ? 0.05 : 0; el = T.orbitando ? 0.05 : 0.12; ang = T.orbitando ? 0.5 : 0.004 + 0.5 * Math.pow(Math.max(0, T.prog), 3.2); }
      else if (id === T.origen) { az = 1.9; el = 0.1; ang = Math.max(MIN_ANG, 0.22 * Math.pow(Math.max(0, 1 - T.prog), 3)); }
      poner(id, dirDe(az, el), ang);
    }
  }
}
