// GLSL de la Tierra vista desde la Luna o la órbita (se inserta en el domo del cielo)
export const FRAG_ASTROS = /* glsl */`
    if (tierraR > 0.0) {
      float angE = acos(clamp(dot(d, tierraDir), -1.0, 1.0));
      float borde = max(tierraR * 0.012, 0.0006);
      float discoE = smoothstep(tierraR + borde, tierraR - borde, angE);
      if (angE < tierraR * 1.15) {
        float p = clamp(angE / tierraR, 0.0, 1.0);
        vec3 e = normalize(d - tierraDir * dot(d, tierraDir) + vec3(0.00001));
        vec3 n = normalize(e * p - tierraDir * sqrt(1.0 - p * p));
        float ga = tiempo * 0.004;
        vec3 q = vec3(n.x * cos(ga) - n.z * sin(ga), n.y, n.x * sin(ga) + n.z * cos(ga));
        float cont = ruido(q * 2.6) * 0.6 + ruido(q * 5.2) * 0.3 + ruido(q * 11.0) * 0.1;
        float tierra = smoothstep(0.52, 0.56, cont);
        vec3 mar = vec3(0.04, 0.16, 0.42);
        vec3 pasto = mix(vec3(0.16, 0.36, 0.14), vec3(0.5, 0.42, 0.24), smoothstep(0.55, 0.8, cont));
        vec3 col = mix(mar, pasto, tierra);
        col = mix(col, vec3(0.92, 0.95, 1.0), smoothstep(0.78, 0.95, abs(q.y)));
        float nub = smoothstep(0.5, 0.75, ruido(q * 4.0 + vec3(ga * 4.0, 0.0, 0.0)) * 0.65 + ruido(q * 9.0) * 0.35);
        col = mix(col, vec3(1.0), nub * 0.85);
        float luzT = smoothstep(-0.12, 0.25, dot(n, solDir));
        vec3 colN = col * 0.06 + vec3(0.02, 0.03, 0.06) + step(0.93, ruido(q * 30.0)) * tierra * vec3(1.0, 0.8, 0.4) * 0.5;
        col = mix(colN, col * (0.12 + 0.95 * luzT), luzT);
        col += vec3(0.25, 0.5, 1.0) * pow(p, 4.0) * (0.15 + 0.7 * luzT);
        c = mix(c, col, discoE);
      }
      float fuera = max(angE - tierraR, 0.0);
      c += vec3(0.25, 0.5, 1.0) * exp(-fuera / (tierraR * 0.06 + 0.001)) * 0.35 * (1.0 - discoE) * (0.2 + 0.8 * tierraFase);
    }
`;
