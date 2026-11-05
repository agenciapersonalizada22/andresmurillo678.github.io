/* Carga los modulos del juego (sin DOM) en un contexto vm. */
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function cargar(archivos) {
  const ctx = vm.createContext({ console, Math, Float32Array, Int32Array, Int16Array, Uint8Array, JSON, performance: { now: () => Date.now() } });
  ctx.globalThis = ctx;
  const dir = path.join(__dirname, '..', 'js');
  for (const f of archivos) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return ctx.Serp;
};
