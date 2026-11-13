// Motor de minijuegos: interfaz comun init / loop / entrada / resultado, escalera adaptativa, temporizador, tutorial, pausa y accesibilidad.
// Un juego es { id, area, nombre, desc, tutorial:[3 textos], esc?:{subir}, dur?, init(cx), loop?(cx,dt), entrada?(cx,accion), resultado?(cx,def) }.
import { h, vaciar } from './dom.js';
import * as Esc from './logica/escalera.js';
import { puntosEnsayo } from './logica/puntaje.js';
import { crearRng } from './azar.js';
import { D, tiempoExtra, bajarCalidad } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Entrada, vibrar } from './entrada.js';

export const esOk = (a) => a === 'ok' || a === 'a';
export const NIVEL_TUT = [0, 1, 3, 5];
export const ENSAYOS_TUT = [0, 3, 4, 5];
const DUR_TEST = Number(new URLSearchParams(location.search).get('dur')) || 0;
let activo = null;
export const actual = () => activo;

export function jugar(juego, o = {}) {
  return new Promise((resolver) => {
    const raiz = document.getElementById('juego');
    vaciar(raiz); raiz.hidden = false;
    document.body.classList.add('jugando');
    const tut = o.tut || 0;
    const esc = Esc.crear(tut ? NIVEL_TUT[tut] : (o.nivel || 1), juego.esc || {});
    const durS = tut ? 0 : (DUR_TEST || o.dur || juego.dur || 60);
    const s = { t: 0, durMs: durS * 1000, pausado: false, cuenta: true, fin: false, aciertos: 0, errores: 0, puntos: 0, racha: 0, mejorRacha: 0, ensayos: 0, nivelMax: esc.nivel, timers: [], sid: 1, opc: null, ult: 0, hudT: 0, fpsAc: 0, fpsN: 0, lento: 0, inicio: 0 };

    const el = {
      nivel: h('span', { cls: 'j-nv', txt: 'Nv ' + esc.nivel }), pts: h('span', { cls: 'j-pts', txt: '0' }),
      tiempo: h('span', { cls: 'j-t', txt: tut ? 'Tutorial ' + tut + '/3' : Math.ceil(durS) + ' s' }),
      barra: h('i'), aviso: h('div', { cls: 'j-aviso', 'aria-live': 'polite' }), consigna: h('div', { cls: 'j-consigna', 'aria-live': 'polite' }),
      zona: h('div', { cls: 'j-zona' }), fb: h('div', { cls: 'j-fb', 'aria-hidden': 'true' })
    };
    const bPausa = h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'aria-label': 'Pausa', txt: '⏸', on: { click: () => pausar(true) } });
    raiz.appendChild(h('div', { cls: 'j-hud' }, [h('b', { cls: 'j-nombre', txt: juego.nombre }), el.nivel, h('span', { cls: 'j-sp' }), el.pts, el.tiempo, bPausa]));
    raiz.appendChild(h('div', { cls: 'j-barra', role: 'progressbar', 'aria-label': 'Tiempo restante' }, el.barra));
    raiz.appendChild(el.aviso); raiz.appendChild(el.consigna); raiz.appendChild(el.zona); raiz.appendChild(el.fb);
    if (tut) el.aviso.textContent = `Tutorial ${tut}/3 · ` + (juego.tutorial[tut - 1] || '');
    const rng = crearRng(o.semilla || ((Date.now() ^ (Math.random() * 1e9)) >>> 0));

    const cx = {
      id: juego.id, tut, rng, zona: el.zona, h, e: {}, esOk, reducirMov: () => D.acc.reducirMov, daltonismo: () => D.acc.daltonismo,
      get nivel() { return esc.nivel; }, get t() { return s.t; }, get tiempoRestante() { return Math.max(0, s.durMs - s.t); },
      tx: (ms) => ms * tiempoExtra(), lvl: (a, b) => Esc.interpolar(esc.nivel, a, b), sonido: Sonido, vibrar,
      en(ms, fn) { const id = s.sid++; s.timers.push({ t: s.t + ms, fn, id }); return id; },
      cancelar(id) { s.timers = s.timers.filter((x) => x.id !== id); },
      consigna(txt) { el.consigna.textContent = txt || ''; },
      msg(txt) { el.consigna.textContent = txt || ''; },
      resaltar(e) { if (tut === 1 && e) e.classList.add('pista'); },
      reportar(ok, op = {}) {
        if (s.fin || s.cuenta) return;
        s.ensayos++;
        const antes = esc.nivel;
        if (ok) {
          s.aciertos++; s.racha++; s.mejorRacha = Math.max(s.mejorRacha, s.racha);
          const p = op.pts != null ? op.pts : puntosEnsayo(esc.nivel, s.racha);
          if (!tut) { s.puntos += p; el.pts.textContent = String(s.puntos); }
          fb('✓' + (tut ? '' : ' +' + p), true);
          Sonido.ok();
        } else { s.errores++; s.racha = 0; fb('✗', false); Sonido.mal(); vibrar(60); }
        if (!tut) Esc.registrar(esc, ok);
        if (esc.nivel !== antes) {
          el.nivel.textContent = 'Nv ' + esc.nivel; s.nivelMax = Math.max(s.nivelMax, esc.nivel);
          el.nivel.classList.remove('sube'); void el.nivel.offsetWidth; el.nivel.classList.add('sube');
          if (esc.nivel > antes) Sonido.nivel();
        }
        if (tut && s.ensayos >= ENSAYOS_TUT[tut]) cx.en(700, () => terminar());
      },
      fin() { terminar(); },
      opciones(items, cb, op = {}) {
        const n = items.length;
        const cont = h('div', { cls: 'opc c' + (op.cols || (n <= 4 ? Math.min(n, 2) : 3)) + (op.cls ? ' ' + op.cls : '') });
        const inst = { btns: [], bloqueado: false, cb };
        items.forEach((it, i) => {
          const b = h('button', { type: 'button', cls: 'op' + (it && it.cls ? ' ' + it.cls : ''), 'data-f': 1, 'aria-label': it && it.aria ? it.aria : null, on: { click: () => { if (!inst.bloqueado && !s.pausado && !s.fin) cb(i, b); } } },
            [h('span', { cls: 'tecla', txt: String(i + 1) }), typeof it === 'object' && it.nodo ? it.nodo : h('span', { cls: 'txt', txt: typeof it === 'object' ? it.txt : String(it) })]);
          inst.btns.push(b); cont.appendChild(b);
        });
        inst.el = cont; inst.marcar = (i, ok) => { inst.btns[i].classList.add(ok ? 'acierto' : 'fallo'); };
        (op.destino || el.zona).appendChild(cont);
        s.opc = inst;
        return inst;
      },
      canvas(w, hh) {
        const c = h('canvas', { cls: 'j-canvas', 'aria-hidden': 'true' });
        const r = Math.min(2, (window.devicePixelRatio || 1)) * D.resolucion;
        c.width = Math.round(w * r); c.height = Math.round(hh * r); c.style.aspectRatio = w + '/' + hh;
        const g = c.getContext('2d'); g.scale(r, r);
        el.zona.appendChild(c);
        return { c, g, w, h: hh, punto: (ev) => { const b = c.getBoundingClientRect(); return { x: (ev.clientX - b.left) * w / b.width, y: (ev.clientY - b.top) * hh / b.height }; } };
      }
    };

    function fb(txt, ok) {
      el.fb.textContent = txt; el.fb.className = 'j-fb ' + (ok ? 'ok' : 'mal');
      void el.fb.offsetWidth; el.fb.classList.add('ver');
      el.zona.classList.remove('f-ok', 'f-mal'); void el.zona.offsetWidth; el.zona.classList.add(ok ? 'f-ok' : 'f-mal');
    }
    function actor(a) {
      if (a === 'pausa') { pausar(!s.pausado); return; }
      if (s.pausado || s.cuenta || s.fin) return;
      if (juego.entrada && juego.entrada(cx, a)) return;
      const op = s.opc; if (!op || op.bloqueado || !op.el.isConnected) return;
      const n = op.btns.length; let i = -1;
      if (/^[1-9]$/.test(a)) i = Number(a) - 1;
      else if (a === 'a') i = 0; else if (a === 'b') i = 1; else if (a === 'x') i = 2; else if (a === 'y') i = 3;
      else if (a === 'izq') i = 0;
      else if (a === 'der') i = n <= 3 ? n - 1 : 2;
      else if (a === 'arriba') i = n >= 3 ? 1 : -1;
      else if (a === 'abajo') i = n >= 4 ? 3 : -1;
      if (i >= 0 && i < n) op.btns[i].click();
    }
    let capaPausa = null;
    function pausar(p) {
      if (s.fin || s.cuenta) return;
      if (p === s.pausado) return;
      s.pausado = p;
      if (p) {
        Entrada.juego = null; Sonido.musica(false);
        capaPausa = h('div', { cls: 'capa-modal pausa' }, h('div', { cls: 'caja' }, [
          h('h2', { txt: 'Pausa' }), h('p', { cls: 'nota', txt: 'El tiempo está detenido.' }),
          h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, 'data-atras': 1, txt: 'Continuar', on: { click: () => pausar(false) } }),
          h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Abandonar', on: { click: () => terminar(true) } })]));
        document.body.appendChild(capaPausa);
        capaPausa.querySelector('button').focus();
      } else {
        if (capaPausa) capaPausa.remove(); capaPausa = null;
        Entrada.juego = actor; Entrada.tecla = (k) => !!(juego.tecla && !s.pausado && !s.cuenta && juego.tecla(cx, k)); s.ult = performance.now(); if (D.sonido.musica > 0) Sonido.musica(true);
      }
    }
    const oculta = () => { if (document.hidden && !s.fin) pausar(true); };
    document.addEventListener('visibilitychange', oculta);

    let raf = 0;
    function frame(ts) {
      if (s.fin) return;
      raf = requestAnimationFrame(frame);
      if (s.pausado) return;
      const paso = 1000 / (D.fpsMax || 60);
      if (D.fpsMax && ts - s.ult < paso - 3) return;
      const dt = Math.min(60, ts - (s.ult || ts)); s.ult = ts;
      s.t += dt;
      if (D.mostrarFps || D.autoBajada) fps(dt);
      s.timers.sort((a, b) => a.t - b.t);
      while (s.timers.length && s.timers[0].t <= s.t && !s.fin) { const x = s.timers.shift(); try { x.fn(); } catch (e) { console.error(e); } }
      if (s.fin) return;
      if (juego.loop) { try { juego.loop(cx, dt); } catch (e) { console.error(e); } }
      s.hudT += dt;
      if (s.durMs && s.hudT > 100) {
        s.hudT = 0; const r = Math.max(0, s.durMs - s.t);
        el.barra.style.width = (r / s.durMs * 100) + '%'; el.tiempo.textContent = Math.ceil(r / 1000) + ' s';
      }
      if (s.durMs && s.t >= s.durMs) terminar();
    }
    function fps(dt) {
      s.fpsAc += dt; s.fpsN++;
      if (s.fpsAc >= 1500) {
        const f = Math.round(s.fpsN * 1000 / s.fpsAc);
        const caja = document.getElementById('fps'); if (caja && D.mostrarFps) { caja.hidden = false; caja.textContent = f + ' FPS'; }
        if (D.autoBajada && f < 24) { if (++s.lento >= 3 && bajarCalidad()) s.lento = 0; } else s.lento = 0;
        s.fpsAc = 0; s.fpsN = 0;
      }
    }
    function limpiar() {
      s.fin = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', oculta);
      if (capaPausa) capaPausa.remove(); capaPausa = null;
      Entrada.juego = null; Entrada.tecla = null; Sonido.musica(false); activo = null;
      document.body.classList.remove('jugando'); raiz.hidden = true; vaciar(raiz);
    }
    function terminar(abandono) {
      if (s.fin) return;
      const dur = Math.round((performance.now() - s.inicio) / 100) / 10;
      if (abandono) { limpiar(); resolver(null); return; }
      const nEst = tut ? 0 : Esc.estimado(esc);
      let def = { id: juego.id, area: juego.area, puntos: s.puntos, aciertos: s.aciertos, errores: s.errores, ensayos: s.ensayos, precision: s.ensayos ? s.aciertos / s.ensayos : 0, mejorRacha: s.mejorRacha, nivelFinal: esc.nivel, nivelEst: nEst, nivelMax: s.nivelMax, dur, tut, pocos: s.ensayos < 4, aprobado: tut ? (tut < 3 || s.aciertos >= 3) : true };
      try { if (juego.resultado) def = juego.resultado(cx, def) || def; } catch (e) { console.error(e); }
      limpiar(); Sonido.fin(); resolver(def);
    }
    activo = { cx, juego, pausar, terminar, estado: s, esc };
    // cuenta atras 3-2-1 y arranque
    const cuenta = h('div', { cls: 'j-cuenta', 'aria-live': 'assertive' });
    raiz.appendChild(cuenta);
    let n = 3;
    const paso = () => {
      if (s.fin) return;
      if (n === 0) {
        cuenta.remove(); s.cuenta = false; s.inicio = performance.now(); s.ult = performance.now();
        Entrada.juego = actor; Entrada.tecla = (k) => !!(juego.tecla && !s.pausado && !s.cuenta && juego.tecla(cx, k)); if (D.sonido.musica > 0) Sonido.musica(true);
        try { juego.init(cx); } catch (e) { console.error(e); terminar(); return; }
        raf = requestAnimationFrame(frame); return;
      }
      cuenta.textContent = n === 3 && o.etiqueta ? o.etiqueta : String(n); if (n === 3 && o.etiqueta) { cuenta.classList.add('txt'); } else cuenta.classList.remove('txt');
      Sonido.clic(); n--; setTimeout(paso, DUR_TEST && DUR_TEST < 10 ? 120 : 650);
    };
    // la cuenta atras muestra siempre el nombre del juego en el primer paso
    cuenta.textContent = juego.nombre; cuenta.classList.add('txt'); setTimeout(paso, DUR_TEST && DUR_TEST < 10 ? 150 : 900);
  });
}
