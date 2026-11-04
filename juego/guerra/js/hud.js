// =============================================================
//  HUD: datos, vida, avisos, radar con minimapa, marcadores, killfeed, marcador,
//  instrumentos de cabina y mapa grande. Solo toca el DOM cuando un valor cambia.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { PALETAS } from './ajustes.js';

const $ = (id) => document.getElementById(id);
const P = new THREE.Vector3(), Q = new THREE.Vector3();
const ETIQ = { avion: ['ALAS', 'MOTOR', 'PILOTO'], tanque: ['ORUGAS', 'TORRETA', 'MOTOR'] };
const MAX_MARCAS = 36;

export class Hud {
  constructor() {
    this.raiz = $('hud');
    this.el = {
      puntaje: $('hPuntaje'), oleada: $('hOleada'), enemigos: $('hEnemigos'), vida: $('hVida'),
      aviso: $('aviso'), estado: $('estado'), recarga: $('recarga'), hRecarga: $('hRecarga'),
      modulos: $('modulos'), mOrugas: $('mOrugas'), mTorreta: $('mTorreta'), mMotor: $('mMotor'),
      dano: $('dano'), miraRaton: $('miraRaton'), lead: $('lead'), marcadores: $('marcadores'), radar: $('radar'),
      etOleada: $('etOleada'), etEnemigos: $('etEnemigos'),
      kill: $('killfeed'), tickets: $('tickets'), pista: $('pistaTut'), tabla: $('tabla'), cuenta: $('cuenta'),
      instr: $('instrumentos'), mapaG: $('mapaGrande'), herido: $('herido'), acierto: $('acierto'), mision: $('misionTxt'),
      reaparecer: $('reaparecer'),
    };
    this.cache = {};
    this.rctx = this.el.radar.getContext('2d');
    this.ictx = this.el.instr ? this.el.instr.getContext('2d') : null;
    this.mctx = this.el.mapaG ? this.el.mapaG.getContext('2d') : null;
    this.marcas = [];
    for (let i = 0; i < MAX_MARCAS; i++) {
      const d = document.createElement('div');
      d.className = 'marca';
      d.appendChild(document.createElement('span'));
      this.el.marcadores.appendChild(d);
      this.marcas.push(d);
    }
    this.tAviso = 0;
    this.tDano = 0;
    this.tRadar = 0;
    this.tAcierto = 0;
    this.lineas = [];
    this.paleta = PALETAS.ninguno;
    this.modoActual = 'avion';
  }

  fijarPaleta(p) { this.paleta = p; }

  _poner(clave, valor, fn) {
    if (this.cache[clave] === valor) return;
    this.cache[clave] = valor;
    fn(valor);
  }

  modo(m, avion) {
    this.modoActual = m;
    document.body.classList.toggle('modoAvion', m === 'avion');
    document.body.classList.toggle('modoTanque', m === 'tanque');
    // botones táctiles según el armamento del avión elegido
    const sec = avion && avion.sec.n > 0;
    $('btnMisil').classList.toggle('oculto', m === 'avion' && !sec);
    $('btnBomba').classList.toggle('oculto', m === 'avion' && avion.bombas === 0);
    $('btnBengala').classList.toggle('oculto', m !== 'avion');
    if (sec) $('btnMisil').textContent = avion.sec.nombre.slice(0, -1);
    const et = ETIQ[m] || ETIQ.avion;
    this.el.mOrugas.textContent = et[0];
    this.el.mTorreta.textContent = et[1];
    this.el.mMotor.textContent = et[2];
    this.el.modulos.classList.remove('oculto');
    this.el.recarga.classList.toggle('oculto', m !== 'tanque');
    this.cache = {};
  }

