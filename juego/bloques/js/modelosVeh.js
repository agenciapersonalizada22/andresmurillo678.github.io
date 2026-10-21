// =============================================================
//  🚙  MODELOS 3D DE LOS VEHÍCULOS (todo con código)
//  Jeep, bote, avioneta y vagoneta, hechos con piezas: carrocería
//  con bisel, ruedas con llanta y birlos, faros que brillan, cabina
//  con asientos y volante, hélice que gira, timón, alerones...
//  Todos miran hacia -Z (como la cámara con giro 0). Cada modelo
//  devuelve un grupo con "partes" que el juego mueve: ruedas que
//  giran y se voltean, hélice, alerones, volante, luces.
// =============================================================
import * as THREE from '../lib/three.module.min.js';

const cacheMat = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  let m = cacheMat.get(k);
  if (!m) {
    m = new THREE.MeshPhongMaterial({ color, shininess: o.brillo ?? 40, specular: o.espec ?? 0x333333, flatShading: !!o.plano });
    if (o.emisivo !== undefined) { m.emissive = new THREE.Color(o.emisivo); m.emissiveIntensity = o.intensidad ?? 1; }
    if (o.alfa !== undefined) { m.transparent = true; m.opacity = o.alfa; m.depthWrite = false; }
    if (o.dosCaras) m.side = THREE.DoubleSide;
    cacheMat.set(k, m);
  }
  return m;
}

function caja(grupo, w, h, l, x, y, z, material, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  grupo.add(m);
  return m;
}

function cilindro(grupo, rt, rb, h, x, y, z, material, rx = 0, ry = 0, rz = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  grupo.add(m);
  return m;
}

// Junta en una sola malla todas las piezas que comparten material (menos llamadas a la tarjeta de video).
// Las piezas que se mueven (en "excluir") y los grupos se quedan como están; los grupos se revisan por dentro.
function fusionar(grupo, excluir) {
  const porMaterial = new Map();
  for (const hijo of grupo.children.slice()) {
    if (hijo.isGroup) { fusionar(hijo, excluir); continue; }
    if (!hijo.isMesh || excluir.has(hijo)) continue;
    let lista = porMaterial.get(hijo.material);
    if (!lista) porMaterial.set(hijo.material, lista = []);
    lista.push(hijo);
  }
  for (const [material, lista] of porMaterial) {
    if (lista.length < 2) continue;
    const pos = [], nor = [], uv = [];
    for (const m of lista) {
      m.updateMatrix();
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrix);
      pos.push(g.attributes.position.array);
      nor.push(g.attributes.normal.array);
      uv.push(g.attributes.uv ? g.attributes.uv.array : new Float32Array((g.attributes.position.count) * 2));
      grupo.remove(m);
      m.geometry.dispose();
    }
    const unir = (arr, Tipo) => { let n = 0; for (const a of arr) n += a.length; const r = new Tipo(n); let o = 0; for (const a of arr) { r.set(a, o); o += a.length; } return r; };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(unir(pos, Float32Array), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(unir(nor, Float32Array), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(unir(uv, Float32Array), 2));
    grupo.add(new THREE.Mesh(geo, material));
  }
}

function terminar(resultado) {
  const p = resultado.partes;
  const excluir = new Set();
  const poner = (o) => { if (o) excluir.add(o); };
  for (const l of (p.luces || []).concat(p.frenos || [])) poner(l.malla);
  for (const e of p.exterior || []) poner(e);
  poner(p.volante); poner(p.helice); poner(p.discoHelice); poner(p.timon); poner(p.motor);
  for (const a of p.alerones || []) poner(a.grupo);
  for (const e of p.elevadores || []) poner(e);
  fusionar(resultado.grupo, excluir);
  return resultado;
}

// Perfil de lado (z, y) que se "estira" a lo ancho (eje X) con bordes biselados
function extruirPerfil(puntos, ancho, bisel, material) {
  const sh = new THREE.Shape();
  puntos.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: ancho - bisel * 2, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 2, curveSegments: 4 });
  // el estiramiento va en Z: se gira para que vaya en X y el perfil quede (z, y)
  g.rotateY(-Math.PI / 2);
  g.translate(ancho / 2 - bisel, 0, 0);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

