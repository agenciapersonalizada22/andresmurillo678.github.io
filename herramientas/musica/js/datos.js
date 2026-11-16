/* Almacenamiento: IndexedDB 'musica' (ligero, sincronizable: indice de pistas, listas, proyectos, radios, podcasts, progreso) e IndexedDB 'musica_local'
   (pesado y solo de este dispositivo: portadas, letras, manejadores de archivo, copias offline, muestras, grabaciones). Ajustes: localStorage musica_ajustes_dispositivo. window.MuDatos */
(function (g) {
  'use strict';
  const A = g.Almacen, L = A.crear('musica'), P = A.crear('musica_local'), ls = g.Tr.ls;
  const D = g.MuDatos = { ID: 'musica', alm: L, loc: P, COLS: ['pistas', 'listas', 'proyectos', 'radios', 'podcasts', 'progreso'], pistas: new Map(), listas: [], radios: [], podcasts: [], proyectos: [] };
  const DEF = { crossfade: 0, sinPausas: true, normalizar: false, objetivoRG: -16, evitarClip: true, preamp: 0, eqOn: true, eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], eqPreset: 'Plano', comp: false, compUmbral: -24, compRatio: 4, limitador: true,
    vel: 1, tono: 0, vol: 0.8, visual: 'espectro', vizOn: true, fps: 30, escala: 1, bajoConsumo: false, calidad: 'interactive', notacion: 'latina', a4: 440, reducirMov: false, textoGrande: false, altoContraste: false,
    repetir: 'off', aleatorio: false, aleatorioInteligente: true, ordenBib: 'titulo', pausarEnSegundoPlano: true, bpm: 100, vozVol: 0.8 };
  D.ajustes = () => { let o = {}; try { o = JSON.parse(ls('musica_ajustes_dispositivo') || '{}') || {}; } catch (e) {} return Object.assign({}, DEF, o); };
  D.ajuste = (k, v) => { let o = {}; try { o = JSON.parse(ls('musica_ajustes_dispositivo') || '{}') || {}; } catch (e) {} if (v === undefined) return k in o ? o[k] : DEF[k]; o[k] = v; ls('musica_ajustes_dispositivo', JSON.stringify(o)); g.Mu && g.Mu.emit('ajuste', k, v); return v; };
  D.defecto = DEF;
  D.clave = (p) => (p.albumArtista || p.artista || '') + '|' + (p.album || '');
  D.idArchivo = (f) => g.Tr.hash(f.name + '|' + f.size + '|' + (f.lastModified || 0)) + g.Tr.hash(String(f.size) + f.name);
  /* ---- carga inicial en memoria ---- */
  D.cargar = async function () {
    await Promise.all([L.listo, P.listo]);
    (await L.lista('pistas')).forEach((p) => D.pistas.set(p.id, p));
    D.listas = (await L.lista('listas')).sort((a, b) => (a._creado || 0) - (b._creado || 0));
    D.radios = (await L.lista('radios')).sort((a, b) => (a._creado || 0) - (b._creado || 0));
    D.podcasts = (await L.lista('podcasts')).sort((a, b) => (a._creado || 0) - (b._creado || 0));
    D.proyectos = (await L.lista('proyectos')).sort((a, b) => (b._t || 0) - (a._t || 0));
  };
  /* tras sincronizar desde la cuenta se recarga el indice */
  D.recargar = async () => { D.pistas.clear(); await D.cargar(); g.Mu.emit('datos'); };
  D.guardarPista = async (p) => { await L.set('pistas', p); D.pistas.set(p.id, p); return p; };
  D.borrarPista = async (id) => {
    await L.borrar('pistas', id); D.pistas.delete(id); for (const c of ['letras', 'manejadores', 'copias']) await P.borrar(c, id);
    for (const l of D.listas) if (l.pistas.includes(id)) { l.pistas = l.pistas.filter((x) => x !== id); await L.set('listas', l); }
  };
  D.nuevaLista = async (nombre, pistas) => { const l = await L.set('listas', { nombre: nombre || 'Lista nueva', pistas: pistas || [] }); D.listas.push(l); g.Mu.emit('listas'); return l; };
  D.guardarLista = async (l) => { await L.set('listas', l); g.Mu.emit('listas'); };
  D.borrarLista = async (id) => { await L.borrar('listas', id); D.listas = D.listas.filter((l) => l.id !== id); g.Mu.emit('listas'); };
  D.guardarRadio = async (r) => { const x = await L.set('radios', r); if (!D.radios.find((y) => y.id === x.id)) D.radios.push(x); g.Mu.emit('radios'); return x; };
  D.borrarRadio = async (id) => { await L.borrar('radios', id); D.radios = D.radios.filter((r) => r.id !== id); g.Mu.emit('radios'); };
  D.guardarPodcast = async (r) => { const x = await L.set('podcasts', r); if (!D.podcasts.find((y) => y.id === x.id)) D.podcasts.push(x); g.Mu.emit('podcasts'); return x; };
  D.borrarPodcast = async (id) => { await L.borrar('podcasts', id); D.podcasts = D.podcasts.filter((r) => r.id !== id); g.Mu.emit('podcasts'); };
  D.guardarProyecto = async (p) => { const x = await L.set('proyectos', p); const i = D.proyectos.findIndex((y) => y.id === x.id); if (i < 0) D.proyectos.unshift(x); else D.proyectos[i] = x; g.Mu.emit('proyectos'); return x; };
  D.borrarProyecto = async (id) => { await L.borrar('proyectos', id); D.proyectos = D.proyectos.filter((r) => r.id !== id); g.Mu.emit('proyectos'); };
  /* progreso del entrenador de oido, etc. (un unico documento pequeno) */
  D.progreso = async () => (await L.get('progreso', 'oido')) || { id: 'oido', aciertos: 0, total: 0, racha: 0, mejor: 0, porTipo: {} };
  D.guardarProgreso = (p) => L.set('progreso', p);
  D.borrarTodo = async () => {
    for (const c of D.COLS) for (const r of await L.lista(c)) await L.borrar(c, r.id);
    for (const c of ['portadas', 'letras', 'manejadores', 'carpetas', 'copias', 'muestras', 'grabaciones']) for (const r of await P.lista(c)) await P.borrar(c, r.id);
    D.pistas.clear(); D.listas = []; D.radios = []; D.podcasts = []; D.proyectos = [];
    ['musica_ajustes_dispositivo', 'musica_cola_dispositivo'].forEach((k) => ls(k, null)); g.Mu.emit('datos');
  };
  D.exportar = async () => { const o = { app: 'musica', version: 1, fecha: new Date().toISOString() }; for (const c of D.COLS) o[c] = (await L.lista(c)).map((r) => { const x = Object.assign({}, r); return x; }); return o; };
  D.importar = async (o) => {
    if (!o || o.app !== 'musica') throw new Error('Archivo no valido'); let n = 0;
    for (const c of D.COLS) for (const r of (o[c] || [])) { if (r && r.id) { const t = r._t; await L.set(c, r); n++; } }
    await D.recargar(); return n;
  };
})(window);
