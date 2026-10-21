// =============================================================
//  🎨  MATERIALES DEL MUNDO (los "shaders")
//  Un shader es un programita que corre en la tarjeta de video y
//  decide el color de cada pixel. Aquí se juntan:
//   - la textura del atlas con su relieve falso (normales),
//   - luz del sol con sombras de verdad (2 mapas de sombra),
//   - luz del cielo, de antorchas y de los faros de los vehículos,
//   - viento en hojas y pasto,
//   - niebla de atmósfera, y
//   - agua con olas, reflejo del cielo y brillo del sol.
//  Todos los materiales comparten los mismos "uniformes" (los
//  números que cambian cada cuadro: hora, color del sol, etc.).
// =============================================================
import * as THREE from '../lib/three.module.min.js';

export function crearUniformes(atlas, normales) {
  return {
    map: { value: atlas },
    mapN: { value: normales },
    uTiempo: { value: 0 },
    uViento: { value: 1 },
    uCamPos: { value: new THREE.Vector3() },
    uSolDir: { value: new THREE.Vector3(0, 1, 0) },
    uSolColor: { value: new THREE.Color(1, 0.95, 0.8) },
    uAmbCielo: { value: new THREE.Color(0.6, 0.7, 0.85) },
    uAmbSuelo: { value: new THREE.Color(0.4, 0.38, 0.34) },
    uLuzBloque: { value: new THREE.Color(1.0, 0.7, 0.4) },
    uNiebla: { value: new THREE.Color(0.68, 0.84, 1) },
    uNieblaCerca: { value: 40 },
    uNieblaLejos: { value: 80 },
    uCieloArriba: { value: new THREE.Color(0.25, 0.55, 0.9) },
    uCieloHoriz: { value: new THREE.Color(0.68, 0.84, 1) },
    uPaso: { value: 0 },
    uHayLuces: { value: 0 },
    uBump: { value: 1 },
    uAguaCalidad: { value: 1 },
    // sombras
    uUsaSombra: { value: 0 },
    uNumCasc: { value: 1 },
    uSombra0: { value: null },
    uSombra1: { value: null },
    uMatSombra0: { value: new THREE.Matrix4() },
    uMatSombra1: { value: new THREE.Matrix4() },
    uSombraTexel: { value: new THREE.Vector4(1 / 1024, 1 / 1024, 0.2, 0.5) }, // x,y = 1/tamaño de cada mapa, z,w = tamaño del texel en bloques
    uSombraBias: { value: new THREE.Vector2(0.002, 0.002) },
    // luces dinámicas (faros)
    uLuzDin: { value: [new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1), new THREE.Vector4(0, -999, 0, 1)] },
    uLuzDinC: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  };
}

const COMUN = /* glsl */`
  uniform float uTiempo;
  uniform float uViento;
  uniform vec3 uCamPos;
  varying vec2 vUv;
  varying vec3 vL;
  varying vec3 vP;
`;

const VERTICE = /* glsl */`
  ${COMUN}
  void main() {
    vUv = uv;
    vL = color;
    vec4 w = modelMatrix * vec4(position, 1.0);
    float s = color.b;
    if (s > 0.001) {
      float f = uViento * s;
      float ph = w.x * 0.55 + w.z * 0.8;
      w.x += (sin(uTiempo * 1.7 + ph) * 0.05 + sin(uTiempo * 3.3 + ph * 1.9) * 0.016) * f;
      w.z += cos(uTiempo * 1.3 + ph * 0.8) * 0.04 * f;
      w.y += sin(uTiempo * 2.2 + ph * 1.3) * 0.012 * f;
    }
    vP = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const NIEBLA = /* glsl */`
  uniform vec3 uNiebla;
  uniform float uNieblaCerca;
  uniform float uNieblaLejos;
  uniform vec3 uSolColor;
  uniform vec3 uSolDir;
  vec3 aplicarNiebla(vec3 col, float dist, vec3 V) {
    float f = smoothstep(uNieblaCerca, uNieblaLejos, dist);
    float sol = pow(max(dot(-V, uSolDir), 0.0), 5.0);
    vec3 fc = uNiebla + uSolColor * sol * 0.16;
    return mix(col, fc, f);
  }
