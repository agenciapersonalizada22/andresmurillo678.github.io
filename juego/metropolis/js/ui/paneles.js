// Paneles y diálogos: título, construir, ciudad, objetivos, mejoras, ajustes, eventos, premios.
import { ITEMS, ITEM, CATEGORIAS, NIVELES, MISIONES, LOGROS, TECNOLOGIAS, TECH, DIARIA } from '../sim/datos.js';
import { disponibilidad, precioParcela, fijarImpuesto, xpNecesaria } from '../sim/ciudad.js';
import { investigar, misionActual, resolverEvento, premioDiaria, reclamarDiaria, diariaDisponible } from '../sim/simulacion.js';
import { aTexto, deTexto } from '../sim/guardado.js';
import { dinero, numero, semillaDeTexto } from '../sim/util.js';
import * as Audio from './audio.js';
import * as Foco from './foco.js';
import * as Almacen from './almacen.js';
import { icono, alIcono } from './iconos.js';
import { esc, ICONO_EVT, NOMBRE_EVT } from './hud.js';

const X_SVG = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const capas = () => document.getElementById('capas');
const premioTxt = (r) => [r.dinero ? dinero(r.dinero) : '', r.xp ? r.xp + ' XP' : '', r.puntos ? r.puntos + ' pt' : ''].filter(Boolean).join(' · ');
const SEMILLAS = ['Aurora', 'Neón', 'Delta', 'Marea', 'Cumbre', 'Bahía', 'Orión', 'Cobalto', 'Vega', 'Isla', 'Nexo', 'Zafiro'];

