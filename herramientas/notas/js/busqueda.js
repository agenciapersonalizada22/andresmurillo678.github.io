/* Busqueda global con operadores: tag:x etiqueta: prioridad:alta antes:FECHA despues:FECHA en:lista|notas|tareas es:hecha|pendiente|fijada|archivada|vencida sin:fecha|etiqueta
   "frase exacta", -excluir. compilar(q) -> {pred(doc, tipo), terminos}. buscar(store, q) -> [{tipo, rec, puntos}] */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), F = G.Fechas || require('./fechas.js'), NL = G.NL || require('./nl.js'), Md = G.Md || require('./md.js');
  var B = {};
  var PRI = { ninguna: 0, baja: 1, media: 2, alta: 3, urgente: 4, '1': 1, '2': 2, '3': 3, '4': 4 };

  function tokens(q) {
    var o = [], re = /(-?)(?:([a-záéíóúñ]+):)?(?:"([^"]*)"|(\S+))/gi, m;
    while ((m = re.exec(q))) o.push({ neg: !!m[1], op: m[2] ? U.norm(m[2]) : '', val: m[3] != null ? m[3] : m[4], frase: m[3] != null });
    return o;
  }
  function fechaDe(v, hoy) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = /^([+-]?\d+)d$/.exec(v); if (m) return F.sumDias(hoy, +m[1]);
    return NL.parsear(v, { hoy: hoy, ahora: '00:00' }).fecha || '';
  }
  function tieneTag(r, t) { return (r.etiquetas || []).some(function (e) { return e === t || e.indexOf(t + '/') === 0; }); }
  var cache = new WeakMap();
  B.texto = function (r, tipo) {
    var firma = (r.modificada || 0) + ':' + (r.titulo || '').length + ':' + (r.cuerpo || r.notas || '').length + ':' + (r.etiquetas || []).length + ':' + (r.estado || '');
    var c = cache.get(r);
    if (c && c.f === firma) return c;
    c = { f: firma, t: U.norm(r.titulo || ''), c: U.norm(Md.aTexto(r.cuerpo || r.notas || '')), g: U.norm((r.etiquetas || []).join(' ')) };
    cache.set(r, c); return c;
  };
  B.compilar = function (q, ctx) {
    ctx = ctx || {}; var hoy = ctx.hoy || F.hoy(), tk = tokens(String(q || '')), conds = [], terminos = [];
    tk.forEach(function (t) {
      var v = U.norm(t.val), f;
      var op = { tag: 'tag', etiqueta: 'tag', tags: 'tag', prioridad: 'pri', p: 'pri', antes: 'antes', before: 'antes', despues: 'despues', after: 'despues', en: 'en', in: 'en', es: 'es', is: 'es', sin: 'sin', lista: 'en', libreta: 'en' }[t.op];
      if (!op && t.op) { v = U.norm(t.op + ':' + t.val); op = ''; }
      if (!op && /^#/.test(v)) { op = 'tag'; v = v.slice(1); }
      if (op === 'tag') f = function (r) { return tieneTag(r, v.replace(/^#/, '')); };
      else if (op === 'pri') {
        var cmp = /^(>=|<=|>|<)?(.+)$/.exec(v), lvl = PRI[cmp[2]];
        f = function (r, tipo) { if (tipo !== 'tarea') return false; var p = r.prioridad || 0; return lvl == null ? false : cmp[1] === '>=' ? p >= lvl : cmp[1] === '>' ? p > lvl : cmp[1] === '<=' ? p <= lvl : cmp[1] === '<' ? p < lvl : p === lvl; };
      } else if (op === 'antes' || op === 'despues') {
        var fe = fechaDe(t.val, hoy);
        f = function (r, tipo) {
          var d = tipo === 'tarea' ? r.fecha : (r.modificada ? F.fmt.apply(null, (function (x) { return [x.getFullYear(), x.getMonth() + 1, x.getDate()]; })(new Date(r.modificada))) : '');
          return !!d && !!fe && (op === 'antes' ? d < fe : d > fe);
        };
      } else if (op === 'en') {
        f = function (r, tipo) {
          if (v === 'notas' || v === 'nota') return tipo === 'nota'; if (v === 'tareas' || v === 'tarea') return tipo === 'tarea';
          if (v === 'hoy') return tipo === 'tarea' && r.fecha === hoy; if (v === 'bandeja') return tipo === 'tarea' && !r.lista;
          var id = tipo === 'tarea' ? r.lista : r.libreta, nom = ctx.nombreContenedor ? ctx.nombreContenedor(tipo, id) : '';
          return !!nom && U.norm(nom).indexOf(v) >= 0;
        };
      } else if (op === 'es') {
        f = function (r, tipo) {
          switch (v) {
            case 'hecha': case 'hecho': case 'completada': return tipo === 'tarea' && r.estado === 'hecha';
            case 'pendiente': return tipo === 'tarea' && r.estado !== 'hecha';
            case 'fijada': return tipo === 'nota' && !!r.fijada;
            case 'archivada': return !!r.archivada;
            case 'bloqueada': return tipo === 'nota' && !!r.cif;
            case 'vencida': return tipo === 'tarea' && r.estado !== 'hecha' && !!r.fecha && r.fecha < hoy;
            case 'repetida': case 'repite': return tipo === 'tarea' && !!r.rep;
            default: return false;
          }
        };
      } else if (op === 'sin') {
        f = function (r, tipo) { return v === 'fecha' ? tipo === 'tarea' && !r.fecha : v === 'etiqueta' || v === 'tag' ? !(r.etiquetas || []).length : v === 'prioridad' ? tipo === 'tarea' && !r.prioridad : false; };
      } else {
        terminos.push(v);
        f = function (r, tipo) { var x = B.texto(r, tipo); return x.t.indexOf(v) >= 0 || x.c.indexOf(v) >= 0 || x.g.indexOf(v) >= 0; };
      }
      conds.push(t.neg ? function (r, tipo) { return !f(r, tipo); } : f);
    });
    return {
      vacia: !conds.length, terminos: terminos,
      pred: function (r, tipo) { for (var i = 0; i < conds.length; i++) if (!conds[i](r, tipo)) return false; return true; }
    };
  };
  B.buscar = function (store, q, ctx) {
    ctx = ctx || {};
    var c = B.compilar(q, ctx), out = [], papelera = /\bes:papelera\b/.test(q);
    if (c.vacia) return out;
    function punt(r) { var x = B.texto(r), p = 0; c.terminos.forEach(function (t) { if (x.t.indexOf(t) === 0) p += 4; else if (x.t.indexOf(t) >= 0) p += 3; if (x.g.indexOf(t) >= 0) p += 2; if (x.c.indexOf(t) >= 0) p += 1; }); return p; }
    if (ctx.solo !== 'tarea') store.lista('notas').forEach(function (r) { if ((!r.papelera || papelera) && c.pred(r, 'nota')) out.push({ tipo: 'nota', rec: r, puntos: punt(r) + (r.fijada ? 0.5 : 0) }); });
    if (ctx.solo !== 'nota') store.lista('tareas').forEach(function (r) { if ((!r.papelera || papelera) && c.pred(r, 'tarea')) out.push({ tipo: 'tarea', rec: r, puntos: punt(r) }); });
    out.sort(function (a, b) { return b.puntos - a.puntos || (b.rec.modificada || 0) - (a.rec.modificada || 0); });
    return out;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = B; else G.Busqueda = B;
})(typeof window !== 'undefined' ? window : globalThis);
