/* Markdown <-> HTML. aHtml(md, ctx) es puro (sirve en Node). deDom(nodo) serializa el editor visual a Markdown.
   Sintaxis: # titulos, **negrita**, *cursiva*, ~~tachado~~, ==resaltado==, `codigo`, ```bloques```, > citas, listas, - [ ] tareas,
   tablas con |, [texto](url), ![alt](adj:ID), [[Nota]] y --- . ctx: {adj(id)->url, nota(titulo)->id|''}. */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), esc = U.esc;
  var M = {};

  function urlOk(u) { return /^(https?:|mailto:|tel:|adj:|#|\/|\.\.?\/)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u); }

  function inline(t, ctx) {
    var ph = [];
    function guardar(h) { ph.push(h); return '\u0001' + (ph.length - 1) + '\u0002'; }
    t = t.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, function (_, a, c) { return guardar('<code>' + esc(c.trim()) + '</code>'); });
    t = t.replace(/\\([\\`*_{}\[\]()#+\-.!>~=|])/g, function (_, c) { return guardar(esc(c)); });
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (_, alt, u) {
      var m = /^adj:(.+)$/.exec(u);
      if (m) return guardar('<img data-adj="' + esc(m[1]) + '" src="' + esc((ctx && ctx.adj && ctx.adj(m[1])) || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==') + '" alt="' + esc(alt) + '">');
      return urlOk(u) ? guardar('<img src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy" referrerpolicy="no-referrer">') : esc(_);
    });
    t = t.replace(/\[\[([^\[\]\n]{1,120})\]\]/g, function (_, n) {
      var id = ctx && ctx.nota ? ctx.nota(n.trim()) : '';
      return guardar('<a class="wl' + (id ? '' : ' wl-roto') + '" href="#" data-wl="' + esc(n.trim()) + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + '>[[' + esc(n.trim()) + ']]</a>');
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (_, lab, u) {
      return urlOk(u) ? guardar('<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + marcas(esc(lab)) + '</a>') : esc(lab);
    });
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g, function (_, p, u) { return p + guardar('<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>'); });
    t = marcas(esc(t));
    var prev;
    do { prev = t; t = t.replace(/\u0001(\d+)\u0002/g, function (_, i) { return ph[+i]; }); } while (t !== prev && /\u0001/.test(t));
    return t;
  }
  function marcas(s) {
    return s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>').replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>').replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>')
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, '$1<em>$2</em>').replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?![\w])/g, '$1<em>$2</em>');
  }

  var RE_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/, RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  function esTabla(l, sig) { return l && sig && l.indexOf('|') >= 0 && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(sig) && sig.indexOf('-') >= 0; }
  function celdas(l) { l = l.trim(); if (l[0] === '|') l = l.slice(1); if (l[l.length - 1] === '|' && l[l.length - 2] !== '\\') l = l.slice(0, -1); return l.split(/(?<!\\)\|/).map(function (c) { return c.replace(/\\\|/g, '|').trim(); }); }

  function lista(items, i, nivel, ctx, out) {
    var base = items[i].ind, ord = items[i].ord, html = '', tk = false, k = i;
    var cuerpo = '';
    while (k < items.length && items[k].ind >= base) {
      var it = items[k];
      if (it.ind > base) { /* sublista */
        var sub = lista(items, k, nivel + 1, ctx); cuerpo = cuerpo.replace(/<\/li>$/, '') + sub.html + '</li>'; k = sub.fin; continue;
      }
      if (it.ord !== ord) break;
      if (it.tarea != null) tk = true;
      cuerpo += '<li' + (it.tarea != null ? ' data-tk="' + it.tarea + '"' : '') + '>' + inline(it.texto, ctx) + '</li>'; k++;
    }
    return { html: '<' + (ord ? 'ol' : 'ul') + (tk ? ' class="tareas"' : '') + '>' + cuerpo + '</' + (ord ? 'ol' : 'ul') + '>', fin: k };
  }

  function bloques(lineas, ctx) {
    var out = '', i = 0, n = lineas.length, l;
    while (i < n) {
      l = lineas[i];
      if (!l.trim()) { i++; continue; }
      var f = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/.exec(l);
      if (f) {
        var cod = []; i++;
        while (i < n && !new RegExp('^\\s*' + f[1][0] + '{' + f[1].length + ',}\\s*$').test(lineas[i])) cod.push(lineas[i++]);
        i++; out += '<pre' + (f[2] ? ' data-lang="' + esc(f[2]) + '"' : '') + '><code>' + esc(cod.join('\n')) + '</code></pre>'; continue;
      }
      var h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
      if (h) { out += '<h' + h[1].length + '>' + inline(h[2], ctx) + '</h' + h[1].length + '>'; i++; continue; }
      if (RE_HR.test(l)) { out += '<hr>'; i++; continue; }
      if (esTabla(l, lineas[i + 1])) {
        var cab = celdas(l), filas = []; i += 2;
        while (i < n && lineas[i].trim() && lineas[i].indexOf('|') >= 0) filas.push(celdas(lineas[i++]));
        out += '<table><thead><tr>' + cab.map(function (c) { return '<th>' + inline(c, ctx) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          filas.map(function (r) { var s = ''; for (var c = 0; c < cab.length; c++) s += '<td>' + inline(r[c] || '', ctx) + '</td>'; return '<tr>' + s + '</tr>'; }).join('') + '</tbody></table>';
        continue;
      }
      if (/^\s{0,3}>/.test(l)) {
        var q = [];
        while (i < n && /^\s{0,3}>/.test(lineas[i])) q.push(lineas[i++].replace(/^\s{0,3}>\s?/, ''));
        out += '<blockquote>' + bloques(q, ctx) + '</blockquote>'; continue;
      }
      if (RE_ITEM.test(l)) {
        var items = [];
        while (i < n) {
          var mm = RE_ITEM.exec(lineas[i]);
          if (!mm) { if (lineas[i].trim() && /^\s+\S/.test(lineas[i]) && items.length) { items[items.length - 1].texto += '\n' + lineas[i].trim(); i++; continue; } break; }
          var ind = mm[1].replace(/\t/g, '  ').length, tx = mm[3], t = /^\[([ xX])\]\s+(.*)$/.exec(tx), tarea = null;
          if (t) { tarea = /[xX]/.test(t[1]) ? 1 : 0; tx = t[2]; } else if (/^\[([ xX])\]$/.test(tx)) { tarea = /[xX]/.test(tx) ? 1 : 0; tx = ''; }
          items.push({ ind: Math.floor(ind / 2), ord: /\d/.test(mm[2]), texto: tx, tarea: tarea }); i++;
        }
        var minI = Math.min.apply(null, items.map(function (x) { return x.ind; })); items.forEach(function (x) { x.ind = Math.min(x.ind - minI, 6); });
        var p = 0; while (p < items.length) { var r = lista(items, p, 0, ctx); out += r.html; p = r.fin > p ? r.fin : p + 1; }
        continue;
      }
      var par = [];
      while (i < n && lineas[i].trim() && !/^\s*(`{3,}|~{3,})/.test(lineas[i]) && !/^\s{0,3}#{1,6}\s/.test(lineas[i]) && !RE_HR.test(lineas[i]) && !/^\s{0,3}>/.test(lineas[i]) && !RE_ITEM.test(lineas[i]) && !esTabla(lineas[i], lineas[i + 1])) par.push(lineas[i++]);
      if (!par.length) { par.push(lineas[i++]); }
      out += '<p>' + par.map(function (x) { return inline(x.replace(/\s+$/, ''), ctx); }).join('<br>') + '</p>';
    }
    return out;
  }
  M.aHtml = function (md, ctx) { return bloques(String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n'), ctx || {}); };

  /* ---------- texto plano / utilidades ---------- */
  M.aTexto = function (md) {
    return String(md || '').replace(/```[\s\S]*?```/g, function (b) { return b.replace(/```\w*/g, ''); }).replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, '').replace(/^\s{0,3}>\s?/gm, '')
      .replace(/(\*\*|__|~~|==|`)/g, '').replace(/(^|\s)[*_](\S[^*_\n]*)[*_]/g, '$1$2').replace(/^\|?[\s:|-]{3,}\|?$/gm, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  };
  M.enlaces = function (md) {
    var o = [], re = /\[\[([^\[\]\n]{1,120})\]\]/g, m, s = String(md || '').replace(/```[\s\S]*?```/g, '');
    while ((m = re.exec(s))) { var t = m[1].trim(); if (o.indexOf(t) < 0) o.push(t); }
    return o;
  };
  M.tareasMd = function (md) { var a = 0, b = 0; String(md || '').replace(/^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]/gm, function (_, c) { a++; if (c !== ' ') b++; }); return { total: a, hechas: b }; };

  /* ---------- DOM -> Markdown ---------- */
  function limpiaTxt(s) { return s.replace(/ /g, ' ').replace(/[​﻿]/g, ''); }
  function escLinea(l) { return l.replace(/^(\s*)(#{1,6} |[-*+] |\d+[.)] |> |```|~~~|---+$|\*\*\*+$)/, function (_, a, b) { return a + '\\' + b; }); }
  function ser(nodo, ctx) {
    var out = '';
    nodo.childNodes.forEach(function (c) { out += serNodo(c, ctx); });
    return out;
  }
  function hijosInline(el) {
    var s = '';
    el.childNodes.forEach(function (c) {
      if (c.nodeType === 3) { s += limpiaTxt(c.nodeValue); return; }
      if (c.nodeType !== 1) return;
      var t = c.tagName.toLowerCase(), i;
      if (t === 'br') { s += '\n'; return; }
      if (t === 'ul' || t === 'ol') return;
      i = hijosInline(c);
      if (t === 'strong' || t === 'b') s += i.trim() ? '**' + i + '**' : i;
      else if (t === 'em' || t === 'i') s += i.trim() ? '*' + i + '*' : i;
      else if (t === 's' || t === 'strike' || t === 'del') s += '~~' + i + '~~';
      else if (t === 'mark') s += '==' + i + '==';
      else if (t === 'code') s += '`' + i.replace(/`/g, '') + '`';
      else if (t === 'a') {
        if (c.classList.contains('wl')) s += '[[' + (c.getAttribute('data-wl') || i.replace(/^\[\[|\]\]$/g, '')) + ']]';
        else s += '[' + i + '](' + (c.getAttribute('href') || '') + ')';
      } else if (t === 'img') s += '![' + (c.getAttribute('alt') || '') + '](' + (c.getAttribute('data-adj') ? 'adj:' + c.getAttribute('data-adj') : c.getAttribute('src') || '') + ')';
      else if (t === 'div' || t === 'p') s += (s && !/\n$/.test(s) ? '\n' : '') + i;
      else s += i;
    });
    return s;
  }
  function serLista(el, ctx, nivel) {
    var ord = el.tagName.toLowerCase() === 'ol', n = 0, s = '';
    Array.prototype.forEach.call(el.children, function (li) {
      if (li.tagName.toLowerCase() !== 'li') return;
      n++;
      var ind = '  '.repeat(nivel), tk = li.getAttribute('data-tk');
      var texto = hijosInline(li).replace(/\n+$/, '').replace(/\n/g, '\n' + ind + '  ');
      s += ind + (ord ? n + '. ' : '- ') + (tk != null ? (tk === '1' ? '[x] ' : '[ ] ') : '') + texto + '\n';
      Array.prototype.forEach.call(li.children, function (sub) { var t = sub.tagName.toLowerCase(); if (t === 'ul' || t === 'ol') s += serLista(sub, ctx, nivel + 1); });
    });
    return s;
  }
  function textoPre(n) { var s = ''; n.childNodes.forEach(function (x) { if (x.nodeType === 3) s += x.nodeValue; else if (x.nodeName === 'BR') s += '\n'; else s += textoPre(x); }); return s; }
  function serNodo(c, ctx) {
    if (c.nodeType === 3) { var t = limpiaTxt(c.nodeValue); return t.trim() ? escLinea(t) + '\n\n' : ''; }
    if (c.nodeType !== 1) return '';
    var t = c.tagName.toLowerCase(), m;
    if (/^h[1-6]$/.test(t)) return '#'.repeat(+t[1]) + ' ' + hijosInline(c).replace(/\n/g, ' ').trim() + '\n\n';
    if (t === 'ul' || t === 'ol') return serLista(c, ctx, 0) + '\n';
    if (t === 'blockquote') return ser(c, ctx).trim().split('\n').map(function (l) { return '> ' + l; }).join('\n').replace(/^> $/gm, '>') + '\n\n';
    if (t === 'pre') { var code = c.textContent.replace(/ /g, ' ').replace(/\n$/, ''); return '```' + (c.getAttribute('data-lang') || '') + '\n' + code + '\n```\n\n'; }
    if (t === 'hr') return '---\n\n';
    if (t === 'table') {
      var filas = Array.prototype.map.call(c.querySelectorAll('tr'), function (tr) { return Array.prototype.map.call(tr.children, function (td) { return hijosInline(td).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim(); }); });
      if (!filas.length) return '';
      var cols = Math.max.apply(null, filas.map(function (f) { return f.length; }));
      filas = filas.map(function (f) { while (f.length < cols) f.push(''); return '| ' + f.join(' | ') + ' |'; });
      var sep = '|' + ' --- |'.repeat(cols);
      return [filas[0], sep].concat(filas.slice(1)).join('\n') + '\n\n';
    }
    if (t === 'br') return '\n';
    if (t === 'p' || t === 'div' || t === 'section') {
      if (c.querySelector('p,div,ul,ol,h1,h2,h3,h4,h5,h6,blockquote,pre,table,hr')) return ser(c, ctx);
      var tx = hijosInline(c).replace(/\n+$/, '');
      if (!tx.trim()) return '\n';
      return tx.split('\n').map(escLinea).join('\n') + '\n\n';
    }
    var i = hijosInline({ childNodes: [c] });
    return i.trim() ? escLinea(i) + '\n\n' : '';
  }
  M.deDom = function (raiz) {
    var s = ser(raiz, {});
    return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M; else G.Md = M;
})(typeof window !== 'undefined' ? window : globalThis);
