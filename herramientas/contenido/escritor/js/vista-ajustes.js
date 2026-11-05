(function () {
  var $ = U.$, esc = U.esc, A = App;
  var SEG = 'Aviso de seguridad: cualquier clave guardada en una página web puede ser leída por los scripts de esa misma página. Crea una clave dedicada con límite de gasto en el panel del proveedor, no la compartas y bórrala si dejas de usarla. La clave se queda solo en este dispositivo y solo se envía al proveedor que elijas, directo desde tu navegador.';
  function ajustes() {
    var s = A.est.ajustes, v = $('#v-ajustes');
    v.innerHTML = '<div class="cols iguales"><div class="panel"><h2>Proveedor de IA</h2><div class="aviso">' + SEG + '</div>' +
      '<label for="a-prov">Proveedor activo</label><select id="a-prov">' + Object.keys(IA.PROVEEDORES).map(function (p) { return '<option value="' + p + '"' + (p === s.proveedor ? ' selected' : '') + '>' + IA.PROVEEDORES[p].nombre + '</option>'; }).join('') + '</select>' +
      Object.keys(IA.PROVEEDORES).map(function (p) {
        var cfg = IA.PROVEEDORES[p], tiene = A.claves.tiene(p), cif = A.claves.cifrada(p), t = s.tarifas[p] || {};
        return '<fieldset class="clave-prov" data-p="' + p + '"><legend><b>' + cfg.nombre + '</b> · ' + (tiene ? (cif ? (A.claves.desbloqueada(p) ? 'clave cifrada (desbloqueada)' : 'clave cifrada') : 'clave guardada sin cifrar') : 'sin clave') + '</legend>' +
          '<label for="k-' + p + '">Clave de API (créala en ' + cfg.consola + ')</label><input type="password" id="k-' + p + '" autocomplete="off" placeholder="' + (tiene ? 'Ya hay una clave guardada; escribe otra para reemplazarla' : 'Pega tu clave') + '">' +
          '<label for="pw-' + p + '">Contraseña para cifrarla (opcional, recomendada)</label><input type="password" id="pw-' + p + '" autocomplete="new-password" placeholder="Sin contraseña se guarda en texto plano en este dispositivo">' +
          '<label for="mo-' + p + '">Modelo (nombre exacto, campo libre)</label><input type="text" id="mo-' + p + '" list="dl-' + p + '" value="' + esc(s.modelos[p] || '') + '" placeholder="Ej.: ' + cfg.ejemplo + '"><datalist id="dl-' + p + '"><option value="' + cfg.ejemplo + '"></option></datalist><p class="suave">El ejemplo puede quedar desactualizado: usa el nombre vigente de la documentación del proveedor.</p>' +
          '<div class="fila"><div class="grow"><label for="te-' + p + '">Tarifa entrada (USD por millón de tokens)</label><input type="number" id="te-' + p + '" min="0" step="any" value="' + esc(t.entrada || '') + '"></div><div class="grow"><label for="ts-' + p + '">Tarifa salida (USD por millón)</label><input type="number" id="ts-' + p + '" min="0" step="any" value="' + esc(t.salida || '') + '"></div></div>' +
          '<p class="suave">Las tarifas no vienen precargadas: copia las de tu proveedor. El costo mostrado es solo una estimación.</p>' +
          '<div class="fila"><button class="btn pri peq" data-g="' + p + '">Guardar</button>' + (cif && !A.claves.desbloqueada(p) ? '<button class="btn peq" data-des="' + p + '">Desbloquear</button>' : '') + (tiene ? '<button class="btn peq mal" data-b="' + p + '">Borrar clave</button>' : '') + '</div></fieldset>';
      }).join('') + '<button class="btn mal" id="k-todo" style="margin-top:.5rem">Borrar todas las claves de este dispositivo</button></div>' +
      '<div class="panel"><h2>Preferencias</h2><label for="a-tema">Tema</label><select id="a-tema"><option value="auto">Automático</option><option value="claro">Claro</option><option value="oscuro">Oscuro</option></select>' +
      '<label for="a-temp">Creatividad (temperatura): <span id="a-temp-v">' + s.temperatura + '</span></label><input type="range" id="a-temp" min="0" max="1" step="0.1" value="' + s.temperatura + '">' +
      '<label for="a-max">Máximo de tokens de salida</label><input type="number" id="a-max" min="100" max="16000" value="' + s.maxTokens + '">' +
      '<label for="a-rei">Reintentos ante 429/5xx/red</label><input type="number" id="a-rei" min="0" max="5" value="' + s.reintentos + '">' +
      '<label class="chk" style="margin-top:.7rem"><input type="checkbox" id="a-str"' + (s.stream ? ' checked' : '') + '> Mostrar la respuesta mientras se genera (streaming)</label>' +
      '<h3 style="margin-top:1rem">Límites de caracteres por red</h3><p class="suave">Valores orientativos; confírmalos en cada plataforma y edítalos si cambian.</p><div class="fila">' +
      Object.keys(Contadores.REDES).map(function (r) { return '<div style="width:46%"><label for="l-' + r + '">' + Contadores.REDES[r].nombre + '</label><input type="number" id="l-' + r + '" min="1" value="' + ((s.limites || {})[r] || Contadores.REDES[r].max) + '"></div>'; }).join('') + '</div>' +
      '<h3 style="margin-top:1rem">Respaldo de datos</h3><p class="suave">Incluye historial, marcas y plantillas. Nunca incluye claves.</p><div class="fila"><button class="btn" id="r-exp">Exportar respaldo</button><label class="btn" for="r-imp">Importar respaldo</label><input type="file" id="r-imp" accept=".json" class="solo-lectores"></div>' +
      '<p class="suave" id="r-info">' + (A.alm.persistente ? 'Datos guardados en IndexedDB de este navegador.' : 'IndexedDB no está disponible: los datos se pierden al cerrar la página.') + '</p></div></div>';
    $('#a-tema').value = s.tema;
    v.onclick = async function (e) {
      var g = e.target.dataset.g, b = e.target.dataset.b, d = e.target.dataset.des;
      try {
        if (g) {
          var k = $('#k-' + g).value.trim(), pw = $('#pw-' + g).value;
          s.modelos[g] = $('#mo-' + g).value.trim(); s.tarifas[g] = { entrada: $('#te-' + g).value, salida: $('#ts-' + g).value }; s.proveedor = $('#a-prov').value;
          if (k) await A.claves.guardar(g, k, pw || undefined);
          await A.guardarAjustes(); U.toast('Guardado'); ajustes(); A.escribir.refrescarModo();
        }
        if (b && confirm('¿Borrar la clave de este proveedor?')) { A.claves.borrar(b); U.toast('Clave borrada'); ajustes(); A.escribir.refrescarModo(); }
        if (d) { await A.obtenerClave(d); ajustes(); }
        if (e.target.id === 'k-todo' && confirm('¿Borrar TODAS las claves de este dispositivo?')) { A.claves.borrarTodo(); ajustes(); A.escribir.refrescarModo(); }
        if (e.target.id === 'r-exp') { var regs = (await A.alm.volcar()).filter(function (r) { return r.col !== 'ajustes'; }); Exportar.descargar('escritor-respaldo.json', JSON.stringify({ app: 'contenido_escritor', v: 1, registros: regs }), 'application/json'); }
      } catch (err) { U.toast(err.message, 5000); }
    };
    v.onchange = async function (e) {
      var i = e.target.id;
      if (i === 'a-tema') { s.tema = e.target.value; A.aplicarTema(); }
      else if (i === 'a-temp') { s.temperatura = +e.target.value; $('#a-temp-v').textContent = s.temperatura; }
      else if (i === 'a-max') s.maxTokens = Math.max(100, +e.target.value || 2048);
      else if (i === 'a-rei') s.reintentos = Math.max(0, Math.min(5, +e.target.value || 0));
      else if (i === 'a-str') s.stream = e.target.checked;
      else if (i.indexOf('l-') === 0) { s.limites = s.limites || {}; s.limites[i.slice(2)] = +e.target.value || undefined; }
      else if (i === 'a-prov') { s.proveedor = e.target.value; }
      else if (i === 'r-imp') {
        try { var j = JSON.parse(await e.target.files[0].text()); if (j.app !== 'contenido_escritor') throw new Error('Archivo no válido'); await A.alm.restaurar(j.registros.filter(function (r) { return r.col !== 'ajustes'; })); await A.cargar(); U.toast('Respaldo importado'); A.avisar('marcas'); }
        catch (err) { U.toast('No se pudo importar: ' + err.message, 5000); } return;
      } else return;
      await A.guardarAjustes(); A.escribir.refrescarModo();
    };
  }
  A.vistas.ajustes = ajustes;
})();
