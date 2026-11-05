var T = require('./util'), M = require('../js/modelos.js'), cerca = T.cerca;
cerca(M.pmf(0, 1), Math.exp(-1), 1e-12, 'pmf0'); cerca(M.pmf(2, 1.5), Math.exp(-1.5) * 1.125, 1e-12, 'pmf2');
var p = M.poisson(1, 1);
cerca(p.empate, 0.30850832, 1e-7, 'empate 1-1 (e^-2 * I0(2))'); cerca(p.local, 0.34574584, 1e-7, 'local'); cerca(p.visitante, p.local, 1e-12, 'simetria');
cerca(p.matriz[0][0], Math.exp(-2), 1e-9, '0-0'); cerca(p.local + p.empate + p.visitante, 1, 1e-12, 'suma 1');
var q = M.poisson(1.5, 1.2);
cerca(q.local, 0.44146517, 1e-7, '1X2 local'); cerca(q.empate, 0.25481678, 1e-7, '1X2 empate'); cerca(q.visitante, 0.30371805, 1e-7, '1X2 visit');
cerca(q.totales(2.5).mas, 0.50637550, 1e-7, 'over 2.5'); cerca(q.totales(2.5).menos, 1 - 0.50637550, 1e-7, 'under 2.5');
cerca(q.btts, (1 - Math.exp(-1.5)) * (1 - Math.exp(-1.2)), 1e-6, 'BTTS independiente');
cerca(q.handicap(0), q.local, 1e-12, 'handicap 0 = local (sin empate)'); T.igual(q.top[0].gl + '-' + q.top[0].gv, '1-1', 'marcador mas probable');
var dc = M.poisson(1.5, 1.2, { rho: -0.1 }); cerca(dc.local + dc.empate + dc.visitante, 1, 1e-12, 'DC suma 1'); T.cierto(dc.empate > q.empate, 'rho negativo sube empates');
// fuerzas
var r = M.parsearResultados('Real 2-1 Barça\nBarça 1-1 Real\n# comentario\nSevilla,Real,0,3\n2024-01-02,Real,Sevilla,2,2\nmalo\n');
T.igual(r.partidos.length, 4, 'parseo'); T.igual(r.malas, [6], 'linea mala'); T.igual(r.partidos[0], { local: 'Real', visitante: 'Barça', gl: 2, gv: 1 }, 'primer partido');
var f = M.estimarFuerzas(r.partidos, { suavizado: 0 });
cerca(f.mediaLocal, (2 + 1 + 0 + 2) / 4, 1e-12, 'media local'); cerca(f.mediaVisitante, (1 + 1 + 3 + 2) / 4, 1e-12, 'media visitante');
var real = f.equipos.Real; cerca(real.ataque, ((2 + 3 + 2 + 1) / 4) / ((1.25 + 1.75) / 2), 1e-9, 'ataque Real'); // 4 partidos de Real: gf=2+1(vs Barça local? ver abajo)
T.cierto(f.equipos.Real.ataque > f.equipos.Sevilla.ataque, 'Real ataca mas que Sevilla');
var ge = M.golesEsperados(f, 'Real', 'Sevilla'); T.cierto(ge.lamL > 0 && ge.lamV > 0, 'goles esperados');
// Elo
cerca(M.eloEsperado(1500, 1500, 0), 0.5, 1e-12, 'elo igual'); cerca(M.eloEsperado(1900, 1500, 0), 1 / (1 + Math.pow(10, -400 / 400)), 1e-12, 'elo +400 = 0.909'); cerca(M.eloEsperado(1900, 1500), 0.9090909, 1e-6, 'elo 0.909');
var u = M.eloActualizar(1500, 1500, 1, { K: 20 }); cerca(u[0], 1510, 1e-9, 'elo gana +10'); cerca(u[1], 1490, 1e-9, 'elo pierde -10'); cerca(M.eloActualizar(1500, 1500, 0.5, { K: 20 })[0], 1500, 1e-9, 'elo empate');
var e = M.eloCalcular([{ local: 'A', visitante: 'B', gl: 1, gv: 0 }], { K: 20, ventaja: 0 }); cerca(e.ratings.A, 1510, 1e-9, 'calcular A'); cerca(e.ratings.B, 1490, 1e-9, 'calcular B');
var x = M.elo1x2(1500, 1500, { ventaja: 0 }); cerca(x.empate, 0.26, 1e-12, 'empate base'); cerca(x.local, 0.37, 1e-12, '1x2 elo local'); cerca(x.local + x.empate + x.visitante, 1, 1e-12, 'suma elo');
// logistica
var X = [], y = [];
for (var i = -20; i <= 20; i++) { X.push([i / 5]); y.push(i / 5 + ((i * 7) % 5 - 2) / 10 > 0 ? 1 : 0); }
var m = M.logistica(X, y, { iter: 2000 });
T.cierto(m.predecir([3]) > 0.95 && m.predecir([-3]) < 0.05, 'logistica separa'); cerca(m.predecir([0]), 0.5, 0.2, 'logistica en 0 ~ 0.5'); T.cierto(m.w[0] > 0, 'peso positivo');
var Xs = [[0], [1], [0], [1]], ys = [0, 1, 1, 0]; cerca(M.logistica(Xs, ys, { iter: 2000 }).predecir([0.5]), 0.5, 0.01, 'sin señal => 0.5');
T.fin('modelos');
