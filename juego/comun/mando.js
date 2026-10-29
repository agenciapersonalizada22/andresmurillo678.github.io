/* Mando Xbox (Gamepad API, mapeo estandar). Script clasico: expone window.Mando.
   Uso: Mando.leer() una vez por cuadro; luego Mando.ejes.izq/der {x,y}, Mando.gatillo.izq/der (0..1),
   Mando.sostenido('A'), Mando.pulsado('A') (flanco de subida este cuadro), Mando.conectado,
   Mando.vibrar(fuerte, suave, ms), Mando.alConectar(fn). Botones: A B X Y LB RB LT RT VISTA MENU L3 R3 ARRIBA ABAJO IZQ DER XBOX */
(function () {
  var NOMBRES = ['A','B','X','Y','LB','RB','LT','RT','VISTA','MENU','L3','R3','ARRIBA','ABAJO','IZQ','DER','XBOX'];
  var ZONA = 0.18;
  var M = {
    conectado: false, nombre: '', ejes: { izq: { x: 0, y: 0 }, der: { x: 0, y: 0 } },
    gatillo: { izq: 0, der: 0 }, activo: false, _ahora: {}, _antes: {}, _cb: [], _ultimoUso: 0
  };
  function zona(x, y) {
    var m = Math.hypot(x, y);
    if (m < ZONA) return { x: 0, y: 0 };
    var k = Math.min(1, (m - ZONA) / (1 - ZONA)) / m;
    return { x: x * k, y: y * k };
  }
  function pad() {
    var l = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < l.length; i++) if (l[i] && l[i].connected) return l[i];
    return null;
  }
  M.leer = function () {
    var p = pad();
    M._antes = M._ahora; M._ahora = {};
    if (!p) { M.conectado = false; M.ejes.izq = M.ejes.der = { x: 0, y: 0 }; M.gatillo.izq = M.gatillo.der = 0; return M; }
    if (!M.conectado) { M.conectado = true; M.nombre = p.id; M._cb.forEach(function (f) { try { f(p); } catch (e) {} }); }
    var b = p.buttons, a = p.axes;
    for (var i = 0; i < NOMBRES.length; i++) M._ahora[NOMBRES[i]] = !!(b[i] && (b[i].pressed || b[i].value > 0.5));
    M.gatillo.izq = b[6] ? b[6].value : 0; M.gatillo.der = b[7] ? b[7].value : 0;
    M.ejes.izq = zona(a[0] || 0, a[1] || 0); M.ejes.der = zona(a[2] || 0, a[3] || 0);
    var uso = Math.hypot(M.ejes.izq.x, M.ejes.izq.y, M.ejes.der.x, M.ejes.der.y) > 0.2;
    for (var k in M._ahora) if (M._ahora[k]) uso = true;
    if (uso) { M.activo = true; M._ultimoUso = performance.now(); }
    return M;
  };
  M.sostenido = function (n) { return !!M._ahora[n]; };
  M.pulsado = function (n) { return !!M._ahora[n] && !M._antes[n]; };
  M.soltado = function (n) { return !M._ahora[n] && !!M._antes[n]; };
  M.alConectar = function (fn) { M._cb.push(fn); if (M.conectado) fn(pad()); };
  M.vibrar = function (fuerte, suave, ms) {
    var p = pad(); if (!p) return;
    var v = p.vibrationActuator;
    try {
      if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms || 120, strongMagnitude: Math.min(1, fuerte || 0), weakMagnitude: Math.min(1, suave || 0) });
      else if (p.hapticActuators && p.hapticActuators[0]) p.hapticActuators[0].pulse(Math.min(1, fuerte || 0), ms || 120);
    } catch (e) {}
  };
  window.addEventListener('gamepadconnected', function () { M.activo = true; });
  window.Mando = M;
})();
