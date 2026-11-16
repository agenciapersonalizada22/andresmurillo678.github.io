/* Estudio > Analizador: BPM (onsets) y tonalidad (cromagrama + Krumhansl) de las pistas de la biblioteca, nivel RMS, mezcla armonica. */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, E = g.MuEst, M = g.MuMotor, B = g.MuBib, Q = g.MuCola, U = g.MuUI, h = Mu.h, esc = Mu.esc;
  const S = { cancelar: false, ocupado: false, comp: null };
  const compat = (c) => { if (!c) return []; const n = +c.slice(0, -1), l = c.slice(-1), w = (x) => ((x - 1 + 12) % 12) + 1; return [c, w(n + 1) + l, w(n - 1) + l, n + (l === 'A' ? 'B' : 'A')]; };
  E.subs.anal = function (p) {
    p.textContent = ''; const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Analizador de BPM y tonalidad' }));
    d.appendChild(h('p', { cls: 'tr-sub', txt: 'Decodifica cada pista en tu dispositivo y calcula tempo (detección de onsets), tonalidad (cromagrama y perfiles de Krumhansl) y nivel de volumen. Nada se sube. Las estimaciones pueden fallar en música sin pulso claro o con cambios de tonalidad.' }));
    const prog = h('p', { cls: 'tr-ayuda', role: 'status', id: 'mu-an-prog' }), bt = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-an-todo', txt: 'Analizar pistas pendientes', on: () => (S.ocupado ? (S.cancelar = true) : todo()) });
    d.appendChild(h('div', { cls: 'tr-acciones' }, [bt])); d.appendChild(prog);
    const orden = h('select', { id: 'mu-an-orden', 'aria-label': 'Ordenar', on: { change: pintar } }); [['bpm', 'BPM'], ['tono', 'Tonalidad (Camelot)'], ['titulo', 'Título']].forEach(([v, t]) => orden.appendChild(h('option', { value: v, txt: t }))); d.appendChild(h('label', { for: 'mu-an-orden', txt: 'Ordenar por' })); d.appendChild(orden);
    const lista = h('div', { id: 'mu-an-lista' }); d.appendChild(lista); p.appendChild(d);
    async function todo() {
      const pend = B.todas().filter((x) => !x.bpm && B.disponible(x)); if (!pend.length) { prog.textContent = B.todas().length ? 'No hay pistas pendientes con archivo disponible (reimporta las que falten).' : 'Añade música primero.'; return; }
      S.ocupado = true; S.cancelar = false; bt.textContent = 'Cancelar'; let ok = 0;
      for (let i = 0; i < pend.length && !S.cancelar; i++) { prog.textContent = 'Analizando ' + (i + 1) + ' / ' + pend.length + ': ' + pend[i].titulo; try { await M.analizar(pend[i]); ok++; await new Promise((r) => setTimeout(r, 30)); } catch (e) { console.warn(e); } pintar(); }
      S.ocupado = false; bt.textContent = 'Analizar pistas pendientes'; prog.textContent = 'Listo: ' + ok + ' pista(s) analizadas.'; if (ok) Mu.logro('analisis');
    }
    function pintar() {
      lista.textContent = ''; let ps = B.todas(); if (!ps.length) { lista.appendChild(h('div', { cls: 'tr-vacio', txt: 'Aún no hay música en la biblioteca.' })); return; }
      const m = orden.value; ps = m === 'tono' ? ps.slice().sort((a, b) => (a.camelot || 'Z').localeCompare(b.camelot || 'Z', 'es', { numeric: true })) : m === 'bpm' ? ps.slice().sort((a, b) => (a.bpm || 999) - (b.bpm || 999)) : B.ordenar(ps, 'titulo');
      const ul = h('ul', { cls: 'mu-pistas' }); ps.forEach((x) => { const li = h('li', { cls: 'mu-fila mu-an-fila', 'data-id': x.id }); const b = h('button', { type: 'button', cls: 'mu-fila-main', on: () => Q.poner(ps, ps.indexOf(x)) }); b.innerHTML = '<span class="mu-ini" style="background:' + Mu.colorDe(x.album || x.artista || x.titulo) + '">' + esc(U.inicial(x)) + '</span><span class="mu-t"><b>' + esc(x.titulo) + '</b><small>' + (x.bpm ? '<span class="mu-dato">' + Math.round(x.bpm * 10) / 10 + ' BPM</span> <span class="mu-dato">' + esc(x.tono) + ' · ' + esc(x.camelot) + '</span> <span class="mu-dato">' + (x.p95Db != null ? x.p95Db + ' dB' : '') + '</span>' : 'Sin analizar') + '</small></span>'; li.appendChild(b);
        li.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: x.bpm ? 'Reanalizar' : 'Analizar', on: async function () { this.disabled = true; try { await M.analizar(x); Mu.logro('analisis'); } catch (e) { Mu.aviso('No se pudo analizar: ' + (B.disponible(x) ? e.message : 'reimporta el archivo.'), 'error'); } pintar(); } })); if (x.camelot) li.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Compatibles', on: () => { S.comp = x.id; pintar(); } })); ul.appendChild(li); });
      if (S.comp) { const o = D.pistas.get(S.comp); if (o) { const ks = compat(o.camelot), cand = ps.filter((x) => x.id !== o.id && x.camelot && ks.includes(x.camelot) && Math.abs(x.bpm - o.bpm) / o.bpm < 0.08); const c = h('div', { cls: 'tr-nota tr-ok' }); c.innerHTML = '<b>Mezcla armónica con «' + esc(o.titulo) + '»</b> (' + esc(o.camelot) + ', ' + Math.round(o.bpm) + ' BPM): ' + (cand.length ? cand.map((x) => esc(x.titulo) + ' (' + esc(x.camelot) + ', ' + Math.round(x.bpm) + ')').join(' · ') : 'ninguna otra pista encaja (misma clave ±1 o relativa, ±8 % de tempo).'); lista.appendChild(c); } }
      lista.appendChild(ul);
    }
    pintar(); Mu.on('datos', () => { if (p.isConnected) pintar(); });
  };
})(window);
