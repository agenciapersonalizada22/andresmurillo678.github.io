// Entrada unificada: teclado + raton (bloqueo de puntero), mando Xbox (Mando) y controles tactiles. Rellena el objeto I cada cuadro.
import { h } from './dom.js';
import { TECLAS } from './almacen.js';
export function crearEntrada(aj, canvas, Mando) {
  const I = {
    activa: false, tipo: 'teclado', mx: 0, mz: 0, lx: 0, ly: 0, disparo: false, disparoPulso: false, apuntar: false, saltar: false, saltarPulso: false, correr: false,
    recargar: false, interactuar: false, pieza: null, editar: false, editarPulso: false, editarSuelta: false, material: false, emote: false, slot: -1, armaDelta: 0, curar: false,
    mapa: false, pausa: false, rueda: 0, bloqueado: false, tactilVisible: false, construyendo: false, cursor: { x: 0, y: 0 }
  };
  const down = new Set(), ed = {}; let porCodigo = {}, ultAj = null, mouseMov = { x: 0, y: 0 }, esTactil = matchMedia('(pointer: coarse)').matches;
  const tk = { mx: 0, mz: 0, lx: 0, ly: 0, disp: false, apunt: false, salto: false, edit: false, correr: false, ids: {} };
  const mapear = () => { porCodigo = {}; const t = Object.assign({}, TECLAS, aj.teclas); for (const a in t) porCodigo[t[a]] = a; ultAj = JSON.stringify(aj.teclas); };
  const pulso = (n) => { ed[n] = true; };
  addEventListener('keydown', (e) => {
    if (!I.activa || e.target.matches('input,textarea,select')) return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return; I.tipo = 'teclado'; down.add(e.code);
    const a = porCodigo[e.code]; if (a) { if (['recargar', 'interactuar', 'material', 'emote', 'mapa', 'curar'].includes(a)) pulso(a); else if (a === 'saltar') pulso('saltar'); else if (['pared', 'piso', 'rampa', 'techo'].includes(a)) ed.pieza = a === 'pared' ? 'p' : a === 'piso' ? 's' : a === 'rampa' ? 'r' : 't'; else if (a === 'editar') pulso('editar'); }
    if (/^Digit[1-6]$/.test(e.code)) ed.slot = +e.code.slice(5) - 1;
    if (e.code === 'Escape') pulso('pausa');
    if (e.code === 'Space') pulso('saltar');
  });
  addEventListener('keyup', (e) => { down.delete(e.code); if (porCodigo[e.code] === 'editar') pulso('editarSuelta'); });
  addEventListener('blur', () => { down.clear(); tk.disp = tk.apunt = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (!I.activa || e.pointerType === 'touch') return;
    if (!document.pointerLockElement && !I.sinBloqueo) { canvas.requestPointerLock && canvas.requestPointerLock(); return; }
    I.tipo = 'teclado'; if (e.button === 0) { ed.disparoPulso = true; ed.disparo = true; } else if (e.button === 2) ed.apuntar = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) ed.disparo = false; else if (e.button === 2) ed.apuntar = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => { if (I.activa && (document.pointerLockElement === canvas || I.sinBloqueo)) { mouseMov.x += e.movementX; mouseMov.y += e.movementY; } });
  addEventListener('wheel', (e) => { if (I.activa) I.rueda += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { I.bloqueado = document.pointerLockElement === canvas; if (!I.bloqueado && I.activa && I.alSoltarPuntero) I.alSoltarPuntero(); });

  /* ---------- tactil ---------- */
  const raiz = h('div', { id: 'tactil', hidden: true });
  const joy = h('div', { cls: 'joy', hidden: true }, [h('i')]), zonaL = h('div', { cls: 'zona-mov' }), zonaR = h('div', { cls: 'zona-mira' });
  raiz.append(zonaL, zonaR, joy);
  const BT = [['disp', 'Fuego', 'hold'], ['salto', 'Salto', 'hold'], ['apunt', 'Mira', 'hold'], ['recarga', 'Recarga'], ['usar', 'Usar'], ['constr', 'Construir'], ['emote', 'Emote'], ['curar', 'Curar'], ['mapa', 'Mapa'],
    ['pared', 'Pared', 'b'], ['piso', 'Piso', 'b'], ['rampa', 'Rampa', 'b'], ['techo', 'Techo', 'b'], ['editar', 'Editar', 'b'], ['mat', 'Mat.', 'b']];
  const botones = {};
  BT.forEach(([id, txt, tipo]) => { const b = h('button', { type: 'button', cls: 'tb tb-' + id + (tipo === 'b' ? ' tb-build' : ''), txt, tabindex: '-1' }); botones[id] = b; raiz.appendChild(b); });
  document.body.appendChild(raiz);
  const accion = { recarga: () => pulso('recargar'), usar: () => pulso('interactuar'), emote: () => pulso('emote'), curar: () => pulso('curar'), mapa: () => pulso('mapa'), pared: () => { ed.pieza = 'p'; }, piso: () => { ed.pieza = 's'; }, rampa: () => { ed.pieza = 'r'; }, techo: () => { ed.pieza = 't'; }, mat: () => pulso('material'), constr: () => { ed.pieza = I.construyendo ? 'salir' : 'p'; }, editar: () => pulso('editarTog') };
  Object.keys(botones).forEach((id) => {
    const b = botones[id];
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); I.tipo = 'tactil'; b.setPointerCapture(e.pointerId); b.classList.add('on');
      if (id === 'disp' || id === 'apunt' || id === 'salto') { tk.ids[e.pointerId] = { b: id, x: e.clientX, y: e.clientY }; if (id === 'disp') { tk.disp = true; pulso('disparoPulso'); } else if (id === 'apunt') tk.apunt = true; else { tk.salto = true; pulso('saltar'); } }
      else if (accion[id]) accion[id]();
    });
    const fin = (e) => { b.classList.remove('on'); const t = tk.ids[e.pointerId]; if (t) { if (t.b === 'disp') tk.disp = false; else if (t.b === 'apunt') tk.apunt = false; else tk.salto = false; delete tk.ids[e.pointerId]; } };
    b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin);
    b.addEventListener('pointermove', (e) => { const t = tk.ids[e.pointerId]; if (t && t.b === 'disp') { tk.lx += (e.clientX - t.x) * 0.0055 * aj.sens; tk.ly += (e.clientY - t.y) * 0.0055 * aj.sens; t.x = e.clientX; t.y = e.clientY; } });
  });
  let jid = -1, jo = null, lid = -1, lp = null;
  raiz.addEventListener('pointerdown', (e) => {
    if (e.target !== zonaL && e.target !== zonaR) return; I.tipo = 'tactil';
    const izq = e.target === zonaL; if (izq === !!aj.zurdo) { if (lid < 0) { lid = e.pointerId; lp = { x: e.clientX, y: e.clientY }; zonaR.setPointerCapture(e.pointerId); } return; }
    if (jid < 0) { jid = e.pointerId; jo = { x: e.clientX, y: e.clientY }; zonaL.setPointerCapture(e.pointerId); joy.hidden = false; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; }
  });
  raiz.addEventListener('pointermove', (e) => {
    if (e.pointerId === jid) { const dx = e.clientX - jo.x, dy = e.clientY - jo.y, R = 55 * aj.tactilTam, m = Math.min(1, Math.hypot(dx, dy) / R), a = Math.atan2(dy, dx); tk.mx = Math.cos(a) * m; tk.mz = -Math.sin(a) * m; tk.correr = m > 0.95; joy.firstChild.style.transform = `translate(${Math.cos(a) * m * R}px,${Math.sin(a) * m * R}px)`; }
    else if (e.pointerId === lid) { tk.lx += (e.clientX - lp.x) * 0.0055 * aj.sens; tk.ly += (e.clientY - lp.y) * 0.0055 * aj.sens; lp.x = e.clientX; lp.y = e.clientY; }
  });
  const soltar = (e) => { if (e.pointerId === jid) { jid = -1; tk.mx = tk.mz = 0; tk.correr = false; joy.hidden = true; joy.firstChild.style.transform = ''; } if (e.pointerId === lid) lid = -1; };
  raiz.addEventListener('pointerup', soltar); raiz.addEventListener('pointercancel', soltar);
  addEventListener('touchstart', () => { esTactil = true; I.tipo = 'tactil'; }, { passive: true, once: true });
  const aplicarTactil = () => { raiz.style.setProperty('--tk', aj.tactilTam); raiz.style.setProperty('--to', aj.tactilOp); raiz.style.setProperty('--tp', aj.tactilPos || 0); raiz.classList.toggle('zurdo', !!aj.zurdo); };
  I.aplicarTactil = aplicarTactil; aplicarTactil();

  /* ---------- lectura por cuadro ---------- */
  let corrAuto = false, editTog = false;
  I.leer = function (dt) {
    if (JSON.stringify(aj.teclas) !== ultAj) mapear();
    const t = aj.teclas || TECLAS, k = (a) => down.has(t[a] || TECLAS[a]);
    I.mx = (k('der') ? 1 : 0) - (k('izq') ? 1 : 0); I.mz = (k('adelante') ? 1 : 0) - (k('atras') ? 1 : 0);
    I.lx = mouseMov.x * 0.0022 * aj.sens; I.ly = mouseMov.y * 0.0022 * aj.sens * (aj.invY ? -1 : 1); mouseMov.x = mouseMov.y = 0;
    I.disparo = !!ed.disparo || down.has('MouseDummy'); I.apuntar = !!ed.apuntar; I.correr = k('correr'); I.saltar = k('saltar');
    I.disparoPulso = !!ed.disparoPulso; I.saltarPulso = !!ed.saltar; I.recargar = !!ed.recargar; I.interactuar = !!ed.interactuar; I.material = !!ed.material; I.emote = !!ed.emote; I.curar = !!ed.curar; I.mapa = !!ed.mapa; I.pausa = !!ed.pausa;
    I.pieza = ed.pieza || null; I.slot = ed.slot == null ? -1 : ed.slot; I.editarPulso = !!ed.editar; I.editarSuelta = !!ed.editarSuelta; I.armaDelta = 0;
    I.editar = k('editar');
    if (esTactil || tk.mx || tk.mz || tk.lx || tk.ly || tk.disp) {
      if (tk.mx || tk.mz) { I.mx = tk.mx; I.mz = tk.mz; } I.correr = I.correr || tk.correr;
      I.lx += tk.lx; I.ly += tk.ly * (aj.invY ? -1 : 1); tk.lx = tk.ly = 0; if (tk.disp) I.disparo = true; if (tk.apunt) I.apuntar = true; if (tk.salto) I.saltar = true;
      if (ed.editarTog) { editTog = !editTog; if (editTog) I.editarPulso = true; else I.editarSuelta = true; } I.editar = I.editar || editTog;
      if (ed.pieza === 'salir') I.pieza = 'salir';
    }
    if (Mando && Mando.conectado) {
      const zz = (v) => (Math.hypot(v.x, v.y) < aj.zona ? { x: 0, y: 0 } : v), L = zz(Mando.ejes.izq), Rr = zz(Mando.ejes.der);
      if (L.x || L.y) { I.mx = L.x; I.mz = -L.y; I.tipo = 'mando'; }
      if (Rr.x || Rr.y) { const m = Math.hypot(Rr.x, Rr.y), c = m * m; I.lx += Rr.x * c * 3.4 * dt * aj.sens * (m > 0.9 ? 1.5 : 1) / Math.max(m, 0.001) * m; I.ly += Rr.y * c * 2.6 * dt * aj.sens * (aj.invY ? -1 : 1) / Math.max(m, 0.001) * m; I.tipo = 'mando'; }
      if (Mando.gatillo.der > 0.35) { I.disparo = true; if (!I._rt) { I.disparoPulso = true; } I._rt = true; } else I._rt = false;
      if (Mando.gatillo.izq > 0.3) I.apuntar = true;
      if (Mando.sostenido('A')) I.saltar = true; if (Mando.pulsado('A')) I.saltarPulso = true;
      if (Mando.pulsado('X')) I.recargar = true; if (Mando.pulsado('Y')) { I.interactuar = true; I.curar = true; } if (Mando.pulsado('B')) I.emote = true;
      if (Mando.pulsado('LB')) I.armaDelta = -1; if (Mando.pulsado('RB')) I.armaDelta = 1;
      if (Mando.pulsado('L3')) corrAuto = !corrAuto; if (L.x === 0 && L.y === 0) corrAuto = false; if (corrAuto) I.correr = true;
      if (Mando.pulsado('R3')) { editTog = !editTog; if (editTog) I.editarPulso = true; else I.editarSuelta = true; } I.editar = I.editar || editTog;
      if (Mando.pulsado('ARRIBA')) I.pieza = 'p'; if (Mando.pulsado('DER')) I.pieza = 's'; if (Mando.pulsado('IZQ')) I.pieza = 'r'; if (Mando.pulsado('ABAJO')) I.pieza = 't';
      if (Mando.pulsado('VISTA')) I.material = true; if (Mando.pulsado('MENU')) I.pausa = true;
      if (Mando.pulsado('LB') && Mando.sostenido('RB')) I.mapa = true;
      if (Mando.sostenido('B') && Mando.pulsado('VISTA')) I.mapa = true;
    }
    if (I.disparoPulso) I.disparo = true;
    if (I.rueda) { I.armaDelta = I.armaDelta || I.rueda; if (I.construyendo) { I.material = true; I.armaDelta = 0; } I.rueda = 0; }
    if (!I.activa) { I.mx = I.mz = 0; I.disparo = I.apuntar = I.saltar = false; }
    ed.disparoPulso = ed.saltar = ed.recargar = ed.interactuar = ed.material = ed.emote = ed.curar = ed.mapa = ed.pausa = ed.editar = ed.editarSuelta = ed.editarTog = false; ed.pieza = null; ed.slot = null;
    I.tactilVisible = I.activa && (I.tipo === 'tactil' || esTactil);
    raiz.hidden = !I.tactilVisible; raiz.classList.toggle('construyendo', !!I.construyendo);
    return I;
  };
  I.vibrar = (f, s, ms) => { if (aj.vibrar && Mando && Mando.conectado) Mando.vibrar(f * aj.vibInt, s * aj.vibInt, ms); if (aj.vibrar && I.tipo === 'tactil' && navigator.vibrate) { try { navigator.vibrate(Math.min(40, ms)); } catch (e) { /* sin vibracion */ } } };
  I.liberar = () => { if (document.pointerLockElement) document.exitPointerLock(); };
  mapear();
  return I;
}