  datos(d) {
    this._poner('p', d.puntaje, (v) => { this.el.puntaje.textContent = v; });
    if (d.etiquetas) {
      this._poner('eo', d.etiquetas[0], (v) => { this.el.etOleada.textContent = v; });
      this._poner('ee', d.etiquetas[1], (v) => { this.el.etEnemigos.textContent = v; });
    }
    this._poner('o', d.textoOleada !== undefined ? d.textoOleada : d.oleada + '/' + CONFIG.oleadas, (v) => { this.el.oleada.textContent = v; });
    this._poner('e', d.enemigos, (v) => { this.el.enemigos.textContent = v; });
    const f = Math.max(0, Math.min(1, d.vida / d.vidaMax));
    this._poner('v', Math.round(f * 100), (v) => {
      this.el.vida.style.width = v + '%';
      this.el.vida.classList.toggle('bajo', v < 35);
    });
    if (d.estado !== undefined) this._poner('s', d.estado, (v) => { this.el.estado.textContent = v; });
    if (d.recarga !== undefined) {
      this._poner('r', Math.round(d.recarga * 50), (v) => {
        this.el.hRecarga.style.width = (v * 2) + '%';
        this.el.hRecarga.classList.toggle('lista', v >= 50);
      });
    }
    if (d.modulos) {
      const pon = (el, x, k) => this._poner(k, x > 0.6 ? 2 : x > 0.3 ? 1 : 0, (v) => {
        el.classList.toggle('mal', v === 1);
        el.classList.toggle('roto', v === 2);
      });
      pon(this.el.mOrugas, d.modulos[0], 'mo');
      pon(this.el.mTorreta, d.modulos[1], 'mt');
      pon(this.el.mMotor, d.modulos[2], 'mm');
    }
    if (d.herido !== undefined) this._poner('h', Math.round(d.herido * 10), (v) => { this.el.herido.style.opacity = v / 14; });
  }

  aviso(texto, seg = 2.2, alerta = false) {
    this.el.aviso.textContent = texto;
    this.el.aviso.classList.toggle('alerta', alerta);
    this.el.aviso.classList.add('visible');
    this.tAviso = seg;
  }

  golpe() {
    this.el.dano.classList.add('visible');
    this.tDano = 0.12;
  }

  acierto(muerte = false) {
    this.el.acierto.classList.add('visible');
    this.el.acierto.classList.toggle('baja', muerte);
    this.tAcierto = muerte ? 0.5 : 0.14;
  }

  cuenta(texto) {
    this.el.cuenta.textContent = texto || '';
    this.el.cuenta.classList.toggle('oculto', !texto);
  }

  mision(texto) {
    this._poner('mi', texto || '', (v) => { this.el.mision.textContent = v; this.el.mision.classList.toggle('oculto', !v); });
  }

  pista(texto) {
    this._poner('pi', texto || '', (v) => { this.el.pista.textContent = v; this.el.pista.classList.toggle('oculto', !v); });
  }

  // Línea del registro de bajas: texto con colores por equipo
  kill(a, b, ca = '#fff', cb = '#fff', extra = '') {
    const d = document.createElement('div');
    const sa = document.createElement('b'), sb = document.createElement('b');
    sa.textContent = a; sa.style.color = ca;
    sb.textContent = b; sb.style.color = cb;
    d.append(sa, document.createTextNode(' ' + (extra || '▸') + ' '), sb);
    this.el.kill.prepend(d);
    this.lineas.push({ d, t: 6 });
    while (this.el.kill.children.length > 6) this.el.kill.lastChild.remove();
  }

  // Barra de tickets y zonas: { a, ea, ma, me, zonas: ['a'|'e'|'n'], tiempo }
  tickets(t) {
    const e = this.el.tickets;
    if (!t) { e.classList.add('oculto'); return; }
    e.classList.remove('oculto');
    const txt = `${t.nombreA || 'ALIADOS'} ${t.a} | ${t.tiempo} | ${t.e} ${t.nombreE || 'ENEMIGOS'}|${(t.zonas || []).join('')}`;
    this._poner('tk', txt, () => {
      e.textContent = '';
      const sa = document.createElement('span'), st = document.createElement('i'), se = document.createElement('span');
      sa.className = 'ta'; se.className = 'te';
      sa.textContent = `${t.nombreA || 'ALIADOS'} ${t.a}`;
      se.textContent = `${t.e} ${t.nombreE || 'ENEMIGOS'}`;
      st.textContent = t.tiempo;
      e.append(sa, st, se);
      if (t.zonas && t.zonas.length) {
        const z = document.createElement('div');
        z.className = 'zonasHud';
        t.zonas.forEach((q, i) => { const s = document.createElement('u'); s.className = q; s.textContent = String.fromCharCode(65 + i); z.appendChild(s); });
        e.appendChild(z);
      }
    });
  }

