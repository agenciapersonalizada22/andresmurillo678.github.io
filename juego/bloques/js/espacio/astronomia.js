// =============================================================
//  🌙  ASTRONOMÍA DEL CIELO (funciones puras, sin gráficos)
//  Convención del juego: +X = este, -Z = norte, +Y = arriba.
//  hora: 0 = amanecer, 0.25 = mediodía, 0.5 = atardecer, 0.75 = medianoche.
//  diaAbs: días transcurridos (entero + hora).
//  El Sol sube y baja según la estación; la Luna tarda MES_LUNAR días
//  en dar sus fases y su órbita está inclinada, por eso los eclipses
//  solo ocurren cuando la Luna cruza justo delante del Sol (raro).
// =============================================================
export const MES_LUNAR = 7.7;         // días por ciclo de fases
export const ANIO = 24;              // días por año (estaciones)
export const DRACONICO = 7.13;      // días entre cruces del plano del Sol
export const LATITUD = 0.35;         // rad (observador)
export const OBLICUIDAD = 0.28;      // rad (inclinación del eje, exagerada)
export const INCLINACION_LUNA = 0.2; // rad (órbita lunar vs. el Sol)
export const RADIO_SOL = 0.0265;     // rad (radio angular del disco)
export const RADIO_LUNA = 0.0275;
export const RADIO_UMBRA = 0.075;    // rad (sombra de la Tierra, para eclipse lunar)
export const FASE_INICIAL = 0.6 * Math.PI;

const PI2 = Math.PI * 2;
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };

// Dirección (ENU → x este, y arriba, z sur) de un astro con ángulo horario H y declinación d
export function direccion(H, d) {
  const cd = Math.cos(d), sd = Math.sin(d), cl = Math.cos(LATITUD), sl = Math.sin(LATITUD);
  const este = -cd * Math.sin(H);
  const norte = sd * cl - cd * sl * Math.cos(H);
  const arriba = sl * sd + cl * cd * Math.cos(H);
  return norm({ x: este, y: arriba, z: -norte });
}

export const declinacionSol = (diaAbs) => OBLICUIDAD * Math.sin(PI2 * diaAbs / ANIO);
export const horaAAngulo = (hora) => PI2 * (hora - 0.25);

// Elongación de la Luna respecto al Sol (0 = nueva, π = llena)
export const elongacion = (diaAbs) => (((PI2 * diaAbs / MES_LUNAR + FASE_INICIAL) % PI2) + PI2) % PI2;
export const latitudLuna = (diaAbs) => INCLINACION_LUNA * Math.sin(PI2 * diaAbs / DRACONICO);

export function separacion(a, b) {
  const c = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(c);
}

// Fracción del disco del Sol tapada por la Luna (0 a 1)
export function cobertura(d, rs = RADIO_SOL, rm = RADIO_LUNA) {
  if (d >= rs + rm) return 0;
  if (d <= Math.abs(rs - rm)) return rm >= rs ? 1 : (rm * rm) / (rs * rs);
  const a = Math.acos((d * d + rs * rs - rm * rm) / (2 * d * rs));
  const b = Math.acos((d * d + rm * rm - rs * rs) / (2 * d * rm));
  const area = rs * rs * a + rm * rm * b - 0.5 * Math.sqrt((-d + rs + rm) * (d + rs - rm) * (d - rs + rm) * (d + rs + rm));
  return Math.min(1, area / (Math.PI * rs * rs));
}

export function estadoCielo(hora, diaAbs) {
  const dia = Math.floor(diaAbs - hora + 1e-9);
  const t = diaAbs;
  const H = horaAAngulo(hora);
  const dS = declinacionSol(t);
  const sol = direccion(H, dS);
  const e = elongacion(t);
  const dM = OBLICUIDAD * Math.sin(PI2 * t / ANIO + e) + latitudLuna(t);
  const luna = direccion(H - e, dM);
  const sep = separacion(sol, luna);
  const anti = { x: -sol.x, y: -sol.y, z: -sol.z };
  const sepU = separacion(luna, anti);
  const eclipseSolar = cobertura(sep);
  const eclipseLunar = sepU < RADIO_UMBRA + RADIO_LUNA ? Math.min(1, (RADIO_UMBRA + RADIO_LUNA - sepU) / (RADIO_UMBRA + RADIO_LUNA - 0.02)) : 0;
  return {
    sol, luna, elongacion: e,
    fase: e / PI2,                               // 0 nueva, 0.5 llena
    iluminacion: (1 - Math.cos(e)) / 2,          // fracción iluminada (0 a 1)
    eclipseSolar, eclipseLunar, dia,
    declinacion: dS,
  };
}

export const NOMBRES_FASE = ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna menguante'];
export function nombreFase(fase) { return NOMBRES_FASE[Math.floor(((fase % 1) + 1) % 1 * 8 + 0.5) % 8]; }

// Busca el próximo eclipse ('solar' | 'lunar') desde diaAbs. Devuelve { dia (abs), fuerza } o null
export function proximoEclipse(diaAbs, tipo = 'solar', maxDias = 400) {
  const paso = 0.02;
  let mejor = null;
  for (let t = diaAbs; t < diaAbs + maxDias; t += paso) {
    const hora = ((t % 1) + 1) % 1;
    const s = estadoCielo(hora, t);
    const f = tipo === 'solar' ? s.eclipseSolar : s.eclipseLunar;
    // el eclipse "vale" si la Luna está sobre el horizonte (solar: de día; lunar: de noche)
    const visible = tipo === 'solar' ? s.sol.y > 0 : s.luna.y > 0;
    if (f > 0.02 && visible) { if (!mejor || f > mejor.fuerza) mejor = { dia: t, fuerza: f }; }
    else if (mejor) return mejor;
  }
  return mejor;
}

// Luz que llega (0 a 1) con la Luna en esa fase y ese brillo (para la noche)
export const luzDeLuna = (iluminacion, altura) => Math.max(0, iluminacion) * Math.max(0, Math.min(1, altura * 3));

// ---- Sol y Tierra en dimensiones sin atmósfera
// Luna: el Sol da una vuelta cada `ciclo` días; la Tierra está fija en el cielo (mismo lado siempre)
export function solEspacial(hora, diaAbs, ciclo) {
  const H = PI2 * ((diaAbs / ciclo) % 1) - Math.PI / 2 + (hora / ciclo) * 0;
  return direccion(H, 0.05);
}
export const TIERRA_EN_LUNA = norm({ x: 0.45, y: 0.62, z: -0.3 });
// la Tierra vista desde la Luna: fase = lo contrario de la fase lunar
export function faseTierraDesdeLuna(solDir) {
  const t = TIERRA_EN_LUNA;
  return Math.max(0, Math.min(1, (1 + (solDir.x * t.x + solDir.y * t.y + solDir.z * t.z)) / 2));
}
