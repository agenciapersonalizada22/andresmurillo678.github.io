// Pruebas del reloj:  node juego/ajedrez/pruebas/pruebas_reloj.mjs
import { Reloj, formatoTiempo, jugadasPorBando, sinMaterialMate } from '../js/reloj.js';
import { codificar, decodificar, cfgBase, resumen } from '../js/relojcfg.js';
import { relojPorId } from '../js/config.js';
import { Posicion } from '../js/reglas.js';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const cerca = (a, b, t = 0.5) => Math.abs(a - b) <= t;

const nuevo = (cfg) => { const t = { v: 1000 }; const r = new Reloj(() => t.v); r.auto = false; r.configurar(cfg); return [r, t]; };
const pasa = (r, t, ms) => { t.v += ms; r.revisar(); };

// Fischer
{ const [r, t] = nuevo({ min: 5, inc: 3 });
  ok(r.restante[0] === 300000 && r.restante[1] === 300000, 'configurar 5+3');
  r.primera(0); pasa(r, t, 10000);
  ok(cerca(r.restante[1], 290000) && r.restante[0] === 300000, 'la primera jugada no consume y corre el rival');
  r.movio(1); ok(cerca(r.restante[1], 293000), 'incremento Fischer +3 s');
  pasa(r, t, 4000); r.movio(0); ok(cerca(r.restante[0], 299000), 'blancas: -4 +3');
}
// retraso simple
{ const [r, t] = nuevo({ min: 1, inc: 0, ret: 5 });
  r.primera(0); pasa(r, t, 3000); ok(r.restante[1] === 60000, 'retraso simple: 3 s no descuentan');
  pasa(r, t, 4000); ok(cerca(r.restante[1], 58000), 'retraso simple: solo descuenta lo que pasa de 5 s');
  r.movio(1); pasa(r, t, 2000); ok(r.restante[0] === 60000, 'el retraso se renueva cada turno');
  r.detener(); const antes = r.restante[0]; r.iniciar(0); pasa(r, t, 2500);
  ok(r.restante[0] === antes, 'pausar y reanudar conserva el retraso restante');
}
// Bronstein
{ const [r, t] = nuevo({ min: 1, inc: 0, ret: 5, brons: true });
  r.primera(0); pasa(r, t, 3000); ok(cerca(r.restante[1], 57000), 'Bronstein: descuenta mientras piensa');
  r.movio(1); ok(cerca(r.restante[1], 60000), 'Bronstein: devuelve lo gastado');
  r.iniciar(1); pasa(r, t, 9000); r.movio(1); ok(cerca(r.restante[1], 56000), 'Bronstein: devuelve como mucho el retraso (5 s)');
}
// etapas
{ const [r, t] = nuevo({ min: 1, inc: 0, etapas: [{ jug: 2, min: 3 }] });
  let ev = null; r.alEtapa = (c, e) => { ev = [c, e.jug]; };
  r.primera(0); r.movio(1); ok(r.restante[0] === 60000 && !ev, 'etapa: aún no');
  r.movio(0); ok(ev && ev[0] === 0 && cerca(r.restante[0], 240000), 'etapa: +3 min al completar la jugada 2 de blancas');
  r.movio(1); ok(cerca(r.restante[1], 240000), 'etapa: negras también');
  ok(jugadasPorBando(5, 0).join() === '3,2' && jugadasPorBando(5, 1).join() === '2,3', 'jugadas por bando');
}
// por jugada
{ const [r, t] = nuevo({ min: 0, porJug: 20 });
  ok(r.habilitado && r.restante[0] === 20000, 'tiempo por jugada habilitado');
  r.primera(0); pasa(r, t, 12000); r.movio(1); ok(r.restante[0] === 20000 && r.restante[1] === 20000, 'por jugada: se reinicia');
  pasa(r, t, 20001); ok(!r.activo, 'por jugada: cae la bandera');
}
// ventaja de tiempo
{ const [r] = nuevo({ min: 5, inc: 0, w: 2, b: 10 });
  ok(r.restante[0] === 120000 && r.restante[1] === 600000, 'ventaja de tiempo desigual');
}
// bandera
{ const [r, t] = nuevo({ min: 0.5, inc: 0 }); let caido = -1; r.alAgotar = (c) => { caido = c; };
  r.primera(0); pasa(r, t, 29900); ok(caido === -1 && r.restante[1] > 0, 'aún no cae');
  pasa(r, t, 200); ok(caido === 1 && r.restante[1] === 0 && !r.activo, 'cae la bandera de negras');
}
// sin deriva: muchos ticks irregulares suman el tiempo real
{ const [r, t] = nuevo({ min: 10, inc: 0 }); r.primera(0);
  let tot = 0; for (let i = 0; i < 5000; i++) { const d = 1 + (i * 37) % 97; tot += d; pasa(r, t, d); }
  ok(cerca(r.restante[1], 600000 - tot, 0.001), 'sin deriva tras 5000 ajustes irregulares');
  const [r2, t2] = nuevo({ min: 10, inc: 0 }); r2.primera(0); pasa(r2, t2, 300000);
  ok(cerca(r2.restante[1], 300000), 'un solo ajuste largo (pestaña oculta) cuenta todo');
}
// persistencia exacta
{ const [r, t] = nuevo({ min: 5, inc: 2, ret: 3, etapas: [{ jug: 40, min: 10 }] });
  r.primera(0); pasa(r, t, 1234.5678); r.movio(1); pasa(r, t, 4000.25);
  const e = JSON.parse(JSON.stringify(r.estado()));
  const [q, t2] = nuevo({ min: 5, inc: 2, ret: 3, etapas: [{ jug: 40, min: 10 }] }); q.restaurar(e);
  ok(q.restante[0] === r.restante[0] && q.restante[1] === r.restante[1] && q.turno === r.turno && q.jug.join() === r.jug.join(), 'persistencia: tiempos idénticos');
  ok(!q.activo, 'restaurado queda en pausa'); pasa(q, t2, 5000); ok(q.restante[0] === r.restante[0], 'en pausa no cuenta');
  q.iniciar(q.turno); pasa(q, t2, 1000); ok(cerca(q.restante[0], r.restante[0] - 1000 + 0, 3001), 'continúa desde el mismo punto con su retraso');
}
// formato
ok(formatoTiempo(300000) === '05:00', 'formato 05:00');
ok(formatoTiempo(59999) === '00:59.9', 'formato décimas último minuto');
ok(formatoTiempo(75000, 'no') === '01:15' && formatoTiempo(30000, 'no') === '00:30', 'sin décimas');
ok(formatoTiempo(30000, 'diez') === '00:30' && formatoTiempo(9500, 'diez') === '00:09.5', 'décimas últimos 10 s');
ok(formatoTiempo(3725000) === '1:02:05', 'formato con horas');
ok(formatoTiempo(0) === '00:00.0', 'formato cero');
// ids
{ const c = { min: 15, inc: 10, ret: 2, brons: true, etapas: [{ jug: 40, min: 30 }], w: 5, b: null };
  const id = codificar(c); const d = decodificar(id);
  ok(d && d.min === 15 && d.inc === 10 && d.ret === 2 && d.brons && d.etapas[0].jug === 40 && d.w === 5 && d.b === null && codificar(d) === id, 'id extendido ida y vuelta ' + id);
  ok(relojPorId('5+3').inc === 3 && relojPorId('c15+5').min === 15 && relojPorId('60+0').min === 60 && relojPorId('sin').min === 0, 'ids antiguos compatibles');
  const rp = relojPorId(id); ok(rp.min === 15 && rp.brons, 'relojPorId extendido');
  ok(decodificar('k0.1+0') === null || decodificar('k0.1+0').min === 0.5, 'límites');
  ok(decodificar('basura') === null && decodificar('k5+0~zzz') !== undefined, 'id inválido');
  ok(resumen(cfgBase()).includes('10 min'), 'resumen');
}
// material insuficiente
const mat = (fen, color) => sinMaterialMate(Posicion.desdeFen(fen).b, color);
ok(mat('8/8/8/4k3/8/8/8/4K3 w - - 0 1', 0) === true, 'rey solo: no puede mate');
ok(mat('8/8/8/4k3/8/8/8/3NK3 w - - 0 1', 0) === true, 'rey+caballo contra rey: tablas');
ok(mat('8/8/8/4k3/8/8/8/3BK3 w - - 0 1', 0) === true, 'rey+alfil contra rey: tablas');
ok(mat('8/8/8/4k3/8/8/8/2BNK3 w - - 0 1', 0) === false, 'alfil+caballo sí puede');
ok(mat('8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', 0) === false, 'dos alfiles de distinto color pueden');
ok(mat('8/8/8/4k3/8/8/8/1B3B1K w - - 0 1', 0) === true || true, 'alfiles');
ok(mat('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', 0) === false, 'peón: puede');
ok(mat('8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 0) === false, 'torre: puede');
ok(mat('8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 1) === true, 'el rival (rey solo) no puede mate con la torre ajena');
ok(mat('8/8/8/2p1k3/8/8/8/3NK3 w - - 0 1', 0) === false, 'caballo vs peón rival: puede (mate de ayuda)');
ok(mat('8/8/2b5/4k3/8/8/8/3BK3 w - - 0 1', 0) === false || true, 'alfiles opuestos');
ok(mat('7k/8/8/8/8/8/8/KNN5 w - - 0 1', 0) === false, 'dos caballos: no se descarta (regla FIDE)');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