  // Marcador: columnas = [{ titulo, color, filas: [[nombre, bajas, muertes, puntos, extra]] }]
  tabla(cols) {
    const t = this.el.tabla;
    if (!cols) { t.classList.add('oculto'); return; }
    t.classList.remove('oculto');
    t.textContent = '';
    for (const c of cols) {
      const d = document.createElement('div');
      d.className = 'colTabla';
      const h = document.createElement('h4');
      h.textContent = c.titulo;
      h.style.color = c.color;
      d.appendChild(h);
      const tb = document.createElement('table');
      const cab = document.createElement('tr');
      for (const x of ['JUGADOR', 'B', 'M', 'PTS']) { const th = document.createElement('th'); th.textContent = x; cab.appendChild(th); }
      tb.appendChild(cab);
      for (const f of c.filas) {
        const tr = document.createElement('tr');
        if (f[5]) tr.className = 'yo';
        if (f[4]) tr.className += ' muerto';
        for (let i = 0; i < 4; i++) { const td = document.createElement('td'); td.textContent = f[i]; tr.appendChild(td); }
        tb.appendChild(tr);
      }
      d.appendChild(tb);
      t.appendChild(d);
    }
  }

  tick(dt) {
    if (this.tAviso > 0) {
      this.tAviso -= dt;
      if (this.tAviso <= 0) this.el.aviso.classList.remove('visible');
    }
    if (this.tDano > 0) {
      this.tDano -= dt;
      if (this.tDano <= 0) this.el.dano.classList.remove('visible');
    }
    if (this.tAcierto > 0) {
      this.tAcierto -= dt;
      if (this.tAcierto <= 0) this.el.acierto.classList.remove('visible');
    }
    for (let i = this.lineas.length - 1; i >= 0; i--) {
      const l = this.lineas[i];
      l.t -= dt;
      if (l.t < 1) l.d.style.opacity = Math.max(0, l.t);
      if (l.t <= 0) { l.d.remove(); this.lineas.splice(i, 1); }
    }
  }

  limpiar() {
    this.el.aviso.classList.remove('visible');
    this.el.dano.classList.remove('visible');
    this.el.kill.textContent = '';
    this.lineas.length = 0;
    this.tickets(null);
    this.tabla(null);
    this.cuenta('');
    this.mision('');
    this.pista('');
    this.el.herido.style.opacity = 0;
    this.el.mapaG.classList.add('oculto');
    this.el.reaparecer.classList.add('oculto');
    for (const m of this.marcas) m.style.display = 'none';
    this.tAviso = this.tDano = 0;
  }

  // Marcadores sobre la pantalla; lista = [{ pos, clase, eq, nombre, apuntado, fijado }]
  marcadoresEnemigos(camara, lista, anchoPx, altoPx) {
    let n = 0;
    for (const e of lista) {
      if (n >= this.marcas.length) break;
      const d = e.pos.distanceTo(camara.position);
      if (d > 2600 || (e.eq === 'a' && d > 1500)) continue;
      P.copy(e.pos).project(camara);
      let fuera = false;
      let x = P.x, y = P.y;
      if (P.z > 1) { x = -x; y = -y; fuera = true; }
      if (Math.abs(x) > 0.94 || Math.abs(y) > 0.9) {
        if (e.eq === 'a') continue; // los aliados fuera de pantalla no estorban
        fuera = true;
        const m = Math.max(Math.abs(x) / 0.94, Math.abs(y) / 0.9) || 1;
        x /= m; y /= m;
      }
      const el = this.marcas[n++];
      el.style.display = 'block';
      el.className = 'marca ' + e.clase + (e.eq === 'a' ? ' aliado' : '') + (fuera ? ' fuera' : '') + (e.fijado ? ' fijado' : e.apuntado ? ' apuntado' : '');
      el.style.color = e.color || '';
      if (e.eq === 'a' && e.color) el.style.borderColor = e.color; else el.style.borderColor = '';
      let giro = '';
      if (fuera) giro = ` rotate(${Math.atan2(x, y)}rad)`;
      el.style.transform = `translate(${((x + 1) / 2) * anchoPx}px, ${((1 - y) / 2) * altoPx}px)${giro}`;
      if (!fuera) el.firstChild.textContent = (e.nombre ? e.nombre + ' · ' : '') + (d | 0) + ' m';
    }
    for (let i = n; i < this.marcas.length; i++) this.marcas[i].style.display = 'none';
  }

