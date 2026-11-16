// Pantallas: tienda, almanaque, misiones y logros, ranking, Jardin Zen.
import { h, toast, fmt } from './dom.js';
import { P, Z, IDS_P, IDS_Z, TIENDA, MISIONES, DESBLOQUEO, plantasDe } from './datos.js';
import { PR, guardarProgreso, completados, estrellasTotal } from './almacen.js';
import { LOGROS } from './logros.js';
import { INTRO } from './niveles.js';
import * as ZN from './zen.js';
import * as S from './sonido.js';
import * as CJ from './cuenta-jardin.js';
import * as Ar from './arte.js';
import { mostrar, cab, btn, iconoP, iconoZ, chipsMon, refrescar, atras } from './ui.js';
import { App } from './app.js';

/* ---------- tienda ---------- */
export function tienda() {
  mostrar(() => {
    const g = h('div', { cls: 'tienda' });
    TIENDA.forEach((it) => {
      const n = it.multi ? (PR.tienda[it.id] | 0) : PR.tienda[it.id] ? 1 : 0, lleno = it.multi ? n >= it.multi : !it.consumible && !!PR.tienda[it.id];
      const falta = it.req && !PR.tienda[it.req], caro = PR.monedas < it.p;
      const b = h('button', { type: 'button', cls: 'btn' + (lleno ? ' ok' : ''), 'data-f': 1, 'data-test': 'compra-' + it.id, disabled: lleno || falta, txt: lleno ? 'Comprado' : falta ? 'Requiere mejora previa' : '🪙 ' + fmt(it.p), on: { click: () => {
        if (PR.monedas < it.p) { toast('No tienes suficientes monedas'); S.sfx('error'); return; }
        PR.monedas -= it.p; if (it.consumible) PR.abonos += 5; else if (it.multi) PR.tienda[it.id] = (PR.tienda[it.id] | 0) + 1; else PR.tienda[it.id] = 1;
        guardarProgreso(true); S.sfx('moneda'); toast('Comprado: ' + it.n); App.tras && App.tras(); refrescar();
      } } });
      if (caro && !lleno && !falta) b.classList.add('caro');
      g.appendChild(h('div', { cls: 'item' }, [h('div', { cls: 'it-t' }, [h('b', { txt: it.n + (it.multi ? ` (${n}/${it.multi})` : '') }), h('small', { txt: it.d })]), b]));
    });
    return h('div', { cls: 'tienda-p' }, [cab('Tienda del vecino', [chipsMon()]), h('p', { cls: 'nota', txt: 'El vecino no acepta dinero real: solo monedas del juego, que ganas jugando. Abonos: ' + PR.abonos }), g]);
  });
}

