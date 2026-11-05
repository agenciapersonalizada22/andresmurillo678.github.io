/* Ejecuta todas las pruebas de Node: node pruebas/todas.js */
const { spawnSync } = require('child_process'), path = require('path');
let fallos = 0;
for (const f of ['cuerpo.js', 'ia.js', 'protocolo.js']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) { fallos++; console.error('FALLO', f); }
}
process.exit(fallos ? 1 : 0);