// Una rueda con llanta, rin y birlos. "giro" rota al avanzar y "pivote" se voltea al girar.
function crearRueda(radio, ancho, colorRin = 0xb8bcc4) {
  const pivote = new THREE.Group();
  const giro = new THREE.Group();
  pivote.add(giro);
  const llanta = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, ancho, 24), mat(0x1a1a1c, { brillo: 8 }));
  llanta.rotation.z = Math.PI / 2;
  giro.add(llanta);
  // taquitos de la llanta (se ven girar)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const t = caja(giro, ancho * 1.02, radio * 0.12, radio * 0.16, 0, Math.sin(a) * radio * 0.97, Math.cos(a) * radio * 0.97, mat(0x0c0c0e, { brillo: 4 }), -a, 0, 0);
    t.rotation.x = a;
  }
  const rin = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.62, radio * 0.62, ancho * 1.04, 20), mat(colorRin, { brillo: 90, espec: 0x888888 }));
  rin.rotation.z = Math.PI / 2;
  giro.add(rin);
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.18, radio * 0.18, ancho * 1.12, 12), mat(0x55585e, { brillo: 60 }));
  centro.rotation.z = Math.PI / 2;
  giro.add(centro);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.045, radio * 0.045, ancho * 1.16, 6), mat(0x2c2e32));
    b.rotation.z = Math.PI / 2;
    b.position.set(0, Math.sin(a) * radio * 0.34, Math.cos(a) * radio * 0.34);
    giro.add(b);
  }
  for (let i = 0; i < 5; i++) { // rayos del rin
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const r = caja(giro, ancho * 1.06, radio * 0.5, radio * 0.12, 0, Math.sin(a) * radio * 0.4, Math.cos(a) * radio * 0.4, mat(0x9ca0a8, { brillo: 70 }));
    r.rotation.x = -a;
  }
  return { pivote, giro };
}