/* ---------- almanaque ---------- */
let tabAlm = 'p', selAlm = null, animCv = null, animRaf = 0;
export function almanaque() {
  mostrar(() => {
    const disp = new Set(plantasDe(completados())); const raiz = h('div', { cls: 'alm' });
    const tabs = h('div', { cls: 'tabs' }, [['p', 'Plantas'], ['z', 'Zombis']].map(([k, n]) => h('button', { type: 'button', cls: 'tab' + (tabAlm === k ? ' on' : ''), 'data-f': 1, 'data-test': 'alm-' + k, txt: n, on: { click: () => { tabAlm = k; selAlm = null; refrescar(); } } })));
    const lista = h('div', { cls: 'alm-lista' }), ficha = h('div', { cls: 'ficha' });
    const ids = tabAlm === 'p' ? IDS_P : IDS_Z;
    if (!selAlm || !ids.includes(selAlm)) selAlm = ids[0];
    ids.forEach((id) => {
      const vis = tabAlm === 'p' ? disp.has(id) : (PR.vistosZ[id] || INTRO[id] === 1);
      lista.appendChild(h('button', { type: 'button', cls: 'alm-i' + (id === selAlm ? ' on' : '') + (vis ? '' : ' oculto'), 'data-f': 1, title: vis ? (tabAlm === 'p' ? P[id].n : Z[id].n) : 'Sin descubrir', on: { click: () => { selAlm = id; refrescar(); } } }, [vis ? (tabAlm === 'p' ? iconoP(id, 44) : iconoZ(id, 44)) : h('span', { cls: 'q', txt: '?' })]));
    });
    const id = selAlm, vis = tabAlm === 'p' ? disp.has(id) : (PR.vistosZ[id] || INTRO[id] === 1);
    if (!vis) ficha.appendChild(h('p', { cls: 'nota', txt: tabAlm === 'p' ? 'Aún no has desbloqueado esta planta. Avanza en la aventura.' : 'Aún no te has encontrado con este zombi.' }));
    else if (tabAlm === 'p') {
      const d = P[id], cv = h('canvas', { width: 220, height: 220, style: 'width:110px;height:110px', 'aria-hidden': 'true' }); animCv = cv;
      let uni = Object.keys(DESBLOQUEO).find((k) => DESBLOQUEO[k] === id);
      ficha.appendChild(h('div', { cls: 'ficha-h' }, [cv, h('div', {}, [h('h3', { txt: d.n }), h('span', { cls: 'rol', txt: d.rol })])]));
      ficha.appendChild(h('p', { txt: d.d }));
      const f = (a, b) => h('li', {}, [h('span', { txt: a }), h('b', { txt: b })]);
      const l = h('ul', { cls: 'stats' }, [f('Coste', '☀ ' + d.c), f('Recarga', d.rec + ' s'), f('Vida', fmt(d.hp)), d.dano ? f('Daño', d.dano * (d.raf || 1) + (d.raf > 1 ? ` (${d.raf} disparos)` : '')) : null, d.cada ? f('Cadencia', 'cada ' + d.cada + ' s') : null, d.dps ? f('Daño por segundo', String(d.dps)) : null, d.radio ? f('Radio', d.radio + ' casillas') : null, f('Se consigue', uni ? 'Completa el nivel ' + (Math.floor((uni - 1) / 10) + 1) + '-' + (((uni - 1) % 10) + 1) : 'Desde el inicio')]);
      ficha.appendChild(l);
    } else {
      const d = Z[id], cv = h('canvas', { width: 220, height: 220, style: 'width:110px;height:110px', 'aria-hidden': 'true' }); animCv = cv;
      ficha.appendChild(h('div', { cls: 'ficha-h' }, [cv, h('div', {}, [h('h3', { txt: d.n }), h('span', { cls: 'rol', txt: d.jefe ? 'Jefe' : d.vehiculo ? 'Vehículo' : d.grande ? 'Gigante' : 'Zombi' })])]));
      ficha.appendChild(h('p', { txt: d.d }));
      const f = (a, b) => h('li', {}, [h('span', { txt: a }), h('b', { txt: b })]);
      ficha.appendChild(h('ul', { cls: 'stats' }, [f('Vida', fmt(d.hp)), d.arm ? f('Armadura', fmt(d.arm.hp) + (d.arm.metal ? ' (metal)' : '')) : null, f('Velocidad', d.v + ' casillas/s'), d.dps ? f('Mordisco', d.dps + ' por s') : d.aplasta ? f('Aplasta', 'plantas de un golpe') : null, f('Aparece', INTRO[id] ? 'Nivel ' + (Math.floor((INTRO[id] - 1) / 10) + 1) + '-' + (((INTRO[id] - 1) % 10) + 1) : id === 'moho' ? 'Nivel 5-10' : id === 'capataz' ? 'Nivel 3-10' : 'Especial')]));
    }
    raiz.appendChild(cab('Almanaque')); raiz.appendChild(tabs); raiz.appendChild(h('div', { cls: 'alm-cuerpo' }, [lista, ficha]));
    cancelAnimationFrame(animRaf);
    const tick = (ts) => { if (!animCv || !animCv.isConnected) return; const g = animCv.getContext('2d'), t = ts / 1000; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 110, 110); if (tabAlm === 'p') Ar.dibujarPlanta(g, selAlm, 55, 98, 100, t, { hp: 1, arma: 0 }); else { const d = Z[selAlm]; Ar.dibujarZombi(g, { tipo: selAlm, id: 2, hp: 1, hpMax: 1, arm: d.arm ? { k: d.arm.k } : null, dir: -1, estado: 'anda', vuelo: !!d.vuelo }, 55, selAlm === 'moho' ? 100 : 98, selAlm === 'moho' ? 42 : selAlm === 'coloso' || selAlm === 'capataz' ? 56 : 94, t, {}); } animRaf = requestAnimationFrame(tick); };
    animRaf = requestAnimationFrame(tick);
    return raiz;
  });
}

