// Online 1 vs 1 (Red/Lobby): el anfitrion es autoritativo (fisica, reglas, bots no); el invitado envia golpes y recibe snapshots interpolados.
// Mensajes: pp_hola (inv->host), pp_cfg (host->inv), pp_s (snapshot, no fiable ~30 Hz), pp_e (eventos, fiable), pp_g (golpe, fiable), pp_salir.
const R = () => window.Red, redondear = (a) => a.map((v) => Math.round(v * 1000) / 1000);

export function crearOnline(App) {
  const O = { activo: false, host: false, guestId: null, interp: null, acum: 0, cfgPend: null };
  O.opts = { juego: 'Ping Pong', maxJugadores: 2, minJugadores: 2, modos: [{ id: '1v1', nombre: '1 contra 1' }], alIniciar: (cfg, jugs) => iniciar(cfg, jugs) };

  function cfgHost() {
    const e = App.prog.equipo, p = App.perfil();
    return { nombre: p.nombre, color: p.color, mesa: e.mesa, sala: e.sala, paleta: e.paleta, estado: App.estadoOnline() };
  }
  function iniciar(config, jugs) {
    const Red = R(); O.activo = true; O.host = !!Red.esAnfitrion;
    if (O.host) {
      const inv = jugs.find((j) => j.id !== Red.miId) || { nombre: 'Rival', color: '#ff4fd8', id: 1 };
      O.guestId = inv.id; O.nombreInv = inv.nombre; O.colorInv = inv.color;
      App.empezarOnlineHost({ nombreInv: inv.nombre, colorInv: inv.color });
      Red.enviar('pp_cfg', cfgHost(), { a: inv.id });
    } else {
      O.interp = new Red.Interpolador({ retardo: 90, extrapolar: 100, max: 30 });
      App.empezarOnlineInvitado();
      Red.enviar('pp_hola', App.perfil(), { a: 0 });
      if (O.cfgPend) { App.visorConfig(O.cfgPend); O.cfgPend = null; }
    }
  }
  O.enviarGolpe = (cmd) => { const Red = R(); Red.enviar('pp_g', { cmd: { aimX: cmd.aimX, power: cmd.power, top: cmd.top, curva: cmd.curva }, lag: Math.min(0.4, (Red.rtt || 60) / 2000 + 0.09) }, { a: 0 }); };
  O.snapshot = (dt) => {
    O.acum += dt; if (O.acum < 1 / 30) return; O.acum = 0;
    const s = App.motor.snapshot(); R().enviar('pp_s', { t: R().reloj(), b: redondear(s.b), px: redondear(s.px), sw: redondear(s.sw) }, { a: O.guestId, fiable: false });
  };
  O.evento = (k, d) => { if (O.activo && O.host && O.guestId != null) R().enviar('pp_e', { k, d }, { a: O.guestId }); };
  O.revancha = () => { if (O.host) { App.empezarOnlineHost({ nombreInv: O.nombreInv, colorInv: O.colorInv, nuevo: true }); R().enviar('pp_cfg', Object.assign(cfgHost(), { nuevo: true }), { a: O.guestId }); } };
  O.salir = () => { if (O.activo) { try { R().enviar('pp_salir', {}, { a: O.host ? O.guestId : 0 }); } catch (e) { /* sin red */ } } O.activo = false; O.interp = null; };
  O.visor = () => (O.interp ? O.interp.obtener() : null);

  function engancharRed() {
    const Red = R(); if (!Red || !Red.on) return;
    Red.on('mensaje', (tipo, d, de) => {
      if (tipo === 'pp_g' && O.host && O.activo && App.motor) App.motor.golpeHumano(1, d.cmd, d.lag || 0);
      else if (tipo === 'pp_hola' && O.host && O.activo) { O.nombreInv = d.nombre || O.nombreInv; Red.enviar('pp_cfg', cfgHost(), { a: de }); }
      else if (tipo === 'pp_cfg' && !O.host) { if (O.activo) App.visorConfig(d); else O.cfgPend = d; }
      else if (tipo === 'pp_s' && !O.host && O.interp) O.interp.agregar(d.t, { b: d.b, px: d.px, sw: d.sw });
      else if (tipo === 'pp_e' && !O.host && O.activo) App.visorEvento(d.k, d.d);
      else if (tipo === 'pp_salir' && O.activo) App.onlineDesconexion(true);
    });
    Red.on('jugadorSalio', () => { if (O.activo) App.onlineDesconexion(false); });
    Red.on('cerrado', () => { if (O.activo) App.onlineDesconexion(false); });
  }
  O.enganchar = engancharRed;
  return O;
}
