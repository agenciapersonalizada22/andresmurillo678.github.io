/* Pila de deshacer/rehacer por comandos {nombre, hacer(), deshacer(), clave?, fusionar?(previo), compactar?()}. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Historial = f(); })(this, function () {
  function H(o) { o = o || {}; this.max = o.max || Infinity; this.ventana = o.ventana || 40; this.msFusion = o.msFusion == null ? 900 : o.msFusion; this.pila = []; this.pos = 0; this.cbs = []; this.reloj = o.reloj || Date.now; }
  H.prototype.on = function (f) { this.cbs.push(f); };
  H.prototype._avisar = function () { var s = this; this.cbs.forEach(function (f) { f(s); }); };
  /* registra un comando YA aplicado */
  H.prototype.registrar = function (c) {
    c.t = this.reloj();
    this.pila.length = this.pos;
    var u = this.pila[this.pila.length - 1];
    if (u && c.clave && u.clave === c.clave && c.t - u.t < this.msFusion && u.fusionar && u.fusionar(c)) { u.t = c.t; }
    else {
      this.pila.push(c); if (this.pila.length > this.max) this.pila.shift();
    }
    this.pos = this.pila.length;
    this._compactar(); this._avisar();
  };
  H.prototype.ejecutar = function (c) { c.hacer(); this.registrar(c); };
  H.prototype._compactar = function () {
    var lim = this.pila.length - this.ventana;
    for (var i = 0; i < lim; i++) { var c = this.pila[i]; if (c.compactar && !c._compacto) { c.compactar(); c._compacto = true; } }
  };
  H.prototype.puedeDeshacer = function () { return this.pos > 0; };
  H.prototype.puedeRehacer = function () { return this.pos < this.pila.length; };
  H.prototype.deshacer = function () {
    if (!this.pos) return false; var c = this.pila[--this.pos];
    if (c._compacto && c.descompactar) { c.descompactar(); c._compacto = false; }
    c.deshacer(); this._avisar(); return true;
  };
  H.prototype.rehacer = function () {
    if (this.pos >= this.pila.length) return false; var c = this.pila[this.pos++];
    if (c._compacto && c.descompactar) { c.descompactar(); c._compacto = false; }
    c.hacer(); this._avisar(); return true;
  };
  H.prototype.irA = function (i) { while (this.pos > i && this.deshacer()); while (this.pos < i && this.rehacer()); };
  H.prototype.vaciar = function () { this.pila = []; this.pos = 0; this._avisar(); };
  H.prototype.lista = function () { return this.pila.map(function (c) { return c.nombre; }); };
  return H;
});