export function crearPaneles(J) {
  const abiertos = [];

  // ---------------------------------------------------------------- base
  function modal(o) {
    const m = document.createElement('div');
    m.className = 'modal' + (o.hoja ? ' hoja' : '');
    const tabsH = o.tabs ? `<div class="tabs">${o.tabs.map((t) => `<button type="button" class="tab foco ${t.id === o.tab ? 'act' : ''}" data-tab="${t.id}">${t.nombre}</button>`).join('')}</div>` : '';
    m.innerHTML = `<section class="panel ${o.ancho ? 'ancho' : ''}" role="dialog" aria-label="${esc(o.titulo || '')}">
      ${o.titulo || o.cerrable !== false ? `<header><h2>${o.titulo || ''}</h2>${o.cerrable !== false ? `<button type="button" class="ib foco" data-cerrar aria-label="Cerrar">${X_SVG}</button>` : ''}</header>` : ''}
      ${tabsH}<div class="cuerpo">${o.html || ''}</div>${o.pie ? `<div class="pie">${o.pie}</div>` : ''}</section>`;
    const api = {
      el: m, o, cuerpo: m.querySelector('.cuerpo'), pie: m.querySelector('.pie'), cerrado: false,
      cerrar(silencio) {
        if (api.cerrado) return; api.cerrado = true;
        m.remove(); Foco.cerrar(m);
        const i = abiertos.indexOf(api); if (i >= 0) abiertos.splice(i, 1);
        J.pausaUI = abiertos.some((a) => a.o.pausa);
        if (!silencio && o.alCerrar) o.alCerrar();
      },
      rehacer(html, pie) {
        const sc = api.cuerpo.scrollTop;
        api.cuerpo.innerHTML = html; if (pie != null && api.pie) api.pie.innerHTML = pie;
        api.cuerpo.scrollTop = sc; Foco.refrescar();
      },
      fijarTab(id) {
        o.tab = id;
        m.querySelectorAll('.tab').forEach((t) => t.classList.toggle('act', t.dataset.tab === id));
        const a = m.querySelector('.tab.act'); if (a) a.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      },
    };
    m.addEventListener('click', (e) => {
      Audio.iniciar();
      if (e.target.closest('[data-guardar]')) J.guardar();
      if (e.target === m && o.cerrable !== false) { Audio.tocar('click'); api.cerrar(); return; }
      if (e.target.closest('[data-cerrar]')) { Audio.tocar('click'); api.cerrar(); return; }
      const tb = e.target.closest('[data-tab]');
      if (tb) { Audio.tocar('tecla'); api.fijarTab(tb.dataset.tab); o.alTab && o.alTab(tb.dataset.tab, api); return; }
      const b = e.target.closest('[data-acc]');
      if (b && !b.disabled && !b.classList.contains('off') && o.acc && o.acc[b.dataset.acc]) { Audio.tocar('click'); o.acc[b.dataset.acc](b, api, e); }
    });
    capas().appendChild(m);
    abiertos.push(api);
    if (o.pausa) J.pausaUI = true;
    Foco.abrir(m, {
      atras: () => { if (o.cerrable !== false) api.cerrar(); else if (o.atras) o.atras(api); },
      alCerrar: () => api.cerrar(), inicial: o.inicial,
      tabs: o.tabs ? (d) => {
        const i = o.tabs.findIndex((t) => t.id === o.tab), n = o.tabs[(i + d + o.tabs.length) % o.tabs.length];
        api.fijarTab(n.id); o.alTab && o.alTab(n.id, api); Audio.tocar('tecla');
      } : null,
    });
    return api;
  }
  const cerrarTodos = () => { [...abiertos].forEach((a) => a.cerrar(true)); };
  const hayAbiertos = () => abiertos.length > 0;
  const hayModal = () => abiertos.some((a) => !a.o.hoja);

  // ---------------------------------------------------------------- construir
  const resumen = (it) => {
    const p = [];
    if (it.prod) p.push('+' + it.prod + (it.serv === 'energia' ? ' energía' : ' agua'));
    if (it.radio) p.push('alcance ' + it.radio);
    if (it.mant >= 1) p.push(dinero(it.mant) + '/día');
    if (it.w > 1 || it.h > 1) p.push(it.w + 'x' + it.h);
    return p.join(' · ');
  };
  let ultimaCat = 'vias';
  function construir(cat) {
    cerrarHojas();
    const cats = CATEGORIAS;
    const mis = misionActual(J.c), pistaIds = mis && mis.item ? [].concat(mis.item) : [];
    let act = cat || (pistaIds.length ? ITEM[pistaIds[0]].cat : ultimaCat);
    const cardsHtml = () => {
      const lista = ITEMS.filter((it) => it.cat === act).sort((a, b) => a.nivel - b.nivel || a.costo - b.costo);
      let h = '<div class="menuConstruir">';
      for (const it of lista) {
        const d = disponibilidad(J.c, it);
        const costo = it.tipo === 'comprar' ? dinero(precioParcela(J.c)) : it.tipo === 'via' || it.tipo === 'zona' ? dinero(it.costo) + '/casilla' : dinero(it.costo);
        const caro = d.ok && J.c.dinero < (it.tipo === 'comprar' ? precioParcela(J.c) : it.costo);
        h += `<button type="button" class="card foco ${d.ok ? '' : 'bloq'} ${caro ? 'sinplata' : ''} ${pistaIds.includes(it.id) ? 'pista' : ''}" data-acc="item" data-id="${it.id}"><img data-ic="${it.id}" src="${icono(it.id)}" alt=""><span class="nom">${it.nombre}</span><span class="costo">${costo}</span>${d.ok ? '' : `<span class="req">${d.razon}</span>`}</button>`;
      }
      return h + '</div><div class="desc" id="descCard">Elige qué construir.</div>';
    };
    const api = modal({
      titulo: 'Construir', hoja: true, inicial: '.card', tabs: cats.map((c) => ({ id: c.id, nombre: c.nombre })), tab: act, html: cardsHtml(),
      alTab: (id, a) => { act = id; ultimaCat = id; a.rehacer(cardsHtml()); },
      acc: {
        item: (b, a) => {
          const it = ITEM[b.dataset.id], d = disponibilidad(J.c, it);
          if (!d.ok) { J.aviso(d.razon, 'mal'); Audio.tocar('error'); J.vibrar('error'); return; }
          ultimaCat = act; a.cerrar(true); J.setHerramienta(it);
        },
      },
    });
    api.el.addEventListener('focusin', (e) => { const c = e.target.closest('.card'); if (c) { const it = ITEM[c.dataset.id]; const d = api.el.querySelector('#descCard'); if (d && it) d.textContent = it.desc + ' ' + resumen(it); } });
    api.el.classList.add('construir');
    api.esConstruir = true;
    return api;
  }
  alIcono((id, url) => document.querySelectorAll(`img[data-ic="${id}"]`).forEach((i) => { i.src = url; }));
  function cerrarHojas() { abiertos.filter((a) => a.esConstruir).forEach((a) => a.cerrar(true)); }

  // ---------------------------------------------------------------- ciudad
  const f = (k, v, c = '') => `<div class="${c}"><span>${k}</span><b>${v}</b></div>`;
  function barraPct(p, tipo = 'ver') { return `<div class="barra ${tipo}"><s style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></s></div>`; }
  function ciudad(tab) {
    const htmlTab = (t) => {
      const c = J.c, s = c.s;
      if (t === 'resumen') {
        const nv = NIVELES[c.tier], sig = NIVELES[c.tier + 1];
        return `<h4>${c.nombre}</h4><div class="grande">${nv.nombre}</div>
        ${sig ? `<p style="text-align:center">Siguiente: ${sig.nombre} a ${numero(sig.pop)} habitantes</p>${barraPct((s.pop - nv.pop) / (sig.pop - nv.pop), 'ama')}` : '<p style="text-align:center">Nivel máximo alcanzado</p>'}
        <h4>Población</h4><div class="filas">${f('Habitantes', numero(s.pop))}${f('Capacidad', numero(s.capR))}${f('Trabajadores', numero(s.trab))}${f('Empleos', numero(s.empleos), s.empleos < s.trab ? 'mal' : 'bien')}${f('Felicidad', s.felicidad + '/100', s.felicidad < 40 ? 'mal' : s.felicidad > 65 ? 'bien' : '')}${f('Edificios', numero(s.edificios))}${f('Parcelas', s.parcelas + '/81')}${f('Día', c.t.dia)}</div>
        <h4>Demanda</h4><div class="filas">${f('Residencial', Math.round(c.dem.R * 100) + '%')}${f('Comercial', Math.round(c.dem.C * 100) + '%')}${f('Industrial', Math.round(c.dem.I * 100) + '%')}</div>
        <h4>Servicios básicos</h4><div class="filas">${f('Energía', Math.round(s.prodE) + ' / ' + Math.round(s.demE), s.ratioE < 0.98 ? 'mal' : 'bien')}${f('Agua', Math.round(s.prodA) + ' / ' + Math.round(s.demA), s.ratioA < 0.98 ? 'mal' : 'bien')}${f('Tráfico', Math.round(s.cong * 100) + '%', s.cong > 0.8 ? 'mal' : '')}${f('Contaminación', Math.round(s.contamRes), s.contamRes > 25 ? 'mal' : '')}</div>`;
      }
      if (t === 'servicios') {
        const r = (n, v) => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between"><span>${n}</span><b>${Math.round(v * 100)}%</b></div>${barraPct(v, v < 0.5 ? 'ama' : 'ver')}</div>`;
        return `<h4>Cobertura de habitantes</h4>${r('Bomberos', s.cob.bomb)}${r('Policía', s.cob.poli)}${r('Salud', s.cob.salud)}${r('Educación', s.cob.edu)}${r('Parques', s.cob.parq)}
        <h4>Marcadores sobre edificios</h4><p><b style="color:#ffd54a">Amarillo</b>: sin electricidad · <b style="color:#3aa6ff">Azul</b>: sin agua · <b style="color:#ff7a3a">Naranja</b>: sin calle conectada · <b style="color:#ff3b30">Rojo</b>: incendio.</p>
        <p>Usa el botón de capas del lateral para ver la cobertura sobre el mapa.</p>`;
      }
      const ing = c.ingresoDia, gas = c.gastoDia;
      return `<h4>Último día</h4><div class="filas">${f('Ingresos', dinero(ing), 'bien')}${f('Gastos', dinero(gas), 'mal')}${f('Balance', (c.neto >= 0 ? '+' : '') + dinero(c.neto), c.neto >= 0 ? 'bien' : 'mal')}${f('Fondos', dinero(c.dinero))}</div>
      <h4>Impuestos</h4><div class="impuesto"><button type="button" class="btn foco" data-acc="imp-" aria-label="Bajar">−</button><b>${c.impuesto}%</b><button type="button" class="btn foco" data-acc="imp+" aria-label="Subir">+</button></div>
      <p>Impuestos altos dan más dinero pero bajan la felicidad y la demanda residencial. Lo normal es 10%.</p>
      <h4>Nivel de alcalde ${c.nivelA}</h4>${barraPct(c.xp / xpNecesaria(c.nivelA), 'ama')}<p>Experiencia ${numero(c.xp)} / ${numero(xpNecesaria(c.nivelA))}. Cada nivel da dinero y un punto de mejora.</p>`;
    };
    const api = modal({
      titulo: 'Mi ciudad', tabs: [{ id: 'resumen', nombre: 'Resumen' }, { id: 'economia', nombre: 'Economía' }, { id: 'servicios', nombre: 'Servicios' }], tab: tab || 'resumen', html: htmlTab(tab || 'resumen'),
      alTab: (id, a) => a.rehacer(htmlTab(id)),
      acc: {
        'imp+': (b, a) => { fijarImpuesto(J.c, J.c.impuesto + 1); J.c.sucio = true; a.rehacer(htmlTab('economia')); },
        'imp-': (b, a) => { fijarImpuesto(J.c, J.c.impuesto - 1); J.c.sucio = true; a.rehacer(htmlTab('economia')); },
      },
    });
    return api;
  }

  // ---------------------------------------------------------------- objetivos / logros / diaria
  function objetivos(tab) {
    const htmlTab = (t) => {
      const c = J.c;
      if (t === 'objetivos') {
        const m = misionActual(c);
        let h = `<h4>Objetivo actual</h4>`;
        if (!m) h += '<p>¡Has completado todos los objetivos! Sigue creciendo tu Megalópolis.</p>';
        else {
          const v = Math.min(m.meta, Math.floor(m.prog(c)));
          h += `<div class="lista"><div class="item act"><div class="tit"><span>${m.titulo}</span><em>${numero(v)}/${numero(m.meta)}</em></div><div class="txt">${m.desc}</div>${barraPct(v / m.meta, 'ama')}<span class="rec">Recompensa: ${premioTxt(m.rec)}</span></div></div>`;
          const sig = MISIONES.slice(c.misDone + 1, c.misDone + 4);
          if (sig.length) h += '<h4>Próximos</h4><div class="lista">' + sig.map((q) => `<div class="item bloq"><div class="tit"><span>${q.titulo}</span></div><div class="txt">${q.desc}</div><span class="rec">${premioTxt(q.rec)}</span></div>`).join('') + '</div>';
        }
        h += `<h4>Completados: ${c.misDone}/${MISIONES.length}</h4>`;
        return h;
      }
      if (t === 'logros') {
        return '<div class="lista">' + LOGROS.map((l) => {
          const hecho = !!c.logros[l.id], v = Math.min(l.meta, Math.floor(l.prog(c)));
          return `<div class="item ${hecho ? 'hecho' : ''}"><div class="tit"><span>${hecho ? '★ ' : ''}${l.nombre}</span><em>${hecho ? 'Logrado' : numero(v) + '/' + numero(l.meta)}</em></div><div class="txt">${l.desc}</div>${hecho ? '' : barraPct(v / l.meta, 'ama')}<span class="rec">${premioTxt(l.rec)}</span></div>`;
        }).join('') + '</div>';
      }
      const ahora = Date.now(), ok = diariaDisponible(c, ahora), p = premioDiaria(c, ahora);
      let h = `<h4>Recompensa diaria</h4><p>Vuelve cada día para ganar más. La racha actual es de ${c.diaria.racha} día(s).</p><div class="filas">`;
      for (let i = 0; i < 7; i++) h += f('Día ' + (i + 1), dinero(DIARIA[i] * (1 + c.tier * 0.5)) + (i === 6 ? ' +3pt' : i === 3 ? ' +1pt' : ''), ok && i === p.k ? 'bien' : '');
      h += '</div>';
      h += ok ? `<div class="acciones"><button type="button" class="btn dorado foco" data-acc="diaria">Reclamar ${dinero(p.dinero)}</button></div>` : '<p>Ya reclamaste la de hoy. Vuelve más tarde.</p>';
      return h;
    };
    const api = modal({
      titulo: 'Objetivos', tabs: [{ id: 'objetivos', nombre: 'Objetivos' }, { id: 'logros', nombre: 'Logros' }, { id: 'diaria', nombre: 'Diaria' }], tab: tab || 'objetivos', html: htmlTab(tab || 'objetivos'),
      alTab: (id, a) => a.rehacer(htmlTab(id)),
      acc: { diaria: (b, a) => { const p = reclamarDiaria(J.c, Date.now()); if (p) { J.hud.nota('Recompensa diaria: ' + dinero(p.dinero), 'ok'); J.guardar(); } a.rehacer(htmlTab('diaria')); } },
    });
    return api;
  }

  // ---------------------------------------------------------------- mejoras
  function mejoras() {
    const htmlM = () => {
      const c = J.c;
      const ramas = [...new Set(TECNOLOGIAS.map((t) => t.rama))];
      let h = `<div class="grande">${c.puntos} <small style="font-size:11px;color:var(--suave)">PUNTOS</small></div><p style="text-align:center">Gana puntos al subir de nivel, con misiones, universidades y observatorios.</p>`;
      for (const r of ramas) {
        h += `<h4>${r}</h4><div class="tecnologias">`;
        for (const t of TECNOLOGIAS.filter((q) => q.rama === r)) {
          const lista = !!c.tech[t.id], reqOk = t.req.every((q) => c.tech[q]), puede = reqOk && !lista && c.puntos >= t.costo;
          const desb = ITEMS.filter((i) => i.tech === t.id).map((i) => i.nombre);
          h += `<button type="button" class="tecnologia foco ${lista ? 'listo' : puede ? 'puede' : !reqOk ? 'bloq' : ''}" data-acc="tec" data-id="${t.id}"><b>${t.nombre}</b><span class="pt">${lista ? '✔' : t.costo + ' pt'}</span><small>${t.desc}${desb.length ? ' Desbloquea: ' + desb.join(', ') + '.' : ''}${!reqOk ? ' Requiere: ' + t.req.map((q) => TECH[q].nombre).join(', ') + '.' : ''}</small></button>`;
        }
        h += '</div>';
      }
      return h;
    };
    return modal({
      titulo: 'Mejoras', ancho: true, html: htmlM(),
      acc: {
        tec: (b, a) => {
          const r = investigar(J.c, b.dataset.id);
          if (!r.ok) { J.aviso(r.razon, 'mal'); Audio.tocar('error'); J.vibrar('error'); } else { J.vibrar('ok'); J.guardar(); }
          a.rehacer(htmlM());
        },
      },
    });
  }

  // ---------------------------------------------------------------- ajustes
  function ajustes() {
    const html = () => {
      const a = J.ajustes;
      return `<h4>Calidad gráfica</h4><div class="seg">${['baja', 'media', 'alta'].map((q) => `<button type="button" class="btn foco ${a.calidad === q ? 'act' : ''}" data-acc="cal" data-q="${q}">${q}</button>`).join('')}</div>
      <p>Baja: más fluido en móviles viejos. Alta: sombras reales y más vehículos.</p>
      <h4>Sonido</h4><div class="seg"><button type="button" class="btn foco ${a.sfx ? 'act' : ''}" data-acc="sfx">Efectos: ${a.sfx ? 'sí' : 'no'}</button><button type="button" class="btn foco ${a.musica ? 'act' : ''}" data-acc="mus">Música: ${a.musica ? 'sí' : 'no'}</button></div>
      <h4>Mando</h4><div class="seg"><button type="button" class="btn foco ${a.vibracion ? 'act' : ''}" data-acc="vib">Vibración: ${a.vibracion ? 'sí' : 'no'}</button></div>
      <h4>Controles</h4><p><b>Táctil:</b> arrastra para mover, pellizca para zoom, toca para elegir. Con una herramienta, arrastra para trazar calles y zonas; en edificios toca el lugar y confirma con el botón.<br><b>Mando:</b> stick izquierdo mueve, RT/LT zoom, A construye, B atrás, X demoler, Y menú, LB/RB categorías, cruceta ↑↓ velocidad, Menú pausa, Vista objetivos.<br><b>Teclado:</b> WASD/flechas mover, Q/E girar, rueda zoom, clic construye, clic derecho mueve, B construir, X demoler, Ctrl+Z deshacer, Espacio pausa, 1-4 velocidad.</p>`;
    };
    return modal({
      titulo: 'Ajustes', pausa: true, html: html(),
      acc: {
        cal: (b, a) => { J.ajustes.calidad = b.dataset.q; J.aplicarCalidad(); Almacen.guardarAjustes(J.ajustes); a.rehacer(html()); },
        sfx: (b, a) => { J.ajustes.sfx = !J.ajustes.sfx; Audio.configurar(J.ajustes.sfx, J.ajustes.musica); Almacen.guardarAjustes(J.ajustes); a.rehacer(html()); Audio.tocar('click'); },
        mus: (b, a) => { J.ajustes.musica = !J.ajustes.musica; Audio.configurar(J.ajustes.sfx, J.ajustes.musica); Almacen.guardarAjustes(J.ajustes); a.rehacer(html()); },
        vib: (b, a) => { J.ajustes.vibracion = !J.ajustes.vibracion; Almacen.guardarAjustes(J.ajustes); a.rehacer(html()); J.vibrar('ok'); },
      },
    });
  }

  // ---------------------------------------------------------------- guardar / exportar / importar
  function intercambio(enJuego) {
    const html = () => {
      let h = '';
      if (enJuego && J.c) h += `<h4>Exportar esta ciudad</h4><div class="campo"><textarea id="txtExp" readonly>${esc(aTexto(J.c))}</textarea></div><div class="acciones"><button type="button" class="btn foco" data-acc="copiar">Copiar texto</button></div>`;
      h += `<h4>Importar ciudad</h4><div class="campo"><label>Pega aquí el texto METRO1:…</label><textarea id="txtImp" placeholder="METRO1:..."></textarea></div>
      <p>Se guardará en la ranura que elijas.</p><div class="seg">${[1, 2, 3].map((n) => `<button type="button" class="btn foco" data-acc="imp" data-n="${n}">Ranura ${n}</button>`).join('')}</div><div class="aviso" id="msgImp"></div>`;
      return h;
    };
    return modal({
      titulo: 'Guardado en texto', html: html(),
      acc: {
        copiar: (b, a) => {
          const t = a.el.querySelector('#txtExp');
          const ok = () => J.hud.nota('Texto copiado', 'ok');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, () => { t.select(); document.execCommand && document.execCommand('copy'); ok(); });
          else { t.select(); try { document.execCommand('copy'); } catch (e) { /* nada */ } ok(); }
        },
        imp: (b, a) => {
          const txt = a.el.querySelector('#txtImp').value;
          try {
            const c = deTexto(txt); c.ult = Date.now();
            const n = +b.dataset.n;
            Almacen.guardarRanura(n, JSON.stringify(J.serializar(c)), { nombre: c.nombre, pop: c.s.pop, tier: c.tier, dia: c.t.dia, t: Date.now() });
            a.el.querySelector('#msgImp').textContent = 'Importada en la ranura ' + n + ' (' + c.nombre + ')';
            Audio.tocar('ok');
            if (J.enTitulo) { a.cerrar(true); titulo(); }
          } catch (e) { a.el.querySelector('#msgImp').textContent = 'No se pudo leer ese texto.'; Audio.tocar('error'); }
        },
      },
    });
  }

  // ---------------------------------------------------------------- pausa
  function pausa() {
    const api = modal({
      titulo: 'Pausa', pausa: true, html: `<div class="lista">
        <button type="button" class="btn primario foco" data-acc="seguir">Continuar</button>
        <button type="button" class="btn foco" data-acc="ciudad">Mi ciudad</button>
        <button type="button" class="btn foco" data-acc="objetivos">Objetivos y logros</button>
        <button type="button" class="btn foco" data-acc="mejoras">Mejoras${J.c && J.c.puntos > 0 ? ' (' + J.c.puntos + ' pt)' : ''}</button>
        <button type="button" class="btn foco ${J.c && J.c.undo.length ? '' : 'off'}" data-acc="deshacer">Deshacer última obra</button>
        <button type="button" class="btn foco" data-acc="capas">Capas del mapa</button>
        <button type="button" class="btn foco" data-acc="guardar">Guardar ahora</button>
        <button type="button" class="btn foco" data-acc="ajustes">Ajustes</button>
        <button type="button" class="btn foco" data-acc="texto">Exportar / importar</button>
        <button type="button" class="btn peligro foco" data-acc="salir">Cambiar de ciudad</button>
        <a class="btn foco" href="../" style="text-decoration:none" data-guardar>← Menú de juegos</a></div>`,
      acc: {
        seguir: (b, a) => a.cerrar(),
        ciudad: () => ciudad(),
        objetivos: () => objetivos(),
        mejoras: () => mejoras(),
        deshacer: (b, a) => { a.cerrar(); J.deshacer(); },
        capas: (b, a) => { a.cerrar(); J.ciclarCapa(); },
        guardar: () => { J.guardar(); J.hud.nota('Partida guardada', 'ok'); Audio.tocar('ok'); },
        ajustes: () => ajustes(),
        texto: () => intercambio(true),
        salir: (b, a) => { J.guardar(); a.cerrar(true); cerrarTodos(); J.volverATitulo(); },
      },
    });
    return api;
  }

  // ---------------------------------------------------------------- título
  function fechaCorta(t) { const d = new Date(t); return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  let apiTitulo = null;
  function titulo() {
    if (apiTitulo && !apiTitulo.cerrado) apiTitulo.cerrar(true);
    const filas = () => {
      let h = '<h1 class="titulo">METRÓPOLIS</h1><p class="sub">construye · crece · prospera</p><div class="ranuras">';
      for (let n = 1; n <= Almacen.RANURAS; n++) {
        const m = Almacen.meta(n);
        if (!m) h += `<div class="ranura vacia"><div class="cab"><b>Ranura ${n}</b><small>vacía</small></div><div class="bts"><button type="button" class="btn primario foco" data-acc="nueva" data-n="${n}">Nueva ciudad</button></div></div>`;
        else h += `<div class="ranura"><div class="cab"><b>${esc(m.nombre)}</b><small>${fechaCorta(m.t)}</small></div><div style="font-size:11px;color:var(--suave)">${NIVELES[m.tier].nombre} · ${numero(m.pop)} hab. · Día ${m.dia}</div><div class="bts"><button type="button" class="btn primario foco" data-acc="jugar" data-n="${n}">Jugar</button><button type="button" class="btn foco" data-acc="exp" data-n="${n}">Texto</button><button type="button" class="btn peligro foco" data-acc="borrar" data-n="${n}">Borrar</button></div></div>`;
      }
      return h + `</div><div class="seg" style="margin-top:12px"><button type="button" class="btn foco" data-acc="imp">Importar</button><button type="button" class="btn foco" data-acc="ajustes">Ajustes</button></div><div class="seg" style="margin-top:8px"><a class="btn foco" href="../" style="text-decoration:none">← Menú de juegos</a></div>`;
    };
    apiTitulo = modal({
      cerrable: false, pausa: true, html: filas(), ancho: false,
      acc: {
        jugar: (b, a) => { Audio.iniciar(); J.jugarRanura(+b.dataset.n); a.cerrar(true); },
        nueva: (b, a) => nuevaCiudad(+b.dataset.n, a),
        borrar: (b, a) => {
          const n = +b.dataset.n;
          if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro?'; setTimeout(() => { if (b.isConnected) { b.dataset.seguro = ''; b.textContent = 'Borrar'; } }, 2500); return; }
          Almacen.borrarRanura(n); a.rehacer(filas());
        },
        exp: (b) => { const t = Almacen.leerRanura(+b.dataset.n); if (!t) return; try { const c = J.deserializarTexto(t); const m = modal({ titulo: 'Texto de la ciudad', html: `<div class="campo"><textarea id="txtExp" readonly>${esc(aTexto(c))}</textarea></div>`, pie: '<button type="button" class="btn primario foco" data-acc="copiar">Copiar texto</button>', acc: { copiar: () => { const tx = m.el.querySelector('#txtExp'); tx.select(); if (navigator.clipboard) navigator.clipboard.writeText(tx.value).catch(() => {}); else document.execCommand('copy'); J.hud.nota('Texto copiado', 'ok'); } } }); } catch (e) { J.hud.nota('No se pudo exportar', 'mal'); } },
        imp: () => intercambio(false),
        ajustes: () => ajustes(),
      },
    });
    J.enTitulo = true;
    return apiTitulo;
  }
  function nuevaCiudad(n, a) {
    const sem = SEMILLAS[Math.floor(Math.random() * SEMILLAS.length)] + ' ' + (100 + Math.floor(Math.random() * 900));
    a.rehacer(`<h1 class="titulo" style="font-size:24px">NUEVA CIUDAD</h1>
      <div class="campo"><label>Nombre de la ciudad</label><input id="inNombre" value="Ciudad ${n}" maxlength="22" autocomplete="off"></div>
      <div class="campo"><label>Semilla del mapa (cualquier texto o número)</label><div class="fila"><input id="inSem" value="${sem}" maxlength="24" autocomplete="off"><button type="button" class="btn foco" data-acc="dado" aria-label="Aleatoria">Azar</button></div></div>
      <p>La misma semilla genera siempre el mismo terreno.</p>
      <div class="seg"><button type="button" class="btn foco" data-acc="atras">Atrás</button><button type="button" class="btn primario foco" data-acc="crear" data-n="${n}">Crear</button></div>`);
    const o = a.o;
    o.acc.dado = () => { a.el.querySelector('#inSem').value = SEMILLAS[Math.floor(Math.random() * SEMILLAS.length)] + ' ' + (100 + Math.floor(Math.random() * 900)); };
    o.acc.atras = () => { a.cerrar(true); titulo(); };
    o.acc.crear = () => {
      const nombre = a.el.querySelector('#inNombre').value.trim() || 'Mi ciudad';
      const semilla = semillaDeTexto(a.el.querySelector('#inSem').value);
      Audio.iniciar(); a.cerrar(true); J.crearPartida(n, nombre, semilla);
    };
  }

  // ---------------------------------------------------------------- diálogos
  function comprar(px, py) {
    const c = J.c, p = precioParcela(c), ok = c.dinero >= p;
    let tierra = 0, agua = 0, arboles = 0;
    for (let y = py * 8; y < py * 8 + 8; y++) for (let x = px * 8; x < px * 8 + 8; x++) { const t = c.terr[y * 72 + x]; if (t === 1) agua++; else if (t !== 3) tierra++; if (c.arbol[y * 72 + x]) arboles++; }
    return modal({
      titulo: 'Comprar parcela', pausa: false,
      html: `<div class="grande">${dinero(p)}</div><div class="filas">${f('Terreno apto', tierra + ' casillas')}${f('Agua', agua)}${f('Árboles', arboles)}${f('Tus fondos', dinero(c.dinero), ok ? 'bien' : 'mal')}</div><p>Más parcelas = más espacio para crecer. El precio sube con cada parcela.</p>`,
      pie: `<button type="button" class="btn foco" data-acc="no">Cancelar</button><button type="button" class="btn dorado foco ${ok ? '' : 'off'}" data-acc="si">Comprar</button>`,
      inicial: '[data-acc="si"]',
      acc: { no: (b, a) => a.cerrar(), si: (b, a) => { a.cerrar(true); J.comprarParcela(px, py); } },
    });
  }
  function evento(i) {
    const c = J.c, p = c.evt.pend[i]; if (!p) return null;
    let txt = '', pie = '';
    const btn = (op, tx, cls = '') => `<button type="button" class="btn foco ${cls}" data-acc="op" data-op="${op}">${tx}</button>`;
    if (p.tipo === 'incendio') { txt = '<p>Un edificio está en llamas y el fuego puede extenderse. Si tienes bomberos cerca lo apagarán solos; si no, envía helicópteros.</p>'; pie = btn('apagar', 'Apagar $150', 'dorado') + btn('ver', 'Ir al fuego') + btn('ignorar', 'Ignorar'); }
    else if (p.tipo === 'apagon') { const cs = Math.round(200 + c.s.pop * 0.2); txt = '<p>La red eléctrica ha fallado y solo rinde al 30%. Repararla cuesta dinero, o espera unas horas. Construir más energía evita nuevos apagones.</p>'; pie = btn('reparar', 'Reparar ' + dinero(cs), 'dorado') + btn('ignorar', 'Esperar'); }
    else if (p.tipo === 'festival') { txt = `<p>Los vecinos piden un festival. Sube la felicidad y los ingresos durante 2 días.</p>`; pie = btn('organizar', 'Organizar ' + dinero(p.costo), 'dorado') + btn('ignorar', 'No ahora'); }
    else { txt = '<p>Tu economía está en racha. Puedes subir impuestos temporalmente (+35% ingresos, menos felicidad) o invertir en infraestructura para atraer más habitantes.</p>'; pie = btn('impuestos', 'Aprovechar impuestos', 'dorado') + btn('invertir', 'Invertir ' + dinero(p.costo)) + btn('ignorar', 'Ignorar'); }
    return modal({
      titulo: NOMBRE_EVT[p.tipo], html: `<div style="text-align:center;color:var(--${p.tipo === 'incendio' || p.tipo === 'apagon' ? 'rojo' : 'verde'});">${ICONO_EVT[p.tipo].replace('<svg', '<svg style="width:48px;height:48px"')}</div>${txt}`, pie,
      acc: {
        op: (b, a) => {
          const op = b.dataset.op;
          if (op === 'ver') { if (p.x != null) J.camara.centrar(p.x, p.y); a.cerrar(); return; }
          const r = resolverEvento(c, c.evt.pend.indexOf(p), op === 'invertir' ? 'invertir' : op);
          if (!r.ok) { J.aviso(r.razon || 'No se pudo', 'mal'); Audio.tocar('error'); J.vibrar('error'); return; }
          a.cerrar(true); J.cambioFuerte();
        },
      },
    });
  }
  function confeti() {
    const d = document.createElement('div'); d.className = 'confeti';
    const cols = ['#3df5ff', '#ff4dc8', '#ffd54a', '#5dff9a', '#4da3ff'];
    for (let i = 0; i < 60; i++) { const e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.background = cols[i % 5]; e.style.animationDuration = 1.8 + Math.random() * 1.6 + 's'; e.style.animationDelay = Math.random() * 0.6 + 's'; d.appendChild(e); }
    document.body.appendChild(d); setTimeout(() => d.remove(), 4200);
  }
  function tier(info) {
    confeti();
    return modal({
      titulo: '¡Subes de nivel!', pausa: true, cerrable: false, inicial: '[data-acc="ok"]',
      html: `<div class="grande">${info.nombre}</div><p style="text-align:center">Tu ciudad ha crecido. Premio: <b style="color:var(--amar)">${dinero(info.premio)}</b> y 3 puntos de mejora.</p>${info.nuevos.length ? `<h4>Desbloqueado</h4><div class="desbloq">${info.nuevos.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}`,
      pie: '<button type="button" class="btn dorado foco" data-acc="ok">¡Seguir construyendo!</button>',
      acc: { ok: (b, a) => a.cerrar() }, atras: (a) => a.cerrar(),
    });
  }
  function diaria(p) {
    return modal({
      titulo: 'Recompensa diaria', pausa: true, inicial: '[data-acc="ok"]',
      html: `<div class="grande">${dinero(p.dinero)}${p.puntos ? ' + ' + p.puntos + ' pt' : ''}</div><p style="text-align:center">Día ${p.k + 1} de racha. ¡Vuelve mañana para más!</p>`,
      pie: '<button type="button" class="btn dorado foco" data-acc="ok">Reclamar</button>',
      acc: { ok: (b, a) => { const r = reclamarDiaria(J.c, Date.now()); a.cerrar(true); if (r) J.hud.nota('+' + dinero(r.dinero), 'ok'); J.guardar(); } },
    });
  }
  function offline(o) {
    return modal({
      titulo: 'Bienvenido de nuevo', pausa: true, inicial: '[data-acc="ok"]',
      html: `<p style="text-align:center">Estuviste fuera ${o.real < 1 ? Math.round(o.real * 60) + ' min' : o.real.toFixed(1) + ' h'}. Tu ciudad siguió trabajando${o.tope ? ' (hasta el tope de ' + o.horas + ' h)' : ''}.</p><div class="grande">+${dinero(o.dinero)}</div>`,
      pie: '<button type="button" class="btn dorado foco" data-acc="ok">Recoger</button>',
      acc: { ok: (b, a) => a.cerrar() }, atras: (a) => a.cerrar(),
    });
  }
  function bienvenida() {
    return modal({
      titulo: 'Bienvenido, alcalde', pausa: true, inicial: '[data-acc="ok"]',
      html: `<p>Tienes un terreno pequeño, <b style="color:var(--amar)">${dinero(J.c.dinero)}</b> y un Ayuntamiento. Haz crecer tu ciudad paso a paso: sigue el <b>objetivo</b> amarillo de arriba.</p>
      <h4>Cómo se juega</h4><div class="filas" style="grid-template-columns:1fr">${f('Táctil', 'arrastra = mover · pellizca = zoom · toca = elegir')}${f('Mando', 'stick mueve · A construye · Y menú · B atrás')}${f('Teclado', 'WASD mover · rueda zoom · clic construye')}</div>
      <p>Cada casilla de zona crece sola si hay <b>calle, luz y agua</b>. Mira las barras R C I (demanda) y los marcadores de colores sobre los edificios.</p>`,
      pie: '<button type="button" class="btn primario foco" data-acc="ok">Empezar</button>',
      acc: { ok: (b, a) => a.cerrar() }, atras: (a) => a.cerrar(),
    });
  }

  return { get ultimaCat() { return ultimaCat; }, modal, construir, ciudad, objetivos, mejoras, ajustes, intercambio, pausa, titulo, comprar, evento, tier, diaria, offline, bienvenida, confeti, cerrarTodos, cerrarHojas, hayAbiertos, hayModal, abiertos };
}
