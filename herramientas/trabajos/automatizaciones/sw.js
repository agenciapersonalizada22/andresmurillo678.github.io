/* Service Worker de Automatizaciones: ejecuta en segundo plano los flujos marcados «fondo» cuando el navegador lo permite
   (periodicsync, solo Chrome/Edge con app instalada). Sin servidor: NO hay garantia de horario. Acciones: http, notificacion, almacen y logica. */
importScripts('js/catalogo.js', 'js/motor.js');
const DB = 'trabajos_automatizaciones', BASE = 'https://raw.githubusercontent.com/agenciapersonalizada22/andresmurillo678.github.io/datos/';
function abrir() { return new Promise((ok, ko) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('r', { keyPath: 'k' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
function tx(db, modo, fn) { return new Promise((ok, ko) => { const t = db.transaction('r', modo), rq = fn(t.objectStore('r')); t.oncomplete = () => ok(rq && rq.result); t.onerror = t.onabort = () => ko(t.error); }); }
async function tick() {
  const db = await abrir(), regs = await tx(db, 'readonly', s => s.getAll());
  const cfg = ((regs.find(r => r.k === 'config_dispositivo/sw') || {}).v) || {}, dominios = cfg.dominios || [], secretos = cfg.secretos || {};
  if (!cfg.fondo) return;
  const flujos = regs.filter(r => r.col === 'flujos').map(r => r.v).filter(f => f.activo && f.fondo);
  const acciones = {
    async http(c) {
      if (!AutoMotor.hostPermitido(c.url, dominios)) throw new Error('Dominio no permitido: ' + c.url);
      const metodo = (c.metodo || 'GET').toUpperCase(), r = await fetch(c.url, { method: metodo, headers: c.cabeceras ? JSON.parse(c.cabeceras) : {}, body: /^(GET|HEAD)$/.test(metodo) || !c.cuerpo ? undefined : c.cuerpo, credentials: 'omit' });
      const texto = (await r.text()).slice(0, 2000000); let cuerpo = texto; try { cuerpo = JSON.parse(texto); } catch (e) {}
      return { estado: r.status, ok: r.ok, cuerpo, texto, valor: cuerpo };
    },
    async notificacion(c) { await self.registration.showNotification(c.titulo || 'Automatización', { body: c.texto }); return { mostrada: true, valor: c.texto }; },
    async almacen(c0, ctx) { const c = Object.assign({}, c0, { valor: AutoMotor.evaluar(c0.valor, ctx) }); const k = 'almacen/' + c.clave, ant = await tx(db, 'readonly', s => s.get(k)); let v = c.valor; if (c.modo === 'sumar') v = (Number(ant && ant.v.valor) || 0) + (Number(v) || 0); else if (c.modo === 'añadir') { v = ant && Array.isArray(ant.v.valor) ? ant.v.valor.concat([v]) : [v]; } const t = Date.now(); await tx(db, 'readwrite', s => s.put({ k, col: 'almacen', id: c.clave, t, v: { id: c.clave, valor: v, _t: t } })); return { clave: c.clave, valor: v }; }
  };
  for (const f of flujos) {
    const ini = f.nodos.find(n => ['temporizador', 'hora_dia', 'cambio_datos', 'manual'].includes(n.tipo)); if (!ini) continue;
    let datos = {}; try { if (ini.tipo === 'cambio_datos') { const d = await (await fetch(BASE + ini.cfg.archivo)).json(); datos = { valor: ini.cfg.ruta ? AutoMotor.ruta(d, ini.cfg.ruta) : d.generado, datos: d }; } } catch (e) { continue; }
    const reg = await AutoMotor.ejecutar(f, { catalogo: AutoCatalogo, inicio: ini.id, disparo: { tipo: 'segundo plano', datos }, acciones, secretos, faltante: 'omitir', almacen: {} });
    await tx(db, 'readwrite', s => s.put({ k: 'ejecuciones/' + reg.id, col: 'ejecuciones', id: reg.id, t: Date.now(), v: reg }));
  }
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('periodicsync', e => { if (e.tag === 'auto-tick') e.waitUntil(tick()); });
self.addEventListener('message', e => { if (e.data === 'tick') e.waitUntil(tick()); });