`;

const FRAGMENTO_MUNDO = /* glsl */`
  ${COMUN}
  ${NIEBLA}
  uniform sampler2D map;
  uniform sampler2D mapN;
  uniform float uPaso;
  uniform float uHayLuces;
  uniform float uBump;
  uniform vec3 uAmbCielo;
  uniform vec3 uAmbSuelo;
  uniform vec3 uLuzBloque;
  uniform float uUsaSombra;
  uniform float uNumCasc;
  uniform sampler2D uSombra0;
  uniform sampler2D uSombra1;
  uniform mat4 uMatSombra0;
  uniform mat4 uMatSombra1;
  uniform vec4 uSombraTexel;
  uniform vec2 uSombraBias;
  uniform vec4 uLuzDin[4];
  uniform vec3 uLuzDinC[4];

  const vec2 POISSON[8] = vec2[8](
    vec2(-0.613, 0.617), vec2(0.170, -0.040), vec2(-0.299, -0.792), vec2(0.645, 0.493),
    vec2(-0.651, -0.060), vec2(0.421, -0.860), vec2(0.103, 0.870), vec2(0.866, -0.188));

  float ruidoPantalla() {
    return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  }

  float pcf(sampler2D t, vec3 s, vec2 texel, float radio, float bias) {
    float a = ruidoPantalla() * 6.2831853;
    float cs = cos(a), sn = sin(a);
    float suma = 0.0;
    for (int i = 0; i < 8; i++) {
      vec2 o = vec2(POISSON[i].x * cs - POISSON[i].y * sn, POISSON[i].x * sn + POISSON[i].y * cs) * radio * texel;
      float d = texture2D(t, s.xy + o).r;
      suma += step(s.z - bias, d);
    }
    return suma / 8.0;
  }

  float sombraEn(vec3 P, vec3 N, float nl) {
    if (uUsaSombra < 0.5) return 1.0;
    float off0 = uSombraTexel.z * (1.2 + 1.6 * (1.0 - nl));
    vec4 c0 = uMatSombra0 * vec4(P + N * off0, 1.0);
    vec3 s0 = c0.xyz * 0.5 + 0.5;
    float borde0 = max(abs(c0.x), abs(c0.y));
    if (borde0 < 0.94 && s0.z > 0.0 && s0.z < 1.0) {
      float v = pcf(uSombra0, s0, uSombraTexel.xy, 1.8, uSombraBias.x);
      if (uNumCasc > 1.5) {
        // mezcla suave hacia el mapa grande en la orilla del chico
        float k = smoothstep(0.7, 0.94, borde0);
        if (k > 0.0) {
          vec4 c1 = uMatSombra1 * vec4(P + N * uSombraTexel.w * (1.2 + 1.6 * (1.0 - nl)), 1.0);
          vec3 s1 = c1.xyz * 0.5 + 0.5;
          float v1 = pcf(uSombra1, s1, uSombraTexel.xy, 1.5, uSombraBias.y);
          v = mix(v, v1, k);
        }
      }
      return v;
    }
    if (uNumCasc > 1.5) {
      vec4 c1 = uMatSombra1 * vec4(P + N * uSombraTexel.w * (1.2 + 1.6 * (1.0 - nl)), 1.0);
      vec3 s1 = c1.xyz * 0.5 + 0.5;
      float borde1 = max(abs(c1.x), abs(c1.y));
      if (borde1 < 0.98 && s1.z > 0.0 && s1.z < 1.0) {
        float v1 = pcf(uSombra1, s1, uSombraTexel.xy, 1.5, uSombraBias.y);
        return mix(v1, 1.0, smoothstep(0.8, 0.98, borde1));
      }
    }
    return 1.0;
  }

  vec3 luzDinamica(vec3 P, vec3 N) {
    vec3 suma = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec3 d = uLuzDin[i].xyz - P;
      float l = length(d);
      float att = max(0.0, 1.0 - l / uLuzDin[i].w);
      att *= att;
      float nl = clamp(dot(N, d / max(l, 0.001)) * 0.7 + 0.3, 0.0, 1.0);
      suma += uLuzDinC[i] * att * nl;
    }
    return suma;
  }

  void main() {
    vec4 tx = texture2D(map, vUv);
    #ifdef CORTE
      if (tx.a < 0.5) discard;
    #endif
    if (uPaso > 0.5) { gl_FragColor = vec4(1.0); return; }

    vec3 V = uCamPos - vP;
    float dist = length(V);
    V /= dist;
    vec3 dpx = dFdx(vP), dpy = dFdy(vP);
    vec3 N = normalize(cross(dpx, dpy));
    if (dot(N, V) < 0.0) N = -N;

    // relieve falso: se pierde con la distancia (si no, brilla y tiembla)
    float rel = uBump * (1.0 - smoothstep(18.0, 55.0, dist));
    if (rel > 0.01) {
      vec3 nm = texture2D(mapN, vUv).xyz * 2.0 - 1.0;
      vec2 duv1 = dFdx(vUv), duv2 = dFdy(vUv);
      vec3 dp2perp = cross(dpy, N), dp1perp = cross(N, dpx);
      vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
      vec3 Bt = dp2perp * duv1.y + dp1perp * duv2.y;
      float im = inversesqrt(max(max(dot(T, T), dot(Bt, Bt)), 1e-12));
      vec3 Np = normalize(T * im * nm.x * 0.8 + Bt * im * nm.y * 0.8 + N * nm.z);
      N = normalize(mix(N, Np, rel));
    }

    float nl = max(dot(N, uSolDir), 0.0);
    float cielo = vL.r;
    float visible = smoothstep(0.3, 0.7, cielo);
    float sh = sombraEn(vP, N, nl);
    // luz del cielo: de arriba es más clara que de abajo
    vec3 amb = mix(uAmbSuelo, uAmbCielo, N.y * 0.5 + 0.5) * cielo;
    vec3 luz = amb + uSolColor * (nl * sh * visible);
    // luz de antorchas (más fuerte cerca de la fuente)
    float b = vL.g;
    luz += uLuzBloque * (b * b * 1.15 + b * 0.1);
    if (uHayLuces > 0.5) luz += luzDinamica(vP, N);

    vec3 col = tx.rgb * luz;
    col = aplicarNiebla(col, dist, V);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ----------------------------------------------------------- Agua
const VERTICE_AGUA = /* glsl */`
  ${COMUN}
  float olas(vec2 p, float t) {
    return sin(p.x * 0.9 + t * 1.4) * 0.5 + sin(p.y * 1.3 - t * 1.1 + p.x * 0.4) * 0.35 + sin((p.x + p.y) * 2.1 + t * 2.3) * 0.15;
  }
  void main() {
    vUv = uv;
    vL = color;
    vec4 w = modelMatrix * vec4(position, 1.0);
    if (color.b > 0.5) w.y += olas(w.xz, uTiempo) * 0.045 - 0.02;
    vP = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAGMENTO_AGUA = /* glsl */`
  ${COMUN}
  ${NIEBLA}
  uniform vec3 uAmbCielo;
  uniform vec3 uLuzBloque;
  uniform vec3 uCieloArriba;
  uniform vec3 uCieloHoriz;
  uniform float uAguaCalidad;
  uniform float uHayLuces;
  uniform vec4 uLuzDin[4];
  uniform vec3 uLuzDinC[4];

  float h(vec2 p, float t) {
    return sin(p.x * 0.9 + t * 1.4) * 0.5 + sin(p.y * 1.3 - t * 1.1 + p.x * 0.4) * 0.35 + sin((p.x + p.y) * 2.1 + t * 2.3) * 0.15
      + sin(p.x * 4.1 - t * 2.9) * sin(p.y * 3.7 + t * 2.1) * 0.12;
  }

  void main() {
    vec3 V = uCamPos - vP;
    float dist = length(V);
    V /= dist;
    vec3 N = vec3(0.0, 1.0, 0.0);
    vec3 dpx = dFdx(vP), dpy = dFdy(vP);
    vec3 Nf = normalize(cross(dpx, dpy));
    if (dot(Nf, V) < 0.0) Nf = -Nf;
    float arriba = step(0.9, Nf.y);
    N = Nf;
    if (arriba > 0.5 && uAguaCalidad > 0.5) {
      float e = 0.08;
      float t = uTiempo;
      float hx = h(vP.xz + vec2(e, 0.0), t) - h(vP.xz - vec2(e, 0.0), t);
      float hz = h(vP.xz + vec2(0.0, e), t) - h(vP.xz - vec2(0.0, e), t);
      float amp = 0.32 * (1.0 - smoothstep(30.0, 90.0, dist) * 0.7);
      N = normalize(vec3(-hx * amp, 1.0, -hz * amp));
    }
    float cielo = vL.r;
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 R = reflect(-V, N);
    float ry = max(R.y, 0.0);
    vec3 refl = mix(uCieloHoriz, uCieloArriba, pow(ry, 0.55));
    // brillo del sol en las olas
    float espec = pow(max(dot(R, uSolDir), 0.0), 220.0);
    vec3 profundo = vec3(0.04, 0.17, 0.36);
    vec3 somero = vec3(0.14, 0.42, 0.62);
    float mezcla = 0.5 + 0.5 * sin(vP.x * 0.11 + vP.z * 0.07) * 0.3;
    vec3 base = mix(profundo, somero, mezcla);
    vec3 luz = uAmbCielo * 0.55 * cielo + uSolColor * 0.45 * max(uSolDir.y, 0.0) * cielo + uLuzBloque * vL.g * vL.g * 1.1;
    vec3 col = base * luz * 1.6;
    col = mix(col, refl * (0.35 + 0.65 * cielo), fres * 0.85);
    col += uSolColor * espec * 1.6 * cielo;
    // luz de faros sobre el agua
    if (uHayLuces > 0.5) {
      for (int i = 0; i < 4; i++) {
        vec3 d = uLuzDin[i].xyz - vP;
        float att = max(0.0, 1.0 - length(d) / uLuzDin[i].w);
        col += uLuzDinC[i] * att * att * 0.5;
      }
    }
    float alfa = mix(0.62, 0.95, fres);
    col = aplicarNiebla(col, dist, V);
    gl_FragColor = vec4(col, alfa);
  }
`;

export function crearMaterialesMundo(uniformes) {
  const base = {
    uniforms: uniformes,
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO_MUNDO,
    vertexColors: true,
  };
  const solido = new THREE.ShaderMaterial({ ...base });
  const recorte = new THREE.ShaderMaterial({ ...base, defines: { CORTE: 1 }, side: THREE.DoubleSide });
  const agua = new THREE.ShaderMaterial({
    uniforms: uniformes,
    vertexShader: VERTICE_AGUA,
    fragmentShader: FRAGMENTO_AGUA,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return [solido, recorte, agua];
}