  // Cursor del ratón (punto de vuelo) y mira de adelanto sobre el enemigo
  indicadores(camara, anchoPx, altoPx, dirAim, punto) {
    this._situar(this.el.miraRaton, dirAim ? P.copy(camara.position).addScaledVector(dirAim, 1000) : null, camara, anchoPx, altoPx);
    this._situar(this.el.lead, punto, camara, anchoPx, altoPx);
  }

  _situar(el, pos, camara, anchoPx, altoPx) {
    let v = null;
    if (pos) {
      Q.copy(pos).project(camara);
      if (Q.z < 1 && Math.abs(Q.x) < 1.1 && Math.abs(Q.y) < 1.1) v = `translate(${((Q.x + 1) / 2) * anchoPx}px, ${((1 - Q.y) / 2) * altoPx}px)`;
    }
    const clave = v || 'x';
    if (el._v === clave) return;
    el._v = clave;
    el.style.display = v ? 'block' : 'none';
    if (v) el.style.transform = v;
  }

  _color(e) {
    const p = this.paleta;
    if (e.color) return e.color;
    if (e.eq === 'a') return p.aliado;
    if (e.eq === 'n') return p.neutro;
    return e.clase === 'tierra' ? p.objetivo : p.enemigo;
  }

  _icono(g, e, ex, ez) {
    g.fillStyle = this._color(e);
    g.beginPath();
    if (e.clase === 'aire') { g.moveTo(ex, ez - 6); g.lineTo(ex + 5, ez + 5); g.lineTo(ex - 5, ez + 5); g.closePath(); }
    else g.rect(ex - 4, ez - 4, 8, 8);
    g.fill();
    if (e.yo) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
  }

  // Radar redondo con el mapa girando según hacia dónde miras
  radar(dt, d) {
    this.tRadar -= dt;
    this._ultimoRadar = d;
    if (this.tRadar > 0) return;
    this.tRadar = 1 / 20;
    const g = this.rctx;
    const R = 150;
    const s = R / d.alcance;
    g.clearRect(0, 0, 300, 300);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 3, 0, Math.PI * 2);
    g.clip();
    g.translate(R, R);
    g.rotate(d.rumbo);
    g.globalAlpha = 0.75;
    const T = CONFIG.mundo.tam;
    g.drawImage(d.mapa, (-d.x - T / 2) * s, (-d.z - T / 2) * s, T * s, T * s);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(61,245,255,0.35)';
    g.lineWidth = 1;
    for (const f of [0.33, 0.66]) { g.beginPath(); g.arc(0, 0, R * f, 0, Math.PI * 2); g.stroke(); }
    if (d.zonas) {
      for (const z of d.zonas) {
        g.strokeStyle = this._color({ eq: z.eq });
        g.fillStyle = g.strokeStyle;
        g.lineWidth = 2;
        g.globalAlpha = 0.9;
        g.beginPath();
        g.arc((z.x - d.x) * s, (z.z - d.z) * s, Math.max(5, z.r * s), 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 0.18;
        g.fill();
        g.globalAlpha = 1;
      }
    }
    for (const e of d.entidades) {
      const ex = (e.x - d.x) * s, ez = (e.z - d.z) * s;
      if (ex * ex + ez * ez > (R - 6) * (R - 6)) continue;
      this._icono(g, e, ex, ez);
    }
    g.restore();
    // jugador (siempre mirando arriba)
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(R, R - 10); g.lineTo(R + 7, R + 8); g.lineTo(R, R + 4); g.lineTo(R - 7, R + 8); g.closePath();
    g.fill();
  }

  // Mapa de todo el campo de batalla (tecla M o tocar el radar)
  mapaGrande(visible) {
    const c = this.el.mapaG;
    c.classList.toggle('oculto', !visible);
    this.verMapa = visible;
  }