/* ---------- misiones y logros ---------- */
let tabMis = 'm';
export function misiones() {
  mostrar(() => {
    const raiz = h('div', { cls: 'mis' }), tabs = h('div', { cls: 'tabs' }, [['m', 'Misiones'], ['l', 'Logros'], ['e', 'Estadísticas']].map(([k, n]) => h('button', { type: 'button', cls: 'tab' + (tabMis === k ? ' on' : ''), 'data-f': 1, txt: n, on: { click: () => { tabMis = k; refrescar(); } } })));
    const lista = h('div', { cls: 'lista-mis' });
    if (tabMis === 'm') MISIONES.forEach((m) => {
      const v = Math.min(m.meta, m.cnt === 'mejorSurv' ? PR.stats.mejorSurv : PR.stats[m.cnt] | 0), ok = v >= m.meta, rec = PR.misiones[m.id];
      lista.appendChild(h('div', { cls: 'mision' }, [h('div', { cls: 'm-t' }, [h('b', { txt: m.n }), h('small', { txt: m.d }), h('div', { cls: 'barra' }, [h('i', { style: `width:${100 * v / m.meta}%` })]), h('small', { txt: v + '/' + m.meta })]),
        h('button', { type: 'button', cls: 'btn' + (ok && !rec ? ' primario' : ''), 'data-f': 1, disabled: !ok || rec, txt: rec ? 'Cobrada' : ok ? 'Reclamar 🪙' + m.rec : '🪙 ' + m.rec, on: { click: () => { PR.misiones[m.id] = 1; PR.monedas += m.rec; PR.ganadas += m.rec; guardarProgreso(true); S.sfx('moneda'); toast('+' + m.rec + ' monedas'); refrescar(); } } })]));
    });
    else if (tabMis === 'l') LOGROS.forEach((l) => lista.appendChild(h('div', { cls: 'logro' + (PR.logros[l.id] ? ' on' : '') }, [h('span', { cls: 'ico', txt: PR.logros[l.id] ? '🏆' : '🔒' }), h('div', {}, [h('b', { txt: l.nombre }), h('small', { txt: l.desc })])])));
    else { const s = PR.stats; [['Niveles ganados', s.victorias], ['Derrotas', s.derrotas], ['Zombis derrotados', s.matados], ['Plantas plantadas', s.plantadas], ['Energía recogida', s.soles], ['Mejor supervivencia (oleadas)', s.mejorSurv], ['Estrellas', estrellasTotal()], ['Monedas ganadas (total)', PR.ganadas], ['Ventas del Jardín Zen', s.zenVentas], ['Duelos jugados', s.versus]].forEach(([a, b]) => lista.appendChild(h('div', { cls: 'logro on' }, [h('span', { cls: 'ico', txt: '📊' }), h('div', {}, [h('b', { txt: String(Math.round(b || 0)) }), h('small', { txt: a })])]))); }
    raiz.appendChild(cab('Misiones y logros', [chipsMon()])); raiz.appendChild(tabs); raiz.appendChild(lista); return raiz;
  });
}
export function ranking() { mostrar(() => h('div', { cls: 'mis' }, [cab('Ranking'), CJ.panelRanking()])); }

