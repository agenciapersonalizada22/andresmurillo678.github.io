// Interfaz de veintiuno / siete y medio.
const RES = { gana: 'Gana', pierde: 'Pierde', empate: 'Empate', pasado: 'Se pasó', blackjack: 'Blackjack', real: 'Siete y medio real', rendido: 'Rendido' };
export function layout(vm) {
  const j = vm.j, sm = j.variante === 'sm';
  const asientos = j.jug.map((p, i) => {
    const manos = p.manos.map((m, k) => ({
      cartas: m.c, etiqueta: !m.c.length ? '' : m.res ? RES[m.res] : (m.est === 'pasado' ? 'Se pasó' : m.est === 'bj' ? (sm ? 'Real' : 'Blackjack') : m.val), apuesta: m.ap,
      activa: j.fase === 'turnos' && j.turno && j.turno.p === i && j.turno.m === k, cls: m.res === 'gana' || m.res === 'blackjack' || m.res === 'real' ? 'gana' : m.res === 'pierde' || m.res === 'pasado' ? 'pierde' : '',
    }));
    const badges = [];
    if (p.banca) badges.push({ txt: 'BANCA', cls: 'dealer' });
    if (p.seg) badges.push({ txt: 'Seguro ' + p.seg });
    if (p.st === 'pasa') badges.push({ txt: 'Pasa' });
    const turno = (j.fase === 'turnos' && j.turno && j.turno.p === i) || (j.fase === 'banca' && p.banca) || ((j.fase === 'apuestas' || j.fase === 'seguro') && j.legal && j.yo === i) ;
    const gan = j.res ? j.res.gan[i] : 0;
    return { manos, badges, apuesta: 0, fichas: p.f, estado: p.st === 'pasa' ? 'fold' : '', turno: !!turno, gana: gan > 0, fuera: p.st === 'fuera' && !p.banca, delta: j.res ? gan : null, esperando: (j.fase === 'apuestas' && p.st === 'activo' && !p.listo) };
  });
  const cons = [];
  if (j.mostrarConteo) cons.push('Conteo Hi-Lo: ' + (j.conteo > 0 ? '+' : '') + j.conteo + ' · verdadero ' + (j.conteo / Math.max(0.5, j.restantes / (sm ? 40 : 52))).toFixed(1));
  const fasesTxt = { apuestas: 'Haz tu apuesta', seguro: '¿Seguro?', turnos: 'Turno de jugadores', banca: 'Juega la banca', entre: '' };
  return {
    disposicion: 'arco', asientos, fin: j.fase === 'entre' && !!j.res, bancaSeat: j.bancaSeat,
    centro: { cartas: [], huecos: 0, bote: 0, subtitulo: fasesTxt[j.fase] || '', extra: '', grupos: [{ cartas: j.banca.c, etiqueta: (j.res ? (j.res.bancaPasada ? 'Banca se pasó (' + j.res.banca + ')' : 'Banca ' + j.res.banca) : j.banca.val ? 'Banca ' + j.banca.val : ''), id: 'banca' }] },
    cabecera: (sm ? 'Siete y medio' : 'Veintiuno') + ` · ${j.min}-${j.max} · ${sm ? '' : 'BJ ' + j.pagoBJ + ' · '}zapato ${j.restantes}/${j.total}`, info: cons.join(' · '),
  };
}
export function panel(vm) {
  const j = vm.j, L = j.legal;
  if (!L) return { espera: true };
  const b = [];
  if (j.fase === 'apuestas') {
    const p = Math.max(1, L.min);
    b.push({ id: 'apostar', txt: 'Apostar {v}', cls: 'prim', accion: { t: 'apostar' }, tecla: 'a', clave: 'a',
      cantidad: { min: L.min, max: L.max, paso: p, def: L.ultima, rapidos: [{ txt: 'Mín', v: L.min }, { txt: '×2', v: Math.min(L.max, L.ultima * 2) }, { txt: '½', v: Math.max(L.min, Math.floor(L.max / 2 / p) * p) }, { txt: 'Máx', v: L.max }] } });
    b.push({ id: 'pasar', txt: 'Pasar ronda', cls: 'sec', accion: { t: 'pasar' }, tecla: 'p', b: true });
    return { botones: b, titulo: 'Tu apuesta', info: 'Fichas: ' + j.jug[j.yo].f };
  }
  if (j.fase === 'seguro') {
    b.push({ id: 'seguro', txt: 'Seguro ' + L.monto, cls: 'prim', accion: { t: 'seguro', si: true }, tecla: 's' });
    b.push({ id: 'noseguro', txt: 'Sin seguro', cls: 'sec', accion: { t: 'seguro', si: false }, tecla: 'n', b: true });
    return { botones: b, titulo: 'La banca muestra un As', info: 'Seguro paga 2 a 1 si la banca tiene blackjack' };
  }
  if (L.banca) {
    b.push({ id: 'pedir', txt: 'Pedir', cls: 'prim', accion: { t: 'pedir' }, tecla: 'c' });
    b.push({ id: 'plantarse', txt: 'Plantarse', cls: 'sec', accion: { t: 'plantarse' }, tecla: 'p', b: true });
    return { botones: b, titulo: 'Eres la banca' };
  }
  b.push({ id: 'pedir', txt: 'Pedir', cls: 'prim', accion: { t: 'pedir' }, tecla: 'c' });
  b.push({ id: 'plantarse', txt: 'Plantarse', cls: 'sec', accion: { t: 'plantarse' }, tecla: 'p', b: true });
  if (L.doblar) b.push({ id: 'doblar', txt: 'Doblar', cls: 'prim', accion: { t: 'doblar' }, tecla: 'd' });
  if (L.dividir) b.push({ id: 'dividir', txt: 'Dividir', cls: 'prim', accion: { t: 'dividir' }, tecla: 'v' });
  if (L.rendirse) b.push({ id: 'rendirse', txt: 'Rendirse', cls: 'peligro', accion: { t: 'rendirse' }, tecla: 'r' });
  return { botones: b, titulo: 'Tu turno' };
}
export const texto = {
  nombre: 'Veintiuno',
  ayuda: ['Acércate a 21 sin pasarte; gana a la banca. As vale 1 u 11, figuras 10.', 'Doblar: duplicas la apuesta y recibes una sola carta. Dividir: pareja en dos manos (hasta 3 veces). Seguro: apuesta lateral si la banca muestra un As. Rendirse: recuperas la mitad.', 'Siete y medio: 7,5 es el máximo; las figuras valen medio punto y el empate lo gana la banca.'],
};
