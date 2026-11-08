// =============================================================
//  🚘  MODELO 3D DEL AEROAUTO VOLTA (diseño propio)
//  Un cupé eléctrico bajo y alargado, con cabina de cristal en
//  burbuja, barras de luz continuas y cuatro turbinas entubadas
//  que se despliegan de las esquinas para despegar en vertical.
//  Mira hacia -Z. Partes que mueve el juego: ruedas, luces,
//  frenos, rotores (brazo + hélice + brillo) y la tira de batería.
// =============================================================
import * as THREE from '../../lib/three.module.min.js';
import { mat, caja, cilindro, extruirPerfil, crearRueda, terminar } from '../modelosVeh.js';

export function crearAeroauto(color = 0xf4f6fa, acento = 0x2f9bff) {
  const g = new THREE.Group();
  const partes = { ruedas: [], delanteras: [], luces: [], frenos: [], volante: null, exterior: [], rotores: [] };
  const casco = mat(color, { brillo: 110, espec: 0x8899aa });
  const oscuro = mat(0x15181d, { brillo: 30 });
  const grafito = mat(0x2a2f38, { brillo: 60 });
  const cromo = mat(0xcfd6e0, { brillo: 130, espec: 0xaaaaaa });
  const cristal = mat(0x6fb6e6, { alfa: 0.42, brillo: 140, espec: 0xffffff });
  const azul = mat(acento, { emisivo: acento, intensidad: 0.9, brillo: 40 });

  // chasis de batería y cuerpo (perfil de lado: z, y)
  caja(g, 1.7, 0.14, 3.7, 0, 0.42, 0.05, oscuro);
  const bateria = caja(g, 1.4, 0.05, 3.2, 0, 0.34, 0.05, mat(acento, { emisivo: acento, intensidad: 0.5 }));
  partes.bateria = bateria;
  const cuerpo = extruirPerfil([[-2.2, 0.4], [-2.3, 0.62], [-1.75, 0.88], [-0.65, 1.0], [0.4, 1.03], [1.5, 1.0], [2.05, 0.92], [2.17, 0.7], [2.1, 0.42]], 1.92, 0.06, casco);
  g.add(cuerpo);
  // burbuja de cristal
  const sh = new THREE.Shape();
  [[-0.55, 1.0], [-0.1, 1.38], [0.7, 1.52], [1.4, 1.26], [1.85, 1.0]].forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  sh.closePath();
  const gb = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3, curveSegments: 6 });
  gb.rotateY(-Math.PI / 2); gb.translate(0.75, 0, 0); gb.computeVertexNormals();
  const burbuja = new THREE.Mesh(gb, cristal);
  g.add(burbuja);
  partes.exterior.push(burbuja);
  // techo de panel oscuro y líneas de carrocería
  caja(g, 1.1, 0.03, 1.2, 0, 1.55, 0.7, grafito);
  caja(g, 1.94, 0.04, 3.9, 0, 0.62, 0.0, mat(acento, { brillo: 60 }));
  // alerón trasero
  caja(g, 1.5, 0.05, 0.3, 0, 1.12, 2.15, grafito);
  for (const s of [-1, 1]) caja(g, 0.05, 0.16, 0.14, s * 0.55, 1.03, 2.1, grafito);
  // barras de luz continuas
  const faroMat = mat(0xeaf6ff, { emisivo: 0xb8e0ff, intensidad: 0.6, brillo: 120 });
  const faro = caja(g, 1.7, 0.05, 0.05, 0, 0.74, -2.3, faroMat);
  partes.luces.push({ malla: faro, base: faroMat, delantero: true });
  for (const s of [-1, 1]) caja(g, 0.25, 0.07, 0.05, s * 0.8, 0.68, -2.28, faroMat);
  const trasMat = mat(0xd81818, { emisivo: 0x700000, intensidad: 0.6 });
  const tras = caja(g, 1.6, 0.06, 0.05, 0, 0.88, 2.2, trasMat);
  partes.frenos.push({ malla: tras, base: trasMat });
  // asientos y pantalla
  for (const z of [0.25, 1.1]) for (const s of [-1, 1]) {
    caja(g, 0.5, 0.14, 0.5, s * 0.4, 0.68, z, oscuro);
    caja(g, 0.5, 0.52, 0.12, s * 0.4, 1.0, z + 0.26, oscuro).rotation.x = 0.12;
  }
  caja(g, 0.7, 0.34, 0.05, 0.0, 1.0, -0.38, mat(0x0a1824, { emisivo: 0x1f6aa8, intensidad: 0.9 })).rotation.x = -0.35;
  const volante = new THREE.Group();
  volante.position.set(-0.4, 1.02, -0.3);
  volante.rotation.x = -0.9;
  volante.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 18), mat(0x151517)));
  g.add(volante);
  partes.volante = volante;
  // arcos de rueda y ruedas
  const R = 0.38, ancho = 0.3;
  for (const [x, z, del] of [[-1.0, -1.35, true], [1.0, -1.35, true], [-1.0, 1.3, false], [1.0, 1.3, false]]) {
    caja(g, 0.1, 0.5, 0.95, Math.sign(x) * 0.96, 0.62, z, oscuro);
    const r = crearRueda(R, ancho, 0xdfe5ee);
    r.pivote.position.set(x, R, z);
    if (x > 0) r.giro.scale.x = -1;
    g.add(r.pivote);
    partes.ruedas.push(r);
    if (del) partes.delanteras.push(r);
  }
  partes.radioRueda = R;

  // turbinas entubadas en las cuatro esquinas: el brazo se estira al desplegarse
  for (const [lado, zc] of [[-1, -1.25], [1, -1.25], [-1, 1.2], [1, 1.2]]) {
    const brazo = new THREE.Group();
    brazo.position.set(lado * 0.9, 0.98, zc);
    const pod = new THREE.Group();
    brazo.add(pod);
    const viga = caja(pod, 0.9, 0.07, 0.12, -lado * 0.45, 0, 0, grafito);
    viga.position.x = lado * 0.5;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 28), casco);
    aro.rotation.x = Math.PI / 2; aro.position.set(lado * 1.05, 0, 0);
    pod.add(aro);
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 24, 1, true), mat(0x1a1e26, { dosCaras: true }));
    interior.position.set(lado * 1.05, 0, 0); pod.add(interior);
    const helice = new THREE.Group();
    helice.position.set(lado * 1.05, 0.02, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const pala = caja(helice, 0.42, 0.015, 0.1, Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22, mat(0xb8c2d0, { brillo: 70 }));
      pala.rotation.y = -a;
    }
    cilindro(helice, 0.07, 0.07, 0.08, 0, 0, 0, cromo);
    pod.add(helice);
    const brillo = new THREE.Mesh(new THREE.CircleGeometry(0.48, 20), new THREE.MeshBasicMaterial({ color: acento, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    brillo.rotation.x = -Math.PI / 2; brillo.position.set(lado * 1.05, -0.12, 0); pod.add(brillo);
    g.add(brazo);
    partes.rotores.push({ brazo, pod, helice, brillo, lado });
  }
  // el fusionado de piezas no toca los grupos de rotores ni la burbuja
  const res = terminar({ grupo: g, partes });
  return res;
}