// ----------------------------------------------------------- JEEP
export function crearJeep(color = 0x4a7a3a) {
  const g = new THREE.Group();
  const partes = { ruedas: [], delanteras: [], luces: [], frenos: [], volante: null, exterior: [] };
  const carro = mat(color, { brillo: 70, espec: 0x666666 });
  const oscuro = mat(0x1d1f22, { brillo: 20 });
  const gris = mat(0x6a6e74, { brillo: 50 });
  const asiento = mat(0x2b2b30, { brillo: 10 });
  const cromo = mat(0xcfd2d8, { brillo: 120, espec: 0xaaaaaa });

  // chasis y piso
  caja(g, 1.5, 0.16, 3.6, 0, 0.5, 0, oscuro);
  caja(g, 1.3, 0.1, 3.0, 0, 0.42, 0.1, mat(0x101012));
  // carrocería: perfil de lado (z, y), frente en -Z
  const cuerpo = extruirPerfil([[-1.95, 0.55], [-1.95, 0.98], [-1.55, 1.1], [1.9, 1.1], [1.9, 0.55]], 1.78, 0.04, carro);
  g.add(cuerpo);
  // tapa del motor un poco más alta
  const cofre = extruirPerfil([[-1.9, 1.0], [-1.55, 1.18], [-0.65, 1.2], [-0.65, 1.1], [-1.9, 0.95]], 1.5, 0.03, carro);
  cofre.position.y = 0;
  g.add(cofre);
  // salpicaderas anchas sobre las ruedas
  for (const z of [-1.2, 1.2]) {
    for (const s of [-1, 1]) {
      const sal = caja(g, 0.34, 0.1, 1.0, s * 0.96, 0.98, z, carro);
      sal.rotation.z = s * 0.0;
      caja(g, 0.1, 0.3, 1.0, s * 1.1, 0.84, z, carro);
    }
  }
  // parrilla frontal y faros
  caja(g, 1.0, 0.5, 0.06, 0, 0.82, -1.99, oscuro);
  for (let i = -3; i <= 3; i++) caja(g, 0.06, 0.4, 0.05, i * 0.14, 0.82, -2.03, cromo);
  const faroMat = mat(0xfff4c8, { emisivo: 0x332a10, intensidad: 0.5, brillo: 120 });
  for (const s of [-1, 1]) {
    cilindro(g, 0.17, 0.17, 0.1, s * 0.66, 0.85, -2.0, cromo, Math.PI / 2);
    const faro = cilindro(g, 0.14, 0.14, 0.08, s * 0.66, 0.85, -2.05, faroMat, Math.PI / 2);
    partes.luces.push({ malla: faro, base: faroMat, delantero: true });
    caja(g, 0.18, 0.1, 0.06, s * 0.66, 0.62, -2.03, mat(0xff9a2a, { emisivo: 0x552200 })); // direccional
  }
  // defensa
  caja(g, 1.9, 0.14, 0.2, 0, 0.55, -2.05, cromo);
  caja(g, 1.9, 0.14, 0.2, 0, 0.55, 2.0, cromo);
  // luces traseras
  const traseraMat = mat(0xcc1111, { emisivo: 0x550000, intensidad: 0.6 });
  for (const s of [-1, 1]) {
    const t = caja(g, 0.2, 0.3, 0.06, s * 0.78, 0.9, 1.93, traseraMat);
    partes.frenos.push({ malla: t, base: traseraMat });
  }
  // llanta de refacción atrás
  const refaccion = crearRueda(0.42, 0.3, 0xa0a4ac);
  refaccion.pivote.position.set(0, 1.0, 2.15);
  refaccion.pivote.rotation.x = Math.PI / 2;
  g.add(refaccion.pivote);
  // parabrisas: marco y vidrio inclinado
  const vidrio = mat(0x7fb7d6, { alfa: 0.42, brillo: 120, espec: 0xffffff });
  const marco = mat(0x24262a);
  const pb = new THREE.Group();
  pb.position.set(0, 1.1, -0.6);
  pb.rotation.x = -0.25;
  caja(pb, 1.7, 0.7, 0.03, 0, 0.35, 0, vidrio);
  caja(pb, 1.78, 0.06, 0.06, 0, 0.72, 0, marco);
  caja(pb, 0.06, 0.74, 0.06, -0.86, 0.35, 0, marco);
  caja(pb, 0.06, 0.74, 0.06, 0.86, 0.35, 0, marco);
  g.add(pb);
  partes.exterior.push(pb);
  // barra antivuelco
  for (const s of [-1, 1]) {
    cilindro(g, 0.045, 0.045, 1.0, s * 0.8, 1.55, 0.5, cromo);
  }
  const barra = cilindro(g, 0.045, 0.045, 1.64, 0, 2.05, 0.5, cromo, 0, 0, Math.PI / 2);
  partes.exterior.push(barra);
  // asientos, volante y tablero
  for (const s of [-1, 1]) {
    caja(g, 0.52, 0.16, 0.52, s * 0.4, 0.78, 0.15, asiento);
    caja(g, 0.52, 0.62, 0.14, s * 0.4, 1.12, 0.45, asiento).rotation.x = 0.15;
  }
  caja(g, 1.5, 0.2, 0.5, 0, 0.78, 1.15, asiento);
  caja(g, 1.5, 0.55, 0.14, 0, 1.1, 1.45, asiento).rotation.x = 0.1;
  caja(g, 1.6, 0.28, 0.4, 0, 1.18, -0.82, oscuro); // tablero
  const volante = new THREE.Group();
  volante.position.set(-0.4, 1.28, -0.55);
  volante.rotation.x = -0.9;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 20), mat(0x151517));
  volante.add(aro);
  caja(volante, 0.36, 0.03, 0.03, 0, 0, 0, mat(0x151517));
  caja(volante, 0.03, 0.18, 0.03, 0, -0.09, 0, mat(0x151517));
  cilindro(volante, 0.03, 0.03, 0.4, 0, 0, 0.18, mat(0x222224), Math.PI / 2);
  g.add(volante);
  partes.volante = volante;
  // espejos, manijas y tubo de escape
  for (const s of [-1, 1]) {
    caja(g, 0.06, 0.18, 0.12, s * 1.0, 1.4, -0.65, oscuro);
    caja(g, 0.1, 0.1, 0.04, s * 0.92, 1.12, 0.2, cromo);
  }
  cilindro(g, 0.06, 0.06, 0.5, -0.6, 0.45, 2.0, mat(0x55585e, { brillo: 90 }), Math.PI / 2);
  // faros auxiliares sobre el cofre
  caja(g, 0.5, 0.05, 0.05, 0, 1.2, -1.2, oscuro);
  // ruedas
  const R = 0.46, ancho = 0.36;
  for (const [x, z, del] of [[-1.0, -1.25, true], [1.0, -1.25, true], [-1.0, 1.2, false], [1.0, 1.2, false]]) {
    const r = crearRueda(R, ancho);
    r.pivote.position.set(x, R, z);
    if (x > 0) r.giro.scale.x = -1;
    g.add(r.pivote);
    partes.ruedas.push(r);
    if (del) partes.delanteras.push(r);
  }
  partes.radioRueda = R;
  return terminar({ grupo: g, partes });
}

