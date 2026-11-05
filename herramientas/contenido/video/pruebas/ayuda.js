let ok = 0, mal = 0;
exports.prueba = function (n, f) { try { f(); ok++; } catch (e) { mal++; console.log('FALLA ' + n + ': ' + e.message); } };
exports.cerca = function (a, b, tol, m) { if (!(Math.abs(a - b) <= (tol || 1e-6))) throw new Error((m || '') + ' esperado ' + b + ' obtenido ' + a); };
exports.igual = function (a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' esperado ' + JSON.stringify(b) + ' obtenido ' + JSON.stringify(a)); };
exports.cierto = function (c, m) { if (!c) throw new Error(m || 'no se cumple'); };
exports.fin = function (n) { console.log(n + ': ' + ok + ' ok, ' + mal + ' fallos'); if (mal) process.exitCode = 1; };
