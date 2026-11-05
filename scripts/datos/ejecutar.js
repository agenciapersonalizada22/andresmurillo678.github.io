#!/usr/bin/env node
'use strict';
// Uso: node scripts/datos/ejecutar.js <rapidos|lentos|todos> [--salida DIR] [--config FILE] [--solo id,id] [--offline] [--validar-config]
const path = require('node:path');
const fs = require('node:fs');
const { validarConfig } = require('./lib/config-validar');
const { crearContexto, ejecutarTareas, leerJson } = require('./lib/runner');

function args(argv) {
  const a = { grupo: null, flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x.startsWith('--')) {
      const k = x.slice(2);
      if (['salida', 'config', 'solo'].includes(k)) a.flags[k] = argv[++i];
      else a.flags[k] = true;
    } else if (!a.grupo) a.grupo = x;
  }
  return a;
}

async function principal() {
  const { grupo, flags } = args(process.argv.slice(2));
  const offline = !!flags.offline;
  const rutaCfg = path.resolve(flags.config || (offline ? path.join(__dirname, 'fixtures', 'config.offline.json') : path.join(__dirname, 'config.json')));
  const config = leerJson(rutaCfg);
  if (!config) { console.error(`No se pudo leer o interpretar la configuracion: ${rutaCfg}`); process.exit(2); }
  const errs = validarConfig(config);
  if (errs.length) {
    console.error(`Configuracion invalida (${rutaCfg}):`);
    errs.forEach((e) => { console.error('  - ' + e); console.error(`::error file=scripts/datos/config.json::${e}`); });
    process.exit(2);
  }
  if (flags['validar-config']) { console.log('Configuracion valida: ' + rutaCfg); return; }

  const grupos = grupo === 'rapidos' ? ['rapidos'] : grupo === 'lentos' ? ['lentos'] : grupo === 'todos' ? ['rapidos', 'lentos'] : null;
  if (!grupos) { console.error('Indica el grupo: rapidos | lentos | todos'); process.exit(2); }

  let ahora = new Date(), fetchImpl, esperar, env = process.env;
  if (offline) {
    const fx = require('./fixtures/router');
    ahora = fx.AHORA;
    fetchImpl = fx.crearFetch();
    esperar = async () => {};
    env = fx.ENV_OFFLINE;
  }
  const salida = path.resolve(flags.salida || (offline ? fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'datos-offline-')) : 'datos-salida'));
  fs.mkdirSync(salida, { recursive: true });
  const ctx = crearContexto({ config, env, salida, ahora, fetchImpl, esperar });
  const { resumen } = await ejecutarTareas(ctx, grupos, { solo: flags.solo ? flags.solo.split(',') : null });

  let fallos = 0;
  for (const r of resumen) {
    if (r.ok) console.log(`OK     ${r.id.padEnd(14)} ${r.items} elementos`);
    else { fallos++; console.log(`ERROR  ${r.id.padEnd(14)} ${r.error}`); console.log(`::warning title=Fuente de datos ${r.id}::${r.error.replace(/\n/g, ' ')}`); }
  }
  console.log(`Salida en: ${salida}  (peticiones: ${ctx.http.stats.peticiones}, reintentos: ${ctx.http.stats.reintentos})`);
  if (resumen.length && fallos === resumen.length) console.log('::warning::Todas las fuentes fallaron en esta ejecucion; se conservan los datos anteriores.');
}

principal().catch((e) => { console.error('Fallo inesperado:', e && e.stack || e); process.exit(1); });