// ----------------------------------------------------------- Lofting (para el casco del bote)
function loft(estaciones, material) {
  // estaciones: lista de { z, puntos: [[x, y], ...] } con el mismo número de puntos
  const n = estaciones[0].puntos.length;
  const pos = [], ind = [];
  estaciones.forEach((e) => e.puntos.forEach(([x, y]) => pos.push(x, y, e.z)));
  for (let i = 0; i < estaciones.length - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = i * n + j + 1, c = (i + 1) * n + j + 1, d = (i + 1) * n + j;
      ind.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(ind);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

// ----------------------------------------------------------- BOTE
export function crearBote(color = 0xe8eef4) {
  const g = new THREE.Group();
  const partes = { luces: [], frenos: [], volante: null, helice: null, exterior: [], ruedas: [], delanteras: [] };
  const casco = mat(color, { brillo: 90, espec: 0x888888, dosCaras: true });
  const azul = mat(0x1f5fa8, { brillo: 70, dosCaras: true });
  const madera = mat(0xa8793f, { brillo: 20 });
  const cromo = mat(0xcfd2d8, { brillo: 120, espec: 0xaaaaaa });
  // casco por estaciones (de la proa -Z a la popa +Z): borda izq, quilla, borda der
  const sec = (z, ancho, quilla, borda) => ({
    z,
    puntos: [[-ancho, borda], [-ancho * 0.92, borda * 0.45], [-ancho * 0.45, quilla * 0.35], [0, quilla], [ancho * 0.45, quilla * 0.35], [ancho * 0.92, borda * 0.45], [ancho, borda]],
  });
  const est = [
    sec(-2.3, 0.02, 0.18, 0.78), sec(-1.9, 0.38, 0.1, 0.74), sec(-1.2, 0.72, 0.0, 0.66), sec(-0.4, 0.88, -0.05, 0.6),
    sec(0.6, 0.9, -0.06, 0.58), sec(1.5, 0.86, -0.04, 0.6), sec(2.05, 0.82, -0.02, 0.62),
  ];
  g.add(loft(est, casco));
  // franja azul y borda blanca
  const franja = loft(est.map((e) => ({ z: e.z, puntos: [[e.puntos[0][0] * 1.005, e.puntos[0][1] - 0.2], [e.puntos[0][0] * 1.005, e.puntos[0][1] - 0.05]] })), azul);
  g.add(franja);
  const franja2 = loft(est.map((e) => ({ z: e.z, puntos: [[e.puntos[6][0] * 1.005, e.puntos[6][1] - 0.2], [e.puntos[6][0] * 1.005, e.puntos[6][1] - 0.05]] })), azul);
  g.add(franja2);
  // cubierta de popa y de proa
  caja(g, 1.74, 0.06, 0.9, 0, 0.58, 1.55, madera);
  const proa = loft([{ z: -2.3, puntos: [[0.02, 0.78], [-0.02, 0.78]] }, { z: -1.2, puntos: [[0.7, 0.67], [-0.7, 0.67]] }, { z: -0.7, puntos: [[0.78, 0.63], [-0.78, 0.63]] }], mat(0xdfe5ea, { brillo: 40, dosCaras: true, emisivo: 0x2c3034 }));
  g.add(proa);
  // piso de madera y bancas
  caja(g, 1.5, 0.05, 2.0, 0, 0.18, 0.2, madera);
  caja(g, 1.5, 0.1, 0.4, 0, 0.42, 0.9, mat(0xefe9dc));
  caja(g, 1.5, 0.28, 0.1, 0, 0.62, 1.12, mat(0xefe9dc));
  // consola con volante y parabrisas
  caja(g, 0.9, 0.5, 0.4, 0.4, 0.45, -0.9, mat(0xdfe5ea, { brillo: 60 }));
  const vol = new THREE.Group();
  vol.position.set(0.4, 0.82, -0.78);
  vol.rotation.x = -0.6;
  vol.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 18), mat(0x151517)));
  caja(vol, 0.3, 0.025, 0.025, 0, 0, 0, mat(0x151517));
  g.add(vol);
  partes.volante = vol;
  const vidrio = mat(0x86bfdc, { alfa: 0.4, brillo: 120, espec: 0xffffff, dosCaras: true });
  const pb = new THREE.Group();
  pb.position.set(0.0, 0.66, -0.45);
  pb.rotation.x = -0.45;
  caja(pb, 1.5, 0.5, 0.03, 0, 0.25, 0, vidrio);
  caja(pb, 1.56, 0.05, 0.05, 0, 0.52, 0, cromo);
  caja(pb, 0.05, 0.52, 0.05, -0.76, 0.26, 0, cromo);
  caja(pb, 0.05, 0.52, 0.05, 0.76, 0.26, 0, cromo);
  g.add(pb);
  partes.exterior.push(pb);
  // motor fuera de borda con hélice
  const motor = new THREE.Group();
  motor.position.set(0, 0.55, 2.2);
  caja(motor, 0.4, 0.6, 0.35, 0, 0.3, 0, mat(0x2c3037, { brillo: 60 }));
  caja(motor, 0.32, 0.12, 0.3, 0, 0.62, 0, mat(0xc43a2a, { brillo: 60 }));
  cilindro(motor, 0.05, 0.05, 0.7, 0, -0.2, 0.08, cromo);
  const hel = new THREE.Group();
  hel.position.set(0, -0.55, 0.14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const aspa = caja(hel, 0.28, 0.06, 0.04, Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0, cromo);
    aspa.rotation.z = a;
    aspa.rotation.x = 0.3;
  }
  hel.rotation.y = 0;
  motor.add(hel);
  g.add(motor);
  partes.helice = hel;
  partes.motor = motor;
  // luces: faro de proa y luz de popa
  const farol = mat(0xfff4c8, { emisivo: 0x332a10, intensidad: 0.6 });
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), farol);
  f.position.set(0, 0.88, -1.6);
  g.add(f);
  partes.luces.push({ malla: f, base: farol, delantero: true });
  caja(g, 0.04, 0.4, 0.04, 0, 0.8, -1.6, cromo);
  // defensas laterales
  for (const s of [-1, 1]) for (const z of [-0.4, 0.9]) cilindro(g, 0.1, 0.1, 0.32, s * 0.9, 0.5, z, mat(0x1f5fa8), 0, 0, Math.PI / 2 * 0);
  return terminar({ grupo: g, partes });
}

