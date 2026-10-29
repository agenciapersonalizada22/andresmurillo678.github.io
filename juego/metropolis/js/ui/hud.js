// HUD: cifras, barras, notificaciones, números flotantes, eventos y ficha de edificio.
import * as THREE from '../../lib/three.module.min.js';
import { NIVELES, ITEM, MISIONES, ZONAS, NOMBRES_ZONA } from '../sim/datos.js';
import { xpNecesaria, puedeMejorar, costoMejora, esMia } from '../sim/ciudad.js';
import { misionActual, razonSubida, costoImpulso } from '../sim/simulacion.js';
import { dinero, numero } from '../sim/util.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
export const ICONO_EVT = {
  incendio: '<svg viewBox="0 0 24 24"><path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>',
  apagon: '<svg viewBox="0 0 24 24"><path d="M13 2L5 14h6l-1 8 8-12h-6z"/></svg>',
  festival: '<svg viewBox="0 0 24 24"><path d="M12 3l2 5 5 .5-4 3.5 1.5 5L12 14.5 7.5 17l1.5-5L5 8.5 10 8z"/></svg>',
  boom: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
};
const NOMBRE_EVT = { incendio: 'Incendio', apagon: 'Apagón', festival: 'Festival', boom: 'Boom económico' };
export { esc, NOMBRE_EVT };

