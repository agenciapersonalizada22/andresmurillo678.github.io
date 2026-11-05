/* Pruebas de extremo a extremo con Playwright (Chromium).
   Uso: python3 -m http.server 8123 (desde la raiz del repo) y luego  node herramientas/notas/pruebas/e2e.cjs
   Variables: PW (ruta del modulo playwright), CHROME (ejecutable), BASE (URL del servidor), SHOTS (carpeta de capturas). */
'use strict';
const PW = process.env.PW || '/opt/node22/lib/node_modules/playwright';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const URL = BASE + '/herramientas/notas/index.html';
const { chromium } = require(PW);
const path = require('path');
let ok = 0, mal = 0;
function chk(nombre, cond, extra) { if (cond) { ok++; console.log('  ok   ' + nombre); } else { mal++; console.log('  FALLA ' + nombre + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } }
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });

async function nueva(b, op = {}) {
  const ctx = op.ctx || await b.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, op.contexto || {}));
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_FAILED|Failed to load resource/.test(m.text())) p.errs.push('console: ' + m.text()); });
  return p;
}
async function abrir(p, hash) { await p.goto(URL + (hash || '')); await p.waitForSelector('html[data-listo="1"]', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(400); }
const E = (p, f, a) => p.evaluate(f, a);

/* ---------- 1. escritorio: tareas en lenguaje natural, notas, persistencia ---------- */
async function escritorio(b) {
  console.log('\n[1] Escritorio: tareas, notas, recarga sin perdidas');
  const p = await nueva(b); await abrir(p);
  await p.fill('.barra-add input', 'pagar luz mañana 6pm #hogar !alta ~30m'); await p.press('.barra-add input', 'Enter'); await p.waitForTimeout(250);
  const t = await E(p, () => __notas.store.lista('tareas').find((x) => x.titulo === 'Pagar luz'));
  chk('NL en la interfaz crea la tarea con fecha/hora/prioridad/etiqueta/estimacion', t && t.hora === '18:00' && t.prioridad === 3 && t.etiquetas[0] === 'hogar' && t.estimado === 30 && t.recordar === 0, t);
  await p.click('.nav[data-k="notas:todas"]'); await p.waitForTimeout(250);
  await p.keyboard.press('n'); await p.waitForTimeout(300);
  await p.fill('.ed-titulo', 'Plan de proyecto'); await p.press('.ed-titulo', 'Enter');
  await p.keyboard.type('# Objetivo'); await p.keyboard.press('Enter'); await p.keyboard.type('Texto con **negrita** y ==resalte== listo'); await p.keyboard.press('Enter');
  await p.keyboard.type('- uno'); await p.keyboard.press('Enter'); await p.keyboard.type('dos'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.keyboard.type('[] tarea una'); await p.keyboard.press('Enter'); await p.keyboard.type('tarea dos'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.keyboard.type('> una cita'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.keyboard.type('```'); await p.keyboard.press('Enter'); await p.keyboard.type('let x = 1;'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.keyboard.type('Ver [[Bienv'); await p.waitForTimeout(250); chk('popup de enlaces [[ ]] aparece', await p.$('.pop') !== null); await p.keyboard.press('Enter'); await p.keyboard.type('fin');
  await p.waitForTimeout(700);
  const md = await E(p, () => __notas.store.lista('notas').find((n) => n.titulo === 'Plan de proyecto').cuerpo);
  chk('atajos Markdown y serializacion a .md', md === '# Objetivo\n\nTexto con **negrita** y ==resalte== listo\n\n- uno\n- dos\n\n- [ ] tarea una\n- [ ] tarea dos\n\n> una cita\n\n```\nlet x = 1;\n```\n\nVer [[Bienvenida]] fin', md);
  await shot(p, 'e2e-nota');
  // backlinks: la nota Bienvenida muestra enlace entrante
  await p.click('.fila-n:has-text("Bienvenida")'); await p.waitForTimeout(400);
  chk('backlinks en la nota enlazada', (await p.textContent('.backlinks')).includes('Plan de proyecto'));
  // tecleo e inmediata recarga: el guardado al ocultar no pierde nada
  await p.click('.fila-n:has-text("Plan de proyecto")'); await p.waitForTimeout(300); await p.click('.ed-vis'); await p.keyboard.press('Control+End'); await p.keyboard.type(' ULTIMO');
  await p.reload(); await p.waitForSelector('html[data-listo="1"]', { state: 'attached' }); await p.waitForTimeout(500);
  const t2 = await E(p, () => ({ n: __notas.store.lista('notas').find((n) => n.titulo === 'Plan de proyecto'), tareas: __notas.store.lista('tareas').length }));
  chk('recarga inmediata conserva lo ultimo escrito', t2.n && /ULTIMO/.test(t2.n.cuerpo), t2.n && t2.n.cuerpo.slice(-30));
  chk('recarga conserva tareas', t2.tareas >= 2);
  chk('IndexedDB contiene los datos', await E(p, () => new Promise((ok) => { const q = indexedDB.open('notas_db'); q.onsuccess = () => { const r = q.result.transaction('datos').objectStore('datos').count(); r.onsuccess = () => ok(r.result > 3); }; })));
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 2. 500 notas + 300 tareas, busqueda instantanea ---------- */
async function rendimiento(b) {
  console.log('\n[2] Datos de ejemplo (500 notas, 300 tareas) y busqueda');
  const p = await nueva(b); await abrir(p);
  await E(p, () => { Ejemplos.cargar(__notas.store); return __notas.store.vaciar(); }); await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('html[data-listo="1"]', { state: 'attached' }); await p.waitForTimeout(600);
  const n = await E(p, () => [__notas.store.lista('notas').length, __notas.store.lista('tareas').length]);
  chk('tras recargar hay 500+ notas y 300+ tareas', n[0] >= 500 && n[1] >= 300, n);
  const ms = await E(p, () => { const q = ['proyecto', 'tag:trabajo prioridad:alta', 'antes:mañana es:vencida', '"semanal" -borrador', 'en:notas receta']; const t = []; q.forEach((x) => { VistaBuscar.buscar(x); const a = performance.now(); for (let i = 0; i < 5; i++) VistaBuscar.buscar(x); t.push((performance.now() - a) / 5); }); return t; });
  chk('busqueda < 50 ms (media por consulta: ' + ms.map((x) => x.toFixed(1)).join(', ') + ' ms)', Math.max(...ms) < 50, ms);
  await p.keyboard.press('/'); await p.waitForTimeout(300); await p.keyboard.type('proyecto', { delay: 20 }); await p.waitForTimeout(300);
  const info = await p.textContent('.barra-v .ayuda'); const m = /([\d.]+) ms/.exec(info);
  chk('la vista Buscar muestra resultados y tiempo (' + info + ')', m && +m[1] < 50 && (await p.$$('.lista-n li')).length > 0);
  await shot(p, 'e2e-buscar');
  const tl = await E(p, async () => { const a = performance.now(); App.ir('notas', 'todas'); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - a; });
  chk('lista de 500 notas se pinta rapido (' + tl.toFixed(0) + ' ms)', tl < 1500, tl);
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 3. vistas con datos: tablero, calendario, gantt, habitos, enfoque, estadisticas ---------- */
async function vistas(b) {
  console.log('\n[3] Tablero, calendario, linea de tiempo, habitos, enfoque');
  const p = await nueva(b); await abrir(p);
  await E(p, () => Ejemplos.cargar(__notas.store)); await p.waitForTimeout(400);
  await p.click('.nav[data-k="tablero:"]'); await p.waitForTimeout(400);
  const card = await p.$('.col-k:nth-child(1) .card-k'), id = await card.getAttribute('data-id'), cb = await card.boundingBox(), db = await (await p.$('.col-k:nth-child(2) .cards')).boundingBox();
  await p.mouse.move(cb.x + 80, cb.y + 20); await p.mouse.down(); await p.mouse.move(cb.x + 120, cb.y + 30, { steps: 4 }); await p.mouse.move(db.x + 100, db.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  chk('arrastrar tarjeta entre columnas', (await E(p, (i) => __notas.store.get('tareas', i).columna, id)) === 'c2');
  await p.click('.col-k:nth-child(1) header button[aria-label^="Opciones"]'); await p.click('.menu-i:has-text("Renombrar")'); await p.fill('.dlg input', 'Pendiente'); await p.click('.dlg-pie .prim'); await p.waitForTimeout(300);
  chk('columnas personalizables (renombrar)', (await p.textContent('.col-k:nth-child(1) header .t')) === 'Pendiente');
  await shot(p, 'e2e-tablero');
  await p.click('.nav[data-k="calendario:"]'); await p.waitForTimeout(400);
  const ev = await p.$('.dia-c:not(.otro) .ev:not(.virtual):not(.hecha)'), tid = await ev.getAttribute('data-id'), f0 = await E(p, (i) => __notas.store.get('tareas', i).fecha, tid), eb = await ev.boundingBox();
  let tgt = null; for (const c of await p.$$('.dia-c[data-fecha]')) { if ((await c.getAttribute('data-fecha')) > f0) { tgt = c; break; } }
  const tb = await tgt.boundingBox(); await p.mouse.move(eb.x + 20, eb.y + 8); await p.mouse.down(); await p.mouse.move(eb.x + 30, eb.y + 14, { steps: 3 }); await p.mouse.move(tb.x + 30, tb.y + 30, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  chk('arrastrar en el calendario reprograma', (await E(p, (i) => __notas.store.get('tareas', i).fecha, tid)) === await tgt.getAttribute('data-fecha'));
  await shot(p, 'e2e-calendario');
  await p.click('.seg .btn:has-text("Semana")'); await p.waitForTimeout(250); chk('vista semana', await p.$('.semana') !== null);
  await p.click('.seg .btn:has-text("Día")'); await p.waitForTimeout(250); chk('vista dia con horas', (await p.$$('.hora-f')).length === 25);
  await p.click('.nav[data-k="linea:"]'); await p.waitForTimeout(300); chk('linea de tiempo con barras', (await p.$$('.g-barra')).length > 10); await shot(p, 'e2e-linea');
  const barra = await p.$('.g-barra'), bid = await barra.getAttribute('data-id'), bb = await barra.boundingBox(), antes = await E(p, (i) => __notas.store.get('tareas', i).fecha, bid);
  await p.mouse.move(bb.x + 8, bb.y + 10); await p.mouse.down(); await p.mouse.move(bb.x + 8 + 28 * 2, bb.y + 10, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
  chk('arrastrar barra del Gantt mueve fechas', (await E(p, (i) => __notas.store.get('tareas', i).fecha, bid)) !== antes);
  await p.click('.nav[data-k="habitos:"]'); await p.waitForTimeout(300); await p.click('text=Crear hábito'); await p.fill('[aria-label="Nombre del hábito"]', 'Beber agua'); await p.click('.dlg-pie .prim'); await p.waitForTimeout(300);
  await p.click('.hab-dia:last-child button'); await p.waitForTimeout(250); chk('habito marcado crea racha 1', /1 día/.test(await p.textContent('.racha'))); await shot(p, 'e2e-habitos');
  await p.click('.nav[data-k="enfoque:"]'); await p.waitForTimeout(300); await p.click('text=Empezar'); await p.waitForTimeout(1200);
  chk('pomodoro en curso persistido', !!(await E(p, () => localStorage.getItem('notas_enfoque'))));
  await p.reload(); await p.waitForSelector('html[data-listo="1"]', { state: 'attached' }); await p.waitForTimeout(500);
  chk('el pomodoro sobrevive a la recarga', /\d\d:\d\d/.test(await p.textContent('#tiempo')) && (await E(p, () => JSON.parse(localStorage.getItem('notas_enfoque')).fase)) === 'trabajo');
  await E(p, () => { const s = JSON.parse(localStorage.getItem('notas_enfoque')); s.fin = Date.now() - 10; localStorage.setItem('notas_enfoque', JSON.stringify(s)); VistaEnfoque.vigilar(); }); await p.waitForTimeout(400);
  chk('al terminar el pomodoro se registra la sesion', (await E(p, () => __notas.store.lista('sesiones').filter((s) => s.tipo === 'pomodoro').length)) === 1);
  await shot(p, 'e2e-enfoque');
  await p.click('.nav[data-k="stats:"]'); await p.waitForTimeout(400); chk('estadisticas con graficas SVG', (await p.$$('.graf svg')).length >= 4); await shot(p, 'e2e-stats');
  await p.keyboard.press('Control+k'); await p.keyboard.type('llamar a Ana viernes 5pm'); await p.waitForTimeout(250);
  const pl = await p.textContent('.pal-lista').catch((e) => 'sin paleta'); chk('paleta ofrece crear la tarea interpretada', /Crear tarea: «Llamar a Ana»/.test(pl), pl.slice(0, 120));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  chk('la paleta crea la tarea', !!(await E(p, () => __notas.store.lista('tareas').find((t) => t.titulo === 'Llamar a Ana' && t.hora === '17:00'))));
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 4. movil 390x780 tactil ---------- */
async function movil(b) {
  console.log('\n[4] Movil 390x780 tactil');
  const p = await nueva(b, { contexto: { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } }); await abrir(p);
  chk('sin desbordamiento horizontal', !(await E(p, () => document.documentElement.scrollWidth > innerWidth)));
  chk('pestanas inferiores y boton flotante visibles', await p.isVisible('#pestanas') && await p.isVisible('#fab'));
  await p.tap('#fab'); await p.waitForTimeout(300); await p.fill('.dlg textarea', 'sacar la basura hoy'); await p.tap('.dlg-pie .prim'); await p.waitForTimeout(400);
  const cdp = await p.context().newCDPSession(p);
  async function swipe(x1, y1, x2, y2) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y: y1 + (y2 - y1) * i / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  let bb = await (await p.$('.fila-t:has-text("Sacar la basura")')).boundingBox(); await swipe(bb.x + 60, bb.y + 20, bb.x + 300, bb.y + 22); await p.waitForTimeout(400);
  chk('deslizar a la derecha completa la tarea', (await E(p, () => __notas.store.lista('tareas').find((t) => t.titulo === 'Sacar la basura').estado)) === 'hecha');
  await p.tap('#fab'); await p.fill('.dlg textarea', 'regar plantas hoy'); await p.tap('.dlg-pie .prim'); await p.waitForTimeout(400);
  bb = await (await p.$('.fila-t:has-text("Regar plantas")')).boundingBox(); await swipe(bb.x + 320, bb.y + 20, bb.x + 40, bb.y + 22); await p.waitForTimeout(400);
  chk('deslizar a la izquierda aplaza a manana', (await E(p, () => __notas.store.lista('tareas').find((t) => t.titulo === 'Regar plantas').fecha)) !== await E(p, () => Fechas.hoy()));
  await shot(p, 'e2e-movil-hoy');
  await p.tap('#pestanas button:nth-child(2)'); await p.waitForTimeout(300); await p.tap('.cab .btn.prim'); await p.waitForTimeout(500);
  await p.fill('.ed-titulo', 'Nota móvil'); await p.tap('.ed-vis'); await p.keyboard.type('Hola desde el móvil'); await p.waitForTimeout(600);
  chk('editar nota en movil', (await E(p, () => __notas.store.lista('notas').find((n) => n.titulo === 'Nota móvil').cuerpo)) === 'Hola desde el móvil');
  chk('boton flotante oculto al editar en movil', !(await p.isVisible('#fab'))); await shot(p, 'e2e-movil-editor');
  await p.tap('.p-detalle .cab .solo-m'); await p.waitForTimeout(300);
  await p.tap('#pestanas button:nth-child(5)'); await p.waitForTimeout(350); chk('menu lateral desde la pestana Menu', await p.isVisible('#lateral .nav')); await shot(p, 'e2e-movil-menu');
  await p.tap('.nav[data-k="calendario:"]'); await p.waitForTimeout(400); chk('calendario en movil sin desbordar', !(await E(p, () => document.documentElement.scrollWidth > innerWidth))); await shot(p, 'e2e-movil-cal');
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 5. mando Xbox simulado ---------- */
async function mando(b) {
  console.log('\n[5] Mando Xbox simulado');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  });
  const p = await nueva(b, { ctx }); await abrir(p);
  const BT = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, MENU: 9, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };
  const pulsar = async (n) => { await E(p, (i) => { __pad.buttons[i].pressed = true; __pad.buttons[i].value = 1; }, BT[n]); await p.waitForTimeout(120); await E(p, (i) => { __pad.buttons[i].pressed = false; __pad.buttons[i].value = 0; }, BT[n]); await p.waitForTimeout(150); };
  const foco = () => E(p, () => { const e = document.activeElement; return e ? (e.getAttribute('aria-label') || e.getAttribute('data-k') || e.textContent.trim().slice(0, 30)) : null; });
  await pulsar('ABAJO'); chk('la cruceta mueve el foco y activa la navegacion por mando', (await foco()) && await E(p, () => document.body.classList.contains('navMando')));
  const f1 = await foco(); await pulsar('ABAJO'); chk('segundo paso cambia el foco', (await foco()) !== f1);
  await E(p, () => { __pad.axes[1] = 0.9; }); await p.waitForTimeout(800); await E(p, () => { __pad.axes[1] = 0; }); chk('el stick mueve el foco con repeticion', (await foco()) !== f1);
  for (let i = 0; i < 12 && !/Probar/.test((await foco()) || ''); i++) await pulsar('DER');
  await pulsar('DER'); await pulsar('A'); await p.waitForTimeout(300); chk('A abre el elemento enfocado', await E(p, () => !!__notas.App.sel));
  await pulsar('B'); await p.waitForTimeout(250); chk('B vuelve atras', await E(p, () => !__notas.App.sel));
  await pulsar('X'); await p.waitForTimeout(300); chk('X abre la captura de tarea', await p.isVisible('.dlg textarea')); await pulsar('B'); await p.waitForTimeout(250); chk('B cierra el dialogo', await E(p, () => !document.querySelector('.dlg')));
  await pulsar('RB'); await p.waitForTimeout(250); const v1 = await E(p, () => __notas.App.vista + ':' + __notas.App.filtro); await pulsar('RB'); await p.waitForTimeout(250); chk('RB cambia de vista (' + v1 + ')', v1 !== 'tareas:hoy' && (await E(p, () => __notas.App.vista + ':' + __notas.App.filtro)) !== v1);
  await pulsar('LB'); await p.waitForTimeout(250); chk('LB retrocede', (await E(p, () => __notas.App.vista + ':' + __notas.App.filtro)) === v1);
  const nn = await E(p, () => __notas.store.lista('notas').length); await pulsar('Y'); await p.waitForTimeout(400); chk('Y crea una nota nueva', (await E(p, () => __notas.store.lista('notas').length)) === nn + 1);
  await pulsar('MENU'); await p.waitForTimeout(300); chk('MENU abre la paleta', await p.isVisible('.pal-in')); await pulsar('ABAJO'); chk('la cruceta navega la paleta', /Ir a/.test((await foco()) || '')); await pulsar('B'); await p.waitForTimeout(250); chk('B cierra la paleta', !(await p.isVisible('.pal-in').catch(() => false)));
  await shot(p, 'e2e-mando');
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 6. nota bloqueada con contraseña ---------- */
async function bloqueo(b) {
  console.log('\n[6] Bloqueo de notas (AES-GCM / PBKDF2)');
  const p = await nueva(b); await abrir(p, '#notas:todas');
  await p.keyboard.press('n'); await p.waitForTimeout(300); await p.fill('.ed-titulo', 'Secreto'); await p.press('.ed-titulo', 'Enter'); await p.keyboard.type('El tesoro está bajo el roble'); await p.waitForTimeout(600);
  await p.click('.p-detalle button[aria-label^="Más acciones"]'); await p.click('.menu-i:has-text("Bloquear con contraseña")'); await p.click('.dlg-pie .prim'); await p.waitForTimeout(300);
  const ins = await p.$$('.dlg input[type=password]'); await ins[0].fill('clave-segura'); await ins[1].fill('clave-segura'); await p.click('.dlg-pie .prim'); await p.waitForTimeout(1500);
  const n = await E(p, () => __notas.store.lista('notas').find((x) => x.titulo === 'Secreto'));
  chk('la nota queda cifrada: sin texto plano y con datos AES-GCM', n.cif && n.cif.d && n.cuerpo === '' && !JSON.stringify(n).includes('tesoro'), n && n.cuerpo);
  await p.reload(); await p.waitForSelector('html[data-listo="1"]', { state: 'attached' }); await p.waitForTimeout(500);
  await p.click('.fila-n:has-text("Secreto")'); await p.waitForTimeout(400);
  chk('al abrir pide la contraseña', await p.isVisible('.bloqueada input[type=password]'));
  await p.fill('.bloqueada input', 'mala'); await p.press('.bloqueada input', 'Enter'); await p.waitForTimeout(1200); chk('contraseña incorrecta falla', /incorrecta/.test(await p.textContent('.bloqueada .err')));
  await p.fill('.bloqueada input', 'clave-segura'); await p.press('.bloqueada input', 'Enter'); await p.waitForTimeout(1500);
  chk('contraseña correcta descifra', /tesoro/.test(await p.textContent('.ed-vis')));
  await p.click('.ed-vis'); await p.keyboard.press('Control+End'); await p.keyboard.type(' y mas'); await p.waitForTimeout(900);
  const n2 = await E(p, () => __notas.store.lista('notas').find((x) => x.titulo === 'Secreto'));
  chk('editar una nota bloqueada la vuelve a cifrar (sin texto plano)', n2.cuerpo === '' && !JSON.stringify(n2).includes('mas') && n2.cif.d !== n.cif.d);
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

/* ---------- 7. colaboracion P2P: dos contextos comparten una lista ---------- */
async function colab(b) {
  console.log('\n[7] Dos pestañas comparten una lista por enlace P2P');
  const A = await nueva(b); await abrir(A);
  await E(A, () => { const S = __notas.store; S.poner('listas', Modelo.lista({ id: 'compartida', nombre: 'Compra común', orden: 5 })); Tareas.crear({ id: 't_a1', titulo: 'Leche', lista: 'compartida' }); Tareas.crear({ id: 't_a2', titulo: 'Pan', lista: 'compartida' }); });
  await A.click('.nav[data-k="tareas:lista:compartida"]'); await A.waitForTimeout(300);
  await A.click('.p-lista button[aria-label="Opciones de la lista"]'); await A.click('.menu-i:has-text("Compartir en tiempo real")'); await A.click('.dlg-pie .prim'); await A.waitForTimeout(500);
  await A.click('.lb-btn:has-text("Crear sala")'); await A.waitForFunction(() => document.querySelector('.lb-campo[aria-label="Enlace de invitacion"]') && document.querySelector('.lb-campo[aria-label="Enlace de invitacion"]').value.includes('sala='), null, { timeout: 20000 });
  const enlace = await A.inputValue('.lb-campo[aria-label="Enlace de invitacion"]');
  const B = await nueva(b); await B.goto(enlace); await B.waitForSelector('html[data-listo="1"]', { state: 'attached' });
  await B.waitForFunction(() => { const t = document.querySelector('.lb-campo[aria-label="Tu codigo de respuesta"]'); return t && t.value.length > 20; }, null, { timeout: 30000 });
  const resp = await B.inputValue('.lb-campo[aria-label="Tu codigo de respuesta"]');
  await A.fill('textarea[placeholder^="Codigo de respuesta"]', resp); await A.click('.lb-btn:has-text("Conectar")');
  await A.waitForFunction(() => Red.cuantos() === 2, null, { timeout: 30000 }); chk('dos jugadores conectados por WebRTC', true);
  await A.click('.lb-btn:has-text("Iniciar")'); await B.waitForFunction(() => __notas.store.get('listas', 'compartida') && __notas.store.lista('tareas').length >= 2, null, { timeout: 20000 });
  chk('el invitado recibe la lista y sus tareas', (await E(B, () => __notas.store.lista('tareas').filter((t) => t.lista === 'compartida').map((t) => t.titulo).sort().join())) === 'Leche,Pan');
  await E(B, () => Tareas.editar('t_a1', { titulo: 'Leche entera', prioridad: 2 })); await A.waitForFunction(() => __notas.store.get('tareas', 't_a1').titulo === 'Leche entera', null, { timeout: 10000 });
  chk('un cambio del invitado llega al anfitrion (por campo)', (await E(A, () => __notas.store.get('tareas', 't_a1').prioridad)) === 2);
  await E(A, () => { Tareas.editar('t_a1', { prioridad: 4 }); Tareas.crear({ id: 't_a3', titulo: 'Huevos', lista: 'compartida' }); });
  await B.waitForFunction(() => __notas.store.get('tareas', 't_a3'), null, { timeout: 10000 });
  chk('tarea nueva del anfitrion llega al invitado', true); chk('prioridad concurrente converge (ultimo gana)', (await E(B, () => __notas.store.get('tareas', 't_a1').prioridad)) === 4);
  await E(A, () => Tareas.completar('t_a2')); await B.waitForFunction(() => __notas.store.get('tareas', 't_a2').estado === 'hecha', null, { timeout: 10000 }); chk('completar se sincroniza', true);
  // conflicto: ambos editan el mismo campo "a la vez"; ambos terminan con el mismo valor
  await Promise.all([E(A, () => Tareas.editar('t_a3', { titulo: 'Huevos A' })), E(B, () => Tareas.editar('t_a3', { titulo: 'Huevos B' }))]); await A.waitForTimeout(1500);
  const va = await E(A, () => __notas.store.get('tareas', 't_a3').titulo), vb = await E(B, () => __notas.store.get('tareas', 't_a3').titulo);
  chk('edicion simultanea del mismo campo converge (' + va + ' = ' + vb + ')', va === vb);
  await shot(A, 'e2e-colab-A'); await shot(B, 'e2e-colab-B');
  chk('sin errores de consola (A)', A.errs.length === 0, A.errs); chk('sin errores de consola (B)', B.errs.length === 0, B.errs);
  await A.context().close(); await B.context().close();
}


/* ---------- 8. datos: exportar/importar, copias, plantillas, papelera, historial, ajustes ---------- */
async function datos(b) {
  console.log('\n[8] Datos, plantillas, papelera, historial y ajustes');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true }); const p = await nueva(b, { ctx }); await abrir(p);
  const fs = require('fs'), os = require('os');
  await E(p, () => { Ejemplos.cargar(__notas.store); __notas.store.poner('adjuntos', { id: 'adj1', nombre: 'x.png', tipo: 'image/png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', bytes: 70, creada: 1 }); });
  await p.click('.nav[data-k="ajustes:"]'); await p.waitForTimeout(250);
  for (const t of ['Apariencia', 'Tareas y avisos', 'Teclado y mando', 'Acerca de', 'Datos']) { await p.click('.tabs .btn:has-text("' + t + '")'); await p.waitForTimeout(120); }
  const bajar = async (texto) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click('.ajuste button:has-text("' + texto + '")')]); const f = path.join(os.tmpdir(), 'notas-' + Date.now() + '-' + d.suggestedFilename()); await d.saveAs(f); return f; };
  const fJson = await bajar('JSON'); const j = JSON.parse(fs.readFileSync(fJson, 'utf8'));
  chk('exportar JSON incluye notas, tareas y adjuntos', j.app === 'notas' && j.cols.notas.length >= 500 && j.cols.tareas.length >= 300 && j.cols.adjuntos.length === 1 && j.esquema === 3);
  const fZip = await bajar('ZIP .md'); const z = fs.readFileSync(fZip); chk('exportar ZIP Markdown valido', z.readUInt32LE(0) === 0x04034b50 && z.length > 10000);
  const fIcs = await bajar('Eventos'); const ics = fs.readFileSync(fIcs, 'utf8'); chk('exportar .ics con eventos y repeticion', ics.startsWith('BEGIN:VCALENDAR') && /RRULE:FREQ=WEEKLY/.test(ics) && /VEVENT/.test(ics));
  await E(p, () => { __notas.store.borrarTodo(); }); await p.waitForTimeout(300);
  chk('tras borrar no quedan notas', (await E(p, () => __notas.store.lista('notas').length)) === 0);
  p.once('filechooser', (fc) => fc.setFiles(fJson)); await p.click('.ajuste button:has-text("Archivo")'); await p.waitForTimeout(400);
  await p.click('.dlg-pie .btn:has-text("Fusionar")'); await p.waitForTimeout(1500);
  const n1 = await E(p, () => [__notas.store.lista('notas').length, __notas.store.lista('tareas').length, __notas.store.lista('adjuntos').length]);
  chk('importar JSON (fusionar) restaura lo borrado', n1[0] >= 500 && n1[1] >= 300, n1);
  await E(p, () => { __notas.store.borrarTodo(); });
  p.once('filechooser', (fc) => fc.setFiles(fJson)); await p.click('.ajuste button:has-text("Archivo")'); await p.waitForTimeout(400);
  await p.click('.dlg-pie .btn:has-text("Reemplazar")'); await p.waitForTimeout(1800);
  const n2 = await E(p, () => [__notas.store.lista('notas').length, __notas.store.lista('tareas').length, __notas.store.lista('adjuntos').length]);
  chk('importar JSON en modo reemplazar restaura todo', n2[0] >= 500 && n2[1] >= 300 && n2[2] === 1, n2);
  await E(p, () => { __notas.store.borrarTodo(); }); p.once('filechooser', (fc) => fc.setFiles(fIcs)); await p.click('.ajuste button:has-text("Archivo")'); await p.waitForTimeout(800);
  chk('importar .ics crea tareas', (await E(p, () => __notas.store.lista('tareas').length)) > 100);
  await E(p, () => { __notas.store.borrarTodo(); }); p.once('filechooser', (fc) => fc.setFiles(fZip)); await p.click('.ajuste button:has-text("ZIP…")'); await p.waitForTimeout(1500);
  const n3 = await E(p, () => [__notas.store.lista('notas').length, __notas.store.lista('tareas').length, __notas.store.lista('libretas').length]);
  chk('importar ZIP de Markdown crea notas, tareas y libretas', n3[0] >= 400 && n3[1] >= 200 && n3[2] >= 6, n3);
  const cop = await E(p, () => __notas.store.guardarCopiaAhora('prueba').then(() => __notas.store.copias()));
  chk('copia de seguridad local guardada', cop.length >= 1);
  await E(p, () => { __notas.store.borrarTodo(); }); await p.click('.nav[data-k="notas:todas"]'); await p.waitForTimeout(300);
  await p.click('.cab button[aria-label="Nueva nota desde plantilla"]'); await p.click('.menu-i:has-text("Reunión")'); await p.waitForTimeout(500);
  chk('plantilla Reunion crea la nota con titulo y etiqueta', await E(p, () => __notas.store.lista('notas').some((n) => /^Reunión \d{4}-/.test(n.titulo) && n.etiquetas.includes('reuniones') && /Acuerdos/.test(n.cuerpo))));
  await p.click('.ed-vis'); await p.keyboard.press('Control+End'); await p.keyboard.type(' primera version'); await p.waitForTimeout(500);
  await E(p, () => { const n = __notas.store.lista('notas')[0]; __notas.store.poner('versiones', { id: 'v0', nota: n.id, ts: Date.now() - 600000, titulo: n.titulo, cuerpo: 'VERSION ANTIGUA' }); });
  await p.click('.ed-pie button:has-text("Historial")'); await p.waitForTimeout(300); await p.click('.dlg .menu-i >> nth=-1'); await p.click('.dlg button:has-text("Restaurar esta versión")'); await p.waitForTimeout(500);
  chk('historial: restaurar version anterior', (await E(p, () => __notas.store.lista('notas')[0].cuerpo)) === 'VERSION ANTIGUA');
  await p.click('.p-detalle button[aria-label^="Más acciones"]'); await p.click('.menu-i:has-text("A la papelera")'); await p.waitForTimeout(300);
  chk('nota a la papelera', (await E(p, () => __notas.store.lista('notas')[0].papelera)) > 0);
  await p.click('.nav[data-k="notas:papelera"]'); await p.waitForTimeout(300); await p.click('.fila-n >> nth=0'); await p.click('.menu-i:has-text("Restaurar")'); await p.waitForTimeout(300);
  chk('restaurar desde la papelera', (await E(p, () => __notas.store.lista('notas')[0].papelera)) === 0);
  await E(p, () => { const n = __notas.store.lista('notas')[0]; __notas.store.set('notas', n.id, { papelera: Date.now() - 31 * 86400000 }); VistaNotas.purgarPapelera(); });
  chk('la papelera elimina a los 30 dias', (await E(p, () => __notas.store.lista('notas').length)) === 0);
  await E(p, () => { Ejemplos.cargar(__notas.store); }); await p.waitForTimeout(300);
  chk('arbol de etiquetas jerarquicas en el lateral', (await p.$$('#lateral [data-k^="tag:trabajo/"]')).length >= 2);
  await p.click('#lateral [data-k="tag:trabajo/proyectos"]'); await p.waitForTimeout(300); chk('clic en etiqueta abre busqueda tag:', (await p.inputValue('.barra-v input')) === 'tag:trabajo/proyectos' && (await p.$$('.lista-n li, .lista-t li')).length > 3);
  await p.fill('.barra-v input', 'prioridad:alta tag:trabajo'); await p.waitForTimeout(200); await p.click('.barra-v button:has-text("Guardar filtro")'); await p.fill('.dlg input', 'Altas de trabajo'); await p.click('.dlg-pie .prim'); await p.waitForTimeout(300);
  chk('filtro guardado aparece en el lateral', await p.isVisible('#lateral :text("Altas de trabajo")'));
  await p.click('.nav[data-k="ajustes:"]'); await p.click('.tabs .btn:has-text("Apariencia")'); await p.selectOption('.ajuste select[aria-label="Tema"]', 'oscuro'); await p.check('.ajuste input[aria-label="Texto grande"]'); await p.waitForTimeout(250);
  chk('tema oscuro y texto grande se aplican', await E(p, () => document.documentElement.dataset.tema === 'oscuro' && parseFloat(document.documentElement.style.fontSize) > 18));
  chk('ajustes de dispositivo en su propia clave', await E(p, () => JSON.parse(localStorage.getItem('notas_ajustes_dispositivo')).tema === 'oscuro' && !('tema' in JSON.parse(localStorage.getItem('notas_ajustes') || '{}'))));
  await shot(p, 'e2e-oscuro');
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}


/* ---------- 9. recordatorios, repeticion al completar, avisos ---------- */
async function recordatorios(b) {
  console.log('\n[9] Recordatorios, notificaciones y tareas repetidas');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['notifications'] });
  await ctx.addInitScript(() => { window.__notifs = []; const N = function (t, o) { window.__notifs.push([t, o && o.body]); this.close = () => {}; }; N.permission = 'granted'; N.requestPermission = () => Promise.resolve('granted'); window.Notification = N; });
  const p = await nueva(b, { ctx }); await abrir(p);
  const ahora = await E(p, () => { const d = new Date(Date.now() - 60000); return [Fechas.hoy(), Fechas.p2(d.getHours()) + ':' + Fechas.p2(d.getMinutes())]; });
  await E(p, (a) => { Tareas.crear({ id: 'rec1', titulo: 'Tomar pastilla', fecha: a[0], hora: a[1], recordar: 0 }); Recordatorios.comprobar(); }, ahora); await p.waitForTimeout(400);
  chk('aviso dentro de la app al llegar la hora', /Tomar pastilla/.test(await p.textContent('#avisos')));
  const nNot = () => E(p, async () => { const r = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration()); return window.__notifs.length + (r ? (await r.getNotifications()).length : 0); });
  chk('Notification API invocada con permiso', (await nNot()) === 1);
  await E(p, () => Recordatorios.comprobar()); chk('no repite el mismo aviso', (await nNot()) === 1);
  // aviso perdido: tarea vencida hace 3 horas con el app cerrada
  await E(p, () => { const d = new Date(Date.now() - 3 * 3600000); Tareas.crear({ id: 'rec2', titulo: 'Reunion perdida', fecha: Fechas.fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()), hora: Fechas.p2(d.getHours()) + ':' + Fechas.p2(d.getMinutes()), recordar: 10 }); return __notas.store.vaciar(); });
  await p.reload(); await p.waitForSelector('html[data-listo="1"]', { state: 'attached' }); await p.waitForTimeout(700);
  chk('al abrir se avisa de recordatorios perdidos', /vencieron mientras la app estaba cerrada/.test(await p.textContent('#avisos')));
  // aplazar desde el aviso
  await E(p, () => { Tareas.crear({ id: 'rec3', titulo: 'Llamar', fecha: Fechas.hoy(), hora: Fechas.p2(new Date(Date.now() - 30000).getHours()) + ':' + Fechas.p2(new Date(Date.now() - 30000).getMinutes()), recordar: 0 }); Recordatorios.comprobar(); }); await p.waitForTimeout(300);
  await p.click('.aviso.recordatorio:has-text("Llamar") button:has-text("+10 min")'); await p.waitForTimeout(300);
  chk('+10 min aplaza la tarea', await E(p, () => { const t = __notas.store.get('tareas', 'rec3'); return F2(t); function F2(x) { return Fechas.aInstante(x.fecha, x.hora) > Date.now() + 8 * 60000; } }));
  // tarea repetida: completar genera la siguiente fecha
  await p.fill('.barra-add input', 'regar plantas cada lunes'); await p.press('.barra-add input', 'Enter'); await p.waitForTimeout(300);
  const antes = await E(p, () => __notas.store.lista('tareas').find((t) => t.titulo === 'Regar plantas'));
  chk('NL crea una tarea con repeticion semanal', antes && antes.rep && antes.rep.tipo === 'semana' && antes.rep.dias[0] === 1, antes);
  await p.click('.nav[data-k="tareas:proximos"]'); await p.waitForTimeout(250); await p.click('.fila-t:has-text("Regar plantas") .chk'); await p.waitForTimeout(300);
  const t2 = await E(p, () => { const t = __notas.store.lista('tareas').find((x) => x.titulo === 'Regar plantas'); return Object.assign({}, t, { dow: Fechas.diaSemana(t.fecha) }); });
  chk('completar una tarea repetida avanza a la siguiente fecha y sigue pendiente', t2.estado === 'pendiente' && t2.fecha > antes.fecha && t2.dow === 1, [antes.fecha, t2.fecha]);
  chk('la repeticion deja registro en el historial de completadas', (await E(p, () => __notas.store.lista('hechos').filter((h) => h.titulo === 'Regar plantas').length)) === 1);
  await p.click('#avisos .aviso:has-text("Próxima") button:has-text("Deshacer")'); await p.waitForTimeout(250);
  chk('deshacer devuelve la fecha anterior', (await E(p, () => __notas.store.lista('tareas').find((t) => t.titulo === 'Regar plantas').fecha)) === antes.fecha);
  chk('sin errores de consola', p.errs.length === 0, p.errs);
  await p.context().close();
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const solo = process.argv[2];
  const todas = { escritorio, rendimiento, vistas, movil, mando, bloqueo, colab, datos, recordatorios };
  for (const k of Object.keys(todas)) { if (solo && solo !== k) continue; try { await todas[k](b); } catch (e) { mal++; console.log('  FALLA excepcion en ' + k + ': ' + e.message.split('\n')[0]); } }
  await b.close(); console.log('\n' + ok + ' comprobaciones correctas, ' + mal + ' fallidas'); process.exit(mal ? 1 : 0);
})();
