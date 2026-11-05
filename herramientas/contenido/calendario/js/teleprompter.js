/* Lector / teleprompter a pantalla completa. */
window.Tele = (function () {
  var $ = U.$, raf = 0, activo = false, pos = 0, vel = 40, tam = 44, previo = 0, el, guion;
  var alCerrar = null;
  function abrir(pub, cb) {
    alCerrar = cb || null;
    el = $('#teleprompter'); var es = pub.escenas || [];
    var cuerpo = es.length ? es.map(function (e, i) { return '<div class="escena-t">ESCENA ' + (i + 1) + ' · ' + U.esc(e.tipo || '') + ' · ' + (e.seg || 0) + ' s' + (e.camara ? ' · ' + U.esc(e.camara) : '') + '</div><p>' + U.esc(e.texto || '').replace(/\n/g, '<br>') + '</p>'; }).join('') : '<p>' + U.esc(pub.texto || 'Sin texto: agrega escenas o texto a la publicación.').replace(/\n/g, '<br>') + '</p>';
    el.innerHTML = '<div class="ctl"><button class="btn peq" id="t-play">▶ Iniciar</button><label for="t-vel">Velocidad</label><input type="range" id="t-vel" min="5" max="200" value="' + vel + '"><label for="t-tam">Tamaño</label><input type="range" id="t-tam" min="20" max="90" value="' + tam + '"><button class="btn peq" id="t-esp" aria-pressed="false">Espejo</button><button class="btn peq" id="t-ini">⏮ Inicio</button><span class="grow"></span><button class="btn peq" id="t-cer">Cerrar (Esc)</button></div><div class="linea"></div><div class="guion" id="t-guion" tabindex="0" aria-label="Texto del guion">' + cuerpo + '</div>';
    el.classList.remove('oculto'); guion = $('#t-guion'); guion.style.setProperty('--tf', tam + 'px'); pos = 0; activo = false;
    $('#t-play').onclick = alternar; $('#t-cer').onclick = cerrar; $('#t-ini').onclick = function () { pos = 0; guion.scrollTop = 0; };
    $('#t-vel').oninput = function (e) { vel = +e.target.value; }; $('#t-tam').oninput = function (e) { tam = +e.target.value; guion.style.setProperty('--tf', tam + 'px'); };
    $('#t-esp').onclick = function (e) { var on = guion.classList.toggle('espejo'); e.target.setAttribute('aria-pressed', on); };
    $('#t-play').focus();
  }
  function alternar() { activo = !activo; $('#t-play').textContent = activo ? '⏸ Pausa' : '▶ Iniciar'; if (activo) { previo = 0; raf = requestAnimationFrame(paso); } else cancelAnimationFrame(raf); }
  function paso(t) {
    if (!activo) return; if (previo) { pos += vel * (t - previo) / 1000; guion.scrollTop = pos; if (guion.scrollTop + guion.clientHeight >= guion.scrollHeight - 2) { alternar(); return; } }
    previo = t; raf = requestAnimationFrame(paso);
  }
  function cerrar() { activo = false; cancelAnimationFrame(raf); el.classList.add('oculto'); el.innerHTML = ''; if (alCerrar) { var f = alCerrar; alCerrar = null; f(); } }
  function abierto() { return el && !el.classList.contains('oculto'); }
  function tecla(e) {
    if (!abierto()) return false;
    if (e.key === 'Escape') cerrar(); else if (e.key === ' ' && e.target.tagName !== 'BUTTON') alternar();
    else if (e.key === 'ArrowUp') { vel = Math.min(200, vel + 5); $('#t-vel').value = vel; } else if (e.key === 'ArrowDown') { vel = Math.max(5, vel - 5); $('#t-vel').value = vel; }
    else if (e.key === '+' || e.key === '=') { tam = Math.min(90, tam + 4); guion.style.setProperty('--tf', tam + 'px'); $('#t-tam').value = tam; } else if (e.key === '-') { tam = Math.max(20, tam - 4); guion.style.setProperty('--tf', tam + 'px'); $('#t-tam').value = tam; } else return true;
    e.preventDefault(); return true;
  }
  return { abrir: abrir, cerrar: cerrar, abierto: abierto, tecla: tecla, alternar: function () { if (abierto()) alternar(); } };
})();