/* ---------- Jardin Zen ---------- */
let zenTimer = 0, especieZen = null;
export function zen() {
  mostrar(() => {
    const ahora = () => Date.now(), total = ZN.parcelasTotal(PR.tienda);
    while (PR.zen.parcelas.length < total) PR.zen.parcelas.push(null);
    const disp = plantasDe(completados()).filter((id) => P[id].t !== 'base' && P[id].t !== 'escudo'); if (!especieZen || !disp.includes(especieZen)) especieZen = disp[0];
    const raiz = h('div', { cls: 'zen' }), grid = h('div', { cls: 'parcelas' }), info = h('p', { cls: 'nota' });
    const sel = h('div', { cls: 'zen-sel' });
    const pintarSel = () => { sel.textContent = ''; disp.forEach((id) => sel.appendChild(h('button', { type: 'button', cls: 'semilla mini' + (id === especieZen ? ' en' : ''), 'data-f': 1, title: P[id].n, on: { click: () => { especieZen = id; pintarSel(); } } }, [iconoP(id, 34)]))); };
    const cvs = [];
    const pintar = () => {
      grid.textContent = ''; cvs.length = 0;
      PR.zen.parcelas.forEach((p, i) => {
        if (p) ZN.avanzar(p, ahora());
        const cv = h('canvas', { width: 160, height: 160, style: 'width:80px;height:80px', 'aria-hidden': 'true' }); cvs[i] = cv;
        const bs = h('div', { cls: 'p-bots' });
        if (!p) bs.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, 'data-test': 'zen-plantar-' + i, txt: 'Plantar 🪙' + ZN.COSTE_SEMILLA, on: { click: () => { if (PR.monedas < ZN.COSTE_SEMILLA) { toast('Faltan monedas'); return; } PR.monedas -= ZN.COSTE_SEMILLA; PR.zen.parcelas[i] = ZN.nueva(especieZen, ahora()); S.sfx('plantar'); guardarProgreso(true); logroZen('zen_primera'); pintar(); } } }));
        else {
          bs.appendChild(h('button', { type: 'button', cls: 'btn' + (ZN.necesitaAgua(p) ? ' primario' : ''), 'data-f': 1, 'data-test': 'zen-regar-' + i, txt: '💧 Regar', on: { click: () => { ZN.regar(p); S.sfx('plantar'); guardarProgreso(); pintar(); } } }));
          bs.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, disabled: PR.abonos < 1, txt: '🌱 Abonar (' + PR.abonos + ')', on: { click: () => { if (PR.abonos < 1) return; PR.abonos--; ZN.abonar(p, ahora()); S.sfx('sol'); guardarProgreso(); pintar(); } } }));
          if (Math.floor(p.mon) > 0) bs.appendChild(h('button', { type: 'button', cls: 'btn primario', 'data-f': 1, txt: '🪙 Cobrar ' + Math.floor(p.mon) * 5, on: { click: () => { const n = ZN.cosechar(p); PR.monedas += n; PR.ganadas += n; S.sfx('moneda'); guardarProgreso(); pintar(); } } }));
          bs.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, 'data-test': 'zen-vender-' + i, txt: 'Vender 🪙' + ZN.precioVenta(p), on: { click: () => { const n = ZN.precioVenta(p) + 0; PR.monedas += n; PR.ganadas += n; PR.stats.zenVentas++; PR.zen.parcelas[i] = null; S.sfx('moneda'); toast('Vendida por ' + n + ' monedas'); guardarProgreso(true); logroZen('zen_venta'); pintar(); } } }));
        }
        grid.appendChild(h('div', { cls: 'parcela' }, [h('div', { cls: 'p-top' }, [cv, h('div', { cls: 'p-i' }, [h('b', { txt: p ? P[p.id].n : 'Parcela libre' }), p ? h('small', { txt: ['Semilla', 'Brote', 'Joven', 'Adulta'][ZN.etapa(p)] + ' · ' + Math.round(p.crec * 100) + '% · 💧' + Math.round(p.agua * 100) + '%' + (p.abonoHasta > ahora() ? ' · abonada' : '') }) : h('small', { txt: 'Elige una especie abajo' })])]), bs]));
      });
      info.textContent = 'Riega para que crezcan. Las adultas acumulan monedas; véndelas o cóbralas. Monedas: ' + fmt(PR.monedas);
    };
    pintarSel(); pintar();
    clearInterval(zenTimer);
    const dib = () => { PR.zen.parcelas.forEach((p) => p && ZN.avanzar(p, ahora())); cvs.forEach((cv, i) => { const p = PR.zen.parcelas[i]; if (!cv || !cv.isConnected) return; const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 80, 80); g.fillStyle = '#6b4a2a'; g.beginPath(); g.ellipse(40, 70, 34, 9, 0, 0, 6.3); g.fill(); if (p) { const e = ZN.etapa(p), k = [0.2, 0.42, 0.7, 1][e]; if (e === 0) { g.fillStyle = '#4a3418'; g.beginPath(); g.ellipse(40, 66, 8, 5, 0, 0, 6.3); g.fill(); } else Ar.dibujarPlanta(g, p.id, 40, 70, 74 * k, performance.now() / 1000, { hp: 1, arma: 0 }); if (p.agua < 0.25) { g.fillStyle = '#4ec3e8'; g.font = '14px sans-serif'; g.fillText('?', 4, 14); } } }); raiz.querySelectorAll('.p-i small').forEach((el, i) => { const p = PR.zen.parcelas[i]; if (p) el.textContent = ['Semilla', 'Brote', 'Joven', 'Adulta'][ZN.etapa(p)] + ' · ' + Math.round(p.crec * 100) + '% · agua ' + Math.round(p.agua * 100) + '%' + (p.abonoHasta > ahora() ? ' · abonada' : ''); }); };
    zenTimer = setInterval(() => { if (!raiz.isConnected) { clearInterval(zenTimer); return; } dib(); }, 1000); setTimeout(dib, 30);
    raiz.appendChild(cab('Jardín Zen', [chipsMon()])); raiz.appendChild(info); raiz.appendChild(grid); raiz.appendChild(h('div', { cls: 'sub', txt: 'Especie a plantar:' })); raiz.appendChild(sel);
    setTimeout(() => zenTimer && 0, 0);
    return raiz;
  }, { alCerrar: () => clearInterval(zenTimer) });
}
function logroZen(id) { App.logroExtra && App.logroExtra(id); }
