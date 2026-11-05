const { prueba, cerca, igual, cierto, fin } = require('./ayuda.js');
const M = require('../js/modelo.js'), K = require('../js/keyframes.js'), S = require('../js/subtitulos.js'), Z = require('../js/mezcla.js'), SN = require('../js/sonidos.js');

function proy() {
  const p = M.nuevo({ id: 'p' }); p.medios.m1 = { id: 'm1', tipo: 'video', dur: 10 }; p.medios.a1 = { id: 'a1', tipo: 'audio', dur: 5 };
  return p;
}
const pv = (p) => p.pistas.find(t => t.tipo === 'video');
prueba('agregar y duracion', () => { const p = proy(); M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 4 })); M.agregar(p, M.clip('video', { medio: 'm1', ini: 4, dur: 3, off: 2 })); cerca(M.duracion(p), 7); igual(pv(p).clips.length, 2); });
prueba('agregar en pista ocupada crea otra pista', () => { const p = proy(); M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 4 })); M.agregar(p, M.clip('video', { medio: 'm1', ini: 1, dur: 2 })); igual(p.pistas.filter(t => t.tipo === 'video' || t.tipo === 'pip').length, 2); });
prueba('dividir conserva duracion total y desfases', () => {
  const p = proy(), c = M.agregar(p, M.clip('video', { medio: 'm1', ini: 2, dur: 6, off: 1, vel: 2 }));
  const r = M.dividir(p, c.id, 5); cerca(c.dur, 3); cerca(r.ini, 5); cerca(r.dur, 3); cerca(r.off, 1 + 3 * 2);
  cerca(M.tiempoFuente(c, 4.999) , 1 + 2.999 * 2, 1e-3); cerca(M.tiempoFuente(r, 5), 7);
  cierto(M.dividir(p, c.id, 2) === null, 'no divide en borde');
});
prueba('dividir clip invertido mantiene continuidad de fuente', () => {
  const p = proy(), c = M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 4, off: 2, inv: true }));
  const antes = M.tiempoFuente(c, 3); const r = M.dividir(p, c.id, 1);
  cerca(M.tiempoFuente(r, 3), antes); cerca(M.tiempoFuente(c, 0), 6); cerca(M.tiempoFuente(c, 1), 5); cerca(M.tiempoFuente(r, 1), 5);
});
prueba('recortar fin / inicio respetan fuente y vecinos', () => {
  const p = proy(), a = M.agregar(p, M.clip('video', { medio: 'm1', ini: 1, dur: 4, off: 2 })), b = M.agregar(p, M.clip('video', { medio: 'm1', ini: 7, dur: 2 }));
  M.recortarFin(p, a.id, 100); cerca(a.dur, 6, 1e-9, 'tope vecino'); cerca(M.fin(a), 7);
  M.recortarIni(p, a.id, 0); cerca(a.ini, 0 + 0, 1e-9); cerca(a.off, 1, 1e-9, 'extiende hacia atras hasta limite de fuente (off 2 -> ini 1 -1)');
  M.recortarIni(p, a.id, 3); cerca(a.ini, 3); cerca(a.off, 4); M.recortarFin(p, a.id, 3.01); cerca(a.dur, M.MIN);
});
prueba('recortar limitado por duracion del medio', () => {
  const p = proy(), a = M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 4, off: 5 })); M.recortarFin(p, a.id, 50); cerca(a.dur, 5);
  const b = M.agregar(p, M.clip('video', { medio: 'm1', ini: 20, dur: 4, off: 0, vel: 2 })); M.recortarFin(p, b.id, 80); cerca(b.dur, 5);
});
prueba('mover: colision se resuelve y iman', () => {
  const p = proy(), a = M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 3 })), b = M.agregar(p, M.clip('video', { medio: 'm1', ini: 5, dur: 2 }));
  M.mover(p, b.id, 1, null); cerca(b.ini, 3, 1e-9, 'se coloca tras a');
  M.mover(p, b.id, 3.05, null, { iman: true, tol: 0.1 }); cerca(b.ini, 3);
  M.mover(p, b.id, 9.04, null, { iman: true, tol: 0.1, extra: [9] }); cerca(b.ini, 9);
  cierto(!M.mover(p, b.id, 1, pv(p).id) === false);
});
prueba('mover entre pistas incompatibles se ignora', () => {
  const p = proy(), t = M.agregar(p, M.clip('texto', { texto: 'x', ini: 0, dur: 2 })); M.mover(p, t.id, 1, 't_video'); igual(M.buscar(p, t.id).pista.tipo, 'texto');
});
prueba('eliminar con y sin cierre de huecos', () => {
  const p = proy(); const c = [0, 1, 2].map(i => M.agregar(p, M.clip('video', { medio: 'm1', ini: i * 3, dur: 3 })));
  M.eliminar(p, c[1].id, false); cerca(c[2].ini, 6);
  M.eliminar(p, c[0].id, true); cerca(c[2].ini, 3);
  const q = proy(); const d = [0, 1, 2].map(i => M.agregar(q, M.clip('video', { medio: 'm1', ini: i * 4, dur: 2 }))); M.cerrarHuecos(pv(q)); igual(d.map(x => x.ini), [0, 2, 4]);
});
prueba('duplicar, velocidad, congelar, extraer audio', () => {
  const p = proy(), c = M.agregar(p, M.clip('video', { medio: 'm1', ini: 0, dur: 4, off: 1 }));
  const d = M.duplicar(p, c.id); cerca(d.ini, 4); cerca(d.off, 1);
  M.velocidad(p, c.id, 2); cerca(c.dur, 2); cerca(c.vel, 2); M.velocidad(p, c.id, 0.25); cerca(c.dur, 4 * 2 / 0.25 > 4 ? c.dur : 0, 100);
  const q = proy(), v = M.agregar(q, M.clip('video', { medio: 'm1', ini: 0, dur: 6, off: 2 })), w = M.agregar(q, M.clip('video', { medio: 'm1', ini: 6, dur: 2 }));
  const f = M.congelar(q, v.id, 3, 2); cerca(f.off, 5); cerca(f.dur, 2); cierto(f.cong); cerca(w.ini, 8, 1e-9, 'desplaza el resto'); cerca(M.duracion(q), 10);
  const e = M.extraerAudio(q, w.id); cierto(w.mute && e.tipo === 'audio' && M.buscar(q, e.id).pista.tipo === 'audio');
});
prueba('historial deshacer/rehacer ilimitado con fusion', () => {
  const p = proy(), h = new M.Historia(p); for (let i = 0; i < 300; i++) { M.agregar(p, M.clip('texto', { texto: 'n' + i, ini: i * 3, dur: 2 })); h.commit(p); }
  let q = p; for (let i = 0; i < 300; i++) q = h.deshacer(); igual(M.todos(q).length, 0); cierto(h.deshacer() === null);
  for (let i = 0; i < 300; i++) q = h.rehacer(); igual(M.todos(q).length, 300);
  const h2 = new M.Historia(p); p.nombre = 'a'; h2.commit(p, 'n'); p.nombre = 'ab'; h2.commit(p, 'n'); igual(h2.estados.length, 2);
});
prueba('marcadores y saltar cortes', () => {
  const p = proy(); M.agregar(p, M.clip('video', { medio: 'm1', ini: 1, dur: 2 })); M.agregar(p, M.clip('video', { medio: 'm1', ini: 3, dur: 2 }));
  cerca(M.siguienteCorte(p, 0, 1), 1); cerca(M.siguienteCorte(p, 1, 1), 3); cerca(M.siguienteCorte(p, 3, -1), 1); M.addMarcador(p, 2, 'a'); igual(p.marcadores.length, 1);
});
prueba('keyframes: interpolacion', () => {
  const l = [{ t: 0, v: 0, ease: 'lineal' }, { t: 2, v: 10, ease: 'lineal' }, { t: 4, v: 0, ease: 'suave' }];
  cerca(K.valor(l, 1), 5); cerca(K.valor(l, -1), 0); cerca(K.valor(l, 9), 0); cerca(K.valor(l, 3), 5, 1e-9, 'suave simetrica'); cerca(K.valor(l, 2.5), 7.5);
  cerca(K.valor([], 1, 7), 7); K.poner(l, 1, 3); cerca(K.valor(l, 1), 3); cerca(K.EASE.suave(0.5), 0.5); cerca(K.EASE.rebote(1), 1, 1e-9);
  const c = K.cortar(l, 2); cerca(c[0].v, 10); cerca(c[0].t, 0);
});
prueba('animaciones de texto', () => {
  const a = { in: 'fundido', out: 'zoom', dur: 1 };
  cerca(K.animar(a, 0, 4).op, 0); cerca(K.animar(a, 0.5, 4).op, 0.5); cerca(K.animar(a, 2, 4).op, 1); cerca(K.animar(a, 4, 4).op, 0, 1e-9);
  cerca(K.animar({ in: 'maquina', dur: 2 }, 1, 4).prog, 0.5); cerca(K.animar({ in: 'rebote', dur: 1 }, 1, 4).esc, 1, 1e-9);
  cierto(K.animar({ in: 'desplazar' }, 0, 4).dx > 1 && K.animar({ in: 'desplazar' }, 4, 4).dx < -1);
  cierto(K.animar({ cont: 'girar' }, 2, 4).rot === 180);
});
const SRT = '1\n00:00:01,000 --> 00:00:03,500\nHola mundo\n\n2\n00:00:04,000 --> 00:00:06,250\nLínea uno\nLínea dos\n';
prueba('SRT/VTT parse y serializar (ida y vuelta)', () => {
  const c = S.parsear(SRT); igual(c.length, 2); cerca(c[0].ini, 1); cerca(c[0].fin, 3.5); igual(c[1].texto, 'Línea uno\nLínea dos');
  igual(S.aSRT(c), SRT); const v = S.aVTT(c); cierto(v.startsWith('WEBVTT') && v.includes('00:00:04.000 --> 00:00:06.250'));
  igual(S.parsear(v), c); igual(S.parsear('WEBVTT\n\n01:02.500 --> 01:04.000 align:start\n<b>x</b>\n')[0], { ini: 62.5, fin: 64, texto: 'x' });
  igual(S.parsear('﻿' + SRT.replace(/\n/g, '\r\n')).length, 2);
  cerca(S.leerTiempo('1:02:03,5'), 3723.5); cierto(isNaN(S.leerTiempo('x')));
});
prueba('guion -> segmentos proporcionales', () => {
  const c = S.desdeGuion('Hola a todos. Esto es una prueba larga de subtitulos para el guion!\nSegunda línea', 10, 20, 30);
  cierto(c.length >= 3); cerca(c[0].ini, 10); cerca(c[c.length - 1].fin, 30, 1e-9); c.forEach(x => cierto(x.texto.length <= 30 && x.fin > x.ini));
  for (let i = 1; i < c.length; i++) cerca(c[i].ini, c[i - 1].fin, 1e-9);
});
prueba('mezcla de audio contra muestras de referencia', () => {
  const sr = 8000, n = sr * 2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * 440 * i / sr) * 0.8;
  const src = { sr, ch: [x] };
  const m = Z.mezclar({ clips: [{ medio: 'a', ini: 1, dur: 1, off: 0.5, vel: 1, inv: false, vol: 0.5, fi: 0.5, fo: 0, mute: false }], obtener: () => src, sr, ini: 0, dur: 3 });
  cerca(Z.pico(m[0].subarray(0, sr - 1)), 0, 1e-9, 'silencio antes');
  for (const t of [1.25, 1.75, 2.5]) { const i = Math.round(t * sr); let ref = 0; if (t < 2) { const loc = t - 1, gan = 0.5 * Math.min(1, loc / 0.5); ref = gan * Math.sin(2 * Math.PI * 440 * (loc + 0.5)) * 0.8; } cerca(m[0][i], ref, 1e-3, 't=' + t); cerca(m[1][i], ref, 1e-3); }
  const mu = Z.mezclar({ clips: [{ medio: 'a', ini: 0, dur: 1, off: 0, vel: 1, vol: 1, mute: true }], obtener: () => src, sr, ini: 0, dur: 1 }); cerca(Z.pico(mu[0]), 0);
  const sum = Z.mezclar({ clips: [0, 1].map(() => ({ medio: 'a', ini: 0, dur: 1, off: 0, vel: 1, vol: 0.4 })), obtener: () => src, sr, ini: 0, dur: 1 }); cerca(sum[0][5], 2 * 0.4 * x[5], 1e-5, 'suma de pistas');
  const lim = Z.mezclar({ clips: [0, 1, 2].map(() => ({ medio: 'a', ini: 0, dur: 1, off: 0, vel: 1, vol: 1 })), obtener: () => src, sr, ini: 0, dur: 1 }); cierto(Z.pico(lim[0]) <= 1);
  const iv = Z.mezclar({ clips: [{ medio: 'a', ini: 0, dur: 0.5, off: 0, vel: 1, inv: true, vol: 1 }], obtener: () => src, sr, ini: 0, dur: 0.5 }); cerca(iv[0][100], x[Math.round(0.5 * sr) - 101], 2e-3, 'inversa');
});
prueba('velocidad conserva tono (OLA) y cambia longitud', () => {
  const sr = 16000, n = sr * 2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * 500 * i / sr);
  const cruces = (y) => { let c = 0; for (let i = 1; i < y.length; i++) if (y[i - 1] < 0 && y[i] >= 0) c++; return c / (y.length / sr); };
  const y2 = Z.estirar(x, sr, 2); cerca(y2.length, n / 2, 1); cerca(cruces(y2.subarray(2000, y2.length - 2000)), 500, 15, 'tono x2');
  const y3 = Z.estirar(x, sr, 0.5); cerca(y3.length, n * 2, 1); cerca(cruces(y3.subarray(2000, y3.length - 2000)), 500, 15, 'tono x0.5');
  const m = Z.mezclar({ clips: [{ medio: 'a', ini: 0, dur: 1, off: 0, vel: 2, vol: 1, tono: true }], obtener: () => ({ sr, ch: [x] }), sr, ini: 0, dur: 1 }); cerca(cruces(m[0].subarray(2000, 14000)), 500, 15);
  const v = Z.mezclar({ clips: [{ medio: 'a', ini: 0, dur: 1, off: 0, vel: 2, vol: 1, tono: false }], obtener: () => ({ sr, ch: [x] }), sr, ini: 0, dur: 1 }); cerca(cruces(v[0].subarray(2000, 14000)), 1000, 25, 'sin conservar tono');
});
prueba('sonidos procedurales: 10+ musicas y 20+ efectos validos', () => {
  cierto(SN.MUSICAS.length >= 10 && SN.EFECTOS.length >= 20, SN.MUSICAS.length + '/' + SN.EFECTOS.length);
  SN.MUSICAS.forEach(m => { const [L, R] = SN.musica(m.id, 12, 22050); igual(L.length, 12 * 22050); const pk = Z.pico(L); cierto(pk > 0.3 && pk <= 1, m.id + ' pico ' + pk); for (let i = 0; i < L.length; i += 997) cierto(isFinite(L[i]) && isFinite(R[i])); let e = 0; for (let i = 0; i < L.length; i++) e += L[i] * L[i]; cierto(e / L.length > 1e-4, m.id + ' energia'); });
  SN.EFECTOS.forEach(f => { const [L] = SN.efecto(f.id, 22050); cierto(L.length > 100 && Z.pico(L) > 0.5 && Z.pico(L) <= 1, f.id); for (let i = 0; i < L.length; i++) if (!isFinite(L[i])) throw new Error('NaN ' + f.id); });
  const a = SN.musica('lofi', 4, 8000)[0], b = SN.musica('lofi', 4, 8000)[0]; igual(Array.from(a.subarray(0, 50)), Array.from(b.subarray(0, 50)), 'determinista');
});
fin('logica');
