'use strict';
// Parser XML tolerante (RSS/Atom/RDF/sitemaps). Sin dependencias.

const NOMBRADAS = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€', pound: '£', yen: '¥', copy: '©', reg: '®',
  trade: '™', laquo: '«', raquo: '»', bull: '•', middot: '·', deg: '°', iexcl: '¡', iquest: '¿',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ'
};

function decodificar(s) {
  if (!s || s.indexOf('&') < 0) return s || '';
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, c) => {
    if (c[0] === '#') {
      const cp = c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return '';
      try { return String.fromCodePoint(cp); } catch { return ''; }
    }
    return Object.prototype.hasOwnProperty.call(NOMBRADAS, c) ? NOMBRADAS[c] : m;
  });
}

function nodo(nombre, attrs) {
  return { nombre, attrs: attrs || {}, hijos: [], texto: '' };
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    attrs[m[1].toLowerCase()] = decodificar(v);
  }
  return attrs;
}

function parsear(xml) {
  xml = String(xml || '').replace(/^﻿/, '');
  const raiz = nodo('#raiz');
  const pila = [raiz];
  const n = xml.length;
  let i = 0;
  const actual = () => pila[pila.length - 1];
  while (i < n) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) { actual().texto += decodificar(xml.slice(i)); break; }
    if (lt > i) actual().texto += decodificar(xml.slice(i, lt));
    if (xml.startsWith('<!--', lt)) {
      const f = xml.indexOf('-->', lt + 4);
      i = f < 0 ? n : f + 3;
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const f = xml.indexOf(']]>', lt + 9);
      const fin = f < 0 ? n : f;
      actual().texto += xml.slice(lt + 9, fin);
      i = f < 0 ? n : f + 3;
    } else if (xml.startsWith('<?', lt)) {
      const f = xml.indexOf('?>', lt + 2);
      i = f < 0 ? n : f + 2;
    } else if (xml.startsWith('<!', lt)) {
      let prof = 0, j = lt + 2;
      for (; j < n; j++) {
        const c = xml[j];
        if (c === '[') prof++;
        else if (c === ']') prof--;
        else if (c === '>' && prof <= 0) break;
      }
      i = j + 1;
    } else if (xml[lt + 1] === '/') {
      const f = xml.indexOf('>', lt + 2);
      const nombre = xml.slice(lt + 2, f < 0 ? n : f).trim().toLowerCase();
      i = f < 0 ? n : f + 1;
      for (let k = pila.length - 1; k > 0; k--) {
        if (pila[k].nombre === nombre) { pila.length = k; break; }
      }
    } else {
      let j = lt + 1, q = null;
      for (; j < n; j++) {
        const c = xml[j];
        if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break;
      }
      let interior = xml.slice(lt + 1, j);
      i = j + 1;
      const auto = interior.endsWith('/');
      if (auto) interior = interior.slice(0, -1);
      const mn = /^([^\s\/>]+)/.exec(interior);
      if (!mn) continue;
      const el = nodo(mn[1].toLowerCase(), parseAttrs(interior.slice(mn[0].length)));
      actual().hijos.push(el);
      if (!auto) pila.push(el);
    }
  }
  return raiz;
}

const coincide = (n, nombre) => n.nombre === nombre;
const hijos = (n, nombre) => (n ? n.hijos.filter((h) => coincide(h, nombre)) : []);
const hijo = (n, nombre) => (n ? n.hijos.find((h) => coincide(h, nombre)) || null : null);
const texto = (n, nombre) => {
  const h = nombre ? hijo(n, nombre) : n;
  return h ? h.texto.trim() : '';
};
function buscar(n, nombre, salida = []) {
  if (!n) return salida;
  for (const h of n.hijos) {
    if (coincide(h, nombre)) salida.push(h);
    buscar(h, nombre, salida);
  }
  return salida;
}

module.exports = { parsear, decodificar, hijo, hijos, texto, buscar };