export function crearHud(J) {
  const cache = {};
  const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
  const cls = (id, c, on) => { const k = id + c; if (cache[k] !== on) { cache[k] = on; $(id).classList.toggle(c, on); } };
  const ancho = (id, f) => { const v = Math.round(Math.max(0, Math.min(1, f)) * 1000) / 10 + '%'; const k = id + 'w'; if (cache[k] !== v) { cache[k] = v; $(id).style.width = v; } };
  const flot = [];
  const proy = new THREE.Vector3();

  function barraDem(id, v) {
    const e = $(id), k = id + 'd', val = Math.round(v * 50) / 50;
    if (cache[k] === val) return; cache[k] = val;
    const h = Math.abs(val) * 50;
    e.className = val < 0 ? 'neg' : '';
    if (val >= 0) { e.style.bottom = '50%'; e.style.top = ''; } else { e.style.top = '50%'; e.style.bottom = ''; }
    e.style.height = h + '%';
  }

  function resumenMision(c) {
    const m = misionActual(c);
    if (!m) return null;
    const v = Math.min(m.meta, Math.floor(m.prog(c)));
    return { m, v };
  }

  function actualizar(c) {
    const s = c.s; if (!s) return;
    set('vAlcalde', 'FONDOS · NV ' + c.nivelA);
    set('vDinero', dinero(c.dinero));
    cls('chipDinero', 'neg', c.dinero < 0);
    set('vNeto', (c.neto >= 0 ? '+' : '') + dinero(c.neto) + '/d');
    ancho('barXp', c.xp / xpNecesaria(c.nivelA));
    const nv = NIVELES[c.tier], sig = NIVELES[c.tier + 1];
    set('vPob', numero(s.pop));
    set('vNivel', nv.nombre.toUpperCase());
    ancho('barNivel', sig ? (s.pop - nv.pop) / (sig.pop - nv.pop) : 1);
    set('vFecha', 'Día ' + c.t.dia + ' · ' + String(c.t.hora).padStart(2, '0') + 'h');
    for (const b of document.querySelectorAll('#velocidad .vel')) b.classList.toggle('act', +b.dataset.vel === J.vel);
    const pE = Math.round(s.ratioE * 100), pA = Math.round(s.ratioA * 100);
    set('vEn', String(pE)); set('vAg', String(pA)); set('vFe', String(s.felicidad));
    const est = (id, v, bien, medio) => { const k = id + 'e', e = v >= bien ? 'bien' : v >= medio ? 'medio' : 'mal'; if (cache[k] !== e) { cache[k] = e; $(id).className = 'rec ' + e; } };
    est('rEn', s.ratioE, 0.98, 0.7); est('rAg', s.ratioA, 0.98, 0.7); est('rFe', s.felicidad, 60, 40);
    barraDem('dR', c.dem.R); barraDem('dC', c.dem.C); barraDem('dI', c.dem.I);
    const em = $('puntosBadge'); const pt = c.puntos > 0 ? String(c.puntos) : ''; if (cache.pt !== pt) { cache.pt = pt; em.textContent = pt; em.classList.toggle('v', !!pt); }
    const r = resumenMision(c), ob = $('objetivo');
    if (!r) { ob.classList.add('oculto'); } else {
      ob.classList.remove('oculto');
      const txt = (c.misDone < 8 ? r.m.titulo + ' — ' + r.m.desc : r.m.titulo) + ' (' + numero(r.v) + '/' + numero(r.m.meta) + ')';
      set('objTxt', txt); ancho('objBarra', r.v / r.m.meta);
      $('objetivo').firstElementChild.textContent = 'OBJETIVO ' + (c.misDone + 1) + '/' + MISIONES.length;
    }
    // pistas del tutorial
    const pista = r && r.m.pista;
    const aplicarPista = (id, on) => { const k = 'p' + id; if (cache[k] !== on) { cache[k] = on; $(id).classList.toggle('pista', on); } };
    aplicarPista('bConstruir', pista === 'construir' && !J.herr.item && J.herr.modo === 'ver');
    aplicarPista('bMejoras', pista === 'mejoras');
    $('velocidad').classList.toggle('pista', pista === 'velocidad' && J.vel < 2);
    // botón deshacer
    $('bDeshacer').classList.toggle('off', !c.undo.length);
    $('bDemoler').classList.toggle('act', J.herr.modo === 'demoler');
    $('bConstruir').classList.toggle('act', J.herr.modo === 'construir');
    // eventos pendientes
    const ev = c.evt.pend, key = ev.map((p) => p.tipo + (p.id || '')).join(',') + '|' + (c.evt.apagon > 0) + (c.evt.festival > 0) + (c.evt.boom > 0);
    if (cache.ev !== key) {
      cache.ev = key;
      let h = '';
      ev.forEach((p, i) => { h += `<button type="button" class="evt foco ${p.tipo === 'festival' || p.tipo === 'boom' ? 'bueno' : ''}" data-i="${i}">${ICONO_EVT[p.tipo]}<span>${NOMBRE_EVT[p.tipo]}</span></button>`; });
      if (c.evt.festival > 0) h += `<div class="evt info">${ICONO_EVT.festival}<span>Festival activo</span></div>`;
      if (c.evt.boom > 0) h += `<div class="evt info">${ICONO_EVT.boom}<span>Boom activo</span></div>`;
      if (c.evt.apagon > 0) h += `<div class="evt">${ICONO_EVT.apagon}<span>Red al 30%</span></div>`;
      $('eventos').innerHTML = h;
    }
  }

  $('eventos').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) J.paneles.evento(+b.dataset.i); });

  // ------------------------------------------------ notificaciones
  function nota(m, t = 'info') {
    const cont = $('notas');
    if (cont.lastChild && cont.lastChild.dataset.m === m) return;
    const d = document.createElement('div'); d.className = 'nota ' + t; d.textContent = m; d.dataset.m = m;
    cont.appendChild(d);
    while (cont.children.length > 3) cont.removeChild(cont.firstChild);
    setTimeout(() => { d.classList.add('sale'); setTimeout(() => d.remove(), 420); }, 3800);
  }

  // ------------------------------------------------ números flotantes
  function flotante(x, z, texto, clase = '') {
    const c = $('flotantes');
    if (flot.length > 14) { const v = flot.shift(); v.el.remove(); }
    const el = document.createElement('div'); el.className = 'flot ' + clase;
    const sp = document.createElement('span'); sp.textContent = texto; el.appendChild(sp);
    c.appendChild(el);
    const o = { el, x, z, y: 1.1, t0: performance.now() };
    flot.push(o);
    setTimeout(() => { el.remove(); const i = flot.indexOf(o); if (i >= 0) flot.splice(i, 1); }, 1650);
  }
  function posiciones() {
    const w = window.innerWidth, h = window.innerHeight;
    for (const o of flot) {
      proy.set(o.x, o.y, o.z).project(J.camara.cam);
      o.el.style.transform = `translate(${(proy.x * 0.5 + 0.5) * w}px,${(-proy.y * 0.5 + 0.5) * h}px)`;
    }
  }

  // ------------------------------------------------ ficha de edificio
  const fila = (k, v, c = '') => `<div class="${c}"><span>${k}</span><b>${v}</b></div>`;
  function estadoServ(b, c) {
    const out = [];
    out.push(fila('Calle', b.cn ? 'Conectada' : 'Sin acceso', b.cn ? 'bien' : 'mal'));
    if (b.cE > 0) out.push(fila('Electricidad', !b.cobE ? 'Sin cobertura' : b.sE ? 'Insuficiente' : 'OK', !b.cobE || b.sE ? 'mal' : 'bien'));
    if (b.cA > 0) out.push(fila('Agua', !b.cobA ? 'Sin cobertura' : b.sA ? 'Insuficiente' : 'OK', !b.cobA || b.sA ? 'mal' : 'bien'));
    return out.join('');
  }
  function htmlInfo(b, c) {
    const it = ITEM[b.t], s = c.s;
    let t = it.nombre, tag = '', cuerpo = '', ac = '';
    if (it.tipo === 'zona') {
      const z = it.zona;
      t = NOMBRES_ZONA[z][b.n]; tag = b.n ? 'Nv ' + b.n : 'Vacío';
      if (b.n === 0) {
        cuerpo += `<p>Lote ${ZONAS[z].nombre.toLowerCase()}. Crecerá solo cuando haya calle, electricidad, agua y demanda.</p><div class="filas">${estadoServ(b, c)}${fila('Demanda', Math.round(c.dem[z] * 100) + '%', c.dem[z] > 0.05 ? 'bien' : 'mal')}</div>`;
      } else {
        const cap = ZONAS[z].cap[b.n];
        cuerpo += `<div class="filas">${z === 'R' ? fila('Habitantes', b.pop + ' / ' + cap) : fila('Empleos', cap)}${estadoServ(b, c)}${fila('Valor del suelo', Math.round(c.r.valor[Math.floor(b.cy - 0.01) * 72 + Math.floor(b.cx - 0.01)]))}${z === 'I' ? fila('Contaminación', 'Nv ' + b.n) : ''}</div>`;
        const r = razonSubida(c, b);
        if (b.n < 4) {
          cuerpo += r ? `<div class="aviso">Para subir: ${esc(r)}</div>` : `<div class="aviso" style="color:var(--verde)">Listo para subir de nivel</div>`;
          if (!r) ac += `<button type="button" class="btn dorado foco" data-acc="impulsar">Impulsar ${dinero(costoImpulso(b))}</button>`;
        }
      }
    } else {
      tag = it.mej ? 'Nv ' + b.n : '';
      cuerpo += `<p>${esc(it.desc)}</p><div class="filas">`;
      if (it.prod) cuerpo += fila(it.serv === 'energia' ? 'Producción' : 'Capacidad', Math.round(it.prod * (1 + 0.4 * (b.n - 1))));
      if (it.radio) cuerpo += fila('Alcance', (it.radio * (it.mej ? 1 + 0.2 * (b.n - 1) : 1)).toFixed(1));
      cuerpo += fila('Mantenimiento', dinero(it.mant * (1 + 0.3 * Math.max(0, it.mej ? b.n - 1 : 0))) + '/d');
      if (it.serv === 'energia') cuerpo += fila('Red', Math.round(s.ratioE * 100) + '%', s.ratioE < 0.98 ? 'mal' : 'bien');
      if (it.serv === 'agua') cuerpo += fila('Red', Math.round(s.ratioA * 100) + '%', s.ratioA < 0.98 ? 'mal' : 'bien');
      if (it.trabajos) cuerpo += fila('Empleos', it.trabajos);
      if (!['energia', 'agua', 'parque', 'deco', 'monumento', 'ayuntamiento'].includes(it.serv)) cuerpo += fila('Calle', b.cn ? 'Conectada' : 'Sin acceso', b.cn ? 'bien' : 'mal');
      if (it.bono) cuerpo += fila('Bono', Object.entries(it.bono).map(([k, v]) => ({ ingreso: '+$' + v + '/d', felic: '+' + v + ' felicidad', puntos: '+' + v + ' pts/d', demC: '+demanda C' }[k] || '')).join(' '));
      cuerpo += '</div>';
      if (it.mej) {
        const p = puedeMejorar(c, b);
        if (b.n >= 3) cuerpo += '<div class="aviso">Nivel máximo</div>';
        else if (!p.ok && p.razon !== 'Dinero insuficiente') cuerpo += `<div class="aviso">Mejora: ${esc(p.razon)}</div>`;
        else ac += `<button type="button" class="btn dorado foco ${p.ok ? '' : 'off'}" data-acc="mejorar">Mejorar ${dinero(costoMejora(c, b))}</button>`;
      }
    }
    if (b.fuego > 0) { cuerpo += '<div class="aviso" style="color:var(--rojo)">¡En llamas!</div>'; ac += `<button type="button" class="btn peligro foco" data-acc="apagar">Apagar $150</button>`; }
    if (b.t !== 'ayuntamiento') ac += `<button type="button" class="btn peligro foco" data-acc="demoler">Demoler</button>`;
    ac += `<button type="button" class="btn foco" data-acc="cerrar">Cerrar</button>`;
    return `<h3><span>${esc(t)}</span>${tag ? `<em>${tag}</em>` : ''}</h3>${cuerpo}<div class="acciones">${ac}</div>`;
  }
  function htmlVia(x, y, c) {
    const v = c.via[y * 72 + x], con = c.r && c.r.con[y * 72 + x];
    return `<h3><span>${v === 2 ? 'Avenida' : 'Calle'}</span></h3><div class="filas">${fila('Conexión', con ? 'Al Ayuntamiento' : 'Aislada', con ? 'bien' : 'mal')}${fila('Tráfico', Math.round(c.s.cong * 100) + '%', c.s.cong > 0.8 ? 'mal' : 'bien')}</div><div class="acciones"><button type="button" class="btn peligro foco" data-acc="demolerVia">Demoler</button><button type="button" class="btn foco" data-acc="cerrar">Cerrar</button></div>`;
  }

  let infoClave = '';
  function mostrarInfo(html, clave) {
    const e = $('info');
    if (infoClave !== clave || e.classList.contains('oculto')) { e.innerHTML = html; infoClave = clave; }
    e.classList.remove('oculto');
  }
  function ocultarInfo() { $('info').classList.add('oculto'); infoClave = ''; }
  $('info').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acc]'); if (!b || b.classList.contains('off')) return;
    J.accionInfo(b.dataset.acc);
  });

  function refrescarInfo() {
    const c = J.c;
    if (J.sel == null && !J.selVia) { ocultarInfo(); return; }
    if (J.sel != null) {
      const b = c.edif.get(J.sel);
      if (!b) { J.sel = null; ocultarInfo(); return; }
      const h = htmlInfo(b, c);
      if (h !== infoClave) { $('info').innerHTML = h; infoClave = h; J.foco.refrescar(); }
      $('info').classList.remove('oculto');
    } else if (J.selVia) {
      const h = htmlVia(J.selVia.x, J.selVia.y, c);
      if (h !== infoClave) { $('info').innerHTML = h; infoClave = h; }
      $('info').classList.remove('oculto');
    }
  }

  return { actualizar, nota, flotante, posiciones, refrescarInfo, ocultarInfo, mostrarInfo, $ };
}
