// =============================================================
//  🌌  ENTORNO
//  Cielo/fondo con luces desenfocadas (también sirve de reflejo para
//  las piezas), mesa, suelo, luces con sombras suaves y motas de
//  polvo flotando. Todo cambia de color con el tema.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { texturaCielo, texturaMaterial, texturaSuelo } from './texturas.js';

export class Entorno {
  constructor(escena, renderer) {
    this.escena = escena;
    this.renderer = renderer;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.grupo = new THREE.Group();
    escena.add(this.grupo);

    this.luzClave = new THREE.DirectionalLight(0xffffff, 2.5);
    this.luzClave.position.set(-5.5, 12, 7.5);
    this.luzClave.target.position.set(0, 0, 0);
    const c = this.luzClave.shadow.camera;
    c.left = -7.5; c.right = 7.5; c.top = 7.5; c.bottom = -7.5; c.near = 2; c.far = 30;
    this.luzClave.shadow.bias = -0.0004;
    this.luzClave.shadow.normalBias = 0.03;
    this.luzClave.shadow.radius = 4;
    this.luzRelleno = new THREE.DirectionalLight(0xffffff, 0.7);
    this.luzRelleno.position.set(7, 5, -6);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x20202a, 0.18);
    escena.add(this.luzClave, this.luzClave.target, this.luzRelleno, this.hemi);

    // motas de polvo
    const n = 120;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 9;
      pos.set([Math.cos(a) * r, 0.4 + Math.random() * 7, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motas = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, toneMapped: false }));
    this.motas.visible = false;
    this.grupo.add(this.motas);
    this.vivos = [];
    this.fase = 0;
  }

  aplicarTema(tema, calidad) {
    for (const o of this.vivos) o.dispose();
    this.vivos = [];
    const g = (o) => { this.vivos.push(o); return o; };
    if (this.entorno) { this.entorno.dispose(); }
    if (this.mesa) {
      for (const o of [this.mesa, this.suelo, this.pedestal]) { this.grupo.remove(o); o.geometry.dispose(); }
    }

    const cielo = g(texturaCielo(tema, calidad.textura >= 1024 ? 1024 : 512));
    this.entorno = this.pmrem.fromEquirectangular(cielo);
    this.escena.environment = this.entorno.texture;
    this.escena.background = cielo;
    this.escena.backgroundBlurriness = 0.35;
    this.escena.backgroundIntensity = 0.85;
    this.renderer.toneMappingExposure = tema.luz.exposicion;

    this.luzClave.color.setHex(tema.luz.color);
    this.luzClave.intensity = tema.luz.intensidad;
    this.luzRelleno.color.setHex(tema.luz.relleno);
    this.motas.material.color.set(tema.cielo.paleta[0]);

    const mc = tema.marco;
    const texMesa = g(texturaMaterial(mc.tipo, 512, mc.mesa, mc.mesaVeta, 91, 0.12));
    this.mesa = new THREE.Mesh(
      new THREE.CylinderGeometry(9.2, 9.2, 0.4, 64),
      g(new THREE.MeshStandardMaterial({ map: texMesa, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.8 })),
    );
    this.mesa.position.y = -0.14 - 0.2;
    this.mesa.receiveShadow = true;
    this.pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.6, 6, 32),
      g(new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.6, metalness: 0.3 })),
    );
    this.pedestal.position.y = -3.5;
    const texSuelo = g(texturaSuelo(tema.suelo[0], tema.suelo[1]));
    this.suelo = new THREE.Mesh(
      new THREE.CircleGeometry(45, 48),
      g(new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 })),
    );
    this.suelo.rotation.x = -Math.PI / 2;
    this.suelo.position.y = -6.5;
    this.grupo.add(this.mesa, this.pedestal, this.suelo);
  }

  aplicarCalidad(calidad) {
    const s = calidad.sombras;
    this.luzClave.castShadow = s > 0;
    const m = calidad.mapa;
    if (this.luzClave.shadow.mapSize.x !== m) {
      this.luzClave.shadow.mapSize.set(m, m);
      if (this.luzClave.shadow.map) { this.luzClave.shadow.map.dispose(); this.luzClave.shadow.map = null; }
    }
    this.renderer.shadowMap.enabled = s > 0;
    this.renderer.shadowMap.type = s > 1 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.motas.visible = s > 1;
    this.escena.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  // true si hay algo animándose continuamente (motas)
  actualizar(dt) {
    if (!this.motas.visible) return false;
    this.fase += dt;
    this.motas.rotation.y = this.fase * 0.02;
    this.motas.position.y = Math.sin(this.fase * 0.3) * 0.25;
    return true;
  }
}
