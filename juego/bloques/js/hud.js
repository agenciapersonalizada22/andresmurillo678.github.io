// =============================================================
//  📟  HUD EXTRA: corazones, hambre, aire, armadura, avisos de logros,
//  chat y lista de jugadores.
// =============================================================
const $ = (id) => document.getElementById(id);
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };

function iconos(cont, n, clase) {
  cont.textContent = '';
  const l = [];
  for (let i = 0; i < n; i++) { const s = el('i', clase); cont.appendChild(s); l.push(s); }
  return l;
}

export class Hud {
  constructor() {
    this.cont = $('vitales');
    this.vida = iconos($('filaVida'), 10, 'corazon');
    this.hambre = iconos($('filaHambre'), 10, 'muslo');
    this.armadura = iconos($('filaArmadura'), 10, 'escudo');
    this.aire = iconos($('filaAire'), 10, 'burbuja');
    this.ultimo = '';
    this.chatLog = $('chatLog');
    this.lista = $('listaJugadores');
    this.toasts = $('toasts');
  }

  mostrarVitales(si) { this.cont.classList.toggle('oculto', !si); }

  actualizar(v, puntosArmadura) {
    const clave = `${Math.round(v.vida * 2)}|${Math.round(v.hambre * 2)}|${puntosArmadura}|${Math.ceil(v.aire)}|${v.vida <= 6 ? 1 : 0}`;
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const pon = (lista, valor) => lista.forEach((s, i) => { const r = valor - i * 2; s.className = s.className.replace(/ (lleno|medio|vacio)/g, '') + (r >= 2 ? ' lleno' : r >= 1 ? ' medio' : ' vacio'); });
    pon(this.vida, v.vida); pon(this.hambre, v.hambre); pon(this.armadura, puntosArmadura);
    this.cont.classList.toggle('peligro', v.vida <= 6);
    $('filaArmadura').style.visibility = puntosArmadura > 0 ? 'visible' : 'hidden';
    this.aire.forEach((s, i) => { s.style.visibility = v.aire < 10 && i < Math.ceil(v.aire) ? 'visible' : 'hidden'; });
    $('filaAire').style.visibility = v.aire < 10 ? 'visible' : 'hidden';
  }

  toast(titulo, texto, clase = '') {
    const t = el('div', 'toast ' + clase);
    t.append(el('b', '', titulo), el('span', '', texto));
    this.toasts.appendChild(t);
    setTimeout(() => t.classList.add('sale'), 3800);
    setTimeout(() => t.remove(), 4400);
    while (this.toasts.childElementCount > 4) this.toasts.firstChild.remove();
  }

  // Línea del chat: aparece y se va sola
  chat(nombre, color, texto, sistema = false) {
    const f = el('div', 'linea' + (sistema ? ' sistema' : ''));
    if (nombre) { const n = el('b', '', nombre + ': '); n.style.color = color || '#fff'; f.appendChild(n); }
    f.appendChild(el('span', '', texto));
    this.chatLog.appendChild(f);
    setTimeout(() => f.classList.add('sale'), 9000);
    setTimeout(() => f.remove(), 10000);
    while (this.chatLog.childElementCount > 7) this.chatLog.firstChild.remove();
  }

  // Lista de jugadores: [{ id, nombre, color, ping, yo }]
  pintarLista(jugadores, alIr) {
    this.lista.textContent = '';
    this.lista.appendChild(el('h4', '', 'JUGADORES'));
    for (const j of jugadores) {
      const f = el('div', 'jug');
      const p = el('i', 'punto'); p.style.background = j.color;
      f.append(p, el('span', '', j.nombre + (j.yo ? ' (tú)' : '')), el('em', '', j.ping != null ? j.ping + ' ms' : ''));
      if (!j.yo && alIr) { const b = el('button', 'ir', 'IR'); b.type = 'button'; b.addEventListener('click', () => alIr(j.id)); f.appendChild(b); }
      this.lista.appendChild(f);
    }
  }
}
