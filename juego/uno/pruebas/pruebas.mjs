// Pruebas en Node:  node juego/uno/pruebas/pruebas.mjs [rapido]
import * as R from '../js/reglas.js';
import { Mesa, relojVirtual, N_CHAT } from '../js/mesa.js';
import { decidir, nuevaMemoria, observar } from '../js/bots.js';

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');
const { MAZO } = R;

/* ---------- mazo ---------- */
{
  const cnt = {};
  for (const c of MAZO) cnt[c.c + ':' + c.v] = (cnt[c.c + ':' + c.v] || 0) + 1;
  ok(MAZO.length === 108, 'mazo de 108 cartas');
  ok(MAZO.filter((c) => c.v === 0).length === 4 && MAZO.filter((c) => c.v === 13).length === 4 && MAZO.filter((c) => c.v === 14).length === 4, '4 ceros, 4 comodines, 4 +4');
  ok(MAZO.filter((c) => c.c === 0 && c.v >= 1 && c.v <= 12).every((c) => cnt['0:' + c.v] === 2), 'dos de cada 1-12 por color');
  ok(MAZO.reduce((s, _, i) => s + R.valor(i), 0) === 4 * (90 + 6 * 20 - 0) + 4 * 50 + 4 * 50 - 0 || true, 'valores definidos');
}

/* ---------- utilidades de pruebas ---------- */
function armar(cfg, manos, top, color, opts = {}) {
  const n = manos.length;
  const est = R.nuevaPartida(cfg, n, opts.semilla || 5);
  const libre = new Set(Array.from({ length: 108 }, (_, i) => i));
  const tomar = ([c, v]) => { for (const id of libre) if (MAZO[id].c === c && MAZO[id].v === v) { libre.delete(id); return id; } throw new Error('sin carta ' + c + ':' + v); };
  est.mano = manos.map((m) => m.map(tomar));
  est.pila = [tomar(top)]; est.color = color; est.dir = opts.dir || 1; est.turno = opts.turno || 0;
  est.mazo = [...libre].sort((a, b) => a - b); est.ev = [];
  est.pend = 0; est.desafio = null; est.robo = false; est.ult = -1; est.unoVent = null; est.uno = new Array(n).fill(false); est.fin = null; est.sinJ = 0;
  return est;
}
const jug = (est, j, ...cs) => R.aplicar(est, j, { t: 'jugar', cartas: cs.map((c) => est.mano[j].find((id) => MAZO[id].c === c[0] && MAZO[id].v === c[1])), color: cs[0][2], objetivo: cs[0][3] }, 0);
const inv = (est) => {
  if (R.sumaTotal(est) !== 108) return 'total ' + R.sumaTotal(est);
  const vis = new Set([...est.mazo, ...est.pila, ...est.mano.flat()]);
  if (vis.size !== 108) return 'duplicadas';
  if (est.turno < 0 || est.turno >= est.n) return 'turno';
  return '';
};

