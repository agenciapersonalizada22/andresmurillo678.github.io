/* Importar / exportar: JSON completo, carpeta de .md (zip simple), tareas de .ics. Puro (sin DOM): se prueba en Node. */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), F = G.Fechas || require('./fechas.js'), NL = G.NL || require('./nl.js'), Mo = G.Modelo || require('./modelo.js'), Z = G.Zip || require('./zip.js');
  var IO = {};

  /* ---------- JSON ---------- */
  IO.exportarJSON = function (store) { return JSON.stringify(store.volcado(), null, 1); };
  IO.importarJSON = function (store, texto, modo) {
    var d; try { d = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es JSON válido'); }
    if (!d || d.app !== 'notas' || !d.cols) throw new Error('El archivo no es una copia de Notas');
    return store.cargarVolcado(d, modo || 'fusionar');
  };

  /* ---------- Markdown ---------- */
  function seguro(s) { return (String(s || 'Sin título').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Sin título'); }
  function iso(ms) { return new Date(ms).toISOString(); }
  var EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
  function dataUrl(u) { var m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u || ''); if (!m) return null; return { tipo: m[1], datos: m[2] ? U.deB64(m[3]) : U.utf8(decodeURIComponent(m[3])) }; }
  function frase(r) {
    if (!r) return '';
    var n = r.cada || 1;
    if (r.tipo === 'dia') return n === 1 ? 'todos los días' : 'cada ' + n + ' días';
    if (r.tipo === 'semana') {
      if (r.dias && r.dias.length && n === 1) return 'cada ' + r.dias.map(function (d) { return F.DIAS[d]; }).join(' y ');
      return n === 1 ? 'cada semana' : 'cada ' + n + ' semanas';
    }
    if (r.tipo === 'mes') return r.diaMes === 'ultimo' ? 'el último día de cada mes' : r.diaMes ? 'el día ' + r.diaMes + ' de cada mes' : n === 1 ? 'cada mes' : 'cada ' + n + ' meses';
    return n === 1 ? 'cada año' : 'cada ' + n + ' años';
  }
  IO.lineaTarea = function (t) {
    var s = (t.estado === 'hecha' ? '- [x] ' : '- [ ] ') + t.titulo.replace(/\n/g, ' ');
    if (t.fecha) s += ' ' + t.fecha + (t.hora ? ' ' + t.hora : '');
    if (t.rep) s += ' ' + frase(t.rep);
    (t.etiquetas || []).forEach(function (e) { s += ' #' + e; });
    if (t.prioridad) s += ' !' + ['', 'baja', 'media', 'alta', 'urgente'][t.prioridad];
    if (t.estimado) s += ' ~' + t.estimado + 'm';
    return s;
  };
  IO.exportarMd = function (store) {
    var files = [], usados = {}, libs = {};
    store.lista('libretas').forEach(function (l) { libs[l.id] = l; });
    function ruta(l) { var p = [], k = 0; while (l && k++ < 20) { p.unshift(seguro(l.nombre)); l = libs[l.padre]; } return p.join('/'); }
    function unico(r) { var b = r, i = 2; while (usados[r.toLowerCase()]) r = b.replace(/\.md$/, ' (' + i++ + ').md'); usados[r.toLowerCase()] = 1; return r; }
    var adjIds = {};
    store.lista('notas', function (n) { return !n.papelera; }).forEach(function (n) {
      var dir = n.libreta && libs[n.libreta] ? ruta(libs[n.libreta]) : '', prof = dir ? dir.split('/').length + 1 : 1;
      var cuerpo = n.cif ? '*Nota bloqueada: su contenido está cifrado. Usa la copia JSON para conservarlo.*' : n.cuerpo || '';
      cuerpo = cuerpo.replace(/\]\(adj:([\w-]+)\)/g, function (_, id) { adjIds[id] = 1; var a = store.get('adjuntos', id); return '](' + '../'.repeat(prof) + 'adjuntos/' + id + '.' + (a && EXT[a.tipo] || 'png') + ')'; });
      var fm = ['---', 'id: ' + n.id, 'titulo: ' + JSON.stringify(n.titulo || ''), 'etiquetas: [' + (n.etiquetas || []).join(', ') + ']'];
      if (n.color) fm.push('color: ' + n.color); if (n.fijada) fm.push('fijada: true'); if (n.archivada) fm.push('archivada: true'); if (n.cif) fm.push('bloqueada: true');
      fm.push('creada: ' + iso(n.creada), 'modificada: ' + iso(n.modificada), '---', '');
      files.push({ ruta: unico('Notas/' + (dir ? dir + '/' : '') + seguro(n.titulo || cuerpo.split('\n')[0].replace(/^#+\s*/, '').slice(0, 50)) + '.md'), datos: fm.join('\n') + cuerpo + '\n' });
    });
    var listas = store.lista('listas').sort(function (a, b) { return a.orden - b.orden; });
    var grupos = [{ id: '', nombre: 'Bandeja' }].concat(listas);
    grupos.forEach(function (l) {
      var ts = store.lista('tareas', function (t) { return !t.papelera && t.lista === l.id && !t.padre; }).sort(function (a, b) { return a.orden - b.orden; });
      if (!ts.length) return;
      var s = '# ' + l.nombre + '\n\n';
      ts.forEach(function (t) {
        s += IO.lineaTarea(t) + '\n';
        if (t.notas) s += t.notas.split('\n').map(function (x) { return '  > ' + x; }).join('\n') + '\n';
        Mo.hijos(store, t.id).forEach(function (h) { s += '  ' + IO.lineaTarea(h) + '\n'; });
      });
      files.push({ ruta: unico('Tareas/' + seguro(l.nombre) + '.md'), datos: s });
    });
    Object.keys(adjIds).forEach(function (id) {
      var a = store.get('adjuntos', id), d = a && dataUrl(a.url); if (d) files.push({ ruta: 'adjuntos/' + id + '.' + (EXT[a.tipo] || 'png'), datos: d.datos });
    });
    files.push({ ruta: 'LEEME.txt', datos: 'Copia de Notas (' + new Date().toISOString() + ').\nNotas/ contiene un .md por nota con cabecera YAML simple; Tareas/ una lista por archivo con casillas "- [ ]".\nLas notas bloqueadas solo se conservan completas en la copia JSON.\n' });
    return files;
  };
  IO.exportarZip = function (store) { return Z.crear(IO.exportarMd(store)); };

  function frontMatter(txt) {
    var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(txt), fm = {};
    if (!m) return { fm: fm, cuerpo: txt };
    m[1].split(/\r?\n/).forEach(function (l) {
      var k = /^([\w-]+):\s*(.*)$/.exec(l); if (!k) return; var v = k[2];
      if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      else if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch (e) { v = v.slice(1, -1); } }
      else if (v === 'true') v = true;
      fm[k[1]] = v;
    });
    return { fm: fm, cuerpo: txt.slice(m[0].length) };
  }
  /* importa archivos [{ruta, datos}] (de un zip o de una carpeta). Crea registros en el almacen. Devuelve conteos */
  IO.importarMd = function (store, files, opts) {
    var res = { notas: 0, tareas: 0, listas: 0, libretas: 0, adjuntos: 0 }, hoy = (opts && opts.hoy) || F.hoy();
    var libs = {}, listas = {}, adj = {};
    store.lista('libretas').forEach(function (l) { libs[l.padre + '|' + l.nombre] = l.id; });
    store.lista('listas').forEach(function (l) { listas[l.nombre.toLowerCase()] = l.id; });
    function libreta(partes) {
      var padre = '';
      partes.forEach(function (p) {
        var k = padre + '|' + p;
        if (!libs[k]) { var l = Mo.libreta({ nombre: p, padre: padre }); store.poner('libretas', l); libs[k] = l.id; res.libretas++; }
        padre = libs[k];
      });
      return padre;
    }
    files.forEach(function (f) {
      var m = /(?:^|\/)adjuntos\/([\w-]+)\.(png|jpe?g|gif|webp|svg)$/i.exec(f.ruta);
      if (m) {
        var tipo = m[2].toLowerCase() === 'jpg' || m[2].toLowerCase() === 'jpeg' ? 'image/jpeg' : m[2].toLowerCase() === 'svg' ? 'image/svg+xml' : 'image/' + m[2].toLowerCase();
        var id = store.get('adjuntos', m[1]) ? U.id() : m[1]; adj[m[1]] = id;
        store.poner('adjuntos', { id: id, nombre: m[1] + '.' + m[2], tipo: tipo, url: 'data:' + tipo + ';base64,' + U.b64(f.datos), bytes: f.datos.length, creada: Date.now() }); res.adjuntos++;
      }
    });
    files.forEach(function (f) {
      if (!/\.(md|markdown|txt)$/i.test(f.ruta) || /LEEME\.txt$/.test(f.ruta)) return;
      var txt = typeof f.datos === 'string' ? f.datos : U.deUtf8(f.datos), partes = f.ruta.split('/'), nombre = partes.pop().replace(/\.[^.]+$/, '');
      if (partes[0] === 'Tareas' && /\.md$/i.test(f.ruta)) {
        var lid = (nombre === 'Bandeja' ? '' : listas[nombre.toLowerCase()]);
        if (lid == null) { var li = Mo.lista({ nombre: nombre }); store.poner('listas', li); lid = li.id; listas[nombre.toLowerCase()] = lid; res.listas++; }
        var ultimo = null;
        txt.split(/\r?\n/).forEach(function (l) {
          var m = /^(\s*)- \[([ xX])\]\s+(.*)$/.exec(l), q = /^\s+>\s?(.*)$/.exec(l);
          if (m) {
            var p = NL.parsear(m[3], { hoy: hoy, ahora: '00:00' }), padre = m[1].length >= 2 && ultimo ? ultimo.id : '';
            var t = Mo.tarea({ titulo: p.titulo || m[3], lista: lid, padre: padre, fecha: p.fecha, hora: p.hora, prioridad: p.prioridad, etiquetas: p.etiquetas, rep: p.rep, estimado: p.estimado, recordar: p.recordar,
              estado: /x/i.test(m[2]) ? 'hecha' : 'pendiente', hecha: /x/i.test(m[2]) ? Date.now() : 0, orden: Date.now() + res.tareas });
            var g = store.poner('tareas', t); res.tareas++; if (!padre) ultimo = g;
          } else if (q && ultimo) { store.set('tareas', ultimo.id, { notas: (ultimo.notas ? ultimo.notas + '\n' : '') + q[1] }); }
        });
        return;
      }
      var fmr = frontMatter(txt), fm = fmr.fm, cuerpo = fmr.cuerpo.replace(/^\s*\n/, '');
      cuerpo = cuerpo.replace(/\]\((?:\.\.\/)*adjuntos\/([\w-]+)\.\w+\)/g, function (_, id) { return '](adj:' + (adj[id] || id) + ')'; });
      var titulo = fm.titulo;
      if (titulo == null) { var h = /^#\s+(.+)\n?/.exec(cuerpo); if (h && !cuerpo.slice(0, h.index).trim()) { titulo = h[1].trim(); cuerpo = cuerpo.slice(h[0].length).replace(/^\n+/, ''); } else titulo = nombre; }
      var dirs = partes[0] === 'Notas' ? partes.slice(1) : partes, existe = fm.id && store.get('notas', fm.id);
      var n = Mo.nota({ id: fm.id && !existe ? String(fm.id) : U.id(), titulo: titulo, cuerpo: cuerpo.replace(/\n+$/, ''), etiquetas: Array.isArray(fm.etiquetas) ? fm.etiquetas.map(function (e) { return e.toLowerCase(); }) : [], color: fm.color || '', fijada: !!fm.fijada, archivada: !!fm.archivada,
        libreta: dirs.length ? libreta(dirs) : '', creada: fm.creada ? Date.parse(fm.creada) || Date.now() : Date.now(), modificada: fm.modificada ? Date.parse(fm.modificada) || Date.now() : Date.now() });
      store.poner('notas', n); res.notas++;
    });
    return res;
  };
  IO.importarZip = function (store, bytes, opts) { return Z.leer(bytes).then(function (files) { return IO.importarMd(store, files, opts); }); };

  /* ---------- iCalendar ---------- */
  function escI(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function desI(s) { return String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }
  function plegar(l) { var o = [], b = U.utf8(l); if (b.length <= 74) return l; var s = l; while (s.length > 73) { o.push(s.slice(0, 73)); s = ' ' + s.slice(73); } o.push(s); return o.join('\r\n'); }
  var DICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  function rrule(r) {
    if (!r) return '';
    var s = 'FREQ=' + { dia: 'DAILY', semana: 'WEEKLY', mes: 'MONTHLY', anio: 'YEARLY' }[r.tipo] + ';INTERVAL=' + (r.cada || 1);
    if (r.tipo === 'semana' && r.dias && r.dias.length) s += ';BYDAY=' + r.dias.map(function (d) { return DICS[d]; }).join(',');
    if (r.tipo === 'mes' && r.diaMes) s += ';BYMONTHDAY=' + (r.diaMes === 'ultimo' ? -1 : r.diaMes);
    if (r.fin) s += ';UNTIL=' + r.fin.replace(/-/g, ''); if (r.cuenta) s += ';COUNT=' + r.cuenta;
    return s;
  }
  var PRI_ICS = [0, 9, 5, 3, 1];
  IO.exportarICS = function (tareas, opts) {
    opts = opts || {}; var evento = opts.formato !== 'todo', sello = (opts.ahora || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Notas//ES', 'CALSCALE:GREGORIAN'];
    tareas.forEach(function (t) {
      if (t.papelera || !t.fecha) return;
      var d = t.fecha.replace(/-/g, ''), h = t.hora ? t.hora.replace(':', '') + '00' : '';
      L.push(evento ? 'BEGIN:VEVENT' : 'BEGIN:VTODO', 'UID:' + t.id + '@notas', 'DTSTAMP:' + sello, 'SUMMARY:' + escI(t.titulo));
      if (evento) {
        if (h) { var fin = F.sumMin(t.fecha, t.hora, t.estimado || 30); L.push('DTSTART:' + d + 'T' + h, 'DTEND:' + fin.fecha.replace(/-/g, '') + 'T' + fin.hora.replace(':', '') + '00'); }
        else L.push('DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + F.sumDias(t.fecha, 1).replace(/-/g, ''));
      } else L.push(h ? 'DUE:' + d + 'T' + h : 'DUE;VALUE=DATE:' + d);
      if (t.notas) L.push('DESCRIPTION:' + escI(t.notas));
      if (t.etiquetas && t.etiquetas.length) L.push('CATEGORIES:' + t.etiquetas.map(escI).join(','));
      if (t.prioridad) L.push('PRIORITY:' + PRI_ICS[t.prioridad]);
      if (t.rep) L.push('RRULE:' + rrule(t.rep));
      if (t.estado === 'hecha') L.push(evento ? 'STATUS:CONFIRMED' : 'STATUS:COMPLETED');
      if (t.recordar != null && h) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(t.titulo), 'TRIGGER:-PT' + t.recordar + 'M', 'END:VALARM');
      L.push(evento ? 'END:VEVENT' : 'END:VTODO');
    });
    L.push('END:VCALENDAR');
    return L.map(plegar).join('\r\n') + '\r\n';
  };
  function fechaICS(v, params) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
    if (!m) return null;
    if (!m[4]) return { fecha: m[1] + '-' + m[2] + '-' + m[3], hora: '' };
    if (m[7]) { var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])); return { fecha: F.fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()), hora: F.p2(d.getHours()) + ':' + F.p2(d.getMinutes()) }; }
    return { fecha: m[1] + '-' + m[2] + '-' + m[3], hora: m[4] + ':' + m[5] };
  }
  function reglaICS(v) {
    var p = {}; v.split(';').forEach(function (x) { var k = x.split('='); p[k[0].toUpperCase()] = k[1]; });
    var tipo = { DAILY: 'dia', WEEKLY: 'semana', MONTHLY: 'mes', YEARLY: 'anio' }[p.FREQ]; if (!tipo) return null;
    var r = { tipo: tipo, cada: +p.INTERVAL || 1 };
    if (p.BYDAY && tipo === 'semana') r.dias = p.BYDAY.split(',').map(function (d) { return DICS.indexOf(d.slice(-2)); }).filter(function (d) { return d >= 0; });
    if (p.BYMONTHDAY && tipo === 'mes') r.diaMes = +p.BYMONTHDAY === -1 ? 'ultimo' : +p.BYMONTHDAY;
    if (p.UNTIL) { var u = fechaICS(p.UNTIL.replace(/Z$/, '')); if (u) r.fin = u.fecha; }
    if (p.COUNT) r.cuenta = +p.COUNT;
    return r;
  }
  /* devuelve tareas listas para guardar (objetos sin id) */
  IO.importarICS = function (texto) {
    var lineas = String(texto).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/), out = [], cur = null, alarma = false;
    lineas.forEach(function (l) {
      if (/^BEGIN:(VEVENT|VTODO)$/i.test(l)) { cur = { titulo: '', notas: '', fecha: '', hora: '', prioridad: 0, etiquetas: [], rep: null, estado: 'pendiente', recordar: null, _ics: true }; return; }
      if (/^END:(VEVENT|VTODO)$/i.test(l)) { if (cur && (cur.titulo || cur.fecha)) { delete cur._ics; out.push(cur); } cur = null; return; }
      if (!cur) return;
      if (/^BEGIN:VALARM/i.test(l)) { alarma = true; return; } if (/^END:VALARM/i.test(l)) { alarma = false; return; }
      var i = l.indexOf(':'); if (i < 0) return;
      var nom = l.slice(0, i), val = l.slice(i + 1), base = nom.split(';')[0].toUpperCase();
      if (alarma) { if (base === 'TRIGGER') { var m = /^-?PT?(?:(\d+)H)?(?:(\d+)M)?/i.exec(val.replace(/^-P/, '-PT').replace('PTT', 'PT')); if (m && /^-/.test(val)) cur.recordar = (+m[1] || 0) * 60 + (+m[2] || 0); } return; }
      if (base === 'SUMMARY') cur.titulo = desI(val);
      else if (base === 'DESCRIPTION') cur.notas = desI(val);
      else if (base === 'DTSTART' || base === 'DUE') { var f = fechaICS(val); if (f && (base === 'DUE' || !cur.fecha)) { cur.fecha = f.fecha; cur.hora = f.hora; } }
      else if (base === 'CATEGORIES') cur.etiquetas = val.split(',').map(function (x) { return desI(x).trim().toLowerCase(); }).filter(Boolean);
      else if (base === 'PRIORITY') { var p = +val; cur.prioridad = !p ? 0 : p <= 2 ? 4 : p <= 4 ? 3 : p === 5 ? 2 : 1; }
      else if (base === 'RRULE') cur.rep = reglaICS(val);
      else if (base === 'STATUS') { if (/COMPLETED/i.test(val)) cur.estado = 'hecha'; }
    });
    return out;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = IO; else G.IO = IO;
})(typeof window !== 'undefined' ? window : globalThis);
