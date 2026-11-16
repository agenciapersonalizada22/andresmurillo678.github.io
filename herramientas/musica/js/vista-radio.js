/* Reproductor > Radio y podcasts: streams que agrega el usuario (limites CORS/HTTPS avisados) y feeds RSS solo si el servidor permite CORS. */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, B = g.MuBib, Q = g.MuCola, U = g.MuUI, A = g.MuApp, h = Mu.h, esc = Mu.esc;
  const itemRadio = (r) => ({ id: 'r:' + g.Tr.hash(r.url), remoto: true, url: r.url, titulo: r.nombre, estacion: 'Radio en directo' });
  const urlValida = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol); } catch (e) { return false; } };
  A.parseRSS = function (xml) {
    const d = new DOMParser().parseFromString(xml, 'text/xml'); if (d.querySelector('parsererror')) throw new Error('El feed no es XML válido.');
    const ch = d.querySelector('channel'); if (!ch) throw new Error('No parece un feed RSS de podcast.');
    const val = (e, t) => { const n = e.querySelector(t); return n ? n.textContent.trim() : ''; };
    const dur = (e) => { const n = e.getElementsByTagNameNS('*', 'duration')[0]; if (!n) return 0; const p = n.textContent.trim().split(':').map(Number); return p.length > 1 ? p.reduce((a, b) => a * 60 + b, 0) : (p[0] || 0); };
    const eps = Array.from(ch.querySelectorAll('item')).map((i) => { const en = i.querySelector('enclosure'); return en && en.getAttribute('url') ? { titulo: val(i, 'title'), url: en.getAttribute('url'), fecha: val(i, 'pubDate'), dur: dur(i) } : null; }).filter(Boolean);
    return { titulo: val(ch, ':scope > title'), episodios: eps };
  };
  A.pintarRadio = function (raiz) {
    raiz.textContent = '';
    const aviso = h('div', { cls: 'tr-nota tr-av' }); aviso.innerHTML = '<b>Límites del navegador:</b> no hay emisoras incluidas ni catálogo; añades tú las direcciones. Una página <code>https</code> no puede reproducir streams <code>http</code> (contenido mixto), y para usar el ecualizador y los visualizadores el servidor debe enviar cabeceras CORS; si no, el flujo suena igual pero sin procesar. Los feeds RSS de podcast solo se pueden leer si el servidor permite CORS; si no, descarga los episodios y arrástralos a la biblioteca.'; raiz.appendChild(aviso);
    /* radios */
    const pr = h('div', { cls: 'tr-panel' }); pr.appendChild(h('h2', { txt: 'Radio por URL' })); const n = h('input', { type: 'text', id: 'mu-r-nom', placeholder: 'Nombre de la emisora', 'aria-label': 'Nombre de la emisora' }), u = h('input', { type: 'url', id: 'mu-r-url', placeholder: 'https://…/stream.mp3', 'aria-label': 'URL del stream' });
    pr.appendChild(h('div', { cls: 'tr-fila' }, [n, u])); pr.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-r-add', txt: 'Añadir emisora', on: async () => { const url = u.value.trim(); if (!urlValida(url)) { Mu.aviso('Escribe una URL http(s) válida.', 'error'); return; } if (location.protocol === 'https:' && url.startsWith('http:')) Mu.aviso('Aviso: este navegador bloqueará un stream http desde una página https.', 'error'); await D.guardarRadio({ nombre: n.value.trim() || new URL(url).hostname, url }); n.value = u.value = ''; Mu.logro('radio'); } })]));
    const ul = h('ul', { cls: 'mu-pistas', id: 'mu-radios' }); const pintarR = () => { ul.textContent = ''; if (!D.radios.length) ul.appendChild(h('li', { cls: 'tr-vacio', txt: 'No hay emisoras guardadas.' })); D.radios.forEach((r) => { const li = h('li', { cls: 'mu-fila' }); const b = h('button', { type: 'button', cls: 'mu-fila-main', on: () => { Q.poner([itemRadio(r)], 0); Mu.logro('radio_reproducida'); } }); b.innerHTML = '<span class="mu-ini" style="background:' + Mu.colorDe(r.nombre) + '">' + Mu.ico('radio') + '</span><span class="mu-t"><b>' + esc(r.nombre) + '</b><small>' + esc(r.url) + '</small></span>'; li.appendChild(b); li.appendChild(Mu.boton('trash', 'Borrar emisora ' + r.nombre, () => D.borrarRadio(r.id), '')); ul.appendChild(li); }); }; pintarR(); pr.appendChild(ul); raiz.appendChild(pr);
    /* podcasts */
    const pp = h('div', { cls: 'tr-panel' }); pp.appendChild(h('h2', { txt: 'Podcasts (RSS)' })); const pu = h('input', { type: 'url', id: 'mu-p-url', placeholder: 'https://…/feed.xml', 'aria-label': 'URL del feed RSS' });
    pp.appendChild(pu); const res = h('div', { id: 'mu-p-res', role: 'status' });
    const abrir = async (url, guardar) => {
      res.textContent = 'Descargando feed…';
      try { const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error('HTTP ' + r.status); const f = A.parseRSS(await r.text()); if (guardar) { await D.guardarPodcast({ nombre: f.titulo || new URL(url).hostname, url }); Mu.logro('podcast'); } pintarEpisodios(res, f, url); }
      catch (e) { res.textContent = ''; const n = h('div', { cls: 'tr-nota tr-mal' }); n.innerHTML = '<b>No se pudo leer el feed.</b> ' + esc(e.message === 'Failed to fetch' ? 'Casi seguro que el servidor no permite CORS (o hay un bloqueo de red/contenido mixto). Esta página no puede saltarse esa limitación.' : e.message) + ' Descarga los episodios y arrástralos a la biblioteca, o impórtalos aquí.'; n.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Importar archivos de audio', on: async () => { const fs = await B.elegirArchivos(); if (fs.length) A.importar(fs); } })])); res.appendChild(n); }
    };
    pp.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-p-add', txt: 'Leer y guardar feed', on: () => urlValida(pu.value.trim()) ? abrir(pu.value.trim(), true) : Mu.aviso('Escribe una URL http(s) válida.', 'error') }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Importar episodios (archivos)', on: async () => { const fs = await B.elegirArchivos(); if (fs.length) A.importar(fs); } })]));
    const lp = h('ul', { cls: 'mu-pistas', id: 'mu-podcasts' }); const pintarP = () => { lp.textContent = ''; D.podcasts.forEach((r) => { const li = h('li', { cls: 'mu-fila' }); const b = h('button', { type: 'button', cls: 'mu-fila-main', on: () => abrir(r.url, false) }); b.innerHTML = '<span class="mu-ini" style="background:' + Mu.colorDe(r.nombre) + '">' + Mu.ico('mic') + '</span><span class="mu-t"><b>' + esc(r.nombre) + '</b><small>' + esc(r.url) + '</small></span>'; li.appendChild(b); li.appendChild(Mu.boton('trash', 'Borrar podcast ' + r.nombre, () => D.borrarPodcast(r.id), '')); lp.appendChild(li); }); }; pintarP(); pp.appendChild(lp); pp.appendChild(res); raiz.appendChild(pp);
    const o1 = Mu.on('radios', () => { if (raiz.isConnected) pintarR(); }), o2 = Mu.on('podcasts', () => { if (raiz.isConnected) pintarP(); });
  };
  function pintarEpisodios(res, f, url) {
    res.textContent = ''; res.appendChild(h('h3', { txt: f.titulo || 'Podcast' })); const ul = h('ul', { cls: 'mu-pistas' });
    const items = f.episodios.slice(0, 40).map((e) => ({ id: 'p:' + g.Tr.hash(e.url), remoto: true, url: e.url, titulo: e.titulo, estacion: f.titulo, dur: e.dur }));
    items.forEach((it, i) => { const li = h('li', { cls: 'mu-fila' }); const b = h('button', { type: 'button', cls: 'mu-fila-main', on: () => { Q.poner(items, i); Mu.logro('podcast_reproducido'); } }); b.innerHTML = '<span class="mu-ini" style="background:' + Mu.colorDe(f.titulo || '') + '">' + Mu.ico('mic') + '</span><span class="mu-t"><b>' + esc(it.titulo) + '</b><small>' + esc(f.episodios[i].fecha || '') + '</small></span><span class="mu-d">' + (it.dur ? Mu.tiempo(it.dur) : '') + '</span>'; li.appendChild(b); ul.appendChild(li); });
    res.appendChild(items.length ? ul : h('p', { txt: 'El feed no trae episodios con audio.' }));
  }
})(window);
