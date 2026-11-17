// Vista del tablero: layout, dibujo por capas, particulas y efectos a partir de los eventos del motor.
import { P, Z, FILAS, COLS, MUNDOS } from './datos.js';
import * as Ar from './arte.js';
import * as S from './sonido.js';
import { idx, viento, oscuro } from './motor.js';

const TAU = Math.PI * 2;
export class Vista {
  constructor(cv, ajustes) {
    this.cv = cv; this.g = cv.getContext('2d'); this.aj = ajustes; this.L = { ox: 0, oy: 0, t: 40, w: 0, h: 0 }; this.part = []; this.textos = []; this.rayos = []; this.anillos = []; this.haces = []; this.sacudir = 0; this.t = 0; this.destello = 0; this.pend = []; this.mundo = 0; this.margen = { t: 48, l: 0, b: 0, r: 0 };
    this.cursor = null; this.sel = null; this.modo = null; this.fantasma = null; this.pista = []; this.resFactor = 1;
  }
  nivelGraf() { const c = this.aj.graficos.calidad; return c === 'baja' ? 0 : c === 'media' ? 1 : c === 'alta' ? 2 : 3; }
  redimensionar(w, h, dpr, margen) {
    const pr = Math.min(dpr || 1, 2) * (this.aj.graficos.res || 1) * this.resFactor; this.cv.width = Math.round(w * pr); this.cv.height = Math.round(h * pr); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; this.pr = pr; this.W = w; this.H = h; if (margen) this.margen = margen;
    const m = this.margen, aw = w - m.l - m.r, ah = h - m.t - m.b, t = Math.max(24, Math.min(aw / (COLS + 0.85), ah / (FILAS + 0.35)));
    this.L = { t, ox: m.l + (aw - t * (COLS + 0.85)) / 2 + t * 0.4, oy: m.t + Math.max(0, (ah - t * (FILAS + 0.35)) / 2) + t * 0.1, w: t * COLS, h: t * FILAS };
  }
  /* ---------- conversiones ---------- */
  celdaEn(px, py) { const { ox, oy, t } = this.L, c = Math.floor((px - ox) / t), r = Math.floor((py - oy) / t); return r >= 0 && r < FILAS && c >= 0 && c < COLS ? { r, c } : null; }
  xc(x) { return this.L.ox + x * this.L.t; }
  yb(r, f = 0.94) { return this.L.oy + (r + f) * this.L.t; }
  zombiEn(s, px, py) {
    let b = null, bd = 1e9; const t = this.L.t;
    for (const z of s.zombis) { if (z.estado === 'muere' || z.x > 9.8) continue; const zx = this.xc(z.x), zy = this.yb(z.r, 0.55), esc = ((Z[z.tipo].vis || {}).esc || 1), dx = Math.abs(px - zx), dy = Math.abs(py - zy); if (dx < t * 0.45 * esc + 8 && dy < t * 0.55 * esc + 8) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; b = z; } } }
    return b;
  }
  orbeEn(s, px, py) { const t = this.L.t; let b = null, bd = 1e9; for (const o of s.orbes) { const x = this.xc(o.x), y = this.L.oy + (o.y + 0.5) * t; const d = (px - x) ** 2 + (py - y) ** 2; if (d < (t * 0.75) ** 2 && d < bd) { bd = d; b = o; } } return b; }

  /* ---------- particulas ---------- */
  chispa(x, y, n, col, vel, vida, g) { if (!this.aj.graficos.particulas) n = Math.ceil(n * 0.25); const k = [0.4, 0.7, 1, 1.4][this.nivelGraf()] * (this.aj.accesibilidad.reducir ? 0.4 : 1); n = Math.ceil(n * k); for (let i = 0; i < n && this.part.length < 700; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * vel; this.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - vel * 0.3, v: vida * (0.6 + Math.random() * 0.6), T: vida, col, g: g || 2.2, r: 1.5 + Math.random() * 2.5 }); } }
  texto(x, y, txt, col, tam) { if (this.textos.length < 40) this.textos.push({ x, y, txt, col: col || '#fff', t: 0, tam: tam || 1 }); }
  anillo(x, y, r, col, T) { this.anillos.push({ x, y, r, col, t: 0, T: T || 0.5 }); }
  px(x) { return this.xc(x); }
  /* eventos del motor -> efectos y sonidos */
  eventos(s, lista) {
    const t = this.L.t, sonido = S.sfx;
    for (const e of lista) {
      const x = e.x != null ? this.xc(e.x) : (e.c != null ? this.xc(e.c + 0.5) : 0), y = e.r != null ? this.yb(e.r, 0.55) : 0;
      switch (e.k) {
        case 'planta': this.chispa(this.xc(e.c + 0.5), this.yb(e.r), 8, '#8a6a3a', t * 3, 0.5); sonido('plantar'); break;
        case 'planta_muere': this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.6), 14, '#7aa84a', t * 4, 0.7); break;
        case 'pala': sonido('pala'); this.chispa(x, this.yb(e.r), 6, '#aaa', t * 2, 0.4); break;
        case 'dispara': if (!e.quiet) sonido('dispara'); break;
        case 'impacto': this.chispa(x, y, 5, e.col || '#8f8', t * 3, 0.35); sonido('impacto'); break;
        case 'golpe': this.chispa(x, y, 2, '#cfa', t * 2, 0.25); break;
        case 'golpeMetal': this.chispa(x, y, 5, '#ffe', t * 4, 0.3); sonido('golpeMetal'); break;
        case 'armaRota': this.chispa(x, y, 12, '#aab', t * 4, 0.6); break;
        case 'muerde': sonido('muerde'); break;
        case 'muere': this.chispa(x, y, 14, '#9ac', t * 3.5, 0.6); this.chispa(x, y, 4, '#fff', t * 5, 0.4); sonido('muere'); break;
        case 'explosion': this.anillo(x, y, t * (e.chica ? 1 : 1.6), '#ffb04a', 0.45); this.chispa(x, y, e.chica ? 14 : 34, '#ff8a2a', t * 8, 0.8); this.chispa(x, y, 12, '#444', t * 4, 1); this.sacudir = Math.max(this.sacudir, e.chica ? 0.12 : 0.3); sonido('explosion'); this.destello = Math.max(this.destello, e.chica ? 0 : 0.25); break;
        case 'area': this.anillo(x, y, t * (e.rad || 1), e.c || '#ffb04a', 0.35); break;
        case 'recoge': if (e.o === 'ch') sonido('sol'); else if (e.o === 'mon') { sonido('moneda'); this.texto(x, this.L.oy + e.y * t, '+' + e.v, '#ffd94a'); } else if (e.o === 'gema') { sonido('gema'); this.texto(x, this.L.oy + e.y * t, '+' + e.v + ' 💎', '#9aeaff'); } else if (e.o === 'verde') { sonido('verde'); this.anillo(x, this.L.oy + (e.y + 0.5) * t, t, '#6f6', 0.6); } break;
        case 'pulso': sonido('pulso'); this.haces.push({ r: e.r, t: 0, T: 0.8, col: '#ffd94a', ancho: 0.6 }); this.sacudir = 0.3; break;
        case 'ola': sonido('ola'); this.pend.push({ k: 'banner', txt: e.t ? '¡Una oleada enorme se acerca!' : '¡Llega una oleada!' }); break;
        case 'energia': this.efectoEnergia(s, e); break;
        case 'haz': this.haces.push({ r: e.r, t: 0, T: 0.6, col: e.col || '#fff', ancho: 0.35, x0: e.c }); sonido('rayo'); break;
        case 'ola_e': this.haces.push({ r: e.r, t: 0, T: 0.7, col: e.col || '#fff', ancho: 1.6, x0: e.c, ola: 1 }); this.sacudir = 0.3; sonido('ola'); break;
        case 'rayo': { const pts = e.pts.map((p) => [this.xc(p.x), this.yb(p.r, 0.5)]); this.rayos.push({ pts, t: 0 }); sonido('rayo'); break; }
        case 'rayoCae': this.rayos.push({ pts: [[x, 0], [x, y]], t: 0 }); this.anillo(x, y, t * 0.9, '#ffe84a', 0.3); sonido('rayo'); break;
        case 'tumbaAbre': sonido('tumba'); this.chispa(x, this.yb(e.r), 16, '#9f9', t * 3, 0.8); break;
        case 'tumbaRota': sonido('tumba'); this.chispa(x, this.yb(e.r), 20, '#999', t * 4, 0.7); break;
        case 'tumbaGolpe': this.chispa(x, this.yb(e.r), 4, '#999', t * 2, 0.3); break;
        case 'lavaAviso': this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.5), 3, '#fa4', t * 2, 0.5); break;
        case 'lava': sonido('lava'); this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.5), 30, '#ff6a1a', t * 6, 1); this.sacudir = 0.2; break;
        case 'viento': sonido('viento'); this.pend.push({ k: 'banner', txt: '¡Ráfaga de viento!' }); break;
        case 'vientoAviso': this.pend.push({ k: 'banner', txt: 'Viento ' + (e.dir > 0 ? '→ a favor' : '← en contra') }); break;
        case 'carroAviso': sonido('aviso'); this.pend.push({ k: 'banner', txt: '¡Vagoneta en la fila ' + (e.r + 1) + '!' }); break;
        case 'naveAviso': sonido('aviso'); break;
        case 'naveAterriza': sonido('nave'); this.sacudir = 0.4; this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.5), 30, '#aaf', t * 6, 0.9); break;
        case 'portal': sonido('portal'); this.anillo(this.xc(e.c + 0.5), this.yb(e.r, 0.5), t * 0.6, '#8ff', 0.4); break;
        case 'apagon': this.pend.push({ k: 'banner', txt: '¡Apagón!' }); break;
        case 'faseJefe': sonido('jefe'); this.sacudir = 0.4; this.pend.push({ k: 'banner', txt: '¡El jefe se enfurece!' }); break;
        case 'jefeCae': this.destello = 0.6; sonido('victoria'); break;
        case 'invoca': this.anillo(x, y, t, '#c6f', 0.5); break;
        case 'rugido': this.anillo(x, y, t * 3, '#fff', 0.7); this.sacudir = 0.3; sonido('jefe'); break;
        case 'error': sonido('error'); break;
        case 'mejora': this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.6), 18, '#ffd94a', t * 3, 0.8); sonido('mejora'); break;
        case 'pellizco': sonido('pellizco'); this.chispa(x, y, 8, '#fff', t * 3, 0.4); break;
        case 'sacude': sonido('sacude'); this.chispa(x, y, 12, '#cdf', t * 3, 0.5); break;
        case 'lanza': sonido('lanza'); this.chispa(this.xc(e.x2), this.yb(e.r2, 0.5), 10, '#fff', t * 3, 0.4); break;
        case 'pinata': sonido('pinata'); this.chispa(x, y, 40, ['#ff8ad8', '#ffd84a', '#6ad8ff', '#8aff8a'][Math.floor(Math.random() * 4)], t * 6, 1.1); break;
        case 'congelaTodo': sonido('congela'); this.destello = 0.3; break;
        case 'paradoja': this.haces.push({ r: e.r, t: 0, T: 0.5, col: '#f8f', ancho: 0.4 }); break;
        case 'teleporta': this.chispa(x, y, 10, '#caf', t * 3, 0.5); break;
        case 'revive': this.chispa(this.xc(e.c + 0.5), this.yb(e.r, 0.6), 18, '#cfa', t * 3, 0.8); break;
        case 'fin': break;
      }
    }
  }
  efectoEnergia(s, e) {
    const t = this.L.t, x = this.xc(e.c + 0.5), y = this.yb(e.r, 0.5), col = (P[e.id] || { col: ['#6f6'] }).col[0];
    S.sfx('energia'); this.destello = Math.max(this.destello, 0.35); this.sacudir = Math.max(this.sacudir, 0.35);
    for (let i = 0; i < 3; i++) this.anillo(x, y, t * (1.2 + i * 1.1), i % 2 ? col : '#8f8', 0.6 + i * 0.15);
    this.chispa(x, y, 50, '#9f9', t * 7, 1.1); this.chispa(x, y, 30, col, t * 5, 1.1);
    this.pend.push({ k: 'banner', txt: '⚡ ' + (P[e.id] ? P[e.id].en.nom : 'Energía Verde'), col: '#9f9' });
  }
  /* ---------- dibujo ---------- */
  dibujar(s, dt, ctx) {
    const g = this.g, L = this.L, t = L.t, aj = this.aj; this.t += dt; const T = this.t, gf = this.nivelGraf();
    g.setTransform(this.pr, 0, 0, this.pr, 0, 0);
    let sx = 0, sy = 0; if (this.sacudir > 0 && !aj.accesibilidad.reducir) { sx = (Math.random() - 0.5) * this.sacudir * 14; sy = (Math.random() - 0.5) * this.sacudir * 14; } this.sacudir = Math.max(0, this.sacudir - dt);
    g.save(); g.translate(sx, sy);
    Ar.fondoMundo(g, s.niv.mundo, this.W, this.H, T, aj.accesibilidad.reducir);
    const m = s.niv.mundo;
    // casillas
    for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) Ar.dibujarCasilla(g, m, r, c, L.ox + c * t, L.oy + r * t, t, t, s.cel[idx(r, c)], T);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; g.strokeRect(L.ox, L.oy, L.w, L.h);
    // carriles en peligro
    for (let r = 0; r < FILAS; r++) { let pel = false; for (const z of s.zombis) if (z.r === r && z.estado !== 'muere' && z.x < 2.4 && z.x > -0.3) { pel = true; break; } if (pel) { g.fillStyle = `rgba(255,40,40,${0.12 + 0.1 * Math.sin(T * 9)})`; g.fillRect(L.ox, L.oy + r * t, t * 1.2, t); } if (s.pulso[r] > 0) { g.save(); g.translate(L.ox - t * 0.1, L.oy + (r + 0.65) * t); g.scale(t * 0.5, t * 0.5); g.fillStyle = '#ffd94a'; g.strokeStyle = '#7a5a00'; g.lineWidth = 0.08; g.beginPath(); g.arc(0, 0, 0.35, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#7a5a00'; g.fillRect(-0.12, -0.04, 0.24, 0.08); if (s.pulso[r] > 1) { g.fillStyle = '#fff'; g.font = 'bold 0.4px sans-serif'; g.fillText('2', 0.2, -0.3); } g.restore(); } }
    // sombras de aviso: pistas y vagonetas
    for (const a of s.mec.avisos) { if (a.nave) { const x = L.ox + a.c * t, y = L.oy + a.r * t; g.fillStyle = `rgba(255,80,80,${0.25 + 0.2 * Math.sin(T * 10)})`; g.fillRect(x, y, t, t); g.strokeStyle = '#f66'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, t - 6, t - 6); } else { g.fillStyle = `rgba(255,180,40,${0.2 + 0.15 * Math.sin(T * 12)})`; g.fillRect(L.ox, L.oy + a.r * t, L.w, t); g.fillStyle = '#fc4'; g.font = `bold ${t * 0.5}px sans-serif`; g.textAlign = 'center'; g.fillText('⚠', L.ox + L.w - t * 0.5, L.oy + (a.r + 0.7) * t); } }
    // seleccion y cursor
    const cur = this.cursor;
    if (this.modo === 'planta' && this.sel != null) { for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLS; c++) { if (ctx.puede && ctx.puede(r, c)) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(L.ox + c * t + 1, L.oy + r * t + 1, t - 2, t - 2); } } }
    if (this.modo === 'energia') { for (const p of s.plantas) if (P[p.id].en && !p.tmp) { g.strokeStyle = `rgba(120,255,120,${0.5 + 0.4 * Math.sin(T * 8)})`; g.lineWidth = 3; g.strokeRect(L.ox + p.c * t + 2, L.oy + p.r * t + 2, t - 4, t - 4); } }
    if (this.pista.length) for (const q of this.pista) { g.strokeStyle = `rgba(255,230,80,${0.5 + 0.4 * Math.sin(T * 6)})`; g.lineWidth = 3; g.strokeRect(L.ox + q.c * t + 2, L.oy + q.r * t + 2, t - 4, t - 4); }
    if (cur) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.strokeRect(L.ox + cur.c * t + 1.5, L.oy + cur.r * t + 1.5, t - 3, t - 3); if (this.modo === 'planta' && this.sel != null && this.fantasma) { g.globalAlpha = 0.55; Ar.dibujarPlanta(g, this.fantasma, L.ox + (cur.c + 0.5) * t, this.yb(cur.r), t, T, { hp: 1 }); g.globalAlpha = 1; } }
    // luces nocturnas bajo entidades
    // entidades por fila
    for (let r = 0; r < FILAS; r++) {
      for (const p of s.plantas) if (p.r === r) {
        const cl = s.cel[idx(p.r, p.c)], x = L.ox + (p.c + 0.5) * t, y = this.yb(r), esBase = p.k === 'base';
        const dark = oscuro(s, p) || p.atur > 0; if (dark) g.globalAlpha = 0.45;
        const hp = p.hp / p.hpMax; if (p.verde > 0) p.verde -= dt;
        if (p.verde > 0 || (p.fx && p.fx.t > 0) || p.esp || p.gigante > 0 || p.inv > 0) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y - t * 0.45, t * 0.1, x, y - t * 0.45, t * 0.8); gr.addColorStop(0, p.inv > 0 ? 'rgba(160,220,255,0.55)' : 'rgba(100,255,120,0.5)'); gr.addColorStop(1, 'rgba(100,255,120,0)'); g.fillStyle = gr; g.fillRect(x - t, y - t * 1.4, t * 2, t * 1.6); g.globalCompositeOperation = 'source-over'; }
        if (cl.ter === 'agua' && !esBase) { }
        Ar.dibujarPlanta(g, p.id, x, esBase ? y + t * 0.02 : y - (cl.base ? t * 0.12 : 0), t, T + p.c * 0.7 + p.r, { hp, hit: p.hit, nv: p.nv, gigante: p.gigante > 0, verde: p.verde });
        g.globalAlpha = 1;
        if (hp < 0.999 && !esBase) { const bw = t * 0.5; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - bw / 2, y + 2, bw, 4); g.fillStyle = hp > 0.5 ? '#6f6' : hp > 0.25 ? '#fc4' : '#f55'; g.fillRect(x - bw / 2, y + 2, bw * Math.max(0, hp), 4); }
        if (p.atur > 0) { g.fillStyle = '#fff'; g.font = `${t * 0.4}px sans-serif`; g.textAlign = 'center'; g.fillText('💤', x, y - t * 0.9); }
        if (p.tmp) { g.strokeStyle = 'rgba(160,255,160,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - t * 0.45, t * 0.42, 0, TAU * Math.max(0, p.mom / 14)); g.stroke(); }
        if (p.nv > 1 || (p.lv && p.lv > 1)) { g.fillStyle = '#ffd94a'; g.font = `bold ${Math.max(9, t * 0.22)}px sans-serif`; g.textAlign = 'left'; g.fillText('★'.repeat(p.nv - 1), x - t * 0.4, y - 2); }
      }
      const zs = s.zombis.filter((z) => z.r === r).sort((a, b) => b.x - a.x);
      for (const z of zs) {
        if (z.x > 9.9) continue; const d = Z[z.tipo]; const aireY = z.aire ? -t * 0.28 : 0; const x = this.xc(z.x), y = this.yb(r, 0.97);
        Ar.dibujarZombi(g, z, x, y, t, T + z.tm, { dalt: Ar.DALT[aj.accesibilidad.dalt] || null });
        if (z.estado !== 'muere' && (z.hp < z.hpMax * 0.995 && (d.jefe || d.tier >= 4 || z.hp < z.hpMax * 0.7)) && z.x < 9.5) { const bw = t * (d.jefe ? 1 : 0.5), by = y - t * ((((d.vis || {}).esc) || 1) * 1.1 + 0.15) + aireY; g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x - bw / 2, by, bw, 5); g.fillStyle = d.jefe ? '#f4a' : '#f66'; g.fillRect(x - bw / 2, by, bw * Math.max(0, z.hp / z.hpMax), 5); }
      }
    }
    // proyectiles
    for (const q of s.proy) { if (q.esp > 0) continue; const x = this.xc(q.x), y = this.yb(q.r, 0.42); if (q.enem) { Ar.dibujarOrbe(g, { k: 'ch', id: 0 }, x, y, 0.0001, T); g.fillStyle = '#f84'; g.beginPath(); g.arc(x, y, t * 0.12, 0, TAU); g.fill(); } else { g.fillStyle = q.col || '#8f8'; g.beginPath(); g.arc(x, y, t * 0.1, 0, TAU); g.fill(); if (gf > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = (q.col || '#8f8') + '66'; g.beginPath(); g.arc(x - t * 0.08, y, t * 0.17, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; } } }
    // lobs y campos
    for (const e of s.efx) {
      if (e.k === 'lob') { if (e.t < 0) continue; const f = e.t / e.T, x0 = e.cielo ? e.x1 : e.x0, x = this.xc(x0 + (e.x1 - x0) * f), yb = this.yb(e.r, 0.5), h = e.cielo ? t * 5 * (1 - f) : Math.sin(f * Math.PI) * t * 1.6, y = yb - h; g.fillStyle = e.col || '#fa4'; g.beginPath(); g.arc(x, y, t * 0.14, 0, TAU); g.fill(); if (e.cielo) { g.strokeStyle = (e.col || '#fa4') + '88'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - t); g.lineTo(x, y); g.stroke(); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, yb + t * 0.2, t * 0.13, t * 0.05, 0, 0, TAU); g.fill(); }
      else if (e.k === 'campo') { g.fillStyle = `rgba(255,255,160,${0.1 + 0.06 * Math.sin(T * 10)})`; g.fillRect(L.ox, L.oy, L.w, L.h); }
    }
    // orbes
    for (const o of s.orbes) { const x = this.xc(o.x), y = L.oy + (o.y + 0.5) * t; const f = o.t > 9 && o.k !== 'verde' ? (Math.sin(o.t * 14) > 0 ? 1 : 0.4) : 1; g.globalAlpha = f; Ar.dibujarOrbe(g, o, x, y, t * 0.8, T); g.globalAlpha = 1; }
    // haces, rayos, anillos
    for (let i = this.haces.length - 1; i >= 0; i--) { const h = this.haces[i]; h.t += dt; if (h.t > h.T) { this.haces.splice(i, 1); continue; } const f = h.t / h.T, x0 = L.ox + (h.x0 != null ? (h.x0 + 0.5) * t : 0), a = 1 - f; g.globalCompositeOperation = 'lighter'; const y = L.oy + (h.r + 0.5) * t, hh = t * h.ancho * (h.ola ? 1 : a); const gr = g.createLinearGradient(x0, 0, L.ox + L.w, 0); gr.addColorStop(0, h.col); gr.addColorStop(1, h.col + '00'); g.globalAlpha = a * 0.8; g.fillStyle = h.col; if (h.ola) { const ex = x0 + (L.ox + L.w - x0) * Math.min(1, f * 1.5); g.fillRect(x0, y - hh / 2, ex - x0, hh); } else g.fillRect(x0, y - hh / 2, L.ox + L.w - x0, hh); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    for (let i = this.rayos.length - 1; i >= 0; i--) { const r = this.rayos[i]; r.t += dt; if (r.t > 0.25) { this.rayos.splice(i, 1); continue; } g.strokeStyle = `rgba(255,240,120,${1 - r.t * 4})`; g.lineWidth = 4; g.beginPath(); r.pts.forEach((p, k) => { const px = p[0] + (k && k < r.pts.length ? (Math.random() - 0.5) * 10 : 0); k ? g.lineTo(px, p[1] + (Math.random() - 0.5) * 6) : g.moveTo(px, p[1]); }); g.stroke(); g.strokeStyle = `rgba(255,255,255,${1 - r.t * 4})`; g.lineWidth = 1.5; g.stroke(); }
    for (let i = this.anillos.length - 1; i >= 0; i--) { const a = this.anillos[i]; a.t += dt; if (a.t > a.T) { this.anillos.splice(i, 1); continue; } const f = a.t / a.T; g.strokeStyle = a.col; g.globalAlpha = 1 - f; g.lineWidth = 4 * (1 - f) + 1; g.beginPath(); g.arc(a.x, a.y, a.r * (0.2 + f * 0.8), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // particulas
    g.globalCompositeOperation = gf > 0 ? 'lighter' : 'source-over';
    for (let i = this.part.length - 1; i >= 0; i--) { const p = this.part[i]; p.v -= dt; if (p.v <= 0) { this.part.splice(i, 1); continue; } p.vy += p.g * 60 * dt * 0.3; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = Math.max(0, p.v / p.T); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * (0.5 + p.v / p.T * 0.5), 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // iluminacion nocturna / apagon
    const W = MUNDOS[m]; if (W.noche && gf >= 1 && aj.graficos.luces) {
      g.fillStyle = 'rgba(6,8,30,0.28)'; g.fillRect(L.ox, L.oy, L.w, L.h); g.globalCompositeOperation = 'lighter';
      for (const p of s.plantas) if (p.luz || P[p.id].k === 'luz' || p.id === 'faro' || p.id === 'cristal' || p.id === 'dragon') { const x = L.ox + (p.c + 0.5) * t, y = this.yb(p.r, 0.5), gr = g.createRadialGradient(x, y, 0, x, y, t * 1.6); gr.addColorStop(0, 'rgba(255,240,170,0.35)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.fillRect(x - t * 1.6, y - t * 1.6, t * 3.2, t * 3.2); }
      for (const z of s.zombis) if (z.br && z.estado !== 'muere') { const x = this.xc(z.x), y = this.yb(z.r, 0.5), gr = g.createRadialGradient(x, y, 0, x, y, t); gr.addColorStop(0, 'rgba(120,255,140,0.35)'); gr.addColorStop(1, 'rgba(120,255,140,0)'); g.fillStyle = gr; g.fillRect(x - t, y - t, t * 2, t * 2); }
      g.globalCompositeOperation = 'source-over';
    }
    // viento
    const wv = viento(s); if (wv) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = L.oy + ((i * 47.3) % L.h), x = L.ox + (((T * 220 * wv) + i * 131) % (L.w + 80) + L.w + 80) % (L.w + 80) - 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 * wv, y); g.stroke(); } }
    // textos flotantes
    for (let i = this.textos.length - 1; i >= 0; i--) { const q = this.textos[i]; q.t += dt; if (q.t > 1.1) { this.textos.splice(i, 1); continue; } g.globalAlpha = 1 - q.t / 1.1; g.fillStyle = q.col; g.font = `bold ${Math.round(t * 0.34 * q.tam)}px sans-serif`; g.textAlign = 'center'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeText(q.txt, q.x, q.y - q.t * 30); g.fillText(q.txt, q.x, q.y - q.t * 30); g.globalAlpha = 1; }
    if (this.destello > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.6, this.destello)})`; g.fillRect(0, 0, this.W, this.H); this.destello = Math.max(0, this.destello - dt * 1.6); }
    g.restore();
  }
}