// ----------------------------------------------------------- AVIONETA
export function crearAvioneta(color = 0xf2f2f0, acento = 0xc8282b) {
  const g = new THREE.Group();
  const partes = { luces: [], frenos: [], volante: null, helice: null, alerones: [], elevadores: [], timon: null, ruedas: [], delanteras: [], exterior: [], discoHelice: null };
  const cuerpo = mat(color, { brillo: 110, espec: 0x999999 });
  const rojo = mat(acento, { brillo: 90, espec: 0x777777 });
  const gris = mat(0x8e949c, { brillo: 70 });
  const oscuro = mat(0x1e2024, { brillo: 20 });
  const cromo = mat(0xcfd2d8, { brillo: 120, espec: 0xaaaaaa });

  // fuselaje: de revolución (radio según la posición); nariz en -Z y cola en +Z
  const radios = [[0.0, -3.3], [0.28, -3.2], [0.5, -2.95], [0.62, -2.55], [0.7, -2.0], [0.74, -1.2], [0.74, -0.2], [0.7, 0.8], [0.58, 1.8], [0.42, 2.8], [0.3, 3.5], [0.16, 3.9], [0.06, 4.05]];
  const lat = new THREE.LatheGeometry(radios.map(([r, z]) => new THREE.Vector2(r, z)), 28);
  lat.rotateX(Math.PI / 2);
  // LatheGeometry gira alrededor de Y y "z" es la altura: tras girar, el eje largo queda en Z
  const fus = new THREE.Mesh(lat, cuerpo);
  fus.scale.set(1, 0.92, 1);
  fus.position.y = 1.25;
  g.add(fus);
  // franja roja lateral
  for (const s of [-1, 1]) {
    const fr = caja(g, 0.02, 0.16, 4.6, s * 0.73, 1.2, 0.3, rojo);
    fr.rotation.y = 0;
  }
  // capó (cubierta del motor) y entradas de aire
  const capo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.64, 0.5, 20), rojo);
  capo.rotation.x = Math.PI / 2;
  capo.position.set(0, 1.25, -2.8);
  g.add(capo);
  for (const s of [-1, 1]) caja(g, 0.18, 0.08, 0.04, s * 0.28, 1.0, -3.07, oscuro);
  // cabina: cúpula de vidrio con marcos
  const vidrio = mat(0x6fb0d4, { alfa: 0.45, brillo: 140, espec: 0xffffff, dosCaras: true });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), vidrio);
  cupula.scale.set(0.98, 0.78, 2.1);
  cupula.position.set(0, 1.5, 0.35);
  g.add(cupula);
  partes.exterior.push(cupula);
  const marcoMat = mat(0x24262a);
  for (const z of [-0.45, 0.35, 1.2]) {
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 6, 16, Math.PI), marcoMat);
    arco.position.set(0, 1.5, z);
    arco.scale.set(1, 0.78, 1);
    g.add(arco);
    partes.exterior.push(arco);
  }
  // asientos, tablero y yugo
  for (const s of [-1, 1]) {
    caja(g, 0.46, 0.14, 0.5, s * 0.3, 1.02, 0.5, mat(0x2b2b30));
    caja(g, 0.46, 0.55, 0.12, s * 0.3, 1.32, 0.82, mat(0x2b2b30)).rotation.x = 0.2;
  }
  caja(g, 1.3, 0.22, 0.4, 0, 1.4, -0.55, oscuro).rotation.x = -0.35;
  const yugo = new THREE.Group();
  yugo.position.set(-0.3, 1.2, -0.2);
  cilindro(yugo, 0.025, 0.025, 0.5, 0, 0, 0, oscuro, Math.PI / 2 * 1 + 0.5);
  caja(yugo, 0.34, 0.04, 0.04, 0, 0.12, -0.22, oscuro);
  g.add(yugo);
  partes.volante = yugo;
  // alas: perfil trapezoidal con espesor
  const ala = (s) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.95); sh.lineTo(4.5, -0.55); sh.lineTo(4.5, 0.35); sh.lineTo(0, 1.05); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2 });
    geo.rotateX(Math.PI / 2);                 // el perfil (x, z) queda plano
    const m = new THREE.Mesh(geo, cuerpo);
    m.scale.x = s;
    m.position.set(0, 0.95, 0);
    return m;
  };
  g.add(ala(1), ala(-1));
  // puntas rojas, luces de navegación y alerones
  for (const s of [-1, 1]) {
    caja(g, 0.5, 0.09, 0.92, s * 4.25, 0.97, -0.1, rojo);
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(s < 0 ? 0xff2020 : 0x20ff40, { emisivo: s < 0 ? 0xaa0000 : 0x00aa22 }));
    nav.position.set(s * 4.55, 0.99, -0.1);
    g.add(nav);
    const alerón = new THREE.Group();
    alerón.position.set(s * 3.3, 0.97, 0.55);
    caja(alerón, 1.9, 0.06, 0.3, s * -0.0, 0, 0.15, rojo);
    g.add(alerón);
    partes.alerones.push({ grupo: alerón, lado: s });
    // soportes del ala
    const sop = caja(g, 0.06, 1.1, 0.06, s * 1.5, 0.5, -0.1, gris);
    sop.rotation.z = s * -0.6;
    sop.position.set(s * 1.3, 0.5, -0.1);
  }
  // cola: estabilizadores, timón y elevadores
  for (const s of [-1, 1]) {
    const est = caja(g, 1.5, 0.07, 0.8, s * 0.82, 1.28, 3.45, cuerpo);
    est.rotation.z = s * 0.0;
    const elev = new THREE.Group();
    elev.position.set(s * 0.82, 1.28, 3.9);
    caja(elev, 1.5, 0.05, 0.4, 0, 0, 0.2, rojo);
    g.add(elev);
    partes.elevadores.push(elev);
  }
  const aleta = extruirPerfil([[3.0, 1.2], [3.9, 1.2], [3.95, 2.35], [3.45, 2.5], [3.1, 1.95]], 0.12, 0.03, cuerpo);
  g.add(aleta);
  const timon = new THREE.Group();
  timon.position.set(0, 1.25, 3.95);
  const tpl = extruirPerfil([[0, 0], [0.4, 0], [0.38, 1.15], [0.05, 1.2]], 0.08, 0.02, rojo);
  timon.add(tpl);
  g.add(timon);
  partes.timon = timon;
  // hélice con aspas y disco difuso
  const helice = new THREE.Group();
  helice.position.set(0, 1.25, -3.35);
  const cono = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 16), rojo);
  cono.rotation.x = -Math.PI / 2;
  cono.position.z = -0.18;
  helice.add(cono);
  for (let i = 0; i < 2; i++) {
    const aspa = new THREE.Group();
    const forma = new THREE.Shape();
    forma.moveTo(-0.07, 0.15); forma.lineTo(0.07, 0.15); forma.lineTo(0.05, 1.25); forma.lineTo(-0.04, 1.3); forma.closePath();
    const am = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.03, bevelEnabled: false }), mat(0x2a2c30, { brillo: 60 }));
    aspa.add(am);
    const punta = caja(aspa, 0.1, 0.2, 0.035, 0, 1.15, 0.015, mat(0xf4c020));
    aspa.rotation.z = i * Math.PI;
    aspa.rotation.y = 0.0;
    helice.add(aspa);
  }
  g.add(helice);
  partes.helice = helice;
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1.3, 28), new THREE.MeshBasicMaterial({ color: 0xd8dde4, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  disco.position.set(0, 1.25, -3.4);
  g.add(disco);
  partes.discoHelice = disco;
  // tren de aterrizaje: dos ruedas principales y una de nariz
  const R = 0.3;
  for (const [x, y, z] of [[-0.9, 0, 0.0], [0.9, 0, 0.0]]) {
    cilindro(g, 0.04, 0.03, 0.9, x * 0.85, 0.55, z - 0.4, gris, 0, 0, x > 0 ? -0.28 : 0.28);
    const r = crearRueda(R, 0.22, 0xaaaaaa);
    r.pivote.position.set(x, R, z - 0.5);
    g.add(r.pivote);
    partes.ruedas.push(r);
    // carenado de la rueda
    const car = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), cuerpo);
    car.scale.set(0.5, 0.9, 1.5);
    car.position.set(x * 1.0, R + 0.05, z - 0.5);
    g.add(car);
  }
  cilindro(g, 0.035, 0.03, 0.9, 0, 0.7, -2.1, gris, -0.15);
  const rn = crearRueda(R * 0.85, 0.2, 0xaaaaaa);
  rn.pivote.position.set(0, R * 0.85, -2.15);
  g.add(rn.pivote);
  partes.ruedas.push(rn);
  partes.delanteras.push(rn);
  // faro de aterrizaje en el ala
  const faroMat = mat(0xfff6d0, { emisivo: 0x443820, intensidad: 0.7 });
  const faro = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), faroMat);
  faro.position.set(0.0, 1.0, -3.18);
  g.add(faro);
  partes.luces.push({ malla: faro, base: faroMat, delantero: true });
  partes.radioRueda = R;
  return terminar({ grupo: g, partes });
}