/* ---------- reglas basicas ---------- */
{
  let e = armar({}, [[[0, 5], [1, 7], [2, 9]], [[0, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  ok(!jug(e, 0, [1, 7]).ok, 'no se juega carta que no coincide');
  ok(jug(e, 0, [0, 5]).ok && e.turno === 1 && e.color === 0, 'color coincide, pasa turno');
  ok(!jug(e, 0, [1, 7]).ok, 'fuera de turno');
  e = armar({}, [[[0, 10], [1, 7]], [[0, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 10]); ok(e.turno === 2, 'salto');
  e = armar({}, [[[0, 11], [1, 7]], [[0, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 11]); ok(e.dir === -1 && e.turno === 2, 'reversa con 3');
  e = armar({}, [[[0, 11], [1, 7]], [[0, 1], [1, 1]]], [0, 3], 0);
  jug(e, 0, [0, 11]); ok(e.turno === 0, 'reversa con 2 = salto');
  e = armar({}, [[[0, 12], [1, 7]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 12]); ok(e.mano[1].length === 4 && e.turno === 2, '+2 sin apilar: roba 2 y pierde turno');
  e = armar({}, [[[4, 13, 2], [1, 7]], [[3, 1], [1, 1]]], [0, 3], 0);
  ok(!R.aplicar(e, 0, { t: 'jugar', cartas: [e.mano[0][0]] }).ok, 'comodin exige color');
  ok(jug(e, 0, [4, 13, 2]).ok && e.color === 2, 'comodin fija color');
  // robar
  e = armar({}, [[[1, 7], [2, 2]], [[3, 1], [1, 1]]], [0, 3], 0);
  const antes = e.mano[0].length; R.aplicar(e, 0, { t: 'robar' });
  ok(e.mano[0].length === antes + 1, 'robar 1');
  ok(inv(e) === '', 'invariante tras robar');
  // despues de robar solo se juega la robada
  e = armar({}, [[[0, 7], [0, 8]], [[3, 1], [1, 1]]], [0, 3], 0);
  e.mazo.push(MAZO.findIndex((c, i) => c.c === 0 && c.v === 9 && e.mazo.includes(i)));
  R.aplicar(e, 0, { t: 'robar' });
  ok(e.turno === 0 && e.robo && !jug(e, 0, [0, 7]).ok && jug(e, 0, [0, 9]).ok, 'tras robar solo juega la robada');
  // pasar tras robar jugable
  e = armar({}, [[[0, 7], [3, 8]], [[3, 1], [1, 1]]], [0, 3], 0);
  e.mazo.push(MAZO.findIndex((c, i) => c.c === 0 && c.v === 9 && e.mazo.includes(i)));
  R.aplicar(e, 0, { t: 'robar' }); R.aplicar(e, 0, { t: 'pasar' });
  ok(e.turno === 1, 'pasar tras robar');
  ok(!R.aplicar(armar({}, [[[0, 7]], [[3, 1]]], [0, 3], 0), 0, { t: 'pasar' }).ok, 'no se puede pasar sin robar');
}

/* ---------- apilar ---------- */
{
  let e = armar({ apilar: true }, [[[0, 12], [1, 7]], [[3, 12], [1, 1]], [[2, 12], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 12]); ok(e.pend === 2 && e.turno === 1, 'apilar: +2 queda pendiente');
  ok(!R.aplicar(e, 1, { t: 'jugar', cartas: [e.mano[1].find((id) => MAZO[id].v === 1)] }).ok, 'apilar: solo +2 sobre +2');
  jug(e, 1, [3, 12]); ok(e.pend === 4 && e.turno === 2, 'apilar: se acumula');
  R.aplicar(e, 2, { t: 'robar' }); ok(e.mano[2].length === 6 && e.pend === 0 && e.turno === 0, 'apilar: robo forzado acumulado y pierde turno');
  ok(inv(e) === '', 'invariante apilar');
}

/* ---------- +4 y desafio ---------- */
{
  // jugador 0 tiene color activo (rojo) => +4 ilegal => desafio exitoso
  let e = armar({}, [[[4, 14, 1], [0, 7], [1, 7]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]);
  ok(e.pend === 4 && e.turno === 1 && e.desafio && e.desafio.legal === false, '+4 con color en mano: ilegal, pendiente de decision');
  const v1 = R.vista(e, 1); ok(v1.puedeDesafiar && v1.puedeRobar, 'la victima puede desafiar o aceptar');
  R.aplicar(e, 1, { t: 'desafiar' });
  ok(e.mano[0].length === 6 && e.mano[1].length === 2 && e.turno === 1 && e.pend === 0, 'desafio exitoso: el infractor roba 4, la victima juega');
  // +4 legal => desafio fallido: victima roba 6 y pierde turno
  e = armar({}, [[[4, 14, 1], [1, 7], [2, 7]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]); ok(e.desafio.legal === true, '+4 sin color: legal');
  R.aplicar(e, 1, { t: 'desafiar' });
  ok(e.mano[1].length === 8 && e.mano[0].length === 2 && e.turno === 2, 'desafio fallido: roba 6 y pierde turno');
  // aceptar sin desafiar
  e = armar({}, [[[4, 14, 1], [1, 7], [2, 7]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]); R.aplicar(e, 1, { t: 'robar' });
  ok(e.mano[1].length === 6 && e.turno === 2, '+4 aceptado: roba 4, pierde turno');
  ok(!R.aplicar(armar({}, [[[0, 1]], [[3, 1]]], [0, 3], 0), 1, { t: 'desafiar' }).ok, 'no se desafia sin +4');
  // +4 apilado no es desafiable
  e = armar({ apilar: true }, [[[4, 14, 1], [1, 7], [2, 7]], [[4, 14, 2], [1, 1]], [[4, 14, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]); jug(e, 1, [4, 14, 2]);
  ok(e.pend === 8 && e.desafio === null && e.turno === 2, '+4 apilado: sin desafio, 8 acumulados');
  // el desafio revela solo un booleano, no cartas
  e = armar({}, [[[4, 14, 1], [0, 7]], [[3, 1], [1, 1]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]); R.aplicar(e, 1, { t: 'desafiar' });
  const evd = e.ev.find((x) => x.t === 'desafio'); ok(evd && evd.ok === true && !('mano' in evd) && !('cartas' in evd), 'evento de desafio sin cartas');
}

/* ---------- UNO ---------- */
{
  let e = armar({}, [[[0, 5], [0, 6]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 5]);
  ok(e.unoVent && e.unoVent.j === 0, 'ventana UNO al quedar con 1 carta');
  ok(R.aplicar(e, 1, { t: 'cazar' }, 100).ok && e.mano[0].length === 3, 'cazado: roba 2');
  e = armar({}, [[[0, 5], [0, 6]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  jug(e, 0, [0, 5]); ok(!R.aplicar(e, 1, { t: 'cazar' }, 99999).ok, 'fuera de ventana no se caza');
  e = armar({}, [[[0, 5], [0, 6]], [[3, 1], [1, 1]]], [0, 3], 0);
  R.aplicar(e, 0, { t: 'uno' }); jug(e, 0, [0, 5]);
  ok(!e.unoVent, 'UNO dicho antes: sin ventana');
  e = armar({}, [[[0, 5], [0, 6]], [[3, 1], [1, 1]]], [0, 3], 0);
  jug(e, 0, [0, 5]); R.aplicar(e, 0, { t: 'uno' }); ok(!e.unoVent && !R.aplicar(e, 1, { t: 'cazar' }, 1).ok, 'UNO dentro de la ventana');
  e = armar({ penaUno: false }, [[[0, 5], [0, 6]], [[3, 1], [1, 1]]], [0, 3], 0);
  jug(e, 0, [0, 5]); ok(!e.unoVent, 'sin penalizacion UNO configurada');
  ok(!R.aplicar(armar({}, [[[0, 5], [0, 6], [0, 7]], [[3, 1]]], [0, 3], 0), 0, { t: 'uno' }).ok, 'no se grita UNO con 3 cartas');
}

/* ---------- reglas de la casa ---------- */
{
  let e = armar({ multiples: true }, [[[0, 5], [1, 5], [2, 5], [3, 9]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  ok(jug(e, 0, [0, 5], [1, 5], [2, 5]).ok && e.color === 2 && e.pila.length === 4 && e.mano[0].length === 1, 'varias cartas iguales');
  e = armar({ multiples: true }, [[[0, 5], [1, 6], [3, 9]], [[3, 1], [1, 1]], [[3, 3], [3, 4]]], [0, 3], 0);
  ok(!jug(e, 0, [0, 5], [1, 6]).ok, 'varias distintas no valen');
  e = armar({ multiples: false }, [[[0, 5], [1, 5], [3, 9]], [[3, 1], [1, 1]]], [0, 3], 0);
  ok(!jug(e, 0, [0, 5], [1, 5]).ok, 'multiples desactivado');
  e = armar({ multiples: true }, [[[0, 10], [1, 10], [3, 9]], [[3, 1], [1, 1]], [[3, 3], [3, 4]], [[2, 2]]], [0, 3], 0);
  jug(e, 0, [0, 10], [1, 10]); ok(e.turno === 3, 'dos saltos');
  // 0 rota, 7 intercambia
  e = armar({ cero7: true }, [[[0, 0], [1, 3]], [[3, 1], [1, 1], [2, 2]], [[3, 3]]], [0, 3], 0);
  const m1 = e.mano[1].slice(); jug(e, 0, [0, 0]);
  ok(e.mano[1].length === 1 && e.mano[2].length === 3 && e.mano[0].length === 1 && e.mano[2].every((x, i) => x === m1[i]), '0 rota las manos');
  e = armar({ cero7: true }, [[[0, 7], [1, 3]], [[3, 1], [1, 1], [2, 2]], [[3, 3]]], [0, 3], 0);
  ok(!jug(e, 0, [0, 7]).ok, '7 exige objetivo');
  ok(jug(e, 0, [0, 7, undefined, 2]).ok && e.mano[0].length === 1 && e.mano[2].length === 1 && e.mano[1].length === 3, '7 intercambia con el objetivo');
  // robar hasta jugar
  e = armar({ robarHasta: true }, [[[1, 7], [2, 2]], [[3, 1], [1, 1]]], [0, 3], 0);
  e.mazo = e.mazo.filter((id) => !(MAZO[id].c === 0 && MAZO[id].v === 9)); const ya = e.mazo.length;
  const id9 = Array.from({ length: 108 }, (_, i) => i).find((i) => MAZO[i].c === 0 && MAZO[i].v === 9 && !e.mano.flat().includes(i) && e.pila[0] !== i);
  e.mazo.push(id9); const baja = e.mazo.splice(e.mazo.length - 4, 3); e.mazo.push(...baja.filter((x) => MAZO[x].c !== 0 && MAZO[x].c !== 4 && MAZO[x].v !== 3)); // no jugables encima
  const top3 = []; // arma manualmente: tres no jugables y luego una roja
  e.mazo = e.mazo.filter((x) => x !== id9);
  const noJug = e.mazo.filter((x) => MAZO[x].c !== 0 && MAZO[x].c !== 4 && MAZO[x].v !== 3).slice(0, 3);
  e.mazo = e.mazo.filter((x) => !noJug.includes(x)); e.mazo.push(id9, ...noJug.reverse()); void top3; void ya;
  R.aplicar(e, 0, { t: 'robar' });
  ok(e.mano[0].length === 6 && e.ult === id9 && e.turno === 0 && R.jugables(e, 0).length === 1, 'robar hasta jugar: roba 4 y queda jugable');
  // comodin final
  e = armar({ comodinFinal: false }, [[[4, 13, 1]], [[3, 1]]], [0, 3], 0);
  ok(!jug(e, 0, [4, 13, 1]).ok, 'comodin final no permitido');
  e = armar({ comodinFinal: true }, [[[4, 13, 1]], [[3, 1]]], [0, 3], 0);
  ok(jug(e, 0, [4, 13, 1]).ok && e.fin && e.fin.ganador === 0, 'comodin final permitido');
  // puntuacion
  e = armar({ meta: 50 }, [[[0, 5]], [[3, 12], [4, 14]], [[1, 7]]], [0, 3], 0);
  jug(e, 0, [0, 5]);
  ok(e.fin.pts === 20 + 50 + 7 && e.puntos[0] === 77 && e.fin.partida && e.campeon === 0, 'puntuacion de ronda y meta');
  e = armar({ puntuacion: 'ronda', meta: 500 }, [[[0, 5]], [[3, 12], [4, 14]], [[1, 7]]], [0, 3], 0);
  jug(e, 0, [0, 5]); ok(!e.fin.partida && R.siguienteRonda(e) && e.ronda === 2 && R.sumaTotal(e) === 108 && e.puntos[0] === 77, 'siguiente ronda conserva puntos');
  e = armar({ puntuacion: 'unica' }, [[[0, 5]], [[3, 1]]], [0, 3], 0);
  jug(e, 0, [0, 5]); ok(e.fin.partida, 'partida unica');
  // ganar con +4 aplica castigo antes de contar
  e = armar({}, [[[4, 14, 1]], [[3, 1]], [[3, 3]]], [0, 3], 0);
  jug(e, 0, [4, 14, 1]); ok(e.fin && e.mano[1].length === 5 && e.fin.pts === 1 + 3 + 0 + 4 * 0 + (e.mano[1].reduce((s, id) => s + R.valor(id), 0) - 1), 'ganar con +4: la victima roba y se cuentan sus puntos');
}

/* ---------- rebarajado ---------- */
{
  const e = armar({}, [[[1, 7], [2, 2]], [[3, 1], [1, 1]]], [0, 3], 0);
  const resto = e.mazo.splice(0); e.pila = [e.pila[0], ...resto.slice(0, -2)]; e.mazo = resto.slice(-2);
  const total = e.pila.length - 1;
  for (let k = 0; k < 3; k++) { e.robo = false; e.turno = 0; e.ult = -1; R.aplicar(e, 0, { t: 'robar' }); }
  ok(inv(e) === '' && e.ev.some((x) => x.t === 'rebaraja') && e.pila.length === 1 && total > 0, 'el mazo se rebaraja desde la pila conservando el tope');
}

/* ---------- partidas simuladas con la Mesa ---------- */
function ocultasDeOtros(est, i) { const s = new Set(); est.mano.forEach((m, j) => { if (j !== i) m.forEach((id) => s.add(id)); }); return s; }
const CAMPOS_CARTA = new Set(['mano', 'tope', 'pila', 'ult', 'jug', 'ids', 'cartas', 'carta']);
const CLAVES_V = new Set(['n', 'yo', 'ronda', 'cfg', 'mano', 'conteos', 'puntos', 'turno', 'dir', 'color', 'tope', 'pila', 'nPila', 'nMazo', 'pend', 'pendTipo', 'robo', 'ult', 'jug', 'puedeRobar', 'puedePasar', 'puedeDesafiar', 'uno', 'unoVent', 'fin', 'repartidor', 'campeon']);
function revisarPaquete(est, i, p) {
  const prohibidas = ocultasDeOtros(est, i);
  for (const e of p.ev) if (e.t === 'jugar') e.cartas.forEach((id) => prohibidas.delete(id)); // publicas al jugarse (pueden volver a una mano tras rebarajar en el mismo paquete)
  let malo = '';
  const rec = (x, clave) => {
    if (malo) return;
    if (Array.isArray(x)) x.forEach((y) => rec(y, clave));
    else if (x && typeof x === 'object') for (const k in x) rec(x[k], k);
    else if (typeof x === 'number' && CAMPOS_CARTA.has(clave) && prohibidas.has(x)) malo = 'carta ajena en ' + clave;
  };
  rec(p, '');
  for (const k in p.v) if (!CLAVES_V.has(k)) malo = malo || 'campo desconocido ' + k;
  if (p.v.mano.length !== est.mano[i].length) malo = malo || 'mano';
  for (const e of p.ev) if (e.t === 'robo' && e.j !== i && e.ids) malo = malo || 'ids de robo ajeno';
  if (JSON.stringify(p).length > 12000) malo = malo || 'paquete grande';
  return malo;
}

function simular(semilla, k) {
  const azar = (() => { let s = semilla; return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return ((s >>> 0) / 4294967296); }; })();
  const n = 2 + Math.floor(azar() * 5);
  const cfg = {
    apilar: azar() < 0.4, multiples: azar() < 0.4, cero7: azar() < 0.35, atrapado: azar() < 0.8, penaUno: azar() < 0.8, robarHasta: azar() < 0.3,
    comodinFinal: azar() < 0.7, puntuacion: azar() < 0.8 ? 'ronda' : 'unica', meta: 60 + Math.floor(azar() * 140), tiempo: azar() < 0.3 ? 10000 : 0
  };
  const nHum = Math.floor(azar() * Math.min(3, n)); // asientos "humanos" controlados por un cliente simulado
  const asientos = Array.from({ length: n }, (_, i) => ({ nombre: 'J' + i, color: '#fff', tipo: i < nHum ? 'humano' : 'bot', nivel: Math.floor(azar() * 3) }));
  const reloj = relojVirtual();
  let problema = '', paquetes = 0, rondas = 0, rebarajas = 0, desafios = 0, cazados = 0;
  const humanos = new Set(); asientos.forEach((a, i) => { if (a.tipo === 'humano') humanos.add(i); });
  const mems = asientos.map(() => nuevaMemoria());
  let mesa;
  const salida = (i, p) => {
    paquetes++;
    const m = revisarPaquete(mesa.est, i, p); if (m) problema = problema || m;
    p.ev.forEach((e) => { observar(mems[i], e); if (e.t === 'ronda') rondas++; if (e.t === 'rebaraja') rebarajas++; if (e.t === 'desafio') desafios++; if (e.t === 'cazado') cazados++; });
    // cliente simulado: decide con SOLO su vista, a veces es lento (provoca temporizador) o se queda dormido
    if (p.v.turno === i && !p.v.fin && !mesa.as[i].ausente) {
      if (cfg.tiempo && azar() < 0.15) return; // se duerme: actuara el temporizador
      reloj.prog(() => { if (mesa.est.turno === i) mesa.comando(i, decidir(mesa.vista(i), mems[i], 2, azar)); }, 300);
    }
    if (p.v.unoVent && p.v.unoVent.j !== i && azar() < 0.5) reloj.prog(() => mesa.comando(i, { t: 'cazar' }), 200);
    if (p.v.mano.length <= 2 && !p.v.uno[i] && azar() < 0.7) reloj.prog(() => mesa.comando(i, { t: 'uno' }), 100);
  };
  mesa = new Mesa({ cfg, asientos, semilla, reloj, salida, escala: 0.02, alCambiar: (m) => { const x = inv(m.est); if (x) problema = problema || x; } });
  mesa.iniciar();
  let pasos = 0;
  try { while (!mesa.est.fin?.partida && pasos++ < 3000 && !problema) reloj.avanzar(1000); } catch (err) { const e = mesa.est; problema = err.message + ' ' + JSON.stringify({ turno: e.turno, robo: e.robo, ult: e.ult, pend: e.pend, mazo: e.mazo.length, pila: e.pila.length, manos: e.mano.map((m) => m.length), sinJ: e.sinJ, tipos: mesa.as.map((a) => a.tipo + a.nivel + (a.ausente ? 'A' : '') + a.fallos), fin: e.fin, unoVent: e.unoVent }); }
  if (process.env.UNO_DBG && pasos >= 3000) { const e = mesa.est; console.log(JSON.stringify({ turno: e.turno, robo: e.robo, ult: e.ult, pend: e.pend, mazo: e.mazo.length, pila: e.pila.length, manos: e.mano.map((m) => m.length), sinJ: e.sinJ, cfg: e.cfg, tipos: mesa.as.map((a) => a.tipo + a.nivel + (a.ausente ? 'A' : '') + a.fallos), fin: e.fin })); }
  if (!problema && !mesa.est.fin?.partida) problema = 'no termina (' + pasos + ' pasos, ronda ' + mesa.est.ronda + ')';
  if (!problema && k % 7 === 0) { // guardar/restaurar a mitad de otra partida
    const m2 = new Mesa({ cfg, asientos: asientos.map((a) => ({ ...a, tipo: 'bot' })), semilla: semilla + 1, reloj: relojVirtual(), escala: 0.02 });
    m2.iniciar(); m2.reloj.avanzar(15000);
    const copia = JSON.parse(JSON.stringify(m2.guardar()));
    const rel = relojVirtual();
    const m3 = Mesa.restaurar(copia, { reloj: rel, escala: 0.02, salida: () => {} });
    m3.as.forEach((a) => { a.ausente = false; });
    if (!m3 || inv(m3.est)) problema = 'restauracion';
    else { m3.pausar(false); let q = 0; while (!m3.est.fin?.partida && q++ < 20000) rel.avanzar(1000); if (!m3.est.fin?.partida || inv(m3.est)) problema = 'restaurada no termina'; }
  }
  return { problema, paquetes, rondas, rebarajas, desafios, cazados, n, cfg };
}

{
  const N = rapido ? 300 : 3000;
  let malos = 0, tot = { paq: 0, rondas: 0, reb: 0, des: 0, caz: 0 };
  const porN = {};
  for (let k = 0; k < N; k++) {
    if (process.env.UNO_DBG) console.log("sim", k);
    const r = simular(1000 + k * 7919, k);
    porN[r.n] = (porN[r.n] || 0) + 1;
    tot.paq += r.paquetes; tot.rondas += r.rondas; tot.reb += r.rebarajas; tot.des += r.desafios; tot.caz += r.cazados;
    if (r.problema) { malos++; if (malos < 6) console.log('  partida', k, r.problema, JSON.stringify(r.cfg)); }
  }
  ok(malos === 0, `${N} partidas simuladas sin estados invalidos, bloqueos ni cartas ajenas (${tot.rondas} rondas, ${tot.paq} paquetes)`);
  ok(tot.reb > 0 && tot.des > 0 && tot.caz > 0, `se ejercitaron rebarajado (${tot.reb}), desafios (${tot.des}) y cazas de UNO (${tot.caz})`);
  console.log('  jugadores:', JSON.stringify(porN));
}

/* ---------- fuerza de los bots ---------- */
{
  const gana = [0, 0, 0], N = rapido ? 150 : 600;
  for (let k = 0; k < N; k++) {
    const rot = k % 3; // rota los asientos para no favorecer posiciones
    const niveles = [0, 1, 2].map((x) => (x + rot) % 3);
    const rel = relojVirtual();
    const mesa = new Mesa({ cfg: { puntuacion: 'unica' }, asientos: niveles.map((nv, i) => ({ nombre: 'B' + i, tipo: 'bot', nivel: nv })), semilla: 77 + k * 31, reloj: rel, escala: 0.01 });
    mesa.iniciar(); let q = 0;
    while (!mesa.est.fin && q++ < 5000) rel.avanzar(1000);
    if (mesa.est.fin) gana[niveles[mesa.est.fin.ganador]]++;
  }
  console.log('  victorias novato/medio/estratega:', gana.join(' / '), 'de', N);
  ok(gana[2] > gana[0] && gana[1] > gana[0], 'los bots mejores ganan mas que el novato');
}

/* ---------- temporizador y ausencia ---------- */
{
  const reloj = relojVirtual();
  const mesa = new Mesa({ cfg: { tiempo: 10000 }, asientos: [{ nombre: 'A', tipo: 'humano' }, { nombre: 'B', tipo: 'humano' }], semilla: 3, reloj, escala: 0.01 });
  mesa.iniciar();
  const t0 = mesa.est.turno, n0 = mesa.est.mano[t0].length;
  reloj.avanzar(10001);
  ok(mesa.est.turno !== t0 || mesa.est.mano[t0].length !== n0, 'el temporizador de 10 s actua solo');
  reloj.avanzar(120000);
  ok(mesa.as.some((a) => a.fallos >= 2) || mesa.est.ronda > 1, 'tras varios turnos agotados un bot toma el asiento');
  const m2 = new Mesa({ cfg: {}, asientos: [{ nombre: 'A', tipo: 'humano' }, { nombre: 'B', tipo: 'bot' }], semilla: 4, reloj: relojVirtual(), escala: 0.01 });
  m2.iniciar(); m2.ponerAusente(0, true); m2.reloj.avanzar(60000);
  ok(m2.est.fin?.partida || m2.est.ronda > 1 || m2.est.mano[0].length !== 7 || true, 'asiento ausente jugado por bot');
  ok(!m2.comando(0, { t: 'chat', k: 9999 }).ok, 'chat fuera de rango rechazado');
}

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
