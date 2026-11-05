var n = 0, fallos = 0;
exports.cerca = function (a, b, tol, msg) { n++; if (!(Math.abs(a - b) <= (tol == null ? 1e-6 : tol))) { fallos++; console.log('FALLO ' + msg + ': ' + a + ' != ' + b); } };
exports.igual = function (a, b, msg) { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fallos++; console.log('FALLO ' + msg + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); } };
exports.cierto = function (c, msg) { n++; if (!c) { fallos++; console.log('FALLO ' + msg); } };
exports.fin = function (nombre) { console.log(nombre + ': ' + (n - fallos) + '/' + n + ' ok'); if (fallos) process.exit(1); };
