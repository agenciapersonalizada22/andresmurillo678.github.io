/* Genera un workflow de GitHub Actions (+ ejecutor Node) a partir de un flujo. Puro, sin DOM. window.AutoNube / require. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.AutoNube = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var N = {};
  var ENV_IA = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY' };
  N.slug = function (s) { return String(s || 'flujo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'flujo'; };
  N.secretos = function (flujo) {
    var o = {}, re = /\{\{\s*secreto\.([A-Za-z_][A-Za-z0-9_]*)/g, m, t = JSON.stringify(flujo || {});
    while ((m = re.exec(t))) o[m[1]] = 1;
    (flujo.nodos || []).forEach(function (n) { if (n.tipo === 'ia') o[ENV_IA[(n.cfg && n.cfg.proveedor) || 'anthropic'] || 'ANTHROPIC_API_KEY'] = 1; });
    return Object.keys(o).sort();
  };
  function lim(n, min) { n = Math.floor(Number(n)) || min; return Math.max(min, n); }
  /* hora local HH:MM -> UTC con desfase del navegador (getTimezoneOffset). Devuelve {min,hor,corte} corte=-1|0|1 dias */
  N.horaUTC = function (hora, offsetMin) {
    var p = String(hora || '09:00').split(':'), t = (+p[0] || 0) * 60 + (+p[1] || 0) + (offsetMin || 0), corte = 0;
    while (t < 0) { t += 1440; corte--; } while (t >= 1440) { t -= 1440; corte++; }
    return { min: t % 60, hor: Math.floor(t / 60), corte: corte };
  };
  /* -> {crons:[...], notas:[...]} (GitHub Actions usa UTC y minimo 5 min) */
  N.cronNube = function (flujo, o) {
    o = o || {}; var notas = [], crons = [], off = o.offsetMin === undefined ? 0 : o.offsetMin;
    var disp = (flujo.nodos || []).filter(function (n) { return ['temporizador', 'hora_dia', 'cambio_datos', 'nueva_oferta', 'nueva_cuota', 'manual', 'webhook', 'mensaje_dispositivo', 'qr_leido'].indexOf(n.tipo) >= 0; });
    disp.forEach(function (n) {
      var c = n.cfg || {};
      if (n.tipo === 'temporizador') {
        if (c.modo === 'cron') { crons.push(String(c.cron || '0 * * * *').trim()); notas.push('El cron se interpreta en UTC en GitHub Actions.'); }
        else {
          var min = (Number(c.valor) || 5) * ({ s: 1 / 60, min: 1, h: 60 }[c.unidad] || 1);
          if (min < 5) { min = 5; notas.push('GitHub Actions no ejecuta más a menudo que cada 5 minutos (y suele retrasarse).'); }
          min = Math.round(min);
          if (min >= 60) crons.push('0 */' + Math.max(1, Math.round(min / 60)) + ' * * *'); else { crons.push('*/' + min + ' * * * *'); if (60 % min) notas.push('«Cada ' + min + ' min» se aproxima a */' + min + ' dentro de cada hora.'); }
        }
      } else if (n.tipo === 'hora_dia') {
        var u = N.horaUTC(c.hora, off), dias = String(c.dias || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return /^[0-6]$/.test(x); }).map(function (x) { return (+x + u.corte + 7) % 7; });
        crons.push(u.min + ' ' + u.hor + ' * * ' + (dias.length ? dias.filter(function (x, i) { return dias.indexOf(x) === i; }).sort().join(',') : '*'));
        notas.push('La hora se convirtió a UTC con tu desfase actual (' + (-off / 60) + ' h); no cambia con el horario de verano.');
      } else if (n.tipo === 'cambio_datos' || n.tipo === 'nueva_oferta' || n.tipo === 'nueva_cuota') {
        crons.push('*/' + Math.max(5, lim(c.cada, 5)) + ' * * * *'); notas.push('En la nube no hay memoria entre ejecuciones: «' + n.tipo + '» procesa los datos actuales (ofertas recientes) en cada pasada.');
      } else if (n.tipo !== 'manual') notas.push('El disparador «' + n.tipo + '» necesita la página abierta o un puente local; en la nube se usa solo ejecución manual/programada.');
    });
    if (!crons.length) { crons.push('0 * * * *'); notas.push('No hay disparador programable: se ejecutará cada hora y manualmente (workflow_dispatch).'); }
    return { crons: crons.filter(function (c, i) { return crons.indexOf(c) === i; }), notas: notas.filter(function (c, i) { return notas.indexOf(c) === i; }) };
  };
  function q(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
  N.yaml = function (flujo, o) {
    o = o || {}; var s = N.slug(flujo.nombre), c = N.cronNube(flujo, o), sec = N.secretos(flujo), L = [];
    L.push('# Generado por Trabajos > Automatizaciones. Colócalo en .github/workflows/auto-' + s + '.yml y los archivos de la carpeta en .github/automatizaciones/' + s + '/');
    L.push('# Secretos necesarios (Settings > Secrets and variables > Actions): ' + (sec.length ? sec.join(', ') : 'ninguno'));
    c.notas.forEach(function (n) { L.push('# Nota: ' + n); });
    L.push('name: ' + q('Auto: ' + (flujo.nombre || s)), '', 'on:', '  schedule:');
    c.crons.forEach(function (x) { L.push('    - cron: ' + q(x)); });
    L.push('  workflow_dispatch:', '', 'permissions:', '  contents: read', '', 'concurrency:', '  group: auto-' + s, '  cancel-in-progress: false', '', 'jobs:', '  ejecutar:', '    runs-on: ubuntu-latest', '    timeout-minutes: 10', '    steps:',
      '      - uses: actions/checkout@v4', '      - uses: actions/setup-node@v4', '        with:', '          node-version: 20', '      - name: Ejecutar flujo', '        run: node .github/automatizaciones/' + s + '/ejecutar.cjs');
    var env = sec.concat(o.notificar ? ['NOTIFY_WEBHOOK'] : []);
    if (env.length) { L.push('        env:'); env.forEach(function (k) { L.push('          ' + k + ': ${{ secrets.' + k + ' }}'); }); }
    return L.join('\n') + '\n';
  };
  N.flujoLimpio = function (flujo, dominios) {
    var j = JSON.parse(JSON.stringify(flujo)); delete j._t; delete j._creado;
    j._secretos = N.secretos(flujo); j._dominios = dominios || []; return j;
  };
  var EJECUTOR = [
    "const flujo = JSON.parse(fs.readFileSync(path.join(__dirname, 'flujo.json'), 'utf8'));",
    "const secretos = {}; (flujo._secretos || []).forEach(k => { if (process.env[k]) secretos[k] = process.env[k]; });",
    "const BASE = process.env.DATOS_BASE || 'https://raw.githubusercontent.com/agenciapersonalizada22/andresmurillo678.github.io/datos/';",
    "const dominios = flujo._dominios || [];",
    "function permitido(u) { if (!Motor.hostPermitido(u, dominios)) throw new Error('Dominio no permitido en la lista del flujo: ' + u); }",
    "async function pedir(url, opt) { permitido(url); const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000); try { return await fetch(url, Object.assign({ signal: ac.signal }, opt)); } finally { clearTimeout(t); } }",
    "const acciones = {",
    "  async http(c) { const h = c.cabeceras ? JSON.parse(c.cabeceras) : {}; const r = await pedir(c.url, { method: c.metodo || 'GET', headers: h, body: /^(GET|HEAD)$/.test(c.metodo || 'GET') ? undefined : c.cuerpo }); const texto = await r.text(); let cuerpo = texto; try { cuerpo = JSON.parse(texto); } catch (e) {} return { estado: r.status, ok: r.ok, cuerpo, texto, valor: cuerpo }; },",
    "  async notificacion(c) { console.log('NOTIFICACION: ' + c.titulo + ' - ' + c.texto); const w = process.env.NOTIFY_WEBHOOK; if (w) { permitido(w); await fetch(w, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: c.titulo, message: c.texto, text: c.titulo + ': ' + c.texto, content: c.titulo + ': ' + c.texto }) }); } return { enviada: !!w, valor: c.texto }; },",
    "  async almacen(c, ctx) { const v = Motor.evaluar(c.valor, ctx); console.log('ALMACEN ' + c.clave + ' = ' + JSON.stringify(v)); return { clave: c.clave, valor: v }; },",
    "  async js(c, ctx) { const r = vm.runInNewContext('(function(entrada,vars,ultimo){' + c.codigo + '})(entrada,vars,ultimo)', { entrada: ctx.entrada, vars: JSON.parse(JSON.stringify(ctx.vars)), ultimo: ctx.ultimo }, { timeout: Math.min(5000, Number(c.limite) || 1000) }); return r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : { valor: r }; },",
    "  async ia(c) { const k = c.proveedor === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY; if (!k) throw new Error('Falta el secreto de la IA'); let r, j;",
    "    if (c.proveedor === 'openai') { r = await pedir('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: JSON.stringify({ model: c.modelo, max_tokens: Number(c.maxTokens) || 400, messages: [].concat(c.sistema ? [{ role: 'system', content: c.sistema }] : [], [{ role: 'user', content: c.prompt }]) }) }); j = await r.json(); if (!r.ok) throw new Error('IA: ' + (j.error && j.error.message || r.status)); return { texto: j.choices[0].message.content, valor: j.choices[0].message.content }; }",
    "    r = await pedir('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: c.modelo, max_tokens: Number(c.maxTokens) || 400, system: c.sistema || undefined, messages: [{ role: 'user', content: c.prompt }] }) }); j = await r.json(); if (!r.ok) throw new Error('IA: ' + (j.error && j.error.message || r.status)); const t = j.content.map(x => x.text || '').join(''); return { texto: t, valor: t }; }",
    "};",
    "async function entradas(nodo) {",
    "  const c = nodo.cfg || {}, t = nodo.tipo;",
    "  const cargar = async (ruta) => { const r = await fetch(BASE + ruta, { cache: 'no-cache' }); if (!r.ok) throw new Error('Datos ' + ruta + ': HTTP ' + r.status); return r.json(); };",
    "  if (t === 'cambio_datos') { const d = await cargar(c.archivo); const v = c.ruta ? Motor.ruta(d, c.ruta) : d.generado; return [{ valor: v, anterior: null, datos: d }]; }",
    "  if (t === 'nueva_oferta') { const d = await cargar('ofertas/ofertas.json'), desde = Date.now() - Math.max(5, Number(c.cada) || 10) * 60000 * 2; return (d.items || []).filter(o => (!o.fecha || Date.parse(o.fecha) >= desde) && (o.descuentoPct || 0) >= (Number(c.descMin) || 0) && (!c.palabra || (o.titulo || '').toLowerCase().includes(String(c.palabra).toLowerCase())) && (!c.tienda || (o.tienda || '').toLowerCase().includes(String(c.tienda).toLowerCase()))).slice(0, 5); }",
    "  return [{}];",
    "}",
    "(async () => {",
    "  const ini = (flujo.nodos || []).find(n => (Cat.TIPOS[n.tipo] || {}).categoria === 'disparador');",
    "  if (!ini) { console.error('El flujo no tiene disparador.'); process.exit(1); }",
    "  let fallo = 0;",
    "  for (const datos of await entradas(ini)) {",
    "    const r = await Motor.ejecutar(flujo, { catalogo: Cat, inicio: ini.id, disparo: { tipo: 'nube', datos }, acciones, secretos, faltante: 'omitir' });",
    "    r.pasos.forEach(p => console.log('[' + p.n + '] ' + p.titulo + ' - ' + p.estado + (p.error ? ': ' + p.error : '')));",
    "    console.log('Resultado: ' + r.estado + (r.error ? ' - ' + r.error : '')); if (r.estado !== 'ok') fallo = 1;",
    "  }",
    "  process.exit(fallo);",
    "})().catch(e => { console.error(e.message); process.exit(1); });"
  ].join('\n');
  N.ejecutorTexto = function () {
    return "/* Ejecutor de flujos (Node 20, sin dependencias). Generado por Trabajos > Automatizaciones. */\n'use strict';\nconst fs = require('fs'), path = require('path'), vm = require('vm');\nconst Motor = require('./motor.js'), Cat = require('./catalogo.js');\n" + EJECUTOR + '\n';
  };
  N.paquete = function (flujo, o) {
    var s = N.slug(flujo.nombre); o = o || {};
    return [
      { nombre: '.github/workflows/auto-' + s + '.yml', texto: N.yaml(flujo, o) },
      { nombre: '.github/automatizaciones/' + s + '/flujo.json', texto: JSON.stringify(N.flujoLimpio(flujo, o.dominios), null, 2) },
      { nombre: '.github/automatizaciones/' + s + '/ejecutar.cjs', texto: N.ejecutorTexto() },
      { nombre: '.github/automatizaciones/' + s + '/motor.js', texto: o.motorTexto || '' },
      { nombre: '.github/automatizaciones/' + s + '/catalogo.js', texto: o.catalogoTexto || '' }
    ];
  };
  return N;
});