  dibujarMapaGrande(d) {
    if (!this.verMapa) return;
    const g = this.mctx, S = this.el.mapaG.width, T = CONFIG.mundo.tam, k = S / T;
    g.clearRect(0, 0, S, S);
    g.globalAlpha = 0.92;
    g.drawImage(d.mapa, 0, 0, S, S);
    g.globalAlpha = 1;
    const X = (x) => (x + T / 2) * k, Z = (z) => (z + T / 2) * k;
    if (d.zonas) for (const z of d.zonas) {
      g.strokeStyle = g.fillStyle = this._color({ eq: z.eq });
      g.lineWidth = 3;
      g.beginPath(); g.arc(X(z.x), Z(z.z), Math.max(8, z.r * k), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.2; g.fill(); g.globalAlpha = 1;
    }
    for (const e of d.entidades) this._icono(g, e, X(e.x), Z(e.z));
    g.save();
    g.translate(X(d.x), Z(d.z));
    g.rotate(-d.rumbo);
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 5); g.lineTo(-8, 9); g.closePath(); g.fill();
    g.restore();
  }

  // Instrumentos de la cabina: horizonte artificial, velocidad, altitud, rumbo, empuje
  instrumentos(j, def) {
    if (!this.ictx || !document.body.classList.contains('cabina')) return;
    const g = this.ictx, W = 360, H = 130;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,10,16,0.82)';
    g.fillRect(0, 0, W, H);
    // horizonte
    const cx = 180, cy = 65, r = 52;
    const f = Q.set(0, 0, -1).applyQuaternion(j.q), up = P.set(0, 1, 0).applyQuaternion(j.q);
    const cab = Math.asin(Math.max(-1, Math.min(1, f.y)));
    const alab = Math.atan2(-Q.set(1, 0, 0).applyQuaternion(j.q).y, up.y);
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy);
    g.rotate(alab);
    g.translate(0, cab * r * 1.6);
    g.fillStyle = '#3a78c8'; g.fillRect(-90, -200, 180, 200);
    g.fillStyle = '#7a5a36'; g.fillRect(-90, 0, 180, 200);
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-90, 0); g.lineTo(90, 0); g.stroke();
    for (let i = -3; i <= 3; i++) { if (!i) continue; const y = -i * 14; g.beginPath(); g.moveTo(-10 - (i % 2 ? 0 : 8), y); g.lineTo(10 + (i % 2 ? 0 : 8), y); g.stroke(); }
    g.restore();
    g.strokeStyle = '#ffe066'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx - 6, cy); g.lineTo(cx, cy + 6); g.lineTo(cx + 6, cy); g.lineTo(cx + 22, cy); g.stroke();
    g.strokeStyle = '#9aa'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    // texto
    g.fillStyle = '#7dfcff'; g.font = '700 15px monospace'; g.textAlign = 'left';
    g.fillText('VEL', 14, 28); g.fillText('ALT', 14, 74); g.fillText('G', 14, 118);
    g.fillStyle = '#fff'; g.font = '700 22px monospace';
    g.fillText(String(Math.round(j.velocidad * 3.6)), 14, 50); g.fillText(String(Math.round(j.pos.y)), 14, 96);
    g.font = '700 15px monospace'; g.fillText(j.g.toFixed(1), 34, 118);
    g.textAlign = 'right'; g.fillStyle = '#7dfcff'; g.font = '700 15px monospace';
    g.fillText('RUMBO', W - 14, 28); g.fillText('EMPUJE', W - 14, 74);
    g.fillStyle = '#fff'; g.font = '700 22px monospace';
    const rumbo = (((Math.atan2(-f.x, -f.z) * 180) / Math.PI) % 360 + 360) % 360;
    g.fillText(String(Math.round(rumbo)) + '°', W - 14, 50);
    g.fillText(j.esHeli ? 'VERT ' + Math.round(j.vy) : Math.round(j.empuje * 100) + '%', W - 14, 96);
    g.fillStyle = j.perdida > 0.3 ? '#ff4d6d' : '#3df58a';
    g.font = '700 13px monospace';
    g.fillText(j.perdida > 0.3 ? 'PÉRDIDA' : j.cercaSuelo ? 'ALTITUD' : 'OK', W - 14, 118);
    void def;
  }
}
