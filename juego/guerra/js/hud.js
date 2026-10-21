// =============================================================
//  HUD: datos, vida, avisos, radar con minimapa y marcadores de enemigos.
//  Solo toca el DOM cuando un valor cambia.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const P = new THREE.Vector3(), Q = new THREE.Vector3();

export class Hud {
  constructor() {
    this.raiz = $('hud');
    this.el = {
      puntaje: $('hPuntaje'), oleada: $('hOleada'), enemigos: $('hEnemigos'), vida: $('hVida'),
      aviso: $('aviso'), estado: $('estado'), recarga: $('recarga'), hRecarga: $('hRecarga'),
      modulos: $('modulos'), mOrugas: $('mOrugas'), mTorreta: $('mTorreta'), mMotor: $('mMotor'),
      dano: $('dano'), miraRaton: $('miraRaton'), lead: $('lead'), marcadores: $('marcadores'), radar: $('radar'),
    };
    this.cache = {};
    this.rctx = this.el.radar.getContext('2d');
    this.marcas = [];
    for (let i = 0; i < 18; i++) {
      const d = document.createElement('div');
      d.className = 'marca';
      d.appendChild(document.createElement('span'));
      this.el.marcadores.appendChild(d);
      this.marcas.push(d);
    }
    this.tAviso = 0;
    this.tDano = 0;
    this.tRadar = 0;
  }

  _poner(clave, valor, fn) {
    if (this.cache[clave] === valor) return;
    this.cache[clave] = valor;
    fn(valor);
  }

  modo(m, avion) {
    document.body.classList.toggle('modoAvion', m === 'avion');
    document.body.classList.toggle('modoTanque', m === 'tanque');
    // botones táctiles según el armamento del avión elegido
    const sec = avion && avion.sec.n > 0;
    $('btnMisil').classList.toggle('oculto', m === 'avion' && !sec);
    $('btnBomba').classList.toggle('oculto', m === 'avion' && avion.bombas === 0);
    if (sec) $('btnMisil').textContent = avion.sec.nombre.slice(0, -1);
    this.el.modulos.classList.toggle('oculto', m !== 'tanque');
    this.el.recarga.classList.toggle('oculto', m !== 'tanque');
    this.cache = {};
  }

  datos(d) {
    this._poner('p', d.puntaje, (v) => { this.el.puntaje.textContent = v; });
    this._poner('o', d.oleada + '/' + CONFIG.oleadas, (v) => { this.el.oleada.textContent = v; });
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
      pon(this.el.mOrugas, d.modulos.orugas, 'mo');
      pon(this.el.mTorreta, d.modulos.torreta, 'mt');
      pon(this.el.mMotor, d.modulos.motor, 'mm');
    }
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

  tick(dt) {
    if (this.tAviso > 0) {
      this.tAviso -= dt;
      if (this.tAviso <= 0) this.el.aviso.classList.remove('visible');
    }
    if (this.tDano > 0) {
      this.tDano -= dt;
      if (this.tDano <= 0) this.el.dano.classList.remove('visible');
    }
  }

  limpiar() {
    this.el.aviso.classList.remove('visible');
    this.el.dano.classList.remove('visible');
    for (const m of this.marcas) m.style.display = 'none';
    this.tAviso = this.tDano = 0;
  }

  // Marcadores sobre la pantalla; lista = [{ pos, clase, apuntado, fijado }]
  marcadoresEnemigos(camara, lista, anchoPx, altoPx) {
    let n = 0;
    for (const e of lista) {
      if (n >= this.marcas.length) break;
      const d = e.pos.distanceTo(camara.position);
      if (d > 2600) continue;
      P.copy(e.pos).project(camara);
      let fuera = false;
      let x = P.x, y = P.y;
      if (P.z > 1) { x = -x; y = -y; fuera = true; }
      if (Math.abs(x) > 0.94 || Math.abs(y) > 0.9) {
        fuera = true;
        const m = Math.max(Math.abs(x) / 0.94, Math.abs(y) / 0.9) || 1;
        x /= m; y /= m;
      }
      const el = this.marcas[n++];
      el.style.display = 'block';
      el.className = 'marca ' + e.clase + (fuera ? ' fuera' : '') + (e.fijado ? ' fijado' : e.apuntado ? ' apuntado' : '');
      let giro = '';
      if (fuera) giro = ` rotate(${Math.atan2(x, y)}rad)`;
      el.style.transform = `translate(${((x + 1) / 2) * anchoPx}px, ${((1 - y) / 2) * altoPx}px)${giro}`;
      if (!fuera) el.firstChild.textContent = (d | 0) + ' m';
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

  // Radar redondo con el mapa girando según hacia dónde miras
  radar(dt, d) {
    this.tRadar -= dt;
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
    for (const e of d.entidades) {
      const ex = (e.x - d.x) * s, ez = (e.z - d.z) * s;
      if (ex * ex + ez * ez > (R - 6) * (R - 6)) continue;
      g.fillStyle = e.clase === 'tierra' ? '#ff9d3d' : '#ff4d6d';
      g.beginPath();
      if (e.clase === 'aire') { g.moveTo(ex, ez - 6); g.lineTo(ex + 5, ez + 5); g.lineTo(ex - 5, ez + 5); g.closePath(); }
      else g.rect(ex - 4, ez - 4, 8, 8);
      g.fill();
    }
    g.restore();
    // jugador (siempre mirando arriba)
    g.fillStyle = '#3df5ff';
    g.beginPath();
    g.moveTo(R, R - 10); g.lineTo(R + 7, R + 8); g.lineTo(R, R + 4); g.lineTo(R - 7, R + 8); g.closePath();
    g.fill();
  }
}
