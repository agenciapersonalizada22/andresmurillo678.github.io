/* Dialogo de edicion de una publicacion: general, guion por escenas, checklist y metricas. */
window.Editor = (function () {
  var $ = U.$, esc = U.esc, A = App, M = Modelo, F = Fechas, ed = null, nueva = false, tab = 'general', ctl = null;
  var ZONAS = ['America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Santo_Domingo', 'Europe/Madrid', 'Europe/London', 'UTC'];
  var TABS = [['general', 'General'], ['guion', 'Guion'], ['lista', 'Lista'], ['metricas', 'Métricas']];
  function opt(l, v) { return l.map(function (x) { var val = Array.isArray(x) ? x[0] : x, tx = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(tx) + '</option>'; }).join(''); }
  function abrir(base, esNueva) {
    ed = JSON.parse(JSON.stringify(M.nuevaPub(base))); nueva = !!esNueva || !ed.id; tab = 'general';
    if (!ed.fecha && nueva && !(base && base.fecha === '')) ed.fecha = A.cal.ref;
    if (nueva && (!base || base.recordar === undefined)) ed.recordar = A.est.ajustes.recordarMin || 0; pintar(); U.abrirDialogo($('#dlg-pub'));
  }
  function recojerGeneral() {
    var d = $('#dlg-pub'); if (!$('#e-titulo')) return;
    ed.titulo = $('#e-titulo').value.trim(); ed.red = $('#e-red').value; ed.formato = $('#e-formato').value; ed.estado = $('#e-estado').value; ed.fecha = $('#e-fecha').value; ed.hora = $('#e-hora').value || '09:00'; ed.zona = $('#e-zona').value.trim();
    ed.campana = $('#e-campana').value; ed.serie = $('#e-serie').value; ed.tema = $('#e-tema').value.trim(); ed.texto = $('#e-texto').value; ed.recordar = +$('#e-rec').value; ed.enlace = $('#e-enlace').value.trim(); ed.notas = $('#e-notas').value;
    var r = ed.rec = ed.rec || {}; r.freq = $('#e-freq').value; r.cada = Math.max(1, +$('#e-cada').value || 1); r.hasta = $('#e-hasta').value; r.cuenta = +$('#e-cuenta').value || 0;
    r.dias = U.$$('#e-dias input:checked', d).map(function (i) { return +i.value; });
  }
  function pintar() {
    var d = $('#dlg-pub');
    d.innerHTML = '<h2 id="t-pub">' + (nueva ? 'Nueva publicación' : 'Editar publicación') + '</h2><div class="tabs-int" role="tablist">' + TABS.map(function (t) { return '<button role="tab" type="button" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="e-cuerpo"></div>' +
      '<div class="pie-dlg"><button class="btn pri" id="e-guardar">Guardar</button>' + (nueva ? '' : '<button class="btn" id="e-dup">Duplicar</button><button class="btn mal" id="e-borrar">Eliminar</button>') + '<span class="grow"></span><button class="btn" id="e-cerrar">Cerrar</button></div>';
    cuerpo();
  }
  function cuerpo() {
    var c = $('#e-cuerpo'); U.$$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab); });
    c.innerHTML = { general: tGeneral, guion: tGuion, lista: tLista, metricas: tMetricas }[tab]();
    if (tab === 'general') contador(); if (tab === 'guion') totales();
  }
  function tGeneral() {
    var r = ed.rec || {}, camps = A.est.campanas.filter(function (x) { return x.tipo !== 'serie'; }), series = A.est.campanas.filter(function (x) { return x.tipo === 'serie'; });
    var zonas = ZONAS.concat(ed.zona && ZONAS.indexOf(ed.zona) < 0 ? [ed.zona] : []);
    return '<div class="cols iguales"><div><label for="e-titulo">Título</label><input type="text" id="e-titulo" value="' + esc(ed.titulo) + '">' +
      '<div class="fila"><div class="grow"><label for="e-red">Red social</label><select id="e-red">' + opt(Object.keys(M.REDES).map(function (k) { return [k, M.REDES[k].nombre]; }), ed.red) + '</select></div><div class="grow"><label for="e-formato">Formato</label><select id="e-formato">' + opt(M.FORMATOS, ed.formato) + '</select></div></div>' +
      '<label for="e-estado">Estado</label><select id="e-estado">' + opt(M.ESTADOS.map(function (e) { return [e[0], e[1]]; }), ed.estado) + '</select>' +
      '<div class="fila"><div class="grow"><label for="e-fecha">Fecha</label><input type="date" id="e-fecha" value="' + esc(ed.fecha) + '"></div><div class="grow"><label for="e-hora">Hora</label><input type="time" id="e-hora" value="' + esc(ed.hora) + '"></div></div>' +
      '<div class="fila" style="margin-top:.4rem"><button type="button" class="btn peq" data-d="-1">−1 día</button><button type="button" class="btn peq" data-d="1">+1 día</button><button type="button" class="btn peq" data-d="7">+1 semana</button><button type="button" class="btn peq" data-d="hoy">Hoy</button></div>' +
      '<div id="e-sug" class="fila" style="margin-top:.4rem"></div>' +
      '<label for="e-zona">Zona horaria (vacío = la de tus ajustes: ' + esc(A.est.ajustes.zona) + ')</label><input type="text" id="e-zona" list="dl-zonas" value="' + esc(ed.zona) + '" placeholder="Ej.: America/Mexico_City"><datalist id="dl-zonas">' + zonas.map(function (z) { return '<option value="' + z + '"></option>'; }).join('') + '</datalist><p class="suave" id="e-conv"></p>' +
      '<label for="e-campana">Campaña</label><select id="e-campana"><option value="">Ninguna</option>' + opt(camps.map(function (x) { return [x.id, x.nombre]; }), ed.campana) + '</select>' +
      '<label for="e-serie">Serie</label><select id="e-serie"><option value="">Ninguna</option>' + opt(series.map(function (x) { return [x.id, x.nombre]; }), ed.serie) + '</select></div>' +
      '<div><label for="e-tema">Tema / pilar</label><input type="text" id="e-tema" value="' + esc(ed.tema) + '"><label for="e-texto">Texto de la publicación</label><textarea id="e-texto" rows="6">' + esc(ed.texto) + '</textarea><p class="suave" id="e-cont"></p>' +
      '<label for="e-rec">Recordatorio</label><select id="e-rec">' + opt(M.RECORDATORIOS, ed.recordar || 0) + '</select>' +
      '<fieldset class="modo" style="border:1px solid var(--borde);border-radius:8px;margin-top:.7rem"><legend class="suave">Repetir</legend><div class="fila"><select id="e-freq" style="width:auto">' + opt([['ninguna', 'No se repite'], ['diaria', 'Diaria'], ['semanal', 'Semanal'], ['mensual', 'Mensual']], r.freq || 'ninguna') + '</select><span>cada</span><input type="number" id="e-cada" min="1" max="30" value="' + (r.cada || 1) + '" style="width:70px"></div>' +
      '<div id="e-dias" class="fila" style="margin-top:.4rem">' + F.DIAS.map(function (n, i) { return '<label class="chk"><input type="checkbox" value="' + i + '"' + ((r.dias || []).indexOf(i) >= 0 ? ' checked' : '') + '>' + n + '</label>'; }).join('') + '</div>' +
      '<div class="fila"><div class="grow"><label for="e-hasta">Hasta</label><input type="date" id="e-hasta" value="' + esc(r.hasta || '') + '"></div><div class="grow"><label for="e-cuenta">Nº de veces (0 = sin límite)</label><input type="number" id="e-cuenta" min="0" value="' + (r.cuenta || 0) + '"></div></div></fieldset>' +
      '<label for="e-enlace">Enlace de la publicación</label><input type="url" id="e-enlace" value="' + esc(ed.enlace) + '"><label for="e-notas">Notas</label><textarea id="e-notas" rows="2">' + esc(ed.notas) + '</textarea></div></div>';
  }
  function sugerencias() {
    var el = $('#e-sug'); if (!el) return; var red = $('#e-red').value;
    el.innerHTML = '<span class="suave">Horarios sugeridos (editables):</span>' + A.horarios(red).map(function (h, i) { return '<button type="button" class="btn peq" data-sug="' + i + '">' + F.DIAS[h[0]] + ' ' + h[1] + '</button>'; }).join('');
  }
  function conversion() {
    var el = $('#e-conv'); if (!el) return; var f = $('#e-fecha').value, h = $('#e-hora').value || '09:00', z = $('#e-zona').value.trim() || A.est.ajustes.zona;
    if (!f) { el.textContent = ''; return; } if (!F.zonaValida(z)) { el.textContent = 'Zona horaria no válida.'; return; }
    var loc = F.zonaLocal(), c = F.convertir(f, h, z, loc); el.textContent = z !== loc ? 'En tu zona del dispositivo (' + loc + '): ' + c.replace('T', ' ') : 'Coincide con la zona de tu dispositivo.';
  }
  function contador() {
    var el = $('#e-cont'); if (!el) return; var red = $('#e-red').value, t = $('#e-texto').value, k = M.REDES[red].cont, c = Contadores.contar(k, t);
    el.textContent = c.n + ' / ' + c.max + ' caracteres (' + Contadores.REDES[k].nombre + ', límite orientativo)' + (c.avisos.length ? ' · ' + c.avisos.join('. ') : ''); el.style.color = c.estado === 'excede' ? 'var(--mal)' : '';
    sugerencias(); conversion();
  }
  function tGuion() {
    var h = '<div class="fila"><button type="button" class="btn peq" id="g-reglas">Generar por reglas</button><button type="button" class="btn peq" id="g-ia"' + (A.iaLista() ? '' : ' disabled title="Configura clave y modelo en Datos y ajustes (la clave se guarda en el Escritor)"') + '>Generar con IA</button><button type="button" class="btn peq" id="g-cancel" style="display:none">Cancelar</button><button type="button" class="btn peq" id="g-add">+ Escena</button><button type="button" class="btn peq" id="g-tele">▶ Teleprompter</button></div><p class="suave" id="g-est">Se usa el tema/título como base. Duración objetivo:' + ' <input type="number" id="g-dur" value="30" min="10" max="600" style="width:80px;min-height:32px"> s</p><div class="aviso">Revisa el guion generado: puede tener errores o datos inventados.</div><p id="g-tot" style="font-weight:700"></p>';
    h += (ed.escenas || []).map(function (s, i) {
      return '<div class="escena" data-i="' + i + '"><div class="fila"><select data-f="tipo" aria-label="Tipo de escena" style="width:auto">' + opt(M.TIPOS_ESCENA, s.tipo) + '</select><label class="chk" style="margin:0">Duración <input type="number" data-f="seg" min="1" value="' + (s.seg || 5) + '" style="width:80px"> s</label><span class="grow"></span><button type="button" class="btn peq" data-m="-1" aria-label="Subir">↑</button><button type="button" class="btn peq" data-m="1" aria-label="Bajar">↓</button><button type="button" class="btn peq mal" data-x aria-label="Eliminar escena">✕</button></div>' +
        '<label>Cámara <input type="text" data-f="camara" value="' + esc(s.camara) + '"></label><label>Texto / voz <textarea data-f="texto" rows="2">' + esc(s.texto) + '</textarea></label></div>';
    }).join('') || '<p class="suave">Sin escenas. Genera una por reglas o añade manualmente.</p>';
    h += '<details><summary>Importar guion en texto (formato del Escritor)</summary><textarea id="g-imp" rows="4" placeholder="ESCENA 1 | 0:00-0:05 | GANCHO&#10;CÁMARA: ...&#10;TEXTO: ..."></textarea><button type="button" class="btn peq" id="g-imp-b" style="margin-top:.4rem">Importar</button></details>';
    return h;
  }
  function totales() { var el = $('#g-tot'); if (!el) return; var d = M.duracionGuion(ed.escenas), p = M.palabrasGuion(ed.escenas); el.textContent = 'Duración total estimada: ' + M.mmss(d) + ' · ' + (ed.escenas || []).length + ' escenas · ' + p + ' palabras' + (d ? ' (' + (p / d).toFixed(1) + ' palabras/s; hablar suele rondar 2–3)' : ''); }
  function tLista() {
    var l = M.CHECKLIST[ed.red] || []; ed.checklist = ed.checklist || {};
    var hechos = l.filter(function (x) { return ed.checklist[x]; }).length;
    return '<p>Checklist para <b>' + esc(M.REDES[ed.red].nombre) + '</b>: ' + hechos + '/' + l.length + '</p><div class="barra-p"><i style="width:' + (l.length ? hechos / l.length * 100 : 0) + '%"></i></div><ul class="lista" style="margin-top:.7rem">' + l.map(function (x, i) { return '<li class="item"><label class="chk" style="margin:0"><input type="checkbox" data-ck="' + i + '"' + (ed.checklist[x] ? ' checked' : '') + '> ' + esc(x) + '</label></li>'; }).join('') + '</ul><p class="suave">Los límites y requisitos de cada plataforma cambian: confírmalos antes de publicar.</p>';
  }
  function tMetricas() {
    var m = ed.metricas = ed.metricas || {}, e = Metricas.engagement(ed);
    return '<p class="suave">Escribe a mano las cifras que veas en la plataforma. No se consultan automáticamente.</p><div class="fila">' + Metricas.CLAVES.map(function (k) { return '<div style="width:30%;min-width:110px"><label for="m-' + k + '">' + k[0].toUpperCase() + k.slice(1) + '</label><input type="number" min="0" id="m-' + k + '" data-met="' + k + '" value="' + (m[k] || 0) + '"></div>'; }).join('') + '</div><p>Interacción: <b id="m-eng">' + (e == null ? '—' : e.toFixed(2) + ' %') + '</b> (likes + comentarios + compartidos) / vistas</p>';
  }
  function guardar() {
    recojerGeneral();
    if (!ed.titulo) { tab = 'general'; cuerpo(); return U.toast('Escribe un título'); }
    if (ed.zona && !F.zonaValida(ed.zona)) { tab = 'general'; cuerpo(); return U.toast('Zona horaria no válida'); }
    if (ed.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(ed.fecha)) return U.toast('Fecha no válida');
    A.guardar('pubs', ed).then(function () { U.cerrarDialogo($('#dlg-pub')); U.toast('Publicación guardada'); });
  }
  function leerEscena(el) { var s = ed.escenas[+el.closest('.escena').dataset.i]; s[el.dataset.f] = el.dataset.f === 'seg' ? Math.max(1, +el.value || 1) : el.value; totales(); }
  async function genIA() {
    recojerGeneral(); var tema = ed.titulo || ed.tema; if (!tema) return U.toast('Escribe un título o tema primero (pestaña General)');
    var m = Plantillas.armarMensajes('guion', { tema: tema, duracion: +$('#g-dur').value || 30 }, null); ctl = new AbortController(); $('#g-ia').disabled = true; $('#g-cancel').style.display = ''; $('#g-est').textContent = 'Generando con IA…';
    try { var r = await A.generarIA(m.sistema, m.mensajes[0].texto, null, ctl.signal), g = Exportar.parsearGuion(r.texto); if (!g.escenas.length) throw new Error('La IA no devolvió el formato esperado de escenas. Intenta de nuevo.'); ed.escenas = M.escenasDesdeGuion(g); cuerpo(); U.toast('Guion generado: revísalo antes de grabar'); }
    catch (e) { var s = $('#g-est'); if (s) s.textContent = e.tipo === 'cancelado' ? 'Cancelado.' : e.message; } finally { ctl = null; var b = $('#g-ia'); if (b) b.disabled = false; var c = $('#g-cancel'); if (c) c.style.display = 'none'; }
  }
  function iniciar() {
    var d = $('#dlg-pub');
    d.addEventListener('click', function (e) {
      var t = e.target, tb = t.closest('[data-tab]'), id = t.id;
      if (tb) { if (tab === 'general') recojerGeneral(); tab = tb.dataset.tab; cuerpo(); return; }
      if (id === 'e-cerrar') U.cerrarDialogo(d); else if (id === 'e-guardar') guardar();
      else if (id === 'e-dup') { var c = JSON.parse(JSON.stringify(ed)); delete c.id; delete c._t; delete c._creado; c.titulo += ' (copia)'; c.estado = 'idea'; abrir(c, true); }
      else if (id === 'e-borrar' && confirm('¿Eliminar esta publicación?')) A.borrar('pubs', ed.id).then(function () { U.cerrarDialogo(d); });
      var dd = t.dataset.d; if (dd) { var f = $('#e-fecha'); f.value = dd === 'hoy' ? F.hoy() : F.sumarDias(f.value || F.hoy(), +dd); conversion(); }
      if (t.dataset.sug != null) { var h = A.horarios($('#e-red').value)[+t.dataset.sug], base = $('#e-fecha').value || F.hoy(), n = 0; while (F.dow(base) !== h[0] && n++ < 7) base = F.sumarDias(base, 1); $('#e-fecha').value = base; $('#e-hora').value = h[1]; conversion(); }
      if (id === 'g-reglas') { recojerGeneral(); var tema = ed.titulo || ed.tema; if (!tema) return U.toast('Escribe un título o tema primero'); var txt = Plantillas.generarReglas('guion', { tema: tema, duracion: +$('#g-dur').value || 30 }); ed.escenas = M.escenasDesdeGuion(Exportar.parsearGuion(txt)); cuerpo(); U.toast('Estructura por reglas (sin IA): complétala con tu contenido'); }
      if (id === 'g-ia') genIA(); if (id === 'g-cancel' && ctl) ctl.abort();
      if (id === 'g-add') { ed.escenas.push({ id: 'e' + Date.now().toString(36), tipo: 'DESARROLLO', camara: '', texto: '', seg: 5 }); cuerpo(); }
      if (id === 'g-tele') { recojerGeneral(); U.cerrarDialogo(d); Tele.abrir(ed, function () { tab = 'guion'; pintar(); U.abrirDialogo(d); }); }
      if (id === 'g-imp-b') { var g = Exportar.parsearGuion($('#g-imp').value); if (!g.escenas.length) return U.toast('No se detectaron escenas'); ed.escenas = M.escenasDesdeGuion(g); cuerpo(); }
      var sc = t.closest('.escena'); if (sc) { var i = +sc.dataset.i; if (t.dataset.x != null) { ed.escenas.splice(i, 1); cuerpo(); } else if (t.dataset.m) { var j = i + +t.dataset.m; if (j >= 0 && j < ed.escenas.length) { var a = ed.escenas[i]; ed.escenas[i] = ed.escenas[j]; ed.escenas[j] = a; cuerpo(); } } }
    });
    d.addEventListener('input', function (e) {
      var t = e.target; if (t.id === 'e-texto' || t.id === 'e-red') { if (t.id === 'e-red') { ed.red = t.value; } contador(); }
      if (t.id === 'e-fecha' || t.id === 'e-hora' || t.id === 'e-zona') conversion();
      if (t.dataset.f) leerEscena(t);
    });
    d.addEventListener('change', function (e) {
      var t = e.target; if (t.dataset.ck != null) { var it = M.CHECKLIST[ed.red][+t.dataset.ck]; ed.checklist[it] = t.checked; cuerpo(); }
      if (t.dataset.met) { ed.metricas[t.dataset.met] = Math.max(0, +t.value || 0); var en = Metricas.engagement(ed); $('#m-eng').textContent = en == null ? '—' : en.toFixed(2) + ' %'; }
      if (t.dataset.f === 'tipo') leerEscena(t);
    });
    d.addEventListener('close', function () { if (ctl) ctl.abort(); });
  }
  return { abrir: abrir, iniciar: iniciar };
})();