// ----------------------------------------------------------- VAGONETA
export function crearVagoneta() {
  const g = new THREE.Group();
  const partes = { ruedas: [], delanteras: [], luces: [], frenos: [], exterior: [], volante: null };
  const hierro = mat(0x6e7278, { brillo: 60, espec: 0x555555 });
  const oxido = mat(0x8a5a38, { brillo: 20 });
  const oscuro = mat(0x2a2c30, { brillo: 30 });
  // caja ligeramente abierta hacia arriba
  const caj = extruirPerfil([[-0.6, 0.35], [-0.7, 0.95], [0.7, 0.95], [0.6, 0.35]], 1.0, 0.03, hierro);
  g.add(caj);
  caja(g, 1.0, 0.06, 1.2, 0, 0.33, 0, oscuro);
  // paredes interiores (se ven desde arriba)
  const interior = mat(0x4a4d52, { brillo: 10, dosCaras: true });
  caja(g, 0.86, 0.5, 0.04, 0, 0.62, -0.58, interior);
  caja(g, 0.86, 0.5, 0.04, 0, 0.62, 0.58, interior);
  caja(g, 0.04, 0.5, 1.1, -0.45, 0.62, 0, interior);
  caja(g, 0.04, 0.5, 1.1, 0.45, 0.62, 0, interior);
  // borde
  caja(g, 1.1, 0.07, 0.07, 0, 0.97, -0.7, oxido); caja(g, 1.1, 0.07, 0.07, 0, 0.97, 0.7, oxido);
  caja(g, 0.07, 0.07, 1.4, -0.53, 0.97, 0, oxido); caja(g, 0.07, 0.07, 1.4, 0.53, 0.97, 0, oxido);
  // remaches y refuerzos
  for (const z of [-0.35, 0, 0.35]) for (const s of [-1, 1]) caja(g, 0.03, 0.5, 0.05, s * 0.52, 0.65, z, oxido);
  // carga: mena de carbón y hierro
  for (let i = 0; i < 9; i++) {
    const m = caja(g, 0.22 + (i % 3) * 0.04, 0.18, 0.22, -0.3 + (i % 3) * 0.3, 0.98 + Math.floor(i / 3) * 0.02, -0.4 + Math.floor(i / 3) * 0.35, mat(i % 2 ? 0x1c1c1e : 0xa07850, { plano: true }));
    m.rotation.y = i * 0.7;
  }
  // ejes y ruedas de hierro
  const R = 0.2;
  for (const z of [-0.45, 0.45]) {
    cilindro(g, 0.03, 0.03, 1.1, 0, R, z, oscuro, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) {
      const r = crearRueda(R, 0.07, 0x888c94);
      r.pivote.position.set(s * 0.52, R, z);
      if (s > 0) r.giro.scale.x = -1;
      // pestaña de la rueda de riel
      const ceja = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.2, 0.02, 18), oscuro);
      ceja.rotation.z = Math.PI / 2;
      ceja.position.x = -s * 0.04;
      r.giro.add(ceja);
      g.add(r.pivote);
      partes.ruedas.push(r);
    }
  }
  // enganche y topes
  cilindro(g, 0.05, 0.05, 0.28, 0, 0.45, -0.78, oscuro, Math.PI / 2);
  cilindro(g, 0.05, 0.05, 0.28, 0, 0.45, 0.78, oscuro, Math.PI / 2);
  partes.radioRueda = R;
  return terminar({ grupo: g, partes });
}
