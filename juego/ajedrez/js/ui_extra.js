// =============================================================
//  🪟  PANTALLAS EXTRA
//  Revisión de la partida (precisión, jugadas por clase, gráfica de
//  evaluación) y ayuda de controles según el dispositivo.
// =============================================================
import { CLASES, CLASE_POR_ID, probGanar } from './analisis.js';
import { esc } from './interfaz.js';

const $ = (id) => document.getElementById(id);

export function revisionProgreso(i, n) {
  $('revCuerpo').innerHTML = `<p class="sub">Analizando la partida con el motor…</p><div class="barra"><i style="width:${Math.round(100 * i / Math.max(1, n))}%"></i></div><p class="info">Posición ${i} de ${n}</p><div class="fila"><button type="button" id="btnRevCancelar">CANCELAR</button></div>`;
}

// res: resultado de revisarPartida; nombres: [blancas, negras]; alIr(ply)
export function pintarRevision(res, nombres, alIr) {
  const tabla = CLASES.map((c) => `<tr><td><i class="cl" style="background:${c.color}"></i>${c.nombre}</td><td>${res.conteo[0][c.id] || 0}</td><td>${res.conteo[1][c.id] || 0}</td></tr>`).join('');
  const clave = res.cls.map((c, i) => [c, i]).filter(([c]) => ['grave', 'error', 'brillante', 'genial'].includes(c.id)).slice(0, 10);
  $('revCuerpo').innerHTML = `<div class="precision"><div><small>${esc(nombres[0])}</small><b>${res.precision[0]}%</b></div><div><small>${esc(nombres[1])}</small><b>${res.precision[1]}%</b></div></div>
    <canvas id="graficoRev" width="440" height="140"></canvas>
    <table class="tab"><tr><th>Jugadas</th><th>Blancas</th><th>Negras</th></tr>${tabla}</table>
    <h4>Momentos clave</h4><div class="lista clave">${clave.length ? clave.map(([c, i]) => `<button type="button" data-ply="${i + 1}"><i class="cl" style="background:${CLASE_POR_ID[c.id].color}"></i>Jugada ${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'} ${CLASE_POR_ID[c.id].nombre}</button>`).join('') : '<p class="info">Ninguno: partida limpia.</p>'}</div>`;
  const cv = $('graficoRev'), g = cv.getContext('2d'), W = cv.width, H = cv.height, n = res.evalBlancas.length;
  g.fillStyle = '#15141f'; g.fillRect(0, 0, W, H);
  const X = (i) => 6 + (W - 12) * (n > 1 ? i / (n - 1) : 0.5), Y = (cp) => H - 6 - (H - 12) * probGanar(cp) / 100;
  g.fillStyle = '#f3efe4'; g.beginPath(); g.moveTo(X(0), H - 6);
  res.evalBlancas.forEach((v, i) => g.lineTo(X(i), Y(v))); g.lineTo(X(n - 1), H - 6); g.closePath(); g.fill();
  g.strokeStyle = '#888'; g.beginPath(); g.moveTo(6, H / 2); g.lineTo(W - 6, H / 2); g.stroke();
  res.cls.forEach((c, i) => { if (['grave', 'error', 'brillante', 'genial'].includes(c.id)) { g.fillStyle = CLASE_POR_ID[c.id].color; g.beginPath(); g.arc(X(i + 1), Y(res.evalBlancas[i + 1]), 4, 0, 7); g.fill(); } });
  cv.onclick = (e) => { const r = cv.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * W - 6) / (W - 12) * (n - 1)); alIr(Math.max(0, Math.min(n - 1, i))); };
  $('revCuerpo').querySelectorAll('[data-ply]').forEach((b) => b.addEventListener('click', () => alIr(+b.dataset.ply)));
}

export function pintarAyuda(tactil, mando) {
  const filas = [
    ['Mover', tactil ? 'Toca una pieza y su destino, o arrástrala.' : 'Haz clic en una pieza y en su destino, o arrástrala.'],
    ['Flechas y casillas', 'Clic derecho (o L3 en el mando) dibuja flechas y marca casillas. Clic izquierdo las borra.'],
    ['Premovimiento', 'Mientras piensa el rival, elige una pieza y su destino: se jugará al instante.'],
    ['Pista', 'Pulsa varias veces: primero la pieza, luego el destino, luego la jugada.'],
    ['Cámara', tactil ? 'Arrastra el fondo para girar; pellizca para acercar.' : 'Arrastra el fondo (o rueda) para girar y acercar.'],
    ['Teclado', 'Z deshacer · Y rehacer · H pista · A análisis · V vista · F girar · ←/→ jugadas · Esc pausa (se pueden cambiar en Ajustes).'],
    ['Mando Xbox', 'Stick/cruceta mueve el cursor · A elegir y mover · B cancelar · X deshacer · Y pista · LB/RB jugadas · L3 flecha · Menú pausa.'],
    ['Análisis', 'Activa «Análisis» para ver la barra de evaluación y las mejores líneas. «Revisión» clasifica todas tus jugadas.'],
  ];
  $('ayudaCuerpo').innerHTML = filas.map(([a, b]) => `<div class="fila-ay"><b>${a}</b><span>${b}</span></div>`).join('');
  void mando;
}
