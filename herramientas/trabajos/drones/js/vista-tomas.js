/* Vista Tomas: shot list, storyboard con pictogramas de movimiento y guion tecnico por proyecto. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, A = g.DronApp, Cal = g.DronCalc, Cat = g.DronCatalogo, P = g.DronPatrones, ui = {}, tomas = () => A.est.proy.tomas;
  const plant = id => Cat.TOMAS.filter(t => t.id === id)[0] || Cat.TOMAS[0], nombreMov = id => plant(id).nombre;
  const obtDe = fps => '1/' + Math.round(fps * 2);
  function sugerirND(t) { const c = A.camara(); const r = Cal.ndPara(14, c && c.cam && c.cam.isoBase || 100, c && c.apertura || 2.8, t.fps || 24); return r.stops < 0.34 ? 'sin ND' : 'ND' + Math.pow(2, r.nd); }
  function nueva(id) {
    const pl = plant(id), c = A.camara(), t = { id: T.uid(), titulo: pl.nombre, mov: pl.id, lente: c ? c.nombre + (c.f ? ' · ' + A.f1(c.f, 1) + ' mm' : '') : '', fps: 24, alt: pl.alt, dur: pl.dur, vel: pl.vel, giro: pl.giro, notas: pl.consejo };
    t.obt = obtDe(t.fps); t.nd = sugerirND(t); return t;
  }
  /* pictograma 160x90 por movimiento */
  function vineta(mov) {
    const L = 'stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"', fl = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1); return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + 'M' + x2 + ' ' + y2 + 'l' + (-8 * Math.cos(a - 0.5)) + ' ' + (-8 * Math.sin(a - 0.5)) + 'M' + x2 + ' ' + y2 + 'l' + (-8 * Math.cos(a + 0.5)) + ' ' + (-8 * Math.sin(a + 0.5)) + '" ' + L + '/>'; };
    const dron = (x, y) => '<g transform="translate(' + x + ' ' + y + ')" ' + L + '><circle r="3"/><path d="M-9-6h-4M9-6h4M-9 6h-4M9 6h4M-5-3l-4-3M5-3l4-3M-5 3l-4 3M5 3l4 3"/></g>', suj = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="5" fill="currentColor" opacity=".55"/>', suelo = y => '<path d="M0 ' + y + 'H160" ' + L + ' opacity=".4"/>';
    return ({
      revelacion: suelo(75) + '<path d="M20 55v20h30V55z" fill="currentColor" opacity=".25"/>' + dron(40, 62) + fl(46, 58, 118, 22) + suj(130, 70) + '<path d="M118 22l26 6" ' + L + ' opacity=".5"/>',
      orbita: '<ellipse cx="80" cy="46" rx="52" ry="26" ' + L + ' stroke-dasharray="5 4"/>' + suj(80, 46) + dron(132, 46) + fl(132, 50, 120, 62),
      dolly: '<path d="M20 45L120 12M20 45L120 78" ' + L + ' opacity=".55"/>' + dron(20, 45) + suj(135, 45) + fl(34, 45, 80, 45) + '<path d="M120 12V78" ' + L + ' stroke-dasharray="3 3" opacity=".5"/>',
      follow: suelo(78) + suj(110, 62) + dron(50, 50) + fl(62, 54, 98, 60),
      topdown: '<rect x="30" y="12" width="100" height="66" ' + L + ' opacity=".4"/><path d="M30 45h100M80 12v66" ' + L + ' opacity=".25"/>' + dron(80, 45) + '<circle cx="80" cy="45" r="20" ' + L + ' opacity=".35" stroke-dasharray="3 3"/>',
      lateral: suelo(78) + suj(80, 66) + dron(35, 40) + fl(47, 40, 125, 40),
      pedestal: suelo(80) + dron(80, 66) + fl(80, 58, 80, 14) + suj(80, 76),
      sobrevuelo: '<path d="M0 78q20-10 40 0t40 0t40 0t40 0" ' + L + ' opacity=".45"/>' + dron(40, 52) + fl(52, 52, 140, 48)
    })[mov] || '';
  }
  /* ---- lista de tomas ---- */
  function insertarPatron(t) {
    const pl = plant(t.mov), m = A.est.proy.mision, M = A.vistas.mision.mapa().vista, cx = M.cx, cy = M.cy, dist = Math.max(10, t.vel * t.dur); let w;
    if (pl.patron === 'orbita') w = P.orbita({ cx, cy, radio: Math.max(8, dist / (2 * Math.PI)), n: 16, alt: t.alt, vel: t.vel, altObjetivo: 1.5 });
    else if (pl.patron === 'revelacion') w = P.revelacion({ x1: cx, y1: cy, rumbo: 0, dist, alt: t.alt, altFin: t.alt + 25, vel: t.vel, giro: t.giro, giroFin: -8, n: 5 });
    else w = P.lineal({ x1: cx, y1: cy, x2: cx, y2: cy + dist, alt: t.alt, altFin: t.mov === 'pedestal' ? t.alt + 25 : t.alt, n: 2, vel: t.vel, giro: t.giro, giroFin: t.mov === 'pedestal' ? -10 : t.giro });
    m.wps = m.wps.concat(w); A.cambio('mision'); A.aviso('Añadí ' + w.length + ' waypoints de «' + t.titulo + '» al centro del mapa. Revísalos en Misión.'); A.logro('toma_a_mapa');
  }
  function pintarTomas() {
    const c = ui.lista; c.textContent = ''; const ts = tomas();
    if (!ts.length) c.appendChild(h('p', { cls: 'tr-vacio', txt: 'Aún no hay tomas. Añade una desde las plantillas.' }));
    ts.forEach((t, i) => {
      const mover = d => { const j = i + d; if (j < 0 || j >= ts.length) return; [ts[i], ts[j]] = [ts[j], ts[i]]; A.cambio('tomas'); pintarTomas(); };
      const f = (k, etq, o) => A.campo(etq, t[k], v => { t[k] = v; if (k === 'fps') { t.obt = obtDe(v); } A.cambio('tomas'); }, o);
      const pl = plant(t.mov), tx = (k, etq, mx) => A.campo(etq, t[k] || '', v => { t[k] = v; A.cambio('tomas'); }, { tipo: 'text', maxlength: mx || 80 }).wrap;
      const nota = h('textarea', { id: 'dr-tn-' + t.id, rows: '2', maxlength: '400' }); nota.value = t.notas || ''; nota.addEventListener('input', () => { t.notas = nota.value; A.cambio('tomas'); });
      c.appendChild(h('details', { cls: 'tr-panel dr-det', open: i === 0 ? '' : null }, [h('summary', { txt: (i + 1) + '. ' + t.titulo + ' · ' + nombreMov(t.mov) }),
        tx('titulo', 'Título de la toma', 60), A.selector('Movimiento', Cat.TOMAS.map(x => [x.id, x.nombre]), t.mov, v => { t.mov = v; A.cambio('tomas'); pintarTomas(); }).wrap, h('p', { cls: 'tr-ayuda', txt: pl.desc }),
        h('div', { cls: 'tr-fila' }, [tx('lente', 'Cámara y lente', 100), f('fps', 'FPS', { min: 1 }).wrap, tx('obt', 'Obturador (regla de 180°)', 10), tx('nd', 'Filtro ND', 20)]),
        h('div', { cls: 'tr-fila' }, [f('alt', 'Altura (m)').wrap, f('vel', 'Velocidad (m/s)', { min: 0 }).wrap, f('giro', 'Cámara (°)').wrap, f('dur', 'Duración (s)', { min: 1 }).wrap]),
        h('label', { for: 'dr-tn-' + t.id, txt: 'Notas de la toma' }), nota, h('p', { cls: 'tr-ayuda', txt: 'Consejo: ' + pl.consejo }),
        h('div', { cls: 'tr-acciones' }, [A.boton('Subir', () => mover(-1), 'tr-chico'), A.boton('Bajar', () => mover(1), 'tr-chico'), A.boton('Duplicar', () => { ts.splice(i + 1, 0, Object.assign({}, t, { id: T.uid(), titulo: t.titulo + ' (copia)' })); A.cambio('tomas'); pintarTomas(); }, 'tr-chico'), A.boton('Ruta en el mapa', () => insertarPatron(t), 'tr-chico'), A.boton('Eliminar', () => { ts.splice(i, 1); A.cambio('tomas'); pintarTomas(); }, 'tr-chico tr-peli')])]));
    });
    const tot = ts.reduce((a, t) => a + (t.dur || 0), 0); ui.total.textContent = ts.length ? ts.length + ' toma(s) · ' + A.min(tot) + ' min:s de material estimado' : '';
  }
  function plantillas() {
    const c = ui.plant; c.textContent = '';
    Cat.TOMAS.forEach(p => c.appendChild(h('button', { type: 'button', cls: 'dr-plant', on: { click: () => { tomas().push(nueva(p.id)); A.cambio('tomas'); pintarTomas(); A.aviso('Toma «' + p.nombre + '» añadida.'); A.logro('shot_list'); } } }, [h('svg', {}), h('b', { txt: p.nombre }), h('span', { cls: 'tr-ayuda', txt: p.desc })])));
    c.querySelectorAll('svg').forEach((s, i) => { const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); n.setAttribute('viewBox', '0 0 160 90'); n.setAttribute('aria-hidden', 'true'); n.innerHTML = vineta(Cat.TOMAS[i].id); s.replaceWith(n); });
  }
  /* ---- storyboard ---- */
  function pintarStory() {
    const c = ui.story; c.textContent = ''; const ts = tomas(); if (!ts.length) { c.appendChild(h('p', { cls: 'tr-vacio', txt: 'El storyboard se dibuja con las tomas de la lista.' })); return; }
    const gr = h('div', { cls: 'dr-story' }); ts.forEach((t, i) => { const fr = h('figure', { cls: 'dr-frame' }); const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 160 90'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Pictograma de ' + nombreMov(t.mov)); s.innerHTML = '<rect x="1" y="1" width="158" height="88" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity=".35"/>' + vineta(t.mov); fr.appendChild(s); fr.appendChild(h('figcaption', {}, [h('b', { txt: (i + 1) + '. ' + t.titulo }), h('div', { cls: 'tr-ayuda', txt: nombreMov(t.mov) + ' · ' + t.fps + ' fps · ' + t.obt + ' · ' + t.nd }), h('div', { cls: 'tr-ayuda', txt: t.alt + ' m · ' + t.dur + ' s' })])); gr.appendChild(fr); }); c.appendChild(gr);
  }
  /* ---- guion ---- */
  A.tomasTecnicas = () => tomas().map(t => ({ titulo: t.titulo, mov: nombreMov(t.mov), lente: t.lente, fps: t.fps, obt: t.obt, nd: t.nd, alt: t.alt, dur: t.dur, notas: t.notas }));
  function textoGuion() {
    const p = A.est.proy, c = A.camara(), s = A.estadisticas(), n = A.perfil(), m = p.mision, L = [];
    L.push('GUION TÉCNICO: ' + p.nombre); if (p.guion.cliente) L.push('Cliente / producción: ' + p.guion.cliente); L.push('Fecha: ' + new Date().toISOString().slice(0, 10)); L.push('');
    L.push('EQUIPO'); L.push('- Cámara y lente: ' + (c ? c.nombre + (c.f ? ' (' + A.f1(c.f, 1) + ' mm' + (c.apertura ? ', f/' + A.f1(c.apertura, 1) : '') + ')' : '') : '—')); L.push('- Normativa de referencia: ' + (n ? n.nombre + ' (máx. ' + n.alturaMax + ' m' + (n.vlos ? ', VLOS' : '') + '); verificar la ley local' : '—')); L.push('');
    L.push('MISIÓN'); L.push('- ' + m.wps.length + ' waypoints, ' + Math.round(s.distancia) + ' m, ' + A.min(s.duracion) + ' min:s, batería estimada ' + Math.round(s.bateriaPct) + ' %, altura máx. ' + Math.round(s.altMax) + ' m'); L.push('');
    L.push('TOMAS'); tomas().forEach((t, i) => { L.push((i + 1) + '. ' + t.titulo + ' [' + nombreMov(t.mov) + ']'); L.push('   ' + [t.lente, t.fps + ' fps', 'obturador ' + t.obt, t.nd, t.alt + ' m', t.vel + ' m/s', 'cámara ' + t.giro + '°', t.dur + ' s'].join(' · ')); if (t.notas) L.push('   ' + t.notas); });
    if (!tomas().length) L.push('(sin tomas)'); if (p.guion.notas) { L.push(''); L.push('NOTAS'); L.push(p.guion.notas); }
    return L.join('\n') + '\n';
  }
  function pintarGuion() { if (ui.guionTxt) ui.guionTxt.textContent = textoGuion(); }
  function guion(c) {
    ui.guionTxt = h('pre', { cls: 'dr-pre', tabindex: '0', 'aria-label': 'Guion técnico generado' });
    const nt = h('textarea', { id: 'dr-g-notas', rows: '3', maxlength: '1000' }); nt.value = A.est.proy.guion.notas || ''; nt.addEventListener('input', () => { A.est.proy.guion.notas = nt.value; A.guardar(); pintarGuion(); }); ui.gNotas = nt;
    const cli = A.campo('Cliente o producción', A.est.proy.guion.cliente, v => { A.est.proy.guion.cliente = v; A.guardar(); pintarGuion(); }, { tipo: 'text', maxlength: 80 }); ui.gCli = cli.el;
    c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Guion técnico del proyecto' }), cli.wrap, h('label', { for: 'dr-g-notas', txt: 'Notas generales' }), nt, h('div', { cls: 'tr-acciones' }, [A.boton('Copiar', async () => { try { await navigator.clipboard.writeText(textoGuion()); A.aviso('Guion copiado.'); } catch (e) { A.aviso('No se pudo copiar; descarga el archivo.', 'error'); } }, 'tr-chico'), A.boton('Descargar .txt', () => A.descargar(textoGuion(), T.nombreArchivo(A.est.proy.nombre) + '_guion.txt'), 'tr-chico'), A.boton('Descargar .md', () => A.descargar(textoGuion().replace(/^([A-ZÁÉÍÓÚ ]+)$/gm, '## $1').replace(/^GUION TÉCNICO: (.*)$/m, '# $1'), T.nombreArchivo(A.est.proy.nombre) + '_guion.md', 'text/markdown;charset=utf-8'), 'tr-chico'), A.boton('Imprimir…', () => { A.tabs.ir('seguridad'); A.irHoja('guion'); }, 'tr-chico')]), ui.guionTxt]));
    pintarGuion();
  }
  A.iniciarTomas = function () {
    const raiz = document.getElementById('v-tomas'); ui.lista = h('div'); ui.plant = h('div', { cls: 'dr-plants' }); ui.story = h('div'); ui.total = h('p', { cls: 'tr-ayuda', role: 'status' });
    A.sub(raiz, [['lista', 'Shot list', c => c.appendChild(h('div', { cls: 'tr-dos' }, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Plantillas de movimiento' }), h('p', { cls: 'tr-ayuda', txt: 'Toca una plantilla para añadir la toma con parámetros sugeridos.' }), ui.plant]), h('div', {}, [h('h2', { txt: 'Tomas del proyecto' }), ui.total, ui.lista])])) ], ['story', 'Storyboard', c => c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Storyboard' }), ui.story]))], ['guion', 'Guion', guion]], 'tom');
    A.on('sub:tom', v => { if (v === 'story') pintarStory(); if (v === 'guion') pintarGuion(); });
    A.on('tomas', () => { ui.total.textContent = ''; const ts = tomas(), tot = ts.reduce((a, t) => a + (t.dur || 0), 0); ui.total.textContent = ts.length ? ts.length + ' toma(s) · ' + A.min(tot) + ' min:s de material estimado' : ''; pintarGuion(); });
    A.on('proyecto', () => { pintarTomas(); pintarStory(); if (ui.gNotas) { ui.gNotas.value = A.est.proy.guion.notas || ''; ui.gCli.value = A.est.proy.guion.cliente || ''; } pintarGuion(); }); A.on('mision', pintarGuion); A.on('camara', pintarGuion);
    plantillas(); pintarTomas(); pintarStory();
  };
})(window);
