/* Tablero kanban por estado y banco de ideas con puntuacion. */
(function () {
  var $ = U.$, esc = U.esc, A = App, M = Modelo, F = Fechas, VT = $('#v-tablero'), VI = $('#v-ideas');
  function tablero() {
    var pubs = A.filtradas();
    VT.innerHTML = '<div class="cab-cal"><h2>Tablero por estado</h2><span class="grow"></span><button class="btn pri peq" data-nuevo="idea">+ Nueva</button></div><p class="suave">Arrastra las tarjetas entre columnas, o usa «Mover a…».</p><div class="tablero">' + M.ESTADOS.map(function (e) {
      var l = pubs.filter(function (p) { return p.estado === e[0]; }).sort(function (a, b) { return (a.fecha || '9') < (b.fecha || '9') ? -1 : 1; });
      return '<section class="col-k" data-est="' + e[0] + '" aria-label="' + e[1] + '"><h3><span><i style="background:' + e[2] + '"></i>' + e[1] + '</span><span class="chip">' + l.length + '</span></h3>' + l.map(function (p) {
        return '<article class="tarj" draggable="true" data-id="' + p.id + '" style="--c:' + M.REDES[p.red].color + '"><b role="button" tabindex="0" data-abrir="' + p.id + '">' + esc(p.titulo) + '</b><span class="suave">' + M.REDES[p.red].nombre + (p.fecha ? ' · ' + A.fechaLegible(p.fecha) : '') + '</span><label class="solo-lectores" for="mv-' + p.id + '">Mover a</label><select id="mv-' + p.id + '" data-mover="' + p.id + '"><option value="">Mover a…</option>' + M.ESTADOS.filter(function (x) { return x[0] !== p.estado; }).map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select></article>';
      }).join('') + '<button class="btn peq" data-nuevo="' + e[0] + '">+ Añadir</button></section>';
    }).join('') + '</div>';
  }
  function cambiarEstado(id, est) { var p = A.pub(id); if (!p || p.estado === est) return; p.estado = est; A.guardar('pubs', p).then(function () { U.toast('Movida a ' + M.ESTADOS.filter(function (x) { return x[0] === est; })[0][1]); }); }
  var ideasForm = null;
  function ideas() {
    var l = A.est.ideas.slice().sort(function (a, b) { return Plan.puntuar(b) - Plan.puntuar(a); });
    var redes = Object.keys(M.REDES).map(function (k) { return '<option value="' + k + '">' + M.REDES[k].nombre + '</option>'; }).join('');
    var sl = function (id, et, v) { return '<label for="' + id + '">' + et + ': <b id="' + id + '-v">' + v + '</b></label><input type="range" id="' + id + '" min="1" max="5" value="' + v + '">'; };
    VI.innerHTML = '<div class="cols dos"><form class="panel" id="i-form"><h2>Nueva idea</h2><label for="i-tit">Idea</label><input type="text" id="i-tit" required><label for="i-red">Red</label><select id="i-red">' + redes + '</select><label for="i-fmt">Formato</label><select id="i-fmt">' + M.FORMATOS.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select><label for="i-nota">Notas</label><textarea id="i-nota" rows="2"></textarea>' +
      sl('i-imp', 'Impacto esperado', 3) + sl('i-esf', 'Esfuerzo', 3) + sl('i-enc', 'Encaje con tu marca', 3) + '<p class="suave">Puntuación = 40 % impacto + 35 % encaje + 25 % facilidad (esfuerzo invertido). Es una guía tuya, no una predicción.</p><button class="btn pri" type="submit">Guardar idea</button></form>' +
      '<div><div class="panel"><div class="fila"><h2 class="grow">Banco de ideas (' + l.length + ')</h2></div><ul class="lista">' + (l.map(function (i) {
        var pt = Plan.puntuar(i); return '<li class="item"><span class="pt' + (pt >= 70 ? ' alta' : '') + '" title="Puntuación">' + pt + '</span><div class="grow"><b>' + esc(i.titulo) + '</b><span class="suave">' + (M.REDES[i.red] ? M.REDES[i.red].nombre : '') + ' · ' + esc(i.formato || '') + (i.nota ? ' · ' + esc(i.nota) : '') + '</span></div><button class="btn peq" data-conv="' + i.id + '">→ Publicación</button><button class="btn peq mal" data-del="' + i.id + '" aria-label="Eliminar idea">✕</button></li>';
      }).join('') || '<li class="suave">Aún no hay ideas. Anota las tuyas o genera las de la semana.</li>') + '</ul></div>' +
      '<div class="panel"><h2>Ideas de la semana</h2><p class="suave">Elige el modo: reglas (sin IA, siempre disponible) o con IA si configuraste clave y modelo en Datos.</p><label for="ig-nicho">Nicho o tema general</label><input type="text" id="ig-nicho" placeholder="Ej.: cocina saludable"><label for="ig-redes">Redes</label><div class="fila" id="ig-redes">' + Object.keys(M.REDES).map(function (k) { return '<label class="chk"><input type="checkbox" value="' + k + '"' + (k === 'instagram' || k === 'tiktok' ? ' checked' : '') + '>' + M.REDES[k].nombre + '</label>'; }).join('') + '</div><div class="fila" style="margin-top:.7rem"><button class="btn" id="ig-reglas">Generar por reglas</button><button class="btn" id="ig-ia"' + (A.iaLista() ? '' : ' disabled') + '>Generar con IA</button></div><p class="suave" id="ig-est" role="status"></p></div></div></div>';
    ['i-imp', 'i-esf', 'i-enc'].forEach(function (id) { $('#' + id).oninput = function (e) { $('#' + id + '-v').textContent = e.target.value; }; });
    $('#i-form').onsubmit = function (e) { e.preventDefault(); A.guardar('ideas', { titulo: $('#i-tit').value.trim(), red: $('#i-red').value, formato: $('#i-fmt').value, nota: $('#i-nota').value.trim(), impacto: +$('#i-imp').value, esfuerzo: +$('#i-esf').value, encaje: +$('#i-enc').value }).then(function () { ideas(); U.toast('Idea guardada'); }); };
    $('#ig-reglas').onclick = function () { var n = $('#ig-nicho').value.trim(); if (!n) return U.toast('Escribe un nicho'); guardarIdeas(Plan.ideasSemana({ nicho: n, redes: redesSel(), semilla: Date.now() % 1000 })); };
    $('#ig-ia').onclick = genIdeasIA;
  }
  function redesSel() { return U.$$('#ig-redes input:checked').map(function (i) { return i.value; }); }
  function guardarIdeas(l) { Promise.all(l.map(function (i) { return A.guardar('ideas', i); })).then(function () { ideas(); U.toast(l.length + ' ideas añadidas al banco'); }); }
  async function genIdeasIA() {
    var n = $('#ig-nicho').value.trim(), redes = redesSel(); if (!n) return U.toast('Escribe un nicho'); var st = $('#ig-est'); st.textContent = 'Generando…'; $('#ig-ia').disabled = true;
    try {
      var m = Plantillas.armarMensajes('ideas', { tema: n, cantidad: 7, publico: 'Redes: ' + redes.join(', ') }, null);
      var r = await A.generarIA(m.sistema + '\nResponde SOLO con un arreglo JSON de objetos {"titulo":"","formato":"","red":"","nota":""} sin texto adicional.', m.mensajes[0].texto + '\nLas redes permitidas son: ' + Object.keys(M.REDES).join(', ') + '. Formatos: ' + M.FORMATOS.join(', ') + '.');
      var j = JSON.parse((r.texto.match(/\[[\s\S]*\]/) || ['[]'])[0]); if (!j.length) throw new Error('La IA no devolvió ideas en el formato esperado');
      guardarIdeas(j.slice(0, 10).map(function (i) { return { titulo: String(i.titulo || '').slice(0, 160), formato: M.FORMATOS.indexOf(i.formato) >= 0 ? i.formato : 'Video corto', red: M.REDES[i.red] ? i.red : (redes[0] || 'instagram'), nota: String(i.nota || '').slice(0, 200), impacto: 3, esfuerzo: 3, encaje: 3 }; }).filter(function (i) { return i.titulo; }));
    } catch (e) { st.textContent = e.name === 'SyntaxError' ? 'La IA no devolvió JSON válido. Intenta de nuevo o usa las reglas.' : e.message; $('#ig-ia').disabled = false; }
  }
  function iniciar() {
    VT.addEventListener('click', function (e) { var n = e.target.closest('[data-nuevo]'), a = e.target.closest('[data-abrir]'); if (n) Editor.abrir({ estado: n.dataset.nuevo, fecha: '' }, true); if (a) Editor.abrir(A.pub(a.dataset.abrir)); });
    VT.addEventListener('keydown', function (e) { var a = e.target.closest('[data-abrir]'); if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); Editor.abrir(A.pub(a.dataset.abrir)); } });
    VT.addEventListener('change', function (e) { if (e.target.dataset.mover && e.target.value) cambiarEstado(e.target.dataset.mover, e.target.value); });
    VT.addEventListener('dragstart', function (e) { var c = e.target.closest('.tarj'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; } });
    VT.addEventListener('dragover', function (e) { var c = e.target.closest('.col-k'); if (c) { e.preventDefault(); c.classList.add('sobre'); } });
    VT.addEventListener('dragleave', function (e) { var c = e.target.closest('.col-k'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('sobre'); });
    VT.addEventListener('drop', function (e) { var c = e.target.closest('.col-k'); if (!c) return; e.preventDefault(); cambiarEstado(e.dataTransfer.getData('text/plain'), c.dataset.est); });
    VI.addEventListener('click', function (e) {
      var c = e.target.closest('[data-conv]'), d = e.target.closest('[data-del]');
      if (c) { var i = A.est.ideas.filter(function (x) { return x.id === c.dataset.conv; })[0]; Editor.abrir({ titulo: i.titulo, red: i.red, formato: i.formato, notas: i.nota || '', estado: 'idea', fecha: '' }, true); A.idea = i.id; }
      if (d) A.borrar('ideas', d.dataset.del).then(ideas);
    });
  }
  A.vistas.tablero = tablero; A.vistas.ideas = ideas; A.tablero = { iniciar: iniciar };
})();
