// =============================================================
//  👤  CUENTA DE LA PLATAFORMA (puntajes, logros, XP y rankings)
//  Capa fina sobre window.Cuenta. Todo es "dispara y olvida": si no hay
//  sesión, red o plataforma, no pasa nada y el juego sigue igual.
//  Ids de modo EXACTOS de plataforma/juegos.js: 'dias' (días sobrevividos).
// =============================================================
const JUEGO = 'bloques';
const MODO = 'dias';
const TOPE = 100000;
const CLAVE_XP = 'bloques_cuenta_v1';      // viaja a la nube: { xpDias }
const XP_POR_DIA = 10;
const XP_MAX_POR_VEZ = 50;

const C = () => window.Cuenta;
const quieto = () => {};

export const Cta = {
  get activa() { return !!(C() && C().usuario); },
  get usuario() { return C() ? C().usuario : null; },

  // ---- logros: ids estables del juego (ver logros.js), una vez cada uno
  logro(id) {
    if (!this.activa || !/^[a-z0-9_]{1,40}$/.test(String(id))) return;
    C().logro(JUEGO, id).catch(quieto);
  },
  // Pasa a la cuenta los logros que ya tenías (idempotente: la plataforma ignora los repetidos)
  async logrosPrevios(ids) {
    if (!this.activa || !ids.length) return;
    try { await C().logros(JUEGO); } catch (e) { /* sin red: igual se intenta */ }
    for (const id of ids) this.logro(id);
  },

  // ---- puntaje: días sobrevividos (solo supervivencia; la plataforma solo guarda si mejora)
  puntajeDias(dias) {
    if (!this.activa) return Promise.resolve(null);
    const v = Math.floor(+dias);
    if (!isFinite(v) || v < 1 || v > TOPE) return Promise.resolve(null);
    return C().puntaje(JUEGO, MODO, v).catch(quieto);
  },
  // Un día más sobrevivido: puntaje + XP moderada (solo por días que superan tu marca, nunca por tiempo jugado)
  diaSobrevivido(dias) {
    if (!this.activa) return;
    this.puntajeDias(dias);
    let o = {};
    try { o = JSON.parse(localStorage.getItem(CLAVE_XP) || '{}') || {}; } catch (e) { o = {}; }
    const marca = Number.isFinite(o.xpDias) ? o.xpDias : 0;
    if (dias > marca) {
      const ganado = Math.min(XP_MAX_POR_VEZ, (dias - marca) * XP_POR_DIA);
      o.xpDias = dias;
      try { localStorage.setItem(CLAVE_XP, JSON.stringify(o)); } catch (e) { /* nada */ }
      try { Promise.resolve(C().xp(JUEGO, ganado)).catch(quieto); } catch (e) { /* nada */ }
    }
  },

  // ---- ranking: { estado: 'ok'|'vacio'|'error'|'sinSesion', filas, yo }
  async ranking(soloAmigos) {
    if (!this.activa) return { estado: 'sinSesion', filas: [], yo: null };
    try {
      const [filas, yo] = await Promise.all([
        C().top(JUEGO, MODO, 10, { soloAmigos: !!soloAmigos }),
        C().miPosicion(JUEGO, MODO).catch(() => null),
      ]);
      return { estado: filas.length ? 'ok' : 'vacio', filas, yo };
    } catch (e) {
      return { estado: 'error', filas: [], yo: null, mensaje: C().mensajeError ? C().mensajeError(e) : '' };
    }
  },
  async miMejor() {
    if (!this.activa) return null;
    try { return await C().miPosicion(JUEGO, MODO); } catch (e) { return null; }
  },
};

const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };

// Pinta un resultado de Cta.ranking() dentro de `cuerpo` (lista + estados de vacío/error)
export function pintarFilas(cuerpo, r, soloAmigos) {
  cuerpo.textContent = '';
  if (r.estado === 'sinSesion') { cuerpo.appendChild(el('p', 'info', 'Inicia sesión para ver los records.')); return; }
  if (r.estado === 'error') { cuerpo.appendChild(el('p', 'info', 'No se pudo cargar el ranking' + (r.mensaje ? ' (' + r.mensaje + ')' : '') + '. Revisa tu conexión y pulsa ACTUALIZAR.')); return; }
  if (r.estado === 'vacio') {
    cuerpo.appendChild(el('p', 'info', soloAmigos ? 'Ni tú ni tus amigos tienen días registrados todavía. ¡Sobrevive una noche en modo supervivencia!' : 'Nadie ha registrado días todavía. ¡Sé el primero!'));
    return;
  }
  const lista = el('div', 'rankLista');
  for (const f of r.filas) {
    const fila = el('div', 'rankFila' + (f.yo ? ' yo' : ''));
    fila.appendChild(el('span', 'pos', '#' + f.pos));
    const nom = el('span', 'nom', f.nombre || '—');
    if (f.color) nom.style.setProperty('--c', f.color);
    fila.appendChild(nom);
    fila.appendChild(el('b', 'val', f.valor + (f.valor === 1 ? ' día' : ' días')));
    lista.appendChild(fila);
  }
  cuerpo.appendChild(lista);
}

export function textoMiPosicion(yo) {
  if (!yo) return '';
  if (yo.posicion == null) return 'Aún no tienes días registrados.';
  return `Tu mejor marca: ${yo.valor} ${yo.valor === 1 ? 'día' : 'días'} · puesto ${yo.posicion}${yo.total ? ' de ' + yo.total : ''}`;
}
