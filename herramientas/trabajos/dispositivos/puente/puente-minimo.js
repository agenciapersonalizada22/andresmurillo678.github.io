// Puente minimo navegador <-> equipo local. Uso:  npm i ws  &&  node puente-minimo.js [puerto]
// Variables: HOST (def. 127.0.0.1), ORIGENES (lista separada por comas de origenes web permitidos)
const { WebSocketServer } = require('ws'), dgram = require('dgram'), net = require('net');
const puerto = +process.argv[2] || 8765, host = process.env.HOST || '127.0.0.1';
const permitidos = (process.env.ORIGENES || 'https://andresmurillo678.github.io,http://localhost:8000,http://127.0.0.1:8000').split(',');
const wss = new WebSocketServer({ host, port: puerto, verifyClient: (i) => !i.origin || permitidos.includes(i.origin) });
const udp = dgram.createSocket('udp4'); let ultimo = null;                 // ultimo cliente que uso UDP
udp.on('message', (m, r) => ultimo && ultimo.send(JSON.stringify({ tipo: 'udp', de: r.address + ':' + r.port, datos: m.toString() })));
wss.on('connection', (ws, req) => {
  console.log('cliente conectado desde', req.headers.origin || 'sin origen');
  ws.send(JSON.stringify({ tipo: 'hola', puente: 'puente-minimo', acciones: ['eco', 'udp', 'tcp', 'difundir'] }));
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Se espera JSON' })); }
    if (m.tipo === 'ping') return ws.send(JSON.stringify({ tipo: 'pong', t: m.t }));
    if (m.accion === 'eco') return ws.send(JSON.stringify({ tipo: 'eco', datos: m.datos }));
    if (m.accion === 'udp') { ultimo = ws; return udp.send(String(m.datos), +m.puerto, m.host, (e) => ws.send(JSON.stringify({ tipo: 'udp-enviado', ok: !e, error: e && e.message }))); }
    if (m.accion === 'tcp') { const s = net.connect(+m.puerto, m.host, () => s.end(Buffer.from(String(m.datos)))); s.on('data', (d) => ws.send(JSON.stringify({ tipo: 'tcp', datos: d.toString() }))); return s.on('error', (e) => ws.send(JSON.stringify({ tipo: 'error', mensaje: e.message }))); }
    if (m.accion === 'difundir') return wss.clients.forEach((c) => c !== ws && c.send(JSON.stringify({ tipo: 'difusion', datos: m.datos })));
    ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Acción desconocida: ' + m.accion }));
  });
});
console.log(`Puente escuchando en ws://${host}:${puerto}  (origenes: ${permitidos.join(', ')})`);
