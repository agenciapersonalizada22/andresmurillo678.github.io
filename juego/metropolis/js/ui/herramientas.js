// Herramientas de juego: construir, zonificar, trazar calles, demoler, comprar y seleccionar.
import * as C from '../sim/ciudad.js';
import { ITEM, ITEMS } from '../sim/datos.js';
import { dinero } from '../sim/util.js';
import * as Audio from './audio.js';
import { esc } from './hud.js';

const $ = (id) => document.getElementById(id);

export function crearHerramientas(J) {
  const H = {
    modo: 'ver', item: null, fant: null, pint: null, mundo: null, sobre: null, parcela: null,
    celdas: [], ev: null, tipoPint: null,
  };
  J.herr = H;

  function ponerCuerpo(clase) {
    document.body.classList.toggle('herr', !!clase);
    $('barraHerr').classList.toggle('oculto', !clase);
  }

  H.poner = (x) => {
    J.sel = null; J.selVia = null; J.hud.ocultarInfo(); J.cerrarInfoCapa();
    H.pint = null; H.fant = null; H.parcela = null; H.ev = null;
    if (!x) { H.modo = 'ver'; H.item = null; ponerCuerpo(false); J.terreno.ventas(J.c, false); return; }
    if (x === 'demoler') { H.modo = 'demoler'; H.item = null; H.tipoPint = 'demoler'; }
    else { H.modo = 'construir'; H.item = x; H.tipoPint = x.tipo === 'via' ? 'via' : x.tipo === 'zona' ? 'zona' : x.tipo === 'comprar' ? 'comprar' : 'edificio'; }
    ponerCuerpo(true);
    $('hOk').classList.toggle('oculto', H.tipoPint !== 'edificio');
    $('herrNombre').textContent = x === 'demoler' ? 'Demoler' : x.nombre;
    J.terreno.ventas(J.c, H.tipoPint === 'comprar');
    if (H.tipoPint === 'edificio') { const m = H.mundo || { x: J.camara.x, z: J.camara.z }; H.moverFant(m.x, m.z); }
    if (H.tipoPint === 'comprar') J.aviso('Toca una parcela dorada para comprarla', 'info');
  };
  H.cancelar = () => {
    if (H.pint) { H.pint = null; return true; }
    if (H.modo !== 'ver') { H.poner(null); Audio.tocar('click'); return true; }
    if (J.sel != null || J.selVia) { J.deseleccionar(); return true; }
    return false;
  };

  H.moverFant = (wx, wz) => {
    const it = H.item; if (!it || H.tipoPint !== 'edificio') return;
    H.fant = { x: Math.round(wx - it.w / 2), y: Math.round(wz - it.h / 2) };
  };

  const linea = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, out = [];
    if (Math.abs(dx) >= Math.abs(dy)) { const s = dx < 0 ? -1 : 1; for (let i = 0; i <= Math.abs(dx) && i < 90; i++) out.push([a.x + i * s, a.y]); }
    else { const s = dy < 0 ? -1 : 1; for (let i = 0; i <= Math.abs(dy) && i < 90; i++) out.push([a.x, a.y + i * s]); }
    return out;
  };
  const rect = (a, b) => {
    const out = [], x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    for (let y = y0; y <= y1 && y0 + 24 > y; y++) for (let x = x0; x <= x1 && x0 + 40 > x; x++) out.push([x, y]);
    return out;
  };
  const celdasPint = (a, b) => (H.tipoPint === 'via' ? linea(a, b) : rect(a, b));

  H.iniciarPintura = (cx, cy) => {
    if (!['via', 'zona', 'demoler'].includes(H.tipoPint)) return;
    H.pint = { ini: { x: cx, y: cy }, fin: { x: cx, y: cy } };
  };
  H.actualizarPintura = (cx, cy) => { if (H.pint) { H.pint.fin.x = cx; H.pint.fin.y = cy; } };
  H.soltarPintura = () => {
    const p = H.pint; if (!p) return;
    H.pint = null;
    const cs = celdasPint(p.ini, p.fin), c = J.c;
    let r;
    if (H.tipoPint === 'via') r = C.trazarVia(c, cs, H.item.id);
    else if (H.tipoPint === 'zona') r = C.zonificar(c, cs, H.item.id);
    else r = C.demoler(c, cs);
    resultado(r);
  };
  function resultado(r) {
    if (r.ok) { J.vibrar(H.tipoPint === 'demoler' ? 'derribo' : 'construir'); J.cambioFuerte(); }
    else { J.aviso(r.razon || 'No se puede', 'mal'); Audio.tocar('error'); J.vibrar('error'); J.sacudir(); }
  }
  H.confirmarEdificio = () => {
    if (H.tipoPint !== 'edificio' || !H.fant) return;
    const r = C.construir(J.c, H.item.id, H.fant.x, H.fant.y);
    resultado(r);
  };
  H.demolerCelda = (cx, cy) => { resultado(C.demoler(J.c, [[cx, cy]])); };

  // toque en modo "ver" (o comprar)
  H.tocar = (cx, cy) => {
    const c = J.c;
    if (!C.dentro(cx, cy)) { J.deseleccionar(); return; }
    const px = Math.floor(cx / 8), py = Math.floor(cy / 8);
    if (H.tipoPint === 'comprar' || H.modo === 'ver') {
      if (!c.parc[py * C.NP + px]) {
        if (C.parcelaComprable(c, px, py)) { H.parcela = { px, py }; J.paneles.comprar(px, py); Audio.tocar('click'); }
        else { J.aviso('Compra primero una parcela vecina', 'info'); Audio.tocar('error'); }
        return;
      }
    }
    if (H.modo !== 'ver') return;
    const b = C.edifEn(c, cx, cy);
    if (b) { J.seleccionar(b.id); return; }
    if (c.via[cy * C.N + cx]) { J.seleccionarVia(cx, cy); return; }
    J.deseleccionar();
  };

  // cambiar al elemento anterior/siguiente de la misma categoría
  H.ciclar = (d) => {
    const it = H.item; if (!it) return;
    const lista = ITEMS.filter((q) => q.cat === it.cat && C.disponibilidad(J.c, q).ok).sort((a, b) => a.nivel - b.nivel || a.costo - b.costo);
    if (lista.length < 2) return;
    const i = lista.findIndex((q) => q.id === it.id);
    H.poner(lista[(i + d + lista.length) % lista.length]); Audio.tocar('tecla');
  };

  // vista previa cada cuadro
  H.vista = (t) => {
    const e = J.edificios, c = J.c;
    const s = H.sobre;
    if (H.modo === 'ver' || J.enTitulo) {
      e.ocultarFantasma();
      if (s && (J.mandoActivo || J.ratonHover) && !J.enTitulo) e.marcoCursor(s.x, s.y, 1, 1, t); else e.ocultarCursor();
      return;
    }
    e.ocultarCursor();
    let nombre = H.modo === 'demoler' ? 'Demoler' : H.item.nombre, detalle = '', cls = '';
    if (H.tipoPint === 'edificio') {
      if (!H.fant) { e.ocultarFantasma(); return; }
      const ev = C.evaluarEdificio(c, H.item, H.fant.x, H.fant.y);
      H.ev = ev;
      e.fantasmaEdificio(H.item, H.fant.x, H.fant.y, ev.ok);
      detalle = ev.ok ? dinero(H.item.costo) + (H.item.mant ? ' · mant. ' + dinero(H.item.mant) + '/d' : '') : ev.razon || 'No se puede';
      cls = ev.ok ? 'bien' : 'mal';
      $('hOk').classList.toggle('off', !ev.ok);
    } else if (H.tipoPint === 'comprar') {
      e.ocultarFantasma();
      const p = s ? { px: Math.floor(s.x / 8), py: Math.floor(s.y / 8) } : null;
      const ok = p && C.parcelaComprable(c, p.px, p.py);
      J.terreno.ventas(c, true, ok ? p.px : -1, ok ? p.py : -1);
      detalle = ok ? 'Parcela: ' + dinero(C.precioParcela(c)) : 'Toca una parcela dorada';
      cls = ok ? 'bien' : '';
    } else {
      let cs;
      if (H.pint) cs = celdasPint(H.pint.ini, H.pint.fin);
      else if (s) cs = [[s.x, s.y]]; else cs = [];
      let lista, costo = 0, n = 0;
      if (H.tipoPint === 'via') { const ev = C.evaluarVia(c, cs, H.item.id); lista = ev.celdas; costo = ev.costo; n = ev.n; }
      else if (H.tipoPint === 'zona') { const ev = C.evaluarZona(c, cs, H.item.id); lista = ev.celdas; costo = ev.costo; n = ev.n; }
      else {
        lista = cs.map(([x, y]) => { const b = C.edifEn(c, x, y); const ok = C.esMia(c, x, y) && ((b && b.t !== 'ayuntamiento') || (!b && !!c.via[y * C.N + x])); return { x, y, ok }; });
        n = lista.filter((q) => q.ok).length;
      }
      e.fantasmaCeldas(lista, H.tipoPint === 'demoler');
      if (H.pint) detalle = n + ' casillas' + (H.tipoPint !== 'demoler' ? ' · ' + dinero(costo) : ''); else detalle = H.tipoPint === 'via' ? 'Arrastra para trazar · ' + dinero(H.item.costo) + ' c/u' : H.tipoPint === 'zona' ? 'Arrastra para pintar · ' + dinero(H.item.costo) + ' c/u' : 'Toca o arrastra sobre lo que quieras quitar';
      cls = H.pint && n === 0 ? 'mal' : '';
    }
    if ($('herrNombre').textContent !== nombre) $('herrNombre').textContent = nombre;
    const d = $('herrDetalle'); if (d.textContent !== detalle) d.textContent = detalle;
    d.className = cls;
  };

  return H;
}
